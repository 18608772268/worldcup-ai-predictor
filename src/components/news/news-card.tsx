import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatDate } from '@/utils/date';

export function NewsCard({ news }: { news: any }) {
  return (
    <Card className="hover:shadow-lg transition-shadow h-full">
      <CardContent className="pt-6">
        <div className="flex justify-between items-start mb-2">
          <Badge variant="outline" className="text-xs">{news.category || 'general'}</Badge>
          <span className="text-xs text-slate-400">{formatDate(news.publishedAt)}</span>
        </div>
        <a href={news.url} target="_blank" rel="noreferrer" className="block font-semibold hover:text-green-600 mt-2">
          {news.title}
        </a>
        {news.summary && <p className="text-sm text-slate-500 mt-2 line-clamp-3">{news.summary}</p>}
        <div className="text-xs text-slate-400 mt-3 flex justify-between">
          <span>{news.source || ''}</span>
          {news.team && news.team.name && <span>· {news.team.name}</span>}
        </div>
      </CardContent>
    </Card>
  );
}
