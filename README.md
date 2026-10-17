# Curly - JSON Formatter & Tree Viewer

A Chrome extension that displays JSON in a clear and safe way. It works fully offline: no network requests, no analytics, no runtime dependencies.

The full specification and step-by-step plan live in [`SPEC.md`](SPEC.md) (in Russian). This file is a short introduction to the stack and the commands, written for people who have not worked with it before.

## Status

**Version 1.0.0 is implemented (steps 1–6)**: clicking the extension icon opens the viewer page, where you paste JSON and press Format (or Ctrl/Cmd+Enter) to get a colored tree with collapsible nodes, clickable `http(s)` links, a Raw/Parsed toggle, Expand/Collapse all and a theme drop-down (System, Light, Dark, Catppuccin Latte/Frappé/Macchiato/Mocha, Dracula, Gruvbox Dark/Light; saved between sessions). Invalid JSON shows an error with line, column and a caret marker. Selecting text on any page and choosing **Format selected JSON** from the right-click menu opens it in the viewer, already formatted. A JSON response opened directly in a tab (content types `application/json`, `text/json`, `*+json`) is formatted automatically; the "Auto-format JSON pages" switch in the viewer header turns this off. Inputs above roughly 2 MB are not formatted silently: the raw text is shown with a "Format anyway" button.

## The stack in plain words

| What | Why |
|---|---|
| **Node.js** (v22) | The runtime that executes development tools. The extension itself runs in the browser; Node is only needed for development and building. |
| **npm** | Package manager: installs tools into `node_modules/` and runs the scripts from `package.json`. |
| **TypeScript** | JavaScript with static type checking. Code is written in `.ts`; the browser runs the compiled JS. |
| **WXT** (`~0.20.x`) | A framework for browser extensions. It bundles the code, generates `manifest.json`, launches a browser with the extension loaded, and reloads it when files change. |
| **Biome** | A single tool instead of ESLint + Prettier: finds likely bugs (lint) and formats code. |
| **Vitest** | Test runner. It will be added only in release v2 (see `SPEC.md`). |

There are no UI frameworks (React, Vue, etc.). The interface is built with the plain DOM API.

### What is manifest.json

Every Chrome extension is described by a `manifest.json` file: name, version, permissions, scripts. **You do not write it by hand**: WXT generates it from `wxt.config.ts` and from the files in `src/entrypoints/`. After a build you can inspect the result in `.output/chrome-mv3/manifest.json`.

The project uses Manifest V3: background code runs as a service worker, which the browser may stop and restart at any time.

## Project structure

Currently in the repository:

```
src/                    # all extension source code (WXT `srcDir`)
  entrypoints/          #   extension "entry points"; WXT discovers them by file name
    background.ts       #     background script: clicking the icon opens viewer.html in a new tab; context menu on selected text
    content.ts          #     content script: auto-formats JSON pages (matches all URLs, exits at once on non-JSON)
    viewer/             #     viewer page (built as viewer.html): textarea, Format button, result area
      index.html
      main.ts
      style.css
  lib/                  #   code shared between entry points
    parse.ts            #     JSON parsing + error position (line/column)
    render.ts           #     JSON -> DOM tree (collapsible <details>), raw text, errors
    toolbar.ts          #     Raw/Parsed, Expand/Collapse all, theme and auto-format switches; formatText() builds a full result
    settings.ts         #     auto-format on/off flag, persisted in storage.local
    theme.ts            #     theme choice (system, light, dark, Catppuccin flavors, Dracula, Gruvbox Dark/Light), persisted in storage.local
    styles.css          #     shared styles and theme colors (classes prefixed with jv-)
  public/icon/          #   extension icons (16/32/48/128 px; placeholders drawn for now, to be replaced)
store/                  # Chrome Web Store listing drafts: description, single purpose, permission justification, privacy policy
fixtures/               # sample JSON files for manual testing
  simple.json           #   flat object
  nested.json           #   deep nesting
  edge-cases.json       #   empty {} and [], unicode, escapes, big number, URLs
  invalid-*.json        #   deliberately broken files (to test error messages)
  generate-large.mjs    #   generator for large.json (~5 MB)
wxt.config.ts           # WXT config: source dir, name, description, action (toolbar button)
biome.json              # linter/formatter settings
tsconfig.json           # TypeScript settings (extends .wxt/tsconfig.json)
package.json            # dependencies and npm scripts
SPEC.md                 # specification and step-by-step plan
CLAUDE.md               # instructions for Claude Code
```

Generated, not stored in git (see `.gitignore`):

```
node_modules/           # installed dependencies
.wxt/                   # service files and types that WXT creates by itself
.output/                # build output
  chrome-mv3/           #   production build (npm run build)
  chrome-mv3-dev/       #   dev build (npm run dev)
  *.zip                 #   archive for the store (npm run zip)
fixtures/large.json     # created by generate-large.mjs
```

The idea: **one render engine, three entry points**. The `viewer.html` page, the context menu on selected text, and the content script on JSON pages all use the same code from `src/lib/`.

## Initial setup

1. Install Node.js LTS (the project is tested on v22) and npm.
2. Install dependencies:
   ```
   npm install
   ```
   After installation `wxt prepare` runs automatically and creates the `.wxt/` folder.
3. `npm run dev` needs a Chromium-based browser that WXT can launch. Branded Google Chrome (including the Flatpak build) does not work for this: since version 137 it ignores the `--load-extension` flag WXT uses to load the extension. Use a separate **Chrome for Testing** instead:
   ```
   npx @puppeteer/browsers install chrome@stable --path ~/tools/chrome-for-testing
   ```
   Then point WXT to it in `~/.bashrc`:
   ```
   export CHROME_PATH="$HOME/tools/chrome-for-testing/current/chrome"
   ```
   (`current` is a symlink to the `chrome-linux64` directory of the installed version; to upgrade the browser, just repoint the symlink.) This does not touch your regular Chrome profile or bookmarks.

## Commands

Run all commands from the project root.

### Development

| Command | What it does |
|---|---|
| `npm run dev` | Builds the extension into `.output/chrome-mv3-dev/`, opens Chrome for Testing with the extension loaded, and watches files: after a code change it rebuilds and reloads the extension automatically. |
| `npm run build` | Production build into `.output/chrome-mv3/`. Check the resulting `manifest.json` (it must not contain extra permissions). |
| `npm run zip` | Builds and packs the extension into `.output/json-viewer-extension-<version>-chrome.zip` for upload to the Chrome Web Store (the archive name comes from the package name in `package.json`). |

**How to stop `npm run dev`:** press `Ctrl+C` in the terminal where it is running. WXT closes the browser itself. If something hangs:
```
pgrep -fa 'chrome-for-testing|wxt'
pkill -f chrome-for-testing
pkill -f wxt
```

### Code quality

| Command | What it does |
|---|---|
| `npm run compile` | `tsc --noEmit`: TypeScript type check without emitting files. Reports type errors. |
| `npm run check` | `biome check .`: linter + formatting check for the whole project. |
| `npx biome check --write .` | Same, but automatically fixes what it can (formatting, import order). |

After every development step both checks (`compile` and `check`) must pass without errors.

### Fixtures and manual testing

Generate a large file (~5 MB) for performance testing:
```
node fixtures/generate-large.mjs
```

Serve the `fixtures/` folder over HTTP to test auto-formatting of JSON pages (step 5):
```
npx serve fixtures
```
The files are then available at addresses like `http://localhost:3000/nested.json`. Stop with `Ctrl+C`.

### Installing a build into regular Chrome (without `npm run dev`)

This is how to install the extension into your everyday Chrome, e.g. for a final check before publishing:
1. Run `npm run build`.
2. Open `chrome://extensions` and enable "Developer mode".
3. Click "Load unpacked" and select the `.output/chrome-mv3/` folder.

After code changes, rebuild and click the reload button on the extension card.

## How the work is organized

Development follows the steps in `SPEC.md`. Each step is built in its own `feature/<name>` branch (e.g. `feature/v1-step-3`) and ends with a commit like `v1 step 3: collapsible tree and themes`, followed by a stop for review. After approval the branch is merged into `master` with `git merge --no-ff`. The next step starts only after that.

## Notes and known limitations

Where the project deliberately differs from `SPEC.md`, the differences are logged in section 8 of that file. In short:

- All extension code lives in `src/`: `wxt.config.ts` sets both `srcDir` and `publicDir` (with `srcDir` alone, WXT keeps looking for `public/` in the project root).
- The native `JSON.parse` is used for parsing. When its error message has no position (e.g. `Unexpected token ']'...`), a small strict JSON scanner finds the line and column of the error. It is used only to locate the error, never to produce values.
- Because values come from the native parser, numbers beyond double precision lose it (`12345678901234567890` is shown as `12345678901234567000`), and integer-like object keys (`"1"`, `"2"`) are shown in ascending order rather than source order.
- Themes use CSS `light-dark()`, so the manifest requires Chrome 123 or newer. Permissions: `storage` (theme and auto-format preferences, and `storage.session` to hand the selected text to the viewer), `contextMenus` (the right-click item), and access to all sites for the content script, which is what makes Chrome warn that the extension can read and change data on all websites. The content script looks at a page only if its content type is JSON, and never sends anything anywhere. The selected text is deleted from storage as soon as the viewer reads it.
- On a JSON page the original text stays untouched when the JSON is invalid, too large (over 10 MB) or needs consent (over 2 MB); a message appears above it instead. Local `file://` pages are formatted only if "Allow access to file URLs" is enabled for the extension in `chrome://extensions`. JSON served as `text/plain` is not detected.
- Rendering is plain DOM, about 2.5–3.5 s per MB of JSON; a 5 MB file takes roughly 13–17 s during which the tab is unresponsive. Collapse/Expand all rebuild the tree (closing thousands of existing `<details>` is quadratic in Chrome). Inputs over 10 MB are shown as raw text only.
- `npm install` also runs `wxt prepare` (the `postinstall` script) to generate `.wxt/`.
- `biome.json` ignores `fixtures/invalid-*.json` and `fixtures/large.json`: one is deliberately broken JSON, the other is huge and generated.
- `web-ext.config.ts` (personal WXT launcher overrides) is in `.gitignore`. It is not needed when `CHROME_PATH` is set.

## License

Copyright (C) 2026 <AUTHOR: to be filled in before publishing>

This program is free software: you can redistribute it and/or modify it under the terms of the GNU General Public License version 3 (SPDX: `GPL-3.0-only`). It is distributed in the hope that it will be useful, but without any warranty. The full text is in [`LICENSE`](LICENSE).

`src/public/LICENSE` is a copy of that file; it is shipped inside the extension package next to `THIRD-PARTY-NOTICES.txt`. Keep both copies identical.

## Third-party software

**Included in the extension package** (the extension has no runtime dependencies; the build tool adds a small part of its own code). Their license notices are in [`src/public/THIRD-PARTY-NOTICES.txt`](src/public/THIRD-PARTY-NOTICES.txt), which ships inside the package:

| Component | Version | License | Link |
|---|---|---|---|
| WXT | 0.20.27 | MIT | https://wxt.dev, https://github.com/wxt-dev/wxt |
| @wxt-dev/browser | 0.2.9 | MIT | https://github.com/wxt-dev/wxt/tree/main/packages/browser |

**Development tools only** (used to build and check the code, not included in the package):

| Tool | License | Link |
|---|---|---|
| Vite (used by WXT) | MIT | https://vite.dev |
| TypeScript | Apache-2.0 | https://www.typescriptlang.org |
| Biome | MIT OR Apache-2.0 | https://biomejs.dev |
| Chrome for Testing (manual testing in `npm run dev`) | see its own license | https://googlechromelabs.github.io/chrome-for-testing/ |

When a dependency is added or upgraded, update this section and `THIRD-PARTY-NOTICES.txt` to match what actually ends up in the bundle.

## Hard constraints

- Zero network requests; everything works offline.
- Zero runtime dependencies (dev tooling only).
- Permissions are limited to `contextMenus`, `storage`, and host access for the content script.
- No `innerHTML` with user data.
