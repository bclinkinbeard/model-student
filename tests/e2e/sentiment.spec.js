import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { mockPipeline, mockPipelineFailure } from './helpers/mock-model.js';

const POSITIVE_RESULT = [{ label: 'POSITIVE', score: 0.9998 }];
const NEGATIVE_RESULT = [{ label: 'NEGATIVE', score: 0.9854 }];

test.describe('Sentiment Analysis', () => {
  test('shows loading state then ready state', async ({ page }) => {
    await mockPipeline(page, 'sentiment-analysis', POSITIVE_RESULT);
    await page.goto('/pages/sentiment/');

    const status = page.locator('#model-status');
    await expect(status).toContainText('Model ready');
    await expect(status).toHaveClass(/model-status--ready/);
  });

  test('analyze button disabled until model ready', async ({ page }) => {
    await mockPipeline(page, 'sentiment-analysis', POSITIVE_RESULT);
    await page.goto('/pages/sentiment/');

    const btn = page.locator('#run-btn');
    await expect(page.locator('#model-status')).toContainText('Model ready');
    // Button should still be disabled because textarea is empty
    await expect(btn).toBeDisabled();
  });

  test('button enables when model ready AND textarea has text', async ({ page }) => {
    await mockPipeline(page, 'sentiment-analysis', POSITIVE_RESULT);
    await page.goto('/pages/sentiment/');

    await expect(page.locator('#model-status')).toContainText('Model ready');
    await page.fill('#text-input', 'I love this product!');
    await expect(page.locator('#run-btn')).toBeEnabled();
  });

  test('full positive flow: type text, click, see POSITIVE result', async ({ page }) => {
    await mockPipeline(page, 'sentiment-analysis', POSITIVE_RESULT);
    await page.goto('/pages/sentiment/');

    await expect(page.locator('#model-status')).toContainText('Model ready');
    await page.fill('#text-input', 'I absolutely loved this movie!');
    await page.click('#run-btn');

    const resultArea = page.locator('#result-area');
    await expect(resultArea).toContainText('POSITIVE');
    await expect(resultArea).toContainText('100.0%');
  });

  test('full negative flow: type text, click, see NEGATIVE result', async ({ page }) => {
    await mockPipeline(page, 'sentiment-analysis', NEGATIVE_RESULT);
    await page.goto('/pages/sentiment/');

    await expect(page.locator('#model-status')).toContainText('Model ready');
    await page.fill('#text-input', 'This was terrible and I hated it.');
    await page.click('#run-btn');

    const resultArea = page.locator('#result-area');
    await expect(resultArea).toContainText('NEGATIVE');
    await expect(resultArea).toContainText('98.5%');
  });

  test('button disabled when textarea is empty', async ({ page }) => {
    await mockPipeline(page, 'sentiment-analysis', POSITIVE_RESULT);
    await page.goto('/pages/sentiment/');

    await expect(page.locator('#model-status')).toContainText('Model ready');
    await page.fill('#text-input', 'some text');
    await expect(page.locator('#run-btn')).toBeEnabled();
    await page.fill('#text-input', '');
    await expect(page.locator('#run-btn')).toBeDisabled();
  });

  test('error state: model fails to load', async ({ page }) => {
    await mockPipelineFailure(page);
    await page.goto('/pages/sentiment/');

    const status = page.locator('#model-status');
    await expect(status).toContainText('Failed to load model');
    await expect(status).toHaveClass(/model-status--error/);
  });

  test('accessibility: no WCAG AA violations', async ({ page }) => {
    await mockPipeline(page, 'sentiment-analysis', POSITIVE_RESULT);
    await page.goto('/pages/sentiment/');
    await expect(page.locator('#model-status')).toContainText('Model ready');

    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
    expect(results.violations).toEqual([]);
  });
});
