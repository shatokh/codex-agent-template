#!/usr/bin/env node
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, mkdir, readdir, rm } from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

const execute=promisify(execFile);
const repo=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const temporary=await mkdtemp(path.join(os.tmpdir(),"cat-package-"));
try {
  const npmCli=process.env.npm_execpath ?? path.resolve(path.dirname(process.execPath),"node_modules/npm/bin/npm-cli.js");
  const packed=await execute(process.execPath,[npmCli,"pack","--offline","--json","--ignore-scripts","--pack-destination",temporary],{cwd:repo,maxBuffer:2*1024*1024,env:{...process.env,npm_config_cache:path.join(temporary,"npm-cache"),npm_config_update_notifier:"false"}});
  const info=JSON.parse(packed.stdout)[0], contents=info.files.map(x=>x.path);
  for(const name of ["bin/codex-agent-template.mjs","src/cli.mjs","templates/base/.agents/skills/context-artifact-advisor/SKILL.md.tmpl","templates/skills/grill-me/SKILL.md","templates/skills/grill-me/agents/openai.yaml","schemas/config.schema.json"]) assert.ok(contents.includes(name),`Missing package file: ${name}`);
  assert.equal(contents.some(x=>/^(?:\.local|\.agents|test|docs|\.github)\//.test(x) || /\.(?:log|tmp|bak|tgz)$/.test(x)),false,"Unexpected local/test artifact in package");
  const unpack=path.join(temporary,"unpacked"),cwd=path.join(temporary,"unrelated"),target=path.join(temporary,"generated");
  await mkdir(unpack); await mkdir(cwd);
  await execute("tar",["-xzf",path.join(temporary,info.filename),"-C",unpack]);
  const cli=path.join(unpack,"package/bin/codex-agent-template.mjs");
  await execute(process.execPath,[cli,"init-new","--target",target,"--agent","codex+claude","--workflow","spec-tdd","--skill","grill-me","--context-advisor","--pack","privacy","--apply"],{cwd});
  const result=await execute(process.execPath,[cli,"validate","--target",target,"--output=json"],{cwd});
  assert.equal(JSON.parse(result.stdout).valid,true);
  console.log(`Package validation passed: ${contents.length} files; extracted CLI generates and validates from another cwd.`);
} finally {
  const rel=path.relative(os.tmpdir(),temporary);
  if(!rel || rel.startsWith("..") || path.isAbsolute(rel)) throw new Error("Unsafe cleanup path");
  await rm(temporary,{recursive:true,force:true});
}
