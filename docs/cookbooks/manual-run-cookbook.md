# Manual Run Cookbook

Практический cookbook для запуска `codex-agent-template` из консоли или через Codex-агента.

Все команды ниже предполагают, что текущая директория:

```powershell
cd C:\Users\User\StudioProjects\codex-agent-template
```

## Быстрая Проверка CLI

```powershell
node bin\codex-agent-template.mjs list
node bin\codex-agent-template.mjs list --output json
npm.cmd test
npm.cmd run validate
```

## Новый Code Project

Dry-run перед записью:

```powershell
node bin\codex-agent-template.mjs init-new --target C:\Users\User\StudioProjects\my-code-project --agent codex --workflow task-first --project-kind code --pack test-harness --dry-run
```

Реальная генерация:

```powershell
node bin\codex-agent-template.mjs init-new --target C:\Users\User\StudioProjects\my-code-project --agent codex --workflow task-first --project-kind code --pack test-harness
```

Проверка результата:

```powershell
node bin\codex-agent-template.mjs validate --target C:\Users\User\StudioProjects\my-code-project
node bin\codex-agent-template.mjs onboard-existing --target C:\Users\User\StudioProjects\my-code-project --agent codex --workflow task-first --project-kind code --pack test-harness --check
```

## Новый Board Game Project

Dry-run:

```powershell
node bin\codex-agent-template.mjs init-new --target C:\Users\User\StudioProjects\my-boardgame --agent codex --workflow task-first --project-kind boardgame --pack test-harness --context-advisor --dry-run
```

Реальная генерация:

```powershell
node bin\codex-agent-template.mjs init-new --target C:\Users\User\StudioProjects\my-boardgame --agent codex --workflow task-first --project-kind boardgame --pack test-harness --context-advisor
```

Проверка результата:

```powershell
node bin\codex-agent-template.mjs validate --target C:\Users\User\StudioProjects\my-boardgame
node bin\codex-agent-template.mjs onboard-existing --target C:\Users\User\StudioProjects\my-boardgame --agent codex --workflow task-first --project-kind boardgame --pack test-harness --context-advisor --check
```

## Existing Repo Proposal

Для существующего repo сначала делай non-writing proposal.

Code repo:

```powershell
node bin\codex-agent-template.mjs onboard-existing --target C:\Users\User\StudioProjects\existing-code-repo --agent codex --workflow task-first --project-kind code --pack test-harness --context-advisor --dry-run --proposal-dir .local\proposals
```

Board game repo:

```powershell
node bin\codex-agent-template.mjs onboard-existing --target C:\Users\User\StudioProjects\thornwake\thornwake-boardgame --agent codex --workflow task-first --project-kind boardgame --pack test-harness --context-advisor --dry-run --proposal-dir .local\proposals
```

QAGym-style mature repo:

```powershell
node bin\codex-agent-template.mjs onboard-existing --target C:\Users\User\StudioProjects\QAGym --agent codex --workflow task-first --project-kind code --pack security --pack test-harness --context-advisor --dry-run --proposal-dir .local\proposals
```

Proposal будет сохранен в:

```text
.local/proposals/<project-name>/<timestamp>-onboarding-proposal.md
```

`.local/` игнорируется git и подходит для локального архива review-артефактов.

## Existing Repo Check

Проверить, хватает ли уже выбранной AI-инфраструктуры:

```powershell
node bin\codex-agent-template.mjs onboard-existing --target C:\Users\User\StudioProjects\existing-repo --agent codex --workflow task-first --project-kind code --pack test-harness --context-advisor --check
```

Если exit code `0` и `Complete: yes`, выбранный набор файлов присутствует и metadata совпадает.

Если exit code `1`, смотри:

- `Proposed files to create`
- `Blocked existing files`
- `Configuration issues`
- `Recommendations`

## Project Kind

Используй `--project-kind` явно, особенно для не-кодовых проектов.

```text
code         обычный software project
docs         документационный проект
game-design  дизайн игры, прототип, narrative/design docs
boardgame    настолка: правила, карты, компоненты, баланс, playtests
```

Для `boardgame` verification не будет притворяться software test matrix. Вместо этого будут checks для правил, компонентов, playtest, баланса, print/export и decision log.

## Agent Mode

```text
codex         создает AGENTS.md
claude        создает CLAUDE.md
codex+claude  создает AGENTS.md и CLAUDE.md с импортом @AGENTS.md
```

## Workflow

```text
light       минимальная AI-инфраструктура
task-first  добавляет docs/tasks/TEMPLATE.md и approval workflow
spec-tdd    добавляет specs и AI change records
```

## Packs

```text
privacy
external-services
security
test-harness
docs
```

Можно передавать несколько `--pack`.

## Safe Manual Flow

1. Run `onboard-existing --dry-run --proposal-dir .local\proposals`.
2. Review proposal markdown.
3. If repo is empty or conflicts are acceptable, run `init-new`.
4. Run `validate --target <project>`.
5. Run `onboard-existing --check` with the same options.
6. Review git status in target repo before staging anything.

## Codex Prompt

Copy-paste prompt для запуска через Codex-агента:

```text
В проекте C:\Users\User\StudioProjects\codex-agent-template запусти codex-agent-template для целевого repo <TARGET_PATH>.

Сначала сделай non-writing onboard-existing dry-run с proposal-dir .local\proposals.
Параметры:
- agent: codex
- workflow: task-first
- project-kind: <code|docs|game-design|boardgame>
- packs: <укажи нужные packs>
- context-advisor: <да/нет>

Покажи summary proposal, путь к markdown proposal и риски. Не запускай init-new и не меняй target repo без моего явного апрува.
```

После апрува на применение:

```text
Примени approved codex-agent-template init-new к <TARGET_PATH> с теми же параметрами.
Не перезаписывай existing files. После запуска выполни validate и onboard-existing --check, покажи итоговый status target repo и не коммить без моего отдельного апрува.
```
