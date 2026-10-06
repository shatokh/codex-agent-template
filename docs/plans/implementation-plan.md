# Active implementation plan

Updated: 2026-10-06. Current version: 0.2.0.

The user approved all nine points of [the upgrade proposal](upgrade-proposal-2026-10-06.md), plus grill-me for consequential disputed decisions. [ADR 0002](../decisions/0002-approved-reliability-and-skills.md) records the new scope. The original bootstrap analysis is preserved in [the archive](archive/implementation-plan-2026-08-04.md).

## Objective

Provide a portable, reviewable bootstrap CLI for Codex, Claude, and Codex+Claude. Prefer preview, preserve user changes, keep root instructions short, and generate useful guidance from bounded evidence. No additional agent adapters or LLM backend are required.

## Implemented upgrade

1. Scope/status documentation and ADR aligned with existing guarded update and manual advisor.
2. Strict per-command CLI options, command help, one-document JSON, structured error codes, and format-independent exit status. Init previews unless --apply is passed.
3. Review plans with hashes/content diffs; saved settings; user-file conflicts; reviewed legacy adoption; additive ignore rules; exclusive create/target lock; symlink/junction rejection; update backup/recovery journal and guarded rollback. Apply requires a current saved plan and approval record.
4. Bounded discovery with command source, confidence, cwd, inferred/found status, and unexecuted state. Focused root/workspace/CI evidence feeds confirmed commands into generation; Python manifest alone does not imply pytest.
5. Distinct light/task-first/spec-tdd rules, conditional pack links, no-code verification, and conservative/risk-based approval policies that preserve existing scope approval.
6. Runtime-specific skill locations, native local override documentation, manual advisor invocation policies, and opt-in grill-me/handoff/planner/reviewer skills. Repository-local grill-me is enabled for relevant automatic selection.
7. Versioned config schema and doctor findings for required artifacts, generated scalar frontmatter, local file references/imports, root size, unresolved variables, ignore semantics/fallback, and limited warnings.
8. Compact Windows/Linux CI for Node 24 plus Linux Node 22; private package allowlist and extracted-package smoke from another cwd; portable cookbook.
9. Small evaluation fixtures, baseline/treatment preview, opt-in runtime runner with limits, and documented independent grill-me forward test.

## Verification evidence and limits

Local commands:

```sh
node scripts/validate-project.mjs
node --test
node scripts/check-package.mjs
node scripts/eval-skills.mjs --scenario architecture
```

The implementation adds regression coverage for custom-file preservation, stale proposals, ignored CLI options, JSON exports, update idempotence, rollback, legacy adoption, evidence limits, generated references, runtime-specific skills, and Git ignore semantics. Package smoke verifies bundled hidden templates and CLI execution from an unrelated cwd.

Codex CLI 0.160.1 discovered the repository grill-me through app-server skills/list with enabled=true and zero discovery errors, without a model turn. A simulated independent dialogue tested questioning, evidence handling, and routing exclusions. Neither is proof of repeated-run behavioral reliability.

Remote CI execution, Claude Code sessions, and paid model evals are not claimed complete locally. CI and an opt-in evaluator are delivered; run them in the intended environment/account when available. The bundled Python quick validator lacked PyYAML locally; native Codex parsing and the project validator checked the new skill instead.

## Operational boundaries

- A saved plan checksum detects accidental tampering; it is not a signature or access-control boundary.
- Multi-file writes are not globally atomic. Backups/journals expose recovery state, and user edits made by another writer during an update may require manual recovery.
- Legacy/customized files require manual reconciliation; --adopt does not override conflicts.
- Unselected generated files are retained. Automatic cleanup/deletion and merge are not implemented.
- Discovery supports focused known paths and simple patterns. Complex CI/workspace configurations require review. Found commands are never executed by discovery.
- Doctor validates generated scalar frontmatter and references; it does not prove arbitrary prose semantics or absence of secrets.
- Native Codex overrides replace same-level AGENTS.md; documented private override policy must preserve necessary shared rules.

## Backlog requiring a new scope decision

- Other agent adapters.
- Path-scoped rule generation.
- Hooks, capture-mode advisor, session ledgers, incremental delta tracking.
- Automatic update/merge, managed artifact deletion, and richer external integrations.
- Plugin packaging, npm publication, and release automation.

No commits or remotes are created automatically. Verification remains adaptive to each generated project's actual checks.
