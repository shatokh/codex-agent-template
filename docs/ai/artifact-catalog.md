# Technology-agnostic artifact catalog

Version 0.3 implements the approved first stage: seven core skills, three opt-in roles, and three additional conditional packs. Workflows use actual repository evidence instead of assuming a language, toolchain, architecture, source directory, or executable test suite.

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

`review-agent` retains its existing name for compatibility. It is a skill, while `change-reviewer` is a separate delegate that uses it.

Skills are opt-in in generated projects through repeated `--skill`. The repository itself includes the seven skills in `.agents/skills`; Codex can choose them normally, and `$<skill-name>` invokes them explicitly. Generated Claude skills use `.claude/skills` and `/skill-name`. Instructions and optional Codex UI metadata share the same generator source.

## Roles

| Role | Required workflow | Codex | Claude |
| --- | --- | --- | --- |
| repo-scout | repo-discovery | read-only sandbox default | Read/Grep/Glob only |
| change-reviewer | review-agent | read-only sandbox default | Read/Grep/Glob only |
| change-verifier | verify-change | read-only sandbox default; blocked checks return a plan | Read/Grep/Glob and available shell tools under normal permission checks; side effects require supplied enforceable isolation |

Use repeated `--role` to select roles. Generation automatically includes their required skills and records the resolved selection in configuration and review plans. Role selection is independent of `--agent`, which continues to select Codex, Claude, or both. Runtime-specific role files come from shared Markdown bodies and a catalog; models and services are not pinned.

Role installation is not permission to spawn delegates. The parent must explicitly supply the task, revision/diff, criteria, constraints, permitted actions, and environment. The primary agent owns edits and acceptance. Shell tools and written instructions alone cannot enforce isolation: see generated `docs/ai/delegation.md`. Default sandbox settings can be superseded by live runtime policies.

Native role discovery remains dependent on the installed runtime. Doctor validates only our generated TOML/YAML subset and reports `RUNTIME_UNVERIFIED`; arbitrary custom agent configuration requires native validation. Use corresponding skills in the main agent if role support is unknown or unavailable. This repository includes the three Codex role definitions for use after delegation is explicitly authorized.

## Conditional packs

Existing: privacy, external-services, security, test-harness, docs.

New: compatibility for changing consumer contracts/formats; reliability for state/resources/failure recovery; architecture for component boundaries and dependencies. Root instructions link only selected packs with a trigger. They do not require loading every document or impose an architecture style.

## Examples

```sh
node bin/codex-agent-template.mjs list --output json
node bin/codex-agent-template.mjs init-new --target .local/example --agent codex+claude --skill bug-investigator --role repo-scout --role change-reviewer --role change-verifier --pack compatibility --pack reliability --pack architecture
# Review preview; repeat the command with --apply to create files.
node bin/codex-agent-template.mjs update-existing --target ../project --role repo-scout --role change-verifier --plan-file .local/role-review.json
node bin/codex-agent-template.mjs update-existing --target ../project --apply --approval "reviewed" --plan-file .local/role-review.json
```

Selected arrays replace their previous selection when supplied; omitted settings are inherited by update. Deselected files are retained, including native role definitions that a runtime can still discover. Removing a role from config does not revoke that file's availability or permissions; disable/delete retained artifacts only through a separately reviewed action. Dependencies become saved skills and remain selected until explicitly removed. Custom edits conflict rather than being replaced automatically.

The roles property is optional in schema v1 so version 0.2 configurations remain readable. New generation writes it explicitly; changing version/configuration still requires reviewed apply.

## Next stages

The five specialized skills, docs-researcher role, presets, and document-record templates from the proposal remain later-stage options. Concrete task/decision/investigation records use existing project formats and are created only when requested or useful within authorized work. Default generation still creates no starter skill, role, or pack.

See [scope decision](../decisions/0003-technology-agnostic-artifacts.md), [proposal](../plans/technology-agnostic-artifacts-proposal.md), and [evaluation evidence](../evals/technology-agnostic-artifacts.md).
