---
name: verify-change
description: Assess or gather evidence that a concrete change meets its acceptance criteria, using the project's available checks.
---

# Verify Change

Use the requested behavior, acceptance criteria, current change, and relevant project evidence. Preserve prior approval within its scope. Apply this to a change requiring acceptance evidence, not an automatic full validation ritual for every edit.

Map each material criterion and plausible regression to the smallest useful check. Confirm commands, working directory, prerequisites, and sources in the project. Use scenario, content, or consistency review when no executable check is applicable. Do not invent tools, fixtures, performance thresholds, or successful results.

Before execution, identify side effects and permitted write locations. Run only authorized checks compatible with the actual sandbox and supplied environment. Use disposable fixtures or an isolated copy for checks that can change files or state. If safe execution or required tooling is unavailable, return the proposed check and limitation; do not weaken permissions, install tools, touch production, or claim execution. Read-only access alone does not prevent network calls or other external effects.

Assess the observed behavior against the criterion, not merely the command's exit code. Distinguish pre-existing failures from failures caused by this change when evidence permits. Rerun when a fix, failure, or unresolved concern warrants it; stop after sufficient evidence rather than repeating passing checks. A delegated verifier does not fix product files.

Return criterion, check/source/cwd, actual environment and action, status (passed, failed, not run, or blocked), evidence, and remaining acceptance gaps. If a required criterion cannot be established, leave acceptance unproven. Record sensitive evidence by safe references or redacted summaries. Save a report only when requested or required by the project's workflow.
