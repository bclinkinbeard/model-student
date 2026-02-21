# Model Student — ML Experimentation Web App

## Overview

A multi-page web app for experimenting with different ML models that run directly in the browser. Each page focuses on a distinct model/task, providing a self-contained playground to load a model, feed it input, and see results. No backend required — all inference happens client-side via [Transformers.js](https://huggingface.co/docs/transformers.js). Dark mode only — no theme toggle.

## Reference: voice-notes Pattern

The voice-notes app establishes a clean pattern we carry forward:

- **Vite + vanilla JS** — no framework overhead, fast dev loop
- **`@huggingface/transformers`** — imports `pipeline()` to load models by task and model ID
- **Lazy loading with promise caching** — the model isn't fetched until first use; a cached promise prevents duplicate loads
- **Graceful fallbacks** — errors and low-confidence results fall back to neutral/empty states
- **Quantized models** — uses `{ dtype: 'q8' }` (maps to `_quantized` ONNX suffix) to keep download sizes and memory reasonable

---

## Architecture

```
model-student/
├── index.html                      ← landing page (static, no JS)
├── app.css                         ← shared design system + component styles
├── pages/
│   ├── sentiment/
│   │   ├── index.html
│   │   ├── sentiment.js            ← thin DOM wiring (imports from logic)
│   │   └── sentiment-logic.js      ← pure functions (testable in Node)
│   ├── image-classify/
│   │   ├── index.html
│   │   ├── image-classify.js
│   │   └── image-classify-logic.js
│   └── summarize/
│       ├── index.html
│       ├── summarize.js
│       └── summarize-logic.js
├── lib/
│   ├── model-loader.js             ← shared lazy-load + caching + progress
│   └── model-status.js             ← pure state machine + progress formatting
├── tests/
│   ├── unit/
│   │   ├── model-loader.test.js
│   │   ├── model-status.test.js
│   │   ├── sentiment-logic.test.js
│   │   ├── image-classify-logic.test.js
│   │   └── summarize-logic.test.js
│   ├── e2e/
│   │   ├── landing.spec.js
│   │   ├── sentiment.spec.js
│   │   ├── image-classify.spec.js
│   │   ├── summarize.spec.js
│   │   ├── helpers/
│   │   │   └── mock-model.js       ← shared Playwright mock for pipeline
│   │   └── fixtures/
│   │       └── test-image.jpg      ← minimal 1x1 JPEG for tests
│   └── screenshots/                ← visual regression baselines (gitignored)
├── playwright.config.js
├── package.json
├── vite.config.js
└── .gitignore
```

### Logic / Wiring Split (TDD Architecture)

Each page's JavaScript is split into two files:

- **`*-logic.js`** — Pure functions only: result formatting, input validation, data transformations, constants. Zero DOM or browser API dependencies. Fully testable under `node --test`.
- **`*.js`** — Thin DOM wiring layer: `querySelector`, `addEventListener`, `innerHTML` mutations, calls to `loadModel` and the pipeline. Tested via E2E (Playwright), not unit tests.

This split is the core TDD enabler — all business logic can have failing tests written before implementation.

### Key decisions

- **Multi-page app (MPA) via Vite** — each experiment is its own HTML entry point. Vite supports this with `rollupOptions.input` for builds and `appType: 'mpa'` to disable SPA fallback in dev. Pages are independent so loading one model doesn't pull in another's code.
- **Shared `model-loader.js`** — wraps `pipeline()` with lazy-load, promise-caching, and progress callback support. Each page calls it with a task name and model ID.
- **Vanilla JS** — matches voice-notes. No React/Vue/Svelte. Each page is a standalone script that wires up its own DOM.
- **Dark mode only** — single theme, no toggle. All colors defined as CSS custom properties.
- **Root deployment assumed** — no `base` config needed. All asset links use absolute paths (e.g., `/app.css`).

---

## package.json

```json
{
  "name": "model-student",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "test:unit": "node --test tests/unit/*.test.js",
    "test:e2e": "npx playwright test",
    "test:e2e:update-screenshots": "npx playwright test --update-snapshots",
    "test": "npm run test:unit && npm run test:e2e"
  },
  "dependencies": {
    "@huggingface/transformers": "^3.4.0"
  },
  "devDependencies": {
    "vite": "^6.1.0",
    "@playwright/test": "^1.50.0",
    "@axe-core/playwright": "^4.10.0"
  }
}
```

Notes:
- `"type": "module"` — required for ES module `import`/`export` in all JS files and test files
- Pin `@huggingface/transformers` to `^3.4.0` (latest stable v3). Do NOT use v4/`@next`
- Unit tests use Node's built-in `node:test` and `node:assert` — no test framework dependency
- Playwright for E2E, screenshot, and accessibility testing
- `@axe-core/playwright` for automated WCAG AA accessibility checks

## .gitignore

```
node_modules/
dist/
test-results/
playwright-report/
tests/screenshots/
```

---

## vite.config.js

```js
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  appType: 'mpa',
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        sentiment: resolve(__dirname, 'pages/sentiment/index.html'),
        'image-classify': resolve(__dirname, 'pages/image-classify/index.html'),
        summarize: resolve(__dirname, 'pages/summarize/index.html'),
      },
    },
  },
  optimizeDeps: {
    exclude: ['@huggingface/transformers'],
  },
});
```

Critical details:
- **`appType: 'mpa'`** — disables SPA history fallback so nested `index.html` files route correctly in dev
- **`optimizeDeps.exclude`** — prevents Vite from pre-bundling `@huggingface/transformers` with esbuild, which chokes on its WASM/ONNX runtime imports
- All inter-page links use paths like `/pages/sentiment/` (trailing slash serves `index.html`)

---

## Design System (app.css)

Dark mode only. All values as CSS custom properties.

### CSS Variables

```css
:root {
  /* Backgrounds */
  --bg-primary: #0e1117;
  --bg-secondary: #161b22;
  --bg-tertiary: #1c2128;
  --bg-hover: #21262d;
  --bg-active: #282e36;

  /* Borders */
  --border-default: #30363d;
  --border-subtle: #21262d;
  --border-focus: #58a6ff;

  /* Text */
  --text-primary: #e6edf3;
  --text-secondary: #8b949e;
  --text-tertiary: #6e7681;
  --text-link: #58a6ff;

  /* Accent (teal-green) */
  --accent: #39d98a;
  --accent-hover: #2fb872;
  --accent-active: #27a163;
  --accent-subtle: rgba(57, 217, 138, 0.12);

  /* Semantic */
  --positive: #39d98a;
  --negative: #f47067;
  --warning: #e3b341;
  --info: #58a6ff;

  /* Shadows */
  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.3);
  --shadow-md: 0 4px 12px rgba(0, 0, 0, 0.4);
  --shadow-lg: 0 8px 24px rgba(0, 0, 0, 0.5);
  --shadow-glow: 0 0 20px rgba(57, 217, 138, 0.15);

  /* Typography */
  --font-sans: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  --font-mono: 'JetBrains Mono', 'Fira Code', 'Consolas', monospace;
  --font-size-xs: 0.75rem;
  --font-size-sm: 0.875rem;
  --font-size-base: 1rem;
  --font-size-lg: 1.125rem;
  --font-size-xl: 1.5rem;
  --font-size-2xl: 2rem;
  --font-size-3xl: 2.5rem;
  --line-height-tight: 1.25;
  --line-height-normal: 1.5;
  --line-height-relaxed: 1.75;
  --font-weight-normal: 400;
  --font-weight-medium: 500;
  --font-weight-semibold: 600;
  --font-weight-bold: 700;

  /* Spacing (4px base) */
  --space-1: 0.25rem;
  --space-2: 0.5rem;
  --space-3: 0.75rem;
  --space-4: 1rem;
  --space-5: 1.25rem;
  --space-6: 1.5rem;
  --space-8: 2rem;
  --space-10: 2.5rem;
  --space-12: 3rem;
  --space-16: 4rem;

  /* Radii */
  --radius-sm: 6px;
  --radius-md: 8px;
  --radius-lg: 12px;
  --radius-xl: 16px;
  --radius-full: 9999px;

  /* Transitions */
  --transition-fast: 150ms ease;
  --transition-base: 250ms ease;
  --transition-slow: 400ms ease;

  /* Layout */
  --content-max-width: 720px;
  --landing-max-width: 960px;
  --header-height: 64px;
}
```

### Global Resets

```css
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
html { font-size: 16px; -webkit-font-smoothing: antialiased; }
body {
  font-family: var(--font-sans);
  font-size: var(--font-size-base);
  line-height: var(--line-height-normal);
  color: var(--text-primary);
  background-color: var(--bg-primary);
  min-height: 100vh;
  min-width: 320px;
}
```

### Font Loading

Each HTML file includes:
```html
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono&display=swap" rel="stylesheet" />
```

### Shared Favicon

Every page includes:
```html
<link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>&#x1F393;</text></svg>">
```

### Global Styles

```css
/* Scrollbar */
::-webkit-scrollbar { width: 8px; }
::-webkit-scrollbar-track { background: var(--bg-primary); }
::-webkit-scrollbar-thumb { background: var(--border-default); border-radius: var(--radius-full); }
::-webkit-scrollbar-thumb:hover { background: var(--text-tertiary); }

/* Selection */
::selection { background: rgba(57, 217, 138, 0.3); color: var(--text-primary); }

/* Focus */
:focus-visible { outline: 2px solid var(--border-focus); outline-offset: 2px; }

/* Links */
a { color: var(--text-link); text-decoration: none; }
a:hover { text-decoration: underline; }
```

---

## Component Patterns

### Primary Button

```css
.btn-primary {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  padding: var(--space-3) var(--space-6);
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-semibold);
  font-family: var(--font-sans);
  color: #0e1117;
  background: var(--accent);
  border: none;
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: background var(--transition-fast), transform var(--transition-fast), box-shadow var(--transition-fast);
  min-width: 140px;
  height: 44px;
}
.btn-primary:hover { background: var(--accent-hover); box-shadow: var(--shadow-glow); }
.btn-primary:active { background: var(--accent-active); transform: scale(0.97); }
.btn-primary:disabled { opacity: 0.4; cursor: not-allowed; pointer-events: none; }
```

When loading (inference in progress): replace text with CSS spinner, add `pointer-events: none`.

### Textarea

```css
.textarea {
  width: 100%;
  min-height: 160px;
  padding: var(--space-3) var(--space-4);
  font-size: var(--font-size-base);
  font-family: var(--font-sans);
  color: var(--text-primary);
  background: var(--bg-tertiary);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-md);
  outline: none;
  resize: vertical;
  line-height: var(--line-height-normal);
  transition: border-color var(--transition-fast), box-shadow var(--transition-fast);
}
.textarea::placeholder { color: var(--text-tertiary); }
.textarea:hover { border-color: var(--text-secondary); }
.textarea:focus { border-color: var(--border-focus); box-shadow: 0 0 0 3px rgba(88, 166, 255, 0.2); }
```

### File Drop Zone (Image Classification)

```css
.drop-zone {
  width: 100%;
  min-height: 200px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--space-3);
  padding: var(--space-8);
  background: var(--bg-tertiary);
  border: 2px dashed var(--border-default);
  border-radius: var(--radius-lg);
  cursor: pointer;
  transition: border-color var(--transition-fast), background var(--transition-fast);
}
.drop-zone:hover { border-color: var(--accent); background: rgba(57, 217, 138, 0.05); }
.drop-zone--dragover { border-color: var(--accent); background: rgba(57, 217, 138, 0.1); border-style: solid; }
.drop-zone--has-image { border-style: solid; border-color: var(--border-default); cursor: default; }
```

Default content: upload arrow SVG (32px, `var(--text-secondary)`) + "Drop an image here or click to upload" + "PNG, JPG, WebP" subtitle.

When image is loaded: show `<img>` preview (`max-height: 300px; max-width: 100%; object-fit: contain;`) + "Change image" text link. Clicking "Change image" clears the result area, resets the drop zone to default state, and opens the file picker.

Hidden `<input type="file" accept="image/*">` triggered on click.

### CSS Spinner

```css
.spinner {
  width: 18px;
  height: 18px;
  border: 2px solid transparent;
  border-top-color: currentColor;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
  display: inline-block;
}
@keyframes spin { to { transform: rotate(360deg); } }
```

### Progress Bar

```css
.progress-bar-track {
  width: 100%;
  height: 6px;
  background: var(--bg-tertiary);
  border-radius: var(--radius-full);
  overflow: hidden;
}
.progress-bar-fill {
  height: 100%;
  background: var(--accent);
  border-radius: var(--radius-full);
  transition: width var(--transition-base);
}
.progress-bar-fill--indeterminate {
  width: 40%;
  animation: indeterminate 1.5s ease-in-out infinite;
}
@keyframes indeterminate {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(350%); }
}
```

### Result Area

```css
.result-area {
  padding: var(--space-6);
  background: var(--bg-secondary);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-lg);
  animation: fadeSlideIn var(--transition-slow) ease forwards;
}
@keyframes fadeSlideIn {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}
```

Result area is NOT in the DOM until inference completes. JS creates and inserts it, triggering the animation.

### Error Result

```css
.result-area--error {
  background: rgba(244, 112, 103, 0.08);
  border-color: var(--negative);
  color: var(--negative);
}
```

---

## Landing Page

### Layout

No sticky header — the hero section is the header. No JavaScript needed (static HTML + CSS).

```
+----------------------------------------------------------+
|                                                            |
|  "Model Student" — 2.5rem, bold, centered                 |
|  "Run ML models in your browser. No server required."     |
|  — text-secondary, 1.125rem, centered                     |
|                                                            |
|  ┌──────────────────┐  ┌──────────────────┐              |
|  │ 🎭                │  │ 🖼️               │              |
|  │ Sentiment         │  │ Image             │              |
|  │ Analysis          │  │ Classification    │              |
|  │                   │  │                   │              |
|  │ Detect whether    │  │ Identify objects   │              |
|  │ text is positive  │  │ in any image with  │              |
|  │ or negative.      │  │ top-5 predictions. │              |
|  │                   │  │                   │              |
|  │ [NLP · ~67 MB]    │  │ [Vision · ~88 MB]  │              |
|  └──────────────────┘  └──────────────────┘              |
|  ┌──────────────────┐                                     |
|  │ 📝                │                                     |
|  │ Text              │                                     |
|  │ Summarization     │                                     |
|  │                   │                                     |
|  │ Condense long     │                                     |
|  │ text into a short │                                     |
|  │ summary.          │                                     |
|  │                   │                                     |
|  │ [NLP · ~284 MB]   │                                     |
|  └──────────────────┘                                     |
|                                                            |
|  "Powered by Transformers.js" — text-tertiary, centered   |
+----------------------------------------------------------+
```

### Card Grid

- Container: `max-width: var(--landing-max-width)` (960px), centered, `padding: 0 var(--space-6)`
- Grid: `display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: var(--space-6);`
- Each card is a clickable `<a>` wrapping its content

### Experiment Card

- Background: `var(--bg-secondary)`, border: `1px solid var(--border-default)`, radius: `var(--radius-lg)`, padding: `var(--space-8)`
- Icon: emoji at 40px font-size (`🎭` Sentiment, `🖼️` Image, `📝` Summarize)
- Title: `var(--font-size-xl)`, `var(--font-weight-semibold)`, margin-top: `var(--space-4)`
- Description: `var(--font-size-sm)`, `var(--text-secondary)`, margin-top: `var(--space-2)`
- Meta tag: pill at bottom — `background: var(--accent-subtle); color: var(--accent); font-size: var(--font-size-xs); padding: var(--space-1) var(--space-3); border-radius: var(--radius-full);`
- Shows task type + approximate download size (e.g., "NLP · ~67 MB")

### Card Hover/Active

```css
.experiment-card {
  transition: transform var(--transition-base), border-color var(--transition-base), box-shadow var(--transition-base);
  text-decoration: none;
  color: inherit;
  display: block;
}
.experiment-card:hover {
  transform: translateY(-2px);
  border-color: var(--accent);
  box-shadow: var(--shadow-glow);
  text-decoration: none;
}
.experiment-card:active {
  transform: translateY(0);
  box-shadow: var(--shadow-sm);
}
```

### Hero

- Container: centered text, `padding: var(--space-16) 0 var(--space-10) 0`
- Title: `var(--font-size-3xl)`, bold — drops to `var(--font-size-2xl)` below 480px
- Subtitle: `var(--font-size-lg)`, `var(--text-secondary)`, max-width 480px, centered

### Footer

- Centered, `padding: var(--space-12) 0 var(--space-8)`, `var(--text-tertiary)`, `var(--font-size-sm)`
- "Powered by Transformers.js" — "Transformers.js" links to docs (new tab)

---

## Experiment Page Layout

### Canonical HTML Template

Every experiment page follows this structure:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Sentiment Analysis — Model Student</title>
  <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>&#x1F393;</text></svg>">
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono&display=swap" rel="stylesheet" />
  <link rel="stylesheet" href="/app.css" />
</head>
<body>
  <header class="experiment-header">
    <div class="experiment-header-inner">
      <a href="/" class="back-link">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="10" y1="3" x2="5" y2="8"/><line x1="5" y1="8" x2="10" y2="13"/>
        </svg>
        <span>Experiments</span>
      </a>
      <h1 class="experiment-title">Sentiment Analysis</h1>
    </div>
  </header>

  <main class="experiment-container">
    <div class="model-status" id="model-status"></div>
    <div class="input-section" id="input-section">
      <!-- page-specific input (textarea, drop zone, etc.) -->
    </div>
    <button class="btn-primary" id="run-btn" disabled>Analyze</button>
    <div id="result-area">
      <!-- JS inserts .result-area here after inference -->
    </div>
  </main>

  <script type="module" src="./sentiment.js"></script>
</body>
</html>
```

**Important:** CSS link uses absolute path `/app.css` so it resolves correctly from nested page directories.

### Sticky Header

```css
.experiment-header {
  position: sticky;
  top: 0;
  z-index: 100;
  height: var(--header-height);
  background: rgba(14, 17, 23, 0.85);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border-bottom: 1px solid var(--border-subtle);
  display: flex;
  align-items: center;
  padding: 0 var(--space-6);
}
.experiment-header-inner {
  max-width: var(--landing-max-width);
  margin: 0 auto;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
}
```

### Back Link

```css
.back-link {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  color: var(--text-secondary);
  text-decoration: none;
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  padding: var(--space-2) var(--space-3);
  border-radius: var(--radius-md);
  transition: color var(--transition-fast), background var(--transition-fast);
}
.back-link:hover { color: var(--text-primary); background: var(--bg-hover); text-decoration: none; }
```

### Content Container

```css
.experiment-container {
  max-width: var(--content-max-width);
  margin: 0 auto;
  padding: var(--space-8) var(--space-6);
  display: flex;
  flex-direction: column;
  gap: var(--space-8);
}
```

### Section Labels

```css
.section-label {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  color: var(--text-secondary);
  margin-bottom: var(--space-2);
}
```

---

## Model Status Indicator

State machine with 4 states:

| State | Trigger | Visual |
|-------|---------|--------|
| `idle` | Page load (before model request) | Not shown — model loads eagerly on page open |
| `loading` | `loadModel()` called | Blue badge: spinner + "Loading model..." + progress bar below |
| `ready` | Pipeline resolves | Green badge: green dot + "Model ready" — enable action button |
| `error` | Pipeline fails | Red badge: red dot + "Failed to load model" + "Retry" button |

Status badge styles:
```css
.model-status { display: flex; align-items: center; gap: var(--space-3); padding: var(--space-3) var(--space-4); border-radius: var(--radius-md); font-size: var(--font-size-sm); transition: background var(--transition-base), color var(--transition-base); }
.model-status--loading { background: rgba(88, 166, 255, 0.1); color: var(--info); }
.model-status--ready { background: rgba(57, 217, 138, 0.1); color: var(--positive); }
.model-status--error { background: rgba(244, 112, 103, 0.1); color: var(--negative); }
```

### Loading Behavior

- **Eager loading** — model begins loading immediately on page open (better UX for a playground app)
- Action button starts **disabled** and is enabled only when model reaches `ready` state
- User can edit input while model loads — inference runs immediately after load if user already clicked
- Progress bar beneath the status badge shows download progress via Transformers.js `progress_callback`
- If progress percentage is unknown, use indeterminate animation

### Inference-in-Progress

- Action button shows spinner and is disabled during inference
- Input fields remain editable
- Button re-enables when inference completes or fails

---

## Shared Model Loader (`lib/model-loader.js`)

```js
import { pipeline } from '@huggingface/transformers';

// createLoader accepts an injected pipeline function for testability.
// In production: uses the real pipeline import.
// In E2E tests: globalThis.__TEST_PIPELINE_FN is set by Playwright's addInitScript.
// In unit tests: createLoader(mockFn) is called directly.
export function createLoader(pipelineFn = globalThis.__TEST_PIPELINE_FN || pipeline) {
  const cache = new Map(); // Same-page dedup only; MPA destroys this on navigation.
                            // Cross-visit caching is handled by Transformers.js via Cache API.

  return async function loadModel(task, model, { onProgress, ...options } = {}) {
    const key = `${task}::${model}`;
    if (cache.has(key)) return cache.get(key);

    const promise = pipelineFn(task, model, {
      dtype: 'q8',
      progress_callback: onProgress || undefined,
      ...options,
    }).catch((err) => {
      console.error(`Failed to load ${task} model (${model}):`, err);
      cache.delete(key);
      return null;
    });

    cache.set(key, promise);
    return promise;
  };
}

export const loadModel = createLoader();
```

---

## Model Status State Machine (`lib/model-status.js`)

Pure reducer — no DOM, fully testable.

```js
export const STATES = { IDLE: 'idle', LOADING: 'loading', READY: 'ready', ERROR: 'error' };
export const EVENTS = { LOAD_START: 'LOAD_START', LOAD_SUCCESS: 'LOAD_SUCCESS', LOAD_FAILURE: 'LOAD_FAILURE', RETRY: 'RETRY' };

const transitions = {
  idle:    { LOAD_START: 'loading' },
  loading: { LOAD_SUCCESS: 'ready', LOAD_FAILURE: 'error' },
  error:   { RETRY: 'loading' },
  ready:   {},
};

export function nextModelStatus(current, event) {
  return transitions[current]?.[event] ?? current;
}

export function formatProgress(progressEvent) {
  if (!progressEvent || progressEvent.status !== 'progress') {
    return { percent: 0, isIndeterminate: true, file: '' };
  }
  return {
    percent: Math.round(progressEvent.progress),
    isIndeterminate: false,
    file: progressEvent.file,
  };
}
```

Each page's DOM wiring layer imports `nextModelStatus` and `formatProgress` to update the `#model-status` element. The state machine itself is tested in unit tests; the DOM rendering is tested via E2E.

---

### Progress callback event shapes (from Transformers.js)

- `{ status: 'initiate', file: string }` — model file download starting
- `{ status: 'progress', file: string, progress: number }` — percentage 0-100
- `{ status: 'done', file: string }` — individual file complete
- `{ status: 'ready' }` — pipeline fully loaded

Each page should track the largest file's progress (the `.onnx` file) for the progress bar.

---

## Starter Experiments

### 1. Sentiment Analysis (`pages/sentiment/`)

- **Task:** `sentiment-analysis`
- **Model:** `Xenova/distilbert-base-uncased-finetuned-sst-2-english`
- **Download:** ~67 MB (quantized)
- **UI:** Textarea + "Analyze" button + sentiment result display

#### Input
- `<textarea>` with placeholder: "Enter text to analyze sentiment... e.g., I absolutely loved this movie!"
- Button text: "Analyze"

#### Pipeline call
```js
const result = await classifier(text);
// Returns: [{ label: 'POSITIVE' | 'NEGATIVE', score: 0.0-1.0 }]
```

**Important:** The model is binary (SST-2). It only outputs `POSITIVE` or `NEGATIVE` — there is no neutral class. Display the label and score directly.

#### Result formatting (in `sentiment-logic.js`)

Pure function `formatSentimentResult(rawResult)` takes `[{ label, score }]` and returns a view model:

```js
// Input:  [{ label: 'POSITIVE', score: 0.921 }]
// Output: { label: 'POSITIVE', emoji: '😊', colorVar: '--positive', percentText: '92.1%', barWidthPercent: 92.1 }
```

| Label | Emoji | Color Var |
|-------|-------|-----------|
| `POSITIVE` | 😊 | `--positive` |
| `NEGATIVE` | 😔 | `--negative` |

Percentage precision: **one decimal place** (e.g., `92.1%`). Score of 0.9997 → `100.0%`.
Bar width: `score * 100` (absolute percentage, not relative).

Also exports `isInputValid(text)` — returns `false` for empty or whitespace-only strings.

#### Result display

Two-column flex inside `.result-area`:
- Left: emoji + label in large text, colored per `colorVar`
- Right: confidence bar (200px wide, 8px tall) + percentage as monospace text
- Below 480px: stack vertically

#### Input validation
- Disable button when textarea is empty (uses `isInputValid`)
- DistilBERT has a 512-token limit; text beyond is silently truncated — no warning needed

---

### 2. Image Classification (`pages/image-classify/`)

- **Task:** `image-classification`
- **Model:** `Xenova/vit-base-patch16-224`
- **Download:** ~88 MB (quantized)
- **UI:** Drop zone + image preview + top-5 prediction bars

#### Input
- Drop zone (see component pattern above)
- Hidden `<input type="file" accept="image/*">` triggered on click
- Both drag-and-drop and click-to-upload supported

#### Drag-and-drop implementation

```js
// CRITICAL: preventDefault on BOTH dragover and drop — without it on dragover, drop won't fire
dropZone.addEventListener('dragover', (e) => { e.preventDefault(); /* add dragover class */ });
dropZone.addEventListener('dragleave', (e) => { /* remove dragover class */ });
dropZone.addEventListener('drop', (e) => {
  e.preventDefault();
  const file = e.dataTransfer.files[0];
  if (file && file.type.startsWith('image/')) handleFile(file);
});
```

#### Pipeline input

```js
// Use URL.createObjectURL for both preview and pipeline input
const blobUrl = URL.createObjectURL(file);
previewImg.src = blobUrl;
const result = await classifier(blobUrl, { topk: 5 });
URL.revokeObjectURL(blobUrl); // Clean up after inference
// Returns: [{ label: string, score: number }, ...] sorted by score desc
```

**Key:** Pass the blob URL string directly to the pipeline. Do NOT pass the File object directly. Revoke the URL after inference.

#### Result formatting (in `image-classify-logic.js`)

Pure function `formatClassificationResults(rawResults)` takes the pipeline output array and returns a view model:

```js
// Input:  [{ label: 'golden retriever', score: 0.85 }, { label: 'labrador', score: 0.06 }, ...]
// Output: [{ rank: 1, label: 'golden retriever', score: 0.85, percentText: '85.0%', barWidthPercent: 100, colorVar: '--accent' }, ...]
```

- Results sorted by score descending, assigned ranks 1-N
- **Bar width is relative to the top score**: rank 1 is always 100%, others are `(score / topScore) * 100`
- Rank 1 uses `colorVar: '--accent'`, ranks 2+ use `colorVar: '--info'`
- Percentage precision: one decimal place (e.g., `85.0%`)
- Handles fewer than 5 results gracefully (just returns what's there)
- Handles empty array (returns `[]`)

Also exports `isValidImageFile(file)` — checks `file?.type?.startsWith('image/')`, returns `false` for null/undefined/non-image.

#### Result display — Top-5 Predictions

Each row: rank number + label + bar + percentage, with `data-rank` attribute on each row element.
- Bars animate from 0% to final width on render (`transition: width 0.6s ease`)
- Rows stagger: each row has `animation-delay: calc(n * 80ms)` for fadeSlideIn
- Label overflow: `text-overflow: ellipsis; white-space: nowrap`
- Percentage: monospace font, right-aligned

#### Input validation
- Check via `isValidImageFile(file)` before processing; show "Please upload an image file (JPEG, PNG, etc.)" for non-images
- No max-size enforcement needed (ViT resizes to 224x224 internally)

---

### 3. Text Summarization (`pages/summarize/`)

- **Task:** `summarization`
- **Model:** `Xenova/distilbart-cnn-6-6`
- **Download:** ~284 MB (encoder ~129 MB + decoder ~155 MB, quantized)
- **UI:** Large textarea + "Summarize" button + summary output + word count stats

#### Known Issue: Model Loading on Transformers.js v3

`Xenova/distilbart-cnn-6-6` has documented loading failures on Transformers.js v3 ([issue #1120](https://github.com/huggingface/transformers.js/issues/1120)). **Recovery strategy:**

1. Try loading `Xenova/distilbart-cnn-6-6` with `dtype: 'q8'` first
2. If it fails, fall back to `onnx-community/distilbart-cnn-6-6` (same model, v3-compatible namespace)
3. If that also fails, fall back to `Xenova/distilbart-cnn-12-6`
4. Show clear error to user if all attempts fail

#### Summarization logic (in `summarize-logic.js`)

Exports:

```js
export const FALLBACK_MODELS = [
  'Xenova/distilbart-cnn-6-6',
  'onnx-community/distilbart-cnn-6-6',
  'Xenova/distilbart-cnn-12-6',
];

// Tries each model in order; returns { pipeline, model } or null.
export async function loadWithFallback(loaderFn, task, models, options) {
  for (const model of models) {
    const result = await loaderFn(task, model, options);
    if (result !== null) return { pipeline: result, model };
  }
  return null;
}

// Word counting: text.trim().split(/\s+/).length, empty string → 0.
export function computeSummaryStats(originalText, summaryText) {
  const countWords = (t) => { const trimmed = t.trim(); return trimmed === '' ? 0 : trimmed.split(/\s+/).length; };
  const originalWords = countWords(originalText);
  const summaryWords = countWords(summaryText);
  const compressionPercent = originalWords === 0 ? 0 : Math.round((1 - summaryWords / originalWords) * 100);
  return { originalWords, summaryWords, compressionPercent };
}

export function isTooShort(text, minWords = 30) {
  const trimmed = text.trim();
  return trimmed === '' || trimmed.split(/\s+/).length < minWords;
}
```

The fallback chain is implemented in `summarize-logic.js` (testable with mock loader), called by the wiring layer in `summarize.js`.

#### Input
- `<textarea>` with placeholder: "Paste a long article or text to summarize..."
- Button text: "Summarize"
- Show a size warning above the input: "This model requires ~284 MB download on first use"

#### Pipeline call
```js
const result = await summarizer(text, { max_new_tokens: 150 });
// Returns: [{ summary_text: string }]
```

#### Result display

Inside `.result-area`:
- Header: "Summary" in section-label style
- Summary text: `var(--font-size-lg)`, relaxed line-height, displayed in `<blockquote>` with left accent border (`border-left: 3px solid var(--accent); padding-left: var(--space-4)`)
- Stats box below: monospace font, bg-tertiary background
  - "Original: {N} words → Summary: {M} words"
  - "Compression: {percentage}%" — percentage colored with `var(--accent)`

#### Input validation
- Disable button when textarea is empty
- Short text warning: if < 30 words (per `isTooShort`), show inline message below textarea: "Text may be too short for meaningful summarization" in `var(--warning)` color, `var(--font-size-sm)`. Non-blocking — button remains enabled.
- DistilBART has a 1024-token input limit; longer text is truncated by the tokenizer

---

## Responsive Design

Mobile-first. Breakpoints:

| Breakpoint | Width | Adjustments |
|-----------|-------|-------------|
| sm | < 480px | Single-column card grid, hero title → 2rem, reduce drop zone padding, stack sentiment result vertically, reduce classification bar width to 80px, reduce header padding |
| md | 480-768px | Auto-fill grid handles 1-2 columns naturally |
| lg | > 768px | Full layout as designed |

All interactive elements have minimum 44px touch targets.

---

## Micro-interactions

1. **Card hover** — translateY(-2px) + accent border + glow shadow
2. **Card active** — translateY(0) + smaller shadow (press feel)
3. **Button active** — scale(0.97)
4. **Result appearance** — fadeSlideIn (opacity 0→1, translateY 8→0)
5. **Classification rows** — staggered fadeSlideIn (80ms delay per row)
6. **Confidence bars** — width animates from 0% to final (600ms ease)
7. **Progress bar completion** — fills to 100%, then fades out
8. **Status transitions** — background-color and text-color transition smoothly

---

## Accessibility

- `aria-live="polite"` on `#model-status` and `#result-area` so screen readers announce changes
- Proper `<label>` elements for form controls
- File input as fallback for drop zone (keyboard accessible)
- All interactive elements reachable via keyboard
- Color contrast: WCAG AA (4.5:1 body text, 3:1 large text) — verified against the dark palette

---

## Error Handling

### Per-Page

| Error | Handling |
|-------|----------|
| Network failure during model download | Show error state in model-status, provide "Retry" button |
| Model not found (404) | Show error with model name, no auto-retry |
| Out of memory (WASM) | Catch `RangeError`, show "This model requires more memory than your browser can allocate. Try closing other tabs." |
| Empty input | Disable action button |
| Invalid file type (image page) | Show "Please upload an image file (JPEG, PNG, etc.)" |
| Inference failure | Catch and display in error-styled result area: "Something went wrong. Please try again." |

### General Pattern

```js
try {
  const result = await classifier(input);
  displayResult(result);
} catch (err) {
  console.error('Inference failed:', err);
  showError('Something went wrong during analysis. Please try again.');
}
```

Disable the action button during inference to prevent double-clicks.

---

## Testing Strategy

### Methodology: Red-Green-Refactor TDD

Tests are written **before** implementation at every step. The cycle:
1. **Red** — write failing tests that define the expected behavior
2. **Green** — write the minimal code to make tests pass
3. **Refactor** — clean up while keeping tests green

### Tier 1: Unit Tests (`node --test`)

All unit tests use Node.js built-in `node:test` and `node:assert/strict`. No external test framework.

#### `tests/unit/model-loader.test.js` (7 tests)

```js
import { describe, test, mock, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { createLoader } from '../../lib/model-loader.js';

describe('model-loader', () => {
  let fakePipeline, loadModel;

  beforeEach(() => {
    fakePipeline = mock.fn(async () => ({ classify: () => {} }));
    loadModel = createLoader(fakePipeline);
  });

  test('cache hit: same key returns the same promise', async () => {
    const p1 = loadModel('sentiment-analysis', 'model-a');
    const p2 = loadModel('sentiment-analysis', 'model-a');
    assert.strictEqual(p1, p2);
    assert.strictEqual(fakePipeline.mock.calls.length, 1);
  });

  test('cache miss: different keys invoke pipeline separately', async () => {
    await loadModel('sentiment-analysis', 'model-a');
    await loadModel('image-classification', 'model-b');
    assert.strictEqual(fakePipeline.mock.calls.length, 2);
  });

  test('error eviction: failed load removes cache entry for retry', async () => {
    let calls = 0;
    const failing = mock.fn(async () => { calls++; if (calls === 1) throw new Error('fail'); return { ok: true }; });
    const loader = createLoader(failing);
    const first = await loader('task', 'model');
    assert.strictEqual(first, null);
    const second = await loader('task', 'model');
    assert.notStrictEqual(second, null);
    assert.strictEqual(failing.mock.calls.length, 2);
  });

  test('progress forwarding: onProgress mapped to progress_callback', async () => {
    const onProgress = mock.fn();
    await loadModel('task', 'model', { onProgress });
    const opts = fakePipeline.mock.calls[0].arguments[2];
    assert.strictEqual(opts.progress_callback, onProgress);
  });

  test('options passthrough: dtype defaults to q8', async () => {
    await loadModel('task', 'model');
    const opts = fakePipeline.mock.calls[0].arguments[2];
    assert.strictEqual(opts.dtype, 'q8');
  });

  test('options passthrough: additional options are forwarded', async () => {
    await loadModel('task', 'model', { revision: 'main' });
    const opts = fakePipeline.mock.calls[0].arguments[2];
    assert.strictEqual(opts.revision, 'main');
  });

  test('null return: failed pipeline returns null, does not throw', async () => {
    const failing = mock.fn(async () => { throw new Error('boom'); });
    const loader = createLoader(failing);
    const result = await loader('task', 'model');
    assert.strictEqual(result, null);
  });
});
```

#### `tests/unit/model-status.test.js` (8 tests)

```js
import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { nextModelStatus, formatProgress } from '../../lib/model-status.js';

describe('nextModelStatus', () => {
  test('idle -> loading on LOAD_START', () => { assert.strictEqual(nextModelStatus('idle', 'LOAD_START'), 'loading'); });
  test('loading -> ready on LOAD_SUCCESS', () => { assert.strictEqual(nextModelStatus('loading', 'LOAD_SUCCESS'), 'ready'); });
  test('loading -> error on LOAD_FAILURE', () => { assert.strictEqual(nextModelStatus('loading', 'LOAD_FAILURE'), 'error'); });
  test('error -> loading on RETRY', () => { assert.strictEqual(nextModelStatus('error', 'RETRY'), 'loading'); });
  test('ignores invalid transition (ready + LOAD_START)', () => { assert.strictEqual(nextModelStatus('ready', 'LOAD_START'), 'ready'); });
  test('ignores unknown event', () => { assert.strictEqual(nextModelStatus('idle', 'UNKNOWN'), 'idle'); });
});

describe('formatProgress', () => {
  test('returns indeterminate for null event', () => {
    const r = formatProgress(null);
    assert.strictEqual(r.isIndeterminate, true);
    assert.strictEqual(r.percent, 0);
  });
  test('extracts percent from progress event', () => {
    const r = formatProgress({ status: 'progress', file: 'model.onnx', progress: 45.7 });
    assert.strictEqual(r.percent, 46);
    assert.strictEqual(r.isIndeterminate, false);
    assert.strictEqual(r.file, 'model.onnx');
  });
});
```

#### `tests/unit/sentiment-logic.test.js` (11 tests)

```js
import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { formatSentimentResult, isInputValid } from '../../pages/sentiment/sentiment-logic.js';

describe('formatSentimentResult', () => {
  test('positive result has green color var', () => {
    assert.strictEqual(formatSentimentResult([{ label: 'POSITIVE', score: 0.92 }]).colorVar, '--positive');
  });
  test('negative result has red color var', () => {
    assert.strictEqual(formatSentimentResult([{ label: 'NEGATIVE', score: 0.85 }]).colorVar, '--negative');
  });
  test('positive result has correct emoji', () => {
    assert.strictEqual(formatSentimentResult([{ label: 'POSITIVE', score: 0.5 }]).emoji, '\u{1F60A}');
  });
  test('negative result has correct emoji', () => {
    assert.strictEqual(formatSentimentResult([{ label: 'NEGATIVE', score: 0.5 }]).emoji, '\u{1F614}');
  });
  test('formats percentage to one decimal place', () => {
    assert.strictEqual(formatSentimentResult([{ label: 'POSITIVE', score: 0.921 }]).percentText, '92.1%');
  });
  test('bar width equals score * 100', () => {
    assert.strictEqual(formatSentimentResult([{ label: 'POSITIVE', score: 0.75 }]).barWidthPercent, 75.0);
  });
  test('handles near-100% score', () => {
    assert.strictEqual(formatSentimentResult([{ label: 'POSITIVE', score: 0.9997 }]).percentText, '100.0%');
  });
  test('preserves original label string', () => {
    assert.strictEqual(formatSentimentResult([{ label: 'POSITIVE', score: 0.8 }]).label, 'POSITIVE');
  });
});

describe('isInputValid', () => {
  test('empty string is invalid', () => { assert.strictEqual(isInputValid(''), false); });
  test('whitespace-only is invalid', () => { assert.strictEqual(isInputValid('   \n\t  '), false); });
  test('non-empty string is valid', () => { assert.strictEqual(isInputValid('hello'), true); });
});
```

#### `tests/unit/image-classify-logic.test.js` (16 tests)

```js
import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { formatClassificationResults, isValidImageFile } from '../../pages/image-classify/image-classify-logic.js';

describe('formatClassificationResults', () => {
  const sample = [
    { label: 'golden retriever', score: 0.85 },
    { label: 'labrador', score: 0.06 },
    { label: 'collie', score: 0.04 },
    { label: 'poodle', score: 0.03 },
    { label: 'beagle', score: 0.02 },
  ];

  test('sorts by score descending', () => {
    const shuffled = [...sample].reverse();
    const results = formatClassificationResults(shuffled);
    assert.strictEqual(results[0].label, 'golden retriever');
  });
  test('assigns ranks 1 through 5', () => {
    assert.deepStrictEqual(formatClassificationResults(sample).map(r => r.rank), [1, 2, 3, 4, 5]);
  });
  test('rank 1 uses accent color', () => {
    assert.strictEqual(formatClassificationResults(sample)[0].colorVar, '--accent');
  });
  test('ranks 2-5 use info color', () => {
    formatClassificationResults(sample).slice(1).forEach(r => assert.strictEqual(r.colorVar, '--info'));
  });
  test('bar width: rank 1 is 100%, others proportional to top', () => {
    const raw = [{ label: 'a', score: 0.8 }, { label: 'b', score: 0.4 }, { label: 'c', score: 0.2 }];
    const results = formatClassificationResults(raw);
    assert.strictEqual(results[0].barWidthPercent, 100);
    assert.strictEqual(results[1].barWidthPercent, 50);
    assert.strictEqual(results[2].barWidthPercent, 25);
  });
  test('formats percentage to one decimal place', () => {
    assert.strictEqual(formatClassificationResults(sample)[0].percentText, '85.0%');
  });
  test('handles fewer than 5 results', () => {
    const results = formatClassificationResults([{ label: 'cat', score: 1.0 }]);
    assert.strictEqual(results.length, 1);
    assert.strictEqual(results[0].rank, 1);
  });
  test('handles empty array', () => {
    assert.strictEqual(formatClassificationResults([]).length, 0);
  });
});

describe('isValidImageFile', () => {
  test('accepts image/png', () => { assert.strictEqual(isValidImageFile({ type: 'image/png' }), true); });
  test('accepts image/jpeg', () => { assert.strictEqual(isValidImageFile({ type: 'image/jpeg' }), true); });
  test('accepts image/webp', () => { assert.strictEqual(isValidImageFile({ type: 'image/webp' }), true); });
  test('rejects application/pdf', () => { assert.strictEqual(isValidImageFile({ type: 'application/pdf' }), false); });
  test('rejects text/plain', () => { assert.strictEqual(isValidImageFile({ type: 'text/plain' }), false); });
  test('rejects null', () => { assert.strictEqual(isValidImageFile(null), false); });
  test('rejects undefined', () => { assert.strictEqual(isValidImageFile(undefined), false); });
  test('rejects object without type', () => { assert.strictEqual(isValidImageFile({}), false); });
});
```

#### `tests/unit/summarize-logic.test.js` (14 tests)

```js
import { describe, test, mock } from 'node:test';
import assert from 'node:assert/strict';
import { computeSummaryStats, isTooShort, FALLBACK_MODELS, loadWithFallback } from '../../pages/summarize/summarize-logic.js';

describe('computeSummaryStats', () => {
  test('calculates correct word counts', () => {
    const s = computeSummaryStats('one two three four five', 'one two');
    assert.strictEqual(s.originalWords, 5);
    assert.strictEqual(s.summaryWords, 2);
  });
  test('calculates compression percentage', () => {
    const s = computeSummaryStats('word '.repeat(100).trim(), 'word '.repeat(25).trim());
    assert.strictEqual(s.compressionPercent, 75);
  });
  test('handles empty summary (100% compression)', () => {
    const s = computeSummaryStats('some text here', '');
    assert.strictEqual(s.summaryWords, 0);
    assert.strictEqual(s.compressionPercent, 100);
  });
  test('handles empty original (0% compression)', () => {
    const s = computeSummaryStats('', '');
    assert.strictEqual(s.originalWords, 0);
    assert.strictEqual(s.compressionPercent, 0);
  });
  test('handles multi-space and newlines in word counting', () => {
    const s = computeSummaryStats('one  two\nthree\t\tfour', 'a');
    assert.strictEqual(s.originalWords, 4);
  });
});

describe('isTooShort', () => {
  test('returns true for text under 30 words', () => { assert.strictEqual(isTooShort('hello world', 30), true); });
  test('returns false for text at 30 words', () => { assert.strictEqual(isTooShort('word '.repeat(30).trim(), 30), false); });
  test('returns false for text above 30 words', () => { assert.strictEqual(isTooShort('word '.repeat(50).trim(), 30), false); });
  test('returns true for empty string', () => { assert.strictEqual(isTooShort('', 30), true); });
});

describe('FALLBACK_MODELS', () => {
  test('contains exactly 3 models', () => { assert.strictEqual(FALLBACK_MODELS.length, 3); });
  test('first is Xenova/distilbart-cnn-6-6', () => { assert.strictEqual(FALLBACK_MODELS[0], 'Xenova/distilbart-cnn-6-6'); });
});

describe('loadWithFallback', () => {
  test('returns first successful model', async () => {
    const loader = mock.fn(async () => ({ summarize: () => {} }));
    const r = await loadWithFallback(loader, 'summarization', FALLBACK_MODELS, {});
    assert.strictEqual(r.model, 'Xenova/distilbart-cnn-6-6');
    assert.strictEqual(loader.mock.calls.length, 1);
  });
  test('tries next model when first returns null', async () => {
    let c = 0;
    const loader = mock.fn(async () => { c++; if (c === 1) return null; return { summarize: () => {} }; });
    const r = await loadWithFallback(loader, 'summarization', FALLBACK_MODELS, {});
    assert.strictEqual(r.model, 'onnx-community/distilbart-cnn-6-6');
  });
  test('returns null when all models fail', async () => {
    const loader = mock.fn(async () => null);
    assert.strictEqual(await loadWithFallback(loader, 'summarization', FALLBACK_MODELS, {}), null);
    assert.strictEqual(loader.mock.calls.length, 3);
  });
});
```

### Tier 2: E2E Tests (Playwright)

#### E2E Model Mocking Strategy

Real model downloads (67-284 MB) are impractical in tests. Two-layer mocking:

**Layer 1 — JS-level pipeline replacement (primary):**
`page.addInitScript()` sets `globalThis.__TEST_PIPELINE_FN` before page modules load. The `model-loader.js` picks this up via its default parameter. The mock returns canned results matching the pipeline's real output shape.

**Layer 2 — Network interception (safety net):**
`page.route('**/*huggingface*/**', ...)` blocks real downloads in case the JS mock fails to inject.

##### `tests/e2e/helpers/mock-model.js`

```js
export async function mockPipeline(page, task, mockResult) {
  await page.addInitScript(({ mockResult }) => {
    globalThis.__TEST_PIPELINE_FN = async (task, model, options) => {
      if (options?.progress_callback) {
        options.progress_callback({ status: 'initiate', file: 'model.onnx' });
        options.progress_callback({ status: 'progress', file: 'model.onnx', progress: 50 });
        options.progress_callback({ status: 'progress', file: 'model.onnx', progress: 100 });
        options.progress_callback({ status: 'done', file: 'model.onnx' });
        options.progress_callback({ status: 'ready' });
      }
      return async (input, opts) => mockResult;
    };
  }, { mockResult });

  await page.route('**/*huggingface*/**', route =>
    route.fulfill({ status: 200, contentType: 'application/json', body: '{}' })
  );
}

export async function mockPipelineFailure(page) {
  await page.addInitScript(() => {
    globalThis.__TEST_PIPELINE_FN = async () => { throw new Error('Simulated model loading failure'); };
  });
  await page.route('**/*huggingface*/**', route => route.abort('failed'));
}
```

#### `tests/e2e/landing.spec.js` (8 tests)

- displays hero title and subtitle
- renders three experiment cards
- sentiment card links to `/pages/sentiment/`
- image classification card links to `/pages/image-classify/`
- summarize card links to `/pages/summarize/`
- footer contains Transformers.js link
- cards navigate to correct pages on click
- accessibility: no WCAG AA violations (via `@axe-core/playwright`)

#### `tests/e2e/sentiment.spec.js` (8 tests + screenshots)

- shows loading state then ready state (model-status transitions)
- analyze button disabled until model ready
- button enables when model ready AND textarea has text
- full positive flow: type text → click → see POSITIVE result with percentage
- full negative flow
- button disabled when textarea is empty
- error state: model fails to load → error badge
- back link navigates to landing page
- **Screenshots:** `sentiment-empty`, `sentiment-result-positive`, `sentiment-error`
- **Accessibility:** no WCAG AA violations

#### `tests/e2e/image-classify.spec.js` (7 tests + screenshots)

- shows model ready state
- shows drop zone with upload prompt
- click-to-upload: selects file via `input[type="file"]`, shows preview
- full flow: upload image → see top-5 results with rank bars
- drag and drop: dispatch dragover/drop events with DataTransfer
- rejects non-image file → error message
- error state: model fails to load
- **Screenshots:** `image-classify-empty`, `image-classify-result`
- **Accessibility:** no WCAG AA violations

#### `tests/e2e/summarize.spec.js` (8 tests + screenshots)

- shows model ready state
- shows download size warning (~284 MB)
- button disabled when textarea empty
- full flow: paste text → summarize → see summary with word count stats
- short text warning for input under 30 words
- error state: model fails to load
- loading state shows progress indicator (uses delayed mock)
- back link navigates to landing page
- **Screenshots:** `summarize-empty`, `summarize-result`, `summarize-error`
- **Accessibility:** no WCAG AA violations

#### Test fixture: `tests/e2e/fixtures/test-image.jpg`

A minimal valid 1x1 pixel JPEG (~107 bytes). Generate during scaffold step:

```js
import { writeFileSync } from 'node:fs';
const minimalJpeg = Buffer.from([
  0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01,
  0x01, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00, 0xFF, 0xDB, 0x00, 0x43,
  0x00, 0x08, 0x06, 0x06, 0x07, 0x06, 0x05, 0x08, 0x07, 0x07, 0x07, 0x09,
  0x09, 0x08, 0x0A, 0x0C, 0x14, 0x0D, 0x0C, 0x0B, 0x0B, 0x0C, 0x19, 0x12,
  0x13, 0x0F, 0x14, 0x1D, 0x1A, 0x1F, 0x1E, 0x1D, 0x1A, 0x1C, 0x1C, 0x20,
  0x24, 0x2E, 0x27, 0x20, 0x22, 0x2C, 0x23, 0x1C, 0x1C, 0x28, 0x37, 0x29,
  0x2C, 0x30, 0x31, 0x34, 0x34, 0x34, 0x1F, 0x27, 0x39, 0x3D, 0x38, 0x32,
  0x3C, 0x2E, 0x33, 0x34, 0x32, 0xFF, 0xC0, 0x00, 0x0B, 0x08, 0x00, 0x01,
  0x00, 0x01, 0x01, 0x01, 0x11, 0x00, 0xFF, 0xC4, 0x00, 0x1F, 0x00, 0x00,
  0x01, 0x05, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x00, 0x00, 0x00, 0x00,
  0x00, 0x00, 0x00, 0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08,
  0x09, 0x0A, 0x0B, 0xFF, 0xDA, 0x00, 0x08, 0x01, 0x01, 0x00, 0x00, 0x3F,
  0x00, 0x7B, 0x94, 0x11, 0x00, 0x00, 0x00, 0x00, 0xFF, 0xD9
]);
writeFileSync('tests/e2e/fixtures/test-image.jpg', minimalJpeg);
```

### Tier 3: Screenshot Testing

Capture visual state at key moments using Playwright's `toHaveScreenshot()`.

| Page | States to Screenshot |
|------|---------------------|
| Landing | `empty` (default view) |
| Sentiment | `empty`, `result-positive`, `result-negative`, `error` |
| Image Classification | `empty` (drop zone), `result` (top-5 bars), `error` |
| Summarization | `empty`, `result`, `error` |

Naming convention: `{page}-{state}-{projectName}.png` (project = desktop-chrome or mobile-chrome).

```js
// Example screenshot test:
await expect(page).toHaveScreenshot('sentiment-result-positive.png', {
  maxDiffPixelRatio: 0.01,
  animations: 'disabled', // Freeze CSS animations for deterministic snapshots
});
```

Update baselines: `npm run test:e2e:update-screenshots`

### Tier 4: Accessibility Tests

One axe-core scan per page, integrated into each E2E spec:

```js
import AxeBuilder from '@axe-core/playwright';
test('no a11y violations', async ({ page }) => {
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
  expect(results.violations).toEqual([]);
});
```

### `playwright.config.js`

```js
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',

  snapshotPathTemplate: '{testDir}/../screenshots/{testFileName}/{arg}-{projectName}{ext}',
  expect: {
    toHaveScreenshot: { maxDiffPixelRatio: 0.01, animations: 'disabled' },
  },

  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  webServer: {
    command: 'npm run dev',
    port: 5173,
    reuseExistingServer: !process.env.CI,
    timeout: 30000,
  },

  projects: [
    { name: 'desktop-chrome', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile-chrome', use: { ...devices['Pixel 5'] } },
  ],
});
```

### Test Count Summary

| File | Tests |
|------|-------|
| `model-loader.test.js` | 7 |
| `model-status.test.js` | 8 |
| `sentiment-logic.test.js` | 11 |
| `image-classify-logic.test.js` | 16 |
| `summarize-logic.test.js` | 14 |
| **Unit Total** | **56** |
| `landing.spec.js` | 8 |
| `sentiment.spec.js` | 8 + screenshots |
| `image-classify.spec.js` | 7 + screenshots |
| `summarize.spec.js` | 8 + screenshots |
| **E2E Total** | **31** + screenshots (x2 viewports) |
| **Grand Total** | **87** tests + screenshot comparisons |

---

## Implementation Order (TDD — tests before code at every step)

### Step 1: Scaffold + Core Libraries

**RED** — Write failing tests first:
- `tests/unit/model-loader.test.js` (7 tests — all fail, module doesn't exist)
- `tests/unit/model-status.test.js` (8 tests — all fail)

**GREEN** — Minimal code to pass:
1. Create `package.json`, `.gitignore`, `vite.config.js`
2. Run `npm install`
3. Create `lib/model-loader.js` with `createLoader` and `loadModel`
4. Create `lib/model-status.js` with `nextModelStatus` and `formatProgress`
5. Run `npm run test:unit` — all 15 tests pass

**Then scaffold** (not TDD — static assets):
6. Create `app.css` with full design system
7. Create `index.html` (landing page)
8. Create empty page directories with placeholder `index.html` files
9. Create `tests/e2e/helpers/mock-model.js`
10. Create `tests/e2e/fixtures/test-image.jpg`
11. Install Playwright browsers: `npx playwright install chromium`
12. Run `npm run dev` — verify scaffold works, all pages route

### Step 2: Sentiment Page

**RED** — Write failing tests:
- `tests/unit/sentiment-logic.test.js` (11 tests — fail, module doesn't exist)
- `tests/e2e/sentiment.spec.js` (8 tests — fail, page is empty)

**GREEN**:
1. Create `pages/sentiment/sentiment-logic.js` — run unit tests, all 11 pass
2. Create `pages/sentiment/sentiment.js` + update `pages/sentiment/index.html`
3. Run E2E tests — all 8 pass

**REFACTOR**: Extract any magic values into named constants.

### Step 3: Image Classification Page

**RED** — Write failing tests:
- `tests/unit/image-classify-logic.test.js` (16 tests — fail)
- `tests/e2e/image-classify.spec.js` (7 tests — fail)

**GREEN**:
1. Create `pages/image-classify/image-classify-logic.js` — unit tests pass
2. Create `pages/image-classify/image-classify.js` + update HTML
3. Run E2E tests — all pass

**REFACTOR**: Ensure `formatClassificationResults` handles edge cases.

### Step 4: Summarization Page

**RED** — Write failing tests:
- `tests/unit/summarize-logic.test.js` (14 tests — fail)
- `tests/e2e/summarize.spec.js` (8 tests — fail)

**GREEN**:
1. Create `pages/summarize/summarize-logic.js` — unit tests pass
2. Create `pages/summarize/summarize.js` + update HTML
3. Run E2E tests — all pass

**REFACTOR**: Verify fallback chain with real models if possible.

### Step 5: Landing Page E2E + Screenshots

**RED**:
- `tests/e2e/landing.spec.js` (8 tests — fail or partially fail)
- Screenshot tests for all pages (no baselines yet)

**GREEN**:
1. Fix any landing page issues found by E2E tests
2. Run `npm run test:e2e:update-screenshots` to capture baselines
3. Run `npm run test:e2e` — all pass including screenshot comparisons

### Step 6: Polish + Full Regression

1. Verify all loading states, error states, animations
2. Verify responsive design at 375px, 768px, 1024px (mobile-chrome project)
3. Run `npm run test` — all 87 tests pass
4. Run `npm run build` — production build succeeds
5. Run `npm run preview` — production build serves correctly
6. Review screenshot diffs for visual regressions
