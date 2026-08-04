# Agent Instructions

## Project Summary

`codex-agent-template` is a Codex-first bootstrap tool for creating reviewable AI-agent instructions, skills, docs templates, and validation workflows in new or existing repositories.

The v1 scope is limited to Codex, Claude, and Codex+Claude modes.

## Working Rules

- Keep root agent instructions short, concrete, and under roughly 150-200 lines.
- Put always-on rules in `AGENTS.md` or `CLAUDE.md`.
- Put long procedures in `docs/`, repeatable workflows in skills, and deterministic checks in scripts or future hooks.
- Do not add adapters for Gemini, Cursor, Copilot, Cline, Roo, or Windsurf in v1 unless the plan is explicitly amended.
- Do not implement hooks, session artifact advisor, or update/merge automation until they are promoted from backlog.
- Do not overwrite generated target-project files by default; new CLI behavior must prefer dry-run and reviewable proposals.
- Keep discovery bounded and avoid loading entire repositories when focused evidence is enough.
- Keep verification adaptive; simple projects should not receive heavy test matrices.
- Do not commit automatically. Ask before creating commits or remotes.

## Current Plan

Use [docs/plans/implementation-plan.md](docs/plans/implementation-plan.md) as the active implementation plan.

## Verification

Current lightweight validation:

```powershell
node scripts/validate-project.mjs
```

