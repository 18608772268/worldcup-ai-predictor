import { prisma } from '../src/lib/prisma';
async function main() {
  const total = await prisma.player.count();
  const withEn = await prisma.player.count({ where: { nameEn: { not: null } } });
  const withForm = await prisma.player.count({ where: { formUpdatedAt: { not: null } } });
  const withCnSummary = await prisma.player.count({
    where: { recentFormSummary: { not: null } },
  });
  const noCn = await prisma.player.count({
    where: { nameEn: { not: null }, recentFormSummary: { contains: 'In the' } },
  });
  console.log(`总球员: ${total}`);
  console.log(`有 nameEn: ${withEn}`);
  console.log(`有 formUpdatedAt: ${withForm}`);
  console.log(`有 recentFormSummary: ${withCnSummary}`);
  console.log(`仍有英文 summary: ${noCn}`);
  // 状态翻译检查
  const allInj = await prisma.player.findMany({ where: { injuryStatus: { not: null } }, take: 5 });
  console.log('\n=== 状态样本 ===');
  for (const p of allInj) console.log(`${p.name}: status=${p.injuryStatus}, note=${(p.injuryNote||'').slice(0,60)}`);
  await prisma.$disconnect();
}
main();
