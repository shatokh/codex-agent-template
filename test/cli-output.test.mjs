import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { promisify } from "node:util";

import { initNew } from "../src/init-new.mjs";

const execFileAsync = promisify(execFile);
const cliPath = path.resolve("bin", "codex-agent-template.mjs");

test("CLI list supports JSON output", async () => {
  const result = await execFileAsync(process.execPath, [cliPath, "list", "--output", "json"]);
  const parsed = JSON.parse(result.stdout);

  assert.deepEqual(parsed.agents, ["codex", "claude", "codex+claude"]);
  assert.deepEqual(parsed.workflows, ["light", "task-first", "spec-tdd"]);
  assert.deepEqual(parsed.packs, ["privacy", "external-services", "security", "test-harness", "docs"]);
});

test("CLI init-new dry-run supports JSON output", async () => {
  const tempRoot = await mkdtemp(path.join(os.tmpdir(), "cat-json-init-"));
  const target = path.join(tempRoot, "project");

  try {
    const result = await execFileAsync(process.execPath, [
      cliPath,
      "init-new",
      "--target",
      target,
      "--agent",
      "codex",
      "--workflow",
      "light",
      "--dry-run",
      "--output",
      "json",
    ]);
    const parsed = JSON.parse(result.stdout);

    assert.equal(parsed.dryRun, true);
    assert.equal(parsed.agent, "codex");
    assert.ok(parsed.created.includes("AGENTS.md"));
    assert.ok(parsed.created.includes(".gitignore"));
  } finally {
    await rm(tempRoot, { recursive: true, force: true });
  }
});

test("CLI validate supports JSON output", async () => {
  const tempRoot = await mkdtemp(path.join(os.tmpdir(), "cat-json-validate-"));
  const target = path.join(tempRoot, "project");

  try {
    await initNew({
      target,
      agent: "claude",
      workflow: "light",
      dryRun: false,
    });

    const result = await execFileAsync(process.execPath, [
      cliPath,
      "validate",
      "--target",
      target,
      "--output",
      "json",
    ]);
    const parsed = JSON.parse(result.stdout);

    assert.equal(parsed.valid, true);
    assert.deepEqual(parsed.errors, []);
  } finally {
    await rm(tempRoot, { recursive: true, force: true });
  }
});

test("CLI onboard-existing supports JSON output", async () => {
  const tempRoot = await mkdtemp(path.join(os.tmpdir(), "cat-json-onboard-"));

  try {
    const result = await execFileAsync(process.execPath, [
      cliPath,
      "onboard-existing",
      "--target",
      tempRoot,
      "--agent",
      "codex+claude",
      "--workflow",
      "task-first",
      "--pack",
      "privacy",
      "--pack",
      "security",
      "--dry-run",
      "--output",
      "json",
    ]);
    const parsed = JSON.parse(result.stdout);

    assert.equal(parsed.agent, "codex+claude");
    assert.deepEqual(parsed.packs, ["privacy", "security"]);
    assert.equal(parsed.complete, false);
    assert.ok(parsed.proposedCreates.includes("AGENTS.md"));
    assert.ok(parsed.proposedCreates.includes("docs/tasks/TEMPLATE.md"));
    assert.ok(parsed.proposedCreates.includes("docs/ai/packs/privacy.md"));
  } finally {
    await rm(tempRoot, { recursive: true, force: true });
  }
});
