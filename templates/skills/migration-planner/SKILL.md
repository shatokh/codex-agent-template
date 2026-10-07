---
name: migration-planner
description: Plan a transition between versions, formats, or systems with coexistence, cutover criteria, and explicit recovery limits.
---

# Migration Planner

Use the current and target states, affected consumers/content, authorized scope, constraints, and desired outcome. Produce a plan; planning does not authorize executing a migration or modifying live state. Reuse settled decisions unless new evidence changes their feasibility.

Identify what must be transformed, what can coexist, who reads/writes each version, and the invariants that must survive. Distinguish confirmed inventory and volume from estimates. Do not assume a database, deployment platform, maintenance window, automatic conversion, or reversible transformation.

Choose stages appropriate to the project: preparation, a representative trial, transition/coexistence if needed, cutover, and retirement. For each material stage state the action, dependencies, observable acceptance evidence, stop condition, and responsible party if known. Set thresholds from requirements or label them as proposals; do not invent operational measurements. Avoid dual writes or compatibility layers unless their consistency and maintenance costs serve the actual transition.

Identify lossy or irreversible steps and the point after which returning to the old version is unsafe. Separate rollback, restore from a verified backup, forward repair, and manual reconciliation. Account for new writes or changed content after cutover; a backup's existence alone does not establish recovery. Specify how recovery and transformation correctness can be tested safely before the irreversible step.

Return a reviewable staged plan with coexistence rules, acceptance/stop criteria, recovery limits, and unresolved prerequisites. If essential recovery, consumer, or source-state evidence is missing, leave the affected stage unready and name the next evidence needed. Use existing project plan formats; do not create empty document hierarchies or execute commands as part of planning.
