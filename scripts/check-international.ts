import { prisma } from '../src/lib/prisma';
async function main() {
  const intl = await prisma.match.findMany({
    where: { league: '国际赛' },
    include: { homeTeam: true, awayTeam: true, prediction: true },
  });
  console.log(`国际赛 ${intl.length} 场:`);
  for (const m of intl) {
    const p = m.prediction;
    const today = new Date(); today.setHours(0,0,0,0);
    const matchDay = new Date(m.matchTime); matchDay.setHours(0,0,0,0);
    const isToday = today.getTime() === matchDay.getTime();
    console.log(`[${isToday ? '今日' : '未来'}] ${m.homeTeam.name} vs ${m.awayTeam.name} | ${m.matchTime.toISOString().slice(0,10)} | 状态:${m.status} | 赔率:${m.oddsWin}/${m.oddsDraw}/${m.oddsLose} | 预测:${p?.aiPredictedScore || '无'}`);
  }
  const noPred = await prisma.match.findMany({ where: { prediction: null }, include: { homeTeam: true, awayTeam: true } });
  console.log(`\n无预测 ${noPred.length} 场:`);
  for (const m of noPred) {
    console.log(`  ${m.homeTeam.name} vs ${m.awayTeam.name} | ${m.matchTime.toISOString().slice(0,10)} | ${m.league}`);
  }
  await prisma.$disconnect();
}
main();
