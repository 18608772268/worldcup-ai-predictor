import { PlayerFormCrawler } from '../src/crawler/player-form.crawler';
import { prisma } from '../src/lib/prisma';

async function main() {
  const count = await PlayerFormCrawler.fetchAll(30);
  console.log(`已更新 ${count} 名球员`);
  const injured = await prisma.player.findMany({ where: { injuryStatus: 'injured' }, select: { name: true, injuryNote: true, formRating: true } });
  console.log(`\n=== 受伤球员 ${injured.length} 人 ===`);
  for (const p of injured) {
    console.log(`  ${p.name} (${p.formRating}): ${(p.injuryNote || '').slice(0, 60)}`);
  }
  await prisma.$disconnect();
}
main();
