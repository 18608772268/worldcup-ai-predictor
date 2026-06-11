import { prisma } from '@/lib/prisma';
import { NewsCard } from '@/components/news/news-card';

export const dynamic = 'force-dynamic';

export default async function NewsPage() {
  const news = await prisma.newsItem.findMany({
    include: { team: true, player: true },
    orderBy: { publishedAt: 'desc' },
    take: 100,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">新闻中心</h1>
        <p className="text-slate-500 mt-1">全球足球新闻聚合</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {news.map((n) => (
          <NewsCard key={n.id} news={n} />
        ))}
      </div>
    </div>
  );
}
