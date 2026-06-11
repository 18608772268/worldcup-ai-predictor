import { EloRating } from './elo';
import { PoissonModel } from './poisson';
import { MonteCarloSimulator } from './monte-carlo';
import { config } from '@/lib/config';

export class EnsemblePredictor {
  static predict(features: {
    homeElo: number;
    awayElo: number;
    homeXG: number;
    awayXG: number;
  }) {
    const { homeElo, awayElo, homeXG, awayXG } = features;

    const eloPred = EloRating.winDrawLoseProb(homeElo, awayElo);
    const eloHomeXG = EloRating.expectedGoals(homeElo - awayElo + 100, 1.4, 100);
    const eloAwayXG = EloRating.expectedGoals(awayElo - homeElo - 100, 1.0, 0);

    const poissonResult = PoissonModel.predict(homeXG, awayXG);

    const mcResult = MonteCarloSimulator.simulate(homeXG, awayXG, config.prediction.monteCarloIterations);

    const wElo = 0.20;
    const wPoisson = 0.40;
    const wMC = 0.40;

    const finalHomeWin = wElo * eloPred.homeWin + wPoisson * poissonResult.winDrawLose.homeWin + wMC * mcResult.homeWin;
    const finalDraw = wElo * eloPred.draw + wPoisson * poissonResult.winDrawLose.draw + wMC * mcResult.draw;
    const finalAwayWin = wElo * eloPred.awayWin + wPoisson * poissonResult.winDrawLose.awayWin + wMC * mcResult.awayWin;

    const total = finalHomeWin + finalDraw + finalAwayWin;
    const norm = (v: number) => total > 0 ? v / total : v;

    const scoreProbs = this.mergeScoreProbs(
      mcResult.scoreProbs,
      poissonResult.matrix,
      0.6, 0.4
    );

    const topScores = Object.entries(scoreProbs)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .reduce((acc, [k, v]) => ({ ...acc, [k]: v }), {});

    return {
      elo: {
        homeWin: eloPred.homeWin,
        draw: eloPred.draw,
        awayWin: eloPred.awayWin,
        homeXG: eloHomeXG,
        awayXG: eloAwayXG,
      },
      poisson: {
        homeWin: poissonResult.winDrawLose.homeWin,
        draw: poissonResult.winDrawLose.draw,
        awayWin: poissonResult.winDrawLose.awayWin,
        homeXG: homeXG,
        awayXG: awayXG,
        scoreProbs: poissonResult.matrix,
      },
      monteCarlo: {
        homeWin: mcResult.homeWin,
        draw: mcResult.draw,
        awayWin: mcResult.awayWin,
        homeXG: mcResult.homeXG,
        awayXG: mcResult.awayXG,
        over25: mcResult.over25,
        under25: mcResult.under25,
        bothYes: mcResult.bothYes,
        bothNo: mcResult.bothNo,
        scoreProbs: mcResult.scoreProbs,
        iterations: mcResult.iterations,
      },
      final: {
        homeWin: norm(finalHomeWin),
        draw: norm(finalDraw),
        awayWin: norm(finalAwayWin),
        homeXG: (homeXG + eloHomeXG) / 2,
        awayXG: (awayXG + eloAwayXG) / 2,
        over25: mcResult.over25,
        under25: mcResult.under25,
        bothYes: mcResult.bothYes,
        bothNo: mcResult.bothNo,
        scoreProbs: topScores,
      },
    };
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
