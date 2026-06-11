import { prisma } from '../src/lib/prisma';
import { serperCrawler } from '../src/crawler/serper.crawler';

/**
 * 清理不相关新闻，重新抓取世界杯相关内容
 */
async function main() {
  console.log('=== 清理 + 重新抓取世界杯相关新闻 ===');

  // 1. 删除所有非 injury/transfer/manager 类的新闻（即"general" 维基百科等无关内容）
  const deleted = await prisma.newsItem.deleteMany({
    where: {
      OR: [
        { category: 'general' },
        { category: 'unknown' },
        { category: '' },
        { category: null },
      ],
    },
  });
  console.log(`删除 ${deleted.count} 条不相关新闻`);

  // 2. 删除 7 天前的所有新闻
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const oldNews = await prisma.newsItem.deleteMany({
    where: { publishedAt: { lt: sevenDaysAgo } },
  });
  console.log(`删除 ${oldNews.count} 条 7 天前新闻`);

  // 3. 重新抓取世界杯相关的真实新闻
  console.log('\n=== 抓取世界杯相关新闻 ===');
  const newCount = await serperCrawler.fetchNews();
  console.log(`新增 ${newCount} 条新闻`);

  // 4. 再次清理非相关
  const cleaned = await prisma.newsItem.deleteMany({
    where: {
      OR: [
        { category: 'general' },
        { category: 'unknown' },
        { category: '' },
        { category: null },
      ],
    },
  });
  console.log(`再次清理 ${cleaned.count} 条不相关`);

  // 5. 统计
  const total = await prisma.newsItem.count();
  console.log(`\n最终新闻数: ${total}`);

  const byCategory: Record<string, number> = {};
  const allNews = await prisma.newsItem.findMany();
  for (const n of allNews) {
    byCategory[n.category || 'unknown'] = (byCategory[n.category || 'unknown'] || 0) + 1;
  }
  console.log('按分类:', byCategory);

  console.log('\n最新 10 条:');
  const recent = await prisma.newsItem.findMany({
    orderBy: { publishedAt: 'desc' },
    take: 10,
  });
  for (const n of recent) {
    console.log(`  [${n.category}] ${n.title.slice(0, 60)}`);
  }

  await prisma.$disconnect();
}
main().catch(e => { console.error(e.message); process.exit(1); });
