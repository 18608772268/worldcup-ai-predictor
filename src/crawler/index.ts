import { sportteryCrawler } from './sporttery.crawler';
import { newsCrawler } from './news.crawler';
import { serperCrawler } from './serper.crawler';
import { ApiDetector } from './api-detector';
import { logger } from '@/lib/logger';
import { prisma } from '@/lib/prisma';
import { getFifaRanking, eloFromRanking } from '@/lib/fifa-ranking';

export class CrawlerService {
  static async runFullSync(): Promise<{ matches: number; news: number }> {
    logger.info('========== 开始全量同步 ==========');
    const t0 = Date.now();

    let matchCount = 0;
    let newsCount = 0;

    // 1. 优先：竞彩网（用户指定的主源）
    try {
      const matches = await sportteryCrawler.fetchMatches();
      if (matches.length > 0) {
        const sportteryCount = await this.saveMatches(matches);
        matchCount += sportteryCount;
        logger.info(`竞彩网抓取成功: ${sportteryCount} 场`);
      }
    } catch (e: any) {
      logger.warn('竞彩网抓取失败', { error: e.message });
    }

    // 2. Serper (Google) 抓取比赛作为补充
    try {
      const serperMatchCount = await serperCrawler.fetchMatches();
      matchCount += serperMatchCount;
    } catch (e: any) {
      logger.warn('Serper 抓取比赛失败', { error: e.message });
    }

    // 3. Serper 抓取新闻
    try {
      newsCount += await serperCrawler.fetchNews();
    } catch (e: any) {
      logger.warn('Serper 抓取新闻失败', { error: e.message });
    }

    // 4. RSS 抓取新闻
    try {
      const rssCount = await newsCrawler.crawlAll();
      newsCount += rssCount;
    } catch (e: any) {
      logger.warn('RSS 抓取失败', { error: e.message });
    }

    logger.info('========== 同步完成 ==========', {
      duration: `${Date.now() - t0}ms`,
      matches: matchCount,
      news: newsCount,
    });

    return { matches: matchCount, news: newsCount };
  }

  private static async saveMatches(matches: any[]): Promise<number> {
    let count = 0;
    for (const m of matches) {
      try {
        const homeTeam = await this.upsertTeam(m.homeTeam, m.league);
        const awayTeam = await this.upsertTeam(m.awayTeam, m.league);
        if (!homeTeam || !awayTeam) continue;

        const matchTime = new Date(m.matchTime);
        if (isNaN(matchTime.getTime())) continue;

        const externalId = String(m.matchId || `${m.homeTeam}-${m.awayTeam}-${m.matchTime}`);

        await prisma.match.upsert({
          where: { matchId: externalId },
          update: {
            homeScore: m.homeScore,
            awayScore: m.awayScore,
            status: m.status,
            oddsWin: m.odds?.win,
            oddsDraw: m.odds?.draw,
            oddsLose: m.odds?.lose,
            oddsHandicapWin: m.odds?.handicapWin,
            oddsHandicapDraw: m.odds?.handicapDraw,
            oddsHandicapLose: m.odds?.handicapLose,
            oddsOver: m.odds?.over,
            oddsUnder: m.odds?.under,
            overUnderLine: m.odds?.overUnderLine,
            handicapLine: m.odds?.handicapLine,
            oddsScoreJson: m.odds?.scoreOdds ? JSON.stringify(m.odds.scoreOdds) : null,
            oddsBothYes: m.odds?.bothYes,
            oddsBothNo: m.odds?.bothNo,
            rawData: JSON.stringify(m),
          },
          create: {
            matchId: externalId,
            league: m.league || '竞彩足球',
            homeTeamId: homeTeam.id,
            awayTeamId: awayTeam.id,
            matchTime,
            status: m.status || 'scheduled',
            homeScore: m.homeScore,
            awayScore: m.awayScore,
            oddsWin: m.odds?.win,
            oddsDraw: m.odds?.draw,
            oddsLose: m.odds?.lose,
            oddsHandicapWin: m.odds?.handicapWin,
            oddsHandicapDraw: m.odds?.handicapDraw,
            oddsHandicapLose: m.odds?.handicapLose,
            oddsOver: m.odds?.over,
            oddsUnder: m.odds?.under,
            overUnderLine: m.odds?.overUnderLine,
            handicapLine: m.odds?.handicapLine,
            oddsScoreJson: m.odds?.scoreOdds ? JSON.stringify(m.odds.scoreOdds) : null,
            oddsBothYes: m.odds?.bothYes,
            oddsBothNo: m.odds?.bothNo,
            sourceUrl: m.sourceUrl,
            rawData: JSON.stringify(m),
          },
        });

        const dbMatch = await prisma.match.findUnique({ where: { matchId: externalId } });
        if (dbMatch) {
          await prisma.oddsHistory.create({
            data: {
              matchId: dbMatch.id,
              bookmaker: 'sporttery',
              oddsWin: m.odds?.win,
              oddsDraw: m.odds?.draw,
              oddsLose: m.odds?.lose,
              oddsHandicapWin: m.odds?.handicapWin,
              oddsHandicapDraw: m.odds?.handicapDraw,
              oddsHandicapLose: m.odds?.handicapLose,
              oddsOver: m.odds?.over,
              oddsUnder: m.odds?.under,
            },
          });
        }
        count++;
      } catch (e: any) {
        logger.warn('保存比赛失败', { match: m.matchId, error: e.message });
      }
    }
    return count;
  }

  private static async upsertTeam(name: string, league?: string) {
    if (!name) return null;
    const existing = await prisma.team.findFirst({
      where: { OR: [{ name }, { nameEn: name }] },
    });
    if (existing) return existing;

    // 占位球队：用真实 FIFA 排名算 ELO（未知队按 86 名弱队处理）
    const rank = getFifaRanking(name);
    return prisma.team.create({
      data: {
        name,
        country: name,
        fifaRanking: rank,
        eloRating: eloFromRanking(rank),
        winRate: 0.30,
        drawRate: 0.25,
        lossRate: 0.45,
        avgGoalsFor: 1.0,
        avgGoalsAgainst: 1.6,
      },
    });
  }
}

export { sportteryCrawler, newsCrawler, ApiDetector };
