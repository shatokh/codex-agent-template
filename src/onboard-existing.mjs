import { initNew } from "./init-new.mjs";
import { discoverExisting } from "./discover-existing.mjs";

export async function onboardExisting({ target, agent, workflow, packs = [], contextAdvisor = false }) {
  const discovery = discoverExisting(target);
  const plan = await initNew({
    target: discovery.target,
    agent,
    workflow,
    packs,
    contextAdvisor,
    dryRun: true,
  });
  const findings = buildFindings({ plan, discovery });

  return {
    target: discovery.target,
    agent,
    workflow,
    packs,
    contextAdvisor,
    discovery,
    proposedCreates: plan.created,
    blockedExisting: plan.blocked,
    complete: plan.created.length === 0,
    recommendations: buildRecommendations({ plan }),
    findings,
  };
}

function buildRecommendations({ plan }) {
  if (plan.created.length === 0) {
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

  return recommendations;
}

function buildFindings({ plan, discovery }) {
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

  if (discovery.commands.length === 0) {
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
