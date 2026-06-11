import { CrawlerService } from '../src/crawler';
import { MatchService } from '../src/services/match.service';
import { logger } from '../src/lib/logger';
import { prisma } from '../src/lib/prisma';

async function main() {
  logger.info('手动触发抓取...');
  try {
    const result = await CrawlerService.runFullSync();
    logger.info('抓取完成，开始生成预测...', result);
    const predicted = await MatchService.batchPredict();
    logger.info('全部完成', { ...result, predictions: predicted });
  } catch (e: any) {
    logger.error('抓取失败', { error: e.message });
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}
main();
