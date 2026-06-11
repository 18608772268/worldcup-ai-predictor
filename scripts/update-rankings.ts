import { prisma } from '../src/lib/prisma';

// 真实 2026 世界杯参赛队 FIFA 排名（参考）
const RANKINGS: Record<string, number> = {
  '捷克': 32,
  '波黑': 62,
  '巴拉圭': 49,
  '海地': 86,
  '苏格兰': 38,
  '库拉索': 92,
  '瑞典': 28,
  '伊拉克': 58,
  '挪威': 33,
  '刚果(金)': 70,
  '佛得角': 65,
  '乌兹别克斯坦': 68,
  '约旦': 71,
  '朝鲜': 110,
};

async function main() {
  console.log('=== 更新新球队 FIFA 排名 ===');
  let updated = 0;
  for (const [name, rank] of Object.entries(RANKINGS)) {
    const result = await prisma.team.updateMany({
      where: { name },
      data: { fifaRanking: rank },
    });
    if (result.count > 0) {
      console.log(`  ${name}: FIFA #${rank} (${result.count} 条)`);
      updated += result.count;
    }
  }
  console.log(`\n更新 ${updated} 支球队`);

  // 验证前 10
  const top = await prisma.team.findMany({
    orderBy: { fifaRanking: 'asc' },
    take: 15,
  });
  console.log('\nFIFA 排名前 15:');
  for (const t of top) {
    console.log(`  #${t.fifaRanking || '-'} ${t.name}`);
  }

  await prisma.$disconnect();
}
main().catch(e => { console.error(e.message); process.exit(1); });
