'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { SupplierProfile, SupplierDashboardStats } from '@/types/supplier';

export function useSupplierPortal() {
  const { user } = useAuth();
  const [supplierProfile, setSupplierProfile] =
    useState<SupplierProfile | null>(null);
  const [dashboardStats, setDashboardStats] =
    useState<SupplierDashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user || user.role !== 'vendor') {
      setLoading(false);
      return;
    }

    fetchSupplierData();
  }, [user]);

  const fetchSupplierData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch supplier profile
      const profileResponse = await fetch(`/api/supplier/profile`);
      if (!profileResponse.ok) {
        throw new Error('Failed to fetch supplier profile');
      }
      const profile = await profileResponse.json();
      setSupplierProfile(profile);

      // Fetch dashboard stats
      const statsResponse = await fetch(`/api/supplier/dashboard-stats`);
      if (!statsResponse.ok) {
        throw new Error('Failed to fetch dashboard stats');
      }
      const stats = await statsResponse.json();
      setDashboardStats(stats);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const updateProfile = async (updates: Partial<SupplierProfile>) => {
    try {
      const response = await fetch(`/api/supplier/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        throw new Error('Failed to update profile');
      }

      const updatedProfile = await response.json();
      setSupplierProfile(updatedProfile);
      return updatedProfile;
    } catch (err) {
      throw new Error(
        err instanceof Error ? err.message : 'Failed to update profile',
      );
    }
  };

  const updateAvailability = async (availability: any) => {
    try {
      const response = await fetch(`/api/supplier/availability`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ availability }),
      });

      if (!response.ok) {
        throw new Error('Failed to update availability');
      }

      const updatedProfile = await response.json();
      setSupplierProfile(updatedProfile);
      return updatedProfile;
    } catch (err) {
      throw new Error(
        err instanceof Error ? err.message : 'Failed to update availability',
      );
    }
  };

  return {
    supplierProfile,
    dashboardStats,
    loading,
    error,
    refetch: fetchSupplierData,
    updateProfile,
    updateAvailability,
  };
}
