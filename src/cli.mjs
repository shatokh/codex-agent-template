import { readFile, mkdir, writeFile, stat } from "node:fs/promises";
import path from "node:path";
import { parseArgs } from "node:util";
import { agents, workflows, packs, skills, roles, roleDefinitions, presets, presetDefinitions, recordTemplates, expandPreset, approvalPolicies, ProjectError } from "./config.mjs";
import { acceptedProjectKinds, supportedProjectKinds } from "./project-kind.mjs";
import { initNew } from "./init-new.mjs";
import { onboardExisting } from "./onboard-existing.mjs";
import { updateExisting } from "./update-existing.mjs";
import { validateGeneratedProject } from "./validate-generated-project.mjs";
import { renderOnboardProposal } from "./render-onboard-proposal.mjs";
import { renderUpdateProposal } from "./render-update-proposal.mjs";
import { printInitResult, printOnboardResult, printUpdateResult } from "./cli-format.mjs";
import { safePath } from "./file-plan.mjs";

const str={type:"string"},bool={type:"boolean"},multi={type:"string",multiple:true};
const common={target:str,output:str,help:{type:"boolean",short:"h"}};
const generation={agent:str,workflow:str,"project-kind":str,preset:str,pack:multi,skill:multi,role:multi,"record-template":multi,"context-advisor":bool,"no-context-advisor":bool,"approval-policy":str,"dry-run":bool};
const exportOptions={"proposal-file":str,"proposal-dir":str};
const commandOptions={list:{output:str,help:common.help},validate:common,"init-new":{...common,...generation,apply:bool},"onboard-existing":{...common,...generation,...exportOptions,check:bool},"update-existing":{...common,...generation,...exportOptions,check:bool,apply:bool,approval:str,"plan-file":str,adopt:bool}};

export async function runCli(argv) {
  const wantsJson=argv.includes("--output=json") || argv.some((x,i)=>x==="--output" && argv[i+1]==="json");
  try {
    let [command,...rest]=argv;
    if(!command || command==="--help" || command==="-h") return printHelp();
    if(command==="help") return printHelp(rest[0]);
    if(!Object.hasOwn(commandOptions,command)) throw new ProjectError("USAGE",`Unknown command: ${command}`);
    let options;
    try {
      const parsed=parseArgs({args:rest,options:commandOptions[command],strict:true,tokens:true});
      options=parsed.values;
      if(parsed.tokens.filter(token=>token.kind==="option" && token.name==="preset").length>1) throw new Error("Select one --preset; add individual workflows with --skill.");
    }
    catch(error) { throw new ProjectError("USAGE",error.message); }
    if(options.help) return printHelp(command);
    validateOptions(options);
    const selected=expandPreset(Object.fromEntries([["agent",options.agent],["workflow",options.workflow],["projectKind",options["project-kind"]],["preset",options.preset],["packs",options.pack],["skills",options.skill],["roles",options.role],["recordTemplates",options["record-template"]],["contextAdvisor",options["context-advisor"]===undefined ? (options["no-context-advisor"] ? false : undefined) : true],["approvalPolicy",options["approval-policy"]]].filter(([,value])=>value!==undefined)));
    const target=options.target ?? ".";
    let result;
    if(command==="list") result={agents,workflows,projectKinds:supportedProjectKinds,packs,skills,roles,roleDefinitions,presets,presetDefinitions,recordTemplates,approvalPolicies};
    if(command==="init-new") result=await initNew({target,...selected,dryRun:!options.apply});
    if(command==="onboard-existing") result=await onboardExisting({target,...selected});
    if(command==="update-existing") {
      let reviewedPlan;
      if(options.apply) {
        if(!options.approval?.trim()) throw new ProjectError("APPROVAL_REQUIRED","update-existing --apply requires --approval <text>.");
        if(!options["plan-file"]) throw new ProjectError("PLAN_REQUIRED","--apply requires --plan-file <reviewed.json>.");
        try {
          const planPath=path.resolve(options["plan-file"]);
          safePath(path.dirname(planPath),path.basename(planPath));
          const planStat=await stat(planPath);
          if(!planStat.isFile() || planStat.size>1024*1024) throw new Error("plan must be a regular file of at most 1 MiB");
          const content=await readFile(planPath,"utf8");
          if(Buffer.byteLength(content)>1024*1024) throw new Error("plan exceeds 1 MiB");
          reviewedPlan=JSON.parse(content);
        } catch(error) { throw new ProjectError("INVALID_PLAN",`Cannot read plan: ${error.message}`); }
      }
      result=await updateExisting({target,...reviewedPlan?.options,...selected,apply:!!options.apply,approval:options.approval ?? "",adopt:options.adopt ?? reviewedPlan?.options?.adopt ?? false,reviewedPlan});
      if(options["plan-file"] && !options.apply) result.planFile=await exportFile(options["plan-file"],JSON.stringify(result.plan,null,2)+"\n",result);
    }
    if(command==="validate") result=await validateGeneratedProject(target);
    if(options["proposal-file"] || options["proposal-dir"]) {
      const render=command==="update-existing" ? renderUpdateProposal : renderOnboardProposal;
      const suffix=command==="update-existing" ? "update-proposal" : "onboarding-proposal";
      const filename=options["proposal-file"] ?? path.join(options["proposal-dir"],path.basename(result.target).replace(/[^a-zA-Z0-9._-]+/g,"-").replace(/^-+|-+$/g,"") || "project",`${new Date().toISOString().replace(/[:.]/g,"-")}-${suffix}.md`);
      result.proposalPath=await exportFile(filename,render(result),result);
    }
    if(options.output==="json") console.log(JSON.stringify(result,null,2));
    else {
      if(command==="list") {
        console.log(`Agents: ${agents.join(", ")}\nWorkflows: ${workflows.join(", ")}\nProject kinds: ${supportedProjectKinds.join(", ")}\nPacks: ${packs.join(", ")}\nSkills: ${skills.join(", ")}\nRoles: ${roles.join(", ")}\nPresets: ${presets.join(", ")}\nRecord templates: ${recordTemplates.join(", ")}`);
      } else if(command==="init-new") printInitResult(result);
      else if(command==="onboard-existing") printOnboardResult(result);
      else if(command==="update-existing") { printUpdateResult(result); console.log(renderUpdateProposal(result)); }
      else {
        console.log(result.valid ? "Generated project validation passed." : `Generated project validation failed:\n${result.errors.map(x=>`- ${x}`).join("\n")}`);
        for(const finding of result.findings.filter(x=>x.severity!=="error")) console.log(`${finding.severity}: ${finding.code}: ${finding.path}: ${finding.explanation}`);
      }
      if(result.proposalPath) console.log(`Proposal written: ${result.proposalPath}`);
      if(result.planFile) console.log(`Review plan written: ${result.planFile}`);
    }
    if((command==="validate" && !result.valid) || (command==="init-new" && (result.blocked.length || result.errors.length)) || (options.check && !result.complete)) process.exitCode=1;
  } catch(error) {
    const result={error:{code:error.code ?? "INTERNAL_ERROR",message:error.message,details:error.details ?? {}}};
    if(wantsJson) console.log(JSON.stringify(result,null,2)); else console.error(`${result.error.code}: ${error.message}`);
    process.exitCode=error.code==="USAGE" ? 2 : 1;
  }
}

function validateOptions(options) {
  for(const [name,allowed] of [["agent",agents],["workflow",workflows],["project-kind",acceptedProjectKinds],["preset",presets],["output",["text","json"]],["approval-policy",approvalPolicies]]) if(options[name]!==undefined && !allowed.includes(options[name])) throw new ProjectError("USAGE",`Unsupported --${name} value: ${options[name]}`);
  for(const [name,allowed] of [["pack",packs],["skill",skills],["role",roles],["record-template",recordTemplates]]) if(options[name]?.some(x=>!allowed.includes(x))) throw new ProjectError("USAGE",`Unsupported --${name} value`);
  if(options.apply && options["dry-run"]) throw new ProjectError("USAGE","--apply and --dry-run cannot be combined.");
  if(options["context-advisor"] && options["no-context-advisor"]) throw new ProjectError("USAGE","Use only one context advisor flag.");
  if(options["proposal-file"] && options["proposal-dir"]) throw new ProjectError("USAGE","Use either --proposal-file or --proposal-dir, not both.");
  if(options.apply && (options["proposal-file"] || options["proposal-dir"])) throw new ProjectError("USAGE","Do not use proposal export with --apply; run dry-run proposal review first.");
  if(options.approval!==undefined && !options.apply) throw new ProjectError("USAGE","--approval requires --apply.");
  if(options.apply && options.check) throw new ProjectError("USAGE","--check is read-only and cannot be combined with --apply.");
}

async function exportFile(filename,content,result) {
  const output=path.resolve(filename), root=path.resolve(result.target);
  safePath(path.dirname(output),path.basename(output));
  const rel=path.relative(root,output);
  const generated=result.plan?.entries?.map(x=>x.path) ?? [...(result.proposedCreates ?? []),...(result.blockedExisting ?? [])];
  if(!rel.startsWith("..") && !path.isAbsolute(rel) && generated.includes(rel.replaceAll(path.sep,"/"))) throw new ProjectError("UNSAFE_EXPORT","Proposal export cannot replace a target infrastructure file.");
  await mkdir(path.dirname(output),{recursive:true});
  await writeFile(output,content,{encoding:"utf8",flag:"wx"});
  return output;
}

function printHelp(command) {
  if(command && !Object.hasOwn(commandOptions,command)) throw new ProjectError("USAGE",`Unknown command: ${command}`);
  console.log("codex-agent-template\n\nPreview by default. Use init-new --apply to create; update-existing --apply requires --approval and a reviewed --plan-file.\nExit codes: 0 success, 1 failed validation/conflict/write, 2 invalid usage.\n");
  for(const name of command ? [command] : Object.keys(commandOptions)) console.log(`${name}: ${Object.entries(commandOptions[name]).map(([key,value])=>`--${key}${value.type==="string" ? " <value>" : ""}`).join(" ")}`);
}
