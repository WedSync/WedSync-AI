'use client';

/**
 * Feedback Categories Hook
 * Feature: WS-236 User Feedback System
 * Manages feedback categories data fetching and caching
 */

import { useQuery } from '@tanstack/react-query';

export interface FeedbackCategory {
  id: string;
  name: string;
  description?: string;
  color: string;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

interface FeedbackCategoriesResponse {
  success: boolean;
  data: FeedbackCategory[];
}

async function fetchFeedbackCategories(): Promise<FeedbackCategory[]> {
  const response = await fetch('/api/feedback/categories', {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response
      .json()
      .catch(() => ({ error: 'Failed to fetch categories' }));
    throw new Error(error.error || 'Failed to fetch feedback categories');
  }

  const result: FeedbackCategoriesResponse = await response.json();
  return result.data || [];
}

export function useFeedbackCategories(includeInactive = false) {
  return useQuery({
    queryKey: ['feedback-categories', includeInactive],
    queryFn: fetchFeedbackCategories,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    retry: 2,
    refetchOnWindowFocus: false,
  });
}
