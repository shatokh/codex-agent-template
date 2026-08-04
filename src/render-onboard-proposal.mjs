export function renderOnboardProposal(result) {
  return `# Onboard Existing Proposal

Target: \`${result.target}\`
Agent: \`${result.agent}\`
Workflow: \`${result.workflow}\`
Packs: \`${result.packs.length === 0 ? "none" : result.packs.join(", ")}\`
Context advisor: \`${result.contextAdvisor ? "manual" : "disabled"}\`
Complete: \`${result.complete ? "yes" : "no"}\`

No target files were written by this proposal.

## Existing AI Files

${renderList(result.discovery.existingAiFiles)}

## Detected Project Files

${renderList(result.discovery.detectedProjectFiles)}

## Detected Commands

${renderCommands(result.discovery.commands)}

## Proposed Files To Create

${renderList(result.proposedCreates)}

## Blocked Existing Files

${renderList(result.blockedExisting)}

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
