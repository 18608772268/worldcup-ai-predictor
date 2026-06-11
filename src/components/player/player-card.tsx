import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';

export function PlayerCard({ player }: { player: any }) {
  if (!player) return null;
  return (
    <Link href={`/players/${encodeURIComponent(player.id)}`}>
      <Card className="hover:shadow-lg transition-shadow cursor-pointer">
        <CardContent className="pt-6">
          <div className="flex justify-between items-start mb-2">
            <div>
              <div className="font-semibold">{player.name || '未知球员'}</div>
              <div className="text-xs text-slate-500">{player.team?.name || '无球队'}</div>
            </div>
            <Badge variant="outline">{player.position || '-'}</Badge>
          </div>
          <div className="text-xs space-y-1 mt-3">
            <div className="flex justify-between"><span>年龄</span><span className="font-mono">{player.age || '-'}</span></div>
            <div className="flex justify-between"><span>俱乐部</span><span>{player.club || '-'}</span></div>
            <div className="flex justify-between"><span>进球</span><span className="font-mono">{player.goals || 0}</span></div>
            <div className="flex justify-between"><span>助攻</span><span className="font-mono">{player.assists || 0}</span></div>
            <div className="flex justify-between"><span>状态</span><span className="font-mono">{(player.formRating || 6.5).toFixed(1)}</span></div>
          </div>
          {player.injuryStatus && player.injuryStatus !== 'healthy' && (
            <Badge className="mt-2 bg-red-100 text-red-700">{player.injuryStatus === 'injured' ? '伤' : player.injuryStatus === 'doubtful' ? '存疑' : player.injuryStatus}</Badge>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
