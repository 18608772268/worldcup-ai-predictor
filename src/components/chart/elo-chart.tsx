'use client';
import dynamic from 'next/dynamic';
import { useMemo } from 'react';

const ReactECharts = dynamic(() => import('echarts-for-react'), { ssr: false });

export function EloChart({ history }: { history: { matchDate: string; eloAfter: number }[] }) {
  const option = useMemo(() => ({
    tooltip: { trigger: 'axis' },
    grid: { left: 50, right: 20, top: 20, bottom: 40 },
    xAxis: { type: 'category', data: history.map((h) => h.matchDate.slice(0, 10)) },
    yAxis: { type: 'value' },
    series: [{ type: 'line', data: history.map((h) => h.eloAfter), smooth: true, areaStyle: { color: '#16a34a' } }],
  }), [history]);

  return <ReactECharts option={option} style={{ height: 280 }} />;
}
