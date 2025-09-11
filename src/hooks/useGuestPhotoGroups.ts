import { useState, useEffect, useCallback } from 'react';
import {
  PhotoGroup,
  PhotoGroupFormData,
  PhotoGroupsState,
  PhotoGroupMetrics,
  PhotoGroupResponse,
  PhotoGroupsResponse,
} from '@/types/photo-groups';

interface UseGuestPhotoGroupsOptions {
  initialGroups?: PhotoGroup[];
  refreshInterval?: number;
}

interface UseGuestPhotoGroupsReturn {
  groups: PhotoGroup[];
  loading: boolean;
  error: Error | null;
  metrics: PhotoGroupMetrics | null;
  createGroup: (data: PhotoGroupFormData) => Promise<PhotoGroup>;
  updateGroup: (id: string, data: PhotoGroupFormData) => Promise<PhotoGroup>;
  deleteGroup: (id: string) => Promise<void>;
  reorderGroups: (groupIds: string[]) => Promise<void>;
  assignGuestToGroup: (guestId: string, groupId: string) => Promise<void>;
  unassignGuestFromGroup: (guestId: string, groupId: string) => Promise<void>;
  refreshGroups: () => Promise<void>;
}

export function useGuestPhotoGroups(
  coupleId: string,
  options: UseGuestPhotoGroupsOptions = {},
): UseGuestPhotoGroupsReturn {
  const { initialGroups = [], refreshInterval } = options;

  const [state, setState] = useState<PhotoGroupsState>({
    groups: initialGroups,
    loading: false,
    error: null,
    creating: false,
    updating: false,
    deleting: new Set(),
  });

  const [metrics, setMetrics] = useState<PhotoGroupMetrics | null>(null);

  // Fetch photo groups
  const fetchGroups = useCallback(async () => {
    if (!coupleId) return;

    setState((prev) => ({ ...prev, loading: true, error: null }));

    try {
      const response = await fetch(
        `/api/guests/photo-groups?couple_id=${coupleId}`,
      );

      if (!response.ok) {
        throw new Error('Failed to fetch photo groups');
      }

      const data: PhotoGroupsResponse = await response.json();

      setState((prev) => ({
        ...prev,
        groups: data.data,
        loading: false,
      }));

      setMetrics(data.metrics);
    } catch (error) {
      console.error('Error fetching photo groups:', error);
      setState((prev) => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error : new Error('Unknown error'),
      }));
    }
  }, [coupleId]);

  // Initial load
  useEffect(() => {
    if (initialGroups.length === 0) {
      fetchGroups();
    }
  }, [fetchGroups, initialGroups.length]);

  // Refresh interval
  useEffect(() => {
    if (!refreshInterval) return;

    const interval = setInterval(fetchGroups, refreshInterval);
    return () => clearInterval(interval);
  }, [fetchGroups, refreshInterval]);

  // Create photo group
  const createGroup = useCallback(
    async (data: PhotoGroupFormData): Promise<PhotoGroup> => {
      setState((prev) => ({ ...prev, creating: true, error: null }));

      try {
        const response = await fetch('/api/guests/photo-groups', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            ...data,
            couple_id: coupleId,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to create photo group');
        }

        const result: PhotoGroup = await response.json();

        setState((prev) => ({
          ...prev,
          groups: [...prev.groups, result],
          creating: false,
        }));

        // Update metrics
        if (metrics) {
          setMetrics((prev) =>
            prev
              ? {
                  ...prev,
                  total_groups: prev.total_groups + 1,
                  total_assignments:
                    prev.total_assignments + (data.guest_ids?.length || 0),
                }
              : null,
          );
        }

        return result;
      } catch (error) {
        console.error('Error creating photo group:', error);
        setState((prev) => ({
          ...prev,
          creating: false,
          error: error instanceof Error ? error : new Error('Unknown error'),
        }));
        throw error;
      }
    },
    [coupleId, metrics],
  );

  // Update photo group
  const updateGroup = useCallback(
    async (id: string, data: PhotoGroupFormData): Promise<PhotoGroup> => {
      setState((prev) => ({ ...prev, updating: true, error: null }));

      try {
        const response = await fetch(`/api/guests/photo-groups?id=${id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(data),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to update photo group');
        }

        const result: PhotoGroup = await response.json();

        setState((prev) => ({
          ...prev,
          groups: prev.groups.map((group) =>
            group.id === id ? result : group,
          ),
          updating: false,
        }));

        return result;
      } catch (error) {
        console.error('Error updating photo group:', error);
        setState((prev) => ({
          ...prev,
          updating: false,
          error: error instanceof Error ? error : new Error('Unknown error'),
        }));
        throw error;
      }
    },
    [],
  );

  // Delete photo group
  const deleteGroup = useCallback(
    async (id: string): Promise<void> => {
      setState((prev) => ({
        ...prev,
        deleting: new Set(prev.deleting).add(id),
        error: null,
      }));

      try {
        const response = await fetch(`/api/guests/photo-groups?id=${id}`, {
          method: 'DELETE',
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to delete photo group');
        }

        setState((prev) => {
          const newDeleting = new Set(prev.deleting);
          newDeleting.delete(id);

          return {
            ...prev,
            groups: prev.groups.filter((group) => group.id !== id),
            deleting: newDeleting,
          };
        });

        // Update metrics
        if (metrics) {
          const deletedGroup = state.groups.find((g) => g.id === id);
          setMetrics((prev) =>
            prev
              ? {
                  ...prev,
                  total_groups: prev.total_groups - 1,
                  total_assignments:
                    prev.total_assignments -
                    (deletedGroup?.assignments?.length || 0),
                }
              : null,
          );
        }
      } catch (error) {
        console.error('Error deleting photo group:', error);
        setState((prev) => {
          const newDeleting = new Set(prev.deleting);
          newDeleting.delete(id);

          return {
            ...prev,
            deleting: newDeleting,
            error: error instanceof Error ? error : new Error('Unknown error'),
          };
        });
        throw error;
      }
    },
    [metrics, state.groups],
  );

  // Reorder groups
  const reorderGroups = useCallback(
    async (groupIds: string[]): Promise<void> => {
      try {
        const groupOrders = groupIds.map((id, index) => ({
          id,
          priority: index + 1,
        }));

        const response = await fetch(
          '/api/guests/photo-groups?action=reorder',
          {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ group_orders: groupOrders }),
          },
        );

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to reorder photo groups');
        }

        // Optimistically update local state
        setState((prev) => ({
          ...prev,
          groups: prev.groups
            .map((group) => {
              const newPriority = groupIds.indexOf(group.id) + 1;
              return newPriority > 0
                ? { ...group, priority: newPriority }
                : group;
            })
            .sort((a, b) => a.priority - b.priority),
        }));
      } catch (error) {
        console.error('Error reordering photo groups:', error);
        // Refresh to get correct order
        fetchGroups();
        throw error;
      }
    },
    [fetchGroups],
  );

  // Assign guest to group
  const assignGuestToGroup = useCallback(
    async (guestId: string, groupId: string): Promise<void> => {
      try {
        const response = await fetch(`/api/guests/${guestId}/photo-groups`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ photo_group_id: groupId }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to assign guest to group');
        }

        // Refresh to get updated assignments
        await fetchGroups();
      } catch (error) {
        console.error('Error assigning guest to group:', error);
        throw error;
      }
    },
    [fetchGroups],
  );

  // Unassign guest from group
  const unassignGuestFromGroup = useCallback(
    async (guestId: string, groupId: string): Promise<void> => {
      try {
        const response = await fetch(
          `/api/guests/${guestId}/photo-groups?group_id=${groupId}`,
          {
            method: 'DELETE',
          },
        );

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(
            errorData.error || 'Failed to unassign guest from group',
          );
        }

        // Refresh to get updated assignments
        await fetchGroups();
      } catch (error) {
        console.error('Error unassigning guest from group:', error);
        throw error;
      }
    },
    [fetchGroups],
  );

  // Refresh groups
  const refreshGroups = useCallback(async (): Promise<void> => {
    await fetchGroups();
  }, [fetchGroups]);

  return {
    groups: state.groups,
    loading: state.loading,
    error: state.error,
    metrics,
    createGroup,
    updateGroup,
    deleteGroup,
    reorderGroups,
    assignGuestToGroup,
    unassignGuestFromGroup,
    refreshGroups,
  };
}
