# codex-agent-template

Reviewable AI-agent bootstrap for Codex, Claude, and Codex+Claude. Version 0.3 adds technology-agnostic workflows, opt-in delegated roles, and conditional compatibility/reliability/architecture guidance to the guarded bootstrap/update CLI.

Requires Node.js 22+ and no third-party runtime packages. Windows and Linux CI cover Node 24; a Linux job also covers Node 22. The package remains private.

## Quick start

Run from this checkout. Commands use portable relative paths; choose the target intentionally.

```sh
node bin/codex-agent-template.mjs list
node bin/codex-agent-template.mjs init-new --target .local/example --agent codex+claude --workflow task-first --skill grill-me --pack privacy
node bin/codex-agent-template.mjs init-new --target .local/example --agent codex+claude --workflow task-first --skill grill-me --pack privacy --apply
node bin/codex-agent-template.mjs validate --target .local/example --output json
```

**Breaking change from 0.1:** `init-new` now previews by default. Add `--apply` to create files. It never replaces existing files. The library `initNew` also defaults to preview; callers must pass `dryRun: false` to write.

## Existing repositories

```sh
node bin/codex-agent-template.mjs onboard-existing --target ../existing-project --dry-run --proposal-dir .local/proposals --output json
node bin/codex-agent-template.mjs onboard-existing --target ../existing-project --check
```

Onboarding never writes target infrastructure. It reports missing artifacts, metadata mismatches, content validity, evidence, confidence, and verification suggestions. An explicitly requested proposal export writes only that export. Existing artifacts require review; `init-new` is not a merge command.

## Guarded update

Update inherits saved agent/workflow/project-kind/packs/skills/roles/policy. Flags override only explicitly selected settings.

```sh
node bin/codex-agent-template.mjs update-existing --target .local/example --workflow spec-tdd --plan-file .local/review.json --proposal-file .local/review.md
# Review both files and resolve any conflicts before applying:
node bin/codex-agent-template.mjs update-existing --target .local/example --apply --approval "reviewed" --plan-file .local/review.json
```

JSON plans contain the selected options, per-file hashes, proposed content, and unified diffs. Apply rechecks the saved plan against files and templates. A checksum detects accidental plan changes; it is not a digital signature or an authorization system. Reapplying the same successfully applied plan is a no-op when its hashes and settings still match.

Generated files have an ownership manifest. Edited or unmanaged files become conflicts and require manual reconciliation. `.gitignore` is extended with reviewed rules while preserving user patterns; rule ordering and exceptions matter. Deselected artifacts are retained rather than deleted.

For a matching legacy project without a manifest, preview with `--adopt` and save that plan. Adoption accepts matching artifacts and reviewed ignore extensions; it does not permit replacement of custom instructions. Repair genuinely outdated/custom files manually before adopting.

Writes reject symlinks/junctions and paths outside the target, use an exclusive target lock, and retain update backups plus a recovery journal under `.agent-template-backups/`. Earlier writes are rolled back after a failure when their content still matches this writer's output. Partial/unrecoverable states are reported for manual recovery. Multi-file updates are not globally atomic; another editor that ignores the lock can still race the write. Preview makes no target writes.

Proposal/plan exports use exclusive creation, reject infrastructure paths, and do not replace an existing export. Use a new name for each review.

## Configuration

- Agents: `codex`, `claude`, `codex+claude`.
- Workflows: `light`, `task-first`, `spec-tdd`.
- Project kinds: `code`, `docs`, `game-design`, `no-code` (`boardgame` remains a legacy alias).
- Packs: `privacy`, `external-services`, `security`, `test-harness`, `docs`, `compatibility`, `reliability`, `architecture`; repeat `--pack`.
- Starter skills: `grill-me`, `clean-chat-handoff`, `feature-planner`, `review-agent`, `repo-discovery`, `bug-investigator`, `verify-change`; repeat `--skill`.
- Roles: `repo-scout`, `change-reviewer`, `change-verifier`; repeat `--role`. Required workflow skills are included automatically. `--agent` still selects the runtime.
- `--context-advisor`: opt-in manual advisor; `--no-context-advisor` disables its generation in future plans.
- `--approval-policy conservative|risk-based`: conservative is the default; both preserve already granted approval within its scope.

Root rules distinguish workflows and link selected packs/skills with usage conditions. No-code verification uses review, walkthrough, and playtest evidence. Software TDD is applied only where appropriate.

Discovery reads at most 32 files, 32 KiB per file, 192 KiB in total, with bounded directory enumeration. It checks known root manifests, focused workspace packages, README headings, and simple CI command evidence. It does not execute discovered commands or read `.env` contents. CI evidence and inferred commands require human confirmation. Complex workspace patterns or CI scripts may need manual discovery.

The versioned config format is documented in [config.schema.json](schemas/config.schema.json). The optional `roles` field preserves compatibility with version 0.2/schema-v1 metadata. Legacy configurations are checked with compatibility warnings; no automatic migration is performed.

## Technology-agnostic workflows and roles

The [artifact catalog](docs/ai/artifact-catalog.md) explains seven core skills, three roles, conditional packs, and their evidence/permission boundaries. No programming language, source layout, test framework, architecture style, or external service is mandatory. Default init generates no starter skills, roles, or packs.

```sh
node bin/codex-agent-template.mjs init-new --target .local/roles-example --agent codex+claude --role repo-scout --role change-reviewer --role change-verifier --skill bug-investigator --pack compatibility --pack reliability --pack architecture
```

Review preview and repeat with `--apply` to create. Codex roles use `.codex/agents/*.toml`; Claude uses `.claude/agents/*.md`. Both come from shared role bodies. Generation does not enable delegation automatically or change the parent model/permissions. Verifier returns a plan when safe execution is unavailable. Generated `docs/ai/delegation.md` explains runtime-specific limits.

Selected arrays replace the previous selection; omitted update settings are preserved. Deselected artifacts remain on disk, and native runtimes may still discover them. Deselecting a role does not revoke it: disable/remove retained files only through separate review. Existing user-edited role files become update conflicts.

## Grill Me

This repository includes [grill-me](.agents/skills/grill-me/SKILL.md). In Codex use `$grill-me`; in Claude Code, generated skills support `/grill-me`. Both may select it automatically for a contested consequential choice with material uncertainty.

It asks one to three pointed questions per round, challenges assumptions with evidence and failure scenarios, and finishes with **defensible**, **test first**, or **reconsider**. It respects legitimate preferences, stops when an experiment is needed, and does not reopen routine or settled choices without new evidence.

To include it in another project, pass `--skill grill-me`. Codex skills go to `.agents/skills`, Claude skills to `.claude/skills`, and combined mode emits both from the same source. Combined instructions retain the compatible `CLAUDE.md` import of `@AGENTS.md`. Personal Codex overrides use `AGENTS.override.md`; that file replaces the base instructions at its level. See generated `docs/ai/local-overrides.md` before using one.

## Validation and evaluation

```sh
node scripts/validate-project.mjs
node --test
node scripts/check-package.mjs
node scripts/eval-skills.mjs --scenario architecture
node scripts/eval-skills.mjs --skill bug-investigator --scenario bug-unreproduced
```

`validate` checks config, required files, generated scalar skill frontmatter, generated role fields/permissions/workflow references, internal file references, root size, unresolved template variables, and ignore rules. Findings include severity/code/path/fix. Selected roles get `RUNTIME_UNVERIFIED`: doctor cannot prove native loading or effective delegate permissions. Custom native formats need runtime validation. Secret-like patterns and excessive context are warnings, not a comprehensive semantic or security audit. Git ignore semantics are tested at the target Git root; otherwise the report explicitly marks the fallback. `onboard-existing --check` requires both presence/config completeness and content validity.

`--output json` emits one JSON document, including export paths and structured failures. Exit codes: **0** success, **1** validation/conflict/write failure, **2** invalid usage. Command-specific help: `node bin/codex-agent-template.mjs update-existing --help`.

[Evaluation guidance](docs/evals/README.md) separates deterministic tests, independent conversational evaluation, native skill discovery, and opt-in model sessions. Preview does not contact a model; `--run` explicitly starts real sessions using the selected runtime/account.

## Project documents

- [Active implementation plan](docs/plans/implementation-plan.md)
- [Approved upgrade proposal](docs/plans/upgrade-proposal-2026-10-06.md)
- [Scope decision 0002](docs/decisions/0002-approved-reliability-and-skills.md)
- [Artifact scope decision 0003](docs/decisions/0003-technology-agnostic-artifacts.md)
- [Technology-agnostic artifact catalog](docs/ai/artifact-catalog.md)
- [Portable cookbook](docs/cookbooks/manual-run-cookbook.md)
- [Research](docs/research/internet-best-practices.md)

Hooks, session capture/ledger automation, automatic merge, additional agent adapters, plugin packaging, and publication remain outside this implementation.
