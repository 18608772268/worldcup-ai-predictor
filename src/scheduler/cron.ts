import cron from 'node-cron';
import { config } from '@/lib/config';
import { logger } from '@/lib/logger';
import { CrawlerService } from '@/crawler';
import { MatchService } from '@/services/match.service';
import { prisma } from '@/lib/prisma';

class Scheduler {
  start() {
    logger.info('启动定时任务调度器');

    cron.schedule(config.scheduler.syncCron, async () => {
      await this.runWithLog('sync', async () => {
        // 同步前先清理重复
        const all = await prisma.match.findMany();
        const seen = new Set<string>();
        let dupCount = 0;
        for (const m of all) {
          const k = `${m.homeTeamId}-${m.awayTeamId}-${m.matchTime.getTime()}`;
          if (seen.has(k)) {
            await prisma.prediction.deleteMany({ where: { matchId: m.id } });
            await prisma.oddsHistory.deleteMany({ where: { matchId: m.id } });
            await prisma.matchStats.deleteMany({ where: { matchId: m.id } });
            await prisma.match.delete({ where: { id: m.id } });
            dupCount++;
          } else {
            seen.add(k);
          }
        }
        if (dupCount > 0) logger.info(`清理 ${dupCount} 场重复`);

        const r = await CrawlerService.runFullSync();
        const predicted = await MatchService.batchPredict();

        // 强制清理：开赛超过 48 小时仍未生成预测的（太老的比赛 / 模型失败）
        const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000);
        const noPred = await prisma.match.findMany({
          where: { prediction: null, matchTime: { lt: cutoff } },
          select: { id: true },
        });
        if (noPred.length > 0) {
          const ids = noPred.map((m) => m.id);
          await prisma.oddsHistory.deleteMany({ where: { matchId: { in: ids } } });
          await prisma.matchStats.deleteMany({ where: { matchId: { in: ids } } });
          await prisma.match.deleteMany({ where: { id: { in: ids } } });
          logger.warn(`清理 ${noPred.length} 场过老且无预测的比赛`);
        }

        return { ...r, predictions: predicted, removed: noPred.length };
      });
    });

    cron.schedule(config.scheduler.newsCron, async () => {
      await this.runWithLog('news', async () => {
        const { newsCrawler } = await import('@/crawler');
        return { count: await newsCrawler.crawlAll() };
      });
    });

    // 球员近期表现：每 6 小时抓 30 个
    cron.schedule('0 */6 * * *', async () => {
      await this.runWithLog('playerForm', async () => {
        const { PlayerFormCrawler } = await import('@/crawler/player-form.crawler');
        return { count: await PlayerFormCrawler.fetchAll(30) };
      });
    });

    logger.info('定时任务已注册', {
      sync: config.scheduler.syncCron,
      news: config.scheduler.newsCron,
    });
  }

  private async runWithLog(type: string, fn: () => Promise<any>) {
    const t0 = Date.now();
    const log = await prisma.syncLog.create({
      data: { type, status: 'running' },
    });
    try {
      const result = await fn();
      await prisma.syncLog.update({
        where: { id: log.id },
        data: {
          status: 'success',
          recordsCount: result?.count || result?.matches || 0,
          duration: Date.now() - t0,
          finishedAt: new Date(),
        },
      });
      logger.info(`[${type}] 任务完成`, { result, duration: Date.now() - t0 });
    } catch (e: any) {
      await prisma.syncLog.update({
        where: { id: log.id },
        data: {
          status: 'failed',
          message: e.message,
          errorStack: e.stack,
          duration: Date.now() - t0,
          finishedAt: new Date(),
        },
      });
      logger.error(`[${type}] 任务失败`, { error: e.message });
    }
  }
}

const scheduler = new Scheduler();
scheduler.start();

process.on('SIGINT', async () => {
  logger.info('收到退出信号，关闭调度器...');
  await prisma.$disconnect();
  process.exit(0);
});
