import { existsSync, readFileSync } from "node:fs";
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
}) {
  const targetRoot = path.resolve(target);
  const existingConfig = readExistingConfig(targetRoot);
  const expectedFiles = await buildGeneratedFilePlan({
    target: targetRoot,
    agent,
    workflow,
    packs,
    contextAdvisor,
    projectKind: normalizeProjectKind(projectKind),
    generatedAt: existingConfig.config?.generatedAt,
  });

  const missingCreates = [];
  const updateCandidates = [];
  const unchanged = [];

  for (const file of expectedFiles) {
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

  return {
    target: targetRoot,
    agent,
    workflow,
    projectKind,
    packs,
    contextAdvisor,
    existingConfig,
    missingCreates,
    updateCandidates,
    unchanged,
    complete: missingCreates.length === 0 && updateCandidates.length === 0,
    recommendations: buildRecommendations({ missingCreates, updateCandidates }),
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

function buildRecommendations({ missingCreates, updateCandidates }) {
  if (missingCreates.length === 0 && updateCandidates.length === 0) {
    return ["Generated AI infrastructure is up to date for the selected options."];
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
