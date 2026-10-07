---
name: feature-planner
description: Turn a requested feature with unresolved scope or cross-component consequences into a reviewable implementation plan.
---

# Feature Planner

Use the request, existing requirements, and focused repository evidence to define the intended behavior. Apply this when scope or cross-component consequences need resolution; handle routine edits proportionally without creating a planning ritual.

Describe boundaries, affected consumers, observable acceptance criteria, dependencies, meaningful risks, and the smallest sufficient verification. Use the project's actual layout, tools, and architectural conventions; leave unknown commands explicit. For non-code work, use review, scenarios, or walkthrough criteria. Use existing task/spec formats when present rather than creating duplicate records.

Identify decisions that could reverse the plan; use grill-me if it is available and the choice is materially contested. Ask only questions whose answers materially change a sound plan, reusing facts already available. Mark assumptions and distinguish them from constraints. Define a small experiment when a decision depends on missing measurements.

Return a concrete plan with implementation steps, acceptance evidence, unresolved decisions, and any recovery limits. Preserve existing authorization: an approved scope does not need another approval for each step. Implement only if requested or already authorized. Stop when the plan is actionable or a specific missing decision prevents progress; do not demand an arbitrary number of documents or phases.
