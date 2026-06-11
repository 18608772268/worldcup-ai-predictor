import { prisma } from '../src/lib/prisma';

async function main() {
  console.log('=== 合并占位球队到种子球队 ===');

  // 1. 找出所有占位球队（id 不是 seed- 开头的）
  const placeholderTeams = await prisma.team.findMany({
    where: { NOT: { id: { startsWith: 'seed-' } } },
    include: { players: true },
  });
  console.log(`占位球队: ${placeholderTeams.length}`);

  // 2. 找出所有种子球队
  const seedTeams = await prisma.team.findMany({
    where: { id: { startsWith: 'seed-' } },
  });
  console.log(`种子球队: ${seedTeams.length}`);

  // 3. 匹配并合并
  for (const ph of placeholderTeams) {
    // 通过 countryCode 或名称匹配
    const seed = seedTeams.find(
      (s) =>
        s.name === ph.name ||
        s.countryCode === ph.countryCode ||
        s.nameEn === ph.nameEn ||
        s.country === ph.country
    );

    if (seed) {
      console.log(`  合并: ${ph.name} (${ph.id}) -> ${seed.name} (${seed.id})`);

      // 迁移关联
      await prisma.match.updateMany({ where: { homeTeamId: ph.id }, data: { homeTeamId: seed.id } });
      await prisma.match.updateMany({ where: { awayTeamId: ph.id }, data: { awayTeamId: seed.id } });
      await prisma.player.updateMany({ where: { teamId: ph.id }, data: { teamId: seed.id } });
      await prisma.teamHistory.updateMany({ where: { teamId: ph.id }, data: { teamId: seed.id } });
      await prisma.matchStats.deleteMany({ where: { OR: [{ homeTeamId: ph.id }, { awayTeamId: ph.id }] } });
      await prisma.newsItem.updateMany({ where: { teamId: ph.id }, data: { teamId: seed.id } });

      // 删除占位
      await prisma.team.delete({ where: { id: ph.id } });
    } else {
      console.log(`  ⚠️ 未匹配: ${ph.name} (${ph.countryCode || '无'})`);
    }
  }

  // 4. 重新统计
  const finalCount = await prisma.team.count();
  console.log(`\n合并后球队数: ${finalCount}`);

  // 5. 检查没有 countryCode 的种子球队
  const missingCode = await prisma.team.findMany({
    where: { countryCode: null, id: { startsWith: 'seed-' } },
  });
  console.log(`\n无 countryCode 的种子球队: ${missingCode.length}`);
  for (const t of missingCode) {
    console.log(`  ${t.id} ${t.name}`);
  }

  await prisma.$disconnect();
}
main().catch(e => { console.error(e.message); process.exit(1); });
