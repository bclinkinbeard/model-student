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

  test('second submission works without page refresh', async ({ page }) => {
    await mockPipeline(page, 'sentiment-analysis', POSITIVE_RESULT);
    await page.goto('/pages/sentiment/');

    // Plant a sentinel that would be lost on any page reload
    await page.evaluate(() => { window.__NO_RELOAD_SENTINEL = true; });

    // Track any navigation events (would fire on page refresh)
    const navigations = [];
    page.on('framenavigated', (frame) => {
      if (frame === page.mainFrame()) navigations.push(frame.url());
    });

    // Collect console errors
    const errors = [];
    page.on('console', (msg) => { if (msg.type() === 'error') errors.push(msg.text()); });
    page.on('pageerror', (err) => errors.push(err.message));

    // First analysis — use keyboard to type (not page.fill)
    await expect(page.locator('#model-status')).toContainText('Model ready');
    await page.locator('#text-input').click();
    await page.keyboard.type('I absolutely loved this movie!');
    await page.click('#run-btn');
    await expect(page.locator('#result-area')).toContainText('POSITIVE');

    // After analysis, focus should return to the textarea automatically.
    // User presses Ctrl+A to select all, deletes, and retypes.
    await expect(page.locator('#text-input')).toBeFocused();
    await page.keyboard.press('ControlOrMeta+a');
    await page.keyboard.press('Backspace');
    await page.keyboard.type('This is a new sentence to analyze', { delay: 20 });

    // Verify no reload occurred
    const alive = await page.evaluate(() => window.__NO_RELOAD_SENTINEL);
    expect(alive).toBe(true);
    expect(navigations).toHaveLength(0);
    await expect(page.locator('#model-status')).toContainText('Model ready');
    await expect(page.locator('#text-input')).toHaveValue('This is a new sentence to analyze');

    // Second analysis should work
    await expect(page.locator('#run-btn')).toBeEnabled();
    await page.click('#run-btn');
    await expect(page.locator('#result-area')).toContainText('POSITIVE');

    // Sentinel still alive after second analysis
    const stillAlive = await page.evaluate(() => window.__NO_RELOAD_SENTINEL);
    expect(stillAlive).toBe(true);

    // No unexpected errors
    expect(errors).toHaveLength(0);
  });

  test('clearing text after inference does not crash or reload', async ({ page }) => {
    await mockPipeline(page, 'sentiment-analysis', POSITIVE_RESULT);
    await page.goto('/pages/sentiment/');

    // Plant sentinel + track crashes, navigations, and errors
    await page.evaluate(() => { window.__NO_RELOAD_SENTINEL = true; });
    const navigations = [];
    page.on('framenavigated', (frame) => {
      if (frame === page.mainFrame()) navigations.push(frame.url());
    });
    const errors = [];
    page.on('console', (msg) => { if (msg.type() === 'error') errors.push(msg.text()); });
    page.on('pageerror', (err) => errors.push(err.message));
    let crashed = false;
    page.on('crash', () => { crashed = true; });

    // Run inference
    await expect(page.locator('#model-status')).toContainText('Model ready');
    await page.locator('#text-input').click();
    await page.keyboard.type('I absolutely loved this movie!');
    await page.click('#run-btn');
    await expect(page.locator('#result-area')).toContainText('POSITIVE');

    // Clear the textarea — this is the action that triggered the crash
    await expect(page.locator('#text-input')).toBeFocused();
    await page.keyboard.press('ControlOrMeta+a');
    await page.keyboard.press('Backspace');
    await expect(page.locator('#text-input')).toHaveValue('');

    // Pause to let any async crash surface
    await page.waitForTimeout(500);

    // Page should still be alive
    expect(crashed).toBe(false);
    const alive = await page.evaluate(() => window.__NO_RELOAD_SENTINEL);
    expect(alive).toBe(true);
    expect(navigations).toHaveLength(0);
    expect(errors).toHaveLength(0);

    // UI should be in correct state: button disabled, model still ready
    await expect(page.locator('#run-btn')).toBeDisabled();
    await expect(page.locator('#model-status')).toContainText('Model ready');
    await expect(page.locator('#model-status')).toHaveClass(/model-status--ready/);
  });

  test('accessibility: no WCAG AA violations', async ({ page }) => {
    await mockPipeline(page, 'sentiment-analysis', POSITIVE_RESULT);
    await page.goto('/pages/sentiment/');
    await expect(page.locator('#model-status')).toContainText('Model ready');

    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
    expect(results.violations).toEqual([]);
  });
});
