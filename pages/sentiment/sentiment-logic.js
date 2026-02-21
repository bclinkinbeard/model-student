const LABEL_MAP = {
  POSITIVE: { emoji: '\u{1F60A}', colorVar: '--positive' },
  NEGATIVE: { emoji: '\u{1F614}', colorVar: '--negative' },
};

export function formatSentimentResult(rawResult) {
  const { label, score } = rawResult[0];
  const mapping = LABEL_MAP[label] || { emoji: '', colorVar: '--text-primary' };
  return {
    label,
    emoji: mapping.emoji,
    colorVar: mapping.colorVar,
    percentText: `${(score * 100).toFixed(1)}%`,
    barWidthPercent: score * 100,
  };
}

export function isInputValid(text) {
  return text.trim().length > 0;
}
