import { initNew } from "./init-new.mjs";
import { discoverExisting } from "./discover-existing.mjs";
import { normalizeProjectKind } from "./project-kind.mjs";

export async function onboardExisting({
  target,
  agent,
  workflow,
  packs = [],
  contextAdvisor = false,
  projectKind = "code",
}) {
  const discovery = discoverExisting(target);
  const normalizedProjectKind = normalizeProjectKind(projectKind);
  const plan = await initNew({
    target: discovery.target,
    agent,
    workflow,
    projectKind: normalizedProjectKind,
    packs,
    contextAdvisor,
    dryRun: true,
  });
  const configurationIssues = buildConfigurationIssues({
    discovery,
    agent,
    workflow,
    packs,
    contextAdvisor,
    projectKind: normalizedProjectKind,
  });
  const findings = buildFindings({
    plan,
    discovery,
    selectedProjectKind: normalizedProjectKind,
  });

  return {
    target: discovery.target,
    agent,
    workflow,
    projectKind: normalizedProjectKind,
    packs,
    contextAdvisor,
    discovery,
    proposedCreates: plan.created,
    blockedExisting: plan.blocked,
    configurationIssues,
    complete: plan.created.length === 0 && configurationIssues.length === 0,
    recommendations: buildRecommendations({
      plan,
      discovery,
      configurationIssues,
      selectedProjectKind: normalizedProjectKind,
    }),
    findings: [...findings, ...configurationIssuesToFindings(configurationIssues)],
    verificationDraft: buildVerificationDraft(discovery, normalizedProjectKind),
  };
}

function buildRecommendations({ plan, discovery, configurationIssues, selectedProjectKind }) {
  const projectKindMismatch =
    discovery.projectKindSuggestion.kind !== "code" &&
    discovery.projectKindSuggestion.kind !== selectedProjectKind;

  if (plan.created.length === 0 && configurationIssues.length === 0 && !projectKindMismatch) {
    return ["No generation needed for the selected agent/workflow/packs."];
  }

  const recommendations = [];

  if (plan.blocked.length === 0) {
    recommendations.push("Safe to run init-new for the selected options after review.");
  } else {
    recommendations.push("Manual merge review needed for existing files before generation.");
  }

  if (plan.created.includes("docs/ai/verification.md")) {
    recommendations.push("Review detected commands and fill docs/ai/verification.md after generation.");
  }

  if (configurationIssues.length > 0) {
    recommendations.push("Manual metadata/content update needed for existing generated files.");
  }

  if (projectKindMismatch) {
    recommendations.push(
      `Discovery suggests project kind ${discovery.projectKindSuggestion.kind}; review --project-kind before generation.`
    );
  }

  if (
    plan.created.includes(".agents/skills/context-artifact-advisor/SKILL.md") &&
    ["session-artifact-advisor", "mixed"].includes(discovery.advisorStatus)
  ) {
    recommendations.push("Existing mature advisor found; prefer manual merge or skip generic context advisor.");
  }

  return recommendations;
}

function buildConfigurationIssues({
  discovery,
  agent,
  workflow,
  packs,
  contextAdvisor,
  projectKind,
}) {
  if (!discovery.agentTemplate.exists) {
    return [];
  }

  if (!discovery.agentTemplate.valid) {
    return [
      {
        path: ".agent-template.json",
        expected: "valid JSON",
        actual: discovery.agentTemplate.error || "invalid JSON",
      },
    ];
  }

  const config = discovery.agentTemplate.config || {};
  const issues = [];
  compareMetadata(issues, "agent", agent, config.agent);
  compareMetadata(issues, "workflow", workflow, config.workflow);
  compareMetadata(issues, "projectKind", projectKind, config.projectKind || "code");
  compareMetadata(issues, "contextAdvisor", contextAdvisor, config.contextAdvisor);

  const actualPacks = Array.isArray(config.packs) ? config.packs : [];
  if (JSON.stringify([...packs].sort()) !== JSON.stringify([...actualPacks].sort())) {
    issues.push({
      path: ".agent-template.json",
      expected: `packs=${packs.join(", ") || "none"}`,
      actual: `packs=${actualPacks.join(", ") || "none"}`,
    });
  }

  return issues;
}

function compareMetadata(issues, field, expected, actual) {
  if (expected !== actual) {
    issues.push({
      path: ".agent-template.json",
      expected: `${field}=${expected}`,
      actual: `${field}=${actual}`,
    });
  }
}

function configurationIssuesToFindings(configurationIssues) {
  return configurationIssues.map((issue) => ({
    severity: "medium",
    title: "Generated metadata mismatch",
    detail: `${issue.path} has ${issue.actual}; expected ${issue.expected}.`,
  }));
}

function buildFindings({ plan, discovery, selectedProjectKind }) {
  const findings = [];

  if (plan.created.length > 0) {
    findings.push({
      severity: "high",
      title: "Missing selected AI infrastructure files",
      detail: `${plan.created.length} files would be created for the selected options.`,
    });
  } else {
    findings.push({
      severity: "info",
      title: "Selected AI infrastructure is complete",
      detail: "No generated files are missing for the selected options.",
    });
  }

  if (plan.blocked.length > 0) {
    findings.push({
      severity: "medium",
      title: "Existing files require manual review",
      detail: `${plan.blocked.length} generated target files already exist and will not be overwritten.`,
    });
  }

  if (plan.created.includes("docs/ai/verification.md")) {
    findings.push({
      severity: "medium",
      title: "Verification documentation is missing",
      detail: "Generated verification docs should be filled with real project commands.",
    });
  }

  if (["session-artifact-advisor", "mixed"].includes(discovery.advisorStatus)) {
    findings.push({
      severity: "info",
      title: "Existing mature advisor detected",
      detail: "Discovery found session advisor artifacts; review before adding a generic context advisor.",
    });
  }

  if (
    discovery.projectKindSuggestion.kind !== "code" &&
    discovery.projectKindSuggestion.kind !== selectedProjectKind
  ) {
    findings.push({
      severity: "medium",
      title: "Project kind may be misclassified",
      detail: `Discovery suggests ${discovery.projectKindSuggestion.kind} (${discovery.projectKindSuggestion.confidence}) based on ${discovery.projectKindSuggestion.evidence.join(", ")}.`,
    });
  }

  if (discovery.commands.length === 0 && selectedProjectKind !== "code") {
    findings.push({
      severity: "info",
      title: "No software verification commands detected",
      detail: "This is expected for non-code projects when manual review or playtest checks are the verification path.",
    });
  } else if (discovery.commands.length === 0) {
    findings.push({
      severity: "medium",
      title: "No verification commands detected",
      detail: "Discovery did not find common test, lint, build, or validation commands.",
    });
  } else if (discovery.commands.some((command) => command.confidence !== "high")) {
    findings.push({
      severity: "info",
      title: "Some detected commands have lower confidence",
      detail: "Review medium and low confidence commands before copying them into verification docs.",
    });
  }

  return findings;
}

function buildVerificationDraft(discovery, projectKind) {
  if (projectKind === "boardgame") {
    return [
      { check: "Rules consistency review", command: "Manual review", confidence: "manual" },
      { check: "Component and card inventory review", command: "Manual review", confidence: "manual" },
      { check: "Playtest checklist", command: "Manual playtest", confidence: "manual" },
      { check: "Balance review", command: "Manual review", confidence: "manual" },
      { check: "Print/export check", command: "Not configured", confidence: "unknown" },
      { check: "Docs and decision log review", command: "Manual review", confidence: "manual" },
    ];
  }

  if (projectKind === "game-design") {
    return [
      { check: "Design consistency review", command: "Manual review", confidence: "manual" },
      { check: "Content inventory review", command: "Manual review", confidence: "manual" },
      { check: "Prototype smoke / playtest", command: "Manual playtest", confidence: "manual" },
      { check: "Balance or tuning review", command: "Manual review", confidence: "manual" },
      { check: "Asset/export check", command: "Not configured", confidence: "unknown" },
      { check: "Docs and decision log review", command: "Manual review", confidence: "manual" },
    ];
  }

  if (projectKind === "docs") {
    return [
      { check: "Structure review", command: "Manual review", confidence: "manual" },
      { check: "Link/reference check", command: "Not configured", confidence: "unknown" },
      { check: "Terminology consistency review", command: "Manual review", confidence: "manual" },
      { check: "Publication/export check", command: "Not configured", confidence: "unknown" },
      { check: "Docs change log review", command: "Manual review", confidence: "manual" },
    ];
  }

  const rows = [];
  const suggestedByKind = new Map(
    discovery.suggestedVerification.map((command) => [command.kind, command])
  );
  const checks = [
    ["Project validation", "project-validation"],
    ["Lint", "lint"],
    ["Static analysis / typecheck", "static-analysis"],
    ["Unit tests", "unit-test"],
    ["Integration tests", "integration-test"],
    ["E2E / smoke", "e2e"],
    ["Build/package", "build"],
    ["Manual smoke", "manual-smoke"],
  ];

  for (const [label, kind] of checks) {
    const command = suggestedByKind.get(kind);
    rows.push({
      check: label,
      command: command?.command || "Not configured",
      confidence: command?.confidence || "unknown",
    });
  }

  return rows;
}
