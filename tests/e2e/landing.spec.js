import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Landing Page', () => {
  test('displays hero title and subtitle', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.hero-title')).toContainText('Model Student');
    await expect(page.locator('.hero-subtitle')).toContainText('Run ML models in your browser');
  });

  test('renders three experiment cards', async ({ page }) => {
    await page.goto('/');
    const cards = page.locator('.experiment-card');
    await expect(cards).toHaveCount(3);
  });

  test('sentiment card links to /pages/sentiment/', async ({ page }) => {
    await page.goto('/');
    const sentimentCard = page.locator('.experiment-card').filter({ hasText: 'Sentiment Analysis' });
    await expect(sentimentCard).toHaveAttribute('href', '/pages/sentiment/');
  });

  test('image classification card links to /pages/image-classify/', async ({ page }) => {
    await page.goto('/');
    const imageCard = page.locator('.experiment-card').filter({ hasText: 'Image Classification' });
    await expect(imageCard).toHaveAttribute('href', '/pages/image-classify/');
  });

  test('summarize card links to /pages/summarize/', async ({ page }) => {
    await page.goto('/');
    const summarizeCard = page.locator('.experiment-card').filter({ hasText: 'Text Summarization' });
    await expect(summarizeCard).toHaveAttribute('href', '/pages/summarize/');
  });

  test('footer contains Transformers.js link', async ({ page }) => {
    await page.goto('/');
    const footer = page.locator('.landing-footer');
    await expect(footer).toContainText('Transformers.js');
    const link = footer.locator('a');
    await expect(link).toHaveAttribute('href', 'https://huggingface.co/docs/transformers.js');
  });

  test('cards navigate to correct pages on click', async ({ page }) => {
    await page.goto('/');
    await page.click('.experiment-card >> text=Sentiment Analysis');
    await expect(page).toHaveURL(/\/pages\/sentiment\//);
  });

  test('no a11y violations', async ({ page }) => {
    await page.goto('/');
    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
    expect(results.violations).toEqual([]);
  });
});
