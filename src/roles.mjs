import { readFile } from "node:fs/promises";
import path from "node:path";
import { roleDefinitions } from "./config.mjs";
import { safePath } from "./file-plan.mjs";

export function rolePaths(agent, name) {
  return [
    ...(agent !== "claude" ? [`.codex/agents/${name}.toml`] : []),
    ...(agent !== "codex" ? [`.claude/agents/${name}.md`] : []),
  ];
}

export async function buildRoleFiles(target, agent, selectedRoles) {
  const files = [];
  for (const name of selectedRoles) {
    const definition = roleDefinitions[name];
    const body = await readFile(new URL(`../templates/roles/${name}.md`, import.meta.url), "utf8");
    for (const relativePath of rolePaths(agent, name)) {
      const isCodex = relativePath.endsWith(".toml");
      const skillRoot = isCodex ? ".agents/skills" : ".claude/skills";
      const links = definition.skills.map(skill => `- [${skill}](${path.posix.relative(path.posix.dirname(relativePath), `${skillRoot}/${skill}/SKILL.md`)})`).join("\n");
      const instructions = `${body.trimEnd()}\n\n## Workflow\n\nRead the relevant workflow before starting; these files belong to this project. Resolve the links relative to the role file \`${relativePath}\` inside the project root, not the shell working directory.\n\n${links}\n`;
      const content = isCodex
        ? `name = ${JSON.stringify(name)}\ndescription = ${JSON.stringify(definition.description)}\nsandbox_mode = "read-only"\ndeveloper_instructions = ${JSON.stringify(instructions)}\n`
        : `---\nname: ${JSON.stringify(name)}\ndescription: ${JSON.stringify(definition.description)}\ntools: ${JSON.stringify(definition.claudeTools)}\nskills: ${JSON.stringify(definition.skills)}\npermissionMode: default\n---\n\n${instructions}`;
      files.push({relativePath, absolutePath: safePath(target, relativePath), content});
    }
  }
  return files;
}

// This parses our flat, quoted TOML subset, not arbitrary external agent configurations.
export function parseGeneratedCodexRole(content) {
  const fields = Object.create(null);
  for (const line of content.split(/\r?\n/)) {
    if (!line.trim() || line.trimStart().startsWith("#")) continue;
    const match = line.match(/^([a-z_]+)\s*=\s*(".*")\s*$/);
    if (!match || Object.hasOwn(fields, match[1])) throw new Error("Expected unique flat TOML string fields in the generated format.");
    fields[match[1]] = JSON.parse(match[2]);
  }
  return fields;
}

export function parseGeneratedClaudeRole(content) {
  const match = content.replace(/\r\n/g, "\n").match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) throw new Error("Expected generated YAML frontmatter and a Markdown body.");
  const fields = Object.create(null);
  for (const line of match[1].split("\n")) {
    if (!line.trim() || line.trimStart().startsWith("#")) continue;
    const field = line.match(/^([a-zA-Z]+):\s*(.+)$/);
    if (!field || Object.hasOwn(fields, field[1])) throw new Error("Expected unique generated frontmatter fields.");
    fields[field[1]] = /^["\[]/.test(field[2]) ? JSON.parse(field[2]) : field[2];
  }
  return {...fields, developer_instructions: match[2]};
}

export function validateRole(name, content, add) {
  const isCodex = name.startsWith(".codex/");
  const expectedName = path.posix.basename(name, isCodex ? ".toml" : ".md");
  const definition = roleDefinitions[expectedName];
  let fields;
  try { fields = isCodex ? parseGeneratedCodexRole(content) : parseGeneratedClaudeRole(content); }
  catch (error) { add("error", "INVALID_ROLE", name, error.message, "Restore the generated role format or validate a custom format with its runtime."); return; }
  const fail = (code, explanation) => add("error", code, name, explanation, "Review the role's identity, workflow dependencies, and execution boundaries.");
  if (!definition || fields.name !== expectedName) fail("INVALID_ROLE_NAME", "Role name must match its generated file and catalog.");
  if (typeof fields.description !== "string" || !fields.description.trim()) fail("INVALID_ROLE", "Role description is required.");
  if (typeof fields.developer_instructions !== "string" || !fields.developer_instructions.trim()) fail("INVALID_ROLE", "Role instructions are required.");
  const allowedFields = isCodex ? ["name", "description", "sandbox_mode", "developer_instructions"] : ["name", "description", "tools", "skills", "permissionMode", "developer_instructions"];
  if (Object.keys(fields).some(key => !allowedFields.includes(key))) fail("INVALID_ROLE", "Custom configuration requires native review; doctor accepts only the generated field set.");
  if (isCodex && fields.sandbox_mode !== "read-only") fail("UNSAFE_ROLE_POLICY", "Generated Codex roles default to read-only; write permission requires a separately reviewed runtime override.");
  if (!isCodex && definition) {
    if (fields.permissionMode !== "default") fail("UNSAFE_ROLE_POLICY", "Generated Claude roles must preserve the parent's normal permission checks.");
    for (const field of ["tools", "skills"]) {
      const expected = field === "tools" ? definition.claudeTools : definition.skills;
      if (!Array.isArray(fields[field]) || fields[field].length !== expected.length || expected.some(value => !fields[field].includes(value))) fail(field === "tools" ? "UNSAFE_ROLE_POLICY" : "ROLE_SKILL_MISSING", `Role ${field} must match its declared catalog contract.`);
    }
  }
  return fields.developer_instructions;
}
