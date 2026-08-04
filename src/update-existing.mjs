import { existsSync, readFileSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { buildGeneratedFilePlan } from "./init-new.mjs";
import { normalizeProjectKind } from "./project-kind.mjs";

export async function updateExisting({
  target,
  agent,
  workflow,
  packs = [],
  contextAdvisor = false,
  projectKind = "code",
  apply = false,
  approval = "",
}) {
  if (apply && approval.trim().length === 0) {
    throw new Error("update-existing --apply requires --approval <text>.");
  }

  const targetRoot = path.resolve(target);
  const normalizedProjectKind = normalizeProjectKind(projectKind);
  const existingConfig = readExistingConfig(targetRoot);
  const expectedFiles = await buildGeneratedFilePlan({
    target: targetRoot,
    agent,
    workflow,
    packs,
    contextAdvisor,
    projectKind: normalizedProjectKind,
    generatedAt: existingConfig.config?.generatedAt,
  });

  const missingCreates = [];
  const updateCandidates = [];
  const unchanged = [];
  const filesByRelativePath = new Map();

  for (const file of expectedFiles) {
    filesByRelativePath.set(file.relativePath, file);
    if (!existsSync(file.absolutePath)) {
      missingCreates.push(file.relativePath);
      continue;
    }

    const current = readFileSync(file.absolutePath, "utf8");
    if (normalizeContent(current) === normalizeContent(file.content)) {
      unchanged.push(file.relativePath);
    } else {
      updateCandidates.push(file.relativePath);
    }
  }

  const written = [];
  if (apply) {
    for (const relativePath of [...missingCreates, ...updateCandidates]) {
      const file = filesByRelativePath.get(relativePath);
      await mkdir(path.dirname(file.absolutePath), { recursive: true });
      await writeFile(file.absolutePath, file.content, "utf8");
      written.push(relativePath);
    }
  }

  return {
    target: targetRoot,
    agent,
    workflow,
    projectKind: normalizedProjectKind,
    packs,
    contextAdvisor,
    apply,
    approval: apply ? approval : "",
    existingConfig,
    missingCreates,
    updateCandidates,
    unchanged,
    written,
    complete: apply ? true : missingCreates.length === 0 && updateCandidates.length === 0,
    recommendations: buildRecommendations({ missingCreates, updateCandidates, apply }),
  };
}

function readExistingConfig(targetRoot) {
  const configPath = path.join(targetRoot, ".agent-template.json");
  if (!existsSync(configPath)) {
    return { exists: false, valid: false, config: null, error: null };
  }

  try {
    return {
      exists: true,
      valid: true,
      config: JSON.parse(readFileSync(configPath, "utf8")),
      error: null,
    };
  } catch (error) {
    return {
      exists: true,
      valid: false,
      config: null,
      error: error.message,
    };
  }
}

function normalizeContent(content) {
  return content.replace(/\r\n/g, "\n").replace(/\r/g, "\n").trimEnd();
}

function buildRecommendations({ missingCreates, updateCandidates, apply }) {
  if (missingCreates.length === 0 && updateCandidates.length === 0) {
    return ["Generated AI infrastructure is up to date for the selected options."];
  }

  if (apply) {
    return ["Applied generated AI infrastructure updates after explicit approval."];
  }

  const recommendations = [];
  if (missingCreates.length > 0) {
    recommendations.push("Review missing generated files before creating them.");
  }
  if (updateCandidates.length > 0) {
    recommendations.push("Review update candidates before applying any file changes.");
  }
  return recommendations;
}
