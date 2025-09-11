'use client';

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Eye,
  Heart,
  Share2,
  MessageCircle,
  Download,
  Users,
  Globe,
  Clock,
  MapPin,
  Smartphone,
  Monitor,
  Calendar,
  Filter,
  ArrowUpRight,
  ArrowDownRight,
  Star,
  Target,
  Zap,
  Trophy,
} from 'lucide-react';
import {
  CoupleProfile,
  SharingAnalytics,
  ContentPerformance,
  ViralMetrics,
  AudienceInsights,
  EngagementStats,
  SharingTrend,
  PopularContent,
} from '@/types/wedme/file-management';
import { cn } from '@/lib/utils';

interface SharingAnalyticsDashboardProps {
  couple: CoupleProfile;
  analytics: SharingAnalytics;
  onRefreshData: () => void;
  className?: string;
}

export default function SharingAnalyticsDashboard({
  couple,
  analytics,
  onRefreshData,
  className,
}: SharingAnalyticsDashboardProps) {
  const [activeTab, setActiveTab] = useState<
    'overview' | 'content' | 'audience' | 'viral' | 'trends'
  >('overview');
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d' | 'all'>(
    '30d',
  );

  const filteredAnalytics = useMemo(() => {
    return filterAnalyticsByTimeRange(analytics, timeRange);
  }, [analytics, timeRange]);

  const topPerformingContent = useMemo(() => {
    return (
      analytics.contentPerformance
        ?.sort((a, b) => b.totalEngagement - a.totalEngagement)
        .slice(0, 5) || []
    );
  }, [analytics.contentPerformance]);

  const viralScore = useMemo(() => {
    return calculateViralScore(analytics.viralMetrics);
  }, [analytics.viralMetrics]);

  return (
    <div
      className={cn(
        'bg-white rounded-xl shadow-sm border border-gray-200',
        className,
      )}
    >
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <BarChart3 className="text-purple-600" size={24} />
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                Sharing Analytics
              </h3>
              <p className="text-sm text-gray-600">
                Track engagement and viral growth
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value as any)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500"
            >
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="90d">Last 90 days</option>
              <option value="all">All time</option>
            </select>
            <button
              onClick={onRefreshData}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="px-6 py-2 border-b border-gray-100">
        <div className="flex space-x-6">
          {[
            { id: 'overview' as const, label: 'Overview', icon: BarChart3 },
            { id: 'content' as const, label: 'Content', icon: Star },
            { id: 'audience' as const, label: 'Audience', icon: Users },
            { id: 'viral' as const, label: 'Viral Growth', icon: Zap },
            { id: 'trends' as const, label: 'Trends', icon: TrendingUp },
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={cn(
                'flex items-center gap-2 py-3 px-1 text-sm font-medium border-b-2 transition-colors',
                activeTab === id
                  ? 'border-purple-600 text-purple-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700',
              )}
            >
              <Icon size={16} />
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="p-6">
        <AnimatePresence mode="wait">
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              {/* Key Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <MetricCard
                  title="Total Views"
                  value={filteredAnalytics.totalViews}
                  change={analytics.viewsGrowth}
                  icon={Eye}
                  color="blue"
                />
                <MetricCard
                  title="Engagement Rate"
                  value={`${(filteredAnalytics.engagementRate * 100).toFixed(1)}%`}
                  change={analytics.engagementGrowth}
                  icon={Heart}
                  color="red"
                />
                <MetricCard
                  title="Shares"
                  value={filteredAnalytics.totalShares}
                  change={analytics.sharesGrowth}
                  icon={Share2}
                  color="green"
                />
                <MetricCard
                  title="Viral Score"
                  value={viralScore}
                  change={analytics.viralScoreChange}
                  icon={Zap}
                  color="purple"
                />
              </div>

              {/* Viral Score Breakdown */}
              <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg p-6 border border-purple-200">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h4 className="text-lg font-semibold text-purple-900">
                      Viral Growth Potential
                    </h4>
                    <p className="text-sm text-purple-700">
                      Your content's viral performance
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-bold text-purple-900">
                      {viralScore}/100
                    </div>
                    <div className="text-sm text-purple-700">Viral Score</div>
                  </div>
                </div>

                <ViralScoreBreakdown viralMetrics={analytics.viralMetrics} />
              </div>

              {/* Top Performing Content */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-lg font-semibold text-gray-900">
                    Top Performing Content
                  </h4>
                  <button className="text-purple-600 hover:text-purple-700 text-sm font-medium">
                    View All
                  </button>
                </div>
                <div className="space-y-3">
                  {topPerformingContent.map((content, index) => (
                    <TopContentCard
                      key={content.fileId}
                      content={content}
                      rank={index + 1}
                    />
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {/* Content Performance Tab */}
          {activeTab === 'content' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              <ContentPerformanceAnalysis
                contentPerformance={analytics.contentPerformance || []}
                timeRange={timeRange}
              />
            </motion.div>
          )}

          {/* Audience Insights Tab */}
          {activeTab === 'audience' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              <AudienceInsightsPanel insights={analytics.audienceInsights} />
            </motion.div>
          )}

          {/* Viral Growth Tab */}
          {activeTab === 'viral' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              <ViralGrowthAnalysis viralMetrics={analytics.viralMetrics} />
            </motion.div>
          )}

          {/* Trends Tab */}
          {activeTab === 'trends' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              <TrendsAnalysis trends={analytics.trends || []} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// Metric Card Component
function MetricCard({
  title,
  value,
  change,
  icon: Icon,
  color,
}: {
  title: string;
  value: string | number;
  change?: number;
  icon: any;
  color: 'blue' | 'red' | 'green' | 'purple';
}) {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600 border-blue-200',
    red: 'bg-red-50 text-red-600 border-red-200',
    green: 'bg-green-50 text-green-600 border-green-200',
    purple: 'bg-purple-50 text-purple-600 border-purple-200',
  };

  const isPositive = change && change > 0;
  const isNegative = change && change < 0;

  return (
    <div className={cn('rounded-lg p-6 border', colorClasses[color])}>
      <div className="flex items-center justify-between mb-2">
        <Icon size={24} />
        {change !== undefined && (
          <div
            className={cn(
              'flex items-center gap-1 text-sm font-medium',
              isPositive
                ? 'text-green-600'
                : isNegative
                  ? 'text-red-600'
                  : 'text-gray-600',
            )}
          >
            {isPositive ? (
              <ArrowUpRight size={16} />
            ) : isNegative ? (
              <ArrowDownRight size={16} />
            ) : null}
            {Math.abs(change).toFixed(1)}%
          </div>
        )}
      </div>
      <div className="text-2xl font-bold mb-1">{value}</div>
      <div className="text-sm opacity-75">{title}</div>
    </div>
  );
}

// Viral Score Breakdown Component
function ViralScoreBreakdown({
  viralMetrics,
}: {
  viralMetrics?: ViralMetrics;
}) {
  const factors = [
    {
      name: 'Share Velocity',
      score: viralMetrics?.shareVelocity || 0,
      max: 25,
    },
    {
      name: 'Engagement Rate',
      score: viralMetrics?.engagementRate || 0,
      max: 25,
    },
    { name: 'Reach Growth', score: viralMetrics?.reachGrowth || 0, max: 25 },
    {
      name: 'Content Quality',
      score: viralMetrics?.contentQualityScore || 0,
      max: 25,
    },
  ];

  return (
    <div className="space-y-3">
      {factors.map((factor) => (
        <div key={factor.name} className="space-y-1">
          <div className="flex justify-between text-sm">
            <span className="text-purple-700">{factor.name}</span>
            <span className="text-purple-900 font-medium">
              {factor.score.toFixed(1)}/{factor.max}
            </span>
          </div>
          <div className="w-full bg-purple-200 rounded-full h-2">
            <div
              className="bg-purple-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${(factor.score / factor.max) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

// Top Content Card Component
function TopContentCard({
  content,
  rank,
}: {
  content: ContentPerformance;
  rank: number;
}) {
  return (
    <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
      <div
        className={cn(
          'w-8 h-8 rounded-full flex items-center justify-center text-white font-bold',
          rank === 1
            ? 'bg-yellow-500'
            : rank === 2
              ? 'bg-gray-400'
              : rank === 3
                ? 'bg-orange-500'
                : 'bg-gray-300',
        )}
      >
        {rank === 1 ? <Trophy size={16} /> : rank}
      </div>

      <div className="flex-1">
        <h5 className="font-medium text-gray-900">{content.fileName}</h5>
        <p className="text-sm text-gray-600">
          {content.views} views • {content.likes} likes • {content.shares}{' '}
          shares
        </p>
      </div>

      <div className="text-right">
        <div className="text-lg font-semibold text-gray-900">
          {content.totalEngagement}
        </div>
        <div className="text-xs text-gray-500">Total Engagement</div>
      </div>
    </div>
  );
}

// Content Performance Analysis Component
function ContentPerformanceAnalysis({
  contentPerformance,
  timeRange,
}: {
  contentPerformance: ContentPerformance[];
  timeRange: string;
}) {
  const sortedContent = contentPerformance.sort(
    (a, b) => b.totalEngagement - a.totalEngagement,
  );

  return (
    <div className="space-y-6">
      <div>
        <h4 className="text-lg font-semibold text-gray-900 mb-4">
          Content Performance Analysis
        </h4>

        {/* Performance Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
            <div className="text-2xl font-bold text-blue-900">
              {contentPerformance
                .reduce((sum, c) => sum + c.views, 0)
                .toLocaleString()}
            </div>
            <div className="text-sm text-blue-700">Total Views</div>
          </div>
          <div className="bg-green-50 rounded-lg p-4 border border-green-200">
            <div className="text-2xl font-bold text-green-900">
              {(
                contentPerformance.reduce(
                  (sum, c) => sum + c.engagementRate,
                  0,
                ) / contentPerformance.length
              ).toFixed(1)}
              %
            </div>
            <div className="text-sm text-green-700">Avg Engagement Rate</div>
          </div>
          <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
            <div className="text-2xl font-bold text-purple-900">
              {contentPerformance
                .reduce((sum, c) => sum + c.shares, 0)
                .toLocaleString()}
            </div>
            <div className="text-sm text-purple-700">Total Shares</div>
          </div>
        </div>
      </div>

      {/* Detailed Content List */}
      <div className="space-y-3">
        {sortedContent.map((content) => (
          <div
            key={content.fileId}
            className="border border-gray-200 rounded-lg p-4"
          >
            <div className="flex items-center justify-between mb-3">
              <h5 className="font-medium text-gray-900">{content.fileName}</h5>
              <span
                className={cn(
                  'px-2 py-1 rounded-full text-xs font-medium',
                  content.engagementRate > 5
                    ? 'bg-green-100 text-green-800'
                    : content.engagementRate > 2
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-red-100 text-red-800',
                )}
              >
                {content.engagementRate.toFixed(1)}% engagement
              </span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div className="flex items-center gap-2">
                <Eye size={16} className="text-blue-500" />
                <span>{content.views.toLocaleString()} views</span>
              </div>
              <div className="flex items-center gap-2">
                <Heart size={16} className="text-red-500" />
                <span>{content.likes} likes</span>
              </div>
              <div className="flex items-center gap-2">
                <Share2 size={16} className="text-green-500" />
                <span>{content.shares} shares</span>
              </div>
              <div className="flex items-center gap-2">
                <MessageCircle size={16} className="text-purple-500" />
                <span>{content.comments} comments</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Audience Insights Panel Component
function AudienceInsightsPanel({ insights }: { insights?: AudienceInsights }) {
  if (!insights) {
    return (
      <div className="text-center py-12">
        <Users className="mx-auto text-gray-400 mb-4" size={48} />
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          No Audience Data
        </h3>
        <p className="text-gray-600">
          Audience insights will appear as people engage with your content.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Demographics */}
      <div className="space-y-4">
        <h4 className="text-lg font-semibold text-gray-900">Demographics</h4>

        <div className="bg-gray-50 rounded-lg p-4">
          <h5 className="font-medium text-gray-900 mb-3">Age Groups</h5>
          <div className="space-y-2">
            {insights.ageGroups?.map((group) => (
              <div
                key={group.range}
                className="flex justify-between items-center"
              >
                <span className="text-sm text-gray-600">{group.range}</span>
                <div className="flex items-center gap-2">
                  <div className="w-20 bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-500 h-2 rounded-full"
                      style={{ width: `${group.percentage}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium">
                    {group.percentage}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-gray-50 rounded-lg p-4">
          <h5 className="font-medium text-gray-900 mb-3">Top Locations</h5>
          <div className="space-y-2">
            {insights.topLocations?.map((location) => (
              <div
                key={location.city}
                className="flex justify-between items-center"
              >
                <div className="flex items-center gap-2">
                  <MapPin size={14} className="text-gray-400" />
                  <span className="text-sm text-gray-600">{location.city}</span>
                </div>
                <span className="text-sm font-medium">
                  {location.percentage}%
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Behavior */}
      <div className="space-y-4">
        <h4 className="text-lg font-semibold text-gray-900">Behavior</h4>

        <div className="bg-gray-50 rounded-lg p-4">
          <h5 className="font-medium text-gray-900 mb-3">Device Usage</h5>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Smartphone size={14} className="text-gray-400" />
                <span className="text-sm text-gray-600">Mobile</span>
              </div>
              <span className="text-sm font-medium">
                {insights.mobileUsage}%
              </span>
            </div>
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Monitor size={14} className="text-gray-400" />
                <span className="text-sm text-gray-600">Desktop</span>
              </div>
              <span className="text-sm font-medium">
                {100 - insights.mobileUsage!}%
              </span>
            </div>
          </div>
        </div>

        <div className="bg-gray-50 rounded-lg p-4">
          <h5 className="font-medium text-gray-900 mb-3">
            Peak Activity Times
          </h5>
          <div className="space-y-2">
            {insights.peakHours?.map((hour) => (
              <div
                key={hour.hour}
                className="flex justify-between items-center"
              >
                <span className="text-sm text-gray-600">{hour.hour}:00</span>
                <div className="flex items-center gap-2">
                  <div className="w-20 bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-green-500 h-2 rounded-full"
                      style={{ width: `${hour.activity}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium">{hour.activity}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// Viral Growth Analysis Component
function ViralGrowthAnalysis({
  viralMetrics,
}: {
  viralMetrics?: ViralMetrics;
}) {
  if (!viralMetrics) {
    return (
      <div className="text-center py-12">
        <Zap className="mx-auto text-gray-400 mb-4" size={48} />
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          No Viral Data
        </h3>
        <p className="text-gray-600">
          Viral growth metrics will appear as your content spreads.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg p-6 text-white">
          <div className="text-3xl font-bold">
            {viralMetrics.shareVelocity.toFixed(1)}
          </div>
          <div className="text-purple-100">Shares per hour</div>
        </div>
        <div className="bg-gradient-to-r from-blue-500 to-cyan-500 rounded-lg p-6 text-white">
          <div className="text-3xl font-bold">
            {(viralMetrics.reachMultiplier * 100).toFixed(0)}%
          </div>
          <div className="text-blue-100">Reach amplification</div>
        </div>
        <div className="bg-gradient-to-r from-green-500 to-emerald-500 rounded-lg p-6 text-white">
          <div className="text-3xl font-bold">
            {viralMetrics.influencerEngagement}
          </div>
          <div className="text-green-100">Influencer interactions</div>
        </div>
      </div>

      {/* Viral Coefficient Analysis */}
      <div className="bg-gray-50 rounded-lg p-6">
        <h4 className="text-lg font-semibold text-gray-900 mb-4">
          Viral Coefficient
        </h4>
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-gray-600">Current viral coefficient</span>
            <span className="text-2xl font-bold text-purple-600">
              {viralMetrics.viralCoefficient?.toFixed(2) || '0.00'}
            </span>
          </div>
          <div className="text-sm text-gray-500">
            A viral coefficient above 1.0 means your content is growing
            exponentially.
            {(viralMetrics.viralCoefficient || 0) > 1
              ? ' Great job! 🚀'
              : ' Keep optimizing for better reach! 📈'}
          </div>
        </div>
      </div>
    </div>
  );
}

// Trends Analysis Component
function TrendsAnalysis({ trends }: { trends: SharingTrend[] }) {
  if (!trends.length) {
    return (
      <div className="text-center py-12">
        <TrendingUp className="mx-auto text-gray-400 mb-4" size={48} />
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          No Trend Data
        </h3>
        <p className="text-gray-600">
          Trends will appear as we gather more engagement data.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h4 className="text-lg font-semibold text-gray-900">Sharing Trends</h4>

      {trends.map((trend, index) => (
        <div key={index} className="border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <h5 className="font-medium text-gray-900">{trend.category}</h5>
            <div
              className={cn(
                'flex items-center gap-1 text-sm font-medium',
                trend.direction === 'up'
                  ? 'text-green-600'
                  : trend.direction === 'down'
                    ? 'text-red-600'
                    : 'text-gray-600',
              )}
            >
              {trend.direction === 'up' ? (
                <TrendingUp size={16} />
              ) : trend.direction === 'down' ? (
                <TrendingDown size={16} />
              ) : null}
              {trend.changePercentage > 0 ? '+' : ''}
              {trend.changePercentage.toFixed(1)}%
            </div>
          </div>
          <p className="text-sm text-gray-600">{trend.description}</p>
        </div>
      ))}
    </div>
  );
}

// Helper Functions
function filterAnalyticsByTimeRange(
  analytics: SharingAnalytics,
  timeRange: string,
): SharingAnalytics {
  // In a real implementation, this would filter the analytics data based on the time range
  return analytics;
}

function calculateViralScore(viralMetrics?: ViralMetrics): string {
  if (!viralMetrics) return '0';

  const score =
    (viralMetrics.shareVelocity || 0) +
    (viralMetrics.engagementRate * 100 || 0) +
    (viralMetrics.reachGrowth || 0) +
    (viralMetrics.contentQualityScore || 0);

  return Math.min(100, Math.max(0, score)).toFixed(0);
}
