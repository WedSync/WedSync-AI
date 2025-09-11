'use client';

// WS-332 Analytics Dashboard - Booking Funnel Analytics Component
// Team A - Round 1 - Interactive conversion funnel visualization

import React, { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  BookingFunnelAnalyticsProps,
  FunnelStage,
  ConversionGoal,
  DropoffReason,
  FunnelConfiguration,
} from '@/types/analytics';

// UI Components
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

// Icons
import {
  Users,
  TrendingDown,
  TrendingUp,
  Clock,
  AlertTriangle,
  Target,
  ChevronRight,
  Eye,
  MessageCircle,
  Calendar,
  CreditCard,
  CheckCircle,
  XCircle,
  BarChart3,
} from 'lucide-react';

// Mock funnel data
const mockFunnelData: FunnelStage[] = [
  {
    id: 'website_visit',
    name: 'Website Visit',
    description: 'Potential clients visit your website',
    visitors: 2450,
    conversions: 735,
    conversionRate: 30.0,
    averageTimeInStage: 24,
    dropoffReasons: [
      {
        reason: 'High prices',
        percentage: 35,
        frequency: 12,
        severity: 'high',
        suggestedActions: [
          'Create budget-friendly packages',
          'Show value proposition',
        ],
      },
      {
        reason: 'Poor portfolio quality',
        percentage: 25,
        frequency: 8,
        severity: 'critical',
        suggestedActions: ['Update portfolio', 'Add recent work'],
      },
      {
        reason: 'No availability shown',
        percentage: 20,
        frequency: 6,
        severity: 'medium',
        suggestedActions: ['Add availability calendar', 'Show open dates'],
      },
    ],
  },
  {
    id: 'contact_inquiry',
    name: 'Contact Inquiry',
    description: 'Visitors submit contact form or call',
    visitors: 735,
    conversions: 441,
    conversionRate: 60.0,
    averageTimeInStage: 12,
    dropoffReasons: [
      {
        reason: 'Slow response time',
        percentage: 40,
        frequency: 15,
        severity: 'critical',
        suggestedActions: [
          'Set up auto-replies',
          'Check emails more frequently',
        ],
      },
      {
        reason: 'Generic responses',
        percentage: 30,
        frequency: 11,
        severity: 'high',
        suggestedActions: [
          'Personalize responses',
          'Reference their specific needs',
        ],
      },
      {
        reason: 'No follow-up',
        percentage: 20,
        frequency: 7,
        severity: 'medium',
        suggestedActions: [
          'Set follow-up reminders',
          'Create nurture sequence',
        ],
      },
    ],
  },
  {
    id: 'consultation',
    name: 'Consultation',
    description: 'Initial consultation or meeting',
    visitors: 441,
    conversions: 309,
    conversionRate: 70.1,
    averageTimeInStage: 48,
    dropoffReasons: [
      {
        reason: 'Personality mismatch',
        percentage: 45,
        frequency: 18,
        severity: 'low',
        suggestedActions: [
          'Better pre-qualification',
          'Showcase personality in marketing',
        ],
      },
      {
        reason: 'Package not suitable',
        percentage: 30,
        frequency: 12,
        severity: 'medium',
        suggestedActions: ['Create flexible packages', 'Offer customization'],
      },
      {
        reason: 'Timeline conflicts',
        percentage: 25,
        frequency: 10,
        severity: 'high',
        suggestedActions: [
          'Maintain updated calendar',
          'Book further in advance',
        ],
      },
    ],
  },
  {
    id: 'proposal',
    name: 'Proposal Sent',
    description: 'Custom proposal sent to client',
    visitors: 309,
    conversions: 185,
    conversionRate: 59.9,
    averageTimeInStage: 72,
    dropoffReasons: [
      {
        reason: 'Price objections',
        percentage: 50,
        frequency: 25,
        severity: 'high',
        suggestedActions: [
          'Justify pricing better',
          'Show package value',
          'Offer payment plans',
        ],
      },
      {
        reason: 'Comparing with others',
        percentage: 30,
        frequency: 15,
        severity: 'medium',
        suggestedActions: ['Emphasize unique value', 'Add urgency elements'],
      },
      {
        reason: 'Budget constraints',
        percentage: 20,
        frequency: 10,
        severity: 'medium',
        suggestedActions: [
          'Create lower-tier packages',
          'Offer seasonal discounts',
        ],
      },
    ],
  },
  {
    id: 'contract_signed',
    name: 'Contract Signed',
    description: 'Client signs contract and pays deposit',
    visitors: 185,
    conversions: 185,
    conversionRate: 100.0,
    averageTimeInStage: 0,
    dropoffReasons: [],
  },
];

const mockConversionGoals: ConversionGoal[] = [
  {
    stageName: 'Website Visit',
    targetConversionRate: 35.0,
    currentConversionRate: 30.0,
    performance: 'below_target',
    improvementSuggestions: [
      'Improve website design',
      'Add social proof',
      'Optimize for mobile',
    ],
  },
  {
    stageName: 'Contact Inquiry',
    targetConversionRate: 65.0,
    currentConversionRate: 60.0,
    performance: 'below_target',
    improvementSuggestions: [
      'Faster response times',
      'Better follow-up system',
    ],
  },
  {
    stageName: 'Consultation',
    targetConversionRate: 75.0,
    currentConversionRate: 70.1,
    performance: 'below_target',
    improvementSuggestions: [
      'Better pre-qualification',
      'Improve presentation skills',
    ],
  },
  {
    stageName: 'Proposal Sent',
    targetConversionRate: 65.0,
    currentConversionRate: 59.9,
    performance: 'below_target',
    improvementSuggestions: ['Better pricing strategy', 'Show more value'],
  },
];

export function BookingFunnelAnalytics({
  vendorId,
  timeframe,
  funnelConfiguration,
  onStageClick,
}: BookingFunnelAnalyticsProps) {
  // State Management
  const [selectedStage, setSelectedStage] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<
    'funnel' | 'conversion' | 'dropoffs'
  >('funnel');
  const [showOptimizations, setShowOptimizations] = useState(false);

  // Memoized calculations
  const overallConversion = useMemo(() => {
    const totalVisitors = mockFunnelData[0]?.visitors || 0;
    const totalConversions =
      mockFunnelData[mockFunnelData.length - 1]?.visitors || 0;
    return totalVisitors > 0 ? (totalConversions / totalVisitors) * 100 : 0;
  }, []);

  const biggestDropoff = useMemo(() => {
    let maxDropoff = 0;
    let worstStage = null;

    for (let i = 0; i < mockFunnelData.length - 1; i++) {
      const current = mockFunnelData[i];
      const next = mockFunnelData[i + 1];
      const dropoffRate =
        ((current.visitors - next.visitors) / current.visitors) * 100;

      if (dropoffRate > maxDropoff) {
        maxDropoff = dropoffRate;
        worstStage = current;
      }
    }

    return { stage: worstStage, dropoffRate: maxDropoff };
  }, []);

  // Stage click handler
  const handleStageClick = useCallback(
    (stage: FunnelStage) => {
      setSelectedStage(selectedStage === stage.id ? null : stage.id);
      onStageClick(stage);
    },
    [selectedStage, onStageClick],
  );

  // Format percentage
  const formatPercentage = useCallback((value: number) => {
    return `${value.toFixed(1)}%`;
  }, []);

  // Get stage icon
  const getStageIcon = useCallback((stageId: string) => {
    const iconMap = {
      website_visit: Eye,
      contact_inquiry: MessageCircle,
      consultation: Calendar,
      proposal: Target,
      contract_signed: CheckCircle,
    };
    return iconMap[stageId as keyof typeof iconMap] || Users;
  }, []);

  // Get performance color
  const getPerformanceColor = useCallback((performance: string) => {
    const colorMap = {
      above_target: 'text-green-600',
      meeting_target: 'text-blue-600',
      below_target: 'text-red-600',
    };
    return colorMap[performance as keyof typeof colorMap] || 'text-gray-600';
  }, []);

  return (
    <div className="booking-funnel-analytics space-y-6">
      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">
              Overall Conversion
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              {formatPercentage(overallConversion)}
            </div>
            <div className="text-sm text-slate-500">
              {mockFunnelData[mockFunnelData.length - 1]?.visitors || 0} of{' '}
              {mockFunnelData[0]?.visitors || 0} visitors
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">
              Biggest Dropoff
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {formatPercentage(biggestDropoff.dropoffRate)}
            </div>
            <div className="text-sm text-slate-500">
              At {biggestDropoff.stage?.name || 'N/A'}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">
              Avg Time to Convert
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              {Math.round(
                mockFunnelData.reduce(
                  (sum, stage) => sum + stage.averageTimeInStage,
                  0,
                ) / 24,
              )}
              d
            </div>
            <div className="text-sm text-slate-500">From visit to booking</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">
              Total Opportunities
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              {mockFunnelData[0]?.visitors || 0}
            </div>
            <div className="text-sm text-slate-500">
              Website visitors this period
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Funnel Visualization */}
      <Tabs
        value={viewMode}
        onValueChange={(value: any) => setViewMode(value)}
        className="space-y-6"
      >
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="funnel">Funnel View</TabsTrigger>
            <TabsTrigger value="conversion">Conversion Goals</TabsTrigger>
            <TabsTrigger value="dropoffs">Dropoff Analysis</TabsTrigger>
          </TabsList>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowOptimizations(!showOptimizations)}
          >
            <Target className="h-4 w-4 mr-2" />
            {showOptimizations ? 'Hide' : 'Show'} Optimizations
          </Button>
        </div>

        {/* Funnel View */}
        <TabsContent value="funnel" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Wedding Booking Funnel</CardTitle>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Track how potential clients move through your booking process
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {mockFunnelData.map((stage, index) => {
                  const IconComponent = getStageIcon(stage.id);
                  const isSelected = selectedStage === stage.id;
                  const isLast = index === mockFunnelData.length - 1;
                  const nextStage = !isLast ? mockFunnelData[index + 1] : null;
                  const dropoffCount = nextStage
                    ? stage.visitors - nextStage.visitors
                    : 0;
                  const dropoffRate = nextStage
                    ? (dropoffCount / stage.visitors) * 100
                    : 0;

                  return (
                    <div key={stage.id} className="relative">
                      {/* Stage Card */}
                      <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className={`p-4 rounded-lg border cursor-pointer transition-all duration-200 ${
                          isSelected
                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                            : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                        }`}
                        onClick={() => handleStageClick(stage)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/30">
                              <IconComponent className="h-6 w-6 text-blue-600" />
                            </div>
                            <div>
                              <h4 className="font-semibold text-slate-900 dark:text-slate-100">
                                {stage.name}
                              </h4>
                              <p className="text-sm text-slate-600 dark:text-slate-400">
                                {stage.description}
                              </p>
                            </div>
                          </div>

                          <div className="text-right">
                            <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                              {stage.visitors.toLocaleString()}
                            </div>
                            <div className="text-sm text-slate-500">
                              {formatPercentage(stage.conversionRate)}{' '}
                              conversion
                            </div>
                            {stage.averageTimeInStage > 0 && (
                              <div className="text-xs text-slate-400 flex items-center gap-1 mt-1">
                                <Clock className="h-3 w-3" />
                                {stage.averageTimeInStage}h avg
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Conversion Progress Bar */}
                        <div className="mt-4">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm text-slate-600 dark:text-slate-400">
                              Conversion Rate
                            </span>
                            <span className="text-sm font-medium text-slate-900 dark:text-slate-100">
                              {formatPercentage(stage.conversionRate)}
                            </span>
                          </div>
                          <Progress
                            value={stage.conversionRate}
                            className="h-2"
                          />
                        </div>
                      </motion.div>

                      {/* Dropoff Information */}
                      {!isLast && (
                        <div className="flex items-center justify-center py-2">
                          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-red-50 dark:bg-red-900/20 text-red-600 text-sm">
                            <TrendingDown className="h-4 w-4" />
                            {dropoffCount.toLocaleString()} dropped off (
                            {formatPercentage(dropoffRate)})
                          </div>
                        </div>
                      )}

                      {/* Stage Details (Expandable) */}
                      <AnimatePresence>
                        {isSelected && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="mt-4 p-4 rounded-lg bg-slate-50 dark:bg-slate-800"
                          >
                            <h5 className="font-semibold text-slate-900 dark:text-slate-100 mb-3">
                              Top Dropoff Reasons
                            </h5>
                            <div className="space-y-2">
                              {stage.dropoffReasons.map(
                                (reason, reasonIndex) => (
                                  <div
                                    key={reasonIndex}
                                    className="flex items-center justify-between p-2 rounded bg-white dark:bg-slate-900"
                                  >
                                    <div className="flex items-center gap-2">
                                      <AlertTriangle
                                        className={`h-4 w-4 ${
                                          reason.severity === 'critical'
                                            ? 'text-red-500'
                                            : reason.severity === 'high'
                                              ? 'text-orange-500'
                                              : reason.severity === 'medium'
                                                ? 'text-yellow-500'
                                                : 'text-gray-500'
                                        }`}
                                      />
                                      <span className="text-sm text-slate-700 dark:text-slate-300">
                                        {reason.reason}
                                      </span>
                                    </div>
                                    <div className="text-right">
                                      <Badge
                                        variant={
                                          reason.severity === 'critical'
                                            ? 'destructive'
                                            : reason.severity === 'high'
                                              ? 'default'
                                              : 'secondary'
                                        }
                                      >
                                        {formatPercentage(reason.percentage)}
                                      </Badge>
                                    </div>
                                  </div>
                                ),
                              )}
                            </div>

                            {showOptimizations &&
                              stage.dropoffReasons.length > 0 && (
                                <div className="mt-4">
                                  <h6 className="font-medium text-slate-800 dark:text-slate-200 mb-2">
                                    Suggested Actions:
                                  </h6>
                                  <div className="space-y-1">
                                    {stage.dropoffReasons[0].suggestedActions.map(
                                      (action, actionIndex) => (
                                        <div
                                          key={actionIndex}
                                          className="flex items-center gap-2 text-sm text-green-700 dark:text-green-300"
                                        >
                                          <CheckCircle className="h-3 w-3" />
                                          {action}
                                        </div>
                                      ),
                                    )}
                                  </div>
                                </div>
                              )}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Conversion Goals */}
        <TabsContent value="conversion" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Conversion Goals & Performance</CardTitle>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Track your funnel performance against target conversion rates
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {mockConversionGoals.map((goal, index) => (
                  <motion.div
                    key={goal.stageName}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="p-4 rounded-lg border border-slate-200 dark:border-slate-700"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-semibold text-slate-900 dark:text-slate-100">
                        {goal.stageName}
                      </h4>
                      <Badge
                        variant={
                          goal.performance === 'above_target'
                            ? 'default'
                            : goal.performance === 'meeting_target'
                              ? 'secondary'
                              : 'destructive'
                        }
                      >
                        {goal.performance
                          .replace('_', ' ')
                          .replace(/\b\w/g, (l) => l.toUpperCase())}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-3">
                      <div>
                        <div className="text-sm text-slate-600 dark:text-slate-400">
                          Current Rate
                        </div>
                        <div
                          className={`text-lg font-bold ${getPerformanceColor(goal.performance)}`}
                        >
                          {formatPercentage(goal.currentConversionRate)}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-slate-600 dark:text-slate-400">
                          Target Rate
                        </div>
                        <div className="text-lg font-bold text-slate-900 dark:text-slate-100">
                          {formatPercentage(goal.targetConversionRate)}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2 mb-4">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-600 dark:text-slate-400">
                          Progress to Target
                        </span>
                        <span className="font-medium">
                          {formatPercentage(
                            (goal.currentConversionRate /
                              goal.targetConversionRate) *
                              100,
                          )}
                        </span>
                      </div>
                      <Progress
                        value={
                          (goal.currentConversionRate /
                            goal.targetConversionRate) *
                          100
                        }
                        className="h-2"
                      />
                    </div>

                    <div className="space-y-1">
                      <h5 className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        Improvement Suggestions:
                      </h5>
                      {goal.improvementSuggestions.map(
                        (suggestion, suggestionIndex) => (
                          <div
                            key={suggestionIndex}
                            className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400"
                          >
                            <Target className="h-3 w-3 text-blue-500" />
                            {suggestion}
                          </div>
                        ),
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Dropoff Analysis */}
        <TabsContent value="dropoffs" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Detailed Dropoff Analysis</CardTitle>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Understand why potential clients are not converting
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {mockFunnelData
                  .filter((stage) => stage.dropoffReasons.length > 0)
                  .map((stage, index) => (
                    <motion.div
                      key={stage.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800"
                    >
                      <h4 className="font-semibold text-slate-900 dark:text-slate-100 mb-4">
                        {stage.name} Dropoffs
                      </h4>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {stage.dropoffReasons.map((reason, reasonIndex) => (
                          <div
                            key={reasonIndex}
                            className="p-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700"
                          >
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <AlertTriangle
                                  className={`h-4 w-4 ${
                                    reason.severity === 'critical'
                                      ? 'text-red-500'
                                      : reason.severity === 'high'
                                        ? 'text-orange-500'
                                        : reason.severity === 'medium'
                                          ? 'text-yellow-500'
                                          : 'text-gray-500'
                                  }`}
                                />
                                <span className="font-medium text-slate-900 dark:text-slate-100">
                                  {reason.reason}
                                </span>
                              </div>
                              <Badge
                                variant={
                                  reason.severity === 'critical'
                                    ? 'destructive'
                                    : reason.severity === 'high'
                                      ? 'default'
                                      : 'secondary'
                                }
                              >
                                {formatPercentage(reason.percentage)}
                              </Badge>
                            </div>

                            <div className="text-sm text-slate-600 dark:text-slate-400 mb-3">
                              Affects {reason.frequency} potential bookings
                            </div>

                            <div className="space-y-1">
                              <div className="text-xs font-medium text-slate-700 dark:text-slate-300">
                                Suggested Solutions:
                              </div>
                              {reason.suggestedActions
                                .slice(0, 2)
                                .map((action, actionIndex) => (
                                  <div
                                    key={actionIndex}
                                    className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400"
                                  >
                                    <CheckCircle className="h-3 w-3" />
                                    {action}
                                  </div>
                                ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
