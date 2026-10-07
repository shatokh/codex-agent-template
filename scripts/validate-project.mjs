#!/usr/bin/env node

import { existsSync, readFileSync } from "node:fs";
import { validateSkill } from "../src/validate-generated-project.mjs";
import { skills, templateVersion } from "../src/config.mjs";
import { roleDefinitions, roles, packs, presets, presetDefinitions, recordTemplates } from "../src/config.mjs";
import { buildRoleFiles, validateRole } from "../src/roles.mjs";

const requiredFiles = [
  "AGENTS.md",
  "README.md",
  "package.json",
  "bin/codex-agent-template.mjs",
  "src/cli.mjs",
  "src/config.mjs",
  "src/roles.mjs",
  "templates/roles/catalog.json",
  "templates/presets/catalog.json",
  "templates/base/docs/ai/record-templates.md.tmpl",
  "templates/base/docs/ai/delegation.md.tmpl",
  "src/file-plan.mjs",
  "src/bounded-discovery.mjs",
  "scripts/check-package.mjs",
  "scripts/eval-skills.mjs",
  "schemas/config.schema.json",
  ".github/workflows/validate.yml",
  ".agents/skills/grill-me/SKILL.md",
  "docs/evals/scenarios.json",
  "docs/evals/grill-me-forward-test.md",
  "docs/decisions/0002-approved-reliability-and-skills.md",
  "docs/decisions/0003-technology-agnostic-artifacts.md",
  "docs/decisions/0004-specialized-workflows.md",
  "docs/decisions/0005-presets-and-record-templates.md",
  "docs/ai/presets-and-records.md",
  "test/presets-records.test.mjs",
  "docs/ai/artifact-catalog.md",
  "src/discover-existing.mjs",
  "src/init-new.mjs",
  "src/onboard-existing.mjs",
  "src/project-kind.mjs",
  "src/render-onboard-proposal.mjs",
  "src/render-update-proposal.mjs",
  "src/update-existing.mjs",
  "src/validate-generated-project.mjs",
  "templates/base/AGENTS.md.tmpl",
  "templates/base/CLAUDE.md.tmpl",
  "templates/base/CLAUDE.import-agents.md.tmpl",
  "templates/base/agent-template.json.tmpl",
  "templates/base/gitignore.tmpl",
  "templates/base/docs/ai/onboarding-notes.md.tmpl",
  "templates/base/docs/ai/rule-quality-checklist.md.tmpl",
  "templates/base/docs/ai/verification.md.tmpl",
  "templates/base/docs/ai/packs/privacy.md.tmpl",
  "templates/base/docs/ai/packs/external-services.md.tmpl",
  "templates/base/docs/ai/packs/security.md.tmpl",
  "templates/base/docs/ai/packs/test-harness.md.tmpl",
  "templates/base/docs/ai/packs/docs.md.tmpl",
  "templates/base/.agents/skills/context-artifact-advisor/SKILL.md.tmpl",
  "templates/base/docs/ai/advisor/artifact-selection.md.tmpl",
  "templates/base/docs/ai/advisor/proposal-schema.md.tmpl",
  "templates/base/docs/ai/advisor/proposals/index.md.tmpl",
  "templates/base/docs/tasks/TEMPLATE.md.tmpl",
  "templates/base/docs/specs/TEMPLATE.md.tmpl",
  "templates/base/docs/ai-change-records/TEMPLATE.md.tmpl",
  "test/cli-output.test.mjs",
  "test/init-new.test.mjs",
  "test/onboard-existing.test.mjs",
  "test/update-existing.test.mjs",
  "docs/plans/implementation-plan.md",
  "docs/plans/context-artifact-advisor.md",
  "docs/decisions/0001-v1-scope-and-advisor-mode.md",
  "docs/research/internet-best-practices.md",
];

const missing = requiredFiles.filter((path) => !existsSync(path));
for (const name of skills) {
  const filename=`templates/skills/${name}/SKILL.md`;
  if (!existsSync(filename)) missing.push(filename);
  else validateSkill(`${name}/SKILL.md`,readFileSync(filename,"utf8"),(severity,code,file,explanation)=>{if(severity==="error") missing.push(`${file}: ${code} ${explanation}`);});
}
for (const name of packs) if (!existsSync(`templates/base/docs/ai/packs/${name}.md.tmpl`)) missing.push(`pack template: ${name}`);
for (const name of recordTemplates) if (!existsSync(`templates/base/docs/ai/templates/${name}.md.tmpl`)) missing.push(`record template: ${name}`);
for (const name of presets) {
  const definition = presetDefinitions[name];
  if (typeof definition.description !== "string" || !definition.description.trim() || !Array.isArray(definition.skills) || definition.skills.some(skill => !skills.includes(skill)) || new Set(definition.skills).size !== definition.skills.length || Object.keys(definition).some(key => !["description", "skills"].includes(key))) missing.push(`invalid preset: ${name}`);
}
if (JSON.stringify(Object.keys(roleDefinitions)) !== JSON.stringify(roles)) missing.push("role catalog/schema mismatch");
for (const name of roles) {
  if (!existsSync(`templates/roles/${name}.md`)) missing.push(`role template: ${name}`);
  else for (const file of await buildRoleFiles(process.cwd(), "codex+claude", [name])) validateRole(file.relativePath,file.content,(severity,code,filename,explanation)=>{if(severity==="error") missing.push(`${filename}: ${code} ${explanation}`);});
  for (const skill of roleDefinitions[name]?.skills || []) if (!skills.includes(skill)) missing.push(`unknown workflow ${skill} in role ${name}`);
}
if (JSON.parse(readFileSync("package.json","utf8")).version !== templateVersion) missing.push("package/template version mismatch");
for (const name of skills) {
  const local=`.agents/skills/${name}/SKILL.md`;
  if (!existsSync(local)) missing.push(local);
  else if(readFileSync(local,"utf8") !== readFileSync(`templates/skills/${name}/SKILL.md`,"utf8")) missing.push(`local ${name} differs from its generator source`);
}
for (const file of await buildRoleFiles(process.cwd(), "codex", roles)) {
  if (!existsSync(file.relativePath)) missing.push(file.relativePath);
  else if (readFileSync(file.relativePath,"utf8") !== file.content) missing.push(`local role differs from its generator source: ${file.relativePath}`);
}

if (missing.length > 0) {
  console.error("Missing required files:");
  for (const path of missing) {
    console.error(`- ${path}`);
  }
  process.exitCode = 1;
} else {
  console.log("Project skeleton validation passed.");
}
