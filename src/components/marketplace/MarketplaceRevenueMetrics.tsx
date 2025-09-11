'use client';

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
  TrendingUp,
  TrendingDown,
  DollarSign,
  Users,
  ShoppingBag,
  Award,
  Calendar,
  Target,
} from 'lucide-react';

interface RevenueData {
  totalRevenue: number;
  totalCommissions: number;
  totalCreatorEarnings: number;
  templatesCount: number;
  creatorsCount: number;
  avgCommissionRate: number;
  topPerformingTemplates: Array<{
    id: string;
    title: string;
    revenue: number;
    sales: number;
    creator: string;
  }>;
  revenueByCategory: Array<{
    category: string;
    revenue: number;
    percentage: number;
  }>;
  monthlyTrends: Array<{
    month: string;
    revenue: number;
    commissions: number;
    creatorEarnings: number;
  }>;
}

interface Props {
  revenueData: RevenueData;
  timeframe: string;
}

export function MarketplaceRevenueMetrics({ revenueData, timeframe }: Props) {
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
    }).format(amount / 100);
  };

  const formatPercentage = (value: number): string => {
    return `${(value * 100).toFixed(1)}%`;
  };

  const calculateGrowth = (current: number, previous: number): number => {
    return ((current - previous) / previous) * 100;
  };

  // Mock previous period data for growth calculations
  const previousRevenue = 112670;
  const previousCommissions = 33801;
  const previousEarnings = 78869;

  const revenueGrowth = calculateGrowth(
    revenueData.totalRevenue,
    previousRevenue,
  );
  const commissionGrowth = calculateGrowth(
    revenueData.totalCommissions,
    previousCommissions,
  );
  const earningsGrowth = calculateGrowth(
    revenueData.totalCreatorEarnings,
    previousEarnings,
  );

  const topCategory = revenueData.revenueByCategory[0];
  const topTemplate = revenueData.topPerformingTemplates[0];

  return (
    <div className="space-y-6">
      {/* Performance Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="text-lg">Revenue Performance</span>
              <DollarSign className="h-5 w-5 text-green-600" />
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600">Total Revenue</span>
                <Badge
                  variant={revenueGrowth > 0 ? 'default' : 'destructive'}
                  className="text-xs"
                >
                  {revenueGrowth > 0 ? (
                    <TrendingUp className="w-3 h-3 mr-1" />
                  ) : (
                    <TrendingDown className="w-3 h-3 mr-1" />
                  )}
                  {Math.abs(revenueGrowth).toFixed(1)}%
                </Badge>
              </div>
              <div className="text-2xl font-bold">
                {formatCurrency(revenueData.totalRevenue)}
              </div>
              <div className="text-sm text-gray-500">
                vs previous {timeframe}
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Creator Share</span>
                <span>
                  {formatPercentage(
                    revenueData.totalCreatorEarnings / revenueData.totalRevenue,
                  )}
                </span>
              </div>
              <Progress
                value={
                  (revenueData.totalCreatorEarnings /
                    revenueData.totalRevenue) *
                  100
                }
                className="h-2"
              />

              <div className="flex justify-between text-sm">
                <span>Platform Commission</span>
                <span>
                  {formatPercentage(
                    revenueData.totalCommissions / revenueData.totalRevenue,
                  )}
                </span>
              </div>
              <Progress
                value={
                  (revenueData.totalCommissions / revenueData.totalRevenue) *
                  100
                }
                className="h-2"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="text-lg">Creator Ecosystem</span>
              <Users className="h-5 w-5 text-blue-600" />
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-2xl font-bold">
                  {revenueData.creatorsCount}
                </div>
                <div className="text-sm text-gray-600">Active Creators</div>
              </div>
              <div>
                <div className="text-2xl font-bold">
                  {revenueData.templatesCount}
                </div>
                <div className="text-sm text-gray-600">Live Templates</div>
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-gray-600">
                  Avg Template/Creator
                </span>
                <span className="text-sm font-medium">
                  {(
                    revenueData.templatesCount / revenueData.creatorsCount
                  ).toFixed(1)}
                </span>
              </div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-gray-600">
                  Avg Commission Rate
                </span>
                <Badge variant="outline">
                  {formatPercentage(revenueData.avgCommissionRate)}
                </Badge>
              </div>
            </div>

            <div className="pt-2 border-t">
              <div className="text-sm text-gray-600 mb-1">Creator Earnings</div>
              <div className="text-lg font-bold text-green-600">
                {formatCurrency(revenueData.totalCreatorEarnings)}
              </div>
              <Badge
                variant={earningsGrowth > 0 ? 'default' : 'destructive'}
                className="text-xs"
              >
                {earningsGrowth > 0 ? (
                  <TrendingUp className="w-3 h-3 mr-1" />
                ) : (
                  <TrendingDown className="w-3 h-3 mr-1" />
                )}
                {Math.abs(earningsGrowth).toFixed(1)}%
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="text-lg">Top Performers</span>
              <Award className="h-5 w-5 text-yellow-600" />
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="text-sm text-gray-600 mb-1">Best Category</div>
              <div className="font-semibold">{topCategory.category}</div>
              <div className="text-sm text-gray-500">
                {formatCurrency(topCategory.revenue)} (
                {topCategory.percentage.toFixed(1)}%)
              </div>
            </div>

            <div className="pt-2 border-t">
              <div className="text-sm text-gray-600 mb-1">Top Template</div>
              <div className="font-semibold text-sm line-clamp-2">
                {topTemplate.title}
              </div>
              <div className="text-sm text-gray-500">
                by {topTemplate.creator}
              </div>
              <div className="flex items-center justify-between mt-2">
                <span className="text-sm font-medium">
                  {formatCurrency(topTemplate.revenue)}
                </span>
                <Badge variant="secondary">{topTemplate.sales} sales</Badge>
              </div>
            </div>

            <div className="pt-2 border-t">
              <div className="text-sm text-gray-600 mb-2">
                Revenue Distribution
              </div>
              <div className="space-y-1">
                {revenueData.revenueByCategory
                  .slice(0, 3)
                  .map((category, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between text-xs"
                    >
                      <span className="truncate">{category.category}</span>
                      <span>{category.percentage.toFixed(1)}%</span>
                    </div>
                  ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-2">
            <ShoppingBag className="h-4 w-4 text-gray-500" />
            <div>
              <div className="text-lg font-bold">
                {revenueData.topPerformingTemplates.reduce(
                  (sum, t) => sum + t.sales,
                  0,
                )}
              </div>
              <div className="text-xs text-gray-600">Total Sales</div>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-2">
            <Target className="h-4 w-4 text-gray-500" />
            <div>
              <div className="text-lg font-bold">
                {formatCurrency(
                  revenueData.totalRevenue /
                    revenueData.topPerformingTemplates.reduce(
                      (sum, t) => sum + t.sales,
                      0,
                    ),
                )}
              </div>
              <div className="text-xs text-gray-600">Avg Sale Value</div>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-gray-500" />
            <div>
              <div className="text-lg font-bold">
                {formatCurrency(revenueData.totalRevenue / 30)}
              </div>
              <div className="text-xs text-gray-600">Daily Avg</div>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-gray-500" />
            <div>
              <div className="text-lg font-bold">
                {formatCurrency(
                  revenueData.totalCreatorEarnings / revenueData.creatorsCount,
                )}
              </div>
              <div className="text-xs text-gray-600">Avg Creator Earnings</div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
