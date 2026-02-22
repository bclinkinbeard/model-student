// Sentiment analysis — pure functions (no DOM, no browser APIs)

export const TASK = 'sentiment-analysis';
export const MODEL = 'Xenova/distilbert-base-uncased-finetuned-sst-2-english';

const LABEL_MAP = {
  POSITIVE: { emoji: '\u{1F60A}', colorVar: '--positive' },
  NEGATIVE: { emoji: '\u{1F614}', colorVar: '--negative' },
};

/**
 * Transform raw pipeline output into a view model.
 * @param {Array<{label: string, score: number}>} rawResult
 * @returns {{ label: string, emoji: string, colorVar: string, percentText: string, barWidthPercent: number }}
 */
export function formatSentimentResult(rawResult) {
  const { label, score } = rawResult[0];
  const meta = LABEL_MAP[label] || { emoji: '', colorVar: '' };
  const percent = score * 100;
  return {
    label,
    emoji: meta.emoji,
    colorVar: meta.colorVar,
    percentText: `${percent.toFixed(1)}%`,
    barWidthPercent: percent,
  };
}

/**
 * Returns false for empty or whitespace-only strings.
 * @param {string} text
 * @returns {boolean}
 */
export function isInputValid(text) {
  return text.trim().length > 0;
}
