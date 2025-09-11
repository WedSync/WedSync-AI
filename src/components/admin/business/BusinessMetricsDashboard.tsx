'use client';

// WS-195: Business Metrics Dashboard - Main Component
// Real-time business intelligence dashboard for WedSync wedding marketplace
// Tracks MRR, viral growth, CAC, and executive-level business metrics

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  BusinessMetricsDashboardProps,
  BusinessMetrics,
  DateRange,
  MetricStatus,
  RealTimeUpdate,
} from '@/types/business-metrics';
import { MRRTracker } from './MRRTracker';
import { ViralCoefficientAnalyzer } from './ViralCoefficientAnalyzer';
import { CACAnalysisPanel } from './CACAnalysisPanel';
import { ExecutiveReportingInterface } from './ExecutiveReportingInterface';
import { BusinessHealthIndicator } from '@/components/business/metrics/BusinessHealthIndicator';
import { MetricsCard } from '@/components/business/metrics/MetricsCard';
import {
  TrendingUp,
  TrendingDown,
  Users,
  DollarSign,
  Target,
  AlertTriangle,
  Calendar,
  Heart,
  Activity,
  BarChart3,
  RefreshCw,
} from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Main Business Metrics Dashboard Component
 * Provides comprehensive view of WedSync business metrics including:
 * - Monthly Recurring Revenue (MRR) with wedding season analysis
 * - Viral coefficient tracking with vendor referral analysis
 * - Customer Acquisition Cost (CAC) by supplier type and channel
 * - Executive reporting with investor-grade metrics
 * - Business health monitoring with wedding industry KPIs
 */
export function BusinessMetricsDashboard({
  timeRange,
  userRole,
  realTimeUpdates,
  businessMetrics,
  onTimeRangeChange,
  onMetricDrillDown,
}: BusinessMetricsDashboardProps) {
  const [activeTab, setActiveTab] = useState('overview');
  const [isLoading, setIsLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [realtimeData, setRealtimeData] =
    useState<BusinessMetrics>(businessMetrics);

  // Real-time updates handler
  const handleRealTimeUpdate = useCallback((update: RealTimeUpdate) => {
    setRealtimeData((prev) => ({
      ...prev,
      [update.type]: update.data,
    }));
    setLastUpdated(new Date());
  }, []);

  // Initialize real-time connection
  useEffect(() => {
    if (realTimeUpdates) {
      // WebSocket connection would be established here
      console.log('Real-time updates enabled for business metrics');
    }
  }, [realTimeUpdates]);

  // Calculate summary metrics for overview cards
  const summaryMetrics = useMemo(() => {
    const { mrr, viral, cac, health, seasonality } = realtimeData;

    return {
      totalMRR: {
        value: mrr.current,
        change: mrr.growthPercent,
        status:
          mrr.growthPercent > 10
            ? 'excellent'
            : mrr.growthPercent > 5
              ? 'healthy'
              : mrr.growthPercent > 0
                ? 'concerning'
                : 'critical',
        weddingContext: `${seasonality.currentSeason === 'peak' ? 'Peak' : 'Off-peak'} wedding season impact`,
      },
      viralCoefficient: {
        value: viral.coefficient,
        change:
          viral.trend === 'increasing' ? 15 : viral.trend === 'stable' ? 0 : -8,
        status:
          viral.coefficient > 1.2
            ? 'excellent'
            : viral.coefficient > 1.0
              ? 'healthy'
              : viral.coefficient > 0.8
                ? 'concerning'
                : 'critical',
        weddingContext: `Vendor cross-referrals driving ${viral.weddingViralEffects.vendorCrossReferrals}% of growth`,
      },
      totalCAC: {
        value: cac.overall,
        change: cac.trend,
        status:
          cac.ltvCacRatio > 5
            ? 'excellent'
            : cac.ltvCacRatio > 3
              ? 'healthy'
              : cac.ltvCacRatio > 2
                ? 'concerning'
                : 'critical',
        weddingContext: `${cac.paybackPeriod} month payback period`,
      },
      businessHealth: {
        value: health.score,
        change: 5, // This would come from trend calculation
        status: health.status,
        weddingContext: `${health.alerts.filter((a) => a.severity === 'critical').length} critical alerts`,
      },
    };
  }, [realtimeData]);

  // Wedding season status indicator
  const getSeasonStatus = (season: string) => {
    switch (season) {
      case 'peak':
        return {
          color: 'bg-green-100 text-green-800',
          icon: TrendingUp,
          label: 'Peak Wedding Season',
        };
      case 'shoulder':
        return {
          color: 'bg-yellow-100 text-yellow-800',
          icon: Activity,
          label: 'Shoulder Season',
        };
      case 'off_peak':
        return {
          color: 'bg-blue-100 text-blue-800',
          icon: TrendingDown,
          label: 'Off-Peak Season',
        };
      default:
        return {
          color: 'bg-gray-100 text-gray-800',
          icon: Calendar,
          label: 'Unknown Season',
        };
    }
  };

  const seasonStatus = getSeasonStatus(realtimeData.seasonality.currentSeason);
  const SeasonIcon = seasonStatus.icon;

  const handleRefresh = async () => {
    setIsLoading(true);
    try {
      // Trigger data refresh
      await new Promise((resolve) => setTimeout(resolve, 1000));
      setLastUpdated(new Date());
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportReport = (format: string) => {
    console.log(`Exporting business metrics report in ${format} format`);
    // Export functionality would be implemented here
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Business Metrics Dashboard
          </h1>
          <p className="text-gray-600 mt-1">
            Real-time wedding marketplace intelligence and growth analytics
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          {/* Wedding Season Indicator */}
          <Badge className={cn('flex items-center gap-1', seasonStatus.color)}>
            <SeasonIcon className="w-3 h-3" />
            {seasonStatus.label}
          </Badge>

          {/* Refresh Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isLoading}
            className="flex items-center gap-2"
          >
            <RefreshCw className={cn('w-4 h-4', isLoading && 'animate-spin')} />
            Refresh
          </Button>

          {/* Last Updated */}
          <span className="text-sm text-gray-500">
            Updated: {lastUpdated.toLocaleTimeString()}
          </span>
        </div>
      </div>

      {/* Executive Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricsCard
          title="Monthly Recurring Revenue"
          value={summaryMetrics.totalMRR.value}
          change={summaryMetrics.totalMRR.change}
          changeType={
            summaryMetrics.totalMRR.change > 0 ? 'positive' : 'negative'
          }
          format="currency"
          status={summaryMetrics.totalMRR.status}
          weddingContext={summaryMetrics.totalMRR.weddingContext}
          size="large"
        />

        <MetricsCard
          title="Viral Coefficient"
          value={summaryMetrics.viralCoefficient.value}
          change={summaryMetrics.viralCoefficient.change}
          changeType={
            summaryMetrics.viralCoefficient.change > 0 ? 'positive' : 'negative'
          }
          format="number"
          status={summaryMetrics.viralCoefficient.status}
          weddingContext={summaryMetrics.viralCoefficient.weddingContext}
          size="large"
        />

        <MetricsCard
          title="Customer Acquisition Cost"
          value={summaryMetrics.totalCAC.value}
          change={summaryMetrics.totalCAC.change}
          changeType={
            summaryMetrics.totalCAC.change < 0 ? 'positive' : 'negative'
          }
          format="currency"
          status={summaryMetrics.totalCAC.status}
          weddingContext={summaryMetrics.totalCAC.weddingContext}
          size="large"
        />

        <MetricsCard
          title="Business Health Score"
          value={summaryMetrics.businessHealth.value}
          change={summaryMetrics.businessHealth.change}
          changeType={
            summaryMetrics.businessHealth.change > 0 ? 'positive' : 'negative'
          }
          format="percentage"
          status={summaryMetrics.businessHealth.status}
          weddingContext={summaryMetrics.businessHealth.weddingContext}
          size="large"
        />
      </div>

      {/* Main Dashboard Tabs */}
      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="space-y-6"
      >
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="mrr" className="flex items-center gap-2">
            <DollarSign className="w-4 h-4" />
            MRR Analysis
          </TabsTrigger>
          <TabsTrigger value="viral" className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            Viral Growth
          </TabsTrigger>
          <TabsTrigger value="cac" className="flex items-center gap-2">
            <Target className="w-4 h-4" />
            CAC Analysis
          </TabsTrigger>
          <TabsTrigger value="executive" className="flex items-center gap-2">
            <Heart className="w-4 h-4" />
            Executive
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Business Health Indicator */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="w-5 h-5 text-green-600" />
                  Business Health Monitor
                </CardTitle>
              </CardHeader>
              <CardContent>
                <BusinessHealthIndicator
                  healthData={realtimeData.health}
                  showAlerts={true}
                  alertThreshold="warning"
                  onAlertClick={(alert) => console.log('Alert clicked:', alert)}
                />
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  className="w-full justify-start"
                  variant="outline"
                  onClick={() => handleExportReport('pdf')}
                >
                  <BarChart3 className="w-4 h-4 mr-2" />
                  Export Executive Report
                </Button>
                <Button
                  className="w-full justify-start"
                  variant="outline"
                  onClick={() => onMetricDrillDown('mrr', { timeRange })}
                >
                  <DollarSign className="w-4 h-4 mr-2" />
                  Analyze MRR Trends
                </Button>
                <Button
                  className="w-full justify-start"
                  variant="outline"
                  onClick={() =>
                    onMetricDrillDown('viral', {
                      season: realtimeData.seasonality.currentSeason,
                    })
                  }
                >
                  <Users className="w-4 h-4 mr-2" />
                  Review Viral Performance
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* MRR Analysis Tab */}
        <TabsContent value="mrr" className="space-y-6">
          <MRRTracker
            mrrData={realtimeData.mrr}
            timeRange={timeRange}
            showProjections={true}
            onMovementClick={(movement) =>
              console.log('MRR Movement:', movement)
            }
          />
        </TabsContent>

        {/* Viral Growth Tab */}
        <TabsContent value="viral" className="space-y-6">
          <ViralCoefficientAnalyzer
            viralMetrics={realtimeData.viral}
            timeRange={timeRange}
            highlightWeddingSeason={true}
            onFunnelStageClick={(stage) => console.log('Funnel Stage:', stage)}
          />
        </TabsContent>

        {/* CAC Analysis Tab */}
        <TabsContent value="cac" className="space-y-6">
          <CACAnalysisPanel
            cacMetrics={realtimeData.cac}
            timeRange={timeRange}
            showChannelBreakdown={true}
            onChannelSelect={(channel) =>
              console.log('Channel Selected:', channel)
            }
          />
        </TabsContent>

        {/* Executive Reporting Tab */}
        <TabsContent value="executive" className="space-y-6">
          <ExecutiveReportingInterface
            businessMetrics={realtimeData}
            reportType={userRole === 'executive' ? 'board' : 'monthly'}
            exportFormat="dashboard"
            onExport={handleExportReport}
          />
        </TabsContent>
      </Tabs>

      {/* Critical Alerts Footer */}
      {realtimeData.health.alerts.filter((a) => a.severity === 'critical')
        .length > 0 && (
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-800">
              <AlertTriangle className="w-5 h-5" />
              Critical Business Alerts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {realtimeData.health.alerts
                .filter((alert) => alert.severity === 'critical')
                .slice(0, 3)
                .map((alert) => (
                  <div
                    key={alert.id}
                    className="p-3 bg-white rounded-md border border-red-200"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-medium text-red-900">
                          {alert.title}
                        </h4>
                        <p className="text-sm text-red-700 mt-1">
                          {alert.description}
                        </p>
                        <p className="text-xs text-red-600 mt-1 italic">
                          {alert.weddingContext}
                        </p>
                      </div>
                      <Badge variant="destructive">Critical</Badge>
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

export default BusinessMetricsDashboard;
