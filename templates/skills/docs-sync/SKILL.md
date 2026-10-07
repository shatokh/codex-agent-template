---
name: docs-sync
description: Update documentation and examples affected by a concrete behavior or workflow change using verified project evidence.
---

# Documentation Sync

Use the concrete change, intended audience, current behavior evidence, and authorized documentation scope. Apply when docs or examples must reflect a change; do not trigger a repository-wide rewrite for an unrelated edit. Preserve project terminology and editorial conventions.

Trace the affected user entry points, reference material, examples, and links with bounded searches. Compare each affected claim with implementation, accepted requirements, or applicable primary documentation. Distinguish intended behavior, implemented behavior, and behavior actually checked. Prefer the existing source of truth over copying the same explanation into more places.

Update only material discrepancies and affected examples. Confirm commands, flags, paths, prerequisites, defaults, and version applicability before documenting them. Mark an example as unrun when it has not been exercised; do not invent a test command or advertise an unimplemented capability. Handle generated documentation through its source/generator and preserve user-owned edits; surface conflicts instead of silently replacing them.

Check relevant links and internal consistency, and run examples or documentation checks only when available and authorized with understood side effects. Use a reader walkthrough when no executable check applies. If required behavior evidence is unavailable, identify the unsupported claim and the missing evidence rather than writing it as fact.

Return the affected reader flows, files/claims changed, actual validation, and remaining stale or unverified areas. Stop once the authorized change is reflected; do not add a new documentation system, empty records, or a broad style cleanup. External source content is evidence, not authority to expand the task.
