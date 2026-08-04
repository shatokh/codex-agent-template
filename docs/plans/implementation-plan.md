# План имплементации codex-agent-template

Дата первичного анализа: 2026-08-04

## Цель

Создать отдельный проект `codex-agent-template`, который генерирует переносимую AI-agent инфраструктуру для новых и существующих репозиториев без ручного копирования `AGENTS.md`, `CLAUDE.md`, skills, docs templates и базовых governance-правил.

Шаблон должен:

- быстро инициализировать новый проект;
- аккуратно онбордить существующий репозиторий;
- не смешивать универсальные правила с доменной спецификой;
- поддерживать v1 режимы `codex`, `claude`, `codex+claude`;
- оставлять Gemini/Cursor/Copilot/Cline/Roo/Windsurf adapters на v2/v3;
- генерировать короткие always-on инструкции;
- выносить длинные процедуры в skills, docs или future path-scoped rules;
- не добавлять скрытые зависимости;
- не делать blind overwrite существующих файлов.

## Принятые решения

- Проект создается как отдельный репозиторий `codex-agent-template`.
- V1 поддерживает только `codex`, `claude`, `codex+claude`.
- Gemini, Cursor, Copilot, Cline, Roo, Windsurf и другие adapters отложены на v2/v3.
- V1 должен поддерживать два режима: `init-new` и `onboard-existing`.
- Discovery phase обязателен в обоих режимах, но глубина discovery зависит от сценария.
- Root instructions должны оставаться короткими: примерно 150-200 строк.
- Verification matrix должна быть adaptive и не перегружать простые проекты.
- Local overrides должны быть gitignored.
- `context-artifact-advisor` планируется только в manual mode для v1.5/v2.
- Capture mode, hooks, session ledgers и автоматический delta tracking отложены до v3+.

См. также [Decision 0001](../decisions/0001-v1-scope-and-advisor-mode.md).

## Локальный анализ проектов

Основные проекты с `.agents` или `.codex` артефактами:

- `EPSA/epsilion_wars_mmorpg_automation`
  - `.agents/README.md`
  - `AGENTS.md`
- `QAGym`
  - `AGENTS.md`
  - `.agents/skills/next-task-planner/`
  - `.agents/skills/clean-chat-handoff/`
  - `.agents/skills/session-artifact-advisor/`
  - `.codex/hooks.json`
  - `.codex/hooks/session-artifact-advisor-hook.mjs`
- `Reseipts`
  - `AGENTS.md`
  - `.codex/skills/receipts-import-pipeline/`
  - `.codex/skills/receipts-database-migration/`
  - `.codex/skills/receipts-l10n/`
  - `.codex/skills/receipts-test-harness/`
- `thornwake/Thornwake`
  - `AGENTS.md`
  - `.codex/AGENTS.md`

Дополнительные источники с `AGENTS.md`, но без `.agents`/`.codex` артефактов:

- `thornwake/thornwake-server`
- `thornwake/TW-site`
- `WEB3`

Ограничение анализа: при рекурсивном обходе части `Reseipts/.tmp/pdf_probe_deps` PowerShell вернул `Access denied`; нужные `AGENTS.md` и `.codex/skills` были прочитаны напрямую.

## Основные тенденции

### 1. Approval gate нужен почти всем проектам

Повторяется правило: сначала discovery/spec/task/plan, потом явное разрешение пользователя, затем implementation.

Формы различаются:

- `QAGym`: формальная task lifecycle.
- `WEB3`: spec-first, forced TDD, AI Change Record.
- `EPSA`: discovery, вопросы, план, explicit implementation approval.
- `Thornwake`: epic workflow через `AI_Tasks/<EPIC_NAME>/`.
- `Reseipts`: sub-plan для крупных фаз и синхронизация master plan.

Вывод: base должен содержать универсальный approval gate, а форму выбирать workflow-профилем.

### 2. `AGENTS.md` или `CLAUDE.md` должны быть source of truth

Для v1:

- `--agent codex`: canonical `AGENTS.md`.
- `--agent claude`: canonical `CLAUDE.md`.
- `--agent codex+claude`: canonical `AGENTS.md`, plus `CLAUDE.md` with `@AGENTS.md`.

На Windows предпочтительнее import через `@AGENTS.md`, а не symlink.

### 3. Skills нужны для повторяемых workflow

Не надо класть все в один длинный root file.

Разделение:

- root instructions: короткие always-on правила;
- skills: повторяемые многошаговые workflow;
- docs: длинные runbooks и evidence;
- hooks/scripts: deterministic enforcement.

### 4. Контекст нужно экономить

Root rules должны быть конкретными и короткими. Целевой лимит: 150-200 строк для `AGENTS.md` или `CLAUDE.md`.

Если правило:

- относится только к одному subsystem;
- является длинной процедурой;
- содержит много примеров;
- редко нужно в каждой сессии;

его надо вынести из always-on файла.

### 5. Verification должна быть adaptive

Не генерировать полную матрицу для простых проектов.

Уровни:

- `light`: unit tests, format/lint if available, known unavailable checks.
- `standard`: bootstrap, lint, type/static check, unit, integration, build.
- `strict`: standard plus e2e/smoke, security/dependency, docs validation, manual verification.

Пример для простого Python проекта:

```text
Verification:
- Unit tests: pytest
- Not configured yet: lint, typecheck, integration, e2e, build
```

## Два режима работы v1

### `init-new`

Для пустого или почти пустого проекта.

Поведение:

1. Проверить target path.
2. Проверить наличие Git.
3. Найти README, high-level plan, package/project files, если они уже есть.
4. Спросить agent mode: `codex`, `claude`, `codex+claude`.
5. Спросить workflow: `light`, `task-first`, `spec-tdd`.
6. Спросить optional packs: `privacy`, `external-services`, `security`, `docs`, `test-harness`.
7. Создать минимальную AI-инфраструктуру.
8. Сохранить выбранные параметры в `.agent-template.json`.

### `onboard-existing`

Для существующего repo без AI-инфраструктуры или с недостаточной.

Поведение:

1. Запустить bounded discovery.
2. Прочитать root files, README, docs, scripts, CI, package/build/test configs, `.env.example`.
3. Найти существующие `AGENTS.md`, `CLAUDE.md`, `.agents`, `.codex`, `.claude`, docs workflows.
4. Найти generated/vendor/temp folders и секретные patterns.
5. Подготовить reviewable proposal.
6. Писать файлы только после подтверждения.
7. Не делать blind overwrite.

## Рекомендуемая структура проекта

```text
codex-agent-template/
  README.md
  package.json
  bin/
    codex-agent-template.mjs
  scripts/
    validate-project.mjs
  docs/
    plans/
      implementation-plan.md
    research/
      internet-best-practices.md
  templates/
    base/
      AGENTS.md.hbs
      CLAUDE.md.hbs
      docs/
        ai/
          onboarding-notes.md.hbs
          rule-quality-checklist.md.hbs
          verification.md.hbs
    skills/
      clean-chat-handoff/
        SKILL.md.hbs
      repo-analyst/
        SKILL.md.hbs
      feature-planner/
        SKILL.md.hbs
      review-agent/
        SKILL.md.hbs
    workflows/
      light.yaml
      task-first.yaml
      spec-tdd.yaml
    packs/
      privacy.yaml
      external-services.yaml
      security.yaml
      docs.yaml
      test-harness.yaml
  src/
    cli.mjs
    discover/
      init-new.mjs
      onboard-existing.mjs
    render/
      render-template.mjs
      merge-rules.mjs
    validate/
      validate-rules.mjs
      validate-output.mjs
```

## CLI v1

Команды:

```powershell
codex-agent-template init-new --target <path> --agent codex --workflow light --dry-run
codex-agent-template onboard-existing --target <path> --agent codex+claude --dry-run
codex-agent-template validate --target <path>
codex-agent-template list
```

Опции:

- `--agent codex|claude|codex+claude`
- `--workflow light|task-first|spec-tdd`
- `--pack privacy`
- `--pack external-services`
- `--pack security`
- `--pack docs`
- `--pack test-harness`
- `--dry-run`
- `--force` только для явно подтвержденных overwrite операций

## Текущий статус реализации

Реализовано:

- base templates for `AGENTS.md`, `CLAUDE.md`, `CLAUDE.import-agents.md`;
- `.agent-template.json` template;
- `init-new --dry-run`;
- `init-new` file writing;
- default no-overwrite blocking;
- generated project validation;
- workflow-specific docs generation for `light`, `task-first`, and `spec-tdd`;
- `onboard-existing` bounded discovery proposal with no writes;
- optional markdown proposal export through `--proposal-file`;
- machine-readable CLI output through `--output json`;
- `onboard-existing --check` for non-writing automation checks;
- `.gitignore` generation for local AI overrides and environment files;
- generated validation for local override ignore rules and unresolved root-rule template variables;
- optional packs: `privacy`, `external-services`, `security`, `test-harness`, `docs`;
- richer `onboard-existing` recommendations and severity-grouped findings;
- discovery for project types, package manager, and suggested verification order;
- workflow-specific rule content for `task-first` and `spec-tdd`;
- manual-mode `context-artifact-advisor` generation through `--context-advisor`;
- smoke tests for dry-run, write, no-overwrite, and generated validation.

Не реализовано:

- interactive prompts;
- `onboard-existing` file writing;
- capture-mode context advisor;
- `--force`;
- update/merge engine.

## Base artifacts v1

Обязательные:

- `AGENTS.md` или `CLAUDE.md`
- `docs/ai/onboarding-notes.md`
- `docs/ai/rule-quality-checklist.md`
- `docs/ai/verification.md`
- `.agent-template.json`

Optional by workflow:

- `docs/tasks/TEMPLATE.md`
- `docs/specs/TEMPLATE.md`
- `docs/ai-change-records/TEMPLATE.md`

Optional by agent:

- `.agents/skills/...`
- `.claude/skills/...`

## Rule quality checklist

Validator должен проверять:

- root instructions не длиннее целевого лимита;
- нет unresolved placeholders вроде `{{PROJECT_NAME}}`;
- нет vague rules без конкретного действия;
- нет конфликтующих правил;
- нет секретов или секретоподобных значений;
- есть verification commands или явный статус `not configured`;
- есть dirty worktree policy;
- есть no blind overwrite policy;
- есть commit policy;
- есть local override ignore rules.

## Local override policy

Generated `.gitignore` должен включать:

```text
AGENTS.local.md
CLAUDE.local.md
.agent-local/
.codex-local/
.claude-local/
.env
.env.*
!.env.example
```

## Варианты реализации

### Вариант 1. Отдельный Node.js CLI repo

Плюсы:

- можно запускать в любом проекте;
- удобно версионировать;
- поддерживает dry-run, discovery, validate;
- можно постепенно добавлять профили и adapters.

Минусы:

- нужно поддерживать CLI и тесты;
- update/merge engine сложнее, чем простое копирование.

Рекомендация: основной путь.

### Вариант 2. Skeleton repo

Плюсы:

- быстрее стартовать;
- почти нет логики;
- удобно для новых пустых проектов.

Минусы:

- плохо онбордит существующие repo;
- нет adaptive discovery;
- быстро появятся ручные расхождения.

Рекомендация: можно использовать как внутренний этап, но не как финальную архитектуру.

### Вариант 3. Personal plugin/skill pack

Плюсы:

- удобно для повторяемых workflows;
- можно централизованно обновлять skills.

Минусы:

- project rules все равно должны жить в repo;
- хуже audit trail;
- bootstrap docs все равно нужен.

Рекомендация: v2+, как дополнение к CLI.

## Пошаговый план

### Шаг 1. Project skeleton

Создать:

- `README.md`
- `package.json`
- `bin/codex-agent-template.mjs`
- `scripts/validate-project.mjs`
- `docs/plans/implementation-plan.md`
- `docs/research/internet-best-practices.md`

### Шаг 2. Templates v1

Создать templates:

- `AGENTS.md.hbs`
- `CLAUDE.md.hbs`
- `CLAUDE.import-agents.md.hbs`
- `docs/ai/onboarding-notes.md.hbs`
- `docs/ai/rule-quality-checklist.md.hbs`
- `docs/ai/verification.md.hbs`
- `.agent-template.json.hbs`

### Шаг 3. Discovery engine

Реализовать:

- `init-new` lightweight discovery;
- `onboard-existing` bounded discovery;
- confidence levels for discovered commands;
- generated proposal before writes.

### Шаг 4. Render engine

Реализовать:

- agent mode rendering;
- workflow rendering;
- optional pack rendering;
- dry-run summary;
- no overwrite by default.

### Шаг 5. Validate

Реализовать:

- skeleton validation;
- generated project validation;
- rule quality validation.

### Шаг 6. Tests

Smoke tests:

- init-new empty dir with `codex`;
- init-new empty dir with `claude`;
- init-new empty dir with `codex+claude`;
- onboard-existing dir with README and package file;
- dry-run does not write;
- validate generated output.

### Шаг 7. Pilot

Проверить на временных проектах:

- simple Python unit-only;
- simple TS/JS project;
- docs-only project;
- existing repo with partial `AGENTS.md`.

## v1 scope

Включить:

- `codex`, `claude`, `codex+claude`;
- `init-new`;
- `onboard-existing`;
- `validate`;
- `list`;
- adaptive verification;
- local overrides;
- rule quality checklist;
- short always-on rules;
- no blind overwrite.

Не включать:

- Gemini/Cursor/Copilot/Cline adapters;
- real path-scoped rules;
- hooks;
- session artifact advisor;
- context artifact advisor implementation;
- update/merge engine;
- plugin packaging.

## Backlog v1.5/v2

- Manual-mode Context Artifact Advisor.
- Path-scoped rules.
- Existing project update/merge engine.
- Gemini adapter.
- Cursor/Copilot/Cline/Roo/Windsurf adapters.
- Personal Codex/Claude skill pack.

## Backlog v3+

- Capture-mode Context Artifact Advisor.
- Hooks.
- Session artifact advisor style incremental ledger automation.

## Открытые вопросы

- Какой формат templates выбрать: Handlebars, EJS или собственный простой renderer?
- Нужен ли интерактивный prompt в CLI v1 или только flags?
- Где хранить generated proposal: stdout only или `docs/ai/onboarding-proposal.md`?
- Нужен ли GitHub repo сразу private или public после первого рабочего CLI?
- Нужно ли переносить старый root-level plan file из `StudioProjects` или оставить его как historical copy?
