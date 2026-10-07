import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { initNew } from "../src/init-new.mjs";
import { updateExisting } from "../src/update-existing.mjs";
import { validateGeneratedProject } from "../src/validate-generated-project.mjs";
import { configErrors, normalizeConfig } from "../src/config.mjs";
import { parseGeneratedCodexRole, parseGeneratedClaudeRole, rolePaths } from "../src/roles.mjs";

const cli = path.resolve("bin/codex-agent-template.mjs");
const selectedRoles = ["repo-scout", "change-reviewer", "change-verifier"];
const selectedPacks = ["compatibility", "reliability", "architecture"];
async function fixture(t) {
  const root = await mkdtemp(path.join(os.tmpdir(), "cat-agnostic-"));
  t.after(async () => {
    const relative = path.relative(os.tmpdir(), root);
    assert.ok(relative && !relative.startsWith("..") && !path.isAbsolute(relative));
    await rm(root, {recursive: true, force: true});
  });
  return root;
}

test("roles resolve workflow dependencies; old v1 config can omit roles", () => {
  const config = normalizeConfig({roles: selectedRoles, skills: ["grill-me", "verify-change"]});
  assert.deepEqual(config.skills, ["grill-me", "verify-change", "repo-discovery", "review-agent"]);
  assert.deepEqual(normalizeConfig().roles, []);
  assert.ok(configErrors({agent: "codex", workflow: "light", roles: ["repo-scout"], skills: []}).some(x => x.includes("requires skill repo-discovery")));
  assert.throws(() => normalizeConfig({roles: ["unknown"]}), error => error.code === "INVALID_CONFIG");
  assert.throws(() => normalizeConfig({roles: "repo-scout"}), error => error.code === "INVALID_CONFIG");
});

test("default generation stays compact and emits no role or starter skill", async t => {
  const root = await fixture(t);
  const result = await initNew({target: root});
  assert.deepEqual(result.skills, []);
  assert.deepEqual(result.roles, []);
  assert.equal(result.created.some(name => name.includes("/agents/") || name.includes("/skills/")), false);
  assert.equal(result.created.includes("docs/ai/delegation.md"), false);
});

test("all runtimes generate valid native roles and shared workflows across different project kinds", async t => {
  const root = await fixture(t);
  const projects = [
    {name: "application", kind: "code", manifest: "package.json", content: JSON.stringify({scripts: {test: "custom-project-check"}})},
    {name: "command-line", kind: "code", manifest: "Cargo.toml", content: '[package]\nname = "tool"\n'},
    {name: "library", kind: "code", manifest: "pyproject.toml", content: '[project]\nname = "library"\n'},
    {name: "documentation", kind: "docs"},
    {name: "tabletop", kind: "no-code"},
  ];
  for (const project of projects) for (const agent of ["codex", "claude", "codex+claude"]) {
    const target = path.join(root, `${project.name}-${agent}`);
    await mkdir(target);
    await writeFile(path.join(target, "README.md"), `# ${project.name}\n`);
    if (project.manifest) await writeFile(path.join(target, project.manifest), project.content);
    const result = await initNew({target, agent, projectKind: project.kind, roles: selectedRoles, packs: selectedPacks, skills: ["bug-investigator"], dryRun: false});
    assert.ok(result.skills.includes("repo-discovery") && result.skills.includes("verify-change"));
    const doctor = await validateGeneratedProject(target);
    assert.equal(doctor.valid, true, doctor.errors.join("\n"));
    assert.ok(doctor.findings.some(x => x.code === "RUNTIME_UNVERIFIED"));
    for (const role of selectedRoles) for (const filename of rolePaths(agent, role)) {
      const text = await readFile(path.join(target, filename), "utf8");
      const fields = filename.endsWith(".toml") ? parseGeneratedCodexRole(text) : parseGeneratedClaudeRole(text);
      assert.equal(fields.name, role);
      assert.equal(fields.model, undefined);
      if (filename.endsWith(".toml")) assert.equal(fields.sandbox_mode, "read-only");
      else {
        assert.equal(fields.permissionMode, "default");
        assert.ok(fields.skills.length > 0);
        assert.equal(fields.tools.includes("Write") || fields.tools.includes("Edit"), false);
        if (role !== "change-verifier") assert.equal(fields.tools.includes("Bash"), false);
      }
    }
    assert.equal(result.created.some(name => name.startsWith(agent === "codex" ? ".claude/" : agent === "claude" ? ".codex/" : "not-a-runtime/")), false);
    const rootRules = await readFile(path.join(target, agent === "claude" ? "CLAUDE.md" : "AGENTS.md"), "utf8");
    assert.ok(rootRules.split("\n").length < 200);
    const verification = await readFile(path.join(target, "docs/ai/verification.md"), "utf8");
    if (["docs", "no-code"].includes(project.kind)) assert.equal(/npm run|pytest|cargo test/.test(verification), false);
    if (project.name === "library") assert.equal(verification.includes("pytest"), false);
  }
});

test("doctor rejects widened role permissions, broken workflow links, and missing native files", async t => {
  const root = await fixture(t);
  await initNew({target: root, agent: "codex+claude", roles: selectedRoles, dryRun: false});
  const codexPath = path.join(root, ".codex/agents/repo-scout.toml");
  await writeFile(codexPath, (await readFile(codexPath, "utf8")).replace('sandbox_mode = "read-only"', 'sandbox_mode = "workspace-write"'));
  const claudePath = path.join(root, ".claude/agents/change-reviewer.md");
  await writeFile(claudePath, (await readFile(claudePath, "utf8")).replace('["Read","Grep","Glob"]', '["Read","Grep","Glob","Bash"]'));
  await rm(path.join(root, ".claude/agents/change-verifier.md"));
  await rm(path.join(root, ".agents/skills/repo-discovery/SKILL.md"));
  const doctor = await validateGeneratedProject(root);
  for (const code of ["UNSAFE_ROLE_POLICY", "MISSING_FILE", "BROKEN_LINK"]) assert.ok(doctor.findings.some(x => x.code === code));
});

test("reviewed update adds roles, preserves selections, refuses custom roles, and replays safely", async t => {
  const root = await fixture(t);
  await initNew({target: root, agent: "codex+claude", skills: ["grill-me"], dryRun: false});
  const preview = await updateExisting({target: root, roles: selectedRoles, packs: selectedPacks});
  assert.deepEqual(preview.roles, selectedRoles);
  assert.ok(preview.skills.includes("grill-me") && preview.skills.includes("repo-discovery"));
  const applied = await updateExisting({target: root, roles: selectedRoles, packs: selectedPacks, apply: true, approval: "fixture approved", reviewedPlan: preview.plan});
  assert.ok(applied.written.includes(".codex/agents/repo-scout.toml"));
  assert.equal((await updateExisting({target: root})).complete, true);
  assert.equal((await updateExisting({target: root, roles: selectedRoles, packs: selectedPacks, apply: true, approval: "fixture approved", reviewedPlan: preview.plan})).written.length, 0);
  const roleFile = path.join(root, ".codex/agents/repo-scout.toml");
  const custom = (await readFile(roleFile, "utf8")) + "# User-owned rule\n";
  await writeFile(roleFile, custom);
  const changed = await updateExisting({target: root});
  assert.ok(changed.conflicts.includes(".codex/agents/repo-scout.toml"));
  await assert.rejects(updateExisting({target: root, apply: true, approval: "fixture", reviewedPlan: changed.plan}), error => error.code === "CONFLICT");
});

test("CLI carries role dependencies through onboarding and saved update plans", async t => {
  const root = await fixture(t), target = path.join(root, "project"), planFile = path.join(root, "review.json");
  await initNew({target, dryRun: false});
  execFileSync(process.execPath, [cli, "update-existing", "--target", target, "--role", "repo-scout", "--role", "change-verifier", "--plan-file", planFile]);
  const applied = JSON.parse(execFileSync(process.execPath, [cli, "update-existing", "--target", target, "--apply", "--approval", "fixture", "--plan-file", planFile, "--output=json"], {encoding: "utf8"}));
  assert.deepEqual(applied.roles, ["repo-scout", "change-verifier"]);
  const onboard = JSON.parse(execFileSync(process.execPath, [cli, "onboard-existing", "--target", target, "--role", "repo-scout", "--role", "change-verifier", "--check", "--output=json"], {encoding: "utf8"}));
  assert.equal(onboard.complete, true);
  assert.deepEqual(onboard.skills, ["repo-discovery", "verify-change"]);
  assert.throws(() => execFileSync(process.execPath, [cli, "init-new", "--target", target, "--role", "unrecognized", "--output=json"], {stdio: ["ignore", "pipe", "pipe"]}), error => error.status === 2 && JSON.parse(error.stdout).error.code === "USAGE");
});

test("v0.2 schema-v1 configurations remain readable and upgrade only by reviewed apply", async t => {
  const root = await fixture(t);
  await initNew({target: root, dryRun: false});
  const configFile = path.join(root, ".agent-template.json");
  const oldConfig = JSON.parse(await readFile(configFile, "utf8"));
  delete oldConfig.roles; oldConfig.version = "0.2.0";
  assert.deepEqual(configErrors(oldConfig), []);
  const oldText = JSON.stringify(oldConfig, null, 2) + "\n";
  await writeFile(configFile, oldText);
  // Model the original ownership manifest, which owns that legacy configuration.
  const manifestFile = path.join(root, ".agent-template-manifest.json");
  const manifest = JSON.parse(await readFile(manifestFile, "utf8"));
  const {hash} = await import("../src/file-plan.mjs");
  manifest.files[".agent-template.json"] = hash(oldText);
  await writeFile(manifestFile, JSON.stringify(manifest, null, 2) + "\n");
  const preview = await updateExisting({target: root, roles: ["repo-scout"]});
  assert.deepEqual(preview.conflicts, []);
  assert.equal(JSON.parse(await readFile(configFile, "utf8")).version, "0.2.0");
  await updateExisting({target: root, roles: ["repo-scout"], apply: true, approval: "fixture", reviewedPlan: preview.plan});
  assert.deepEqual(JSON.parse(await readFile(configFile, "utf8")).roles, ["repo-scout"]);
});
