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
