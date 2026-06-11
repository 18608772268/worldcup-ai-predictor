import { prisma } from '../src/lib/prisma';
import { MatchService } from '../src/services/match.service';

async function main() {
  // 给所有没有预测的比赛生成预测
  const matches = await prisma.match.findMany({
    where: { prediction: null },
    select: { id: true, homeTeam: { select: { name: true } }, awayTeam: { select: { name: true } } },
  });
  console.log(`需要预测的比赛数: ${matches.length}`);

  let count = 0;
  for (const m of matches) {
    try {
      await MatchService.generatePrediction(m.id);
      count++;
    } catch (e: any) {
      console.log(`失败: ${m.homeTeam.name} vs ${m.awayTeam.name}: ${e.message}`);
    }
  }
  console.log(`已生成 ${count} 场预测`);

  const total = await prisma.prediction.count();
  console.log(`总预测数: ${total}`);

  await prisma.$disconnect();
}
main().catch(e => { console.error('错误:', e.message); process.exit(1); });
