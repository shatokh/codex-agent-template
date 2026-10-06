---
name: grill-me
description: Stress-test a contested decision or architecture fork through pointed questions about evidence, assumptions, alternatives, and failure conditions. Use when explicitly requested or a consequential choice remains materially uncertain.
---

# Grill Me

Help the human defend or revise a decision before committing to it. Challenge the reasoning firmly and respectfully; the aim is a better decision, not winning an argument. Respond in the human's language.

## When to enter

- An explicit `/grill-me` or `$grill-me` request.
- A disputed design, consequential architecture fork, or assumption that materially changes cost, reliability, data integrity, or reversibility and lacks supporting evidence.

Do not turn routine implementation choices, typo fixes, or settled decisions with unchanged evidence into an interview. On implicit invocation, briefly identify the concrete unresolved decision and why it merits scrutiny. Preserve existing task scope and approvals.

## Interrogate the decision

First state the proposed decision, strongest rationale, constraints, and credible alternative using the evidence already available. Do not ask the human to repeat facts present in the conversation or relevant repository documents. Read only directly relevant evidence.

Ask one to three high-value questions in a round, then wait for answers about that decision. Continue unrelated authorized work when it is independent. Prefer the question whose answer could actually reverse the choice.

Probe as relevant:

- What measured need or hard constraint makes this solution necessary? What is the simplest viable alternative?
- Which assumption has the weakest evidence, and what result would falsify it?
- Under what load, failure, migration, or operational conditions does the design break? Who owns recovery and maintenance?
- What is the cost of being wrong, the rollback path, and the point where reversal becomes expensive?
- Which tradeoff are we consciously accepting, and what comparable evidence rules out the alternative?

After answers, summarize what is now supported and what remains unproven. Challenge unsupported claims with a concrete counterexample or failure scenario. A preference can be a legitimate constraint; distinguish it from a factual claim. Accept evidence that resolves a concern and retire that objection. Mark hypothetical risks as hypotheses, not established defects.

If the answer depends on missing measurements, propose the smallest experiment with a success threshold rather than demanding more opinion. If no interaction channel is available, present the questions and mark the verdict provisional; never invent the human's answers.

## Finish

Stop when material objections are resolved, an experiment is the next useful step, or the human asks to stop. After two or three rounds without new evidence, summarize the remaining uncertainty instead of looping.

Give a concise decision note:

- Verdict: **defensible**, **test first**, or **reconsider**.
- Decision and strongest supporting evidence.
- Remaining assumptions and accepted tradeoffs.
- Failure/rollback condition and the next check, if needed.

Recommend without claiming approval. The human owns the choice. Do not reopen approved work merely to perform this skill, create an ADR, edit files, or implement an alternative unless that action is already requested. Offer a short ADR-ready note in the response when it would help preserve the decision.
