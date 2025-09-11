import * as React from 'react';
export interface SparklineProps { values: number[]; width?: number; height?: number; strokeWidth?: number; title?: string; }
export function Sparkline({ values, width=160, height=48, strokeWidth=2, title='Sparkline' }: SparklineProps) {
  const min = Math.min(...values), max = Math.max(...values), range = max - min || 1;
  const stepX = width / Math.max(1, values.length - 1);
  const points = values.map((v,i)=>[i*stepX, height - ((v-min)/range)*height] as const);
  const d = points.map((p,i)=> i?`L ${p[0]} ${p[1]}`:`M ${p[0]} ${p[1]}`).join(' ');
  return (<svg role="img" aria-label={title} width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="overflow-visible">
    <title>{title}</title>
    <path d={d} fill="none" stroke="currentColor" strokeWidth={strokeWidth} className="text-foreground/70" />
    {points.length>0 && <circle cx={points.at(-1)![0]} cy={points.at(-1)![1]} r={3} className="fill-accent" />}
  </svg>);
}
