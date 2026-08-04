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

const advisorArtifactDefinitions = [
  {
    relativePath: ".agents/skills/session-artifact-advisor/SKILL.md",
    advisor: "session-artifact-advisor",
  },
  {
    relativePath: "docs/ai/session-advisor",
    advisor: "session-artifact-advisor",
  },
  {
    relativePath: ".agents/skills/context-artifact-advisor/SKILL.md",
    advisor: "manual-context-advisor",
  },
  {
    relativePath: "docs/ai/advisor",
    advisor: "manual-context-advisor",
  },
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

const nonCodeProjectKindEvidence = [
  {
    kind: "no-code",
    confidence: "high",
    files: [
      "docs/CARD_TYPES.md",
      "docs/CORE_GAMEPLAY_LOOP.md",
      "docs/FIRST_EXPEDITION.md",
      "docs/MVP_SCOPE.md",
    ],
  },
  {
    kind: "game-design",
    confidence: "medium",
    files: [
      "docs/GAME_DESIGN.md",
      "GAME_DESIGN.md",
      "docs/GDD.md",
      "GDD.md",
      "docs/MECHANICS.md",
    ],
  },
  {
    kind: "docs",
    confidence: "low",
    files: [
      "docs",
    ],
  },
];

export function discoverExisting(target) {
  const targetRoot = path.resolve(target);
  const existingAiFiles = aiFiles.filter((relativePath) => existsSync(path.join(targetRoot, relativePath)));
  const detectedProjectFiles = projectFiles.filter((relativePath) =>
    existsSync(path.join(targetRoot, relativePath))
  );
  const packageManager = detectPackageManager(targetRoot);
  const projectTypes = detectProjectTypes(targetRoot);
  const advisorArtifacts = detectAdvisorArtifacts(targetRoot);
  const agentTemplate = readAgentTemplate(targetRoot);
  const projectKindSuggestion = suggestProjectKind(targetRoot, projectTypes);
  const commands = [];

  const packageJsonPath = path.join(targetRoot, "package.json");
  if (existsSync(packageJsonPath)) {
    commands.push(...readPackageJsonCommands(packageJsonPath, packageManager || "npm"));
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
    projectTypes,
    packageManager,
    advisorStatus: detectAdvisorStatus(advisorArtifacts),
    advisorArtifacts: advisorArtifacts.map((artifact) => artifact.relativePath),
    agentTemplate,
    projectKindSuggestion,
    commands,
    suggestedVerification: buildSuggestedVerification(commands),
  };
}

function suggestProjectKind(targetRoot, projectTypes) {
  if (projectTypes.length > 0) {
    return {
      kind: "code",
      confidence: "high",
      evidence: projectTypes.map((type) => `project type: ${type}`),
    };
  }

  for (const definition of nonCodeProjectKindEvidence) {
    const evidence = definition.files.filter((relativePath) =>
      existsSync(path.join(targetRoot, relativePath))
    );
    if (evidence.length > 0) {
      return {
        kind: definition.kind,
        confidence: definition.confidence,
        evidence,
      };
    }
  }

  return {
    kind: "code",
    confidence: "low",
    evidence: [],
  };
}

function readAgentTemplate(targetRoot) {
  const configPath = path.join(targetRoot, ".agent-template.json");
  if (!existsSync(configPath)) {
    return { exists: false, valid: false, config: null, error: null };
  }

  try {
    return {
      exists: true,
      valid: true,
      config: JSON.parse(readFileSync(configPath, "utf8")),
      error: null,
    };
  } catch (error) {
    return {
      exists: true,
      valid: false,
      config: null,
      error: error.message,
    };
  }
}

function detectAdvisorArtifacts(targetRoot) {
  return advisorArtifactDefinitions.filter((artifact) =>
    existsSync(path.join(targetRoot, artifact.relativePath))
  );
}

function detectAdvisorStatus(advisorArtifacts) {
  const advisors = new Set(advisorArtifacts.map((artifact) => artifact.advisor));

  if (
    advisors.has("session-artifact-advisor") &&
    advisors.has("manual-context-advisor")
  ) {
    return "mixed";
  }
  if (advisors.has("session-artifact-advisor")) {
    return "session-artifact-advisor";
  }
  if (advisors.has("manual-context-advisor")) {
    return "manual-context-advisor";
  }
  return "none";
}

function detectPackageManager(targetRoot) {
  if (existsSync(path.join(targetRoot, "pnpm-lock.yaml"))) {
    return "pnpm";
  }
  if (existsSync(path.join(targetRoot, "yarn.lock"))) {
    return "yarn";
  }
  if (existsSync(path.join(targetRoot, "package-lock.json"))) {
    return "npm";
  }
  if (existsSync(path.join(targetRoot, "package.json"))) {
    return "npm";
  }
  return null;
}

function detectProjectTypes(targetRoot) {
  const types = [];
  if (existsSync(path.join(targetRoot, "package.json"))) {
    types.push("node");
  }
  if (existsSync(path.join(targetRoot, "pyproject.toml")) || existsSync(path.join(targetRoot, "requirements.txt"))) {
    types.push("python");
  }
  if (existsSync(path.join(targetRoot, "go.mod"))) {
    types.push("go");
  }
  if (existsSync(path.join(targetRoot, "Gemfile"))) {
    types.push("ruby");
  }
  if (existsSync(path.join(targetRoot, "project.godot"))) {
    types.push("godot");
  }
  if (existsSync(path.join(targetRoot, "Cargo.toml"))) {
    types.push("rust");
  }
  return types;
}

function readPackageJsonCommands(packageJsonPath, packageManager) {
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
      commands.push({ kind, command: packageCommand(packageManager, scriptName), confidence: "high" });
    }
  }

  return commands;
}

function packageCommand(packageManager, scriptName) {
  if (packageManager === "yarn") {
    return `yarn ${scriptName}`;
  }
  return `${packageManager} run ${scriptName}`;
}

function buildSuggestedVerification(commands) {
  const orderedKinds = [
    "project-validation",
    "lint",
    "static-analysis",
    "unit-test",
    "integration-test",
    "e2e",
    "build",
    "manual-smoke",
  ];

  return orderedKinds
    .map((kind) => commands.find((command) => command.kind === kind))
    .filter(Boolean);
}
