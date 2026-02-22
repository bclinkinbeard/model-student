// Image classification — pure functions (no DOM, no browser APIs)

export const TASK = 'image-classification';
export const MODEL = 'Xenova/vit-base-patch16-224';

/**
 * Transform raw pipeline output into a view model for rendering.
 * @param {Array<{label: string, score: number}>} rawResults
 * @returns {Array<{rank: number, label: string, score: number, percentText: string, barWidthPercent: number, colorVar: string}>}
 */
export function formatClassificationResults(rawResults) {
  if (!rawResults || rawResults.length === 0) return [];

  const sorted = [...rawResults].sort((a, b) => b.score - a.score);
  const topScore = sorted[0].score;

  return sorted.map((item, i) => ({
    rank: i + 1,
    label: item.label,
    score: item.score,
    percentText: `${(item.score * 100).toFixed(1)}%`,
    barWidthPercent: topScore === 0 ? 0 : (item.score / topScore) * 100,
    colorVar: i === 0 ? '--accent' : '--info',
  }));
}

/**
 * Check if a file object is a valid image.
 * @param {File|null|undefined} file
 * @returns {boolean}
 */
export function isValidImageFile(file) {
  return file?.type?.startsWith('image/') === true;
}
