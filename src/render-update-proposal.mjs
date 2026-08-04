export function renderUpdateProposal(result) {
  return `# Update Existing Proposal

Target: \`${result.target}\`
Agent: \`${result.agent}\`
Workflow: \`${result.workflow}\`
Project kind: \`${result.projectKind}\`
Packs: \`${result.packs.length === 0 ? "none" : result.packs.join(", ")}\`
Context advisor: \`${result.contextAdvisor ? "manual" : "disabled"}\`
Complete: \`${result.complete ? "yes" : "no"}\`

No target files were written by this proposal.

## Existing Template Metadata

${renderExistingConfig(result.existingConfig)}

## Missing Files To Create

${renderList(result.missingCreates)}

## Existing Files To Review For Update

${renderList(result.updateCandidates)}

## Unchanged Generated Files

${renderList(result.unchanged)}

## Recommendations

${renderList(result.recommendations)}

## Next Step

Review this proposal before applying updates. The current command is dry-run only.
`;
}

function renderExistingConfig(existingConfig) {
  if (!existingConfig.exists) {
    return "- none";
  }
  if (!existingConfig.valid) {
    return `- invalid .agent-template.json: ${existingConfig.error}`;
  }

  const config = existingConfig.config;
  return [
    `- agent: \`${config.agent || "unknown"}\``,
    `- workflow: \`${config.workflow || "unknown"}\``,
    `- projectKind: \`${config.projectKind || "code"}\``,
    `- generatedAt: \`${config.generatedAt || "unknown"}\``,
  ].join("\n");
}

function renderList(items) {
  if (items.length === 0) {
    return "- none";
  }

  return items.map((item) => `- \`${item}\``).join("\n");
}
