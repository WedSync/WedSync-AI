'use client';

import React, { useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  CrownIcon,
  ArrowUpIcon,
  CheckCircleIcon,
  XCircleIcon,
  TrendingUpIcon,
  UsersIcon,
  StarIcon,
  ZapIcon,
  ShieldIcon,
  GiftIcon,
} from 'lucide-react';
import {
  TierLimits,
  SubscriptionTier,
  UpgradeRecommendation,
  RateLimitMetrics,
  UsageMetrics,
} from '@/types/rate-limiting';

interface SubscriptionTierVisualizerProps {
  tierLimits: TierLimits[];
  currentUsage: RateLimitMetrics[];
  upgradeRecommendations: UpgradeRecommendation[];
  onGenerateRecommendation?: (
    userId: string,
    currentTier: SubscriptionTier,
  ) => void;
  onSendUpgradeOffer?: (
    userId: string,
    recommendedTier: SubscriptionTier,
  ) => void;
}

export default function SubscriptionTierVisualizer({
  tierLimits,
  currentUsage,
  upgradeRecommendations,
  onGenerateRecommendation,
  onSendUpgradeOffer,
}: SubscriptionTierVisualizerProps) {
  const [selectedTier, setSelectedTier] = useState<SubscriptionTier>(
    SubscriptionTier.PROFESSIONAL,
  );
  const [comparisonView, setComparisonView] = useState<
    'features' | 'limits' | 'pricing'
  >('features');

  // Calculate tier distribution
  const tierDistribution = currentUsage.reduce(
    (acc, usage) => {
      acc[usage.subscriptionTier] = (acc[usage.subscriptionTier] || 0) + 1;
      return acc;
    },
    {} as Record<SubscriptionTier, number>,
  );

  // Calculate upgrade opportunities
  const upgradeOpportunities = upgradeRecommendations.filter(
    (rec) => rec.urgencyScore > 70 && rec.additionalRequests > 0,
  );

  // Wedding season upgrade recommendations
  const seasonalUpgrades = upgradeRecommendations.filter(
    (rec) => rec.weddingDeadlineImpact,
  );

  // Calculate potential revenue from upgrades
  const potentialRevenue = upgradeRecommendations.reduce((total, rec) => {
    const currentTierData = tierLimits.find((t) => t.tier === rec.currentTier);
    const recommendedTierData = tierLimits.find(
      (t) => t.tier === rec.recommendedTier,
    );
    if (currentTierData && recommendedTierData) {
      return total + (recommendedTierData.price - currentTierData.price);
    }
    return total;
  }, 0);

  const getTierIcon = (tier: SubscriptionTier) => {
    switch (tier) {
      case SubscriptionTier.FREE:
        return <GiftIcon className="w-5 h-5" />;
      case SubscriptionTier.STARTER:
        return <StarIcon className="w-5 h-5" />;
      case SubscriptionTier.PROFESSIONAL:
        return <ShieldIcon className="w-5 h-5" />;
      case SubscriptionTier.SCALE:
        return <ZapIcon className="w-5 h-5" />;
      case SubscriptionTier.ENTERPRISE:
        return <CrownIcon className="w-5 h-5" />;
    }
  };

  const getTierColor = (tier: SubscriptionTier): string => {
    switch (tier) {
      case SubscriptionTier.FREE:
        return 'text-gray-600 bg-gray-100';
      case SubscriptionTier.STARTER:
        return 'text-blue-600 bg-blue-100';
      case SubscriptionTier.PROFESSIONAL:
        return 'text-green-600 bg-green-100';
      case SubscriptionTier.SCALE:
        return 'text-purple-600 bg-purple-100';
      case SubscriptionTier.ENTERPRISE:
        return 'text-yellow-600 bg-yellow-100';
    }
  };

  const formatNumber = (num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const getRecommendationPriority = (
    recommendation: UpgradeRecommendation,
  ): 'high' | 'medium' | 'low' => {
    if (recommendation.urgencyScore > 80) return 'high';
    if (recommendation.urgencyScore > 50) return 'medium';
    return 'low';
  };

  const getPriorityColor = (priority: 'high' | 'medium' | 'low'): string => {
    switch (priority) {
      case 'high':
        return 'text-red-600 bg-red-100';
      case 'medium':
        return 'text-yellow-600 bg-yellow-100';
      case 'low':
        return 'text-green-600 bg-green-100';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            Subscription Tier Visualizer
          </h2>
          <p className="text-gray-600 mt-1">
            Monitor tier distribution, upgrade opportunities, and revenue
            potential
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm text-gray-600">Potential Monthly Revenue</p>
          <p className="text-2xl font-bold text-green-600">
            ${potentialRevenue.toLocaleString()}
          </p>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Users</p>
                <p className="text-2xl font-bold text-gray-900">
                  {currentUsage.length}
                </p>
              </div>
              <UsersIcon className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Upgrade Opportunities
                </p>
                <p className="text-2xl font-bold text-green-600">
                  {upgradeOpportunities.length}
                </p>
              </div>
              <ArrowUpIcon className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Seasonal Urgent
                </p>
                <p className="text-2xl font-bold text-purple-600">
                  {seasonalUpgrades.length}
                </p>
              </div>
              <TrendingUpIcon className="w-8 h-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Avg Tier Value
                </p>
                <p className="text-2xl font-bold text-yellow-600">
                  $
                  {(
                    tierLimits.reduce((sum, t) => sum + t.price, 0) /
                    tierLimits.length
                  ).toFixed(0)}
                </p>
              </div>
              <CrownIcon className="w-8 h-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="distribution" className="w-full">
        <TabsList>
          <TabsTrigger value="distribution">Tier Distribution</TabsTrigger>
          <TabsTrigger value="comparison">Tier Comparison</TabsTrigger>
          <TabsTrigger value="recommendations">
            Upgrade Recommendations
          </TabsTrigger>
          <TabsTrigger value="revenue">Revenue Analysis</TabsTrigger>
        </TabsList>

        <TabsContent value="distribution" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Tier Distribution Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Current Distribution</CardTitle>
                <CardDescription>Users by subscription tier</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {Object.entries(SubscriptionTier).map(([key, tier]) => {
                    const count = tierDistribution[tier] || 0;
                    const percentage =
                      currentUsage.length > 0
                        ? (count / currentUsage.length) * 100
                        : 0;

                    return (
                      <div
                        key={tier}
                        className="flex items-center justify-between"
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`p-2 rounded-lg ${getTierColor(tier)}`}
                          >
                            {getTierIcon(tier)}
                          </div>
                          <div>
                            <p className="font-medium">{tier}</p>
                            <p className="text-sm text-gray-600">
                              {count} users
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <Progress value={percentage} className="w-20 mb-1" />
                          <p className="text-xs text-gray-600">
                            {percentage.toFixed(1)}%
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Tier Performance */}
            <Card>
              <CardHeader>
                <CardTitle>Tier Performance</CardTitle>
                <CardDescription>Revenue and usage by tier</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {tierLimits.map((tierLimit) => {
                    const userCount = tierDistribution[tierLimit.tier] || 0;
                    const monthlyRevenue = userCount * tierLimit.price;

                    return (
                      <div
                        key={tierLimit.tier}
                        className="p-4 border rounded-lg"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div
                              className={`p-2 rounded-lg ${getTierColor(tierLimit.tier)}`}
                            >
                              {getTierIcon(tierLimit.tier)}
                            </div>
                            <div>
                              <p className="font-medium">{tierLimit.tier}</p>
                              <p className="text-sm text-gray-600">
                                ${tierLimit.price}/month
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-green-600">
                              ${monthlyRevenue.toLocaleString()}
                            </p>
                            <p className="text-xs text-gray-600">
                              Monthly revenue
                            </p>
                          </div>
                        </div>
                        <div className="mt-3 grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <p className="text-gray-600">Monthly Limit</p>
                            <p className="font-medium">
                              {formatNumber(tierLimit.monthlyRequestLimit)}
                            </p>
                          </div>
                          <div>
                            <p className="text-gray-600">Rate Limit</p>
                            <p className="font-medium">
                              {tierLimit.rateLimitPerMinute}/min
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="comparison" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Tier Feature Comparison</CardTitle>
              <CardDescription>
                Compare features and limits across all tiers
              </CardDescription>
              <div className="flex gap-2">
                <Button
                  variant={
                    comparisonView === 'features' ? 'default' : 'outline'
                  }
                  onClick={() => setComparisonView('features')}
                  size="sm"
                >
                  Features
                </Button>
                <Button
                  variant={comparisonView === 'limits' ? 'default' : 'outline'}
                  onClick={() => setComparisonView('limits')}
                  size="sm"
                >
                  Rate Limits
                </Button>
                <Button
                  variant={comparisonView === 'pricing' ? 'default' : 'outline'}
                  onClick={() => setComparisonView('pricing')}
                  size="sm"
                >
                  Pricing
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-4 font-medium">Feature</th>
                      {tierLimits.map((tier) => (
                        <th key={tier.tier} className="text-center p-4">
                          <div className="flex flex-col items-center gap-2">
                            <div
                              className={`p-2 rounded-lg ${getTierColor(tier.tier)}`}
                            >
                              {getTierIcon(tier.tier)}
                            </div>
                            <span className="font-medium">{tier.tier}</span>
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {comparisonView === 'features' && (
                      <>
                        <tr className="border-b">
                          <td className="p-4 font-medium">API Access</td>
                          {tierLimits.map((tier) => (
                            <td key={tier.tier} className="text-center p-4">
                              <CheckCircleIcon className="w-5 h-5 text-green-500 mx-auto" />
                            </td>
                          ))}
                        </tr>
                        <tr className="border-b">
                          <td className="p-4 font-medium">
                            Wedding Season Boost
                          </td>
                          {tierLimits.map((tier) => (
                            <td key={tier.tier} className="text-center p-4">
                              {tier.weddingSeasonMultiplier > 1 ? (
                                <span className="text-green-600 font-medium">
                                  {tier.weddingSeasonMultiplier}x
                                </span>
                              ) : (
                                <XCircleIcon className="w-5 h-5 text-gray-400 mx-auto" />
                              )}
                            </td>
                          ))}
                        </tr>
                        <tr className="border-b">
                          <td className="p-4 font-medium">Burst Allowance</td>
                          {tierLimits.map((tier) => (
                            <td key={tier.tier} className="text-center p-4">
                              <span className="font-medium">
                                {tier.burstAllowance}
                              </span>
                            </td>
                          ))}
                        </tr>
                      </>
                    )}

                    {comparisonView === 'limits' && (
                      <>
                        <tr className="border-b">
                          <td className="p-4 font-medium">Monthly Requests</td>
                          {tierLimits.map((tier) => (
                            <td key={tier.tier} className="text-center p-4">
                              <span className="font-medium">
                                {formatNumber(tier.monthlyRequestLimit)}
                              </span>
                            </td>
                          ))}
                        </tr>
                        <tr className="border-b">
                          <td className="p-4 font-medium">Daily Requests</td>
                          {tierLimits.map((tier) => (
                            <td key={tier.tier} className="text-center p-4">
                              <span className="font-medium">
                                {formatNumber(tier.dailyRequestLimit)}
                              </span>
                            </td>
                          ))}
                        </tr>
                        <tr className="border-b">
                          <td className="p-4 font-medium">Rate Limit (/min)</td>
                          {tierLimits.map((tier) => (
                            <td key={tier.tier} className="text-center p-4">
                              <span className="font-medium">
                                {tier.rateLimitPerMinute}
                              </span>
                            </td>
                          ))}
                        </tr>
                      </>
                    )}

                    {comparisonView === 'pricing' && (
                      <>
                        <tr className="border-b">
                          <td className="p-4 font-medium">Monthly Price</td>
                          {tierLimits.map((tier) => (
                            <td key={tier.tier} className="text-center p-4">
                              <span className="text-lg font-bold text-green-600">
                                ${tier.price}
                              </span>
                            </td>
                          ))}
                        </tr>
                        <tr className="border-b">
                          <td className="p-4 font-medium">
                            Cost per 1K Requests
                          </td>
                          {tierLimits.map((tier) => (
                            <td key={tier.tier} className="text-center p-4">
                              <span className="font-medium">
                                $
                                {(
                                  (tier.price / tier.monthlyRequestLimit) *
                                  1000
                                ).toFixed(3)}
                              </span>
                            </td>
                          ))}
                        </tr>
                        <tr className="border-b">
                          <td className="p-4 font-medium">Value Score</td>
                          {tierLimits.map((tier) => (
                            <td key={tier.tier} className="text-center p-4">
                              <div className="flex items-center justify-center">
                                {[...Array(5)].map((_, i) => (
                                  <StarIcon
                                    key={i}
                                    className={`w-4 h-4 ${
                                      i <
                                      Math.ceil(
                                        tier.monthlyRequestLimit /
                                          tier.price /
                                          10000,
                                      )
                                        ? 'text-yellow-500'
                                        : 'text-gray-300'
                                    }`}
                                  />
                                ))}
                              </div>
                            </td>
                          ))}
                        </tr>
                      </>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="recommendations" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Upgrade Recommendations</CardTitle>
              <CardDescription>
                AI-powered upgrade suggestions for users
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {upgradeRecommendations.map((recommendation) => {
                  const priority = getRecommendationPriority(recommendation);
                  const currentTierData = tierLimits.find(
                    (t) => t.tier === recommendation.currentTier,
                  );
                  const recommendedTierData = tierLimits.find(
                    (t) => t.tier === recommendation.recommendedTier,
                  );

                  return (
                    <div
                      key={`${recommendation.currentTier}-${recommendation.recommendedTier}`}
                      className="p-4 border rounded-lg"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <Badge className={getPriorityColor(priority)}>
                            {priority} Priority
                          </Badge>
                          <div>
                            <p className="font-medium">
                              {recommendation.currentTier} →{' '}
                              {recommendation.recommendedTier}
                            </p>
                            <p className="text-sm text-gray-600">
                              {recommendation.customMessage}
                            </p>
                            {recommendation.weddingDeadlineImpact && (
                              <p className="text-xs text-red-600 font-medium">
                                ⚠️ Wedding deadline impact
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-green-600">
                            +{formatNumber(recommendation.additionalRequests)}{' '}
                            requests
                          </p>
                          {recommendation.monthlySavings && (
                            <p className="text-sm text-green-600">
                              ${recommendation.monthlySavings}/month saved
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="mt-3 flex items-center gap-2">
                        <div className="text-sm text-gray-600">
                          Urgency Score:{' '}
                          <span className="font-medium">
                            {recommendation.urgencyScore}%
                          </span>
                        </div>
                        <Progress
                          value={recommendation.urgencyScore}
                          className="flex-1 max-w-32"
                        />
                      </div>

                      <div className="mt-3 flex gap-2">
                        <Button
                          size="sm"
                          onClick={() =>
                            onSendUpgradeOffer?.(
                              recommendation.currentTier,
                              recommendation.recommendedTier,
                            )
                          }
                        >
                          Send Offer
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            onGenerateRecommendation?.(
                              recommendation.currentTier,
                              recommendation.currentTier,
                            )
                          }
                        >
                          Regenerate
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="revenue" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Revenue Projections</CardTitle>
                <CardDescription>
                  Potential revenue from upgrade recommendations
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="p-4 bg-green-50 rounded-lg">
                    <p className="text-sm font-medium text-green-800">
                      Current Monthly Revenue
                    </p>
                    <p className="text-2xl font-bold text-green-900">
                      $
                      {Object.entries(tierDistribution)
                        .reduce((total, [tier, count]) => {
                          const tierData = tierLimits.find(
                            (t) => t.tier === tier,
                          );
                          return (
                            total + (tierData ? tierData.price * count : 0)
                          );
                        }, 0)
                        .toLocaleString()}
                    </p>
                  </div>

                  <div className="p-4 bg-blue-50 rounded-lg">
                    <p className="text-sm font-medium text-blue-800">
                      Potential Additional Revenue
                    </p>
                    <p className="text-2xl font-bold text-blue-900">
                      ${potentialRevenue.toLocaleString()}
                    </p>
                  </div>

                  <div className="p-4 bg-purple-50 rounded-lg">
                    <p className="text-sm font-medium text-purple-800">
                      High-Priority Upgrades
                    </p>
                    <p className="text-2xl font-bold text-purple-900">
                      {upgradeOpportunities.length}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Wedding Season Impact</CardTitle>
                <CardDescription>
                  Seasonal upgrade opportunities
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {seasonalUpgrades.map((upgrade) => (
                    <div
                      key={`seasonal-${upgrade.currentTier}`}
                      className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-yellow-900">
                            {upgrade.currentTier} → {upgrade.recommendedTier}
                          </p>
                          <p className="text-sm text-yellow-700">
                            Wedding deadline pressure
                          </p>
                        </div>
                        <Badge
                          variant="outline"
                          className="border-yellow-400 text-yellow-700"
                        >
                          Urgent
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
