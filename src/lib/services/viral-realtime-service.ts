/**
 * Viral Realtime Service - WS-141 Round 2
 * Supabase realtime subscriptions for live viral optimization updates
 * INTEGRATION: Works with database triggers and materialized views
 */

import { supabase } from '@/lib/supabase/client';
import type {
  RealtimeChannel,
  RealtimePostgresChangesPayload,
} from '@supabase/supabase-js';

// Types for realtime events
export interface ViralInvitationEvent {
  id: string;
  sender_id: string;
  status: string;
  generation: number;
  timestamp: number;
  event_type: 'INSERT' | 'UPDATE' | 'DELETE';
}

export interface ABTestResultEvent {
  template_variant_id: string;
  result_type: string;
  test_group: string;
  timestamp: number;
  event_type: 'INSERT' | 'UPDATE';
}

export interface ReferralRewardEvent {
  id: string;
  referrer_id: string;
  status: string;
  final_reward_amount: number;
  timestamp: number;
  event_type: 'INSERT' | 'UPDATE';
}

export interface SuperConnectorUpdate {
  user_id: string;
  new_score: number;
  new_tier: string;
  timestamp: number;
}

// Event handler types
export type ViralInvitationHandler = (event: ViralInvitationEvent) => void;
export type ABTestResultHandler = (event: ABTestResultEvent) => void;
export type ReferralRewardHandler = (event: ReferralRewardEvent) => void;
export type SuperConnectorHandler = (event: SuperConnectorUpdate) => void;
export type ConnectionHandler = (
  status: 'connected' | 'disconnected' | 'error',
) => void;

export class ViralRealtimeService {
  private static instance: ViralRealtimeService;
  private channels: Map<string, RealtimeChannel> = new Map();
  private handlers: Map<string, Function[]> = new Map();
  private isInitialized: boolean = false;

  private constructor() {}

  static getInstance(): ViralRealtimeService {
    if (!ViralRealtimeService.instance) {
      ViralRealtimeService.instance = new ViralRealtimeService();
    }
    return ViralRealtimeService.instance;
  }

  /**
   * Initialize the realtime service with authentication
   */
  async initialize(userId?: string): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Set up connection status monitoring
      supabase.realtime.onOpen(() =>
        this.notifyHandlers('connection', 'connected'),
      );
      supabase.realtime.onClose(() =>
        this.notifyHandlers('connection', 'disconnected'),
      );
      supabase.realtime.onError(() =>
        this.notifyHandlers('connection', 'error'),
      );

      this.isInitialized = true;
      console.log('Viral realtime service initialized successfully');
    } catch (error) {
      console.error('Failed to initialize viral realtime service:', error);
      throw new Error('Realtime service initialization failed');
    }
  }

  /**
   * Subscribe to viral invitation updates
   * Receives realtime updates when invitations are sent, opened, clicked, or converted
   */
  subscribeToViralInvitations(
    handler: ViralInvitationHandler,
    filters?: { sender_id?: string; status?: string },
  ): () => void {
    const channelName = `viral_invitations_${JSON.stringify(filters || {})}`;

    if (!this.channels.has(channelName)) {
      const channel = supabase
        .channel(channelName)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'viral_invitations',
            ...(filters?.sender_id && {
              filter: `sender_id=eq.${filters.sender_id}`,
            }),
          },
          (payload: RealtimePostgresChangesPayload<any>) => {
            const event: ViralInvitationEvent = {
              id: payload.new?.id || payload.old?.id,
              sender_id: payload.new?.sender_id || payload.old?.sender_id,
              status: payload.new?.status || payload.old?.status,
              generation: payload.new?.generation || payload.old?.generation,
              timestamp: Date.now(),
              event_type: payload.eventType,
            };
            this.notifyHandlers(channelName, event);
          },
        )
        .subscribe();

      this.channels.set(channelName, channel);
      this.handlers.set(channelName, []);
    }

    // Add handler
    const channelHandlers = this.handlers.get(channelName) || [];
    channelHandlers.push(handler);
    this.handlers.set(channelName, channelHandlers);

    // Return unsubscribe function
    return () => this.unsubscribeHandler(channelName, handler);
  }

  /**
   * Subscribe to A/B test results
   * Receives realtime updates when A/B test results are recorded
   */
  subscribeToABTestResults(
    handler: ABTestResultHandler,
    templateVariantId?: string,
  ): () => void {
    const channelName = `ab_test_results_${templateVariantId || 'all'}`;

    if (!this.channels.has(channelName)) {
      const channel = supabase
        .channel(channelName)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'viral_ab_test_results',
            ...(templateVariantId && {
              filter: `template_variant_id=eq.${templateVariantId}`,
            }),
          },
          (payload: RealtimePostgresChangesPayload<any>) => {
            const event: ABTestResultEvent = {
              template_variant_id:
                payload.new?.template_variant_id ||
                payload.old?.template_variant_id,
              result_type: payload.new?.result_type || payload.old?.result_type,
              test_group: payload.new?.test_group || payload.old?.test_group,
              timestamp: Date.now(),
              event_type: payload.eventType,
            };
            this.notifyHandlers(channelName, event);
          },
        )
        .subscribe();

      this.channels.set(channelName, channel);
      this.handlers.set(channelName, []);
    }

    const channelHandlers = this.handlers.get(channelName) || [];
    channelHandlers.push(handler);
    this.handlers.set(channelName, channelHandlers);

    return () => this.unsubscribeHandler(channelName, handler);
  }

  /**
   * Subscribe to referral reward updates
   * Receives realtime updates when rewards are created, approved, or fulfilled
   */
  subscribeToReferralRewards(
    handler: ReferralRewardHandler,
    referrerId?: string,
  ): () => void {
    const channelName = `referral_rewards_${referrerId || 'all'}`;

    if (!this.channels.has(channelName)) {
      const channel = supabase
        .channel(channelName)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'referral_rewards',
            ...(referrerId && { filter: `referrer_id=eq.${referrerId}` }),
          },
          (payload: RealtimePostgresChangesPayload<any>) => {
            const event: ReferralRewardEvent = {
              id: payload.new?.id || payload.old?.id,
              referrer_id: payload.new?.referrer_id || payload.old?.referrer_id,
              status: payload.new?.status || payload.old?.status,
              final_reward_amount:
                payload.new?.final_reward_amount ||
                payload.old?.final_reward_amount,
              timestamp: Date.now(),
              event_type: payload.eventType,
            };
            this.notifyHandlers(channelName, event);
          },
        )
        .subscribe();

      this.channels.set(channelName, channel);
      this.handlers.set(channelName, []);
    }

    const channelHandlers = this.handlers.get(channelName) || [];
    channelHandlers.push(handler);
    this.handlers.set(channelName, channelHandlers);

    return () => this.unsubscribeHandler(channelName, handler);
  }

  /**
   * Subscribe to super-connector score updates
   * Receives updates when super-connector scores are recalculated
   */
  subscribeToSuperConnectorUpdates(
    handler: SuperConnectorHandler,
    userId?: string,
  ): () => void {
    const channelName = `super_connectors_${userId || 'all'}`;

    if (!this.channels.has(channelName)) {
      const channel = supabase
        .channel(channelName)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'super_connectors',
            ...(userId && { filter: `user_id=eq.${userId}` }),
          },
          (payload: RealtimePostgresChangesPayload<any>) => {
            const event: SuperConnectorUpdate = {
              user_id: payload.new?.user_id,
              new_score: payload.new?.super_connector_score,
              new_tier: payload.new?.tier,
              timestamp: Date.now(),
            };
            this.notifyHandlers(channelName, event);
          },
        )
        .subscribe();

      this.channels.set(channelName, channel);
      this.handlers.set(channelName, []);
    }

    const channelHandlers = this.handlers.get(channelName) || [];
    channelHandlers.push(handler);
    this.handlers.set(channelName, channelHandlers);

    return () => this.unsubscribeHandler(channelName, handler);
  }

  /**
   * Subscribe to viral analytics summary updates
   * Receives updates when materialized views are refreshed
   */
  subscribeToAnalyticsSummary(
    handler: (summary: any) => void,
    channel: 'email' | 'whatsapp' | 'sms' = 'email',
  ): () => void {
    const channelName = `viral_analytics_${channel}`;

    if (!this.channels.has(channelName)) {
      const realtimeChannel = supabase
        .channel(channelName)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'viral_analytics_summary',
            filter: `channel=eq.${channel}`,
          },
          (payload: RealtimePostgresChangesPayload<any>) => {
            this.notifyHandlers(channelName, payload.new || payload.old);
          },
        )
        .subscribe();

      this.channels.set(channelName, realtimeChannel);
      this.handlers.set(channelName, []);
    }

    const channelHandlers = this.handlers.get(channelName) || [];
    channelHandlers.push(handler);
    this.handlers.set(channelName, channelHandlers);

    return () => this.unsubscribeHandler(channelName, handler);
  }

  /**
   * Subscribe to connection status changes
   */
  subscribeToConnectionStatus(handler: ConnectionHandler): () => void {
    const channelName = 'connection';

    if (!this.handlers.has(channelName)) {
      this.handlers.set(channelName, []);
    }

    const channelHandlers = this.handlers.get(channelName) || [];
    channelHandlers.push(handler);
    this.handlers.set(channelName, channelHandlers);

    return () => this.unsubscribeHandler(channelName, handler);
  }

  /**
   * Subscribe to custom PostgreSQL notifications
   * Listens to NOTIFY commands from database triggers
   */
  subscribeToCustomNotifications(): () => void {
    const channelName = 'custom_notifications';

    if (!this.channels.has(channelName)) {
      const channel = supabase
        .channel(channelName)
        .on(
          'postgres_changes',
          { event: '*', schema: '*', table: '*' },
          () => {},
        )
        .subscribe();

      // Listen to custom notifications
      channel.send({
        type: 'postgres_listen',
        payload: { event: 'viral_invitation_change' },
      });

      channel.send({
        type: 'postgres_listen',
        payload: { event: 'ab_test_change' },
      });

      channel.send({
        type: 'postgres_listen',
        payload: { event: 'referral_reward_change' },
      });

      this.channels.set(channelName, channel);
    }

    return () => this.unsubscribeChannel(channelName);
  }

  /**
   * Get realtime viral metrics for dashboard
   * Provides live metrics aggregation with caching
   */
  async getRealtimeMetrics(timeframe: '1h' | '24h' | '7d' = '24h'): Promise<{
    active_invitations: number;
    conversion_rate: number;
    top_performers: Array<{ user_id: string; conversions: number }>;
    channel_breakdown: Array<{ channel: string; count: number }>;
  }> {
    try {
      const hoursBack = timeframe === '1h' ? 1 : timeframe === '24h' ? 24 : 168;

      const { data, error } = await supabase
        .from('viral_invitations')
        .select('sender_id, status, channel')
        .gte(
          'sent_at',
          new Date(Date.now() - hoursBack * 60 * 60 * 1000).toISOString(),
        );

      if (error) throw error;

      // Aggregate metrics
      const activeInvitations = data.filter(
        (inv) => inv.status === 'pending',
      ).length;
      const conversions = data.filter(
        (inv) => inv.status === 'converted',
      ).length;
      const conversionRate =
        data.length > 0 ? (conversions / data.length) * 100 : 0;

      // Top performers
      const performerMap = new Map<string, number>();
      data.forEach((inv) => {
        if (inv.status === 'converted') {
          performerMap.set(
            inv.sender_id,
            (performerMap.get(inv.sender_id) || 0) + 1,
          );
        }
      });

      const topPerformers = Array.from(performerMap.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([user_id, conversions]) => ({ user_id, conversions }));

      // Channel breakdown
      const channelMap = new Map<string, number>();
      data.forEach((inv) => {
        channelMap.set(inv.channel, (channelMap.get(inv.channel) || 0) + 1);
      });

      const channelBreakdown = Array.from(channelMap.entries()).map(
        ([channel, count]) => ({ channel, count }),
      );

      return {
        active_invitations: activeInvitations,
        conversion_rate: Math.round(conversionRate * 100) / 100,
        top_performers: topPerformers,
        channel_breakdown: channelBreakdown,
      };
    } catch (error) {
      console.error('Failed to get realtime metrics:', error);
      return {
        active_invitations: 0,
        conversion_rate: 0,
        top_performers: [],
        channel_breakdown: [],
      };
    }
  }

  /**
   * Cleanup and disconnect all subscriptions
   */
  async cleanup(): Promise<void> {
    try {
      // Unsubscribe from all channels
      for (const [channelName, channel] of this.channels) {
        await supabase.removeChannel(channel);
        console.log(`Unsubscribed from channel: ${channelName}`);
      }

      // Clear all maps
      this.channels.clear();
      this.handlers.clear();
      this.isInitialized = false;

      console.log('Viral realtime service cleanup completed');
    } catch (error) {
      console.error('Error during viral realtime service cleanup:', error);
    }
  }

  // Private helper methods

  private notifyHandlers(channelName: string, data: any): void {
    const handlers = this.handlers.get(channelName) || [];
    handlers.forEach((handler) => {
      try {
        handler(data);
      } catch (error) {
        console.error(`Handler error for channel ${channelName}:`, error);
      }
    });
  }

  private unsubscribeHandler(channelName: string, handler: Function): void {
    const handlers = this.handlers.get(channelName) || [];
    const index = handlers.indexOf(handler);
    if (index > -1) {
      handlers.splice(index, 1);
    }

    // If no more handlers, cleanup channel
    if (handlers.length === 0) {
      this.unsubscribeChannel(channelName);
    }
  }

  private async unsubscribeChannel(channelName: string): Promise<void> {
    const channel = this.channels.get(channelName);
    if (channel) {
      await supabase.removeChannel(channel);
      this.channels.delete(channelName);
      this.handlers.delete(channelName);
    }
  }
}

// Export singleton instance
export const viralRealtimeService = ViralRealtimeService.getInstance();

// Utility function for React components
export function useViralRealtime() {
  return {
    subscribeToViralInvitations:
      viralRealtimeService.subscribeToViralInvitations.bind(
        viralRealtimeService,
      ),
    subscribeToABTestResults:
      viralRealtimeService.subscribeToABTestResults.bind(viralRealtimeService),
    subscribeToReferralRewards:
      viralRealtimeService.subscribeToReferralRewards.bind(
        viralRealtimeService,
      ),
    subscribeToSuperConnectorUpdates:
      viralRealtimeService.subscribeToSuperConnectorUpdates.bind(
        viralRealtimeService,
      ),
    subscribeToAnalyticsSummary:
      viralRealtimeService.subscribeToAnalyticsSummary.bind(
        viralRealtimeService,
      ),
    subscribeToConnectionStatus:
      viralRealtimeService.subscribeToConnectionStatus.bind(
        viralRealtimeService,
      ),
    getRealtimeMetrics:
      viralRealtimeService.getRealtimeMetrics.bind(viralRealtimeService),
    cleanup: viralRealtimeService.cleanup.bind(viralRealtimeService),
  };
}
