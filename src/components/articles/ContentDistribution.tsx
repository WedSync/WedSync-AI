'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Target,
  Users,
  TrendingUp,
  Calendar,
  MapPin,
  DollarSign,
  Heart,
  Brain,
  RefreshCw,
  Filter,
  Search,
  Eye,
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { contentDistributionService } from '@/lib/services/content-distribution';
import type {
  ContentDistributionResponse,
  RecommendedArticle,
  DistributionReason,
  EngagementPrediction,
  Article,
  ContentDistributionRule,
  DistributionConditionType,
  WeddingType,
  ClientSegment,
} from '@/types/articles';

interface ContentDistributionProps {
  articles: Article[];
  onUpdateDistributionRules?: (
    articleId: string,
    rules: Partial<ContentDistributionRule>[],
  ) => void;
  viewMode?: 'overview' | 'detailed' | 'analytics';
}

interface ClientDistributionData {
  clientId: string;
  clientName: string;
  weddingDate: string;
  weddingStyle: WeddingType;
  planningStage: string;
  recommendations: RecommendedArticle[];
  engagementPredictions: EngagementPrediction[];
}

export function ContentDistribution({
  articles,
  onUpdateDistributionRules,
  viewMode = 'overview',
}: ContentDistributionProps) {
  const [distributionData, setDistributionData] = useState<
    ClientDistributionData[]
  >([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedArticle, setSelectedArticle] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterBy, setFilterBy] = useState<
    'all' | 'high-engagement' | 'seasonal' | 'recent'
  >('all');
  const [showAnalytics, setShowAnalytics] = useState(false);

  // Sample client data for demonstration
  const sampleClients = [
    {
      id: 'client-1',
      name: 'Sarah & Michael Johnson',
      weddingDate: '2025-07-15',
      weddingStyle: 'garden' as WeddingType,
      planningStage: 'vendor-selection',
      budgetRange: 'mid-range',
      guestCount: 125,
      venueType: 'outdoor',
    },
    {
      id: 'client-2',
      name: 'Emma & David Chen',
      weddingDate: '2025-09-20',
      weddingStyle: 'modern' as WeddingType,
      planningStage: 'early',
      budgetRange: 'luxury',
      guestCount: 80,
      venueType: 'hotel',
    },
    {
      id: 'client-3',
      name: 'Maria & James Rodriguez',
      weddingDate: '2025-06-10',
      weddingStyle: 'traditional' as WeddingType,
      planningStage: 'final-details',
      budgetRange: 'budget-friendly',
      guestCount: 200,
      venueType: 'church',
    },
  ];

  // Calculate distribution analytics
  const distributionAnalytics = useMemo(() => {
    const totalClients = distributionData.length;
    const totalRecommendations = distributionData.reduce(
      (acc, client) => acc + client.recommendations.length,
      0,
    );
    const avgEngagement =
      distributionData.reduce((acc, client) => {
        const clientAvg =
          client.engagementPredictions.reduce(
            (sum, pred) => sum + pred.predicted_engagement_score,
            0,
          ) / Math.max(1, client.engagementPredictions.length);
        return acc + clientAvg;
      }, 0) / Math.max(1, totalClients);

    const articleDistribution = articles.map((article) => ({
      article,
      timesRecommended: distributionData.reduce(
        (count, client) =>
          count +
          (client.recommendations.some((rec) => rec.article.id === article.id)
            ? 1
            : 0),
        0,
      ),
      avgRelevanceScore:
        distributionData.reduce((sum, client) => {
          const rec = client.recommendations.find(
            (r) => r.article.id === article.id,
          );
          return sum + (rec ? rec.relevance_score : 0);
        }, 0) / Math.max(1, totalClients),
    }));

    return {
      totalClients,
      totalRecommendations,
      avgEngagement: Math.round(avgEngagement),
      articleDistribution: articleDistribution.sort(
        (a, b) => b.timesRecommended - a.timesRecommended,
      ),
    };
  }, [distributionData, articles]);

  // Load distribution data
  const loadDistributionData = async () => {
    setIsLoading(true);
    try {
      // Simulate loading recommendations for each client
      const clientDistributions = await Promise.all(
        sampleClients.map(async (client) => {
          try {
            // In a real implementation, this would call the actual service
            // For demo, we'll simulate the distribution logic
            const mockRecommendations = articles
              .filter((article) => {
                // Simple filtering logic for demo
                const isSeasonalMatch = article.tags.some((tag) =>
                  tag.includes(
                    format(parseISO(client.weddingDate), 'MMMM').toLowerCase(),
                  ),
                );
                const isStyleMatch = article.target_wedding_types.includes(
                  client.weddingStyle,
                );
                const isStageMatch = article.tags.includes(
                  client.planningStage,
                );

                return isSeasonalMatch || isStyleMatch || isStageMatch;
              })
              .slice(0, 5) // Top 5 recommendations
              .map((article) => ({
                article,
                relevance_score: Math.random() * 0.6 + 0.4, // Random score between 0.4-1.0
                match_reasons: [
                  `Matches ${client.weddingStyle} wedding style`,
                  `Perfect for ${format(parseISO(client.weddingDate), 'MMMM')} weddings`,
                  `Relevant to ${client.planningStage} stage`,
                ].slice(0, Math.floor(Math.random() * 3) + 1),
                optimal_delivery_time: new Date(
                  Date.now() + Math.random() * 7 * 24 * 60 * 60 * 1000,
                ).toISOString(),
              }));

            const mockPredictions = mockRecommendations.map((rec) => ({
              article_id: rec.article.id,
              predicted_engagement_score: Math.random() * 30 + 70, // 70-100% engagement
              confidence_level: Math.random() * 20 + 80, // 80-100% confidence
              factors: [
                'Relevance to wedding style',
                'Seasonal timing',
                'Planning stage match',
              ],
            }));

            return {
              clientId: client.id,
              clientName: client.name,
              weddingDate: client.weddingDate,
              weddingStyle: client.weddingStyle,
              planningStage: client.planningStage,
              recommendations: mockRecommendations,
              engagementPredictions: mockPredictions,
            };
          } catch (error) {
            console.error(
              `Failed to load distribution for client ${client.id}:`,
              error,
            );
            return {
              clientId: client.id,
              clientName: client.name,
              weddingDate: client.weddingDate,
              weddingStyle: client.weddingStyle,
              planningStage: client.planningStage,
              recommendations: [],
              engagementPredictions: [],
            };
          }
        }),
      );

      setDistributionData(clientDistributions);
    } catch (error) {
      console.error('Failed to load distribution data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Filter distribution data
  const filteredData = useMemo(() => {
    let filtered = distributionData;

    if (searchTerm) {
      filtered = filtered.filter(
        (client) =>
          client.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          client.weddingStyle
            .toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          client.planningStage.toLowerCase().includes(searchTerm.toLowerCase()),
      );
    }

    if (filterBy !== 'all') {
      filtered = filtered.filter((client) => {
        switch (filterBy) {
          case 'high-engagement':
            const avgEngagement =
              client.engagementPredictions.reduce(
                (sum, pred) => sum + pred.predicted_engagement_score,
                0,
              ) / Math.max(1, client.engagementPredictions.length);
            return avgEngagement > 85;
          case 'seasonal':
            return client.recommendations.some((rec) =>
              rec.match_reasons.some(
                (reason) =>
                  reason.includes('seasonal') ||
                  reason.includes(format(parseISO(client.weddingDate), 'MMMM')),
              ),
            );
          case 'recent':
            return (
              new Date(client.weddingDate) <
              new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)
            ); // Next 90 days
          default:
            return true;
        }
      });
    }

    return filtered;
  }, [distributionData, searchTerm, filterBy]);

  // Load data on component mount
  useEffect(() => {
    loadDistributionData();
  }, [articles]);

  if (viewMode === 'overview') {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-primary-50 rounded-lg">
                <Target className="h-5 w-5 text-primary-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Intelligent Content Distribution
                </h3>
                <p className="text-sm text-gray-500">
                  Automated article delivery to client dashboards
                </p>
              </div>
            </div>

            <button
              onClick={loadDistributionData}
              disabled={isLoading}
              className="btn-sm px-3 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg flex items-center space-x-2 disabled:opacity-50"
            >
              <RefreshCw
                className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`}
              />
              <span>{isLoading ? 'Analyzing...' : 'Refresh'}</span>
            </button>
          </div>

          {/* Analytics Summary */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="flex items-center space-x-2 mb-2">
                <Users className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-800">
                  Active Clients
                </span>
              </div>
              <div className="text-2xl font-bold text-blue-900">
                {distributionAnalytics.totalClients}
              </div>
            </div>

            <div className="bg-green-50 p-4 rounded-lg">
              <div className="flex items-center space-x-2 mb-2">
                <Target className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium text-green-800">
                  Total Recommendations
                </span>
              </div>
              <div className="text-2xl font-bold text-green-900">
                {distributionAnalytics.totalRecommendations}
              </div>
            </div>

            <div className="bg-purple-50 p-4 rounded-lg">
              <div className="flex items-center space-x-2 mb-2">
                <TrendingUp className="h-4 w-4 text-purple-600" />
                <span className="text-sm font-medium text-purple-800">
                  Avg Engagement
                </span>
              </div>
              <div className="text-2xl font-bold text-purple-900">
                {distributionAnalytics.avgEngagement}%
              </div>
            </div>

            <div className="bg-orange-50 p-4 rounded-lg">
              <div className="flex items-center space-x-2 mb-2">
                <Brain className="h-4 w-4 text-orange-600" />
                <span className="text-sm font-medium text-orange-800">
                  Articles Active
                </span>
              </div>
              <div className="text-2xl font-bold text-orange-900">
                {articles.length}
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-xs">
          <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search clients, styles, or planning stages..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 shadow-xs focus:outline-none focus:ring-4 focus:ring-primary-100 focus:border-primary-300"
                />
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Filter className="h-4 w-4 text-gray-500" />
              <select
                value={filterBy}
                onChange={(e) => setFilterBy(e.target.value as any)}
                className="px-3 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 shadow-xs focus:outline-none focus:ring-4 focus:ring-primary-100 focus:border-primary-300"
              >
                <option value="all">All Clients</option>
                <option value="high-engagement">High Engagement</option>
                <option value="seasonal">Seasonal Content</option>
                <option value="recent">Upcoming Weddings</option>
              </select>
            </div>

            <button
              onClick={() => setShowAnalytics(!showAnalytics)}
              className={`btn-sm px-3 py-2 rounded-lg flex items-center space-x-2 ${
                showAnalytics
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
              }`}
            >
              <Eye className="h-4 w-4" />
              <span>Analytics</span>
            </button>
          </div>
        </div>

        {/* Client Distribution Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredData.map((client) => (
            <div
              key={client.clientId}
              className="bg-white border border-gray-200 rounded-xl p-6 shadow-xs"
            >
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h4 className="text-md font-semibold text-gray-900">
                    {client.clientName}
                  </h4>
                  <div className="flex items-center space-x-4 mt-1 text-sm text-gray-500">
                    <div className="flex items-center space-x-1">
                      <Calendar className="h-3 w-3" />
                      <span>
                        {format(parseISO(client.weddingDate), 'MMM d, yyyy')}
                      </span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Heart className="h-3 w-3" />
                      <span className="capitalize">{client.weddingStyle}</span>
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-lg font-bold text-primary-600">
                    {client.recommendations.length}
                  </div>
                  <div className="text-xs text-gray-500">recommendations</div>
                </div>
              </div>

              {/* Recommendations */}
              <div className="space-y-3">
                {client.recommendations.slice(0, 3).map((rec, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">
                        {rec.article.title}
                      </p>
                      <div className="flex items-center space-x-2 mt-1">
                        <div className="flex items-center space-x-1">
                          <div
                            className={`w-2 h-2 rounded-full ${
                              rec.relevance_score > 0.8
                                ? 'bg-green-500'
                                : rec.relevance_score > 0.6
                                  ? 'bg-yellow-500'
                                  : 'bg-gray-400'
                            }`}
                          />
                          <span className="text-xs text-gray-500">
                            {Math.round(rec.relevance_score * 100)}% match
                          </span>
                        </div>
                        <span className="text-xs text-gray-400">•</span>
                        <span className="text-xs text-gray-500">
                          {rec.match_reasons[0]}
                        </span>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-sm font-medium text-gray-900">
                        {Math.round(
                          client.engagementPredictions.find(
                            (p) => p.article_id === rec.article.id,
                          )?.predicted_engagement_score || 0,
                        )}
                        %
                      </div>
                      <div className="text-xs text-gray-500">engagement</div>
                    </div>
                  </div>
                ))}

                {client.recommendations.length > 3 && (
                  <div className="text-center py-2">
                    <span className="text-sm text-gray-500">
                      +{client.recommendations.length - 3} more recommendations
                    </span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Article Performance Analytics */}
        {showAnalytics && (
          <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-xs">
            <h4 className="text-md font-semibold text-gray-900 mb-4 flex items-center">
              <TrendingUp className="h-4 w-4 mr-2 text-primary-600" />
              Article Distribution Performance
            </h4>

            <div className="space-y-4">
              {distributionAnalytics.articleDistribution
                .slice(0, 10)
                .map((item, index) => (
                  <div
                    key={item.article.id}
                    className="flex items-center justify-between p-4 border border-gray-200 rounded-lg"
                  >
                    <div className="flex-1">
                      <h5 className="text-sm font-medium text-gray-900">
                        {item.article.title}
                      </h5>
                      <div className="flex items-center space-x-4 mt-1 text-xs text-gray-500">
                        <span>
                          Published:{' '}
                          {format(
                            parseISO(
                              item.article.published_at ||
                                item.article.created_at,
                            ),
                            'MMM d',
                          )}
                        </span>
                        <span>•</span>
                        <span>
                          {item.article.category_ids.length} categories
                        </span>
                        <span>•</span>
                        <span>{item.article.tags.length} tags</span>
                      </div>
                    </div>

                    <div className="flex items-center space-x-6 text-center">
                      <div>
                        <div className="text-lg font-bold text-primary-600">
                          {item.timesRecommended}
                        </div>
                        <div className="text-xs text-gray-500">clients</div>
                      </div>
                      <div>
                        <div className="text-lg font-bold text-green-600">
                          {Math.round(item.avgRelevanceScore * 100)}%
                        </div>
                        <div className="text-xs text-gray-500">
                          avg relevance
                        </div>
                      </div>
                      <div className="w-16 bg-gray-200 rounded-full h-2">
                        <div
                          className="h-2 bg-primary-600 rounded-full"
                          style={{
                            width: `${(item.timesRecommended / distributionAnalytics.totalClients) * 100}%`,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            <span className="ml-3 text-gray-600">
              Analyzing content distribution...
            </span>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && filteredData.length === 0 && (
          <div className="text-center py-12">
            <Target className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No distribution data found
            </h3>
            <p className="text-gray-500">
              {searchTerm || filterBy !== 'all'
                ? 'Try adjusting your search or filter criteria'
                : 'Start by publishing articles to see intelligent distribution in action'}
            </p>
          </div>
        )}
      </div>
    );
  }

  // Return detailed or analytics views (placeholder for now)
  return (
    <div className="text-center py-12">
      <Brain className="h-12 w-12 mx-auto mb-4 text-gray-300" />
      <h3 className="text-lg font-medium text-gray-900 mb-2">
        {viewMode === 'detailed'
          ? 'Detailed Distribution View'
          : 'Advanced Analytics'}
      </h3>
      <p className="text-gray-500">This view is coming soon</p>
    </div>
  );
}
