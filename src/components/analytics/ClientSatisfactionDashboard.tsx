'use client';

// WS-332 Analytics Dashboard - Client Satisfaction Dashboard Component
// Team A - Round 1 - Client satisfaction metrics and feedback analysis

import React, { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ClientSatisfactionDashboardProps,
  SatisfactionMetrics,
  CategorySatisfaction,
  FeedbackCategory,
} from '@/types/analytics';

// UI Components
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

// Icons
import {
  Heart,
  TrendingUp,
  TrendingDown,
  MessageCircle,
  Star,
  Users,
  ThumbsUp,
  ThumbsDown,
  Clock,
  Award,
  Target,
  AlertCircle,
  CheckCircle,
  Smile,
  Meh,
  Frown,
} from 'lucide-react';

export function ClientSatisfactionDashboard({
  vendorId,
  timeframe,
  satisfactionMetrics,
  onFeedbackDrillDown,
}: ClientSatisfactionDashboardProps) {
  // State Management
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'overview' | 'trends' | 'feedback'>(
    'overview',
  );

  // Mock satisfaction data - In production, this would come from props
  const mockSatisfactionData: SatisfactionMetrics = {
    overallSatisfactionScore: 8.7,
    netPromoterScore: 65,
    clientRetentionRate: 92,
    referralRate: 45,
    responseRate: 78,
    satisfactionTrends: [
      {
        period: 'Jan',
        satisfactionScore: 8.2,
        responseCount: 12,
        categoryBreakdown: [
          {
            category: 'communication',
            score: 8.5,
            improvement: 0.3,
            feedbackCount: 12,
            commonFeedback: ['Very responsive', 'Clear communication'],
          },
          {
            category: 'quality',
            score: 9.1,
            improvement: 0.2,
            feedbackCount: 12,
            commonFeedback: ['Amazing photos', 'Professional quality'],
          },
          {
            category: 'timeliness',
            score: 7.8,
            improvement: -0.1,
            feedbackCount: 12,
            commonFeedback: ['On time', 'Quick delivery'],
          },
          {
            category: 'value',
            score: 8.0,
            improvement: 0.1,
            feedbackCount: 12,
            commonFeedback: ['Worth the price', 'Good value'],
          },
          {
            category: 'professionalism',
            score: 8.9,
            improvement: 0.4,
            feedbackCount: 12,
            commonFeedback: ['Very professional', 'Easy to work with'],
          },
        ],
      },
      {
        period: 'Feb',
        satisfactionScore: 8.4,
        responseCount: 15,
        categoryBreakdown: [
          {
            category: 'communication',
            score: 8.7,
            improvement: 0.2,
            feedbackCount: 15,
            commonFeedback: ['Great communication', 'Always available'],
          },
          {
            category: 'quality',
            score: 9.0,
            improvement: -0.1,
            feedbackCount: 15,
            commonFeedback: ['Beautiful work', 'Exceeded expectations'],
          },
          {
            category: 'timeliness',
            score: 8.1,
            improvement: 0.3,
            feedbackCount: 15,
            commonFeedback: ['Punctual', 'Fast turnaround'],
          },
          {
            category: 'value',
            score: 8.2,
            improvement: 0.2,
            feedbackCount: 15,
            commonFeedback: ['Great value', 'Fair pricing'],
          },
          {
            category: 'professionalism',
            score: 9.2,
            improvement: 0.3,
            feedbackCount: 15,
            commonFeedback: ['Extremely professional', 'Pleasure to work with'],
          },
        ],
      },
      {
        period: 'Mar',
        satisfactionScore: 8.7,
        responseCount: 18,
        categoryBreakdown: [
          {
            category: 'communication',
            score: 8.8,
            improvement: 0.1,
            feedbackCount: 18,
            commonFeedback: ['Excellent communication', 'Kept us informed'],
          },
          {
            category: 'quality',
            score: 9.2,
            improvement: 0.2,
            feedbackCount: 18,
            commonFeedback: ['Outstanding quality', 'Artistic vision'],
          },
          {
            category: 'timeliness',
            score: 8.0,
            improvement: -0.1,
            feedbackCount: 18,
            commonFeedback: ['Reliable timing', 'Met deadlines'],
          },
          {
            category: 'value',
            score: 8.3,
            improvement: 0.1,
            feedbackCount: 18,
            commonFeedback: ['Excellent value', 'Worth every penny'],
          },
          {
            category: 'professionalism',
            score: 9.1,
            improvement: -0.1,
            feedbackCount: 18,
            commonFeedback: ['True professional', 'Made us feel comfortable'],
          },
        ],
      },
    ],
  };

  // Memoized calculations
  const satisfactionGrade = useMemo(() => {
    const score = mockSatisfactionData.overallSatisfactionScore;
    if (score >= 9.0)
      return {
        grade: 'A+',
        color: 'text-green-600',
        description: 'Exceptional',
      };
    if (score >= 8.5)
      return { grade: 'A', color: 'text-green-600', description: 'Excellent' };
    if (score >= 8.0)
      return { grade: 'B+', color: 'text-blue-600', description: 'Very Good' };
    if (score >= 7.5)
      return { grade: 'B', color: 'text-blue-600', description: 'Good' };
    if (score >= 7.0)
      return {
        grade: 'B-',
        color: 'text-yellow-600',
        description: 'Above Average',
      };
    if (score >= 6.5)
      return { grade: 'C+', color: 'text-yellow-600', description: 'Average' };
    return { grade: 'C', color: 'text-red-600', description: 'Below Average' };
  }, [mockSatisfactionData.overallSatisfactionScore]);

  const npsCategory = useMemo(() => {
    const nps = mockSatisfactionData.netPromoterScore;
    if (nps >= 70)
      return {
        category: 'Excellent',
        color: 'text-green-600',
        description: 'World-class',
      };
    if (nps >= 50)
      return {
        category: 'Great',
        color: 'text-green-600',
        description: 'Industry leading',
      };
    if (nps >= 30)
      return {
        category: 'Good',
        color: 'text-blue-600',
        description: 'Above average',
      };
    if (nps >= 0)
      return {
        category: 'Fair',
        color: 'text-yellow-600',
        description: 'Room for improvement',
      };
    return {
      category: 'Poor',
      color: 'text-red-600',
      description: 'Critical issues',
    };
  }, [mockSatisfactionData.netPromoterScore]);

  const averageCategoryScores = useMemo(() => {
    const latestTrend =
      mockSatisfactionData.satisfactionTrends[
        mockSatisfactionData.satisfactionTrends.length - 1
      ];
    return latestTrend?.categoryBreakdown || [];
  }, [mockSatisfactionData.satisfactionTrends]);

  const bestCategory = useMemo(() => {
    return averageCategoryScores.reduce(
      (best, category) => (category.score > best.score ? category : best),
      averageCategoryScores[0] || {
        category: '',
        score: 0,
        improvement: 0,
        feedbackCount: 0,
        commonFeedback: [],
      },
    );
  }, [averageCategoryScores]);

  const worstCategory = useMemo(() => {
    return averageCategoryScores.reduce(
      (worst, category) => (category.score < worst.score ? category : worst),
      averageCategoryScores[0] || {
        category: '',
        score: 10,
        improvement: 0,
        feedbackCount: 0,
        commonFeedback: [],
      },
    );
  }, [averageCategoryScores]);

  // Category click handler
  const handleCategoryClick = useCallback(
    (category: CategorySatisfaction) => {
      setSelectedCategory(
        selectedCategory === category.category ? null : category.category,
      );

      const feedbackCategory: FeedbackCategory = {
        name: category.category,
        averageScore: category.score,
        feedbackCount: category.feedbackCount,
        sentimentAnalysis: {
          positive: 75,
          neutral: 20,
          negative: 5,
          averageSentiment: 0.7,
          trendDirection:
            category.improvement > 0
              ? 'improving'
              : category.improvement < 0
                ? 'declining'
                : 'stable',
        },
        topComplaints: [
          {
            issue: 'Response time',
            frequency: 8,
            severity: 'medium',
            avgImpactOnRating: -0.5,
            suggestedResolution: 'Set up auto-responses',
          },
          {
            issue: 'Pricing clarity',
            frequency: 5,
            severity: 'low',
            avgImpactOnRating: -0.3,
            suggestedResolution: 'Provide detailed quotes',
          },
        ],
        topPraises: [
          {
            aspect: 'Photo quality',
            frequency: 25,
            avgBoostToRating: 1.2,
            customerQuotes: ['Amazing photos!', 'Professional quality'],
          },
          {
            aspect: 'Communication',
            frequency: 18,
            avgBoostToRating: 0.8,
            customerQuotes: ['Very responsive', 'Great communication'],
          },
        ],
      };

      onFeedbackDrillDown(feedbackCategory);
    },
    [selectedCategory, onFeedbackDrillDown],
  );

  // Format percentage
  const formatPercentage = useCallback((value: number) => {
    return `${value.toFixed(1)}%`;
  }, []);

  // Get category icon
  const getCategoryIcon = useCallback((category: string) => {
    const iconMap = {
      communication: MessageCircle,
      quality: Star,
      timeliness: Clock,
      value: Target,
      professionalism: Award,
    };
    return iconMap[category as keyof typeof iconMap] || Heart;
  }, []);

  // Get satisfaction emoji
  const getSatisfactionEmoji = useCallback((score: number) => {
    if (score >= 8.5) return Smile;
    if (score >= 7.0) return Meh;
    return Frown;
  }, []);

  return (
    <div className="client-satisfaction-dashboard space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Overall Satisfaction Score */}
        <Card className="relative overflow-hidden">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">
                Satisfaction Score
              </CardTitle>
              <Heart className="h-4 w-4 text-slate-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <div className="text-3xl font-bold text-slate-900 dark:text-slate-100">
                {mockSatisfactionData.overallSatisfactionScore.toFixed(1)}
              </div>
              <div className="text-right">
                <div className={`text-lg font-bold ${satisfactionGrade.color}`}>
                  {satisfactionGrade.grade}
                </div>
                <div className="text-xs text-slate-500">
                  {satisfactionGrade.description}
                </div>
              </div>
            </div>
            <div className="mt-3">
              <Progress
                value={mockSatisfactionData.overallSatisfactionScore * 10}
                className="h-2"
              />
            </div>
          </CardContent>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-green-500 to-blue-500" />
        </Card>

        {/* Net Promoter Score */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">
                Net Promoter Score
              </CardTitle>
              <ThumbsUp className="h-4 w-4 text-slate-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <div className="text-3xl font-bold text-slate-900 dark:text-slate-100">
                {mockSatisfactionData.netPromoterScore}
              </div>
              <div className="text-right">
                <div className={`text-sm font-bold ${npsCategory.color}`}>
                  {npsCategory.category}
                </div>
                <div className="text-xs text-slate-500">
                  {npsCategory.description}
                </div>
              </div>
            </div>
            <div className="mt-2 text-sm text-slate-500">
              Based on{' '}
              {mockSatisfactionData.satisfactionTrends.reduce(
                (sum, trend) => sum + trend.responseCount,
                0,
              )}{' '}
              responses
            </div>
          </CardContent>
        </Card>

        {/* Client Retention */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">
                Client Retention
              </CardTitle>
              <Users className="h-4 w-4 text-slate-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-900 dark:text-slate-100">
              {formatPercentage(mockSatisfactionData.clientRetentionRate)}
            </div>
            <div className="text-sm text-slate-500 mt-2">
              Clients who book again
            </div>
            <div className="mt-3">
              <Progress
                value={mockSatisfactionData.clientRetentionRate}
                className="h-2"
              />
            </div>
          </CardContent>
        </Card>

        {/* Referral Rate */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">
                Referral Rate
              </CardTitle>
              <MessageCircle className="h-4 w-4 text-slate-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-900 dark:text-slate-100">
              {formatPercentage(mockSatisfactionData.referralRate)}
            </div>
            <div className="text-sm text-slate-500 mt-2">
              Clients who refer others
            </div>
            <div className="mt-3">
              <Progress
                value={mockSatisfactionData.referralRate}
                className="h-2"
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Satisfaction Analytics Tabs */}
      <Tabs
        value={viewMode}
        onValueChange={(value: any) => setViewMode(value)}
        className="space-y-6"
      >
        <TabsList>
          <TabsTrigger value="overview">Category Breakdown</TabsTrigger>
          <TabsTrigger value="trends">Satisfaction Trends</TabsTrigger>
          <TabsTrigger value="feedback">Feedback Analysis</TabsTrigger>
        </TabsList>

        {/* Category Breakdown */}
        <TabsContent value="overview" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Satisfaction by Category</CardTitle>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                    How clients rate different aspects of your service
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-green-600">
                    Best:{' '}
                    {bestCategory.category.charAt(0).toUpperCase() +
                      bestCategory.category.slice(1)}{' '}
                    ({bestCategory.score.toFixed(1)})
                  </Badge>
                  <Badge variant="outline" className="text-red-600">
                    Focus:{' '}
                    {worstCategory.category.charAt(0).toUpperCase() +
                      worstCategory.category.slice(1)}{' '}
                    ({worstCategory.score.toFixed(1)})
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {averageCategoryScores.map((category, index) => {
                  const IconComponent = getCategoryIcon(category.category);
                  const EmojiComponent = getSatisfactionEmoji(category.score);
                  const isSelected = selectedCategory === category.category;

                  return (
                    <motion.div
                      key={category.category}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className={`p-4 rounded-lg border cursor-pointer transition-all duration-200 ${
                        isSelected
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                          : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                      }`}
                      onClick={() => handleCategoryClick(category)}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30">
                            <IconComponent className="h-5 w-5 text-blue-600" />
                          </div>
                          <div>
                            <h4 className="font-semibold text-slate-900 dark:text-slate-100 capitalize">
                              {category.category}
                            </h4>
                            <div className="text-sm text-slate-500">
                              {category.feedbackCount} reviews
                            </div>
                          </div>
                        </div>

                        <div className="text-right">
                          <div className="flex items-center gap-2">
                            <EmojiComponent className="h-5 w-5 text-slate-400" />
                            <span className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                              {category.score.toFixed(1)}
                            </span>
                          </div>
                          <div className="flex items-center gap-1 mt-1">
                            {category.improvement >= 0 ? (
                              <TrendingUp className="h-3 w-3 text-green-500" />
                            ) : (
                              <TrendingDown className="h-3 w-3 text-red-500" />
                            )}
                            <span
                              className={`text-xs ${
                                category.improvement >= 0
                                  ? 'text-green-600'
                                  : 'text-red-600'
                              }`}
                            >
                              {category.improvement > 0 ? '+' : ''}
                              {category.improvement.toFixed(1)}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-slate-600 dark:text-slate-400">
                            Score
                          </span>
                          <span className="font-medium">
                            {category.score.toFixed(1)}/10
                          </span>
                        </div>
                        <Progress value={category.score * 10} className="h-2" />
                      </div>

                      {/* Common Feedback Preview */}
                      <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-700">
                        <div className="text-xs text-slate-500 mb-1">
                          Common feedback:
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {category.commonFeedback
                            .slice(0, 2)
                            .map((feedback, feedbackIndex) => (
                              <Badge
                                key={feedbackIndex}
                                variant="secondary"
                                className="text-xs"
                              >
                                "{feedback}"
                              </Badge>
                            ))}
                        </div>
                      </div>

                      {/* Detailed Feedback (Expandable) */}
                      <AnimatePresence>
                        {isSelected && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-600"
                          >
                            <h5 className="font-medium text-slate-800 dark:text-slate-200 mb-2">
                              All Feedback for{' '}
                              {category.category.charAt(0).toUpperCase() +
                                category.category.slice(1)}
                              :
                            </h5>
                            <div className="space-y-1">
                              {category.commonFeedback.map(
                                (feedback, feedbackIndex) => (
                                  <div
                                    key={feedbackIndex}
                                    className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400"
                                  >
                                    <CheckCircle className="h-3 w-3 text-green-500" />
                                    "{feedback}"
                                  </div>
                                ),
                              )}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Quick Insights */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Strengths</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-start gap-3 p-3 rounded-lg bg-green-50 dark:bg-green-900/20">
                  <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
                  <div>
                    <div className="font-medium text-green-800 dark:text-green-200">
                      Exceptional Quality
                    </div>
                    <div className="text-sm text-green-700 dark:text-green-300">
                      Clients consistently praise your photo quality (9.2/10
                      average)
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-lg bg-green-50 dark:bg-green-900/20">
                  <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
                  <div>
                    <div className="font-medium text-green-800 dark:text-green-200">
                      Professional Service
                    </div>
                    <div className="text-sm text-green-700 dark:text-green-300">
                      High professionalism scores show you're easy to work with
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Improvement Areas</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-start gap-3 p-3 rounded-lg bg-orange-50 dark:bg-orange-900/20">
                  <AlertCircle className="h-5 w-5 text-orange-500 mt-0.5" />
                  <div>
                    <div className="font-medium text-orange-800 dark:text-orange-200">
                      Response Time
                    </div>
                    <div className="text-sm text-orange-700 dark:text-orange-300">
                      Some clients mention slow initial response times
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-lg bg-orange-50 dark:bg-orange-900/20">
                  <AlertCircle className="h-5 w-5 text-orange-500 mt-0.5" />
                  <div>
                    <div className="font-medium text-orange-800 dark:text-orange-200">
                      Timeline Communication
                    </div>
                    <div className="text-sm text-orange-700 dark:text-orange-300">
                      Opportunity to better communicate delivery timelines
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Satisfaction Trends */}
        <TabsContent value="trends" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Satisfaction Trends Over Time</CardTitle>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Track how your client satisfaction is improving
              </p>
            </CardHeader>
            <CardContent>
              {/* Chart placeholder - In production, use a charting library */}
              <div className="h-64 bg-slate-50 dark:bg-slate-800 rounded-lg flex items-center justify-center mb-6">
                <div className="text-center">
                  <TrendingUp className="h-12 w-12 text-slate-400 mx-auto mb-2" />
                  <p className="text-slate-600 dark:text-slate-400">
                    Satisfaction trend chart would be rendered here
                  </p>
                  <p className="text-sm text-slate-500 mt-1">
                    Showing {mockSatisfactionData.satisfactionTrends.length}{' '}
                    months of data
                  </p>
                </div>
              </div>

              {/* Monthly Breakdown */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {mockSatisfactionData.satisfactionTrends.map((trend, index) => (
                  <motion.div
                    key={trend.period}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800"
                  >
                    <div className="text-center mb-3">
                      <div className="text-lg font-bold text-slate-900 dark:text-slate-100">
                        {trend.period}
                      </div>
                      <div className="text-2xl font-bold text-blue-600">
                        {trend.satisfactionScore.toFixed(1)}
                      </div>
                      <div className="text-sm text-slate-500">
                        {trend.responseCount} responses
                      </div>
                    </div>

                    <div className="space-y-2">
                      {trend.categoryBreakdown.map((category) => (
                        <div
                          key={category.category}
                          className="flex items-center justify-between text-sm"
                        >
                          <span className="text-slate-600 dark:text-slate-400 capitalize">
                            {category.category}
                          </span>
                          <div className="flex items-center gap-1">
                            <span className="font-medium">
                              {category.score.toFixed(1)}
                            </span>
                            {category.improvement >= 0 ? (
                              <TrendingUp className="h-3 w-3 text-green-500" />
                            ) : (
                              <TrendingDown className="h-3 w-3 text-red-500" />
                            )}
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

        {/* Feedback Analysis */}
        <TabsContent value="feedback" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Feedback Sentiment Analysis</CardTitle>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Understanding the sentiment behind client feedback
              </p>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <div className="text-center">
                  <div className="text-3xl font-bold text-green-600 mb-2">
                    75%
                  </div>
                  <div className="text-sm text-slate-600 dark:text-slate-400 mb-1">
                    Positive
                  </div>
                  <Progress value={75} className="h-2" />
                </div>

                <div className="text-center">
                  <div className="text-3xl font-bold text-yellow-600 mb-2">
                    20%
                  </div>
                  <div className="text-sm text-slate-600 dark:text-slate-400 mb-1">
                    Neutral
                  </div>
                  <Progress value={20} className="h-2" />
                </div>

                <div className="text-center">
                  <div className="text-3xl font-bold text-red-600 mb-2">5%</div>
                  <div className="text-sm text-slate-600 dark:text-slate-400 mb-1">
                    Negative
                  </div>
                  <Progress value={5} className="h-2" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-semibold text-slate-900 dark:text-slate-100 mb-3">
                    Most Praised Aspects
                  </h4>
                  <div className="space-y-2">
                    {[
                      'Photo quality',
                      'Communication',
                      'Professionalism',
                      'Creativity',
                    ].map((aspect, index) => (
                      <div
                        key={aspect}
                        className="flex items-center justify-between p-2 rounded bg-green-50 dark:bg-green-900/20"
                      >
                        <span className="text-sm text-green-800 dark:text-green-200">
                          {aspect}
                        </span>
                        <Badge variant="default">
                          {25 - index * 3} mentions
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold text-slate-900 dark:text-slate-100 mb-3">
                    Areas for Improvement
                  </h4>
                  <div className="space-y-2">
                    {[
                      'Response time',
                      'Pricing clarity',
                      'Timeline updates',
                    ].map((area, index) => (
                      <div
                        key={area}
                        className="flex items-center justify-between p-2 rounded bg-red-50 dark:bg-red-900/20"
                      >
                        <span className="text-sm text-red-800 dark:text-red-200">
                          {area}
                        </span>
                        <Badge variant="destructive">
                          {8 - index * 2} mentions
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
