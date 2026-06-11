import { prisma } from '@/lib/prisma';

export class TeamService {
  static async listTeams(opts: { page?: number; pageSize?: number; search?: string } = {}) {
    const { page = 1, pageSize = 30, search } = opts;
    const where: any = {};
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { nameEn: { contains: search } },
        { country: { contains: search } },
      ];
    }
    const [items, total] = await Promise.all([
      prisma.team.findMany({
        where,
        include: { players: { take: 5 } },
        orderBy: { fifaRanking: 'asc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.team.count({ where }),
    ]);
    return { items, total, page, pageSize };
  }

  static async getTeamDetail(id: string) {
    return prisma.team.findUnique({
      where: { id },
      include: {
        players: { orderBy: { formRating: 'desc' } },
        homeMatches: {
          orderBy: { matchTime: 'desc' },
          take: 10,
          include: { awayTeam: true, prediction: true },
        },
        awayMatches: {
          orderBy: { matchTime: 'desc' },
          take: 10,
          include: { homeTeam: true, prediction: true },
        },
        teamHistory: { orderBy: { matchDate: 'desc' }, take: 20 },
        news: { orderBy: { publishedAt: 'desc' }, take: 20 },
      },
    });
  }

  static async updateElo(teamId: string, newElo: number) {
    return prisma.team.update({
      where: { id: teamId },
      data: { eloRating: newElo },
    });
  }
}
