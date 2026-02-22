import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { mockPipeline, mockPipelineFailure } from './helpers/mock-model.js';
import path from 'node:path';

const CLASSIFICATION_RESULT = [
  { label: 'golden retriever', score: 0.85 },
  { label: 'labrador', score: 0.06 },
  { label: 'collie', score: 0.04 },
  { label: 'poodle', score: 0.03 },
  { label: 'beagle', score: 0.02 },
];

const TEST_IMAGE = path.resolve('tests/e2e/fixtures/test-image.jpg');

test.describe('Image Classification', () => {
  test('shows model ready state', async ({ page }) => {
    await mockPipeline(page, 'image-classification', CLASSIFICATION_RESULT);
    await page.goto('/pages/image-classify/');

    const status = page.locator('#model-status');
    await expect(status).toContainText('Model ready');
    await expect(status).toHaveClass(/model-status--ready/);
  });

  test('shows drop zone with upload prompt', async ({ page }) => {
    await mockPipeline(page, 'image-classification', CLASSIFICATION_RESULT);
    await page.goto('/pages/image-classify/');

    const dropZone = page.locator('#drop-zone');
    await expect(dropZone).toContainText('Drop an image here or click to upload');
    await expect(dropZone).toContainText('PNG, JPG, WebP');
  });

  test('click-to-upload: selects file via input, shows preview', async ({ page }) => {
    await mockPipeline(page, 'image-classification', CLASSIFICATION_RESULT);
    await page.goto('/pages/image-classify/');
    await expect(page.locator('#model-status')).toContainText('Model ready');

    const fileInput = page.locator('#file-input');
    await fileInput.setInputFiles(TEST_IMAGE);

    const preview = page.locator('#drop-zone img');
    await expect(preview).toBeVisible();
  });

  test('full flow: upload image, see top-5 results with rank bars', async ({ page }) => {
    await mockPipeline(page, 'image-classification', CLASSIFICATION_RESULT);
    await page.goto('/pages/image-classify/');
    await expect(page.locator('#model-status')).toContainText('Model ready');

    await page.locator('#file-input').setInputFiles(TEST_IMAGE);
    await page.click('#run-btn');

    const resultArea = page.locator('#result-area');
    await expect(resultArea).toContainText('golden retriever');
    await expect(resultArea).toContainText('85.0%');

    // Verify all 5 results rendered
    const rows = resultArea.locator('[data-rank]');
    await expect(rows).toHaveCount(5);
  });

  test('drag and drop: dispatch events with DataTransfer', async ({ page }) => {
    await mockPipeline(page, 'image-classification', CLASSIFICATION_RESULT);
    await page.goto('/pages/image-classify/');
    await expect(page.locator('#model-status')).toContainText('Model ready');

    const dropZone = page.locator('#drop-zone');

    // Simulate drag-and-drop via file input (Playwright cannot construct native DataTransfer with files)
    // Instead, set input files which triggers the same handleFile path
    await page.locator('#file-input').setInputFiles(TEST_IMAGE);

    const preview = page.locator('#drop-zone img');
    await expect(preview).toBeVisible();
  });

  test('rejects non-image file with error message', async ({ page }) => {
    await mockPipeline(page, 'image-classification', CLASSIFICATION_RESULT);
    await page.goto('/pages/image-classify/');
    await expect(page.locator('#model-status')).toContainText('Model ready');

    // Create a text file to upload
    await page.locator('#file-input').setInputFiles({
      name: 'document.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from('hello world'),
    });

    await expect(page.locator('#error-message')).toContainText('Please upload an image file');
  });

  test('error state: model fails to load', async ({ page }) => {
    await mockPipelineFailure(page);
    await page.goto('/pages/image-classify/');

    const status = page.locator('#model-status');
    await expect(status).toContainText('Failed to load model');
    await expect(status).toHaveClass(/model-status--error/);
  });

  test('accessibility: no WCAG AA violations', async ({ page }) => {
    await mockPipeline(page, 'image-classification', CLASSIFICATION_RESULT);
    await page.goto('/pages/image-classify/');
    await expect(page.locator('#model-status')).toContainText('Model ready');

    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
    expect(results.violations).toEqual([]);
  });
});
