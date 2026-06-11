import { prisma } from '../src/lib/prisma';

const NAME_MAP: Record<string, string> = {
  'Czechia': '捷克',
  'Bosnia and Herzegovina': '波黑',
  'Bosnia': '波黑',
  'Paraguay': '巴拉圭',
  'Haiti': '海地',
  'Scotland': '苏格兰',
  'Curacao': '库拉索',
  'Curaçao': '库拉索',
  'Sweden': '瑞典',
  'Iraq': '伊拉克',
  'Norway': '挪威',
  'DR Congo': '刚果(金)',
  'Congo DR': '刚果(金)',
  'Cape Verde': '佛得角',
  'Cabo Verde': '佛得角',
  'Cote dIvoire': '科特迪瓦',
  'Ivory Coast': '科特迪瓦',
  'Turkiye': '土耳其',
  'Türkiye': '土耳其',
  'Korea Republic': '韩国',
  'Korea DPR': '朝鲜',
  'USA': '美国',
  'United States': '美国',
  'Korea': '韩国',
};

async function main() {
  console.log('=== 合并占位球队 (V2 含中文映射) ===');

  const placeholderTeams = await prisma.team.findMany({
    where: { NOT: { id: { startsWith: 'seed-' } } },
  });
  const seedTeams = await prisma.team.findMany({
    where: { id: { startsWith: 'seed-' } },
  });

  let merged = 0;
  let unmatched: string[] = [];

  for (const ph of placeholderTeams) {
    // 多种匹配方式
    const seed = seedTeams.find((s) => {
      if (s.name === ph.name) return true;
      if (s.nameEn === ph.name) return true;
      if (s.nameEn === ph.nameEn) return true;
      if (NAME_MAP[s.nameEn || ''] === ph.name) return true;
      if (NAME_MAP[s.name] === ph.name) return true;
      if (ph.country && s.country === ph.country) return true;
      if (ph.countryCode && s.countryCode === ph.countryCode) return true;
      return false;
    });

    if (seed) {
      await prisma.match.updateMany({ where: { homeTeamId: ph.id }, data: { homeTeamId: seed.id } });
      await prisma.match.updateMany({ where: { awayTeamId: ph.id }, data: { awayTeamId: seed.id } });
      await prisma.player.updateMany({ where: { teamId: ph.id }, data: { teamId: seed.id } });
      await prisma.teamHistory.updateMany({ where: { teamId: ph.id }, data: { teamId: seed.id } });
      await prisma.matchStats.deleteMany({ where: { OR: [{ homeTeamId: ph.id }, { awayTeamId: ph.id }] } });
      await prisma.newsItem.updateMany({ where: { teamId: ph.id }, data: { teamId: seed.id } });
      await prisma.team.delete({ where: { id: ph.id } });
      console.log(`  ✓ 合并 ${ph.name} -> ${seed.name} (${seed.id})`);
      merged++;
    } else {
      unmatched.push(ph.name);
    }
  }

  console.log(`\n合并: ${merged}, 未匹配: ${unmatched.length}`);
  if (unmatched.length > 0) {
    console.log('未匹配:', unmatched);

    // 智能添加这些球队到种子库
    console.log('\n=== 自动添加未匹配球队到种子库 ===');
    for (const ph of placeholderTeams) {
      if (!unmatched.includes(ph.name)) continue;
      // 给它一个 seed-XXX ID
      const newId = `seed-${ph.name}`;
      const exists = await prisma.team.findUnique({ where: { id: newId } });
      if (exists) continue;

      // 迁移数据
      await prisma.match.updateMany({ where: { homeTeamId: ph.id }, data: { homeTeamId: newId } });
      await prisma.match.updateMany({ where: { awayTeamId: ph.id }, data: { awayTeamId: newId } });
      await prisma.player.updateMany({ where: { teamId: ph.id }, data: { teamId: newId } });
      await prisma.teamHistory.updateMany({ where: { teamId: ph.id }, data: { teamId: newId } });
      await prisma.team.delete({ where: { id: ph.id } });

      // 创建新的种子记录
      await prisma.team.create({
        data: {
          id: newId,
          name: ph.name,
          country: ph.name,
          countryCode: ph.countryCode,
          eloRating: 1500,
        },
      });
      console.log(`  + 创建 ${ph.name} (${newId})`);
    }
  }

  const finalCount = await prisma.team.count();
  console.log(`\n最终球队数: ${finalCount}`);

  // 验证排序 - 球队中心应该按 FIFA 排名
  const sample = await prisma.team.findMany({
    where: { id: { startsWith: 'seed-' } },
    orderBy: { fifaRanking: 'asc' },
    take: 10,
  });
  console.log('\nFIFA 排名前 10:');
  for (const t of sample) {
    console.log(`  #${t.fifaRanking || '-'} ${t.name} (${t.countryCode || '?'})`);
  }

  await prisma.$disconnect();
}
main().catch(e => { console.error(e.message); process.exit(1); });
