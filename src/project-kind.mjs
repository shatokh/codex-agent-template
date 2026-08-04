export const supportedProjectKinds = ["code", "docs", "game-design", "no-code"];
export const legacyProjectKindAliases = {
  boardgame: "no-code",
};
export const acceptedProjectKinds = [
  ...supportedProjectKinds,
  ...Object.keys(legacyProjectKindAliases),
];

export function normalizeProjectKind(projectKind = "code") {
  const normalized = legacyProjectKindAliases[projectKind] || projectKind;
  if (!supportedProjectKinds.includes(normalized)) {
    throw new Error(`Unsupported project kind: ${projectKind}`);
  }
  return normalized;
}

export function projectKindLabel(projectKind) {
  const labels = {
    code: "Code project",
    docs: "Documentation project",
    "game-design": "Game design project",
    "no-code": "No-code project",
  };
  return labels[projectKind] || labels.code;
}

export function verificationRowsForProjectKind(projectKind) {
  if (projectKind === "no-code") {
    return [
      ["Core rules or workflow review", "Manual review", "Not configured"],
      ["Content and asset inventory review", "Manual review", "Not configured"],
      ["Scenario/prototype walkthrough", "Manual review", "Not configured"],
      ["Consistency and edge-case review", "Manual review", "Not configured"],
      ["Export/publishing check", "Not configured", "Unknown"],
      ["Docs and decision log review", "Manual review", "Not configured"],
    ];
  }

  if (projectKind === "game-design") {
    return [
      ["Design consistency review", "Manual review", "Not configured"],
      ["Content inventory review", "Manual review", "Not configured"],
      ["Prototype smoke / playtest", "Manual playtest", "Not configured"],
      ["Balance or tuning review", "Manual review", "Not configured"],
      ["Asset/export check", "Not configured", "Unknown"],
      ["Docs and decision log review", "Manual review", "Not configured"],
    ];
  }

  if (projectKind === "docs") {
    return [
      ["Structure review", "Manual review", "Not configured"],
      ["Link/reference check", "Not configured", "Unknown"],
      ["Terminology consistency review", "Manual review", "Not configured"],
      ["Publication/export check", "Not configured", "Unknown"],
      ["Docs change log review", "Manual review", "Not configured"],
    ];
  }

  return [
    ["Bootstrap", "Not configured", "Unknown"],
    ["Format", "Not configured", "Unknown"],
    ["Lint", "Not configured", "Unknown"],
    ["Static analysis / typecheck", "Not configured", "Unknown"],
    ["Unit tests", "Not configured", "Unknown"],
    ["Integration tests", "Not configured", "Unknown"],
    ["E2E / smoke", "Not configured", "Unknown"],
    ["Build/package", "Not configured", "Unknown"],
    ["Security/dependency check", "Not configured", "Unknown"],
    ["Docs validation", "Not configured", "Unknown"],
  ];
}

export function verificationGuidanceForProjectKind(projectKind) {
  if (projectKind === "no-code") {
    return "For no-code projects, prefer concrete review, walkthrough, inventory, and publishing evidence over placeholder software commands.";
  }

  if (projectKind === "game-design") {
    return "For game design projects, prefer prototype, balance, content, and decision-log checks over placeholder software commands.";
  }

  if (projectKind === "docs") {
    return "For documentation projects, prefer structure, consistency, link/reference, and publication checks over placeholder software commands.";
  }

  return "For simple projects, keep only checks that actually exist and leave unavailable checks explicit.";
}
