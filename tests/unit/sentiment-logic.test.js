import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { formatSentimentResult, isInputValid } from '../../pages/sentiment/sentiment-logic.js';

describe('formatSentimentResult', () => {
  test('positive result has green color var', () => {
    assert.strictEqual(formatSentimentResult([{ label: 'POSITIVE', score: 0.92 }]).colorVar, '--positive');
  });
  test('negative result has red color var', () => {
    assert.strictEqual(formatSentimentResult([{ label: 'NEGATIVE', score: 0.85 }]).colorVar, '--negative');
  });
  test('positive result has correct emoji', () => {
    assert.strictEqual(formatSentimentResult([{ label: 'POSITIVE', score: 0.5 }]).emoji, '\u{1F60A}');
  });
  test('negative result has correct emoji', () => {
    assert.strictEqual(formatSentimentResult([{ label: 'NEGATIVE', score: 0.5 }]).emoji, '\u{1F614}');
  });
  test('formats percentage to one decimal place', () => {
    assert.strictEqual(formatSentimentResult([{ label: 'POSITIVE', score: 0.921 }]).percentText, '92.1%');
  });
  test('bar width equals score * 100', () => {
    assert.strictEqual(formatSentimentResult([{ label: 'POSITIVE', score: 0.75 }]).barWidthPercent, 75.0);
  });
  test('handles near-100% score', () => {
    assert.strictEqual(formatSentimentResult([{ label: 'POSITIVE', score: 0.9997 }]).percentText, '100.0%');
  });
  test('preserves original label string', () => {
    assert.strictEqual(formatSentimentResult([{ label: 'POSITIVE', score: 0.8 }]).label, 'POSITIVE');
  });
});

describe('isInputValid', () => {
  test('empty string is invalid', () => { assert.strictEqual(isInputValid(''), false); });
  test('whitespace-only is invalid', () => { assert.strictEqual(isInputValid('   \n\t  '), false); });
  test('non-empty string is valid', () => { assert.strictEqual(isInputValid('hello'), true); });
});
