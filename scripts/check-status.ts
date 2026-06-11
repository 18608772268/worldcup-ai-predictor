import { prisma } from '../src/lib/prisma';

async function main() {
  const matches = await prisma.match.findMany({
    include: { prediction: true, homeTeam: true, awayTeam: true },
    orderBy: { matchTime: 'asc' },
  });

  console.log(`总比赛: ${matches.length}`);
  console.log(`有预测: ${matches.filter(m => m.prediction).length}`);
  console.log(`无预测: ${matches.filter(m => !m.prediction).length}`);

  // 重复检查
  const seen = new Set<string>();
  const dups: string[] = [];
  for (const m of matches) {
    const k = `${m.homeTeamId}-${m.awayTeamId}-${m.matchTime.getTime()}`;
    if (seen.has(k)) dups.push(`${m.homeTeam.name} vs ${m.awayTeam.name}`);
    seen.add(k);
  }
  console.log(`重复: ${dups.length}`);
  if (dups.length > 0) console.log('重复样本:', dups.slice(0, 5));

  // 显示无预测的比赛
  const noPred = matches.filter(m => !m.prediction);
  console.log(`\n无预测的比赛 (${noPred.length}):`);
  for (const m of noPred.slice(0, 5)) {
    console.log(`  ${m.homeTeam.name} vs ${m.awayTeam.name} @ ${m.matchTime.toISOString()}`);
  }

  await prisma.$disconnect();
}
main().catch(e => { console.error(e.message); process.exit(1); });
