import { prisma } from '../src/lib/prisma';
async function main() {
  const preds = await prisma.prediction.findMany({
    select: { aiPredictedScore: true, topScoresJson: true, finalHomeWin: true, finalDraw: true, finalAwayWin: true, aiConfidence: true },
  });
  const scoreCount: Record<string, number> = {};
  const topScoresFlat: Record<string, number> = {};
  for (const p of preds) {
    const s = p.aiPredictedScore || 'null';
    scoreCount[s] = (scoreCount[s] || 0) + 1;
    try {
      const arr = p.topScoresJson ? JSON.parse(p.topScoresJson) : [];
      for (const t of arr) topScoresFlat[`${t.home}-${t.away}`] = (topScoresFlat[`${t.home}-${t.away}`] || 0) + 1;
    } catch {}
  }
  console.log('=== 主预测分布 ===');
  console.log(scoreCount);
  console.log('=== top3 分布 ===');
  console.log(topScoresFlat);
  const n = preds.length;
  if (n) {
    const avg = (k: any) => preds.reduce((s, p) => s + (p[k] || 0), 0) / n;
    console.log('=== 概率均值 ===');
    console.log({ homeWin: avg('finalHomeWin').toFixed(3), draw: avg('finalDraw').toFixed(3), awayWin: avg('finalAwayWin').toFixed(3), confidence: avg('aiConfidence').toFixed(1) });
  }
  await prisma.$disconnect();
}
main();
