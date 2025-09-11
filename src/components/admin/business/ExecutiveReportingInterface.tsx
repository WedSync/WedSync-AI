'use client';

// WS-195: Executive Reporting Interface Component
// Investor-grade business metrics reporting for board presentations and stakeholder updates

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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ExecutiveReportingProps } from '@/types/business-metrics';
import { MetricsCard } from '@/components/business/metrics/MetricsCard';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Users,
  Target,
  BarChart3,
  PieChart,
  Download,
  FileText,
  Mail,
  Calendar,
  AlertTriangle,
  CheckCircle,
  Clock,
  Growth,
  Heart,
  Award,
} from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Executive Reporting Interface Component
 * Provides investor-grade business intelligence and executive reporting
 * Features:
 * - Board-ready financial metrics and KPI dashboards
 * - Investor presentation summaries with growth trajectories
 * - Wedding industry context with market positioning
 * - Export capabilities for presentations and reports
 * - Executive decision support with actionable insights
 */
export function ExecutiveReportingInterface({
  businessMetrics,
  reportType,
  exportFormat = 'dashboard',
  onExport,
}: ExecutiveReportingProps) {
  const [selectedTimeframe, setSelectedTimeframe] = useState<
    'monthly' | 'quarterly' | 'yearly'
  >('monthly');
  const [selectedView, setSelectedView] = useState<
    'summary' | 'financial' | 'growth' | 'market'
  >('summary');
  const [includeProjections, setIncludeProjections] = useState(true);

  // Calculate executive summary metrics
  const executiveSummary = useMemo(() => {
    const { mrr, viral, cac, health, seasonality, growth } = businessMetrics;

    // Financial Health Score
    const financialScore = Math.min(
      (mrr.growthPercent > 0 ? 25 : 0) +
        (cac.ltvCacRatio > 3 ? 25 : cac.ltvCacRatio > 2 ? 15 : 0) +
        (viral.coefficient > 1.0 ? 25 : viral.coefficient > 0.8 ? 15 : 0) +
        health.score * 0.25,
      100,
    );

    // Market Position
    const marketPosition =
      viral.coefficient >= 1.2
        ? 'Market Leader'
        : viral.coefficient >= 1.0
          ? 'Competitive'
          : viral.coefficient >= 0.8
            ? 'Growing'
            : 'Emerging';

    // Wedding Market Metrics
    const weddingMarketMetrics = {
      supplierGrowthRate: mrr.growthPercent,
      seasonalImpact: seasonality.seasonalImpact.mrrMultiplier,
      viralNetwork: viral.weddingViralEffects.vendorCrossReferrals,
      marketPenetration: health.score, // Simplified metric
    };

    // Risk Assessment
    const risks = [];
    if (cac.ltvCacRatio < 2) risks.push('Low LTV:CAC ratio');
    if (growth.churnRate > 0.1) risks.push('High churn rate');
    if (viral.coefficient < 1.0) risks.push('Weak viral growth');
    if (health.score < 70) risks.push('Business health concerns');

    // Opportunities
    const opportunities = [];
    if (seasonality.currentSeason === 'peak')
      opportunities.push('Peak wedding season boost');
    if (viral.weddingViralEffects.vendorCrossReferrals > 15)
      opportunities.push('Strong referral network');
    if (cac.ltvCacRatio > 5) opportunities.push('Efficient acquisition model');

    return {
      financialScore,
      marketPosition,
      weddingMarketMetrics,
      risks,
      opportunities,
      keyHighlights: [
        `${mrr.growthPercent > 0 ? '+' : ''}${mrr.growthPercent.toFixed(1)}% MRR growth`,
        `${viral.coefficient.toFixed(1)} viral coefficient`,
        `£${(mrr.current / 1000).toFixed(0)}K monthly revenue`,
        `${marketPosition} position`,
      ],
    };
  }, [businessMetrics]);

  // Format currency
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Format large numbers
  const formatLargeNumber = (num: number): string => {
    if (num >= 1000000) return `£${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `£${(num / 1000).toFixed(0)}K`;
    return formatCurrency(num);
  };

  // Get status color for metrics
  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'excellent':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'healthy':
        return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'concerning':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'critical':
        return 'text-red-600 bg-red-50 border-red-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const handleExport = (format: string) => {
    if (onExport) {
      onExport(format);
    } else {
      console.log(`Exporting executive report in ${format} format`);
      // Export logic would be implemented here
    }
  };

  return (
    <div className="space-y-6">
      {/* Executive Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Executive Business Report
          </h1>
          <p className="text-gray-600">
            {reportType === 'board'
              ? 'Board Presentation Summary'
              : reportType === 'investor'
                ? 'Investor Update'
                : reportType === 'quarterly'
                  ? 'Quarterly Business Review'
                  : 'Monthly Executive Summary'}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Select
            value={selectedTimeframe}
            onValueChange={(value) => setSelectedTimeframe(value as any)}
          >
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="monthly">Monthly</SelectItem>
              <SelectItem value="quarterly">Quarterly</SelectItem>
              <SelectItem value="yearly">Yearly</SelectItem>
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            size="sm"
            onClick={() => handleExport('pdf')}
          >
            <Download className="w-4 h-4 mr-2" />
            Export PDF
          </Button>
        </div>
      </div>

      {/* Executive Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className={cn('border-2', getStatusColor('excellent'))}>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              Monthly Recurring Revenue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatLargeNumber(businessMetrics.mrr.current)}
            </div>
            <div
              className={cn(
                'text-sm flex items-center gap-1',
                businessMetrics.mrr.growthPercent > 0
                  ? 'text-green-600'
                  : 'text-red-600',
              )}
            >
              {businessMetrics.mrr.growthPercent > 0 ? (
                <TrendingUp className="w-3 h-3" />
              ) : (
                <TrendingDown className="w-3 h-3" />
              )}
              {businessMetrics.mrr.growthPercent > 0 ? '+' : ''}
              {businessMetrics.mrr.growthPercent.toFixed(1)}% vs prev period
            </div>
          </CardContent>
        </Card>

        <Card className={cn('border-2', getStatusColor('healthy'))}>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Growth className="w-4 h-4" />
              Viral Coefficient
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {businessMetrics.viral.coefficient.toFixed(2)}
            </div>
            <div className="text-sm text-gray-600">
              {executiveSummary.marketPosition} Position
            </div>
          </CardContent>
        </Card>

        <Card className={cn('border-2', getStatusColor('healthy'))}>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Target className="w-4 h-4" />
              LTV:CAC Ratio
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {businessMetrics.cac.ltvCacRatio.toFixed(1)}:1
            </div>
            <div className="text-sm text-gray-600">
              {businessMetrics.cac.paybackPeriod}mo payback
            </div>
          </CardContent>
        </Card>

        <Card
          className={cn(
            'border-2',
            getStatusColor(businessMetrics.health.status),
          )}
        >
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Award className="w-4 h-4" />
              Business Health
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {businessMetrics.health.score}%
            </div>
            <div className="text-sm text-gray-600 capitalize">
              {businessMetrics.health.status} Status
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Executive Tabs */}
      <Tabs
        value={selectedView}
        onValueChange={(value) => setSelectedView(value as any)}
        className="space-y-6"
      >
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="summary">Executive Summary</TabsTrigger>
          <TabsTrigger value="financial">Financial Metrics</TabsTrigger>
          <TabsTrigger value="growth">Growth Analysis</TabsTrigger>
          <TabsTrigger value="market">Market Position</TabsTrigger>
        </TabsList>

        {/* Executive Summary Tab */}
        <TabsContent value="summary" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Key Highlights */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  Key Highlights
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {executiveSummary.keyHighlights.map((highlight, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-3 p-3 bg-green-50 rounded-md"
                    >
                      <Award className="w-4 h-4 text-green-600" />
                      <span className="font-medium text-green-800">
                        {highlight}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Wedding Market Context */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Heart className="w-5 h-5 text-pink-600" />
                  Wedding Market Performance
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-3 bg-gray-50 rounded-md">
                      <div className="text-xl font-bold text-gray-900">
                        {executiveSummary.weddingMarketMetrics.supplierGrowthRate.toFixed(
                          1,
                        )}
                        %
                      </div>
                      <div className="text-sm text-gray-600">
                        Supplier Growth
                      </div>
                    </div>
                    <div className="text-center p-3 bg-gray-50 rounded-md">
                      <div className="text-xl font-bold text-gray-900">
                        {(
                          executiveSummary.weddingMarketMetrics.seasonalImpact *
                          100
                        ).toFixed(0)}
                        %
                      </div>
                      <div className="text-sm text-gray-600">
                        Seasonal Impact
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm">Vendor Cross-Referrals</span>
                      <span className="font-medium">
                        {executiveSummary.weddingMarketMetrics.viralNetwork.toFixed(
                          1,
                        )}
                        %
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Current Season</span>
                      <Badge className="capitalize">
                        {businessMetrics.seasonality.currentSeason.replace(
                          '_',
                          ' ',
                        )}
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Risk & Opportunities */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-yellow-600" />
                  Risk Assessment
                </CardTitle>
              </CardHeader>
              <CardContent>
                {executiveSummary.risks.length > 0 ? (
                  <div className="space-y-2">
                    {executiveSummary.risks.map((risk, index) => (
                      <div
                        key={index}
                        className="flex items-center gap-3 p-3 bg-yellow-50 rounded-md"
                      >
                        <AlertTriangle className="w-4 h-4 text-yellow-600" />
                        <span className="text-yellow-800">{risk}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <CheckCircle className="w-8 h-8 mx-auto text-green-600 mb-2" />
                    No significant risks identified
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-green-600" />
                  Growth Opportunities
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {executiveSummary.opportunities.map((opportunity, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-3 p-3 bg-green-50 rounded-md"
                    >
                      <TrendingUp className="w-4 h-4 text-green-600" />
                      <span className="text-green-800">{opportunity}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Financial Metrics Tab */}
        <TabsContent value="financial" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <MetricsCard
              title="Annual Recurring Revenue"
              value={businessMetrics.mrr.current * 12}
              format="currency"
              change={businessMetrics.mrr.growthPercent}
              changeType={
                businessMetrics.mrr.growthPercent > 0 ? 'positive' : 'negative'
              }
              status="healthy"
              size="large"
            />

            <MetricsCard
              title="Customer Lifetime Value"
              value={businessMetrics.cac.ltv}
              format="currency"
              change={15.2}
              changeType="positive"
              status="excellent"
              size="large"
            />

            <MetricsCard
              title="Average Revenue Per User"
              value={
                businessMetrics.mrr.current /
                (businessMetrics.growth.netRevenue /
                  businessMetrics.mrr.current)
              }
              format="currency"
              change={8.5}
              changeType="positive"
              status="healthy"
              size="large"
            />
          </div>

          {/* Revenue Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle>Revenue Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium mb-3">By Subscription Tier</h4>
                  <div className="space-y-2">
                    {Object.entries(businessMetrics.mrr.breakdown.byTier).map(
                      ([tier, amount]) => (
                        <div
                          key={tier}
                          className="flex justify-between items-center p-2 bg-gray-50 rounded"
                        >
                          <span className="font-medium">{tier}</span>
                          <span>{formatLargeNumber(amount)}</span>
                        </div>
                      ),
                    )}
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-3">By Supplier Type</h4>
                  <div className="space-y-2">
                    {Object.entries(
                      businessMetrics.mrr.breakdown.bySupplierType,
                    ).map(([type, amount]) => (
                      <div
                        key={type}
                        className="flex justify-between items-center p-2 bg-gray-50 rounded"
                      >
                        <span className="font-medium capitalize">{type}</span>
                        <span>{formatLargeNumber(amount)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Growth Analysis Tab */}
        <TabsContent value="growth" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricsCard
              title="Net Revenue Retention"
              value={
                (businessMetrics.growth.netRevenue /
                  businessMetrics.mrr.previous -
                  1) *
                100
              }
              format="percentage"
              change={12.3}
              changeType="positive"
              status="excellent"
            />

            <MetricsCard
              title="Gross Revenue Retention"
              value={
                (businessMetrics.growth.grossRevenue /
                  businessMetrics.mrr.previous -
                  1) *
                100
              }
              format="percentage"
              change={8.7}
              changeType="positive"
              status="healthy"
            />

            <MetricsCard
              title="Monthly Churn Rate"
              value={businessMetrics.growth.churnRate * 100}
              format="percentage"
              change={-2.1}
              changeType="positive"
              status="healthy"
            />

            <MetricsCard
              title="Expansion Rate"
              value={businessMetrics.growth.expansionRate * 100}
              format="percentage"
              change={15.4}
              changeType="positive"
              status="excellent"
            />
          </div>

          {/* Growth Projections */}
          {includeProjections && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-blue-600" />
                  Growth Projections
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {businessMetrics.mrr.projections.map((projection, index) => (
                    <div key={index} className="p-4 border rounded-lg">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h4 className="font-medium">{projection.period}</h4>
                          <p className="text-xl font-bold text-blue-600">
                            {formatLargeNumber(projection.projected)}
                          </p>
                        </div>
                        <Badge
                          variant={
                            projection.confidence === 'high'
                              ? 'default'
                              : 'secondary'
                          }
                        >
                          {projection.confidence} confidence
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Market Position Tab */}
        <TabsContent value="market" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="w-5 h-5 text-purple-600" />
                  Market Position
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center mb-6">
                  <div className="text-3xl font-bold text-purple-600 mb-2">
                    {executiveSummary.marketPosition}
                  </div>
                  <div className="text-gray-600">
                    Current competitive positioning in wedding technology market
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span>Viral Growth Rate</span>
                    <span className="font-medium">
                      {businessMetrics.viral.coefficient.toFixed(2)}x
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Market Penetration</span>
                    <span className="font-medium">
                      {executiveSummary.weddingMarketMetrics.marketPenetration}%
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Network Effect Strength</span>
                    <span className="font-medium">
                      {businessMetrics.viral.weddingViralEffects.vendorCrossReferrals.toFixed(
                        1,
                      )}
                      %
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-indigo-600" />
                  Wedding Industry Metrics
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-3 bg-indigo-50 rounded-md">
                      <div className="text-xl font-bold text-indigo-600">
                        {
                          Object.values(
                            businessMetrics.mrr.breakdown.bySupplierType,
                          ).length
                        }
                      </div>
                      <div className="text-sm text-indigo-700">
                        Supplier Categories
                      </div>
                    </div>
                    <div className="text-center p-3 bg-indigo-50 rounded-md">
                      <div className="text-xl font-bold text-indigo-600">
                        {businessMetrics.viral.weddingViralEffects.coupleInviteRate.toFixed(
                          1,
                        )}
                        %
                      </div>
                      <div className="text-sm text-indigo-700">
                        Couple Engagement
                      </div>
                    </div>
                  </div>

                  <div className="text-sm text-gray-600 italic">
                    Leveraging wedding industry's natural referral patterns and
                    seasonal dynamics for sustainable growth
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Export Options */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-gray-600" />
            Export & Sharing Options
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Button variant="outline" onClick={() => handleExport('pdf')}>
              <Download className="w-4 h-4 mr-2" />
              Board Presentation (PDF)
            </Button>
            <Button variant="outline" onClick={() => handleExport('excel')}>
              <BarChart3 className="w-4 h-4 mr-2" />
              Financial Data (Excel)
            </Button>
            <Button variant="outline" onClick={() => handleExport('email')}>
              <Mail className="w-4 h-4 mr-2" />
              Email Summary
            </Button>
            <Button variant="outline" onClick={() => handleExport('dashboard')}>
              <PieChart className="w-4 h-4 mr-2" />
              Live Dashboard Link
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default ExecutiveReportingInterface;
