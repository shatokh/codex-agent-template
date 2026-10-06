# Manual run cookbook

Run from the repository checkout with Node.js 22+. Commands below work in PowerShell and a POSIX shell. Replace quoted paths with the intended target.

## Verify the tool

```sh
node bin/codex-agent-template.mjs list --output json
node scripts/validate-project.mjs
node --test
node scripts/check-package.mjs
```

## New project

Preview:

```sh
node bin/codex-agent-template.mjs init-new --target .local/demo --agent codex+claude --workflow task-first --skill grill-me --pack security
```

After reviewing the preview, explicitly create:

```sh
node bin/codex-agent-template.mjs init-new --target .local/demo --agent codex+claude --workflow task-first --skill grill-me --pack security --apply
node bin/codex-agent-template.mjs validate --target .local/demo
```

Init blocks all existing generated files. It does not merge with existing AGENTS.md or .gitignore.

For non-code work add --project-kind docs, game-design, or no-code. For manual advisor add --context-advisor. Starter skills are individually opt-in with repeated --skill. Conservative approval is the default; risk-based is an explicit choice.

## Existing project proposal

```sh
node bin/codex-agent-template.mjs onboard-existing --target ../existing-project --workflow task-first --skill grill-me --dry-run --proposal-dir .local/proposals --output json
```

Review discovery evidence, suggestions, conflicts, and proposed artifacts. Commands are not executed. Onboarding writes no target infrastructure. JSON contains the exported proposal path. Existing exports are never replaced.

For presence plus content validation, repeat the selected parameters with --check. Missing metadata/artifacts or invalid content cause exit code 1. Configuration/usage errors cause code 2.

## Update generated project

```sh
node bin/codex-agent-template.mjs update-existing --target .local/demo --workflow spec-tdd --plan-file .local/demo-update.json --proposal-file .local/demo-update.md
```

Review both exports, including content diffs and per-file status. Conflicts require manual resolution and a fresh plan. The tool inherits stored options when flags are absent.

```sh
node bin/codex-agent-template.mjs update-existing --target .local/demo --apply --approval "reviewed saved plan" --plan-file .local/demo-update.json
node bin/codex-agent-template.mjs validate --target .local/demo
```

Apply uses the options saved in the proposal. Explicit flags that change them invalidate the plan. Files changed since review also invalidate it. Never use an old proposal to approve a new snapshot.

## Adopt legacy generation

A project without a manifest requires reviewed adoption. Add --adopt during preview; apply that saved plan. Only matching artifacts and reviewed ignore extensions can be adopted. Custom instructions remain conflicts; reconcile them manually without dropping project-specific rules. Use a new export filename after each review.

## Recovery

Update retains originals in .agent-template-backups/<id>/files and records progress in journal.json. On failure, review the reported written paths, rollback state, and journal. Rollback avoids replacing files changed by another writer. Manual recovery must compare the current file, backup, and intended change. Do not blindly restore over new user edits. Directory creation may remain after a failed operation.

## Paths with spaces

PowerShell:

```powershell
node bin/codex-agent-template.mjs onboard-existing --target 'C:\Projects\Existing Project' --output json
```

POSIX:

```sh
node bin/codex-agent-template.mjs onboard-existing --target '/home/me/Existing Project' --output json
```

## Grill Me

In this repository, invoke $grill-me in Codex. Generated Claude Code projects use /grill-me. Example: "Challenge our choice of event sourcing: demand evidence, compare the simplest alternative, and identify a failure condition."

The skill can select itself for disputed consequential decisions with unresolved evidence. It does not reopen an approved reversible choice without new facts. It asks up to three questions per round and waits for answers before judging the unresolved decision.

## Evaluation

```sh
node scripts/eval-skills.mjs --scenario architecture
```

Default evaluation only previews prompts/rubrics. See ../evals/README.md for explicitly running model sessions, account/resource considerations, and limits of the evidence.
