import { useState, useEffect, useCallback, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import { debounce } from 'lodash';

interface BudgetHookOptions {
  weddingId: string;
  enableRealtime?: boolean;
  cacheTimeout?: number;
}

export function useBudgetOptimized({
  weddingId,
  enableRealtime = true,
  cacheTimeout = 300000, // 5 minutes
}: BudgetHookOptions) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  // Memoized cache key
  const cacheKey = useMemo(() => `budget-${weddingId}`, [weddingId]);

  // Debounced data fetcher to prevent excessive API calls
  const debouncedFetch = useCallback(
    debounce(async () => {
      try {
        setLoading(true);
        setError(null);

        // Check cache first
        const cached = sessionStorage.getItem(cacheKey);
        const cacheTimestamp = sessionStorage.getItem(`${cacheKey}-timestamp`);

        if (cached && cacheTimestamp) {
          const age = Date.now() - parseInt(cacheTimestamp);
          if (age < cacheTimeout) {
            setData(JSON.parse(cached));
            setLoading(false);
            return;
          }
        }

        // Fetch fresh data with optimized query
        const { data: budgetData, error: budgetError } = await supabase
          .from('budget_categories')
          .select(
            `
            id,
            name,
            allocated_amount,
            spent_amount,
            color_code,
            icon,
            budget_transactions!inner (
              id,
              amount,
              transaction_date,
              description
            )
          `,
          )
          .eq('wedding_id', weddingId)
          .order('display_order', { ascending: true });

        if (budgetError) throw budgetError;

        // Process and cache data
        const processedData = {
          categories: budgetData || [],
          totalBudget:
            budgetData?.reduce((sum, cat) => sum + cat.allocated_amount, 0) ||
            0,
          totalSpent:
            budgetData?.reduce((sum, cat) => sum + cat.spent_amount, 0) || 0,
          lastUpdated: Date.now(),
        };

        sessionStorage.setItem(cacheKey, JSON.stringify(processedData));
        sessionStorage.setItem(`${cacheKey}-timestamp`, Date.now().toString());

        setData(processedData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
        console.error('Budget fetch error:', err);
      } finally {
        setLoading(false);
      }
    }, 300),
    [weddingId, cacheKey, cacheTimeout],
  );

  // Set up real-time subscription with error handling
  useEffect(() => {
    debouncedFetch();

    if (!enableRealtime) return;

    const subscription = supabase
      .channel(`budget-optimized-${weddingId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'budget_categories',
          filter: `wedding_id=eq.${weddingId}`,
        },
        () => {
          // Invalidate cache and refetch
          sessionStorage.removeItem(cacheKey);
          sessionStorage.removeItem(`${cacheKey}-timestamp`);
          debouncedFetch();
        },
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'budget_transactions',
          filter: `wedding_id=eq.${weddingId}`,
        },
        () => {
          sessionStorage.removeItem(cacheKey);
          debouncedFetch();
        },
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
      debouncedFetch.cancel();
    };
  }, [weddingId, enableRealtime, debouncedFetch, cacheKey]);

  // Optimized update functions
  const updateBudgetCategory = useCallback(
    async (categoryId: string, updates: any) => {
      try {
        const { error } = await supabase
          .from('budget_categories')
          .update(updates)
          .eq('id', categoryId);

        if (error) throw error;

        // Optimistic update
        setData((prev: any) => ({
          ...prev,
          categories: prev.categories.map((cat: any) =>
            cat.id === categoryId ? { ...cat, ...updates } : cat,
          ),
        }));

        // Clear cache to ensure fresh data on next load
        sessionStorage.removeItem(cacheKey);
      } catch (error) {
        console.error('Update failed:', error);
        throw error;
      }
    },
    [supabase, cacheKey],
  );

  return {
    data,
    loading,
    error,
    refetch: debouncedFetch,
    updateCategory: updateBudgetCategory,
    clearCache: () => {
      sessionStorage.removeItem(cacheKey);
      sessionStorage.removeItem(`${cacheKey}-timestamp`);
    },
  };
}
