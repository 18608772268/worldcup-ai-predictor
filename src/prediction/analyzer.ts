import { prisma } from '@/lib/prisma';
import { EloRating } from './elo';
import { PoissonModel } from './poisson';
import { MonteCarloSimulator } from './monte-carlo';
import { config } from '@/lib/config';

export interface DetailedPrediction {
  // ELO 预测
  elo: { homeWin: number; draw: number; awayWin: number; homeXG: number; awayXG: number };
  // Poisson
  poisson: { homeWin: number; draw: number; awayWin: number; scoreProbs: Record<string, number> };
  // Monte Carlo
  monteCarlo: {
    homeWin: number; draw: number; awayWin: number;
    over25: number; under25: number; bothYes: number; bothNo: number;
    scoreProbs: Record<string, number>; iterations: number;
  };
  // 最终集成
  final: {
    homeWin: number; draw: number; awayWin: number;
    homeXG: number; awayXG: number;
    over25: number; under25: number; bothYes: number; bothNo: number;
  };
  // 多个比分预测（2-3 个）
  topScores: { score: string; probability: number; reasoning: string }[];
  // 半全场预测
  halfFull: {
    prediction: string; // WW, WD, WL, DW, DD, DL, LW, LD, LL
    probability: number;
    allProbs: Record<string, number>;
  };
  // 每个球队的情况分析
  teamAnalysis: {
    home: TeamAnalysis;
    away: TeamAnalysis;
  };
  // 详细文字分析
  narrative: string;
}

export interface TeamAnalysis {
  name: string;
  elo: number;
  recentForm: string; // WWDLW
  recentGoalsFor: number;
  recentGoalsAgainst: number;
  winRate: number;
  injuries: string[]; // 伤员名字
  topPlayers: string[]; // 核心球员
  strengths: string[];
  weaknesses: string[];
  confidence: number; // 该球队本场信心度 0-100
}

export class DetailedAnalyzer {
  static async analyze(matchId: string): Promise<DetailedPrediction> {
    const match = await prisma.match.findUnique({
      where: { id: matchId },
      include: {
        homeTeam: {
          include: {
            players: { orderBy: { formRating: 'desc' }, take: 5 },
            teamHistory: { orderBy: { matchDate: 'desc' }, take: 5 },
          },
        },
        awayTeam: {
          include: {
            players: { orderBy: { formRating: 'desc' }, take: 5 },
            teamHistory: { orderBy: { matchDate: 'desc' }, take: 5 },
          },
        },
      },
    });

    if (!match) throw new Error('Match not found');

    // 1) ELO 模型（占位，球队强弱基础）
    const homeElo = match.homeTeam.eloRating || 1500;
    const awayElo = match.awayTeam.eloRating || 1500;
    const eloPred = EloRating.winDrawLoseProb(homeElo, awayElo);
    const eloXG = {
      home: EloRating.expectedGoals(homeElo - awayElo + 100, 1.4, 100),
      away: EloRating.expectedGoals(awayElo - homeElo - 100, 1.0, 0),
    };

    // 2) 真实赔率 → 隐含胜平负概率（去掉庄家利润）；无赔率时用 ELO 推算
    const marketProbs = this.marketImplied(match.oddsWin, match.oddsDraw, match.oddsLose, homeElo, awayElo);

    // 3) 用胜平负概率反推预期总进球，再分配到主客（保持 λ_h/λ_a 比例与市场一致）
    const { homeXG: homeXGFromMarket, awayXG: awayXGFromMarket, totalXG } =
      this.lambdasFromMarket(marketProbs, eloXG);

    // 4) Poisson / MC 只用市场反推的 λ
    const homeXG = homeXGFromMarket;
    const awayXG = awayXGFromMarket;
    const poissonResult = PoissonModel.predict(homeXG, awayXG);
    const mcResult = MonteCarloSimulator.simulate(homeXG, awayXG, config.prediction.monteCarloIterations);

    // 5) 最终胜平负：市场为主（70%）+ MC/Poisson 校准（30%）
    const wMarket = 0.70, wModel = 0.30;
    const final = {
      homeWin: wMarket * marketProbs.homeWin + wModel * (poissonResult.winDrawLose.homeWin * 0.5 + mcResult.homeWin * 0.5),
      draw:    wMarket * marketProbs.draw    + wModel * (poissonResult.winDrawLose.draw    * 0.5 + mcResult.draw    * 0.5),
      awayWin: wMarket * marketProbs.awayWin + wModel * (poissonResult.winDrawLose.awayWin * 0.5 + mcResult.awayWin * 0.5),
      homeXG,
      awayXG,
      over25: mcResult.over25,
      under25: mcResult.under25,
      bothYes: mcResult.bothYes,
      bothNo: mcResult.bothNo,
    };
    // 归一化
    const total = final.homeWin + final.draw + final.awayWin;
    final.homeWin /= total;
    final.draw /= total;
    final.awayWin /= total;

    // 比分预测：合并 Poisson 和 MC 比分概率
    const mergedScores = this.mergeScoreProbs(
      mcResult.scoreProbs,
      poissonResult.matrix,
      0.6, 0.4
    );

    // 取前 3 个比分
    const topScoreEntries = Object.entries(mergedScores)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);

    const topScores = topScoreEntries.map(([score, prob]) => {
      const [h, a] = score.split('-').map(Number);
      const reasoning = this.scoreReasoning(h, a, final, homeXG, awayXG);
      return { score, probability: prob, reasoning };
    });

    // 半全场预测
    const halfFull = this.predictHalfFull(final, homeXG, awayXG);

    // 每个球队分析
    const homeAnalysis = this.analyzeTeam(match.homeTeam, homeXG, awayXG, final, true);
    const awayAnalysis = this.analyzeTeam(match.awayTeam, homeXG, awayXG, final, false);

    // 综合文字分析
    const narrative = this.generateNarrative(match, final, topScores, halfFull, homeAnalysis, awayAnalysis);

    return {
      elo: { ...eloPred, homeXG: eloXG.home, awayXG: eloXG.away },
      poisson: {
        homeWin: poissonResult.winDrawLose.homeWin,
        draw: poissonResult.winDrawLose.draw,
        awayWin: poissonResult.winDrawLose.awayWin,
        scoreProbs: poissonResult.matrix,
      },
      monteCarlo: {
        homeWin: mcResult.homeWin,
        draw: mcResult.draw,
        awayWin: mcResult.awayWin,
        over25: mcResult.over25,
        under25: mcResult.under25,
        bothYes: mcResult.bothYes,
        bothNo: mcResult.bothNo,
        scoreProbs: mcResult.scoreProbs,
        iterations: mcResult.iterations,
      },
      final,
      topScores,
      halfFull,
      teamAnalysis: { home: homeAnalysis, away: awayAnalysis },
      narrative,
    };
  }

  /**
   * 真实赔率 → 隐含胜平负概率（去除庄家利润，归一化）
   * 没赔率时用 ELO 排名差距（不再用 1/3 默认）
   */
  private static marketImplied(h: number | null, d: number | null, a: number | null, eloHome = 1500, eloAway = 1500) {
    if (h && d && a && h > 1 && d > 1 && a > 1) {
      const ip = (o: number) => 1 / o;
      const sum = ip(h) + ip(d) + ip(a);
      return { homeWin: ip(h) / sum, draw: ip(d) / sum, awayWin: ip(a) / sum };
    }
    // 用 ELO 差距推算（每 100 ELO ≈ 8% 胜率变化）
    const diff = eloHome - eloAway;
    const homeAdv = 0.05; // 主场优势 5%
    const p = 1 / (1 + Math.pow(10, -(diff / 400 + homeAdv * 4)));
    const draw = 0.28 - Math.min(0.15, Math.abs(diff) / 2000);
    const homeWin = p * (1 - draw);
    const awayWin = (1 - p) * (1 - draw);
    return { homeWin, draw, awayWin: awayWin };
  }

  /**
   * 由胜平负概率反推总进球（弱差距 → 2.5，强差距 → 3.5），并按主客 ELO 分配
   */
  private static lambdasFromMarket(
    probs: { homeWin: number; draw: number; awayWin: number },
    eloXG: { home: number; away: number }
  ) {
    // 差距越大总进球越高（强队容易大胜 + 弱队防守差）
    const margin = Math.abs(probs.homeWin - probs.awayWin);
    const totalXG = 2.4 + margin * 2.5; // 0.4 → 2.4, 0.95 → 4.78
    // 按 ELO 期望分配
    const eloSum = Math.max(0.1, eloXG.home + eloXG.away);
    const homeShare = eloXG.home / eloSum;
    return {
      homeXG: Math.max(0.2, totalXG * homeShare),
      awayXG: Math.max(0.05, totalXG * (1 - homeShare)),
      totalXG,
    };
  }

  private static computeXG(
    team: any,
    opp: any,
    isHome: boolean
  ): number {
    const avgFor = team.avgGoalsFor || 1.4;
    const avgAgainst = team.avgGoalsAgainst || 1.1;
    const oppAvgAgainst = opp.avgGoalsAgainst || 1.1;
    const baseGoals = (avgFor + oppAvgAgainst) / 2;
    const eloBoost = ((team.eloRating || 1500) - (opp.eloRating || 1500) + (isHome ? 100 : -100)) / 600;
    const injuryPenalty = (team.players?.filter((p: any) => p.injuryStatus === 'injured' || p.injuryStatus === 'doubtful').length || 0) * 0.1;
    return Math.max(0.3, baseGoals + eloBoost - injuryPenalty);
  }

  private static scoreReasoning(home: number, away: number, final: any, homeXG: number, awayXG: number): string {
    const total = home + away;
    const result = home > away ? `${home > away ? '主胜' : '平局'}` : home === away ? '平局' : '客胜';
    const goalDiff = Math.abs(home - away);
    const overUnder = total > 2.5 ? '大球' : total < 2.5 ? '小球' : '临界';
    const bothScore = home > 0 && away > 0 ? '双方进球' : '单方进球';

    let reason = `${result}（${home}-${away}），${overUnder}（${total}球），${bothScore}。`;
    reason += `预期进球 ${homeXG.toFixed(2)} - ${awayXG.toFixed(2)}。`;
    if (goalDiff >= 2) reason += '差距明显。';
    else if (goalDiff === 1) reason += '一球小胜可能。';
    else reason += '势均力敌。';
    return reason;
  }

  private static predictHalfFull(final: any, homeXG: number, awayXG: number) {
    // 半全场概率估算（简化模型）
    const halfHomeXG = homeXG / 2;
    const halfAwayXG = awayXG / 2;
    const halfHomeWin = halfHomeXG > 0.5 && halfHomeXG > halfAwayXG ? 0.55 : 0.25;
    const halfDraw = Math.max(0.2, 0.4 - Math.abs(halfHomeXG - halfAwayXG));
    const halfAwayWin = 1 - halfHomeWin - halfDraw;

    const fullResult = final.homeWin > final.awayWin ? (final.homeWin > final.draw ? 'W' : 'D') : (final.awayWin > final.draw ? 'L' : 'D');

    // 半全场组合
    const allProbs: Record<string, number> = {
      WW: halfHomeWin * final.homeWin,
      WD: halfHomeWin * final.draw,
      WL: halfHomeWin * final.awayWin,
      DW: halfDraw * final.homeWin,
      DD: halfDraw * final.draw,
      DL: halfDraw * final.awayWin,
      LW: halfAwayWin * final.homeWin,
      LD: halfAwayWin * final.draw,
      LL: halfAwayWin * final.awayWin,
    };

    // 归一化
    const total = Object.values(allProbs).reduce((a, b) => a + b, 0);
    for (const k of Object.keys(allProbs)) {
      allProbs[k] /= total;
    }

    const sorted = Object.entries(allProbs).sort((a, b) => b[1] - a[1]);
    const [prediction, probability] = sorted[0];
    const labelMap: Record<string, string> = { W: '胜', D: '平', L: '负' };
    const label = prediction.split('').map((c) => labelMap[c]).join('-');

    return { prediction: label, probability, allProbs };
  }

  private static analyzeTeam(team: any, homeXG: number, awayXG: number, final: any, isHome: boolean): TeamAnalysis {
    const history = team.teamHistory || [];
    const recentForm = history.slice(0, 5).map((h: any) => h.result).join('');
    const recentGF = history.length ? history.reduce((s: number, h: any) => s + h.goalsFor, 0) / history.length : team.avgGoalsFor;
    const recentGA = history.length ? history.reduce((s: number, h: any) => s + h.goalsAgainst, 0) / history.length : team.avgGoalsAgainst;
    const injuries = (team.players || [])
      .filter((p: any) => p.injuryStatus === 'injured' || p.injuryStatus === 'doubtful')
      .map((p: any) => p.name);
    const topPlayers = (team.players || []).slice(0, 3).map((p: any) => p.name);

    const strengths: string[] = [];
    const weaknesses: string[] = [];

    if ((team.eloRating || 1500) > 1700) strengths.push(`ELO 评分 ${team.eloRating.toFixed(0)}，世界顶级`);
    if ((team.winRate || 0) > 0.6) strengths.push(`胜率 ${(team.winRate * 100).toFixed(0)}%，实力强劲`);
    if (recentGF > 1.5) strengths.push(`近 5 场场均进 ${recentGF.toFixed(1)} 球`);
    if (recentGA < 1.0) strengths.push(`近 5 场场均失 ${recentGA.toFixed(1)} 球，防守稳固`);
    if (topPlayers.length >= 3) strengths.push(`核心球员: ${topPlayers.slice(0, 2).join('、')}`);

    if (injuries.length > 0) weaknesses.push(`${injuries.length} 名球员伤停 (${injuries.slice(0, 2).join('、')})`);
    if ((team.winRate || 0) < 0.45) weaknesses.push(`胜率仅 ${(team.winRate * 100).toFixed(0)}%，状态不稳`);
    if (recentGA > 1.5) weaknesses.push(`近 5 场场均失 ${recentGA.toFixed(1)} 球，防守存在隐患`);
    if (recentGF < 1.0) weaknesses.push(`近 5 场场均进 ${recentGF.toFixed(1)} 球，进攻乏力`);
    if ((team.eloRating || 1500) < 1550) weaknesses.push(`ELO 评分仅 ${team.eloRating.toFixed(0)}，竞争力有限`);

    // 信心度（根据该队胜率 + ELO + 形态）
    const winProb = isHome ? final.homeWin : final.awayWin;
    const confidence = Math.round(winProb * 100);

    return {
      name: team.name,
      elo: team.eloRating,
      recentForm,
      recentGoalsFor: recentGF,
      recentGoalsAgainst: recentGA,
      winRate: team.winRate,
      injuries,
      topPlayers,
      strengths,
      weaknesses,
      confidence,
    };
  }

  private static generateNarrative(
    match: any,
    final: any,
    topScores: { score: string; probability: number; reasoning: string }[],
    halfFull: { prediction: string; probability: number },
    home: TeamAnalysis,
    away: TeamAnalysis
  ): string {
    const result = final.homeWin > final.awayWin ? (final.homeWin > final.draw ? `${match.homeTeam.name} 胜` : '平局') : (final.awayWin > final.draw ? `${match.awayTeam.name} 胜` : '平局');
    const confidence = Math.round((Math.max(final.homeWin, final.draw, final.awayWin)) * 100);

    let narrative = `【综合分析】\n\n`;
    narrative += `基于 ELO 评分体系、Poisson 分布模型和 Monte Carlo ${config.prediction.monteCarloIterations.toLocaleString()} 次模拟，`;
    narrative += `本场比赛最可能结果为：${result}（综合信心度 ${confidence}%）。\n\n`;

    narrative += `【${home.name} 情况】\n`;
    narrative += `ELO 评分 ${home.elo.toFixed(0)}，胜率 ${(home.winRate * 100).toFixed(0)}%。近期形态：${home.recentForm || '暂无数据'}。`;
    narrative += `近 5 场场均进 ${home.recentGoalsFor.toFixed(1)} 球，失 ${home.recentGoalsAgainst.toFixed(1)} 球。`;
    if (home.injuries.length > 0) narrative += `\n⚠️ 伤停：${home.injuries.join('、')}。`;
    if (home.strengths.length > 0) narrative += `\n✓ 优势：${home.strengths.join('；')}。`;
    if (home.weaknesses.length > 0) narrative += `\n✗ 隐患：${home.weaknesses.join('；')}。`;
    narrative += `\n本场信心度：${home.confidence}%。\n\n`;

    narrative += `【${away.name} 情况】\n`;
    narrative += `ELO 评分 ${away.elo.toFixed(0)}，胜率 ${(away.winRate * 100).toFixed(0)}%。近期形态：${away.recentForm || '暂无数据'}。`;
    narrative += `近 5 场场均进 ${away.recentGoalsFor.toFixed(1)} 球，失 ${away.recentGoalsAgainst.toFixed(1)} 球。`;
    if (away.injuries.length > 0) narrative += `\n⚠️ 伤停：${away.injuries.join('、')}。`;
    if (away.strengths.length > 0) narrative += `\n✓ 优势：${away.strengths.join('；')}。`;
    if (away.weaknesses.length > 0) narrative += `\n✗ 隐患：${away.weaknesses.join('；')}。`;
    narrative += `\n本场信心度：${away.confidence}%。\n\n`;

    narrative += `【比分预测】\n`;
    topScores.forEach((s, i) => {
      narrative += `${i + 1}. ${s.score} (概率 ${(s.probability * 100).toFixed(1)}%) - ${s.reasoning}\n`;
    });

    narrative += `\n【半全场预测】\n`;
    narrative += `${halfFull.prediction}（概率 ${(halfFull.probability * 100).toFixed(1)}%）`;
    narrative += `\n（半场结果 + 全场结果的组合预测）`;

    return narrative;
  }

  private static mergeScoreProbs(
    a: Record<string, number>,
    b: Record<string, number>,
    wa: number,
    wb: number
  ): Record<string, number> {
    const all = new Set([...Object.keys(a), ...Object.keys(b)]);
    const result: Record<string, number> = {};
    for (const k of all) {
      result[k] = (a[k] || 0) * wa + (b[k] || 0) * wb;
    }
    return result;
  }
}
