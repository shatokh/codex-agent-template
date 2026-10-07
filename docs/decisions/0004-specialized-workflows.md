# ADR 0004: Specialized agnostic workflows and documentation research

Date: 2026-10-07. Status: accepted as the next implementation stage requested by the user after the 0.3 commit/push.

## Decision

Add contract-review, safe-refactor, migration-planner, docs-sync, and release-check as independently selectable skills. Add docs-researcher as an opt-in role with shared instructions and native Codex/Claude wrappers. Bump package/templates to 0.4.0; retain schema v1 and the existing reviewed update protections. Pending saved plans must be regenerated against the changed templates.

Use small self-contained instructions and optional Codex UI metadata without extra runtime dependencies, placeholder records, mandatory test commands, fixed models, or external providers. Install the five skills and Codex role in this repository so the new workflows are available locally. Default project generation remains empty of skills, roles, and packs.

Documentation researcher depends on repo-discovery only for relevant local version/usage evidence; research criteria remain in the role body. Claude allows Read/Grep/Glob/WebSearch/WebFetch with normal permission checks and no shell, edit, or mandatory MCP access. Codex retains its read-only filesystem default and uses only parent-authorized external tools. Unknown versions, conflicting sources, and unavailable access must remain explicit evidence gaps.

## Boundaries and verification

Contract review requires consumer evidence; refactoring preserves observable behavior; migration planning distinguishes loss, coexistence, cutover, and realistic recovery; documentation follows verified facts; release readiness applies to a specific candidate. These workflows do not authorize migration execution, publication, or delegation. Reuse existing authorization within its concrete scope rather than requiring repeat approval.

Generation, policy fields, reference links, selected dependencies, reviewed updates, custom-file conflicts, and packaging receive deterministic coverage. Native skill discovery without a model turn is separate from behavioral evaluation. Prepared scenarios remain unscored until opt-in model sessions are actually run. Doctor continues to report native role loading/effective policies as unverified; live Claude is not claimed tested.

Claude's documented tool allowlists support the research tool selection; actual availability depends on runtime version, parent tool pool, and permissions. See [official subagent documentation](https://code.claude.com/docs/en/sub-agents#available-tools) and [evidence](../evals/technology-agnostic-artifacts.md).

## Remaining scope

Presets and optional document-record templates are later-stage options. Hooks, session capture, automatic merge/deletion, plugin packaging, additional adapters, and release automation/publication remain outside this stage. Commit/push for these two implementation stages was explicitly requested by the user.
