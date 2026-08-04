export function renderOnboardProposal(result) {
  return `# Onboard Existing Proposal

Target: \`${result.target}\`
Agent: \`${result.agent}\`
Workflow: \`${result.workflow}\`

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
