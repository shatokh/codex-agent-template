# Context Artifact Advisor Design

Дата: 2026-08-04

## Цель

Добавить в `codex-agent-template` опциональный manual-mode советник, который анализирует текущий чатовый контекст и репозиторные признаки повторяющихся проблем, а затем предлагает durable artifacts:

- short root rules;
- skills;
- docs/runbooks;
- validator scripts;
- future hooks;
- future agents/orchestrators;
- future plugin surfaces.

Советник не должен автоматически внедрять предложения. Он только готовит reviewable proposals.

## Scope v1.5

Только manual mode.

Пользователь явно вызывает советник, например:

```text
$context-artifact-advisor
```

Советник анализирует:

- видимый чатовый контекст;
- текущие project rules;
- docs/plans;
- existing skills;
- recent local proposal files, если они есть.

Он не должен:

- включать hooks;
- писать автоматический session ledger;
- собирать полный чат без явного вызова;
- внедрять artifacts без approval;
- читать весь репозиторий без bounded reason.

## Capture mode

Capture mode через hooks, session ledgers, compact event capture и автоматический delta tracking отложен до v3 или позже.

Причина:

- высокий privacy risk;
- риск лишнего token и storage overhead;
- сложнее объяснить пользователю, что именно собирается;
- early value можно получить через manual mode.

## Что искать

Advisor должен искать:

- повторяющиеся человеческие коррекции;
- recurring workflow friction;
- повторный поиск одних и тех же файлов/команд;
- sandbox/escalation friction;
- test/CI failure patterns;
- token-heavy повторения;
- правила, которые есть в чате, но не закреплены в repo;
- workflow, который лучше оформить skill-ом;
- deterministic rule, который лучше проверять script-ом;
- будущую автоматизацию, которую пока нельзя включать без отдельного approval.

## Proposal threshold

Proposal создается, если выполняется хотя бы одно условие:

- проблема повторилась минимум два раза;
- проблема high-severity: secrets, destructive action, CI blocker, production risk;
- пользователь явно сказал "запомни", "всегда", "надо автоматизировать", "мы опять это делаем";
- ожидаемая экономия токенов или времени заметна и понятна.

## Proposal format

```md
# CPA-0001: Short title

Status: candidate
Evidence strength: recurring | high severity | explicit human request
Observed friction:
Recommended artifact: AGENTS rule | skill | docs | script | hook backlog | agent backlog | plugin backlog
Why this artifact:
Expected token/time savings:
Risks:
Approval needed:
Implementation sketch:
```

## Recommended files

```text
.agents/skills/context-artifact-advisor/
  SKILL.md

docs/ai/advisor/
  proposal-schema.md
  artifact-selection.md
  proposals/
    index.md
```

Runtime/session capture directories are intentionally excluded from v1.5.

## Relationship to QAGym beta

QAGym has an earlier `session-artifact-advisor` concept with hooks and incremental state scripts. `codex-agent-template` should reuse the useful artifact-selection ideas, but v1.5 must not port capture hooks or ledger automation.

## Stop boundary

After advisor output:

- summarize created or updated proposal files;
- list rejected observations and why they do not justify artifacts;
- ask for human approval before implementing any proposal;
- do not edit root rules, skills, hooks, scripts, or templates as part of the advisor run unless separately approved.

