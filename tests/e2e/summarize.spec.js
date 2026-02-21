import { test, expect } from '@playwright/test';
import { mockPipeline, mockPipelineFailure } from './helpers/mock-model.js';
import AxeBuilder from '@axe-core/playwright';

const SUMMARIZE_URL = '/pages/summarize/';

const LONG_TEXT = 'The quick brown fox jumps over the lazy dog. '.repeat(10) +
  'This is a longer text that should be suitable for summarization. ' +
  'It contains multiple sentences and enough words to pass the minimum threshold. ' +
  'The model will process this text and produce a condensed summary. ' +
  'Summarization is an important NLP task that helps users quickly understand long documents.';

test.describe('Text Summarization', () => {
  test('shows model ready state', async ({ page }) => {
    await mockPipeline(page, 'summarization', [{ summary_text: 'A summary.' }]);
    await page.goto(SUMMARIZE_URL);
    await expect(page.locator('#model-status')).toContainText('Model ready');
    await expect(page.locator('#model-status')).toHaveClass(/model-status--ready/);
  });

  test('shows download size warning', async ({ page }) => {
    await mockPipeline(page, 'summarization', [{ summary_text: 'A summary.' }]);
    await page.goto(SUMMARIZE_URL);
    await expect(page.locator('.size-warning')).toContainText('~284 MB');
  });

  test('button disabled when textarea empty', async ({ page }) => {
    await mockPipeline(page, 'summarization', [{ summary_text: 'A summary.' }]);
    await page.goto(SUMMARIZE_URL);
    await expect(page.locator('#model-status')).toContainText('Model ready');
    await expect(page.locator('#run-btn')).toBeDisabled();
  });

  test('full flow: paste text, summarize, see summary with stats', async ({ page }) => {
    await mockPipeline(page, 'summarization', [{ summary_text: 'A fox jumps over a dog. Summarization is important.' }]);
    await page.goto(SUMMARIZE_URL);
    await expect(page.locator('#model-status')).toContainText('Model ready');
    await page.fill('#text-input', LONG_TEXT);
    await page.click('#run-btn');
    await expect(page.locator('#result-area')).toContainText('A fox jumps over a dog');
    await expect(page.locator('#result-area')).toContainText('Original');
    await expect(page.locator('#result-area')).toContainText('Compression');
  });

  test('short text warning for input under 30 words', async ({ page }) => {
    await mockPipeline(page, 'summarization', [{ summary_text: 'Short.' }]);
    await page.goto(SUMMARIZE_URL);
    await expect(page.locator('#model-status')).toContainText('Model ready');
    await page.fill('#text-input', 'This is a short text.');
    await expect(page.locator('#short-text-warning')).toContainText('too short');
  });

  test('error state: model fails to load', async ({ page }) => {
    await mockPipelineFailure(page);
    await page.goto(SUMMARIZE_URL);
    await expect(page.locator('#model-status')).toContainText('Failed to load model');
    await expect(page.locator('#model-status')).toHaveClass(/model-status--error/);
  });

  test('back link navigates to landing page', async ({ page }) => {
    await mockPipeline(page, 'summarization', [{ summary_text: 'A summary.' }]);
    await page.goto(SUMMARIZE_URL);
    await page.click('.back-link');
    await expect(page).toHaveURL('/');
  });

  test('no a11y violations', async ({ page }) => {
    await mockPipeline(page, 'summarization', [{ summary_text: 'A summary.' }]);
    await page.goto(SUMMARIZE_URL);
    await expect(page.locator('#model-status')).toContainText('Model ready');
    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
    expect(results.violations).toEqual([]);
  });
});
