'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card-untitled';
import { Button } from '@/components/ui/button-untitled';
import { Badge } from '@/components/ui/badge';
import {
  TrendingUp,
  TrendingDown,
  Tag as TagIcon,
  Users,
  BarChart3,
  Calendar,
  Download,
  Filter,
  ChevronUp,
  ChevronDown,
  Hash,
} from 'lucide-react';
import { Tag, TagColor, TagCategory } from './TagManager';

interface TagAnalytics {
  tag: Tag;
  usage_count: number;
  growth_rate: number; // Percentage change over last 30 days
  last_used: string;
  clients: number;
  trend: 'up' | 'down' | 'stable';
}

interface TagAnalyticsProps {
  supplierId?: string;
  className?: string;
}

export default function TagAnalytics({
  supplierId,
  className = '',
}: TagAnalyticsProps) {
  const [analytics, setAnalytics] = useState<TagAnalytics[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'usage' | 'growth' | 'alphabetical'>(
    'usage',
  );
  const [filterCategory, setFilterCategory] = useState<TagCategory | 'all'>(
    'all',
  );
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d' | 'all'>(
    '30d',
  );

  useEffect(() => {
    fetchAnalytics();
  }, [timeRange, supplierId]);

  const fetchAnalytics = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        timeRange,
        ...(supplierId && { supplierId }),
      });

      const response = await fetch(`/api/tags/analytics?${params}`);
      if (!response.ok) throw new Error('Failed to fetch tag analytics');

      const data = await response.json();
      setAnalytics(data.analytics || []);
    } catch (error) {
      console.error('Error fetching tag analytics:', error);
      setError('Failed to load analytics');
    } finally {
      setIsLoading(false);
    }
  };

  const getTagColorClasses = (color: TagColor) => {
    const colorMap: Record<TagColor, string> = {
      gray: 'bg-gray-100 text-gray-800 border-gray-200',
      red: 'bg-red-50 text-red-700 border-red-200',
      orange: 'bg-orange-50 text-orange-700 border-orange-200',
      amber: 'bg-amber-50 text-amber-700 border-amber-200',
      yellow: 'bg-yellow-50 text-yellow-700 border-yellow-200',
      lime: 'bg-lime-50 text-lime-700 border-lime-200',
      green: 'bg-green-50 text-green-700 border-green-200',
      emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      teal: 'bg-teal-50 text-teal-700 border-teal-200',
      cyan: 'bg-cyan-50 text-cyan-700 border-cyan-200',
      sky: 'bg-sky-50 text-sky-700 border-sky-200',
      blue: 'bg-blue-50 text-blue-700 border-blue-200',
      indigo: 'bg-indigo-50 text-indigo-700 border-indigo-200',
      violet: 'bg-violet-50 text-violet-700 border-violet-200',
      purple: 'bg-purple-50 text-purple-700 border-purple-200',
      fuchsia: 'bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200',
      pink: 'bg-pink-50 text-pink-700 border-pink-200',
      rose: 'bg-rose-50 text-rose-700 border-rose-200',
    };
    return colorMap[color] || colorMap.blue;
  };

  const exportAnalytics = async () => {
    try {
      const params = new URLSearchParams({
        timeRange,
        format: 'csv',
        ...(supplierId && { supplierId }),
      });

      const response = await fetch(`/api/tags/analytics/export?${params}`);
      if (!response.ok) throw new Error('Failed to export analytics');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `tag-analytics-${timeRange}-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting analytics:', error);
      setError('Failed to export analytics');
    }
  };

  const sortedAnalytics = [...analytics].sort((a, b) => {
    switch (sortBy) {
      case 'usage':
        return b.usage_count - a.usage_count;
      case 'growth':
        return b.growth_rate - a.growth_rate;
      case 'alphabetical':
        return a.tag.name.localeCompare(b.tag.name);
      default:
        return 0;
    }
  });

  const filteredAnalytics = sortedAnalytics.filter((item) => {
    if (filterCategory === 'all') return true;
    return item.tag.category === filterCategory;
  });

  // Calculate summary statistics
  const totalTags = analytics.length;
  const totalUsage = analytics.reduce((sum, item) => sum + item.usage_count, 0);
  const averageUsage = totalTags > 0 ? Math.round(totalUsage / totalTags) : 0;
  const growingTags = analytics.filter((item) => item.trend === 'up').length;
  const decliningTags = analytics.filter(
    (item) => item.trend === 'down',
  ).length;

  // Get top 5 trending tags
  const trendingTags = [...analytics]
    .sort((a, b) => b.growth_rate - a.growth_rate)
    .slice(0, 5);

  // Get most used tags
  const popularTags = [...analytics]
    .sort((a, b) => b.usage_count - a.usage_count)
    .slice(0, 5);

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2
            className="text-2xl font-bold text-gray-900"
            data-testid="tag-analytics"
          >
            Tag Analytics
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Track tag usage and trends across your client base
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Time Range Selector */}
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value as typeof timeRange)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white"
            data-testid="time-range-selector"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
            <option value="all">All time</option>
          </select>

          <Button
            variant="outline"
            onClick={exportAnalytics}
            className="gap-2"
            data-testid="export-analytics"
          >
            <Download className="w-4 h-4" />
            Export
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Tags</p>
              <p className="text-2xl font-bold text-gray-900">{totalTags}</p>
            </div>
            <TagIcon className="w-8 h-8 text-blue-600" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Average Usage</p>
              <p className="text-2xl font-bold text-gray-900">{averageUsage}</p>
            </div>
            <Users className="w-8 h-8 text-purple-600" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Growing Tags</p>
              <p className="text-2xl font-bold text-green-600">{growingTags}</p>
            </div>
            <TrendingUp className="w-8 h-8 text-green-600" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Declining Tags</p>
              <p className="text-2xl font-bold text-red-600">{decliningTags}</p>
            </div>
            <TrendingDown className="w-8 h-8 text-red-600" />
          </div>
        </Card>
      </div>

      {/* Trending and Popular Tags */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Trending Tags */}
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-5 h-5 text-green-600" />
            <h3 className="text-lg font-semibold text-gray-900">
              Trending Tags
            </h3>
          </div>

          <div className="space-y-3">
            {trendingTags.length === 0 ? (
              <p className="text-sm text-gray-500">
                No trending data available
              </p>
            ) : (
              trendingTags.map((item, index) => (
                <div
                  key={item.tag.id}
                  className="flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-gray-500 w-4">
                      {index + 1}
                    </span>
                    <Badge
                      className={`${getTagColorClasses(item.tag.color)} border`}
                      data-testid={`trending-tag-${item.tag.name.toLowerCase().replace(/\s+/g, '-')}`}
                    >
                      {item.tag.name}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-sm font-medium ${
                        item.growth_rate > 0
                          ? 'text-green-600'
                          : item.growth_rate < 0
                            ? 'text-red-600'
                            : 'text-gray-500'
                      }`}
                    >
                      {item.growth_rate > 0 ? '+' : ''}
                      {item.growth_rate}%
                    </span>
                    {item.growth_rate > 0 ? (
                      <ChevronUp className="w-4 h-4 text-green-600" />
                    ) : item.growth_rate < 0 ? (
                      <ChevronDown className="w-4 h-4 text-red-600" />
                    ) : null}
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>

        {/* Most Used Tags */}
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="w-5 h-5 text-blue-600" />
            <h3 className="text-lg font-semibold text-gray-900">
              Most Used Tags
            </h3>
          </div>

          <div className="space-y-3">
            {popularTags.length === 0 ? (
              <p className="text-sm text-gray-500">No usage data available</p>
            ) : (
              popularTags.map((item, index) => (
                <div
                  key={item.tag.id}
                  className="flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-gray-500 w-4">
                      {index + 1}
                    </span>
                    <Badge
                      className={`${getTagColorClasses(item.tag.color)} border`}
                      data-testid={`popular-tag-${item.tag.name.toLowerCase().replace(/\s+/g, '-')}`}
                    >
                      {item.tag.name}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Users className="w-4 h-4" />
                    <span>{item.usage_count} clients</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>

      {/* Detailed Analytics Table */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">
            Detailed Analytics
          </h3>

          <div className="flex items-center gap-3">
            {/* Category Filter */}
            <select
              value={filterCategory}
              onChange={(e) =>
                setFilterCategory(e.target.value as TagCategory | 'all')
              }
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white"
            >
              <option value="all">All Categories</option>
              <option value="relationship">Relationship</option>
              <option value="venue">Venue Type</option>
              <option value="season">Season</option>
              <option value="style">Style</option>
              <option value="service">Service Level</option>
              <option value="priority">Priority</option>
              <option value="custom">Custom</option>
            </select>

            {/* Sort Options */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white"
            >
              <option value="usage">Sort by Usage</option>
              <option value="growth">Sort by Growth</option>
              <option value="alphabetical">Sort Alphabetically</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">
                  Tag
                </th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">
                  Category
                </th>
                <th className="text-center py-3 px-4 text-sm font-medium text-gray-500">
                  Usage
                </th>
                <th className="text-center py-3 px-4 text-sm font-medium text-gray-500">
                  Growth
                </th>
                <th className="text-center py-3 px-4 text-sm font-medium text-gray-500">
                  Trend
                </th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">
                  Last Used
                </th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="text-center py-8">
                    <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    <p className="text-sm text-gray-500">
                      Loading analytics...
                    </p>
                  </td>
                </tr>
              ) : filteredAnalytics.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-8">
                    <Hash className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-500">
                      No analytics data available
                    </p>
                  </td>
                </tr>
              ) : (
                filteredAnalytics.map((item) => (
                  <tr
                    key={item.tag.id}
                    className="border-b border-gray-100 hover:bg-gray-50"
                  >
                    <td className="py-3 px-4">
                      <Badge
                        className={`${getTagColorClasses(item.tag.color)} border`}
                        data-testid={`analytics-tag-${item.tag.name.toLowerCase().replace(/\s+/g, '-')}`}
                      >
                        {item.tag.name}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600">
                      {item.tag.category}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="text-sm font-medium text-gray-900">
                        {item.usage_count}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`text-sm font-medium ${
                          item.growth_rate > 0
                            ? 'text-green-600'
                            : item.growth_rate < 0
                              ? 'text-red-600'
                              : 'text-gray-500'
                        }`}
                      >
                        {item.growth_rate > 0 ? '+' : ''}
                        {item.growth_rate}%
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      {item.trend === 'up' ? (
                        <ChevronUp className="w-4 h-4 text-green-600 mx-auto" />
                      ) : item.trend === 'down' ? (
                        <ChevronDown className="w-4 h-4 text-red-600 mx-auto" />
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600">
                      {new Date(item.last_used).toLocaleDateString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {error && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
          </div>
        )}
      </Card>
    </div>
  );
}
