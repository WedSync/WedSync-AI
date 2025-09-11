'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from './useAuth';
import type {
  PresenceState,
  PresenceStatus,
  PresenceSettings,
  PresencePermissions,
  UsePresenceOptions,
  UsePresenceReturn,
  WeddingPresenceContext,
} from '@/types/presence';
import { RealtimeChannel } from '@supabase/supabase-js';

// Utility function to check presence permissions
const checkPresencePermissions = (
  userId: string,
  viewerId: string,
  settings?: PresenceSettings,
): PresencePermissions => {
  // If user has chosen to appear offline or nobody can see presence
  if (settings?.appearOffline || settings?.visibility === 'nobody') {
    return {
      canViewPresence: false,
      canViewActivity: false,
      canViewCustomStatus: false,
      canViewCurrentPage: false,
      relationshipType: 'none',
    };
  }

  // Self can always see own presence
  if (userId === viewerId) {
    return {
      canViewPresence: true,
      canViewActivity: true,
      canViewCustomStatus: true,
      canViewCurrentPage: true,
      relationshipType: 'none',
    };
  }

  // TODO: Implement relationship-based permissions
  // This would query the database for wedding teams, organization members, contacts, etc.
  // For now, using basic visibility settings
  const canView =
    settings?.visibility === 'everyone' ||
    settings?.visibility === 'team' ||
    settings?.visibility === 'contacts';

  return {
    canViewPresence: canView,
    canViewActivity: canView && settings?.allowActivityTracking !== false,
    canViewCustomStatus: canView && settings?.showCustomStatus !== false,
    canViewCurrentPage: canView && settings?.showCurrentPage !== false,
    relationshipType: canView ? 'same_organization' : 'none',
  };
};

// Activity tracking state
interface ActivityState {
  lastActivity: Date;
  isActive: boolean;
  mouseMoveCount: number;
  keyPressCount: number;
}

export function usePresence({
  channelName,
  userId,
  trackActivity = true,
  updateInterval = 30000, // 30 seconds
  context = 'global',
  contextId,
}: UsePresenceOptions): UsePresenceReturn {
  const { user } = useAuth();
  const supabase = createClient();

  // State management
  const [presenceState, setPresenceState] = useState<
    Record<string, PresenceState[]>
  >({});
  const [myStatus, setMyStatus] = useState<PresenceStatus>('offline');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [channelStatus, setChannelStatus] = useState<
    'connected' | 'connecting' | 'disconnected'
  >('disconnected');

  // Refs for managing state and intervals
  const channelRef = useRef<RealtimeChannel | null>(null);
  const activityRef = useRef<ActivityState>({
    lastActivity: new Date(),
    isActive: true,
    mouseMoveCount: 0,
    keyPressCount: 0,
  });
  const idleTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const awayTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const updateIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const presenceSettingsRef = useRef<PresenceSettings | null>(null);

  // Load user's presence settings
  useEffect(() => {
    if (!user?.id) return;

    const loadPresenceSettings = async () => {
      try {
        const { data, error } = await supabase
          .from('user_presence_settings')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (error && error.code !== 'PGRST116') {
          // Not found error
          console.warn('Failed to load presence settings:', error);
          return;
        }

        presenceSettingsRef.current = data || {
          userId: user.id,
          visibility: 'team',
          appearOffline: false,
          allowActivityTracking: true,
          showCurrentPage: false,
          showCustomStatus: true,
          allowTypingIndicators: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
      } catch (err) {
        console.error('Error loading presence settings:', err);
      }
    };

    loadPresenceSettings();
  }, [user?.id, supabase]);

  // Activity tracking functions
  const updateActivity = useCallback(() => {
    if (!trackActivity) return;

    activityRef.current = {
      ...activityRef.current,
      lastActivity: new Date(),
      isActive: true,
    };

    // Reset idle/away timeouts
    if (idleTimeoutRef.current) {
      clearTimeout(idleTimeoutRef.current);
    }
    if (awayTimeoutRef.current) {
      clearTimeout(awayTimeoutRef.current);
    }

    // Set new timeouts
    idleTimeoutRef.current = setTimeout(() => {
      if (myStatus === 'online') {
        setMyStatus('idle');
      }
    }, 120000); // 2 minutes

    awayTimeoutRef.current = setTimeout(() => {
      if (myStatus === 'online' || myStatus === 'idle') {
        setMyStatus('away');
      }
    }, 600000); // 10 minutes

    // Update status to online if currently idle/away from activity
    if (myStatus === 'idle' || myStatus === 'away') {
      setMyStatus('online');
    }
  }, [trackActivity, myStatus]);

  // Activity event listeners
  useEffect(() => {
    if (!trackActivity) return;

    const handleMouseMove = () => {
      activityRef.current.mouseMoveCount++;
      updateActivity();
    };

    const handleKeyPress = () => {
      activityRef.current.keyPressCount++;
      updateActivity();
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        setMyStatus((prevStatus) =>
          prevStatus === 'online' ? 'idle' : prevStatus,
        );
      } else {
        updateActivity();
      }
    };

    // Add event listeners with debouncing
    let mouseTimeout: NodeJS.Timeout;
    let keyTimeout: NodeJS.Timeout;

    const debouncedMouseMove = () => {
      clearTimeout(mouseTimeout);
      mouseTimeout = setTimeout(handleMouseMove, 2000); // 2 second debounce
    };

    const debouncedKeyPress = () => {
      clearTimeout(keyTimeout);
      keyTimeout = setTimeout(handleKeyPress, 2000); // 2 second debounce
    };

    document.addEventListener('mousemove', debouncedMouseMove);
    document.addEventListener('keypress', debouncedKeyPress);
    document.addEventListener('click', updateActivity);
    document.addEventListener('scroll', updateActivity);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('mousemove', debouncedMouseMove);
      document.removeEventListener('keypress', debouncedKeyPress);
      document.removeEventListener('click', updateActivity);
      document.removeEventListener('scroll', updateActivity);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      clearTimeout(mouseTimeout);
      clearTimeout(keyTimeout);
    };
  }, [trackActivity, updateActivity]);

  // Update presence status function
  const updateStatus = useCallback(
    async (statusUpdate: Partial<PresenceState>) => {
      if (!channelRef.current || !user?.id) return;

      try {
        const currentPresence: PresenceState = {
          userId: user.id,
          status: myStatus,
          lastActivity: new Date().toISOString(),
          device: /Mobi|Android/i.test(navigator.userAgent)
            ? 'mobile'
            : 'desktop',
          updatedAt: new Date().toISOString(),
          ...statusUpdate,
        };

        // Check privacy settings before broadcasting
        const settings = presenceSettingsRef.current;
        if (settings?.appearOffline) {
          currentPresence.status = 'offline';
        }

        // Remove sensitive information based on privacy settings
        if (!settings?.showCurrentPage) {
          delete currentPresence.currentPage;
        }
        if (!settings?.showCustomStatus) {
          delete currentPresence.customStatus;
          delete currentPresence.customEmoji;
        }

        await channelRef.current.track(currentPresence);

        // Update local status
        if (statusUpdate.status) {
          setMyStatus(statusUpdate.status);
        }
      } catch (err) {
        setError(new Error(`Failed to update presence status: ${err}`));
        console.error('Presence update error:', err);
      }
    },
    [myStatus, user?.id],
  );

  // Set custom status function
  const setCustomStatus = useCallback(
    async (status: string, emoji?: string) => {
      await updateStatus({
        customStatus: status,
        customEmoji: emoji,
      });
    },
    [updateStatus],
  );

  // Track activity function (public API)
  const trackActivity = useCallback(() => {
    updateActivity();
  }, [updateActivity]);

  // Main presence channel setup
  useEffect(() => {
    if (!user?.id) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setChannelStatus('connecting');

    const channel = supabase.channel(channelName);
    channelRef.current = channel;

    // Handle presence sync
    channel.on('presence', { event: 'sync' }, () => {
      const state = channel.presenceState();
      const filteredState: Record<string, PresenceState[]> = {};

      // Apply privacy filtering
      Object.keys(state).forEach((key) => {
        const presences = state[key] as PresenceState[];
        filteredState[key] = presences.filter((presence) => {
          const permissions = checkPresencePermissions(
            presence.userId,
            user.id,
            presenceSettingsRef.current || undefined,
          );
          return permissions.canViewPresence;
        });
      });

      setPresenceState(filteredState);
    });

    // Handle presence joins
    channel.on('presence', { event: 'join' }, ({ newPresences }) => {
      console.log('Users joined:', newPresences);
      const state = channel.presenceState();
      setPresenceState(state as Record<string, PresenceState[]>);
    });

    // Handle presence leaves
    channel.on('presence', { event: 'leave' }, ({ leftPresences }) => {
      console.log('Users left:', leftPresences);
      const state = channel.presenceState();
      setPresenceState(state as Record<string, PresenceState[]>);
    });

    // Handle typing indicators and custom broadcasts
    channel.on(
      'broadcast',
      { event: 'typing' },
      ({ userId: typingUserId, isTyping }) => {
        setPresenceState((prev) => {
          const updated = { ...prev };
          if (updated[typingUserId]) {
            updated[typingUserId] = updated[typingUserId].map((presence) => ({
              ...presence,
              isTyping,
            }));
          }
          return updated;
        });
      },
    );

    // Subscribe to channel
    channel.subscribe(async (status) => {
      console.log(`Presence channel ${channelName} status:`, status);

      if (status === 'SUBSCRIBED') {
        setChannelStatus('connected');
        setIsLoading(false);

        // Initialize presence
        await updateStatus({
          status: 'online',
          lastActivity: new Date().toISOString(),
        });

        // Start periodic updates
        updateIntervalRef.current = setInterval(async () => {
          await updateStatus({
            lastActivity: new Date().toISOString(),
          });
        }, updateInterval);
      } else if (status === 'CHANNEL_ERROR') {
        setChannelStatus('disconnected');
        setError(new Error('Failed to connect to presence channel'));
        setIsLoading(false);
      }
    });

    // Cleanup function
    return () => {
      if (idleTimeoutRef.current) clearTimeout(idleTimeoutRef.current);
      if (awayTimeoutRef.current) clearTimeout(awayTimeoutRef.current);
      if (updateIntervalRef.current) clearInterval(updateIntervalRef.current);

      if (channelRef.current) {
        // Set status to offline before leaving
        channelRef.current.track({
          userId: user.id,
          status: 'offline',
          lastActivity: new Date().toISOString(),
        });

        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }

      setChannelStatus('disconnected');
    };
  }, [channelName, user?.id, supabase, updateInterval, updateStatus]);

  // Initialize online status when component mounts
  useEffect(() => {
    if (channelStatus === 'connected' && myStatus === 'offline') {
      setMyStatus('online');
      updateActivity();
    }
  }, [channelStatus, myStatus, updateActivity]);

  return {
    presenceState,
    myStatus,
    updateStatus,
    setCustomStatus,
    trackActivity,
    isLoading,
    error,
    channelStatus,
  };
}

// Specialized presence hooks for different contexts

export function useWeddingPresence(weddingId: string, enabled = true) {
  return usePresence({
    channelName: `wedding:${weddingId}:presence`,
    userId: '', // Will be set by useAuth in hook
    context: 'wedding',
    contextId: weddingId,
    trackActivity: enabled,
  });
}

export function useOrganizationPresence(orgId: string, enabled = true) {
  return usePresence({
    channelName: `organization:${orgId}:presence`,
    userId: '', // Will be set by useAuth in hook
    context: 'organization',
    contextId: orgId,
    trackActivity: enabled,
  });
}

export function useGlobalPresence(enabled = true) {
  return usePresence({
    channelName: 'global:presence',
    userId: '', // Will be set by useAuth in hook
    context: 'global',
    trackActivity: enabled,
  });
}
