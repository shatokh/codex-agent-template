#!/usr/bin/env node

import { existsSync } from "node:fs";

const requiredFiles = [
  "AGENTS.md",
  "README.md",
  "package.json",
  "bin/codex-agent-template.mjs",
  "src/cli.mjs",
  "src/discover-existing.mjs",
  "src/init-new.mjs",
  "src/onboard-existing.mjs",
  "src/render-onboard-proposal.mjs",
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
  "docs/plans/implementation-plan.md",
  "docs/plans/context-artifact-advisor.md",
  "docs/decisions/0001-v1-scope-and-advisor-mode.md",
  "docs/research/internet-best-practices.md",
];

const missing = requiredFiles.filter((path) => !existsSync(path));

if (missing.length > 0) {
  console.error("Missing required files:");
  for (const path of missing) {
    console.error(`- ${path}`);
  }
  process.exitCode = 1;
} else {
  console.log("Project skeleton validation passed.");
}
