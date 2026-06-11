import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export function TeamCard({ team }: { team: any }) {
  if (!team) return null;
  return (
    <Link href={`/teams/${team.id}`}>
      <Card className="hover:shadow-lg transition-shadow h-full cursor-pointer">
        <CardHeader className="pb-3">
          <div className="flex justify-between items-start">
            <CardTitle className="text-base">{team.name || '未知球队'}</CardTitle>
            {team.fifaRanking && <Badge variant="secondary">#{team.fifaRanking}</Badge>}
          </div>
          <div className="text-xs text-slate-500">{team.country || ''}</div>
        </CardHeader>
        <CardContent className="text-xs space-y-1">
          <div className="flex justify-between"><span>ELO</span><span className="font-mono">{(team.eloRating || 1500).toFixed(0)}</span></div>
          <div className="flex justify-between"><span>胜率</span><span className="font-mono">{((team.winRate || 0) * 100).toFixed(1)}%</span></div>
          <div className="flex justify-between"><span>场均进</span><span className="font-mono">{(team.avgGoalsFor || 0).toFixed(2)}</span></div>
          <div className="flex justify-between"><span>场均失</span><span className="font-mono">{(team.avgGoalsAgainst || 0).toFixed(2)}</span></div>
          <div className="flex justify-between"><span>战绩</span><span className="font-mono">{team.wins || 0}/{team.draws || 0}/{team.losses || 0}</span></div>
        </CardContent>
      </Card>
    </Link>
  );
}
