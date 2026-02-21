import { test, expect } from '@playwright/test';
import { mockPipeline, mockPipelineFailure } from './helpers/mock-model.js';
import AxeBuilder from '@axe-core/playwright';
import path from 'node:path';

const IMAGE_CLASSIFY_URL = '/pages/image-classify/';
const TEST_IMAGE = path.resolve('tests/e2e/fixtures/test-image.jpg');

const MOCK_RESULTS = [
  { label: 'golden retriever', score: 0.85 },
  { label: 'labrador retriever', score: 0.06 },
  { label: 'collie', score: 0.04 },
  { label: 'poodle', score: 0.03 },
  { label: 'beagle', score: 0.02 },
];

test.describe('Image Classification', () => {
  test('shows model ready state', async ({ page }) => {
    await mockPipeline(page, 'image-classification', MOCK_RESULTS);
    await page.goto(IMAGE_CLASSIFY_URL);
    await expect(page.locator('#model-status')).toContainText('Model ready');
    await expect(page.locator('#model-status')).toHaveClass(/model-status--ready/);
  });

  test('shows drop zone with upload prompt', async ({ page }) => {
    await mockPipeline(page, 'image-classification', MOCK_RESULTS);
    await page.goto(IMAGE_CLASSIFY_URL);
    await expect(page.locator('#drop-zone')).toContainText('Drop an image here or click to upload');
  });

  test('click-to-upload: selects file via input, shows preview', async ({ page }) => {
    await mockPipeline(page, 'image-classification', MOCK_RESULTS);
    await page.goto(IMAGE_CLASSIFY_URL);
    await expect(page.locator('#model-status')).toContainText('Model ready');
    const fileInput = page.locator('#file-input');
    await fileInput.setInputFiles(TEST_IMAGE);
    await expect(page.locator('.drop-zone-preview')).toBeVisible();
  });

  test('full flow: upload image, see top-5 results with rank bars', async ({ page }) => {
    await mockPipeline(page, 'image-classification', MOCK_RESULTS);
    await page.goto(IMAGE_CLASSIFY_URL);
    await expect(page.locator('#model-status')).toContainText('Model ready');
    const fileInput = page.locator('#file-input');
    await fileInput.setInputFiles(TEST_IMAGE);
    await page.click('#run-btn');
    await expect(page.locator('#result-area')).toContainText('golden retriever');
    await expect(page.locator('#result-area')).toContainText('85.0%');
    const rows = page.locator('[data-rank]');
    await expect(rows).toHaveCount(5);
  });

  test('rejects non-image file', async ({ page }) => {
    await mockPipeline(page, 'image-classification', MOCK_RESULTS);
    await page.goto(IMAGE_CLASSIFY_URL);
    await expect(page.locator('#model-status')).toContainText('Model ready');
    const fileInput = page.locator('#file-input');
    await fileInput.setInputFiles({
      name: 'test.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from('hello'),
    });
    await expect(page.locator('#result-area')).toContainText('Please upload an image file');
  });

  test('error state: model fails to load', async ({ page }) => {
    await mockPipelineFailure(page);
    await page.goto(IMAGE_CLASSIFY_URL);
    await expect(page.locator('#model-status')).toContainText('Failed to load model');
    await expect(page.locator('#model-status')).toHaveClass(/model-status--error/);
  });

  test('no a11y violations', async ({ page }) => {
    await mockPipeline(page, 'image-classification', MOCK_RESULTS);
    await page.goto(IMAGE_CLASSIFY_URL);
    await expect(page.locator('#model-status')).toContainText('Model ready');
    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
    expect(results.violations).toEqual([]);
  });
});
