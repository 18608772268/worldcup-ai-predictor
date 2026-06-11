import { prisma } from '../src/lib/prisma';
async function main() {
  // 哪些比赛 odds=0
  const all = await prisma.match.findMany({ include: { homeTeam: true, awayTeam: true } });
  const noOdds = all.filter(m => !m.oddsWin || m.oddsWin === 0);
  const withOdds = all.filter(m => m.oddsWin && m.oddsWin > 0);
  console.log(`总 ${all.length} 场，有赔率 ${withOdds.length}，无赔率 ${noOdds.length}`);
  console.log('\n=== 有赔率样本 ===');
  for (const m of withOdds.slice(0, 5)) {
    console.log(`${m.homeTeam.name} vs ${m.awayTeam.name} | W${m.oddsWin} D${m.oddsDraw} L${m.oddsLose} | ${m.league}`);
  }
  console.log('\n=== 无赔率样本 ===');
  for (const m of noOdds.slice(0, 5)) {
    console.log(`${m.homeTeam.name} vs ${m.awayTeam.name} | ${m.league}`);
  }
  await prisma.$disconnect();
}
main();
