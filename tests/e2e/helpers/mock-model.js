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
