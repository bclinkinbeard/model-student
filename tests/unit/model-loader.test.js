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

  test('progress forwarding: progress_callback forwards events to onProgress', async () => {
    const onProgress = mock.fn();
    const pipelineFn = mock.fn(async (task, model, opts) => {
      opts.progress_callback({ status: 'progress', progress: 50 });
      return { ok: true };
    });
    await createLoader(pipelineFn)('task', 'model', { onProgress });
    assert.strictEqual(onProgress.mock.calls.length, 1);
    assert.deepStrictEqual(onProgress.mock.calls[0].arguments[0], { status: 'progress', progress: 50 });
  });

  test('progress forwarding: no progress_callback when onProgress omitted', async () => {
    await loadModel('task', 'model');
    const opts = fakePipeline.mock.calls[0].arguments[2];
    assert.strictEqual(opts.progress_callback, undefined);
  });

  test('stale progress: events after a failed load are dropped', async () => {
    const onProgress = mock.fn();
    let lateCallback;
    const failing = mock.fn(async (task, model, opts) => {
      lateCallback = opts.progress_callback;
      throw new Error('tokenizer fetch failed');
    });
    const result = await createLoader(failing)('task', 'model', { onProgress });
    assert.strictEqual(result, null);
    lateCallback({ status: 'progress', progress: 80 }); // parallel download still running
    assert.strictEqual(onProgress.mock.calls.length, 0);
  });

  test('stale progress: events after a successful load are dropped', async () => {
    const onProgress = mock.fn();
    let lateCallback;
    const pipelineFn = mock.fn(async (task, model, opts) => {
      lateCallback = opts.progress_callback;
      return { ok: true };
    });
    await createLoader(pipelineFn)('task', 'model', { onProgress });
    lateCallback({ status: 'progress', progress: 80 });
    assert.strictEqual(onProgress.mock.calls.length, 0);
  });

  test('progress callback errors do not fail the load', async () => {
    const onProgress = mock.fn(() => { throw new Error('render bug'); });
    const pipelineFn = mock.fn(async (task, model, opts) => {
      opts.progress_callback({ status: 'progress', progress: 10 });
      return { ok: true };
    });
    const result = await createLoader(pipelineFn)('task', 'model', { onProgress });
    assert.deepStrictEqual(result, { ok: true });
  });

  test('synchronous pipeline throw resolves to null and allows retry', async () => {
    let calls = 0;
    const pipelineFn = mock.fn(() => { calls++; if (calls === 1) throw new Error('sync boom'); return Promise.resolve({ ok: true }); });
    const loader = createLoader(pipelineFn);
    assert.strictEqual(await loader('task', 'model'), null);
    assert.deepStrictEqual(await loader('task', 'model'), { ok: true });
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
