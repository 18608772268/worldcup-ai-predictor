import { prisma } from '../src/lib/prisma';
import { MatchService } from '../src/services/match.service';

async function main() {
  // 删除所有旧预测
  const deleted = await prisma.prediction.deleteMany({});
  console.log(`删除 ${deleted.count} 条旧预测`);

  // 给所有比赛重新生成
  const matches = await prisma.match.findMany({ select: { id: true, homeTeam: { select: { name: true } }, awayTeam: { select: { name: true } } } });
  console.log(`找到 ${matches.length} 场比赛`);

  let count = 0;
  for (const m of matches) {
    try {
      await MatchService.generatePrediction(m.id);
      count++;
    } catch (e: any) {
      console.log(`失败 ${m.homeTeam.name} vs ${m.awayTeam.name}: ${e.message}`);
    }
  }
  console.log(`重新生成 ${count} 场详细预测`);

  await prisma.$disconnect();
}
main().catch(e => { console.error('错误:', e.message); process.exit(1); });
