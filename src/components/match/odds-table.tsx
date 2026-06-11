import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function OddsTable({ match }: { match: any }) {
  const rows = [
    { label: '胜平负', items: [
      { name: '胜', value: match.oddsWin },
      { name: '平', value: match.oddsDraw },
      { name: '负', value: match.oddsLose },
    ]},
    { label: '让球', items: [
      { name: '让胜', value: match.oddsHandicapWin },
      { name: '让平', value: match.oddsHandicapDraw },
      { name: '让负', value: match.oddsHandicapLose },
    ]},
    { label: '大小球', items: [
      { name: '大球', value: match.oddsOver },
      { name: '小球', value: match.oddsUnder },
    ]},
    { label: '双方进球', items: [
      { name: '是', value: match.oddsBothYes },
      { name: '否', value: match.oddsBothNo },
    ]},
  ];

  return (
    <Card>
      <CardHeader><CardTitle>赔率详情</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        {rows.map((r) => (
          <div key={r.label}>
            <div className="text-xs text-slate-500 mb-1">{r.label}</div>
            <div className="grid grid-cols-3 gap-2">
              {r.items.map((i) => (
                <div key={i.name} className="text-center p-2 bg-slate-50 rounded">
                  <div className="text-xs">{i.name}</div>
                  <div className="font-mono font-semibold">{i.value?.toFixed(2) || '-'}</div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
