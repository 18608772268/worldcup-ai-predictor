import { prisma } from '@/lib/prisma';

export interface ConfidenceInput {
  matchId: string;
  modelAgreement: number;
  dataCompleteness: number;
  newsConsistency: number;
  oddsConsistency: number;
}

function std(values: number[]): number {
  if (values.length < 2) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((a, b) => a + (b - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

export class ConfidenceScorer {
  static calculate(input: ConfidenceInput): { score: number; level: 'low' | 'medium' | 'high' } {
    const score = Math.round(
      input.modelAgreement * 35 +
        input.dataCompleteness * 25 +
        input.newsConsistency * 20 +
        input.oddsConsistency * 20
    );
    const clamped = Math.max(0, Math.min(100, score));
    const level: 'low' | 'medium' | 'high' = clamped < 33 ? 'low' : clamped < 66 ? 'medium' : 'high';
    return { score: clamped, level };
  }
}

export async function getConfidenceInput(matchId: string): Promise<ConfidenceInput> {
  const match = await prisma.match.findUnique({
    where: { id: matchId },
    include: { homeTeam: true, awayTeam: true, news: true, prediction: true, oddsHistory: true },
  });
  if (!match) throw new Error('Match not found');

  let completeness = 0;
  if (match.homeTeam?.eloRating) completeness += 0.2;
  if (match.awayTeam?.eloRating) completeness += 0.2;
  if (match.oddsWin) completeness += 0.15;
  if (match.oddsDraw) completeness += 0.15;
  if (match.oddsLose) completeness += 0.15;
  if (match.homeTeam?.matchesPlayed) completeness += 0.075;
  if (match.awayTeam?.matchesPlayed) completeness += 0.075;

  let modelAgreement = 0.7;
  if (match.prediction) {
    const p = match.prediction;
    const arr = [p.eloHomeWin, p.poissonHomeWin, p.mcHomeWin].filter((v) => v != null) as number[];
    if (arr.length === 3) {
      const max = Math.max(...arr);
      const min = Math.min(...arr);
      modelAgreement = Math.max(0, Math.min(1, 1 - (max - min)));
    }
  }

  const newsConsistency = match.news.length > 0 ? 0.7 : 0.4;

  let oddsConsistency = 0.5;
  if (match.oddsHistory.length > 5) {
    const recent = match.oddsHistory.slice(0, 10);
    const winVar = std(recent.map((o) => o.oddsWin || 0));
    oddsConsistency = Math.max(0, 1 - winVar / 5);
  }

  return {
    matchId,
    modelAgreement,
    dataCompleteness: completeness,
    newsConsistency,
    oddsConsistency,
  };
}
