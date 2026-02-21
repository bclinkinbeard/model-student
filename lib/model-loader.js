// createLoader accepts an injected pipeline function for testability.
// In production: uses dynamic import of @huggingface/transformers.
// In E2E tests: globalThis.__TEST_PIPELINE_FN is set by Playwright's addInitScript.
// In unit tests: createLoader(mockFn) is called directly.
export function createLoader(pipelineFn) {
  const cache = new Map(); // Same-page dedup only; MPA destroys this on navigation.
                            // Cross-visit caching is handled by Transformers.js via Cache API.
  let resolvedFn = pipelineFn;

  return function loadModel(task, model, { onProgress, ...options } = {}) {
    const key = `${task}::${model}`;
    if (cache.has(key)) return cache.get(key);

    const promise = (async () => {
      if (!resolvedFn) {
        resolvedFn = globalThis.__TEST_PIPELINE_FN;
        if (!resolvedFn) {
          const mod = await import('@huggingface/transformers');
          resolvedFn = mod.pipeline;
        }
      }
      return resolvedFn(task, model, {
        dtype: 'q8',
        progress_callback: onProgress || undefined,
        ...options,
      });
    })().catch((err) => {
      console.error(`Failed to load ${task} model (${model}):`, err);
      cache.delete(key);
      return null;
    });

    cache.set(key, promise);
    return promise;
  };
}

export const loadModel = createLoader();
