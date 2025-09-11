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
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  ComposedChart,
  Line,
  LineChart,
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  Users,
  UserPlus,
  UserMinus,
  Target,
  Calendar,
  Heart,
  Award,
  AlertCircle,
} from 'lucide-react';

interface GrowthAnalyticsProps {
  metrics: any;
  organizationId: string;
  timeRange: string;
}

export function GrowthAnalytics({
  metrics,
  organizationId,
  timeRange,
}: GrowthAnalyticsProps) {
  const formatPercent = (value: number): string => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;
  };

  const formatNumber = (num: number): string => {
    return num.toLocaleString();
  };

  // Calculate additional growth metrics
  const totalNewClients =
    metrics.clientChart?.reduce(
      (sum: number, month: any) => sum + month.newClients,
      0,
    ) || 0;
  const averageMonthlyGrowth =
    totalNewClients / (metrics.clientChart?.length || 1);
  const growthAcceleration =
    metrics.clientChart?.length > 1
      ? (metrics.clientChart[metrics.clientChart.length - 1].newClients -
          metrics.clientChart[0].newClients) /
        metrics.clientChart.length
      : 0;

  // Calculate retention rate (simplified - in real implementation would use proper cohort analysis)
  const estimatedChurnRate = 2.5; // 2.5% monthly churn (industry average)
  const retentionRate = 100 - estimatedChurnRate;

  // Calculate LTV based on average revenue per client and retention
  const avgRevenuePerClient =
    metrics.activeClients > 0
      ? metrics.totalRevenue / metrics.activeClients
      : 0;
  const monthlyChurnRate = estimatedChurnRate / 100;
  const avgCustomerLifespan = 1 / monthlyChurnRate; // months
  const estimatedLTV = avgRevenuePerClient * avgCustomerLifespan;

  // Mock CAC data (would come from marketing spend / new acquisitions)
  const estimatedCAC = 350; // £350 average customer acquisition cost
  const ltvCacRatio = estimatedCAC > 0 ? estimatedLTV / estimatedCAC : 0;

  // Growth stage indicators
  const getGrowthStage = (): {
    stage: string;
    description: string;
    color: string;
  } => {
    if (metrics.clientGrowth > 20)
      return {
        stage: 'Rapid Growth',
        description: 'Exponential user acquisition',
        color: 'text-green-600',
      };
    if (metrics.clientGrowth > 10)
      return {
        stage: 'Steady Growth',
        description: 'Consistent expansion',
        color: 'text-blue-600',
      };
    if (metrics.clientGrowth > 0)
      return {
        stage: 'Slow Growth',
        description: 'Gradual increase',
        color: 'text-yellow-600',
      };
    return {
      stage: 'Decline',
      description: 'User base contracting',
      color: 'text-red-600',
    };
  };

  const growthStage = getGrowthStage();

  // Seasonal growth patterns for wedding industry
  const seasonalGrowthPattern =
    metrics.clientChart?.map((month: any, index: number) => {
      const monthIndex = [
        'Jan',
        'Feb',
        'Mar',
        'Apr',
        'May',
        'Jun',
        'Jul',
        'Aug',
        'Sep',
        'Oct',
        'Nov',
        'Dec',
      ].indexOf(month.month);
      const isEngagementSeason = monthIndex >= 10 || monthIndex <= 1; // Nov-Feb (engagement season)
      const isPlanningPeak = monthIndex >= 2 && monthIndex <= 4; // Mar-May (planning peak)

      return {
        ...month,
        seasonalFactor: isEngagementSeason ? 1.3 : isPlanningPeak ? 1.5 : 1.0,
        growthRate:
          index > 0
            ? ((month.newClients - metrics.clientChart[index - 1].newClients) /
                metrics.clientChart[index - 1].newClients) *
              100
            : 0,
      };
    }) || [];

  return (
    <div className="space-y-6">
      {/* Growth Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Growth Stage</CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${growthStage.color}`}>
              {growthStage.stage}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {growthStage.description}
            </p>
            <div className="flex items-center text-xs text-muted-foreground mt-2">
              {metrics.clientGrowth >= 0 ? (
                <TrendingUp className="h-3 w-3 mr-1 text-green-600" />
              ) : (
                <TrendingDown className="h-3 w-3 mr-1 text-red-600" />
              )}
              <span
                className={
                  metrics.clientGrowth >= 0 ? 'text-green-600' : 'text-red-600'
                }
              >
                {formatPercent(metrics.clientGrowth)} YoY
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Monthly New Clients
            </CardTitle>
            <UserPlus className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatNumber(averageMonthlyGrowth)}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              Average per month
            </div>
            <div className="flex items-center text-xs text-muted-foreground mt-2">
              {growthAcceleration >= 0 ? (
                <TrendingUp className="h-3 w-3 mr-1 text-green-600" />
              ) : (
                <TrendingDown className="h-3 w-3 mr-1 text-red-600" />
              )}
              <span
                className={
                  growthAcceleration >= 0 ? 'text-green-600' : 'text-red-600'
                }
              >
                {growthAcceleration >= 0 ? '+' : ''}
                {growthAcceleration.toFixed(1)} acceleration
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Retention Rate
            </CardTitle>
            <Heart className="h-4 w-4 text-pink-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {retentionRate.toFixed(1)}%
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              Monthly retention
            </div>
            <Progress value={retentionRate} className="mt-2 h-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">LTV:CAC Ratio</CardTitle>
            <Target className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{ltvCacRatio.toFixed(1)}:1</div>
            <div className="text-xs text-muted-foreground mt-1">
              Lifetime value to acquisition cost
            </div>
            <Badge
              variant={
                ltvCacRatio >= 3
                  ? 'default'
                  : ltvCacRatio >= 2
                    ? 'secondary'
                    : 'destructive'
              }
              className="mt-2"
            >
              {ltvCacRatio >= 3
                ? 'Excellent'
                : ltvCacRatio >= 2
                  ? 'Good'
                  : 'Needs Improvement'}
            </Badge>
          </CardContent>
        </Card>
      </div>

      {/* Client Growth Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Client Growth Trends</CardTitle>
          <CardDescription>
            New client acquisitions vs active client base with seasonal wedding
            patterns
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={seasonalGrowthPattern}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis yAxisId="left" />
                <YAxis yAxisId="right" orientation="right" />
                <Tooltip
                  formatter={(value: number, name: string) => [
                    formatNumber(value),
                    name === 'newClients'
                      ? 'New Clients'
                      : name === 'activeClients'
                        ? 'Active Clients'
                        : 'Growth Rate',
                  ]}
                />
                <Bar
                  yAxisId="left"
                  dataKey="newClients"
                  fill="#8884d8"
                  name="New Clients"
                />
                <Area
                  yAxisId="left"
                  type="monotone"
                  dataKey="activeClients"
                  fill="#82ca9d"
                  fillOpacity={0.3}
                  stroke="#82ca9d"
                  name="Active Clients"
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="growthRate"
                  stroke="#ff7300"
                  name="Growth Rate (%)"
                  strokeWidth={2}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          {/* Seasonal insights */}
          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="p-3 bg-blue-50 rounded-lg">
              <div className="flex items-center gap-2 text-blue-800">
                <Calendar size={16} />
                <span className="font-medium">Engagement Season</span>
              </div>
              <p className="text-sm text-blue-700 mt-1">
                Nov-Feb: 30% higher client acquisition due to holiday
                engagements
              </p>
            </div>

            <div className="p-3 bg-green-50 rounded-lg">
              <div className="flex items-center gap-2 text-green-800">
                <Target size={16} />
                <span className="font-medium">Planning Peak</span>
              </div>
              <p className="text-sm text-green-700 mt-1">
                Mar-May: 50% higher activity as couples finalize vendors
              </p>
            </div>

            <div className="p-3 bg-purple-50 rounded-lg">
              <div className="flex items-center gap-2 text-purple-800">
                <Heart size={16} />
                <span className="font-medium">Wedding Season</span>
              </div>
              <p className="text-sm text-purple-700 mt-1">
                Jun-Sep: Lower new clients but highest revenue per user
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Customer Lifecycle Metrics */}
        <Card>
          <CardHeader>
            <CardTitle>Customer Lifecycle Value</CardTitle>
            <CardDescription>
              Key metrics for customer value optimization
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
              <div>
                <p className="text-sm font-medium text-green-800">
                  Average LTV
                </p>
                <p className="text-xs text-green-600">
                  Customer lifetime value
                </p>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-green-800">
                  £{estimatedLTV.toLocaleString()}
                </p>
                <p className="text-xs text-green-600">
                  {avgCustomerLifespan.toFixed(1)} month avg lifespan
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
              <div>
                <p className="text-sm font-medium text-red-800">Customer CAC</p>
                <p className="text-xs text-red-600">
                  Customer acquisition cost
                </p>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-red-800">
                  £{estimatedCAC.toLocaleString()}
                </p>
                <p className="text-xs text-red-600">Marketing + sales cost</p>
              </div>
            </div>

            <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
              <div>
                <p className="text-sm font-medium text-blue-800">
                  Payback Period
                </p>
                <p className="text-xs text-blue-600">Time to recover CAC</p>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-blue-800">
                  {avgRevenuePerClient > 0
                    ? Math.ceil(estimatedCAC / (avgRevenuePerClient / 12))
                    : 0}{' '}
                  months
                </p>
                <p className="text-xs text-blue-600">
                  Based on avg monthly value
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
              <div>
                <p className="text-sm font-medium text-purple-800">
                  Churn Risk
                </p>
                <p className="text-xs text-purple-600">Monthly churn rate</p>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-purple-800">
                  {estimatedChurnRate}%
                </p>
                <Badge
                  variant={
                    estimatedChurnRate < 3
                      ? 'default'
                      : estimatedChurnRate < 5
                        ? 'secondary'
                        : 'destructive'
                  }
                >
                  {estimatedChurnRate < 3
                    ? 'Low Risk'
                    : estimatedChurnRate < 5
                      ? 'Moderate'
                      : 'High Risk'}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Growth Health Score */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5" />
              Growth Health Score
            </CardTitle>
            <CardDescription>
              Overall assessment of growth sustainability
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Health Score Calculation */}
            {(() => {
              const growthScore = Math.min(
                100,
                Math.max(0, (metrics.clientGrowth + 10) * 2),
              ); // -10% to +40% mapped to 0-100
              const retentionScore = retentionRate; // Already 0-100
              const ltvCacScore = Math.min(100, (ltvCacRatio / 5) * 100); // 5:1 ratio = 100 score
              const overallScore =
                (growthScore + retentionScore + ltvCacScore) / 3;

              return (
                <div className="space-y-4">
                  <div className="text-center">
                    <div className="text-4xl font-bold mb-2">
                      {overallScore.toFixed(0)}/100
                    </div>
                    <Badge
                      variant={
                        overallScore >= 80
                          ? 'default'
                          : overallScore >= 60
                            ? 'secondary'
                            : 'destructive'
                      }
                      className="text-lg px-4 py-1"
                    >
                      {overallScore >= 80
                        ? 'Excellent'
                        : overallScore >= 60
                          ? 'Good'
                          : 'Needs Attention'}
                    </Badge>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Growth Rate</span>
                        <span>{growthScore.toFixed(0)}/100</span>
                      </div>
                      <Progress value={growthScore} className="h-2" />
                    </div>

                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Retention</span>
                        <span>{retentionScore.toFixed(0)}/100</span>
                      </div>
                      <Progress value={retentionScore} className="h-2" />
                    </div>

                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>LTV:CAC Efficiency</span>
                        <span>{ltvCacScore.toFixed(0)}/100</span>
                      </div>
                      <Progress value={ltvCacScore} className="h-2" />
                    </div>
                  </div>

                  {overallScore < 60 && (
                    <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                      <div className="flex items-start gap-2">
                        <AlertCircle
                          size={16}
                          className="text-yellow-600 mt-0.5"
                        />
                        <div>
                          <p className="text-sm font-medium text-yellow-800">
                            Improvement Opportunities
                          </p>
                          <ul className="text-xs text-yellow-700 mt-1 space-y-1">
                            {growthScore < 60 && (
                              <li>• Focus on acquisition channels</li>
                            )}
                            {retentionScore < 80 && (
                              <li>• Improve customer retention programs</li>
                            )}
                            {ltvCacScore < 60 && (
                              <li>• Optimize marketing spend efficiency</li>
                            )}
                          </ul>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}
          </CardContent>
        </Card>
      </div>

      {/* Wedding Industry Growth Benchmarks */}
      <Card>
        <CardHeader>
          <CardTitle>Wedding Industry Benchmarks</CardTitle>
          <CardDescription>
            How your growth compares to wedding industry standards
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg">
              <h4 className="font-semibold text-blue-800">
                Industry Avg Growth
              </h4>
              <p className="text-2xl font-bold text-blue-900 mt-2">15%</p>
              <p className="text-xs text-blue-600 mt-1">Annual client growth</p>
              <div className="mt-2">
                <Badge
                  variant={metrics.clientGrowth >= 15 ? 'default' : 'secondary'}
                >
                  {metrics.clientGrowth >= 15
                    ? 'Above Average'
                    : 'Below Average'}
                </Badge>
              </div>
            </div>

            <div className="text-center p-4 bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg">
              <h4 className="font-semibold text-green-800">
                Industry Retention
              </h4>
              <p className="text-2xl font-bold text-green-900 mt-2">92%</p>
              <p className="text-xs text-green-600 mt-1">
                Annual retention rate
              </p>
              <div className="mt-2">
                <Badge variant={retentionRate >= 92 ? 'default' : 'secondary'}>
                  {retentionRate >= 92
                    ? 'Above Benchmark'
                    : 'Room for Improvement'}
                </Badge>
              </div>
            </div>

            <div className="text-center p-4 bg-gradient-to-br from-purple-50 to-violet-50 rounded-lg">
              <h4 className="font-semibold text-purple-800">
                Peak Season Boost
              </h4>
              <p className="text-2xl font-bold text-purple-900 mt-2">
                {((metrics.peakSeasonLoad || 2.5) * 100).toFixed(0)}%
              </p>
              <p className="text-xs text-purple-600 mt-1">
                Growth during wedding season
              </p>
              <div className="mt-2">
                <Badge variant="outline">
                  {(metrics.peakSeasonLoad || 2.5) > 2
                    ? 'Strong Seasonality'
                    : 'Moderate Seasonality'}
                </Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default GrowthAnalytics;
