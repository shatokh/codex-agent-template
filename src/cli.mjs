import { initNew } from "./init-new.mjs";
import { validateGeneratedProject } from "./validate-generated-project.mjs";

const agentModes = ["codex", "claude", "codex+claude"];
const workflows = ["light", "task-first", "spec-tdd"];

export async function runCli(argv) {
  const [command, ...rest] = argv;
  const options = parseOptions(rest);

  if (!command || command === "help" || command === "--help") {
    printHelp();
    return;
  }

  if (command === "list") {
    console.log("Agents: codex, claude, codex+claude");
    console.log("Workflows: light, task-first, spec-tdd");
    return;
  }

  if (command === "init-new") {
    const result = await initNew({
      target: options.target || ".",
      agent: options.agent || "codex",
      workflow: options.workflow || "light",
      dryRun: Boolean(options["dry-run"]),
    });
    printInitResult(result);
    if (result.blocked.length > 0 || result.errors.length > 0) {
      process.exitCode = 1;
    }
    return;
  }

  if (command === "validate") {
    const result = await validateGeneratedProject(options.target || ".");
    if (result.valid) {
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
    if (key === "dry-run") {
      options[key] = true;
      continue;
    }

    const value = argv[index + 1];
    if (!value || value.startsWith("--")) {
      throw new Error(`Missing value for --${key}`);
    }
    index += 1;
    options[key] = value;
  }

  if (options.agent && !agentModes.includes(options.agent)) {
    throw new Error(`Unsupported --agent value: ${options.agent}`);
  }
  if (options.workflow && !workflows.includes(options.workflow)) {
    throw new Error(`Unsupported --workflow value: ${options.workflow}`);
  }

  return options;
}

function printInitResult(result) {
  console.log(result.dryRun ? "Dry run: no files written." : "Init-new completed.");
  console.log(`Target: ${result.target}`);
  console.log(`Agent: ${result.agent}`);
  console.log(`Workflow: ${result.workflow}`);

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
  init-new --target <path> [--agent codex|claude|codex+claude] [--workflow light|task-first|spec-tdd] [--dry-run]
  validate --target <path>
  list
`);
}
