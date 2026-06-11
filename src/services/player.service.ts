import { prisma } from '@/lib/prisma';

export class PlayerService {
  static async listPlayers(opts: { page?: number; pageSize?: number; teamId?: string; position?: string; search?: string } = {}) {
    const { page = 1, pageSize = 30, teamId, position, search } = opts;
    const where: any = {};
    if (teamId) where.teamId = teamId;
    if (position) where.position = position;
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { nameEn: { contains: search } },
      ];
    }
    const [items, total] = await Promise.all([
      prisma.player.findMany({
        where,
        include: { team: true },
        orderBy: { formRating: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.player.count({ where }),
    ]);
    return { items, total, page, pageSize };
  }

  static async getPlayerDetail(id: string) {
    return prisma.player.findUnique({
      where: { id },
      include: {
        team: true,
        playerHistory: { orderBy: { matchDate: 'desc' }, take: 30 },
        news: { orderBy: { publishedAt: 'desc' }, take: 20 },
      },
    });
  }

  static async getInjuredPlayers() {
    return prisma.player.findMany({
      where: { injuryStatus: { in: ['injured', 'doubtful'] } },
      include: { team: true },
      orderBy: { updatedAt: 'desc' },
    });
  }
}
