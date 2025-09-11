import { useState, useEffect, useCallback } from 'react';
import {
  GuestSearchResult,
  GuestListFilters,
  GuestListSort,
  GuestAnalytics,
} from '@/types/guest-management';

interface UseGuestSearchProps {
  coupleId: string;
  filters: GuestListFilters;
  sort: GuestListSort;
  pageSize?: number;
}

interface UseGuestSearchReturn {
  guests: GuestSearchResult[];
  analytics: GuestAnalytics | undefined;
  loading: boolean;
  error: Error | null;
  hasMore: boolean;
  loadMore: () => void;
  refresh: () => void;
}

export function useGuestSearch({
  coupleId,
  filters,
  sort,
  pageSize = 50,
}: UseGuestSearchProps): UseGuestSearchReturn {
  const [guests, setGuests] = useState<GuestSearchResult[]>([]);
  const [analytics, setAnalytics] = useState<GuestAnalytics | undefined>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);

  const searchGuests = useCallback(
    async (isLoadMore = false) => {
      if (loading) return;

      setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams({
          couple_id: coupleId,
          page: isLoadMore ? page.toString() : '1',
          limit: pageSize.toString(),
          sort_field: sort.field,
          sort_direction: sort.direction,
        });

        // Add filters
        if (filters.search) params.set('search', filters.search);
        if (filters.category !== 'all')
          params.set('category', filters.category);
        if (filters.rsvp_status !== 'all')
          params.set('rsvp_status', filters.rsvp_status);
        if (filters.age_group !== 'all')
          params.set('age_group', filters.age_group);
        if (filters.side !== 'all') params.set('side', filters.side);
        if (filters.has_dietary_restrictions !== undefined) {
          params.set(
            'has_dietary_restrictions',
            filters.has_dietary_restrictions.toString(),
          );
        }
        if (filters.has_plus_one !== undefined) {
          params.set('has_plus_one', filters.has_plus_one.toString());
        }

        const response = await fetch(`/api/guests?${params}`);

        if (!response.ok) {
          throw new Error('Failed to fetch guests');
        }

        const data = await response.json();

        if (isLoadMore) {
          setGuests((prev) => [...prev, ...data.data]);
        } else {
          setGuests(data.data);
          setAnalytics(data.analytics);
          setPage(1);
        }

        setHasMore(data.pagination.hasMore);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Unknown error'));
      } finally {
        setLoading(false);
      }
    },
    [coupleId, filters, sort, pageSize, page, loading],
  );

  const loadMore = useCallback(() => {
    if (!hasMore || loading) return;
    setPage((prev) => prev + 1);
    searchGuests(true);
  }, [hasMore, loading, searchGuests]);

  const refresh = useCallback(() => {
    setPage(1);
    searchGuests(false);
  }, [searchGuests]);

  // Search when filters or sort change
  useEffect(() => {
    searchGuests(false);
  }, [filters, sort, coupleId]);

  return {
    guests,
    analytics,
    loading,
    error,
    hasMore,
    loadMore,
    refresh,
  };
}
