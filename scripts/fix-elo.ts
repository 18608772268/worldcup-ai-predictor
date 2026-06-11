import { prisma } from '../src/lib/prisma';
import { getFifaRanking, eloFromRanking } from '../src/lib/fifa-ranking';

async function main() {
  // 1. 更新所有 seed- 开头的 48 强球队
  const seeded = await prisma.team.findMany({ where: { id: { startsWith: 'seed-' } } });
  console.log(`seeded 球队: ${seeded.length}`);
  for (const t of seeded) {
    const elo = eloFromRanking(t.fifaRanking || 86);
    await prisma.team.update({ where: { id: t.id }, data: { eloRating: elo } });
  }

  // 2. 修复非 seed- 占位球队：按名称查真实排名
  const placeholders = await prisma.team.findMany({ where: { id: { not: { startsWith: 'seed-' } } } });
  console.log(`占位球队: ${placeholders.length}`);
  for (const t of placeholders) {
    const rank = getFifaRanking(t.name);
    await prisma.team.update({
      where: { id: t.id },
      data: {
        fifaRanking: rank,
        eloRating: eloFromRanking(rank),
        winRate: 0.30,
        drawRate: 0.25,
        lossRate: 0.45,
        avgGoalsFor: 1.0,
        avgGoalsAgainst: 1.6,
      },
    });
  }

  // 3. 验证
  const sample = await prisma.team.findMany({ take: 100, orderBy: { eloRating: 'desc' } });
  console.log('\n=== ELO 排名（前 20）===');
  for (const t of sample.slice(0, 20)) {
    console.log(`  ${t.name.padEnd(20)} rank=${t.fifaRanking} ELO=${t.eloRating}`);
  }
  console.log('\n=== ELO 排名（后 10）===');
  for (const t of sample.slice(-10)) {
    console.log(`  ${t.name.padEnd(20)} rank=${t.fifaRanking} ELO=${t.eloRating}`);
  }

  await prisma.$disconnect();
}
main();
