import { prisma } from '../src/lib/prisma';

async function main() {
  console.log('=== 清理重复比赛 ===');

  const all = await prisma.match.findMany({
    include: { homeTeam: true, awayTeam: true, prediction: true, oddsHistory: { take: 1 } },
    orderBy: { createdAt: 'asc' },
  });

  // 按 (homeTeamId, awayTeamId, matchTime日期) 分组，保留 createdAt 最早的（有完整数据）
  const groups = new Map<string, any[]>();
  for (const m of all) {
    const key = `${m.homeTeamId}-${m.awayTeamId}-${m.matchTime.toISOString().slice(0, 10)}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(m);
  }

  let deleted = 0;
  for (const [key, matches] of groups) {
    if (matches.length > 1) {
      // 保留有 prediction 的那个
      const withPred = matches.find((m) => m.prediction);
      const keep = withPred || matches[0];
      const toDelete = matches.filter((m) => m.id !== keep.id);
      for (const m of toDelete) {
        console.log(`  删除重复: ${m.homeTeam.name} vs ${m.awayTeam.name} @ ${m.matchTime.toISOString().slice(0, 10)}`);
        await prisma.prediction.deleteMany({ where: { matchId: m.id } });
        await prisma.oddsHistory.deleteMany({ where: { matchId: m.id } });
        await prisma.matchStats.deleteMany({ where: { matchId: m.id } });
        await prisma.match.delete({ where: { id: m.id } });
        deleted++;
      }
    }
  }

  console.log(`\n删除 ${deleted} 场重复比赛`);

  // 重新统计
  const total = await prisma.match.count();
  console.log(`剩余比赛数: ${total}`);

  await prisma.$disconnect();
}
main().catch(e => { console.error(e.message); process.exit(1); });
