import { gaussian } from '@/utils/math';
import { config } from '@/lib/config';

export class MonteCarloSimulator {
  static defaultIterations = config.prediction.monteCarloIterations;

  static simulate(
    lambdaHome: number,
    lambdaAway: number,
    iterations: number = this.defaultIterations
  ) {
    const scoreCount: Record<string, number> = {};
    let homeWin = 0, draw = 0, awayWin = 0;
    let over25 = 0, under25 = 0;
    let bothYes = 0, bothNo = 0;
    let totalHomeGoals = 0, totalAwayGoals = 0;

    for (let i = 0; i < iterations; i++) {
      const lh = Math.max(0.1, gaussian(lambdaHome, 0.3));
      const la = Math.max(0.1, gaussian(lambdaAway, 0.3));

      const homeGoals = this.samplePoisson(lh);
      const awayGoals = this.samplePoisson(la);

      const score = `${homeGoals}-${awayGoals}`;
      scoreCount[score] = (scoreCount[score] || 0) + 1;

      if (homeGoals > awayGoals) homeWin++;
      else if (homeGoals === awayGoals) draw++;
      else awayWin++;

      if (homeGoals + awayGoals > 2.5) over25++;
      else under25++;

      if (homeGoals > 0 && awayGoals > 0) bothYes++;
      else bothNo++;

      totalHomeGoals += homeGoals;
      totalAwayGoals += awayGoals;
    }

    const scoreProbs: Record<string, number> = {};
    for (const [s, c] of Object.entries(scoreCount)) {
      scoreProbs[s] = c / iterations;
    }

    return {
      iterations,
      homeWin: homeWin / iterations,
      draw: draw / iterations,
      awayWin: awayWin / iterations,
      over25: over25 / iterations,
      under25: under25 / iterations,
      bothYes: bothYes / iterations,
      bothNo: bothNo / iterations,
      homeXG: totalHomeGoals / iterations,
      awayXG: totalAwayGoals / iterations,
      scoreProbs,
    };
  }

  private static samplePoisson(lambda: number): number {
    if (lambda < 30) {
      const L = Math.exp(-lambda);
      let k = 0, p = 1;
      do {
        k++;
        p *= Math.random();
      } while (p > L);
      return k - 1;
    }
    return Math.max(0, Math.round(gaussian(lambda, Math.sqrt(lambda))));
  }

  static simulateBatch(
    matches: { lambdaHome: number; lambdaAway: number }[],
    iterations: number = this.defaultIterations
  ) {
    return matches.map((m) => this.simulate(m.lambdaHome, m.lambdaAway, iterations));
  }
}
