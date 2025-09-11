import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  WeddingBasicsRequest,
  WeddingBasicsResponse,
  WeddingBasicsData,
  PartialWeddingBasicsRequest,
} from '@/lib/validations/wedding-basics';

interface WeddingBasicsState {
  // Data
  data: WeddingBasicsData | null;
  isLoading: boolean;
  error: string | null;
  lastSaved: string | null;
  isDirty: boolean; // Has unsaved changes

  // Actions
  loadWeddingBasics: () => Promise<void>;
  saveWeddingBasics: (
    data: WeddingBasicsRequest,
  ) => Promise<WeddingBasicsResponse>;
  saveDraft: (data: Partial<WeddingBasicsRequest>) => Promise<void>;
  clearData: () => void;
  setError: (error: string | null) => void;
  markClean: () => void;
  markDirty: () => void;
}

export const useWeddingBasicsStore = create<WeddingBasicsState>()(
  persist(
    (set, get) => ({
      // Initial state
      data: null,
      isLoading: false,
      error: null,
      lastSaved: null,
      isDirty: false,

      // Load existing wedding basics data
      loadWeddingBasics: async () => {
        const currentState = get();

        // Skip loading if already loading
        if (currentState.isLoading) {
          return;
        }

        set({ isLoading: true, error: null });

        try {
          const response = await fetch('/api/onboarding/wedding-basics', {
            method: 'GET',
            credentials: 'include',
          });

          if (response.status === 401) {
            // User not authenticated
            set({
              isLoading: false,
              error: 'Authentication required',
              data: null,
            });
            return;
          }

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(
              errorData.message || `Failed to load data: ${response.status}`,
            );
          }

          const result: WeddingBasicsResponse = await response.json();

          if (result.success && result.data) {
            set({
              data: result.data,
              isLoading: false,
              error: null,
              lastSaved: new Date().toISOString(),
              isDirty: false,
            });
          } else {
            // No existing data - start fresh
            set({
              data: {
                weddingDate: null,
                ceremonyVenue: null,
                receptionVenue: null,
                guestCountEstimated: null,
                weddingStyle: [],
                completionStatus: {
                  weddingDate: false,
                  venue: false,
                  guestCount: false,
                  style: false,
                  overallProgress: 0,
                },
              },
              isLoading: false,
              error: null,
              isDirty: false,
            });
          }
        } catch (error) {
          console.error('Failed to load wedding basics:', error);
          set({
            error:
              error instanceof Error
                ? error.message
                : 'Failed to load wedding basics',
            isLoading: false,
          });
        }
      },

      // Save complete wedding basics data
      saveWeddingBasics: async (
        formData: WeddingBasicsRequest,
      ): Promise<WeddingBasicsResponse> => {
        set({ isLoading: true, error: null });

        try {
          const response = await fetch('/api/onboarding/wedding-basics', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify(formData),
          });

          const result: WeddingBasicsResponse = await response.json();

          if (!response.ok) {
            throw new Error(
              result.message || `Save failed: ${response.status}`,
            );
          }

          if (result.success && result.data) {
            // Update store with successful save
            set({
              data: result.data,
              isLoading: false,
              error: null,
              lastSaved: new Date().toISOString(),
              isDirty: false,
            });
          } else {
            throw new Error(result.message || 'Save operation failed');
          }

          return result;
        } catch (error) {
          const errorMessage =
            error instanceof Error
              ? error.message
              : 'Failed to save wedding basics';
          set({
            error: errorMessage,
            isLoading: false,
          });
          throw error;
        }
      },

      // Save draft data (partial/auto-save)
      saveDraft: async (
        draftData: Partial<WeddingBasicsRequest>,
      ): Promise<void> => {
        const currentState = get();

        // Don't save if already saving or no changes
        if (currentState.isLoading) {
          return;
        }

        try {
          // Update local state immediately for responsive UI
          const updatedData: WeddingBasicsData = {
            ...currentState.data!,
            ...draftData,
            completionStatus: {
              weddingDate: !!(
                draftData.weddingDate || currentState.data?.weddingDate
              ),
              venue: !!(
                draftData.ceremonyVenue?.name ||
                currentState.data?.ceremonyVenue?.name
              ),
              guestCount: !!(
                draftData.guestCountEstimated ||
                currentState.data?.guestCountEstimated
              ),
              style: !!(
                (draftData.weddingStyle?.length || 0) > 0 ||
                (currentState.data?.weddingStyle?.length || 0) > 0
              ),
              overallProgress: 0, // Will be calculated
            },
          };

          // Calculate progress
          const completedFields = Object.values(
            updatedData.completionStatus,
          ).filter(
            (value, index) => index < 4 && value, // Exclude overallProgress from count
          ).length;
          updatedData.completionStatus.overallProgress = Math.round(
            (completedFields / 4) * 100,
          );

          set({
            data: updatedData,
            isDirty: true, // Mark as having unsaved changes
          });

          // Save to server (non-blocking)
          const response = await fetch('/api/onboarding/wedding-basics', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify(draftData),
          });

          if (response.ok) {
            const result: WeddingBasicsResponse = await response.json();
            if (result.success && result.data) {
              set({
                data: result.data,
                lastSaved: new Date().toISOString(),
                isDirty: false,
              });
            }
          }
          // Don't throw errors for draft saves - they're meant to be non-intrusive
        } catch (error) {
          console.warn('Draft save failed:', error);
          // Silently handle draft save failures
        }
      },

      // Clear all data
      clearData: () => {
        set({
          data: null,
          error: null,
          lastSaved: null,
          isDirty: false,
        });
      },

      // Set error message
      setError: (error: string | null) => {
        set({ error });
      },

      // Mark data as clean (saved)
      markClean: () => {
        set({ isDirty: false, lastSaved: new Date().toISOString() });
      },

      // Mark data as dirty (unsaved changes)
      markDirty: () => {
        set({ isDirty: true });
      },
    }),
    {
      name: 'wedding-basics-storage',
      partialize: (state) => ({
        data: state.data,
        lastSaved: state.lastSaved,
      }), // Only persist data and lastSaved timestamp
      version: 1,
      migrate: (persistedState: any, version: number) => {
        if (version === 0) {
          // Handle migration from older versions if needed
          return {
            ...persistedState,
            isDirty: false,
            error: null,
            isLoading: false,
          };
        }
        return persistedState;
      },
    },
  ),
);

// Selectors for specific data pieces
export const useWeddingDate = () =>
  useWeddingBasicsStore((state) => state.data?.weddingDate);
export const useCeremonyVenue = () =>
  useWeddingBasicsStore((state) => state.data?.ceremonyVenue);
export const useReceptionVenue = () =>
  useWeddingBasicsStore((state) => state.data?.receptionVenue);
export const useGuestCount = () =>
  useWeddingBasicsStore((state) => state.data?.guestCountEstimated);
export const useWeddingStyle = () =>
  useWeddingBasicsStore((state) => state.data?.weddingStyle);
export const useCompletionStatus = () =>
  useWeddingBasicsStore((state) => state.data?.completionStatus);

// Derived state selectors
export const useIsWeddingBasicsComplete = () =>
  useWeddingBasicsStore(
    (state) => state.data?.completionStatus?.overallProgress === 100,
  );

export const useHasUnsavedChanges = () =>
  useWeddingBasicsStore((state) => state.isDirty);

export const useLastSavedTime = () =>
  useWeddingBasicsStore((state) => state.lastSaved);

// Auto-save hook for components
export const useAutoSave = (
  data: Partial<WeddingBasicsRequest>,
  delay: number = 2000,
) => {
  const { saveDraft } = useWeddingBasicsStore();
  const [timeoutId, setTimeoutId] = React.useState<NodeJS.Timeout | null>(null);

  React.useEffect(() => {
    // Clear previous timeout
    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    // Set new timeout for auto-save
    const newTimeoutId = setTimeout(() => {
      saveDraft(data);
    }, delay);

    setTimeoutId(newTimeoutId);

    // Cleanup timeout on unmount
    return () => {
      if (newTimeoutId) {
        clearTimeout(newTimeoutId);
      }
    };
  }, [data, delay, saveDraft]);

  return null;
};

// Helper functions
export function getNextOnboardingStep(
  completionStatus: WeddingBasicsData['completionStatus'],
): string {
  if (completionStatus.overallProgress === 100) {
    return 'wedding-party';
  } else if (completionStatus.overallProgress >= 75) {
    return 'timeline';
  } else if (completionStatus.overallProgress >= 50) {
    return 'services';
  }
  return 'wedding-basics';
}

export function formatLastSavedTime(lastSaved: string | null): string {
  if (!lastSaved) {
    return 'Never saved';
  }

  const savedDate = new Date(lastSaved);
  const now = new Date();
  const diffMinutes = Math.floor(
    (now.getTime() - savedDate.getTime()) / (1000 * 60),
  );

  if (diffMinutes < 1) {
    return 'Saved just now';
  } else if (diffMinutes === 1) {
    return 'Saved 1 minute ago';
  } else if (diffMinutes < 60) {
    return `Saved ${diffMinutes} minutes ago`;
  } else if (diffMinutes < 1440) {
    // Less than 24 hours
    const hours = Math.floor(diffMinutes / 60);
    return `Saved ${hours} hour${hours === 1 ? '' : 's'} ago`;
  } else {
    return `Saved on ${savedDate.toLocaleDateString()}`;
  }
}
