'use client';

import { useState, useEffect } from 'react';
import {
  CurrencyPoundIcon,
  UsersIcon,
  ChartBarIcon,
  TrendingUpIcon,
  TrendingDownIcon,
  HeartIcon,
  BuildingStorefrontIcon,
  CalendarDaysIcon,
  PresentationChartLineIcon,
  BanknotesIcon,
} from '@heroicons/react/24/outline';

interface BusinessMetricsProps {
  userId: string;
  userProfile: any;
  isRefreshing: boolean;
  lastRefresh: Date;
}

interface RevenueMetric {
  name: string;
  value: number;
  unit: string;
  change: number;
  changeType: 'increase' | 'decrease' | 'stable';
  period: string;
  weddingContext: string;
  target?: number;
}

interface UserGrowth {
  userType: 'couples' | 'suppliers' | 'venues';
  current: number;
  growth: number;
  churnRate: number;
  conversionRate: number;
  avgLifetimeValue: number;
  weddingSeasonality: string;
}

interface WeddingPipeline {
  stage: string;
  count: number;
  value: number;
  avgDaysInStage: number;
  conversionRate: number;
  criticalPath: boolean;
}

interface MarketMetric {
  category: string;
  bookingVolume: number;
  avgBookingValue: number;
  marketShare: number;
  seasonalTrend: 'peak' | 'low' | 'normal';
  topRegions: string[];
}

export function BusinessMetrics({
  userId,
  userProfile,
  isRefreshing,
  lastRefresh,
}: BusinessMetricsProps) {
  const [revenueMetrics, setRevenueMetrics] = useState<RevenueMetric[]>([]);
  const [userGrowth, setUserGrowth] = useState<UserGrowth[]>([]);
  const [weddingPipeline, setWeddingPipeline] = useState<WeddingPipeline[]>([]);
  const [marketMetrics, setMarketMetrics] = useState<MarketMetric[]>([]);
  const [selectedTimeframe, setSelectedTimeframe] = useState<string>('30d');
  const [selectedMetricType, setSelectedMetricType] =
    useState<string>('revenue');

  useEffect(() => {
    fetchBusinessData();
  }, [lastRefresh, selectedTimeframe, selectedMetricType]);

  const fetchBusinessData = async () => {
    // Mock business data - In production, integrate with analytics and payment systems
    const mockRevenueMetrics: RevenueMetric[] = [
      {
        name: 'Monthly Recurring Revenue',
        value: 47850,
        unit: '£',
        change: 12.3,
        changeType: 'increase',
        period: 'vs last month',
        weddingContext: 'Platform subscription fees from wedding suppliers',
        target: 50000,
      },
      {
        name: 'Commission Revenue',
        value: 23400,
        unit: '£',
        change: -2.1,
        changeType: 'decrease',
        period: 'vs last month',
        weddingContext: 'Booking commissions from venue and supplier bookings',
        target: 25000,
      },
      {
        name: 'Average Revenue Per Wedding',
        value: 890,
        unit: '£',
        change: 8.7,
        changeType: 'increase',
        period: 'vs last quarter',
        weddingContext: 'Total platform revenue divided by completed weddings',
        target: 950,
      },
      {
        name: 'Customer Acquisition Cost',
        value: 145,
        unit: '£',
        change: -5.4,
        changeType: 'increase', // Lower CAC is better, so decrease is good
        period: 'vs last quarter',
        weddingContext: 'Cost to acquire new couples and suppliers',
        target: 120,
      },
    ];

    const mockUserGrowth: UserGrowth[] = [
      {
        userType: 'couples',
        current: 2847,
        growth: 23.5,
        churnRate: 8.2,
        conversionRate: 34.6,
        avgLifetimeValue: 1250,
        weddingSeasonality: 'Peak season signup (+45% Apr-Oct)',
      },
      {
        userType: 'suppliers',
        current: 456,
        growth: 15.8,
        churnRate: 12.1,
        conversionRate: 28.3,
        avgLifetimeValue: 3400,
        weddingSeasonality: 'Year-round growth with winter planning spike',
      },
      {
        userType: 'venues',
        current: 89,
        growth: 8.2,
        churnRate: 5.6,
        conversionRate: 45.2,
        avgLifetimeValue: 5600,
        weddingSeasonality: 'Stable growth, high retention',
      },
    ];

    const mockWeddingPipeline: WeddingPipeline[] = [
      {
        stage: 'Initial Inquiry',
        count: 1247,
        value: 3200000,
        avgDaysInStage: 3,
        conversionRate: 45.2,
        criticalPath: true,
      },
      {
        stage: 'Supplier Matching',
        count: 563,
        value: 1890000,
        avgDaysInStage: 7,
        conversionRate: 72.1,
        criticalPath: true,
      },
      {
        stage: 'Proposal Review',
        count: 406,
        value: 1420000,
        avgDaysInStage: 12,
        conversionRate: 58.6,
        criticalPath: true,
      },
      {
        stage: 'Contract Negotiation',
        count: 238,
        value: 965000,
        avgDaysInStage: 8,
        conversionRate: 78.2,
        criticalPath: true,
      },
      {
        stage: 'Booking Confirmed',
        count: 186,
        value: 834000,
        avgDaysInStage: 2,
        conversionRate: 95.7,
        criticalPath: false,
      },
      {
        stage: 'Planning Phase',
        count: 178,
        value: 798000,
        avgDaysInStage: 180,
        conversionRate: 98.3,
        criticalPath: false,
      },
    ];

    const mockMarketMetrics: MarketMetric[] = [
      {
        category: 'Photography',
        bookingVolume: 234,
        avgBookingValue: 1850,
        marketShare: 23.4,
        seasonalTrend: 'peak',
        topRegions: ['London', 'Manchester', 'Birmingham'],
      },
      {
        category: 'Venues',
        bookingVolume: 89,
        avgBookingValue: 8500,
        marketShare: 12.8,
        seasonalTrend: 'peak',
        topRegions: ['Cotswolds', 'Lake District', 'Devon'],
      },
      {
        category: 'Catering',
        bookingVolume: 156,
        avgBookingValue: 3200,
        marketShare: 18.7,
        seasonalTrend: 'normal',
        topRegions: ['London', 'Bristol', 'Edinburgh'],
      },
      {
        category: 'Music & DJ',
        bookingVolume: 198,
        avgBookingValue: 950,
        marketShare: 31.2,
        seasonalTrend: 'peak',
        topRegions: ['London', 'Leeds', 'Glasgow'],
      },
      {
        category: 'Flowers',
        bookingVolume: 167,
        avgBookingValue: 650,
        marketShare: 27.9,
        seasonalTrend: 'peak',
        topRegions: ['London', 'Bath', 'Cambridge'],
      },
    ];

    setRevenueMetrics(mockRevenueMetrics);
    setUserGrowth(mockUserGrowth);
    setWeddingPipeline(mockWeddingPipeline);
    setMarketMetrics(mockMarketMetrics);
  };

  const getChangeColor = (change: number, changeType: string) => {
    if (changeType === 'stable') return 'text-gray-600';

    // For CAC, decrease is good (green), increase is bad (red)
    if (changeType === 'increase' && change < 0) return 'text-success-600';
    if (changeType === 'decrease' && change < 0) return 'text-error-600';

    return change > 0 ? 'text-success-600' : 'text-error-600';
  };

  const getChangeIcon = (change: number) => {
    if (Math.abs(change) < 1)
      return (
        <div className="w-4 h-4 border-2 border-gray-400 rounded-full"></div>
      );
    return change > 0 ? (
      <TrendingUpIcon className="w-4 h-4 text-success-500" />
    ) : (
      <TrendingDownIcon className="w-4 h-4 text-error-500" />
    );
  };

  const getSeasonalTrendColor = (trend: string) => {
    switch (trend) {
      case 'peak':
        return 'text-success-700 bg-success-100';
      case 'low':
        return 'text-error-700 bg-error-100';
      default:
        return 'text-blue-700 bg-blue-100';
    }
  };

  const formatCurrency = (value: number) => {
    if (value >= 1000000) return `£${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `£${(value / 1000).toFixed(0)}K`;
    return `£${value.toLocaleString()}`;
  };

  const totalMRR =
    revenueMetrics.find((m) => m.name.includes('Recurring'))?.value || 0;
  const totalCommissions =
    revenueMetrics.find((m) => m.name.includes('Commission'))?.value || 0;
  const totalRevenue = totalMRR + totalCommissions;
  const totalActiveWeddings = weddingPipeline.reduce(
    (sum, stage) => sum + stage.count,
    0,
  );

  return (
    <div className="space-y-8">
      {/* Revenue Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 shadow-xs p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Revenue</p>
              <p className="text-3xl font-bold text-primary-700 mt-1">
                {formatCurrency(totalRevenue)}
              </p>
              <p className="text-sm text-primary-600 mt-1">Monthly total</p>
            </div>
            <div className="inline-flex items-center justify-center w-12 h-12 bg-primary-100 rounded-lg">
              <CurrencyPoundIcon className="w-6 h-6 text-primary-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-xs p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">
                Active Weddings
              </p>
              <p className="text-3xl font-bold text-blue-700 mt-1">
                {totalActiveWeddings.toLocaleString()}
              </p>
              <p className="text-sm text-blue-600 mt-1">In pipeline</p>
            </div>
            <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-100 rounded-lg">
              <HeartIcon className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-xs p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Users</p>
              <p className="text-3xl font-bold text-success-700 mt-1">
                {userGrowth
                  .reduce((sum, user) => sum + user.current, 0)
                  .toLocaleString()}
              </p>
              <p className="text-sm text-success-600 mt-1">
                Couples + Suppliers
              </p>
            </div>
            <div className="inline-flex items-center justify-center w-12 h-12 bg-success-100 rounded-lg">
              <UsersIcon className="w-6 h-6 text-success-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-xs p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Market Share</p>
              <p className="text-3xl font-bold text-orange-700 mt-1">18.7%</p>
              <p className="text-sm text-orange-600 mt-1">
                Wedding tech market
              </p>
            </div>
            <div className="inline-flex items-center justify-center w-12 h-12 bg-orange-100 rounded-lg">
              <ChartBarIcon className="w-6 h-6 text-orange-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center space-x-4">
          <div>
            <label className="text-sm font-medium text-gray-700 mr-2">
              Time Period:
            </label>
            <select
              value={selectedTimeframe}
              onChange={(e) => setSelectedTimeframe(e.target.value)}
              className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-4 focus:ring-primary-100 focus:border-primary-300"
            >
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
              <option value="90d">Last 90 Days</option>
              <option value="12m">Last 12 Months</option>
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 mr-2">
              Focus:
            </label>
            <select
              value={selectedMetricType}
              onChange={(e) => setSelectedMetricType(e.target.value)}
              className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-4 focus:ring-primary-100 focus:border-primary-300"
            >
              <option value="revenue">Revenue</option>
              <option value="growth">User Growth</option>
              <option value="pipeline">Wedding Pipeline</option>
              <option value="market">Market Analysis</option>
            </select>
          </div>
        </div>
      </div>

      {/* Revenue Metrics */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-xs p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-6">
          Revenue Performance
        </h3>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {revenueMetrics.map((metric) => (
            <div
              key={metric.name}
              className="border border-gray-200 rounded-lg p-4"
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h4 className="text-sm font-medium text-gray-900">
                    {metric.name}
                  </h4>
                  <div className="flex items-center space-x-2 mt-1">
                    <span className="text-2xl font-bold text-gray-900">
                      {metric.unit}
                      {metric.value.toLocaleString()}
                    </span>
                    <div
                      className={`flex items-center space-x-1 ${getChangeColor(metric.change, metric.changeType)}`}
                    >
                      {getChangeIcon(metric.change)}
                      <span className="text-sm font-medium">
                        {Math.abs(metric.change).toFixed(1)}%
                      </span>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">{metric.period}</p>
                </div>

                {metric.target && (
                  <div className="text-right">
                    <div className="text-xs text-gray-500">Target</div>
                    <div className="text-sm font-medium text-gray-700">
                      {metric.unit}
                      {metric.target.toLocaleString()}
                    </div>
                    <div
                      className={`text-xs ${metric.value >= metric.target ? 'text-success-600' : 'text-warning-600'}`}
                    >
                      {((metric.value / metric.target) * 100).toFixed(1)}%
                    </div>
                  </div>
                )}
              </div>

              <div className="p-3 bg-primary-50 rounded border border-primary-200">
                <div className="text-xs text-primary-600 font-medium mb-1">
                  Wedding Context:
                </div>
                <div className="text-sm text-primary-700">
                  {metric.weddingContext}
                </div>
              </div>

              {metric.target && (
                <div className="mt-3">
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${metric.value >= metric.target ? 'bg-success-500' : 'bg-primary-500'}`}
                      style={{
                        width: `${Math.min((metric.value / metric.target) * 100, 100)}%`,
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* User Growth Analysis */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-xs p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-6">
          User Growth & Engagement
        </h3>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {userGrowth.map((user) => (
            <div
              key={user.userType}
              className="border border-gray-200 rounded-lg p-4"
            >
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-lg font-semibold text-gray-900 capitalize">
                  {user.userType}
                </h4>
                <div className="flex items-center justify-center w-10 h-10 bg-primary-100 rounded-lg">
                  {user.userType === 'couples' && (
                    <HeartIcon className="w-5 h-5 text-primary-600" />
                  )}
                  {user.userType === 'suppliers' && (
                    <BuildingStorefrontIcon className="w-5 h-5 text-primary-600" />
                  )}
                  {user.userType === 'venues' && (
                    <CalendarDaysIcon className="w-5 h-5 text-primary-600" />
                  )}
                </div>
              </div>

              <div className="space-y-3 mb-4">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Active Users:</span>
                  <span className="text-sm font-semibold text-gray-900">
                    {user.current.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Growth Rate:</span>
                  <span
                    className={`text-sm font-semibold ${user.growth > 0 ? 'text-success-700' : 'text-error-700'}`}
                  >
                    {user.growth > 0 ? '+' : ''}
                    {user.growth.toFixed(1)}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Churn Rate:</span>
                  <span
                    className={`text-sm font-semibold ${user.churnRate < 15 ? 'text-success-700' : 'text-warning-700'}`}
                  >
                    {user.churnRate.toFixed(1)}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Conversion:</span>
                  <span className="text-sm font-semibold text-blue-700">
                    {user.conversionRate.toFixed(1)}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Avg LTV:</span>
                  <span className="text-sm font-semibold text-primary-700">
                    £{user.avgLifetimeValue.toLocaleString()}
                  </span>
                </div>
              </div>

              <div className="p-3 bg-blue-50 rounded border border-blue-200">
                <div className="text-xs text-blue-600 font-medium mb-1">
                  Seasonality:
                </div>
                <div className="text-sm text-blue-700">
                  {user.weddingSeasonality}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Wedding Pipeline */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-xs">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            Wedding Booking Pipeline
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            Customer journey from inquiry to booked wedding
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Pipeline Stage
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Count
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total Value
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Avg Days
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Conversion Rate
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {weddingPipeline.map((stage, index) => (
                <tr key={stage.stage} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center mr-3">
                        <span className="text-sm font-semibold text-primary-600">
                          {index + 1}
                        </span>
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {stage.stage}
                        </div>
                        {stage.criticalPath && (
                          <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-error-100 text-error-700 mt-1">
                            Critical Path
                          </span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {stage.count.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatCurrency(stage.value)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {stage.avgDaysInStage}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`text-sm font-medium ${stage.conversionRate >= 70 ? 'text-success-600' : stage.conversionRate >= 50 ? 'text-warning-600' : 'text-error-600'}`}
                    >
                      {stage.conversionRate.toFixed(1)}%
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        stage.conversionRate >= 70
                          ? 'bg-success-100 text-success-700'
                          : stage.conversionRate >= 50
                            ? 'bg-warning-100 text-warning-700'
                            : 'bg-error-100 text-error-700'
                      }`}
                    >
                      {stage.conversionRate >= 70
                        ? 'Healthy'
                        : stage.conversionRate >= 50
                          ? 'Needs Attention'
                          : 'Critical'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Market Analysis */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-xs p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-6">
          Market Category Performance
        </h3>

        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {marketMetrics.map((market) => (
            <div
              key={market.category}
              className="border border-gray-200 rounded-lg p-4"
            >
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-lg font-semibold text-gray-900">
                  {market.category}
                </h4>
                <span
                  className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getSeasonalTrendColor(market.seasonalTrend)}`}
                >
                  {market.seasonalTrend === 'peak'
                    ? 'Peak Season'
                    : market.seasonalTrend === 'low'
                      ? 'Low Season'
                      : 'Normal'}
                </span>
              </div>

              <div className="space-y-2 mb-4">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Bookings:</span>
                  <span className="text-sm font-medium text-gray-900">
                    {market.bookingVolume}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Avg Value:</span>
                  <span className="text-sm font-medium text-gray-900">
                    £{market.avgBookingValue.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Market Share:</span>
                  <span className="text-sm font-medium text-primary-700">
                    {market.marketShare.toFixed(1)}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Total Revenue:</span>
                  <span className="text-sm font-semibold text-success-700">
                    {formatCurrency(
                      market.bookingVolume * market.avgBookingValue,
                    )}
                  </span>
                </div>
              </div>

              <div className="p-3 bg-gray-50 rounded border border-gray-200">
                <div className="text-xs text-gray-600 font-medium mb-2">
                  Top Regions:
                </div>
                <div className="flex flex-wrap gap-1">
                  {market.topRegions.map((region, index) => (
                    <span
                      key={region}
                      className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-700"
                    >
                      {region}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Wedding Industry Insights */}
      <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl border border-purple-200 p-6">
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0">
            <PresentationChartLineIcon className="w-6 h-6 text-purple-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-purple-900 mb-2">
              Wedding Industry Insights
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-purple-800">
              <div>
                <h4 className="font-semibold mb-2">Revenue Opportunities:</h4>
                <ul className="space-y-1">
                  <li>
                    • Peak wedding season (Apr-Oct) shows 65% revenue increase
                  </li>
                  <li>
                    • Venue bookings have highest LTV but longest sales cycles
                  </li>
                  <li>
                    • Photography services show strongest conversion rates
                  </li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Growth Strategies:</h4>
                <ul className="space-y-1">
                  <li>• Winter months offer acquisition cost advantages</li>
                  <li>• Regional expansion beyond London showing promise</li>
                  <li>• Supplier retention programs reducing churn by 40%</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
