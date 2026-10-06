# Internet Best Practices Notes

Дата: 2026-08-04

Эти заметки собраны для расширения плана `codex-agent-template`. Они не являются отдельной спецификацией реализации.

## Использованные источники

- GitHub Copilot repository custom instructions: https://docs.github.com/en/copilot/how-tos/copilot-on-github/customize-copilot/add-custom-instructions/add-repository-instructions
- Claude Code memory and `CLAUDE.md`: https://code.claude.com/docs/en/memory
- Cline rules: https://docs.cline.bot/customization/cline-rules
- Gemini CLI `GEMINI.md`: https://google-gemini.github.io/gemini-cli/docs/cli/gemini-md.html
- AGENTS.md open format: https://github.com/agentsmd/agents.md
- Aider usage tips: https://github.com/Aider-AI/aider/blob/main/aider/website/docs/usage/tips.md

## Выводы для v1

- Канонический файл правил должен быть один.
- Для v1 поддерживаем только `codex`, `claude`, `codex+claude`.
- Для `codex+claude` каноническим файлом остается `AGENTS.md`, а `CLAUDE.md` импортирует его через `@AGENTS.md`.
- Root rules должны быть короткими: примерно 150-200 строк.
- Длинные процедуры надо выносить в skills, docs или future path-scoped rules.
- Discovery phase обязателен, но должен иметь разную глубину для нового и существующего проекта.
- Verification matrix должна быть adaptive, а не всегда полной.
- Local overrides и секреты должны быть gitignored.
- Quality validation должна искать vague rules, unresolved placeholders, conflicting rules, secrets patterns и чрезмерно длинные sections.

## Backlog для v2/v3

- Gemini adapter.
- Cursor/Copilot/Cline/Roo/Windsurf adapters.
- Real path-scoped rule generation.
- Hooks.
- Session artifact advisor.
- Update/merge engine для существующих проектов.

## Обновление 2026-10-06

Первоначальные заметки выше — исторический анализ. Пользователь одобрил guarded update, manual advisor и опциональные skills; автоматический merge, новые adapters и hooks остаются вне scope согласно [ADR 0002](../decisions/0002-approved-reliability-and-skills.md).

- [OpenAI: инструкции и skills](https://developers.openai.com/blog/rethinking-skills-and-prompts-for-gpt-6-astra) — узкие triggers, короткий root и чтение по потребности задачи.
- [Codex: AGENTS.md](https://learn.chatgpt.com/docs/agent-configuration/agents-md) — native override заменяет same-level base; учитывать реальный порядок загрузки.
- [Codex: skills](https://learn.chatgpt.com/docs/build-skills) и [Claude: skills](https://code.claude.com/docs/en/skills) — разные repo locations, progressive disclosure и управление invocation.
- [Claude: memory](https://code.claude.com/docs/en/memory) — точные инструкции и ограничения совместимости импорта AGENTS.
- [Agent Skills specification](https://agentskills.io/specification) — проверяемые name/description и структура skill.
- [Node.js: parseArgs](https://nodejs.org/api/util.html#utilparseargsconfig), [exclusive file flags](https://nodejs.org/api/fs.html#file-system-flags), [Git ignore semantics](https://git-scm.com/docs/gitignore) — основа конкретных CLI/write checks.
- [GitHub Node CI](https://docs.github.com/en/actions/tutorials/build-and-test-code/nodejs), [npm package files](https://docs.npmjs.com/cli/v11/configuring-npm/package-json/) — компактная матрица и проверяемое содержимое tarball.
- [OpenAI skill evals](https://developers.openai.com/blog/eval-skills) — оценивать результат, процедуру и эффективность на одинаковых fixtures.
- [Node.js releases](https://nodejs.org/en/about/previous-releases) — на дату исследования Node 22/24 поддерживаются как LTS, Node 20 уже EOL; новая минимальная версия CLI — 22.

Подробные привязки к найденным проблемам и критерии реализации сохранены в [одобренном proposal](../plans/upgrade-proposal-2026-10-06.md). Эти источники обосновывают подходы; наши manifest/plan conflict policies — проектные решения, а не стандарты, навязанные документацией.
