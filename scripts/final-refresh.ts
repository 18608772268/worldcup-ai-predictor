import { serperCrawler } from '../src/crawler/serper.crawler';
import { prisma } from '../src/lib/prisma';
import { MatchService } from '../src/services/match.service';

async function main() {
  console.log('=== 抓取中文新闻 ===');
  const newsCount = await serperCrawler.fetchNews();
  console.log('新闻数:', newsCount);

  console.log('\n=== 抓取比赛 ===');
  const matchCount = await serperCrawler.fetchMatches();
  console.log('比赛数:', matchCount);

  console.log('\n=== 生成预测 ===');
  const predCount = await MatchService.batchPredict();
  console.log('预测数:', predCount);

  console.log('\n=== 最终统计 ===');
  const totalMatches = await prisma.match.count();
  const totalNews = await prisma.newsItem.count();
  const totalPreds = await prisma.prediction.count();
  const totalTeams = await prisma.team.count();
  console.log({ totalMatches, totalNews, totalPreds, totalTeams });

  // 显示中文新闻样本
  const news = await prisma.newsItem.findMany({ take: 5, orderBy: { publishedAt: 'desc' } });
  console.log('\n新闻样本:');
  for (const n of news) {
    console.log(`  - ${n.title.slice(0, 70)}`);
  }

  // 显示比赛样本
  const matches = await prisma.match.findMany({ take: 5, include: { homeTeam: true, awayTeam: true } });
  console.log('\n比赛样本:');
  for (const m of matches) {
    console.log(`  - ${m.homeTeam.name} vs ${m.awayTeam.name} (${m.league})`);
  }

  await prisma.$disconnect();
}
main().catch(e => { console.error('错误:', e.message); process.exit(1); });
