import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const supportedAgents = ["codex", "claude", "codex+claude"];
const supportedWorkflows = ["light", "task-first", "spec-tdd"];

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
  }

  requireFile(targetRoot, "docs/ai/onboarding-notes.md", errors);
  requireFile(targetRoot, "docs/ai/rule-quality-checklist.md", errors);
  requireFile(targetRoot, "docs/ai/verification.md", errors);

  if (config.workflow === "task-first") {
    requireFile(targetRoot, "docs/tasks/TEMPLATE.md", errors);
  } else if (config.workflow === "spec-tdd") {
    requireFile(targetRoot, "docs/specs/TEMPLATE.md", errors);
    requireFile(targetRoot, "docs/ai-change-records/TEMPLATE.md", errors);
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
