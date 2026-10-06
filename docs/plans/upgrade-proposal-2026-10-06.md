# Предложение по развитию codex-agent-template

Дата исследования: 2026-10-06. Статус: **все девять пунктов одобрены пользователем; реализация отражена в активном плане**.

Это исходное предложение, сохранённое для истории. Апрув на все пункты получен в следующем сообщении пользователя; дополнительно согласован grill-me. Фактический статус, проверки и ограничения см. в [активном плане](implementation-plan.md) и [ADR 0002](../decisions/0002-approved-reliability-and-skills.md). Основание исследования: исходники, шаблоны, тесты, README, текущий план, ADR 0001 и официальная документация.

## Рекомендация

Следующий этап — повысить надёжность CLI и полезность генерируемых инструкций. Сначала исправить ошибки автоматизации и защитить пользовательские файлы; затем связать discovery с генерацией, различить workflows и обеспечить совместимость skills.

Сохранить три agent modes: Codex, Claude, Codex+Claude. Предлагаемые изменения не требуют LLM API, новых runtime services или перевода проекта на TypeScript.

## Что уже работает

- Node.js CLI без сторонних runtime dependencies; `init-new`, `onboard-existing`, `update-existing`, `validate`, `list`.
- Dry-run, блокировка существующих файлов при init, text/JSON output, markdown proposal export.
- Три workflow, пять optional packs, четыре project kinds и manual context advisor.
- `node scripts/validate-project.mjs` — passed; `node --test` — **40/40 passed** на текущей Windows-машине.
- Исходное рабочее дерево чистое. Кроссплатформенная работа и реальные сессии Codex/Claude этим запуском не подтверждены.

## Найденные пробелы

| Наблюдение | Основание в репозитории | Последствие |
| --- | --- | --- |
| `update-existing --apply` полностью заменяет отличающиеся файлы | `src/update-existing.mjs`, запись через `writeFile` | На временном fixture потерялись пользовательские правила в `AGENTS.md` и собственная запись `.gitignore` |
| Proposal для update перечисляет пути без содержательного diff | `src/render-update-proposal.mjs` | Пользователь не видит точную замену, которую одобряет |
| Update берёт из существующего config только `generatedAt`; CLI подставляет остальные defaults | `src/cli.mjs`, `src/update-existing.mjs` | Запуск без прежних flags может изменить agent/workflow/packs |
| Невалидный проект в `validate --output json` получает exit code 0 | `src/cli.mjs`, ветка validate; воспроизведено | CI может принять ошибочный результат за успех |
| JSON + proposal export дописывает `Proposal written: ...` в stdout | `src/cli.mjs`; воспроизведено | Результат нельзя разобрать обычным `JSON.parse` |
| Неизвестные options с value принимаются и игнорируются | `parseOptions`; `list --typo value` воспроизведено | Опечатки скрывают неверную конфигурацию |
| Discovery преимущественно проверяет наличие фиксированных root paths | `src/discover-existing.mjs` | README/CI не анализируются по содержимому; `pytest` предполагается по наличию Python manifest |
| Discovery commands не поступают в generator | `src/onboard-existing.mjs`, `src/init-new.mjs` | Verification draft приходится вручную переносить; init не делает заявленный discovery |
| Workflow в root rules меняет metadata, но не процедуру; packs не связаны ссылками | `templates/base/AGENTS.md.tmpl`, `CLAUDE.md.tmpl` | Наличие task/spec/pack files ещё не означает, что агент применит их |
| Advisor всегда генерируется в `.agents/skills` | `src/init-new.mjs`, validator | Claude-specific расположение skills не реализовано |
| Rule validation проверяет ограниченный набор признаков | `src/validate-generated-project.mjs` | Нет проверки frontmatter skills, внутренних ссылок; ignore rules проверяются через substring |
| План и ADR отстают от кода | `implementation-plan.md`, ADR 0001 | Update и manual advisor одновременно реализованы и отнесены к backlog |

Воспроизведения выполнялись в удалённых после проверки временных fixtures. Исходники и внешние пользовательские проекты не изменялись.

## План для апрува

### 1. P0 — согласовать scope и фактический статус

Обновить активный план и оформить новое ADR, сохранив историю ADR 0001. Зафиксировать отдельно реализованные возможности, известные ограничения и будущую автоматизацию. Исправить утверждение о готовых workflow-specific root rules.

**Готово, когда:** README, plan, ADR и CLI одинаково описывают команды и ограничения. Hardening существующего update и manual advisor явно согласован; automatic merge, hooks и capture остаются отдельным backlog.

Объём: небольшой. Зависимости: нет.

### 2. P0 — сделать CLI предсказуемым для человека и CI

Ввести строгий список options по командам, проверять несовместимые комбинации, поддержать `--key=value` и help для отдельной команды. Использовать встроенный `node:util.parseArgs` там, где он упрощает реализацию. Вынести общий каталог agents/workflows/packs из дублирующихся списков.

В JSON-режиме stdout должен содержать ровно один JSON-документ. Путь proposal включать в результат, сообщения прогресса отправлять в stderr. Exit code должен зависеть от результата, а не от формата вывода. Структурировать ошибки с постоянными codes; документировать значения exit codes.

**Готово, когда:** invalid validate возвращает ненулевой code и в text, и в JSON; JSON + export разбирается; неизвестные flags и `--apply --dry-run` отклоняются до записи. Добавить regression tests этих сценариев.

Основание: [Node.js: util.parseArgs](https://nodejs.org/api/util.html#utilparseargsconfig) предоставляет типизированные options и strict parsing без сторонней зависимости.

Объём: небольшой/средний. Зависимости: 1.

### 3. P0 — защищать файлы при init и update

Ввести общий reviewable file plan: create / unchanged / modified / conflict, old/new hashes и unified diff. На update брать сохранённые settings, переопределять только явно переданные flags. При отсутствии или невалидности metadata выдавать понятное решение, а не автоматически считать все файлы управляемыми.

Для новых генераций сохранять manifest и hashes управляемых файлов. Existing projects без manifest сначала проходят review/adoption; никаких выводов о принадлежности файла только по имени. Пользовательские изменения считать конфликтом и оставлять для ручного merge. Для `.gitignore` предлагать добавление недостающих правил с сохранением существующих и учитывать negation/order.

Привязать apply к сохранённому proposal и проверке текущих hashes; свободный текст `--approval` остаётся пояснением, но не доказательством актуальности proposal. Проверять real paths, symlinks/junctions и выход за target. Для create применять exclusive write; для update — preflight, резервные копии и журнал восстановления. Не обещать атомарность всего набора файлов.

**Готово, когда:** custom rule и custom ignore сохраняются; изменённый после review файл блокирует apply; повторный apply не меняет результат; отказ/ошибка не скрывают частичные записи; режим preview не пишет target. Regression tests покрывают эти гарантии.

Основание: [Git: gitignore](https://git-scm.com/docs/gitignore) описывает порядок и отрицательные patterns; [Node.js: file system flags](https://nodejs.org/api/fs.html#file-system-flags) — exclusive create через `wx`. Proposal binding и conflict policy — проектные решения на основе найденного риска.

Объём: крупнее остальных пунктов; разделить на защиту текущей записи и последующий manifest/proposal apply. Зависимости: 1–2. Это hardening уже существующей команды, а не разрешение automatic merge engine.

### 4. P1 — соединить discovery с полезной генерацией

Сформировать общий discovery report с evidence: файл/поле, команда, рабочая директория, confidence, причина вывода и статус «найдено / предположено / выполнено». Начать с фактических Node scripts, packageManager, Python test configuration, Rust manifest и существующих CI commands. Не считать наличие `pyproject.toml` доказательством pytest, а `npm test` — обязательно unit tests.

Ограничить число файлов, размер чтения и глубину; исключить vendor/build/temp/secret paths, не следовать внешним links. Добавить focused discovery для init. Передавать подтверждённые команды и краткое описание проекта в reviewable generation plan. Для неизвестных проверок сохранять `Not configured`; при противоречиях показывать evidence для ручного выбора.

**Готово, когда:** JS-проект получает свои реальные commands, Python без test config не получает уверенного pytest, docs/no-code избегают фиктивной software matrix. Небольшой workspace анализируется в пределах заданного бюджета; commands никогда не запускаются только ради discovery.

Основание: [OpenAI: rethinking skills and prompts](https://developers.openai.com/blog/rethinking-skills-and-prompts-for-gpt-6-astra) рекомендует чтение документации по потребности задачи и пересмотр избыточных инструкций. Evidence и бюджеты discovery — наша конкретизация.

Объём: средний. Зависимости: 2–3.

### 5. P1 — сделать workflows и packs действующими инструкциями

Генерировать короткие различающиеся root sections: `light` — минимальная процедура, `task-first` — task с acceptance criteria, `spec-tdd` — spec и проверяемый цикл для тестируемых изменений. Давать точные ссылки и условия обращения к task/spec/pack docs; избегать обязательного чтения всех документов перед каждой правкой.

Approval policy сделать явной настройкой: сохранить текущий conservative default, предложить opt-in политику по риску. Уже согласованный scope не требует повторного апрува каждого шага. Для docs/no-code сохранить review/scenario checks; software TDD применять только там, где он подходит.

**Готово, когда:** отличие workflows проверяется по поведению инструкций, а не metadata; каждый выбранный pack достижим по ссылке с условием использования; root остаётся до 200 строк. Существующие проекты получают предложение изменения политики, а не тихую замену.

Основание: [Claude: effective instructions](https://code.claude.com/docs/en/memory#write-effective-instructions) рекомендует конкретность и согласованность; [OpenAI: ExecPlans](https://developers.openai.com/cookbook/articles/codex_exec_plans) показывает планы для сложных задач. Настраиваемая approval policy — предложение проекта, не требование этих источников.

Объём: средний. Зависимости: 1, 4.

### 6. P1 — исправить совместимость Codex/Claude и skills

Уточнить local override policy: для Codex документировать `AGENTS.override.md`, для Claude — `CLAUDE.local.md`; не представлять `AGENTS.local.md` как автоматически загружаемый файл. Сохранить legacy ignore entry для совместимости. Предупреждать, что Codex override заменяет root AGENTS на том же уровне, поэтому личный override не должен случайно исключить общие правила.

Генерировать skills в `.agents/skills` для Codex и `.claude/skills` для Claude, в обоих местах для combined mode из одного источника шаблона. Добавить Claude frontmatter для ручного вызова advisor. Проверять name/description, совпадение name с каталогом и ссылки ресурсов.

Оставить `CLAUDE.md` с `@AGENTS.md` совместимым baseline. В документации отметить прямую поддержку AGENTS в Claude Code v2.1.277+ и её ограничения; не менять режим автоматически по предполагаемой версии.

Опциональный starter skill pack из исходного плана: `clean-chat-handoff`, `feature-planner`, `review-agent`. Узкие triggers, минимальные descriptions, загрузка процедур по необходимости; repo-analyst добавлять только при отдельной доказанной пользе.

**Готово, когда:** нужный runtime обнаруживает сгенерированный advisor; combined outputs строятся из общего источника; неверный SKILL frontmatter отклоняется; новые skills остаются opt-in. Фактическую загрузку подтвердить коротким ручным smoke в каждом установленном runtime.

Основание: [OpenAI: AGENTS discovery](https://learn.chatgpt.com/docs/agent-configuration/agents-md), [OpenAI: local skills](https://learn.chatgpt.com/docs/build-skills), [Claude: memory](https://code.claude.com/docs/en/memory), [Claude: skills](https://code.claude.com/docs/en/skills), [Agent Skills specification](https://agentskills.io/specification).

Объём: средний. Зависимости: 1, 3, 5. Новые starter skills можно согласовать отдельно от исправления путей.

### 7. P1 — превратить validate в практичный doctor

Добавить versioned config schema и структурированные findings: severity, code, path, explanation, suggested fix. Сериализовать JSON metadata структурно. Проверять типы/null/schema version, обязательные артефакты, placeholders во всех generated files, внутренние ссылки и imports, skills frontmatter, размер root в строках и байтах.

Проверять реальные ignore semantics через `git check-ignore` при доступном Git; без Git явно сообщать о fallback. `onboard-existing --check` должен различать presence/config completeness и content validity. Детерминированные ошибки блокируют; подозрительные secret patterns, vague/conflicting rules — предупреждения с редактированным evidence. Не обещать полную семантическую проверку произвольного Markdown.

**Готово, когда:** некорректный config не вызывает stack trace; сломанная ссылка или skill выявляются; закомментированный ignore pattern не засчитывается; повреждённые инструкции не проходят content check. Результат одинаков в text и JSON по смыслу и exit code.

Объём: средний. Зависимости: 2, 5–6.

### 8. P2 — добавить компактный CI и проверяемую упаковку

Настроить Windows и Linux jobs для текущей поддерживаемой Node LTS; ещё одну поддерживаемую major проверять одним Linux job. Запускать существующий test suite, project validator, новые regression fixtures и локальную проверку npm package contents.

Задать явный `files` allowlist; проверить inclusion всех templates, включая `.agents`, и отсутствие `.local`, proposal archives и временных файлов. Smoke запускать из распакованного tarball и другого cwd. Сделать cookbook переносимым: относительные пути и отдельные shell examples.

**Готово, когда:** установленный из локального tarball CLI находит templates, работает вне checkout и проходит проверки на Windows/Linux. Публикация npm и создание remote не входят в этот пункт; `private: true` сохраняется.

Основание: [GitHub: building and testing Node.js](https://docs.github.com/en/actions/tutorials/build-and-test-code/nodejs), [npm: package.json files/bin/private](https://docs.npmjs.com/cli/v11/configuring-npm/package-json/).

Объём: небольшой/средний. Зависимости: 2–7.

### 9. P2 — измерять пользу шаблонов на задачах агентов

Сначала подготовить небольшой набор сценариев и ручную rubric: новая feature, typo fix, partial onboarding, dirty worktree, no-code review, handoff. Затем opt-in eval runs в доступных Codex/Claude runtimes с явной конфигурацией и бюджетом. Paid API не обязателен; никаких session hooks или фонового capture.

Оценивать outcome, выбор skill, сохранение user edits, корректность commands, число лишних approvals и объём root context. Сравнить baseline и новый template на одинаковых fixtures; записывать runtime/model/version и вариативность результатов. Не выдавать единичный успешный прогон за гарантию.

**Готово, когда:** есть воспроизводимые сценарии и baseline, видно, где новый шаблон улучшает результат или добавляет процесс. Детерминированные tests остаются обязательными; agent evals — отдельная opt-in проверка.

Основание: [OpenAI: testing agent skills systematically with evals](https://developers.openai.com/blog/eval-skills) предлагает outcome/process/style/efficiency checks и сравнение прогонов.

Объём: средний. Зависимости: 5–8. Реальные runs согласовать отдельно, если требуют платных ресурсов.

## Порядок реализации и граница апрува

1. **Первый пакет — пункты 1–3:** согласованная документация, исправленный CLI и защита пользовательских файлов. Рекомендуется одобрить первым.
2. **Второй пакет — пункты 4–7:** evidence-based generation, workflows, совместимость и validator. После review первого пакета.
3. **Третий пакет — пункты 8–9:** CI, локальная упаковка и измерение поведения агентов.

Каждый пункт — отдельная проверяемая порция изменений с обновлённой документацией и подходящими tests. Точные трудозатраты уточнять при реализации; наиболее сложен пункт 3.

Вне этого предложения: новые agent adapters, hooks, session capture/ledger automation, automatic merge, plugin packaging и публикация. Path-scoped generation оставить будущим отдельным решением; в этом этапе можно лишь объяснить существующие runtime semantics.

Пользователь одобрил весь план. Коммиты и remotes по-прежнему требуют отдельного разрешения согласно AGENTS.md.
