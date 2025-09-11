'use client';

import React from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  RadialBarChart,
  RadialBar,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import {
  Target,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Users,
  Calendar,
  Star,
  Clock,
  CheckCircle,
  AlertTriangle,
  Activity,
  Zap,
} from 'lucide-react';

interface KPIDashboardProps {
  metrics: any;
  organizationId: string;
  timeRange: string;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

export function KPIDashboard({
  metrics,
  organizationId,
  timeRange,
}: KPIDashboardProps) {
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatPercent = (value: number): string => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;
  };

  // Define KPI targets and current performance
  const kpis = [
    {
      name: 'Monthly Recurring Revenue',
      current: metrics.totalRevenue / 12,
      target: 500000,
      unit: 'currency',
      trend: metrics.revenueGrowth,
      icon: DollarSign,
      color: '#0088FE',
      description: 'Monthly recurring revenue from subscriptions',
    },
    {
      name: 'Customer Acquisition Cost',
      current: 350,
      target: 300,
      unit: 'currency',
      trend: -8.2,
      icon: Users,
      color: '#00C49F',
      description: 'Cost to acquire new customers',
    },
    {
      name: 'Customer Lifetime Value',
      current: 2400,
      target: 2800,
      unit: 'currency',
      trend: 12.5,
      icon: Target,
      color: '#FFBB28',
      description: 'Average revenue per customer',
    },
    {
      name: 'Net Promoter Score',
      current: 68,
      target: 70,
      unit: 'number',
      trend: 4.2,
      icon: Star,
      color: '#FF8042',
      description: 'Customer satisfaction and loyalty',
    },
    {
      name: 'System Uptime',
      current: metrics.uptime,
      target: 99.9,
      unit: 'percentage',
      trend: metrics.uptimeChange,
      icon: CheckCircle,
      color: '#8884d8',
      description: 'Platform availability and reliability',
    },
    {
      name: 'Average Response Time',
      current: 245,
      target: 200,
      unit: 'ms',
      trend: -12.3,
      icon: Clock,
      color: '#82ca9d',
      description: 'API response time (95th percentile)',
    },
    {
      name: 'Customer Churn Rate',
      current: 2.1,
      target: 2.0,
      unit: 'percentage',
      trend: -0.8,
      icon: TrendingDown,
      color: '#ffc658',
      description: 'Monthly customer churn rate',
    },
    {
      name: 'Feature Adoption Rate',
      current: 78,
      target: 85,
      unit: 'percentage',
      trend: 15.2,
      icon: Zap,
      color: '#ff7c7c',
      description: 'New feature usage rate',
    },
  ];

  // Calculate overall KPI health score
  const kpiHealthScore =
    kpis.reduce((total, kpi) => {
      const achievement = Math.min(100, (kpi.current / kpi.target) * 100);
      return total + achievement;
    }, 0) / kpis.length;

  // KPI trends over time
  const kpiTrends = [
    { month: 'Jan', mrr: 42000, cac: 380, ltv: 2200, nps: 62, uptime: 99.2 },
    { month: 'Feb', mrr: 45000, cac: 370, ltv: 2250, nps: 64, uptime: 99.5 },
    { month: 'Mar', mrr: 48000, cac: 360, ltv: 2300, nps: 66, uptime: 99.7 },
    { month: 'Apr', mrr: 52000, cac: 355, ltv: 2350, nps: 67, uptime: 99.8 },
    { month: 'May', mrr: 56000, cac: 350, ltv: 2400, nps: 68, uptime: 99.95 },
    { month: 'Jun', mrr: 59000, cac: 345, ltv: 2450, nps: 70, uptime: 99.95 },
  ];

  // Radial chart data for KPI performance
  const radialData = kpis.slice(0, 5).map((kpi, index) => ({
    name: kpi.name,
    value: Math.min(100, (kpi.current / kpi.target) * 100),
    fill: kpi.color,
  }));

  return (
    <div className="space-y-6">
      {/* KPI Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.slice(0, 4).map((kpi) => {
          const IconComponent = kpi.icon;
          const achievement = (kpi.current / kpi.target) * 100;
          const isOnTarget = achievement >= 95;

          return (
            <Card key={kpi.name}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {kpi.name}
                </CardTitle>
                <IconComponent
                  className="h-4 w-4"
                  style={{ color: kpi.color }}
                />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {kpi.unit === 'currency'
                    ? formatCurrency(kpi.current)
                    : kpi.unit === 'percentage'
                      ? `${kpi.current.toFixed(1)}%`
                      : kpi.unit === 'ms'
                        ? `${kpi.current}ms`
                        : kpi.current.toLocaleString()}
                </div>
                <div className="flex items-center justify-between mt-2">
                  <div className="flex items-center text-xs text-muted-foreground">
                    {kpi.trend >= 0 ? (
                      <TrendingUp className="h-3 w-3 mr-1 text-green-600" />
                    ) : (
                      <TrendingDown className="h-3 w-3 mr-1 text-red-600" />
                    )}
                    <span
                      className={
                        kpi.trend >= 0 ? 'text-green-600' : 'text-red-600'
                      }
                    >
                      {formatPercent(kpi.trend)}
                    </span>
                  </div>
                  <Badge variant={isOnTarget ? 'default' : 'secondary'}>
                    {achievement.toFixed(0)}%
                  </Badge>
                </div>
                <Progress value={achievement} className="mt-2 h-2" />
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Overall KPI Health */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Overall KPI Health Score
          </CardTitle>
          <CardDescription>
            Aggregate performance across all key metrics
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center">
            <div className="relative w-48 h-48">
              <ResponsiveContainer width="100%" height="100%">
                <RadialBarChart
                  cx="50%"
                  cy="50%"
                  innerRadius="60%"
                  outerRadius="90%"
                  data={[{ value: kpiHealthScore }]}
                >
                  <RadialBar
                    dataKey="value"
                    cornerRadius={10}
                    fill={
                      kpiHealthScore >= 90
                        ? '#22c55e'
                        : kpiHealthScore >= 75
                          ? '#3b82f6'
                          : kpiHealthScore >= 60
                            ? '#f59e0b'
                            : '#ef4444'
                    }
                  />
                </RadialBarChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex items-center justify-center flex-col">
                <div className="text-4xl font-bold">
                  {kpiHealthScore.toFixed(0)}%
                </div>
                <div className="text-sm text-gray-600">Health Score</div>
              </div>
            </div>
          </div>

          <div className="mt-4 text-center">
            <Badge
              variant={
                kpiHealthScore >= 90
                  ? 'default'
                  : kpiHealthScore >= 75
                    ? 'secondary'
                    : 'destructive'
              }
              className="text-lg px-4 py-2"
            >
              {kpiHealthScore >= 90
                ? 'Excellent Performance'
                : kpiHealthScore >= 75
                  ? 'Good Performance'
                  : kpiHealthScore >= 60
                    ? 'Needs Improvement'
                    : 'Critical Issues'}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Detailed KPI Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>KPI Performance Matrix</CardTitle>
            <CardDescription>
              Individual KPI targets vs actual performance
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {kpis.map((kpi) => {
                const achievement = (kpi.current / kpi.target) * 100;
                const isOnTarget = achievement >= 95;
                const IconComponent = kpi.icon;

                return (
                  <div
                    key={kpi.name}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center"
                        style={{ backgroundColor: `${kpi.color}20` }}
                      >
                        <IconComponent size={20} style={{ color: kpi.color }} />
                      </div>
                      <div>
                        <p className="font-medium text-sm">{kpi.name}</p>
                        <p className="text-xs text-gray-600">
                          {kpi.description}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-bold">
                          {kpi.unit === 'currency'
                            ? formatCurrency(kpi.current)
                            : kpi.unit === 'percentage'
                              ? `${kpi.current.toFixed(1)}%`
                              : kpi.unit === 'ms'
                                ? `${kpi.current}ms`
                                : kpi.current.toLocaleString()}
                        </span>
                        <Badge
                          variant={isOnTarget ? 'default' : 'outline'}
                          className="text-xs"
                        >
                          {achievement.toFixed(0)}%
                        </Badge>
                      </div>
                      <div className="text-xs text-gray-500">
                        Target:{' '}
                        {kpi.unit === 'currency'
                          ? formatCurrency(kpi.target)
                          : kpi.unit === 'percentage'
                            ? `${kpi.target}%`
                            : kpi.unit === 'ms'
                              ? `${kpi.target}ms`
                              : kpi.target.toLocaleString()}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>KPI Achievement Radar</CardTitle>
            <CardDescription>
              Visual representation of KPI performance
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={radialData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {radialData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number) => `${value.toFixed(1)}%`}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* KPI Trends */}
      <Card>
        <CardHeader>
          <CardTitle>KPI Trends Over Time</CardTitle>
          <CardDescription>
            Historical performance of key business metrics
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={kpiTrends}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip
                  formatter={(value: number, name: string) => [
                    name === 'mrr'
                      ? formatCurrency(value)
                      : name === 'cac'
                        ? formatCurrency(value)
                        : name === 'ltv'
                          ? formatCurrency(value)
                          : name === 'nps'
                            ? `${value} points`
                            : name === 'uptime'
                              ? `${value}%`
                              : value.toString(),
                    name === 'mrr'
                      ? 'MRR'
                      : name === 'cac'
                        ? 'CAC'
                        : name === 'ltv'
                          ? 'LTV'
                          : name === 'nps'
                            ? 'NPS'
                            : name === 'uptime'
                              ? 'Uptime'
                              : name,
                  ]}
                />
                <Line
                  type="monotone"
                  dataKey="mrr"
                  stroke="#0088FE"
                  strokeWidth={3}
                  name="mrr"
                />
                <Line
                  type="monotone"
                  dataKey="nps"
                  stroke="#00C49F"
                  strokeWidth={2}
                  name="nps"
                />
                <Line
                  type="monotone"
                  dataKey="uptime"
                  stroke="#FFBB28"
                  strokeWidth={2}
                  name="uptime"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* KPI Alerts and Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
            KPI Alerts & Action Items
          </CardTitle>
          <CardDescription>
            Areas requiring immediate attention or improvement
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {kpis
              .filter((kpi) => kpi.current / kpi.target < 0.95)
              .map((kpi) => {
                const achievement = (kpi.current / kpi.target) * 100;
                const severity =
                  achievement < 75
                    ? 'critical'
                    : achievement < 90
                      ? 'warning'
                      : 'info';

                return (
                  <div
                    key={kpi.name}
                    className={`p-3 rounded-lg border-l-4 ${
                      severity === 'critical'
                        ? 'bg-red-50 border-red-500'
                        : severity === 'warning'
                          ? 'bg-yellow-50 border-yellow-500'
                          : 'bg-blue-50 border-blue-500'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <p
                          className={`font-medium ${
                            severity === 'critical'
                              ? 'text-red-800'
                              : severity === 'warning'
                                ? 'text-yellow-800'
                                : 'text-blue-800'
                          }`}
                        >
                          {kpi.name} Below Target
                        </p>
                        <p
                          className={`text-xs mt-1 ${
                            severity === 'critical'
                              ? 'text-red-600'
                              : severity === 'warning'
                                ? 'text-yellow-600'
                                : 'text-blue-600'
                          }`}
                        >
                          Current:{' '}
                          {kpi.unit === 'currency'
                            ? formatCurrency(kpi.current)
                            : kpi.unit === 'percentage'
                              ? `${kpi.current.toFixed(1)}%`
                              : kpi.unit === 'ms'
                                ? `${kpi.current}ms`
                                : kpi.current.toLocaleString()}{' '}
                          | Target:{' '}
                          {kpi.unit === 'currency'
                            ? formatCurrency(kpi.target)
                            : kpi.unit === 'percentage'
                              ? `${kpi.target}%`
                              : kpi.unit === 'ms'
                                ? `${kpi.target}ms`
                                : kpi.target.toLocaleString()}
                        </p>
                      </div>
                      <Badge
                        variant={
                          severity === 'critical' ? 'destructive' : 'secondary'
                        }
                      >
                        {achievement.toFixed(0)}% of target
                      </Badge>
                    </div>
                  </div>
                );
              })}

            {kpis.filter((kpi) => kpi.current / kpi.target < 0.95).length ===
              0 && (
              <div className="text-center py-8 text-gray-500">
                <CheckCircle className="w-12 h-12 mx-auto mb-3 text-green-500" />
                <p className="font-medium text-green-700">
                  All KPIs on target!
                </p>
                <p className="text-sm mt-1">No immediate action required</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Wedding Industry KPI Benchmarks */}
      <Card>
        <CardHeader>
          <CardTitle>Industry Benchmarks Comparison</CardTitle>
          <CardDescription>
            How your KPIs compare to wedding industry standards
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg">
              <h4 className="font-semibold text-green-800">Above Benchmark</h4>
              <div className="mt-2 space-y-1">
                <Badge variant="outline" className="mr-1 mb-1">
                  System Uptime
                </Badge>
                <Badge variant="outline" className="mr-1 mb-1">
                  Response Time
                </Badge>
                <Badge variant="outline" className="mr-1 mb-1">
                  Feature Adoption
                </Badge>
              </div>
              <p className="text-xs text-green-600 mt-2">3 out of 8 KPIs</p>
            </div>

            <div className="text-center p-4 bg-gradient-to-br from-yellow-50 to-orange-50 rounded-lg">
              <h4 className="font-semibold text-yellow-800">At Benchmark</h4>
              <div className="mt-2 space-y-1">
                <Badge variant="outline" className="mr-1 mb-1">
                  MRR Growth
                </Badge>
                <Badge variant="outline" className="mr-1 mb-1">
                  NPS Score
                </Badge>
                <Badge variant="outline" className="mr-1 mb-1">
                  Churn Rate
                </Badge>
              </div>
              <p className="text-xs text-yellow-600 mt-2">3 out of 8 KPIs</p>
            </div>

            <div className="text-center p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg">
              <h4 className="font-semibold text-blue-800">Below Benchmark</h4>
              <div className="mt-2 space-y-1">
                <Badge variant="outline" className="mr-1 mb-1">
                  CAC
                </Badge>
                <Badge variant="outline" className="mr-1 mb-1">
                  LTV
                </Badge>
              </div>
              <p className="text-xs text-blue-600 mt-2">2 out of 8 KPIs</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default KPIDashboard;
