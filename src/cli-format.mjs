export function printInitResult(result) {
  if (result.dryRun) {
    console.log("Dry run: no files written.");
  } else if (result.blocked.length > 0 || result.errors.length > 0) {
    console.log("Init-new blocked: no files written.");
  } else {
    console.log("Init-new completed.");
  }
  console.log(`Target: ${result.target}`);
  console.log(`Agent: ${result.agent}`);
  console.log(`Skills: ${result.skills?.join(", ") || "none"}`);
  console.log(`Roles: ${result.roles?.join(", ") || "none"}`);
  console.log(`Workflow: ${result.workflow}`);
  console.log(`Project kind: ${result.projectKind}`);
  console.log(`Packs: ${result.packs.length === 0 ? "none" : result.packs.join(", ")}`);
  console.log(`Context advisor: ${result.contextAdvisor ? "manual" : "disabled"}`);

  if (result.created.length > 0) {
    console.log("Files to create:");
    for (const file of result.created) {
      console.log(`- ${file}`);
    }
  }

  if (result.written.length > 0) {
    console.log("Files written:");
    for (const file of result.written) {
      console.log(`- ${file}`);
    }
  }

  if (result.blocked.length > 0) {
    console.error("Blocked existing files:");
    for (const file of result.blocked) {
      console.error(`- ${file}`);
    }
  }

  for (const warning of result.warnings) {
    console.warn(`Warning: ${warning}`);
  }
}

export function printOnboardResult(result) {
  console.log("Onboard-existing proposal: no files written.");
  console.log(`Skills: ${result.skills?.join(", ") || "none"}`);
  console.log(`Roles: ${result.roles?.join(", ") || "none"}`);
  console.log(`Target: ${result.target}`);
  console.log(`Agent: ${result.agent}`);
  console.log(`Workflow: ${result.workflow}`);
  console.log(`Project kind: ${result.projectKind}`);
  console.log(`Packs: ${result.packs.length === 0 ? "none" : result.packs.join(", ")}`);
  console.log(`Context advisor: ${result.contextAdvisor ? "manual" : "disabled"}`);

  console.log("Existing AI files:");
  printList(result.discovery.existingAiFiles);

  console.log("Detected project files:");
  printList(result.discovery.detectedProjectFiles);

  console.log("Detected project types:");
  printList(result.discovery.projectTypes);

  console.log("Project kind suggestion:");
  console.log(
    `- ${result.discovery.projectKindSuggestion.kind} (${result.discovery.projectKindSuggestion.confidence})`
  );
  console.log("Project kind evidence:");
  printList(result.discovery.projectKindSuggestion.evidence);

  console.log(`Package manager: ${result.discovery.packageManager || "none"}`);

  console.log(`Advisor status: ${result.discovery.advisorStatus || "none"}`);

  console.log("Advisor artifacts:");
  printList(result.discovery.advisorArtifacts || []);

  console.log("Detected commands:");
  if (result.discovery.commands.length === 0) {
    console.log("- none");
  } else {
    for (const command of result.discovery.commands) {
      console.log(`- ${command.kind}: ${command.command} (${command.confidence}; cwd: ${command.workingDirectory}; evidence: ${command.evidence}; not executed)`);
    }
  }

  console.log("Suggested verification:");
  if (result.discovery.suggestedVerification.length === 0) {
    console.log("- none");
  } else {
    for (const command of result.discovery.suggestedVerification) {
      console.log(`- ${command.kind}: ${command.command} (${command.confidence}; cwd: ${command.workingDirectory}; evidence: ${command.evidence}; not executed)`);
    }
  }

  console.log("Verification draft:");
  for (const row of result.verificationDraft) {
    console.log(`- ${row.check}: ${row.command} (${row.confidence})`);
  }

  console.log("Proposed files to create:");
  printList(result.proposedCreates);

  console.log("Blocked existing files:");
  printList(result.blockedExisting);

  console.log("Configuration issues:");
  if (result.configurationIssues.length === 0) {
    console.log("- none");
  } else {
    for (const issue of result.configurationIssues) {
      console.log(`- ${issue.path}: expected ${issue.expected}; actual ${issue.actual}`);
    }
  }

  console.log("Recommendations:");
  printList(result.recommendations);

  console.log("Findings:");
  if (result.findings.length === 0) {
    console.log("- none");
  } else {
    for (const finding of result.findings) {
      console.log(`- ${finding.severity}: ${finding.title} - ${finding.detail}`);
    }
  }

  console.log(`Complete: ${result.complete ? "yes" : "no"}`);
}

export function printUpdateResult(result) {
  console.log(result.apply ? "Update-existing apply completed." : "Update-existing proposal: no files written.");
  console.log(`Skills: ${result.skills?.join(", ") || "none"}`);
  console.log(`Roles: ${result.roles?.join(", ") || "none"}`);
  console.log(`Target: ${result.target}`);
  console.log(`Agent: ${result.agent}`);
  console.log(`Workflow: ${result.workflow}`);
  console.log(`Project kind: ${result.projectKind}`);
  console.log(`Packs: ${result.packs.length === 0 ? "none" : result.packs.join(", ")}`);
  console.log(`Context advisor: ${result.contextAdvisor ? "manual" : "disabled"}`);

  console.log("Existing template metadata:");
  if (!result.existingConfig.exists) {
    console.log("- none");
  } else if (!result.existingConfig.valid) {
    console.log(`- invalid .agent-template.json: ${result.existingConfig.error}`);
  } else {
    const config = result.existingConfig.config;
    console.log(`- agent: ${config.agent || "unknown"}`);
    console.log(`- workflow: ${config.workflow || "unknown"}`);
    console.log(`- projectKind: ${config.projectKind || "code"}`);
    console.log(`- generatedAt: ${config.generatedAt || "unknown"}`);
  }

  console.log("Missing files to create:");
  printList(result.missingCreates);

  console.log("Existing files to review for update:");
  printList(result.updateCandidates);

  console.log("Unchanged generated files:");
  printList(result.unchanged);

  if (result.apply) {
    console.log("Files written:");
    printList(result.written);
    console.log(`Approval: ${result.approval}`);
  }

  console.log("Recommendations:");
  printList(result.recommendations);

  console.log(`Complete: ${result.complete ? "yes" : "no"}`);
}

function printList(items) {
  if (items.length === 0) {
    console.log("- none");
    return;
  }

  for (const item of items) {
    console.log(`- ${item}`);
  }
}
