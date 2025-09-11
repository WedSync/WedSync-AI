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
  Info
} from 'lucide-react';
import { Button } from '@/components/ui/button-untitled';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import type { 
  PhotoStyleAnalysis, 
  PhotographyStyle, 
  PortfolioPhoto,
  PhotographerProfile 
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

type SortMode = 'match_score' | 'style_confidence' | 'photographer_rating' | 'recent';
type ViewMode = 'grid' | 'list' | 'comparison';

export function StyleMatchingGallery({
  targetStyles = [],
  stylePreferences,
  minMatchScore = 0.6,
  maxResults = 50,
  showMatchDetails = true,
  onPhotoSelect,
  onPhotographerSelect,
  className = ''
}: StyleMatchingGalleryProps) {
  // State management
  const [matches, setMatches] = useState<StyleMatch[]>([]);
  const [filteredMatches, setFilteredMatches] = useState<StyleMatch[]>([]);
  const [availableStyles, setAvailableStyles] = useState<PhotographyStyle[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Filter and display states
  const [selectedStyles, setSelectedStyles] = useState<string[]>(targetStyles);
  const [sortMode, setSortMode] = useState<SortMode>('match_score');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [minScore, setMinScore] = useState(minMatchScore);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedPhotographers, setSelectedPhotographers] = useState<string[]>([]);

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
        sortBy: sortMode
      });

      if (stylePreferences) {
        searchParams.set('preferences', JSON.stringify(stylePreferences));
      }

      const response = await fetch(`/api/photography/style-matches?${searchParams}`);
      
      if (!response.ok) {
        throw new Error('Failed to search for style matches');
      }

      const data = await response.json();
      setMatches(data.matches);
      setFilteredMatches(data.matches);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to search for matches');
    } finally {
      setLoading(false);
    }
  }, [selectedStyles, stylePreferences, minScore, maxResults, sortMode]);

  // Filter matches based on additional criteria
  const applyFilters = useCallback(() => {
    let filtered = [...matches];

    // Filter by photographer
    if (selectedPhotographers.length > 0) {
      filtered = filtered.filter(match => 
        selectedPhotographers.includes(match.photographer.id)
      );
    }

    // Filter by color palette
    if (colorFilter.length > 0) {
      filtered = filtered.filter(match => 
        match.photo.style_analysis?.color_analysis.dominant_colors.some(color =>
          colorFilter.some(filterColor => 
            color.toLowerCase().includes(filterColor.toLowerCase())
          )
        )
      );
    }

    // Filter by mood
    if (moodFilter.length > 0) {
      filtered = filtered.filter(match => 
        match.photo.style_analysis?.mood_analysis.mood_tags.some(mood =>
          moodFilter.includes(mood)
        )
      );
    }

    // Filter by price range
    filtered = filtered.filter(match => 
      match.photographer.starting_price >= priceRange[0] && 
      match.photographer.starting_price <= priceRange[1]
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
    setSelectedStyles(prev => 
      prev.includes(styleName)
        ? prev.filter(s => s !== styleName)
        : [...prev, styleName]
    );
  };

  const handlePhotoClick = (match: StyleMatch) => {
    if (onPhotoSelect) {
      onPhotoSelect(match.photo, match);
    }
  };

  const renderMatchScore = (match: StyleMatch) => {
    const scoreColor = match.matchScore >= 0.8 ? 'text-green-600' : 
                     match.matchScore >= 0.6 ? 'text-yellow-600' : 'text-gray-600';
    
    return (
      <div className="flex items-center gap-2">
        <div className={`text-sm font-semibold ${scoreColor}`}>
          {Math.round(match.matchScore * 100)}%
        </div>
        <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
          <div 
            className={`h-full transition-all ${
              match.matchScore >= 0.8 ? 'bg-green-500' : 
              match.matchScore >= 0.6 ? 'bg-yellow-500' : 'bg-gray-500'
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
    new Set(matches.map(m => m.photographer.id))
  ).map(id => matches.find(m => m.photographer.id === id)!.photographer);

  if (selectedStyles.length === 0) {
    return (
      <div className={`space-y-6 ${className}`}>
        <div className="text-center py-12">
          <Palette className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Select Photography Styles</h3>
          <p className="text-gray-500 mb-6">Choose one or more styles to find matching photos</p>
          
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
              <Badge key={style} variant="primary" className="flex items-center gap-1">
                {style}
                <button
                  onClick={() => handleStyleToggle(style)}
                  className="hover:bg-primary-700 rounded-full p-0.5"
                >
