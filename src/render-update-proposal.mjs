export function renderUpdateProposal(result) {
  return `# Update Existing Proposal

Target: \`${result.target}\`
Agent: \`${result.agent}\`
Workflow: \`${result.workflow}\`
Project kind: \`${result.projectKind}\`
Packs: \`${result.packs.length === 0 ? "none" : result.packs.join(", ")}\`
Context advisor: \`${result.contextAdvisor ? "manual" : "disabled"}\`
Skills: \`${result.skills?.join(", ") || "none"}\`
Roles: \`${result.roles?.join(", ") || "none"}\`
Record templates: \`${result.recordTemplates?.join(", ") || "none"}\`
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

## Content Diffs

${(result.plan?.entries || []).filter(entry => entry.diff).map(entry => `### ${entry.path} (${entry.status})\n\n${entry.reason || ""}\n\n\`\`\`diff\n${entry.diff}\`\`\``).join("\n\n") || "No content differences."}

## Next Step

Review the diffs and conflicts. Save the JSON plan with --plan-file, then apply that same plan after approval. A changed file or template invalidates the plan.
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
