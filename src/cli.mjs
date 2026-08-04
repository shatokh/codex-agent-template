import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { initNew } from "./init-new.mjs";
import { onboardExisting } from "./onboard-existing.mjs";
import { renderOnboardProposal } from "./render-onboard-proposal.mjs";
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
      packs,
    };
    if (options.output === "json") {
      printJson(result);
    } else {
      console.log("Agents: codex, claude, codex+claude");
      console.log("Workflows: light, task-first, spec-tdd");
      console.log("Packs: privacy, external-services, security, test-harness, docs");
    }
    return;
  }

  if (command === "init-new") {
    const result = await initNew({
      target: options.target || ".",
      agent: options.agent || "codex",
      workflow: options.workflow || "light",
      packs: options.pack || [],
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
    const result = await onboardExisting({
      target: options.target || ".",
      agent: options.agent || "codex",
      workflow: options.workflow || "light",
      packs: options.pack || [],
    });
    if (options.output === "json") {
      printJson(result);
    } else {
      printOnboardResult(result);
    }
    if (options["proposal-file"]) {
      await writeProposalFile(options["proposal-file"], result);
      console.log(`Proposal written: ${path.resolve(options["proposal-file"])}`);
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
    if (key === "dry-run" || key === "check") {
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
  console.log(result.dryRun ? "Dry run: no files written." : "Init-new completed.");
  console.log(`Target: ${result.target}`);
  console.log(`Agent: ${result.agent}`);
  console.log(`Workflow: ${result.workflow}`);
  console.log(`Packs: ${result.packs.length === 0 ? "none" : result.packs.join(", ")}`);

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
  init-new --target <path> [--agent codex|claude|codex+claude] [--workflow light|task-first|spec-tdd] [--pack privacy|external-services|security|test-harness|docs] [--dry-run] [--output text|json]
  onboard-existing --target <path> [--agent codex|claude|codex+claude] [--workflow light|task-first|spec-tdd] [--pack privacy|external-services|security|test-harness|docs] [--dry-run] [--proposal-file <path>] [--check] [--output text|json]
  validate --target <path> [--output text|json]
  list [--output text|json]
`);
}

function printJson(value) {
  console.log(JSON.stringify(value, null, 2));
}

async function writeProposalFile(proposalFile, result) {
  const outputPath = path.resolve(proposalFile);
  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, renderOnboardProposal(result), "utf8");
}

function printOnboardResult(result) {
  console.log("Onboard-existing proposal: no files written.");
  console.log(`Target: ${result.target}`);
  console.log(`Agent: ${result.agent}`);
  console.log(`Workflow: ${result.workflow}`);
  console.log(`Packs: ${result.packs.length === 0 ? "none" : result.packs.join(", ")}`);

  console.log("Existing AI files:");
  printList(result.discovery.existingAiFiles);

  console.log("Detected project files:");
  printList(result.discovery.detectedProjectFiles);

  console.log("Detected commands:");
  if (result.discovery.commands.length === 0) {
    console.log("- none");
  } else {
    for (const command of result.discovery.commands) {
      console.log(`- ${command.kind}: ${command.command} (${command.confidence})`);
    }
  }

  console.log("Proposed files to create:");
  printList(result.proposedCreates);

  console.log("Blocked existing files:");
  printList(result.blockedExisting);

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

function printList(items) {
  if (items.length === 0) {
    console.log("- none");
    return;
  }

  for (const item of items) {
    console.log(`- ${item}`);
  }
}
