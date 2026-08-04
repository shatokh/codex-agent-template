# codex-agent-template

Portable bootstrap templates for Codex-first and Codex+Claude project rules.

This project is intended to generate reviewable AI-agent infrastructure for:

- new projects that are just starting;
- existing repositories with missing or weak AI-agent guidance.

The v1 target is deliberately narrow:

- Codex-only mode;
- Claude-only mode;
- Codex+Claude mode;
- short always-on rules;
- discovery before writing;
- no blind overwrites;
- adaptive verification guidance.

## Current CLI

```powershell
node bin/codex-agent-template.mjs list
node bin/codex-agent-template.mjs init-new --target C:\tmp\sample-project --agent codex+claude --workflow light --dry-run
node bin/codex-agent-template.mjs init-new --target C:\tmp\sample-project --agent codex+claude --workflow light --pack privacy --pack security --context-advisor
node bin/codex-agent-template.mjs init-new --target C:\tmp\no-code-project --agent codex --workflow task-first --project-kind no-code --pack test-harness --context-advisor
node bin/codex-agent-template.mjs onboard-existing --target C:\tmp\existing-project --agent codex --workflow task-first --pack test-harness --context-advisor --dry-run
node bin/codex-agent-template.mjs onboard-existing --target C:\tmp\existing-project --agent codex --workflow task-first --check
node bin/codex-agent-template.mjs onboard-existing --target C:\tmp\existing-project --agent codex --workflow task-first --dry-run --proposal-file C:\tmp\existing-project-proposal.md
node bin/codex-agent-template.mjs onboard-existing --target C:\tmp\existing-project --agent codex --workflow task-first --dry-run --proposal-dir .local\proposals
node bin/codex-agent-template.mjs update-existing --target C:\tmp\existing-project --agent codex --workflow task-first --project-kind no-code --pack test-harness --context-advisor --proposal-dir .local\proposals
node bin/codex-agent-template.mjs validate --target C:\tmp\sample-project
node bin/codex-agent-template.mjs list --output json
```

`init-new` never overwrites existing generated files by default.
`onboard-existing` currently prints a bounded discovery proposal and writes nothing.
`onboard-existing --check` exits non-zero when the selected agent/workflow infrastructure is incomplete.
`update-existing` compares existing generated files with current templates and writes no target files.
`--proposal-file` writes the proposal markdown only when explicitly requested.
`--proposal-dir` writes the proposal under `<dir>\<project-name>\...-onboarding-proposal.md`; `.local/` is gitignored and recommended for local review archives.
Use `--project-kind code|docs|game-design|no-code` to keep generated guidance and verification aligned with non-code repositories.
Use `--output json` for machine-readable output from `list`, `init-new`, `onboard-existing`, and `validate`.
Discovery currently checks common root config files, existing AI files, and package scripts.
It reports detected project types, package manager, commands, and suggested verification order.
It suggests a project kind when non-code repository evidence is present.
It also detects existing manual or mature session advisor artifacts so a generic context advisor is not proposed blindly.
`onboard-existing` also includes a copy-ready verification draft in text, JSON, and markdown proposal output.

Generated workflow artifacts:

- `light`: root agent instructions, `.agent-template.json`, and `docs/ai/*`.
- all workflows include a `.gitignore` with local AI override and `.env` entries.
- `task-first`: `light` plus `docs/tasks/TEMPLATE.md`.
- `spec-tdd`: `light` plus `docs/specs/TEMPLATE.md` and `docs/ai-change-records/TEMPLATE.md`.
- optional packs: `privacy`, `external-services`, `security`, `test-harness`, `docs`.
- optional manual context advisor: `.agents/skills/context-artifact-advisor/` plus `docs/ai/advisor/`.

See the implementation plan:

- [Implementation Plan](docs/plans/implementation-plan.md)
- [Manual Run Cookbook](docs/cookbooks/manual-run-cookbook.md)
- [Context Artifact Advisor Design](docs/plans/context-artifact-advisor.md)
- [Decision 0001: V1 Scope And Advisor Mode](docs/decisions/0001-v1-scope-and-advisor-mode.md)
