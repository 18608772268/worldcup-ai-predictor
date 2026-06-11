import { prisma } from '@/lib/prisma';

export class PredictionService {
  static async listPredictions(opts: { page?: number; pageSize?: number } = {}) {
    const { page = 1, pageSize = 30 } = opts;
    const [items, total] = await Promise.all([
      prisma.prediction.findMany({
        include: { match: { include: { homeTeam: true, awayTeam: true } } },
        orderBy: { computedAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.prediction.count(),
    ]);
    return { items, total, page, pageSize };
  }

  static async getPredictionByMatchId(matchId: string) {
    return prisma.prediction.findUnique({
      where: { matchId },
      include: { match: { include: { homeTeam: true, awayTeam: true } } },
    });
  }
}
