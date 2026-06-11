import { prisma } from '@/lib/prisma';
import { DetailedAnalyzer } from '@/prediction/analyzer';
import { FeatureBuilder } from '@/prediction/features';
import { AIAnalyzer } from '@/ai/analyzer';
import { RiskScorer, getRiskInput } from '@/risk/risk-scorer';
import { ConfidenceScorer, getConfidenceInput } from '@/risk/confidence-scorer';
import { logger } from '@/lib/logger';

export class MatchService {
  static async getTodayMatches() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return prisma.match.findMany({
      where: {
        matchTime: { gte: today, lt: tomorrow },
      },
      include: {
        homeTeam: true,
        awayTeam: true,
        prediction: true,
      },
      orderBy: { matchTime: 'asc' },
    });
  }

  static async listMatches(opts: {
    page?: number;
    pageSize?: number;
    status?: string;
    league?: string;
  } = {}) {
    const { page = 1, pageSize = 20, status, league } = opts;
    const where: any = {};
    if (status) where.status = status;
    if (league) where.league = league;

    const [items, total] = await Promise.all([
      prisma.match.findMany({
        where,
        include: { homeTeam: true, awayTeam: true, prediction: true },
        orderBy: { matchTime: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.match.count({ where }),
    ]);

    return { items, total, page, pageSize };
  }

  static async getMatchDetail(id: string) {
    return prisma.match.findUnique({
      where: { id },
      include: {
        homeTeam: { include: { players: true } },
        awayTeam: { include: { players: true } },
        prediction: true,
        matchStats: true,
        news: { orderBy: { publishedAt: 'desc' }, take: 20 },
        oddsHistory: { orderBy: { recordedAt: 'desc' }, take: 30 },
      },
    });
  }

  /**
   * 生成详细预测（使用 DetailedAnalyzer）
   */
  static async generatePrediction(matchId: string) {
    const t0 = Date.now();
    try {
      // 1. 数学详细分析（含多个比分、半全场、球队分析）
      const analysis = await DetailedAnalyzer.analyze(matchId);

      // 2. 模型一致性（基于 ELO/Poisson/MC 三个 homeWin 概率）
      const homeWinArr = [analysis.elo.homeWin, analysis.poisson.homeWin, analysis.monteCarlo.homeWin];
      const max = Math.max(...homeWinArr);
      const min = Math.min(...homeWinArr);
      const modelAgreement = 1 - (max - min);

      // 3. 风险 & 信心（使用真实数据）
      const [riskInput, confInput] = await Promise.all([
        getRiskInput(matchId),
        getConfidenceInput(matchId),
      ]);
      // 用真实计算值覆盖默认值
      riskInput.modelAgreement = modelAgreement;
      riskInput.dataCompleteness = confInput.dataCompleteness;
      riskInput.historyAccuracy = modelAgreement; // 用模型一致性近似
      const risk = RiskScorer.calculate(riskInput);
      const confidence = ConfidenceScorer.calculate(confInput);

      // 4. 持久化
      const prediction = await prisma.prediction.upsert({
        where: { matchId },
        update: {
          eloHomeWin: analysis.elo.homeWin,
          eloDraw: analysis.elo.draw,
          eloAwayWin: analysis.elo.awayWin,
          eloHomeExpectedGoals: analysis.elo.homeXG,
          eloAwayExpectedGoals: analysis.elo.awayXG,
          poissonHomeWin: analysis.poisson.homeWin,
          poissonDraw: analysis.poisson.draw,
          poissonAwayWin: analysis.poisson.awayWin,
          poissonScoreJson: JSON.stringify(analysis.poisson.scoreProbs),
          mcHomeWin: analysis.monteCarlo.homeWin,
          mcDraw: analysis.monteCarlo.draw,
          mcAwayWin: analysis.monteCarlo.awayWin,
          mcHomeXG: 0,
          mcAwayXG: 0,
          mcOver25: analysis.monteCarlo.over25,
          mcUnder25: analysis.monteCarlo.under25,
          mcBothYes: analysis.monteCarlo.bothYes,
          mcBothNo: analysis.monteCarlo.bothNo,
          mcScoreJson: JSON.stringify(analysis.monteCarlo.scoreProbs),
          mcIterations: analysis.monteCarlo.iterations,
          finalHomeWin: analysis.final.homeWin,
          finalDraw: analysis.final.draw,
          finalAwayWin: analysis.final.awayWin,
          finalHomeXG: analysis.final.homeXG,
          finalAwayXG: analysis.final.awayXG,
          finalOver25: analysis.final.over25,
          finalUnder25: analysis.final.under25,
          finalBothYes: analysis.final.bothYes,
          finalBothNo: analysis.final.bothNo,
          finalScoreJson: JSON.stringify(analysis.final),
          topScoresJson: JSON.stringify(analysis.topScores),
          halfFullPred: analysis.halfFull.prediction,
          halfFullProb: analysis.halfFull.probability,
          halfFullAllJson: JSON.stringify(analysis.halfFull.allProbs),
          teamAnalysisJson: JSON.stringify(analysis.teamAnalysis),
          narrative: analysis.narrative,
          aiPredictedScore: analysis.topScores[0]?.score || '0-0',
          aiPredictedResult: analysis.final.homeWin > analysis.final.awayWin ? 'H' : analysis.final.homeWin === analysis.final.awayWin ? 'D' : 'A',
          aiHalfFull: analysis.halfFull.prediction,
          aiAnalysis: analysis.narrative,
          aiConfidence: Math.round(modelAgreement * 100),
          aiKeyFactors: JSON.stringify(analysis.topScores.slice(0, 3).map(s => s.reasoning)),
          aiPromptTokens: 0,
          aiCompletionTokens: 0,
          riskScore: risk.score,
          riskLevel: risk.level,
          riskBreakdownJson: JSON.stringify(risk.breakdown),
          confidenceScore: confidence.score,
          confidenceLevel: confidence.level,
          modelAgreement,
          dataCompleteness: confInput.dataCompleteness,
          modelVersion: '2.0.0',
        },
        create: {
          matchId,
          eloHomeWin: analysis.elo.homeWin,
          eloDraw: analysis.elo.draw,
          eloAwayWin: analysis.elo.awayWin,
          eloHomeExpectedGoals: analysis.elo.homeXG,
          eloAwayExpectedGoals: analysis.elo.awayXG,
          poissonHomeWin: analysis.poisson.homeWin,
          poissonDraw: analysis.poisson.draw,
          poissonAwayWin: analysis.poisson.awayWin,
          poissonScoreJson: JSON.stringify(analysis.poisson.scoreProbs),
          mcHomeWin: analysis.monteCarlo.homeWin,
          mcDraw: analysis.monteCarlo.draw,
          mcAwayWin: analysis.monteCarlo.awayWin,
          mcHomeXG: 0,
          mcAwayXG: 0,
          mcOver25: analysis.monteCarlo.over25,
          mcUnder25: analysis.monteCarlo.under25,
          mcBothYes: analysis.monteCarlo.bothYes,
          mcBothNo: analysis.monteCarlo.bothNo,
          mcScoreJson: JSON.stringify(analysis.monteCarlo.scoreProbs),
          mcIterations: analysis.monteCarlo.iterations,
          finalHomeWin: analysis.final.homeWin,
          finalDraw: analysis.final.draw,
          finalAwayWin: analysis.final.awayWin,
          finalHomeXG: analysis.final.homeXG,
          finalAwayXG: analysis.final.awayXG,
          finalOver25: analysis.final.over25,
          finalUnder25: analysis.final.under25,
          finalBothYes: analysis.final.bothYes,
          finalBothNo: analysis.final.bothNo,
          finalScoreJson: JSON.stringify(analysis.final),
          topScoresJson: JSON.stringify(analysis.topScores),
          halfFullPred: analysis.halfFull.prediction,
          halfFullProb: analysis.halfFull.probability,
          halfFullAllJson: JSON.stringify(analysis.halfFull.allProbs),
          teamAnalysisJson: JSON.stringify(analysis.teamAnalysis),
          narrative: analysis.narrative,
          aiPredictedScore: analysis.topScores[0]?.score || '0-0',
          aiPredictedResult: analysis.final.homeWin > analysis.final.awayWin ? 'H' : analysis.final.homeWin === analysis.final.awayWin ? 'D' : 'A',
          aiHalfFull: analysis.halfFull.prediction,
          aiAnalysis: analysis.narrative,
          aiConfidence: Math.round(modelAgreement * 100),
          aiKeyFactors: JSON.stringify(analysis.topScores.slice(0, 3).map(s => s.reasoning)),
          riskScore: risk.score,
          riskLevel: risk.level,
          riskBreakdownJson: JSON.stringify(risk.breakdown),
          confidenceScore: confidence.score,
          confidenceLevel: confidence.level,
          modelAgreement,
          dataCompleteness: confInput.dataCompleteness,
          modelVersion: '2.0.0',
        },
      });

      logger.info('详细预测生成完成', { matchId, duration: Date.now() - t0 });
      return prediction;
    } catch (e: any) {
      logger.error('预测生成失败', { matchId, error: e.message });
      throw e;
    }
  }

  static async batchPredict() {
    // 预测范围：未来比赛 + 过去 48 小时内还没预测的（处理跨时区 + cron 同步晚）
    const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000);
    const matches = await prisma.match.findMany({
      where: {
        status: { in: ['scheduled', 'Selling'] },
        matchTime: { gte: cutoff },
        prediction: null,
      },
      take: 50,
    });
    let count = 0;
    for (const m of matches) {
      try {
        await this.generatePrediction(m.id);
        count++;
      } catch (e: any) {
        logger.warn('单场预测失败', { matchId: m.id, error: e.message, stack: e.stack });
      }
    }
    return count;
  }
}
