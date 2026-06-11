import { prisma } from '../src/lib/prisma';
async function main() {
  const matches = await prisma.match.findMany({
    where: { OR: [
      { homeTeam: { name: '德国' } },
      { awayTeam: { name: '德国' } },
    ]},
    include: { homeTeam: true, awayTeam: true, prediction: true },
  });
  for (const m of matches) {
    const p = m.prediction;
    const top = p?.topScoresJson ? JSON.parse(p.topScoresJson).slice(0,3).map((s:any)=>`${s.score}(${(s.probability*100).toFixed(0)}%)`).join(', ') : '-';
    console.log(`${m.homeTeam.name} vs ${m.awayTeam.name} (赔率 ${m.oddsWin}/${m.oddsDraw}/${m.oddsLose})`);
    console.log(`  预测 ${p?.aiPredictedScore} | H${(p?.finalHomeWin!*100).toFixed(0)}/D${(p?.finalDraw!*100).toFixed(0)}/A${(p?.finalAwayWin!*100).toFixed(0)}`);
    console.log(`  top3: ${top}`);
  }
  await prisma.$disconnect();
}
main();
