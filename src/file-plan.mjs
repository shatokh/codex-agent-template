import { createHash, randomUUID } from "node:crypto";
import { lstatSync, readFileSync } from "node:fs";
import { mkdir, open, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { ProjectError, templateVersion } from "./config.mjs";

export const manifestName = ".agent-template-manifest.json";
export const hash = content => createHash("sha256").update(content).digest("hex");

export function safePath(root, relativePath = ".") {
  if (path.isAbsolute(relativePath) || relativePath.split(/[\\/]/).includes("..")) throw new ProjectError("UNSAFE_PATH", "Path must stay inside target.");
  const resolved = path.resolve(root, relativePath);
  const rel = path.relative(path.resolve(root), resolved);
  if (rel.startsWith("..") || path.isAbsolute(rel)) throw new ProjectError("UNSAFE_PATH", "Path escapes target.");
  let cursor = resolved;
  while (true) {
    try {
      if (lstatSync(cursor).isSymbolicLink()) throw new ProjectError("UNSAFE_PATH", `Symlink/junction is not allowed: ${cursor}`);
    } catch (error) { if (error.code !== "ENOENT") throw error; }
    const parent = path.dirname(cursor);
    if (parent === cursor) break;
    cursor = parent;
  }
  return resolved;
}

export function currentContent(root, relativePath) {
  const filename = safePath(root, relativePath);
  try {
    if (!lstatSync(filename).isFile()) throw new ProjectError("INVALID_TARGET", `Expected a regular file: ${relativePath}`);
    if (lstatSync(filename).size > 256 * 1024) throw new ProjectError("FILE_TOO_LARGE", `Review file manually; exceeds 256 KiB: ${relativePath}`);
    return readFileSync(filename, "utf8");
  } catch (error) { if (error.code === "ENOENT") return null; throw error; }
}

export function readManifest(root) {
  const content = currentContent(root, manifestName);
  if (content === null) return null;
  try {
    const value = JSON.parse(content);
    if (value.schemaVersion !== 1 || !value.files || typeof value.files !== "object" || Array.isArray(value.files)) throw new Error("invalid manifest structure");
    for (const [name, digest] of Object.entries(value.files)) {
      safePath(root, name);
      if (!/^[a-f0-9]{64}$/.test(digest)) throw new Error("invalid digest");
    }
    return value;
  } catch (error) { throw new ProjectError("INVALID_MANIFEST", `Cannot trust manifest: ${error.message}`); }
}

export function manifestFile(root, files, previous = {}) {
  const value = { schemaVersion: 1, templateVersion, files: { ...previous } };
  for (const file of files) if (file.relativePath !== manifestName) value.files[file.relativePath] = hash(file.content);
  return { relativePath: manifestName, absolutePath: safePath(root, manifestName), content: JSON.stringify(value, null, 2) + "\n" };
}

export function unifiedDiff(name, oldContent, newContent) {
  if (oldContent === newContent) return "";
  const lines = value => value === null || value === "" ? [] : value.replace(/\r\n/g, "\n").split("\n").filter((_, i, xs) => i !== xs.length - 1 || xs[i] !== "");
  const before = lines(oldContent), after = lines(newContent);
  return [`--- ${oldContent === null ? "/dev/null" : `a/${name}`}`, `+++ b/${name}`,
    `@@ -${before.length ? 1 : 0},${before.length} +${after.length ? 1 : 0},${after.length} @@`,
    ...before.map(x => `-${x}`), ...(oldContent && !oldContent.endsWith("\n") ? ["\\ No newline at end of file"] : []),
    ...after.map(x => `+${x}`), ...(newContent && !newContent.endsWith("\n") ? ["\\ No newline at end of file"] : []), ""].join("\n");
}

export function makeEntry(root, file, status, reason = null) {
  const old = currentContent(root, file.relativePath);
  return { path: file.relativePath, status, reason, oldHash: old === null ? null : hash(old), newHash: hash(file.content),
    content: file.content, diff: unifiedDiff(file.relativePath, old, file.content) };
}

export function reviewPlan(target, options, entries) {
  const plan = { schemaVersion: 1, templateVersion, target: path.resolve(target), options, entries };
  return { ...plan, id: hash(JSON.stringify(plan)) };
}

export function checkReviewedPlan(reviewed, fresh) {
  if (!reviewed || reviewed.schemaVersion !== 1 || !Array.isArray(reviewed.entries)) throw new ProjectError("INVALID_PLAN", "A saved JSON review plan is required.");
  const { id, ...unsigned } = reviewed;
  if (id !== hash(JSON.stringify(unsigned))) throw new ProjectError("INVALID_PLAN", "Review plan checksum is invalid.");
  if (id !== fresh.id) throw new ProjectError("STALE_PLAN", "Files, settings, or templates changed since review; create a new proposal.");
}

// Adds rules after existing patterns so negations cannot silently defeat the added rules.
export function extendGitignore(current, expected) {
  const rules = expected.split(/\r?\n/).filter(x => x.trim() && !x.startsWith("#"));
  const existing = current.split(/\r?\n/).filter(x => x.trim() && !x.startsWith("#"));
  if (existing.slice(-rules.length).join("\n") === rules.join("\n")) return current;
  return `${current.replace(/\s*$/, "")}\n\n# Agent template ignore rules (review ordering and negations)\n${rules.join("\n")}\n`;
}

export async function applyEntries(root, entries, { journal = true } = {}) {
  const changes = entries.filter(x => ["create", "modified", "adopt"].includes(x.status));
  if (!changes.length) return { written: [], journalPath: null };
  for (const entry of entries) verifyCurrent(root, entry);
  await mkdir(safePath(root), { recursive: true });
  const lockPath = safePath(root, ".agent-template.lock");
  try { await writeFile(lockPath, `${process.pid}\n`, { flag: "wx" }); }
  catch (error) { throw new ProjectError("TARGET_LOCKED", `Cannot acquire target lock: ${error.code}`); }
  const written = [], attempted = [], snapshots = new Map();
  const journalDir = journal ? `.agent-template-backups/${randomUUID()}` : null;
  let journalPath = null;
  const record = { schemaVersion: 1, status: "prepared", entries: changes.map(({path: name, oldHash, newHash}) => ({path:name, oldHash, newHash})), attempted, written, rollbackErrors: [] };
  const saveJournal = async () => { if (journalPath) await writeFile(journalPath, JSON.stringify(record, null, 2) + "\n"); };
  try {
    if (journalDir) journalPath = safePath(root, `${journalDir}/journal.json`);
    for (const entry of entries) verifyCurrent(root, entry);
    if (journalDir) await mkdir(safePath(root, journalDir), { recursive: true });
    for (const entry of changes) {
      const content = currentContent(root, entry.path);
      snapshots.set(entry.path, content);
      if (journalDir && content !== null) {
        const backup = safePath(root, `${journalDir}/files/${entry.path}`);
        await mkdir(path.dirname(backup), {recursive:true});
        await writeFile(backup, content, {encoding:"utf8",flag:"wx"});
      }
    }
    await saveJournal();
    for (const entry of changes) {
      verifyCurrent(root, entry);
      const destination = safePath(root, entry.path);
      await mkdir(path.dirname(destination), { recursive: true });
      if (entry.oldHash === null) {
        const handle = await open(destination, "wx");
        attempted.push(entry.path);
        try { await handle.writeFile(entry.content, "utf8"); }
        finally { await handle.close(); }
      } else {
        const staging = safePath(root, `${entry.path}.${randomUUID()}.tmp`);
        try {
          await writeFile(staging, entry.content, {encoding:"utf8",flag:"wx"});
          verifyCurrent(root, entry);
          await rename(staging, destination);
          attempted.push(entry.path);
        } finally { await rm(staging, { force: true }); }
      }
      written.push(entry.path);
      await saveJournal();
    }
    record.status = "complete";
    await saveJournal();
    return { written, journalPath };
  } catch (error) {
    for (const name of [...attempted].reverse()) {
      try {
        const entry = changes.find(x => x.path === name);
        const now = currentContent(root, name);
        if (now === null || hash(now) !== entry.newHash) throw new Error("partial write or change by another writer; manual recovery required");
        const old = snapshots.get(name);
        if (old === null) await rm(safePath(root, name));
        else await writeFile(safePath(root, name), old, "utf8");
      } catch (rollbackError) { record.rollbackErrors.push(`${name}: ${rollbackError.message}`); }
    }
    record.status = record.rollbackErrors.length ? "rollback-incomplete" : "rolled-back";
    try { await saveJournal(); } catch { record.rollbackErrors.push("journal write failed"); }
    throw new ProjectError("WRITE_FAILED", `Write failed: ${error.message}; recovery: ${record.status}`, {attempted, written, journalPath, rollbackErrors:record.rollbackErrors});
  } finally { await rm(lockPath, { force: true }); }
}

function verifyCurrent(root, entry) {
  const current = currentContent(root, entry.path);
  if ((current === null ? null : hash(current)) !== entry.oldHash) throw new ProjectError("STALE_PLAN", `File changed since review: ${entry.path}`);
}
