import { readFileSync } from "node:fs";
import { normalizeProjectKind } from "./project-kind.mjs";

export const configSchema = JSON.parse(readFileSync(new URL("../schemas/config.schema.json", import.meta.url), "utf8"));
export const agents = configSchema.properties.agent.enum;
export const workflows = configSchema.properties.workflow.enum;
export const packs = configSchema.properties.packs.items.enum;
export const skills = configSchema.properties.skills.items.enum;
export const roles = configSchema.properties.roles.items.enum;
export const recordTemplates = configSchema.properties.recordTemplates.items.enum;
export const presetDefinitions = JSON.parse(readFileSync(new URL("../templates/presets/catalog.json", import.meta.url), "utf8"));
export const presets = Object.keys(presetDefinitions);
export const roleDefinitions = JSON.parse(readFileSync(new URL("../templates/roles/catalog.json", import.meta.url), "utf8"));
export const approvalPolicies = configSchema.properties.approvalPolicy.enum;
export const schemaVersion = 1;
export const templateVersion = "0.5.0";

export class ProjectError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.code = code;
    this.details = details;
  }
}

// Presets are input shortcuts, never persistent configuration or runtime policies.
export function expandPreset({preset, ...input} = {}) {
  if (preset === undefined) return input;
  if (typeof preset !== "string" || !Object.hasOwn(presetDefinitions, preset)) throw new ProjectError("INVALID_CONFIG", `Unsupported preset: ${String(preset)}`);
  if (input.skills !== undefined && !Array.isArray(input.skills)) throw new ProjectError("INVALID_CONFIG", "skills must be an array");
  return {...input, skills: [...new Set([...presetDefinitions[preset].skills, ...(input.skills ?? [])])]};
}

export function normalizeConfig(input = {}) {
  input = expandPreset(input);
  for (const field of ["packs", "skills", "roles", "recordTemplates"]) if (input[field] !== undefined && !Array.isArray(input[field])) throw new ProjectError("INVALID_CONFIG", `${field} must be an array`);
  const value = {
    agent: input.agent ?? "codex", workflow: input.workflow ?? "light",
    projectKind: normalizeProjectKind(input.projectKind ?? "code"),
    packs: [...new Set(input.packs ?? [])], skills: [...new Set(input.skills ?? [])],
    roles: [...new Set(input.roles ?? [])],
    recordTemplates: [...new Set(input.recordTemplates ?? [])],
    contextAdvisor: input.contextAdvisor ?? false,
    approvalPolicy: input.approvalPolicy ?? "conservative",
    generatedAt: input.generatedAt ?? new Date().toISOString().slice(0, 10),
  };
  value.skills = [...new Set([...value.skills, ...value.roles.flatMap(name => roleDefinitions[name]?.skills ?? [])])];
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
  for (const [field, allowed] of [["packs", packs], ["skills", skills], ["roles", roles], ["recordTemplates", recordTemplates]]) {
    if (config[field] === undefined) continue;
    if (!Array.isArray(config[field]) || config[field].some(x => !allowed.includes(x))) errors.push(`${field} must be an array of supported names`);
    else if (new Set(config[field]).size !== config[field].length) errors.push(`${field} must not contain duplicates`);
  }
  if (Array.isArray(config.roles) && Array.isArray(config.skills)) for (const name of config.roles) {
    for (const skill of roleDefinitions[name]?.skills ?? []) if (!config.skills.includes(skill)) errors.push(`role ${name} requires skill ${skill}`);
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
