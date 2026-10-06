# Decision 0002: Approved reliability and skills upgrade

Date: 2026-10-06. Status: Accepted by the user in the repository review conversation.

## Context

The user approved all nine points of [the upgrade proposal](../plans/upgrade-proposal-2026-10-06.md) and requested grill-me for contested decisions and architectural forks. Existing update and manual-advisor implementations had outgrown parts of ADR 0001 without corresponding scope documentation.

## Decision

Promote guarded update hardening and the manual context advisor into the current 0.2 scope. Add opt-in starter skills, including grill-me, and a repository-local grill-me skill with automatic selection for consequential uncertain decisions. Retain Codex, Claude, and Codex+Claude as the only agent modes.

Use previews by default for CLI initialization. Apply requires explicit intent; update additionally requires a reviewed saved plan, approval record, matching current hashes, and absence of user-file conflicts. Free-form approval text alone no longer authorizes arbitrary replacements. Preserve existing configuration unless a setting is explicitly overridden.

Retain a conservative approval default; allow an explicit risk-based policy. Approval is reused within its agreed scope. Workflow-specific rules and pack references guide agents without requiring all documents for routine changes.

Use a versioned configuration schema and ownership manifest. Legacy adoption is review-driven and accepts matching files, not custom-content replacement. Preserve deselected artifacts and custom ignore entries. Backup/journal protection is per-operation recovery, not a claim of globally atomic multi-file writes.

Add focused discovery evidence, stronger validation, a small Windows/Linux CI matrix, local package checks, and opt-in agent evaluation. No third-party runtime dependencies or LLM service are required for the CLI.

## Scope boundary

Hooks, session capture/ledger automation, automatic merge, new adapters, path-scoped generation, plugin packaging, publishing, commits, and remotes are not promoted by this decision. Real paid evaluation runs still require explicit resource authorization; the default evaluation command only previews.

## Consequences

Version 0.2 changes initialization semantics (`--apply` required) and update semantics (saved plan required). Previously generated customized files may need manual reconciliation before adoption. Unsupported complex skill YAML and CI/workspace expressions are reported or left for manual review rather than guessed.

ADR 0001 remains historical; this decision supersedes its deferral of guarded update/manual advisor for the explicitly approved scope.
