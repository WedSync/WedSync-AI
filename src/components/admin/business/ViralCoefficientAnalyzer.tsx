'use client';

// WS-195: Viral Coefficient Analyzer Component
// Tracks viral growth, referral performance, and wedding vendor cross-referral patterns

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  ViralAnalysisProps,
  ReferralFunnelData,
  ConversionTrend,
} from '@/types/business-metrics';
import { ConversionFunnelViz } from '@/components/business/metrics/ConversionFunnelViz';
import { MetricsCard } from '@/components/business/metrics/MetricsCard';
import {
  Users,
  TrendingUp,
  TrendingDown,
  Share2,
  UserPlus,
  Heart,
  Camera,
  Building,
  Flower,
  Music,
  ChefHat,
  ArrowRight,
  ExternalLink,
} from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Viral Coefficient Analyzer Component
 * Comprehensive viral growth analysis for wedding marketplace
 * Features:
 * - Viral coefficient tracking with trend analysis
 * - Referral funnel visualization and conversion tracking
 * - Wedding-specific viral mechanics (vendor cross-referrals, couple invitations)
 * - Seasonal viral amplification monitoring
 * - Channel performance analysis for viral growth
 */
export function ViralCoefficientAnalyzer({
  viralMetrics,
  timeRange,
  highlightWeddingSeason,
  onFunnelStageClick,
}: ViralAnalysisProps) {
  const [selectedView, setSelectedView] = useState<
    'overview' | 'funnel' | 'trends' | 'channels'
  >('overview');
  const [selectedChannel, setSelectedChannel] = useState<string>('all');

  // Calculate viral insights
  const viralInsights = useMemo(() => {
    const { coefficient, weddingViralEffects, referralData } = viralMetrics;

    const totalInvited = referralData.reduce(
      (sum, stage) => sum + stage.count,
      0,
    );
    const totalConverted = referralData
      .filter((stage) => stage.stage === 'activated')
      .reduce((sum, stage) => sum + stage.count, 0);

    const overallConversionRate =
      totalInvited > 0 ? (totalConverted / totalInvited) * 100 : 0;

    // Viral coefficient interpretation
    const getCoefficientStatus = (coeff: number) => {
      if (coeff >= 1.5)
        return {
          status: 'excellent',
          label: 'Exponential Growth',
          color: 'text-green-600',
        };
      if (coeff >= 1.2)
        return {
          status: 'healthy',
          label: 'Strong Viral Growth',
          color: 'text-blue-600',
        };
      if (coeff >= 1.0)
        return {
          status: 'healthy',
          label: 'Sustainable Growth',
          color: 'text-blue-600',
        };
      if (coeff >= 0.8)
        return {
          status: 'concerning',
          label: 'Moderate Growth',
          color: 'text-yellow-600',
        };
      return {
        status: 'critical',
        label: 'Weak Viral Growth',
        color: 'text-red-600',
      };
    };

    const coefficientStatus = getCoefficientStatus(coefficient);

    return {
      totalInvited,
      totalConverted,
      overallConversionRate,
      coefficientStatus,
      averageInvitesPerUser: coefficient,
      seasonalBoost: weddingViralEffects.seasonalMultiplier,
    };
  }, [viralMetrics]);

  // Get supplier type icon
  const getSupplierIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'photographer':
        return <Camera className="w-4 h-4" />;
      case 'venue':
        return <Building className="w-4 h-4" />;
      case 'florist':
        return <Flower className="w-4 h-4" />;
      case 'band':
      case 'dj':
        return <Music className="w-4 h-4" />;
      case 'caterer':
        return <ChefHat className="w-4 h-4" />;
      default:
        return <Users className="w-4 h-4" />;
    }
  };

  // Format percentage
  const formatPercentage = (value: number): string => {
    return `${value.toFixed(1)}%`;
  };

  // Get funnel stage color
  const getFunnelStageColor = (conversionRate: number): string => {
    if (conversionRate >= 15) return 'bg-green-500';
    if (conversionRate >= 10) return 'bg-blue-500';
    if (conversionRate >= 5) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <div className="space-y-6">
      {/* Header Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricsCard
          title="Viral Coefficient"
          value={viralMetrics.coefficient}
          format="number"
          change={
            viralMetrics.trend === 'increasing'
              ? 12.5
              : viralMetrics.trend === 'stable'
                ? 0
                : -8.2
          }
          changeType={
            viralMetrics.trend === 'increasing'
              ? 'positive'
              : viralMetrics.trend === 'stable'
                ? 'neutral'
                : 'negative'
          }
          status={viralInsights.coefficientStatus.status as any}
          weddingContext={viralInsights.coefficientStatus.label}
        />

        <MetricsCard
          title="Referral Conversion Rate"
          value={viralInsights.overallConversionRate}
          format="percentage"
          change={15.3}
          changeType="positive"
          status="healthy"
          weddingContext="Overall referral-to-signup conversion"
        />

        <MetricsCard
          title="Vendor Cross-Referrals"
          value={viralMetrics.weddingViralEffects.vendorCrossReferrals}
          format="percentage"
          change={18.7}
          changeType="positive"
          status="excellent"
          weddingContext="Vendors referring other vendors"
        />

        <MetricsCard
          title="Seasonal Amplification"
          value={viralMetrics.weddingViralEffects.seasonalMultiplier}
          format="number"
          change={highlightWeddingSeason ? 25.4 : -12.1}
          changeType={highlightWeddingSeason ? 'positive' : 'negative'}
          status={highlightWeddingSeason ? 'excellent' : 'concerning'}
          weddingContext={
            highlightWeddingSeason
              ? 'Peak wedding season boost'
              : 'Off-season impact'
          }
        />
      </div>

      {/* Main Analysis Tabs */}
      <Tabs
        value={selectedView}
        onValueChange={(value) => setSelectedView(value as any)}
        className="space-y-6"
      >
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="funnel">Referral Funnel</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
          <TabsTrigger value="channels">Channels</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Viral Coefficient Status */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-green-600" />
                  Viral Growth Status
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center">
                  <div
                    className={cn(
                      'text-4xl font-bold mb-2',
                      viralInsights.coefficientStatus.color,
                    )}
                  >
                    {viralMetrics.coefficient.toFixed(2)}
                  </div>
                  <Badge
                    className={cn(
                      'mb-4',
                      viralInsights.coefficientStatus.status === 'excellent'
                        ? 'bg-green-100 text-green-800'
                        : viralInsights.coefficientStatus.status === 'healthy'
                          ? 'bg-blue-100 text-blue-800'
                          : viralInsights.coefficientStatus.status ===
                              'concerning'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-red-100 text-red-800',
                    )}
                  >
                    {viralInsights.coefficientStatus.label}
                  </Badge>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">
                      Growth Sustainability
                    </span>
                    <span className="text-sm text-gray-600">
                      {viralMetrics.coefficient > 1.0
                        ? 'Self-sustaining'
                        : 'Needs external growth'}
                    </span>
                  </div>

                  <Progress
                    value={Math.min((viralMetrics.coefficient / 2) * 100, 100)}
                    className="h-2"
                  />

                  <div className="text-xs text-gray-500">
                    Each user invites an average of{' '}
                    {viralMetrics.coefficient.toFixed(2)} new users
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Wedding Viral Effects */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Heart className="w-5 h-5 text-pink-600" />
                  Wedding Viral Mechanics
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded-md">
                    <div className="flex items-center gap-2">
                      <UserPlus className="w-4 h-4 text-blue-600" />
                      <span className="text-sm font-medium">
                        Couple Invite Rate
                      </span>
                    </div>
                    <Badge variant="secondary">
                      {formatPercentage(
                        viralMetrics.weddingViralEffects.coupleInviteRate,
                      )}
                    </Badge>
                  </div>

                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded-md">
                    <div className="flex items-center gap-2">
                      <Share2 className="w-4 h-4 text-green-600" />
                      <span className="text-sm font-medium">
                        Vendor Cross-Referrals
                      </span>
                    </div>
                    <Badge variant="secondary">
                      {formatPercentage(
                        viralMetrics.weddingViralEffects.vendorCrossReferrals,
                      )}
                    </Badge>
                  </div>

                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded-md">
                    <div className="flex items-center gap-2">
                      <ExternalLink className="w-4 h-4 text-purple-600" />
                      <span className="text-sm font-medium">
                        Portfolio Showcases
                      </span>
                    </div>
                    <Badge variant="secondary">
                      {formatPercentage(
                        viralMetrics.weddingViralEffects.weddingShowcaseBoosts,
                      )}
                    </Badge>
                  </div>

                  <div className="flex justify-between items-center p-3 bg-amber-50 rounded-md border border-amber-200">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-amber-600" />
                      <span className="text-sm font-medium">
                        Seasonal Multiplier
                      </span>
                    </div>
                    <Badge className="bg-amber-100 text-amber-800">
                      {viralMetrics.weddingViralEffects.seasonalMultiplier.toFixed(
                        1,
                      )}
                      x
                    </Badge>
                  </div>
                </div>

                <div className="text-xs text-gray-500 italic">
                  Wedding season creates natural viral amplification through
                  concentrated bookings
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Referral Funnel Tab */}
        <TabsContent value="funnel" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-600" />
                Referral Conversion Funnel
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ConversionFunnelViz
                data={viralMetrics.referralData}
                height={400}
                interactive={true}
                weddingSeasonHighlight={highlightWeddingSeason}
              />

              {/* Funnel Stage Details */}
              <div className="mt-6 space-y-3">
                {viralMetrics.referralData.map((stage, index) => (
                  <div
                    key={stage.stage}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors"
                    onClick={() => onFunnelStageClick(stage)}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={cn(
                          'w-3 h-3 rounded-full',
                          getFunnelStageColor(stage.conversionRate),
                        )}
                      />
                      <div>
                        <h4 className="font-medium capitalize">
                          {stage.stage.replace('_', ' ')}
                        </h4>
                        <p className="text-sm text-gray-600">
                          {stage.count.toLocaleString()} users
                        </p>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="font-bold">
                        {formatPercentage(stage.conversionRate)}
                      </div>
                      {stage.dropOffReason && (
                        <div className="text-xs text-gray-500">
                          {stage.dropOffReason}
                        </div>
                      )}
                      {stage.weddingSeasonImpact && (
                        <Badge variant="outline" className="text-xs mt-1">
                          Wedding Season Boost
                        </Badge>
                      )}
                    </div>

                    <ArrowRight className="w-4 h-4 text-gray-400" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Trends Tab */}
        <TabsContent value="trends" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-green-600" />
                  Conversion Trends
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {viralMetrics.conversionTrends.map((trend, index) => (
                    <div
                      key={index}
                      className="flex justify-between items-center p-3 border rounded-md"
                    >
                      <div>
                        <div className="font-medium">{trend.period}</div>
                        <div className="text-sm text-gray-600 capitalize">
                          {trend.source.replace('_', ' ')}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold">
                          {formatPercentage(trend.rate)}
                        </div>
                        <div className="text-xs text-gray-500">
                          {trend.volume.toLocaleString()} conversions
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Share2 className="w-5 h-5 text-purple-600" />
                  Referral Sources
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {viralMetrics.conversionTrends
                    .reduce((acc, trend) => {
                      const existing = acc.find(
                        (item) => item.source === trend.source,
                      );
                      if (existing) {
                        existing.totalVolume += trend.volume;
                        existing.avgRate = (existing.avgRate + trend.rate) / 2;
                      } else {
                        acc.push({
                          source: trend.source,
                          totalVolume: trend.volume,
                          avgRate: trend.rate,
                        });
                      }
                      return acc;
                    }, [] as any[])
                    .map((source, index) => (
                      <div
                        key={index}
                        className="flex justify-between items-center p-3 bg-gray-50 rounded-md"
                      >
                        <div className="flex items-center gap-2">
                          {getSupplierIcon(source.source)}
                          <span className="font-medium capitalize">
                            {source.source.replace('_', ' ')}
                          </span>
                        </div>
                        <div className="text-right">
                          <div className="font-bold">
                            {formatPercentage(source.avgRate)}
                          </div>
                          <div className="text-xs text-gray-500">
                            {source.totalVolume.toLocaleString()} total
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Channels Tab */}
        <TabsContent value="channels" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Share2 className="w-5 h-5 text-indigo-600" />
                Viral Channel Performance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 border rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <UserPlus className="w-5 h-5 text-blue-600" />
                    <h4 className="font-medium">Direct Invitations</h4>
                  </div>
                  <div className="text-2xl font-bold text-blue-600">
                    {formatPercentage(
                      viralMetrics.weddingViralEffects.coupleInviteRate,
                    )}
                  </div>
                  <p className="text-sm text-gray-600 mt-1">
                    Couples inviting missing vendors to platform
                  </p>
                </div>

                <div className="p-4 border rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Share2 className="w-5 h-5 text-green-600" />
                    <h4 className="font-medium">Cross-Referrals</h4>
                  </div>
                  <div className="text-2xl font-bold text-green-600">
                    {formatPercentage(
                      viralMetrics.weddingViralEffects.vendorCrossReferrals,
                    )}
                  </div>
                  <p className="text-sm text-gray-600 mt-1">
                    Vendors recommending other vendors
                  </p>
                </div>

                <div className="p-4 border rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <ExternalLink className="w-5 h-5 text-purple-600" />
                    <h4 className="font-medium">Portfolio Sharing</h4>
                  </div>
                  <div className="text-2xl font-bold text-purple-600">
                    {formatPercentage(
                      viralMetrics.weddingViralEffects.weddingShowcaseBoosts,
                    )}
                  </div>
                  <p className="text-sm text-gray-600 mt-1">
                    Wedding showcases driving discovery
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default ViralCoefficientAnalyzer;
