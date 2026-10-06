import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtemp, readFile, writeFile, mkdir, rm, symlink } from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import test from "node:test";
import { initNew } from "../src/init-new.mjs";
import { updateExisting } from "../src/update-existing.mjs";
import { discoverExisting } from "../src/discover-existing.mjs";
import { validateGeneratedProject } from "../src/validate-generated-project.mjs";
import { applyEntries, hash, makeEntry, safePath } from "../src/file-plan.mjs";

const cli=path.resolve("bin/codex-agent-template.mjs");
async function fixture(t) {
  const root=await mkdtemp(path.join(os.tmpdir(),"cat-hardening-"));
  t.after(async()=>{const rel=path.relative(os.tmpdir(),root);assert.ok(rel && !rel.startsWith("..") && !path.isAbsolute(rel));await rm(root,{recursive:true,force:true});});
  return root;
}
function run(args) {
  try { return {code:0,stdout:execFileSync(process.execPath,[cli,...args],{encoding:"utf8",stdio:["ignore","pipe","pipe"]})}; }
  catch(e) { return {code:e.status,stdout:e.stdout.toString(),stderr:e.stderr.toString()}; }
}

test("JSON validation failure and usage errors keep a parseable output and correct exit status",async t=>{
  const root=await fixture(t);
  const invalid=run(["validate","--target",root,"--output=json"]);
  assert.equal(invalid.code,1); assert.equal(JSON.parse(invalid.stdout).valid,false);
  for(const args of [["list","--typo=value"],["init-new","--target",root,"--apply","--dry-run"]]) {
    const result=run([...args,"--output=json"]); assert.equal(result.code,2); assert.equal(JSON.parse(result.stdout).error.code,"USAGE");
  }
});

test("init previews by default; explicit apply creates and repeated init preserves files",async t=>{
  const root=await fixture(t), target=path.join(root,"new");
  const preview=run(["init-new","--target",target,"--output=json"]);
  assert.equal(JSON.parse(preview.stdout).dryRun,true);
  await assert.rejects(readFile(path.join(target,"AGENTS.md")));
  assert.equal(run(["init-new","--target",target,"--apply"]).code,0);
  const before=await readFile(path.join(target,"AGENTS.md"),"utf8");
  assert.equal(run(["init-new","--target",target,"--apply"]).code,1);
  assert.equal(await readFile(path.join(target,"AGENTS.md"),"utf8"),before);
});

test("JSON proposal export never corrupts stdout or overwrites existing artifacts",async t=>{
  const root=await fixture(t), proposal=path.join(root,"proposal.md");
  const result=run(["onboard-existing","--target",root,"--proposal-file",proposal,"--output=json"]);
  assert.equal(result.code,0); assert.equal(JSON.parse(result.stdout).proposalPath,proposal);
  const second=run(["onboard-existing","--target",root,"--proposal-file",proposal,"--output=json"]);
  assert.equal(second.code,1); assert.equal(JSON.parse(second.stdout).error.code,"EEXIST");
  await initNew({target:path.join(root,"generated"),dryRun:false});
  const bad=run(["onboard-existing","--target",path.join(root,"generated"),"--proposal-file",path.join(root,"generated","AGENTS.md"),"--output=json"]);
  assert.equal(JSON.parse(bad.stdout).error.code,"UNSAFE_EXPORT");
});

test("update defaults preserve selected mode, workflow, packs, skills and policy",async t=>{
  const root=await fixture(t);
  await initNew({target:root,agent:"claude",workflow:"spec-tdd",packs:["privacy"],skills:["grill-me"],approvalPolicy:"risk-based",dryRun:false});
  const preview=await updateExisting({target:root});
  assert.equal(preview.complete,true); assert.equal(preview.agent,"claude"); assert.equal(preview.workflow,"spec-tdd");
  assert.deepEqual(preview.skills,["grill-me"]); assert.deepEqual(preview.packs,["privacy"]); assert.equal(preview.approvalPolicy,"risk-based");
});

test("user rules become conflicts; approved plan never erases them",async t=>{
  const root=await fixture(t);
  await initNew({target:root,dryRun:false});
  const rules=(await readFile(path.join(root,"AGENTS.md"),"utf8"))+"\nPreserve my business rule.\n";
  await writeFile(path.join(root,"AGENTS.md"),rules);
  const preview=await updateExisting({target:root,workflow:"task-first"});
  assert.ok(preview.conflicts.includes("AGENTS.md"));
  await assert.rejects(updateExisting({target:root,workflow:"task-first",apply:true,approval:"approved fixture",reviewedPlan:preview.plan}),e=>e.code==="CONFLICT");
  assert.equal(await readFile(path.join(root,"AGENTS.md"),"utf8"),rules);
});

test("ignore extension preserves user patterns; apply checks saved hashes and is idempotent",async t=>{
  const root=await fixture(t);
  await initNew({target:root,dryRun:false});
  await writeFile(path.join(root,".gitignore"),(await readFile(path.join(root,".gitignore"),"utf8"))+"private-ledger/\n!.env.probe\n");
  const preview=await updateExisting({target:root,workflow:"task-first"});
  assert.equal(preview.conflicts.length,0); assert.ok(preview.plan.entries.find(x=>x.path===".gitignore").diff.includes("private-ledger/"));
  const applied=await updateExisting({target:root,workflow:"task-first",apply:true,approval:"approved fixture",reviewedPlan:preview.plan});
  assert.ok(applied.journalPath); assert.equal(JSON.parse(await readFile(applied.journalPath,"utf8")).status,"complete");
  const ignore=await readFile(path.join(root,".gitignore"),"utf8"); assert.ok(ignore.includes("private-ledger/"));
  assert.equal((await updateExisting({target:root,workflow:"task-first",apply:true,approval:"approved fixture",reviewedPlan:preview.plan})).written.length,0);
  assert.equal((await updateExisting({target:root})).complete,true);
});

test("file edited after proposal invalidates apply before any changes",async t=>{
  const root=await fixture(t);
  await initNew({target:root,dryRun:false});
  const before=await readFile(path.join(root,".agent-template.json"),"utf8");
  const preview=await updateExisting({target:root,workflow:"task-first"});
  await writeFile(path.join(root,"docs/ai/verification.md"),"New evidence from another editor\n");
  await assert.rejects(updateExisting({target:root,workflow:"task-first",apply:true,approval:"approved fixture",reviewedPlan:preview.plan}),e=>e.code==="STALE_PLAN");
  assert.equal(await readFile(path.join(root,".agent-template.json"),"utf8"),before);
});

test("a checksummed empty plan cannot claim a pending update was applied",async t=>{
  const root=await fixture(t);
  await initNew({target:root,dryRun:false});
  const preview=await updateExisting({target:root,workflow:"task-first"});
  const {id,...unsigned}=preview.plan;
  unsigned.entries=[];
  const empty={...unsigned,id:hash(JSON.stringify(unsigned))};
  await assert.rejects(updateExisting({target:root,workflow:"task-first",apply:true,approval:"fixture",reviewedPlan:empty}),e=>e.code==="STALE_PLAN");
  assert.equal((await updateExisting({target:root})).workflow,"light");
});

test("onboarding check exposes broken content and a repair recommendation",async t=>{
  const root=await fixture(t);
  await initNew({target:root,dryRun:false});
  await writeFile(path.join(root,"docs/ai/verification.md"),"[broken](missing.md)\n");
  const result=run(["onboard-existing","--target",root,"--check","--output=json"]);
  const report=JSON.parse(result.stdout);
  assert.equal(result.code,1);
  assert.equal(report.presenceComplete,true);
  assert.equal(report.contentValid,false);
  assert.ok(report.findings.some(x=>x.code==="BROKEN_LINK"));
  assert.ok(report.recommendations.some(x=>x.includes("Repair")));
});

test("legacy adoption requires review and refuses custom unmanaged content",async t=>{
  const root=await fixture(t);
  await initNew({target:root,dryRun:false});
  await rm(path.join(root,".agent-template-manifest.json"));
  assert.ok((await updateExisting({target:root})).conflicts.includes(".agent-template-manifest.json"));
  const preview=await updateExisting({target:root,adopt:true});
  await updateExisting({target:root,adopt:true,apply:true,approval:"adopt fixture",reviewedPlan:preview.plan});
  await rm(path.join(root,".agent-template-manifest.json"));
  await writeFile(path.join(root,"AGENTS.md"),"My unmanaged rules\n");
  assert.ok((await updateExisting({target:root,adopt:true})).conflicts.includes("AGENTS.md"));
});

test("CLI applies the saved options without requiring flags to be repeated",async t=>{
  const root=await fixture(t), target=path.join(root,"project"), planFile=path.join(root,"review.json");
  await initNew({target,dryRun:false});
  assert.equal(run(["update-existing","--target",target,"--workflow=task-first","--skill=grill-me","--plan-file",planFile]).code,0);
  const apply=run(["update-existing","--target",target,"--apply","--approval","fixture approved","--plan-file",planFile,"--output=json"]);
  assert.equal(apply.code,0,apply.stderr); assert.deepEqual(JSON.parse(apply.stdout).skills,["grill-me"]);
});

test("failed multi-file write rolls back earlier writes and retains a recovery journal",async t=>{
  const root=await fixture(t);
  await writeFile(path.join(root,"blocker"),"a file prevents mkdir\n");
  const entries=[makeEntry(root,{relativePath:"first.md",content:"created\n"},"create"),makeEntry(root,{relativePath:"blocker/child.md",content:"second\n"},"create")];
  let journal;
  await assert.rejects(applyEntries(root,entries),e=>{
    assert.equal(e.code,"WRITE_FAILED"); journal=e.details.journalPath; return true;
  });
  assert.equal(JSON.parse(await readFile(journal,"utf8")).status,"rolled-back");
  await assert.rejects(readFile(path.join(root,"first.md")));
});

test("discovery gives evidence without assuming pytest or unit tests and honors budgets",async t=>{
  const root=await fixture(t);
  await writeFile(path.join(root,"pyproject.toml"),'[project]\nname="x"\n');
  await writeFile(path.join(root,"package.json"),JSON.stringify({packageManager:"pnpm@9.0.0",scripts:{test:"custom-integration-runner"},workspaces:["packages/*"]}));
  await mkdir(path.join(root,"packages/api"),{recursive:true});
  await writeFile(path.join(root,"packages/api/package.json"),JSON.stringify({scripts:{lint:"eslint ."}}));
  const report=discoverExisting(root);
  assert.equal(report.commands.some(x=>x.command==="pytest"),false);
  assert.equal(report.commands.find(x=>x.command==="pnpm run test").kind,"test");
  assert.equal(report.commands.find(x=>x.kind==="lint").workingDirectory,"packages/api");
  assert.ok(report.commands.every(x=>x.evidence && x.executed===false));
  const bounded=discoverExisting(root,{maxFiles:1,maxBytes:100,maxFileBytes:100});
  assert.ok(bounded.budget.filesRead<=1 && bounded.budget.bytesRead<=100);
});

test("confirmed discovery commands reach generated verification but inferred commands do not",async t=>{
  const root=await fixture(t);
  await writeFile(path.join(root,"package.json"),JSON.stringify({scripts:{test:"node --test",lint:"eslint ."}}));
  await initNew({target:root,dryRun:false});
  const verification=await readFile(path.join(root,"docs/ai/verification.md"),"utf8");
  assert.ok(verification.includes("npm run test") && verification.includes("package.json#scripts.test"));
});

test("all workflows and agent modes generate reachable valid skills and pack links",async t=>{
  const root=await fixture(t);
  for(const agent of ["codex","claude","codex+claude"]) for(const workflow of ["light","task-first","spec-tdd"]) {
    const target=path.join(root,`${agent}-${workflow}`);
    await initNew({target,agent,workflow,skills:["grill-me","clean-chat-handoff","feature-planner","review-agent"],contextAdvisor:true,packs:["privacy","security"],dryRun:false});
    const result=await validateGeneratedProject(target); assert.equal(result.valid,true,result.errors.join("\n"));
    const instructions=await readFile(path.join(target,agent==="claude" ? "CLAUDE.md" : "AGENTS.md"),"utf8");
    assert.ok(instructions.includes("docs/ai/packs/privacy.md") && instructions.includes("grill-me"));
    if(workflow==="task-first") assert.ok(instructions.includes("docs/tasks/TEMPLATE.md"));
    if(workflow==="spec-tdd") assert.ok(instructions.includes("docs/specs/TEMPLATE.md"));
    assert.ok(instructions.split("\n").length<=200);
  }
});

test("doctor reports invalid schema, broken links, malformed skills and ineffective gitignore",async t=>{
  const root=await fixture(t);
  for(const value of [null,[],{agent:"codex",workflow:"light",schemaVersion:999}]) {
    await writeFile(path.join(root,".agent-template.json"),JSON.stringify(value));
    assert.equal((await validateGeneratedProject(root)).valid,false);
  }
  await rm(path.join(root,".agent-template.json"));
  await initNew({target:root,skills:["grill-me"],dryRun:false});
  const configPath=path.join(root,".agent-template.json");
  const config=JSON.parse(await readFile(configPath,"utf8"));
  await writeFile(configPath,JSON.stringify({...config,toString:"unsupported field"}));
  assert.ok((await validateGeneratedProject(root)).errors.some(x=>x.includes("unknown config field: toString")));
  const incomplete={...config};delete incomplete.skills;
  await writeFile(configPath,JSON.stringify(incomplete));
  assert.ok((await validateGeneratedProject(root)).errors.some(x=>x.includes("missing skills")));
  await writeFile(configPath,JSON.stringify(config));
  await writeFile(path.join(root,".agents/skills/grill-me/SKILL.md"),'---\nname: wrong-name\ndescription: ""\n---\n');
  await writeFile(path.join(root,"docs/ai/verification.md"),"[broken](missing.md)\n");
  await writeFile(path.join(root,".gitignore"),"# AGENTS.local.md\n");
  const result=await validateGeneratedProject(root);
  for(const code of ["INVALID_SKILL_NAME","INVALID_SKILL_DESCRIPTION","BROKEN_LINK","MISSING_IGNORE"]) assert.ok(result.findings.some(x=>x.code===code));
});

test("Git semantics detect negations even when all required rule text exists",async t=>{
  const root=await fixture(t);
  execFileSync("git",["init","--quiet"],{cwd:root});
  await initNew({target:root,dryRun:false});
  await writeFile(path.join(root,".gitignore"),(await readFile(path.join(root,".gitignore"),"utf8"))+"!**\n");
  const result=await validateGeneratedProject(root);
  assert.ok(result.findings.some(x=>x.code==="INEFFECTIVE_IGNORE"));
});

test("unsafe parent paths and external junctions cannot receive generated writes",async t=>{
  const root=await fixture(t), outside=path.join(root,"outside"), target=path.join(root,"project");
  await mkdir(outside); await mkdir(target);
  assert.throws(()=>safePath(target,"../outside"),e=>e.code==="UNSAFE_PATH");
  await symlink(outside,path.join(target,"docs"),process.platform==="win32" ? "junction" : "dir");
  await assert.rejects(initNew({target,dryRun:false}),e=>e.code==="UNSAFE_PATH");
  await assert.rejects(readFile(path.join(outside,"ai/verification.md")));
});

test("unsafe backup directory fails without leaving the target lock behind",async t=>{
  const root=await fixture(t), outside=path.join(root,"outside"), target=path.join(root,"project");
  await mkdir(outside); await mkdir(target);
  await symlink(outside,path.join(target,".agent-template-backups"),process.platform==="win32" ? "junction" : "dir");
  const entries=[makeEntry(target,{relativePath:"first.md",content:"created\n"},"create")];
  await assert.rejects(applyEntries(target,entries),e=>e.code==="WRITE_FAILED");
  await assert.rejects(readFile(path.join(target,".agent-template.lock")));
  await assert.rejects(readFile(path.join(target,"first.md")));
});
