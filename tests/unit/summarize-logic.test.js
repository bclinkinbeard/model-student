import { describe, test, mock } from 'node:test';
import assert from 'node:assert/strict';
import { computeSummaryStats, isTooShort, FALLBACK_MODELS, loadWithFallback } from '../../pages/summarize/summarize-logic.js';

describe('computeSummaryStats', () => {
  test('calculates correct word counts', () => {
    const s = computeSummaryStats('one two three four five', 'one two');
    assert.strictEqual(s.originalWords, 5);
    assert.strictEqual(s.summaryWords, 2);
  });
  test('calculates compression percentage', () => {
    const s = computeSummaryStats('word '.repeat(100).trim(), 'word '.repeat(25).trim());
    assert.strictEqual(s.compressionPercent, 75);
  });
  test('handles empty summary (100% compression)', () => {
    const s = computeSummaryStats('some text here', '');
    assert.strictEqual(s.summaryWords, 0);
    assert.strictEqual(s.compressionPercent, 100);
  });
  test('handles empty original (0% compression)', () => {
    const s = computeSummaryStats('', '');
    assert.strictEqual(s.originalWords, 0);
    assert.strictEqual(s.compressionPercent, 0);
  });
  test('handles multi-space and newlines in word counting', () => {
    const s = computeSummaryStats('one  two\nthree\t\tfour', 'a');
    assert.strictEqual(s.originalWords, 4);
  });
});

describe('isTooShort', () => {
  test('returns true for text under 30 words', () => { assert.strictEqual(isTooShort('hello world', 30), true); });
  test('returns false for text at 30 words', () => { assert.strictEqual(isTooShort('word '.repeat(30).trim(), 30), false); });
  test('returns false for text above 30 words', () => { assert.strictEqual(isTooShort('word '.repeat(50).trim(), 30), false); });
  test('returns true for empty string', () => { assert.strictEqual(isTooShort('', 30), true); });
});

describe('FALLBACK_MODELS', () => {
  test('contains exactly 3 models', () => { assert.strictEqual(FALLBACK_MODELS.length, 3); });
  test('first is Xenova/distilbart-cnn-6-6', () => { assert.strictEqual(FALLBACK_MODELS[0], 'Xenova/distilbart-cnn-6-6'); });
});

describe('loadWithFallback', () => {
  test('returns first successful model', async () => {
    const loader = mock.fn(async () => ({ summarize: () => {} }));
    const r = await loadWithFallback(loader, 'summarization', FALLBACK_MODELS, {});
    assert.strictEqual(r.model, 'Xenova/distilbart-cnn-6-6');
    assert.strictEqual(loader.mock.calls.length, 1);
  });
  test('tries next model when first returns null', async () => {
    let c = 0;
    const loader = mock.fn(async () => { c++; if (c === 1) return null; return { summarize: () => {} }; });
    const r = await loadWithFallback(loader, 'summarization', FALLBACK_MODELS, {});
    assert.strictEqual(r.model, 'onnx-community/distilbart-cnn-6-6');
  });
  test('returns null when all models fail', async () => {
    const loader = mock.fn(async () => null);
    assert.strictEqual(await loadWithFallback(loader, 'summarization', FALLBACK_MODELS, {}), null);
    assert.strictEqual(loader.mock.calls.length, 3);
  });
});
