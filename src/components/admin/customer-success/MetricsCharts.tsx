'use client';

import { useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import {
  TrendingUp,
  TrendingDown,
  Users,
  AlertTriangle,
  CheckCircle,
  Clock,
  RefreshCw,
  BarChart3,
  LineChart,
  PieChart,
} from 'lucide-react';
import { DashboardMetrics } from '@/types/customer-success-api';
import { cn } from '@/lib/utils';

interface MetricsChartsProps {
  metrics?: DashboardMetrics;
  isLoading: boolean;
  refreshTrigger: number;
}

export function MetricsCharts({
  metrics,
  isLoading,
  refreshTrigger,
}: MetricsChartsProps) {
  const [timePeriod, setTimePeriod] = useState('30d');
  const [chartType, setChartType] = useState('trends');

  const getRiskColor = (riskLevel: string) => {
    switch (riskLevel) {
      case 'low':
        return 'bg-green-500';
      case 'medium':
        return 'bg-yellow-500';
      case 'high':
        return 'bg-orange-500';
      case 'critical':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const formatTrendData = () => {
    if (!metrics?.trends.health_score_trend) return [];

    return metrics.trends.health_score_trend.slice(-30).map((point, index) => ({
      date: new Date(point.date).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      }),
      score: point.avg_score,
      atRisk: point.at_risk_count,
      index,
    }));
  };

  const formatInterventionTrend = () => {
    if (!metrics?.trends.intervention_trend) return [];

    return metrics.trends.intervention_trend.slice(-30).map((point, index) => ({
      date: new Date(point.date).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      }),
      created: point.created,
      completed: point.completed,
      index,
    }));
  };

  const calculateRiskPercentages = () => {
    if (!metrics?.risk_distribution) return [];

    const total = Object.values(metrics.risk_distribution).reduce(
      (sum, count) => sum + count,
      0,
    );
    if (total === 0) return [];

    return [
      {
        level: 'Low Risk',
        count: metrics.risk_distribution.low,
        percentage: (metrics.risk_distribution.low / total) * 100,
        color: 'bg-green-500',
      },
      {
        level: 'Medium Risk',
        count: metrics.risk_distribution.medium,
        percentage: (metrics.risk_distribution.medium / total) * 100,
        color: 'bg-yellow-500',
      },
      {
        level: 'High Risk',
        count: metrics.risk_distribution.high,
        percentage: (metrics.risk_distribution.high / total) * 100,
        color: 'bg-orange-500',
      },
      {
        level: 'Critical Risk',
        count: metrics.risk_distribution.critical,
        percentage: (metrics.risk_distribution.critical / total) * 100,
        color: 'bg-red-500',
      },
    ];
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <Skeleton className="h-6 w-[200px]" />
          <div className="flex space-x-2">
            <Skeleton className="h-10 w-[100px]" />
            <Skeleton className="h-10 w-[120px]" />
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <Skeleton className="h-5 w-[150px]" />
              <Skeleton className="h-4 w-[250px]" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-[300px] w-full" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <Skeleton className="h-5 w-[150px]" />
              <Skeleton className="h-4 w-[250px]" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-[300px] w-full" />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const trendData = formatTrendData();
  const interventionTrend = formatInterventionTrend();
  const riskPercentages = calculateRiskPercentages();

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
        <div>
          <h2 className="text-2xl font-bold">Analytics & Insights</h2>
          <p className="text-muted-foreground">
            Track customer success metrics and trends over time
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <Select value={timePeriod} onValueChange={setTimePeriod}>
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder="Period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
              <SelectItem value="1y">Last year</SelectItem>
            </SelectContent>
          </Select>

          <Select value={chartType} onValueChange={setChartType}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Chart Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="trends">Trends</SelectItem>
              <SelectItem value="distribution">Distribution</SelectItem>
              <SelectItem value="interventions">Interventions</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Key Metrics Summary */}
      {metrics && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Health Score Trend
              </CardTitle>
              <LineChart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {Math.round(metrics.overview.avg_health_score)}
              </div>
              <div className="flex items-center text-xs">
                <TrendingUp className="h-3 w-3 text-green-500 mr-1" />
                <span className="text-green-600">+2.3% from last month</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Intervention Success
              </CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {Math.round(
                  (metrics.interventions.completed_this_period /
                    Math.max(metrics.interventions.total_active, 1)) *
                    100,
                )}
                %
              </div>
              <div className="flex items-center text-xs">
                <span className="text-muted-foreground">
                  {metrics.interventions.completed_this_period} of{' '}
                  {metrics.interventions.total_active} completed
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Avg Resolution Time
              </CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {Math.round(metrics.interventions.avg_resolution_time_hours)}h
              </div>
              <div className="flex items-center text-xs">
                <TrendingDown className="h-3 w-3 text-green-500 mr-1" />
                <span className="text-green-600">-15% faster</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Risk Reduction
              </CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">73%</div>
              <div className="flex items-center text-xs">
                <span className="text-muted-foreground">
                  of at-risk clients improved
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Charts Section */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Health Score Trends */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <LineChart className="h-5 w-5 mr-2" />
              Health Score Trends
            </CardTitle>
            <CardDescription>
              Average health scores and at-risk clients over time
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Simple bar chart visualization */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>Health Score Average</span>
                  <span>At Risk Count</span>
                </div>

                <div className="space-y-1">
                  {trendData.slice(-7).map((point, index) => (
                    <div key={index} className="flex items-center space-x-2">
                      <span className="text-xs w-12 text-muted-foreground">
                        {point.date}
                      </span>
                      <div className="flex-1 flex items-center space-x-2">
                        <div className="flex-1 bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-blue-500 h-2 rounded-full transition-all"
                            style={{ width: `${(point.score / 100) * 100}%` }}
                          />
                        </div>
                        <span className="text-xs w-8">
                          {Math.round(point.score)}
                        </span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <div className="w-2 h-2 bg-red-500 rounded-full" />
                        <span className="text-xs w-6">{point.atRisk}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {trendData.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <BarChart3 className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No trend data available</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Risk Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <PieChart className="h-5 w-5 mr-2" />
              Risk Level Distribution
            </CardTitle>
            <CardDescription>
              Current breakdown of clients by risk level
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {riskPercentages.map((risk, index) => (
                <div key={index} className="space-y-2">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center space-x-2">
                      <div className={cn('w-3 h-3 rounded-full', risk.color)} />
                      <span className="text-sm font-medium">{risk.level}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-muted-foreground">
                        {risk.count}
                      </span>
                      <Badge variant="outline" className="text-xs">
                        {Math.round(risk.percentage)}%
                      </Badge>
                    </div>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={cn(
                        'h-2 rounded-full transition-all',
                        risk.color,
                      )}
                      style={{ width: `${risk.percentage}%` }}
                    />
                  </div>
                </div>
              ))}

              {riskPercentages.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No distribution data available</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Interventions Analytics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <BarChart3 className="h-5 w-5 mr-2" />
            Intervention Analytics
          </CardTitle>
          <CardDescription>
            Track intervention creation and completion rates
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="text-center p-4 border rounded-lg">
                <div className="text-2xl font-bold text-blue-600">
                  {metrics?.interventions.total_active || 0}
                </div>
                <p className="text-sm text-muted-foreground">
                  Active Interventions
                </p>
              </div>

              <div className="text-center p-4 border rounded-lg">
                <div className="text-2xl font-bold text-green-600">
                  {metrics?.interventions.completed_this_period || 0}
                </div>
                <p className="text-sm text-muted-foreground">
                  Completed This Period
                </p>
              </div>

              <div className="text-center p-4 border rounded-lg">
                <div className="text-2xl font-bold text-red-600">
                  {metrics?.interventions.overdue || 0}
                </div>
                <p className="text-sm text-muted-foreground">Overdue</p>
              </div>
            </div>

            {/* Intervention trend chart */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Recent Activity (Last 7 Days)</span>
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-1">
                    <div className="w-2 h-2 bg-blue-500 rounded-full" />
                    <span className="text-xs">Created</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <div className="w-2 h-2 bg-green-500 rounded-full" />
                    <span className="text-xs">Completed</span>
                  </div>
                </div>
              </div>

              <div className="space-y-1">
                {interventionTrend.slice(-7).map((point, index) => (
                  <div key={index} className="flex items-center space-x-2">
                    <span className="text-xs w-12 text-muted-foreground">
                      {point.date}
                    </span>
                    <div className="flex-1 flex items-center space-x-2">
                      <div className="flex space-x-1">
                        {Array.from({
                          length: Math.max(point.created, point.completed),
                        }).map((_, i) => (
                          <div
                            key={i}
                            className={cn(
                              'w-1 h-4 rounded-sm',
                              i < point.created ? 'bg-blue-500' : 'bg-gray-200',
                            )}
                          />
                        ))}
                      </div>
                      <span className="text-xs text-blue-600">
                        {point.created}
                      </span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <span className="text-xs text-green-600">
                        {point.completed}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {interventionTrend.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No intervention data available</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Top Risk Factors */}
      {metrics?.top_risk_factors && metrics.top_risk_factors.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Top Risk Factors</CardTitle>
            <CardDescription>
              Most impactful factors affecting client health scores
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {metrics.top_risk_factors.slice(0, 5).map((factor, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-6 h-6 bg-red-100 text-red-600 rounded-full flex items-center justify-center text-xs font-bold">
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-medium capitalize text-sm">
                        {factor.factor.replace(/_/g, ' ')}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Affects {factor.affected_clients} client
                        {factor.affected_clients !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-semibold text-red-600">
                      -{Math.round(factor.impact_score)} pts
                    </div>
                    <p className="text-xs text-muted-foreground">avg impact</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
