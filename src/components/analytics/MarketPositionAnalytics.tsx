'use client';

// WS-332 Analytics Dashboard - Market Position Analytics Component
// Team A - Round 1 - Market position and competitive analysis

import React, { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  MarketPositionAnalyticsProps,
  CompetitorAnalysis,
  MarketSegment,
  OpportunityGap,
  ThreatGap,
} from '@/types/analytics';

// UI Components
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

// Icons
import {
  Trophy,
  TrendingUp,
  TrendingDown,
  Target,
  AlertTriangle,
  Star,
  DollarSign,
  Users,
  MapPin,
  Crown,
  Eye,
  Zap,
  Shield,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';

// Mock market data
const mockMarketData = {
  yourRanking: 3,
  yourMarketShare: 12.5,
  totalCompetitors: 28,
  marketGrowthRate: 8.2,
  opportunities: [
    {
      area: 'Luxury Wedding Segment',
      potentialImpact: 85,
      difficultyToAddress: 65,
      timeToRealize: 8,
      estimatedROI: 45,
    },
    {
      area: 'Destination Wedding Photography',
      potentialImpact: 70,
      difficultyToAddress: 45,
      timeToRealize: 6,
      estimatedROI: 35,
    },
    {
      area: 'Corporate Event Photography',
      potentialImpact: 60,
      difficultyToAddress: 30,
      timeToRealize: 3,
      estimatedROI: 25,
    },
  ] as OpportunityGap[],
  threats: [
    {
      threat: 'New budget photographers entering market',
      probability: 75,
      impact: 60,
      timeframe: 6,
      mitigationStrategies: [
        'Emphasize quality difference',
        'Create budget packages',
        'Build brand loyalty',
      ],
    },
    {
      threat: 'Economic downturn affecting wedding budgets',
      probability: 45,
      impact: 80,
      timeframe: 12,
      mitigationStrategies: [
        'Diversify services',
        'Offer payment plans',
        'Target essential packages',
      ],
    },
  ] as ThreatGap[],
};

const mockCompetitors: CompetitorAnalysis[] = [
  {
    competitorId: '1',
    businessName: 'Elite Wedding Photos',
    marketShare: 18.5,
    averageRating: 4.8,
    pricingPosition: 'luxury',
    strengthAreas: ['High-end clientele', 'Premium packages', 'Luxury venues'],
    weaknessAreas: ['Limited availability', 'High prices'],
    competitiveAdvantages: [
      {
        advantage: 'Celebrity endorsements',
        impact: 'high',
        sustainability: 'durable',
        yourGap: -2.3,
      },
      {
        advantage: 'Luxury venue partnerships',
        impact: 'high',
        sustainability: 'durable',
        yourGap: -1.8,
      },
    ],
  },
  {
    competitorId: '2',
    businessName: 'Budget Wedding Shots',
    marketShare: 15.2,
    averageRating: 4.2,
    pricingPosition: 'budget',
    strengthAreas: [
      'Affordable pricing',
      'Quick turnaround',
      'Social media presence',
    ],
    weaknessAreas: ['Quality inconsistency', 'Limited experience'],
    competitiveAdvantages: [
      {
        advantage: 'Low pricing',
        impact: 'high',
        sustainability: 'temporary',
        yourGap: 1.5,
      },
      {
        advantage: 'Fast delivery',
        impact: 'medium',
        sustainability: 'durable',
        yourGap: -0.5,
      },
    ],
  },
  {
    competitorId: '3',
    businessName: 'Your Photography Business',
    marketShare: 12.5,
    averageRating: 4.6,
    pricingPosition: 'mid_tier',
    strengthAreas: [
      'Quality consistency',
      'Client communication',
      'Flexible packages',
    ],
    weaknessAreas: ['Brand awareness', 'Premium positioning'],
    competitiveAdvantages: [
      {
        advantage: 'Client satisfaction',
        impact: 'high',
        sustainability: 'durable',
        yourGap: 0,
      },
      {
        advantage: 'Flexible service',
        impact: 'medium',
        sustainability: 'durable',
        yourGap: 0,
      },
    ],
  },
];

export function MarketPositionAnalytics({
  vendorId,
  marketSegment,
  competitorData,
  onCompetitorAnalysis,
}: MarketPositionAnalyticsProps) {
  // State Management
  const [selectedCompetitor, setSelectedCompetitor] = useState<string | null>(
    null,
  );
  const [viewMode, setViewMode] = useState<
    'overview' | 'competitors' | 'opportunities'
  >('overview');
  const [showStrategies, setShowStrategies] = useState(false);

  // Memoized calculations
  const marketPosition = useMemo(() => {
    const position = mockMarketData.yourRanking;
    if (position === 1)
      return { title: 'Market Leader', color: 'text-green-600', icon: Crown };
    if (position <= 3)
      return { title: 'Top Tier', color: 'text-blue-600', icon: Trophy };
    if (position <= 10)
      return { title: 'Strong Player', color: 'text-purple-600', icon: Star };
    return { title: 'Emerging Player', color: 'text-orange-600', icon: Target };
  }, []);

  const competitiveStrength = useMemo(() => {
    const yourCompetitor = mockCompetitors.find((c) => c.competitorId === '3');
    if (!yourCompetitor) return 0;

    const avgRating =
      mockCompetitors.reduce((sum, c) => sum + c.averageRating, 0) /
      mockCompetitors.length;
    const avgShare =
      mockCompetitors.reduce((sum, c) => sum + c.marketShare, 0) /
      mockCompetitors.length;

    const ratingScore = (yourCompetitor.averageRating / avgRating) * 50;
    const shareScore = (yourCompetitor.marketShare / avgShare) * 50;

    return Math.round(ratingScore + shareScore);
  }, []);

  const topOpportunity = useMemo(() => {
    return mockMarketData.opportunities.reduce(
      (best, opp) => (opp.estimatedROI > best.estimatedROI ? opp : best),
      mockMarketData.opportunities[0],
    );
  }, []);

  const topThreat = useMemo(() => {
    return mockMarketData.threats.reduce(
      (worst, threat) =>
        threat.probability * threat.impact > worst.probability * worst.impact
          ? threat
          : worst,
      mockMarketData.threats[0],
    );
  }, []);

  // Format percentage
  const formatPercentage = useCallback((value: number) => {
    return `${value.toFixed(1)}%`;
  }, []);

  // Get pricing tier color
  const getPricingColor = useCallback((tier: string) => {
    const colorMap = {
      budget: 'text-green-600',
      mid_tier: 'text-blue-600',
      luxury: 'text-purple-600',
      ultra_luxury: 'text-gold-600',
    };
    return colorMap[tier as keyof typeof colorMap] || 'text-gray-600';
  }, []);

  // Handle competitor click
  const handleCompetitorClick = useCallback(
    (competitorId: string) => {
      setSelectedCompetitor(
        selectedCompetitor === competitorId ? null : competitorId,
      );
      onCompetitorAnalysis(competitorId);
    },
    [selectedCompetitor, onCompetitorAnalysis],
  );

  return (
    <div className="market-position-analytics space-y-6">
      {/* Market Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Market Position */}
        <Card className="relative overflow-hidden">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">
                Market Position
              </CardTitle>
              {React.createElement(marketPosition.icon, {
                className: 'h-4 w-4 text-slate-400',
              })}
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <div className="text-3xl font-bold text-slate-900 dark:text-slate-100">
                #{mockMarketData.yourRanking}
              </div>
              <div>
                <div className={`text-sm font-bold ${marketPosition.color}`}>
                  {marketPosition.title}
                </div>
                <div className="text-xs text-slate-500">
                  of {mockMarketData.totalCompetitors} competitors
                </div>
              </div>
            </div>
          </CardContent>
          <div
            className={`absolute bottom-0 left-0 right-0 h-1 ${
              marketPosition.title === 'Market Leader'
                ? 'bg-green-500'
                : marketPosition.title === 'Top Tier'
                  ? 'bg-blue-500'
                  : marketPosition.title === 'Strong Player'
                    ? 'bg-purple-500'
                    : 'bg-orange-500'
            }`}
          />
        </Card>

        {/* Market Share */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">
                Market Share
              </CardTitle>
              <Target className="h-4 w-4 text-slate-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-900 dark:text-slate-100">
              {formatPercentage(mockMarketData.yourMarketShare)}
            </div>
            <div className="text-sm text-slate-500 mt-2">
              Local wedding photography market
            </div>
            <div className="mt-3">
              <Progress
                value={mockMarketData.yourMarketShare}
                className="h-2"
              />
            </div>
          </CardContent>
        </Card>

        {/* Competitive Strength */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">
                Competitive Strength
              </CardTitle>
              <Shield className="h-4 w-4 text-slate-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-900 dark:text-slate-100">
              {competitiveStrength}
            </div>
            <div className="text-sm text-slate-500 mt-2">
              Overall strength score
            </div>
            <div className="mt-3">
              <Progress value={competitiveStrength} className="h-2" />
            </div>
          </CardContent>
        </Card>

        {/* Market Growth */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">
                Market Growth
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-slate-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-900 dark:text-slate-100">
              {formatPercentage(mockMarketData.marketGrowthRate)}
            </div>
            <div className="text-sm text-slate-500 mt-2">
              Annual market growth rate
            </div>
            <div className="mt-2 flex items-center gap-1">
              <ArrowUp className="h-4 w-4 text-green-500" />
              <span className="text-sm text-green-600">Growing market</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Market Analysis Tabs */}
      <Tabs
        value={viewMode}
        onValueChange={(value: any) => setViewMode(value)}
        className="space-y-6"
      >
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="overview">Competitive Matrix</TabsTrigger>
            <TabsTrigger value="competitors">Competitor Analysis</TabsTrigger>
            <TabsTrigger value="opportunities">
              Opportunities & Threats
            </TabsTrigger>
          </TabsList>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowStrategies(!showStrategies)}
          >
            <Zap className="h-4 w-4 mr-2" />
            {showStrategies ? 'Hide' : 'Show'} Strategies
          </Button>
        </div>

        {/* Competitive Matrix */}
        <TabsContent value="overview" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Competitive Positioning Matrix</CardTitle>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Your position relative to key competitors in the market
              </p>
            </CardHeader>
            <CardContent>
              {/* Matrix visualization placeholder - In production, use a charting library */}
              <div className="h-64 bg-slate-50 dark:bg-slate-800 rounded-lg flex items-center justify-center mb-6">
                <div className="text-center">
                  <Target className="h-12 w-12 text-slate-400 mx-auto mb-2" />
                  <p className="text-slate-600 dark:text-slate-400">
                    Competitive positioning matrix would be rendered here
                  </p>
                  <p className="text-sm text-slate-500 mt-1">
                    Quality vs Price positioning with market share bubbles
                  </p>
                </div>
              </div>

              {/* Competitor Summary */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {mockCompetitors.map((competitor, index) => (
                  <motion.div
                    key={competitor.competitorId}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className={`p-4 rounded-lg border ${
                      competitor.competitorId === '3'
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-semibold text-slate-900 dark:text-slate-100">
                        {competitor.businessName}
                        {competitor.competitorId === '3' && (
                          <Badge variant="default" className="ml-2 text-xs">
                            YOU
                          </Badge>
                        )}
                      </h4>
                      {competitor.competitorId !== '3' &&
                        mockMarketData.yourRanking > index + 1 && (
                          <Crown className="h-4 w-4 text-yellow-500" />
                        )}
                    </div>

                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-slate-600 dark:text-slate-400">
                          Market Share:
                        </span>
                        <span className="font-medium">
                          {formatPercentage(competitor.marketShare)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-600 dark:text-slate-400">
                          Rating:
                        </span>
                        <div className="flex items-center gap-1">
                          <Star className="h-3 w-3 text-yellow-500" />
                          <span className="font-medium">
                            {competitor.averageRating}
                          </span>
                        </div>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-600 dark:text-slate-400">
                          Pricing:
                        </span>
                        <span
                          className={`font-medium capitalize ${getPricingColor(competitor.pricingPosition)}`}
                        >
                          {competitor.pricingPosition.replace('_', ' ')}
                        </span>
                      </div>
                    </div>

                    <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-700">
                      <div className="text-xs text-slate-500 mb-1">
                        Key Strengths:
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {competitor.strengthAreas
                          .slice(0, 2)
                          .map((strength, strengthIndex) => (
                            <Badge
                              key={strengthIndex}
                              variant="secondary"
                              className="text-xs"
                            >
                              {strength}
                            </Badge>
                          ))}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Detailed Competitor Analysis */}
        <TabsContent value="competitors" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Detailed Competitor Analysis</CardTitle>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                In-depth analysis of your key competitors
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {mockCompetitors.map((competitor, index) => {
                  const isSelected =
                    selectedCompetitor === competitor.competitorId;
                  const isYou = competitor.competitorId === '3';

                  return (
                    <motion.div
                      key={competitor.competitorId}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className={`p-4 rounded-lg border cursor-pointer transition-all duration-200 ${
                        isSelected
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                          : isYou
                            ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                            : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                      }`}
                      onClick={() =>
                        handleCompetitorClick(competitor.competitorId)
                      }
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="flex items-center justify-center w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800">
                            {isYou ? (
                              <Trophy className="h-6 w-6 text-green-600" />
                            ) : index === 0 ? (
                              <Crown className="h-6 w-6 text-yellow-600" />
                            ) : (
                              <Users className="h-6 w-6 text-slate-600" />
                            )}
                          </div>
                          <div>
                            <h4 className="font-semibold text-slate-900 dark:text-slate-100">
                              {competitor.businessName}
                              {isYou && (
                                <Badge
                                  variant="default"
                                  className="ml-2 text-xs"
                                >
                                  YOU
                                </Badge>
                              )}
                            </h4>
                            <p className="text-sm text-slate-600 dark:text-slate-400">
                              {formatPercentage(competitor.marketShare)} market
                              share • {competitor.averageRating}★ rating
                            </p>
                          </div>
                        </div>

                        <div className="text-right">
                          <div
                            className={`text-lg font-bold ${getPricingColor(competitor.pricingPosition)}`}
                          >
                            {competitor.pricingPosition
                              .replace('_', ' ')
                              .replace(/\b\w/g, (l) => l.toUpperCase())}
                          </div>
                          <div className="text-sm text-slate-500">
                            Pricing Tier
                          </div>
                        </div>
                      </div>

                      {/* Detailed Analysis (Expandable) */}
                      <AnimatePresence>
                        {isSelected && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-600"
                          >
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              {/* Strengths */}
                              <div>
                                <h5 className="font-semibold text-slate-800 dark:text-slate-200 mb-3">
                                  Key Strengths
                                </h5>
                                <div className="space-y-2">
                                  {competitor.strengthAreas.map(
                                    (strength, strengthIndex) => (
                                      <div
                                        key={strengthIndex}
                                        className="flex items-center gap-2 text-sm"
                                      >
                                        <div className="w-2 h-2 rounded-full bg-green-500" />
                                        <span className="text-slate-700 dark:text-slate-300">
                                          {strength}
                                        </span>
                                      </div>
                                    ),
                                  )}
                                </div>
                              </div>

                              {/* Weaknesses */}
                              <div>
                                <h5 className="font-semibold text-slate-800 dark:text-slate-200 mb-3">
                                  Potential Weaknesses
                                </h5>
                                <div className="space-y-2">
                                  {competitor.weaknessAreas.map(
                                    (weakness, weaknessIndex) => (
                                      <div
                                        key={weaknessIndex}
                                        className="flex items-center gap-2 text-sm"
                                      >
                                        <div className="w-2 h-2 rounded-full bg-red-500" />
                                        <span className="text-slate-700 dark:text-slate-300">
                                          {weakness}
                                        </span>
                                      </div>
                                    ),
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Competitive Advantages */}
                            <div className="mt-6">
                              <h5 className="font-semibold text-slate-800 dark:text-slate-200 mb-3">
                                Competitive Advantages
                              </h5>
                              <div className="space-y-2">
                                {competitor.competitiveAdvantages.map(
                                  (advantage, advantageIndex) => (
                                    <div
                                      key={advantageIndex}
                                      className="flex items-center justify-between p-2 rounded bg-slate-50 dark:bg-slate-800"
                                    >
                                      <div className="flex items-center gap-3">
                                        <Badge
                                          variant={
                                            advantage.impact === 'high'
                                              ? 'default'
                                              : advantage.impact === 'medium'
                                                ? 'secondary'
                                                : 'outline'
                                          }
                                        >
                                          {advantage.impact} impact
                                        </Badge>
                                        <span className="text-sm text-slate-700 dark:text-slate-300">
                                          {advantage.advantage}
                                        </span>
                                      </div>
                                      {!isYou && (
                                        <div className="flex items-center gap-1">
                                          {advantage.yourGap > 0 ? (
                                            <ArrowUp className="h-3 w-3 text-green-500" />
                                          ) : advantage.yourGap < 0 ? (
                                            <ArrowDown className="h-3 w-3 text-red-500" />
                                          ) : (
                                            <div className="w-3 h-3" />
                                          )}
                                          <span
                                            className={`text-xs ${
                                              advantage.yourGap > 0
                                                ? 'text-green-600'
                                                : advantage.yourGap < 0
                                                  ? 'text-red-600'
                                                  : 'text-slate-500'
                                            }`}
                                          >
                                            {advantage.yourGap > 0
                                              ? 'You lead'
                                              : advantage.yourGap < 0
                                                ? 'You lag'
                                                : 'Even'}
                                          </span>
                                        </div>
                                      )}
                                    </div>
                                  ),
                                )}
                              </div>
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
        </TabsContent>

        {/* Opportunities & Threats */}
        <TabsContent value="opportunities" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Opportunities */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5 text-green-600" />
                  Market Opportunities
                </CardTitle>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Potential growth areas for your business
                </p>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {mockMarketData.opportunities.map((opportunity, index) => (
                    <motion.div
                      key={opportunity.area}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="p-4 rounded-lg border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-semibold text-green-900 dark:text-green-100">
                          {opportunity.area}
                        </h4>
                        <Badge variant="default">
                          {opportunity.estimatedROI}% ROI
                        </Badge>
                      </div>

                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <div className="text-green-700 dark:text-green-300">
                            Impact Potential
                          </div>
                          <div className="mt-1">
                            <Progress
                              value={opportunity.potentialImpact}
                              className="h-2"
                            />
                            <div className="text-xs text-green-600 mt-1">
                              {opportunity.potentialImpact}/100
                            </div>
                          </div>
                        </div>
                        <div>
                          <div className="text-green-700 dark:text-green-300">
                            Difficulty
                          </div>
                          <div className="mt-1">
                            <Progress
                              value={opportunity.difficultyToAddress}
                              className="h-2"
                            />
                            <div className="text-xs text-green-600 mt-1">
                              {opportunity.difficultyToAddress}/100
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="mt-3 text-sm text-green-700 dark:text-green-300">
                        Time to realize: {opportunity.timeToRealize} months
                      </div>
                    </motion.div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Threats */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                  Market Threats
                </CardTitle>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Potential challenges to monitor and address
                </p>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {mockMarketData.threats.map((threat, index) => (
                    <motion.div
                      key={threat.threat}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="p-4 rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-semibold text-red-900 dark:text-red-100">
                          {threat.threat}
                        </h4>
                        <Badge variant="destructive">
                          {threat.timeframe} months
                        </Badge>
                      </div>

                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <div className="text-red-700 dark:text-red-300">
                            Probability
                          </div>
                          <div className="mt-1">
                            <Progress
                              value={threat.probability}
                              className="h-2"
                            />
                            <div className="text-xs text-red-600 mt-1">
                              {threat.probability}%
                            </div>
                          </div>
                        </div>
                        <div>
                          <div className="text-red-700 dark:text-red-300">
                            Impact
                          </div>
                          <div className="mt-1">
                            <Progress value={threat.impact} className="h-2" />
                            <div className="text-xs text-red-600 mt-1">
                              {threat.impact}/100
                            </div>
                          </div>
                        </div>
                      </div>

                      {showStrategies && (
                        <div className="mt-4 pt-3 border-t border-red-200 dark:border-red-700">
                          <div className="text-sm font-medium text-red-800 dark:text-red-200 mb-2">
                            Mitigation Strategies:
                          </div>
                          <div className="space-y-1">
                            {threat.mitigationStrategies.map(
                              (strategy, strategyIndex) => (
                                <div
                                  key={strategyIndex}
                                  className="flex items-center gap-2 text-sm text-red-700 dark:text-red-300"
                                >
                                  <Shield className="h-3 w-3" />
                                  {strategy}
                                </div>
                              ),
                            )}
                          </div>
                        </div>
                      )}
                    </motion.div>
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
