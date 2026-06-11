import { prisma } from '../src/lib/prisma';

async function main() {
  // 1. 检查无预测的比赛
  const noPred = await prisma.match.findMany({
    where: { prediction: null },
    include: { homeTeam: true, awayTeam: true },
  });
  console.log(`=== 无预测的比赛: ${noPred.length} ===`);
  for (const m of noPred) {
    console.log(`  ${m.homeTeam.name} vs ${m.awayTeam.name} @ ${m.matchTime.toISOString()}`);
  }

  // 2. 新闻按语言/时间分类
  const allNews = await prisma.newsItem.findMany({
    orderBy: { publishedAt: 'desc' },
  });
  console.log(`\n=== 新闻总数: ${allNews.length} ===`);

  const byLang: Record<string, number> = {};
  const byCategory: Record<string, number> = {};
  let olderThan7Days = 0;
  let olderThan30Days = 0;
  const now = Date.now();
  for (const n of allNews) {
    byLang[n.language] = (byLang[n.language] || 0) + 1;
    byCategory[n.category || 'unknown'] = (byCategory[n.category || 'unknown'] || 0) + 1;
    const days = (now - n.publishedAt.getTime()) / (1000 * 60 * 60 * 24);
    if (days > 7) olderThan7Days++;
    if (days > 30) olderThan30Days++;
  }
  console.log('按语言:', byLang);
  console.log('按分类:', byCategory);
  console.log(`7天前: ${olderThan7Days}, 30天前: ${olderThan30Days}`);

  // 3. 新闻样本 - 前 10 个最新
  console.log('\n最新 10 条新闻:');
  for (const n of allNews.slice(0, 10)) {
    console.log(`  [${n.language}] ${n.title.slice(0, 60)}`);
  }

  await prisma.$disconnect();
}
main().catch(e => { console.error(e.message); process.exit(1); });
