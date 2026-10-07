import assert from "node:assert/strict";
import {execFileSync} from "node:child_process";
import {mkdtemp, mkdir, readFile, rm, writeFile} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {configErrors, normalizeConfig, presets, presetDefinitions, recordTemplates} from "../src/config.mjs";
import {initNew} from "../src/init-new.mjs";
import {onboardExisting} from "../src/onboard-existing.mjs";
import {updateExisting} from "../src/update-existing.mjs";
import {validateGeneratedProject} from "../src/validate-generated-project.mjs";
import {hash} from "../src/file-plan.mjs";

const cli = path.resolve("bin/codex-agent-template.mjs");
const json = args => JSON.parse(execFileSync(process.execPath, [cli, ...args, "--output=json"], {encoding:"utf8"}));
async function fixture(t) {
  const root = await mkdtemp(path.join(os.tmpdir(), "cat-presets-"));
  t.after(async () => {
    const relative = path.relative(os.tmpdir(), root);
    assert.ok(relative && !relative.startsWith("..") && !path.isAbsolute(relative));
    await rm(root, {recursive:true, force:true});
  });
  return root;
}

test("presets expand only skills, combine explicit skills, and preserve independent settings", () => {
  for (const preset of presets) {
    const config = normalizeConfig({preset, skills:["release-check", "release-check"], roles:["docs-researcher"], recordTemplates:["decision", "decision"], packs:["privacy"], workflow:"task-first", approvalPolicy:"risk-based"});
    assert.deepEqual(config.skills, [...new Set([...presetDefinitions[preset].skills, "release-check", "repo-discovery"])]);
    assert.deepEqual(config.roles, ["docs-researcher"]);
    assert.deepEqual(config.recordTemplates, ["decision"]);
    assert.deepEqual(config.packs, ["privacy"]);
    assert.equal(config.workflow, "task-first");
    assert.equal(config.approvalPolicy, "risk-based");
    assert.equal(Object.hasOwn(config, "preset"), false);
    const minimal = normalizeConfig({preset});
    assert.deepEqual(minimal.skills, presetDefinitions[preset].skills);
    assert.deepEqual(minimal.roles, []);
    assert.deepEqual(minimal.packs, []);
    assert.deepEqual(minimal.recordTemplates, []);
    assert.equal(minimal.contextAdvisor, false);
  }
  for (const input of [{preset:"unknown"}, {preset:"__proto__"}, {preset:[]}, {preset:"review", skills:"docs-sync"}, {recordTemplates:"decision"}, {recordTemplates:["../decision"]}]) assert.throws(() => normalizeConfig(input), error => error.code === "INVALID_CONFIG");
  assert.ok(configErrors({...normalizeConfig(), recordTemplates:["decision", "decision"]}).some(x => x.includes("duplicates")));
});

test("default init emits no preset artifacts or record templates", async t => {
  const root = await fixture(t);
  const result = await initNew({target:root});
  assert.deepEqual(result.recordTemplates, []);
  assert.deepEqual(result.skills, []);
  assert.equal(result.created.some(name => name.includes("/templates/") || name === "docs/ai/record-templates.md" || name.includes("/skills/")), false);
  await assert.rejects(readFile(path.join(root, ".agent-template.json")), error => error.code === "ENOENT");
});

test("preset generation stays agnostic and doctor validates selected record links in every mode", async t => {
  const root = await fixture(t);
  const kinds = ["code", "docs", "no-code", "game-design"];
  const modes = ["codex", "claude", "codex+claude"];
  for (const [index, preset] of presets.entries()) {
    const target = path.join(root, preset), agent = modes[index % modes.length];
    const result = await initNew({target, agent, preset, projectKind:kinds[index], recordTemplates, dryRun:false});
    assert.deepEqual(result.skills, presetDefinitions[preset].skills);
    assert.deepEqual(result.roles, []);
    assert.deepEqual(result.packs, []);
    const config = JSON.parse(await readFile(path.join(target, ".agent-template.json"), "utf8"));
    assert.equal(Object.hasOwn(config, "preset"), false);
    assert.deepEqual(config.recordTemplates, recordTemplates);
    assert.equal(result.created.some(name => name.includes("/agents/") && !name.endsWith("openai.yaml")), false);
    const generatedTemplates = result.created.filter(name => name.startsWith("docs/ai/templates/"));
    assert.equal(generatedTemplates.length, recordTemplates.length);
    for (const name of recordTemplates) assert.equal(await readFile(path.join(target, `docs/ai/templates/${name}.md`), "utf8"), await readFile(`templates/base/docs/ai/templates/${name}.md.tmpl`, "utf8"));
    const doctor = await validateGeneratedProject(target);
    assert.equal(doctor.valid, true, doctor.errors.join("\n"));
    assert.equal((await onboardExisting({target, agent, preset, projectKind:kinds[index], recordTemplates})).complete, true);
    assert.equal((await updateExisting({target})).complete, true);
    const rootName = agent === "claude" ? "CLAUDE.md" : "AGENTS.md";
    assert.ok((await readFile(path.join(target, rootName), "utf8")).split("\n").length <= 200);
  }
});

test("preset update replaces only skills and freezes expanded options in reviewed plans", async t => {
  const root = await fixture(t);
  await initNew({target:root, workflow:"task-first", roles:["repo-scout"], packs:["privacy"], skills:["release-check"], recordTemplates:["decision"], dryRun:false});
  const preview = await updateExisting({target:root, preset:"review", skills:["docs-sync"]});
  assert.deepEqual(preview.skills, ["review-agent", "verify-change", "contract-review", "docs-sync", "repo-discovery"]);
  assert.deepEqual(preview.roles, ["repo-scout"]);
  assert.deepEqual(preview.packs, ["privacy"]);
  assert.deepEqual(preview.recordTemplates, ["decision"]);
  assert.equal(preview.workflow, "task-first");
  assert.equal(Object.hasOwn(preview.plan.options, "preset"), false);
  assert.deepEqual(preview.plan.options.skills, preview.skills);
  assert.ok(JSON.parse(await readFile(path.join(root, ".agent-template.json"), "utf8")).skills.includes("release-check"));
  const applied = await updateExisting({target:root, ...preview.plan.options, apply:true, approval:"fixture", reviewedPlan:preview.plan});
  assert.deepEqual(applied.skills, preview.skills);
  assert.equal((await updateExisting({target:root})).complete, true);
  // A changed preset/explicit selection still cannot apply the old reviewed content.
  await assert.rejects(updateExisting({target:root, preset:"maintenance", apply:true, approval:"fixture", reviewedPlan:preview.plan}), error => error.code === "STALE_PLAN");
  assert.deepEqual((await updateExisting({target:root, skills:["release-check"]})).skills, ["release-check", "repo-discovery"]);
  assert.ok(await readFile(path.join(root, ".agents/skills/release-check/SKILL.md"), "utf8"));
});

test("record templates preserve custom files and deselection retains artifacts", async t => {
  const root = await fixture(t);
  await initNew({target:root, recordTemplates:["decision"], dryRun:false});
  const filename = path.join(root, "docs/ai/templates/decision.md");
  const custom = (await readFile(filename, "utf8")) + "\nExisting project decision convention.\n";
  await writeFile(filename, custom);
  const conflict = await updateExisting({target:root});
  assert.ok(conflict.conflicts.includes("docs/ai/templates/decision.md"));
  await assert.rejects(updateExisting({target:root, apply:true, approval:"fixture", reviewedPlan:conflict.plan}), error => error.code === "CONFLICT");
  const deselect = await updateExisting({target:root, recordTemplates:[]});
  await updateExisting({target:root, ...deselect.plan.options, apply:true, approval:"fixture", reviewedPlan:deselect.plan});
  assert.equal(await readFile(filename, "utf8"), custom);
  assert.deepEqual(JSON.parse(await readFile(path.join(root, ".agent-template.json"), "utf8")).recordTemplates, []);
  assert.equal((await updateExisting({target:root})).complete, true);
  assert.equal((await readFile(path.join(root, "AGENTS.md"), "utf8")).includes("docs/ai/record-templates.md"), false);
});

test("init refuses an existing selected template and doctor reports missing or broken selected records", async t => {
  const root = await fixture(t), conflictTarget = path.join(root, "conflict"), target = path.join(root, "valid");
  await mkdir(path.join(conflictTarget, "docs/ai/templates"), {recursive:true});
  await writeFile(path.join(conflictTarget, "docs/ai/templates/decision.md"), "Custom project format\n");
  const blocked = await initNew({target:conflictTarget, recordTemplates:["decision"], dryRun:false});
  assert.ok(blocked.blocked.includes("docs/ai/templates/decision.md"));
  assert.deepEqual(blocked.written, []);
  await assert.rejects(readFile(path.join(conflictTarget, "AGENTS.md")), error => error.code === "ENOENT");
  await initNew({target, recordTemplates:["decision"], dryRun:false});
  await rm(path.join(target, "docs/ai/templates/decision.md"));
  const doctor = await validateGeneratedProject(target);
  for (const code of ["MISSING_FILE", "BROKEN_LINK"]) assert.ok(doctor.findings.some(x => x.code === code));
});

test("pre-0.5 schema-v1 configs omit recordTemplates and upgrade through reviewed apply", async t => {
  const root = await fixture(t);
  await initNew({target:root, dryRun:false});
  const filename = path.join(root, ".agent-template.json");
  const config = JSON.parse(await readFile(filename, "utf8"));
  delete config.recordTemplates; config.version = "0.4.0";
  assert.deepEqual(configErrors(config), []);
  const text = JSON.stringify(config, null, 2) + "\n";
  await writeFile(filename, text);
  const manifestName = path.join(root, ".agent-template-manifest.json");
  const manifest = JSON.parse(await readFile(manifestName, "utf8"));
  manifest.files[".agent-template.json"] = hash(text);
  await writeFile(manifestName, JSON.stringify(manifest, null, 2) + "\n");
  assert.equal((await validateGeneratedProject(root)).valid, true);
  const preview = await updateExisting({target:root, recordTemplates:["verification-result"]});
  assert.deepEqual(preview.conflicts, []);
  assert.equal(JSON.parse(await readFile(filename, "utf8")).version, "0.4.0");
  await updateExisting({target:root, ...preview.plan.options, apply:true, approval:"fixture", reviewedPlan:preview.plan});
  assert.equal((await validateGeneratedProject(root)).valid, true);
});

test("CLI lists, previews, saves, applies, and checks preset/record selections with strict errors", async t => {
  const root = await fixture(t), target = path.join(root, "project"), planFile = path.join(root, "review.json");
  const catalog = json(["list"]);
  assert.deepEqual(catalog.presets, ["essential", "review", "maintenance", "architecture"]);
  assert.deepEqual(catalog.recordTemplates, recordTemplates);
  assert.deepEqual(catalog.presetDefinitions, presetDefinitions);
  const flags = ["--preset", "maintenance", "--skill", "release-check", "--role", "docs-researcher", "--record-template", "investigation", "--record-template", "verification-result"];
  const preview = json(["init-new", "--target", target, ...flags]);
  assert.equal(preview.dryRun, true);
  assert.deepEqual(preview.recordTemplates, ["investigation", "verification-result"]);
  await assert.rejects(readFile(path.join(target, ".agent-template.json")), error => error.code === "ENOENT");
  await initNew({target, dryRun:false});
  json(["update-existing", "--target", target, ...flags, "--plan-file", planFile]);
  const saved = JSON.parse(await readFile(planFile, "utf8"));
  assert.deepEqual(saved.options.skills, preview.skills);
  assert.equal(Object.hasOwn(saved.options, "preset"), false);
  // Architecture is a strict subset of essential: old reviewed skills must not
  // be unioned into an explicit apply override and hide the changed selection.
  const essentialPlan = path.join(root, "essential-review.json");
  json(["update-existing", "--target", target, "--preset", "essential", "--plan-file", essentialPlan]);
  assert.throws(() => json(["update-existing", "--target", target, "--preset", "architecture", "--apply", "--approval", "fixture", "--plan-file", essentialPlan]), error => error.status === 1 && JSON.parse(error.stdout).error.code === "STALE_PLAN");
  const applied = json(["update-existing", "--target", target, "--apply", "--approval", "fixture", "--plan-file", planFile]);
  assert.deepEqual(applied.skills, preview.skills);
  assert.deepEqual(applied.recordTemplates, preview.recordTemplates);
  assert.equal(json(["onboard-existing", "--target", target, ...flags, "--check"]).complete, true);
  assert.deepEqual(json(["update-existing", "--target", target, "--apply", "--approval", "fixture", "--plan-file", planFile]).written, []);
  for (const args of [["init-new", "--preset", "typo"], ["init-new", "--record-template", "../decision"], ["validate", "--preset", "essential"], ["init-new", "--preset", "review", "--preset", "architecture"]]) assert.throws(() => json(args), error => error.status === 2 && JSON.parse(error.stdout).error.code === "USAGE");
});
