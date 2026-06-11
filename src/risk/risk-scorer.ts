import { prisma } from '@/lib/prisma';

export interface RiskInput {
  matchId: string;
  oddsHistory: { win: number; draw: number; lose: number; recordedAt: Date }[];
  currentOdds: { win?: number; draw?: number; lose?: number };
  news: { sentiment: number | null; importance: number; category: string | null }[];
  injuries: { home: number; away: number; keyInjuriesHome: string[]; keyInjuriesAway: string[] };
  modelAgreement: number;
  historyAccuracy?: number;
  dataCompleteness?: number;
}

export class RiskScorer {
  static calculate(input: RiskInput): { score: number; level: 'low' | 'medium' | 'high'; breakdown: Record<string, number> } {
    const breakdown: Record<string, number> = {};

    // 1. 赔率波动 (0-30 分)
    const oddsVolatility = this.oddsVolatility(input.oddsHistory);
    const oddsScore = Math.min(30, oddsVolatility * 200);
    breakdown.oddsVolatility = Math.round(oddsScore * 10) / 10;

    // 2. 新闻影响 (0-25 分)
    const newsScore = this.newsImpact(input.news);
    breakdown.newsImpact = Math.round(newsScore * 10) / 10;

    // 3. 伤病影响 (0-25 分) - 关键球员伤病重
    const homeInjuryScore = Math.min(15, input.injuries.home * 4);
    const awayInjuryScore = Math.min(15, input.injuries.away * 4);
    const keyPlayerPenalty = (input.injuries.keyInjuriesHome.length + input.injuries.keyInjuriesAway.length) * 3;
    const injuryScore = homeInjuryScore + awayInjuryScore + keyPlayerPenalty;
    breakdown.injuries = Math.round(Math.min(25, injuryScore) * 10) / 10;

    // 4. 模型一致性 (-25 ~ 0 分, 一致性高减分)
    const modelScore = -(input.modelAgreement * 25);
    breakdown.modelAgreement = Math.round(modelScore * 10) / 10;

    // 5. 数据完整度 (-15 ~ 0 分)
    const completenessScore = -((input.dataCompleteness || 0.5) * 15);
    breakdown.dataCompleteness = Math.round(completenessScore * 10) / 10;

    // 6. 历史准确率 (-10 ~ 0)
    const historyScore = -((input.historyAccuracy || 0.5) * 10);
    breakdown.historyAccuracy = Math.round(historyScore * 10) / 10;

    // 综合（基础分 50，加上各项贡献）
    let score = 50 + oddsScore + newsScore + Math.min(25, injuryScore) + modelScore + completenessScore + historyScore;
    score = Math.max(0, Math.min(100, score));

    const level: 'low' | 'medium' | 'high' = score < 33 ? 'low' : score < 66 ? 'medium' : 'high';
    return { score: Math.round(score * 10) / 10, level, breakdown };
  }

  private static oddsVolatility(history: { win: number; draw: number; lose: number }[]): number {
    if (history.length < 2) return 0;
    const winStd = this.std(history.map((h) => h.win));
    const drawStd = this.std(history.map((h) => h.draw));
    const loseStd = this.std(history.map((h) => h.lose));
    return (winStd + drawStd + loseStd) / 3;
  }

  private static newsImpact(news: { sentiment: number | null; importance: number }[]): number {
    if (news.length === 0) return 0;
    let impact = 0;
    for (const n of news) {
      const s = n.sentiment ?? 0;
      impact += Math.abs(s) * (n.importance / 10) * 4;
    }
    return Math.min(25, impact);
  }

  private static std(values: number[]): number {
    if (values.length < 2) return 0;
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((a, b) => a + (b - mean) ** 2, 0) / values.length;
    return Math.sqrt(variance);
  }
}

export async function getRiskInput(matchId: string): Promise<RiskInput> {
  const match = await prisma.match.findUnique({
    where: { id: matchId },
    include: {
      homeTeam: { include: { players: { where: { injuryStatus: { in: ['injured', 'doubtful'] } } } } },
      awayTeam: { include: { players: { where: { injuryStatus: { in: ['injured', 'doubtful'] } } } } },
      oddsHistory: { orderBy: { recordedAt: 'desc' }, take: 20 },
      news: { orderBy: { publishedAt: 'desc' }, take: 20 },
    },
  });
  if (!match) throw new Error('Match not found');

  // 关键球员识别（按 formRating 排序的前 5 个有伤病的）
  const keyInjuriesHome = (match.homeTeam?.players || [])
    .filter((p) => p.injuryStatus === 'injured' || p.injuryStatus === 'doubtful')
    .slice(0, 5)
    .map((p) => p.name);
  const keyInjuriesAway = (match.awayTeam?.players || [])
    .filter((p) => p.injuryStatus === 'injured' || p.injuryStatus === 'doubtful')
    .slice(0, 5)
    .map((p) => p.name);

  return {
    matchId,
    oddsHistory: match.oddsHistory.map((o) => ({
      win: o.oddsWin || 0,
      draw: o.oddsDraw || 0,
      lose: o.oddsLose || 0,
      recordedAt: o.recordedAt,
    })),
    currentOdds: {
      win: match.oddsWin,
      draw: match.oddsDraw,
      lose: match.oddsLose,
    },
    news: match.news.map((n) => ({
      sentiment: n.sentiment,
      importance: n.importance,
      category: n.category,
    })),
    injuries: {
      home: match.homeTeam?.players?.length || 0,
      away: match.awayTeam?.players?.length || 0,
      keyInjuriesHome,
      keyInjuriesAway,
    },
    modelAgreement: 0.7,
    historyAccuracy: 0.6,
    dataCompleteness: 0.7,
  };
}
