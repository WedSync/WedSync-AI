import {
  SupabaseClient,
  RealtimeChannel,
  RealtimePostgresChangesPayload,
} from '@supabase/supabase-js';
import {
  RealtimeChannelFilter,
  SubscriptionResult,
  DatabaseRealtimeSubscription,
  RealtimeCallback,
  RealtimeUserContext,
  RealtimeChannelName,
  FormResponseSubscription,
  JourneyProgressSubscription,
  CoreFieldSubscription,
  RealtimeError,
} from '../../types/realtime';

/**
 * RealtimeSubscriptionManager - Core backend subscription management for WedSync
 *
 * Handles secure channel subscriptions, connection tracking, and wedding industry
 * event filtering with Row Level Security integration via Supabase WALRUS.
 *
 * Wedding Industry Use Cases:
 * - Form response notifications for suppliers
 * - Journey progress tracking for milestone completion
 * - Core field changes for wedding details
 * - Client communication updates
 *
 * Security Features:
 * - User permission validation before subscription
 * - Row Level Security filter construction
 * - Connection cleanup and monitoring
 * - Audit logging for all subscription activities
 */
export class RealtimeSubscriptionManager {
  private supabase: SupabaseClient;
  private subscriptions: Map<string, RealtimeChannel> = new Map();
  private userContext?: RealtimeUserContext;
  private maxConnectionsPerUser: number = 10;
  private enableActivityLogging: boolean = true;

  constructor(
    supabaseClient: SupabaseClient,
    config?: {
      maxConnectionsPerUser?: number;
      enableActivityLogging?: boolean;
    },
  ) {
    this.supabase = supabaseClient;

    if (config) {
      this.maxConnectionsPerUser = config.maxConnectionsPerUser ?? 10;
      this.enableActivityLogging = config.enableActivityLogging ?? true;
    }
  }

  /**
   * Initialize user context for permission validation
   */
  async initializeUserContext(userId: string): Promise<void> {
    const { data: profile, error } = await this.supabase
      .from('user_profiles')
      .select('id, user_type, supplier_id, couple_id, organization_id')
      .eq('id', userId)
      .single();

    if (error || !profile) {
      throw new RealtimeError(
        'Failed to load user profile for realtime context',
        'UNAUTHORIZED',
        { userId, error },
      );
    }

    this.userContext = {
      id: profile.id,
      user_type: profile.user_type,
      supplier_id: profile.supplier_id,
      couple_id: profile.couple_id,
      organization_id: profile.organization_id,
    };
  }

  /**
   * Subscribe to a realtime channel with security validation
   */
  async subscribeToChannel(
    userId: string,
    channelName: string,
    tableFilter: RealtimeChannelFilter,
    callback: RealtimeCallback,
  ): Promise<SubscriptionResult> {
    try {
      // Ensure user context is loaded
      if (!this.userContext || this.userContext.id !== userId) {
        await this.initializeUserContext(userId);
      }

      // Check connection limits
      await this.validateConnectionLimits(userId);

      // Validate user permissions for channel
      const hasPermission = await this.validateChannelPermission(
        userId,
        channelName,
        tableFilter,
      );

      if (!hasPermission) {
        throw new RealtimeError(
          `Unauthorized access to channel: ${channelName}`,
          'UNAUTHORIZED',
          { userId, channelName, tableFilter },
        );
      }

      // Create unique channel identifier
      const channelId = `${channelName}-${userId}-${Date.now()}-${Math.random().toString(36).slice(2)}`;

      // Create and configure Supabase realtime channel
      const channel = this.supabase.channel(channelId);

      // Build RLS-compliant filter for WALRUS
      const rlsFilter = this.buildRLSFilter(userId, tableFilter);

      // Set up postgres changes subscription with RLS filter
      channel.on<any>(
        'postgres_changes',
        {
          event: tableFilter.event || '*',
          schema: 'public',
          table: tableFilter.table,
          filter: rlsFilter,
        },
        (payload: RealtimePostgresChangesPayload<any>) => {
          // Log subscription activity for audit
          if (this.enableActivityLogging) {
            this.logSubscriptionActivity(
              userId,
              channelId,
              payload.eventType,
              payload,
            );
          }

          // Execute callback with payload
          callback(payload);
        },
      );

      // Subscribe to channel
      const subscriptionStatus = await channel.subscribe();

      if (subscriptionStatus !== 'SUBSCRIBED') {
        throw new RealtimeError(
          'Failed to establish realtime subscription',
          'CONNECTION_FAILED',
          { subscriptionStatus, channelId },
        );
      }

      // Store active subscription
      this.subscriptions.set(channelId, channel);

      // Record subscription in database for monitoring
      await this.recordSubscription(
        userId,
        channelId,
        channelName,
        tableFilter,
      );

      return {
        success: true,
        channelId,
        filter: rlsFilter,
      };
    } catch (error) {
      console.error('Subscription error:', error);

      if (error instanceof RealtimeError) {
        throw error;
      }

      throw new RealtimeError(
        'Failed to create subscription',
        'CONNECTION_FAILED',
        { error: error instanceof Error ? error.message : error },
      );
    }
  }

  /**
   * Wedding-specific subscription for form response updates
   */
  async subscribeToFormResponses(
    supplierId: string,
    config?: FormResponseSubscription,
  ): Promise<SubscriptionResult> {
    const filter: RealtimeChannelFilter = {
      table: 'form_responses',
      filter: `supplier_id=eq.${supplierId}`,
      event: '*',
    };

    // Add optional form/wedding filters
    if (config?.form_id) {
      filter.filter += `,form_id=eq.${config.form_id}`;
    }
    if (config?.wedding_id) {
      filter.filter += `,wedding_id=eq.${config.wedding_id}`;
    }

    return this.subscribeToChannel(
      supplierId,
      'form-responses',
      filter,
      (payload) => this.handleFormResponseUpdate(supplierId, payload),
    );
  }

  /**
   * Wedding-specific subscription for journey progress tracking
   */
  async subscribeToJourneyProgress(
    supplierId: string,
    config?: JourneyProgressSubscription,
  ): Promise<SubscriptionResult> {
    const filter: RealtimeChannelFilter = {
      table: 'journey_progress',
      filter: `supplier_id=eq.${supplierId}`,
      event: '*',
    };

    // Add optional journey/step filters
    if (config?.journey_id) {
      filter.filter += `,journey_id=eq.${config.journey_id}`;
    }
    if (config?.step_id) {
      filter.filter += `,step_id=eq.${config.step_id}`;
    }

    return this.subscribeToChannel(
      supplierId,
      'journey-progress',
      filter,
      (payload) => this.handleJourneyProgressUpdate(supplierId, payload),
    );
  }

  /**
   * Wedding-specific subscription for core field changes
   */
  async subscribeToCoreFields(
    coupleId: string,
    config: CoreFieldSubscription,
  ): Promise<SubscriptionResult> {
    const filter: RealtimeChannelFilter = {
      table: 'core_fields',
      filter: `couple_id=eq.${coupleId},wedding_id=eq.${config.wedding_id}`,
      event: '*',
    };

    // Add optional field group filter
    if (config.field_group) {
      filter.filter += `,field_group=eq.${config.field_group}`;
    }

    return this.subscribeToChannel(coupleId, 'core-fields', filter, (payload) =>
      this.handleCoreFieldUpdate(coupleId, payload),
    );
  }

  /**
   * Unsubscribe from a specific channel
   */
  async unsubscribeFromChannel(channelId: string): Promise<void> {
    const channel = this.subscriptions.get(channelId);

    if (channel) {
      await channel.unsubscribe();
      this.subscriptions.delete(channelId);
      await this.removeSubscriptionRecord(channelId);
    }
  }

  /**
   * Unsubscribe from all channels and cleanup
   */
  async cleanup(): Promise<void> {
    const unsubscribePromises = Array.from(this.subscriptions.keys()).map(
      (channelId) => this.unsubscribeFromChannel(channelId),
    );

    await Promise.all(unsubscribePromises);
    this.subscriptions.clear();
    this.userContext = undefined;
  }

  /**
   * Get current subscription status
   */
  getActiveSubscriptions(): string[] {
    return Array.from(this.subscriptions.keys());
  }

  /**
   * Update subscription ping for connection monitoring
   */
  async updateConnectionPing(channelId: string): Promise<void> {
    await this.supabase
      .from('realtime_subscriptions')
      .update({ last_ping_at: new Date().toISOString() })
      .eq('channel_name', channelId); // Note: using channel_name as identifier
  }

  // ===========================
  // PRIVATE VALIDATION METHODS
  // ===========================

  private async validateConnectionLimits(userId: string): Promise<void> {
    const { count } = await this.supabase
      .from('realtime_subscriptions')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('active', true);

    if ((count || 0) >= this.maxConnectionsPerUser) {
      throw new RealtimeError(
        `Maximum connections exceeded (${this.maxConnectionsPerUser})`,
        'RATE_LIMITED',
        { userId, currentConnections: count },
      );
    }
  }

  private async validateChannelPermission(
    userId: string,
    channelName: string,
    filter: RealtimeChannelFilter,
  ): Promise<boolean> {
    if (!this.userContext) {
      return false;
    }

    // Use the database function for consistent validation
    const { data, error } = await this.supabase.rpc(
      'validate_channel_permission',
      {
        user_uuid: userId,
        channel_name: channelName,
        filter_params: filter,
      },
    );

    if (error) {
      console.error('Permission validation error:', error);
      return false;
    }

    return data === true;
  }

  private buildRLSFilter(
    userId: string,
    filter: RealtimeChannelFilter,
  ): string {
    if (!this.userContext) {
      return '';
    }

    // WALRUS handles the RLS checks at the database level
    // We just need to provide the filter parameters
    return filter.filter || '';
  }

  // ===========================
  // PRIVATE DATABASE METHODS
  // ===========================

  private async recordSubscription(
    userId: string,
    channelId: string,
    channelName: string,
    filter: RealtimeChannelFilter,
  ): Promise<void> {
    const { error } = await this.supabase
      .from('realtime_subscriptions')
      .insert({
        user_id: userId,
        channel_name: channelName,
        table_name: filter.table,
        filter_params: filter,
        active: true,
      });

    if (error) {
      console.error('Failed to record subscription:', error);
      // Don't fail the subscription for database logging errors
    }
  }

  private async removeSubscriptionRecord(channelId: string): Promise<void> {
    const { error } = await this.supabase
      .from('realtime_subscriptions')
      .update({ active: false })
      .eq('channel_name', channelId);

    if (error) {
      console.error('Failed to remove subscription record:', error);
    }
  }

  private async logSubscriptionActivity(
    userId: string,
    channelId: string,
    eventType: string,
    payload?: any,
  ): Promise<void> {
    if (!this.enableActivityLogging) return;

    const { error } = await this.supabase
      .from('realtime_activity_logs')
      .insert({
        user_id: userId,
        channel_id: channelId,
        event_type: eventType,
        payload: payload ? JSON.stringify(payload) : null,
        table_name: payload?.table || null,
        record_id: payload?.new?.id || payload?.old?.id || null,
      });

    if (error) {
      console.error('Failed to log subscription activity:', error);
      // Don't fail operations for logging errors
    }
  }

  // ===========================
  // WEDDING INDUSTRY HANDLERS
  // ===========================

  private handleFormResponseUpdate(
    supplierId: string,
    payload: RealtimePostgresChangesPayload<any>,
  ): void {
    // Wedding industry specific: Form response received
    console.log(`Form response update for supplier ${supplierId}:`, {
      eventType: payload.eventType,
      responseId: payload.new?.id || payload.old?.id,
      formId: payload.new?.form_id || payload.old?.form_id,
      weddingId: payload.new?.wedding_id || payload.old?.wedding_id,
    });

    // Additional business logic can be added here:
    // - Send email notifications
    // - Update supplier dashboard
    // - Trigger journey progression
  }

  private handleJourneyProgressUpdate(
    supplierId: string,
    payload: RealtimePostgresChangesPayload<any>,
  ): void {
    // Wedding industry specific: Journey milestone completed
    console.log(`Journey progress update for supplier ${supplierId}:`, {
      eventType: payload.eventType,
      progressId: payload.new?.id || payload.old?.id,
      journeyId: payload.new?.journey_id || payload.old?.journey_id,
      stepId: payload.new?.step_id || payload.old?.step_id,
      completedAt: payload.new?.completed_at,
    });

    // Additional business logic:
    // - Update timeline view
    // - Notify stakeholders
    // - Trigger next steps
  }

  private handleCoreFieldUpdate(
    coupleId: string,
    payload: RealtimePostgresChangesPayload<any>,
  ): void {
    // Wedding industry specific: Core wedding details changed
    console.log(`Core field update for couple ${coupleId}:`, {
      eventType: payload.eventType,
      fieldId: payload.new?.id || payload.old?.id,
      fieldGroup: payload.new?.field_group || payload.old?.field_group,
      fieldName: payload.new?.field_name || payload.old?.field_name,
      newValue: payload.new?.field_value,
      oldValue: payload.old?.field_value,
    });

    // Additional business logic:
    // - Sync to vendor systems
    // - Update wedding website
    // - Notify affected suppliers
  }
}
