import { prisma } from '../src/lib/prisma';

async function main() {
  const teams = await prisma.team.findMany({ take: 10 });
  console.log('球队样本:', teams.map(t => `${t.name} (${t.countryCode})`));
  const matches = await prisma.match.count();
  const news = await prisma.newsItem.count();
  const preds = await prisma.prediction.count();
  console.log('数据库:', { matches, news, preds });

  const newsSample = await prisma.newsItem.findMany({ take: 5, orderBy: { publishedAt: 'desc' } });
  console.log('新闻样本:');
  for (const n of newsSample) {
    console.log(`  [${n.language}] ${n.title.slice(0, 60)}`);
  }
  await prisma.$disconnect();
}
main();
