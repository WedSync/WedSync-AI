import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useClientListStore } from '@/lib/stores/clientListStore';
import type { ClientData } from '@/components/clients/ClientListViews';

export function useClientList() {
  const supabase = await createClient();
  const [clients, setClients] = useState<ClientData[]>([]);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [organizationId, setOrganizationId] = useState<string | null>(null);

  const {
    searchQuery,
    filters,
    sortConfig,
    isLoading,
    error,
    setLoading,
    setError,
  } = useClientListStore();

  // Fetch user organization
  useEffect(() => {
    async function fetchOrganization() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('organization_id')
          .eq('user_id', user.id)
          .single();

        if (profile?.organization_id) {
          setOrganizationId(profile.organization_id);
        }
      }
    }
    fetchOrganization();
  }, [supabase]);

  // Fetch clients with filters
  const fetchClients = useCallback(async () => {
    if (!organizationId) return;

    setLoading(true);
    setError(null);

    try {
      let query = supabase
        .from('clients')
        .select(
          `
          *,
          client_activities (
            id,
            activity_type,
            created_at
          )
        `,
        )
        .eq('organization_id', organizationId);

      // Apply search filter
      if (searchQuery) {
        query = query.or(`
          first_name.ilike.%${searchQuery}%,
          last_name.ilike.%${searchQuery}%,
          email.ilike.%${searchQuery}%,
          partner_first_name.ilike.%${searchQuery}%,
          partner_last_name.ilike.%${searchQuery}%,
          venue_name.ilike.%${searchQuery}%
        `);
      }

      // Apply status filter
      if (filters.status.length > 0) {
        query = query.in('status', filters.status);
      }

      // Apply date range filter
      if (filters.dateRange.start) {
        query = query.gte('wedding_date', filters.dateRange.start);
      }
      if (filters.dateRange.end) {
        query = query.lte('wedding_date', filters.dateRange.end);
      }

      // Apply WedMe connection filter
      if (filters.hasWedMe !== undefined) {
        query = query.eq('is_wedme_connected', filters.hasWedMe);
      }

      // Apply sorting
      query = query.order(sortConfig.field, {
        ascending: sortConfig.direction === 'asc',
      });

      const { data, error: fetchError } = await query;

      if (fetchError) {
        throw fetchError;
      }

      setClients((data as ClientData[]) || []);
    } catch (err) {
      console.error('Error fetching clients:', err);
      setError(err instanceof Error ? err.message : 'Failed to load clients');
    } finally {
      setLoading(false);
      setIsInitialLoading(false);
    }
  }, [
    organizationId,
    searchQuery,
    filters,
    sortConfig,
    supabase,
    setLoading,
    setError,
  ]);

  // Initial fetch and refetch on filter changes
  useEffect(() => {
    if (organizationId) {
      fetchClients();
    }
  }, [organizationId, searchQuery, filters, sortConfig, fetchClients]);

  // Set up real-time subscription
  useEffect(() => {
    if (!organizationId) return;

    const channel = supabase
      .channel('clients_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'clients',
          filter: `organization_id=eq.${organizationId}`,
        },
        (payload) => {
          // Handle real-time updates
          if (payload.eventType === 'INSERT' && payload.new) {
            setClients((prev) => [payload.new as ClientData, ...prev]);
          } else if (payload.eventType === 'UPDATE' && payload.new) {
            setClients((prev) =>
              prev.map((client) =>
                client.id === payload.new.id
                  ? (payload.new as ClientData)
                  : client,
              ),
            );
          } else if (payload.eventType === 'DELETE' && payload.old) {
            setClients((prev) =>
              prev.filter((client) => client.id !== payload.old.id),
            );
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [organizationId, supabase]);

  return {
    clients,
    isLoading: isInitialLoading || isLoading,
    error,
    refetch: fetchClients,
  };
}

// Virtual scrolling hook for performance
export function useVirtualScroll<T>(
  items: T[],
  itemHeight: number,
  containerHeight: number,
  overscan = 5,
) {
  const [scrollTop, setScrollTop] = useState(0);

  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
  const endIndex = Math.min(
    items.length,
    Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan,
  );

  const visibleItems = items.slice(startIndex, endIndex);
  const totalHeight = items.length * itemHeight;
  const offsetY = startIndex * itemHeight;

  return {
    visibleItems,
    totalHeight,
    offsetY,
    onScroll: (e: React.UIEvent<HTMLDivElement>) => {
      setScrollTop(e.currentTarget.scrollTop);
    },
  };
}

// Debounced search hook
export function useDebouncedSearch(delay = 300) {
  const { setSearchQuery } = useClientListStore();
  const [localQuery, setLocalQuery] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchQuery(localQuery);
    }, delay);

    return () => clearTimeout(timer);
  }, [localQuery, delay, setSearchQuery]);

  return {
    searchQuery: localQuery,
    setSearchQuery: setLocalQuery,
  };
}
