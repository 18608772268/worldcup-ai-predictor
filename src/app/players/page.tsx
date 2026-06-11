import { prisma } from '@/lib/prisma';
import { PlayerCard } from '@/components/player/player-card';

export const dynamic = 'force-dynamic';

export default async function PlayersPage() {
  const players = await prisma.player.findMany({
    include: { team: true },
    orderBy: { formRating: 'desc' },
    take: 100,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">球员中心</h1>
        <p className="text-slate-500 mt-1">所有参赛队主力球员</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {players.map((p) => (
          <PlayerCard key={p.id} player={p} />
        ))}
      </div>
    </div>
  );
}
