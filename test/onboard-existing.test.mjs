import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdir, mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { promisify } from "node:util";

import { discoverExisting } from "../src/discover-existing.mjs";
import { initNew } from "../src/init-new.mjs";
import { onboardExisting } from "../src/onboard-existing.mjs";
import { renderOnboardProposal } from "../src/render-onboard-proposal.mjs";

const execFileAsync = promisify(execFile);
const cliPath = path.resolve("bin", "codex-agent-template.mjs");

test("discover-existing reads bounded root project evidence", async () => {
  const tempRoot = await mkdtemp(path.join(os.tmpdir(), "cat-discover-"));

  try {
    await writeFile(
      path.join(tempRoot, "package.json"),
      JSON.stringify({
        scripts: {
          test: "node --test",
          lint: "eslint .",
          build: "tsc",
          validate: "node scripts/validate-project.mjs",
        },
      }),
      "utf8"
    );
    await writeFile(path.join(tempRoot, "AGENTS.md"), "# Existing instructions\n", "utf8");
    await mkdir(path.join(tempRoot, "docs", "specs"), { recursive: true });

    const discovery = discoverExisting(tempRoot);

    assert.deepEqual(discovery.existingAiFiles.sort(), ["AGENTS.md", "docs/specs"].sort());
    assert.deepEqual(discovery.detectedProjectFiles, ["package.json"]);
    assert.deepEqual(discovery.commands, [
      { kind: "unit-test", command: "npm run test", confidence: "high" },
      { kind: "lint", command: "npm run lint", confidence: "high" },
      { kind: "build", command: "npm run build", confidence: "high" },
      { kind: "project-validation", command: "npm run validate", confidence: "high" },
    ]);
  } finally {
    await rm(tempRoot, { recursive: true, force: true });
  }
});

test("onboard-existing proposes files without writing", async () => {
  const tempRoot = await mkdtemp(path.join(os.tmpdir(), "cat-onboard-"));

  try {
    await writeFile(path.join(tempRoot, "AGENTS.md"), "# Existing instructions\n", "utf8");

    const result = await onboardExisting({
      target: tempRoot,
      agent: "codex+claude",
      workflow: "task-first",
    });

    assert.ok(result.blockedExisting.includes("AGENTS.md"));
    assert.ok(result.proposedCreates.includes(".gitignore"));
    assert.ok(result.proposedCreates.includes("CLAUDE.md"));
    assert.ok(result.proposedCreates.includes("docs/tasks/TEMPLATE.md"));
    assert.equal(result.complete, false);

    const files = await readdir(tempRoot);
    assert.deepEqual(files, ["AGENTS.md"]);
  } finally {
    await rm(tempRoot, { recursive: true, force: true });
  }
});

test("CLI onboard-existing prints proposal and writes nothing", async () => {
  const tempRoot = await mkdtemp(path.join(os.tmpdir(), "cat-onboard-cli-"));

  try {
    await writeFile(path.join(tempRoot, "README.md"), "# Existing project\n", "utf8");
    const result = await execFileAsync(process.execPath, [
      cliPath,
      "onboard-existing",
      "--target",
      tempRoot,
      "--agent",
      "claude",
      "--workflow",
      "spec-tdd",
      "--dry-run",
    ]);

    assert.match(result.stdout, /Onboard-existing proposal: no files written/);
    assert.match(result.stdout, /Detected project files/);
    assert.match(result.stdout, /README\.md/);
    assert.match(result.stdout, /docs\/specs\/TEMPLATE\.md/);

    const files = await readdir(tempRoot);
    assert.deepEqual(files, ["README.md"]);
  } finally {
    await rm(tempRoot, { recursive: true, force: true });
  }
});

test("render-onboard-proposal creates reviewable markdown", async () => {
  const result = {
    target: "C:/tmp/sample",
    agent: "codex",
    workflow: "task-first",
    discovery: {
      existingAiFiles: ["AGENTS.md"],
      detectedProjectFiles: ["package.json"],
      commands: [{ kind: "unit-test", command: "npm run test", confidence: "high" }],
    },
    proposedCreates: ["docs/tasks/TEMPLATE.md"],
    blockedExisting: ["AGENTS.md"],
  };

  const markdown = renderOnboardProposal(result);

  assert.match(markdown, /# Onboard Existing Proposal/);
  assert.match(markdown, /Complete: `no`/);
  assert.match(markdown, /`AGENTS\.md`/);
  assert.match(markdown, /unit-test: `npm run test` \(high\)/);
  assert.match(markdown, /No target files were written/);
});

test("CLI onboard-existing --check exits non-zero when proposal is incomplete", async () => {
  const tempRoot = await mkdtemp(path.join(os.tmpdir(), "cat-onboard-check-"));

  try {
    await assert.rejects(
      execFileAsync(process.execPath, [
        cliPath,
        "onboard-existing",
        "--target",
        tempRoot,
        "--agent",
        "codex",
        "--workflow",
        "light",
        "--check",
      ]),
      (error) => {
        assert.equal(error.code, 1);
        assert.match(error.stdout, /Complete: no/);
        return true;
      }
    );
  } finally {
    await rm(tempRoot, { recursive: true, force: true });
  }
});

test("CLI onboard-existing --check exits zero when selected infrastructure is complete", async () => {
  const tempRoot = await mkdtemp(path.join(os.tmpdir(), "cat-onboard-check-complete-"));
  const target = path.join(tempRoot, "generated-project");

  try {
    await initNew({
      target,
      agent: "codex",
      workflow: "light",
      dryRun: false,
    });

    const result = await execFileAsync(process.execPath, [
      cliPath,
      "onboard-existing",
      "--target",
      target,
      "--agent",
      "codex",
      "--workflow",
      "light",
      "--check",
    ]);

    assert.match(result.stdout, /Complete: yes/);
  } finally {
    await rm(tempRoot, { recursive: true, force: true });
  }
});

test("CLI onboard-existing writes proposal file only when requested", async () => {
  const tempRoot = await mkdtemp(path.join(os.tmpdir(), "cat-onboard-proposal-"));
  const target = path.join(tempRoot, "existing-project");
  const proposalFile = path.join(tempRoot, "proposal.md");

  try {
    await mkdir(target);
    await writeFile(path.join(target, "README.md"), "# Existing project\n", "utf8");

    const result = await execFileAsync(process.execPath, [
      cliPath,
      "onboard-existing",
      "--target",
      target,
      "--agent",
      "codex",
      "--workflow",
      "light",
      "--dry-run",
      "--proposal-file",
      proposalFile,
    ]);

    assert.match(result.stdout, /Proposal written:/);

    const proposal = await readFile(proposalFile, "utf8");
    assert.match(proposal, /# Onboard Existing Proposal/);
    assert.match(proposal, /README\.md/);

    const targetFiles = await readdir(target);
    assert.deepEqual(targetFiles, ["README.md"]);
  } finally {
    await rm(tempRoot, { recursive: true, force: true });
  }
});
