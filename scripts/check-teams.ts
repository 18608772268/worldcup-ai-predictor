import { prisma } from '../src/lib/prisma';

async function main() {
  // 检查阿根廷的所有比赛
  const arg = await prisma.team.findFirst({ where: { countryCode: 'ARG' } });
  if (!arg) { console.log('No ARG team'); return; }
  console.log('=== 阿根廷 (id=' + arg.id + ') ===');

  const homeMatches = await prisma.match.findMany({
    where: { homeTeamId: arg.id },
    include: { awayTeam: true, prediction: true },
    orderBy: { matchTime: 'asc' },
  });
  const awayMatches = await prisma.match.findMany({
    where: { awayTeamId: arg.id },
    include: { homeTeam: true, prediction: true },
    orderBy: { matchTime: 'asc' },
  });
  console.log(`主场: ${homeMatches.length}, 客场: ${awayMatches.length}`);
  for (const m of homeMatches) {
    console.log(`  主场 vs ${m.awayTeam.name} @ ${m.matchTime.toISOString()}`);
  }
  for (const m of awayMatches) {
    console.log(`  客场 vs ${m.homeTeam.name} @ ${m.matchTime.toISOString()}`);
  }

  // 检查法国
  const fra = await prisma.team.findFirst({ where: { countryCode: 'FRA' } });
  if (fra) {
    const homeMatches = await prisma.match.findMany({
      where: { homeTeamId: fra.id },
      include: { awayTeam: true },
    });
    const awayMatches = await prisma.match.findMany({
      where: { awayTeamId: fra.id },
      include: { homeTeam: true },
    });
    console.log(`\n=== 法国: 主场${homeMatches.length} 客场${awayMatches.length} ===`);
    for (const m of homeMatches) console.log(`  H vs ${m.awayTeam.name} @ ${m.matchTime.toISOString().slice(0, 10)}`);
    for (const m of awayMatches) console.log(`  A vs ${m.homeTeam.name} @ ${m.matchTime.toISOString().slice(0, 10)}`);
  }

  // 检查是否有历史"其他对手"
  const otherOpp = await prisma.teamHistory.count({
    where: { opponent: '其他对手' },
  });
  console.log(`\n历史中"其他对手"占位记录: ${otherOpp} 条`);

  await prisma.$disconnect();
}
main().catch(e => { console.error(e.message); process.exit(1); });
