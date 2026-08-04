import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { initNew } from "./init-new.mjs";
import { onboardExisting } from "./onboard-existing.mjs";
import { acceptedProjectKinds, supportedProjectKinds } from "./project-kind.mjs";
import { renderOnboardProposal } from "./render-onboard-proposal.mjs";
import { renderUpdateProposal } from "./render-update-proposal.mjs";
import { updateExisting } from "./update-existing.mjs";
import { validateGeneratedProject } from "./validate-generated-project.mjs";

const agentModes = ["codex", "claude", "codex+claude"];
const workflows = ["light", "task-first", "spec-tdd"];
const packs = ["privacy", "external-services", "security", "test-harness", "docs"];

export async function runCli(argv) {
  const [command, ...rest] = argv;
  const options = parseOptions(rest);

  if (!command || command === "help" || command === "--help") {
    printHelp();
    return;
  }

  if (command === "list") {
    const result = {
      agents: agentModes,
      workflows,
      projectKinds: supportedProjectKinds,
      packs,
    };
    if (options.output === "json") {
      printJson(result);
    } else {
      console.log("Agents: codex, claude, codex+claude");
      console.log("Workflows: light, task-first, spec-tdd");
      console.log("Project kinds: code, docs, game-design, no-code");
      console.log("Packs: privacy, external-services, security, test-harness, docs");
    }
    return;
  }

  if (command === "init-new") {
    const result = await initNew({
      target: options.target || ".",
      agent: options.agent || "codex",
      workflow: options.workflow || "light",
      projectKind: options["project-kind"] || "code",
      packs: options.pack || [],
      contextAdvisor: Boolean(options["context-advisor"]),
      dryRun: Boolean(options["dry-run"]),
    });
    if (options.output === "json") {
      printJson(result);
    } else {
      printInitResult(result);
    }
    if (result.blocked.length > 0 || result.errors.length > 0) {
      process.exitCode = 1;
    }
    return;
  }

  if (command === "onboard-existing") {
    if (options["proposal-file"] && options["proposal-dir"]) {
      throw new Error("Use either --proposal-file or --proposal-dir, not both.");
    }

    const result = await onboardExisting({
      target: options.target || ".",
      agent: options.agent || "codex",
      workflow: options.workflow || "light",
      projectKind: options["project-kind"] || "code",
      packs: options.pack || [],
      contextAdvisor: Boolean(options["context-advisor"]),
    });
    if (options.output === "json") {
      printJson(result);
    } else {
      printOnboardResult(result);
    }
    if (options["proposal-file"]) {
      await writeProposalFile(options["proposal-file"], renderOnboardProposal(result));
      console.log(`Proposal written: ${path.resolve(options["proposal-file"])}`);
    }
    if (options["proposal-dir"]) {
      const proposalPath = await writeProposalDir(options["proposal-dir"], result);
      console.log(`Proposal written: ${proposalPath}`);
    }
    if (options.check && !result.complete) {
      process.exitCode = 1;
    }
    return;
  }

  if (command === "update-existing") {
    if (options["proposal-file"] && options["proposal-dir"]) {
      throw new Error("Use either --proposal-file or --proposal-dir, not both.");
    }
    if (options.apply && (options["proposal-file"] || options["proposal-dir"])) {
      throw new Error("Do not use proposal export with --apply; run dry-run proposal review first.");
    }

    const result = await updateExisting({
      target: options.target || ".",
      agent: options.agent || "codex",
      workflow: options.workflow || "light",
      projectKind: options["project-kind"] || "code",
      packs: options.pack || [],
      contextAdvisor: Boolean(options["context-advisor"]),
      apply: Boolean(options.apply),
      approval: options.approval || "",
    });
    if (options.output === "json") {
      printJson(result);
    } else {
      printUpdateResult(result);
    }
    if (options["proposal-file"]) {
      await writeProposalFile(options["proposal-file"], renderUpdateProposal(result));
      console.log(`Proposal written: ${path.resolve(options["proposal-file"])}`);
    }
    if (options["proposal-dir"]) {
      const proposalPath = await writeProposalDir(
        options["proposal-dir"],
        result,
        renderUpdateProposal,
        "update-proposal"
      );
      console.log(`Proposal written: ${proposalPath}`);
    }
    if (options.check && !result.complete) {
      process.exitCode = 1;
    }
    return;
  }

  if (command === "validate") {
    const result = await validateGeneratedProject(options.target || ".");
    if (options.output === "json") {
      printJson(result);
    } else if (result.valid) {
      console.log("Generated project validation passed.");
    } else {
      console.error("Generated project validation failed:");
      for (const error of result.errors) {
        console.error(`- ${error}`);
      }
      process.exitCode = 1;
    }
    return;
  }

  throw new Error(`Unknown command: ${command}`);
}

function parseOptions(argv) {
  const options = {};

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (!arg.startsWith("--")) {
      throw new Error(`Unexpected argument: ${arg}`);
    }

    const key = arg.slice(2);
    if (key === "dry-run" || key === "check" || key === "context-advisor" || key === "apply") {
      options[key] = true;
      continue;
    }

    const value = argv[index + 1];
    if (!value || value.startsWith("--")) {
      throw new Error(`Missing value for --${key}`);
    }
    index += 1;
    if (key === "pack") {
      options.pack ??= [];
      options.pack.push(value);
    } else {
      options[key] = value;
    }
  }

  if (options.agent && !agentModes.includes(options.agent)) {
    throw new Error(`Unsupported --agent value: ${options.agent}`);
  }
  if (options.workflow && !workflows.includes(options.workflow)) {
    throw new Error(`Unsupported --workflow value: ${options.workflow}`);
  }
  if (options.output && !["text", "json"].includes(options.output)) {
    throw new Error(`Unsupported --output value: ${options.output}`);
  }
  if (options["project-kind"] && !acceptedProjectKinds.includes(options["project-kind"])) {
    throw new Error(`Unsupported --project-kind value: ${options["project-kind"]}`);
  }
  if (options.pack) {
    for (const pack of options.pack) {
      if (!packs.includes(pack)) {
        throw new Error(`Unsupported --pack value: ${pack}`);
      }
    }
  }

  return options;
}

function printInitResult(result) {
  if (result.dryRun) {
    console.log("Dry run: no files written.");
  } else if (result.blocked.length > 0 || result.errors.length > 0) {
    console.log("Init-new blocked: no files written.");
  } else {
    console.log("Init-new completed.");
  }
  console.log(`Target: ${result.target}`);
  console.log(`Agent: ${result.agent}`);
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

function printHelp() {
  console.log(`codex-agent-template

Commands:
  init-new --target <path> [--agent codex|claude|codex+claude] [--workflow light|task-first|spec-tdd] [--project-kind code|docs|game-design|no-code] [--pack privacy|external-services|security|test-harness|docs] [--context-advisor] [--dry-run] [--output text|json]
  onboard-existing --target <path> [--agent codex|claude|codex+claude] [--workflow light|task-first|spec-tdd] [--project-kind code|docs|game-design|no-code] [--pack privacy|external-services|security|test-harness|docs] [--context-advisor] [--dry-run] [--proposal-file <path>|--proposal-dir <path>] [--check] [--output text|json]
  update-existing --target <path> [--agent codex|claude|codex+claude] [--workflow light|task-first|spec-tdd] [--project-kind code|docs|game-design|no-code] [--pack privacy|external-services|security|test-harness|docs] [--context-advisor] [--proposal-file <path>|--proposal-dir <path>] [--apply --approval <text>] [--check] [--output text|json]
  validate --target <path> [--output text|json]
  list [--output text|json]
`);
}

function printJson(value) {
  console.log(JSON.stringify(value, null, 2));
}

async function writeProposalFile(proposalFile, markdown) {
  const outputPath = path.resolve(proposalFile);
  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, markdown, "utf8");
}

async function writeProposalDir(
  proposalDir,
  result,
  renderProposal = renderOnboardProposal,
  suffix = "onboarding-proposal"
) {
  const projectName = sanitizePathSegment(path.basename(result.target)) || "project";
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const outputPath = path.resolve(
    proposalDir,
    projectName,
    `${timestamp}-${suffix}.md`
  );
  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, renderProposal(result), "utf8");
  return outputPath;
}

function sanitizePathSegment(value) {
  return value.replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-+|-+$/g, "");
}

function printOnboardResult(result) {
  console.log("Onboard-existing proposal: no files written.");
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
      console.log(`- ${command.kind}: ${command.command} (${command.confidence})`);
    }
  }

  console.log("Suggested verification:");
  if (result.discovery.suggestedVerification.length === 0) {
    console.log("- none");
  } else {
    for (const command of result.discovery.suggestedVerification) {
      console.log(`- ${command.kind}: ${command.command} (${command.confidence})`);
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

function printUpdateResult(result) {
  console.log(result.apply ? "Update-existing apply completed." : "Update-existing proposal: no files written.");
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
