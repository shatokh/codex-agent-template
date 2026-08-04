export function renderOnboardProposal(result) {
  return `# Onboard Existing Proposal

Target: \`${result.target}\`
Agent: \`${result.agent}\`
Workflow: \`${result.workflow}\`
Project kind: \`${result.projectKind || "code"}\`
Packs: \`${result.packs.length === 0 ? "none" : result.packs.join(", ")}\`
Context advisor: \`${result.contextAdvisor ? "manual" : "disabled"}\`
Complete: \`${result.complete ? "yes" : "no"}\`

No target files were written by this proposal.

## Existing AI Files

${renderList(result.discovery.existingAiFiles)}

## Detected Project Files

${renderList(result.discovery.detectedProjectFiles)}

## Detected Project Types

${renderList(result.discovery.projectTypes)}

## Package Manager

${result.discovery.packageManager ? `- \`${result.discovery.packageManager}\`` : "- none"}

## Advisor Status

- \`${result.discovery.advisorStatus || "none"}\`

## Advisor Artifacts

${renderList(result.discovery.advisorArtifacts || [])}

## Detected Commands

${renderCommands(result.discovery.commands)}

## Suggested Verification

${renderCommands(result.discovery.suggestedVerification)}

## Verification Draft

${renderVerificationDraft(result.verificationDraft)}

## Proposed Files To Create

${renderList(result.proposedCreates)}

## Blocked Existing Files

${renderList(result.blockedExisting)}

## Configuration Issues

${renderConfigurationIssues(result.configurationIssues || [])}

## Recommendations

${renderList(result.recommendations)}

## Findings

${renderFindings(result.findings)}

## Next Step

Review this proposal before running generation or manually copying any suggested artifact.
`;
}

function renderList(items) {
  if (items.length === 0) {
    return "- none";
  }

  return items.map((item) => `- \`${item}\``).join("\n");
}

function renderCommands(commands) {
  if (commands.length === 0) {
    return "- none";
  }

  return commands
    .map((command) => `- ${command.kind}: \`${command.command}\` (${command.confidence})`)
    .join("\n");
}

function renderFindings(findings) {
  if (findings.length === 0) {
    return "- none";
  }

  const severities = ["high", "medium", "info"];
  return severities
    .map((severity) => {
      const matching = findings.filter((finding) => finding.severity === severity);
      if (matching.length === 0) {
        return "";
      }
      return [
        `### ${severity}`,
        matching.map((finding) => `- ${finding.title}: ${finding.detail}`).join("\n"),
      ].join("\n\n");
    })
    .filter(Boolean)
    .join("\n\n");
}

function renderConfigurationIssues(configurationIssues) {
  if (configurationIssues.length === 0) {
    return "- none";
  }

  return configurationIssues
    .map((issue) => `- \`${issue.path}\`: expected ${issue.expected}; actual ${issue.actual}`)
    .join("\n");
}

function renderVerificationDraft(rows) {
  if (rows.length === 0) {
    return "- none";
  }

  return [
    "| Check | Command | Confidence |",
    "| --- | --- | --- |",
    ...rows.map((row) => `| ${row.check} | \`${row.command}\` | ${row.confidence} |`),
  ].join("\n");
}
