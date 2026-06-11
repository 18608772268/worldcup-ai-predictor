import { minimaxClient } from './minimax.client';
import { PromptBuilder } from './prompt.builder';
import { FeatureBuilder } from '@/prediction/features';
import { EnsemblePredictor } from '@/prediction/ensemble';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

export class AIAnalyzer {
  static async analyzeMatch(matchId: string) {
    const t0 = Date.now();
    const features = await FeatureBuilder.buildForMatch(matchId);
    const mathPrediction = EnsemblePredictor.predict(features.features);

    const homePlayers = await prisma.player.findMany({
      where: { teamId: features.homeTeam.id },
      orderBy: { formRating: 'desc' },
      take: 15,
    });
    const awayPlayers = await prisma.player.findMany({
      where: { teamId: features.awayTeam.id },
      orderBy: { formRating: 'desc' },
      take: 15,
    });
    const homeNews = await prisma.newsItem.findMany({
      where: { teamId: features.homeTeam.id },
      orderBy: { publishedAt: 'desc' },
      take: 5,
    });
    const awayNews = await prisma.newsItem.findMany({
      where: { teamId: features.awayTeam.id },
      orderBy: { publishedAt: 'desc' },
      take: 5,
    });

    const prompt = PromptBuilder.buildMatchAnalysisPrompt({
      match: features.match,
      homeTeam: features.homeTeam,
      awayTeam: features.awayTeam,
      homePlayers,
      awayPlayers,
      homeNews,
      awayNews,
      features: features.features,
      odds: {
        win: features.match.oddsWin,
        draw: features.match.oddsDraw,
        lose: features.match.oddsLose,
        handicapLine: features.match.handicapLine,
        handicapWin: features.match.oddsHandicapWin,
        handicapDraw: features.match.oddsHandicapDraw,
        handicapLose: features.match.oddsHandicapLose,
        overUnderLine: features.match.overUnderLine,
        over: features.match.oddsOver,
        under: features.match.oddsUnder,
      },
      prediction: mathPrediction.final,
    });

    let aiResult: any = {
      predictedScore: this.scoreFromXG(mathPrediction.final.homeXG, mathPrediction.final.awayXG),
      predictedResult: mathPrediction.final.homeWin > mathPrediction.final.awayWin ? 'H' : mathPrediction.final.homeWin === mathPrediction.final.awayWin ? 'D' : 'A',
      halfFull: this.guessHalfFull(mathPrediction.final.homeXG, mathPrediction.final.awayXG),
      analysis: 'AI 服务不可用，使用数学模型结果。',
      confidence: 60,
      keyFactors: ['数据不足', '数学模型为主'],
    };

    let usage = { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 };

    try {
      const r = await minimaxClient.chatJSON<typeof aiResult>([
        { role: 'system', content: '你是一名专业的足球比赛分析师，输出严格JSON。' },
        { role: 'user', content: prompt },
      ]);
      if (r.data && r.data.predictedScore) {
        aiResult = { ...aiResult, ...r.data };
      }
      usage = r.usage;
    } catch (e: any) {
      logger.warn('AI分析失败,使用fallback', { matchId, error: e.message });
    }

    logger.info('AI分析完成', { matchId, duration: Date.now() - t0 });
    return { ...mathPrediction, ai: aiResult, usage };
  }

  private static scoreFromXG(homeXG: number, awayXG: number): string {
    return `${Math.round(homeXG)}-${Math.round(awayXG)}`;
  }

  private static guessHalfFull(homeXG: number, awayXG: number): string {
    const h = Math.round(homeXG);
    const a = Math.round(awayXG);
    const halfH = Math.floor(h / 2);
    const halfA = Math.floor(a / 2);
    const halfChar = halfH > halfA ? 'W' : halfH === halfA ? 'D' : 'L';
    const fullChar = h > a ? 'W' : h === a ? 'D' : 'L';
    return `${halfChar}${fullChar}`;
  }
}
