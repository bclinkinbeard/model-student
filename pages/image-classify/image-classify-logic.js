export function formatClassificationResults(rawResults) {
  if (rawResults.length === 0) return [];

  const sorted = [...rawResults].sort((a, b) => b.score - a.score);
  const topScore = sorted[0].score;

  return sorted.map((item, i) => ({
    rank: i + 1,
    label: item.label,
    score: item.score,
    percentText: `${(item.score * 100).toFixed(1)}%`,
    barWidthPercent: (item.score / topScore) * 100,
    colorVar: i === 0 ? '--accent' : '--info',
  }));
}

export function isValidImageFile(file) {
  return file?.type?.startsWith('image/') ?? false;
}
