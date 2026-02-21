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
├── index.html                  ← landing page (static, no JS)
├── app.css                     ← shared design system + component styles
├── pages/
│   ├── sentiment/
│   │   ├── index.html
│   │   └── sentiment.js
│   ├── image-classify/
│   │   ├── index.html
│   │   └── image-classify.js
│   └── summarize/
│       ├── index.html
│       └── summarize.js
├── lib/
│   └── model-loader.js         ← shared lazy-load + caching + progress helper
├── package.json
├── vite.config.js
├── tests.js
└── .gitignore
```

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
    "test": "node --test tests.js"
  },
  "dependencies": {
    "@huggingface/transformers": "^3.4.0"
  },
  "devDependencies": {
    "vite": "^6.1.0"
  }
}
```

Notes:
- `"type": "module"` — required for ES module `import`/`export` in all JS files and the test file
- Pin `@huggingface/transformers` to `^3.4.0` (latest stable v3). Do NOT use v4/`@next`
- No other runtime dependencies needed

## .gitignore

```
node_modules/
dist/
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

When image is loaded: show `<img>` preview (`max-height: 300px; max-width: 100%; object-fit: contain;`) + "Change image" text link.

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

const cache = new Map(); // Same-page dedup only; MPA destroys this on navigation.
                          // Cross-visit caching is handled by Transformers.js via Cache API.

export async function loadModel(task, model, { onProgress, ...options } = {}) {
  const key = `${task}::${model}`;
  if (cache.has(key)) return cache.get(key);

  const promise = pipeline(task, model, {
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
}
```

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

#### Result display

Two-column flex inside `.result-area`:
- Left: emoji + label in large text. `POSITIVE` → green (`var(--positive)`), `NEGATIVE` → red (`var(--negative)`)
- Right: confidence bar (200px wide, 8px tall) + percentage as monospace text (e.g., "92.1%")
- Below 480px: stack vertically

#### Input validation
- Disable button when textarea is empty
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

#### Result display — Top-5 Predictions

Each row: rank number + label + bar + percentage
- Rank 1 bar uses `var(--accent)`, ranks 2-5 use `var(--info)`
- Bars animate from 0% to final width on render (`transition: width 0.6s ease`)
- Rows stagger: each row has `animation-delay: calc(n * 80ms)` for fadeSlideIn
- Label overflow: `text-overflow: ellipsis; white-space: nowrap`
- Percentage: monospace font, right-aligned

#### Input validation
- Check `file.type.startsWith('image/')` before processing; show error for non-images
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

Implement the fallback chain in the page's JS, NOT in the shared `loadModel` helper.

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
- Short text warning: if < 30 words, show "Text may be too short for meaningful summarization" (non-blocking)
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

### Tier 1: Unit Tests (`node --test tests.js`)

Test `model-loader.js` with a mocked `pipeline` function. The loader uses dependency injection for testability:

```js
// model-loader.js exports createLoader for testing
export function createLoader(pipelineFn = pipeline) {
  const cache = new Map();
  return async function loadModel(task, model, { onProgress, ...options } = {}) {
    // ... uses pipelineFn instead of bare pipeline
  };
}
export const loadModel = createLoader();
```

Tests:
- Promise caching: calling twice with same key returns same promise
- Cache eviction: failed load removes entry so retry works
- Options passthrough: `dtype` and `progress_callback` are forwarded
- Null return: failed pipeline returns null, not throws

### Tier 2: Manual Smoke Tests

Documented checklist (not automated):
1. `npm run dev` — each page loads without console errors
2. Model loads with progress visible for each page
3. Sentiment: "I love this" → POSITIVE, "This is terrible" → NEGATIVE
4. Image: known photo produces reasonable top-5 labels
5. Summarize: long text produces shorter summary with correct stats
6. Error: disconnect network mid-download → error state + retry works
7. Error: empty input → button stays disabled
8. Responsive: 375px viewport still usable

---

## Implementation Order

### Step 1: Scaffold
1. Create `package.json`
2. Create `.gitignore`
3. Create `vite.config.js`
4. Run `npm install`
5. Create `app.css` with full design system (variables, resets, all component styles)
6. Create `lib/model-loader.js`
7. Create `index.html` (landing page)
8. Create empty page directories with `index.html` files
9. Run `npm run dev` — verify scaffold works, all pages route

### Step 2: Sentiment Page
1. Write `pages/sentiment/index.html` using canonical template
2. Write `pages/sentiment/sentiment.js` — eager load, textarea, analyze, result display
3. Verify full flow works in browser

### Step 3: Image Classification Page
1. Write `pages/image-classify/index.html`
2. Write `pages/image-classify/image-classify.js` — drop zone, file handling, top-5 bars
3. Verify drag-and-drop + click-to-upload both work

### Step 4: Summarization Page
1. Write `pages/summarize/index.html`
2. Write `pages/summarize/summarize.js` — fallback chain, size warning, stats
3. Verify model loads (may need fallback model)

### Step 5: Tests
1. Write `tests.js` with mocked pipeline tests for model-loader
2. Run `node --test tests.js` — all pass

### Step 6: Polish
1. Verify all loading states, error states, animations
2. Verify responsive design at 375px, 768px, 1024px
3. Run `npm run build` — verify production output
4. Run `npm run preview` — verify production build works
