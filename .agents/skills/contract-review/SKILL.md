---
name: contract-review
description: Review a changed interface or data format for observable contract changes and effects on existing consumers.
---

# Contract Review

Use the proposed change, before/after behavior, known consumers, and compatibility requirements. Apply when an exposed boundary or shared format changes; do not require an interface audit for an internal edit with no observable effect. Review evidence without implementing fixes unless the task also authorizes them.

Locate the actual contract and consumer evidence. A boundary may be a command, file format, message, function, service, document convention, or rule used by another artifact. Do not assume a network API, schema language, versioning policy, or known complete consumer inventory. Distinguish supported behavior from incidental behavior and undocumented dependencies.

Compare relevant inputs, outputs, defaults, errors, ordering, side effects, and interpretation of stored or exchanged content. Assess each change from the consumer's perspective, including old consumer/new producer and new consumer/old producer combinations when those can coexist. Treat unknown consumers as an evidence gap, not proof of compatibility. Prefer a concrete example that worked before and could fail after over a hypothetical style objection.

Return each material contract change, affected consumer/source, compatibility conclusion with confidence, and the smallest discriminating check. Explain whether adaptation, an explicitly approved breaking change, or staged coexistence is needed. Do not claim checks ran without results or impose a version bump unsupported by project policy. Stop when relevant boundaries are covered or identify the missing version, consumer, or behavior evidence that prevents a conclusion. Save a report only when requested or required by the project.
