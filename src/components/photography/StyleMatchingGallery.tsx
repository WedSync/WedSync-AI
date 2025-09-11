'use client';

// WS-130: AI-Powered Photography Library - Style Matching Gallery
// Team C Batch 10 Round 1

import React, { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import {
  Palette,
  Sparkles,
  Target,
  TrendingUp,
  Eye,
  Heart,
  Star,
  Filter,
  RefreshCw,
  Sliders,
  Grid,
  List,
  ChevronDown,
  ChevronRight,
  Info,
} from 'lucide-react';
import { Button } from '@/components/ui/button-untitled';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import type {
  PhotoStyleAnalysis,
  PhotographyStyle,
  PortfolioPhoto,
  PhotographerProfile,
} from './PhotographerPortfolioGallery';

interface StyleMatch {
  photo: PortfolioPhoto;
  photographer: PhotographerProfile;
  matchScore: number;
  matchingStyles: Array<{
    style_name: string;
    confidence: number;
    target_confidence: number;
  }>;
  colorMatch: number;
  moodMatch: number;
  technicalMatch: number;
}

interface StylePreferences {
  styles: string[];
  colorPalette?: string[];
  moodTags?: string[];
  technicalRequirements?: {
    lighting?: string;
    composition?: string;
    focus?: string;
  };
  minConfidence?: number;
}

interface StyleMatchingGalleryProps {
  targetStyles?: string[];
  stylePreferences?: StylePreferences;
  minMatchScore?: number;
  maxResults?: number;
  showMatchDetails?: boolean;
  onPhotoSelect?: (photo: PortfolioPhoto, matchDetails: StyleMatch) => void;
  onPhotographerSelect?: (photographer: PhotographerProfile) => void;
  className?: string;
}

type SortMode =
  | 'match_score'
  | 'style_confidence'
  | 'photographer_rating'
  | 'recent';
type ViewMode = 'grid' | 'list' | 'comparison';

export function StyleMatchingGallery({
  targetStyles = [],
  stylePreferences,
  minMatchScore = 0.6,
  maxResults = 50,
  showMatchDetails = true,
  onPhotoSelect,
  onPhotographerSelect,
  className = '',
}: StyleMatchingGalleryProps) {
  // State management
  const [matches, setMatches] = useState<StyleMatch[]>([]);
  const [filteredMatches, setFilteredMatches] = useState<StyleMatch[]>([]);
  const [availableStyles, setAvailableStyles] = useState<PhotographyStyle[]>(
    [],
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filter and display states
  const [selectedStyles, setSelectedStyles] = useState<string[]>(targetStyles);
  const [sortMode, setSortMode] = useState<SortMode>('match_score');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [minScore, setMinScore] = useState(minMatchScore);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedPhotographers, setSelectedPhotographers] = useState<string[]>(
    [],
  );

  // Advanced filters
  const [colorFilter, setColorFilter] = useState<string[]>([]);
  const [moodFilter, setMoodFilter] = useState<string[]>([]);
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 10000]);

  // Load available styles
  const loadStyles = useCallback(async () => {
    try {
      const response = await fetch('/api/photography/styles');
      if (response.ok) {
        const data = await response.json();
        setAvailableStyles(data.styles);
      }
    } catch (err) {
      console.warn('Failed to load styles:', err);
    }
  }, []);

  // Search for style matches
  const searchMatches = useCallback(async () => {
    if (selectedStyles.length === 0) {
      setMatches([]);
      setFilteredMatches([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const searchParams = new URLSearchParams({
        styles: JSON.stringify(selectedStyles),
        minScore: minScore.toString(),
        maxResults: maxResults.toString(),
        sortBy: sortMode,
      });

      if (stylePreferences) {
        searchParams.set('preferences', JSON.stringify(stylePreferences));
      }

      const response = await fetch(
        `/api/photography/style-matches?${searchParams}`,
      );

      if (!response.ok) {
        throw new Error('Failed to search for style matches');
      }

      const data = await response.json();
      setMatches(data.matches);
      setFilteredMatches(data.matches);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to search for matches',
      );
    } finally {
      setLoading(false);
    }
  }, [selectedStyles, stylePreferences, minScore, maxResults, sortMode]);

  // Filter matches based on additional criteria
  const applyFilters = useCallback(() => {
    let filtered = [...matches];

    // Filter by photographer
    if (selectedPhotographers.length > 0) {
      filtered = filtered.filter((match) =>
        selectedPhotographers.includes(match.photographer.id),
      );
    }

    // Filter by color palette
    if (colorFilter.length > 0) {
      filtered = filtered.filter((match) =>
        match.photo.style_analysis?.color_analysis.dominant_colors.some(
          (color) =>
            colorFilter.some((filterColor) =>
              color.toLowerCase().includes(filterColor.toLowerCase()),
            ),
        ),
      );
    }

    // Filter by mood
    if (moodFilter.length > 0) {
      filtered = filtered.filter((match) =>
        match.photo.style_analysis?.mood_analysis.mood_tags.some((mood) =>
          moodFilter.includes(mood),
        ),
      );
    }

    // Filter by price range
    filtered = filtered.filter(
      (match) =>
        match.photographer.starting_price >= priceRange[0] &&
        match.photographer.starting_price <= priceRange[1],
    );

    setFilteredMatches(filtered);
  }, [matches, selectedPhotographers, colorFilter, moodFilter, priceRange]);

  useEffect(() => {
    loadStyles();
  }, [loadStyles]);

  useEffect(() => {
    searchMatches();
  }, [searchMatches]);

  useEffect(() => {
    applyFilters();
  }, [applyFilters]);

  const handleStyleToggle = (styleName: string) => {
    setSelectedStyles((prev) =>
      prev.includes(styleName)
        ? prev.filter((s) => s !== styleName)
        : [...prev, styleName],
    );
  };

  const handlePhotoClick = (match: StyleMatch) => {
    if (onPhotoSelect) {
      onPhotoSelect(match.photo, match);
    }
  };

  const renderMatchScore = (match: StyleMatch) => {
    const scoreColor =
      match.matchScore >= 0.8
        ? 'text-green-600'
        : match.matchScore >= 0.6
          ? 'text-yellow-600'
          : 'text-gray-600';

    return (
      <div className="flex items-center gap-2">
        <div className={`text-sm font-semibold ${scoreColor}`}>
          {Math.round(match.matchScore * 100)}%
        </div>
        <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all ${
              match.matchScore >= 0.8
                ? 'bg-green-500'
                : match.matchScore >= 0.6
                  ? 'bg-yellow-500'
                  : 'bg-gray-500'
            }`}
            style={{ width: `${match.matchScore * 100}%` }}
          />
        </div>
      </div>
    );
  };

  const renderMatchDetails = (match: StyleMatch) => {
    if (!showMatchDetails) return null;

    return (
      <div className="space-y-2 text-xs">
        <div>
          <div className="font-medium mb-1">Style Matches:</div>
          {match.matchingStyles.slice(0, 3).map((style, idx) => (
            <div key={idx} className="flex justify-between">
              <span>{style.style_name}</span>
              <span>{Math.round(style.confidence * 100)}%</span>
            </div>
          ))}
        </div>

        <div className="flex justify-between text-gray-600">
          <span>Color: {Math.round(match.colorMatch * 100)}%</span>
          <span>Mood: {Math.round(match.moodMatch * 100)}%</span>
          <span>Tech: {Math.round(match.technicalMatch * 100)}%</span>
        </div>
      </div>
    );
  };

  const uniquePhotographers = Array.from(
    new Set(matches.map((m) => m.photographer.id)),
  ).map((id) => matches.find((m) => m.photographer.id === id)!.photographer);

  if (selectedStyles.length === 0) {
    return (
      <div className={`space-y-6 ${className}`}>
        <div className="text-center py-12">
          <Palette className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Select Photography Styles
          </h3>
          <p className="text-gray-500 mb-6">
            Choose one or more styles to find matching photos
          </p>

          <div className="flex flex-wrap gap-2 justify-center max-w-2xl mx-auto">
            {availableStyles.map((style) => (
              <Button
                key={style.id}
                variant="outline"
                onClick={() => handleStyleToggle(style.name)}
                className="flex items-center gap-2"
              >
                <Sparkles className="h-4 w-4" />
                {style.name}
              </Button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h2 className="text-display-sm font-bold text-gray-900 flex items-center gap-2">
            <Target className="h-6 w-6" />
            Style Matches
          </h2>

          <div className="flex items-center gap-2">
            {selectedStyles.map((style) => (
              <Badge
                key={style}
                variant="primary"
                className="flex items-center gap-1"
              >
                {style}
                <button
                  onClick={() => handleStyleToggle(style)}
                  className="hover:bg-primary-700 rounded-full p-0.5"
                >
                  ✕
                </button>
              </Badge>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2"
          >
            <Sliders className="h-4 w-4" />
            Filters
            {showFilters ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </Button>

          <Button
            onClick={searchMatches}
            disabled={loading}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Advanced Filters */}
      {showFilters && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Advanced Filters</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Match Score Threshold */}
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Minimum Match Score: {Math.round(minScore * 100)}%
                </label>
                <Slider
                  value={[minScore]}
                  onValueChange={(value) => setMinScore(value[0])}
                  min={0}
                  max={1}
                  step={0.1}
                  className="w-full"
                />
              </div>

              {/* Price Range */}
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Price Range: ${priceRange[0]} - ${priceRange[1]}
                </label>
                <Slider
                  value={priceRange}
                  onValueChange={(value) => setPriceRange([value[0], value[1]])}
                  min={0}
                  max={20000}
                  step={500}
                  className="w-full"
                />
              </div>

              {/* Sort Mode */}
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Sort By
                </label>
                <select
                  value={sortMode}
                  onChange={(e) => setSortMode(e.target.value as SortMode)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="match_score">Match Score</option>
                  <option value="style_confidence">Style Confidence</option>
                  <option value="photographer_rating">
                    Photographer Rating
                  </option>
                  <option value="recent">Recently Added</option>
                </select>
              </div>
            </div>

            {/* Style Refinement */}
            <div>
              <label className="text-sm font-medium mb-2 block">
                Available Styles
              </label>
              <div className="flex flex-wrap gap-2">
                {availableStyles.map((style) => (
                  <Button
                    key={style.id}
                    variant={
                      selectedStyles.includes(style.name)
                        ? 'primary'
                        : 'outline'
                    }
                    size="sm"
                    onClick={() => handleStyleToggle(style.name)}
                  >
                    {style.name}
                  </Button>
                ))}
              </div>
            </div>

            {/* Photographer Filter */}
            {uniquePhotographers.length > 0 && (
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Photographers
                </label>
                <div className="flex flex-wrap gap-2">
                  {uniquePhotographers.slice(0, 10).map((photographer) => (
                    <Button
                      key={photographer.id}
                      variant={
                        selectedPhotographers.includes(photographer.id)
                          ? 'primary'
                          : 'outline'
                      }
                      size="sm"
                      onClick={() => {
                        setSelectedPhotographers((prev) =>
                          prev.includes(photographer.id)
                            ? prev.filter((id) => id !== photographer.id)
                            : [...prev, photographer.id],
                        );
                      }}
                    >
                      {photographer.name}
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Results Summary */}
      <div className="flex items-center justify-between bg-gray-50 rounded-lg p-4">
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-600">
            Found {filteredMatches.length} matches from{' '}
            {uniquePhotographers.length} photographers
          </span>

          {filteredMatches.length > 0 && (
            <div className="flex items-center gap-2 text-sm">
              <span className="text-gray-600">Avg. match score:</span>
              <span className="font-medium">
                {Math.round(
                  (filteredMatches.reduce((sum, m) => sum + m.matchScore, 0) /
                    filteredMatches.length) *
                    100,
                )}
                %
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant={viewMode === 'grid' ? 'primary' : 'outline'}
            size="sm"
            onClick={() => setViewMode('grid')}
          >
            <Grid className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === 'list' ? 'primary' : 'outline'}
            size="sm"
            onClick={() => setViewMode('list')}
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-error-50 border border-error-200 rounded-lg p-4">
          <p className="text-error-700">{error}</p>
          <button
            onClick={searchMatches}
            className="mt-2 text-error-600 hover:text-error-700 underline"
          >
            Try again
          </button>
        </div>
      )}

      {/* Results */}
      {!loading && !error && (
        <>
          {viewMode === 'grid' ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {filteredMatches.map((match, index) => (
                <Card
                  key={`${match.photo.id}-${index}`}
                  className="cursor-pointer hover:shadow-lg transition-shadow"
                >
                  <div className="relative aspect-[4/3] overflow-hidden rounded-t-lg">
                    <Image
                      src={match.photo.thumbnail_url || match.photo.photo_url}
                      alt={match.photo.title || 'Style match'}
                      fill
                      className="object-cover"
                    />

                    {/* Match score overlay */}
                    <div className="absolute top-2 left-2">
                      <div className="bg-black/80 text-white px-2 py-1 rounded-full text-xs font-medium">
                        {Math.round(match.matchScore * 100)}% match
                      </div>
                    </div>

                    {/* Photographer info */}
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3">
                      <div className="text-white text-sm">
                        <div className="font-medium">
                          {match.photographer.name}
                        </div>
                        <div className="flex items-center gap-1 text-xs opacity-90">
                          <Star className="h-3 w-3 fill-current" />
                          {match.photographer.rating} • $
                          {match.photographer.starting_price.toLocaleString()}
                        </div>
                      </div>
                    </div>
                  </div>

                  <CardContent className="p-4">
                    {renderMatchDetails(match)}
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredMatches.map((match, index) => (
                <Card
                  key={`${match.photo.id}-${index}`}
                  className="cursor-pointer hover:shadow-lg transition-shadow"
                >
                  <CardContent className="p-6">
                    <div className="flex gap-6">
                      <div className="relative w-32 h-24 flex-shrink-0 overflow-hidden rounded-lg">
                        <Image
                          src={
                            match.photo.thumbnail_url || match.photo.photo_url
                          }
                          alt={match.photo.title || 'Style match'}
                          fill
                          className="object-cover"
                        />
                      </div>

                      <div className="flex-1 space-y-3">
                        <div className="flex items-start justify-between">
                          <div>
                            <h4 className="font-medium text-lg">
                              {match.photographer.name}
                            </h4>
                            <p className="text-sm text-gray-600">
                              {match.photo.title || 'Untitled Photo'}
                            </p>
                          </div>
                          {renderMatchScore(match)}
                        </div>

                        <div className="flex flex-wrap gap-2">
                          {match.matchingStyles
                            .slice(0, 4)
                            .map((style, idx) => (
                              <Badge
                                key={idx}
                                variant="secondary"
                                className="text-xs"
                              >
                                {style.style_name} (
                                {Math.round(style.confidence * 100)}%)
                              </Badge>
                            ))}
                        </div>

                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4 text-sm text-gray-600">
                            <span className="flex items-center gap-1">
                              <Star className="h-4 w-4 fill-current text-yellow-400" />
                              {match.photographer.rating}
                            </span>
                            <span>
                              Starting $
                              {match.photographer.starting_price.toLocaleString()}
                            </span>
                            <Badge variant="outline">
                              {match.photographer.availability_status}
                            </Badge>
                          </div>

                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={(e) => {
                                e.stopPropagation();
                                onPhotographerSelect?.(match.photographer);
                              }}
                            >
                              View Profile
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => handlePhotoClick(match)}
                            >
                              View Photo
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Empty State */}
          {filteredMatches.length === 0 && matches.length > 0 && (
            <div className="text-center py-12">
              <Filter className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No matches found with current filters
              </h3>
              <p className="text-gray-500">
                Try adjusting your filters or search criteria.
              </p>
            </div>
          )}

          {matches.length === 0 && !loading && (
            <div className="text-center py-12">
              <Sparkles className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No style matches found
              </h3>
              <p className="text-gray-500">
                Try different styles or adjust your match score threshold.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
