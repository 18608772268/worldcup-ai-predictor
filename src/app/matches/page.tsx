import { prisma } from '@/lib/prisma';
import { MatchList } from '@/components/match/match-list';

export const dynamic = 'force-dynamic';

export default async function MatchesPage() {
  const matches = await prisma.match.findMany({
    include: { homeTeam: true, awayTeam: true, prediction: true },
    orderBy: { matchTime: 'desc' },
    take: 100,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">全部比赛</h1>
        <p className="text-slate-500 mt-1">最近100场比赛及预测</p>
      </div>
      <MatchList matches={matches} showLeague />
    </div>
  );
}
