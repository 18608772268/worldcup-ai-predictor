import { prisma } from '@/lib/prisma';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PlayerCard } from '@/components/player/player-card';
import { EloChart } from '@/components/chart/elo-chart';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { formatDate } from '@/utils/date';
import { formatPercent } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export default async function TeamDetailPage({ params }: { params: { id: string } }) {
  const team = await prisma.team.findUnique({
    where: { id: params.id },
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
      news: { orderBy: { publishedAt: 'desc' }, take: 5 },
    },
  });

  if (!team) return notFound();

  // 合并最近比赛
  const allMatches = [...(team.homeMatches || []), ...(team.awayMatches || [])]
    .filter((m) => m && m.homeTeam && m.awayTeam)
    .sort((a, b) => b.matchTime.getTime() - a.matchTime.getTime());

  // 即将到来的比赛
  const upcoming = allMatches.filter((m) => new Date(m.matchTime) > new Date()).slice(0, 5);
  const past = allMatches.filter((m) => new Date(m.matchTime) <= new Date()).slice(0, 5);

  // 历史战绩统计
  const history = team.teamHistory || [];
  const recentForm = history.slice(0, 5).map((h) => h.result);
  const wins = history.filter((h) => h.result === 'W').length;
  const draws = history.filter((h) => h.result === 'D').length;
  const losses = history.filter((h) => h.result === 'L').length;
  const totalGF = history.reduce((s, h) => s + h.goalsFor, 0);
  const totalGA = history.reduce((s, h) => s + h.goalsAgainst, 0);

  // ELO 趋势图数据
  const eloHistory = history
    .slice()
    .reverse()
    .map((h) => ({ matchDate: h.matchDate.toISOString(), eloAfter: h.eloAfter }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm text-slate-500">{team.country || ''} · FIFA 排名 #{team.fifaRanking || 'N/A'}</div>
          <h1 className="text-4xl font-bold mt-1">{team.name || '未知球队'}</h1>
          {team.nameEn && <div className="text-slate-500 mt-1">{team.nameEn}</div>}
        </div>
        <div className="text-right">
          <div className="text-sm text-slate-500">ELO 评分</div>
          <div className="text-4xl font-bold text-green-600">{(team.eloRating || 1500).toFixed(0)}</div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <StatCard title="胜率" value={formatPercent(team.winRate || 0)} />
        <StatCard title="场均进球" value={(team.avgGoalsFor || 0).toFixed(2)} />
        <StatCard title="场均失球" value={(team.avgGoalsAgainst || 0).toFixed(2)} />
        <StatCard title="近期战绩" value={`${wins}胜${draws}平${losses}负`} />
        <StatCard title="近场净胜" value={`${totalGF - totalGA >= 0 ? '+' : ''}${totalGF - totalGA}`} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>球队信息</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between"><span>国家</span><span>{team.country || '-'}</span></div>
            {team.countryCode && <div className="flex justify-between"><span>国家代码</span><span className="font-mono">{team.countryCode}</span></div>}
            {team.coachName && <div className="flex justify-between"><span>主教练</span><span>{team.coachName}</span></div>}
            {team.homeStadium && <div className="flex justify-between"><span>主场</span><span>{team.homeStadium}</span></div>}
            {team.founded && <div className="flex justify-between"><span>成立年份</span><span>{team.founded}</span></div>}
            <div className="flex justify-between"><span>总比赛场数</span><span className="font-mono">{team.matchesPlayed || 0}</span></div>
            <div className="flex justify-between"><span>胜/平/负</span><span className="font-mono">{team.wins || 0} / {team.draws || 0} / {team.losses || 0}</span></div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>近期形态</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2 mb-3">
              {recentForm.length > 0 ? (
                recentForm.map((r, i) => (
                  <div
                    key={i}
                    className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white ${
                      r === 'W' ? 'bg-green-500' : r === 'D' ? 'bg-yellow-500' : 'bg-red-500'
                    }`}
                  >
                    {r === 'W' ? '胜' : r === 'D' ? '平' : '负'}
                  </div>
                ))
              ) : (
                <div className="text-sm text-slate-500">暂无历史数据</div>
              )}
            </div>
            <div className="text-xs text-slate-500 mt-2">
              {history.length > 0
                ? `近 ${history.length} 场：${wins}胜 ${draws}平 ${losses}负，${totalGF}进球 ${totalGA}失球`
                : '等待历史数据'}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>ELO 评分趋势</CardTitle>
          </CardHeader>
          <CardContent>
            {eloHistory.length > 0 ? (
              <EloChart history={eloHistory} />
            ) : (
              <div className="text-sm text-slate-500 h-32 flex items-center justify-center">暂无 ELO 趋势</div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>即将到来的比赛</CardTitle>
          </CardHeader>
          <CardContent>
            {upcoming.length === 0 ? (
              <div className="text-slate-500 text-sm">暂无即将到来的比赛</div>
            ) : (
              <div className="space-y-2">
                {upcoming.map((m) => (
                  <Link
                    key={m.id}
                    href={`/matches/${m.id}`}
                    className="block p-3 border rounded hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <div className="font-medium">
                          {m.homeTeamId === team.id ? '主' : '客'} {m.homeTeam.name} vs {m.awayTeam.name}
                        </div>
                        <div className="text-xs text-slate-500 mt-1">
                          {m.league} · {formatDate(m.matchTime)}
                        </div>
                      </div>
                      {m.prediction && (
                        <Badge className="bg-green-100 text-green-700">
                          预测 {m.prediction.aiPredictedScore}
                        </Badge>
                      )}
                    </div>
                    {m.oddsWin && (
                      <div className="text-xs text-slate-500 mt-2 font-mono">
                        赔率: {m.oddsWin} / {m.oddsDraw} / {m.oddsLose}
                      </div>
                    )}
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>已结束的比赛</CardTitle>
          </CardHeader>
          <CardContent>
            {history.length === 0 ? (
              <div className="text-center py-6">
                <div className="text-slate-500 text-sm mb-2">暂无近期比赛数据</div>
                <div className="text-xs text-slate-400">
                  历史战绩需要付费体育数据 API（如 api-football.com）才能获取真实数据
                </div>
                <div className="text-xs text-slate-400 mt-1">
                  未来比赛信息见左侧"即将到来的比赛"
                </div>
              </div>
            ) : (
              <div className="space-y-2 text-sm max-h-96 overflow-y-auto">
                {history.map((h) => (
                  <div key={h.id} className="flex items-center justify-between border-b last:border-0 pb-2">
                    <div className="flex items-center gap-2">
                      <span
                        className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold ${
                          h.result === 'W' ? 'bg-green-500' : h.result === 'D' ? 'bg-yellow-500' : 'bg-red-500'
                        }`}
                      >
                        {h.result === 'W' ? '胜' : h.result === 'D' ? '平' : '负'}
                      </span>
                      <span>
                        {h.isHome ? '主' : '客'} vs {h.opponent}
                      </span>
                    </div>
                    <div className="text-right">
                      <div className="font-mono font-bold">{h.goalsFor} - {h.goalsAgainst}</div>
                      <div className="text-xs text-slate-500">
                        {h.competition} · {formatDate(h.matchDate)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {team.players.length > 0 && (
        <div>
          <h2 className="text-2xl font-bold mb-4">阵容名单 ({team.players.length} 人)</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {team.players.slice(0, 12).map((p) => (
              <PlayerCard key={p.id} player={{ ...p, team }} />
            ))}
          </div>
        </div>
      )}

      {team.news.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>相关新闻</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {team.news.map((n) => (
              <div key={n.id} className="border-b last:border-0 pb-3">
                <a href={n.url} target="_blank" rel="noreferrer" className="font-medium hover:text-green-600">
                  {n.title}
                </a>
                {n.summary && <p className="text-sm text-slate-500 mt-1">{n.summary}</p>}
                <div className="text-xs text-slate-400 mt-1">
                  {n.source || ''} · {formatDate(n.publishedAt)}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function StatCard({ title, value }: { title: string; value: string }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="text-sm text-slate-500">{title}</div>
        <div className="text-xl font-bold text-slate-900 mt-1">{value}</div>
      </CardContent>
    </Card>
  );
}
