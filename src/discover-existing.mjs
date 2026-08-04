import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const aiFiles = [
  "AGENTS.md",
  "CLAUDE.md",
  ".agents",
  ".codex",
  ".claude",
  "docs/ai",
  "docs/tasks",
  "docs/specs",
  "docs/ai-change-records",
];

const projectFiles = [
  "README.md",
  "package.json",
  "pnpm-lock.yaml",
  "package-lock.json",
  "yarn.lock",
  "pyproject.toml",
  "requirements.txt",
  "go.mod",
  "Gemfile",
  "Cargo.toml",
  "project.godot",
  ".github/workflows",
  ".env.example",
];

export function discoverExisting(target) {
  const targetRoot = path.resolve(target);
  const existingAiFiles = aiFiles.filter((relativePath) => existsSync(path.join(targetRoot, relativePath)));
  const detectedProjectFiles = projectFiles.filter((relativePath) =>
    existsSync(path.join(targetRoot, relativePath))
  );
  const commands = [];

  const packageJsonPath = path.join(targetRoot, "package.json");
  if (existsSync(packageJsonPath)) {
    commands.push(...readPackageJsonCommands(packageJsonPath));
  }

  if (existsSync(path.join(targetRoot, "pyproject.toml"))) {
    commands.push({ kind: "unit-test", command: "pytest", confidence: "medium" });
  } else if (existsSync(path.join(targetRoot, "requirements.txt"))) {
    commands.push({ kind: "unit-test", command: "pytest", confidence: "low" });
  }

  if (existsSync(path.join(targetRoot, "go.mod"))) {
    commands.push({ kind: "unit-test", command: "go test ./...", confidence: "high" });
  }

  if (existsSync(path.join(targetRoot, "Gemfile"))) {
    commands.push({ kind: "unit-test", command: "bundle exec rake test", confidence: "low" });
  }

  if (existsSync(path.join(targetRoot, "project.godot"))) {
    commands.push({ kind: "manual-smoke", command: "Godot project-specific test runner", confidence: "low" });
  }

  return {
    target: targetRoot,
    existingAiFiles,
    detectedProjectFiles,
    commands,
  };
}

function readPackageJsonCommands(packageJsonPath) {
  const commands = [];
  let pkg;
  try {
    pkg = JSON.parse(readFileSync(packageJsonPath, "utf8"));
  } catch {
    return commands;
  }

  const scripts = pkg.scripts || {};
  const scriptKinds = [
    ["test", "unit-test"],
    ["lint", "lint"],
    ["typecheck", "static-analysis"],
    ["build", "build"],
    ["validate", "project-validation"],
    ["test:e2e", "e2e"],
    ["test:integration", "integration-test"],
  ];

  for (const [scriptName, kind] of scriptKinds) {
    if (scripts[scriptName]) {
      commands.push({ kind, command: `npm run ${scriptName}`, confidence: "high" });
    }
  }

  return commands;
}
