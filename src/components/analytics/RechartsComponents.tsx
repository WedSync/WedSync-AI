'use client';

import React from 'react';
import {
  LineChart,
  BarChart,
  PieChart,
  AreaChart,
  Line,
  Bar,
  Pie,
  Area,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart as RechartsPieChart,
} from 'recharts';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card-untitled';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

// Untitled UI themed colors
const CHART_COLORS = {
  primary: '#8B5CF6',
  secondary: '#06B6D4',
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
  purple: '#8B5CF6',
  cyan: '#06B6D4',
  amber: '#F59E0B',
  emerald: '#10B981',
  red: '#EF4444',
  gray: '#6B7280',
};

const WEDDING_COLORS = [
  CHART_COLORS.purple,
  CHART_COLORS.cyan,
  CHART_COLORS.amber,
  CHART_COLORS.emerald,
  CHART_COLORS.red,
  CHART_COLORS.gray,
];

interface AnalyticsCardProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
  actions?: React.ReactNode;
  loading?: boolean;
}

export const AnalyticsCard: React.FC<AnalyticsCardProps> = ({
  title,
  description,
  children,
  className,
  actions,
  loading,
}) => {
  return (
    <Card className={cn('analytics-card', className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <div className="space-y-1">
          <CardTitle className="text-base font-semibold text-gray-900 dark:text-white">
            {title}
          </CardTitle>
          {description && (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {description}
            </p>
          )}
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </CardHeader>
      <CardContent className="pb-4">
        {loading ? (
          <div className="h-80 flex items-center justify-center">
            <div className="animate-pulse text-gray-500 dark:text-gray-400">
              Loading chart data...
            </div>
          </div>
        ) : (
          children
        )}
      </CardContent>
    </Card>
  );
};

interface RevenueTrendsProps {
  data: Array<{
    date: string;
    revenue: number;
    bookings: number;
    avgValue: number;
  }>;
  loading?: boolean;
}

export const RevenueTrends: React.FC<RevenueTrendsProps> = ({
  data,
  loading,
}) => {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <AnalyticsCard
      title="Revenue Trends"
      description="Daily revenue and booking volume"
      loading={loading}
    >
      <ResponsiveContainer width="100%" height={300}>
        <AreaChart
          data={data}
          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
        >
          <defs>
            <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
              <stop
                offset="5%"
                stopColor={CHART_COLORS.purple}
                stopOpacity={0.3}
              />
              <stop
                offset="95%"
                stopColor={CHART_COLORS.purple}
                stopOpacity={0}
              />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
          <XAxis
            dataKey="date"
            tickFormatter={formatDate}
            stroke="#6B7280"
            fontSize={12}
          />
          <YAxis
            tickFormatter={formatCurrency}
            stroke="#6B7280"
            fontSize={12}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'white',
              border: '1px solid #E2E8F0',
              borderRadius: '8px',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
            }}
            labelFormatter={(value) => `Date: ${formatDate(value)}`}
            formatter={(value: number, name: string) => [
              name === 'revenue' ? formatCurrency(value) : value,
              name === 'revenue' ? 'Revenue' : 'Bookings',
            ]}
          />
          <Area
            type="monotone"
            dataKey="revenue"
            stroke={CHART_COLORS.purple}
            fillOpacity={1}
            fill="url(#revenueGradient)"
            strokeWidth={2}
          />
        </AreaChart>
      </ResponsiveContainer>
    </AnalyticsCard>
  );
};

interface ConversionFunnelProps {
  data: Array<{
    stage: string;
    users: number;
    conversionRate: number;
  }>;
  loading?: boolean;
}

export const ConversionFunnel: React.FC<ConversionFunnelProps> = ({
  data,
  loading,
}) => {
  const maxUsers = Math.max(...data.map((d) => d.users));

  return (
    <AnalyticsCard
      title="Booking Conversion Funnel"
      description="Client journey through booking process"
      loading={loading}
    >
      <div className="space-y-3">
        {data.map((stage, index) => {
          const widthPercent = (stage.users / maxUsers) * 100;
          const conversionColor =
            stage.conversionRate >= 70
              ? 'success'
              : stage.conversionRate >= 50
                ? 'warning'
                : 'error';

          return (
            <div key={stage.stage} className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  {stage.stage}
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {stage.users.toLocaleString()}
                  </span>
                  {index > 0 && (
                    <Badge variant={conversionColor as any} className="text-xs">
                      {stage.conversionRate.toFixed(1)}%
                    </Badge>
                  )}
                </div>
              </div>
              <div className="relative">
                <div className="w-full h-8 bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg transition-all duration-1000 ease-out flex items-center justify-center"
                    style={{ width: `${widthPercent}%` }}
                  >
                    <span className="text-white text-xs font-medium">
                      {((stage.users / data[0].users) * 100).toFixed(1)}%
                    </span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </AnalyticsCard>
  );
};

interface VendorPerformanceProps {
  data: Array<{
    name: string;
    bookings: number;
    revenue: number;
    rating: number;
    category: string;
  }>;
  loading?: boolean;
}

export const VendorPerformance: React.FC<VendorPerformanceProps> = ({
  data,
  loading,
}) => {
  return (
    <AnalyticsCard
      title="Top Venues"
      description="Highest performing wedding venues"
      loading={loading}
    >
      <ResponsiveContainer width="100%" height={300}>
        <BarChart
          data={data}
          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
          <XAxis
            dataKey="name"
            stroke="#6B7280"
            fontSize={12}
            angle={-45}
            textAnchor="end"
            height={60}
          />
          <YAxis stroke="#6B7280" fontSize={12} />
          <Tooltip
            contentStyle={{
              backgroundColor: 'white',
              border: '1px solid #E2E8F0',
              borderRadius: '8px',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
            }}
            formatter={(value: number, name: string) => [
              name === 'revenue' ? `$${value.toLocaleString()}` : value,
              name === 'revenue' ? 'Revenue' : 'Bookings',
            ]}
          />
          <Bar
            dataKey="bookings"
            fill={CHART_COLORS.emerald}
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </AnalyticsCard>
  );
};

interface WeddingSeasonInsightsProps {
  data: Array<{
    month: string;
    weddings: number;
    revenue: number;
    popularStyles: string[];
  }>;
  loading?: boolean;
}

export const WeddingSeasonInsights: React.FC<WeddingSeasonInsightsProps> = ({
  data,
  loading,
}) => {
  return (
    <AnalyticsCard
      title="Wedding Season Insights"
      description="Monthly wedding trends and revenue"
      loading={loading}
    >
      <ResponsiveContainer width="100%" height={300}>
        <LineChart
          data={data}
          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
          <XAxis dataKey="month" stroke="#6B7280" fontSize={12} />
          <YAxis
            yAxisId="weddings"
            orientation="left"
            stroke="#6B7280"
            fontSize={12}
          />
          <YAxis
            yAxisId="revenue"
            orientation="right"
            stroke="#6B7280"
            fontSize={12}
            tickFormatter={(value) => `$${value / 1000}k`}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'white',
              border: '1px solid #E2E8F0',
              borderRadius: '8px',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
            }}
            formatter={(value: number, name: string) => [
              name === 'revenue' ? `$${value.toLocaleString()}` : value,
              name === 'revenue' ? 'Revenue' : 'Weddings',
            ]}
          />
          <Legend />
          <Line
            yAxisId="weddings"
            type="monotone"
            dataKey="weddings"
            stroke={CHART_COLORS.purple}
            strokeWidth={3}
            dot={{ fill: CHART_COLORS.purple, strokeWidth: 2, r: 4 }}
            activeDot={{ r: 6, stroke: CHART_COLORS.purple, strokeWidth: 2 }}
          />
          <Line
            yAxisId="revenue"
            type="monotone"
            dataKey="revenue"
            stroke={CHART_COLORS.cyan}
            strokeWidth={3}
            dot={{ fill: CHART_COLORS.cyan, strokeWidth: 2, r: 4 }}
            activeDot={{ r: 6, stroke: CHART_COLORS.cyan, strokeWidth: 2 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </AnalyticsCard>
  );
};

interface ClientAcquisitionProps {
  data: Array<{
    source: string;
    clients: number;
    percentage: number;
  }>;
  loading?: boolean;
}

export const ClientAcquisition: React.FC<ClientAcquisitionProps> = ({
  data,
  loading,
}) => {
  return (
    <AnalyticsCard
      title="Client Acquisition"
      description="Where new clients are coming from"
      loading={loading}
    >
      <ResponsiveContainer width="100%" height={300}>
        <RechartsPieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={100}
            paddingAngle={2}
            dataKey="clients"
          >
            {data.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={WEDDING_COLORS[index % WEDDING_COLORS.length]}
              />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              backgroundColor: 'white',
              border: '1px solid #E2E8F0',
              borderRadius: '8px',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
            }}
            formatter={(value: number, name: string) => [
              `${value} clients`,
              'Source',
            ]}
          />
          <Legend
            verticalAlign="bottom"
            height={36}
            formatter={(value, entry) => (
              <span style={{ color: entry.color }}>
                {value} ({entry.payload?.percentage}%)
              </span>
            )}
          />
        </RechartsPieChart>
      </ResponsiveContainer>
    </AnalyticsCard>
  );
};

// Export utility for chart colors
export { CHART_COLORS, WEDDING_COLORS };
