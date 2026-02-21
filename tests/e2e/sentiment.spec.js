import { test, expect } from '@playwright/test';
import { mockPipeline, mockPipelineFailure } from './helpers/mock-model.js';
import AxeBuilder from '@axe-core/playwright';

const SENTIMENT_URL = '/pages/sentiment/';

test.describe('Sentiment Analysis', () => {
  test('shows loading state then ready state', async ({ page }) => {
    await mockPipeline(page, 'sentiment-analysis', [{ label: 'POSITIVE', score: 0.95 }]);
    await page.goto(SENTIMENT_URL);
    await expect(page.locator('#model-status')).toContainText('Model ready');
    await expect(page.locator('#model-status')).toHaveClass(/model-status--ready/);
  });

  test('analyze button disabled until model ready', async ({ page }) => {
    await mockPipeline(page, 'sentiment-analysis', [{ label: 'POSITIVE', score: 0.95 }]);
    await page.goto(SENTIMENT_URL);
    await expect(page.locator('#model-status')).toContainText('Model ready');
    // Button should still be disabled without text input
    await expect(page.locator('#run-btn')).toBeDisabled();
  });

  test('button enables when model ready AND textarea has text', async ({ page }) => {
    await mockPipeline(page, 'sentiment-analysis', [{ label: 'POSITIVE', score: 0.95 }]);
    await page.goto(SENTIMENT_URL);
    await expect(page.locator('#model-status')).toContainText('Model ready');
    await page.fill('#text-input', 'This is great!');
    await expect(page.locator('#run-btn')).toBeEnabled();
  });

  test('full positive flow: type text, click, see POSITIVE result', async ({ page }) => {
    await mockPipeline(page, 'sentiment-analysis', [{ label: 'POSITIVE', score: 0.95 }]);
    await page.goto(SENTIMENT_URL);
    await expect(page.locator('#model-status')).toContainText('Model ready');
    await page.fill('#text-input', 'I absolutely loved this movie!');
    await page.click('#run-btn');
    await expect(page.locator('#result-area')).toContainText('POSITIVE');
    await expect(page.locator('#result-area')).toContainText('95.0%');
  });

  test('full negative flow', async ({ page }) => {
    await mockPipeline(page, 'sentiment-analysis', [{ label: 'NEGATIVE', score: 0.87 }]);
    await page.goto(SENTIMENT_URL);
    await expect(page.locator('#model-status')).toContainText('Model ready');
    await page.fill('#text-input', 'This was terrible.');
    await page.click('#run-btn');
    await expect(page.locator('#result-area')).toContainText('NEGATIVE');
    await expect(page.locator('#result-area')).toContainText('87.0%');
  });

  test('button disabled when textarea is empty', async ({ page }) => {
    await mockPipeline(page, 'sentiment-analysis', [{ label: 'POSITIVE', score: 0.95 }]);
    await page.goto(SENTIMENT_URL);
    await expect(page.locator('#model-status')).toContainText('Model ready');
    await expect(page.locator('#run-btn')).toBeDisabled();
    await page.fill('#text-input', 'hello');
    await expect(page.locator('#run-btn')).toBeEnabled();
    await page.fill('#text-input', '');
    await expect(page.locator('#run-btn')).toBeDisabled();
  });

  test('error state: model fails to load', async ({ page }) => {
    await mockPipelineFailure(page);
    await page.goto(SENTIMENT_URL);
    await expect(page.locator('#model-status')).toContainText('Failed to load model');
    await expect(page.locator('#model-status')).toHaveClass(/model-status--error/);
  });

  test('back link navigates to landing page', async ({ page }) => {
    await mockPipeline(page, 'sentiment-analysis', [{ label: 'POSITIVE', score: 0.95 }]);
    await page.goto(SENTIMENT_URL);
    await page.click('.back-link');
    await expect(page).toHaveURL('/');
  });

  test('no a11y violations', async ({ page }) => {
    await mockPipeline(page, 'sentiment-analysis', [{ label: 'POSITIVE', score: 0.95 }]);
    await page.goto(SENTIMENT_URL);
    await expect(page.locator('#model-status')).toContainText('Model ready');
    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
    expect(results.violations).toEqual([]);
  });
});
