# Presets and Record Templates

Version 0.5 adds input shortcuts for choosing skills and opt-in reusable record forms. These features use the existing preview, ownership, conflict, saved-plan, and recovery machinery. They do not change runtime permissions or enable delegation.

## Skill presets

| Preset | Expanded skills |
| --- | --- |
| essential | repo-discovery, feature-planner, grill-me, bug-investigator, verify-change, review-agent, clean-chat-handoff |
| review | review-agent, verify-change, contract-review |
| maintenance | repo-discovery, bug-investigator, safe-refactor, migration-planner, verify-change, docs-sync, clean-chat-handoff |
| architecture | repo-discovery, feature-planner, grill-me, contract-review, clean-chat-handoff |

The source is [the preset catalog](../../templates/presets/catalog.json); `list --output json` exposes names, descriptions, and expanded lists. Select one preset per command. It contributes only skills, preserving ordering and deduplicating explicit additions. Selected roles still contribute their required workflows. Installing a set does not require using every workflow for every task.

```sh
node bin/codex-agent-template.mjs init-new --target .local/review-example --preset review --skill docs-sync --role docs-researcher
```

The preview contains review-agent, verify-change, contract-review, docs-sync, and repo-discovery (the researcher's dependency). It contains one explicitly selected role and no packs or record templates. Repeat with `--apply` only after reviewing the creation proposal.

During update a supplied preset replaces the saved base skills; explicit `--skill` values add to that preset. Omitted independent settings are inherited, including roles and their dependencies. Without a preset, omitted skills are inherited and an explicit skills array replaces that selection. CLI presets cannot subtract members: select individual skills instead when a narrower set is needed. The API can pass `skills: []` without a preset, although retained roles still require their workflows.

Configuration, update plans, onboarding results, and reports contain expanded skills. The preset name is an input shortcut and is not a saved policy. Apply a saved plan without selection overrides; different settings or template versions require a new review. Deselected skill files are retained and may still be discovered by a runtime.

## Selectable forms

| Name | Durable information to record when useful |
| --- | --- |
| project-context | Task-relevant facts, sources, version/freshness limits, verification path, unknowns |
| investigation | Expected/observed behavior, reproduction, competing explanations, actual checks, conclusion/gaps |
| decision | Choice/status, constraints, evidence, credible alternatives, consequences and reconsideration conditions |
| migration | Old/new states, consumers, coexistence, stages, cutover/stop evidence, irreversible recovery limits |
| verification-result | Candidate/criteria, actual actions and evidence, passed/failed/not run/blocked status, acceptance gaps |

```sh
node bin/codex-agent-template.mjs init-new --target .local/forms-example --record-template decision --record-template migration
node bin/codex-agent-template.mjs update-existing --target ../project --record-template investigation --plan-file .local/forms-review.json
node bin/codex-agent-template.mjs update-existing --target ../project --apply --approval "reviewed" --plan-file .local/forms-review.json
```

Forms are generated as `docs/ai/templates/<name>.md`, with `docs/ai/record-templates.md` explaining their conditional use. Root instructions link only that guide when forms are selected. There is no generated completed context, decision, investigation, migration, or verification result. Use an existing project format first; copy only a relevant form to a task-appropriate location and replace prompts with supported facts or explicitly unknown items. No default commands, installed versions, approval, or passing results are filled in.

An explicit record-template array replaces the saved form selection; omitted selection is inherited by update. Deselecting forms does not delete them or the retained guide. Custom forms are preserved as conflicts when selected; init refuses any existing selected infrastructure file. Optional schema-v1 `recordTemplates` defaults to an empty list when omitted, keeping old configurations readable. New configs write the field explicitly and still require reviewed update for metadata changes.

## Library inputs

```js
import {initNew} from "./src/init-new.mjs";
import {updateExisting} from "./src/update-existing.mjs";

// Preview only; the actual target must be chosen intentionally.
const preview = await initNew({target: "../project", preset: "maintenance", recordTemplates: ["investigation"]});
const update = await updateExisting({target: "../project", preset: "review", skills: ["docs-sync"]});
// update.plan.options already contains expanded skills and inherited settings.
// To remove form selection from configuration, preview with recordTemplates: [].
```

The source/import paths above are for callers using this checkout. Library apply still requires `apply: true`, an approval record, and the reviewed plan, with matching concrete options; no preview executes checks or writes target files.
