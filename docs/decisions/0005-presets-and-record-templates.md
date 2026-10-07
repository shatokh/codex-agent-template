# ADR 0005: Skill presets and optional record templates

Date: 2026-10-07. Status: accepted as the next stage requested by the user.

## Decision

Add essential, review, maintenance, and architecture as skill-only input presets following the approved artifact proposal. Accept one preset plus explicit skill additions. Roles, packs, project kind, workflow, advisor, permissions, and record forms remain independently selected. Expand presets before merging update overrides with saved settings: selecting a preset replaces only the base skill list. Resolve retained role dependencies afterward.

Store concrete expanded selections in configuration and reviewed plans, without a persistent preset field. This prevents a catalog change from silently changing a saved project's selection or a reviewed apply. Preserve existing replacement/inheritance semantics when no preset is supplied. Report the expanded selections in previews and onboarding recommendations.

Add repeatable record-template selection for project-context, investigation, decision, migration, and verification-result. Generate only selected reusable forms under docs/ai/templates plus a conditional guide/root link. Do not create completed records or automatically load forms with skills/presets. Prefer existing project document formats for actual records. Keep approval, versions, observed facts, and execution results unfilled until evidence is available.

Bump package/templates to 0.5.0; retain schema v1 with optional recordTemplates for compatibility. Changes use the existing hash/conflict/backup/journal protections. Edited forms become conflicts, and deselection leaves artifacts on disk. Pending plans from prior template versions need a new preview.

## Verification and limits

Check skill-only expansion, explicit additions, role dependencies, empty defaults, independent settings, generation/doctor across supported modes and project kinds, preview-only behavior, saved-plan apply/replay, custom-file preservation, retained deselected forms, old metadata, strict CLI usage, and the extracted package from another cwd.

These are deterministic selection/document-generation changes; no runtime adapter or native role format changes. Prior limits on native delegate execution, effective permissions, live Claude, and model-backed behavioral evaluation still apply. No new service or dependency is introduced.

## Remaining scope

Hooks, session capture, automatic merge/deletion, plugin packaging, additional adapters, and publication/release automation remain outside scope. Concrete records are task-driven, not mandatory ceremony. Existing user authorization to commit/push the continued stages remains in effect.
