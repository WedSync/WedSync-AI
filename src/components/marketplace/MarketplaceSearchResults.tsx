/**
 * WS-114: Marketplace Search Results Component
 *
 * Results management system with relevance scoring, sort options, pagination,
 * result highlighting, and zero-result handling.
 *
 * Team B - Batch 9 - Round 1
 */

'use client';

import React, { useState, useEffect } from 'react';
import {
  Grid,
  List,
  ChevronLeft,
  ChevronRight,
  Star,
  Download,
  Eye,
  TrendingUp,
  Calendar,
  DollarSign,
  Filter,
  SortDesc,
  Loader2,
  Search,
  Frown,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from '@/components/ui/card';
import DOMPurify from 'isomorphic-dompurify';

// =====================================================================================
// INTERFACES
// =====================================================================================

interface MarketplaceTemplate {
  id: string;
  supplier_id: string;
  title: string;
  description: string;
  template_type: string;
  category: string;
  subcategory: string;
  price_cents: number;
  currency: string;
  minimum_tier: string;
  preview_data: object;
  preview_images: string[];
  demo_url: string | null;
  install_count: number;
  view_count: number;
  conversion_rate: number;
  average_rating: number;
  rating_count: number;
  target_wedding_types: string[];
  target_price_range: string;
  tags: string[];
  featured: boolean;
  created_at: string;
  updated_at: string;
  search_rank?: number;
  highlighted_title?: string;
  highlighted_description?: string;
}

interface SearchResults {
  templates: MarketplaceTemplate[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  searchMetadata: {
    query: string;
    resultCount: number;
    searchTime: number;
    filters: any;
    sortBy: string;
    sortDirection: string;
  };
}

interface SearchResultsProps {
  results: SearchResults | null;
  isLoading: boolean;
  onPageChange: (page: number) => void;
  onSortChange: (sortBy: string, direction: 'ASC' | 'DESC') => void;
  onLimitChange: (limit: number) => void;
  onTemplateClick: (template: MarketplaceTemplate) => void;
  className?: string;
}

type ViewMode = 'grid' | 'list';
type SortOption =
  | 'relevance'
  | 'price'
  | 'rating'
  | 'popularity'
  | 'newest'
  | 'featured';

// =====================================================================================
// SUB-COMPONENTS
// =====================================================================================

function TemplateCard({
  template,
  viewMode,
  onTemplateClick,
}: {
  template: MarketplaceTemplate;
  viewMode: ViewMode;
  onTemplateClick: (template: MarketplaceTemplate) => void;
}) {
  const formatPrice = (cents: number): string => {
    if (cents === 0) return 'Free';
    const pounds = cents / 100;
    return `£${pounds.toFixed(2)}`;
  };

  const truncateText = (text: string, maxLength: number): string => {
    return text.length > maxLength
      ? text.substring(0, maxLength) + '...'
      : text;
  };

  if (viewMode === 'list') {
    return (
      <Card
        className="mb-4 hover:shadow-md transition-shadow cursor-pointer"
        onClick={() => onTemplateClick(template)}
      >
        <div className="flex">
          {/* Preview Image */}
          <div className="w-48 h-32 bg-gray-100 rounded-l-lg overflow-hidden flex-shrink-0">
            {template.preview_images?.[0] ? (
              <img
                src={template.preview_images[0]}
                alt={template.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-400">
                <Filter className="w-8 h-8" />
              </div>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 p-4">
            <div className="flex justify-between items-start mb-2">
              <div>
                <h3
                  className="text-lg font-semibold text-gray-900 mb-1"
                  dangerouslySetInnerHTML={{
                    __html: template.highlighted_title
                      ? DOMPurify.sanitize(template.highlighted_title, {
                          ALLOWED_TAGS: ['mark'],
                          ALLOWED_ATTR: ['class'],
                        })
                      : DOMPurify.sanitize(template.title),
                  }}
                />
                <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                  <Badge variant="secondary">{template.category}</Badge>
                  <Badge variant="outline">{template.minimum_tier}</Badge>
                  {template.featured && (
                    <Badge className="bg-yellow-100 text-yellow-800">
                      Featured
                    </Badge>
                  )}
                </div>
              </div>
              <div className="text-right">
                <div className="text-xl font-bold text-purple-600">
                  {formatPrice(template.price_cents)}
                </div>
                <div className="flex items-center gap-1 text-sm text-gray-500">
                  <Star className="w-3 h-3 text-yellow-400 fill-current" />
                  <span>{template.average_rating.toFixed(1)}</span>
                  <span>({template.rating_count})</span>
                </div>
              </div>
            </div>

            <p
              className="text-gray-600 text-sm mb-3 line-clamp-2"
              dangerouslySetInnerHTML={{
                __html: template.highlighted_description
                  ? DOMPurify.sanitize(template.highlighted_description, {
                      ALLOWED_TAGS: ['mark'],
                      ALLOWED_ATTR: ['class'],
                    })
                  : DOMPurify.sanitize(truncateText(template.description, 200)),
              }}
            />

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4 text-xs text-gray-500">
                <div className="flex items-center gap-1">
                  <Download className="w-3 h-3" />
                  <span>
                    {template.install_count.toLocaleString()} installs
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <Eye className="w-3 h-3" />
                  <span>{template.view_count.toLocaleString()} views</span>
                </div>
                {template.conversion_rate > 0 && (
                  <div className="flex items-center gap-1">
                    <TrendingUp className="w-3 h-3" />
                    <span>
                      {(template.conversion_rate * 100).toFixed(1)}% conversion
                    </span>
                  </div>
                )}
              </div>

              {template.tags && template.tags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {template.tags.slice(0, 3).map((tag) => (
                    <Badge key={tag} variant="outline" className="text-xs">
                      #{tag}
                    </Badge>
                  ))}
                  {template.tags.length > 3 && (
                    <Badge variant="outline" className="text-xs">
                      +{template.tags.length - 3}
                    </Badge>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </Card>
    );
  }

  // Grid view
  return (
    <Card
      className="group hover:shadow-lg transition-all duration-200 cursor-pointer"
      onClick={() => onTemplateClick(template)}
    >
      {/* Preview Image */}
      <div className="aspect-video bg-gray-100 overflow-hidden rounded-t-lg relative">
        {template.preview_images?.[0] ? (
          <img
            src={template.preview_images[0]}
            alt={template.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400">
            <Filter className="w-12 h-12" />
          </div>
        )}

        {/* Overlay badges */}
        <div className="absolute top-2 left-2 flex gap-2">
          {template.featured && (
            <Badge className="bg-yellow-500 text-white">Featured</Badge>
          )}
          <Badge variant="secondary">{template.category}</Badge>
        </div>

        {/* Price badge */}
        <div className="absolute top-2 right-2">
          <Badge className="bg-white text-purple-600 font-bold">
            {formatPrice(template.price_cents)}
          </Badge>
        </div>
      </div>

      <CardHeader className="pb-2">
        <h3
          className="font-semibold text-gray-900 line-clamp-2 group-hover:text-purple-600 transition-colors"
          dangerouslySetInnerHTML={{
            __html: template.highlighted_title || template.title,
          }}
        />

        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-1">
            <Star className="w-4 h-4 text-yellow-400 fill-current" />
            <span className="font-medium">
              {template.average_rating.toFixed(1)}
            </span>
            <span className="text-gray-500">({template.rating_count})</span>
          </div>
          <Badge variant="outline" className="text-xs">
            {template.minimum_tier}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        <p
          className="text-gray-600 text-sm line-clamp-3 mb-3"
          dangerouslySetInnerHTML={{
            __html: template.highlighted_description || template.description,
          }}
        />

        {template.tags && template.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {template.tags.slice(0, 3).map((tag) => (
              <Badge key={tag} variant="outline" className="text-xs">
                #{tag}
              </Badge>
            ))}
            {template.tags.length > 3 && (
              <Badge variant="outline" className="text-xs">
                +{template.tags.length - 3}
              </Badge>
            )}
          </div>
        )}
      </CardContent>

      <CardFooter className="pt-0 text-xs text-gray-500">
        <div className="w-full flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              <Download className="w-3 h-3" />
              <span>{template.install_count.toLocaleString()}</span>
            </div>
            <div className="flex items-center gap-1">
              <Eye className="w-3 h-3" />
              <span>{template.view_count.toLocaleString()}</span>
            </div>
          </div>
          <div className="text-xs text-gray-400">
            {new Date(template.created_at).toLocaleDateString()}
          </div>
        </div>
      </CardFooter>
    </Card>
  );
}

function EmptyState({
  query,
  hasFilters,
}: {
  query: string;
  hasFilters: boolean;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-6">
        <Search className="w-8 h-8 text-gray-400" />
      </div>

      <h3 className="text-xl font-semibold text-gray-900 mb-2">
        No templates found
      </h3>

      <div className="text-gray-600 max-w-md">
        {query ? (
          <p>
            No templates match your search for <strong>"{query}"</strong>
            {hasFilters && ' with the selected filters'}.
          </p>
        ) : (
          <p>
            {hasFilters
              ? 'No templates match the selected filters. Try adjusting your criteria.'
              : 'Start searching for templates or browse by category.'}
          </p>
        )}
      </div>

      <div className="mt-6 space-y-2 text-sm text-gray-500">
        <p>Try:</p>
        <ul className="list-disc list-inside space-y-1">
          <li>Using different or fewer keywords</li>
          <li>Removing some filters</li>
          <li>Checking your spelling</li>
          <li>Browsing popular categories</li>
        </ul>
      </div>
    </div>
  );
}

// =====================================================================================
// MAIN COMPONENT
// =====================================================================================

export function MarketplaceSearchResults({
  results,
  isLoading,
  onPageChange,
  onSortChange,
  onLimitChange,
  onTemplateClick,
  className = '',
}: SearchResultsProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [currentSort, setCurrentSort] = useState<SortOption>('relevance');
  const [sortDirection, setSortDirection] = useState<'ASC' | 'DESC'>('DESC');

  // Update sort state when results change
  useEffect(() => {
    if (results?.searchMetadata) {
      setCurrentSort(results.searchMetadata.sortBy as SortOption);
      setSortDirection(results.searchMetadata.sortDirection as 'ASC' | 'DESC');
    }
  }, [results]);

  // =====================================================================================
  // EVENT HANDLERS
  // =====================================================================================

  const handleSortChange = (value: string) => {
    const [sortBy, direction] = value.split('-');
    setCurrentSort(sortBy as SortOption);
    setSortDirection(direction as 'ASC' | 'DESC');
    onSortChange(sortBy, direction as 'ASC' | 'DESC');
  };

  const handleLimitChange = (value: string) => {
    onLimitChange(parseInt(value));
  };

  const generatePageNumbers = (): (number | string)[] => {
    if (!results?.pagination) return [];

    const { page, totalPages } = results.pagination;
    const pages: (number | string)[] = [];

    // Always show first page
    pages.push(1);

    // Show pages around current page
    const start = Math.max(2, page - 2);
    const end = Math.min(totalPages - 1, page + 2);

    if (start > 2) pages.push('...');

    for (let i = start; i <= end; i++) {
      if (i !== 1 && i !== totalPages) {
        pages.push(i);
      }
    }

    if (end < totalPages - 1) pages.push('...');

    // Always show last page (if more than 1 page)
    if (totalPages > 1) pages.push(totalPages);

    return pages;
  };

  // =====================================================================================
  // RENDER
  // =====================================================================================

  if (isLoading) {
    return (
      <div className={`flex-1 ${className}`}>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
          <span className="ml-3 text-gray-600">Searching templates...</span>
        </div>
      </div>
    );
  }

  if (!results) {
    return (
      <div className={`flex-1 ${className}`}>
        <EmptyState query="" hasFilters={false} />
      </div>
    );
  }

  const { templates, pagination, searchMetadata } = results;

  return (
    <div className={`flex-1 ${className}`}>
      {/* Results Header */}
      <div className="flex items-center justify-between mb-6 bg-white border-b border-gray-200 pb-4">
        <div className="flex items-center gap-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              {searchMetadata.query ? `Search Results` : 'All Templates'}
            </h2>
            <p className="text-sm text-gray-600">
              {pagination.total.toLocaleString()} templates found
              {searchMetadata.query && ` for "${searchMetadata.query}"`}
              <span className="ml-2 text-gray-400">
                ({searchMetadata.searchTime}ms)
              </span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Results per page */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">Show:</span>
            <Select
              value={pagination.limit.toString()}
              onValueChange={handleLimitChange}
            >
              <SelectTrigger className="w-20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="12">12</SelectItem>
                <SelectItem value="24">24</SelectItem>
                <SelectItem value="48">48</SelectItem>
                <SelectItem value="96">96</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Sort options */}
          <div className="flex items-center gap-2">
            <SortDesc className="w-4 h-4 text-gray-400" />
            <Select
              value={`${currentSort}-${sortDirection}`}
              onValueChange={handleSortChange}
            >
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="relevance-DESC">Best Match</SelectItem>
                <SelectItem value="featured-DESC">Featured First</SelectItem>
                <SelectItem value="rating-DESC">Highest Rated</SelectItem>
                <SelectItem value="popularity-DESC">Most Popular</SelectItem>
                <SelectItem value="newest-DESC">Newest First</SelectItem>
                <SelectItem value="price-ASC">Price: Low to High</SelectItem>
                <SelectItem value="price-DESC">Price: High to Low</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* View mode toggle */}
          <div className="flex border border-gray-200 rounded-lg">
            <Button
              variant={viewMode === 'grid' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('grid')}
              className="rounded-r-none"
            >
              <Grid className="w-4 h-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('list')}
              className="rounded-l-none"
            >
              <List className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Results */}
      {templates.length === 0 ? (
        <EmptyState
          query={searchMetadata.query}
          hasFilters={Object.keys(searchMetadata.filters).length > 0}
        />
      ) : (
        <>
          {/* Templates Grid/List */}
          <div
            className={
              viewMode === 'grid'
                ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-8'
                : 'space-y-4 mb-8'
            }
          >
            {templates.map((template) => (
              <TemplateCard
                key={template.id}
                template={template}
                viewMode={viewMode}
                onTemplateClick={onTemplateClick}
              />
            ))}
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-gray-200 pt-6">
              <div className="text-sm text-gray-600">
                Showing {(pagination.page - 1) * pagination.limit + 1} to{' '}
                {Math.min(pagination.page * pagination.limit, pagination.total)}{' '}
                of {pagination.total.toLocaleString()} results
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onPageChange(pagination.page - 1)}
                  disabled={!pagination.hasPrev}
                >
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  Previous
                </Button>

                <div className="flex items-center gap-1">
                  {generatePageNumbers().map((pageNum, index) => (
                    <React.Fragment key={index}>
                      {pageNum === '...' ? (
                        <span className="px-3 py-1 text-gray-500">...</span>
                      ) : (
                        <Button
                          variant={
                            pageNum === pagination.page ? 'default' : 'ghost'
                          }
                          size="sm"
                          onClick={() => onPageChange(pageNum as number)}
                          className="w-10"
                        >
                          {pageNum}
                        </Button>
                      )}
                    </React.Fragment>
                  ))}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onPageChange(pagination.page + 1)}
                  disabled={!pagination.hasNext}
                >
                  Next
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
