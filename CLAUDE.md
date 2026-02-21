# CLAUDE.md — Model Student

## Project Overview

Model Student is a multi-page web app (MPA) for experimenting with ML models directly in the browser. No backend — all inference runs client-side via Transformers.js. Dark mode only.

Three experiments: Sentiment Analysis, Image Classification, Text Summarization.

## Tech Stack

- **Build tool**: Vite 6.1 (MPA mode with `appType: 'mpa'`)
- **Language**: Vanilla JavaScript (ES modules, no framework)
- **ML Runtime**: `@huggingface/transformers` v3.4.0 (pin to v3, do NOT use v4/@next)
- **Testing**: Node built-in `node:test` (unit), Playwright (E2E/visual/a11y)
- **Package manager**: npm
- **Node module type**: ES modules (`"type": "module"` in package.json)

## Repository Structure

```
model-student/
├── index.html                          # Landing page (static, no JS)
├── app.css                             # Shared design system (dark mode, CSS vars)
├── pages/
│   ├── sentiment/
│   │   ├── index.html
│   │   ├── sentiment.js                # DOM wiring layer
│   │   └── sentiment-logic.js          # Pure functions (testable in Node)
│   ├── image-classify/
│   │   ├── index.html
│   │   ├── image-classify.js
│   │   └── image-classify-logic.js
│   └── summarize/
│       ├── index.html
│       ├── summarize.js
│       └── summarize-logic.js
├── lib/
│   ├── model-loader.js                 # Shared lazy-load + caching + progress
│   └── model-status.js                 # Pure state machine + progress formatting
├── tests/
│   ├── unit/                           # node:test + node:assert/strict
│   │   ├── model-loader.test.js
│   │   ├── model-status.test.js
│   │   ├── sentiment-logic.test.js
│   │   ├── image-classify-logic.test.js
│   │   └── summarize-logic.test.js
│   ├── e2e/                            # Playwright tests
│   │   ├── landing.spec.js
│   │   ├── sentiment.spec.js
│   │   ├── image-classify.spec.js
│   │   ├── summarize.spec.js
│   │   ├── helpers/mock-model.js       # Shared Playwright pipeline mock
│   │   └── fixtures/test-image.jpg     # Minimal 1x1 JPEG for tests
│   └── screenshots/                    # Visual regression baselines (gitignored)
├── playwright.config.js
├── package.json
├── vite.config.js
├── PLAN.md                             # Full implementation specification
└── .gitignore
```

## Commands

```bash
npm run dev                    # Start Vite dev server (port 5173)
npm run build                  # Production build to dist/
npm run preview                # Preview production build
npm run test:unit              # Run unit tests: node --test tests/unit/*.test.js
npm run test:e2e               # Run Playwright E2E tests
npm run test:e2e:update-screenshots  # Update visual regression baselines
npm run test                   # Run all tests (unit then E2E)
```

## Architecture Conventions

### Logic / Wiring Split (Critical Pattern)

Every page's JS is split into two files:

| File | Contains | Tested by |
|------|----------|-----------|
| `*-logic.js` | Pure functions only — formatting, validation, data transforms, constants. **Zero DOM or browser API deps.** | `node:test` unit tests |
| `*.js` | Thin DOM wiring — `querySelector`, `addEventListener`, `innerHTML`, calls to `loadModel` and pipeline | Playwright E2E tests |

This split is the core TDD enabler. All business logic lives in `*-logic.js` and must remain pure (no `document`, `window`, `fetch`, or any browser API).

### Model Loading Pattern

- Lazy load on first use via `loadModel(task, model, { onProgress })`
- Promise caching within the same session (MPA navigation destroys cache)
- Transformers.js Cache API handles cross-visit persistence
- Always use quantized models: `{ dtype: 'q8' }`

### State Machine (model-status.js)

```
idle → loading → ready
       loading → error → loading (retry)
```

Pure reducer: `nextModelStatus(current, event)` — no side effects.

### Routing

MPA with separate HTML entry points. Inter-page links use absolute paths with trailing slash:
- `/` — landing
- `/pages/sentiment/` — sentiment analysis
- `/pages/image-classify/` — image classification
- `/pages/summarize/` — text summarization

## Testing Strategy

### Unit Tests (56 tests)

- Framework: `node:test` + `node:assert/strict` (Node built-in, no dependencies)
- Pattern: `import { describe, it } from 'node:test'` + `import assert from 'node:assert/strict'`
- Test only `*-logic.js` files and `lib/` pure functions
- Run with: `node --test tests/unit/*.test.js`

### E2E Tests (31 tests + screenshots)

- Framework: Playwright
- Model mocking strategy (two layers):
  1. `globalThis.__TEST_PIPELINE_FN` injection via `page.addInitScript()`
  2. Network interception of Hugging Face CDN URLs
- Playwright config: parallel disabled in CI, 2 retries in CI, projects for Desktop Chrome + Mobile Chrome (Pixel 5)

### Accessibility

- `@axe-core/playwright` for automated WCAG AA checks on every page
- ARIA attributes, color contrast (4.5:1 minimum), keyboard navigation required

## Code Style

- ES modules everywhere (`import`/`export`, never `require`)
- No framework — vanilla JS with direct DOM manipulation
- CSS custom properties for all design tokens (colors, spacing, typography, etc.)
- Dark mode only — no theme toggle, single set of CSS variables on `:root`
- Responsive design: mobile-first with breakpoints at 480px, 768px

## Key Constraints

- `@huggingface/transformers` must stay on v3.x (^3.4.0). v4 has breaking API changes.
- `optimizeDeps.exclude: ['@huggingface/transformers']` in vite.config.js — Vite's esbuild pre-bundling breaks WASM/ONNX imports.
- `appType: 'mpa'` in vite.config.js — required for nested `index.html` routing in dev mode.
- Root deployment assumed — no `base` config, absolute paths for assets.
- All implementation details are specified in `PLAN.md` (1600+ lines). Refer to it for exact UI specs, component markup, CSS, test cases, and model configurations.

## Implementation Order (TDD)

Follow the 6-step order defined in PLAN.md:
1. Scaffold: `package.json`, `vite.config.js`, `.gitignore`, `app.css`
2. Shared libs: `lib/model-loader.js`, `lib/model-status.js` + unit tests
3. Landing page: `index.html` with design system
4. Experiment pages: build each with tests (red-green-refactor cycle)
5. E2E tests with Playwright mocking
6. Visual regression + accessibility tests
