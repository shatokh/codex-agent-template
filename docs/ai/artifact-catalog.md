# Technology-agnostic artifact catalog

Version 0.5 includes twelve skills, four opt-in roles, eight conditional packs, four skill presets, and five selectable record templates. Workflows use actual repository evidence instead of assuming a language, toolchain, architecture, source directory, or executable test suite.

## Skills

| Name | Trigger | Result |
| --- | --- | --- |
| repo-discovery | Ownership, behavior path, or project commands are unclear | Focused map with sources, cwd/prerequisites, and unknowns; no project-code execution |
| feature-planner | A feature has unresolved scope or cross-component consequences | Observable behavior, boundaries, acceptance criteria, steps, and verification |
| grill-me | A consequential choice remains materially contested | Evidence-focused questions, alternatives, verdict, and next experiment |
| bug-investigator | A failure or regression needs investigation | Reproduction, competing hypotheses, supported cause or uncertainty, and scoped correction |
| verify-change | A change needs concrete acceptance evidence | Criteria mapped to checks, actual actions, results, and unproven gaps |
| review-agent | A supplied change needs review | Findings with trigger, location, consequence, evidence, and verification limits |
| clean-chat-handoff | Unfinished work moves to another conversation or owner | Goal, constraints/approvals, revision/state, checks, blockers, next action |
| contract-review | An interface or shared format changes | Before/after contract, affected consumers, compatibility evidence/gaps, focused checks |
| safe-refactor | Structure must change with behavior preserved | Reviewable restructuring, observable invariants, before/after evidence, remaining risks |
| migration-planner | Versions/formats/systems must transition | Stages, coexistence, cutover/stop criteria, recovery limits; no migration execution |
| docs-sync | Documentation/examples are affected by a concrete change | Focused updates grounded in verified behavior, link/example checks and limits |
| release-check | A specific candidate needs release readiness assessment | Criteria tied to candidate evidence, compatibility/recovery gaps, readiness verdict |

`review-agent` retains its existing name for compatibility. It is a skill, while `change-reviewer` is a separate delegate that uses it.

Skills are opt-in in generated projects through repeated `--skill`. The repository itself includes all twelve skills in `.agents/skills`; Codex can choose them normally, and `$<skill-name>` invokes them explicitly. Generated Claude skills use `.claude/skills` and `/skill-name`. Instructions and optional Codex UI metadata share the same generator source.

Specialized skills do not load one another automatically. Contract review assesses consumers; a migration plan addresses an actual transition; refactoring preserves behavior; docs-sync follows a concrete change; release-check evaluates a candidate. Select the workflows the task needs. A migration plan is not permission to execute it, and readiness is not publication authorization. Reuse any existing authorization for the same scope, candidate, and target.

## Roles

| Role | Required workflow | Codex | Claude |
| --- | --- | --- | --- |
| repo-scout | repo-discovery | read-only sandbox default | Read/Grep/Glob only |
| change-reviewer | review-agent | read-only sandbox default | Read/Grep/Glob only |
| change-verifier | verify-change | read-only sandbox default; blocked checks return a plan | Read/Grep/Glob and available shell tools under normal permission checks; side effects require supplied enforceable isolation |
| docs-researcher | repo-discovery for local version/usage evidence | read-only sandbox default; external tools/network depend on the parent | Read/Grep/Glob/WebSearch/WebFetch under normal permissions; no execution/edit tools |

Use repeated `--role` to select roles. Generation automatically includes their required skills and records the resolved selection in configuration and review plans. Role selection is independent of `--agent`, which continues to select Codex, Claude, or both. Runtime-specific role files come from shared Markdown bodies and a catalog; models and services are not pinned.

Role installation is not permission to spawn delegates. The parent must explicitly supply the task, revision/diff, criteria, constraints, permitted actions, and environment. The primary agent owns edits and acceptance. Shell tools and written instructions alone cannot enforce isolation: see generated `docs/ai/delegation.md`. Default sandbox settings can be superseded by live runtime policies.

Native role discovery remains dependent on the installed runtime. Doctor validates only our generated TOML/YAML subset and reports `RUNTIME_UNVERIFIED`; arbitrary custom agent configuration requires native validation. Use the relevant workflow/role instructions in the main agent if role support is unknown or unavailable. This repository includes four Codex role definitions for use after delegation is explicitly authorized.

Documentation researcher returns primary-source citations, version/date applicability, inference boundaries, and missing evidence. It does not upload private project content in searches, run examples, install tools, or require a provider/MCP account. Unknown installed versions require conditional conclusions; absent web access requires an explicit limitation.

## Conditional packs

Existing: privacy, external-services, security, test-harness, docs.

New: compatibility for changing consumer contracts/formats; reliability for state/resources/failure recovery; architecture for component boundaries and dependencies. Root instructions link only selected packs with a trigger. They do not require loading every document or impose an architecture style.

## Examples

```sh
node bin/codex-agent-template.mjs list --output json
node bin/codex-agent-template.mjs init-new --target .local/example --agent codex+claude --skill bug-investigator --role repo-scout --role change-reviewer --role change-verifier --pack compatibility --pack reliability --pack architecture
node bin/codex-agent-template.mjs init-new --target .local/maintenance --agent codex+claude --skill safe-refactor --skill contract-review --skill docs-sync --role docs-researcher
# Review preview; repeat the command with --apply to create files.
node bin/codex-agent-template.mjs update-existing --target ../project --role repo-scout --role change-verifier --plan-file .local/role-review.json
node bin/codex-agent-template.mjs update-existing --target ../project --apply --approval "reviewed" --plan-file .local/role-review.json
```

Selected arrays replace their previous selection when supplied; omitted settings are inherited by update. Deselected files are retained, including native role definitions that a runtime can still discover. Removing a role from config does not revoke that file's availability or permissions; disable/delete retained artifacts only through a separately reviewed action. Dependencies become saved skills and remain selected until explicitly removed. Custom edits conflict rather than being replaced automatically.

The roles property is optional in schema v1 so version 0.2 configurations remain readable. New generation writes it explicitly; changing version/configuration still requires reviewed apply.

## Presets and records

Select one `--preset essential|review|maintenance|architecture` to expand a skill set; individual `--skill` flags extend it. Presets never select roles, packs, record templates, a workflow, or permissions. Update replaces the base skill selection while inheriting unrelated omitted settings and resolving role dependencies. Plans/config store actual skills, not preset names. See [selection details](presets-and-records.md).

Select reusable `project-context`, `investigation`, `decision`, `migration`, and `verification-result` forms through repeated `--record-template`. Their conditional guide links only selected forms. Concrete records use existing project formats and are created only when requested or useful within authorized work. Default generation still creates no starter skill, role, pack, or record template. Deselected forms remain on disk and custom edits become update conflicts.

See [core scope decision](../decisions/0003-technology-agnostic-artifacts.md), [specialized scope decision](../decisions/0004-specialized-workflows.md), [preset/record decision](../decisions/0005-presets-and-record-templates.md), [proposal](../plans/technology-agnostic-artifacts-proposal.md), and [evaluation evidence](../evals/technology-agnostic-artifacts.md).
