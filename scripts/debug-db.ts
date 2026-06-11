import { prisma } from '../src/lib/prisma';

async function main() {
  console.log('=== 比赛总数和去重 ===');
  const all = await prisma.match.findMany({
    include: { homeTeam: true, awayTeam: true },
    orderBy: { matchTime: 'asc' },
  });
  console.log(`总比赛数: ${all.length}`);

  // 找重复的
  const seen = new Map<string, any>();
  const dups: string[] = [];
  for (const m of all) {
    const key = `${m.homeTeamId}-${m.awayTeamId}-${m.matchTime.toISOString().slice(0, 10)}`;
    if (seen.has(key)) {
      dups.push(`${m.homeTeam.name} vs ${m.awayTeam.name} @ ${m.matchTime.toISOString()}`);
    } else {
      seen.set(key, m);
    }
  }
  console.log(`重复比赛: ${dups.length}`);
  if (dups.length > 0) {
    console.log('重复样本:', dups.slice(0, 5));
  }

  // 今日比赛（按用户认为的"今日"）
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const todayMatches = await prisma.match.findMany({
    where: { matchTime: { gte: today, lt: tomorrow } },
  });
  console.log(`\n今日比赛 (${today.toISOString().slice(0, 10)}): ${todayMatches.length} 场`);

  // 按 matchTime 分组
  const byDate: Record<string, number> = {};
  for (const m of all) {
    const d = m.matchTime.toISOString().slice(0, 10);
    byDate[d] = (byDate[d] || 0) + 1;
  }
  console.log('\n按日期分布:');
  Object.entries(byDate).sort().forEach(([d, n]) => console.log(`  ${d}: ${n} 场`));

  // 球队关联测试 - 随机选一支球队，看它的主场比赛和客场比赛
  const sampleTeam = all.find((m) => m.homeTeamId === 'seed-ARG')?.homeTeam
    || (await prisma.team.findFirst({ where: { countryCode: 'ARG' } }));
  if (sampleTeam) {
    console.log(`\n=== ${sampleTeam.name} 的比赛 ===`);
    const homeMatches = await prisma.match.findMany({
      where: { homeTeamId: sampleTeam.id },
      include: { awayTeam: true },
      orderBy: { matchTime: 'asc' },
    });
    const awayMatches = await prisma.match.findMany({
      where: { awayTeamId: sampleTeam.id },
      include: { homeTeam: true },
      orderBy: { matchTime: 'asc' },
    });
    console.log(`主场: ${homeMatches.length} 场`);
    homeMatches.forEach((m) => console.log(`  - vs ${m.awayTeam.name} @ ${m.matchTime.toISOString()}`));
    console.log(`客场: ${awayMatches.length} 场`);
    awayMatches.forEach((m) => console.log(`  - vs ${m.homeTeam.name} @ ${m.matchTime.toISOString()}`));

    // 历史
    const history = await prisma.teamHistory.findMany({
      where: { teamId: sampleTeam.id },
      orderBy: { matchDate: 'desc' },
      take: 10,
    });
    console.log(`\n历史战绩: ${history.length} 条`);
    history.forEach((h) => console.log(`  ${h.matchDate.toISOString().slice(0, 10)} ${h.isHome ? '主' : '客'} vs ${h.opponent} ${h.goalsFor}-${h.goalsAgainst} (${h.result}) ${h.competition}`));
  }

  await prisma.$disconnect();
}
main().catch(e => { console.error(e.message); process.exit(1); });
