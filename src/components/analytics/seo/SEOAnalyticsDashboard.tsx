'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Search,
  TrendingUp,
  TrendingDown,
  Globe,
  Users,
  Eye,
  MousePointer,
  Target,
  AlertCircle,
  RefreshCw,
  Download,
  ChevronUp,
  ChevronDown,
  ExternalLink,
  Smartphone,
  Monitor,
  Trophy,
  Zap,
} from 'lucide-react';
import dynamic from 'next/dynamic';

// Lazy load Recharts components
const ResponsiveContainer = dynamic(
  () =>
    import('recharts').then((mod) => ({ default: mod.ResponsiveContainer })),
  { ssr: false },
);
const LineChart = dynamic(
  () => import('recharts').then((mod) => ({ default: mod.LineChart })),
  { ssr: false },
);
const Line = dynamic(
  () => import('recharts').then((mod) => ({ default: mod.Line })),
  { ssr: false },
);
const AreaChart = dynamic(
  () => import('recharts').then((mod) => ({ default: mod.AreaChart })),
  { ssr: false },
);
const Area = dynamic(
  () => import('recharts').then((mod) => ({ default: mod.Area })),
  { ssr: false },
);
const BarChart = dynamic(
  () => import('recharts').then((mod) => ({ default: mod.BarChart })),
  { ssr: false },
);
const Bar = dynamic(
  () => import('recharts').then((mod) => ({ default: mod.Bar })),
  { ssr: false },
);
const PieChart = dynamic(
  () => import('recharts').then((mod) => ({ default: mod.PieChart })),
  { ssr: false },
);
const Pie = dynamic(
  () => import('recharts').then((mod) => ({ default: mod.Pie })),
  { ssr: false },
);
const Cell = dynamic(
  () => import('recharts').then((mod) => ({ default: mod.Cell })),
  { ssr: false },
);
const XAxis = dynamic(
  () => import('recharts').then((mod) => ({ default: mod.XAxis })),
  { ssr: false },
);
const YAxis = dynamic(
  () => import('recharts').then((mod) => ({ default: mod.YAxis })),
  { ssr: false },
);
const CartesianGrid = dynamic(
  () => import('recharts').then((mod) => ({ default: mod.CartesianGrid })),
  { ssr: false },
);
const Tooltip = dynamic(
  () => import('recharts').then((mod) => ({ default: mod.Tooltip })),
  { ssr: false },
);
const Legend = dynamic(
  () => import('recharts').then((mod) => ({ default: mod.Legend })),
  { ssr: false },
);

interface SEODashboardData {
  dashboard: {
    tracked_keywords: number;
    top3_rankings: number;
    top10_rankings: number;
    avg_position: number;
    featured_snippets: number;
    organic_sessions_30d: number;
    organic_users_30d: number;
    conversions_30d: number;
    avg_bounce_rate: number;
    revenue_attributed: number;
    technical_health_score: number;
  };
  keywordTrends: Array<{
    keyword: string;
    current_position: number;
    previous_position: number;
    position_change: number;
    search_volume: number;
    difficulty_score: number;
    featured_snippet: boolean;
  }>;
  organicTraffic: Array<{
    date: string;
    sessions: number;
    users: number;
    pageviews: number;
    bounce_rate: number;
    conversions: number;
  }>;
  competitors: Array<{
    competitor_name: string;
    competitor_domain: string;
    overlap_score: number;
    domain_authority: number;
    organic_traffic_estimate: number;
    top_keywords_count: number;
  }>;
  visibilityScore: number;
  opportunities: Array<{
    opportunity_type: string;
    priority: string;
    description: string;
    potential_impact: number;
    recommended_action: string;
  }>;
}

interface SEOAnalyticsDashboardProps {
  supplierId: string;
}

const SEOAnalyticsDashboard: React.FC<SEOAnalyticsDashboardProps> = ({
  supplierId,
}) => {
  const [data, setData] = useState<SEODashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedTimeframe, setSelectedTimeframe] = useState('30d');
  const [activeTab, setActiveTab] = useState<
    'overview' | 'keywords' | 'traffic' | 'competitors' | 'opportunities'
  >('overview');

  const fetchSEOData = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/analytics/seo');

      if (!response.ok) {
        throw new Error('Failed to fetch SEO analytics');
      }

      const seoData = await response.json();
      setData(seoData);
      setError(null);
    } catch (err) {
      console.error('Error fetching SEO data:', err);
      setError('Failed to load SEO analytics');
    } finally {
      setLoading(false);
    }
  }, []);

  const syncWithSearchConsole = async () => {
    try {
      setSyncing(true);
      const response = await fetch('/api/analytics/seo/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ syncType: 'all' }),
      });

      if (!response.ok) {
        throw new Error('Failed to sync with Google Search Console');
      }

      await fetchSEOData();
    } catch (err) {
      console.error('Error syncing:', err);
      setError('Failed to sync with Google Search Console');
    } finally {
      setSyncing(false);
    }
  };

  useEffect(() => {
    fetchSEOData();
  }, [fetchSEOData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-error-50 border border-error-200 rounded-lg p-4">
        <div className="flex items-center">
          <AlertCircle className="h-5 w-5 text-error-600 mr-2" />
          <p className="text-error-800">{error}</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  const {
    dashboard,
    keywordTrends,
    organicTraffic,
    competitors,
    visibilityScore,
    opportunities,
  } = data;

  // Colors from SAAS-UI-STYLE-GUIDE
  const colors = {
    primary: '#7F56D9',
    success: '#12B76A',
    error: '#F04438',
    warning: '#F79009',
    blue: '#2E90FA',
    gray: '#667085',
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">
            SEO Analytics
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Track your search performance and optimize for better rankings
          </p>
        </div>
        <button
          onClick={syncWithSearchConsole}
          disabled={syncing}
          className="px-4 py-2.5 bg-primary-600 hover:bg-primary-700 text-white font-semibold text-sm rounded-lg shadow-xs hover:shadow-sm transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-primary-100 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
        >
          <RefreshCw
            className={`h-4 w-4 mr-2 ${syncing ? 'animate-spin' : ''}`}
          />
          {syncing ? 'Syncing...' : 'Sync Data'}
        </button>
      </div>

      {/* Visibility Score */}
      <div className="bg-gradient-to-r from-primary-600 to-primary-700 rounded-xl p-6 text-white">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-lg font-semibold mb-2">SEO Visibility Score</h2>
            <div className="flex items-baseline">
              <span className="text-4xl font-bold">{visibilityScore}</span>
              <span className="text-xl ml-1">/100</span>
            </div>
            <p className="text-primary-100 mt-2">
              Your overall SEO performance across all metrics
            </p>
          </div>
          <div className="bg-white/20 rounded-lg p-4">
            <Zap className="h-12 w-12 text-white" />
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <Trophy className="h-8 w-8 text-warning-500" />
            <span className="text-xs text-gray-500">Rankings</span>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Top 3</span>
              <span className="text-lg font-semibold text-gray-900">
                {dashboard.top3_rankings}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Top 10</span>
              <span className="text-lg font-semibold text-gray-900">
                {dashboard.top10_rankings}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Avg Position</span>
              <span className="text-lg font-semibold text-gray-900">
                {dashboard.avg_position.toFixed(1)}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <Users className="h-8 w-8 text-blue-500" />
            <span className="text-xs text-gray-500">Traffic (30d)</span>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Sessions</span>
              <span className="text-lg font-semibold text-gray-900">
                {dashboard.organic_sessions_30d.toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Users</span>
              <span className="text-lg font-semibold text-gray-900">
                {dashboard.organic_users_30d.toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Bounce Rate</span>
              <span className="text-lg font-semibold text-gray-900">
                {dashboard.avg_bounce_rate.toFixed(1)}%
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <Target className="h-8 w-8 text-success-500" />
            <span className="text-xs text-gray-500">Conversions</span>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Total</span>
              <span className="text-lg font-semibold text-gray-900">
                {dashboard.conversions_30d}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Revenue</span>
              <span className="text-lg font-semibold text-gray-900">
                ${dashboard.revenue_attributed.toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <Search className="h-8 w-8 text-primary-500" />
            <span className="text-xs text-gray-500">Keywords</span>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Tracked</span>
              <span className="text-lg font-semibold text-gray-900">
                {dashboard.tracked_keywords}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Featured Snippets</span>
              <span className="text-lg font-semibold text-gray-900">
                {dashboard.featured_snippets}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Technical Score</span>
              <span className="text-lg font-semibold text-gray-900">
                {dashboard.technical_health_score}/100
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {(
            [
              'overview',
              'keywords',
              'traffic',
              'competitors',
              'opportunities',
            ] as const
          ).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`py-2 px-1 border-b-2 font-medium text-sm capitalize ${
                activeTab === tab
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-xs">
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-gray-900">
              Organic Traffic Trend
            </h3>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={organicTraffic}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#EAECF0" />
                  <XAxis
                    dataKey="date"
                    stroke="#667085"
                    tick={{ fontSize: 12 }}
                  />
                  <YAxis stroke="#667085" tick={{ fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#FFFFFF',
                      border: '1px solid #EAECF0',
                      borderRadius: '8px',
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="sessions"
                    stroke={colors.primary}
                    fill={colors.primary}
                    fillOpacity={0.1}
                    strokeWidth={2}
                  />
                  <Area
                    type="monotone"
                    dataKey="conversions"
                    stroke={colors.success}
                    fill={colors.success}
                    fillOpacity={0.1}
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {activeTab === 'keywords' && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">
              Keyword Rankings
            </h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Keyword
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Position
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Change
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Volume
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Difficulty
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {keywordTrends.map((keyword, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-900">
                        <div className="flex items-center">
                          {keyword.keyword}
                          {keyword.featured_snippet && (
                            <span className="ml-2 px-2 py-0.5 text-xs bg-primary-100 text-primary-700 rounded-full">
                              Featured
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        #{keyword.current_position}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <div className="flex items-center">
                          {keyword.position_change > 0 ? (
                            <>
                              <ChevronDown className="h-4 w-4 text-error-500 mr-1" />
                              <span className="text-error-600">
                                -{keyword.position_change}
                              </span>
                            </>
                          ) : keyword.position_change < 0 ? (
                            <>
                              <ChevronUp className="h-4 w-4 text-success-500 mr-1" />
                              <span className="text-success-600">
                                +{Math.abs(keyword.position_change)}
                              </span>
                            </>
                          ) : (
                            <span className="text-gray-500">-</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {keyword.search_volume.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <div className="flex items-center">
                          <div className="w-16 bg-gray-200 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full ${
                                keyword.difficulty_score > 70
                                  ? 'bg-error-500'
                                  : keyword.difficulty_score > 40
                                    ? 'bg-warning-500'
                                    : 'bg-success-500'
                              }`}
                              style={{ width: `${keyword.difficulty_score}%` }}
                            />
                          </div>
                          <span className="ml-2 text-xs text-gray-600">
                            {keyword.difficulty_score}
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'traffic' && (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-gray-900">
              Traffic Sources
            </h3>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={organicTraffic}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#EAECF0" />
                    <XAxis
                      dataKey="date"
                      stroke="#667085"
                      tick={{ fontSize: 12 }}
                    />
                    <YAxis stroke="#667085" tick={{ fontSize: 12 }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#FFFFFF',
                        border: '1px solid #EAECF0',
                        borderRadius: '8px',
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="pageviews"
                      stroke={colors.blue}
                      strokeWidth={2}
                      dot={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="users"
                      stroke={colors.primary}
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center">
                    <Monitor className="h-8 w-8 text-gray-600 mr-3" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        Desktop Traffic
                      </p>
                      <p className="text-xs text-gray-500">65% of total</p>
                    </div>
                  </div>
                  <span className="text-lg font-semibold text-gray-900">
                    12,543
                  </span>
                </div>
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center">
                    <Smartphone className="h-8 w-8 text-gray-600 mr-3" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        Mobile Traffic
                      </p>
                      <p className="text-xs text-gray-500">35% of total</p>
                    </div>
                  </div>
                  <span className="text-lg font-semibold text-gray-900">
                    6,789
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'competitors' && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">
              Competitor Analysis
            </h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Competitor
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Domain Authority
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Organic Traffic
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Top Keywords
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Overlap Score
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {competitors.map((competitor, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm">
                        <div>
                          <p className="text-gray-900 font-medium">
                            {competitor.competitor_name}
                          </p>
                          <p className="text-gray-500 text-xs">
                            {competitor.competitor_domain}
                          </p>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {competitor.domain_authority}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {competitor.organic_traffic_estimate.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {competitor.top_keywords_count}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <div className="flex items-center">
                          <div className="w-16 bg-gray-200 rounded-full h-2">
                            <div
                              className="h-2 rounded-full bg-primary-500"
                              style={{ width: `${competitor.overlap_score}%` }}
                            />
                          </div>
                          <span className="ml-2 text-xs text-gray-600">
                            {competitor.overlap_score}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'opportunities' && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">
              SEO Opportunities
            </h3>
            <div className="space-y-3">
              {opportunities.map((opportunity, index) => (
                <div
                  key={index}
                  className={`p-4 rounded-lg border ${
                    opportunity.priority === 'high'
                      ? 'border-error-200 bg-error-50'
                      : opportunity.priority === 'medium'
                        ? 'border-warning-200 bg-warning-50'
                        : 'border-gray-200 bg-gray-50'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center mb-2">
                        <span
                          className={`px-2 py-1 text-xs font-medium rounded-full ${
                            opportunity.priority === 'high'
                              ? 'bg-error-100 text-error-700'
                              : opportunity.priority === 'medium'
                                ? 'bg-warning-100 text-warning-700'
                                : 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          {opportunity.priority} priority
                        </span>
                        <span className="ml-2 text-xs text-gray-500">
                          Potential impact: {opportunity.potential_impact}
                        </span>
                      </div>
                      <p className="text-sm text-gray-900 font-medium mb-1">
                        {opportunity.description}
                      </p>
                      <p className="text-sm text-gray-600">
                        {opportunity.recommended_action}
                      </p>
                    </div>
                    <button className="ml-4 text-primary-600 hover:text-primary-700">
                      <ExternalLink className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SEOAnalyticsDashboard;
