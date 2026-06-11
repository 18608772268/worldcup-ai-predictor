import { prisma } from '../src/lib/prisma';
import { PlayerFormCrawler } from '../src/crawler/player-form.crawler';

async function main() {
  // 找到有 formUpdatedAt 但 summary 是英文 或 还没抓的
  const fail = await prisma.player.findMany({
    where: {
      OR: [
        { formUpdatedAt: null },
        { recentFormSummary: { contains: 'In the' } },
        { recentFormSummary: null },
      ],
    },
  });
  console.log(`需重抓: ${fail.length}`);
  for (const p of fail) {
    console.log(`- ${p.name} (${p.nameEn})`);
    await PlayerFormCrawler.fetchPlayerForm(p.id);
    await new Promise(r => setTimeout(r, 1500)); // 限流
  }
  console.log('done');
  await prisma.$disconnect();
}
main();
