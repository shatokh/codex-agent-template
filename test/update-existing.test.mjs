import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdir, mkdtemp, readdir, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { promisify } from "node:util";

import { initNew } from "../src/init-new.mjs";
import { renderUpdateProposal } from "../src/render-update-proposal.mjs";
import { updateExisting } from "../src/update-existing.mjs";

const execFileAsync = promisify(execFile);
const cliPath = path.resolve("bin", "codex-agent-template.mjs");

test("update-existing reports complete when generated files match", async () => {
  const tempRoot = await mkdtemp(path.join(os.tmpdir(), "cat-update-complete-"));
  const target = path.join(tempRoot, "generated-project");

  try {
    await initNew({
      target,
      agent: "codex",
      workflow: "task-first",
      projectKind: "boardgame",
      packs: ["test-harness"],
      contextAdvisor: true,
      dryRun: false,
    });

    const result = await updateExisting({
      target,
      agent: "codex",
      workflow: "task-first",
      projectKind: "boardgame",
      packs: ["test-harness"],
      contextAdvisor: true,
    });

    assert.equal(result.complete, true);
    assert.deepEqual(result.missingCreates, []);
    assert.deepEqual(result.updateCandidates, []);
    assert.ok(result.unchanged.includes("AGENTS.md"));
    assert.ok(result.unchanged.includes("docs/ai/verification.md"));
  } finally {
    await rm(tempRoot, { recursive: true, force: true });
  }
});

test("update-existing proposes review updates for changed project kind", async () => {
  const tempRoot = await mkdtemp(path.join(os.tmpdir(), "cat-update-kind-"));
  const target = path.join(tempRoot, "generated-project");

  try {
    await initNew({
      target,
      agent: "codex",
      workflow: "task-first",
      projectKind: "code",
      packs: ["test-harness"],
      contextAdvisor: true,
      dryRun: false,
    });

    const result = await updateExisting({
      target,
      agent: "codex",
      workflow: "task-first",
      projectKind: "boardgame",
      packs: ["test-harness"],
      contextAdvisor: true,
    });

    assert.equal(result.complete, false);
    assert.deepEqual(result.missingCreates, []);
    assert.ok(result.updateCandidates.includes(".agent-template.json"));
    assert.ok(result.updateCandidates.includes("AGENTS.md"));
    assert.ok(result.updateCandidates.includes("docs/ai/verification.md"));
    assert.ok(result.recommendations.includes("Review update candidates before applying any file changes."));
  } finally {
    await rm(tempRoot, { recursive: true, force: true });
  }
});

test("render-update-proposal creates reviewable markdown", async () => {
  const markdown = renderUpdateProposal({
    target: "C:/tmp/sample",
    agent: "codex",
    workflow: "task-first",
    projectKind: "boardgame",
    packs: ["test-harness"],
    contextAdvisor: true,
    complete: false,
    existingConfig: {
      exists: true,
      valid: true,
      config: {
        agent: "codex",
        workflow: "task-first",
        projectKind: "code",
        generatedAt: "2026-08-04",
      },
    },
    missingCreates: ["docs/ai/packs/test-harness.md"],
    updateCandidates: [".agent-template.json", "docs/ai/verification.md"],
    unchanged: ["AGENTS.md"],
    recommendations: ["Review update candidates before applying any file changes."],
  });

  assert.match(markdown, /# Update Existing Proposal/);
  assert.match(markdown, /Project kind: `boardgame`/);
  assert.match(markdown, /## Existing Files To Review For Update/);
  assert.match(markdown, /`docs\/ai\/verification\.md`/);
});

test("CLI update-existing supports JSON output", async () => {
  const tempRoot = await mkdtemp(path.join(os.tmpdir(), "cat-update-json-"));
  const target = path.join(tempRoot, "generated-project");

  try {
    await initNew({
      target,
      agent: "codex",
      workflow: "task-first",
      dryRun: false,
    });

    const result = await execFileAsync(process.execPath, [
      cliPath,
      "update-existing",
      "--target",
      target,
      "--agent",
      "codex",
      "--workflow",
      "task-first",
      "--project-kind",
      "boardgame",
      "--output",
      "json",
    ]);
    const parsed = JSON.parse(result.stdout);

    assert.equal(parsed.complete, false);
    assert.ok(parsed.updateCandidates.includes(".agent-template.json"));
    assert.ok(parsed.updateCandidates.includes("docs/ai/verification.md"));
  } finally {
    await rm(tempRoot, { recursive: true, force: true });
  }
});

test("CLI update-existing writes proposal under proposal dir", async () => {
  const tempRoot = await mkdtemp(path.join(os.tmpdir(), "cat-update-proposal-dir-"));
  const target = path.join(tempRoot, "Existing Project");
  const proposalDir = path.join(tempRoot, ".local", "proposals");

  try {
    await mkdir(target);

    const result = await execFileAsync(process.execPath, [
      cliPath,
      "update-existing",
      "--target",
      target,
      "--agent",
      "codex",
      "--workflow",
      "light",
      "--proposal-dir",
      proposalDir,
    ]);

    assert.match(result.stdout, /Update-existing proposal: no files written/);
    assert.match(result.stdout, /Proposal written:/);

    const projectProposalDir = path.join(proposalDir, "Existing-Project");
    const proposalFiles = await readdir(projectProposalDir);
    assert.equal(proposalFiles.length, 1);
    assert.match(proposalFiles[0], /update-proposal\.md$/);

    const proposal = await readFile(path.join(projectProposalDir, proposalFiles[0]), "utf8");
    assert.match(proposal, /# Update Existing Proposal/);
    assert.match(proposal, /Missing Files To Create/);
  } finally {
    await rm(tempRoot, { recursive: true, force: true });
  }
});
