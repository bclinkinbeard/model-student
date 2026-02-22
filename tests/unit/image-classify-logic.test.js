import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { formatClassificationResults, isValidImageFile } from '../../pages/image-classify/image-classify-logic.js';

describe('formatClassificationResults', () => {
  const sample = [
    { label: 'golden retriever', score: 0.85 },
    { label: 'labrador', score: 0.06 },
    { label: 'collie', score: 0.04 },
    { label: 'poodle', score: 0.03 },
    { label: 'beagle', score: 0.02 },
  ];

  test('sorts by score descending', () => {
    const shuffled = [...sample].reverse();
    const results = formatClassificationResults(shuffled);
    assert.strictEqual(results[0].label, 'golden retriever');
  });
  test('assigns ranks 1 through 5', () => {
    assert.deepStrictEqual(formatClassificationResults(sample).map(r => r.rank), [1, 2, 3, 4, 5]);
  });
  test('rank 1 uses accent color', () => {
    assert.strictEqual(formatClassificationResults(sample)[0].colorVar, '--accent');
  });
  test('ranks 2-5 use info color', () => {
    formatClassificationResults(sample).slice(1).forEach(r => assert.strictEqual(r.colorVar, '--info'));
  });
  test('bar width: rank 1 is 100%, others proportional to top', () => {
    const raw = [{ label: 'a', score: 0.8 }, { label: 'b', score: 0.4 }, { label: 'c', score: 0.2 }];
    const results = formatClassificationResults(raw);
    assert.strictEqual(results[0].barWidthPercent, 100);
    assert.strictEqual(results[1].barWidthPercent, 50);
    assert.strictEqual(results[2].barWidthPercent, 25);
  });
  test('formats percentage to one decimal place', () => {
    assert.strictEqual(formatClassificationResults(sample)[0].percentText, '85.0%');
  });
  test('handles fewer than 5 results', () => {
    const results = formatClassificationResults([{ label: 'cat', score: 1.0 }]);
    assert.strictEqual(results.length, 1);
    assert.strictEqual(results[0].rank, 1);
  });
  test('handles empty array', () => {
    assert.strictEqual(formatClassificationResults([]).length, 0);
  });
});

describe('isValidImageFile', () => {
  test('accepts image/png', () => { assert.strictEqual(isValidImageFile({ type: 'image/png' }), true); });
  test('accepts image/jpeg', () => { assert.strictEqual(isValidImageFile({ type: 'image/jpeg' }), true); });
  test('accepts image/webp', () => { assert.strictEqual(isValidImageFile({ type: 'image/webp' }), true); });
  test('rejects application/pdf', () => { assert.strictEqual(isValidImageFile({ type: 'application/pdf' }), false); });
  test('rejects text/plain', () => { assert.strictEqual(isValidImageFile({ type: 'text/plain' }), false); });
  test('rejects null', () => { assert.strictEqual(isValidImageFile(null), false); });
  test('rejects undefined', () => { assert.strictEqual(isValidImageFile(undefined), false); });
  test('rejects object without type', () => { assert.strictEqual(isValidImageFile({}), false); });
});
