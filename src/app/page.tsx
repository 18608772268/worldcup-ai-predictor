import { MatchList } from '@/components/match/match-list';
import { prisma } from '@/lib/prisma';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  // 优先：今日比赛
  let matches = await prisma.match.findMany({
    where: { matchTime: { gte: today, lt: tomorrow } },
    include: { homeTeam: true, awayTeam: true, prediction: true },
    orderBy: { matchTime: 'asc' },
  });

  let pageTitle = '今日比赛预测';
  let pageDesc = 'AI + ELO + Poisson + Monte Carlo 综合分析';

  // 如果今日没有，显示接下来 3 天
  if (matches.length === 0) {
    const threeDaysLater = new Date(today);
    threeDaysLater.setDate(threeDaysLater.getDate() + 3);
    matches = await prisma.match.findMany({
      where: { matchTime: { gte: today, lt: threeDaysLater } },
      include: { homeTeam: true, awayTeam: true, prediction: true },
      orderBy: { matchTime: 'asc' },
      take: 12,
    });
    pageTitle = '即将开始的比赛';
    pageDesc = `未来 3 天内的 ${matches.length} 场比赛`;
  }

  const totalMatches = await prisma.match.count();
  const totalPredictions = await prisma.prediction.count();
  const totalTeams = await prisma.team.count();
  const totalNews = await prisma.newsItem.count();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">{pageTitle}</h1>
        <p className="text-slate-500 mt-1">{pageDesc}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard title="比赛总数" value={totalMatches} />
        <StatCard title="已生成预测" value={totalPredictions} />
        <StatCard title="球队数量" value={totalTeams} />
        <StatCard title="新闻数量" value={totalNews} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>预测模型</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div>✓ ELO 评分系统</div>
            <div>✓ Poisson 分布</div>
            <div>✓ Monte Carlo (100,000次)</div>
            <div>✓ Minimax M3 AI 分析</div>
            <div>✓ 风险与信心评分</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>数据来源</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div>📊 竞彩网 (sporttery.cn)</div>
            <div>📰 RSS 新闻 (FIFA, ESPN, BBC)</div>
            <div>🏆 48支世界杯参赛队</div>
            <div>⚽ 实时赔率 + 历史</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>自动任务</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div>🔄 每5分钟: 同步竞彩 + 重新预测</div>
            <div>📰 每15分钟: 同步新闻</div>
            <div>📈 实时: 赔率历史追踪</div>
            <div>🤖 实时: AI 重新分析</div>
          </CardContent>
        </Card>
      </div>

      <MatchList matches={matches} />
    </div>
  );
}

function StatCard({ title, value }: { title: string; value: number }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="text-sm text-slate-500">{title}</div>
        <div className="text-3xl font-bold text-slate-900 mt-1">{value.toLocaleString()}</div>
      </CardContent>
    </Card>
  );
}
