import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const moduleDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(moduleDir, "..");
const templatesRoot = path.join(projectRoot, "templates", "base");

export async function initNew({ target, agent, workflow, dryRun }) {
  const targetRoot = path.resolve(target);
  const projectName = path.basename(targetRoot);
  const plan = await buildFilePlan({ targetRoot, projectName, agent, workflow });
  const blocked = [];
  const created = [];
  const written = [];
  const warnings = [];
  const errors = [];

  for (const file of plan) {
    if (existsSync(file.absolutePath)) {
      blocked.push(file.relativePath);
    } else {
      created.push(file.relativePath);
    }
  }

  if (!existsSync(targetRoot)) {
    warnings.push("target directory does not exist and will be created");
  }

  if (dryRun || blocked.length > 0) {
    return {
      target: targetRoot,
      agent,
      workflow,
      dryRun,
      created,
      written,
      blocked,
      warnings,
      errors,
    };
  }

  await mkdir(targetRoot, { recursive: true });

  for (const file of plan) {
    await mkdir(path.dirname(file.absolutePath), { recursive: true });
    await writeFile(file.absolutePath, file.content, "utf8");
    written.push(file.relativePath);
  }

  return {
    target: targetRoot,
    agent,
    workflow,
    dryRun,
    created,
    written,
    blocked,
    warnings,
    errors,
  };
}

async function buildFilePlan({ targetRoot, projectName, agent, workflow }) {
  const files = [];
  const context = {
    projectName,
    agent,
    workflow,
    generatedAt: new Date().toISOString().slice(0, 10),
  };

  if (agent === "codex") {
    files.push(await renderPlannedFile(targetRoot, "AGENTS.md", "AGENTS.md.tmpl", context));
  } else if (agent === "claude") {
    files.push(await renderPlannedFile(targetRoot, "CLAUDE.md", "CLAUDE.md.tmpl", context));
  } else if (agent === "codex+claude") {
    files.push(await renderPlannedFile(targetRoot, "AGENTS.md", "AGENTS.md.tmpl", context));
    files.push(
      await renderPlannedFile(
        targetRoot,
        "CLAUDE.md",
        "CLAUDE.import-agents.md.tmpl",
        context
      )
    );
  }

  files.push(
    await renderPlannedFile(targetRoot, ".agent-template.json", "agent-template.json.tmpl", context)
  );
  files.push(await renderPlannedFile(targetRoot, ".gitignore", "gitignore.tmpl", context));
  files.push(
    await renderPlannedFile(
      targetRoot,
      "docs/ai/onboarding-notes.md",
      "docs/ai/onboarding-notes.md.tmpl",
      context
    )
  );
  files.push(
    await renderPlannedFile(
      targetRoot,
      "docs/ai/rule-quality-checklist.md",
      "docs/ai/rule-quality-checklist.md.tmpl",
      context
    )
  );
  files.push(
    await renderPlannedFile(
      targetRoot,
      "docs/ai/verification.md",
      "docs/ai/verification.md.tmpl",
      context
    )
  );

  if (workflow === "task-first") {
    files.push(
      await renderPlannedFile(targetRoot, "docs/tasks/TEMPLATE.md", "docs/tasks/TEMPLATE.md.tmpl", context)
    );
  } else if (workflow === "spec-tdd") {
    files.push(
      await renderPlannedFile(targetRoot, "docs/specs/TEMPLATE.md", "docs/specs/TEMPLATE.md.tmpl", context)
    );
    files.push(
      await renderPlannedFile(
        targetRoot,
        "docs/ai-change-records/TEMPLATE.md",
        "docs/ai-change-records/TEMPLATE.md.tmpl",
        context
      )
    );
  }

  return files;
}

async function renderPlannedFile(targetRoot, relativePath, templateName, context) {
  const template = await readFile(path.join(templatesRoot, templateName), "utf8");
  return {
    relativePath,
    absolutePath: path.join(targetRoot, relativePath),
    content: renderTemplate(template, context),
  };
}

function renderTemplate(template, context) {
  return template.replace(/\{\{([a-zA-Z0-9_]+)\}\}/g, (match, key) => {
    if (!(key in context)) {
      throw new Error(`Unknown template variable: ${key}`);
    }
    return String(context[key]);
  });
}
