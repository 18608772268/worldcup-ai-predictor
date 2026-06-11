import { prisma } from '../src/lib/prisma';
import { MatchService } from '../src/services/match.service';

async function main() {
  console.log('=== 清空旧预测 ===');
  await prisma.prediction.deleteMany({});
  console.log('已清空');

  console.log('\n=== 重跑预测 ===');
  const count = await MatchService.batchPredict();
  console.log(`已生成 ${count} 场`);

  await prisma.$disconnect();
}
main().catch(e => { console.error(e); process.exit(1); });
