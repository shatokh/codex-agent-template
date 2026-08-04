export const supportedProjectKinds = ["code", "docs", "game-design", "boardgame"];

export function normalizeProjectKind(projectKind = "code") {
  if (!supportedProjectKinds.includes(projectKind)) {
    throw new Error(`Unsupported project kind: ${projectKind}`);
  }
  return projectKind;
}

export function projectKindLabel(projectKind) {
  const labels = {
    code: "Code project",
    docs: "Documentation project",
    "game-design": "Game design project",
    boardgame: "Board game design project",
  };
  return labels[projectKind] || labels.code;
}

export function verificationRowsForProjectKind(projectKind) {
  if (projectKind === "boardgame") {
    return [
      ["Rules consistency review", "Manual review", "Not configured"],
      ["Component and card inventory review", "Manual review", "Not configured"],
      ["Playtest checklist", "Manual playtest", "Not configured"],
      ["Balance review", "Manual review", "Not configured"],
      ["Print/export check", "Not configured", "Unknown"],
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
  if (projectKind === "boardgame") {
    return "For board game projects, prefer concrete review and playtest evidence over placeholder software commands.";
  }

  if (projectKind === "game-design") {
    return "For game design projects, prefer prototype, balance, content, and decision-log checks over placeholder software commands.";
  }

  if (projectKind === "docs") {
    return "For documentation projects, prefer structure, consistency, link/reference, and publication checks over placeholder software commands.";
  }

  return "For simple projects, keep only checks that actually exist and leave unavailable checks explicit.";
}
