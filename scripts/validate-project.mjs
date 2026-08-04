#!/usr/bin/env node

import { existsSync } from "node:fs";

const requiredFiles = [
  "AGENTS.md",
  "README.md",
  "package.json",
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
