import { prisma } from '../src/lib/prisma';
import { serperCrawler } from '../src/crawler/serper.crawler';

async function main() {
  console.log('清空所有旧新闻...');
  await prisma.newsItem.deleteMany({});
  console.log('重新抓取中文新闻...');
  const count = await serperCrawler.fetchNews();
  console.log(`新增 ${count} 条`);
  const samples = await prisma.newsItem.findMany({ take: 5, orderBy: { publishedAt: 'desc' } });
  for (const n of samples) {
    console.log(`[${n.category}] ${n.title.slice(0, 70)}`);
  }
  await prisma.$disconnect();
}
main().catch(e => { console.error(e.message); process.exit(1); });
