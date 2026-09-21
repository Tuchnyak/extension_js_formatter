# JSON Viewer (working title `<EXTENSION_NAME>`)

A Chrome extension that displays JSON in a clear and safe way. It works fully offline: no network requests, no analytics, no runtime dependencies.

The full specification and step-by-step plan live in [`SPEC.md`](SPEC.md) (in Russian). This file is a short introduction to the stack and the commands, written for people who have not worked with it before.

## Status

**Step 1** (project skeleton) is implemented: the extension builds, and clicking its icon opens a placeholder page. The actual JSON viewer (parsing, tree, themes, context menu, auto-formatting of JSON pages) is added in steps 2–5. The "Planned" blocks below describe what is not in the repository yet.

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

Every Chrome extension is described by a `manifest.json` file: name, version, permissions, scripts. **You do not write it by hand**: WXT generates it from `wxt.config.ts` and from the files in `entrypoints/`. After a build you can inspect the result in `.output/chrome-mv3/manifest.json`.

The project uses Manifest V3: background code runs as a service worker, which the browser may stop and restart at any time.

## Project structure

Currently in the repository:

```
entrypoints/            # extension "entry points"; WXT discovers them by file name
  background.ts         #   background script: clicking the icon opens viewer.html in a new tab
  viewer.html           #   viewer page (a "Viewer works" placeholder for now)
fixtures/               # sample JSON files for manual testing
  simple.json           #   flat object
  nested.json           #   deep nesting
  edge-cases.json       #   empty {} and [], unicode, escapes, big number, URLs
  invalid-*.json        #   deliberately broken files (to test error messages)
  generate-large.mjs    #   generator for large.json (~5 MB)
public/icon/            # extension icons (empty for now, added in step 6)
wxt.config.ts           # WXT config: name, description, action (toolbar button)
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

Planned (steps 2–5, `SPEC.md` section 3.1):

```
entrypoints/content.ts  # auto-format JSON pages (opened directly by URL)
lib/parse.ts            # JSON parsing + error position (line/column)
lib/render.ts           # JSON -> DOM tree
lib/toolbar.ts          # Raw/Parsed, Expand/Collapse, theme switch
lib/theme.ts            # System/Light/Dark theme
lib/styles.css          # shared styles (classes prefixed with jv-)
```

The idea: **one render engine, three entry points**. The `viewer.html` page, the context menu on selected text, and the content script on JSON pages all use the same code from `lib/`.

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
| `npm run zip` | Builds and packs the extension into `.output/*.zip` for upload to the Chrome Web Store. |

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

Development follows the steps in `SPEC.md`: each step ends with a commit like `v1 step 3: collapsible tree and themes`, followed by a stop for review. The next step starts only after approval.

## Hard constraints

- Zero network requests; everything works offline.
- Zero runtime dependencies (dev tooling only).
- Permissions are limited to `contextMenus`, `storage`, and host access for the content script.
- No `innerHTML` with user data.
