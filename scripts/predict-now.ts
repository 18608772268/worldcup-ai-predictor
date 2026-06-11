import { MatchService } from '../src/services/match.service';
import { logger } from '../src/lib/logger';
import { prisma } from '../src/lib/prisma';

async function main() {
  logger.info('手动触发预测...');
  try {
    const count = await MatchService.batchPredict();
    logger.info(`已生成 ${count} 场预测`);
  } catch (e: any) {
    logger.error('预测失败', { error: e.message });
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}
main();
