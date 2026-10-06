import { lstatSync, opendirSync, readFileSync } from "node:fs";
import path from "node:path";
import { readConfig } from "./config.mjs";
import { normalizeProjectKind } from "./project-kind.mjs";
import { safePath } from "./file-plan.mjs";

const aiFiles = ["AGENTS.md", "AGENTS.override.md", "CLAUDE.md", "CLAUDE.local.md", ".agents", ".codex", ".claude", "docs/ai", "docs/tasks", "docs/specs", "docs/ai-change-records"];
const projectFiles = ["README.md", "package.json", "pnpm-lock.yaml", "package-lock.json", "yarn.lock", "pyproject.toml", "requirements.txt", "go.mod", "Gemfile", "Cargo.toml", "project.godot", ".github/workflows", ".env.example"];
const typeFiles = { node:["package.json"], python:["pyproject.toml","requirements.txt"], go:["go.mod"], ruby:["Gemfile"], rust:["Cargo.toml"], godot:["project.godot"] };
const orderedKinds = ["project-validation", "lint", "static-analysis", "unit-test", "test", "integration-test", "e2e", "build", "manual-smoke"];

export function discoverExisting(target, limits = {}) {
  const targetRoot = path.resolve(target);
  safePath(targetRoot);
  const budget = { maxFiles:limits.maxFiles ?? 32, maxFileBytes:limits.maxFileBytes ?? 32768, maxBytes:limits.maxBytes ?? 196608, maxDirectoryEntries:50, filesRead:0, bytesRead:0 };
  const warnings = [], cache = new Map(), commands = [];
  const present = name => { try { return !!lstatSync(safePath(targetRoot,name)); } catch(error) { if (error.code !== "ENOENT") warnings.push({code:error.code ?? "READ_FAILED",path:name}); return false; } };
  function read(name) {
    if (cache.has(name)) return cache.get(name);
    let text = null;
    try {
      const file = safePath(targetRoot,name), stat=lstatSync(file);
      if (!stat.isFile()) throw new Error("not a regular file");
      if (budget.filesRead >= budget.maxFiles || stat.size > budget.maxFileBytes || budget.bytesRead+stat.size > budget.maxBytes) warnings.push({code:"DISCOVERY_LIMIT",path:name});
      else { text=readFileSync(file,"utf8"); budget.filesRead++; budget.bytesRead+=Buffer.byteLength(text); }
    } catch(error) { if(error.code!=="ENOENT") warnings.push({code:"READ_FAILED",path:name}); }
    cache.set(name,text);
    return text;
  }
  function children(name) {
    const names=[];
    let directory;
    try {
      directory=opendirSync(safePath(targetRoot,name));
      for(let i=0;i<budget.maxDirectoryEntries;i++) { const item=directory.readSync(); if(!item) break; if(!item.isSymbolicLink()) names.push(item); }
      if(directory.readSync()) warnings.push({code:"DIRECTORY_LIMIT",path:name});
    } catch(error) { if(error.code!=="ENOENT") warnings.push({code:"READ_FAILED",path:name}); }
    finally { directory?.closeSync(); }
    return names.sort((a,b)=>a.name.localeCompare(b.name));
  }
  const detectedProjectFiles=projectFiles.filter(present);
  const projectTypes=Object.entries(typeFiles).filter(([,files])=>files.some(present)).map(([name])=>name);
  const existingAiFiles=aiFiles.filter(present);
  let pkg=null;
  try { pkg=JSON.parse(read("package.json") ?? "null"); } catch { warnings.push({code:"INVALID_JSON",path:"package.json"}); }
  const declaredManager=typeof pkg?.packageManager==="string" ? pkg.packageManager.split("@")[0] : null;
  const locks=[["pnpm-lock.yaml","pnpm"],["yarn.lock","yarn"],["package-lock.json","npm"]].filter(([file])=>present(file));
  const packageManager=["pnpm","yarn","npm"].includes(declaredManager) ? declaredManager : locks[0]?.[1] ?? (present("package.json") ? "npm" : null);
  if(new Set(locks.map(x=>x[1])).size>1 || locks.some(x=>declaredManager && x[1]!==declaredManager)) warnings.push({code:"PACKAGE_MANAGER_CONFLICT",path:"package.json/lockfiles"});
  const add=(kind,command,confidence,evidence,workingDirectory=".",status="found")=>commands.push({kind,command,confidence,evidence,workingDirectory,status,executed:false});
  function packageCommands(value, location=".") {
    const kinds=[["test","test"],["lint","lint"],["typecheck","static-analysis"],["build","build"],["validate","project-validation"],["test:e2e","e2e"],["test:integration","integration-test"]];
    for(const [name,kind] of kinds) if(typeof value?.scripts?.[name]==="string" && value.scripts[name].trim()) {
      const actualKind=name==="test" && /(?:^|\s)(?:node\s+--test|vitest|jest)(?:\s|$)/.test(value.scripts[name]) ? "unit-test" : kind;
      add(actualKind,`${packageManager ?? "npm"}${packageManager==="yarn" ? "" : " run"} ${name}`,"high",`${location==="." ? "" : location+"/"}package.json#scripts.${name}`,location);
    }
  }
  packageCommands(pkg);
  const workspaceLocations=[];
  if(Array.isArray(pkg?.workspaces) || Array.isArray(pkg?.workspaces?.packages) || present("pnpm-workspace.yaml")) {
    const patterns=Array.isArray(pkg?.workspaces) ? pkg.workspaces : pkg?.workspaces?.packages ?? [];
    if(present("pnpm-workspace.yaml")) read("pnpm-workspace.yaml");
    for(const parent of ["packages","apps"]) {
      if(!present(parent)) continue;
      for(const item of children(parent).filter(x=>x.isDirectory()).slice(0,6)) workspaceLocations.push(`${parent}/${item.name}`);
    }
    for(const pattern of patterns) if(typeof pattern==="string" && !/[*.]/.test(pattern) && pattern.split("/").length<=2) workspaceLocations.push(pattern);
    for(const location of [...new Set(workspaceLocations)].slice(0,8)) {
      try { const value=JSON.parse(read(`${location}/package.json`) ?? "null"); if(value) packageCommands(value,location); } catch { warnings.push({code:"INVALID_JSON",path:`${location}/package.json`}); }
    }
  }
  const python=read("pyproject.toml"), requirements=read("requirements.txt");
  if((python && /(?:\[tool\.pytest\.|\bpytest\b)/.test(python)) || (requirements && /^pytest(?:[<>=!~\[\s]|$)/m.test(requirements))) add("unit-test","pytest","medium",python?.includes("pytest") ? "pyproject.toml#pytest" : "requirements.txt#pytest",".","inferred");
  if(present("go.mod")) add("unit-test","go test ./...","medium","go.mod",".","inferred");
  if(present("Cargo.toml")) { read("Cargo.toml"); add("unit-test","cargo test","medium","Cargo.toml",".","inferred"); }
  const readme=read("README.md");
  const ciEvidence=[];
  if(present(".github/workflows")) for(const item of children(".github/workflows").filter(x=>x.isFile() && /\.ya?ml$/.test(x.name)).slice(0,4)) {
    const filename=`.github/workflows/${item.name}`, content=read(filename);
    if(!content) continue;
    for(const [i,line] of content.split(/\r?\n/).entries()) {
      const match=line.match(/^\s*-?\s*run:\s*["']?((?:npm|pnpm|yarn)(?: run)? [\w:-]+|pytest|cargo test|go test \.\/\.\.\.)["']?\s*$/);
      if(match) ciEvidence.push({command:match[1],evidence:`${filename}:${i+1}`,status:"found",scope:"review working-directory/env before using"});
    }
  }
  const advisorPaths=[".agents/skills/session-artifact-advisor/SKILL.md","docs/ai/session-advisor",".agents/skills/context-artifact-advisor/SKILL.md",".claude/skills/context-artifact-advisor/SKILL.md","docs/ai/advisor"].filter(present);
  const session=advisorPaths.some(x=>x.includes("session")), manual=advisorPaths.some(x=>!x.includes("session"));
  let projectKindSuggestion={kind:"code",confidence:projectTypes.length?"high":"low",evidence:projectTypes.map(type=>`project type: ${type}`)};
  if(!projectTypes.length) for(const [kind,confidence,files] of [["no-code","high",["docs/CARD_TYPES.md","docs/CORE_GAMEPLAY_LOOP.md","docs/FIRST_EXPEDITION.md","docs/MVP_SCOPE.md"]],["game-design","medium",["docs/GAME_DESIGN.md","GAME_DESIGN.md","docs/GDD.md","GDD.md","docs/MECHANICS.md"]],["docs","low",["docs"]]]) {
    const evidence=files.filter(present); if(evidence.length) { projectKindSuggestion={kind,confidence,evidence}; break; }
  }
  let agentTemplate={exists:false,valid:false,config:null,error:null};
  if(present(".agent-template.json")) {
    if(read(".agent-template.json")!==null) agentTemplate=readConfig(safePath(targetRoot,".agent-template.json"));
    else agentTemplate={exists:true,valid:false,config:null,error:"config exceeds discovery budget or is unreadable"};
  }
  if(agentTemplate.valid && agentTemplate.config.projectKind) projectKindSuggestion={kind:normalizeProjectKind(agentTemplate.config.projectKind),confidence:"high",evidence:[".agent-template.json#projectKind (explicit configuration)"]};
  const heading=readme?.match(/^#\s+(.+)$/m)?.[1]?.replace(/[<>`]/g,"").slice(0,160);
  return { target:targetRoot, existingAiFiles, detectedProjectFiles, projectTypes, packageManager,
    advisorStatus:session && manual ? "mixed" : session ? "session-artifact-advisor" : manual ? "manual-context-advisor" : "none",
    advisorArtifacts:advisorPaths, agentTemplate, projectKindSuggestion, commands,
    suggestedVerification:orderedKinds.flatMap(kind=>commands.filter(x=>x.kind===kind)),
    summary:heading ?? path.basename(targetRoot), ciEvidence, warnings, budget, workspaceLocations };
}
