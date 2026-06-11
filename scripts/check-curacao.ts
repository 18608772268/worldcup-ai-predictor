import { prisma } from '../src/lib/prisma';
async function main() {
  const matches = await prisma.match.findMany({
    include: { homeTeam: true, awayTeam: true, prediction: true },
    take: 30,
  });
  for (const m of matches) {
    console.log(`${m.homeTeam.name} (${m.homeTeam.fifaRanking}, ELO ${m.homeTeam.eloRating}) vs ${m.awayTeam.name} (${m.awayTeam.fifaRanking}, ELO ${m.awayTeam.eloRating}) → 预测 ${m.prediction?.aiPredictedScore} | H${(m.prediction?.finalHomeWin!*100).toFixed(0)}/D${(m.prediction?.finalDraw!*100).toFixed(0)}/A${(m.prediction?.finalAwayWin!*100).toFixed(0)}`);
  }
  await prisma.$disconnect();
}
main();
