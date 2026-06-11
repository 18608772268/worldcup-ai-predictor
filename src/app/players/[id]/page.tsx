import { prisma } from '@/lib/prisma';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { notFound } from 'next/navigation';
import { formatDate } from '@/utils/date';

export const dynamic = 'force-dynamic';

export default async function PlayerDetailPage({ params }: { params: { id: string } }) {
  // URL 解码
  const id = decodeURIComponent(params.id);

  // 尝试查找球员
  let player = await prisma.player.findUnique({
    where: { id },
    include: {
      team: true,
      playerHistory: { orderBy: { matchDate: 'desc' }, take: 20 },
      news: { orderBy: { publishedAt: 'desc' }, take: 5 },
    },
  });

  // 如果按 ID 找不到，尝试按 name + teamId 查找
  if (!player) {
    const allPlayers = await prisma.player.findMany({
      include: { team: true },
    });
    player = allPlayers.find((p) => p.id === params.id) as any || null;
  }

  if (!player) return notFound();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm text-slate-500">{player.team?.name || '无球队'} · {player.position}</div>
          <h1 className="text-4xl font-bold mt-1">{player.name}</h1>
          {player.nameEn && <div className="text-slate-500 mt-1">{player.nameEn}</div>}
        </div>
        <div className="text-right">
          <div className="text-sm text-slate-500">状态评分</div>
          <div className="text-4xl font-bold text-green-600">{(player.formRating || 6.5).toFixed(1)}</div>
        </div>
      </div>

      {player.injuryStatus && player.injuryStatus !== 'healthy' && (
        <div className="bg-red-50 border border-red-200 p-4 rounded-lg">
          <div className="font-semibold text-red-700">⚠️ 球员状态异常</div>
          <div className="text-sm text-red-600 mt-1">
            状态: {player.injuryStatus === 'injured' ? '伤病' : player.injuryStatus === 'doubtful' ? '存疑' : player.injuryStatus === 'suspended' ? '停赛' : player.injuryStatus}
            {player.injuryNote && <span> · {player.injuryNote}</span>}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard title="进球" value={(player.goals || 0).toString()} />
        <StatCard title="助攻" value={(player.assists || 0).toString()} />
        <StatCard title="出场" value={(player.appearances || 0).toString()} />
        <StatCard title="出场时间" value={`${player.minutesPlayed || 0} 分钟`} />
      </div>

      {player.recentFormSummary && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>近期表现（来自 Serper 真实数据）</span>
              {player.formUpdatedAt && (
                <span className="text-xs text-slate-400 font-normal">
                  更新于 {formatDate(player.formUpdatedAt)}
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm leading-relaxed text-slate-700">
              {player.recentFormSummary.split(' | ').map((s, i) => (
                <div key={i} className="border-l-2 border-green-500 pl-3 py-1 mb-2">• {s}</div>
              ))}
            </div>
            {player.formSourceUrl && (
              <div className="text-xs text-slate-400 mt-3">
                来源：<a href={player.formSourceUrl} target="_blank" rel="noreferrer" className="hover:text-green-600 underline">{player.formSourceUrl}</a>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>球员信息</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {player.age && <div className="flex justify-between"><span>年龄</span><span className="font-mono">{player.age}</span></div>}
            {player.nationality && <div className="flex justify-between"><span>国籍</span><span>{player.nationality}</span></div>}
            {player.club && <div className="flex justify-between"><span>俱乐部</span><span>{player.club}</span></div>}
            {player.jerseyNumber && <div className="flex justify-between"><span>球衣号码</span><span className="font-mono">{player.jerseyNumber}</span></div>}
            {player.height && <div className="flex justify-between"><span>身高</span><span className="font-mono">{player.height}cm</span></div>}
            {player.weight && <div className="flex justify-between"><span>体重</span><span className="font-mono">{player.weight}kg</span></div>}
            {player.preferredFoot && <div className="flex justify-between"><span>惯用脚</span><span>{player.preferredFoot === 'right' ? '右脚' : player.preferredFoot === 'left' ? '左脚' : '双脚'}</span></div>}
            <div className="flex justify-between"><span>黄牌</span><span className="font-mono">{player.yellowCards || 0}</span></div>
            <div className="flex justify-between"><span>红牌</span><span className="font-mono">{player.redCards || 0}</span></div>
            <div className="flex justify-between"><span>赛季评分</span><span className="font-mono">{(player.seasonRating || 0).toFixed(1)}</span></div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>近期表现</CardTitle>
          </CardHeader>
          <CardContent>
            {player.playerHistory.length === 0 ? (
              <div className="text-slate-500 text-sm">暂无历史数据</div>
            ) : (
              <div className="space-y-2 text-sm max-h-96 overflow-y-auto">
                {player.playerHistory.slice(0, 10).map((h) => (
                  <div key={h.id} className="flex justify-between border-b pb-1">
                    <span>{h.opponent || h.competition || '比赛'}</span>
                    <span className="text-xs text-slate-500">
                      {formatDate(h.matchDate)} · ⚽{h.goals} 🅰{h.assists} {h.rating ? `· ${h.rating.toFixed(1)}分` : ''}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {player.news.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>相关新闻</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {player.news.map((n) => (
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
