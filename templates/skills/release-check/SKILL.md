---
name: release-check
description: Assess a specific release candidate against acceptance evidence, compatibility obligations, and recovery requirements before publication.
---

# Release Check

Use the release candidate/revision, intended audience/channel, approved scope, acceptance criteria, and relevant project release policy. Apply to release readiness; a routine edit or request to commit does not automatically require a release audit. Do not assume a package registry, deployment service, semantic versioning, or CI pipeline.

Tie evidence to the actual candidate. Distinguish tracked content, local changes, packaged/generated content, and previously tested revisions. Select checks for the material acceptance criteria and realistic regressions; reuse valid results rather than launching an exhaustive matrix. Verify packaging or distribution content when it affects what users receive. Inspect command prerequisites and side effects before authorized execution.

Check applicable consumer compatibility, migration instructions, release notes, and operational/content recovery expectations. Identify irreversible transitions or post-release writes that limit recovery. A successful build, a clean Git tree, or a backup file alone does not prove readiness. Do not invent universal thresholds or require infrastructure absent from this project.

Return ready, blocked, or evidence incomplete with candidate identity, criterion-to-evidence mapping, unrun checks, material risks, and the next concrete action. Block a positive readiness verdict when required criteria fail or remain unproven. Distinguish an accepted risk within the authorized scope from an unresolved requirement.

Readiness does not itself authorize publishing, tagging, deployment, external notifications, or commits. Carry out an explicitly requested release action when existing authorization covers the concrete target and candidate; do not request the same approval again. If authority or the target is genuinely missing, complete the reviewable candidate first and ask only for that missing decision. Never claim publication occurred without its result.
