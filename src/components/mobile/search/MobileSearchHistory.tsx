'use client';

import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Clock,
  Search,
  TrendingUp,
  X,
  Share2,
  Download,
  BarChart3,
  Calendar,
  MapPin,
  Filter,
  Eye,
  Heart,
  Star,
} from 'lucide-react';
import { SearchFilters, SearchResult } from '@/types/mobile-search';
import { cn } from '@/lib/utils';

interface SearchHistoryItem {
  id: string;
  query: string;
  filters: SearchFilters;
  timestamp: number;
  resultsCount: number;
  location?: {
    name: string;
    coordinates: { lat: number; lng: number };
  };
  savedResults?: string[]; // IDs of saved vendors
}

interface MobileSearchHistoryProps {
  onSearch: (query: string, filters?: SearchFilters) => void;
  onClearHistory: () => void;
  className?: string;
}

interface PopularSearch {
  query: string;
  count: number;
  category?: string;
}

interface SearchAnalytics {
  totalSearches: number;
  categoryCounts: Record<string, number>;
  locationCounts: Record<string, number>;
  timeDistribution: Record<string, number>;
  averageResultsCount: number;
}

export default function MobileSearchHistory({
  onSearch,
  onClearHistory,
  className,
}: MobileSearchHistoryProps) {
  const [searchHistory, setSearchHistory] = useState<SearchHistoryItem[]>([]);
  const [popularSearches, setPopularSearches] = useState<PopularSearch[]>([]);
  const [analytics, setAnalytics] = useState<SearchAnalytics | null>(null);
  const [activeTab, setActiveTab] = useState<
    'recent' | 'popular' | 'analytics'
  >('recent');
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  // Load search history from localStorage
  useEffect(() => {
    loadSearchHistory();
  }, []);

  // Load and process search history
  const loadSearchHistory = useCallback(() => {
    try {
      const stored = localStorage.getItem('wedsync_search_history');
      if (stored) {
        const history: SearchHistoryItem[] = JSON.parse(stored);

        // Sort by timestamp (most recent first)
        const sortedHistory = history.sort((a, b) => b.timestamp - a.timestamp);
        setSearchHistory(sortedHistory.slice(0, 100)); // Keep last 100 searches

        // Calculate popular searches
        calculatePopularSearches(history);

        // Calculate analytics
        calculateAnalytics(history);
      }
    } catch (error) {
      console.error('Failed to load search history:', error);
    }
  }, []);

  // Calculate popular searches
  const calculatePopularSearches = useCallback(
    (history: SearchHistoryItem[]) => {
      const queryCounts = new Map<string, number>();

      history.forEach((item) => {
        const query = item.query.toLowerCase();
        queryCounts.set(query, (queryCounts.get(query) || 0) + 1);
      });

      const popular = Array.from(queryCounts.entries())
        .map(([query, count]) => ({ query, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      setPopularSearches(popular);
    },
    [],
  );

  // Calculate search analytics
  const calculateAnalytics = useCallback((history: SearchHistoryItem[]) => {
    if (history.length === 0) {
      setAnalytics(null);
      return;
    }

    const categoryCounts: Record<string, number> = {};
    const locationCounts: Record<string, number> = {};
    const timeDistribution: Record<string, number> = {};
    let totalResults = 0;

    history.forEach((item) => {
      // Category counts
      item.filters.category.forEach((cat) => {
        categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
      });

      // Location counts
      if (item.location) {
        locationCounts[item.location.name] =
          (locationCounts[item.location.name] || 0) + 1;
      }

      // Time distribution (hour of day)
      const hour = new Date(item.timestamp).getHours();
      const timeSlot = `${hour}:00`;
      timeDistribution[timeSlot] = (timeDistribution[timeSlot] || 0) + 1;

      totalResults += item.resultsCount;
    });

    setAnalytics({
      totalSearches: history.length,
      categoryCounts,
      locationCounts,
      timeDistribution,
      averageResultsCount: totalResults / history.length,
    });
  }, []);

  // Trigger haptic feedback
  const triggerHapticFeedback = useCallback(
    (type: 'light' | 'medium' | 'heavy' = 'light') => {
      if ('vibrate' in navigator) {
        const patterns = {
          light: [10],
          medium: [20],
          heavy: [50],
        };
        navigator.vibrate(patterns[type]);
      }
    },
    [],
  );

  // Handle repeat search
  const handleRepeatSearch = useCallback(
    (item: SearchHistoryItem) => {
      triggerHapticFeedback('medium');
      onSearch(item.query, item.filters);
    },
    [onSearch, triggerHapticFeedback],
  );

  // Handle popular search
  const handlePopularSearch = useCallback(
    (query: string) => {
      triggerHapticFeedback('light');
      onSearch(query);
    },
    [onSearch, triggerHapticFeedback],
  );

  // Remove individual search
  const removeSearch = useCallback(
    (searchId: string) => {
      triggerHapticFeedback('light');
      const updatedHistory = searchHistory.filter(
        (item) => item.id !== searchId,
      );
      setSearchHistory(updatedHistory);
      localStorage.setItem(
        'wedsync_search_history',
        JSON.stringify(updatedHistory),
      );

      // Recalculate popular searches and analytics
      calculatePopularSearches(updatedHistory);
      calculateAnalytics(updatedHistory);
    },
    [
      searchHistory,
      calculatePopularSearches,
      calculateAnalytics,
      triggerHapticFeedback,
    ],
  );

  // Clear all history
  const clearAllHistory = useCallback(() => {
    triggerHapticFeedback('heavy');
    setSearchHistory([]);
    setPopularSearches([]);
    setAnalytics(null);
    localStorage.removeItem('wedsync_search_history');
    setShowClearConfirm(false);
    onClearHistory();
  }, [onClearHistory, triggerHapticFeedback]);

  // Export search data
  const exportSearchData = useCallback(() => {
    const data = {
      searchHistory,
      popularSearches,
      analytics,
      exportDate: new Date().toISOString(),
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `wedsync-search-history-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    triggerHapticFeedback('medium');
  }, [searchHistory, popularSearches, analytics, triggerHapticFeedback]);

  // Share search results
  const shareSearch = useCallback(
    (item: SearchHistoryItem) => {
      if (navigator.share) {
        navigator.share({
          title: `Wedding Vendor Search: ${item.query}`,
          text: `Found ${item.resultsCount} wedding vendors for "${item.query}"`,
          url: window.location.origin,
        });
      }
      triggerHapticFeedback('light');
    },
    [triggerHapticFeedback],
  );

  // Format timestamp
  const formatTimestamp = (timestamp: number) => {
    const now = Date.now();
    const diff = now - timestamp;

    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    if (diff < 604800000) return `${Math.floor(diff / 86400000)}d ago`;

    return new Date(timestamp).toLocaleDateString();
  };

  // Get category icon
  const getCategoryIcon = (category: string) => {
    const icons = {
      photographer: '📸',
      venue: '🏰',
      florist: '💐',
      catering: '🍽️',
      music: '🎵',
      planning: '📋',
      transport: '🚗',
      beauty: '💄',
    };
    return icons[category as keyof typeof icons] || '💼';
  };

  if (searchHistory.length === 0) {
    return (
      <div className={cn('text-center py-12', className)}>
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Clock className="w-8 h-8 text-gray-400" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          No Search History
        </h3>
        <p className="text-gray-600 text-sm">
          Your search history will appear here as you explore wedding vendors
        </p>
      </div>
    );
  }

  return (
    <div className={cn('h-full flex flex-col', className)}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900">Search History</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={exportSearchData}
            className="p-2 text-gray-500 hover:text-gray-700 transition-colors"
            style={{ minHeight: '40px', minWidth: '40px' }}
          >
            <Download className="w-5 h-5" />
          </button>
          <button
            onClick={() => setShowClearConfirm(true)}
            className="p-2 text-gray-500 hover:text-red-600 transition-colors"
            style={{ minHeight: '40px', minWidth: '40px' }}
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200">
        {[
          { id: 'recent', label: 'Recent', icon: Clock },
          { id: 'popular', label: 'Popular', icon: TrendingUp },
          { id: 'analytics', label: 'Insights', icon: BarChart3 },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={cn(
              'flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors',
              activeTab === tab.id
                ? 'text-rose-600 border-b-2 border-rose-600'
                : 'text-gray-600 hover:text-gray-900',
            )}
            style={{ minHeight: '48px' }}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Recent Searches */}
        {activeTab === 'recent' && (
          <div className="divide-y divide-gray-100">
            {searchHistory.map((item) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="p-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-rose-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <Search className="w-5 h-5 text-rose-600" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <button
                      onClick={() => handleRepeatSearch(item)}
                      className="text-left w-full"
                    >
                      <p className="font-medium text-gray-900 truncate mb-1">
                        {item.query}
                      </p>

                      <div className="flex items-center gap-3 text-xs text-gray-500 mb-2">
                        <span className="flex items-center gap-1">
                          <Eye className="w-3 h-3" />
                          {item.resultsCount} results
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {formatTimestamp(item.timestamp)}
                        </span>
                        {item.location && (
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {item.location.name}
                          </span>
                        )}
                      </div>

                      {/* Filter Tags */}
                      {(item.filters.category.length > 0 ||
                        item.filters.priceRange.length > 0) && (
                        <div className="flex flex-wrap gap-1 mb-2">
                          {item.filters.category.map((cat) => (
                            <span
                              key={cat}
                              className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs"
                            >
                              {getCategoryIcon(cat)}
                              {cat}
                            </span>
                          ))}
                          {item.filters.priceRange.map((price) => (
                            <span
                              key={price}
                              className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs"
                            >
                              {price}
                            </span>
                          ))}
                        </div>
                      )}
                    </button>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={() => shareSearch(item)}
                      className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                      style={{ minHeight: '32px', minWidth: '32px' }}
                    >
                      <Share2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => removeSearch(item.id)}
                      className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                      style={{ minHeight: '32px', minWidth: '32px' }}
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* Popular Searches */}
        {activeTab === 'popular' && (
          <div className="p-4">
            <p className="text-sm text-gray-600 mb-4">
              Your most frequently searched terms
            </p>
            <div className="space-y-3">
              {popularSearches.map((search, index) => (
                <motion.button
                  key={search.query}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  onClick={() => handlePopularSearch(search.query)}
                  className="w-full flex items-center justify-between p-3 bg-white rounded-xl border border-gray-200 hover:border-gray-300 hover:shadow-sm transition-all text-left"
                  style={{ minHeight: '56px' }}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-sm font-bold text-gray-600">
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">
                        {search.query}
                      </p>
                      <p className="text-xs text-gray-500">
                        {search.count} searches
                      </p>
                    </div>
                  </div>
                  <div className="text-rose-600">
                    <Search className="w-5 h-5" />
                  </div>
                </motion.button>
              ))}
            </div>
          </div>
        )}

        {/* Analytics */}
        {activeTab === 'analytics' && analytics && (
          <div className="p-4 space-y-6">
            {/* Overview Stats */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-blue-50 rounded-2xl p-4 text-center">
                <div className="text-2xl font-bold text-blue-600 mb-1">
                  {analytics.totalSearches}
                </div>
                <div className="text-sm text-blue-600">Total Searches</div>
              </div>
              <div className="bg-green-50 rounded-2xl p-4 text-center">
                <div className="text-2xl font-bold text-green-600 mb-1">
                  {Math.round(analytics.averageResultsCount)}
                </div>
                <div className="text-sm text-green-600">Avg Results</div>
              </div>
            </div>

            {/* Top Categories */}
            <div>
              <h4 className="font-medium text-gray-900 mb-3">Top Categories</h4>
              <div className="space-y-2">
                {Object.entries(analytics.categoryCounts)
                  .sort(([, a], [, b]) => b - a)
                  .slice(0, 5)
                  .map(([category, count]) => (
                    <div
                      key={category}
                      className="flex items-center justify-between py-2"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-lg">
                          {getCategoryIcon(category)}
                        </span>
                        <span className="font-medium text-gray-900 capitalize">
                          {category.replace('-', ' ')}
                        </span>
                      </div>
                      <span className="text-sm text-gray-600">
                        {count} searches
                      </span>
                    </div>
                  ))}
              </div>
            </div>

            {/* Top Locations */}
            {Object.keys(analytics.locationCounts).length > 0 && (
              <div>
                <h4 className="font-medium text-gray-900 mb-3">
                  Search Locations
                </h4>
                <div className="space-y-2">
                  {Object.entries(analytics.locationCounts)
                    .sort(([, a], [, b]) => b - a)
                    .slice(0, 3)
                    .map(([location, count]) => (
                      <div
                        key={location}
                        className="flex items-center justify-between py-2"
                      >
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-gray-400" />
                          <span className="font-medium text-gray-900">
                            {location}
                          </span>
                        </div>
                        <span className="text-sm text-gray-600">
                          {count} searches
                        </span>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Clear Confirmation */}
      <AnimatePresence>
        {showClearConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-3xl p-6 max-w-sm w-full"
            >
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Clear Search History?
              </h3>
              <p className="text-gray-600 text-sm mb-6">
                This will permanently delete all your search history and
                analytics data.
              </p>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowClearConfirm(false)}
                  className="flex-1 py-3 text-gray-600 border border-gray-300 rounded-xl font-medium hover:bg-gray-50 transition-colors"
                  style={{ minHeight: '48px' }}
                >
                  Cancel
                </button>
                <button
                  onClick={clearAllHistory}
                  className="flex-1 py-3 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 transition-colors"
                  style={{ minHeight: '48px' }}
                >
                  Clear All
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
