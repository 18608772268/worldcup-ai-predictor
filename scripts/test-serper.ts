import { serperCrawler } from '../src/crawler/serper.crawler';
import { prisma } from '../src/lib/prisma';

async function main() {
  console.log('=== 抓取新闻 ===');
  const newsCount = await serperCrawler.fetchNews();
  console.log('新闻数量:', newsCount);

  console.log('=== 抓取比赛 ===');
  const matchCount = await serperCrawler.fetchMatches();
  console.log('比赛数量:', matchCount);

  await prisma.$disconnect();
}

main().catch((e) => { console.error('错误:', e.message); process.exit(1); });
