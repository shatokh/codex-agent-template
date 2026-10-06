import { readFileSync } from "node:fs";
import { normalizeProjectKind } from "./project-kind.mjs";

export const configSchema = JSON.parse(readFileSync(new URL("../schemas/config.schema.json", import.meta.url), "utf8"));
export const agents = configSchema.properties.agent.enum;
export const workflows = configSchema.properties.workflow.enum;
export const packs = configSchema.properties.packs.items.enum;
export const skills = configSchema.properties.skills.items.enum;
export const approvalPolicies = configSchema.properties.approvalPolicy.enum;
export const schemaVersion = 1;
export const templateVersion = "0.2.0";

export class ProjectError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.code = code;
    this.details = details;
  }
}

export function normalizeConfig(input = {}) {
  for (const field of ["packs", "skills"]) if (input[field] !== undefined && !Array.isArray(input[field])) throw new ProjectError("INVALID_CONFIG", `${field} must be an array`);
  const value = {
    agent: input.agent ?? "codex", workflow: input.workflow ?? "light",
    projectKind: normalizeProjectKind(input.projectKind ?? "code"),
    packs: [...new Set(input.packs ?? [])], skills: [...new Set(input.skills ?? [])],
    contextAdvisor: input.contextAdvisor ?? false,
    approvalPolicy: input.approvalPolicy ?? "conservative",
    generatedAt: input.generatedAt ?? new Date().toISOString().slice(0, 10),
  };
  const errors = configErrors(value);
  if (errors.length) throw new ProjectError("INVALID_CONFIG", errors.join("; "));
  return value;
}

export function configErrors(config) {
  if (!config || typeof config !== "object" || Array.isArray(config)) return ["configuration must be an object"];
  const errors = [];
  if (config.schemaVersion === schemaVersion) {
    for (const name of configSchema.required) if (!(name in config)) errors.push(`missing ${name}`);
    for (const name of Object.keys(config)) if (!Object.hasOwn(configSchema.properties,name)) errors.push(`unknown config field: ${name}`);
    if (config.template !== "codex-agent-template") errors.push("unsupported template");
    if (typeof config.version !== "string") errors.push("version must be a string");
    if (!["code", "docs", "game-design", "no-code"].includes(config.projectKind)) errors.push("unsupported projectKind");
  }
  for (const [field, allowed] of [["agent", agents], ["workflow", workflows], ["approvalPolicy", approvalPolicies]]) {
    if (field === "approvalPolicy" && config[field] === undefined) continue;
    if (!allowed.includes(config[field])) errors.push(`unsupported ${field}: ${String(config[field])}`);
  }
  try { normalizeProjectKind(config.projectKind ?? "code"); } catch { errors.push("unsupported projectKind"); }
  for (const [field, allowed] of [["packs", packs], ["skills", skills]]) {
    if (config[field] === undefined) continue;
    if (!Array.isArray(config[field]) || config[field].some(x => !allowed.includes(x))) errors.push(`${field} must be an array of supported names`);
    else if (new Set(config[field]).size !== config[field].length) errors.push(`${field} must not contain duplicates`);
  }
  if (config.contextAdvisor !== undefined && typeof config.contextAdvisor !== "boolean") errors.push("contextAdvisor must be boolean");
  if (config.schemaVersion !== undefined && config.schemaVersion !== schemaVersion) errors.push("unsupported schemaVersion");
  if (config.generatedAt !== undefined && (typeof config.generatedAt !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(config.generatedAt))) errors.push("generatedAt must be YYYY-MM-DD");
  return errors;
}

export function readConfig(filename) {
  try {
    const config = JSON.parse(readFileSync(filename, "utf8"));
    const errors = configErrors(config);
    return { exists: true, valid: !errors.length, config, error: errors.join("; ") || null };
  } catch (error) {
    if (error.code === "ENOENT") return { exists: false, valid: false, config: null, error: null };
    return { exists: true, valid: false, config: null, error: error.message };
  }
}

export function skillRoots(agent) {
  return agent === "codex+claude" ? [".agents/skills", ".claude/skills"] : [agent === "claude" ? ".claude/skills" : ".agents/skills"];
}
