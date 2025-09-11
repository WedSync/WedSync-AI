/**
 * Client Interaction Tracking Foundation
 * Feature ID: WS-052
 *
 * Comprehensive tracking system for all client-supplier interactions
 * with automatic event capture and real-time processing
 */

import { createClient } from '@/lib/supabase/server';
import { realtimeMetricsService } from './real-time-metrics';
import { engagementScoringService } from './engagement-scoring';

export interface InteractionEvent {
  clientId: string;
  supplierId: string;
  eventType: InteractionEventType;
  eventData: Record<string, any>;
  metadata: InteractionMetadata;
  timestamp: Date;
}

export type InteractionEventType =
  // Email Events
  | 'email_sent'
  | 'email_opened'
  | 'email_clicked'
  | 'email_replied'
  | 'email_bounced'
  | 'email_unsubscribed'

  // Portal Events
  | 'portal_login'
  | 'portal_page_view'
  | 'portal_document_download'
  | 'portal_profile_updated'
  | 'portal_session_end'

  // Form Events
  | 'form_viewed'
  | 'form_started'
  | 'form_field_completed'
  | 'form_abandoned'
  | 'form_submitted'
  | 'form_error'

  // Communication Events
  | 'message_sent'
  | 'message_received'
  | 'call_scheduled'
  | 'call_started'
  | 'call_completed'
  | 'call_missed'
  | 'meeting_scheduled'
  | 'meeting_joined'
  | 'meeting_completed'
  | 'meeting_no_show'

  // Payment Events
  | 'invoice_sent'
  | 'invoice_viewed'
  | 'payment_initiated'
  | 'payment_completed'
  | 'payment_failed'
  | 'payment_refunded'

  // Contract Events
  | 'contract_sent'
  | 'contract_viewed'
  | 'contract_signed'
  | 'contract_declined'

  // Journey Events
  | 'journey_started'
  | 'journey_step_completed'
  | 'journey_milestone_reached'
  | 'journey_completed'
  | 'journey_abandoned';

export interface InteractionMetadata {
  sessionId?: string;
  userAgent?: string;
  ipAddress?: string;
  referrer?: string;
  deviceType?: 'desktop' | 'mobile' | 'tablet';
  browser?: string;
  location?: {
    country?: string;
    city?: string;
    region?: string;
  };
  source?: 'web' | 'mobile_app' | 'email' | 'api' | 'integration';
  campaign?: {
    id?: string;
    name?: string;
    medium?: string;
  };
}

export interface InteractionSession {
  id: string;
  clientId: string;
  supplierId: string;
  startTime: Date;
  endTime?: Date;
  duration?: number; // in seconds
  events: InteractionEvent[];
  metadata: InteractionMetadata;
  engagementScore?: number;
}

export class InteractionTracker {
  private supabase;
  private sessions: Map<string, InteractionSession> = new Map();
  private eventQueue: InteractionEvent[] = [];
  private processingInterval: NodeJS.Timeout | null = null;
  private batchSize = 50;
  private flushInterval = 5000; // 5 seconds

  constructor() {
    this.supabase = createClient();
    this.startProcessing();
  }

  /**
   * Start the event processing loop
   */
  private startProcessing() {
    this.processingInterval = setInterval(() => {
      this.flushEventQueue();
    }, this.flushInterval);
  }

  /**
   * Track a new interaction event
   */
  async track(event: Omit<InteractionEvent, 'timestamp'>): Promise<void> {
    const fullEvent: InteractionEvent = {
      ...event,
      timestamp: new Date(),
    };

    // Add to queue for batch processing
    this.eventQueue.push(fullEvent);

    // Update session if exists
    this.updateSession(fullEvent);

    // Process immediately if queue is full
    if (this.eventQueue.length >= this.batchSize) {
      await this.flushEventQueue();
    }

    // Trigger real-time metrics update
    await this.triggerRealtimeUpdate(fullEvent);
  }

  /**
   * Track email interaction
   */
  async trackEmail(
    clientId: string,
    supplierId: string,
    action:
      | 'sent'
      | 'opened'
      | 'clicked'
      | 'replied'
      | 'bounced'
      | 'unsubscribed',
    emailData: {
      emailId: string;
      subject?: string;
      campaignId?: string;
      linkUrl?: string;
    },
    metadata?: Partial<InteractionMetadata>,
  ): Promise<void> {
    await this.track({
      clientId,
      supplierId,
      eventType: `email_${action}` as InteractionEventType,
      eventData: emailData,
      metadata: this.enrichMetadata(metadata),
    });
  }

  /**
   * Track portal activity
   */
  async trackPortalActivity(
    clientId: string,
    supplierId: string,
    action:
      | 'login'
      | 'page_view'
      | 'document_download'
      | 'profile_updated'
      | 'session_end',
    portalData: {
      page?: string;
      documentId?: string;
      sessionDuration?: number;
      pagesViewed?: number;
    },
    metadata?: Partial<InteractionMetadata>,
  ): Promise<void> {
    await this.track({
      clientId,
      supplierId,
      eventType: `portal_${action}` as InteractionEventType,
      eventData: portalData,
      metadata: this.enrichMetadata(metadata),
    });
  }

  /**
   * Track form interaction
   */
  async trackFormInteraction(
    clientId: string,
    supplierId: string,
    action:
      | 'viewed'
      | 'started'
      | 'field_completed'
      | 'abandoned'
      | 'submitted'
      | 'error',
    formData: {
      formId: string;
      formName?: string;
      fieldName?: string;
      completionPercentage?: number;
      errorMessage?: string;
      timeSpent?: number;
    },
    metadata?: Partial<InteractionMetadata>,
  ): Promise<void> {
    await this.track({
      clientId,
      supplierId,
      eventType: `form_${action}` as InteractionEventType,
      eventData: formData,
      metadata: this.enrichMetadata(metadata),
    });
  }

  /**
   * Track communication event
   */
  async trackCommunication(
    clientId: string,
    supplierId: string,
    type: 'message' | 'call' | 'meeting',
    action: string,
    communicationData: {
      id?: string;
      duration?: number;
      participants?: string[];
      outcome?: string;
      notes?: string;
    },
    metadata?: Partial<InteractionMetadata>,
  ): Promise<void> {
    await this.track({
      clientId,
      supplierId,
      eventType: `${type}_${action}` as InteractionEventType,
      eventData: communicationData,
      metadata: this.enrichMetadata(metadata),
    });
  }

  /**
   * Track payment event
   */
  async trackPayment(
    clientId: string,
    supplierId: string,
    action: 'initiated' | 'completed' | 'failed' | 'refunded',
    paymentData: {
      invoiceId: string;
      amount: number;
      currency: string;
      method?: string;
      errorReason?: string;
    },
    metadata?: Partial<InteractionMetadata>,
  ): Promise<void> {
    await this.track({
      clientId,
      supplierId,
      eventType: `payment_${action}` as InteractionEventType,
      eventData: paymentData,
      metadata: this.enrichMetadata(metadata),
    });
  }

  /**
   * Start a new interaction session
   */
  startSession(
    clientId: string,
    supplierId: string,
    metadata?: Partial<InteractionMetadata>,
  ): string {
    const sessionId = this.generateSessionId();

    const session: InteractionSession = {
      id: sessionId,
      clientId,
      supplierId,
      startTime: new Date(),
      events: [],
      metadata: this.enrichMetadata(metadata),
    };

    this.sessions.set(sessionId, session);

    return sessionId;
  }

  /**
   * End an interaction session
   */
  async endSession(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    session.endTime = new Date();
    session.duration = Math.floor(
      (session.endTime.getTime() - session.startTime.getTime()) / 1000,
    );

    // Store session data
    await this.storeSession(session);

    // Calculate engagement impact
    await this.calculateSessionEngagement(session);

    // Remove from active sessions
    this.sessions.delete(sessionId);
  }

  /**
   * Get session by ID
   */
  getSession(sessionId: string): InteractionSession | undefined {
    return this.sessions.get(sessionId);
  }

  /**
   * Update session with new event
   */
  private updateSession(event: InteractionEvent) {
    const sessionId = event.metadata.sessionId;
    if (!sessionId) return;

    const session = this.sessions.get(sessionId);
    if (!session) return;

    session.events.push(event);
  }

  /**
   * Flush event queue to database
   */
  private async flushEventQueue(): Promise<void> {
    if (this.eventQueue.length === 0) return;

    const events = [...this.eventQueue];
    this.eventQueue = [];

    try {
      // Batch insert events
      const { error } = await this.supabase
        .from('client_engagement_events')
        .insert(
          events.map((event) => ({
            client_id: event.clientId,
            supplier_id: event.supplierId,
            event_type: event.eventType,
            event_data: event.eventData,
            session_id: event.metadata.sessionId,
            user_agent: event.metadata.userAgent,
            ip_address: event.metadata.ipAddress,
            device_type: event.metadata.deviceType,
            source: event.metadata.source,
            created_at: event.timestamp.toISOString(),
          })),
        );

      if (error) {
        console.error('Failed to flush event queue:', error);
        // Re-add events to queue for retry
        this.eventQueue.unshift(...events);
      }
    } catch (error) {
      console.error('Error flushing event queue:', error);
      // Re-add events to queue for retry
      this.eventQueue.unshift(...events);
    }
  }

  /**
   * Store session data
   */
  private async storeSession(session: InteractionSession): Promise<void> {
    const { error } = await this.supabase.from('interaction_sessions').insert({
      id: session.id,
      client_id: session.clientId,
      supplier_id: session.supplierId,
      start_time: session.startTime.toISOString(),
      end_time: session.endTime?.toISOString(),
      duration: session.duration,
      event_count: session.events.length,
      metadata: session.metadata,
      engagement_score: session.engagementScore,
    });

    if (error) {
      console.error('Failed to store session:', error);
    }
  }

  /**
   * Calculate engagement impact of session
   */
  private async calculateSessionEngagement(
    session: InteractionSession,
  ): Promise<void> {
    // Count high-value events
    const highValueEvents = session.events.filter((event) =>
      [
        'form_submitted',
        'payment_completed',
        'contract_signed',
        'meeting_completed',
      ].includes(event.eventType),
    ).length;

    // Calculate engagement boost
    const engagementBoost = Math.min(10, highValueEvents * 2);

    // Update engagement score
    if (engagementBoost > 0) {
      await realtimeMetricsService.calculateRealtimeMetrics(
        session.clientId,
        session.supplierId,
        'session_completed',
      );
    }

    session.engagementScore = engagementBoost;
  }

  /**
   * Trigger real-time metrics update
   */
  private async triggerRealtimeUpdate(event: InteractionEvent): Promise<void> {
    // High-priority events trigger immediate update
    const highPriorityEvents = [
      'form_submitted',
      'payment_completed',
      'contract_signed',
      'meeting_completed',
      'journey_milestone_reached',
    ];

    if (highPriorityEvents.includes(event.eventType)) {
      await realtimeMetricsService.calculateRealtimeMetrics(
        event.clientId,
        event.supplierId,
        event.eventType,
      );
    }
  }

  /**
   * Enrich metadata with additional context
   */
  private enrichMetadata(
    metadata?: Partial<InteractionMetadata>,
  ): InteractionMetadata {
    return {
      ...metadata,
      timestamp: new Date().toISOString(),
      source: metadata?.source || 'web',
    } as InteractionMetadata;
  }

  /**
   * Generate unique session ID
   */
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Get interaction statistics for a client
   */
  async getClientInteractionStats(
    clientId: string,
    supplierId: string,
    period: '24h' | '7d' | '30d' = '7d',
  ): Promise<{
    totalInteractions: number;
    interactionsByType: Record<string, number>;
    averageSessionDuration: number;
    mostActiveTime: string;
    topEvents: Array<{ type: string; count: number }>;
  }> {
    const periodDays = period === '24h' ? 1 : period === '7d' ? 7 : 30;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - periodDays);

    const { data: events } = await this.supabase
      .from('client_engagement_events')
      .select('*')
      .eq('client_id', clientId)
      .eq('supplier_id', supplierId)
      .gte('created_at', startDate.toISOString());

    const { data: sessions } = await this.supabase
      .from('interaction_sessions')
      .select('duration')
      .eq('client_id', clientId)
      .eq('supplier_id', supplierId)
      .gte('start_time', startDate.toISOString());

    // Calculate statistics
    const interactionsByType: Record<string, number> = {};
    const hourlyActivity: Record<number, number> = {};

    events?.forEach((event) => {
      // Count by type
      const category = event.event_type.split('_')[0];
      interactionsByType[category] = (interactionsByType[category] || 0) + 1;

      // Track hourly activity
      const hour = new Date(event.created_at).getHours();
      hourlyActivity[hour] = (hourlyActivity[hour] || 0) + 1;
    });

    // Find most active hour
    const mostActiveHour =
      Object.entries(hourlyActivity).sort(([, a], [, b]) => b - a)[0]?.[0] ||
      '12';

    // Calculate average session duration
    const totalDuration =
      sessions?.reduce((sum, s) => sum + (s.duration || 0), 0) || 0;
    const averageSessionDuration = sessions?.length
      ? totalDuration / sessions.length
      : 0;

    // Get top events
    const eventCounts: Record<string, number> = {};
    events?.forEach((event) => {
      eventCounts[event.event_type] = (eventCounts[event.event_type] || 0) + 1;
    });

    const topEvents = Object.entries(eventCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([type, count]) => ({ type, count }));

    return {
      totalInteractions: events?.length || 0,
      interactionsByType,
      averageSessionDuration,
      mostActiveTime: `${mostActiveHour}:00`,
      topEvents,
    };
  }

  /**
   * Cleanup resources
   */
  destroy() {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
    }

    // Flush remaining events
    this.flushEventQueue();

    // Clear sessions
    this.sessions.clear();
  }
}

// Export singleton instance
export const interactionTracker = new InteractionTracker();
