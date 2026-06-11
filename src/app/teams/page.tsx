import { prisma } from '@/lib/prisma';
import { TeamCard } from '@/components/team/team-card';

export const dynamic = 'force-dynamic';

export default async function TeamsPage() {
  const teams = await prisma.team.findMany({
    orderBy: { fifaRanking: 'asc' },
    take: 100,
    include: { players: { take: 3, orderBy: { formRating: 'desc' } } },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">球队中心</h1>
        <p className="text-slate-500 mt-1">48支世界杯参赛队数据</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {teams.map((t) => (
          <TeamCard key={t.id} team={t} />
        ))}
      </div>
    </div>
  );
}
