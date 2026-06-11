import { sportteryCrawler } from '../src/crawler/sporttery.crawler';
import { prisma } from '../src/lib/prisma';
import { MatchService } from '../src/services/match.service';
import { logger } from '../src/lib/logger';
import { config } from '../src/lib/config';

async function main() {
  logger.info('========== 用 sporttery 真实数据重载 ==========');

  // 1. 清空旧比赛和预测
  await prisma.prediction.deleteMany({});
  await prisma.oddsHistory.deleteMany({});
  await prisma.matchStats.deleteMany({});
  await prisma.match.deleteMany({});
  logger.info('已清空旧比赛数据');

  // 2. 抓取 sporttery 真实数据
  const matches = await sportteryCrawler.fetchMatches();
  logger.info(`抓到 ${matches.length} 场真实比赛`);

  let saved = 0;
  for (const m of matches) {
    try {
      // 查找或创建球队（使用中文名）
      const homeTeam = await prisma.team.findFirst({
        where: { OR: [{ name: m.homeTeam }, { nameEn: m.homeTeam }] },
      });
      const awayTeam = await prisma.team.findFirst({
        where: { OR: [{ name: m.awayTeam }, { nameEn: m.awayTeam }] },
      });

      let homeId = homeTeam?.id;
      let awayId = awayTeam?.id;

      if (!homeId) {
        const newTeam = await prisma.team.create({
          data: { name: m.homeTeam, country: m.homeTeam, eloRating: 1500 },
        });
        homeId = newTeam.id;
      }
      if (!awayId) {
        const newTeam = await prisma.team.create({
          data: { name: m.awayTeam, country: m.awayTeam, eloRating: 1500 },
        });
        awayId = newTeam.id;
      }

      const matchTime = new Date(m.matchTime);
      if (isNaN(matchTime.getTime())) continue;

      const externalId = `sporttery-${m.matchId || `${m.homeTeam}-${m.awayTeam}-${m.matchTime}`}`;

      const savedMatch = await prisma.match.upsert({
        where: { matchId: externalId },
        update: {
          oddsWin: m.odds.win,
          oddsDraw: m.odds.draw,
          oddsLose: m.odds.lose,
          oddsHandicapWin: m.odds.handicapWin,
          oddsHandicapDraw: m.odds.handicapDraw,
          oddsHandicapLose: m.odds.handicapLose,
          oddsScoreJson: m.odds.scoreOdds ? JSON.stringify(m.odds.scoreOdds) : null,
        },
        create: {
          matchId: externalId,
          league: m.league,
          homeTeamId: homeId,
          awayTeamId: awayId,
          matchTime,
          status: m.status,
          homeScore: m.homeScore,
          awayScore: m.awayScore,
          oddsWin: m.odds.win,
          oddsDraw: m.odds.draw,
          oddsLose: m.odds.lose,
          oddsHandicapWin: m.odds.handicapWin,
          oddsHandicapDraw: m.odds.handicapDraw,
          oddsHandicapLose: m.odds.handicapLose,
          handicapLine: m.odds.handicapLine,
          oddsScoreJson: m.odds.scoreOdds ? JSON.stringify(m.odds.scoreOdds) : null,
          sourceUrl: m.sourceUrl,
        },
      });

      // 赔率历史
      await prisma.oddsHistory.create({
        data: {
          matchId: savedMatch.id,
          bookmaker: 'sporttery',
          oddsWin: m.odds.win,
          oddsDraw: m.odds.draw,
          oddsLose: m.odds.lose,
          oddsHandicapWin: m.odds.handicapWin,
          oddsHandicapDraw: m.odds.handicapDraw,
          oddsHandicapLose: m.odds.handicapLose,
        },
      });

      saved++;
    } catch (e: any) {
      logger.warn('保存失败', { match: m.matchId, error: e.message });
    }
  }
  logger.info(`保存 ${saved} 场真实比赛`);

  // 3. 生成预测
  const predCount = await MatchService.batchPredict();
  logger.info(`生成 ${predCount} 场预测`);

  // 4. 统计
  const totalMatches = await prisma.match.count();
  const totalPreds = await prisma.prediction.count();
  const totalTeams = await prisma.team.count();
  logger.info('========== 完成 ==========');
  logger.info(JSON.stringify({ totalMatches, totalPreds, totalTeams }));

  await prisma.$disconnect();
}
main().catch(e => { console.error('错误:', e.message); process.exit(1); });
