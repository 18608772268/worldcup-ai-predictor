export interface PredictionResult {
  matchId: string;
  elo: { homeWin: number; draw: number; awayWin: number; homeXG: number; awayXG: number };
  poisson: {
    homeWin: number;
    draw: number;
    awayWin: number;
    homeXG: number;
    awayXG: number;
    scoreProbs: Record<string, number>;
  };
  monteCarlo: {
    homeWin: number;
    draw: number;
    awayWin: number;
    homeXG: number;
    awayXG: number;
    over25: number;
    under25: number;
    bothYes: number;
    bothNo: number;
    scoreProbs: Record<string, number>;
    iterations: number;
  };
  final: {
    homeWin: number;
    draw: number;
    awayWin: number;
    homeXG: number;
    awayXG: number;
    over25: number;
    under25: number;
    bothYes: number;
    bothNo: number;
    scoreProbs: Record<string, number>;
  };
  ai?: {
    predictedScore: string;
    predictedResult: 'H' | 'D' | 'A';
    halfFull?: string;
    analysis: string;
    confidence: number;
    keyFactors: string[];
  };
  risk: { score: number; level: 'low' | 'medium' | 'high' };
  confidence: { score: number; level: 'low' | 'medium' | 'high' };
  computedAt: string;
}
