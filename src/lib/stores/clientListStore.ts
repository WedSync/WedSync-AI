import { create } from 'zustand';
import { devtools, persist, subscribeWithSelector } from 'zustand/middleware';

// View types matching ClientListViews component
export type ViewType = 'list' | 'grid' | 'calendar' | 'kanban';

// Filter configuration
export interface FilterConfig {
  status: string[];
  tags: string[];
  dateRange: {
    start?: string;
    end?: string;
  };
  hasWedMe?: boolean;
}

// Sort configuration
export interface SortConfig {
  field: string;
  direction: 'asc' | 'desc';
}

// View preferences that persist to localStorage
export interface ViewPreferences {
  defaultView: ViewType;
  itemsPerPage: number;
  defaultSort: SortConfig;
}

// Main store state
export interface ClientListState {
  // UI State
  currentView: ViewType;
  searchQuery: string;
  filters: FilterConfig;
  sortConfig: SortConfig;
  selectedClientIds: Set<string>;

  // Loading & Error States
  isLoading: boolean;
  error: string | null;

  // Pagination
  currentPage: number;
  itemsPerPage: number;

  // View Preferences
  viewPreferences: ViewPreferences;

  // Actions
  setView: (view: ViewType) => void;
  setSearchQuery: (query: string) => void;
  setFilters: (filters: Partial<FilterConfig>) => void;
  setSortConfig: (config: SortConfig) => void;
  toggleClientSelection: (clientId: string) => void;
  selectAllClients: (clientIds: string[]) => void;
  clearSelection: () => void;
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
  setCurrentPage: (page: number) => void;
  setItemsPerPage: (count: number) => void;
  persistViewPreference: (key: keyof ViewPreferences, value: any) => void;
  loadViewPreferences: () => void;
  resetFilters: () => void;
  resetState: () => void;
}

// Default values
const defaultFilters: FilterConfig = {
  status: [],
  tags: [],
  dateRange: {},
  hasWedMe: undefined,
};

const defaultSortConfig: SortConfig = {
  field: 'created_at',
  direction: 'desc',
};

const defaultViewPreferences: ViewPreferences = {
  defaultView: 'list',
  itemsPerPage: 25,
  defaultSort: defaultSortConfig,
};

// Local storage key
const STORAGE_KEY = 'wedsync-client-list-preferences';

// Create the store
export const useClientListStore = create<ClientListState>()(
  devtools(
    subscribeWithSelector(
      persist(
        (set, get) => ({
          // Initial state
          currentView: 'list',
          searchQuery: '',
          filters: defaultFilters,
          sortConfig: defaultSortConfig,
          selectedClientIds: new Set(),
          isLoading: false,
          error: null,
          currentPage: 1,
          itemsPerPage: 25,
          viewPreferences: defaultViewPreferences,

          // Actions
          setView: (view) => {
            set({ currentView: view });
            // Persist view preference
            get().persistViewPreference('defaultView', view);
          },

          setSearchQuery: (query) => {
            set({
              searchQuery: query,
              currentPage: 1, // Reset to first page on search
            });
          },

          setFilters: (newFilters) => {
            set((state) => ({
              filters: { ...state.filters, ...newFilters },
              currentPage: 1, // Reset to first page on filter change
            }));
          },

          setSortConfig: (config) => {
            set({
              sortConfig: config,
              currentPage: 1, // Reset to first page on sort change
            });
            // Persist sort preference
            get().persistViewPreference('defaultSort', config);
          },

          toggleClientSelection: (clientId) => {
            set((state) => {
              const newSelection = new Set(state.selectedClientIds);
              if (newSelection.has(clientId)) {
                newSelection.delete(clientId);
              } else {
                newSelection.add(clientId);
              }
              return { selectedClientIds: newSelection };
            });
          },

          selectAllClients: (clientIds) => {
            set({ selectedClientIds: new Set(clientIds) });
          },

          clearSelection: () => {
            set({ selectedClientIds: new Set() });
          },

          setLoading: (isLoading) => {
            set({ isLoading });
          },

          setError: (error) => {
            set({ error, isLoading: false });
          },

          setCurrentPage: (page) => {
            set({ currentPage: page });
          },

          setItemsPerPage: (count) => {
            set({
              itemsPerPage: count,
              currentPage: 1, // Reset to first page on page size change
            });
            // Persist page size preference
            get().persistViewPreference('itemsPerPage', count);
          },

          persistViewPreference: (key, value) => {
            set((state) => {
              const newPreferences = { ...state.viewPreferences, [key]: value };
              // Save to localStorage
              try {
                localStorage.setItem(
                  STORAGE_KEY,
                  JSON.stringify(newPreferences),
                );
              } catch (error) {
                console.warn(
                  'Failed to save view preferences to localStorage:',
                  error,
                );
              }
              return { viewPreferences: newPreferences };
            });
          },

          loadViewPreferences: () => {
            try {
              const stored = localStorage.getItem(STORAGE_KEY);
              if (stored) {
                const preferences = JSON.parse(stored);
                set((state) => ({
                  viewPreferences: { ...state.viewPreferences, ...preferences },
                  currentView: preferences.defaultView || state.currentView,
                  itemsPerPage: preferences.itemsPerPage || state.itemsPerPage,
                  sortConfig: preferences.defaultSort || state.sortConfig,
                }));
              }
            } catch (error) {
              console.warn(
                'Failed to load view preferences from localStorage:',
                error,
              );
            }
          },

          resetFilters: () => {
            set({
              filters: defaultFilters,
              searchQuery: '',
              currentPage: 1,
            });
          },

          resetState: () => {
            set({
              currentView: get().viewPreferences.defaultView,
              searchQuery: '',
              filters: defaultFilters,
              sortConfig: get().viewPreferences.defaultSort,
              selectedClientIds: new Set(),
              isLoading: false,
              error: null,
              currentPage: 1,
            });
          },
        }),
        {
          name: 'client-list-store',
          // Only persist view preferences, not the actual data
          partialize: (state) => ({
            viewPreferences: state.viewPreferences,
          }),
        },
      ),
    ),
    {
      name: 'client-list-store',
    },
  ),
);

// Initialize preferences on store creation
if (typeof window !== 'undefined') {
  useClientListStore.getState().loadViewPreferences();
}
