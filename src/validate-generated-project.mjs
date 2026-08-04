import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const supportedAgents = ["codex", "claude", "codex+claude"];
const supportedWorkflows = ["light", "task-first", "spec-tdd"];
const supportedPacks = ["privacy", "external-services", "security", "test-harness", "docs"];

export async function validateGeneratedProject(target) {
  const targetRoot = path.resolve(target);
  const errors = [];
  const configPath = path.join(targetRoot, ".agent-template.json");

  if (!existsSync(configPath)) {
    return {
      valid: false,
      errors: ["missing .agent-template.json"],
    };
  }

  let config;
  try {
    config = JSON.parse(readFileSync(configPath, "utf8"));
  } catch (error) {
    return {
      valid: false,
      errors: [`.agent-template.json is not valid JSON: ${error.message}`],
    };
  }

  if (!supportedAgents.includes(config.agent)) {
    errors.push(`unsupported agent mode in .agent-template.json: ${config.agent}`);
  }
  if (!supportedWorkflows.includes(config.workflow)) {
    errors.push(`unsupported workflow in .agent-template.json: ${config.workflow}`);
  }
  const packs = config.packs || [];
  if (!Array.isArray(packs)) {
    errors.push("packs in .agent-template.json must be an array");
  } else {
    for (const pack of packs) {
      if (!supportedPacks.includes(pack)) {
        errors.push(`unsupported pack in .agent-template.json: ${pack}`);
      }
    }
  }

  if (config.agent === "codex" || config.agent === "codex+claude") {
    requireFile(targetRoot, "AGENTS.md", errors);
  }
  if (config.agent === "claude" || config.agent === "codex+claude") {
    requireFile(targetRoot, "CLAUDE.md", errors);
  }

  if (config.agent === "codex+claude") {
    const claudePath = path.join(targetRoot, "CLAUDE.md");
    if (existsSync(claudePath)) {
      const claudeText = readFileSync(claudePath, "utf8");
      if (!claudeText.includes("@AGENTS.md")) {
        errors.push("CLAUDE.md must import @AGENTS.md in codex+claude mode");
      }
    }
  }

  const rootInstructionFile =
    config.agent === "claude"
      ? path.join(targetRoot, "CLAUDE.md")
      : path.join(targetRoot, "AGENTS.md");
  if (existsSync(rootInstructionFile)) {
    const lineCount = readFileSync(rootInstructionFile, "utf8").split(/\r?\n/).length;
    if (lineCount > 200) {
      errors.push(`${path.basename(rootInstructionFile)} exceeds 200 lines`);
    }
    const rootInstructionText = readFileSync(rootInstructionFile, "utf8");
    if (/\{\{[a-zA-Z0-9_]+\}\}/.test(rootInstructionText)) {
      errors.push(`${path.basename(rootInstructionFile)} contains unresolved template variables`);
    }
  }

  requireFile(targetRoot, ".gitignore", errors);
  validateGitignore(targetRoot, errors);

  requireFile(targetRoot, "docs/ai/onboarding-notes.md", errors);
  requireFile(targetRoot, "docs/ai/rule-quality-checklist.md", errors);
  requireFile(targetRoot, "docs/ai/verification.md", errors);

  if (config.workflow === "task-first") {
    requireFile(targetRoot, "docs/tasks/TEMPLATE.md", errors);
  } else if (config.workflow === "spec-tdd") {
    requireFile(targetRoot, "docs/specs/TEMPLATE.md", errors);
    requireFile(targetRoot, "docs/ai-change-records/TEMPLATE.md", errors);
  }

  if (Array.isArray(packs)) {
    for (const pack of packs) {
      requireFile(targetRoot, `docs/ai/packs/${pack}.md`, errors);
    }
  }

  if (config.contextAdvisor === true) {
    requireFile(targetRoot, ".agents/skills/context-artifact-advisor/SKILL.md", errors);
    requireFile(targetRoot, "docs/ai/advisor/artifact-selection.md", errors);
    requireFile(targetRoot, "docs/ai/advisor/proposal-schema.md", errors);
    requireFile(targetRoot, "docs/ai/advisor/proposals/index.md", errors);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

function requireFile(targetRoot, relativePath, errors) {
  if (!existsSync(path.join(targetRoot, relativePath))) {
    errors.push(`missing ${relativePath}`);
  }
}

function validateGitignore(targetRoot, errors) {
  const gitignorePath = path.join(targetRoot, ".gitignore");
  if (!existsSync(gitignorePath)) {
    return;
  }

  const text = readFileSync(gitignorePath, "utf8");
  const requiredEntries = [
    "AGENTS.local.md",
    "CLAUDE.local.md",
    ".agent-local/",
    ".codex-local/",
    ".claude-local/",
    ".env",
    ".env.*",
    "!.env.example",
  ];

  for (const entry of requiredEntries) {
    if (!text.includes(entry)) {
      errors.push(`.gitignore missing ${entry}`);
    }
  }
}
