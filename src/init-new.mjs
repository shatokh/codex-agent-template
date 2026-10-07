import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { normalizeConfig, schemaVersion, templateVersion, skillRoots } from "./config.mjs";
import { discoverExisting } from "./discover-existing.mjs";
import { applyEntries, currentContent, makeEntry, manifestFile, safePath } from "./file-plan.mjs";
import { projectKindLabel, verificationGuidanceForProjectKind, verificationRowsForProjectKind } from "./project-kind.mjs";
import { buildRoleFiles, rolePaths } from "./roles.mjs";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const templatesRoot = path.join(projectRoot, "templates", "base");

export async function initNew({ target, dryRun = true, ...options }) {
  const targetRoot = path.resolve(target);
  const config = normalizeConfig(options);
  const discovery = options.discovery ?? discoverExisting(targetRoot);
  const files = await buildGeneratedFilePlan({target:targetRoot, ...config, discovery});
  files.push(manifestFile(targetRoot,files));
  const entries=files.map(file=>makeEntry(targetRoot,file,currentContent(targetRoot,file.relativePath)===null ? "create" : "conflict", "init never overwrites"));
  const blocked=entries.filter(x=>x.status==="conflict").map(x=>x.path);
  const result={target:targetRoot,...config,dryRun,created:entries.filter(x=>x.status==="create").map(x=>x.path),written:[],blocked,warnings:discovery.warnings.map(x=>`${x.code}: ${x.path}`),errors:[],discovery,entries};
  if(!dryRun && !blocked.length) Object.assign(result,await applyEntries(targetRoot,entries,{journal:false}));
  return result;
}

export async function buildGeneratedFilePlan({target, discovery, ...options}) {
  const targetRoot=path.resolve(target), config=normalizeConfig(options);
  discovery ??= discoverExisting(targetRoot);
  const {agent,workflow,projectKind,packs,skills,roles,recordTemplates,contextAdvisor,approvalPolicy,generatedAt}=config;
  const roots=skillRoots(agent), selectedSkills=[...skills,...(contextAdvisor ? ["context-artifact-advisor"] : [])];
  const packTriggers={privacy:"handling personal or private data","external-services":"using paid APIs, production accounts, or external services",security:"changing authentication, permissions, dependencies, or secret handling","test-harness":"setting up fixtures, tests, playtests, or repeatable verification",docs:"changing documented setup, commands, or public behavior",compatibility:"changing a consumer-facing contract or persisted format",reliability:"changing state, resources, failure handling, or recovery",architecture:"changing component boundaries or major dependencies"};
  const context={projectName:markdownText(path.basename(targetRoot)),projectSummary:markdownText(discovery.summary),agent,workflow,projectKind,projectKindLabel:projectKindLabel(projectKind),generatedAt,
    workflowRules:workflowRules(workflow,projectKind),approvalRules:approvalPolicy==="risk-based" ? "- Continue explicitly authorized, reversible work within scope. Plan and seek approval for destructive operations, production changes, or consequential unresolved scope.\n- Reuse approval for its agreed scope; do not request it again for each implementation step." : "- For meaningful code, infrastructure, content, rules, assets, dependency, or behavior changes, plan first and wait for explicit approval unless that scope is already approved.\n- Continue work within the agreed scope without requesting approval again for each step.",
    optionalGuidance:packs.map(name=>`- When ${packTriggers[name]}, use [${name} guidance](docs/ai/packs/${name}.md).`).join("\n") + (selectedSkills.length ? "\n- Available workflows: " + selectedSkills.map(name=>`[${name}](${roots[0]}/${name}/SKILL.md)`).join(", ")+"." : "") + (skills.includes("grill-me") ? "\n- Use grill-me for a contested consequential decision with unresolved evidence; let settled routine choices proceed." : "") + (roles.length ? "\n- Available delegated roles: " + roles.flatMap(name=>rolePaths(agent,name).map(filename=>`[${name} (${filename.startsWith(".codex") ? "Codex" : "Claude"})](${filename})`)).join(", ")+".\n- Delegate only when requested or authorized by applicable instructions; installation is not authorization. Follow [delegation boundaries](docs/ai/delegation.md)." : ""),
    recordTemplateLinks:recordTemplates.map(name=>`- [${name}](templates/${name}.md)`).join("\n"),
    verificationTableRows:renderVerificationRows(projectKind,discovery), verificationGuidance:verificationGuidanceForProjectKind(projectKind),
    configJson:JSON.stringify({template:"codex-agent-template",version:templateVersion,schemaVersion,...config},null,2)};
  if(recordTemplates.length) context.optionalGuidance += "\n- When a durable record helps the task, prefer the existing project format or these [selected record templates](docs/ai/record-templates.md). Templates do not require creating records.";
  const files=[];
  async function render(relativePath,templateName) {
    const template=await readFile(path.join(templatesRoot,templateName),"utf8");
    files.push({relativePath,absolutePath:safePath(targetRoot,relativePath),content:template.replace(/\{\{([a-zA-Z0-9_]+)\}\}/g,(match,key)=>{
      if(!(key in context)) throw new Error(`Unknown template variable: ${key}`);
      return String(context[key]);
    })});
  }
  if(agent!=="claude") await render("AGENTS.md","AGENTS.md.tmpl");
  if(agent!=="codex") await render("CLAUDE.md",agent==="claude" ? "CLAUDE.md.tmpl" : "CLAUDE.import-agents.md.tmpl");
  await render(".agent-template.json","agent-template.json.tmpl");
  await render(".gitignore","gitignore.tmpl");
  for(const name of ["onboarding-notes","rule-quality-checklist","verification","local-overrides"]) await render(`docs/ai/${name}.md`,`docs/ai/${name}.md.tmpl`);
  if(workflow==="task-first") await render("docs/tasks/TEMPLATE.md","docs/tasks/TEMPLATE.md.tmpl");
  if(workflow==="spec-tdd") for(const name of ["specs","ai-change-records"]) await render(`docs/${name}/TEMPLATE.md`,`docs/${name}/TEMPLATE.md.tmpl`);
  for(const name of packs) await render(`docs/ai/packs/${name}.md`,`docs/ai/packs/${name}.md.tmpl`);
  if(recordTemplates.length) {
    await render("docs/ai/record-templates.md","docs/ai/record-templates.md.tmpl");
    for(const name of recordTemplates) await render(`docs/ai/templates/${name}.md`,`docs/ai/templates/${name}.md.tmpl`);
  }
  if(roles.length) {
    files.push(...await buildRoleFiles(targetRoot,agent,roles));
    await render("docs/ai/delegation.md","docs/ai/delegation.md.tmpl");
  }
  for(const name of skills) {
    const content=await readFile(path.join(projectRoot,"templates","skills",name,"SKILL.md"),"utf8");
    let metadata=null;
    try { metadata=await readFile(path.join(projectRoot,"templates","skills",name,"agents/openai.yaml"),"utf8"); }
    catch(error) { if(error.code!=="ENOENT") throw error; }
    for(const root of roots) {
      const relativePath=`${root}/${name}/SKILL.md`;
      files.push({relativePath,absolutePath:safePath(targetRoot,relativePath),content});
      if(root===".agents/skills" && metadata!==null) {
        const metadataPath=`${root}/${name}/agents/openai.yaml`;
        files.push({relativePath:metadataPath,absolutePath:safePath(targetRoot,metadataPath),content:metadata});
      }
    }
  }
  if(contextAdvisor) {
    const source=await readFile(path.join(templatesRoot,".agents/skills/context-artifact-advisor/SKILL.md.tmpl"),"utf8");
    for(const root of roots) {
      const relativePath=`${root}/context-artifact-advisor/SKILL.md`;
      const content=root===".claude/skills" ? source.replace(/\n---\r?\n/,"\ndisable-model-invocation: true\n---\n") : source;
      files.push({relativePath,absolutePath:safePath(targetRoot,relativePath),content});
      if(root===".agents/skills") {
        const name=`${root}/context-artifact-advisor/agents/openai.yaml`;
        files.push({relativePath:name,absolutePath:safePath(targetRoot,name),content:"policy:\n  allow_implicit_invocation: false\n"});
      }
    }
    for(const name of ["artifact-selection","proposal-schema","proposals/index"]) await render(`docs/ai/advisor/${name}.md`,`docs/ai/advisor/${name}.md.tmpl`);
  }
  return files;
}

function workflowRules(workflow,kind) {
  if(workflow==="light") return "- Use a short plan for multi-step work; verify the changed behavior with the smallest relevant check.";
  if(workflow==="task-first") return "- For substantial work, create or update a task using [the task template](docs/tasks/TEMPLATE.md): scope, observable acceptance criteria, verification, and approval status.\n- Record progress and evidence in that task; keep routine fixes proportional to their size.";
  return "- For substantial behavior changes, use [the spec template](docs/specs/TEMPLATE.md) to define scope, expected behavior, acceptance criteria, and verification.\n" + (kind==="code" ? "- For testable behavior, write a failing test, implement the smallest fix, verify it, then refactor within scope. Record why when TDD is impractical." : "- For content, design, or rules changes, use review, scenarios, consistency checks, or playtests; do not invent software TDD commands.") + "\n- Record verification and deviations with [the change record template](docs/ai-change-records/TEMPLATE.md).";
}

function renderVerificationRows(kind,discovery) {
  if(kind!=="code") return verificationRowsForProjectKind(kind).map(row=>`| ${row.join(" | ")} |`).join("\n");
  const known=discovery.suggestedVerification.filter(x=>x.status==="found" && x.confidence==="high");
  if(!known.length) return "| Verification | Not configured | No confirmed command; review discovery suggestions |";
  return known.map(x=>`| ${markdownText(x.kind)} | ${markdownText(x.command)} (cwd: ${markdownText(x.workingDirectory)}) | Detected, not executed; ${markdownText(x.evidence)} |`).join("\n");
}
function markdownText(value) { return String(value).replace(/[\r\n]/g," ").replace(/\|/g,"\\|").replace(/`/g,"'"); }
