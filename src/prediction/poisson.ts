import { poissonPMF } from '@/utils/math';

export class PoissonModel {
  static maxGoals = 7;

  static scoreMatrix(lambdaHome: number, lambdaAway: number): Record<string, number> {
    const matrix: Record<string, number> = {};
    for (let h = 0; h <= this.maxGoals; h++) {
      for (let a = 0; a <= this.maxGoals; a++) {
        const p = poissonPMF(h, lambdaHome) * poissonPMF(a, lambdaAway);
        if (p > 0.0001) {
          matrix[`${h}-${a}`] = p;
        }
      }
    }
    return matrix;
  }

  static winDrawLose(matrix: Record<string, number>): {
    homeWin: number;
    draw: number;
    awayWin: number;
  } {
    let homeWin = 0, draw = 0, awayWin = 0;
    for (const [score, p] of Object.entries(matrix)) {
      const [h, a] = score.split('-').map(Number);
      if (h > a) homeWin += p;
      else if (h === a) draw += p;
      else awayWin += p;
    }
    return { homeWin, draw, awayWin };
  }

  static overUnder25(matrix: Record<string, number>): {
    over: number;
    under: number;
  } {
    let over = 0, under = 0;
    for (const [score, p] of Object.entries(matrix)) {
      const [h, a] = score.split('-').map(Number);
      if (h + a > 2.5) over += p;
      else under += p;
    }
    return { over, under };
  }

  static bothTeamsScore(matrix: Record<string, number>): {
    yes: number;
    no: number;
  } {
    let yes = 0, no = 0;
    for (const [score, p] of Object.entries(matrix)) {
      const [h, a] = score.split('-').map(Number);
      if (h > 0 && a > 0) yes += p;
      else no += p;
    }
    return { yes, no };
  }

  static predict(lambdaHome: number, lambdaAway: number) {
    const matrix = this.scoreMatrix(lambdaHome, lambdaAway);
    const wdl = this.winDrawLose(matrix);
    const ou = this.overUnder25(matrix);
    const btts = this.bothTeamsScore(matrix);
    return {
      matrix,
      winDrawLose: wdl,
      overUnder25: ou,
      bothTeamsScore: btts,
      lambdaHome,
      lambdaAway,
    };
  }
}
