import { prisma } from '../src/lib/prisma';

async function main() {
  console.log('=== V3: 将占位球队转为 seed-XXX ID ===');

  const placeholderTeams = await prisma.team.findMany({
    where: { NOT: { id: { startsWith: 'seed-' } } },
  });
  console.log(`占位球队: ${placeholderTeams.length}`);

  for (const ph of placeholderTeams) {
    // 使用拼音化处理
    const slug = ph.name.replace(/[()（）（）\s]/g, '').slice(0, 20);
    const newId = `seed-${slug}`;

    // 检查新 ID 是否已存在
    const existing = await prisma.team.findUnique({ where: { id: newId } });

    if (existing) {
      console.log(`  ID 已存在 ${newId}, 合并到 ${existing.id}`);
      await prisma.match.updateMany({ where: { homeTeamId: ph.id }, data: { homeTeamId: existing.id } });
      await prisma.match.updateMany({ where: { awayTeamId: ph.id }, data: { awayTeamId: existing.id } });
      await prisma.player.updateMany({ where: { teamId: ph.id }, data: { teamId: existing.id } });
      await prisma.teamHistory.updateMany({ where: { teamId: ph.id }, data: { teamId: existing.id } });
      await prisma.newsItem.updateMany({ where: { teamId: ph.id }, data: { teamId: existing.id } });
      await prisma.team.delete({ where: { id: ph.id } });
    } else {
      console.log(`  改名: ${ph.id} -> ${newId}`);
      // 先创建新种子
      await prisma.team.create({
        data: {
          id: newId,
          name: ph.name,
          nameEn: null,
          country: ph.name,
          countryCode: null,
          eloRating: 1500,
        },
      });
      // 再迁移数据
      await prisma.match.updateMany({ where: { homeTeamId: ph.id }, data: { homeTeamId: newId } });
      await prisma.match.updateMany({ where: { awayTeamId: ph.id }, data: { awayTeamId: newId } });
      await prisma.player.updateMany({ where: { teamId: ph.id }, data: { teamId: newId } });
      await prisma.teamHistory.updateMany({ where: { teamId: ph.id }, data: { teamId: newId } });
      await prisma.newsItem.updateMany({ where: { teamId: ph.id }, data: { teamId: newId } });
      // 最后删除占位
      await prisma.team.delete({ where: { id: ph.id } });
    }
  }

  const finalCount = await prisma.team.count();
  console.log(`\n最终球队数: ${finalCount}`);

  // 验证排序
  const sample = await prisma.team.findMany({
    orderBy: { fifaRanking: 'asc' },
    take: 10,
  });
  console.log('\n球队中心前 10 (按 FIFA 排名):');
  for (const t of sample) {
    console.log(`  #${t.fifaRanking || '-'} ${t.name} (${t.countryCode || '无code'})`);
  }

  await prisma.$disconnect();
}
main().catch(e => { console.error(e.message); process.exit(1); });
