# ADR 0003: Technology-agnostic artifact core

Date: 2026-10-07. Status: accepted for the first implementation stage approved by the user.

## Decision

Add repo-discovery, bug-investigator, and verify-change to the existing four skills. Improve planner/reviewer/handoff boundaries and outcomes; preserve grill-me's invocation behavior. Add shared repo-scout/change-reviewer/change-verifier role definitions and native wrappers for Codex and Claude. Add compatibility/reliability/architecture packs and refine root rules without requiring a stack or excessive process.

Keep selection opt-in, defaults compact, and existing update conflict/hash/journal protections. Roles automatically require their workflow skills. The new optional roles config field remains compatible with existing schema-v1 metadata. Bump templates/package to 0.3.0, so old review plans must be regenerated against the changed templates.

## Boundaries

- A skill is a procedure; a role is a separate delegate with an explicit request contract and runtime-specific permissions.
- Installation does not authorize delegation, execution, publication, production access, or permission changes.
- Codex roles default to read-only. Claude scout/reviewer expose read/search tools; verifier additionally exposes shell tools under normal permissions and requires enforceable isolation for side effects. These defaults do not replace host security controls or guarantee safety against runtime overrides.
- Unsupported/unknown runtime capabilities must be reported; project doctor cannot prove native role loading or behavioral reliability. Native skill discovery and offline syntax checks are separate evidence.
- No universal language, source directory, package manager, architecture, test framework, or service is assumed. Non-code criteria can use walkthrough and review evidence.
- Deselected generated files remain available until separately disabled or removed. Removing a role selection is not revocation.

## Later work

Five specialized skills, docs-researcher, presets, and optional record templates remain later-stage items from the proposal. Existing backlog boundaries for hooks, session capture, automatic merge, plugin packaging, other runtime adapters, and publication remain in force. No new runtime dependencies or model-backed service are introduced.
