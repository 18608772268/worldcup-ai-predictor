import { prisma } from '@/lib/prisma';

export class NewsService {
  static async listNews(opts: { page?: number; pageSize?: number; teamId?: string; category?: string } = {}) {
    const { page = 1, pageSize = 30, teamId, category } = opts;
    const where: any = {};
    if (teamId) where.teamId = teamId;
    if (category) where.category = category;
    const [items, total] = await Promise.all([
      prisma.newsItem.findMany({
        where,
        include: { team: true, player: true },
        orderBy: { publishedAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.newsItem.count({ where }),
    ]);
    return { items, total, page, pageSize };
  }

  static async getLatestNews(limit = 20) {
    return prisma.newsItem.findMany({
      include: { team: true },
      orderBy: { publishedAt: 'desc' },
      take: limit,
    });
  }
}
