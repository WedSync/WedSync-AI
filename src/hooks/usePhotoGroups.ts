'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import type { PhotoGroup, Photo } from '@/types/photos';

export function usePhotoGroups() {
  const [groups, setGroups] = useState<PhotoGroup[]>([]);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const supabase = createClientComponentClient();

  const fetchGroups = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('photo_groups')
        .select(
          `
          *,
          photos:photo_group_photos(
            photo:photos(*)
          )
        `,
        )
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formattedGroups =
        data?.map((group) => ({
          ...group,
          photos: group.photos?.map((p) => p.photo) || [],
        })) || [];

      setGroups(formattedGroups);
    } catch (err) {
      console.error('Error fetching groups:', err);
      setError('Failed to load photo groups');
    }
  }, [supabase]);

  const fetchPhotos = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('photos')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPhotos(data || []);
    } catch (err) {
      console.error('Error fetching photos:', err);
      setError('Failed to load photos');
    }
  }, [supabase]);

  const createGroup = useCallback(
    async (groupData: Partial<PhotoGroup>) => {
      try {
        const { data, error } = await supabase
          .from('photo_groups')
          .insert([groupData])
          .select()
          .single();

        if (error) throw error;

        setGroups((prev) => [{ ...data, photos: [] }, ...prev]);
        return data;
      } catch (err) {
        console.error('Error creating group:', err);
        throw new Error('Failed to create photo group');
      }
    },
    [supabase],
  );

  const updateGroup = useCallback(
    async (groupId: string, updates: Partial<PhotoGroup>) => {
      try {
        const { data, error } = await supabase
          .from('photo_groups')
          .update(updates)
          .eq('id', groupId)
          .select()
          .single();

        if (error) throw error;

        setGroups((prev) =>
          prev.map((group) =>
            group.id === groupId ? { ...group, ...data } : group,
          ),
        );
      } catch (err) {
        console.error('Error updating group:', err);
        throw new Error('Failed to update photo group');
      }
    },
    [supabase],
  );

  const deleteGroup = useCallback(
    async (groupId: string) => {
      try {
        // First, remove all photos from the group
        await supabase
          .from('photo_group_photos')
          .delete()
          .eq('group_id', groupId);

        // Then delete the group
        const { error } = await supabase
          .from('photo_groups')
          .delete()
          .eq('id', groupId);

        if (error) throw error;

        setGroups((prev) => prev.filter((group) => group.id !== groupId));
      } catch (err) {
        console.error('Error deleting group:', err);
        throw new Error('Failed to delete photo group');
      }
    },
    [supabase],
  );

  const addPhotoToGroup = useCallback(
    async (photoId: string, groupId: string) => {
      try {
        const { error } = await supabase
          .from('photo_group_photos')
          .insert([{ photo_id: photoId, group_id: groupId }]);

        if (error) throw error;

        // Refresh data
        await Promise.all([fetchGroups(), fetchPhotos()]);
      } catch (err) {
        console.error('Error adding photo to group:', err);
        throw new Error('Failed to add photo to group');
      }
    },
    [supabase, fetchGroups, fetchPhotos],
  );

  const removePhotoFromGroup = useCallback(
    async (photoId: string) => {
      try {
        const { error } = await supabase
          .from('photo_group_photos')
          .delete()
          .eq('photo_id', photoId);

        if (error) throw error;

        // Refresh data
        await Promise.all([fetchGroups(), fetchPhotos()]);
      } catch (err) {
        console.error('Error removing photo from group:', err);
        throw new Error('Failed to remove photo from group');
      }
    },
    [supabase, fetchGroups, fetchPhotos],
  );

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        await Promise.all([fetchGroups(), fetchPhotos()]);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [fetchGroups, fetchPhotos]);

  return {
    groups,
    photos,
    isLoading,
    error,
    createGroup,
    updateGroup,
    deleteGroup,
    addPhotoToGroup,
    removePhotoFromGroup,
    refetch: () => Promise.all([fetchGroups(), fetchPhotos()]),
  };
}
