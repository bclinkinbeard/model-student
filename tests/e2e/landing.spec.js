import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Landing Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('displays hero title and subtitle', async ({ page }) => {
    const title = page.locator('.landing-title');
    await expect(title).toHaveText('Model Student');

    const subtitle = page.locator('.landing-subtitle');
    await expect(subtitle).toHaveText('Run ML models in your browser. No server required.');
  });

  test('renders three experiment cards', async ({ page }) => {
    const cards = page.locator('.experiment-card');
    await expect(cards).toHaveCount(3);
  });

  test('sentiment card links to /pages/sentiment/', async ({ page }) => {
    const card = page.locator('.experiment-card', { hasText: 'Sentiment Analysis' });
    await expect(card).toHaveAttribute('href', '/pages/sentiment/');
  });

  test('image classification card links to /pages/image-classify/', async ({ page }) => {
    const card = page.locator('.experiment-card', { hasText: 'Image Classification' });
    await expect(card).toHaveAttribute('href', '/pages/image-classify/');
  });

  test('summarize card links to /pages/summarize/', async ({ page }) => {
    const card = page.locator('.experiment-card', { hasText: 'Text Summarization' });
    await expect(card).toHaveAttribute('href', '/pages/summarize/');
  });

  test('footer contains Transformers.js link', async ({ page }) => {
    const footer = page.locator('.landing-footer');
    const link = footer.locator('a');
    await expect(link).toHaveText('Transformers.js');
    await expect(link).toHaveAttribute('href', 'https://huggingface.co/docs/transformers.js');
  });

  test('cards navigate to correct pages on click', async ({ page }) => {
    const sentimentCard = page.locator('.experiment-card', { hasText: 'Sentiment Analysis' });
    await sentimentCard.click();
    await expect(page).toHaveURL(/\/pages\/sentiment\//);
    await expect(page.locator('.experiment-title')).toHaveText('Sentiment Analysis');
  });

  test('accessibility: no WCAG AA violations', async ({ page }) => {
    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
    expect(results.violations).toEqual([]);
  });
});
