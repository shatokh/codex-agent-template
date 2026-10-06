import { execFileSync } from "node:child_process";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { configErrors, normalizeConfig, skillRoots } from "./config.mjs";
import { buildGeneratedFilePlan } from "./init-new.mjs";
import { currentContent, manifestName, readManifest, safePath } from "./file-plan.mjs";

export async function validateGeneratedProject(target) {
  const root=path.resolve(target), findings=[];
  const add=(severity,code,name,explanation,fix)=>findings.push({severity,code,path:name,explanation,suggestedFix:fix});
  const finish=()=>({valid:!findings.some(x=>x.severity==="error"),errors:findings.filter(x=>x.severity==="error").map(x=>`${x.path}: ${x.explanation}`),findings});
  let config;
  try {
    const text=currentContent(root,".agent-template.json");
    if(text===null) { add("error","MISSING_CONFIG",".agent-template.json","missing .agent-template.json","Run a reviewed init or onboarding."); return finish(); }
    config=JSON.parse(text);
  } catch(error) { add("error","INVALID_CONFIG",".agent-template.json",`Configuration cannot be read: ${error.message}`,"Repair the configuration JSON."); return finish(); }
  const problems=configErrors(config);
  for(const explanation of problems) add("error","INVALID_CONFIG",".agent-template.json",explanation,"Use supported values with the correct types.");
  if(problems.length) return finish();
  let files;
  try { files=await buildGeneratedFilePlan({target:root,...normalizeConfig(config)}); }
  catch(error) { add("error",error.code ?? "INVALID_TARGET",".",error.message,"Resolve the target path or configuration."); return finish(); }
  const actual=new Map();
  for(const file of files) {
    let content;
    try { content=currentContent(root,file.relativePath); }
    catch(error) { add("error",error.code ?? "READ_FAILED",file.relativePath,error.message,"Use a readable regular file inside the target."); continue; }
    if(content===null) { add("error","MISSING_FILE",file.relativePath,`missing ${file.relativePath}`,"Create the missing artifact through a reviewed plan."); continue; }
    actual.set(file.relativePath,content);
    if(/\{\{[a-zA-Z0-9_]+\}\}/.test(content)) add("error","UNRESOLVED_VARIABLE",file.relativePath,"contains unresolved template variables","Render or replace the unresolved variable.");
    if(/(?:sk-[A-Za-z0-9_-]{24,}|gh[pousr]_[A-Za-z0-9]{30,}|AKIA[A-Z0-9]{16})/.test(content)) add("warning","SECRET_PATTERN",file.relativePath,"A secret-like pattern was detected (value redacted).","Review locally; remove any real credential.");
    if(/always (?:read|load) (?:all|every)/i.test(content)) add("warning","EXCESSIVE_CONTEXT",file.relativePath,"May require unnecessary document loading for routine edits.","Scope discovery to the actual task.");
    if(file.relativePath.endsWith("SKILL.md")) validateSkill(file.relativePath,content,add);
  }
  const rootName=config.agent==="claude" ? "CLAUDE.md" : "AGENTS.md";
  const instructions=actual.get(rootName);
  if(instructions) {
    if(instructions.split(/\r?\n/).length>200) add("error","ROOT_TOO_LONG",rootName,"exceeds 200 lines","Move procedures into task-specific docs or skills.");
    if(Buffer.byteLength(instructions)>32768) add("error","ROOT_TOO_LARGE",rootName,"exceeds 32 KiB","Reduce root context.");
  }
  if(config.agent==="codex+claude" && actual.get("CLAUDE.md") && !/^@AGENTS\.md\s*$/m.test(actual.get("CLAUDE.md"))) add("error","MISSING_IMPORT","CLAUDE.md","CLAUDE.md must import @AGENTS.md in codex+claude mode","Add the standalone import outside a code block.");
  for(const [name,content] of actual) if(name.endsWith(".md")) validateLinks(root,name,content,add);
  validateIgnore(root,actual.get(".gitignore"),add);
  try {
    const manifest=readManifest(root);
    if(!manifest) add(config.schemaVersion ? "error" : "warning","MISSING_MANIFEST",manifestName,"No ownership manifest; existing files are not safe to replace.","Review legacy adoption or generate a new project.");
  } catch(error) { add("error","INVALID_MANIFEST",manifestName,error.message,"Repair manifest through explicit review."); }
  if(config.schemaVersion===undefined) add("warning","LEGACY_CONFIG",".agent-template.json","Legacy config has no schema version.","Review a schema upgrade; no automatic migration is performed.");
  return finish();
}

export function validateSkill(name,content,add) {
  const match=content.replace(/\r\n/g,"\n").match(/^---\n([\s\S]*?)\n---(?:\n|$)/);
  if(!match) { add("error","INVALID_SKILL",name,"SKILL.md requires YAML frontmatter","Add name and description frontmatter."); return; }
  const fields={};
  for(const line of match[1].split("\n")) {
    if(!line.trim() || line.startsWith("#")) continue;
    const field=line.match(/^([a-zA-Z][\w-]*):\s*(.+)$/);
    if(!field) { add("error","INVALID_SKILL",name,"Generated skills require scalar YAML frontmatter.","Use the supported generated format; validate complex external YAML with its runtime."); continue; }
    if(field[1] in fields) add("error","INVALID_SKILL",name,"Duplicate frontmatter field","Keep each field once.");
    try {
      let value=field[2];
      if(value.startsWith('"')) value=JSON.parse(value);
      else if(value.startsWith("'")) { if(!value.endsWith("'")) throw new Error(); value=value.slice(1,-1).replaceAll("''","'"); }
      else if(value==="true" || value==="false") value=value==="true";
      else if(/:\s|\s#|^[\[{>|]/.test(value)) throw new Error();
      fields[field[1]]=value;
    } catch { add("error","INVALID_SKILL",name,"Malformed or unsupported YAML scalar","Quote metadata strings or simplify generated frontmatter."); }
  }
  if(typeof fields.name!=="string" || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(fields.name) || fields.name.length>64 || fields.name!==path.posix.basename(path.posix.dirname(name))) add("error","INVALID_SKILL_NAME",name,"Skill name must match its folder and use lowercase hyphenated words (max 64 characters)","Correct name and directory together.");
  if(typeof fields.description!=="string" || !fields.description.trim() || fields.description.length>1024) add("error","INVALID_SKILL_DESCRIPTION",name,"Description must be a nonempty string of at most 1024 characters","Describe the capability and its specific trigger.");
  if(name.startsWith(".claude/") && name.includes("context-artifact-advisor") && fields["disable-model-invocation"]!==true) add("error","ADVISOR_INVOCATION",name,"Manual advisor requires disable-model-invocation: true for Claude","Keep manual invocation policy explicit.");
}

function validateLinks(root,name,content,add) {
  const plain=content.replace(/^```[^\n]*\n[\s\S]*?^```\s*$/gm,"");
  const links=[...plain.matchAll(/\[[^\]]*\]\(([^\s)]+)(?:\s+"[^"]*")?\)/g)].map(x=>x[1]);
  if(name==="CLAUDE.md" || name==="AGENTS.md") links.push(...[...plain.matchAll(/^@([^\s]+)\s*$/gm)].map(x=>x[1]));
  for(const link of links) {
    if(/^(?:[a-z]+:|#)/i.test(link)) continue;
    try {
      const filename=decodeURIComponent(link.split("#")[0]);
      const relative=path.relative(root,path.resolve(root,path.dirname(name),filename));
      if(currentContent(root,relative)===null) throw new Error("target does not exist");
    } catch { add("error","BROKEN_LINK",name,`Broken or unsafe local reference: ${link}`,"Update the reference or create its target."); }
  }
}

function validateIgnore(root,content,add) {
  if(content===undefined) return;
  const required=["AGENTS.local.md","AGENTS.override.md","CLAUDE.local.md",".agent-local/",".codex-local/",".claude-local/",".env",".env.*","!.env.example"];
  const lines=content.split(/\r?\n/).map(x=>x.trim()).filter(x=>x && !x.startsWith("#"));
  for(const entry of required) if(!lines.includes(entry)) add("error","MISSING_IGNORE",".gitignore",`.gitignore missing ${entry}`,"Add an effective ignore rule through review.");
  const probes=["AGENTS.local.md","AGENTS.override.md","CLAUDE.local.md",".agent-local/probe",".codex-local/probe",".claude-local/probe",".env",".env.probe"];
  try {
    const prefix=execFileSync("git",["rev-parse","--show-prefix"],{cwd:root,encoding:"utf8",stdio:["ignore","pipe","ignore"],timeout:5000}).trim();
    if(prefix) throw new Error("target is not the Git root");
    const processResult=spawnSync("git",["check-ignore","--no-index","--verbose","--stdin"],{cwd:root,input:[...probes,".env.example"].join("\n")+"\n",encoding:"utf8",timeout:5000});
    if(processResult.error || ![0,1].includes(processResult.status)) throw new Error("Git ignore probe failed");
    const result=processResult.stdout;
    const matches=new Map(result.split(/\r?\n/).filter(Boolean).map(line=>{const [source,file]=line.split("\t"); return [file,source.slice(source.indexOf(":",source.indexOf(":")+1)+1)];}));
    for(const probe of probes) if(!matches.has(probe) || matches.get(probe).startsWith("!")) add("error","INEFFECTIVE_IGNORE",".gitignore",`Ignore rule does not protect ${probe}`,"Review pattern ordering and negations.");
    if(matches.has(".env.example") && !matches.get(".env.example").startsWith("!")) add("error","IGNORED_EXAMPLE",".gitignore",".env.example is ignored","Restore the exception after broader patterns.");
  } catch(error) {
    add("warning","IGNORE_FALLBACK",".gitignore","Git semantic verification unavailable; exact-rule fallback used.","Run validate from the target Git root with Git available.");
    for(const probe of probes) {
      const literal=probe.includes("/") ? probe.slice(0,probe.indexOf("/")+1) : probe;
      const ignored=lines.lastIndexOf(literal), exposed=lines.lastIndexOf(`!${probe}`);
      if(exposed>ignored && exposed>=0) add("error","INEFFECTIVE_IGNORE",".gitignore",`Later negation exposes ${probe}`,"Review rule ordering.");
    }
  }
}
