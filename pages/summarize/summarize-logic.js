export const FALLBACK_MODELS = [
  'Xenova/distilbart-cnn-6-6',
  'onnx-community/distilbart-cnn-6-6',
  'Xenova/distilbart-cnn-12-6',
];

export async function loadWithFallback(loaderFn, task, models, options) {
  for (const model of models) {
    const result = await loaderFn(task, model, options);
    if (result !== null) return { pipeline: result, model };
  }
  return null;
}

export function computeSummaryStats(originalText, summaryText) {
  const countWords = (t) => {
    if (t == null) return 0;
    const trimmed = t.trim();
    return trimmed === '' ? 0 : trimmed.split(/\s+/).length;
  };
  const originalWords = countWords(originalText);
  const summaryWords = countWords(summaryText);
  const compressionPercent = originalWords === 0 ? 0 : Math.round((1 - summaryWords / originalWords) * 100);
  return { originalWords, summaryWords, compressionPercent };
}

export function isTooShort(text, minWords = 30) {
  const trimmed = text.trim();
  return trimmed === '' || trimmed.split(/\s+/).length < minWords;
}
