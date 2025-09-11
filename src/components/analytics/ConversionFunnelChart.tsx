'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ResponsiveContainer,
  FunnelChart,
  Funnel,
  Cell,
  LabelList,
  Tooltip,
} from 'recharts';
import { useAnalyticsData } from '@/hooks/useAnalyticsData';
import { useSearchParams } from 'next/navigation';
import { ChartSkeleton } from './Skeletons';
import { Info } from 'lucide-react';

const COLORS = ['#8b5cf6', '#7c3aed', '#6d28d9', '#5b21b6', '#4c1d95'];

interface FunnelDataPoint {
  name: string;
  value: number;
  percentage: number;
  fill?: string;
}

export function ConversionFunnelChart() {
  const searchParams = useSearchParams();
  const timeframe = searchParams.get('timeframe') || '30d';
  const { data: analytics, isLoading } = useAnalyticsData(timeframe);

  if (isLoading || !analytics) return <ChartSkeleton />;

  const funnelData: FunnelDataPoint[] = analytics.funnel.map(
    (stage, index) => ({
      ...stage,
      fill: COLORS[Math.min(index, COLORS.length - 1)],
    }),
  );

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload[0]) {
      const data = payload[0].payload;
      return (
        <div className="bg-background border rounded-lg shadow-lg p-3">
          <p className="font-semibold">{data.name}</p>
          <p className="text-sm text-muted-foreground">
            {data.value} clients ({data.percentage.toFixed(1)}%)
          </p>
        </div>
      );
    }
    return null;
  };

  const CustomLabel = (props: any) => {
    const { x, y, width, height, value, name } = props;
    return (
      <text
        x={x + width / 2}
        y={y + height / 2}
        fill="#fff"
        textAnchor="middle"
        dominantBaseline="middle"
        className="text-sm font-medium"
      >
        <tspan x={x + width / 2} dy="-0.5em">
          {name}
        </tspan>
        <tspan x={x + width / 2} dy="1.2em">
          {value}
        </tspan>
      </text>
    );
  };

  return (
    <Card data-testid="funnel-chart" className="transition-all hover:shadow-lg">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Conversion Funnel</CardTitle>
          <Info className="h-4 w-4 text-muted-foreground" />
        </div>
        <p className="text-sm text-muted-foreground">
          Client journey progression and drop-off analysis
        </p>
      </CardHeader>
      <CardContent>
        <div data-testid="chart-container" className="h-[400px]">
          <ResponsiveContainer width="100%" height="100%">
            <FunnelChart>
              <Tooltip content={<CustomTooltip />} />
              <Funnel
                dataKey="value"
                data={funnelData}
                isAnimationActive
                labelLine={false}
                label={<CustomLabel />}
              >
                {funnelData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Funnel>
            </FunnelChart>
          </ResponsiveContainer>
        </div>

        {/* Conversion Rate Details */}
        <div className="mt-6 space-y-3 border-t pt-4">
          <div className="flex items-center justify-between text-sm font-medium">
            <span>Stage Breakdown</span>
            <span>Conversion Rate</span>
          </div>
          {funnelData.map((stage, index) => {
            const nextStage = funnelData[index + 1];
            const conversionRate =
              nextStage && stage.value > 0
                ? ((nextStage.value / stage.value) * 100).toFixed(1)
                : null;

            return (
              <div
                key={stage.name}
                className="flex justify-between items-center text-sm group hover:bg-muted/50 rounded px-2 py-1 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: stage.fill }}
                  />
                  <span className="text-muted-foreground">{stage.name}</span>
                </div>
                <div className="text-right">
                  <span className="font-medium">{stage.value}</span>
                  {conversionRate && (
                    <span className="text-muted-foreground ml-2">
                      → {conversionRate}%
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
