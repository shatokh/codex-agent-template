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
    await writeFile(path.join(tempRoot, "pnpm-lock.yaml"), "lockfileVersion: '9.0'\n", "utf8");
    await writeFile(path.join(tempRoot, "AGENTS.md"), "# Existing instructions\n", "utf8");
    await mkdir(path.join(tempRoot, "docs", "specs"), { recursive: true });

    const discovery = discoverExisting(tempRoot);

    assert.deepEqual(discovery.existingAiFiles.sort(), ["AGENTS.md", "docs/specs"].sort());
    assert.deepEqual(discovery.detectedProjectFiles, ["package.json", "pnpm-lock.yaml"]);
    assert.deepEqual(discovery.projectTypes, ["node"]);
    assert.equal(discovery.packageManager, "pnpm");
    assert.deepEqual(discovery.projectKindSuggestion, {
      kind: "code",
      confidence: "high",
      evidence: ["project type: node"],
    });
    assert.deepEqual(discovery.commands, [
      { kind: "unit-test", command: "pnpm run test", confidence: "high" },
      { kind: "lint", command: "pnpm run lint", confidence: "high" },
      { kind: "build", command: "pnpm run build", confidence: "high" },
      { kind: "project-validation", command: "pnpm run validate", confidence: "high" },
    ]);
    assert.deepEqual(discovery.suggestedVerification, [
      { kind: "project-validation", command: "pnpm run validate", confidence: "high" },
      { kind: "lint", command: "pnpm run lint", confidence: "high" },
      { kind: "unit-test", command: "pnpm run test", confidence: "high" },
      { kind: "build", command: "pnpm run build", confidence: "high" },
    ]);
  } finally {
    await rm(tempRoot, { recursive: true, force: true });
  }
});

test("discover-existing suggests boardgame project kind from design docs", async () => {
  const tempRoot = await mkdtemp(path.join(os.tmpdir(), "cat-discover-boardgame-"));

  try {
    await mkdir(path.join(tempRoot, "docs"), { recursive: true });
    await writeFile(path.join(tempRoot, "README.md"), "# Boardgame\n", "utf8");
    await writeFile(path.join(tempRoot, "docs", "CARD_TYPES.md"), "# Cards\n", "utf8");
    await writeFile(path.join(tempRoot, "docs", "CORE_GAMEPLAY_LOOP.md"), "# Loop\n", "utf8");

    const discovery = discoverExisting(tempRoot);

    assert.equal(discovery.projectKindSuggestion.kind, "boardgame");
    assert.equal(discovery.projectKindSuggestion.confidence, "high");
    assert.deepEqual(discovery.projectKindSuggestion.evidence.sort(), [
      "docs/CARD_TYPES.md",
      "docs/CORE_GAMEPLAY_LOOP.md",
    ].sort());
  } finally {
    await rm(tempRoot, { recursive: true, force: true });
  }
});

test("discover-existing detects mature session advisor artifacts", async () => {
  const tempRoot = await mkdtemp(path.join(os.tmpdir(), "cat-discover-advisor-"));

  try {
    await mkdir(path.join(tempRoot, ".agents", "skills", "session-artifact-advisor"), {
      recursive: true,
    });
    await mkdir(path.join(tempRoot, "docs", "ai", "session-advisor"), { recursive: true });
    await writeFile(
      path.join(tempRoot, ".agents", "skills", "session-artifact-advisor", "SKILL.md"),
      "# Session Artifact Advisor\n",
      "utf8"
    );

    const discovery = discoverExisting(tempRoot);

    assert.equal(discovery.advisorStatus, "session-artifact-advisor");
    assert.deepEqual(discovery.advisorArtifacts.sort(), [
      ".agents/skills/session-artifact-advisor/SKILL.md",
      "docs/ai/session-advisor",
    ].sort());
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
      projectKind: "boardgame",
    });

    assert.equal(result.projectKind, "boardgame");
    assert.ok(result.blockedExisting.includes("AGENTS.md"));
    assert.ok(result.proposedCreates.includes(".gitignore"));
    assert.ok(result.proposedCreates.includes("CLAUDE.md"));
    assert.ok(result.proposedCreates.includes("docs/tasks/TEMPLATE.md"));
    assert.equal(result.complete, false);
    assert.ok(result.verificationDraft.some((row) => row.check === "Playtest checklist"));
    assert.equal(result.verificationDraft.some((row) => row.check === "Unit tests"), false);

    const files = await readdir(tempRoot);
    assert.deepEqual(files, ["AGENTS.md"]);
  } finally {
    await rm(tempRoot, { recursive: true, force: true });
  }
});

test("onboard-existing flags mature advisor before proposing generic advisor", async () => {
  const tempRoot = await mkdtemp(path.join(os.tmpdir(), "cat-onboard-mature-advisor-"));

  try {
    await mkdir(path.join(tempRoot, ".agents", "skills", "session-artifact-advisor"), {
      recursive: true,
    });
    await writeFile(
      path.join(tempRoot, ".agents", "skills", "session-artifact-advisor", "SKILL.md"),
      "# Session Artifact Advisor\n",
      "utf8"
    );

    const result = await onboardExisting({
      target: tempRoot,
      agent: "codex",
      workflow: "light",
      contextAdvisor: true,
    });

    assert.equal(result.discovery.advisorStatus, "session-artifact-advisor");
    assert.ok(
      result.recommendations.includes(
        "Existing mature advisor found; prefer manual merge or skip generic context advisor."
      )
    );
    assert.ok(
      result.findings.some((finding) => finding.title === "Existing mature advisor detected")
    );
  } finally {
    await rm(tempRoot, { recursive: true, force: true });
  }
});

test("onboard-existing warns when selected project kind conflicts with discovery", async () => {
  const tempRoot = await mkdtemp(path.join(os.tmpdir(), "cat-onboard-kind-warning-"));

  try {
    await mkdir(path.join(tempRoot, "docs"), { recursive: true });
    await writeFile(path.join(tempRoot, "docs", "CARD_TYPES.md"), "# Cards\n", "utf8");

    const result = await onboardExisting({
      target: tempRoot,
      agent: "codex",
      workflow: "task-first",
      projectKind: "code",
    });

    assert.equal(result.discovery.projectKindSuggestion.kind, "boardgame");
    assert.ok(
      result.recommendations.includes(
        "Discovery suggests project kind boardgame; review --project-kind before generation."
      )
    );
    assert.ok(
      result.findings.some((finding) => finding.title === "Project kind may be misclassified")
    );
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
    assert.match(result.stdout, /Verification draft/);
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
    projectKind: "boardgame",
    packs: [],
    discovery: {
      existingAiFiles: ["AGENTS.md"],
      detectedProjectFiles: ["package.json"],
      projectTypes: ["node"],
      packageManager: "npm",
      advisorStatus: "manual-context-advisor",
      advisorArtifacts: [".agents/skills/context-artifact-advisor/SKILL.md"],
      commands: [{ kind: "unit-test", command: "npm run test", confidence: "high" }],
      suggestedVerification: [{ kind: "unit-test", command: "npm run test", confidence: "high" }],
    },
    verificationDraft: [
      { check: "Unit tests", command: "npm run test", confidence: "high" },
    ],
    proposedCreates: ["docs/tasks/TEMPLATE.md"],
    blockedExisting: ["AGENTS.md"],
    contextAdvisor: false,
    recommendations: ["Manual merge review needed for existing files before generation."],
    findings: [
      {
        severity: "high",
        title: "Missing selected AI infrastructure files",
        detail: "1 files would be created for the selected options.",
      },
    ],
  };

  const markdown = renderOnboardProposal(result);

  assert.match(markdown, /# Onboard Existing Proposal/);
  assert.match(markdown, /Project kind: `boardgame`/);
  assert.match(markdown, /Packs: `none`/);
  assert.match(markdown, /Context advisor: `disabled`/);
  assert.match(markdown, /Complete: `no`/);
  assert.match(markdown, /`AGENTS\.md`/);
  assert.match(markdown, /## Suggested Verification/);
  assert.match(markdown, /## Advisor Status/);
  assert.match(markdown, /`manual-context-advisor`/);
  assert.match(markdown, /context-artifact-advisor/);
  assert.match(markdown, /## Verification Draft/);
  assert.match(markdown, /\| Unit tests \| `npm run test` \| high \|/);
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

test("CLI onboard-existing --check detects generated metadata mismatch", async () => {
  const tempRoot = await mkdtemp(path.join(os.tmpdir(), "cat-onboard-check-mismatch-"));
  const target = path.join(tempRoot, "generated-project");

  try {
    await initNew({
      target,
      agent: "codex",
      workflow: "task-first",
      projectKind: "code",
      dryRun: false,
    });

    await assert.rejects(
      execFileAsync(process.execPath, [
        cliPath,
        "onboard-existing",
        "--target",
        target,
        "--agent",
        "codex",
        "--workflow",
        "task-first",
        "--project-kind",
        "boardgame",
        "--check",
      ]),
      (error) => {
        assert.equal(error.code, 1);
        assert.match(error.stdout, /Configuration issues/);
        assert.match(error.stdout, /expected projectKind=boardgame; actual projectKind=code/);
        assert.match(error.stdout, /Complete: no/);
        return true;
      }
    );
  } finally {
    await rm(tempRoot, { recursive: true, force: true });
  }
});

test("CLI onboard-existing proposes manual context advisor artifacts", async () => {
  const tempRoot = await mkdtemp(path.join(os.tmpdir(), "cat-onboard-advisor-"));

  try {
    const result = await execFileAsync(process.execPath, [
      cliPath,
      "onboard-existing",
      "--target",
      tempRoot,
      "--agent",
      "codex",
      "--workflow",
      "light",
      "--context-advisor",
      "--output",
      "json",
    ]);
    const parsed = JSON.parse(result.stdout);

    assert.equal(parsed.contextAdvisor, true);
    assert.ok(parsed.proposedCreates.includes(".agents/skills/context-artifact-advisor/SKILL.md"));
    assert.ok(parsed.proposedCreates.includes("docs/ai/advisor/proposals/index.md"));
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
    assert.match(proposal, /## Recommendations/);
    assert.match(proposal, /## Findings/);

    const targetFiles = await readdir(target);
    assert.deepEqual(targetFiles, ["README.md"]);
  } finally {
    await rm(tempRoot, { recursive: true, force: true });
  }
});

test("CLI onboard-existing writes proposals under local proposal dir by project", async () => {
  const tempRoot = await mkdtemp(path.join(os.tmpdir(), "cat-onboard-proposal-dir-"));
  const target = path.join(tempRoot, "Existing Project");
  const proposalDir = path.join(tempRoot, ".local", "proposals");

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
      "--proposal-dir",
      proposalDir,
    ]);

    assert.match(result.stdout, /Proposal written:/);

    const projectProposalDir = path.join(proposalDir, "Existing-Project");
    const proposalFiles = await readdir(projectProposalDir);
    assert.equal(proposalFiles.length, 1);
    assert.match(proposalFiles[0], /onboarding-proposal\.md$/);

    const proposal = await readFile(path.join(projectProposalDir, proposalFiles[0]), "utf8");
    assert.match(proposal, /# Onboard Existing Proposal/);
    assert.match(proposal, /README\.md/);

    const targetFiles = await readdir(target);
    assert.deepEqual(targetFiles, ["README.md"]);
  } finally {
    await rm(tempRoot, { recursive: true, force: true });
  }
});

test("CLI onboard-existing rejects simultaneous proposal file and dir", async () => {
  const tempRoot = await mkdtemp(path.join(os.tmpdir(), "cat-onboard-proposal-conflict-"));

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
        "--proposal-file",
        path.join(tempRoot, "proposal.md"),
        "--proposal-dir",
        path.join(tempRoot, ".local", "proposals"),
      ]),
      (error) => {
        assert.equal(error.code, 1);
        assert.match(error.stderr, /Use either --proposal-file or --proposal-dir, not both/);
        return true;
      }
    );
  } finally {
    await rm(tempRoot, { recursive: true, force: true });
  }
});
