import { prisma } from '../src/lib/prisma';

async function main() {
  const noPred = await prisma.match.findMany({
    where: { prediction: null },
    select: { id: true, homeTeamId: true, awayTeamId: true, matchTime: true },
  });
  console.log(`找到 ${noPred.length} 场无预测比赛`);

  for (const m of noPred) {
    await prisma.oddsHistory.deleteMany({ where: { matchId: m.id } });
    await prisma.matchStats.deleteMany({ where: { matchId: m.id } });
    await prisma.match.delete({ where: { id: m.id } });
  }
  console.log(`已删除 ${noPred.length} 场`);

  const total = await prisma.match.count();
  console.log(`剩余比赛: ${total}`);
  await prisma.$disconnect();
}
main().catch(e => { console.error(e.message); process.exit(1); });
