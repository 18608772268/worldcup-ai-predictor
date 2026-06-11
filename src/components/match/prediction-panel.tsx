import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { formatPercent } from '@/lib/utils';
import { riskBadge } from '@/utils/format';

export function PredictionPanel({ prediction }: { prediction: any }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>综合预测</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Stat label="主胜" value={prediction.finalHomeWin} />
          <Stat label="平局" value={prediction.finalDraw} />
          <Stat label="客胜" value={prediction.finalAwayWin} />
          <div className="text-center">
            <div className="text-xs text-slate-500">AI 预测</div>
            <div className="text-2xl font-bold text-green-600">{prediction.aiPredictedScore || '-'}</div>
            <div className="text-xs text-slate-500 mt-1">{prediction.aiPredictedResult || ''} · {prediction.aiHalfFull || ''}</div>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
          <Stat label="大球2.5" value={prediction.finalOver25} />
          <Stat label="小球2.5" value={prediction.finalUnder25} />
          <Stat label="双方进球" value={prediction.finalBothYes} />
          <div className="text-center">
            <div className="text-xs text-slate-500">预期比分</div>
            <div className="text-lg font-semibold">
              {prediction.finalHomeXG?.toFixed(2) || '0'} - {prediction.finalAwayXG?.toFixed(2) || '0'}
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 pt-4 border-t">
          <div>
            <div className="text-xs text-slate-500">风险评分</div>
            <div className="flex items-center gap-2 mt-1">
              <span className="font-mono font-bold">{prediction.riskScore?.toFixed(0) || '-'}</span>
              <Badge className={riskBadge(prediction.riskLevel)}>{prediction.riskLevel}</Badge>
            </div>
          </div>
          <div>
            <div className="text-xs text-slate-500">信心评分</div>
            <div className="flex items-center gap-2 mt-1">
              <span className="font-mono font-bold">{prediction.confidenceScore?.toFixed(0) || '-'}</span>
              <Badge variant="outline">{prediction.confidenceLevel}</Badge>
            </div>
          </div>
          <div>
            <div className="text-xs text-slate-500">模型一致性</div>
            <div className="mt-1">
              <div className="font-mono font-bold">{((prediction.modelAgreement || 0) * 100).toFixed(0)}%</div>
              <Progress value={(prediction.modelAgreement || 0) * 100} className="mt-1" />
            </div>
          </div>
          <div>
            <div className="text-xs text-slate-500">数据完整度</div>
            <div className="mt-1">
              <div className="font-mono font-bold">{((prediction.dataCompleteness || 0) * 100).toFixed(0)}%</div>
              <Progress value={(prediction.dataCompleteness || 0) * 100} className="mt-1" />
            </div>
          </div>
        </div>
        {prediction.aiConfidence != null && (
          <div className="mt-4 pt-4 border-t">
            <div className="text-xs text-slate-500 mb-1">AI 信心度</div>
            <div className="flex items-center gap-2">
              <Progress value={prediction.aiConfidence} className="flex-1" />
              <span className="font-mono font-bold text-sm">{prediction.aiConfidence.toFixed(0)}%</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function Stat({ label, value }: { label: string; value: number | null | undefined }) {
  return (
    <div className="text-center">
      <div className="text-xs text-slate-500">{label}</div>
      <div className="text-2xl font-bold mt-1">{formatPercent(value)}</div>
    </div>
  );
}
