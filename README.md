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
node bin/codex-agent-template.mjs init-new --target C:\tmp\sample-project --agent codex+claude --workflow light
node bin/codex-agent-template.mjs validate --target C:\tmp\sample-project
```

`init-new` never overwrites existing generated files by default.

Generated workflow artifacts:

- `light`: root agent instructions, `.agent-template.json`, and `docs/ai/*`.
- `task-first`: `light` plus `docs/tasks/TEMPLATE.md`.
- `spec-tdd`: `light` plus `docs/specs/TEMPLATE.md` and `docs/ai-change-records/TEMPLATE.md`.

See the implementation plan:

- [Implementation Plan](docs/plans/implementation-plan.md)
- [Context Artifact Advisor Design](docs/plans/context-artifact-advisor.md)
- [Decision 0001: V1 Scope And Advisor Mode](docs/decisions/0001-v1-scope-and-advisor-mode.md)
