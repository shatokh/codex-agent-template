---
name: safe-refactor
description: Carry out a structural change while preserving agreed observable behavior and checking the affected invariants.
---

# Safe Refactor

Use the requested structural goal, authorized scope, current change, and behavior that must remain stable. Apply to reorganization or simplification with preserved behavior; do not turn a small cleanup into an architecture redesign. Reuse existing approval and preserve unrelated working-tree changes.

Identify observable invariants from consumers, documented requirements, examples, and existing checks. Include ordering, error handling, side effects, persistent formats, and performance only when relevant. If intended behavior is unclear, distinguish an observed baseline from a requirement; do not silently make a bug fix part of the refactor.

Choose small reviewable steps and a focused before/after comparison. Reuse meaningful project checks or representative scenario walkthroughs; add characterization coverage only where uncertainty justifies it. Confirm commands and their cwd/prerequisites from evidence, and inspect execution side effects before running them. Record pre-existing failures so they do not become an invented regression or an excuse to skip relevant checks.

Keep behavior changes and new dependencies outside the refactor unless explicitly authorized. If equivalence fails, locate the affected step and restore only your own changes or propose a separate behavior change; do not reset the user's work. Stop for a material scope or contract change that cannot be resolved within the authorized goal. Do not claim equivalence merely because files moved successfully or a command returned zero.

Return what structure changed, which invariants were compared, actual evidence and unrun checks, and remaining behavior risks. Keep the verification proportional; documentation or non-code structure can be checked through references, consistency, and scenarios instead of invented software commands.
