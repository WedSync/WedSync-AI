'use client';

// WS-195: CAC Analysis Panel Component
// Customer Acquisition Cost tracking with channel attribution and wedding industry insights

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { CACAnalysisProps, CACChannelData } from '@/types/business-metrics';
import { MetricsCard } from '@/components/business/metrics/MetricsCard';
import {
  Target,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Users,
  Calendar,
  Search,
  Facebook,
  Instagram,
  Mail,
  Phone,
  Globe,
  UserPlus,
  ArrowUpRight,
  ArrowDownRight,
  BarChart3,
} from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * CAC Analysis Panel Component
 * Comprehensive Customer Acquisition Cost analysis for wedding marketplace
 * Features:
 * - Channel-specific CAC tracking and performance analysis
 * - LTV:CAC ratio monitoring for profitability assessment
 * - Wedding industry context with supplier type breakdowns
 * - ROI analysis and payback period calculations
 * - Channel optimization recommendations
 */
export function CACAnalysisPanel({
  cacMetrics,
  timeRange,
  showChannelBreakdown,
  onChannelSelect,
}: CACAnalysisProps) {
  const [selectedView, setSelectedView] = useState<
    'overview' | 'channels' | 'roi' | 'optimization'
  >('overview');
  const [selectedChannel, setSelectedChannel] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'cac' | 'roi' | 'volume'>('cac');

  // Calculate CAC insights
  const cacInsights = useMemo(() => {
    const { overall, byChannel, ltv, ltvCacRatio, paybackPeriod, trend } =
      cacMetrics;

    const channelData = Object.entries(byChannel);
    const bestChannel = channelData.reduce(
      (best, [channel, data]) =>
        data.cac < best.data.cac ? { channel, data } : best,
      { channel: channelData[0][0], data: channelData[0][1] },
    );

    const worstChannel = channelData.reduce(
      (worst, [channel, data]) =>
        data.cac > worst.data.cac ? { channel, data } : worst,
      { channel: channelData[0][0], data: channelData[0][1] },
    );

    const totalConversions = channelData.reduce(
      (sum, [_, data]) => sum + data.conversions,
      0,
    );
    const weightedAverageROI =
      channelData.reduce(
        (sum, [_, data]) => sum + data.roi * data.conversions,
        0,
      ) / totalConversions;

    const healthStatus =
      ltvCacRatio >= 5
        ? 'excellent'
        : ltvCacRatio >= 3
          ? 'healthy'
          : ltvCacRatio >= 2
            ? 'concerning'
            : 'critical';

    return {
      bestChannel,
      worstChannel,
      totalConversions,
      weightedAverageROI,
      healthStatus,
      efficiencyScore: Math.min((ltvCacRatio / 5) * 100, 100),
    };
  }, [cacMetrics]);

  // Get channel icon
  const getChannelIcon = (channel: string) => {
    const channelLower = channel.toLowerCase();
    if (channelLower.includes('google') || channelLower.includes('search'))
      return <Search className="w-4 h-4" />;
    if (channelLower.includes('facebook'))
      return <Facebook className="w-4 h-4" />;
    if (channelLower.includes('instagram'))
      return <Instagram className="w-4 h-4" />;
    if (channelLower.includes('email')) return <Mail className="w-4 h-4" />;
    if (channelLower.includes('sms')) return <Phone className="w-4 h-4" />;
    if (channelLower.includes('organic') || channelLower.includes('seo'))
      return <Globe className="w-4 h-4" />;
    return <Users className="w-4 h-4" />;
  };

  // Format currency
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Format percentage
  const formatPercentage = (value: number): string => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;
  };

  // Get ROI status color
  const getROIColor = (roi: number): string => {
    if (roi >= 400) return 'text-green-600 bg-green-50';
    if (roi >= 300) return 'text-blue-600 bg-blue-50';
    if (roi >= 200) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  };

  // Sort channels by selected criteria
  const sortedChannels = useMemo(() => {
    const channels = Object.entries(cacMetrics.byChannel);

    return channels.sort(([, a], [, b]) => {
      switch (sortBy) {
        case 'cac':
          return a.cac - b.cac; // Lower CAC is better
        case 'roi':
          return b.roi - a.roi; // Higher ROI is better
        case 'volume':
          return b.conversions - a.conversions; // Higher volume first
        default:
          return a.cac - b.cac;
      }
    });
  }, [cacMetrics.byChannel, sortBy]);

  return (
    <div className="space-y-6">
      {/* Header Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricsCard
          title="Overall CAC"
          value={cacMetrics.overall}
          format="currency"
          change={cacMetrics.trend}
          changeType={cacMetrics.trend < 0 ? 'positive' : 'negative'}
          status={
            cacMetrics.overall < 100
              ? 'excellent'
              : cacMetrics.overall < 200
                ? 'healthy'
                : 'concerning'
          }
          weddingContext="Average cost to acquire wedding supplier"
        />

        <MetricsCard
          title="LTV:CAC Ratio"
          value={cacMetrics.ltvCacRatio}
          format="number"
          change={12.5}
          changeType="positive"
          status={cacInsights.healthStatus as any}
          weddingContext={`${cacMetrics.paybackPeriod} month payback period`}
        />

        <MetricsCard
          title="Best Channel CAC"
          value={cacInsights.bestChannel.data.cac}
          format="currency"
          change={-15.2}
          changeType="positive"
          status="excellent"
          weddingContext={`${cacInsights.bestChannel.channel} outperforming`}
        />

        <MetricsCard
          title="Average ROI"
          value={cacInsights.weightedAverageROI}
          format="percentage"
          change={22.8}
          changeType="positive"
          status="healthy"
          weddingContext="Return on acquisition investment"
        />
      </div>

      {/* View Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex flex-wrap gap-2">
          <Button
            variant={selectedView === 'overview' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedView('overview')}
          >
            <BarChart3 className="w-4 h-4 mr-2" />
            Overview
          </Button>
          <Button
            variant={selectedView === 'channels' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedView('channels')}
          >
            <Target className="w-4 h-4 mr-2" />
            Channels
          </Button>
          <Button
            variant={selectedView === 'roi' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedView('roi')}
          >
            <TrendingUp className="w-4 h-4 mr-2" />
            ROI Analysis
          </Button>
          <Button
            variant={selectedView === 'optimization' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedView('optimization')}
          >
            <Target className="w-4 h-4 mr-2" />
            Optimization
          </Button>
        </div>

        <div className="flex items-center gap-3">
          <Select
            value={sortBy}
            onValueChange={(value) => setSortBy(value as any)}
          >
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="cac">Sort by CAC</SelectItem>
              <SelectItem value="roi">Sort by ROI</SelectItem>
              <SelectItem value="volume">Sort by Volume</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Main Content */}
      {selectedView === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* CAC Health Status */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="w-5 h-5 text-blue-600" />
                Acquisition Efficiency
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center">
                <div
                  className={cn(
                    'text-3xl font-bold mb-2',
                    cacInsights.healthStatus === 'excellent'
                      ? 'text-green-600'
                      : cacInsights.healthStatus === 'healthy'
                        ? 'text-blue-600'
                        : cacInsights.healthStatus === 'concerning'
                          ? 'text-yellow-600'
                          : 'text-red-600',
                  )}
                >
                  {cacMetrics.ltvCacRatio.toFixed(1)}:1
                </div>
                <Badge
                  className={cn(
                    cacInsights.healthStatus === 'excellent'
                      ? 'bg-green-100 text-green-800'
                      : cacInsights.healthStatus === 'healthy'
                        ? 'bg-blue-100 text-blue-800'
                        : cacInsights.healthStatus === 'concerning'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-red-100 text-red-800',
                  )}
                >
                  LTV to CAC Ratio
                </Badge>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span>Customer Lifetime Value</span>
                  <span className="font-medium">
                    {formatCurrency(cacMetrics.ltv)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Average Acquisition Cost</span>
                  <span className="font-medium">
                    {formatCurrency(cacMetrics.overall)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Payback Period</span>
                  <span className="font-medium">
                    {cacMetrics.paybackPeriod} months
                  </span>
                </div>
              </div>

              <Progress value={cacInsights.efficiencyScore} className="h-2" />

              <div className="text-xs text-center text-gray-500">
                {cacInsights.efficiencyScore.toFixed(0)}% efficiency score
              </div>
            </CardContent>
          </Card>

          {/* Channel Performance Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5 text-green-600" />
                Channel Performance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {sortedChannels.slice(0, 5).map(([channel, data]) => (
                  <div
                    key={channel}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-md cursor-pointer hover:bg-gray-100 transition-colors"
                    onClick={() => onChannelSelect(channel)}
                  >
                    <div className="flex items-center gap-3">
                      {getChannelIcon(channel)}
                      <div>
                        <div className="font-medium capitalize">
                          {channel.replace('_', ' ')}
                        </div>
                        <div className="text-sm text-gray-600">
                          {data.conversions} conversions
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="font-bold">
                        {formatCurrency(data.cac)}
                      </div>
                      <div
                        className={cn(
                          'text-xs px-2 py-1 rounded',
                          getROIColor(data.roi),
                        )}
                      >
                        {formatPercentage(data.roi)} ROI
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {selectedView === 'channels' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="w-5 h-5 text-blue-600" />
              Channel Breakdown Analysis
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {sortedChannels.map(([channel, data]) => (
                <div
                  key={channel}
                  className="p-4 border rounded-lg hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => onChannelSelect(channel)}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      {getChannelIcon(channel)}
                      <h4 className="font-medium capitalize">
                        {channel.replace('_', ' ')}
                      </h4>
                    </div>
                    <ArrowUpRight className="w-4 h-4 text-gray-400" />
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">CAC</span>
                      <span className="font-bold">
                        {formatCurrency(data.cac)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">ROI</span>
                      <span
                        className={cn(
                          'font-bold',
                          data.roi >= 300
                            ? 'text-green-600'
                            : data.roi >= 200
                              ? 'text-blue-600'
                              : data.roi >= 100
                                ? 'text-yellow-600'
                                : 'text-red-600',
                        )}
                      >
                        {formatPercentage(data.roi)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Conversions</span>
                      <span className="font-medium">{data.conversions}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Total Cost</span>
                      <span className="font-medium">
                        {formatCurrency(data.cost)}
                      </span>
                    </div>
                  </div>

                  <div className="mt-3 p-2 bg-gray-50 rounded text-xs text-gray-600 italic">
                    {data.weddingContext}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {selectedView === 'roi' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-green-600" />
                ROI Performance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {sortedChannels
                  .sort(([, a], [, b]) => b.roi - a.roi)
                  .map(([channel, data]) => (
                    <div key={channel} className="space-y-2">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          {getChannelIcon(channel)}
                          <span className="font-medium capitalize">
                            {channel.replace('_', ' ')}
                          </span>
                        </div>
                        <span
                          className={cn(
                            'font-bold',
                            data.roi >= 400
                              ? 'text-green-600'
                              : data.roi >= 300
                                ? 'text-blue-600'
                                : data.roi >= 200
                                  ? 'text-yellow-600'
                                  : 'text-red-600',
                          )}
                        >
                          {formatPercentage(data.roi)}
                        </span>
                      </div>

                      <Progress
                        value={Math.min((data.roi / 500) * 100, 100)}
                        className="h-2"
                      />

                      <div className="flex justify-between text-xs text-gray-500">
                        <span>{formatCurrency(data.cost)} spent</span>
                        <span>{data.conversions} conversions</span>
                      </div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-purple-600" />
                Profitability Analysis
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">
                    {
                      Object.entries(cacMetrics.byChannel).filter(
                        ([, data]) => data.roi >= 300,
                      ).length
                    }
                  </div>
                  <div className="text-sm text-green-700">
                    High ROI Channels
                  </div>
                  <div className="text-xs text-green-600">≥300% ROI</div>
                </div>

                <div className="text-center p-4 bg-red-50 rounded-lg">
                  <div className="text-2xl font-bold text-red-600">
                    {
                      Object.entries(cacMetrics.byChannel).filter(
                        ([, data]) => data.roi < 200,
                      ).length
                    }
                  </div>
                  <div className="text-sm text-red-700">Underperforming</div>
                  <div className="text-xs text-red-600">&lt;200% ROI</div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm">Total Marketing Spend</span>
                  <span className="font-medium">
                    {formatCurrency(
                      Object.values(cacMetrics.byChannel).reduce(
                        (sum, data) => sum + data.cost,
                        0,
                      ),
                    )}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Total Conversions</span>
                  <span className="font-medium">
                    {cacInsights.totalConversions}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Blended CAC</span>
                  <span className="font-medium">
                    {formatCurrency(cacMetrics.overall)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {selectedView === 'optimization' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="w-5 h-5 text-orange-600" />
              Optimization Recommendations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* High Performers */}
              <div>
                <h4 className="font-medium text-green-700 mb-3 flex items-center gap-2">
                  <ArrowUpRight className="w-4 h-4" />
                  Scale These Channels
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {sortedChannels
                    .filter(
                      ([, data]) =>
                        data.roi >= 300 && data.cac < cacMetrics.overall,
                    )
                    .slice(0, 4)
                    .map(([channel, data]) => (
                      <div
                        key={channel}
                        className="p-3 bg-green-50 border border-green-200 rounded-md"
                      >
                        <div className="flex items-center gap-2 mb-2">
                          {getChannelIcon(channel)}
                          <span className="font-medium capitalize">
                            {channel.replace('_', ' ')}
                          </span>
                        </div>
                        <div className="text-sm text-green-700">
                          Low CAC ({formatCurrency(data.cac)}) with high ROI (
                          {formatPercentage(data.roi)})
                        </div>
                        <div className="text-xs text-green-600 mt-1 italic">
                          {data.weddingContext}
                        </div>
                      </div>
                    ))}
                </div>
              </div>

              {/* Needs Attention */}
              <div>
                <h4 className="font-medium text-yellow-700 mb-3 flex items-center gap-2">
                  <TrendingDown className="w-4 h-4" />
                  Optimize or Reduce
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {sortedChannels
                    .filter(
                      ([, data]) =>
                        data.roi < 200 || data.cac > cacMetrics.overall * 1.5,
                    )
                    .slice(0, 4)
                    .map(([channel, data]) => (
                      <div
                        key={channel}
                        className="p-3 bg-yellow-50 border border-yellow-200 rounded-md"
                      >
                        <div className="flex items-center gap-2 mb-2">
                          {getChannelIcon(channel)}
                          <span className="font-medium capitalize">
                            {channel.replace('_', ' ')}
                          </span>
                        </div>
                        <div className="text-sm text-yellow-700">
                          {data.roi < 200 ? 'Low ROI' : 'High CAC'}(
                          {formatCurrency(data.cac)} CAC,{' '}
                          {formatPercentage(data.roi)} ROI)
                        </div>
                        <div className="text-xs text-yellow-600 mt-1 italic">
                          Consider optimization or budget reallocation
                        </div>
                      </div>
                    ))}
                </div>
              </div>

              {/* Action Items */}
              <div>
                <h4 className="font-medium text-blue-700 mb-3">
                  Recommended Actions
                </h4>
                <div className="space-y-2">
                  <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-md">
                    <UserPlus className="w-5 h-5 text-blue-600 mt-0.5" />
                    <div>
                      <div className="font-medium text-blue-900">
                        Increase budget for high-performing channels
                      </div>
                      <div className="text-sm text-blue-700">
                        Allocate more budget to channels with ROI &gt; 300% and
                        CAC below average
                      </div>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-md">
                    <Target className="w-5 h-5 text-blue-600 mt-0.5" />
                    <div>
                      <div className="font-medium text-blue-900">
                        Test wedding season targeting
                      </div>
                      <div className="text-sm text-blue-700">
                        Leverage seasonal patterns to improve conversion rates
                        during peak booking periods
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default CACAnalysisPanel;
