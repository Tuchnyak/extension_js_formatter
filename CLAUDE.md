# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Состояние репозитория

Проект — офлайн JSON Viewer (Chrome-расширение, MV3), разрабатывается по шагам из `SPEC.md` (источник истины; перед работой читать целиком, он на русском). Реализован Шаг 1 v1 (скелет: `background.ts`, заглушка `viewer.html`, фикстуры). Остальное — в спеке; `lib/` и `content.ts` ещё не созданы. `README.md` (на английском, проект открытый) описывает стек, структуру и команды — при изменении структуры или команд обновлять и его.

## Правила работы (из SPEC.md, раздел 0)

- Работа строго по шагам, один шаг за сессию. После шага — остановиться и выдать: что сделано, результат `npm run compile` и `npx biome check .`, чек-лист ручной проверки шага. Следующий шаг — только после подтверждения владельца.
- Каждый шаг достраивает предыдущий. Если нужно существенно менять код прошлых шагов — сначала объяснить почему.
- Если спека расходится с реальностью (API WXT/Chrome, несуществующая команда, нужен новый permission) — остановиться и спросить, не импровизировать.
- Сверяться с актуальной документацией WXT (wxt.dev): в 0.20.x нет `wxt/sandbox`; `defineBackground`, `defineContentScript`, `browser` — через auto-imports.
- Коммит в конце каждого шага: `v1 step 3: collapsible tree and themes`.
- UI и комментарии в коде — на английском; отчёты владельцу — на русском.

## Стек и команды

WXT (vanilla + TypeScript, версия `~0.20.x`, не `^`), npm, Biome (один `biome.json` в корне), Vitest — только начиная с v2. UI-фреймворков нет. Runtime-зависимостей нет (только dev).

Скрипты в `package.json`: `npm run dev` (wxt), `build`, `zip`, `compile` (`tsc --noEmit`), `check` (`biome check .`); с v2 добавится `npm run test`.

Окружение: `npm run dev` запускает браузер через `CHROME_PATH` (в `~/.bashrc` указывает на Chrome for Testing в `~/tools/chrome-for-testing/current/chrome`). Обычный Flatpak Google Chrome не подходит — в нём отключён `--load-extension`. Личный `web-ext.config.ts` в `.gitignore`. `biome.json` исключает `fixtures/invalid-*.json` и `large.json` (намеренно битый/огромный JSON). `dev` — интерактивный, из агента не запускать; проверку в браузере делает владелец.

Ручное тестирование: `fixtures/` (simple, nested, edge-cases, два invalid, `generate-large.mjs` → `large.json` ~5 МБ, в `.gitignore`); для проверки content script — `npx serve fixtures`.

## Архитектура

Ключевой принцип: **один движок рендера, три точки входа**. `lib/parse.ts`, `lib/render.ts`, `lib/toolbar.ts`, `lib/styles.css` общие для viewer-страницы и content script, без дублирования. Все CSS-классы с префиксом `jv-`.

- `lib/parse.ts` — обёртка над `JSON.parse`; line/column ошибки считаются самостоятельно из `position N` в сообщении V8 (формат может меняться), без позиции — только `message`.
- `lib/render.ts` — `renderJson(value)` строит DOM рекурсивно; `MAX_RENDER_BYTES = 10 MB` — выше дерево не строится, показывается raw + уведомление.
- Точки входа: (1) `content.ts` на `<all_urls>` подменяет body на JSON-URL (первая строка — проверка `document.contentType`, иначе мгновенный `return`); (2) клик по иконке → `background.ts` открывает `viewer.html` (без popup, нужен `action: {}` в `wxt.config.ts`); (3) контекстное меню на выделении → выделенный текст кладётся в `storage.session` под случайным ключом, открывается `viewer.html?id=<key>`, viewer читает значение и сразу удаляет ключ. Меню создаётся в `runtime.onInstalled` (service worker MV3 не постоянный).
- v2: `lib/sql.ts` — чистая функция `jsonToInsert`, покрытая Vitest; на JSON-страницах — только кнопка «Open in Viewer» через тот же `storage.session`.

## Жёсткие ограничения (нарушение = баг)

- Ноль сетевых запросов (никаких fetch, аналитики, CDN-шрифтов/скриптов).
- Ноль runtime-зависимостей: парсинг — нативный `JSON.parse`, рендер и подсветка — свой код.
- Permissions только `contextMenus`, `storage` + host-доступ `<all_urls>` для content script. Любой новый — только после согласования.
- Никакого `innerHTML` с пользовательскими данными — только `createElement` / `textContent`. Ссылки — только `http:`/`https:`, с `target="_blank"` и `rel="noopener noreferrer"`.
- Хранятся только тема (`storage.local`) и временно выделенный текст (`storage.session`).
- Функции сверх спеки не добавлять; бэклог (раздел 7) — только по отдельному решению владельца.
