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

  await page.route(/huggingface\.co/, route =>
    route.fulfill({ status: 200, contentType: 'application/json', body: '{}' })
  );
}

export async function mockPipelineFailure(page) {
  await page.addInitScript(() => {
    globalThis.__TEST_PIPELINE_FN = async () => { throw new Error('Simulated model loading failure'); };
  });
  await page.route(/huggingface\.co/, route => route.abort('failed'));
}

// First load fails; subsequent loads (via Retry) succeed.
// The failed attempt keeps emitting progress afterwards, mimicking Transformers.js
// parallel file downloads that continue after one file (e.g. tokenizer) fails.
export async function mockPipelineFailThenSucceed(page, mockResult) {
  await page.addInitScript(({ mockResult }) => {
    let calls = 0;
    globalThis.__TEST_PIPELINE_FN = async (task, model, options) => {
      calls++;
      if (calls === 1) {
        const cb = options?.progress_callback;
        if (cb) {
          setTimeout(() => cb({ status: 'progress', file: 'model.onnx', progress: 60 }), 50);
          setTimeout(() => cb({ status: 'progress', file: 'model.onnx', progress: 90 }), 150);
        }
        throw new Error('Simulated transient model loading failure');
      }
      return async () => mockResult;
    };
  }, { mockResult });

  await page.route(/huggingface\.co/, route =>
    route.fulfill({ status: 200, contentType: 'application/json', body: '{}' })
  );
}
