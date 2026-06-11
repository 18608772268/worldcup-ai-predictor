import { prisma } from '@/lib/prisma';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ProbabilityChart } from '@/components/chart/probability-chart';
import { MonteCarloChart } from '@/components/chart/monte-carlo-chart';
import { notFound } from 'next/navigation';
import { formatDate } from '@/utils/date';
import { safeJsonParse, formatPercent } from '@/lib/utils';

export const dynamic = 'force-dynamic';

interface TopScore { score: string; probability: number; reasoning: string; }

export default async function MatchDetailPage({ params }: { params: { id: string } }) {
  const match = await prisma.match.findUnique({
    where: { id: params.id },
    include: {
      homeTeam: { include: { players: { take: 5, orderBy: { formRating: 'desc' } } } },
      awayTeam: { include: { players: { take: 5, orderBy: { formRating: 'desc' } } } },
      prediction: true,
      matchStats: true,
      news: { orderBy: { publishedAt: 'desc' }, take: 5 },
      oddsHistory: { orderBy: { recordedAt: 'desc' }, take: 30 },
    },
  });

  if (!match) return notFound();

  const p = match.prediction;
  const topScores = safeJsonParse<TopScore[]>(p?.topScoresJson, []);
  const halfFullAll = safeJsonParse<Record<string, number>>(p?.halfFullAllJson, {});
  const teamAnalysis = safeJsonParse<any>(p?.teamAnalysisJson, { home: null, away: null });
  const riskBreakdown = safeJsonParse<Record<string, number>>(p?.riskBreakdownJson, {});

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm text-slate-500">{match.league} · {formatDate(match.matchTime)}</div>
          <h1 className="text-3xl font-bold mt-1">
            {match.homeTeam.name} vs {match.awayTeam.name}
          </h1>
        </div>
        {p && (
          <div className="text-right">
            <div className="text-sm text-slate-500">AI 预测比分</div>
            <div className="text-3xl font-bold text-green-600">{p.aiPredictedScore || '0-0'}</div>
            {p.halfFullPred && <div className="text-xs text-slate-500 mt-1">半全场: {p.halfFullPred}</div>}
          </div>
        )}
      </div>

      {/* 综合预测面板 */}
      {p && (
        <Card>
          <CardHeader>
            <CardTitle>综合预测</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Stat label="主胜" value={p.finalHomeWin || 0} />
              <Stat label="平局" value={p.finalDraw || 0} />
              <Stat label="客胜" value={p.finalAwayWin || 0} />
              <div className="text-center">
                <div className="text-xs text-slate-500">AI 信心度</div>
                <div className="text-2xl font-bold text-green-600">{p.aiConfidence?.toFixed(0) || '-'}%</div>
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
              <Stat label="大球2.5" value={p.finalOver25 || 0} />
              <Stat label="小球2.5" value={p.finalUnder25 || 0} />
              <Stat label="双方进球" value={p.finalBothYes || 0} />
              <div className="text-center">
                <div className="text-xs text-slate-500">预期比分</div>
                <div className="text-lg font-semibold">
                  {(p.finalHomeXG || 0).toFixed(2)} - {(p.finalAwayXG || 0).toFixed(2)}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 比分预测（多个）+ 半全场预测 */}
      {p && topScores.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>📊 比分预测（前 3 名）</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {topScores.map((s, i) => (
                  <div key={i} className="border rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <Badge variant="outline" className="text-base px-3 py-1">#{i + 1}</Badge>
                        <span className="text-3xl font-bold text-green-600">{s.score}</span>
                        <span className="text-sm text-slate-500">概率 {(s.probability * 100).toFixed(1)}%</span>
                      </div>
                      <Progress value={s.probability * 100} className="w-32" />
                    </div>
                    <p className="text-sm text-slate-600 mt-2">{s.reasoning}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>⚽ 半全场预测</CardTitle>
            </CardHeader>
            <CardContent>
              {p.halfFullPred && (
                <div className="text-center mb-4">
                  <div className="text-3xl font-bold text-green-600">{p.halfFullPred}</div>
                  <div className="text-sm text-slate-500 mt-1">概率 {((p.halfFullProb || 0) * 100).toFixed(1)}%</div>
                </div>
              )}
              <div className="space-y-1 text-xs">
                {Object.entries(halfFullAll).sort((a, b) => b[1] - a[1]).map(([k, v]) => (
                  <div key={k} className="flex justify-between">
                    <span>{k}</span>
                    <span className="font-mono">{(v * 100).toFixed(1)}%</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 球队情况分析 */}
      {teamAnalysis && (teamAnalysis.home || teamAnalysis.away) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {teamAnalysis.home && <TeamAnalysisCard team={teamAnalysis.home} isHome={true} />}
          {teamAnalysis.away && <TeamAnalysisCard team={teamAnalysis.away} isHome={false} />}
        </div>
      )}

      {/* 详细文字分析 */}
      {p?.narrative && (
        <Card>
          <CardHeader>
            <CardTitle>📝 AI 深度分析</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="text-sm leading-relaxed whitespace-pre-wrap font-sans">{p.narrative}</pre>
          </CardContent>
        </Card>
      )}

      {/* 风险与信心 */}
      {p && (
        <Card>
          <CardHeader>
            <CardTitle>⚖️ 风险与信心评分</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <div className="text-xs text-slate-500 mb-1">风险评分</div>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-2xl">{(p.riskScore || 0).toFixed(1)}</span>
                  <Badge variant={p.riskLevel === 'low' ? 'default' : p.riskLevel === 'medium' ? 'secondary' : 'destructive'}>
                    {p.riskLevel === 'low' ? '低' : p.riskLevel === 'medium' ? '中' : '高'}
                  </Badge>
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-500 mb-1">信心评分</div>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-2xl">{(p.confidenceScore || 0).toFixed(0)}</span>
                  <Badge variant="outline">
                    {p.confidenceLevel === 'low' ? '低' : p.confidenceLevel === 'medium' ? '中' : '高'}
                  </Badge>
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-500 mb-1">模型一致性</div>
                <div className="font-mono font-bold text-2xl">{((p.modelAgreement || 0) * 100).toFixed(0)}%</div>
                <Progress value={(p.modelAgreement || 0) * 100} className="mt-1" />
              </div>
              <div>
                <div className="text-xs text-slate-500 mb-1">数据完整度</div>
                <div className="font-mono font-bold text-2xl">{((p.dataCompleteness || 0) * 100).toFixed(0)}%</div>
                <Progress value={(p.dataCompleteness || 0) * 100} className="mt-1" />
              </div>
            </div>
            {Object.keys(riskBreakdown).length > 0 && (
              <div className="mt-4 pt-4 border-t">
                <div className="text-xs text-slate-500 mb-2">风险评分细分</div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs">
                  {Object.entries(riskBreakdown).map(([k, v]) => (
                    <div key={k} className="flex justify-between border rounded p-2">
                      <span className="text-slate-600">{k}</span>
                      <span className={`font-mono ${v > 0 ? 'text-red-600' : 'text-green-600'}`}>
                        {v > 0 ? '+' : ''}{v.toFixed(1)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* 赔率 */}
      <Card>
        <CardHeader>
          <CardTitle>📊 当前赔率（来自竞彩网）</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <OddsRow label="胜" value={match.oddsWin} />
          <OddsRow label="平" value={match.oddsDraw} />
          <OddsRow label="负" value={match.oddsLose} />
          {match.handicapLine != null && (
            <div className="border-t pt-2 mt-2">
              <div className="text-xs text-slate-500 mb-1">让球 {match.handicapLine > 0 ? `+${match.handicapLine}` : match.handicapLine}</div>
              <div className="grid grid-cols-3 gap-2">
                <OddsRow label="让胜" value={match.oddsHandicapWin} />
                <OddsRow label="让平" value={match.oddsHandicapDraw} />
                <OddsRow label="让负" value={match.oddsHandicapLose} />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 三大模型 */}
      {p && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <ModelCard title="ELO 模型" home={p.eloHomeWin} draw={p.eloDraw} away={p.eloAwayWin} />
          <ModelCard title="Poisson 模型" home={p.poissonHomeWin} draw={p.poissonDraw} away={p.poissonAwayWin} />
          <ModelCard title="Monte Carlo (10万次)" home={p.mcHomeWin} draw={p.mcDraw} away={p.mcAwayWin} />
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="text-center">
      <div className="text-xs text-slate-500">{label}</div>
      <div className="text-2xl font-bold mt-1">{formatPercent(value)}</div>
    </div>
  );
}

function OddsRow({ label, value }: { label: string; value: number | null | undefined }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-sm text-slate-600">{label}</span>
      <span className="font-mono font-semibold">{value?.toFixed(2) || '-'}</span>
    </div>
  );
}

function ModelCard({ title, home, draw, away }: { title: string; home: number | null; draw: number | null; away: number | null }) {
  return (
    <Card>
      <CardHeader><CardTitle className="text-sm">{title}</CardTitle></CardHeader>
      <CardContent className="space-y-2 text-sm">
        <Bar label="主胜" value={home} />
        <Bar label="平" value={draw} />
        <Bar label="客胜" value={away} />
      </CardContent>
    </Card>
  );
}

function Bar({ label, value }: { label: string; value: number | null | undefined }) {
  const v = (value || 0) * 100;
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span>{label}</span>
        <span className="font-mono">{v.toFixed(1)}%</span>
      </div>
      <Progress value={v} />
    </div>
  );
}

function TeamAnalysisCard({ team, isHome }: { team: any; isHome: boolean }) {
  if (!team) return null;
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>{isHome ? '🏠' : '✈️'} {team.name}</span>
          <Badge>信心 {team.confidence}%</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-xs space-y-2">
          <div className="grid grid-cols-3 gap-2 text-center">
            <div>
              <div className="text-slate-500">ELO</div>
              <div className="font-mono font-semibold">{team.elo?.toFixed(0)}</div>
            </div>
            <div>
              <div className="text-slate-500">胜率</div>
              <div className="font-mono font-semibold">{((team.winRate || 0) * 100).toFixed(0)}%</div>
            </div>
            <div>
              <div className="text-slate-500">近 5 场</div>
              <div className="font-mono font-semibold">{team.recentForm || '-'}</div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 text-center mt-2">
            <div>
              <div className="text-slate-500">场均进</div>
              <div className="font-mono">{team.recentGoalsFor?.toFixed(1)}</div>
            </div>
            <div>
              <div className="text-slate-500">场均失</div>
              <div className="font-mono">{team.recentGoalsAgainst?.toFixed(1)}</div>
            </div>
          </div>
          {team.topPlayers && team.topPlayers.length > 0 && (
            <div>
              <div className="text-slate-500 mb-1">核心球员</div>
              <div className="flex flex-wrap gap-1">
                {team.topPlayers.map((p: string) => <Badge key={p} variant="secondary" className="text-xs">{p}</Badge>)}
              </div>
            </div>
          )}
          {team.injuries && team.injuries.length > 0 && (
            <div>
              <div className="text-slate-500 mb-1">⚠️ 伤停</div>
              <div className="flex flex-wrap gap-1">
                {team.injuries.map((p: string) => <Badge key={p} className="text-xs bg-red-100 text-red-700">{p}</Badge>)}
              </div>
            </div>
          )}
          {team.strengths && team.strengths.length > 0 && (
            <div>
              <div className="text-slate-500 mb-1">✓ 优势</div>
              <ul className="text-xs space-y-0.5">
                {team.strengths.map((s: string, i: number) => <li key={i} className="text-green-700">• {s}</li>)}
              </ul>
            </div>
          )}
          {team.weaknesses && team.weaknesses.length > 0 && (
            <div>
              <div className="text-slate-500 mb-1">✗ 隐患</div>
              <ul className="text-xs space-y-0.5">
                {team.weaknesses.map((s: string, i: number) => <li key={i} className="text-red-600">• {s}</li>)}
              </ul>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
