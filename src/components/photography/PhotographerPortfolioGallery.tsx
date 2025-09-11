'use client';

// WS-130: AI-Powered Photography Library - Portfolio Gallery
// Team C Batch 10 Round 1

import React, { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import {
  Camera,
  Eye,
  Heart,
  Star,
  MapPin,
  Calendar,
  Filter,
  Grid,
  List,
  Sparkles,
  Palette,
  Layers,
  Download,
  Share2,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button-untitled';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { PortfolioGallery } from '@/components/portfolio/PortfolioGallery';

// Types for photographer portfolio data
export interface PhotographerProfile {
  id: string;
  name: string;
  bio: string;
  specialties: string[];
  location: string;
  experience_years: number;
  starting_price: number;
  rating: number;
  review_count: number;
  portfolio_url?: string;
  contact_email: string;
  contact_phone?: string;
  instagram_handle?: string;
  website_url?: string;
  availability_status: 'available' | 'busy' | 'booked';
  preferred_styles: string[];
  equipment_list: string[];
  travel_radius_km: number;
  created_at: string;
  updated_at: string;
}

export interface PhotographyStyle {
  id: string;
  name: string;
  description: string;
  characteristics: string[];
  color_palette: string[];
  mood_tags: string[];
  example_keywords: string[];
  created_at: string;
}

export interface PhotoStyleAnalysis {
  id: string;
  photo_id: string;
  detected_styles: Array<{
    style_name: string;
    confidence: number;
    style_id: string;
  }>;
  color_analysis: {
    dominant_colors: string[];
    color_harmony: string;
    saturation_level: string;
    brightness_level: string;
  };
  composition_analysis: {
    rule_of_thirds: boolean;
    leading_lines: boolean;
    symmetry: boolean;
    depth_of_field: string;
  };
  mood_analysis: {
    mood_tags: string[];
    emotion_score: number;
    energy_level: string;
  };
  technical_analysis: {
    lighting_quality: string;
    focus_quality: string;
    composition_score: number;
  };
  created_at: string;
}

export interface PortfolioPhoto {
  id: string;
  portfolio_gallery_id: string;
  photo_id: string;
  title?: string;
  description?: string;
  photo_url: string;
  thumbnail_url?: string;
  style_analysis?: PhotoStyleAnalysis;
  tags: string[];
  event_type?: string;
  location?: string;
  taken_date?: string;
  display_order: number;
  is_featured: boolean;
  created_at: string;
}

export interface PortfolioGalleryData {
  id: string;
  photographer_id: string;
  name: string;
  description?: string;
  gallery_type:
    | 'wedding'
    | 'portrait'
    | 'commercial'
    | 'event'
    | 'lifestyle'
    | 'mixed';
  style_focus: string[];
  cover_photo_url?: string;
  is_public: boolean;
  is_featured: boolean;
  view_count: number;
  photos?: PortfolioPhoto[];
  photographer?: PhotographerProfile;
  created_at: string;
  updated_at: string;
}

interface PhotographerPortfolioGalleryProps {
  photographerId?: string;
  galleryId?: string;
  styleFilter?: string[];
  showStyleAnalysis?: boolean;
  showPhotographerInfo?: boolean;
  layoutMode?: 'grid' | 'masonry' | 'carousel';
  onPhotographerSelect?: (photographer: PhotographerProfile) => void;
  onPhotoSelect?: (photo: PortfolioPhoto) => void;
  className?: string;
}

type ViewMode = 'galleries' | 'photos';
type AnalysisMode = 'none' | 'style' | 'technical' | 'mood';

export function PhotographerPortfolioGallery({
  photographerId,
  galleryId,
  styleFilter = [],
  showStyleAnalysis = true,
  showPhotographerInfo = true,
  layoutMode = 'masonry',
  onPhotographerSelect,
  onPhotoSelect,
  className = '',
}: PhotographerPortfolioGalleryProps) {
  // State management
  const [viewMode, setViewMode] = useState<ViewMode>(
    galleryId ? 'photos' : 'galleries',
  );
  const [galleries, setGalleries] = useState<PortfolioGalleryData[]>([]);
  const [photos, setPhotos] = useState<PortfolioPhoto[]>([]);
  const [photographer, setPhotographer] = useState<PhotographerProfile | null>(
    null,
  );
  const [styles, setStyles] = useState<PhotographyStyle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter and display states
  const [selectedStyles, setSelectedStyles] = useState<string[]>(styleFilter);
  const [analysisMode, setAnalysisMode] = useState<AnalysisMode>('style');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPhoto, setSelectedPhoto] = useState<PortfolioPhoto | null>(
    null,
  );
  const [galleryModalOpen, setGalleryModalOpen] = useState(false);

  // Load data
  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      if (photographerId && !galleryId) {
        // Load photographer's galleries
        const response = await fetch(
          `/api/photography/photographers/${photographerId}/galleries`,
        );
        if (!response.ok) throw new Error('Failed to load galleries');

        const data = await response.json();
        setGalleries(data.galleries);
        setPhotographer(data.photographer);
      } else if (galleryId) {
        // Load specific gallery photos
        const response = await fetch(
          `/api/photography/galleries/${galleryId}/photos`,
        );
        if (!response.ok) throw new Error('Failed to load photos');

        const data = await response.json();
        setPhotos(data.photos);
        setPhotographer(data.photographer);
      } else {
        // Load all galleries/featured photographers
        const response = await fetch('/api/photography/galleries/featured');
        if (!response.ok) throw new Error('Failed to load featured galleries');

        const data = await response.json();
        setGalleries(data.galleries);
      }

      // Load photography styles for filtering
      const stylesResponse = await fetch('/api/photography/styles');
      if (stylesResponse.ok) {
        const stylesData = await stylesResponse.json();
        setStyles(stylesData.styles);
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to load portfolio data',
      );
    } finally {
      setLoading(false);
    }
  }, [photographerId, galleryId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Filter photos based on style and search
  const filteredPhotos = photos.filter((photo) => {
    const matchesSearch =
      !searchQuery ||
      photo.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      photo.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      photo.tags.some((tag) =>
        tag.toLowerCase().includes(searchQuery.toLowerCase()),
      );

    const matchesStyle =
      selectedStyles.length === 0 ||
      selectedStyles.some((style) =>
        photo.style_analysis?.detected_styles.some(
          (detected) =>
            detected.style_name.toLowerCase() === style.toLowerCase(),
        ),
      );

    return matchesSearch && matchesStyle;
  });

  const handlePhotoClick = (photo: PortfolioPhoto) => {
    setSelectedPhoto(photo);
    if (onPhotoSelect) {
      onPhotoSelect(photo);
    }
  };

  const handleGalleryClick = (gallery: PortfolioGalleryData) => {
    setGalleryModalOpen(true);
    // Would typically navigate to gallery view or open modal
  };

  const renderStyleAnalysis = (analysis: PhotoStyleAnalysis) => {
    if (!showStyleAnalysis) return null;

    return (
      <div className="absolute inset-0 bg-black/80 opacity-0 hover:opacity-100 transition-opacity p-3 text-white text-xs">
        <div className="space-y-2">
          {analysisMode === 'style' && (
            <div>
              <div className="font-semibold mb-1">Detected Styles:</div>
              {analysis.detected_styles.slice(0, 3).map((style, idx) => (
                <div key={idx} className="flex justify-between">
                  <span>{style.style_name}</span>
                  <span>{Math.round(style.confidence * 100)}%</span>
                </div>
              ))}
            </div>
          )}

          {analysisMode === 'technical' && (
            <div>
              <div className="font-semibold mb-1">Technical Analysis:</div>
              <div>
                Lighting: {analysis.technical_analysis.lighting_quality}
              </div>
              <div>Focus: {analysis.technical_analysis.focus_quality}</div>
              <div>
                Score:{' '}
                {Math.round(analysis.technical_analysis.composition_score)}/10
              </div>
            </div>
          )}

          {analysisMode === 'mood' && (
            <div>
              <div className="font-semibold mb-1">Mood Analysis:</div>
              <div>Energy: {analysis.mood_analysis.energy_level}</div>
              <div className="flex flex-wrap gap-1 mt-1">
                {analysis.mood_analysis.mood_tags
                  .slice(0, 4)
                  .map((tag, idx) => (
                    <span
                      key={idx}
                      className="bg-white/20 px-1 rounded text-xs"
                    >
                      {tag}
                    </span>
                  ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-error-50 border border-error-200 rounded-lg p-4">
        <p className="text-error-700">{error}</p>
        <button
          onClick={loadData}
          className="mt-2 text-error-600 hover:text-error-700 underline"
        >
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <h2 className="text-display-sm font-bold text-gray-900 flex items-center gap-2">
            <Camera className="h-6 w-6" />
            {photographer ? photographer.name : 'Photography Portfolio'}
          </h2>

          {showStyleAnalysis && (
            <div className="flex items-center bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setAnalysisMode('style')}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${
                  analysisMode === 'style'
                    ? 'bg-white text-gray-900 shadow-xs'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Palette className="h-4 w-4 mr-1 inline" />
                Style
              </button>
              <button
                onClick={() => setAnalysisMode('technical')}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${
                  analysisMode === 'technical'
                    ? 'bg-white text-gray-900 shadow-xs'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Layers className="h-4 w-4 mr-1 inline" />
                Technical
              </button>
              <button
                onClick={() => setAnalysisMode('mood')}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${
                  analysisMode === 'mood'
                    ? 'bg-white text-gray-900 shadow-xs'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Sparkles className="h-4 w-4 mr-1 inline" />
                Mood
              </button>
            </div>
          )}
        </div>

        <div className="flex items-center space-x-3">
          {photographer && showPhotographerInfo && (
            <Button
              onClick={() => onPhotographerSelect?.(photographer)}
              variant="outline"
              className="flex items-center gap-2"
            >
              <ExternalLink className="h-4 w-4" />
              View Profile
            </Button>
          )}
        </div>
      </div>

      {/* Photographer Info */}
      {photographer && showPhotographerInfo && (
        <Card>
          <CardContent className="p-6">
            <div className="flex items-start gap-6">
              <div className="flex-1">
                <div className="flex items-center gap-4 mb-4">
                  <div>
                    <h3 className="text-lg font-semibold">
                      {photographer.name}
                    </h3>
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <div className="flex items-center gap-1">
                        <MapPin className="h-4 w-4" />
                        {photographer.location}
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        {photographer.experience_years} years experience
                      </div>
                      <div className="flex items-center gap-1">
                        <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                        {photographer.rating} ({photographer.review_count}{' '}
                        reviews)
                      </div>
                    </div>
                  </div>
                </div>

                <p className="text-gray-700 mb-4">{photographer.bio}</p>

                <div className="flex flex-wrap gap-2 mb-4">
                  {photographer.specialties.map((specialty, idx) => (
                    <Badge key={idx} variant="secondary">
                      {specialty}
                    </Badge>
                  ))}
                </div>

                <div className="flex items-center gap-4 text-sm">
                  <span className="text-gray-600">Starting from</span>
                  <span className="font-semibold">
                    ${photographer.starting_price.toLocaleString()}
                  </span>
                  <Badge
                    variant={
                      photographer.availability_status === 'available'
                        ? 'success'
                        : 'secondary'
                    }
                  >
                    {photographer.availability_status}
                  </Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <div className="flex items-center justify-between bg-white border border-gray-200 rounded-xl p-4">
        <div className="flex items-center space-x-4">
          {/* Search */}
          <input
            type="text"
            placeholder="Search photos..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-64 px-3.5 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 shadow-xs focus:outline-none focus:ring-4 focus:ring-primary-100 focus:border-primary-300"
          />

          {/* Style filters */}
          <div className="flex flex-wrap gap-2">
            {styles.slice(0, 6).map((style) => (
              <Button
                key={style.id}
                variant={
                  selectedStyles.includes(style.name) ? 'primary' : 'outline'
                }
                size="sm"
                onClick={() => {
                  setSelectedStyles((prev) =>
                    prev.includes(style.name)
                      ? prev.filter((s) => s !== style.name)
                      : [...prev, style.name],
                  );
                }}
              >
                {style.name}
              </Button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">
            {filteredPhotos.length} photos
          </span>
        </div>
      </div>

      {/* Content */}
      {viewMode === 'galleries' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {galleries.map((gallery) => (
            <Card
              key={gallery.id}
              className="cursor-pointer hover:shadow-lg transition-shadow"
            >
              <div className="relative aspect-[4/3] overflow-hidden rounded-t-lg">
                <Image
                  src={gallery.cover_photo_url || '/placeholder-gallery.jpg'}
                  alt={gallery.name}
                  fill
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                <div className="absolute bottom-4 left-4 right-4 text-white">
                  <h3 className="font-semibold text-lg mb-1">{gallery.name}</h3>
                  <p className="text-sm opacity-90">
                    {gallery.photos?.length || 0} photos
                  </p>
                </div>
                <div className="absolute top-4 right-4">
                  <Badge variant="secondary" className="bg-black/50 text-white">
                    {gallery.gallery_type}
                  </Badge>
                </div>
              </div>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex flex-wrap gap-1">
                    {gallery.style_focus.slice(0, 3).map((style, idx) => (
                      <Badge key={idx} variant="outline" className="text-xs">
                        {style}
                      </Badge>
                    ))}
                  </div>
                  <div className="flex items-center gap-1 text-sm text-gray-600">
                    <Eye className="h-4 w-4" />
                    {gallery.view_count}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div
          className={
            layoutMode === 'masonry'
              ? 'columns-2 md:columns-3 lg:columns-4 gap-4 space-y-4'
              : layoutMode === 'grid'
                ? 'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4'
                : 'flex overflow-x-auto gap-4 pb-4'
          }
        >
          {filteredPhotos.map((photo) => (
            <div
              key={photo.id}
              className={`relative group cursor-pointer ${
                layoutMode === 'masonry' ? 'break-inside-avoid mb-4' : ''
              }`}
              onClick={() => handlePhotoClick(photo)}
            >
              <div className="relative overflow-hidden rounded-lg">
                <Image
                  src={photo.thumbnail_url || photo.photo_url}
                  alt={photo.title || 'Portfolio photo'}
                  width={layoutMode === 'carousel' ? 400 : 300}
                  height={layoutMode === 'carousel' ? 300 : 200}
                  className="w-full h-auto object-cover transition-transform group-hover:scale-105"
                />

                {/* AI Analysis Overlay */}
                {photo.style_analysis &&
                  renderStyleAnalysis(photo.style_analysis)}

                {/* Photo Info */}
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3 opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="text-white">
                    {photo.title && (
                      <h4 className="font-medium text-sm mb-1">
                        {photo.title}
                      </h4>
                    )}
                    <div className="flex items-center gap-2 text-xs">
                      {photo.event_type && (
                        <Badge
                          variant="secondary"
                          className="bg-black/50 text-white text-xs"
                        >
                          {photo.event_type}
                        </Badge>
                      )}
                      {photo.location && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {photo.location}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Style confidence indicators */}
                {photo.style_analysis && showStyleAnalysis && (
                  <div className="absolute top-2 left-2 flex gap-1">
                    {photo.style_analysis.detected_styles
                      .slice(0, 2)
                      .map((style, idx) => (
                        <div
                          key={idx}
                          className="bg-black/70 text-white text-xs px-2 py-1 rounded-full"
                        >
                          {style.style_name}{' '}
                          {Math.round(style.confidence * 100)}%
                        </div>
                      ))}
                  </div>
                )}

                {photo.is_featured && (
                  <div className="absolute top-2 right-2">
                    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty States */}
      {filteredPhotos.length === 0 && photos.length > 0 && (
        <div className="text-center py-12">
          <Filter className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No photos match your filters
          </h3>
          <p className="text-gray-500">
            Try adjusting your search or style filters.
          </p>
        </div>
      )}

      {photos.length === 0 && galleries.length === 0 && (
        <div className="text-center py-12">
          <Camera className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No portfolio content found
          </h3>
          <p className="text-gray-500">
            This photographer hasn't uploaded any portfolio content yet.
          </p>
        </div>
      )}
    </div>
  );
}
