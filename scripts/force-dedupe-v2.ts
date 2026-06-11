import { prisma } from '../src/lib/prisma';

async function main() {
  console.log('=== V2 去重 (按分钟窗口) ===');

  const all = await prisma.match.findMany({
    orderBy: { createdAt: 'asc' },
    include: { prediction: true },
  });

  // 按 (homeTeamId, awayTeamId, 5分钟窗口) 分组
  const groups = new Map<string, any[]>();
  for (const m of all) {
    // 时间量化到 5 分钟
    const minutes = Math.floor(m.matchTime.getTime() / (5 * 60 * 1000));
    const key = `${m.homeTeamId}-${m.awayTeamId}-${minutes}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(m);
  }

  let deleted = 0;
  for (const [key, matches] of groups) {
    if (matches.length > 1) {
      // 保留有 prediction 的，没有的按 createdAt asc
      const withPred = matches.filter((m) => m.prediction);
      const keep = withPred[0] || matches.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())[0];
      for (const m of matches) {
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

  const total = await prisma.match.count();
  console.log(`剩余比赛: ${total}`);

  // 验证
  const samples = await prisma.match.findMany({
    take: 5,
    include: { homeTeam: true, awayTeam: true },
    orderBy: { matchTime: 'asc' },
  });
  console.log('\n样本:');
  for (const m of samples) {
    console.log(`  ${m.homeTeam.name} vs ${m.awayTeam.name} @ ${m.matchTime.toISOString()}`);
  }

  await prisma.$disconnect();
}
main().catch(e => { console.error(e.message); process.exit(1); });
