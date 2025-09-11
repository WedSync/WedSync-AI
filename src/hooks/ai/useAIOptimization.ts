'use client';

/**
 * AI Optimization Hook
 * Team A: Frontend/UI Development - WS-341
 *
 * Custom hook for managing AI-powered wedding optimization state
 * Handles optimization requests, recommendations, history, and error management
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import type {
  AIOptimization,
  OptimizationRequest,
  AIRecommendation,
  OptimizationHistory,
  UseAIOptimizationReturn,
  RecommendationCriteria,
} from '@/types/ai-wedding-optimization';

/**
 * Custom hook for AI optimization functionality
 * Provides state management and API integration for wedding optimization features
 */
export function useAIOptimization(weddingId: string): UseAIOptimizationReturn {
  const [optimizations, setOptimizations] = useState<AIOptimization[]>([]);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [optimizationHistory, setOptimizationHistory] = useState<
    OptimizationHistory[]
  >([]);
  const [error, setError] = useState<Error | null>(null);

  // Refs for cleanup
  const abortControllerRef = useRef<AbortController | null>(null);

  /**
   * Load optimization history on mount
   */
  useEffect(() => {
    loadOptimizationHistory();
    return () => {
      // Cleanup any ongoing requests
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [weddingId]);

  /**
   * Load optimization history from API
   */
  const loadOptimizationHistory = useCallback(async () => {
    try {
      const response = await fetch(
        `/api/ai/optimization/history?weddingId=${weddingId}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        },
      );

      if (!response.ok) {
        throw new Error('Failed to load optimization history');
      }

      const data = await response.json();
      setOptimizationHistory(data.history || []);
    } catch (err) {
      console.error('Error loading optimization history:', err);
      // Don't set error for history loading failure
    }
  }, [weddingId]);

  /**
   * Start a new AI optimization
   */
  const startOptimization = useCallback(
    async (request: OptimizationRequest) => {
      if (isOptimizing) {
        console.warn('Optimization already in progress');
        return;
      }

      setIsOptimizing(true);
      setError(null);

      // Create abort controller for this request
      const controller = new AbortController();
      abortControllerRef.current = controller;

      try {
        const response = await fetch('/api/ai/optimization/start', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            weddingId,
            request,
          }),
          signal: controller.signal,
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Optimization failed');
        }

        const optimization = await response.json();

        // Add to active optimizations
        setOptimizations((prev) => [...prev, optimization.data]);

        // Add to history
        const historyItem: OptimizationHistory = {
          id: optimization.data.id,
          weddingId,
          timestamp: new Date(),
          request,
          result: optimization.data,
          status: 'completed',
        };

        setOptimizationHistory((prev) => [historyItem, ...prev]);

        // Poll for updates if optimization is still processing
        if (optimization.data.status === 'processing') {
          pollOptimizationStatus(optimization.data.id);
        }
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') {
          console.log('Optimization request aborted');
          return;
        }

        console.error('Optimization error:', err);
        setError(err as Error);
      } finally {
        setIsOptimizing(false);
        abortControllerRef.current = null;
      }
    },
    [weddingId, isOptimizing],
  );

  /**
   * Poll optimization status for long-running optimizations
   */
  const pollOptimizationStatus = useCallback(async (optimizationId: string) => {
    const maxAttempts = 30; // 5 minutes with 10s intervals
    let attempts = 0;

    const poll = async () => {
      try {
        const response = await fetch(
          `/api/ai/optimization/status/${optimizationId}`,
        );

        if (!response.ok) {
          throw new Error('Failed to check optimization status');
        }

        const optimization = await response.json();

        // Update optimization in state
        setOptimizations((prev) =>
          prev.map((opt) =>
            opt.id === optimizationId ? optimization.data : opt,
          ),
        );

        if (
          optimization.data.status === 'completed' ||
          optimization.data.status === 'failed'
        ) {
          return; // Stop polling
        }

        attempts++;
        if (attempts < maxAttempts) {
          setTimeout(poll, 10000); // Poll every 10 seconds
        }
      } catch (err) {
        console.error('Error polling optimization status:', err);
      }
    };

    poll();
  }, []);

  /**
   * Accept an AI recommendation
   */
  const acceptRecommendation = useCallback(
    async (recommendation: AIRecommendation) => {
      try {
        const response = await fetch('/api/ai/recommendations/accept', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            weddingId,
            recommendationId: recommendation.id,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(
            errorData.message || 'Failed to accept recommendation',
          );
        }

        // Update optimization to mark recommendation as accepted
        setOptimizations((prev) =>
          prev.map((opt) => ({
            ...opt,
            recommendations: opt.recommendations.map((rec) =>
              rec.id === recommendation.id
                ? { ...rec, status: 'accepted' as const }
                : rec,
            ),
          })),
        );
      } catch (err) {
        console.error('Error accepting recommendation:', err);
        setError(err as Error);
        throw err; // Re-throw so UI can handle it
      }
    },
    [weddingId],
  );

  /**
   * Decline an AI recommendation
   */
  const declineRecommendation = useCallback(
    (recommendation: AIRecommendation, reason?: string) => {
      try {
        // Send decline feedback to API (fire and forget)
        fetch('/api/ai/recommendations/decline', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            weddingId,
            recommendationId: recommendation.id,
            reason,
          }),
        }).catch((err) =>
          console.error('Error sending decline feedback:', err),
        );

        // Update optimization to mark recommendation as declined
        setOptimizations((prev) =>
          prev.map((opt) => ({
            ...opt,
            recommendations: opt.recommendations.map((rec) =>
              rec.id === recommendation.id
                ? { ...rec, status: 'declined' as const }
                : rec,
            ),
          })),
        );
      } catch (err) {
        console.error('Error declining recommendation:', err);
      }
    },
    [weddingId],
  );

  /**
   * Get personalized recommendations based on criteria
   */
  const getPersonalizedRecommendations = useCallback(
    async (criteria: RecommendationCriteria): Promise<AIRecommendation[]> => {
      try {
        const response = await fetch('/api/ai/recommendations/personalized', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            weddingId,
            criteria,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(
            errorData.message || 'Failed to get personalized recommendations',
          );
        }

        const data = await response.json();
        return data.recommendations || [];
      } catch (err) {
        console.error('Error getting personalized recommendations:', err);
        setError(err as Error);
        return [];
      }
    },
    [weddingId],
  );

  /**
   * Cancel ongoing optimization
   */
  const cancelOptimization = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsOptimizing(false);
    }
  }, []);

  /**
   * Clear error state
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  /**
   * Remove completed optimization from active list
   */
  const removeOptimization = useCallback((optimizationId: string) => {
    setOptimizations((prev) => prev.filter((opt) => opt.id !== optimizationId));
  }, []);

  /**
   * Get optimization by ID
   */
  const getOptimization = useCallback(
    (optimizationId: string) => {
      return optimizations.find((opt) => opt.id === optimizationId);
    },
    [optimizations],
  );

  /**
   * Get recommendations by category
   */
  const getRecommendationsByCategory = useCallback(
    (category: string) => {
      const allRecommendations = optimizations.flatMap(
        (opt) => opt.recommendations,
      );
      return allRecommendations.filter((rec) => rec.category === category);
    },
    [optimizations],
  );

  /**
   * Get optimization statistics
   */
  const getOptimizationStats = useCallback(() => {
    const totalRecommendations = optimizations.reduce(
      (sum, opt) => sum + opt.recommendations.length,
      0,
    );
    const acceptedRecommendations = optimizations.reduce(
      (sum, opt) =>
        sum +
        opt.recommendations.filter((rec) => rec.status === 'accepted').length,
      0,
    );
    const totalSavings = optimizations.reduce(
      (sum, opt) =>
        sum +
        opt.recommendations.reduce(
          (recSum, rec) => recSum + rec.potentialSavings,
          0,
        ),
      0,
    );
    const acceptedSavings = optimizations.reduce(
      (sum, opt) =>
        sum +
        opt.recommendations
          .filter((rec) => rec.status === 'accepted')
          .reduce((recSum, rec) => recSum + rec.potentialSavings, 0),
      0,
    );

    return {
      totalOptimizations: optimizations.length,
      totalRecommendations,
      acceptedRecommendations,
      acceptanceRate:
        totalRecommendations > 0
          ? (acceptedRecommendations / totalRecommendations) * 100
          : 0,
      totalSavings,
      acceptedSavings,
      savingsRate:
        totalSavings > 0 ? (acceptedSavings / totalSavings) * 100 : 0,
    };
  }, [optimizations]);

  return {
    // State
    optimizations,
    isOptimizing,
    optimizationHistory,
    error,

    // Actions
    startOptimization,
    acceptRecommendation,
    declineRecommendation,
    getPersonalizedRecommendations,

    // Utility functions
    cancelOptimization,
    clearError,
    removeOptimization,
    getOptimization,
    getRecommendationsByCategory,
    getOptimizationStats,
  };
}

export default useAIOptimization;
