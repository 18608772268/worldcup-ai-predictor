import { prisma } from '@/lib/prisma';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { formatDate } from '@/utils/date';
import { formatPercent } from '@/lib/utils';
import { riskBadge } from '@/utils/format';

export const dynamic = 'force-dynamic';

export default async function PredictionsPage() {
  // 预测中心：只显示**未来**的预测（即将进行的比赛）
  const predictions = await prisma.prediction.findMany({
    where: {
      match: { matchTime: { gte: new Date() } },
    },
    include: { match: { include: { homeTeam: true, awayTeam: true } } },
    orderBy: { computedAt: 'desc' },
    take: 50,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">预测中心</h1>
        <p className="text-slate-500 mt-1">所有 AI 生成的预测（未来比赛）</p>
      </div>

      {predictions.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-slate-500">
            暂无未来比赛预测。运行 <code className="bg-slate-100 px-2 py-1 rounded">npm run crawl</code> 同步数据。
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {predictions.map((p) => (
            <Card key={p.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="text-xs text-slate-500">{formatDate(p.match.matchTime)} · {p.match.league}</div>
                <CardTitle className="text-base">
                  <Link href={`/matches/${p.match.id}`} className="hover:text-green-600">
                    {p.match.homeTeam.name} vs {p.match.awayTeam.name}
                  </Link>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-600 text-center my-3">
                  {p.aiPredictedScore || '0-0'}
                </div>
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span>主胜</span>
                    <span className="font-mono">{formatPercent(p.finalHomeWin)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>平局</span>
                    <span className="font-mono">{formatPercent(p.finalDraw)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>客胜</span>
                    <span className="font-mono">{formatPercent(p.finalAwayWin)}</span>
                  </div>
                </div>
                <div className="flex justify-between mt-3 pt-3 border-t">
                  <Badge className={riskBadge(p.riskLevel || 'medium')}>
                    风险: {p.riskScore?.toFixed(0) || '-'}
                  </Badge>
                  <Badge variant="outline">
                    信心: {p.confidenceScore?.toFixed(0) || '-'}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
