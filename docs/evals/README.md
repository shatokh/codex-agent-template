# Evaluating agent instructions

The deterministic suite verifies CLI and artifact invariants. Agent evaluation checks decisions and routing; it cannot be replaced by matching wording or file presence.

## Prepared scenarios

[scenarios.json](scenarios.json) contains architecture, follow-up evidence, typo fix, already-approved choice, partial onboarding, dirty worktree, no-code verification, and handoff prompts with small observable rubrics.

Preview a baseline/treatment pair without invoking a model:

```sh
node scripts/eval-skills.mjs --scenario architecture
node scripts/eval-skills.mjs --scenario typo
```

Explicit real runs use a locally installed/authenticated runtime:

```sh
node scripts/eval-skills.mjs --run --runtime codex --scenario architecture --timeout 120
node scripts/eval-skills.mjs --run --runtime claude --scenario architecture-followup --timeout 120
```

These commands start two real sessions and can consume account quota or incur cost. Choose model/account intentionally; `--model` is optional. Output defaults to ignored `.local/evals/<timestamp>-<scenario>/`. Fixtures are isolated and prompts request conversational, read-only work. Codex uses read-only sandbox and ignores user config/rules; Claude disables tools. No session capture or hooks are installed. A timeout bounds wall time, not monetary spend.

The runner injects skill text explicitly for controlled comparison. It measures instruction influence, not automatic discovery. It records runtime version, requested model or runtime default, duration, limit status, transcripts, and a rubric that needs human scoring. Repeat runs to study variability before claiming improvement. Never supply real secrets in fixtures or publish raw traces without reviewing them.

## Current evidence

- [Independent grill-me forward test](grill-me-forward-test.md): simulated architecture dialogue and routing exclusions; no model API costs or live projects.
- Repository validator checks the local skill against its generation source and validates generated frontmatter.
- Native discovery passed on Codex CLI 0.160.1 through read-only app-server `skills/list`: grill-me enabled, zero parser/discovery errors, no model turn. This is separate from behavioral evaluation. See [the app-server documentation](https://learn.chatgpt.com/docs/app-server) for the protocol.
- Claude runtime behavior is not verified here when Claude Code is unavailable. Artifact paths/frontmatter and combined generation are covered by deterministic tests.
- CI is configured; remote Windows/Linux jobs are not claimed to have run locally.

## Review rubric

Score each must-pass criterion as passed, failed, or unobserved, with an example from the response. Track outcome, process, context size, unnecessary approvals, evidence quality, and user-edit preservation. Compare the same prompt/fixture/runtime/model between baseline and treatment. Do not equate a single successful dialogue with a correctness guarantee.
