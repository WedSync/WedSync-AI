'use client';

import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MagnifyingGlassIcon,
  ClockIcon,
  EyeIcon,
  StarIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from '@heroicons/react/24/outline';

interface SearchResult {
  id: string;
  title: string;
  excerpt: string;
  type: 'article' | 'tutorial';
  category: string;
  tags: string[];
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  estimatedReadTime: number;
  rating: number;
  viewCount: number;
  lastUpdated: string;
  matchedTerms?: string[];
}

export interface SearchResultsProps {
  query: string;
  results: SearchResult[];
  isLoading: boolean;
  onArticleClick: (result: SearchResult) => void;
  onTutorialClick?: (result: SearchResult) => void;
  totalResults?: number;
  currentPage?: number;
  pageSize?: number;
  onPageChange?: (page: number) => void;
  className?: string;
}

const getDifficultyColor = (difficulty: string) => {
  switch (difficulty) {
    case 'beginner':
      return 'bg-green-100 text-green-800';
    case 'intermediate':
      return 'bg-yellow-100 text-yellow-800';
    case 'advanced':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

const highlightText = (text: string, query: string) => {
  if (!query) return text;

  const regex = new RegExp(`(${query})`, 'gi');
  return text.replace(
    regex,
    '<mark class="bg-yellow-200 px-1 rounded">$1</mark>',
  );
};

export function SearchResults({
  query,
  results,
  isLoading,
  onArticleClick,
  onTutorialClick,
  totalResults = results.length,
  currentPage = 1,
  pageSize = 10,
  onPageChange,
  className = '',
}: SearchResultsProps) {
  const [sortBy, setSortBy] = useState<
    'relevance' | 'date' | 'rating' | 'views'
  >('relevance');

  const totalPages = Math.ceil(totalResults / pageSize);

  const handleResultClick = useCallback(
    (result: SearchResult) => {
      if (result.type === 'tutorial' && onTutorialClick) {
        onTutorialClick(result);
      } else {
        onArticleClick(result);
      }
    },
    [onArticleClick, onTutorialClick],
  );

  const sortedResults = React.useMemo(() => {
    return [...results].sort((a, b) => {
      switch (sortBy) {
        case 'date':
          return (
            new Date(b.lastUpdated).getTime() -
            new Date(a.lastUpdated).getTime()
          );
        case 'rating':
          return b.rating - a.rating;
        case 'views':
          return b.viewCount - a.viewCount;
        default:
          return 0; // Relevance order maintained from API
      }
    });
  }, [results, sortBy]);

  if (isLoading) {
    return (
      <div className={`p-6 ${className}`}>
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 rounded w-1/4"></div>
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="bg-white rounded-lg border border-gray-200 p-6"
            >
              <div className="h-6 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-2/3"></div>
              <div className="flex items-center space-x-4 mt-4">
                <div className="h-3 bg-gray-200 rounded w-16"></div>
                <div className="h-3 bg-gray-200 rounded w-20"></div>
                <div className="h-3 bg-gray-200 rounded w-14"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!results.length && !isLoading) {
    return (
      <div className={`p-6 ${className}`}>
        <div className="text-center py-12">
          <MagnifyingGlassIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No results found for "{query}"
          </h3>
          <p className="text-gray-600 mb-6">
            Try adjusting your search terms or browse our categories.
          </p>
          <div className="space-y-2">
            <p className="text-sm text-gray-500">Search suggestions:</p>
            <div className="flex flex-wrap gap-2 justify-center">
              {[
                'wedding forms',
                'client management',
                'pricing setup',
                'photo delivery',
              ].map((term) => (
                <button
                  key={term}
                  onClick={() => {
                    /* Handle suggestion click */
                  }}
                  className="text-sm px-3 py-1 bg-gray-100 text-gray-700 rounded-full hover:bg-gray-200 transition-colors duration-200"
                >
                  {term}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`p-6 ${className}`}>
      {/* Results Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">
            Search Results
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            {totalResults.toLocaleString()} result
            {totalResults !== 1 ? 's' : ''} for "{query}"
          </p>
        </div>

        <div className="flex items-center space-x-4">
          <label htmlFor="sort" className="text-sm text-gray-700">
            Sort by:
          </label>
          <select
            id="sort"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
            className="text-sm border border-gray-300 rounded-md px-3 py-1 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          >
            <option value="relevance">Relevance</option>
            <option value="date">Date</option>
            <option value="rating">Rating</option>
            <option value="views">Views</option>
          </select>
        </div>
      </div>

      {/* Results List */}
      <div className="space-y-4">
        <AnimatePresence>
          {sortedResults.map((result, index) => (
            <motion.div
              key={result.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md hover:border-gray-300 transition-all duration-200 cursor-pointer"
              onClick={() => handleResultClick(result)}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-2">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        result.type === 'tutorial'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {result.type}
                    </span>
                    <span className="text-xs text-gray-500">
                      {result.category}
                    </span>
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getDifficultyColor(result.difficulty)}`}
                    >
                      {result.difficulty}
                    </span>
                  </div>

                  <h3 className="text-lg font-medium text-gray-900 mb-2 hover:text-primary-600">
                    <span
                      dangerouslySetInnerHTML={{
                        __html: highlightText(result.title, query),
                      }}
                    />
                  </h3>

                  <p className="text-gray-600 mb-3 line-clamp-2">
                    <span
                      dangerouslySetInnerHTML={{
                        __html: highlightText(result.excerpt, query),
                      }}
                    />
                  </p>

                  <div className="flex items-center space-x-4 text-sm text-gray-500">
                    <div className="flex items-center">
                      <ClockIcon className="w-4 h-4 mr-1" />
                      <span>{result.estimatedReadTime} min read</span>
                    </div>

                    <div className="flex items-center">
                      <StarIcon className="w-4 h-4 mr-1" />
                      <span>{result.rating.toFixed(1)}</span>
                    </div>

                    <div className="flex items-center">
                      <EyeIcon className="w-4 h-4 mr-1" />
                      <span>{result.viewCount.toLocaleString()} views</span>
                    </div>

                    <span>
                      Updated{' '}
                      {new Date(result.lastUpdated).toLocaleDateString()}
                    </span>
                  </div>

                  {result.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-3">
                      {result.tags.slice(0, 3).map((tag) => (
                        <span
                          key={tag}
                          className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-gray-50 text-gray-600"
                        >
                          #{tag}
                        </span>
                      ))}
                      {result.tags.length > 3 && (
                        <span className="text-xs text-gray-400">
                          +{result.tags.length - 3} more
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-200">
          <div className="text-sm text-gray-600">
            Showing {(currentPage - 1) * pageSize + 1} to{' '}
            {Math.min(currentPage * pageSize, totalResults)} of {totalResults}{' '}
            results
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => onPageChange?.(currentPage - 1)}
              disabled={currentPage <= 1}
              className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeftIcon className="w-4 h-4 mr-1" />
              Previous
            </button>

            <div className="flex items-center space-x-1">
              {[...Array(Math.min(totalPages, 5))].map((_, i) => {
                const page = i + 1;
                return (
                  <button
                    key={page}
                    onClick={() => onPageChange?.(page)}
                    className={`px-3 py-2 text-sm font-medium rounded-md ${
                      currentPage === page
                        ? 'bg-primary-600 text-white'
                        : 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {page}
                  </button>
                );
              })}
            </div>

            <button
              onClick={() => onPageChange?.(currentPage + 1)}
              disabled={currentPage >= totalPages}
              className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
              <ChevronRightIcon className="w-4 h-4 ml-1" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
