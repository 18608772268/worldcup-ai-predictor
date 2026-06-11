import { prisma } from '../src/lib/prisma';
import { PlayerFormCrawler } from '../src/crawler/player-form.crawler';

async function main() {
  // 清掉 formUpdatedAt 让它重新抓
  await prisma.player.updateMany({ data: { formUpdatedAt: null } });
  const count = await PlayerFormCrawler.fetchAll(30);
  console.log(`已更新 ${count} 名球员`);
  // 验证
  const samples = await prisma.player.findMany({
    where: { nameEn: { not: null } },
    take: 3,
    orderBy: { formRating: 'desc' },
  });
  for (const p of samples) {
    console.log('---');
    console.log(p.name, '('+p.nameEn+')', '|', p.formRating, '|', p.injuryStatus);
    console.log('Summary:', (p.recentFormSummary || '').slice(0, 200));
  }
  await prisma.$disconnect();
}
main();
