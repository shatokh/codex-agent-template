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

## Новый No-Code Project

Dry-run:

```powershell
node bin\codex-agent-template.mjs init-new --target C:\Users\User\StudioProjects\my-no-code-project --agent codex --workflow task-first --project-kind no-code --pack test-harness --context-advisor --dry-run
```

Реальная генерация:

```powershell
node bin\codex-agent-template.mjs init-new --target C:\Users\User\StudioProjects\my-no-code-project --agent codex --workflow task-first --project-kind no-code --pack test-harness --context-advisor
```

Проверка результата:

```powershell
node bin\codex-agent-template.mjs validate --target C:\Users\User\StudioProjects\my-no-code-project
node bin\codex-agent-template.mjs onboard-existing --target C:\Users\User\StudioProjects\my-no-code-project --agent codex --workflow task-first --project-kind no-code --pack test-harness --context-advisor --check
```

## Existing Repo Proposal

Для существующего repo сначала делай non-writing proposal.

Code repo:

```powershell
node bin\codex-agent-template.mjs onboard-existing --target C:\Users\User\StudioProjects\existing-code-repo --agent codex --workflow task-first --project-kind code --pack test-harness --context-advisor --dry-run --proposal-dir .local\proposals
```

No-code repo:

```powershell
node bin\codex-agent-template.mjs onboard-existing --target C:\Users\User\StudioProjects\thornwake\thornwake-boardgame --agent codex --workflow task-first --project-kind no-code --pack test-harness --context-advisor --dry-run --proposal-dir .local\proposals
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

## Existing Generated Files Update Review

Если AI-инфраструктура уже создана, но template изменился, сначала запускай update review без записи:

```powershell
node bin\codex-agent-template.mjs update-existing --target C:\Users\User\StudioProjects\existing-repo --agent codex --workflow task-first --project-kind no-code --pack test-harness --context-advisor --proposal-dir .local\proposals
```

Команда покажет:

- `Missing files to create`
- `Existing files to review for update`
- `Unchanged generated files`

`update-existing` без `--apply` ничего не пишет в target repo. Это review/diff gate перед ручным merge или approved apply.

После review proposal и явного approval можно применить update:

```powershell
node bin\codex-agent-template.mjs update-existing --target C:\Users\User\StudioProjects\existing-repo --agent codex --workflow task-first --project-kind no-code --pack test-harness --context-advisor --apply --approval "approved after proposal review"
```

`--apply` нельзя совмещать с `--proposal-file` или `--proposal-dir`. Для apply обязательно нужен непустой `--approval`.

## Project Kind

Используй `--project-kind` явно, особенно для не-кодовых проектов.

`onboard-existing` подсказывает project kind по найденным файлам, но финальный выбор остается за человеком.

```text
code         обычный software project
docs         документационный проект
game-design  дизайн игры, прототип, narrative/design docs
no-code      проект без software runtime: правила, контент, ассеты, research, настолка, операционные docs
```

Для `no-code` verification не будет притворяться software test matrix. Вместо этого будут checks для правил/workflow, контента/ассетов, walkthrough, consistency, export/publishing и decision log.

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
7. Use `update-existing --proposal-dir .local\proposals` after template upgrades.

## Codex Prompt

Copy-paste prompt для запуска через Codex-агента:

```text
В проекте C:\Users\User\StudioProjects\codex-agent-template запусти codex-agent-template для целевого repo <TARGET_PATH>.

Сначала сделай non-writing onboard-existing dry-run с proposal-dir .local\proposals.
Параметры:
- agent: codex
- workflow: task-first
- project-kind: <code|docs|game-design|no-code>
- packs: <укажи нужные packs>
- context-advisor: <да/нет>

Покажи summary proposal, путь к markdown proposal и риски. Не запускай init-new и не меняй target repo без моего явного апрува.
```

После апрува на применение:

```text
Примени approved codex-agent-template init-new к <TARGET_PATH> с теми же параметрами.
Не перезаписывай existing files. После запуска выполни validate и onboard-existing --check, покажи итоговый status target repo и не коммить без моего отдельного апрува.
```
