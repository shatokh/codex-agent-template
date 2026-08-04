import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, readdir, readFile, rm } from "node:fs/promises";
import { existsSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { promisify } from "node:util";

import { initNew } from "../src/init-new.mjs";
import { validateGeneratedProject } from "../src/validate-generated-project.mjs";

const execFileAsync = promisify(execFile);
const cliPath = path.resolve("bin", "codex-agent-template.mjs");
const lightDocs = [
  "docs/ai/onboarding-notes.md",
  "docs/ai/rule-quality-checklist.md",
  "docs/ai/verification.md",
];

test("init-new dry-run reports files without writing", async () => {
  const tempRoot = await mkdtemp(path.join(os.tmpdir(), "cat-dry-run-"));
  const target = path.join(tempRoot, "sample-project");

  try {
    const result = await initNew({
      target,
      agent: "codex",
      workflow: "light",
      dryRun: true,
    });

    assert.equal(result.dryRun, true);
    assert.deepEqual(result.created.sort(), [".agent-template.json", ".gitignore", "AGENTS.md", ...lightDocs].sort());
    assert.equal(existsSync(target), false);
  } finally {
    await rm(tempRoot, { recursive: true, force: true });
  }
});

test("init-new writes codex+claude files and generated validation passes", async () => {
  const tempRoot = await mkdtemp(path.join(os.tmpdir(), "cat-write-"));
  const target = path.join(tempRoot, "sample-project");

  try {
    const result = await initNew({
      target,
      agent: "codex+claude",
      workflow: "task-first",
      dryRun: false,
    });

    assert.deepEqual(result.written.sort(), [
      ".agent-template.json",
      ".gitignore",
      "AGENTS.md",
      "CLAUDE.md",
      ...lightDocs,
      "docs/tasks/TEMPLATE.md",
    ].sort());

    const files = await listFiles(target);
    assert.deepEqual(files.sort(), [
      ".agent-template.json",
      ".gitignore",
      "AGENTS.md",
      "CLAUDE.md",
      ...lightDocs,
      "docs/tasks/TEMPLATE.md",
    ].sort());

    const claude = await readFile(path.join(target, "CLAUDE.md"), "utf8");
    assert.match(claude, /@AGENTS\.md/);

    const validation = await validateGeneratedProject(target);
    assert.equal(validation.valid, true, validation.errors.join("\n"));
  } finally {
    await rm(tempRoot, { recursive: true, force: true });
  }
});

test("init-new blocks existing files by default", async () => {
  const tempRoot = await mkdtemp(path.join(os.tmpdir(), "cat-block-"));
  const target = path.join(tempRoot, "sample-project");

  try {
    await initNew({
      target,
      agent: "codex",
      workflow: "light",
      dryRun: false,
    });

    const second = await initNew({
      target,
      agent: "codex",
      workflow: "light",
      dryRun: false,
    });

    assert.deepEqual(second.blocked.sort(), [".agent-template.json", ".gitignore", "AGENTS.md", ...lightDocs].sort());
    assert.deepEqual(second.written, []);
  } finally {
    await rm(tempRoot, { recursive: true, force: true });
  }
});

test("CLI init-new writes files and CLI validate accepts them", async () => {
  const tempRoot = await mkdtemp(path.join(os.tmpdir(), "cat-cli-"));
  const target = path.join(tempRoot, "sample-project");

  try {
    const init = await execFileAsync(process.execPath, [
      cliPath,
      "init-new",
      "--target",
      target,
      "--agent",
      "claude",
      "--workflow",
      "spec-tdd",
    ]);
    assert.match(init.stdout, /Init-new completed/);

    const validate = await execFileAsync(process.execPath, [cliPath, "validate", "--target", target]);
    assert.match(validate.stdout, /Generated project validation passed/);

    const files = await readdir(target);
    assert.deepEqual(files.sort(), [".agent-template.json", ".gitignore", "CLAUDE.md", "docs"].sort());

    const allFiles = await listFiles(target);
    assert.deepEqual(allFiles.sort(), [
      ".agent-template.json",
      ".gitignore",
      "CLAUDE.md",
      ...lightDocs,
      "docs/specs/TEMPLATE.md",
      "docs/ai-change-records/TEMPLATE.md",
    ].sort());
  } finally {
    await rm(tempRoot, { recursive: true, force: true });
  }
});

test("init-new writes selected optional packs", async () => {
  const tempRoot = await mkdtemp(path.join(os.tmpdir(), "cat-packs-"));
  const target = path.join(tempRoot, "sample-project");

  try {
    const result = await initNew({
      target,
      agent: "codex",
      workflow: "light",
      packs: ["privacy", "test-harness"],
      dryRun: false,
    });

    assert.deepEqual(result.packs, ["privacy", "test-harness"]);
    assert.ok(result.written.includes("docs/ai/packs/privacy.md"));
    assert.ok(result.written.includes("docs/ai/packs/test-harness.md"));

    const config = JSON.parse(await readFile(path.join(target, ".agent-template.json"), "utf8"));
    assert.deepEqual(config.packs, ["privacy", "test-harness"]);

    const validation = await validateGeneratedProject(target);
    assert.equal(validation.valid, true, validation.errors.join("\n"));
  } finally {
    await rm(tempRoot, { recursive: true, force: true });
  }
});

test("init-new writes manual context advisor artifacts when requested", async () => {
  const tempRoot = await mkdtemp(path.join(os.tmpdir(), "cat-advisor-"));
  const target = path.join(tempRoot, "sample-project");

  try {
    const result = await initNew({
      target,
      agent: "codex",
      workflow: "light",
      contextAdvisor: true,
      dryRun: false,
    });

    assert.equal(result.contextAdvisor, true);
    assert.ok(result.written.includes(".agents/skills/context-artifact-advisor/SKILL.md"));
    assert.ok(result.written.includes("docs/ai/advisor/artifact-selection.md"));
    assert.ok(result.written.includes("docs/ai/advisor/proposal-schema.md"));
    assert.ok(result.written.includes("docs/ai/advisor/proposals/index.md"));

    const config = JSON.parse(await readFile(path.join(target, ".agent-template.json"), "utf8"));
    assert.equal(config.contextAdvisor, true);

    const validation = await validateGeneratedProject(target);
    assert.equal(validation.valid, true, validation.errors.join("\n"));
  } finally {
    await rm(tempRoot, { recursive: true, force: true });
  }
});

test("generated validation rejects missing local override ignore rules", async () => {
  const tempRoot = await mkdtemp(path.join(os.tmpdir(), "cat-missing-gitignore-"));
  const target = path.join(tempRoot, "sample-project");

  try {
    await initNew({
      target,
      agent: "codex",
      workflow: "light",
      dryRun: false,
    });

    await rm(path.join(target, ".gitignore"), { force: true });

    const validation = await validateGeneratedProject(target);
    assert.equal(validation.valid, false);
    assert.ok(validation.errors.includes("missing .gitignore"));
  } finally {
    await rm(tempRoot, { recursive: true, force: true });
  }
});

test("generated validation rejects missing workflow artifacts", async () => {
  const tempRoot = await mkdtemp(path.join(os.tmpdir(), "cat-missing-workflow-"));
  const target = path.join(tempRoot, "sample-project");

  try {
    await initNew({
      target,
      agent: "codex",
      workflow: "spec-tdd",
      dryRun: false,
    });

    await rm(path.join(target, "docs", "specs", "TEMPLATE.md"), { force: true });

    const validation = await validateGeneratedProject(target);
    assert.equal(validation.valid, false);
    assert.ok(validation.errors.includes("missing docs/specs/TEMPLATE.md"));
  } finally {
    await rm(tempRoot, { recursive: true, force: true });
  }
});

test("generated validation rejects missing optional pack artifacts", async () => {
  const tempRoot = await mkdtemp(path.join(os.tmpdir(), "cat-missing-pack-"));
  const target = path.join(tempRoot, "sample-project");

  try {
    await initNew({
      target,
      agent: "codex",
      workflow: "light",
      packs: ["privacy"],
      dryRun: false,
    });

    await rm(path.join(target, "docs", "ai", "packs", "privacy.md"), { force: true });

    const validation = await validateGeneratedProject(target);
    assert.equal(validation.valid, false);
    assert.ok(validation.errors.includes("missing docs/ai/packs/privacy.md"));
  } finally {
    await rm(tempRoot, { recursive: true, force: true });
  }
});

test("generated validation rejects missing context advisor artifacts", async () => {
  const tempRoot = await mkdtemp(path.join(os.tmpdir(), "cat-missing-advisor-"));
  const target = path.join(tempRoot, "sample-project");

  try {
    await initNew({
      target,
      agent: "codex",
      workflow: "light",
      contextAdvisor: true,
      dryRun: false,
    });

    await rm(path.join(target, "docs", "ai", "advisor", "proposal-schema.md"), { force: true });

    const validation = await validateGeneratedProject(target);
    assert.equal(validation.valid, false);
    assert.ok(validation.errors.includes("missing docs/ai/advisor/proposal-schema.md"));
  } finally {
    await rm(tempRoot, { recursive: true, force: true });
  }
});

async function listFiles(root, relativePrefix = "") {
  const current = path.join(root, relativePrefix);
  const entries = await readdir(current, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const relativePath = path.join(relativePrefix, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await listFiles(root, relativePath)));
    } else {
      files.push(relativePath.replaceAll(path.sep, "/"));
    }
  }

  return files;
}
