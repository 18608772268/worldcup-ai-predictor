import { prisma } from '../src/lib/prisma';
import { PlayerFormCrawler } from '../src/crawler/player-form.crawler';

async function main() {
  const p = await prisma.player.findFirst({ where: { nameEn: { not: null } }, orderBy: { formRating: 'desc' } });
  if (!p) { console.log('no player'); return; }
  await PlayerFormCrawler.fetchPlayerForm(p.id);
  const updated = await prisma.player.findUnique({ where: { id: p.id } });
  console.log('---');
  console.log('Name:', updated?.name, '(' + updated?.nameEn + ')');
  console.log('Recent:', updated?.recentFormSummary);
  console.log('Goals/Apps/Rating:', updated?.goals, '/', updated?.appearances, '/', updated?.formRating);
  console.log('Injured:', updated?.injuryStatus);
  console.log('Source:', updated?.formSourceUrl);
  await prisma.$disconnect();
}
main();
