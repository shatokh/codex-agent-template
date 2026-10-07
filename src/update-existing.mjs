import path from "node:path";
import { expandPreset, normalizeConfig, ProjectError, readConfig } from "./config.mjs";
import { buildGeneratedFilePlan } from "./init-new.mjs";
import { applyEntries, checkReviewedPlan, currentContent, extendGitignore, hash, makeEntry, manifestFile, manifestName, readManifest, reviewPlan, safePath } from "./file-plan.mjs";

export async function updateExisting({target,apply=false,approval="",adopt=false,reviewedPlan,...overrides}) {
  if(apply && !approval.trim()) throw new ProjectError("APPROVAL_REQUIRED","update-existing --apply requires --approval <text>.");
  const targetRoot=path.resolve(target);
  currentContent(targetRoot,".agent-template.json");
  const existingConfig=readConfig(safePath(targetRoot,".agent-template.json"));
  if(existingConfig.exists && !existingConfig.valid) throw new ProjectError("INVALID_CONFIG",`Existing configuration is invalid: ${existingConfig.error}`);
  const config=normalizeConfig({...existingConfig.config,...expandPreset(Object.fromEntries(Object.entries(overrides).filter(([,value])=>value!==undefined)))});
  const manifest=readManifest(targetRoot);
  const expected=await buildGeneratedFilePlan({target:targetRoot,...config});
  const entries=[];
  for(const file of expected) {
    const current=currentContent(targetRoot,file.relativePath);
    let status="create",reason=null;
    if(current!==null) {
      if(file.relativePath===".gitignore" && current!==file.content) file.content=extendGitignore(current,file.content);
      if(current===file.content) status="unchanged";
      else if(file.relativePath===".gitignore") { status="modified"; reason="append ignore rules; preserve existing content"; }
      else if(manifest?.files[file.relativePath]===hash(current)) status="modified";
      else { status="conflict"; reason=manifest ? "user-modified or unmanaged file; merge manually" : "unmanaged existing file; adoption only accepts matching content"; }
    }
    entries.push(makeEntry(targetRoot,file,status,reason));
  }
  const nextManifest=manifestFile(targetRoot,expected,manifest?.files);
  const manifestContent=currentContent(targetRoot,manifestName);
  let manifestStatus=manifestContent===nextManifest.content ? "unchanged" : manifestContent===null ? "create" : "modified";
  if(!manifest && expected.some(file=>currentContent(targetRoot,file.relativePath)!==null) && !adopt) manifestStatus="conflict";
  entries.push(makeEntry(targetRoot,nextManifest,manifestStatus,manifestStatus==="conflict" ? "legacy project requires reviewed --adopt before ownership is recorded" : null));
  const conflicts=entries.filter(x=>x.status==="conflict").map(x=>x.path);
  const plan=reviewPlan(targetRoot,{...config,adopt},entries);
  let written=[],journalPath=null;
  if(apply) {
    if(!reviewedPlan) throw new ProjectError("PLAN_REQUIRED","--apply requires a saved --plan-file reviewed before applying.");
    // Replaying a successfully applied plan is a no-op only if ALL reviewed hashes still match.
    const alreadyApplied=reviewedPlan.schemaVersion===1 && reviewedPlan.target===targetRoot && Array.isArray(reviewedPlan.entries) && reviewedPlan.entries.length===entries.length && reviewedPlan.entries.every(x=>{const expectedEntry=entries.find(entry=>entry.path===x.path);if(!expectedEntry || expectedEntry.newHash!==x.newHash) return false;const content=currentContent(targetRoot,x.path);return content!==null && hash(content)===x.newHash;});
    if(alreadyApplied) {
      const {id,...unsigned}=reviewedPlan;
      if(hash(JSON.stringify(unsigned))!==id || reviewedPlan.templateVersion!==plan.templateVersion || JSON.stringify(reviewedPlan.options)!==JSON.stringify(plan.options)) throw new ProjectError("INVALID_PLAN","Applied plan checksum/settings are invalid.");
    } else {
      checkReviewedPlan(reviewedPlan,plan);
      if(conflicts.length) throw new ProjectError("CONFLICT",`Resolve conflicts before apply: ${conflicts.join(", ")}`);
      ({written,journalPath}=await applyEntries(targetRoot,entries));
    }
  }
  return {target:targetRoot,...config,apply,approval:apply?approval:"",existingConfig,missingCreates:entries.filter(x=>x.status==="create").map(x=>x.path),updateCandidates:entries.filter(x=>["modified","conflict"].includes(x.status)).map(x=>x.path),unchanged:entries.filter(x=>x.status==="unchanged").map(x=>x.path),conflicts,written,journalPath,plan,
    complete:apply ? true : entries.every(x=>x.status==="unchanged"),
    recommendations:conflicts.length ? ["Resolve conflicts manually; user edits are never replaced automatically."] : [apply ? "Applied the reviewed plan; backups and recovery journal are retained." : "Review content diffs and save the JSON plan before apply."]};
}
