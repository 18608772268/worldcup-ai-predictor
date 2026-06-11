'use client';
import dynamic from 'next/dynamic';
import { useMemo } from 'react';

const ReactECharts = dynamic(() => import('echarts-for-react'), { ssr: false });

export function ProbabilityChart({
  homeWin, draw, awayWin, homeLabel, awayLabel,
}: { homeWin: number; draw: number; awayWin: number; homeLabel: string; awayLabel: string }) {
  const option = useMemo(() => ({
    tooltip: { trigger: 'item' },
    legend: { bottom: 0 },
    series: [{
      type: 'pie',
      radius: ['40%', '70%'],
      data: [
        { value: +(homeWin * 100).toFixed(2), name: `${homeLabel} 胜`, itemStyle: { color: '#16a34a' } },
        { value: +(draw * 100).toFixed(2), name: '平局', itemStyle: { color: '#94a3b8' } },
        { value: +(awayWin * 100).toFixed(2), name: `${awayLabel} 胜`, itemStyle: { color: '#dc2626' } },
      ],
      label: { formatter: '{b}\n{d}%' },
    }],
  }), [homeWin, draw, awayWin, homeLabel, awayLabel]);

  return <ReactECharts option={option} style={{ height: 320 }} />;
}
