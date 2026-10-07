import assert from "node:assert/strict";
import {spawn} from "node:child_process";
import {mkdir,mkdtemp,readFile,rm,writeFile} from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import {parseArgs} from "node:util";
import {fileURLToPath} from "node:url";
import {skills} from "../src/config.mjs";

const repo=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const {values}=parseArgs({options:{run:{type:"boolean"},skill:{type:"string",default:"grill-me"},scenario:{type:"string",default:"architecture"},runtime:{type:"string",default:"codex"},model:{type:"string"},output:{type:"string",default:".local/evals"},timeout:{type:"string",default:"120"}},strict:true});
const cases=JSON.parse(await readFile(path.join(repo,"docs/evals/scenarios.json"),"utf8"));
const scenario=cases.find(x=>x.id===values.scenario);
assert.ok(scenario,"Unknown scenario");
assert.ok(["codex","claude"].includes(values.runtime),"Runtime must be codex or claude");
assert.ok(skills.includes(values.skill),"Unknown skill");
const timeout=Number(values.timeout)*1000;
assert.ok(Number.isFinite(timeout) && timeout>=1000 && timeout<=300000,"Timeout must be 1..300 seconds");
const skill=await readFile(path.join(repo,"templates/skills",values.skill,"SKILL.md"),"utf8");
const variants=[{name:"baseline",prompt:scenario.prompt},{name:values.skill,prompt:`Use these workflow instructions when they apply to this task:\n${skill}\n\nTask:\n${scenario.prompt}`}];
if(!values.run) {
  console.log(JSON.stringify({dryRun:true,skill:values.skill,runtime:values.runtime,scenario:scenario.id,rubric:scenario.rubric,variants,notice:"Preview only. --run starts two real runtime sessions using your configured account; review cost and permissions first."},null,2));
  process.exit(0);
}
const sandbox=await mkdtemp(path.join(os.tmpdir(),"cat-eval-"));
const output=path.resolve(values.output,`${new Date().toISOString().replace(/[:.]/g,"-")}-${values.skill}-${scenario.id}`);
await mkdir(output,{recursive:true});
try {
  await writeFile(path.join(sandbox,"fixture.txt"),"Read-only conversational evaluation fixture.\n");
  const version=await execute(values.runtime,["--version"],"");
  const results=[];
  for(const variant of variants) {
    const prompt=`Read-only evaluation: answer conversationally; do not edit files, run commands, or contact services. Mark unanswered questions provisional.\n${variant.prompt}`;
    const args=values.runtime==="codex" ? ["exec","--ignore-user-config","--ignore-rules","--ephemeral","--sandbox","read-only","--skip-git-repo-check","--cd",sandbox,"--json",...(values.model?["--model",values.model]:[]),"-"] : ["-p","--output-format","json","--tools","","--no-session-persistence",...(values.model?["--model",values.model]:[])];
    const result=await execute(values.runtime,args,prompt);
    await writeFile(path.join(output,`${variant.name}.json`),JSON.stringify(result,null,2));
    results.push({variant:variant.name,exitCode:result.exitCode,elapsedMs:result.elapsedMs,outputBytes:Buffer.byteLength(result.stdout),assessment:"not scored; apply the recorded rubric"});
  }
  const report={skill:values.skill,scenario:scenario.id,runtime:values.runtime,runtimeVersion:version.stdout.trim(),model:values.model ?? "runtime default; see transcript",timeoutMs:timeout,rubric:scenario.rubric,results,limitations:"One baseline/treatment pair; explicit skill-body injection tests instruction behavior, not automatic discovery or repeated-run consistency."};
  await writeFile(path.join(output,"report.json"),JSON.stringify(report,null,2));
  console.log(JSON.stringify({output,...report},null,2));
} finally {
  const rel=path.relative(os.tmpdir(),sandbox);
  if(!rel || rel.startsWith("..") || path.isAbsolute(rel)) throw new Error("Unsafe cleanup path");
  await rm(sandbox,{recursive:true,force:true});
}

function execute(command,args,input) {
  return new Promise((resolve,reject)=>{
    const started=Date.now();
    const child=spawn(command,args,{cwd:sandbox,shell:false,stdio:["pipe","pipe","pipe"]});
    let stdout="",stderr="",exceeded=false;
    const timer=setTimeout(()=>{exceeded=true;child.kill();},timeout);
    const append=which=>chunk=>{if(Buffer.byteLength(stdout)+Buffer.byteLength(stderr)>4*1024*1024) {exceeded=true;child.kill();return;} if(which==="stdout") stdout+=chunk;else stderr+=chunk;};
    child.stdout.on("data",append("stdout"));child.stderr.on("data",append("stderr"));
    child.on("error",error=>{clearTimeout(timer);reject(error);});
    child.on("close",code=>{clearTimeout(timer);resolve({exitCode:code,elapsedMs:Date.now()-started,limitReached:exceeded,stdout,stderr});});
    child.stdin.on("error",()=>{});child.stdin.end(input);
  });
}
