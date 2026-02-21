# Model Student — ML Experimentation Web App

## Overview

A multi-page web app for experimenting with different ML models that run directly in the browser. Each page focuses on a distinct model/task, providing a self-contained playground to load a model, feed it input, and see results. No backend required — all inference happens client-side via [Transformers.js](https://huggingface.co/docs/transformers.js).

## Reference: voice-notes Pattern

The voice-notes app establishes a clean pattern we'll carry forward:

- **Vite + vanilla JS** — no framework overhead, fast dev loop
- **`@huggingface/transformers`** — imports `pipeline()` to load models by task and model ID
- **Lazy loading with promise caching** — the model isn't fetched until first use; a cached promise prevents duplicate loads
- **Graceful fallbacks** — errors and low-confidence results fall back to neutral/empty states
- **Quantized models** — uses `{ dtype: 'q8' }` to keep download sizes and memory reasonable

## Architecture

```
model-student/
├── index.html              ← landing page with links to each experiment
├── app.css                 ← shared styles
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
│   └── model-loader.js     ← shared lazy-load + caching helper
├── package.json
├── vite.config.js
└── tests.js
```

### Key decisions

- **Multi-page app (MPA) via Vite** — each experiment is its own HTML entry point. Vite supports this natively with `rollupOptions.input`. This keeps pages independent so loading one model doesn't pull in another's code.
- **Shared `model-loader.js`** — a thin utility that wraps the `pipeline()` call with the same lazy-load and promise-caching pattern from voice-notes. Each page calls it with a task name and model ID.
- **Vanilla JS** — matches voice-notes. No React/Vue/Svelte. Each page is a standalone script that wires up its own DOM.

## Shared Model Loader (`lib/model-loader.js`)

Generalizes the voice-notes pattern into a reusable helper:

```js
import { pipeline } from '@huggingface/transformers';

const cache = new Map();

export async function loadModel(task, model, options = {}) {
  const key = `${task}::${model}`;
  if (cache.has(key)) return cache.get(key);

  const promise = pipeline(task, model, { dtype: 'q8', ...options })
    .catch((err) => {
      console.error(`Failed to load ${task} model (${model}):`, err);
      cache.delete(key);
      return null;
    });

  cache.set(key, promise);
  return promise;
}
```

Each page imports `loadModel` and calls it with its specific task/model pair.

## Starter Experiments

### 1. Sentiment Analysis

Mirrors the voice-notes feature as a standalone playground.

- **Task:** `sentiment-analysis`
- **Model:** `Xenova/distilbert-base-uncased-finetuned-sst-2-english`
- **UI:** Text input area, "Analyze" button, result display showing label (positive/negative/neutral) and confidence score

### 2. Image Classification

- **Task:** `image-classification`
- **Model:** `Xenova/vit-base-patch16-224` (or similar small ViT)
- **UI:** Image upload/drop zone, preview, top-5 predicted labels with confidence bars

### 3. Text Summarization

- **Task:** `summarization`
- **Model:** `Xenova/distilbart-cnn-6-6`
- **UI:** Large text input, "Summarize" button, summary output, word count comparison

## UX Conventions

Each experiment page follows a consistent layout:

1. **Header** — experiment name, link back to home
2. **Model status indicator** — shows loading/ready/error state so the user knows when the model is available
3. **Input area** — specific to the task (text field, file drop, etc.)
4. **Action button** — triggers inference
5. **Result area** — displays model output

## Tech Stack

| Concern       | Choice                         |
|---------------|--------------------------------|
| Bundler       | Vite                           |
| ML runtime    | `@huggingface/transformers`    |
| Language      | Vanilla JS (ES modules)        |
| Styling       | Plain CSS                      |
| Testing       | Node test runner (`node tests.js`) |

## Implementation Order

1. **Scaffold** — `package.json`, `vite.config.js` (MPA setup), shared CSS, landing page, `model-loader.js`
2. **Sentiment page** — port the voice-notes pattern into the new structure as a proof of concept
3. **Image classification page** — validates that the architecture handles non-text models well
4. **Summarization page** — tests with a larger model and longer-running inference
5. **Polish** — loading states, error handling, mobile responsiveness

## Open Questions

- **Additional experiments to include from the start?** (e.g., translation, object detection, text generation)
- **Any preference on visual style/theme?** The voice-notes app has a theme system — do you want something similar here or keep it minimal?
