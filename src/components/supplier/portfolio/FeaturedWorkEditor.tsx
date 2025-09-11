'use client';

// WS-186: Hero selection and curation interface with visual prominence

import React, { useState, useEffect } from 'react';
import {
  Star,
  Eye,
  TrendingUp,
  Users,
  Heart,
  Award,
  ArrowUp,
  ArrowDown,
  X,
  Plus,
  Grid,
  BarChart3,
  Zap,
  Target,
  Filter,
  Search,
  Layout,
} from 'lucide-react';
import { Button } from '@/components/ui/button-untitled';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import type { GalleryImage } from '@/types/portfolio';

interface FeaturedWorkEditorProps {
  portfolioImages: GalleryImage[];
  currentFeatured: string[];
  maxFeaturedCount: number;
  onFeaturedUpdate: (imageIds: string[]) => void;
  onClose?: () => void;
}

interface ImageAnalytics {
  views: number;
  likes: number;
  shares: number;
  engagementRate: number;
  performanceScore: number;
  trendingScore: number;
}

type SortOption = 'performance' | 'views' | 'likes' | 'recent' | 'alphabetical';
type FilterOption = 'all' | 'ceremony' | 'reception' | 'portraits' | 'details';

export function FeaturedWorkEditor({
  portfolioImages,
  currentFeatured,
  maxFeaturedCount,
  onFeaturedUpdate,
  onClose,
}: FeaturedWorkEditorProps) {
  const [featuredImageIds, setFeaturedImageIds] =
    useState<string[]>(currentFeatured);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<FilterOption>('all');
  const [sortBy, setSortBy] = useState<SortOption>('performance');
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [imageAnalytics, setImageAnalytics] = useState<
    Map<string, ImageAnalytics>
  >(new Map());
  const [draggedImage, setDraggedImage] = useState<string | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  // Load analytics data
  useEffect(() => {
    loadImageAnalytics();
  }, [portfolioImages]);

  const loadImageAnalytics = async () => {
    try {
      const response = await fetch('/api/portfolio/analytics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageIds: portfolioImages.map((img) => img.id),
        }),
      });

      if (response.ok) {
        const analytics = await response.json();
        const analyticsMap = new Map<string, ImageAnalytics>();

        analytics.forEach((item: any) => {
          analyticsMap.set(item.imageId, {
            views: item.views || 0,
            likes: item.likes || 0,
            shares: item.shares || 0,
            engagementRate: item.engagement_rate || 0,
            performanceScore: item.performance_score || 0,
            trendingScore: item.trending_score || 0,
          });
        });

        setImageAnalytics(analyticsMap);
      }
    } catch (error) {
      console.error('Failed to load analytics:', error);
    }
  };

  // Filter and sort images
  const filteredAndSortedImages = React.useMemo(() => {
    let filtered = portfolioImages;

    // Apply search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (image) =>
          image.title?.toLowerCase().includes(searchLower) ||
          image.alt_text?.toLowerCase().includes(searchLower) ||
          (image.ai_tags || []).some((tag) =>
            tag.toLowerCase().includes(searchLower),
          ) ||
          (image.manual_tags || []).some((tag) =>
            tag.toLowerCase().includes(searchLower),
          ),
      );
    }

    // Apply category filter
    if (selectedFilter !== 'all') {
      filtered = filtered.filter((image) => image.category === selectedFilter);
    }

    // Sort images
    return filtered.sort((a, b) => {
      const analyticsA = imageAnalytics.get(a.id);
      const analyticsB = imageAnalytics.get(b.id);

      switch (sortBy) {
        case 'performance':
          return (
            (analyticsB?.performanceScore || 0) -
            (analyticsA?.performanceScore || 0)
          );
        case 'views':
          return (analyticsB?.views || 0) - (analyticsA?.views || 0);
        case 'likes':
          return (analyticsB?.likes || 0) - (analyticsA?.likes || 0);
        case 'recent':
          return (
            new Date(b.uploaded_at).getTime() -
            new Date(a.uploaded_at).getTime()
          );
        case 'alphabetical':
          return (a.title || '').localeCompare(b.title || '');
        default:
          return 0;
      }
    });
  }, [portfolioImages, searchTerm, selectedFilter, sortBy, imageAnalytics]);

  // Get featured images in order
  const orderedFeaturedImages = featuredImageIds
    .map((id) => portfolioImages.find((img) => img.id === id))
    .filter(Boolean) as GalleryImage[];

  // Handle adding image to featured
  const addToFeatured = (imageId: string) => {
    if (featuredImageIds.length >= maxFeaturedCount) {
      alert(`Maximum ${maxFeaturedCount} featured images allowed`);
      return;
    }

    if (!featuredImageIds.includes(imageId)) {
      setFeaturedImageIds([...featuredImageIds, imageId]);
    }
  };

  // Handle removing image from featured
  const removeFromFeatured = (imageId: string) => {
    setFeaturedImageIds(featuredImageIds.filter((id) => id !== imageId));
  };

  // Handle reordering featured images
  const reorderFeatured = (fromIndex: number, toIndex: number) => {
    const newOrder = [...featuredImageIds];
    const [moved] = newOrder.splice(fromIndex, 1);
    newOrder.splice(toIndex, 0, moved);
    setFeaturedImageIds(newOrder);
  };

  // Handle drag and drop
  const handleDragStart = (imageId: string) => {
    setDraggedImage(imageId);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDragOverIndex(index);
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();

    if (!draggedImage) return;

    const dragIndex = featuredImageIds.indexOf(draggedImage);
    if (dragIndex !== -1) {
      reorderFeatured(dragIndex, dropIndex);
    }

    setDraggedImage(null);
    setDragOverIndex(null);
  };

  // Save changes
  const handleSave = () => {
    onFeaturedUpdate(featuredImageIds);
    onClose?.();
  };

  // Auto-suggest based on performance
  const autoSuggestFeatured = () => {
    const topPerformingImages = filteredAndSortedImages
      .filter((img) => !featuredImageIds.includes(img.id))
      .slice(0, maxFeaturedCount - featuredImageIds.length)
      .map((img) => img.id);

    setFeaturedImageIds([...featuredImageIds, ...topPerformingImages]);
  };

  // Get performance insights
  const getPerformanceInsights = () => {
    const featuredAnalytics = featuredImageIds
      .map((id) => imageAnalytics.get(id))
      .filter(Boolean) as ImageAnalytics[];

    if (featuredAnalytics.length === 0) return null;

    const avgPerformance =
      featuredAnalytics.reduce((sum, a) => sum + a.performanceScore, 0) /
      featuredAnalytics.length;
    const avgViews =
      featuredAnalytics.reduce((sum, a) => sum + a.views, 0) /
      featuredAnalytics.length;
    const avgEngagement =
      featuredAnalytics.reduce((sum, a) => sum + a.engagementRate, 0) /
      featuredAnalytics.length;

    return {
      avgPerformance: Math.round(avgPerformance),
      avgViews: Math.round(avgViews),
      avgEngagement: Math.round(avgEngagement * 100),
    };
  };

  const insights = getPerformanceInsights();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-7xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Star className="w-5 h-5 text-yellow-600" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">
                  Featured Work Editor
                </h2>
                <p className="text-gray-600">
                  Curate your best work • {featuredImageIds.length}/
                  {maxFeaturedCount} selected
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="secondary"
              leftIcon={<Zap className="w-4 h-4" />}
              onClick={autoSuggestFeatured}
              disabled={featuredImageIds.length >= maxFeaturedCount}
            >
              Auto-Suggest
            </Button>

            <Button
              variant="secondary"
              leftIcon={<BarChart3 className="w-4 h-4" />}
              onClick={() => setShowAnalytics(!showAnalytics)}
            >
              Analytics
            </Button>

            <Button variant="primary" onClick={handleSave}>
              Save Changes
            </Button>

            {onClose && (
              <Button variant="ghost" onClick={onClose}>
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Performance Insights */}
        {insights && showAnalytics && (
          <div className="p-6 bg-gradient-to-r from-yellow-50 to-orange-50 border-b border-yellow-100">
            <h3 className="font-medium text-gray-900 mb-4 flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Portfolio Performance Insights
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white rounded-lg p-4 border border-yellow-200">
                <div className="flex items-center gap-2 mb-2">
                  <Award className="w-4 h-4 text-yellow-600" />
                  <span className="text-sm font-medium text-gray-700">
                    Avg Performance
                  </span>
                </div>
                <div className="text-2xl font-bold text-gray-900">
                  {insights.avgPerformance}/100
                </div>
                <Progress
                  value={insights.avgPerformance}
                  className="h-2 mt-2"
                />
              </div>

              <div className="bg-white rounded-lg p-4 border border-blue-200">
                <div className="flex items-center gap-2 mb-2">
                  <Eye className="w-4 h-4 text-blue-600" />
                  <span className="text-sm font-medium text-gray-700">
                    Avg Views
                  </span>
                </div>
                <div className="text-2xl font-bold text-gray-900">
                  {insights.avgViews}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  per featured image
                </div>
              </div>

              <div className="bg-white rounded-lg p-4 border border-green-200">
                <div className="flex items-center gap-2 mb-2">
                  <Users className="w-4 h-4 text-green-600" />
                  <span className="text-sm font-medium text-gray-700">
                    Avg Engagement
                  </span>
                </div>
                <div className="text-2xl font-bold text-gray-900">
                  {insights.avgEngagement}%
                </div>
                <div className="text-xs text-gray-500 mt-1">likes + shares</div>
              </div>
            </div>
          </div>
        )}

        <div className="flex h-[calc(90vh-200px)]">
          {/* Left Panel - Image Library */}
          <div className="w-1/2 border-r border-gray-200 flex flex-col">
            <div className="p-4 border-b border-gray-200">
              <h3 className="font-medium text-gray-900 mb-4">
                Portfolio Library
              </h3>

              {/* Search and Filters */}
              <div className="space-y-3">
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <Input
                    placeholder="Search portfolio..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>

                <div className="flex gap-2 overflow-x-auto">
                  {(
                    [
                      'all',
                      'ceremony',
                      'reception',
                      'portraits',
                      'details',
                    ] as FilterOption[]
                  ).map((filter) => (
                    <Button
                      key={filter}
                      variant={
                        selectedFilter === filter ? 'primary' : 'secondary'
                      }
                      size="sm"
                      onClick={() => setSelectedFilter(filter)}
                      className="whitespace-nowrap"
                    >
                      {filter === 'all' ? 'All' : filter}
                    </Button>
                  ))}
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">Sort by:</span>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as SortOption)}
                    className="text-sm border border-gray-300 rounded px-2 py-1"
                  >
                    <option value="performance">Performance</option>
                    <option value="views">Views</option>
                    <option value="likes">Likes</option>
                    <option value="recent">Recent</option>
                    <option value="alphabetical">Alphabetical</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Image Grid */}
            <div className="flex-1 overflow-y-auto p-4">
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                {filteredAndSortedImages.map((image) => {
                  const analytics = imageAnalytics.get(image.id);
                  const isFeatured = featuredImageIds.includes(image.id);

                  return (
                    <LibraryImageCard
                      key={image.id}
                      image={image}
                      analytics={analytics}
                      isFeatured={isFeatured}
                      onAddToFeatured={() => addToFeatured(image.id)}
                      showAnalytics={showAnalytics}
                    />
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right Panel - Featured Work */}
          <div className="w-1/2 flex flex-col">
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-gray-900">Featured Work</h3>
                <Badge variant="secondary">
                  {featuredImageIds.length}/{maxFeaturedCount}
                </Badge>
              </div>
              <p className="text-sm text-gray-600 mt-1">
                Drag to reorder • Higher position = more prominence
              </p>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {orderedFeaturedImages.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 mx-auto bg-gray-100 rounded-full flex items-center justify-center mb-4">
                    <Star className="w-8 h-8 text-gray-400" />
                  </div>
                  <h4 className="font-medium text-gray-900 mb-2">
                    No featured work selected
                  </h4>
                  <p className="text-gray-600 mb-4">
                    Choose your best images to showcase prominently
                  </p>
                  <Button
                    variant="secondary"
                    leftIcon={<Plus className="w-4 h-4" />}
                    onClick={() => {
                      const firstImage = filteredAndSortedImages[0];
                      if (firstImage) addToFeatured(firstImage.id);
                    }}
                  >
                    Add First Image
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {orderedFeaturedImages.map((image, index) => {
                    const analytics = imageAnalytics.get(image.id);

                    return (
                      <FeaturedImageCard
                        key={image.id}
                        image={image}
                        analytics={analytics}
                        index={index}
                        totalCount={orderedFeaturedImages.length}
                        onRemove={() => removeFromFeatured(image.id)}
                        onMoveUp={() =>
                          index > 0 && reorderFeatured(index, index - 1)
                        }
                        onMoveDown={() =>
                          index < orderedFeaturedImages.length - 1 &&
                          reorderFeatured(index, index + 1)
                        }
                        onDragStart={() => handleDragStart(image.id)}
                        onDragOver={(e) => handleDragOver(e, index)}
                        onDrop={(e) => handleDrop(e, index)}
                        isDraggedOver={dragOverIndex === index}
                        showAnalytics={showAnalytics}
                      />
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Library image card component
interface LibraryImageCardProps {
  image: GalleryImage;
  analytics?: ImageAnalytics;
  isFeatured: boolean;
  onAddToFeatured: () => void;
  showAnalytics: boolean;
}

function LibraryImageCard({
  image,
  analytics,
  isFeatured,
  onAddToFeatured,
  showAnalytics,
}: LibraryImageCardProps) {
  return (
    <div
      className={`
      relative group border rounded-lg overflow-hidden transition-all duration-200
      ${
        isFeatured
          ? 'border-yellow-400 bg-yellow-50'
          : 'border-gray-200 hover:border-gray-300 hover:shadow-md'
      }
    `}
    >
      {/* Featured Badge */}
      {isFeatured && (
        <div className="absolute top-2 left-2 z-10">
          <Badge variant="warning" className="text-xs bg-yellow-400 text-white">
            <Star className="w-3 h-3 mr-1" />
            Featured
          </Badge>
        </div>
      )}

      {/* Performance Badge */}
      {showAnalytics && analytics && (
        <div className="absolute top-2 right-2 z-10">
          <Badge
            variant={
              analytics.performanceScore >= 80
                ? 'success'
                : analytics.performanceScore >= 60
                  ? 'warning'
                  : 'secondary'
            }
            className="text-xs"
          >
            {analytics.performanceScore}/100
          </Badge>
        </div>
      )}

      {/* Image */}
      <div className="aspect-square bg-gray-100">
        <img
          src={image.thumbnail_url}
          alt={image.alt_text || image.title}
          className="w-full h-full object-cover"
        />
      </div>

      {/* Add Button Overlay */}
      {!isFeatured && (
        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 flex items-center justify-center transition-all duration-200">
          <Button
            variant="secondary"
            size="sm"
            onClick={onAddToFeatured}
            className="opacity-0 group-hover:opacity-100 transform scale-90 group-hover:scale-100 transition-all duration-200"
          >
            <Plus className="w-4 h-4 mr-1" />
            Feature
          </Button>
        </div>
      )}

      {/* Image Info */}
      <div className="p-2">
        <h5 className="font-medium text-sm text-gray-900 truncate">
          {image.title || 'Untitled'}
        </h5>

        {showAnalytics && analytics && (
          <div className="flex items-center justify-between mt-1 text-xs text-gray-600">
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1">
                <Eye className="w-3 h-3" />
                {analytics.views}
              </span>
              <span className="flex items-center gap-1">
                <Heart className="w-3 h-3" />
                {analytics.likes}
              </span>
            </div>
            <span className="font-medium">
              {analytics.engagementRate.toFixed(1)}%
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

// Featured image card component
interface FeaturedImageCardProps {
  image: GalleryImage;
  analytics?: ImageAnalytics;
  index: number;
  totalCount: number;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDragStart: () => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  isDraggedOver: boolean;
  showAnalytics: boolean;
}

function FeaturedImageCard({
  image,
  analytics,
  index,
  totalCount,
  onRemove,
  onMoveUp,
  onMoveDown,
  onDragStart,
  onDragOver,
  onDrop,
  isDraggedOver,
  showAnalytics,
}: FeaturedImageCardProps) {
  return (
    <div
      className={`
        flex items-center gap-3 p-3 border rounded-lg transition-all duration-200 cursor-move
        ${
          isDraggedOver
            ? 'border-blue-400 bg-blue-50'
            : 'border-gray-200 bg-white hover:shadow-md'
        }
      `}
      draggable
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      {/* Priority Indicator */}
      <div className="flex items-center">
        <div
          className={`
          w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold
          ${
            index === 0
              ? 'bg-yellow-400 text-white'
              : index < 3
                ? 'bg-yellow-100 text-yellow-700'
                : 'bg-gray-100 text-gray-600'
          }
        `}
        >
          {index + 1}
        </div>
      </div>

      {/* Image Thumbnail */}
      <img
        src={image.thumbnail_url}
        alt={image.alt_text || image.title}
        className="w-12 h-12 object-cover rounded"
      />

      {/* Image Info */}
      <div className="flex-1 min-w-0">
        <h5 className="font-medium text-gray-900 truncate">
          {image.title || 'Untitled'}
        </h5>

        {showAnalytics && analytics && (
          <div className="flex items-center gap-3 mt-1 text-xs text-gray-600">
            <span className="flex items-center gap-1">
              <Eye className="w-3 h-3" />
              {analytics.views}
            </span>
            <span className="flex items-center gap-1">
              <Heart className="w-3 h-3" />
              {analytics.likes}
            </span>
            <span className="flex items-center gap-1">
              <TrendingUp className="w-3 h-3" />
              {analytics.performanceScore}/100
            </span>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={onMoveUp}
          disabled={index === 0}
        >
          <ArrowUp className="w-3 h-3" />
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={onMoveDown}
          disabled={index === totalCount - 1}
        >
          <ArrowDown className="w-3 h-3" />
        </Button>

        <Button variant="ghost" size="sm" onClick={onRemove}>
          <X className="w-3 h-3" />
        </Button>
      </div>
    </div>
  );
}
