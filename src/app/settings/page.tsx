import { prisma } from '@/lib/prisma';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
  const [settings, lastSyncs] = await Promise.all([
    prisma.setting.findMany(),
    prisma.syncLog.findMany({ orderBy: { startedAt: 'desc' }, take: 20 }),
  ]);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">系统设置</h1>

      <Card>
        <CardHeader>
          <CardTitle>系统配置</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {settings.map((s) => (
              <div key={s.key} className="flex justify-between text-sm border-b pb-2">
                <span className="text-slate-600">{s.key}</span>
                <span className="font-mono">{s.value}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>最近同步日志</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            {lastSyncs.map((l) => (
              <div key={l.id} className="flex justify-between items-center border-b pb-2">
                <div>
                  <span className="font-mono mr-2">{l.type}</span>
                  <span className={l.status === 'success' ? 'text-green-600' : 'text-red-600'}>
                    {l.status}
                  </span>
                </div>
                <div className="text-xs text-slate-500">
                  {l.recordsCount} 条 · {l.duration}ms · {new Date(l.startedAt).toLocaleString('zh-CN')}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
