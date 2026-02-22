import { pipeline } from '@huggingface/transformers';

// createLoader accepts an injected pipeline function for testability.
// In production: uses the real pipeline import.
// In E2E tests: globalThis.__TEST_PIPELINE_FN is set by Playwright's addInitScript.
// In unit tests: createLoader(mockFn) is called directly.
export function createLoader(pipelineFn = globalThis.__TEST_PIPELINE_FN || pipeline) {
  const cache = new Map(); // Same-page dedup only; MPA destroys this on navigation.
                            // Cross-visit caching is handled by Transformers.js via Cache API.

  return function loadModel(task, model, { onProgress, ...options } = {}) {
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
