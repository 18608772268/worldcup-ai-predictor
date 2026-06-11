import { prisma } from '@/lib/prisma';
import { EloRating } from './elo';

export class FeatureBuilder {
  static async buildForMatch(matchId: string) {
    const match = await prisma.match.findUnique({
      where: { id: matchId },
      include: { homeTeam: true, awayTeam: true },
    });
    if (!match) throw new Error(`Match not found: ${matchId}`);

    const homeElo = match.homeTeam.eloRating || 1500;
    const awayElo = match.awayTeam.eloRating || 1500;
    const eloDiff = homeElo - awayElo;

    const homeRecent = await prisma.teamHistory.findMany({
      where: { teamId: match.homeTeamId },
      orderBy: { matchDate: 'desc' },
      take: 10,
    });
    const awayRecent = await prisma.teamHistory.findMany({
      where: { teamId: match.awayTeamId },
      orderBy: { matchDate: 'desc' },
      take: 10,
    });

    const homeAvgGoalsFor = homeRecent.length
      ? homeRecent.reduce((s, m) => s + m.goalsFor, 0) / homeRecent.length
      : match.homeTeam.avgGoalsFor || 1.4;
    const homeAvgGoalsAgainst = homeRecent.length
      ? homeRecent.reduce((s, m) => s + m.goalsAgainst, 0) / homeRecent.length
      : match.homeTeam.avgGoalsAgainst || 1.0;
    const awayAvgGoalsFor = awayRecent.length
      ? awayRecent.reduce((s, m) => s + m.goalsFor, 0) / awayRecent.length
      : match.awayTeam.avgGoalsFor || 1.2;
    const awayAvgGoalsAgainst = awayRecent.length
      ? awayRecent.reduce((s, m) => s + m.goalsAgainst, 0) / awayRecent.length
      : match.awayTeam.avgGoalsAgainst || 1.1;

    const homeAdv = 100;

    const homeInjuries = await prisma.player.count({
      where: { teamId: match.homeTeamId, injuryStatus: { in: ['injured', 'doubtful'] } },
    });
    const awayInjuries = await prisma.player.count({
      where: { teamId: match.awayTeamId, injuryStatus: { in: ['injured', 'doubtful'] } },
    });

    const homeNews = await prisma.newsItem.findMany({
      where: { teamId: match.homeTeamId },
      orderBy: { publishedAt: 'desc' },
      take: 10,
    });
    const awayNews = await prisma.newsItem.findMany({
      where: { teamId: match.awayTeamId },
      orderBy: { publishedAt: 'desc' },
      take: 10,
    });

    const homeXG = this.computeXG(homeElo, homeAdv, homeAvgGoalsFor, homeAvgGoalsAgainst, awayAvgGoalsAgainst, homeInjuries);
    const awayXG = this.computeXG(awayElo, -homeAdv, awayAvgGoalsFor, awayAvgGoalsAgainst, homeAvgGoalsAgainst, awayInjuries);

    return {
      match,
      homeTeam: match.homeTeam,
      awayTeam: match.awayTeam,
      features: {
        homeElo,
        awayElo,
        eloDiff,
        homeXG,
        awayXG,
        homeRecentForm: homeRecent.slice(0, 5).map((m) => m.result),
        awayRecentForm: awayRecent.slice(0, 5).map((m) => m.result),
        homeInjuries,
        awayInjuries,
        homeNewsSentiment: this.avgSentiment(homeNews.map((n) => n.sentiment)),
        awayNewsSentiment: this.avgSentiment(awayNews.map((n) => n.sentiment)),
        oddsWin: match.oddsWin,
        oddsDraw: match.oddsDraw,
        oddsLose: match.oddsLose,
      },
    };
  }

  private static computeXG(
    elo: number,
    eloAdv: number,
    avgFor: number,
    avgAgainst: number,
    oppAvgAgainst: number,
    injuries: number
  ): number {
    const baseGoals = (avgFor + oppAvgAgainst) / 2;
    const eloBoost = (elo + eloAdv - 1500) / 600;
    const injuryPenalty = injuries * 0.1;
    return Math.max(0.3, baseGoals + eloBoost - injuryPenalty);
  }

  private static avgSentiment(arr: (number | null | undefined)[]): number {
    const valid = arr.filter((v) => v != null) as number[];
    if (valid.length === 0) return 0;
    return valid.reduce((a, b) => a + b, 0) / valid.length;
  }
}
