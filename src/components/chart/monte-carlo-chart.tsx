'use client';
import dynamic from 'next/dynamic';
import { useMemo } from 'react';

const ReactECharts = dynamic(() => import('echarts-for-react'), { ssr: false });

export function MonteCarloChart({ scores }: { scores: { score: string; prob: number }[] }) {
  const option = useMemo(() => ({
    tooltip: { trigger: 'axis' },
    grid: { left: 50, right: 20, top: 20, bottom: 40 },
    xAxis: { type: 'category', data: scores.map((s) => s.score), axisLabel: { rotate: 45 } },
    yAxis: { type: 'value', name: '概率', axisLabel: { formatter: (v: number) => `${v}%` } },
    series: [{
      type: 'bar',
      data: scores.map((s) => +(s.prob * 100).toFixed(2)),
      itemStyle: { color: '#16a34a' },
    }],
  }), [scores]);

  return <ReactECharts option={option} style={{ height: 320 }} />;
}
