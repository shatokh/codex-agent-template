# Active implementation plan

Updated: 2026-10-07. Current version: 0.5.0.

The user approved all nine points of [the upgrade proposal](upgrade-proposal-2026-10-06.md), plus grill-me for consequential disputed decisions. [ADR 0002](../decisions/0002-approved-reliability-and-skills.md) records the new scope. The original bootstrap analysis is preserved in [the archive](archive/implementation-plan-2026-08-04.md).

The user subsequently approved the first stage of [technology-agnostic artifacts](technology-agnostic-artifacts-proposal.md). [ADR 0003](../decisions/0003-technology-agnostic-artifacts.md) records its boundaries. See [the catalog](../ai/artifact-catalog.md) for selection and contracts.

The user then requested commit/push and the next stage. [ADR 0004](../decisions/0004-specialized-workflows.md) records the specialized workflows and documentation researcher. The continued stage adds presets and optional record templates; [ADR 0005](../decisions/0005-presets-and-record-templates.md) records its selection and compatibility contracts.

## Implemented selection/record stage (0.5)

1. Added essential/review/maintenance/architecture presets as skill-only shortcuts. Explicit skills extend a preset; roles and other settings remain independent. Config/plans save resolved lists, not preset names. Update replaces only the base skills when a preset is supplied and preserves omitted independent settings.
2. Added explicitly selected project-context/investigation/decision/migration/verification-result reusable forms with a conditional guide/root link. Defaults remain empty and generation creates no completed records. Existing project formats remain preferred.
3. Extended schema-v1 optional recordTemplates, strict CLI/list/help, init/onboarding/update results and recommendations, doctor/reference coverage, and extracted package smoke. Custom edits conflict, deselection retains files, and old metadata upgrades only through reviewed apply.
4. Added focused regression fixtures for selection boundaries, preview/apply/replay, stale plans, existing custom forms, missing links, and legacy configuration. No native role format, installed skill body, runtime dependency, or permissions changed.

Current local checks: 79 tests, project validator, and extracted-package smoke (76 bundled files). Review/evidence limits remain recorded in [verification evidence](../evals/technology-agnostic-artifacts.md). Remote CI and new model sessions are not claimed complete.

## Implemented specialized stage (0.4)

1. Added contract-review, safe-refactor, migration-planner, docs-sync, and release-check with focused triggers, evidence-based outcomes, scope boundaries, and Codex UI metadata. All twelve skills are installed in this repository; generated projects still select them explicitly.
2. Added docs-researcher with shared instructions and Codex/Claude wrappers. It uses repo-discovery to find local version/usage evidence, primary-source citations for research, and explicit access/version limitations. Claude allows local read/search plus WebSearch/WebFetch; Codex retains read-only filesystem defaults. Neither grants external access or editing/execution authority.
3. Extended schema/CLI catalogs, package smoke, reviewed update/onboarding coverage, protected local artifacts, and unscored behavioral fixtures. Existing conflict protection, dependency resolution, and empty defaults are preserved.
4. Bumped package/templates to 0.4.0 without a new schema version or runtime dependency. Recreate pending review plans against the current templates before apply.

## Implemented artifact stage (0.3)

1. Added repo-discovery, bug-investigator, and verify-change; refined planner/reviewer/handoff triggers, outcomes, and stopping conditions. The repository includes all seven core skills.
2. Added shared repo-scout, change-reviewer, and change-verifier bodies with native Codex/Claude wrappers, workflow dependencies, and separate --role selection. The repository includes the three Codex definitions. Installation does not authorize delegation.
3. Added compatibility/reliability/architecture packs; refined short root rules for evidence, commands, compatibility, untrusted content, and proportional verification.
4. Integrated roles with optional schema-v1 metadata, CLI/list/onboarding, role/reference/policy diagnostics, saved plans, and existing conflict/hash/recovery protections. Default selection remains empty; deselected files remain available until separately removed/disabled.
5. Added application/CLI/library/docs/no-code generation fixtures across all three modes, package smoke for roles, and additional behavioral scenarios selectable through eval --skill. Real model evals and native delegate execution are not claimed complete.

The 0.3 stage passed 66 tests and discovered seven core skills. The 0.4 stage passed 71 tests, project validator, extracted-package smoke (69 package files), independent TOML parsing of four roles, and native Codex 0.160.1 discovery of all twelve skills with zero errors. See [verification evidence](../evals/technology-agnostic-artifacts.md); native delegate loading/effective policies and live Claude behavior remain unverified.

## Objective

Provide a portable, reviewable bootstrap CLI for Codex, Claude, and Codex+Claude. Prefer preview, preserve user changes, keep root instructions short, and generate useful guidance from bounded evidence. No additional agent adapters or LLM backend are required.

## Implemented reliability upgrade (0.2)

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
