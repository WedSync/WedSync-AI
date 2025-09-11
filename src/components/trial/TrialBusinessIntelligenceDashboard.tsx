'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  FunnelChart,
  Funnel,
  LabelList,
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  Users,
  Calendar,
  Brain,
  Target,
  Zap,
  DollarSign,
  Activity,
  Award,
  ArrowUp,
  ArrowDown,
  Music,
  Camera,
  Flower2,
  CreditCard,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface TrialBusinessIntelligenceDashboardProps {
  data?: any;
  loading?: boolean;
}

interface MetricCardProps {
  title: string;
  value: string | number;
  change?: number;
  trend?: 'up' | 'down' | 'neutral';
  icon: React.ElementType;
  color?: string;
  index: number;
  subtitle?: string;
}

const COLORS = {
  primary: '#7F56D9',
  secondary: '#9E77ED',
  tertiary: '#B692F6',
  quaternary: '#D6BBFB',
  light: '#E9D7FE',
  success: '#10B981',
  warning: '#F59E0B',
  danger: '#EF4444',
  music: '#8B5CF6',
  floral: '#EC4899',
  photo: '#06B6D4',
  subscription: '#F97316',
};

const AI_SERVICE_COLORS = [
  COLORS.music,
  COLORS.floral,
  COLORS.photo,
  COLORS.subscription,
];

// Animation variants
const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: i * 0.1,
      duration: 0.5,
      ease: 'easeOut',
    },
  }),
};

function MetricCard({
  title,
  value,
  change,
  trend,
  icon: Icon,
  color = COLORS.primary,
  index,
  subtitle,
}: MetricCardProps) {
  const getTrendColor = () => {
    switch (trend) {
      case 'up':
        return 'text-green-600';
      case 'down':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  const getTrendIcon = () => {
    switch (trend) {
      case 'up':
        return ArrowUp;
      case 'down':
        return ArrowDown;
      default:
        return Activity;
    }
  };

  const TrendIcon = getTrendIcon();

  return (
    <motion.div
      custom={index}
      initial="hidden"
      animate="visible"
      variants={cardVariants}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      <Card className="p-6 hover:shadow-lg transition-shadow bg-white border border-gray-200 rounded-xl">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-600">{title}</p>
            <div className="flex items-baseline gap-2">
              <h3 className="text-2xl font-bold text-gray-900">{value}</h3>
              {change !== undefined && (
                <div className={`flex items-center text-sm ${getTrendColor()}`}>
                  <TrendIcon className="h-3 w-3 mr-1" />
                  <span>{Math.abs(change)}%</span>
                </div>
              )}
            </div>
            {subtitle && <p className="text-xs text-gray-500">{subtitle}</p>}
          </div>
          <div
            className="h-12 w-12 rounded-full flex items-center justify-center"
            style={{ backgroundColor: `${color}20` }}
          >
            <Icon className="h-6 w-6" style={{ color }} />
          </div>
        </div>
      </Card>
    </motion.div>
  );
}

export function TrialBusinessIntelligenceDashboard({
  data,
  loading,
}: TrialBusinessIntelligenceDashboardProps) {
  const [activeTimeframe, setActiveTimeframe] = useState<
    '7d' | '30d' | '90d' | '1y'
  >('30d');

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              className="bg-white rounded-xl border border-gray-200 p-6 shadow-xs"
            >
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-24 animate-pulse"></div>
                  <div className="h-6 bg-gray-200 rounded w-16 animate-pulse"></div>
                </div>
                <div className="h-12 w-12 bg-gray-200 rounded-full animate-pulse"></div>
              </div>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {Array.from({ length: 6 }).map((_, index) => (
            <div
              key={index}
              className="bg-white rounded-xl border border-gray-200 p-6 shadow-xs"
            >
              <div className="h-4 bg-gray-200 rounded w-32 animate-pulse mb-4"></div>
              <div className="h-64 bg-gray-200 rounded animate-pulse"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Mock data - to be replaced with real data from TrialUsageIntegration service
  const kpiMetrics = [
    {
      title: 'Trial Conversion Rate',
      value: '23.8%',
      change: 12.4,
      trend: 'up' as const,
      icon: Target,
      color: COLORS.success,
      subtitle: '85% ML predicted accuracy',
    },
    {
      title: 'Cross-Team ROI',
      value: '$4,850',
      change: 18.2,
      trend: 'up' as const,
      icon: DollarSign,
      color: COLORS.primary,
      subtitle: 'Weighted average across AI services',
    },
    {
      title: 'Active Trial Users',
      value: '1,247',
      change: -2.1,
      trend: 'down' as const,
      icon: Users,
      color: COLORS.secondary,
      subtitle: '30-day trial period',
    },
    {
      title: 'AI Service Engagement',
      value: '87.3%',
      change: 15.7,
      trend: 'up' as const,
      icon: Brain,
      color: COLORS.tertiary,
      subtitle: 'Multi-service utilization',
    },
  ];

  // Trial Conversion Funnel Data
  const funnelData = [
    { name: 'Trial Signups', value: 2847, fill: COLORS.light },
    { name: 'AI Feature Usage', value: 2156, fill: COLORS.quaternary },
    { name: 'Multiple Services', value: 1823, fill: COLORS.tertiary },
    { name: 'Extension Requests', value: 945, fill: COLORS.secondary },
    { name: 'Converted to Paid', value: 678, fill: COLORS.primary },
  ];

  // Cross-Team ROI Analysis Data
  const crossTeamROIData = [
    {
      team: 'Music AI',
      roi: 4200,
      engagement: 78,
      conversions: 145,
      timeMultiplier: 1.2,
      costMultiplier: 0.8,
      icon: Music,
      color: COLORS.music,
    },
    {
      team: 'Floral AI',
      roi: 5800,
      engagement: 92,
      conversions: 198,
      timeMultiplier: 1.5,
      costMultiplier: 1.2,
      icon: Flower2,
      color: COLORS.floral,
    },
    {
      team: 'Photo AI',
      roi: 4950,
      engagement: 85,
      conversions: 167,
      timeMultiplier: 1.3,
      costMultiplier: 0.9,
      icon: Camera,
      color: COLORS.photo,
    },
    {
      team: 'Subscription',
      roi: 3200,
      engagement: 65,
      conversions: 89,
      timeMultiplier: 0.8,
      costMultiplier: 1.0,
      icon: CreditCard,
      color: COLORS.subscription,
    },
  ];

  // Trial Progression Timeline Data
  const progressionData = [
    { day: 'Day 1', signups: 45, active: 43, engagement: 95 },
    { day: 'Day 3', signups: 45, active: 40, engagement: 89 },
    { day: 'Day 7', signups: 45, active: 35, engagement: 78 },
    { day: 'Day 14', signups: 45, active: 28, engagement: 62 },
    { day: 'Day 21', signups: 45, active: 22, engagement: 49 },
    { day: 'Day 30', signups: 45, active: 18, engagement: 40 },
  ];

  // Business Intelligence Metrics
  const biMetrics = [
    {
      month: 'Jan',
      predictedConversions: 145,
      actualConversions: 138,
      revenue: 85000,
    },
    {
      month: 'Feb',
      predictedConversions: 162,
      actualConversions: 159,
      revenue: 98000,
    },
    {
      month: 'Mar',
      predictedConversions: 178,
      actualConversions: 185,
      revenue: 112000,
    },
    {
      month: 'Apr',
      predictedConversions: 195,
      actualConversions: 189,
      revenue: 125000,
    },
    {
      month: 'May',
      predictedConversions: 210,
      actualConversions: 218,
      revenue: 145000,
    },
    {
      month: 'Jun',
      predictedConversions: 225,
      actualConversions: 234,
      revenue: 165000,
    },
  ];

  // Supplier ROI Benchmarks
  const supplierROIData = [
    {
      category: 'Premium Suppliers',
      avgROI: 6800,
      trials: 234,
      conversionRate: 28.5,
    },
    {
      category: 'Standard Suppliers',
      avgROI: 4200,
      trials: 567,
      conversionRate: 22.1,
    },
    {
      category: 'Basic Suppliers',
      avgROI: 2800,
      trials: 892,
      conversionRate: 18.3,
    },
    {
      category: 'New Suppliers',
      avgROI: 1900,
      trials: 354,
      conversionRate: 12.7,
    },
  ];

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex flex-col space-y-4"
      >
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-gray-900">
              Trial Business Intelligence
            </h1>
            <p className="text-gray-600 mt-2">
              Advanced analytics and ROI insights across all AI services and
              trial conversion funnels
            </p>
          </div>
          <div className="flex items-center space-x-2">
            {(['7d', '30d', '90d', '1y'] as const).map((timeframe) => (
              <Button
                key={timeframe}
                variant={activeTimeframe === timeframe ? 'default' : 'outline'}
                size="sm"
                onClick={() => setActiveTimeframe(timeframe)}
              >
                {timeframe}
              </Button>
            ))}
          </div>
        </div>

        {/* Key Performance Indicators */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {kpiMetrics.map((metric, index) => (
            <MetricCard key={metric.title} {...metric} index={index} />
          ))}
        </div>
      </motion.div>

      {/* Main Analytics Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Trial Conversion Funnel */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.4, duration: 0.5 }}
          className="col-span-1"
        >
          <Card className="p-6 bg-white border border-gray-200 rounded-xl shadow-xs">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Trial Conversion Funnel
                </h3>
                <p className="text-sm text-gray-500">
                  User journey through trial process
                </p>
              </div>
              <Badge
                variant="outline"
                className="bg-green-50 text-green-700 border-green-200"
              >
                23.8% CVR
              </Badge>
            </div>
            <ResponsiveContainer width="100%" height={320}>
              <FunnelChart>
                <Tooltip
                  formatter={(value: any, name) => [`${value} users`, name]}
                  contentStyle={{
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #E5E7EB',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                  }}
                />
                <Funnel dataKey="value" data={funnelData} isAnimationActive>
                  <LabelList position="center" fill="#fff" stroke="none" />
                </Funnel>
              </FunnelChart>
            </ResponsiveContainer>
          </Card>
        </motion.div>

        {/* Cross-Team ROI Analysis */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.5, duration: 0.5 }}
          className="col-span-1"
        >
          <Card className="p-6 bg-white border border-gray-200 rounded-xl shadow-xs">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Cross-Team ROI Analysis
                </h3>
                <p className="text-sm text-gray-500">
                  Weighted performance by AI service
                </p>
              </div>
              <Badge
                variant="outline"
                className="bg-blue-50 text-blue-700 border-blue-200"
              >
                $4,850 Avg
              </Badge>
            </div>
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={crossTeamROIData} layout="horizontal">
                <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                <XAxis
                  type="number"
                  stroke="#9CA3AF"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => `$${value / 1000}k`}
                />
                <YAxis
                  type="category"
                  dataKey="team"
                  stroke="#9CA3AF"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  width={80}
                />
                <Tooltip
                  formatter={(value: any, name, props) => [
                    `$${value}`,
                    `ROI (${props.payload.conversions} conversions)`,
                  ]}
                  contentStyle={{
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #E5E7EB',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                  }}
                />
                <Bar
                  dataKey="roi"
                  radius={[0, 4, 4, 0]}
                  fill={(entry: any) => entry.color}
                >
                  {crossTeamROIData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </motion.div>

        {/* Trial Progression Timeline */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.6, duration: 0.5 }}
          className="col-span-1"
        >
          <Card className="p-6 bg-white border border-gray-200 rounded-xl shadow-xs">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Trial Progression Timeline
                </h3>
                <p className="text-sm text-gray-500">
                  User retention throughout trial period
                </p>
              </div>
              <Badge
                variant="outline"
                className="bg-orange-50 text-orange-700 border-orange-200"
              >
                30 Day Trial
              </Badge>
            </div>
            <ResponsiveContainer width="100%" height={320}>
              <LineChart data={progressionData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                <XAxis
                  dataKey="day"
                  stroke="#9CA3AF"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke="#9CA3AF"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  formatter={(value: any, name) => [
                    value,
                    name === 'active' ? 'Active Users' : 'Engagement %',
                  ]}
                  contentStyle={{
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #E5E7EB',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="active"
                  stroke={COLORS.primary}
                  strokeWidth={3}
                  dot={{ fill: COLORS.primary, strokeWidth: 2, r: 4 }}
                />
                <Line
                  type="monotone"
                  dataKey="engagement"
                  stroke={COLORS.warning}
                  strokeWidth={3}
                  strokeDasharray="5 5"
                  dot={{ fill: COLORS.warning, strokeWidth: 2, r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </Card>
        </motion.div>

        {/* ML Prediction Accuracy */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.7, duration: 0.5 }}
          className="col-span-1"
        >
          <Card className="p-6 bg-white border border-gray-200 rounded-xl shadow-xs">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  ML Prediction Accuracy
                </h3>
                <p className="text-sm text-gray-500">
                  Conversion predictions vs actual results
                </p>
              </div>
              <Badge
                variant="outline"
                className="bg-purple-50 text-purple-700 border-purple-200"
              >
                85.3% Accuracy
              </Badge>
            </div>
            <ResponsiveContainer width="100%" height={320}>
              <AreaChart data={biMetrics}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                <XAxis
                  dataKey="month"
                  stroke="#9CA3AF"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke="#9CA3AF"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  formatter={(value: any, name) => [
                    value,
                    name === 'predictedConversions'
                      ? 'ML Predicted'
                      : 'Actual Conversions',
                  ]}
                  contentStyle={{
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #E5E7EB',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="predictedConversions"
                  stackId="1"
                  stroke={COLORS.quaternary}
                  fill={COLORS.light}
                />
                <Area
                  type="monotone"
                  dataKey="actualConversions"
                  stackId="1"
                  stroke={COLORS.primary}
                  fill={COLORS.tertiary}
                />
              </AreaChart>
            </ResponsiveContainer>
          </Card>
        </motion.div>
      </div>

      {/* Supplier ROI Benchmarks */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8, duration: 0.5 }}
      >
        <Card className="p-6 bg-white border border-gray-200 rounded-xl shadow-xs">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                Supplier ROI Benchmarks
              </h3>
              <p className="text-sm text-gray-500">
                Performance analysis by supplier tier
              </p>
            </div>
            <Button variant="outline" size="sm">
              <Award className="h-4 w-4 mr-2" />
              Export Report
            </Button>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900">
                    Supplier Category
                  </th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-gray-900">
                    Avg ROI
                  </th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-gray-900">
                    Trial Users
                  </th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-gray-900">
                    Conversion Rate
                  </th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-gray-900">
                    Performance
                  </th>
                </tr>
              </thead>
              <tbody>
                {supplierROIData.map((supplier, index) => (
                  <tr
                    key={supplier.category}
                    className="border-b border-gray-100 hover:bg-gray-50"
                  >
                    <td className="py-3 px-4">
                      <div className="flex items-center">
                        <div
                          className="w-3 h-3 rounded-full mr-3"
                          style={{
                            backgroundColor:
                              AI_SERVICE_COLORS[
                                index % AI_SERVICE_COLORS.length
                              ],
                          }}
                        ></div>
                        <span className="text-sm font-medium text-gray-900">
                          {supplier.category}
                        </span>
                      </div>
                    </td>
                    <td className="text-right py-3 px-4 text-sm font-semibold text-gray-900">
                      ${supplier.avgROI.toLocaleString()}
                    </td>
                    <td className="text-right py-3 px-4 text-sm text-gray-600">
                      {supplier.trials}
                    </td>
                    <td className="text-right py-3 px-4">
                      <Badge
                        variant={
                          supplier.conversionRate > 25
                            ? 'default'
                            : supplier.conversionRate > 20
                              ? 'secondary'
                              : 'outline'
                        }
                        className={
                          supplier.conversionRate > 25
                            ? 'bg-green-100 text-green-800 border-green-200'
                            : supplier.conversionRate > 20
                              ? 'bg-blue-100 text-blue-800 border-blue-200'
                              : 'bg-gray-100 text-gray-800 border-gray-200'
                        }
                      >
                        {supplier.conversionRate}%
                      </Badge>
                    </td>
                    <td className="text-right py-3 px-4">
                      <div className="flex items-center justify-end">
                        {supplier.conversionRate > 25 ? (
                          <TrendingUp className="h-4 w-4 text-green-600" />
                        ) : supplier.conversionRate > 20 ? (
                          <Activity className="h-4 w-4 text-blue-600" />
                        ) : (
                          <TrendingDown className="h-4 w-4 text-red-600" />
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </motion.div>
    </div>
  );
}
