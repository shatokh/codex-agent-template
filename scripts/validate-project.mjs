#!/usr/bin/env node

import { existsSync, readFileSync } from "node:fs";
import { validateSkill } from "../src/validate-generated-project.mjs";
import { skills, templateVersion } from "../src/config.mjs";

const requiredFiles = [
  "AGENTS.md",
  "README.md",
  "package.json",
  "bin/codex-agent-template.mjs",
  "src/cli.mjs",
  "src/config.mjs",
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
if (JSON.parse(readFileSync("package.json","utf8")).version !== templateVersion) missing.push("package/template version mismatch");
if (existsSync(".agents/skills/grill-me/SKILL.md") && readFileSync(".agents/skills/grill-me/SKILL.md","utf8") !== readFileSync("templates/skills/grill-me/SKILL.md","utf8")) missing.push("local grill-me differs from its generator source");

if (missing.length > 0) {
  console.error("Missing required files:");
  for (const path of missing) {
    console.error(`- ${path}`);
  }
  process.exitCode = 1;
} else {
  console.log("Project skeleton validation passed.");
}
