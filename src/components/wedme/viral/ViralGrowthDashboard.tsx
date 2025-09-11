'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  TrendingUp,
  Zap,
  Share2,
  Users,
  Globe,
  Target,
  Rocket,
  Activity,
  BarChart3,
  PieChart,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  Star,
  Heart,
  MessageCircle,
  Eye,
  Download,
  Sparkles,
  Trophy,
  Flame,
  Calendar,
} from 'lucide-react';
import {
  CoupleProfile,
  ViralMetrics,
  ViralGrowthData,
  PlatformPerformance,
  ViralContentItem,
  GrowthPrediction,
  InfluencerEngagement,
  ShareVelocity,
  ViralCoefficient,
  ReachAmplification,
  ContentVirality,
} from '@/types/wedme/file-management';
import { cn } from '@/lib/utils';

interface ViralGrowthDashboardProps {
  couple: CoupleProfile;
  viralData: ViralGrowthData;
  onOptimizeContent: (contentId: string, optimizations: string[]) => void;
  onBoostPromotion: (contentId: string, budget: number) => void;
  className?: string;
}

export default function ViralGrowthDashboard({
  couple,
  viralData,
  onOptimizeContent,
  onBoostPromotion,
  className,
}: ViralGrowthDashboardProps) {
  const [activeTab, setActiveTab] = useState<
    'overview' | 'content' | 'platforms' | 'predictions' | 'optimization'
  >('overview');
  const [timeRange, setTimeRange] = useState<'24h' | '7d' | '30d' | '90d'>(
    '7d',
  );
  const [selectedPlatform, setSelectedPlatform] = useState<string>('all');

  // Calculate viral score and growth trajectory
  const viralScore = useMemo(() => {
    return calculateOverallViralScore(viralData.metrics);
  }, [viralData.metrics]);

  const growthTrend = useMemo(() => {
    return analyzeGrowthTrend(viralData.historicalData, timeRange);
  }, [viralData.historicalData, timeRange]);

  const topPerformingContent = useMemo(() => {
    return (
      viralData.contentPerformance
        ?.sort((a, b) => b.viralCoefficient - a.viralCoefficient)
        .slice(0, 5) || []
    );
  }, [viralData.contentPerformance]);

  const platformAnalysis = useMemo(() => {
    return analyzePlatformPerformance(viralData.platformData, selectedPlatform);
  }, [viralData.platformData, selectedPlatform]);

  return (
    <div
      className={cn(
        'bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl shadow-lg border border-purple-200 p-6',
        className,
      )}
    >
      {/* Header with Viral Score */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full">
              <Zap className="text-white" size={24} />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                Viral Growth Dashboard
              </h2>
              <p className="text-gray-600">
                Track and optimize your wedding content's viral potential
              </p>
            </div>
          </div>

          <div className="text-right">
            <div className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-600">
              {viralScore}/100
            </div>
            <div className="text-sm text-gray-600 font-medium">Viral Score</div>
            <div
              className={cn(
                'flex items-center gap-1 text-sm font-medium mt-1',
                growthTrend.direction === 'up'
                  ? 'text-green-600'
                  : growthTrend.direction === 'down'
                    ? 'text-red-600'
                    : 'text-gray-600',
              )}
            >
              {growthTrend.direction === 'up' ? (
                <ArrowUpRight size={16} />
              ) : growthTrend.direction === 'down' ? (
                <ArrowDownRight size={16} />
              ) : null}
              {Math.abs(growthTrend.percentage).toFixed(1)}% {timeRange}
            </div>
          </div>
        </div>

        {/* Time Range and Platform Selector */}
        <div className="flex items-center gap-4">
          <div className="flex bg-white rounded-lg p-1 shadow-sm">
            {(['24h', '7d', '30d', '90d'] as const).map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={cn(
                  'px-3 py-1.5 rounded text-sm font-medium transition-colors',
                  timeRange === range
                    ? 'bg-purple-600 text-white'
                    : 'text-gray-600 hover:text-gray-900',
                )}
              >
                {range}
              </button>
            ))}
          </div>

          <select
            value={selectedPlatform}
            onChange={(e) => setSelectedPlatform(e.target.value)}
            className="px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500"
          >
            <option value="all">All Platforms</option>
            <option value="instagram">Instagram</option>
            <option value="facebook">Facebook</option>
            <option value="tiktok">TikTok</option>
            <option value="twitter">Twitter</option>
            <option value="pinterest">Pinterest</option>
          </select>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex space-x-1 mb-6 bg-white rounded-lg p-1 shadow-sm">
        {[
          { id: 'overview' as const, label: 'Overview', icon: Activity },
          { id: 'content' as const, label: 'Viral Content', icon: Flame },
          { id: 'platforms' as const, label: 'Platforms', icon: Globe },
          { id: 'predictions' as const, label: 'Predictions', icon: Target },
          { id: 'optimization' as const, label: 'Optimization', icon: Rocket },
        ].map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={cn(
              'flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-md text-sm font-medium transition-colors',
              activeTab === id
                ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-sm'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50',
            )}
          >
            <Icon size={16} />
            {label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            <ViralOverviewSection
              metrics={viralData.metrics}
              growthData={viralData.growthPredictions}
              timeRange={timeRange}
            />
          </motion.div>
        )}

        {/* Viral Content Tab */}
        {activeTab === 'content' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            <ViralContentAnalysis
              content={topPerformingContent}
              onOptimize={onOptimizeContent}
              onBoost={onBoostPromotion}
            />
          </motion.div>
        )}

        {/* Platforms Tab */}
        {activeTab === 'platforms' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            <PlatformPerformanceSection
              platforms={viralData.platformData}
              selectedPlatform={selectedPlatform}
              onSelectPlatform={setSelectedPlatform}
            />
          </motion.div>
        )}

        {/* Predictions Tab */}
        {activeTab === 'predictions' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            <GrowthPredictionsSection
              predictions={viralData.growthPredictions}
              historicalData={viralData.historicalData}
            />
          </motion.div>
        )}

        {/* Optimization Tab */}
        {activeTab === 'optimization' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            <OptimizationRecommendations
              couple={couple}
              viralData={viralData}
              onOptimizeContent={onOptimizeContent}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Viral Overview Section Component
function ViralOverviewSection({
  metrics,
  growthData,
  timeRange,
}: {
  metrics: ViralMetrics;
  growthData: GrowthPrediction[];
  timeRange: string;
}) {
  return (
    <div className="space-y-6">
      {/* Key Viral Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <ViralMetricCard
          title="Share Velocity"
          value={`${metrics.shareVelocity.toFixed(1)}/hr`}
          change={12.5}
          icon={Share2}
          color="blue"
          description="Shares per hour"
        />
        <ViralMetricCard
          title="Viral Coefficient"
          value={metrics.viralCoefficient?.toFixed(2) || '0.00'}
          change={8.2}
          icon={TrendingUp}
          color="green"
          description="Growth multiplier"
        />
        <ViralMetricCard
          title="Reach Amplification"
          value={`${(metrics.reachMultiplier * 100).toFixed(0)}%`}
          change={15.7}
          icon={Users}
          color="purple"
          description="Audience expansion"
        />
        <ViralMetricCard
          title="Engagement Rate"
          value={`${(metrics.engagementRate * 100).toFixed(1)}%`}
          change={-2.1}
          icon={Heart}
          color="red"
          description="User interactions"
        />
      </div>

      {/* Viral Growth Trajectory */}
      <div className="bg-white rounded-lg p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">
            Viral Growth Trajectory
          </h3>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
            <span className="text-sm text-gray-600">Viral Growth</span>
          </div>
        </div>
        <ViralGrowthChart data={growthData} timeRange={timeRange} />
      </div>

      {/* Growth Factors Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Growth Factors
          </h3>
          <ViralFactorsBreakdown metrics={metrics} />
        </div>

        <div className="bg-white rounded-lg p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Influencer Impact
          </h3>
          <InfluencerImpactAnalysis engagement={metrics.influencerEngagement} />
        </div>
      </div>
    </div>
  );
}

// Viral Metric Card Component
function ViralMetricCard({
  title,
  value,
  change,
  icon: Icon,
  color,
  description,
}: {
  title: string;
  value: string;
  change?: number;
  icon: any;
  color: 'blue' | 'green' | 'purple' | 'red';
  description: string;
}) {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600 border-blue-200',
    green: 'bg-green-50 text-green-600 border-green-200',
    purple: 'bg-purple-50 text-purple-600 border-purple-200',
    red: 'bg-red-50 text-red-600 border-red-200',
  };

  const isPositive = change && change > 0;
  const isNegative = change && change < 0;

  return (
    <div className={cn('rounded-lg p-4 border', colorClasses[color])}>
      <div className="flex items-center justify-between mb-2">
        <Icon size={20} />
        {change !== undefined && (
          <div
            className={cn(
              'flex items-center gap-1 text-xs font-medium',
              isPositive
                ? 'text-green-600'
                : isNegative
                  ? 'text-red-600'
                  : 'text-gray-600',
            )}
          >
            {isPositive ? (
              <ArrowUpRight size={14} />
            ) : isNegative ? (
              <ArrowDownRight size={14} />
            ) : null}
            {Math.abs(change).toFixed(1)}%
          </div>
        )}
      </div>
      <div className="text-2xl font-bold mb-1">{value}</div>
      <div className="text-sm font-medium mb-1">{title}</div>
      <div className="text-xs opacity-75">{description}</div>
    </div>
  );
}

// Viral Growth Chart Component (simplified visualization)
function ViralGrowthChart({
  data,
  timeRange,
}: {
  data: GrowthPrediction[];
  timeRange: string;
}) {
  return (
    <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg">
      <div className="text-center">
        <BarChart3 className="mx-auto text-gray-400 mb-2" size={48} />
        <p className="text-gray-600 text-sm">Growth chart visualization</p>
        <p className="text-xs text-gray-500">
          Showing {timeRange} viral growth pattern
        </p>
      </div>
    </div>
  );
}

// Viral Factors Breakdown Component
function ViralFactorsBreakdown({ metrics }: { metrics: ViralMetrics }) {
  const factors = [
    { name: 'Content Quality', score: metrics.contentQualityScore, max: 25 },
    { name: 'Emotional Impact', score: metrics.emotionalImpact || 20, max: 25 },
    { name: 'Shareability', score: metrics.shareVelocity, max: 25 },
    { name: 'Timing', score: metrics.timingOptimization || 18, max: 25 },
  ];

  return (
    <div className="space-y-4">
      {factors.map((factor) => (
        <div key={factor.name} className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-700 font-medium">{factor.name}</span>
            <span className="text-gray-900 font-semibold">
              {factor.score.toFixed(1)}/{factor.max}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full transition-all duration-300"
              style={{
                width: `${Math.min(100, (factor.score / factor.max) * 100)}%`,
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

// Influencer Impact Analysis Component
function InfluencerImpactAnalysis({ engagement }: { engagement: number }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-2xl font-bold text-purple-600">{engagement}</div>
          <div className="text-sm text-gray-600">Influencer Interactions</div>
        </div>
        <div className="text-right">
          <div className="text-lg font-semibold text-green-600">+245%</div>
          <div className="text-xs text-gray-500">Reach Boost</div>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Micro-influencers (1K-10K)</span>
          <span className="font-medium">12</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Macro-influencers (10K-100K)</span>
          <span className="font-medium">3</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Wedding Industry Experts</span>
          <span className="font-medium">7</span>
        </div>
      </div>

      <div className="mt-4 p-3 bg-purple-50 rounded-lg border border-purple-200">
        <div className="text-sm text-purple-800 font-medium">💡 Tip</div>
        <div className="text-xs text-purple-700 mt-1">
          Engage with wedding planners and photographers for maximum
          amplification
        </div>
      </div>
    </div>
  );
}

// Viral Content Analysis Component
function ViralContentAnalysis({
  content,
  onOptimize,
  onBoost,
}: {
  content: ViralContentItem[];
  onOptimize: (contentId: string, optimizations: string[]) => void;
  onBoost: (contentId: string, budget: number) => void;
}) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">
          Top Viral Content
        </h3>
        <button className="text-purple-600 hover:text-purple-700 text-sm font-medium">
          View All Content
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {content.map((item, index) => (
          <ViralContentCard
            key={item.id}
            item={item}
            rank={index + 1}
            onOptimize={onOptimize}
            onBoost={onBoost}
          />
        ))}
      </div>
    </div>
  );
}

// Viral Content Card Component
function ViralContentCard({
  item,
  rank,
  onOptimize,
  onBoost,
}: {
  item: ViralContentItem;
  rank: number;
  onOptimize: (contentId: string, optimizations: string[]) => void;
  onBoost: (contentId: string, budget: number) => void;
}) {
  return (
    <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              'w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm',
              rank === 1
                ? 'bg-yellow-500'
                : rank === 2
                  ? 'bg-gray-400'
                  : rank === 3
                    ? 'bg-orange-500'
                    : 'bg-purple-500',
            )}
          >
            {rank === 1 ? <Trophy size={16} /> : rank}
          </div>
          <div>
            <h4 className="font-semibold text-gray-900">{item.title}</h4>
            <p className="text-sm text-gray-600">
              {item.type} • {item.platform}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span
            className={cn(
              'px-2 py-1 rounded-full text-xs font-medium',
              item.viralCoefficient > 1.5
                ? 'bg-green-100 text-green-800'
                : item.viralCoefficient > 1.0
                  ? 'bg-yellow-100 text-yellow-800'
                  : 'bg-red-100 text-red-800',
            )}
          >
            {item.viralCoefficient.toFixed(2)}x viral
          </span>
        </div>
      </div>

      {/* Engagement Metrics */}
      <div className="grid grid-cols-4 gap-4 mb-4">
        <div className="text-center">
          <div className="text-lg font-bold text-blue-600">
            {item.views.toLocaleString()}
          </div>
          <div className="text-xs text-gray-600">Views</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-bold text-red-600">
            {item.shares.toLocaleString()}
          </div>
          <div className="text-xs text-gray-600">Shares</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-bold text-green-600">
            {item.likes.toLocaleString()}
          </div>
          <div className="text-xs text-gray-600">Likes</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-bold text-purple-600">
            {item.comments}
          </div>
          <div className="text-xs text-gray-600">Comments</div>
        </div>
      </div>

      {/* Viral Insights */}
      <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg p-3 mb-4">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="text-purple-600" size={16} />
          <span className="text-sm font-medium text-purple-900">
            Viral Insights
          </span>
        </div>
        <div className="text-xs text-purple-800 space-y-1">
          <div>• Peak sharing at {item.peakSharingTime || '7:30 PM'}</div>
          <div>• Top demographic: {item.topDemographic || 'Women 25-34'}</div>
          <div>
            • Viral on:{' '}
            {item.viralPlatforms?.join(', ') || 'Instagram, Facebook'}
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2">
        <button
          onClick={() =>
            onOptimize(item.id, item.optimizationSuggestions || [])
          }
          className="flex-1 bg-purple-600 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-purple-700 transition-colors"
        >
          Optimize
        </button>
        <button
          onClick={() => onBoost(item.id, 50)}
          className="flex-1 bg-gradient-to-r from-pink-500 to-orange-500 text-white px-3 py-2 rounded-lg text-sm font-medium hover:from-pink-600 hover:to-orange-600 transition-colors"
        >
          Boost ($50)
        </button>
      </div>
    </div>
  );
}

// Platform Performance Section Component
function PlatformPerformanceSection({
  platforms,
  selectedPlatform,
  onSelectPlatform,
}: {
  platforms: PlatformPerformance[];
  selectedPlatform: string;
  onSelectPlatform: (platform: string) => void;
}) {
  const sortedPlatforms = platforms.sort((a, b) => b.viralScore - a.viralScore);

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-gray-900">
        Platform Performance
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {sortedPlatforms.map((platform) => (
          <PlatformCard
            key={platform.name}
            platform={platform}
            isSelected={selectedPlatform === platform.name}
            onSelect={() => onSelectPlatform(platform.name)}
          />
        ))}
      </div>
    </div>
  );
}

// Platform Card Component
function PlatformCard({
  platform,
  isSelected,
  onSelect,
}: {
  platform: PlatformPerformance;
  isSelected: boolean;
  onSelect: () => void;
}) {
  return (
    <div
      onClick={onSelect}
      className={cn(
        'bg-white rounded-lg p-4 border-2 cursor-pointer transition-all hover:shadow-md',
        isSelected
          ? 'border-purple-500 ring-2 ring-purple-200'
          : 'border-gray-200',
      )}
    >
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-semibold text-gray-900 capitalize">
          {platform.name}
        </h4>
        <div className="text-lg font-bold text-purple-600">
          {platform.viralScore}/100
        </div>
      </div>

      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-600">Reach:</span>
          <span className="font-medium">{platform.reach.toLocaleString()}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">Engagement:</span>
          <span className="font-medium">
            {(platform.engagement * 100).toFixed(1)}%
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">Share Rate:</span>
          <span className="font-medium">
            {(platform.shareRate * 100).toFixed(1)}%
          </span>
        </div>
      </div>

      <div className="mt-3 w-full bg-gray-200 rounded-full h-2">
        <div
          className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full transition-all duration-300"
          style={{ width: `${platform.viralScore}%` }}
        />
      </div>
    </div>
  );
}

// Growth Predictions Section Component
function GrowthPredictionsSection({
  predictions,
  historicalData,
}: {
  predictions: GrowthPrediction[];
  historicalData: any[];
}) {
  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-gray-900">
        Growth Predictions
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {predictions.map((prediction) => (
          <PredictionCard key={prediction.metric} prediction={prediction} />
        ))}
      </div>

      <div className="bg-white rounded-lg p-6 shadow-sm">
        <h4 className="font-semibold text-gray-900 mb-4">
          Predicted Growth Timeline
        </h4>
        <GrowthTimelineChart predictions={predictions} />
      </div>
    </div>
  );
}

// Prediction Card Component
function PredictionCard({ prediction }: { prediction: GrowthPrediction }) {
  return (
    <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg p-4 border border-blue-200">
      <div className="flex items-center justify-between mb-2">
        <h4 className="font-medium text-gray-900 capitalize">
          {prediction.metric.replace('_', ' ')}
        </h4>
        <span
          className={cn(
            'text-xs px-2 py-1 rounded-full',
            prediction.confidence > 0.8
              ? 'bg-green-100 text-green-800'
              : prediction.confidence > 0.6
                ? 'bg-yellow-100 text-yellow-800'
                : 'bg-red-100 text-red-800',
          )}
        >
          {(prediction.confidence * 100).toFixed(0)}% confidence
        </span>
      </div>

      <div className="text-2xl font-bold text-purple-600 mb-1">
        {typeof prediction.value === 'number'
          ? prediction.value.toLocaleString()
          : prediction.value}
      </div>

      <div className="text-sm text-gray-600">
        Expected in {prediction.timeframe}
      </div>

      {prediction.factors && (
        <div className="mt-3 text-xs text-gray-500">
          <div>Key factors:</div>
          <ul className="list-disc list-inside mt-1">
            {prediction.factors.slice(0, 2).map((factor, index) => (
              <li key={index}>{factor}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// Growth Timeline Chart Component
function GrowthTimelineChart({
  predictions,
}: {
  predictions: GrowthPrediction[];
}) {
  return (
    <div className="h-48 flex items-center justify-center bg-gray-50 rounded-lg">
      <div className="text-center">
        <TrendingUp className="mx-auto text-gray-400 mb-2" size={48} />
        <p className="text-gray-600 text-sm">Growth timeline visualization</p>
        <p className="text-xs text-gray-500">
          Showing predicted viral growth over time
        </p>
      </div>
    </div>
  );
}

// Optimization Recommendations Component
function OptimizationRecommendations({
  couple,
  viralData,
  onOptimizeContent,
}: {
  couple: CoupleProfile;
  viralData: ViralGrowthData;
  onOptimizeContent: (contentId: string, optimizations: string[]) => void;
}) {
  const recommendations = generateOptimizationRecommendations(viralData);

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-gray-900">
        Optimization Recommendations
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <h4 className="font-medium text-gray-900">Content Optimization</h4>
          {recommendations.content.map((rec, index) => (
            <OptimizationCard key={index} recommendation={rec} type="content" />
          ))}
        </div>

        <div className="space-y-4">
          <h4 className="font-medium text-gray-900">Strategy Optimization</h4>
          {recommendations.strategy.map((rec, index) => (
            <OptimizationCard
              key={index}
              recommendation={rec}
              type="strategy"
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// Optimization Card Component
function OptimizationCard({
  recommendation,
  type,
}: {
  recommendation: {
    title: string;
    description: string;
    impact: string;
    difficulty: string;
  };
  type: 'content' | 'strategy';
}) {
  return (
    <div className="bg-white rounded-lg p-4 border border-gray-200 hover:shadow-sm transition-shadow">
      <div className="flex items-start justify-between mb-2">
        <h5 className="font-medium text-gray-900">{recommendation.title}</h5>
        <div className="flex items-center gap-2">
          <span
            className={cn(
              'text-xs px-2 py-1 rounded-full',
              recommendation.impact === 'high'
                ? 'bg-green-100 text-green-800'
                : recommendation.impact === 'medium'
                  ? 'bg-yellow-100 text-yellow-800'
                  : 'bg-gray-100 text-gray-800',
            )}
          >
            {recommendation.impact} impact
          </span>
          <span
            className={cn(
              'text-xs px-2 py-1 rounded-full',
              recommendation.difficulty === 'easy'
                ? 'bg-green-100 text-green-800'
                : recommendation.difficulty === 'medium'
                  ? 'bg-yellow-100 text-yellow-800'
                  : 'bg-red-100 text-red-800',
            )}
          >
            {recommendation.difficulty}
          </span>
        </div>
      </div>
      <p className="text-sm text-gray-600 mb-3">{recommendation.description}</p>
      <button className="w-full bg-purple-600 text-white px-3 py-2 rounded text-sm font-medium hover:bg-purple-700 transition-colors">
        Apply Optimization
      </button>
    </div>
  );
}

// Helper Functions
function calculateOverallViralScore(metrics: ViralMetrics): string {
  const score =
    (metrics.shareVelocity / 100) * 25 +
    (metrics.viralCoefficient || 0) * 25 +
    metrics.engagementRate * 100 * 0.25 +
    (metrics.contentQualityScore || 0);

  return Math.min(100, Math.max(0, score)).toFixed(0);
}

function analyzeGrowthTrend(
  historicalData: any[],
  timeRange: string,
): { direction: 'up' | 'down' | 'stable'; percentage: number } {
  // Simplified trend analysis
  return {
    direction: 'up',
    percentage: 12.5,
  };
}

function analyzePlatformPerformance(
  platforms: PlatformPerformance[],
  selectedPlatform: string,
): any {
  return platforms.find((p) => p.name === selectedPlatform) || platforms[0];
}

function generateOptimizationRecommendations(viralData: ViralGrowthData): {
  content: Array<{
    title: string;
    description: string;
    impact: string;
    difficulty: string;
  }>;
  strategy: Array<{
    title: string;
    description: string;
    impact: string;
    difficulty: string;
  }>;
} {
  return {
    content: [
      {
        title: 'Add Trending Hashtags',
        description:
          'Use current wedding trend hashtags to increase discoverability',
        impact: 'medium',
        difficulty: 'easy',
      },
      {
        title: 'Optimize Posting Times',
        description: 'Post during peak engagement hours for your audience',
        impact: 'high',
        difficulty: 'easy',
      },
      {
        title: 'Create Video Content',
        description: 'Video content performs 3x better for viral sharing',
        impact: 'high',
        difficulty: 'medium',
      },
    ],
    strategy: [
      {
        title: 'Cross-Platform Sharing',
        description: 'Share content across multiple platforms simultaneously',
        impact: 'high',
        difficulty: 'medium',
      },
      {
        title: 'Influencer Collaboration',
        description: 'Partner with wedding influencers for amplification',
        impact: 'high',
        difficulty: 'hard',
      },
      {
        title: 'User-Generated Content',
        description: 'Encourage guests to create and share their own content',
        impact: 'medium',
        difficulty: 'medium',
      },
    ],
  };
}
