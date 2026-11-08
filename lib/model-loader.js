// Transformers.js is imported lazily so that a failure to fetch or evaluate the
// (large) library surfaces as a normal load failure with a Retry button, instead
// of killing the page's module graph before any UI is wired up.
let transformersPromise = null;
let importFailed = false;

function importTransformers() {
  // Browsers cache a failed dynamic import for the page's lifetime, so
  // re-calling import() can never succeed. Reload so Retry actually retries.
  if (importFailed && globalThis.location) {
    globalThis.location.reload();
    return new Promise(() => {});
  }
  if (!transformersPromise) {
    transformersPromise = import('@huggingface/transformers').catch((err) => {
      importFailed = true;
      transformersPromise = null;
      throw err;
    });
  }
  return transformersPromise;
}

async function lazyPipeline(...args) {
  const { pipeline } = await importTransformers();
  return pipeline(...args);
}

// createLoader accepts an injected pipeline function for testability.
// In production: lazily imports the real pipeline.
// In E2E tests: globalThis.__TEST_PIPELINE_FN is set by Playwright's addInitScript.
// In unit tests: createLoader(mockFn) is called directly.
export function createLoader(pipelineFn = globalThis.__TEST_PIPELINE_FN || lazyPipeline) {
  const cache = new Map(); // Same-page dedup only; MPA destroys this on navigation.
                            // Cross-visit caching is handled by Transformers.js via Cache API.

  return function loadModel(task, model, { onProgress, ...options } = {}) {
    const key = `${task}::${model}`;
    if (cache.has(key)) return cache.get(key);

    // Transformers.js loads config/tokenizer/model files in parallel. If one
    // fails, the pipeline rejects while other downloads keep emitting progress
    // events. Drop events once this attempt has settled so they cannot
    // overwrite the caller's ready/error UI. Also isolate callback errors so a
    // rendering bug cannot fail the model load itself.
    let settled = false;
    const progressCallback = onProgress
      ? (event) => {
          if (settled) return;
          try {
            onProgress(event);
          } catch (err) {
            console.error('Progress callback failed:', err);
          }
        }
      : undefined;

    let promise;
    try {
      promise = Promise.resolve(pipelineFn(task, model, {
        dtype: 'q8',
        progress_callback: progressCallback,
        ...options,
      }));
    } catch (err) {
      promise = Promise.reject(err);
    }

    promise = promise.then(
      (pipe) => {
        settled = true;
        return pipe;
      },
      (err) => {
        settled = true;
        console.error(`Failed to load ${task} model (${model}):`, err);
        cache.delete(key);
        return null;
      },
    );

    cache.set(key, promise);
    return promise;
  };
}

export const loadModel = createLoader();
