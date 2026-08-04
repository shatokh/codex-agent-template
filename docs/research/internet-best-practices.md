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

