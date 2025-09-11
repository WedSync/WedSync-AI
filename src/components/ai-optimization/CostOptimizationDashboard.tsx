'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Zap,
  AlertTriangle,
  CheckCircle,
  Clock,
  Camera,
  MessageCircle,
  FileText,
  Calendar,
  Target,
} from 'lucide-react';
import type {
  CostOptimizationDashboardProps,
  AIOptimizationDashboardData,
  AIUsageMetrics,
  OptimizationRecommendation,
} from '@/types/ai-optimization';

// Mock data for development - replace with real API calls
const mockDashboardData: AIOptimizationDashboardData = {
  currentUsage: {
    id: '1',
    organizationId: '1',
    date: '2025-01-20',
    photographyAI: {
      apiCalls: 150,
      costPence: 300, // £3.00
      cacheHits: 120,
      cacheMisses: 30,
    },
    contentGeneration: {
      apiCalls: 80,
      costPence: 400, // £4.00
      cacheHits: 60,
      cacheMisses: 20,
      modelUsage: {
        gpt4: 20, // Premium client communications
        gpt35: 60, // Internal content
      },
    },
    chatbotInteractions: {
      apiCalls: 200,
      costPence: 200, // £2.00
      cacheHits: 150,
      cacheMisses: 50,
    },
    totalApiCalls: 430,
    totalCostPence: 900, // £9.00/day
    totalCacheHits: 330,
    totalCacheMisses: 100,
    cacheHitRate: 76.7,
    isWeddingSeason: false, // January = low season
    seasonMultiplier: 1.0,
    adjustedCostPence: 900,
  },
  budgetSettings: {
    id: '1',
    organizationId: '1',
    monthlyBudgetPence: 15000, // £150/month
    alertThresholds: {
      warning: 80,
      critical: 90,
      emergency: 95,
    },
    autoDisable: {
      enabled: true,
      atPercentage: 100,
      gracePeriod: 24,
    },
    seasonalSettings: {
      adjustBudgetForSeason: true,
      peakSeasonMultiplier: 1.6,
      preSeasonWarning: true,
    },
    notifications: {
      email: true,
      sms: false,
      dashboard: true,
      frequency: 'daily',
    },
  },
  cacheMetrics: {
    totalRequests: 430,
    cacheHits: 330,
    cacheMisses: 100,
    hitRate: 76.7,
    estimatedSavingsPence: 250, // £2.50 saved today through caching
    potentialSavingsPence: 100, // £1.00 additional savings possible
    photographyCache: {
      hitRate: 80.0,
      savingsPence: 120,
    },
    contentCache: {
      hitRate: 75.0,
      savingsPence: 80,
    },
    chatbotCache: {
      hitRate: 75.0,
      savingsPence: 50,
    },
  },
  modelConfig: {
    photography: {
      model: 'gpt-4-vision',
      qualityThreshold: 85,
      costPerRequest: 2,
    },
    contentGeneration: {
      clientFacing: 'gpt-4',
      internal: 'gpt-3.5-turbo',
      bulk: 'gpt-3.5-turbo',
    },
    chatbot: {
      model: 'gpt-3.5-turbo',
      fallbackModel: 'gpt-3.5-turbo',
      contextLength: 4096,
    },
  },
  recommendations: [
    {
      id: '1',
      type: 'cache',
      priority: 'high',
      title: 'Improve Photography AI Cache Hit Rate',
      description:
        'Your photography AI cache hit rate is 80%. With better template caching, you could achieve 90%+ and save £30/month.',
      potentialSavingsPence: 3000,
      implementationDifficulty: 'easy',
      estimatedTimeToImplement: '5 minutes',
      weddingContext: {
        affectedServices: ['Photography AI'],
        seasonalRelevance: true,
        clientImpact: 'none',
      },
      action: {
        buttonText: 'Optimize Cache',
        actionType: 'configure',
      },
    },
    {
      id: '2',
      type: 'seasonal',
      priority: 'medium',
      title: 'Prepare for Wedding Season Peak Costs',
      description:
        'Wedding season (March-Oct) brings 1.6x cost multiplier. Your June projection: £240/month. Consider budget adjustment.',
      potentialSavingsPence: 0,
      implementationDifficulty: 'easy',
      estimatedTimeToImplement: '2 minutes',
      weddingContext: {
        affectedServices: ['All AI Services'],
        seasonalRelevance: true,
        clientImpact: 'minimal',
      },
      action: {
        buttonText: 'Adjust Budget',
        actionType: 'configure',
      },
    },
  ],
  recentSavings: {
    period: 'monthly',
    startDate: '2024-12-20',
    endDate: '2025-01-20',
    baseline: {
      totalCostPence: 18000,
      avgDailyCostPence: 580,
    },
    optimized: {
      totalCostPence: 12000,
      avgDailyCostPence: 387,
    },
    savings: {
      absolutePence: 6000,
      percentage: 33.3,
      projectedAnnualSavingsPence: 72000,
    },
    savingsByOptimization: {
      caching: 4000,
      modelSelection: 1500,
      batchProcessing: 500,
      seasonalOptimization: 0,
    },
    weddingMetrics: {
      weddingsProcessed: 12,
      avgCostPerWedding: 100,
      peakSeasonSavings: 0,
    },
  },
  upcomingJobs: [],
  seasonalProjections: [
    {
      month: 'Jan',
      isWeddingSeason: false,
      multiplier: 1.0,
      baselineCostPence: 9000,
      projectedCostPence: 9000,
      bookingVolume: 3,
      aiIntensity: 'low',
    },
    {
      month: 'Feb',
      isWeddingSeason: false,
      multiplier: 1.0,
      baselineCostPence: 10000,
      projectedCostPence: 10000,
      bookingVolume: 4,
      aiIntensity: 'low',
    },
    {
      month: 'Mar',
      isWeddingSeason: true,
      multiplier: 1.6,
      baselineCostPence: 12000,
      projectedCostPence: 19200,
      bookingVolume: 8,
      aiIntensity: 'medium',
    },
    {
      month: 'Apr',
      isWeddingSeason: true,
      multiplier: 1.6,
      baselineCostPence: 14000,
      projectedCostPence: 22400,
      bookingVolume: 12,
      aiIntensity: 'high',
    },
    {
      month: 'May',
      isWeddingSeason: true,
      multiplier: 1.6,
      baselineCostPence: 16000,
      projectedCostPence: 25600,
      bookingVolume: 15,
      aiIntensity: 'high',
    },
    {
      month: 'Jun',
      isWeddingSeason: true,
      multiplier: 1.6,
      baselineCostPence: 18000,
      projectedCostPence: 28800,
      bookingVolume: 18,
      aiIntensity: 'high',
    },
  ],
  budgetAlerts: {
    level: 'none',
    remainingBudgetPence: 6000, // £60 remaining this month
    daysUntilReset: 11,
  },
  seasonStatus: {
    isCurrentlyPeakSeason: false,
    nextSeasonStart: '2025-03-01',
    currentMultiplier: 1.0,
    recommendedActions: [
      'Prepare budget for March peak season',
      'Optimize caching before demand increases',
    ],
  },
};

const CostOptimizationDashboard: React.FC<CostOptimizationDashboardProps> = ({
  organizationId,
  className,
}) => {
  const [dashboardData, setDashboardData] =
    useState<AIOptimizationDashboardData>(mockDashboardData);
  const [isLoading, setIsLoading] = useState(false);

  // Calculate monthly progress
  const monthlySpendPence = dashboardData.currentUsage.totalCostPence * 20; // Assume 20 days in month so far
  const budgetUsedPercentage =
    (monthlySpendPence / dashboardData.budgetSettings.monthlyBudgetPence) * 100;

  // Format currency helper
  const formatPence = (pence: number): string => {
    return `£${(pence / 100).toFixed(2)}`;
  };

  // Get budget status color
  const getBudgetStatusColor = (percentage: number): string => {
    if (percentage >= 95) return 'text-red-600 bg-red-50 border-red-200';
    if (percentage >= 90)
      return 'text-orange-600 bg-orange-50 border-orange-200';
    if (percentage >= 80)
      return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    return 'text-green-600 bg-green-50 border-green-200';
  };

  // Get recommendation priority color
  const getPriorityColor = (priority: string): string => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-500';
      case 'high':
        return 'bg-orange-500';
      case 'medium':
        return 'bg-yellow-500';
      case 'low':
        return 'bg-blue-500';
      default:
        return 'bg-gray-500';
    }
  };

  // Handle optimization actions
  const handleOptimizationAction = async (
    recommendation: OptimizationRecommendation,
  ) => {
    setIsLoading(true);
    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000));
      console.log(
        `Executing action: ${recommendation.action.actionType} for ${recommendation.title}`,
      );

      // Show success feedback
      // In real implementation, this would update the actual settings
    } catch (error) {
      console.error('Failed to execute optimization:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={`space-y-6 p-6 ${className}`}>
      {/* Header with current status */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            AI Cost Optimization
          </h1>
          <p className="text-gray-600">
            Manage AI costs with wedding season intelligence
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <Badge
            variant="outline"
            className={`${dashboardData.seasonStatus.isCurrentlyPeakSeason ? 'border-orange-300 text-orange-700 bg-orange-50' : 'border-green-300 text-green-700 bg-green-50'}`}
          >
            {dashboardData.seasonStatus.isCurrentlyPeakSeason
              ? 'Peak Wedding Season'
              : 'Low Season'}
          </Badge>
          <Badge
            variant="outline"
            className="border-blue-300 text-blue-700 bg-blue-50"
          >
            {dashboardData.cacheMetrics.hitRate.toFixed(1)}% Cache Hit Rate
          </Badge>
        </div>
      </div>

      {/* Budget Alert */}
      {budgetUsedPercentage >= 80 && (
        <Alert className={getBudgetStatusColor(budgetUsedPercentage)}>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            You've used {budgetUsedPercentage.toFixed(1)}% of your monthly AI
            budget ({formatPence(monthlySpendPence)} of{' '}
            {formatPence(dashboardData.budgetSettings.monthlyBudgetPence)}).
            {budgetUsedPercentage >= 95 &&
              ' Auto-disable will activate at 100% to prevent overages.'}
          </AlertDescription>
        </Alert>
      )}

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Daily Cost */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Today's AI Cost
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatPence(dashboardData.currentUsage.totalCostPence)}
            </div>
            <p className="text-xs text-muted-foreground">
              {dashboardData.currentUsage.isWeddingSeason ? (
                <span className="text-orange-600">Peak season rate (1.6x)</span>
              ) : (
                <span className="text-green-600">Low season rate</span>
              )}
            </p>
          </CardContent>
        </Card>

        {/* Monthly Progress */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Monthly Budget
            </CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {budgetUsedPercentage.toFixed(1)}%
            </div>
            <Progress value={budgetUsedPercentage} className="mt-2" />
            <p className="text-xs text-muted-foreground mt-2">
              {formatPence(dashboardData.budgetAlerts.remainingBudgetPence)}{' '}
              remaining
            </p>
          </CardContent>
        </Card>

        {/* Cache Savings */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cache Savings</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatPence(dashboardData.cacheMetrics.estimatedSavingsPence)}
            </div>
            <p className="text-xs text-muted-foreground">
              <span className="text-green-600">
                ↓ {dashboardData.cacheMetrics.hitRate.toFixed(1)}% hit rate
              </span>
            </p>
          </CardContent>
        </Card>

        {/* API Calls */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">API Calls</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {dashboardData.currentUsage.totalApiCalls.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              {(
                (dashboardData.currentUsage.totalCacheHits /
                  dashboardData.currentUsage.totalApiCalls) *
                100
              ).toFixed(1)}
              % from cache
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Dashboard Tabs */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="breakdown">Cost Breakdown</TabsTrigger>
          <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
          <TabsTrigger value="projections">Season Projections</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* AI Service Usage */}
            <Card>
              <CardHeader>
                <CardTitle>AI Service Usage</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Photography AI */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Camera className="h-5 w-5 text-blue-500" />
                    <div>
                      <p className="font-medium">Photography AI</p>
                      <p className="text-sm text-muted-foreground">
                        {dashboardData.currentUsage.photographyAI.apiCalls}{' '}
                        calls
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">
                      {formatPence(
                        dashboardData.currentUsage.photographyAI.costPence,
                      )}
                    </p>
                    <p className="text-sm text-green-600">
                      {(
                        (dashboardData.currentUsage.photographyAI.cacheHits /
                          (dashboardData.currentUsage.photographyAI.cacheHits +
                            dashboardData.currentUsage.photographyAI
                              .cacheMisses)) *
                        100
                      ).toFixed(1)}
                      % cached
                    </p>
                  </div>
                </div>

                {/* Content Generation */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <FileText className="h-5 w-5 text-green-500" />
                    <div>
                      <p className="font-medium">Content Generation</p>
                      <p className="text-sm text-muted-foreground">
                        {dashboardData.currentUsage.contentGeneration.apiCalls}{' '}
                        calls
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">
                      {formatPence(
                        dashboardData.currentUsage.contentGeneration.costPence,
                      )}
                    </p>
                    <p className="text-sm text-green-600">
                      {(
                        (dashboardData.currentUsage.contentGeneration
                          .cacheHits /
                          (dashboardData.currentUsage.contentGeneration
                            .cacheHits +
                            dashboardData.currentUsage.contentGeneration
                              .cacheMisses)) *
                        100
                      ).toFixed(1)}
                      % cached
                    </p>
                  </div>
                </div>

                {/* Chatbot */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <MessageCircle className="h-5 w-5 text-purple-500" />
                    <div>
                      <p className="font-medium">Chatbot</p>
                      <p className="text-sm text-muted-foreground">
                        {
                          dashboardData.currentUsage.chatbotInteractions
                            .apiCalls
                        }{' '}
                        messages
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">
                      {formatPence(
                        dashboardData.currentUsage.chatbotInteractions
                          .costPence,
                      )}
                    </p>
                    <p className="text-sm text-green-600">
                      {(
                        (dashboardData.currentUsage.chatbotInteractions
                          .cacheHits /
                          (dashboardData.currentUsage.chatbotInteractions
                            .cacheHits +
                            dashboardData.currentUsage.chatbotInteractions
                              .cacheMisses)) *
                        100
                      ).toFixed(1)}
                      % cached
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Recent Savings */}
            <Card>
              <CardHeader>
                <CardTitle>Monthly Savings Report</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Total Saved</span>
                    <span className="text-2xl font-bold text-green-600">
                      {formatPence(
                        dashboardData.recentSavings.savings.absolutePence,
                      )}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      Percentage Saved
                    </span>
                    <span className="text-lg font-medium text-green-600">
                      {dashboardData.recentSavings.savings.percentage.toFixed(
                        1,
                      )}
                      %
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      Annual Projection
                    </span>
                    <span className="text-lg font-medium text-green-600">
                      {formatPence(
                        dashboardData.recentSavings.savings
                          .projectedAnnualSavingsPence,
                      )}
                    </span>
                  </div>

                  <div className="pt-4 border-t">
                    <h4 className="text-sm font-medium mb-2">
                      Savings Breakdown:
                    </h4>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span>Smart Caching</span>
                        <span>
                          {formatPence(
                            dashboardData.recentSavings.savingsByOptimization
                              .caching,
                          )}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Model Selection</span>
                        <span>
                          {formatPence(
                            dashboardData.recentSavings.savingsByOptimization
                              .modelSelection,
                          )}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Batch Processing</span>
                        <span>
                          {formatPence(
                            dashboardData.recentSavings.savingsByOptimization
                              .batchProcessing,
                          )}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Cost Breakdown Tab */}
        <TabsContent value="breakdown" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Detailed Cost Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Model Usage Breakdown */}
                <div>
                  <h4 className="text-sm font-medium mb-3">
                    Content Generation Model Usage
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-blue-50 p-3 rounded-lg">
                      <div className="text-sm text-blue-600 font-medium">
                        GPT-4 (Premium)
                      </div>
                      <div className="text-2xl font-bold text-blue-800">
                        {
                          dashboardData.currentUsage.contentGeneration
                            .modelUsage.gpt4
                        }
                      </div>
                      <div className="text-xs text-blue-600">
                        calls · Higher cost, better quality
                      </div>
                    </div>
                    <div className="bg-green-50 p-3 rounded-lg">
                      <div className="text-sm text-green-600 font-medium">
                        GPT-3.5 (Standard)
                      </div>
                      <div className="text-2xl font-bold text-green-800">
                        {
                          dashboardData.currentUsage.contentGeneration
                            .modelUsage.gpt35
                        }
                      </div>
                      <div className="text-xs text-green-600">
                        calls · Cost-effective option
                      </div>
                    </div>
                  </div>
                </div>

                {/* Wedding Industry Context */}
                <div>
                  <h4 className="text-sm font-medium mb-3">
                    Wedding Business Impact
                  </h4>
                  <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                    <div className="flex items-start space-x-3">
                      <Calendar className="h-5 w-5 text-yellow-600 mt-1" />
                      <div>
                        <p className="font-medium text-yellow-800">
                          Season Status
                        </p>
                        <p className="text-sm text-yellow-700 mt-1">
                          Currently in low season (January). Peak wedding season
                          starts March 1st. Expect costs to increase by 60%
                          during peak months (March-October).
                        </p>
                        <div className="mt-2">
                          <p className="text-xs text-yellow-600">
                            • Current daily average:{' '}
                            {formatPence(
                              dashboardData.currentUsage.totalCostPence,
                            )}
                          </p>
                          <p className="text-xs text-yellow-600">
                            • Peak season projection:{' '}
                            {formatPence(
                              Math.round(
                                dashboardData.currentUsage.totalCostPence * 1.6,
                              ),
                            )}{' '}
                            daily
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Recommendations Tab */}
        <TabsContent value="recommendations" className="space-y-6">
          <div className="space-y-4">
            {dashboardData.recommendations.map((recommendation) => (
              <Card
                key={recommendation.id}
                className="border-l-4 border-l-blue-500"
              >
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">
                      {recommendation.title}
                    </CardTitle>
                    <div className="flex items-center space-x-2">
                      <Badge
                        className={getPriorityColor(recommendation.priority)}
                      >
                        {recommendation.priority}
                      </Badge>
                      {recommendation.potentialSavingsPence > 0 && (
                        <Badge
                          variant="outline"
                          className="text-green-600 border-green-300 bg-green-50"
                        >
                          Save{' '}
                          {formatPence(recommendation.potentialSavingsPence)}
                          /month
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-700 mb-4">
                    {recommendation.description}
                  </p>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4 text-sm text-gray-600">
                      <span className="flex items-center">
                        <Clock className="h-4 w-4 mr-1" />
                        {recommendation.estimatedTimeToImplement}
                      </span>
                      <span className="flex items-center">
                        <CheckCircle className="h-4 w-4 mr-1" />
                        {recommendation.implementationDifficulty} setup
                      </span>
                    </div>

                    <Button
                      onClick={() => handleOptimizationAction(recommendation)}
                      disabled={isLoading}
                      size="sm"
                    >
                      {recommendation.action.buttonText}
                    </Button>
                  </div>

                  {recommendation.weddingContext.seasonalRelevance && (
                    <div className="mt-3 p-3 bg-orange-50 rounded-lg border border-orange-200">
                      <p className="text-sm text-orange-800">
                        <strong>Wedding Season Impact:</strong> This
                        optimization becomes more valuable during peak wedding
                        season (March-October) when AI costs increase by 60%.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Season Projections Tab */}
        <TabsContent value="projections" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Wedding Season Cost Projections</CardTitle>
              <p className="text-sm text-gray-600">
                Plan your AI budget around wedding season demand patterns
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {dashboardData.seasonalProjections.map((projection) => (
                  <div
                    key={projection.month}
                    className={`flex items-center justify-between p-4 rounded-lg border ${
                      projection.isWeddingSeason
                        ? 'bg-orange-50 border-orange-200'
                        : 'bg-gray-50 border-gray-200'
                    }`}
                  >
                    <div className="flex items-center space-x-4">
                      <div className="text-center min-w-[60px]">
                        <div className="font-bold text-gray-900">
                          {projection.month}
                        </div>
                        <Badge
                          variant={
                            projection.isWeddingSeason ? 'default' : 'secondary'
                          }
                          className={
                            projection.isWeddingSeason ? 'bg-orange-500' : ''
                          }
                        >
                          {projection.isWeddingSeason ? 'Peak' : 'Low'}
                        </Badge>
                      </div>

                      <div>
                        <div className="font-medium">
                          {formatPence(projection.projectedCostPence)} projected
                        </div>
                        <div className="text-sm text-gray-600">
                          {projection.bookingVolume} weddings ·{' '}
                          {projection.aiIntensity} AI usage
                        </div>
                        {projection.isWeddingSeason && (
                          <div className="text-xs text-orange-600">
                            +{((projection.multiplier - 1) * 100).toFixed(0)}%
                            season multiplier
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="text-right">
                      {projection.projectedCostPence !==
                        projection.baselineCostPence && (
                        <div className="text-sm text-gray-500 line-through">
                          {formatPence(projection.baselineCostPence)}
                        </div>
                      )}
                      <div className="font-bold text-lg">
                        {formatPence(projection.projectedCostPence)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <h4 className="font-medium text-blue-900 mb-2">
                  Season Optimization Tips:
                </h4>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>
                    • Enable aggressive caching before March to handle increased
                    volume
                  </li>
                  <li>
                    • Consider increasing budget by 60% during peak months
                    (March-October)
                  </li>
                  <li>
                    • Use batch processing for non-urgent tasks during high-cost
                    periods
                  </li>
                  <li>
                    • Switch to GPT-3.5 for internal communications during peak
                    season
                  </li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default CostOptimizationDashboard;
