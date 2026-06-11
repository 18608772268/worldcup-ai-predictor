import { config } from '@/lib/config';

export class EloRating {
  static expectedScore(ratingA: number, ratingB: number, homeAdvantage = 0): number {
    const adjustedA = ratingA + homeAdvantage;
    return 1 / (1 + Math.pow(10, (ratingB - adjustedA) / 400));
  }

  static winDrawLoseProb(homeRating: number, awayRating: number): {
    homeWin: number;
    draw: number;
    awayWin: number;
  } {
    const homeAdv = config.prediction.eloHomeAdvantage;
    const homeExp = this.expectedScore(homeRating + homeAdv, awayRating);
    const awayExp = 1 - homeExp;

    const eloDiff = homeRating + homeAdv - awayRating;
    const drawBase = 0.28;
    const drawProb = Math.max(0.15, drawBase - Math.abs(eloDiff) / 1500);

    const winShare = homeExp / (homeExp + awayExp);
    const loseShare = awayExp / (homeExp + awayExp);
    const remaining = 1 - drawProb;
    return {
      homeWin: winShare * remaining,
      draw: drawProb,
      awayWin: loseShare * remaining,
    };
  }

  static expectedGoals(eloDiff: number, baseGoals: number, homeAdvantage: number): number {
    return Math.max(0.3, baseGoals + (eloDiff + homeAdvantage) / 600);
  }

  static updateRating(
    currentRating: number,
    expected: number,
    actual: number,
    kFactor = 32
  ): number {
    return currentRating + kFactor * (actual - expected);
  }
}
