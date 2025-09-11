'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  ConnectionRequest,
  NetworkingStats,
  VendorNetworkingProfile,
  CreateConnectionRequest,
  UpdateConnectionRequest,
  UpdateNetworkingProfileRequest,
  UseVendorNetworkingReturn,
  ConnectionsResponse,
  NetworkingProfileResponse,
  NetworkingApiError,
} from '@/types/vendor-networking';

export function useVendorNetworking(): UseVendorNetworkingReturn {
  const [connections, setConnections] = useState<ConnectionRequest[]>([]);
  const [stats, setStats] = useState<NetworkingStats | null>(null);
  const [profile, setProfile] = useState<VendorNetworkingProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load initial data
  useEffect(() => {
    Promise.all([refreshConnections(), refreshProfile()]).finally(() => {
      setLoading(false);
    });
  }, []);

  const refreshConnections = useCallback(async () => {
    try {
      setError(null);
      const response = await fetch(
        '/api/vendor-networking/connections?limit=50',
      );

      if (!response.ok) {
        const errorData: NetworkingApiError = await response.json();
        throw new Error(errorData.error || 'Failed to load connections');
      }

      const data: ConnectionsResponse = await response.json();
      setConnections(data.connections || []);

      // Calculate stats from connections
      const pendingRequests =
        data.connections?.filter(
          (c) => c.status === 'pending' && c.perspective === 'received',
        ).length || 0;

      const connectedCount =
        data.connections?.filter((c) => c.status === 'connected').length || 0;

      const recentActivity =
        data.connections?.filter((c) => {
          if (!c.last_interaction_at) return false;
          const lastActivity = new Date(c.last_interaction_at);
          const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
          return lastActivity > weekAgo;
        }).length || 0;

      setStats((prevStats) => ({
        total_connections: connectedCount,
        pending_requests: pendingRequests,
        active_referrals: prevStats?.active_referrals || 0,
        network_score: prevStats?.network_score || 0,
        recent_activity: recentActivity,
        connections_this_month: connectedCount, // Simplified for demo
        referrals_this_month: 0,
        response_rate: 85, // Placeholder
      }));
    } catch (err) {
      console.error('Error refreshing connections:', err);
      setError(
        err instanceof Error ? err.message : 'Failed to load connections',
      );
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    try {
      setError(null);
      const response = await fetch('/api/vendor-networking/profiles');

      if (!response.ok) {
        const errorData: NetworkingApiError = await response.json();
        throw new Error(errorData.error || 'Failed to load profile');
      }

      const data: NetworkingProfileResponse = await response.json();
      setProfile(data.profile);

      // Update stats with profile data
      if (data.profile) {
        setStats((prevStats) => ({
          total_connections: data.profile.total_connections,
          pending_requests: prevStats?.pending_requests || 0,
          active_referrals: data.profile.referrals_sent,
          network_score: data.profile.network_score,
          recent_activity: prevStats?.recent_activity || 0,
          connections_this_month: data.profile.active_connections,
          referrals_this_month: data.profile.referrals_sent,
          response_rate: 85, // Would calculate from actual data
        }));
      }
    } catch (err) {
      console.error('Error refreshing profile:', err);
      setError(err instanceof Error ? err.message : 'Failed to load profile');
    }
  }, []);

  const connectToVendor = useCallback(
    async (request: CreateConnectionRequest) => {
      try {
        setError(null);
        const response = await fetch('/api/vendor-networking/connections', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(request),
        });

        if (!response.ok) {
          const errorData: NetworkingApiError = await response.json();
          throw new Error(
            errorData.error || 'Failed to send connection request',
          );
        }

        const data = await response.json();

        // Add new connection to state
        setConnections((prev) => [data.connection, ...prev]);

        // Update stats
        setStats((prev) =>
          prev
            ? {
                ...prev,
                total_connections: prev.total_connections + 1,
              }
            : null,
        );
      } catch (err) {
        console.error('Error connecting to vendor:', err);
        setError(
          err instanceof Error ? err.message : 'Failed to connect to vendor',
        );
        throw err; // Re-throw for UI handling
      }
    },
    [],
  );

  const updateConnection = useCallback(
    async (request: UpdateConnectionRequest) => {
      try {
        setError(null);
        const response = await fetch('/api/vendor-networking/connections', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(request),
        });

        if (!response.ok) {
          const errorData: NetworkingApiError = await response.json();
          throw new Error(errorData.error || 'Failed to update connection');
        }

        const data = await response.json();

        // Update connection in state
        setConnections((prev) =>
          prev.map((conn) =>
            conn.id === request.connection_id ? data.connection : conn,
          ),
        );

        // Update stats if status changed to connected
        if (request.status === 'connected') {
          setStats((prev) =>
            prev
              ? {
                  ...prev,
                  total_connections: prev.total_connections + 1,
                  pending_requests: Math.max(0, prev.pending_requests - 1),
                }
              : null,
          );
        } else if (request.status === 'declined') {
          setStats((prev) =>
            prev
              ? {
                  ...prev,
                  pending_requests: Math.max(0, prev.pending_requests - 1),
                }
              : null,
          );
        }
      } catch (err) {
        console.error('Error updating connection:', err);
        setError(
          err instanceof Error ? err.message : 'Failed to update connection',
        );
        throw err; // Re-throw for UI handling
      }
    },
    [],
  );

  const updateProfile = useCallback(
    async (request: UpdateNetworkingProfileRequest) => {
      try {
        setError(null);
        const response = await fetch('/api/vendor-networking/profiles', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(request),
        });

        if (!response.ok) {
          const errorData: NetworkingApiError = await response.json();
          throw new Error(errorData.error || 'Failed to update profile');
        }

        const data: NetworkingProfileResponse = await response.json();
        setProfile(data.profile);
      } catch (err) {
        console.error('Error updating profile:', err);
        setError(
          err instanceof Error ? err.message : 'Failed to update profile',
        );
        throw err; // Re-throw for UI handling
      }
    },
    [],
  );

  return {
    connections,
    stats,
    profile,
    loading,
    error,
    refreshConnections,
    refreshProfile,
    connectToVendor,
    updateConnection,
    updateProfile,
  };
}
