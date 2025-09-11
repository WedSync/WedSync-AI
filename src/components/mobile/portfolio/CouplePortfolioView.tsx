'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Image from 'next/image';
import {
  Heart,
  Share2,
  MessageCircle,
  Star,
  Filter,
  Grid3X3,
  List,
  Download,
  ExternalLink,
} from 'lucide-react';
import {
  wedmePortfolioSync,
  type CoupleEngagementMetrics,
} from '@/lib/mobile/wedme-portfolio-sync';
import { cn } from '@/lib/utils';

export interface CouplePortfolioImage {
  id: string;
  url: string;
  thumbnailUrl: string;
  alt: string;
  category: string;
  tags: string[];
  featured: boolean;
  venue?: {
    name: string;
    type: string;
  };
  metadata: {
    capturedAt: string;
    equipment?: string;
    settings?: Record<string, any>;
  };
  isFavorited?: boolean;
  shareCount: number;
}

export interface SupplierInfo {
  id: string;
  name: string;
  role: string;
  rating: number;
  reviewCount: number;
  contactInfo: {
    phone?: string;
    email?: string;
    website?: string;
  };
  portfolio: {
    totalImages: number;
    categories: string[];
    lastUpdated: string;
  };
}

export interface CouplePortfolioViewProps {
  eventId: string;
  coupleId: string;
  supplier: SupplierInfo;
  images: CouplePortfolioImage[];
  initialView?: 'grid' | 'list' | 'featured';
  onImageFavorite?: (imageId: string, favorited: boolean) => void;
  onImageShare?: (imageId: string, shareData: any) => void;
  onInquiry?: (
    supplierId: string,
    inquiryType: string,
    imageIds?: string[],
  ) => void;
  onContactSupplier?: (supplierId: string) => void;
  className?: string;
}

export const CouplePortfolioView: React.FC<CouplePortfolioViewProps> = ({
  eventId,
  coupleId,
  supplier,
  images,
  initialView = 'grid',
  onImageFavorite,
  onImageShare,
  onInquiry,
  onContactSupplier,
  className,
}) => {
  const [viewMode, setViewMode] = useState<'grid' | 'list' | 'featured'>(
    initialView,
  );
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedImage, setSelectedImage] =
    useState<CouplePortfolioImage | null>(null);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [engagementMetrics, setEngagementMetrics] =
    useState<CoupleEngagementMetrics | null>(null);

  // Track portfolio views
  useEffect(() => {
    const trackView = async () => {
      try {
        await wedmePortfolioSync.trackCouplePortfolioView(eventId, coupleId);
        setIsLoading(false);
      } catch (error) {
        console.error('Failed to track portfolio view:', error);
        setIsLoading(false);
      }
    };

    trackView();

    // Load engagement metrics
    wedmePortfolioSync
      .getCoupleEngagementMetrics(eventId)
      .then((metrics) => {
        const coupleMetrics = metrics.find((m) => m.coupleId === coupleId);
        if (coupleMetrics) {
          setEngagementMetrics(coupleMetrics);
          setFavorites(new Set(coupleMetrics.favoriteImages));
        }
      })
      .catch((error) =>
        console.error('Failed to load engagement metrics:', error),
      );
  }, [eventId, coupleId]);

  // Filter images based on selected category and view mode
  const filteredImages = useMemo(() => {
    let filtered = images;

    if (selectedCategory !== 'all') {
      filtered = filtered.filter((img) => img.category === selectedCategory);
    }

    if (viewMode === 'featured') {
      filtered = filtered.filter((img) => img.featured);
    }

    return filtered.sort((a, b) => {
      if (viewMode === 'featured') {
        return b.shareCount - a.shareCount;
      }
      return (
        new Date(b.metadata.capturedAt).getTime() -
        new Date(a.metadata.capturedAt).getTime()
      );
    });
  }, [images, selectedCategory, viewMode]);

  // Get unique categories
  const categories = useMemo(() => {
    const cats = ['all', ...new Set(images.map((img) => img.category))];
    return cats;
  }, [images]);

  const handleImageClick = useCallback(
    async (image: CouplePortfolioImage) => {
      setSelectedImage(image);

      // Track image view
      try {
        await wedmePortfolioSync.trackCouplePortfolioView(
          eventId,
          coupleId,
          image.id,
        );
      } catch (error) {
        console.error('Failed to track image view:', error);
      }
    },
    [eventId, coupleId],
  );

  const handleFavoriteToggle = useCallback(
    async (imageId: string, favorited: boolean) => {
      const newFavorites = new Set(favorites);

      if (favorited) {
        newFavorites.add(imageId);
      } else {
        newFavorites.delete(imageId);
      }

      setFavorites(newFavorites);
      onImageFavorite?.(imageId, favorited);

      // Update engagement metrics
      if (engagementMetrics) {
        const updatedMetrics = {
          ...engagementMetrics,
          favoriteImages: Array.from(newFavorites),
        };
        setEngagementMetrics(updatedMetrics);
      }
    },
    [favorites, onImageFavorite, engagementMetrics],
  );

  const handleShare = useCallback(
    async (image: CouplePortfolioImage) => {
      if (navigator.share) {
        try {
          await navigator.share({
            title: `${supplier.name} - ${image.category}`,
            text: `Check out this beautiful ${image.category.toLowerCase()} photo from our wedding vendor ${supplier.name}`,
            url: window.location.href + `?image=${image.id}`,
          });

          onImageShare?.(image.id, { platform: 'native', shared: true });
        } catch (error) {
          console.log('Native sharing cancelled or failed');
        }
      } else {
        // Fallback to copy link
        navigator.clipboard.writeText(
          window.location.href + `?image=${image.id}`,
        );
        onImageShare?.(image.id, { platform: 'clipboard', shared: true });
      }
    },
    [supplier.name, onImageShare],
  );

  const handleInquiry = useCallback(() => {
    const favoriteImageIds = Array.from(favorites);
    onInquiry?.(supplier.id, 'portfolio_inquiry', favoriteImageIds);
  }, [supplier.id, favorites, onInquiry]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin w-8 h-8 border-2 border-pink-500 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Supplier Header */}
      <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              {supplier.name}
            </h2>
            <p className="text-gray-600">{supplier.role}</p>
            <div className="flex items-center mt-2">
              <div className="flex items-center">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className={cn(
                      'w-4 h-4',
                      i < supplier.rating
                        ? 'text-yellow-400 fill-current'
                        : 'text-gray-300',
                    )}
                  />
                ))}
              </div>
              <span className="ml-2 text-sm text-gray-600">
                ({supplier.reviewCount} reviews)
              </span>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => onContactSupplier?.(supplier.id)}
              className="px-4 py-2 bg-pink-600 text-white rounded-lg text-sm font-medium hover:bg-pink-700 transition-colors"
            >
              Contact
            </button>
          </div>
        </div>

        {/* Portfolio Stats */}
        <div className="grid grid-cols-3 gap-4 py-3 border-t border-gray-100">
          <div className="text-center">
            <div className="text-lg font-semibold text-gray-900">
              {supplier.portfolio.totalImages}
            </div>
            <div className="text-sm text-gray-600">Photos</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-semibold text-gray-900">
              {favorites.size}
            </div>
            <div className="text-sm text-gray-600">Favorites</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-semibold text-gray-900">
              {engagementMetrics?.portfolioViews || 0}
            </div>
            <div className="text-sm text-gray-600">Views</div>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100 space-y-4">
        {/* View Mode Toggle */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setViewMode('grid')}
            className={cn(
              'p-2 rounded-lg transition-colors',
              viewMode === 'grid'
                ? 'bg-pink-100 text-pink-600'
                : 'text-gray-400 hover:text-gray-600',
            )}
          >
            <Grid3X3 className="w-5 h-5" />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={cn(
              'p-2 rounded-lg transition-colors',
              viewMode === 'list'
                ? 'bg-pink-100 text-pink-600'
                : 'text-gray-400 hover:text-gray-600',
            )}
          >
            <List className="w-5 h-5" />
          </button>
          <button
            onClick={() => setViewMode('featured')}
            className={cn(
              'p-2 rounded-lg transition-colors',
              viewMode === 'featured'
                ? 'bg-pink-100 text-pink-600'
                : 'text-gray-400 hover:text-gray-600',
            )}
          >
            <Star className="w-5 h-5" />
          </button>
        </div>

        {/* Category Filter */}
        <div className="flex gap-2 overflow-x-auto pb-2">
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={cn(
                'px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors',
                selectedCategory === category
                  ? 'bg-pink-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200',
              )}
            >
              {category === 'all'
                ? 'All'
                : category.charAt(0).toUpperCase() + category.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Portfolio Grid/List */}
      <div
        className={cn(
          'space-y-4',
          viewMode === 'grid' && 'grid grid-cols-2 gap-4 space-y-0',
        )}
      >
        {filteredImages.map((image) => (
          <div
            key={image.id}
            className={cn(
              'bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden',
              viewMode === 'list' && 'flex',
            )}
          >
            <div
              className={cn(
                'relative aspect-square cursor-pointer',
                viewMode === 'list' && 'w-24 h-24 flex-shrink-0',
              )}
              onClick={() => handleImageClick(image)}
            >
              <Image
                src={image.thumbnailUrl}
                alt={image.alt}
                fill
                className="object-cover transition-transform hover:scale-105"
                sizes={
                  viewMode === 'list' ? '96px' : '(max-width: 768px) 50vw, 33vw'
                }
              />

              {image.featured && (
                <div className="absolute top-2 left-2">
                  <Star className="w-4 h-4 text-yellow-400 fill-current" />
                </div>
              )}
            </div>

            <div className={cn('p-4', viewMode === 'list' && 'flex-1 py-2')}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-pink-600 bg-pink-50 px-2 py-1 rounded-full">
                  {image.category}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleFavoriteToggle(image.id, !favorites.has(image.id));
                    }}
                    className={cn(
                      'p-1 rounded transition-colors',
                      favorites.has(image.id)
                        ? 'text-pink-600 hover:text-pink-700'
                        : 'text-gray-400 hover:text-gray-600',
                    )}
                  >
                    <Heart
                      className={cn(
                        'w-4 h-4',
                        favorites.has(image.id) && 'fill-current',
                      )}
                    />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleShare(image);
                    }}
                    className="p-1 text-gray-400 hover:text-gray-600 rounded transition-colors"
                  >
                    <Share2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {image.venue && (
                <p className="text-xs text-gray-500 mb-1">
                  📍 {image.venue.name}
                </p>
              )}

              {viewMode !== 'grid' && image.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {image.tags.slice(0, 3).map((tag) => (
                    <span
                      key={tag}
                      className="text-xs text-gray-500 bg-gray-50 px-2 py-0.5 rounded"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Floating Action Button */}
      {favorites.size > 0 && (
        <div className="fixed bottom-6 right-6">
          <button
            onClick={handleInquiry}
            className="bg-pink-600 text-white rounded-full p-4 shadow-lg hover:bg-pink-700 transition-colors flex items-center gap-2"
          >
            <MessageCircle className="w-5 h-5" />
            <span className="hidden sm:inline">
              Ask about {favorites.size} photos
            </span>
            <span className="sm:hidden">{favorites.size}</span>
          </button>
        </div>
      )}

      {/* Image Modal */}
      {selectedImage && (
        <div
          className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedImage(null)}
        >
          <div
            className="relative max-w-4xl max-h-full"
            onClick={(e) => e.stopPropagation()}
          >
            <Image
              src={selectedImage.url}
              alt={selectedImage.alt}
              width={800}
              height={600}
              className="object-contain max-h-screen"
            />

            <div className="absolute bottom-4 left-4 right-4 bg-black bg-opacity-75 text-white p-4 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium">{selectedImage.category}</h3>
                  {selectedImage.venue && (
                    <p className="text-sm opacity-75">
                      📍 {selectedImage.venue.name}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() =>
                      handleFavoriteToggle(
                        selectedImage.id,
                        !favorites.has(selectedImage.id),
                      )
                    }
                    className={cn(
                      'p-2 rounded transition-colors',
                      favorites.has(selectedImage.id)
                        ? 'text-pink-400 hover:text-pink-300'
                        : 'text-white hover:text-gray-300',
                    )}
                  >
                    <Heart
                      className={cn(
                        'w-5 h-5',
                        favorites.has(selectedImage.id) && 'fill-current',
                      )}
                    />
                  </button>
                  <button
                    onClick={() => handleShare(selectedImage)}
                    className="p-2 text-white hover:text-gray-300 rounded transition-colors"
                  >
                    <Share2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>

            <button
              onClick={() => setSelectedImage(null)}
              className="absolute top-4 right-4 text-white hover:text-gray-300 bg-black bg-opacity-50 rounded-full p-2"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CouplePortfolioView;
