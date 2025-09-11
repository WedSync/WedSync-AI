'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { GuestSearchResult } from '@/types/guest-management';

// Types for Web Worker communication
interface SearchWorkerMessage {
  type: string;
  requestId: string;
  data?: any;
  result?: any;
  error?: any;
}

interface SearchOptions {
  fuzzySearch?: boolean;
  minScore?: number;
  maxResults?: number;
  debounceMs?: number;
}

interface FilterOptions {
  category?: string | string[];
  rsvp_status?: string | string[];
  side?: string | string[];
  plus_one?: boolean;
  dietary_restrictions?: boolean;
  age_group?: string | string[];
  has_table?: boolean;
}

interface SortOptions {
  field: string;
  direction: 'asc' | 'desc';
}

interface BulkOperation {
  type: 'UPDATE_CATEGORY' | 'UPDATE_RSVP' | 'ASSIGN_TABLES';
  guestIds: string[];
  value?: any;
  startingTable?: number;
  guestsPerTable?: number;
}

interface SearchResults {
  guests: GuestSearchResult[];
  totalResults: number;
  hasMore?: boolean;
  operations?: string[];
  performanceMetrics?: {
    operation: string;
    duration: number;
    itemsProcessed: number;
    timestamp: number;
  };
}

interface WebWorkerSearchState {
  // Search state
  searchResults: SearchResults | null;
  isSearching: boolean;
  searchError: string | null;

  // Performance metrics
  lastSearchDuration: number;
  averageSearchDuration: number;
  searchCount: number;

  // Worker state
  isWorkerReady: boolean;
  workerError: string | null;
}

export function useWebWorkerSearch(initialGuests: GuestSearchResult[] = []) {
  const workerRef = useRef<Worker | null>(null);
  const requestIdRef = useRef<number>(0);
  const pendingRequestsRef = useRef<
    Map<
      string,
      {
        resolve: (value: any) => void;
        reject: (error: any) => void;
        operation: string;
      }
    >
  >(new Map());
  const debounceTimeoutRef = useRef<NodeJS.Timeout>();

  const [state, setState] = useState<WebWorkerSearchState>({
    searchResults: null,
    isSearching: false,
    searchError: null,
    lastSearchDuration: 0,
    averageSearchDuration: 0,
    searchCount: 0,
    isWorkerReady: false,
    workerError: null,
  });

  // Initialize Web Worker
  useEffect(() => {
    try {
      const worker = new Worker('/workers/search-worker.js');
      workerRef.current = worker;

      // Handle worker messages
      worker.onmessage = (event: MessageEvent<SearchWorkerMessage>) => {
        const { type, requestId, result, error } = event.data;

        const pendingRequest = pendingRequestsRef.current.get(requestId);
        if (!pendingRequest) return;

        pendingRequestsRef.current.delete(requestId);

        if (type === 'SUCCESS') {
          // Update performance metrics
          if (result?.performanceMetrics) {
            setState((prev) => ({
              ...prev,
              lastSearchDuration: result.performanceMetrics.duration,
              averageSearchDuration:
                prev.searchCount > 0
                  ? (prev.averageSearchDuration * prev.searchCount +
                      result.performanceMetrics.duration) /
                    (prev.searchCount + 1)
                  : result.performanceMetrics.duration,
              searchCount: prev.searchCount + 1,
            }));
          }

          pendingRequest.resolve(result);
        } else if (type === 'ERROR') {
          pendingRequest.reject(
            new Error(error?.message || 'Worker operation failed'),
          );
        }
      };

      worker.onerror = (error) => {
        setState((prev) => ({
          ...prev,
          workerError: `Worker error: ${error.message}`,
          isWorkerReady: false,
        }));

        // Reject all pending requests
        pendingRequestsRef.current.forEach(({ reject }) => {
          reject(new Error('Worker crashed'));
        });
        pendingRequestsRef.current.clear();
      };

      // Mark worker as ready
      setState((prev) => ({
        ...prev,
        isWorkerReady: true,
        workerError: null,
      }));
    } catch (error) {
      setState((prev) => ({
        ...prev,
        workerError: `Failed to initialize worker: ${error}`,
        isWorkerReady: false,
      }));
    }

    return () => {
      if (workerRef.current) {
        workerRef.current.terminate();
        workerRef.current = null;
      }

      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }

      // Clear all pending requests and their timeouts to prevent memory leaks
      pendingRequestsRef.current.forEach((request) => {
        if (request.timeoutId) {
          clearTimeout(request.timeoutId);
        }
        request.reject(new Error('Component unmounted'));
      });
      pendingRequestsRef.current.clear();
    };
  }, []);

  // Generic worker operation executor
  const executeWorkerOperation = useCallback(
    (operation: string, data: any): Promise<SearchResults> => {
      return new Promise((resolve, reject) => {
        if (!workerRef.current || !state.isWorkerReady) {
          reject(new Error('Worker not ready'));
          return;
        }

        const requestId = `req_${++requestIdRef.current}`;

        // Add timeout to prevent hanging promises
        const timeoutId = setTimeout(() => {
          pendingRequestsRef.current.delete(requestId);
          reject(
            new Error(
              `Worker operation '${operation}' timed out after 30 seconds`,
            ),
          );
        }, 30000);

        // Store request for later resolution
        pendingRequestsRef.current.set(requestId, {
          resolve: (result: SearchResults) => {
            clearTimeout(timeoutId);
            resolve(result);
          },
          reject: (error: Error) => {
            clearTimeout(timeoutId);
            reject(error);
          },
          operation,
          timeoutId,
        });

        // Send message to worker
        workerRef.current.postMessage({
          type: operation,
          requestId,
          data,
        });
      });
    },
    [state.isWorkerReady],
  );

  // Search guests with debouncing
  const searchGuests = useCallback(
    async (
      query: string,
      guests: GuestSearchResult[] = initialGuests,
      options: SearchOptions = {},
    ) => {
      const { debounceMs = 300, ...searchOptions } = options;

      // Clear existing debounce
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }

      // Set searching state immediately for UI feedback
      setState((prev) => ({
        ...prev,
        isSearching: true,
        searchError: null,
      }));

      return new Promise<SearchResults>((resolve, reject) => {
        debounceTimeoutRef.current = setTimeout(async () => {
          try {
            const result = await executeWorkerOperation('SEARCH_GUESTS', {
              guests,
              query,
              options: searchOptions,
            });

            setState((prev) => ({
              ...prev,
              searchResults: result,
              isSearching: false,
              searchError: null,
            }));

            resolve(result);
          } catch (error) {
            const errorMessage =
              error instanceof Error ? error.message : 'Search failed';
            setState((prev) => ({
              ...prev,
              isSearching: false,
              searchError: errorMessage,
            }));
            reject(error);
          }
        }, debounceMs);
      });
    },
    [initialGuests, executeWorkerOperation],
  );

  // Filter guests
  const filterGuests = useCallback(
    async (
      filters: FilterOptions,
      guests: GuestSearchResult[] = initialGuests,
    ) => {
      try {
        setState((prev) => ({ ...prev, isSearching: true, searchError: null }));

        const result = await executeWorkerOperation('FILTER_GUESTS', {
          guests,
          filters,
        });

        setState((prev) => ({
          ...prev,
          searchResults: result,
          isSearching: false,
        }));

        return result;
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Filter failed';
        setState((prev) => ({
          ...prev,
          isSearching: false,
          searchError: errorMessage,
        }));
        throw error;
      }
    },
    [initialGuests, executeWorkerOperation],
  );

  // Sort guests
  const sortGuests = useCallback(
    async (
      sortOptions: SortOptions,
      guests: GuestSearchResult[] = initialGuests,
    ) => {
      try {
        setState((prev) => ({ ...prev, isSearching: true, searchError: null }));

        const result = await executeWorkerOperation('SORT_GUESTS', {
          guests,
          ...sortOptions,
        });

        setState((prev) => ({
          ...prev,
          searchResults: result,
          isSearching: false,
        }));

        return result;
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Sort failed';
        setState((prev) => ({
          ...prev,
          isSearching: false,
          searchError: errorMessage,
        }));
        throw error;
      }
    },
    [initialGuests, executeWorkerOperation],
  );

  // Combined search, filter, and sort
  const searchAndFilter = useCallback(
    async (
      query: string,
      filters: FilterOptions,
      sortOptions?: SortOptions,
      guests: GuestSearchResult[] = initialGuests,
      searchOptions: SearchOptions = {},
    ) => {
      try {
        setState((prev) => ({ ...prev, isSearching: true, searchError: null }));

        const result = await executeWorkerOperation('SEARCH_AND_FILTER', {
          guests,
          query,
          filters,
          sort: sortOptions,
          options: searchOptions,
        });

        setState((prev) => ({
          ...prev,
          searchResults: result,
          isSearching: false,
        }));

        return result;
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Search and filter failed';
        setState((prev) => ({
          ...prev,
          isSearching: false,
          searchError: errorMessage,
        }));
        throw error;
      }
    },
    [initialGuests, executeWorkerOperation],
  );

  // Bulk operations
  const bulkProcess = useCallback(
    async (
      operations: BulkOperation[],
      guests: GuestSearchResult[] = initialGuests,
    ) => {
      try {
        setState((prev) => ({ ...prev, isSearching: true, searchError: null }));

        const result = await executeWorkerOperation('BULK_PROCESS', {
          guests,
          operations,
        });

        setState((prev) => ({
          ...prev,
          searchResults: result,
          isSearching: false,
        }));

        return result;
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Bulk operation failed';
        setState((prev) => ({
          ...prev,
          isSearching: false,
          searchError: errorMessage,
        }));
        throw error;
      }
    },
    [initialGuests, executeWorkerOperation],
  );

  // Clear search results
  const clearSearch = useCallback(() => {
    setState((prev) => ({
      ...prev,
      searchResults: null,
      isSearching: false,
      searchError: null,
    }));
  }, []);

  // Performance utilities
  const getPerformanceStats = useCallback(() => {
    return {
      averageSearchDuration: state.averageSearchDuration,
      lastSearchDuration: state.lastSearchDuration,
      searchCount: state.searchCount,
      isWorkerReady: state.isWorkerReady,
      workerError: state.workerError,
    };
  }, [state]);

  // Memoized return object for performance
  return useMemo(
    () => ({
      // Search results
      searchResults: state.searchResults,
      isSearching: state.isSearching,
      searchError: state.searchError,

      // Search operations
      searchGuests,
      filterGuests,
      sortGuests,
      searchAndFilter,
      bulkProcess,
      clearSearch,

      // Performance and status
      getPerformanceStats,
      isWorkerReady: state.isWorkerReady,
      workerError: state.workerError,

      // Performance metrics
      lastSearchDuration: state.lastSearchDuration,
      averageSearchDuration: state.averageSearchDuration,
      searchCount: state.searchCount,
    }),
    [
      state,
      searchGuests,
      filterGuests,
      sortGuests,
      searchAndFilter,
      bulkProcess,
      clearSearch,
      getPerformanceStats,
    ],
  );
}

// Additional utility hook for search suggestions
export function useSearchSuggestions(guests: GuestSearchResult[]) {
  const [suggestions, setSuggestions] = useState<string[]>([]);

  const generateSuggestions = useCallback(
    (query: string) => {
      if (!query || query.length < 2) {
        setSuggestions([]);
        return;
      }

      const queryLower = query.toLowerCase();
      const suggestionSet = new Set<string>();

      // Generate suggestions from guest data
      guests.forEach((guest) => {
        const fields = [
          guest.first_name,
          guest.last_name,
          `${guest.first_name} ${guest.last_name}`,
          guest.email,
          guest.household_name,
          guest.category,
          guest.side,
          guest.rsvp_status,
        ].filter(Boolean) as string[];

        fields.forEach((field) => {
          if (
            field.toLowerCase().includes(queryLower) &&
            field.length > query.length
          ) {
            suggestionSet.add(field);
          }
        });
      });

      setSuggestions(Array.from(suggestionSet).slice(0, 8));
    },
    [guests],
  );

  return {
    suggestions,
    generateSuggestions,
  };
}
