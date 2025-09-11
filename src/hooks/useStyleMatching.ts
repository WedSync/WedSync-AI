'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import {
  StylePreferences,
  StyleMatch,
  Venue,
  Vendor,
  StyleAnalysis,
} from '@/types/style-matching';

interface UseStyleMatchingOptions {
  autoSave?: boolean;
  debounceMs?: number;
  maxMatches?: number;
}

interface UseStyleMatchingReturn {
  preferences: StylePreferences;
  matches: StyleMatch[];
  analysis: StyleAnalysis | null;
  isLoading: boolean;
  isAnalyzing: boolean;
  error: string | null;

  // Actions
  updatePreferences: (preferences: Partial<StylePreferences>) => void;
  generateMatches: () => Promise<void>;
  analyzePreferences: () => Promise<StyleAnalysis>;
  saveSession: () => Promise<void>;
  loadSession: (sessionId: string) => Promise<void>;
  resetSession: () => void;

  // Utilities
  getMatchScore: (item: Venue | Vendor) => number;
  getStylePersonality: () => string[];
  getRecommendations: () => string[];
}

const defaultPreferences: StylePreferences = {
  categories: [],
  colors: {
    primary: '#8B5CF6',
    secondary: '#EC4899',
    accent: '#F59E0B',
    neutral: '#6B7280',
  },
  preferences: {
    elegance: 50,
    modernity: 50,
    intimacy: 50,
    luxury: 50,
    naturalness: 50,
    boldness: 50,
  },
};

export function useStyleMatching(
  options: UseStyleMatchingOptions = {},
): UseStyleMatchingReturn {
  const { autoSave = false, debounceMs = 500, maxMatches = 50 } = options;

  const [preferences, setPreferences] =
    useState<StylePreferences>(defaultPreferences);
  const [matches, setMatches] = useState<StyleMatch[]>([]);
  const [analysis, setAnalysis] = useState<StyleAnalysis | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Update preferences with debouncing
  const updatePreferences = useCallback(
    (updates: Partial<StylePreferences>) => {
      setPreferences((prev) => ({
        ...prev,
        ...updates,
        colors: updates.colors
          ? { ...prev.colors, ...updates.colors }
          : prev.colors,
        preferences: updates.preferences
          ? { ...prev.preferences, ...updates.preferences }
          : prev.preferences,
      }));
    },
    [],
  );

  // Generate style matches based on current preferences
  const generateMatches = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/directory/style-matching/matches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          preferences,
          maxResults: maxMatches,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate style matches');
      }

      const data = await response.json();
      setMatches(data.matches || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setIsLoading(false);
    }
  }, [preferences, maxMatches]);

  // Analyze current preferences
  const analyzePreferences = useCallback(async (): Promise<StyleAnalysis> => {
    setIsAnalyzing(true);
    setError(null);

    try {
      const response = await fetch('/api/directory/style-matching/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ preferences }),
      });

      if (!response.ok) {
        throw new Error('Failed to analyze preferences');
      }

      const analysisData = await response.json();
      setAnalysis(analysisData);
      return analysisData;
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Analysis failed';
      setError(error);
      throw new Error(error);
    } finally {
      setIsAnalyzing(false);
    }
  }, [preferences]);

  // Save current session
  const saveSession = useCallback(async () => {
    try {
      await fetch('/api/directory/style-matching/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          preferences,
          matches,
          analysis,
        }),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save session');
    }
  }, [preferences, matches, analysis]);

  // Load existing session
  const loadSession = useCallback(async (sessionId: string) => {
    setIsLoading(true);
    try {
      const response = await fetch(
        `/api/directory/style-matching/sessions/${sessionId}`,
      );

      if (!response.ok) {
        throw new Error('Failed to load session');
      }

      const data = await response.json();
      setPreferences(data.preferences || defaultPreferences);
      setMatches(data.matches || []);
      setAnalysis(data.analysis || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load session');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Reset session to defaults
  const resetSession = useCallback(() => {
    setPreferences(defaultPreferences);
    setMatches([]);
    setAnalysis(null);
    setError(null);
  }, []);

  // Calculate match score for any venue/vendor
  const getMatchScore = useCallback(
    (item: Venue | Vendor): number => {
      // Simplified matching algorithm - in real app would be more sophisticated
      let score = 70;

      // Style category matching
      if (preferences.categories.length > 0) {
        // Add logic for category matching
        score += 10;
      }

      // Color harmony matching
      // Add logic for color matching based on preferences.colors
      score += 5;

      // Preference alignment
      const prefSum =
        Object.values(preferences.preferences).reduce(
          (sum, val) => sum + val,
          0,
        ) / 6;
      score += Math.round(prefSum * 0.2);

      return Math.min(100, Math.max(60, score));
    },
    [preferences],
  );

  // Generate style personality based on preferences
  const getStylePersonality = useCallback((): string[] => {
    const { elegance, modernity, intimacy, luxury, naturalness, boldness } =
      preferences.preferences;
    const personality: string[] = [];

    if (elegance > 70) personality.push('Sophisticated');
    if (modernity > 70) personality.push('Contemporary');
    if (intimacy > 70) personality.push('Intimate');
    if (luxury > 70) personality.push('Luxurious');
    if (naturalness > 70) personality.push('Natural');
    if (boldness > 70) personality.push('Dramatic');

    if (personality.length === 0) personality.push('Balanced');

    return personality;
  }, [preferences.preferences]);

  // Get style recommendations
  const getRecommendations = useCallback((): string[] => {
    const recommendations: string[] = [];
    const { elegance, modernity, luxury, naturalness } =
      preferences.preferences;

    if (elegance > 80) {
      recommendations.push(
        'Consider classic venues with architectural details',
      );
    }

    if (naturalness > 80) {
      recommendations.push('Look for outdoor venues with garden settings');
    }

    if (luxury > 80) {
      recommendations.push('Explore premium vendors with high-end services');
    }

    if (modernity > 80) {
      recommendations.push('Search for contemporary venues with clean lines');
    }

    if (preferences.categories.includes('boho-chic')) {
      recommendations.push(
        'Consider vendors who specialize in natural, relaxed aesthetics',
      );
    }

    return recommendations;
  }, [preferences]);

  // Auto-save functionality
  useEffect(() => {
    if (autoSave && preferences !== defaultPreferences) {
      const timer = setTimeout(() => {
        saveSession();
      }, debounceMs);

      return () => clearTimeout(timer);
    }
  }, [preferences, autoSave, debounceMs, saveSession]);

  // Auto-analyze when preferences change significantly
  useEffect(() => {
    if (preferences.categories.length > 0) {
      const timer = setTimeout(() => {
        analyzePreferences();
      }, debounceMs);

      return () => clearTimeout(timer);
    }
  }, [
    preferences.categories,
    preferences.colors,
    analyzePreferences,
    debounceMs,
  ]);

  return {
    preferences,
    matches,
    analysis,
    isLoading,
    isAnalyzing,
    error,

    updatePreferences,
    generateMatches,
    analyzePreferences,
    saveSession,
    loadSession,
    resetSession,

    getMatchScore,
    getStylePersonality,
    getRecommendations,
  };
}
