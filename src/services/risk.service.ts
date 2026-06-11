import { prisma } from '@/lib/prisma';
import { RiskScorer, getRiskInput } from '@/risk/risk-scorer';
import { ConfidenceScorer, getConfidenceInput } from '@/risk/confidence-scorer';

export class RiskService {
  static async computeForMatch(matchId: string) {
    const [riskInput, confInput] = await Promise.all([
      getRiskInput(matchId),
      getConfidenceInput(matchId),
    ]);
    const risk = RiskScorer.calculate(riskInput);
    const confidence = ConfidenceScorer.calculate(confInput);
    return { risk, confidence };
  }
}
