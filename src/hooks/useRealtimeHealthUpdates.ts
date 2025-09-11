/**
 * WS-168: Real-time Health Updates Hook
 * Supabase realtime integration for live health score updates
 */

import { useEffect, useCallback, useRef, useState } from 'react';
import { createClient, RealtimeChannel } from '@supabase/supabase-js';

// Real-time update types
interface HealthUpdateEvent {
  readonly type:
    | 'health_score_updated'
    | 'risk_level_changed'
    | 'intervention_triggered';
  readonly user_id: string;
  readonly timestamp: string;
  readonly old_value?: number;
  readonly new_value?: number;
  readonly risk_level?: 'low' | 'medium' | 'high' | 'critical';
  readonly intervention_type?: string;
}

interface RealtimeState {
  readonly connected: boolean;
  readonly lastUpdate: Date | null;
  readonly connectionError: string | null;
  readonly updateCount: number;
}

interface RealtimeCallbacks {
  readonly onHealthScoreUpdate?: (event: HealthUpdateEvent) => void;
  readonly onRiskLevelChange?: (event: HealthUpdateEvent) => void;
  readonly onInterventionTriggered?: (event: HealthUpdateEvent) => void;
  readonly onConnectionChange?: (connected: boolean) => void;
}

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

// Connection management
const MAX_RECONNECT_ATTEMPTS = 5;
const RECONNECT_DELAY = 2000;
const HEARTBEAT_INTERVAL = 30000;

export function useRealtimeHealthUpdates(
  callbacks: RealtimeCallbacks = {},
): RealtimeState {
  const [state, setState] = useState<RealtimeState>({
    connected: false,
    lastUpdate: null,
    connectionError: null,
    updateCount: 0,
  });

  const channelRef = useRef<RealtimeChannel | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Handle health score updates
  const handleHealthScoreUpdate = useCallback(
    (payload: any) => {
      try {
        const event: HealthUpdateEvent = {
          type: 'health_score_updated',
          user_id: payload.new.user_id,
          timestamp: payload.new.updated_at,
          old_value: payload.old?.overall_score,
          new_value: payload.new.overall_score,
        };

        setState((prev) => ({
          ...prev,
          lastUpdate: new Date(),
          updateCount: prev.updateCount + 1,
        }));

        callbacks.onHealthScoreUpdate?.(event);
      } catch (error) {
        console.error('Error handling health score update:', error);
      }
    },
    [callbacks],
  );

  // Handle risk level changes
  const handleRiskLevelChange = useCallback(
    (payload: any) => {
      try {
        const event: HealthUpdateEvent = {
          type: 'risk_level_changed',
          user_id: payload.new.user_id,
          timestamp: payload.new.updated_at,
          risk_level: payload.new.risk_level,
        };

        setState((prev) => ({
          ...prev,
          lastUpdate: new Date(),
          updateCount: prev.updateCount + 1,
        }));

        callbacks.onRiskLevelChange?.(event);
      } catch (error) {
        console.error('Error handling risk level change:', error);
      }
    },
    [callbacks],
  );

  // Handle intervention triggers
  const handleInterventionTriggered = useCallback(
    (payload: any) => {
      try {
        const event: HealthUpdateEvent = {
          type: 'intervention_triggered',
          user_id: payload.new.user_id,
          timestamp: payload.new.created_at,
          intervention_type: payload.new.intervention_type,
        };

        setState((prev) => ({
          ...prev,
          lastUpdate: new Date(),
          updateCount: prev.updateCount + 1,
        }));

        callbacks.onInterventionTriggered?.(event);
      } catch (error) {
        console.error('Error handling intervention trigger:', error);
      }
    },
    [callbacks],
  );

  // Connection management
  const handleConnectionChange = useCallback(
    (connected: boolean) => {
      setState((prev) => ({
        ...prev,
        connected,
        connectionError: connected ? null : prev.connectionError,
      }));

      callbacks.onConnectionChange?.(connected);

      if (connected) {
        reconnectAttemptsRef.current = 0;
      }
    },
    [callbacks],
  );

  // Setup heartbeat
  const setupHeartbeat = useCallback(() => {
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
    }

    heartbeatIntervalRef.current = setInterval(() => {
      if (channelRef.current && state.connected) {
        // Send heartbeat ping
        channelRef.current.send({
          type: 'broadcast',
          event: 'heartbeat',
          payload: { timestamp: Date.now() },
        });
      }
    }, HEARTBEAT_INTERVAL);
  }, [state.connected]);

  // Reconnection logic
  const attemptReconnection = useCallback(() => {
    if (reconnectAttemptsRef.current >= MAX_RECONNECT_ATTEMPTS) {
      setState((prev) => ({
        ...prev,
        connectionError: 'Maximum reconnection attempts exceeded',
      }));
      return;
    }

    reconnectAttemptsRef.current++;

    setTimeout(() => {
      if (channelRef.current) {
        channelRef.current.subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            handleConnectionChange(true);
            setupHeartbeat();
          } else if (status === 'CHANNEL_ERROR') {
            handleConnectionChange(false);
            attemptReconnection();
          }
        });
      }
    }, RECONNECT_DELAY * reconnectAttemptsRef.current);
  }, [handleConnectionChange, setupHeartbeat]);

  // Initialize real-time connection
  useEffect(() => {
    // Create channel for customer health updates
    const channel = supabase
      .channel('customer-health-updates')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'customer_health_scores',
        },
        handleHealthScoreUpdate,
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'customer_health_scores',
          filter: 'risk_level=neq.prev(risk_level)', // Only when risk level changes
        },
        handleRiskLevelChange,
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'customer_interventions',
        },
        handleInterventionTriggered,
      );

    channelRef.current = channel;

    // Subscribe to channel
    channel.subscribe((status) => {
      switch (status) {
        case 'SUBSCRIBED':
          handleConnectionChange(true);
          setupHeartbeat();
          break;
        case 'CHANNEL_ERROR':
          handleConnectionChange(false);
          setState((prev) => ({
            ...prev,
            connectionError: 'Failed to connect to real-time updates',
          }));
          attemptReconnection();
          break;
        case 'TIMED_OUT':
          handleConnectionChange(false);
          setState((prev) => ({
            ...prev,
            connectionError: 'Connection timed out',
          }));
          attemptReconnection();
          break;
        case 'CLOSED':
          handleConnectionChange(false);
          break;
      }
    });

    return () => {
      // Cleanup on unmount
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
      }

      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [
    handleHealthScoreUpdate,
    handleRiskLevelChange,
    handleInterventionTriggered,
    handleConnectionChange,
    setupHeartbeat,
    attemptReconnection,
  ]);

  return state;
}

// Hook for subscribing to specific user health updates
export function useUserHealthUpdates(
  userId: string,
  onUpdate?: (event: HealthUpdateEvent) => void,
): RealtimeState {
  const [state, setState] = useState<RealtimeState>({
    connected: false,
    lastUpdate: null,
    connectionError: null,
    updateCount: 0,
  });

  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    if (!userId) return;

    const channel = supabase.channel(`user-health-${userId}`).on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'customer_health_scores',
        filter: `user_id=eq.${userId}`,
      },
      (payload) => {
        const event: HealthUpdateEvent = {
          type: 'health_score_updated',
          user_id: payload.new.user_id,
          timestamp: payload.new.updated_at,
          old_value: payload.old?.overall_score,
          new_value: payload.new.overall_score,
          risk_level: payload.new.risk_level,
        };

        setState((prev) => ({
          ...prev,
          lastUpdate: new Date(),
          updateCount: prev.updateCount + 1,
        }));

        onUpdate?.(event);
      },
    );

    channelRef.current = channel;

    channel.subscribe((status) => {
      setState((prev) => ({
        ...prev,
        connected: status === 'SUBSCRIBED',
        connectionError:
          status === 'CHANNEL_ERROR' ? 'Connection failed' : null,
      }));
    });

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [userId, onUpdate]);

  return state;
}

// Hook for broadcasting health update events
export function useHealthUpdateBroadcast() {
  const broadcastHealthUpdate = useCallback(
    async (
      userId: string,
      updateType: HealthUpdateEvent['type'],
      metadata?: Record<string, any>,
    ): Promise<void> => {
      try {
        const channel = supabase.channel('health-updates-broadcast');

        await channel.send({
          type: 'broadcast',
          event: 'health_update',
          payload: {
            type: updateType,
            user_id: userId,
            timestamp: new Date().toISOString(),
            metadata,
          },
        });
      } catch (error) {
        console.error('Failed to broadcast health update:', error);
      }
    },
    [],
  );

  const broadcastInterventionResult = useCallback(
    async (
      userId: string,
      interventionType: string,
      success: boolean,
      message?: string,
    ): Promise<void> => {
      try {
        const channel = supabase.channel('intervention-results-broadcast');

        await channel.send({
          type: 'broadcast',
          event: 'intervention_result',
          payload: {
            user_id: userId,
            intervention_type: interventionType,
            success,
            message,
            timestamp: new Date().toISOString(),
          },
        });
      } catch (error) {
        console.error('Failed to broadcast intervention result:', error);
      }
    },
    [],
  );

  return {
    broadcastHealthUpdate,
    broadcastInterventionResult,
  };
}

export type { HealthUpdateEvent, RealtimeState, RealtimeCallbacks };
