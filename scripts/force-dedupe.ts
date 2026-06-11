import { prisma } from '../src/lib/prisma';

async function main() {
  console.log('=== 强力清理重复比赛 ===');

  const all = await prisma.match.findMany({
    orderBy: { createdAt: 'asc' },
  });

  // 按 (homeTeamId, awayTeamId, matchTime毫秒数) 分组
  const groups = new Map<string, any[]>();
  for (const m of all) {
    const key = `${m.homeTeamId}-${m.awayTeamId}-${m.matchTime.getTime()}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(m);
  }

  let deleted = 0;
  for (const [key, matches] of groups) {
    if (matches.length > 1) {
      // 保留有 prediction 的那个
      const withPred = await prisma.prediction.findFirst({ where: { matchId: matches[0].id } });
      const keep = withPred ? matches[0] : matches[0];
      // 实际删除所有重复
      const ids = matches.map((m) => m.id);
      const allHaveIds = await prisma.match.findMany({ where: { id: { in: ids } } });

      for (const m of allHaveIds) {
        if (m.id !== keep.id) {
          await prisma.prediction.deleteMany({ where: { matchId: m.id } });
          await prisma.oddsHistory.deleteMany({ where: { matchId: m.id } });
          await prisma.matchStats.deleteMany({ where: { matchId: m.id } });
          await prisma.match.delete({ where: { id: m.id } });
          deleted++;
        }
      }
    }
  }

  console.log(`删除 ${deleted} 场重复`);

  // 清理"其他对手"占位
  const placeholder = await prisma.teamHistory.deleteMany({
    where: { opponent: '其他对手' },
  });
  console.log(`清理 ${placeholder.count} 条"其他对手"占位历史`);

  // 最终统计
  const totalMatches = await prisma.match.count();
  const totalHistory = await prisma.teamHistory.count();
  console.log(`剩余比赛: ${totalMatches}, 历史: ${totalHistory}`);

  await prisma.$disconnect();
}
main().catch(e => { console.error(e.message); process.exit(1); });
