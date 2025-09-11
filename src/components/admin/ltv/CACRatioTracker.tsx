'use client';

import React, { useState, useMemo } from 'react';
import {
  Target,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Calendar,
  Zap,
  AlertTriangle,
  CheckCircle,
  ArrowUpRight,
  ArrowDownRight,
  Calculator,
  Settings,
  Download,
  RefreshCw,
  Filter,
  BarChart3,
} from 'lucide-react';
import { format, subMonths } from 'date-fns';
import {
  ChannelCACData,
  LTVCACRatio,
  RatioThreshold,
  PaybackAnalysis,
  ChannelCACRatio,
} from '@/types/ltv-analytics';

interface CACRatioTrackerProps {
  channelCAC: ChannelCACData[];
  ltvCacRatios: LTVCACRatio[];
  targetThresholds: RatioThreshold[];
  paybackPeriods: PaybackAnalysis[];
  onRefresh?: () => void;
  onExport?: () => void;
  onUpdateThreshold?: (threshold: RatioThreshold) => void;
}

interface ChannelPerformanceCardProps {
  channel: ChannelCACData;
  ltvRatio: LTVCACRatio;
  threshold: RatioThreshold;
  payback: PaybackAnalysis;
  isSelected: boolean;
  onSelect: () => void;
}

const ChannelPerformanceCard: React.FC<ChannelPerformanceCardProps> = ({
  channel,
  ltvRatio,
  threshold,
  payback,
  isSelected,
  onSelect,
}) => {
  const getPerformanceStatus = (ratio: number, threshold: RatioThreshold) => {
    if (ratio >= threshold.targetRatio) {
      return {
        status: 'excellent',
        color: 'text-success-600 bg-success-50 border-success-200',
        label: 'Excellent',
      };
    } else if (ratio >= threshold.minRatio) {
      return {
        status: 'good',
        color: 'text-blue-600 bg-blue-50 border-blue-200',
        label: 'Good',
      };
    } else if (ratio >= threshold.minRatio * 0.8) {
      return {
        status: 'warning',
        color: 'text-warning-600 bg-warning-50 border-warning-200',
        label: 'Needs Attention',
      };
    } else {
      return {
        status: 'poor',
        color: 'text-error-600 bg-error-50 border-error-200',
        label: 'Poor',
      };
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'improving':
        return <ArrowUpRight className="h-4 w-4 text-success-600" />;
      case 'declining':
        return <ArrowDownRight className="h-4 w-4 text-error-600" />;
      default:
        return <div className="h-4 w-4" />;
    }
  };

  const performance = getPerformanceStatus(ltvRatio.ratio, threshold);
  const isPaybackHealthy = payback.isAcceptable;

  const getChannelTypeColor = (channelType: string) => {
    const colors = {
      organic: 'bg-green-100 text-green-800',
      paid_search: 'bg-blue-100 text-blue-800',
      social_media: 'bg-purple-100 text-purple-800',
      referral: 'bg-orange-100 text-orange-800',
      direct: 'bg-gray-100 text-gray-800',
      partnership: 'bg-indigo-100 text-indigo-800',
    };
    return (
      colors[channelType as keyof typeof colors] || 'bg-gray-100 text-gray-800'
    );
  };

  return (
    <div
      onClick={onSelect}
      className={`p-6 rounded-xl border cursor-pointer transition-all duration-200 ${
        isSelected
          ? 'border-primary-300 bg-primary-50 shadow-md'
          : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <h3 className="font-semibold text-gray-900 capitalize">
            {channel.channel}
          </h3>
          <div className="flex items-center space-x-1">
            {getTrendIcon(channel.trend)}
            <span
              className={`text-xs font-medium ${
                channel.trend === 'improving'
                  ? 'text-success-600'
                  : channel.trend === 'declining'
                    ? 'text-error-600'
                    : 'text-gray-500'
              }`}
            >
              {channel.efficiency.toFixed(1)}% eff.
            </span>
          </div>
        </div>
        <span
          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${performance.color}`}
        >
          {performance.label}
        </span>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <div className="text-2xl font-bold text-gray-900">
            {ltvRatio.ratio.toFixed(1)}:1
          </div>
          <div className="text-sm text-gray-600">LTV:CAC Ratio</div>
          <div className="text-xs text-gray-500">
            Target: {threshold.targetRatio.toFixed(1)}:1
          </div>
        </div>
        <div>
          <div className="text-2xl font-bold text-gray-900">
            ${channel.cac.toLocaleString()}
          </div>
          <div className="text-sm text-gray-600">CAC</div>
          <div className="text-xs text-gray-500">
            {channel.customersAcquired} customers
          </div>
        </div>
      </div>

      {/* Progress Bars */}
      <div className="space-y-3 mb-4">
        {/* LTV:CAC Ratio Progress */}
        <div>
          <div className="flex justify-between text-sm mb-1">
            <span className="text-gray-600">LTV:CAC Performance</span>
            <span className="font-medium">
              {((ltvRatio.ratio / threshold.targetRatio) * 100).toFixed(0)}%
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all duration-300 ${
                ltvRatio.ratio >= threshold.targetRatio
                  ? 'bg-success-500'
                  : ltvRatio.ratio >= threshold.minRatio
                    ? 'bg-blue-500'
                    : 'bg-error-500'
              }`}
              style={{
                width: `${Math.min((ltvRatio.ratio / threshold.targetRatio) * 100, 100)}%`,
              }}
            />
          </div>
        </div>

        {/* Payback Period */}
        <div>
          <div className="flex justify-between text-sm mb-1">
            <span className="text-gray-600">Payback Period</span>
            <span
              className={`font-medium ${isPaybackHealthy ? 'text-success-600' : 'text-error-600'}`}
            >
              {payback.paybackPeriod.toFixed(1)} mo
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all duration-300 ${
                isPaybackHealthy ? 'bg-success-500' : 'bg-error-500'
              }`}
              style={{
                width: `${Math.min((payback.targetPayback / payback.paybackPeriod) * 100, 100)}%`,
              }}
            />
          </div>
        </div>
      </div>

      {/* Bottom Stats */}
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center space-x-2">
          <DollarSign className="h-4 w-4 text-gray-400" />
          <span className="text-gray-600">
            ${channel.monthlySpend.toLocaleString()}/mo
          </span>
        </div>
        <div className="flex items-center space-x-2">
          <Calendar className="h-4 w-4 text-gray-400" />
          <span className="text-gray-600">
            ${payback.monthlyContribution.toLocaleString()}/mo
          </span>
        </div>
      </div>
    </div>
  );
};

interface ROICalculatorProps {
  selectedChannel: ChannelCACData | null;
  ltvRatio: LTVCACRatio | null;
  payback: PaybackAnalysis | null;
  onBudgetChange: (newBudget: number) => void;
}

const ROICalculator: React.FC<ROICalculatorProps> = ({
  selectedChannel,
  ltvRatio,
  payback,
  onBudgetChange,
}) => {
  const [budgetInput, setBudgetInput] = useState(
    selectedChannel?.monthlySpend || 10000,
  );
  const [timeframe, setTimeframe] = useState(12); // months

  const calculations = useMemo(() => {
    if (!selectedChannel || !ltvRatio || !payback) {
      return {
        estimatedCustomers: 0,
        totalRevenue: 0,
        totalCost: 0,
        netProfit: 0,
        roi: 0,
        breakEvenMonth: 0,
      };
    }

    const totalBudget = budgetInput * timeframe;
    const estimatedCustomers = Math.floor(totalBudget / selectedChannel.cac);
    const totalRevenue = estimatedCustomers * ltvRatio.ltv;
    const netProfit = totalRevenue - totalBudget;
    const roi = totalBudget > 0 ? (netProfit / totalBudget) * 100 : 0;
    const breakEvenMonth = payback.paybackPeriod;

    return {
      estimatedCustomers,
      totalRevenue,
      totalCost: totalBudget,
      netProfit,
      roi,
      breakEvenMonth,
    };
  }, [selectedChannel, ltvRatio, payback, budgetInput, timeframe]);

  if (!selectedChannel) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <div className="text-center py-8">
          <Calculator className="h-12 w-12 text-gray-400 mx-auto mb-3" />
          <h3 className="font-semibold text-gray-900 mb-1">ROI Calculator</h3>
          <p className="text-sm text-gray-600">
            Select a channel to calculate projected ROI
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="font-semibold text-gray-900">ROI Calculator</h3>
        <div className="text-sm text-gray-600 capitalize">
          {selectedChannel.channel} Channel
        </div>
      </div>

      {/* Input Controls */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Monthly Budget
          </label>
          <div className="relative">
            <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="number"
              value={budgetInput}
              onChange={(e) => {
                const value = Number(e.target.value);
                setBudgetInput(value);
                onBudgetChange(value);
              }}
              className="pl-10 pr-4 py-2.5 w-full bg-white border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-4 focus:ring-primary-100 focus:border-primary-300"
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Timeframe (Months)
          </label>
          <select
            value={timeframe}
            onChange={(e) => setTimeframe(Number(e.target.value))}
            className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-4 focus:ring-primary-100 focus:border-primary-300"
          >
            <option value={3}>3 Months</option>
            <option value={6}>6 Months</option>
            <option value={12}>12 Months</option>
            <option value={24}>24 Months</option>
            <option value={36}>36 Months</option>
          </select>
        </div>
      </div>

      {/* Results Grid */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="text-2xl font-bold text-gray-900">
            {calculations.estimatedCustomers.toLocaleString()}
          </div>
          <div className="text-sm text-gray-600">Estimated Customers</div>
        </div>
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="text-2xl font-bold text-gray-900">
            ${calculations.totalRevenue.toLocaleString()}
          </div>
          <div className="text-sm text-gray-600">Total Revenue</div>
        </div>
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="text-2xl font-bold text-gray-900">
            ${calculations.totalCost.toLocaleString()}
          </div>
          <div className="text-sm text-gray-600">Total Investment</div>
        </div>
        <div
          className={`rounded-lg p-4 ${calculations.netProfit >= 0 ? 'bg-success-50' : 'bg-error-50'}`}
        >
          <div
            className={`text-2xl font-bold ${calculations.netProfit >= 0 ? 'text-success-700' : 'text-error-700'}`}
          >
            ${calculations.netProfit.toLocaleString()}
          </div>
          <div className="text-sm text-gray-600">Net Profit</div>
        </div>
      </div>

      {/* ROI Summary */}
      <div className="border-t border-gray-100 pt-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-lg font-semibold text-gray-900">
              ROI: {calculations.roi.toFixed(1)}%
            </div>
            <div className="text-sm text-gray-600">
              Break-even: {calculations.breakEvenMonth.toFixed(1)} months
            </div>
          </div>
          <div
            className={`px-4 py-2 rounded-lg ${
              calculations.roi >= 100
                ? 'bg-success-100 text-success-800'
                : calculations.roi >= 50
                  ? 'bg-blue-100 text-blue-800'
                  : calculations.roi >= 0
                    ? 'bg-warning-100 text-warning-800'
                    : 'bg-error-100 text-error-800'
            }`}
          >
            {calculations.roi >= 100
              ? 'Excellent'
              : calculations.roi >= 50
                ? 'Good'
                : calculations.roi >= 0
                  ? 'Marginal'
                  : 'Loss'}
          </div>
        </div>
      </div>
    </div>
  );
};

interface ThresholdManagerProps {
  thresholds: RatioThreshold[];
  onUpdateThreshold: (threshold: RatioThreshold) => void;
}

const ThresholdManager: React.FC<ThresholdManagerProps> = ({
  thresholds,
  onUpdateThreshold,
}) => {
  const [editingThreshold, setEditingThreshold] = useState<string | null>(null);

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-900">Performance Thresholds</h3>
        <Settings className="h-5 w-5 text-gray-400" />
      </div>

      <div className="space-y-3">
        {thresholds.map((threshold) => (
          <div
            key={`${threshold.segmentType}-${threshold.channel}`}
            className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
          >
            <div>
              <div className="font-medium text-gray-900 capitalize">
                {threshold.channel} - {threshold.segmentType.replace('_', ' ')}
              </div>
              <div className="text-sm text-gray-600">
                Min: {threshold.minRatio.toFixed(1)}:1, Target:{' '}
                {threshold.targetRatio.toFixed(1)}:1
              </div>
            </div>
            <div
              className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                threshold.alertLevel === 'green'
                  ? 'bg-success-100 text-success-800'
                  : threshold.alertLevel === 'yellow'
                    ? 'bg-warning-100 text-warning-800'
                    : 'bg-error-100 text-error-800'
              }`}
            >
              {threshold.alertLevel}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export const CACRatioTracker: React.FC<CACRatioTrackerProps> = ({
  channelCAC,
  ltvCacRatios,
  targetThresholds,
  paybackPeriods,
  onRefresh,
  onExport,
  onUpdateThreshold,
}) => {
  const [selectedChannelId, setSelectedChannelId] = useState<string>('');
  const [filterAlert, setFilterAlert] = useState<
    'all' | 'green' | 'yellow' | 'red'
  >('all');
  const [sortBy, setSortBy] = useState<
    'ratio' | 'cac' | 'efficiency' | 'payback'
  >('ratio');

  // Combine channel data with ratios and payback info
  const enrichedChannels = useMemo(() => {
    return channelCAC
      .map((channel) => {
        const ltvRatio = ltvCacRatios.find(
          (r) => r.channel === channel.channel,
        ) || {
          segmentId: '',
          channel: channel.channel,
          ltv: 0,
          cac: channel.cac,
          ratio: 0,
          isHealthy: false,
          targetRatio: 5,
          variance: 0,
        };

        const threshold = targetThresholds.find(
          (t) => t.channel === channel.channel,
        ) || {
          segmentType: 'all',
          channel: channel.channel,
          minRatio: 3,
          targetRatio: 5,
          maxRatio: 10,
          alertLevel: 'red' as const,
        };

        const payback = paybackPeriods.find(
          (p) => p.channel === channel.channel,
        ) || {
          segmentId: '',
          channel: channel.channel,
          paybackPeriod: 12,
          isAcceptable: false,
          targetPayback: 6,
          variance: 0,
          monthlyContribution: 0,
        };

        return {
          channel,
          ltvRatio,
          threshold,
          payback,
        };
      })
      .filter((item) => {
        if (filterAlert === 'all') return true;
        return item.threshold.alertLevel === filterAlert;
      })
      .sort((a, b) => {
        switch (sortBy) {
          case 'ratio':
            return b.ltvRatio.ratio - a.ltvRatio.ratio;
          case 'cac':
            return a.channel.cac - b.channel.cac;
          case 'efficiency':
            return b.channel.efficiency - a.channel.efficiency;
          case 'payback':
            return a.payback.paybackPeriod - b.payback.paybackPeriod;
          default:
            return 0;
        }
      });
  }, [
    channelCAC,
    ltvCacRatios,
    targetThresholds,
    paybackPeriods,
    filterAlert,
    sortBy,
  ]);

  const selectedChannelData = enrichedChannels.find(
    (item) => item.channel.channel === selectedChannelId,
  );

  // Summary statistics
  const summaryStats = useMemo(() => {
    const totalSpend = channelCAC.reduce((sum, c) => sum + c.monthlySpend, 0);
    const totalCustomers = channelCAC.reduce(
      (sum, c) => sum + c.customersAcquired,
      0,
    );
    const avgRatio =
      ltvCacRatios.reduce((sum, r) => sum + r.ratio, 0) / ltvCacRatios.length ||
      0;
    const healthyChannels = ltvCacRatios.filter((r) => r.isHealthy).length;

    return {
      totalSpend,
      totalCustomers,
      avgRatio,
      healthyChannels,
      totalChannels: ltvCacRatios.length,
    };
  }, [channelCAC, ltvCacRatios]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">
            CAC Ratio Tracker
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            Monitor customer acquisition costs and LTV ratios across channels
          </p>
        </div>

        <div className="flex items-center space-x-3">
          {/* Alert Filter */}
          <select
            value={filterAlert}
            onChange={(e) => setFilterAlert(e.target.value as any)}
            className="px-3.5 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 text-sm shadow-xs focus:outline-none focus:ring-4 focus:ring-primary-100 focus:border-primary-300"
          >
            <option value="all">All Alerts</option>
            <option value="green">Healthy</option>
            <option value="yellow">Warning</option>
            <option value="red">Critical</option>
          </select>

          {/* Sort By */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-3.5 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 text-sm shadow-xs focus:outline-none focus:ring-4 focus:ring-primary-100 focus:border-primary-300"
          >
            <option value="ratio">Sort by Ratio</option>
            <option value="cac">Sort by CAC</option>
            <option value="efficiency">Sort by Efficiency</option>
            <option value="payback">Sort by Payback</option>
          </select>

          {/* Export */}
          {onExport && (
            <button
              onClick={onExport}
              className="inline-flex items-center px-4 py-2.5 bg-white border border-gray-300 rounded-lg shadow-xs hover:shadow-sm transition-all duration-200"
            >
              <Download className="h-4 w-4 mr-2 text-gray-500" />
              Export
            </button>
          )}

          {/* Refresh */}
          {onRefresh && (
            <button
              onClick={onRefresh}
              className="inline-flex items-center px-4 py-2.5 bg-primary-600 hover:bg-primary-700 text-white font-semibold text-sm rounded-lg shadow-xs hover:shadow-sm transition-all duration-200"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </button>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-xs">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold text-gray-900">
                ${summaryStats.totalSpend.toLocaleString()}
              </div>
              <div className="text-sm text-gray-600">Total Monthly Spend</div>
            </div>
            <DollarSign className="h-8 w-8 text-primary-600" />
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-xs">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold text-gray-900">
                {summaryStats.totalCustomers.toLocaleString()}
              </div>
              <div className="text-sm text-gray-600">Customers Acquired</div>
            </div>
            <Target className="h-8 w-8 text-blue-600" />
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-xs">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold text-gray-900">
                {summaryStats.avgRatio.toFixed(1)}:1
              </div>
              <div className="text-sm text-gray-600">Average LTV:CAC</div>
            </div>
            <BarChart3 className="h-8 w-8 text-success-600" />
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-xs">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold text-gray-900">
                {summaryStats.healthyChannels}/{summaryStats.totalChannels}
              </div>
              <div className="text-sm text-gray-600">Healthy Channels</div>
            </div>
            <CheckCircle className="h-8 w-8 text-success-600" />
          </div>
        </div>
      </div>

      {/* Channel Performance Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {enrichedChannels.map((item) => (
          <ChannelPerformanceCard
            key={item.channel.channel}
            channel={item.channel}
            ltvRatio={item.ltvRatio}
            threshold={item.threshold}
            payback={item.payback}
            isSelected={selectedChannelId === item.channel.channel}
            onSelect={() =>
              setSelectedChannelId(
                selectedChannelId === item.channel.channel
                  ? ''
                  : item.channel.channel,
              )
            }
          />
        ))}
      </div>

      {/* Bottom Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ROI Calculator */}
        <ROICalculator
          selectedChannel={selectedChannelData?.channel || null}
          ltvRatio={selectedChannelData?.ltvRatio || null}
          payback={selectedChannelData?.payback || null}
          onBudgetChange={(budget) => {
            // Handle budget change for ROI calculation
          }}
        />

        {/* Threshold Manager */}
        {onUpdateThreshold && (
          <ThresholdManager
            thresholds={targetThresholds}
            onUpdateThreshold={onUpdateThreshold}
          />
        )}
      </div>
    </div>
  );
};

export default CACRatioTracker;
