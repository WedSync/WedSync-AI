'use client';

import React, { useMemo, useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area,
} from 'recharts';
import { Button } from '@/components/ui/button-untitled';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown } from 'lucide-react';
import type {
  SupplierHealthMetrics,
  HealthTrendPoint,
  ChartConfiguration,
} from '@/types/supplier-health';

interface HealthTrendChartProps {
  suppliers: SupplierHealthMetrics[];
  dateRange: { start: Date; end: Date };
  selectedSupplier?: string | null;
  onSupplierSelect?: (supplierId: string | null) => void;
  className?: string;
}

type ChartMetric =
  | 'healthScore'
  | 'activeClients'
  | 'revenue'
  | 'clientSatisfaction';

export function HealthTrendChart({
  suppliers,
  dateRange,
  selectedSupplier,
  onSupplierSelect,
  className = '',
}: HealthTrendChartProps) {
  const [chartConfig, setChartConfig] = useState<ChartConfiguration>({
    selectedMetric: 'healthScore',
    chartType: 'line',
    timeRange: '30d',
    selectedSupplier: selectedSupplier || null,
  });

  // Process chart data based on configuration
  const chartData = useMemo(() => {
    if (chartConfig.selectedSupplier) {
      // Show individual supplier trend
      const supplier = suppliers.find(
        (s) => s.supplier_id === chartConfig.selectedSupplier,
      );
      if (!supplier || !supplier.trendsData) return [];

      return supplier.trendsData
        .filter((trend) => {
          const trendDate = new Date(trend.date);
          return trendDate >= dateRange.start && trendDate <= dateRange.end;
        })
        .sort(
          (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
        );
    } else {
      // Show aggregated trends for all suppliers
      const dateMap = new Map<
        string,
        {
          date: string;
          healthScore: number[];
          activeClients: number[];
          revenue: number[];
          clientSatisfaction: number[];
        }
      >();

      suppliers.forEach((supplier) => {
        if (!supplier.trendsData) return;

        supplier.trendsData.forEach((trend) => {
          const trendDate = new Date(trend.date);
          if (trendDate < dateRange.start || trendDate > dateRange.end) return;

          const existing = dateMap.get(trend.date) || {
            date: trend.date,
            healthScore: [],
            activeClients: [],
            revenue: [],
            clientSatisfaction: [],
          };

          existing.healthScore.push(trend.healthScore);
          existing.activeClients.push(trend.activeClients);
          existing.revenue.push(trend.revenue);
          existing.clientSatisfaction.push(trend.clientSatisfaction);

          dateMap.set(trend.date, existing);
        });
      });

      return Array.from(dateMap.values())
        .map((item) => ({
          date: item.date,
          healthScore:
            item.healthScore.reduce((a, b) => a + b, 0) /
            item.healthScore.length,
          activeClients:
            item.activeClients.reduce((a, b) => a + b, 0) /
            item.activeClients.length,
          revenue:
            item.revenue.reduce((a, b) => a + b, 0) / item.revenue.length,
          clientSatisfaction:
            item.clientSatisfaction.reduce((a, b) => a + b, 0) /
            item.clientSatisfaction.length,
        }))
        .sort(
          (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
        );
    }
  }, [suppliers, chartConfig.selectedSupplier, dateRange]);

  // Calculate trend direction and percentage change
  const trendAnalysis = useMemo(() => {
    if (chartData.length < 2) return null;

    const first = chartData[0][chartConfig.selectedMetric];
    const last = chartData[chartData.length - 1][chartConfig.selectedMetric];

    const direction = last > first ? 'up' : 'down';
    const percentageChange = ((last - first) / first) * 100;

    return { direction, percentageChange };
  }, [chartData, chartConfig.selectedMetric]);

  const formatValue = (value: number, metric: ChartMetric) => {
    switch (metric) {
      case 'revenue':
        return new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD',
          notation: 'compact',
          maximumFractionDigits: 1,
        }).format(value);
      case 'clientSatisfaction':
        return value.toFixed(1);
      case 'activeClients':
        return Math.round(value).toString();
      case 'healthScore':
        return Math.round(value).toString();
      default:
        return value.toString();
    }
  };

  const getMetricColor = (metric: ChartMetric) => {
    switch (metric) {
      case 'healthScore':
        return '#8b5cf6'; // Purple
      case 'activeClients':
        return '#3b82f6'; // Blue
      case 'revenue':
        return '#10b981'; // Green
      case 'clientSatisfaction':
        return '#f59e0b'; // Yellow/Amber
      default:
        return '#6b7280';
    }
  };

  const getMetricLabel = (metric: ChartMetric) => {
    switch (metric) {
      case 'healthScore':
        return 'Health Score';
      case 'activeClients':
        return 'Active Clients';
      case 'revenue':
        return 'Revenue';
      case 'clientSatisfaction':
        return 'Satisfaction';
      default:
        return metric;
    }
  };

  const formatDateForChart = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-medium text-gray-900">
            {new Date(label).toLocaleDateString('en-US', {
              month: 'long',
              day: 'numeric',
              year: 'numeric',
            })}
          </p>
          <p className="text-sm" style={{ color: payload[0].color }}>
            {getMetricLabel(chartConfig.selectedMetric)}:{' '}
            {formatValue(payload[0].value, chartConfig.selectedMetric)}
          </p>
        </div>
      );
    }
    return null;
  };

  const handleSupplierSelect = (supplierId: string | null) => {
    setChartConfig((prev) => ({ ...prev, selectedSupplier: supplierId }));
    onSupplierSelect?.(supplierId);
  };

  const handleMetricChange = (metric: ChartMetric) => {
    setChartConfig((prev) => ({ ...prev, selectedMetric: metric }));
  };

  const handleChartTypeChange = (chartType: 'line' | 'area') => {
    setChartConfig((prev) => ({ ...prev, chartType }));
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Chart Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">Metric:</label>
            <Select
              value={chartConfig.selectedMetric}
              onValueChange={(value: ChartMetric) => handleMetricChange(value)}
            >
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="healthScore">Health Score</SelectItem>
                <SelectItem value="activeClients">Active Clients</SelectItem>
                <SelectItem value="revenue">Revenue</SelectItem>
                <SelectItem value="clientSatisfaction">Satisfaction</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">Chart:</label>
            <Select
              value={chartConfig.chartType}
              onValueChange={(value: 'line' | 'area') =>
                handleChartTypeChange(value)
              }
            >
              <SelectTrigger className="w-24">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="line">Line</SelectItem>
                <SelectItem value="area">Area</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Trend Indicator */}
        <div className="flex items-center gap-2">
          {trendAnalysis && (
            <Badge
              variant={
                trendAnalysis.direction === 'up' ? 'success' : 'destructive'
              }
              className="flex items-center gap-1"
            >
              {trendAnalysis.direction === 'up' ? (
                <TrendingUp className="h-3 w-3" />
              ) : (
                <TrendingDown className="h-3 w-3" />
              )}
              {trendAnalysis.percentageChange > 0 ? '+' : ''}
              {trendAnalysis.percentageChange.toFixed(1)}%
            </Badge>
          )}
        </div>
      </div>

      {/* Supplier Selection */}
      {suppliers.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <Button
            variant={
              chartConfig.selectedSupplier === null ? 'primary' : 'secondary'
            }
            size="sm"
            onClick={() => handleSupplierSelect(null)}
          >
            All Suppliers
          </Button>
          {suppliers.slice(0, 5).map((supplier) => (
            <Button
              key={supplier.supplier_id}
              variant={
                chartConfig.selectedSupplier === supplier.supplier_id
                  ? 'primary'
                  : 'secondary'
              }
              size="sm"
              onClick={() => handleSupplierSelect(supplier.supplier_id)}
              className="truncate max-w-40"
            >
              {supplier.supplier_name}
            </Button>
          ))}
          {suppliers.length > 5 && (
            <Select onValueChange={handleSupplierSelect}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="More..." />
              </SelectTrigger>
              <SelectContent>
                {suppliers.slice(5).map((supplier) => (
                  <SelectItem
                    key={supplier.supplier_id}
                    value={supplier.supplier_id}
                  >
                    {supplier.supplier_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      )}

      {/* Chart */}
      <div
        className="h-64 w-full"
        role="img"
        aria-label={`${getMetricLabel(chartConfig.selectedMetric)} trend chart`}
      >
        <ResponsiveContainer width="100%" height="100%">
          {chartConfig.chartType === 'line' ? (
            <LineChart
              data={chartData}
              margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis
                dataKey="date"
                tickFormatter={formatDateForChart}
                stroke="#64748b"
                fontSize={12}
              />
              <YAxis
                tickFormatter={(value) =>
                  formatValue(value, chartConfig.selectedMetric)
                }
                stroke="#64748b"
                fontSize={12}
              />
              <Tooltip content={<CustomTooltip />} />
              <Line
                type="monotone"
                dataKey={chartConfig.selectedMetric}
                stroke={getMetricColor(chartConfig.selectedMetric)}
                strokeWidth={2}
                dot={{ fill: getMetricColor(chartConfig.selectedMetric), r: 4 }}
                activeDot={{
                  r: 6,
                  stroke: getMetricColor(chartConfig.selectedMetric),
                  strokeWidth: 2,
                  fill: 'white',
                }}
              />
            </LineChart>
          ) : (
            <AreaChart
              data={chartData}
              margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis
                dataKey="date"
                tickFormatter={formatDateForChart}
                stroke="#64748b"
                fontSize={12}
              />
              <YAxis
                tickFormatter={(value) =>
                  formatValue(value, chartConfig.selectedMetric)
                }
                stroke="#64748b"
                fontSize={12}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey={chartConfig.selectedMetric}
                stroke={getMetricColor(chartConfig.selectedMetric)}
                fill={`${getMetricColor(chartConfig.selectedMetric)}30`} // 30% opacity
                strokeWidth={2}
              />
            </AreaChart>
          )}
        </ResponsiveContainer>
      </div>

      {/* Empty State */}
      {chartData.length === 0 && (
        <div className="flex items-center justify-center h-64 text-gray-500">
          <div className="text-center">
            <TrendingUp className="h-12 w-12 mx-auto mb-2 text-gray-400" />
            <p className="text-lg font-medium">No trend data available</p>
            <p className="text-sm mt-1">
              Data will appear as suppliers engage with the platform
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export default HealthTrendChart;
