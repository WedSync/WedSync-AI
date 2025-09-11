'use client';

import { useState, useEffect } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Search,
  Eye,
  Heart,
  MessageCircle,
  BarChart3,
  Users,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  HelpCircle,
  BookOpen,
  Star,
  AlertCircle,
} from 'lucide-react';
import { faqService } from '@/lib/services/faqService';
import type {
  FaqDashboardOverview,
  FaqTopSearchTerms,
  FaqPerformanceMetrics,
} from '@/types/faq';

interface FAQAnalyticsProps {
  overview: FaqDashboardOverview | null;
}

export function FAQAnalytics({ overview }: FAQAnalyticsProps) {
  const [timeframe, setTimeframe] = useState<'7d' | '30d' | '90d'>('30d');
  const [topSearchTerms, setTopSearchTerms] = useState<FaqTopSearchTerms[]>([]);
  const [performanceMetrics, setPerformanceMetrics] =
    useState<FaqPerformanceMetrics | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadAnalytics();
  }, [timeframe]);

  const loadAnalytics = async () => {
    setLoading(true);
    try {
      // In a real implementation, these would be separate API calls
      // For now, we'll mock some representative data

      await new Promise((resolve) => setTimeout(resolve, 800)); // Simulate API call

      setTopSearchTerms([
        {
          query: 'photo delivery time',
          search_count: 45,
          result_count: 8,
          success_rate: 89,
          trend: 'up',
        },
        {
          query: 'wedding day timeline',
          search_count: 38,
          result_count: 12,
          success_rate: 100,
          trend: 'up',
        },
        {
          query: 'engagement session included',
          search_count: 32,
          result_count: 5,
          success_rate: 78,
          trend: 'stable',
        },
        {
          query: 'rain backup plan',
          search_count: 28,
          result_count: 7,
          success_rate: 96,
          trend: 'down',
        },
        {
          query: 'photo editing style',
          search_count: 24,
          result_count: 9,
          success_rate: 92,
          trend: 'up',
        },
      ]);

      setPerformanceMetrics({
        most_viewed_faqs: [
          {
            id: '1',
            question: 'When will my wedding photos be ready?',
            view_count: 187,
            helpfulness_ratio: 0.89,
          },
          {
            id: '2',
            question: 'Do you include engagement sessions?',
            view_count: 134,
            helpfulness_ratio: 0.78,
          },
          {
            id: '3',
            question: 'What happens if it rains on my wedding day?',
            view_count: 98,
            helpfulness_ratio: 0.92,
          },
        ],
        most_helpful_faqs: [
          {
            id: '3',
            question: 'What happens if it rains on my wedding day?',
            help_score: 15,
            view_count: 98,
          },
          {
            id: '1',
            question: 'When will my wedding photos be ready?',
            help_score: 12,
            view_count: 187,
          },
          {
            id: '4',
            question: 'How do you handle family photo lists?',
            help_score: 8,
            view_count: 56,
          },
        ],
        underperforming_faqs: [
          {
            id: '5',
            question: 'What camera equipment do you use?',
            help_score: -2,
            view_count: 23,
            improvement_suggestions: [
              'Add more technical detail',
              'Include example photos',
              'Explain why equipment matters',
            ],
          },
        ],
        content_gaps: [
          {
            search_query: 'photo editing timeline',
            frequency: 12,
            suggested_category: 'timeline-delivery',
          },
          {
            search_query: 'album design options',
            frequency: 8,
            suggested_category: 'packages-addons',
          },
          {
            search_query: 'backup photographer policy',
            frequency: 6,
            suggested_category: 'wedding-day-logistics',
          },
        ],
      });
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!overview) {
    return (
      <div className="text-center py-8">
        <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          No Analytics Data
        </h3>
        <p className="text-gray-500">
          Create some FAQs to start tracking analytics
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-display-xs font-semibold text-gray-900">
            FAQ Analytics
          </h2>
          <p className="mt-1 text-sm text-gray-600">
            Track FAQ performance and optimize your client support
          </p>
        </div>

        <div className="mt-4 sm:mt-0">
          <select
            value={timeframe}
            onChange={(e) =>
              setTimeframe(e.target.value as '7d' | '30d' | '90d')
            }
            className="
              px-3 py-2 bg-white border border-gray-300 rounded-lg
              text-sm text-gray-700 shadow-xs
              focus:outline-none focus:ring-4 focus:ring-primary-100
              focus:border-primary-300
            "
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
          </select>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Total Views"
          value={overview.views_30d?.toLocaleString() || '0'}
          change={+12}
          icon={Eye}
          color="blue"
        />
        <MetricCard
          title="Search Success Rate"
          value={`${Math.round(overview.search_success_rate || 100)}%`}
          change={+5}
          icon={Search}
          color="success"
        />
        <MetricCard
          title="Helpfulness Score"
          value={`${Math.round(overview.helpfulness_percentage || 0)}%`}
          change={+8}
          icon={Heart}
          color="warning"
        />
        <MetricCard
          title="Avg Response Time"
          value={`${overview.avg_search_duration_ms || 280}ms`}
          change={-15}
          icon={Clock}
          color="primary"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Top Search Terms */}
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-xs">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">
              Top Search Terms
            </h3>
            <Search className="w-5 h-5 text-gray-400" />
          </div>

          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div
                  key={i}
                  className="animate-pulse flex items-center justify-between"
                >
                  <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                  <div className="h-4 bg-gray-200 rounded w-16"></div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {topSearchTerms.map((term, index) => (
                <div
                  key={term.query}
                  className="flex items-center justify-between"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-gray-500 w-4">
                        #{index + 1}
                      </span>
                      <span className="text-sm font-medium text-gray-900">
                        {term.query}
                      </span>
                      <TrendIcon trend={term.trend} />
                    </div>
                    <div className="flex items-center gap-4 mt-1 ml-6">
                      <span className="text-xs text-gray-500">
                        {term.search_count} searches
                      </span>
                      <span className="text-xs text-gray-500">
                        {term.result_count} results
                      </span>
                      <span
                        className={`
                        text-xs font-medium
                        ${term.success_rate >= 90 ? 'text-success-600' : term.success_rate >= 70 ? 'text-warning-600' : 'text-error-600'}
                      `}
                      >
                        {term.success_rate}% success
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* FAQ Performance */}
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-xs">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">
              Top Performing FAQs
            </h3>
            <BarChart3 className="w-5 h-5 text-gray-400" />
          </div>

          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {performanceMetrics?.most_viewed_faqs.map((faq, index) => (
                <div
                  key={faq.id}
                  className="pb-4 border-b border-gray-100 last:border-b-0"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <span className="text-xs font-medium text-gray-500">
                        #{index + 1}
                      </span>
                      <h4 className="text-sm font-medium text-gray-900 mt-1 line-clamp-2">
                        {faq.question}
                      </h4>
                      <div className="flex items-center gap-4 mt-2">
                        <span className="flex items-center gap-1 text-xs text-gray-500">
                          <Eye className="w-3 h-3" />
                          {faq.view_count} views
                        </span>
                        <span className="flex items-center gap-1 text-xs text-gray-500">
                          <Heart className="w-3 h-3" />
                          {Math.round(faq.helpfulness_ratio * 100)}% helpful
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Content Gaps */}
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-xs">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">
              Content Gaps
            </h3>
            <HelpCircle className="w-5 h-5 text-gray-400" />
          </div>

          <p className="text-sm text-gray-600 mb-4">
            Common searches with no or poor results - consider creating FAQs for
            these:
          </p>

          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="animate-pulse p-3 bg-gray-50 rounded-lg"
                >
                  <div className="h-4 bg-gray-200 rounded w-2/3 mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {performanceMetrics?.content_gaps.map((gap, index) => (
                <div
                  key={index}
                  className="p-4 bg-warning-25 border border-warning-200 rounded-lg"
                >
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-medium text-gray-900">
                      "{gap.search_query}"
                    </h4>
                    <span className="text-xs font-medium text-warning-700 bg-warning-100 px-2 py-0.5 rounded-full">
                      {gap.frequency} searches
                    </span>
                  </div>
                  <p className="text-xs text-gray-600">
                    Suggested category:{' '}
                    <span className="font-medium">
                      {gap.suggested_category.replace('-', ' ')}
                    </span>
                  </p>
                  <button className="mt-2 text-xs font-medium text-primary-600 hover:text-primary-700">
                    Create FAQ →
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Underperforming FAQs */}
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-xs">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">
              Needs Improvement
            </h3>
            <AlertCircle className="w-5 h-5 text-gray-400" />
          </div>

          <p className="text-sm text-gray-600 mb-4">
            FAQs with low helpfulness scores that could be improved:
          </p>

          {loading ? (
            <div className="space-y-3">
              {[1].map((i) => (
                <div
                  key={i}
                  className="animate-pulse p-3 bg-gray-50 rounded-lg"
                >
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2 mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {performanceMetrics?.underperforming_faqs.map((faq) => (
                <div
                  key={faq.id}
                  className="p-4 bg-error-25 border border-error-200 rounded-lg"
                >
                  <h4 className="text-sm font-medium text-gray-900 mb-2">
                    {faq.question}
                  </h4>
                  <div className="flex items-center gap-4 text-xs text-gray-600 mb-3">
                    <span>{faq.view_count} views</span>
                    <span className="text-error-600 font-medium">
                      {faq.help_score} help score
                    </span>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-gray-700">
                      Suggestions:
                    </p>
                    <ul className="text-xs text-gray-600 space-y-0.5">
                      {faq.improvement_suggestions.map((suggestion, index) => (
                        <li key={index}>• {suggestion}</li>
                      ))}
                    </ul>
                  </div>
                  <button className="mt-2 text-xs font-medium text-primary-600 hover:text-primary-700">
                    Edit FAQ →
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Business Impact Summary */}
      <div className="bg-gradient-to-r from-primary-500 to-primary-600 rounded-xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold mb-2">Business Impact</h3>
            <p className="text-primary-100 text-sm mb-4">
              Your FAQ system is reducing client support workload
            </p>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-2xl font-bold">{overview.views_30d || 0}</p>
                <p className="text-xs text-primary-200">
                  Support queries avoided
                </p>
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {Math.round(((overview.views_30d || 0) * 5) / 60)}h
                </p>
                <p className="text-xs text-primary-200">
                  Time saved this month
                </p>
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {Math.round(overview.helpfulness_percentage || 0)}%
                </p>
                <p className="text-xs text-primary-200">Client satisfaction</p>
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {Math.round(overview.search_success_rate || 100)}%
                </p>
                <p className="text-xs text-primary-200">Find success rate</p>
              </div>
            </div>
          </div>

          <div className="hidden md:block">
            <TrendingUp className="w-16 h-16 text-primary-200" />
          </div>
        </div>
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
  value: string;
  change: number;
  icon: any;
  color: 'blue' | 'success' | 'warning' | 'primary';
}) {
  const colorClasses = {
    blue: 'text-blue-600',
    success: 'text-success-600',
    warning: 'text-warning-600',
    primary: 'text-primary-600',
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-xs hover:shadow-md transition-all duration-200">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-display-xs font-semibold text-gray-900 mt-1">
            {value}
          </p>
          {change !== 0 && (
            <div
              className={`
              flex items-center gap-1 mt-2 text-xs font-medium
              ${change > 0 ? 'text-success-600' : 'text-error-600'}
            `}
            >
              {change > 0 ? (
                <ArrowUpRight className="w-3 h-3" />
              ) : (
                <ArrowDownRight className="w-3 h-3" />
              )}
              {Math.abs(change)}% from last period
            </div>
          )}
        </div>
        <Icon className={`w-8 h-8 ${colorClasses[color]}`} />
      </div>
    </div>
  );
}

// Trend Icon Component
function TrendIcon({ trend }: { trend: 'up' | 'down' | 'stable' }) {
  switch (trend) {
    case 'up':
      return <TrendingUp className="w-3 h-3 text-success-600" />;
    case 'down':
      return <TrendingDown className="w-3 h-3 text-error-600" />;
    case 'stable':
    default:
      return <div className="w-3 h-3 rounded-full bg-gray-400"></div>;
  }
}
