# Decision 0001: V1 Scope And Advisor Mode

Date: 2026-08-04

## Status

Accepted

## Context

`codex-agent-template` is intended to become a reusable bootstrap project for AI-agent infrastructure across multiple repositories and languages. The initial temptation is to support many agent adapters, hooks, and context capture workflows immediately, but that would increase implementation risk and make the first version harder to trust.

## Decision

V1 will focus on:

- `codex`;
- `claude`;
- `codex+claude`;
- `init-new`;
- `onboard-existing`;
- bounded discovery;
- dry-run and reviewable proposals before writes;
- short always-on rules;
- adaptive verification;
- local override ignore rules;
- rule quality validation.

V1 will not include:

- Gemini, Cursor, Copilot, Cline, Roo, or Windsurf adapters;
- hooks;
- capture-mode session logging;
- session artifact advisor ledger automation;
- update/merge automation for previously generated projects;
- plugin packaging.

`context-artifact-advisor` is planned as a v1.5/v2 manual-mode module only. It may analyze visible chat context and bounded repository evidence when explicitly invoked, then propose artifacts for review.

Capture mode, hook-based session ledgers, and automatic delta tracking are deferred to v3 or later.

## Consequences

The first working version should be simpler, easier to validate, and safer to run in existing repositories.

The project will still preserve a path toward more advanced advisor automation, but those features must not enter early scope by accident.

