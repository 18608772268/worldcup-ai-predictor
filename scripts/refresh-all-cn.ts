import { prisma } from '../src/lib/prisma';
import { PlayerFormCrawler } from '../src/crawler/player-form.crawler';

async function main() {
  // 清掉所有 form 字段让全部重抓
  await prisma.player.updateMany({
    data: { formUpdatedAt: null, recentFormSummary: null, injuryNote: null, formSourceUrl: null },
  });
  const count = await PlayerFormCrawler.fetchAll(80);
  console.log(`已更新 ${count} 名球员`);

  const withCn = await prisma.player.count({
    where: { OR: [{ recentFormSummary: { contains: '受伤' } }, { recentFormSummary: { contains: '进球' } }, { recentFormSummary: { contains: '助攻' } }, { recentFormSummary: { contains: '赛季' } }] },
  });
  const stillEn = await prisma.player.count({ where: { recentFormSummary: { contains: 'In the' } } });
  console.log(`中文摘要: ${withCn}, 仍是英文: ${stillEn}`);

  const noForm = await prisma.player.count({ where: { formUpdatedAt: null } });
  console.log(`未抓: ${noForm}`);
  await prisma.$disconnect();
}
main();
