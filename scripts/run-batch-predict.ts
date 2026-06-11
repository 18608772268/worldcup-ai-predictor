import { MatchService } from '../src/services/match.service';
import { prisma } from '../src/lib/prisma';

async function main() {
  const count = await MatchService.batchPredict();
  console.log('已生成预测:', count);
  const total = await prisma.prediction.count();
  const matches = await prisma.match.count();
  const news = await prisma.newsItem.count();
  console.log('数据库统计: 比赛=' + matches + ', 预测=' + total + ', 新闻=' + news);
  await prisma.$disconnect();
}
main().catch(e => { console.error(e.message); process.exit(1); });
