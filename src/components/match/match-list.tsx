import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatDate } from '@/utils/date';
import { formatPercent } from '@/lib/utils';
import { riskBadge } from '@/utils/format';

export function MatchList({ matches, showLeague = false }: { matches: any[]; showLeague?: boolean }) {
  if (matches.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-slate-500">
          暂无比赛数据。请运行 <code className="bg-slate-100 px-2 py-1 rounded">npm run crawl</code> 同步数据。
        </CardContent>
      </Card>
    );
  }
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {matches.map((m) => (
        <Link key={m.id} href={`/matches/${m.id}`}>
          <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
            <CardContent className="pt-6">
              {showLeague && (
                <div className="text-xs text-slate-500 mb-1">{m.league || ''}</div>
              )}
              <div className="text-xs text-slate-500">{formatDate(m.matchTime)}</div>
              <div className="flex items-center justify-between mt-3">
                <div className="flex-1 text-right pr-3 font-medium">{m.homeTeam?.name || ''}</div>
                <div className="text-2xl font-bold text-green-600 mx-2">
                  {m.prediction?.aiPredictedScore || '-'}
                </div>
                <div className="flex-1 text-left pl-3 font-medium">{m.awayTeam?.name || ''}</div>
              </div>
              {m.prediction && (
                <>
                  <div className="grid grid-cols-3 gap-1 mt-4 text-xs">
                    <div className="text-center p-1 rounded bg-slate-50">
                      <div className="text-slate-500">主胜</div>
                      <div className="font-mono font-semibold">{formatPercent(m.prediction.finalHomeWin)}</div>
                    </div>
                    <div className="text-center p-1 rounded bg-slate-50">
                      <div className="text-slate-500">平</div>
                      <div className="font-mono font-semibold">{formatPercent(m.prediction.finalDraw)}</div>
                    </div>
                    <div className="text-center p-1 rounded bg-slate-50">
                      <div className="text-slate-500">客胜</div>
                      <div className="font-mono font-semibold">{formatPercent(m.prediction.finalAwayWin)}</div>
                    </div>
                  </div>
                  <div className="flex justify-between mt-3">
                    <Badge className={riskBadge(m.prediction.riskLevel)}>
                      风险 {m.prediction.riskScore?.toFixed(0)}
                    </Badge>
                    <Badge variant="outline">信心 {m.prediction.confidenceScore?.toFixed(0)}</Badge>
                  </div>
                </>
              )}
              {!m.prediction && (
                <Badge variant="secondary" className="mt-3">未生成预测</Badge>
              )}
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
}
