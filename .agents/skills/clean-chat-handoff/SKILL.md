---
name: clean-chat-handoff
description: Prepare a compact handoff when moving ongoing repository work to a new conversation or another maintainer.
---

# Clean Chat Handoff

Use current repository evidence and visible conversation to hand off unfinished work when a conversation or owner changes. Do not create a handoff for every completed small edit or claim access to missing history.

Summarize the objective, accepted constraints, decisions and scope approvals, current branch/revision when available, changed files and user-owned edits, checks actually performed, unresolved blockers, and next concrete step. Include command working directories and prerequisites when necessary to resume. Distinguish observations, assumptions, recommended actions, and checks not run.

Keep the handoff compact and sufficient for a recipient without the old conversation. Preserve unfinished work and authorization boundaries; do not reset an approved scope or imply new approval. Avoid secret values and sensitive payloads. Reference existing task/decision records when useful rather than copying entire logs or documentation.

Return the handoff in the response unless a file is requested or required by an existing workflow. Do not modify project files, commit, or publish just to hand off. Stop once the recipient has the state and next action needed to continue.
