import * as React from 'react';
export interface BarChartProps { values: number[]; labels?: string[]; width?: number; height?: number; gap?: number; title?: string; }
export function BarChart({ values, labels, width=260, height=120, gap=6, title='Bar chart' }: BarChartProps) {
  const max = Math.max(...values, 1), barWidth = (width - gap*(values.length-1)) / values.length;
  return (<figure className="text-sm">
    <svg role="img" aria-label={title} width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <title>{title}</title>
      {values.map((v,i)=>{ const h=(v/max)*(height-16), x=i*(barWidth+gap), y=height-h; return <rect key={i} x={x} y={y} width={barWidth} height={h} className="fill-accent/80" rx={4} ry={4}/>; })}
    </svg>
    {labels && (<figcaption className="mt-2 grid" style={{ gridTemplateColumns:`repeat(${labels.length}, minmax(0,1fr))`, gap:6 }}>{labels.map((l,i)=><div key={i} className="truncate text-center text-[11px] text-muted-foreground">{l}</div>)}</figcaption>)}
  </figure>);
}
