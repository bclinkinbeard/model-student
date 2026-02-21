import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { nextModelStatus, formatProgress } from '../../lib/model-status.js';

describe('nextModelStatus', () => {
  test('idle -> loading on LOAD_START', () => { assert.strictEqual(nextModelStatus('idle', 'LOAD_START'), 'loading'); });
  test('loading -> ready on LOAD_SUCCESS', () => { assert.strictEqual(nextModelStatus('loading', 'LOAD_SUCCESS'), 'ready'); });
  test('loading -> error on LOAD_FAILURE', () => { assert.strictEqual(nextModelStatus('loading', 'LOAD_FAILURE'), 'error'); });
  test('error -> loading on RETRY', () => { assert.strictEqual(nextModelStatus('error', 'RETRY'), 'loading'); });
  test('ignores invalid transition (ready + LOAD_START)', () => { assert.strictEqual(nextModelStatus('ready', 'LOAD_START'), 'ready'); });
  test('ignores unknown event', () => { assert.strictEqual(nextModelStatus('idle', 'UNKNOWN'), 'idle'); });
});

describe('formatProgress', () => {
  test('returns indeterminate for null event', () => {
    const r = formatProgress(null);
    assert.strictEqual(r.isIndeterminate, true);
    assert.strictEqual(r.percent, 0);
  });
  test('extracts percent from progress event', () => {
    const r = formatProgress({ status: 'progress', file: 'model.onnx', progress: 45.7 });
    assert.strictEqual(r.percent, 46);
    assert.strictEqual(r.isIndeterminate, false);
    assert.strictEqual(r.file, 'model.onnx');
  });
});
