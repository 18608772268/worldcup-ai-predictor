import { prisma } from '../src/lib/prisma';

async function main() {
  const preds = await prisma.prediction.findMany({
    take: 5,
    include: { match: { include: { homeTeam: true, awayTeam: true } } },
  });

  console.log('=' + '='.repeat(60));
  console.log('风险评分分布:');
  for (const p of preds) {
    const home = p.match.homeTeam.name;
    const away = p.match.awayTeam.name;
    console.log(`  ${home} vs ${away}: 风险=${p.riskScore}, 信心=${p.confidenceScore?.toFixed(0)}`);
  }
  console.log();
  console.log('第一场详细信息:');
  const p = preds[0];
  console.log(`  比赛: ${p.match.homeTeam.name} vs ${p.match.awayTeam.name}`);
  console.log(`  AI预测比分: ${p.aiPredictedScore}`);
  console.log(`  半全场: ${p.halfFullPred} (概率 ${(p.halfFullProb || 0) * 100}%)`);
  console.log(`  风险细分: ${p.riskBreakdownJson?.slice(0, 300)}`);
  console.log();
  if (p.topScoresJson) {
    const top = JSON.parse(p.topScoresJson);
    console.log('  前3比分:');
    top.forEach((s: any, i: number) => {
      console.log(`    ${i + 1}. ${s.score} (${(s.probability * 100).toFixed(1)}%) - ${s.reasoning}`);
    });
  }
  if (p.narrative) {
    console.log();
    console.log('  文字分析预览:');
    console.log(p.narrative.slice(0, 500));
  }

  await prisma.$disconnect();
}
main().catch(e => { console.error('错误:', e.message); process.exit(1); });
