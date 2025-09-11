/**
 * WS-155: Wedding Context Alert Manager
 * Enhances existing AlertManager with wedding-specific intelligence
 * Provides context-aware alert prioritization and routing
 */

import { EventEmitter } from 'events';
import { createClient } from '@supabase/supabase-js';
import { AlertManager, type Alert } from '@/lib/monitoring/alerts';
import { MultiChannelOrchestrator } from '@/lib/alerts/channels/MultiChannelOrchestrator';
import { type NotificationRequest } from '@/lib/notifications/engine';

export interface WeddingContext {
  weddingId: string;
  eventDate: string;
  timeToWedding: number; // days
  criticalVendors?: string[];
  weddingPhase: WeddingPhase;
  couple?: {
    primaryContactId: string;
    secondaryContactId?: string;
    preferredContactMethod: 'email' | 'sms' | 'phone';
    emergencyContact?: string;
  };
  venue?: {
    name: string;
    contactInfo: string;
    timeline: VenueTimeline[];
  };
  vendors?: WeddingVendor[];
  guestCount?: number;
  budget?: {
    total: number;
    remaining: number;
    overBudget?: boolean;
  };
}

export type WeddingPhase =
  | 'planning' // > 60 days
  | 'preparation' // 30-60 days
  | 'final_month' // 7-30 days
  | 'final_week' // 1-7 days
  | 'final_day' // < 1 day
  | 'wedding_day' // 0 days
  | 'post_wedding'; // < 0 days

export interface WeddingVendor {
  id: string;
  type: VendorType;
  name: string;
  contactInfo: string;
  status: 'confirmed' | 'pending' | 'at_risk' | 'cancelled';
  criticalTimings: string[];
  lastContact?: Date;
  responseTime?: number; // hours
}

export type VendorType =
  | 'photographer'
  | 'videographer'
  | 'venue'
  | 'catering'
  | 'music'
  | 'flowers'
  | 'decorations'
  | 'transport'
  | 'celebrant'
  | 'makeup'
  | 'hair'
  | 'dress';

export interface VenueTimeline {
  time: string;
  event: string;
  duration: number;
  critical: boolean;
}

export interface WeddingAlert extends Alert {
  weddingContext?: WeddingContext;
  priority: AlertPriority;
  escalationChannels: string[];
  weddingImpact: WeddingImpactLevel;
  recommendedResponse: RecommendedResponse;
  affectedVendors?: string[];
  timelineImpact?: string[];
}

export type AlertPriority =
  | 'low'
  | 'medium'
  | 'high'
  | 'critical'
  | 'immediate'
  | 'emergency';

export type WeddingImpactLevel =
  | 'minimal' // No direct impact on wedding
  | 'low' // Minor inconvenience
  | 'medium' // Could affect guest experience
  | 'high' // Could impact key wedding moments
  | 'critical' // Could result in wedding postponement
  | 'catastrophic'; // Could result in wedding cancellation

export interface RecommendedResponse {
  immediateActions: string[];
  notifications: string[]; // Who to notify
  timeline: string; // How quickly to respond
  escalationProcedure: string[];
  fallbackPlans?: string[];
}

export interface AlertMetrics {
  totalAlerts: number;
  byWeddingPhase: Record<WeddingPhase, number>;
  byImpactLevel: Record<WeddingImpactLevel, number>;
  byVendorType: Record<VendorType, number>;
  averageResponseTime: number;
  escalationRate: number;
  resolutionRate: number;
}

/**
 * Wedding Context Alert Manager
 * Enhances alerts with wedding-specific intelligence and routing
 */
export class WeddingContextAlertManager extends EventEmitter {
  private supabase: ReturnType<typeof createClient>;
  private alertManager: AlertManager;
  private multiChannelOrchestrator: MultiChannelOrchestrator;
  private weddingCache = new Map<string, WeddingContext>();
  private readonly cacheExpiryMs = 10 * 60 * 1000; // 10 minutes

  // Critical vendor types that require immediate attention
  private readonly criticalVendorTypes: VendorType[] = [
    'venue',
    'photographer',
    'videographer',
    'catering',
    'celebrant',
  ];

  // Wedding day critical timeframes (hours before ceremony)
  private readonly criticalTimeframes = {
    emergency: 4, // 4 hours before
    critical: 12, // 12 hours before
    high: 24, // 1 day before
    medium: 168, // 1 week before
    low: 720, // 1 month before
  };

  constructor() {
    super();
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );
    this.alertManager = new AlertManager();
    this.multiChannelOrchestrator = new MultiChannelOrchestrator();
  }

  /**
   * Enhance alert with wedding context
   */
  async enhanceWithWeddingContext(
    baseAlert: Alert,
    weddingContext: WeddingContext,
  ): Promise<WeddingAlert> {
    const weddingPhase = this.calculateWeddingPhase(
      weddingContext.timeToWedding,
    );
    const weddingImpact = this.assessWeddingImpact(baseAlert, weddingContext);
    const priority = this.calculateWeddingPriority(
      baseAlert,
      weddingContext,
      weddingImpact,
    );
    const escalationChannels = this.determineEscalationChannels(
      priority,
      weddingContext,
    );
    const recommendedResponse = this.generateRecommendedResponse(
      baseAlert,
      weddingContext,
      weddingImpact,
    );

    // Update wedding context with calculated phase
    const enhancedContext = {
      ...weddingContext,
      weddingPhase,
    };

    // Enhance alert title with wedding urgency
    let enhancedTitle = baseAlert.title;
    if (priority === 'emergency' || priority === 'immediate') {
      enhancedTitle = `🚨 URGENT - ${baseAlert.title}`;
    } else if (priority === 'critical') {
      enhancedTitle = `⚠️ CRITICAL - ${baseAlert.title}`;
    } else if (weddingPhase === 'wedding_day') {
      enhancedTitle = `💒 WEDDING DAY - ${baseAlert.title}`;
    }

    const weddingAlert: WeddingAlert = {
      ...baseAlert,
      title: enhancedTitle,
      severity: this.mapPriorityToSeverity(priority),
      weddingContext: enhancedContext,
      priority,
      escalationChannels,
      weddingImpact,
      recommendedResponse,
      affectedVendors: this.identifyAffectedVendors(baseAlert, weddingContext),
      timelineImpact: this.assessTimelineImpact(baseAlert, weddingContext),
    };

    this.emit('alertEnhanced', { original: baseAlert, enhanced: weddingAlert });
    return weddingAlert;
  }

  /**
   * Process wedding-specific alert with full context
   */
  async processWeddingAlert(weddingAlert: WeddingAlert): Promise<void> {
    console.log(
      `💒 Processing wedding alert: ${weddingAlert.title} (${weddingAlert.priority})`,
    );

    try {
      // Store wedding alert with context
      await this.storeWeddingAlert(weddingAlert);

      // Use existing MultiChannelOrchestrator with wedding context
      await this.multiChannelOrchestrator.sendAlert(
        weddingAlert,
        weddingAlert.weddingContext,
      );

      // Track wedding alert metrics
      await this.trackWeddingAlertMetrics(weddingAlert);

      // Schedule follow-up if required
      if (
        weddingAlert.priority === 'critical' ||
        weddingAlert.priority === 'emergency'
      ) {
        await this.scheduleFollowUp(weddingAlert);
      }

      this.emit('weddingAlertProcessed', weddingAlert);
    } catch (error) {
      console.error('Failed to process wedding alert:', error);
      this.emit('weddingAlertError', { alert: weddingAlert, error });
      throw error;
    }
  }

  /**
   * Scale alert urgency based on wedding timeline
   */
  scaleAlertUrgency(
    baseAlert: Alert,
    weddingContext: WeddingContext,
  ): WeddingAlert {
    const timeToWedding = weddingContext.timeToWedding;
    const isVendorIssue = this.isVendorRelatedAlert(baseAlert);
    const isCriticalVendor = this.isVendorCritical(baseAlert, weddingContext);

    // Determine escalated severity based on timeline
    let escalatedSeverity = baseAlert.severity;
    let priority: AlertPriority = 'low';
    let recommendedChannels: string[] = ['email'];

    if (timeToWedding <= 0) {
      // Wedding day or post-wedding
      escalatedSeverity = 'critical';
      priority = 'emergency';
      recommendedChannels = ['phone', 'sms', 'slack', 'email'];
    } else if (timeToWedding <= 1) {
      // Final day
      escalatedSeverity = 'critical';
      priority = isCriticalVendor ? 'immediate' : 'critical';
      recommendedChannels = ['sms', 'phone', 'slack'];
    } else if (timeToWedding <= 7) {
      // Final week
      escalatedSeverity = baseAlert.severity === 'low' ? 'medium' : 'high';
      priority = isCriticalVendor ? 'critical' : 'high';
      recommendedChannels = ['email', 'slack', 'sms'];
    } else if (timeToWedding <= 30) {
      // Final month
      escalatedSeverity =
        baseAlert.severity === 'low' ? 'medium' : baseAlert.severity;
      priority = isCriticalVendor ? 'high' : 'medium';
      recommendedChannels = ['email', 'slack'];
    }

    return {
      ...baseAlert,
      severity: escalatedSeverity,
      priority,
      escalationChannels: recommendedChannels,
      recommendedChannels,
      weddingContext,
      weddingImpact: this.assessWeddingImpact(baseAlert, weddingContext),
      recommendedResponse: this.generateRecommendedResponse(
        baseAlert,
        weddingContext,
        'medium',
      ),
    };
  }

  /**
   * Calculate wedding phase based on days to wedding
   */
  calculateWeddingPhase(daysToWedding: number): WeddingPhase {
    if (daysToWedding < 0) return 'post_wedding';
    if (daysToWedding === 0) return 'wedding_day';
    if (daysToWedding < 1) return 'final_day';
    if (daysToWedding <= 7) return 'final_week';
    if (daysToWedding <= 30) return 'final_month';
    if (daysToWedding <= 60) return 'preparation';
    return 'planning';
  }

  /**
   * Check if vendor is critical for current wedding phase
   */
  isVendorCriticalForPhase(
    vendorType: VendorType,
    weddingPhase: WeddingPhase,
  ): boolean {
    const criticalByPhase: Record<WeddingPhase, VendorType[]> = {
      planning: [],
      preparation: ['venue', 'catering'],
      final_month: ['venue', 'catering', 'photographer', 'celebrant'],
      final_week: [
        'venue',
        'catering',
        'photographer',
        'videographer',
        'celebrant',
        'flowers',
      ],
      final_day: [
        'venue',
        'catering',
        'photographer',
        'videographer',
        'celebrant',
        'flowers',
        'music',
      ],
      wedding_day: [
        'venue',
        'catering',
        'photographer',
        'videographer',
        'celebrant',
        'flowers',
        'music',
        'transport',
      ],
      post_wedding: ['photographer', 'videographer'],
    };

    return criticalByPhase[weddingPhase].includes(vendorType);
  }

  /**
   * Process alert for multiple weddings (system-wide issues)
   */
  async processMultiWeddingAlert(
    baseAlert: Alert,
    weddingContexts: WeddingContext[],
  ): Promise<WeddingAlert[]> {
    const processedAlerts: WeddingAlert[] = [];

    for (const context of weddingContexts) {
      const enhanced = await this.enhanceWithWeddingContext(baseAlert, context);
      processedAlerts.push(enhanced);
    }

    // Sort by priority (most urgent first)
    processedAlerts.sort((a, b) =>
      this.comparePriority(a.priority, b.priority),
    );

    // Process each alert
    for (const alert of processedAlerts) {
      await this.processWeddingAlert(alert);
    }

    return processedAlerts;
  }

  /**
   * Get wedding context from cache or database
   */
  async getWeddingContext(weddingId: string): Promise<WeddingContext | null> {
    // Check cache first
    const cached = this.weddingCache.get(weddingId);
    if (cached) {
      return cached;
    }

    try {
      // Fetch from database
      const { data: wedding } = await this.supabase
        .from('weddings')
        .select(
          `
          id,
          event_date,
          couple_primary_contact,
          couple_secondary_contact,
          venue_info,
          guest_count,
          budget_total,
          budget_remaining,
          vendors (
            id,
            type,
            name,
            contact_info,
            status,
            last_contact,
            response_time_hours
          )
        `,
        )
        .eq('id', weddingId)
        .single();

      if (!wedding) return null;

      const eventDate = new Date(wedding.event_date);
      const today = new Date();
      const timeToWedding = Math.ceil(
        (eventDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
      );

      const weddingContext: WeddingContext = {
        weddingId: wedding.id,
        eventDate: wedding.event_date,
        timeToWedding,
        weddingPhase: this.calculateWeddingPhase(timeToWedding),
        guestCount: wedding.guest_count,
        budget: {
          total: wedding.budget_total,
          remaining: wedding.budget_remaining,
          overBudget: wedding.budget_remaining < 0,
        },
        vendors:
          wedding.vendors?.map((v: any) => ({
            id: v.id,
            type: v.type,
            name: v.name,
            contactInfo: v.contact_info,
            status: v.status,
            lastContact: v.last_contact ? new Date(v.last_contact) : undefined,
            responseTime: v.response_time_hours,
            criticalTimings: [],
          })) || [],
      };

      // Cache for 10 minutes
      this.weddingCache.set(weddingId, weddingContext);
      setTimeout(() => this.weddingCache.delete(weddingId), this.cacheExpiryMs);

      return weddingContext;
    } catch (error) {
      console.error('Failed to fetch wedding context:', error);
      return null;
    }
  }

  /**
   * Assess wedding impact of alert
   */
  private assessWeddingImpact(
    alert: Alert,
    context: WeddingContext,
  ): WeddingImpactLevel {
    const { weddingPhase, timeToWedding } = context;

    // System critical alerts have high impact during wedding week
    if (alert.severity === 'critical') {
      if (timeToWedding <= 0) return 'catastrophic';
      if (timeToWedding <= 1) return 'critical';
      if (timeToWedding <= 7) return 'high';
      return 'medium';
    }

    // Vendor-specific issues
    if (this.isVendorRelatedAlert(alert)) {
      const isVendorCritical = this.isVendorCritical(alert, context);

      if (isVendorCritical) {
        if (timeToWedding <= 0) return 'catastrophic';
        if (timeToWedding <= 1) return 'critical';
        if (timeToWedding <= 7) return 'high';
        return 'medium';
      } else {
        if (timeToWedding <= 7) return 'medium';
        return 'low';
      }
    }

    // Payment/billing issues
    if (alert.type.includes('payment') || alert.type.includes('billing')) {
      if (timeToWedding <= 7) return 'high';
      if (timeToWedding <= 30) return 'medium';
      return 'low';
    }

    // Default assessment based on timeline
    if (timeToWedding <= 1) return 'medium';
    return 'minimal';
  }

  /**
   * Calculate wedding-aware priority
   */
  private calculateWeddingPriority(
    alert: Alert,
    context: WeddingContext,
    impact: WeddingImpactLevel,
  ): AlertPriority {
    const { timeToWedding, weddingPhase } = context;
    const baseSeverity = alert.severity;

    // Emergency conditions
    if (
      impact === 'catastrophic' ||
      (impact === 'critical' && timeToWedding <= 0.25) // 6 hours before
    ) {
      return 'emergency';
    }

    // Immediate conditions
    if (
      impact === 'critical' ||
      (impact === 'high' && timeToWedding <= 0.5) || // 12 hours before
      (baseSeverity === 'critical' && timeToWedding <= 1)
    ) {
      return 'immediate';
    }

    // Critical conditions
    if (
      impact === 'high' ||
      (baseSeverity === 'critical' && timeToWedding <= 7) ||
      (baseSeverity === 'high' && timeToWedding <= 1)
    ) {
      return 'critical';
    }

    // High priority conditions
    if (
      impact === 'medium' ||
      (baseSeverity === 'high' && timeToWedding <= 7) ||
      (baseSeverity === 'medium' && timeToWedding <= 1)
    ) {
      return 'high';
    }

    // Medium priority
    if (impact === 'low' || timeToWedding <= 7) {
      return 'medium';
    }

    return 'low';
  }

  /**
   * Determine escalation channels based on priority
   */
  private determineEscalationChannels(
    priority: AlertPriority,
    context: WeddingContext,
  ): string[] {
    const baseChannels = ['email'];

    switch (priority) {
      case 'emergency':
        return ['phone', 'sms', 'slack', 'email'];
      case 'immediate':
        return ['sms', 'phone', 'slack'];
      case 'critical':
        return ['slack', 'sms', 'email'];
      case 'high':
        return ['slack', 'email'];
      case 'medium':
        return ['email', 'slack'];
      default:
        return baseChannels;
    }
  }

  /**
   * Generate wedding-specific recommended response
   */
  private generateRecommendedResponse(
    alert: Alert,
    context: WeddingContext,
    impact: WeddingImpactLevel,
  ): RecommendedResponse {
    const { timeToWedding, weddingPhase } = context;

    const baseActions = [
      'Acknowledge alert immediately',
      'Assess impact on wedding timeline',
    ];
    const escalationProcedure = [
      'Notify wedding planner',
      'Contact affected vendors',
      'Update couple if necessary',
    ];

    // Vendor-specific responses
    if (this.isVendorRelatedAlert(alert)) {
      baseActions.push('Contact vendor directly', 'Verify backup options');
      escalationProcedure.push('Activate backup vendor if available');
    }

    // Timeline-specific responses
    if (timeToWedding <= 1) {
      baseActions.push(
        'Execute emergency procedures',
        'Notify all critical stakeholders',
      );
    } else if (timeToWedding <= 7) {
      baseActions.push(
        'Review contingency plans',
        'Assess timeline adjustments needed',
      );
    }

    return {
      immediateActions: baseActions,
      notifications: ['wedding_planner', 'primary_contact'],
      timeline: this.getResponseTimeline(context.weddingPhase, impact),
      escalationProcedure,
      fallbackPlans: this.generateFallbackPlans(alert, context),
    };
  }

  /**
   * Get response timeline based on wedding phase and impact
   */
  private getResponseTimeline(
    phase: WeddingPhase,
    impact: WeddingImpactLevel,
  ): string {
    if (phase === 'wedding_day') return 'Immediate (within 5 minutes)';
    if (phase === 'final_day') return 'Urgent (within 15 minutes)';
    if (phase === 'final_week' && impact === 'critical')
      return 'Within 30 minutes';
    if (impact === 'critical') return 'Within 1 hour';
    if (impact === 'high') return 'Within 2 hours';
    if (impact === 'medium') return 'Within 4 hours';
    return 'Within 24 hours';
  }

  /**
   * Generate fallback plans for wedding alerts
   */
  private generateFallbackPlans(
    alert: Alert,
    context: WeddingContext,
  ): string[] {
    const fallbacks: string[] = [];

    if (this.isVendorRelatedAlert(alert)) {
      fallbacks.push('Contact backup vendor list');
      fallbacks.push('Review last-minute vendor alternatives');
    }

    if (alert.type.includes('payment')) {
      fallbacks.push('Use backup payment method');
      fallbacks.push('Contact couple for alternative payment');
    }

    if (alert.type.includes('venue')) {
      fallbacks.push('Review venue backup procedures');
      fallbacks.push('Contact venue emergency coordinator');
    }

    return fallbacks;
  }

  /**
   * Check if alert is vendor-related
   */
  private isVendorRelatedAlert(alert: Alert): boolean {
    return (
      alert.type.includes('vendor') ||
      alert.tags?.some((tag) =>
        this.criticalVendorTypes.includes(tag as VendorType),
      ) ||
      false
    );
  }

  /**
   * Check if vendor mentioned in alert is critical
   */
  private isVendorCritical(alert: Alert, context: WeddingContext): boolean {
    return (
      alert.tags?.some((tag) =>
        this.criticalVendorTypes.includes(tag as VendorType),
      ) || false
    );
  }

  /**
   * Identify affected vendors from alert
   */
  private identifyAffectedVendors(
    alert: Alert,
    context: WeddingContext,
  ): string[] {
    const affected: string[] = [];

    // Check tags for vendor types
    if (alert.tags) {
      for (const tag of alert.tags) {
        if (this.criticalVendorTypes.includes(tag as VendorType)) {
          affected.push(tag);
        }
      }
    }

    // Check alert content for vendor names
    const vendors = context.vendors || [];
    for (const vendor of vendors) {
      if (
        alert.title.toLowerCase().includes(vendor.name.toLowerCase()) ||
        alert.description.toLowerCase().includes(vendor.name.toLowerCase())
      ) {
        affected.push(vendor.name);
      }
    }

    return affected;
  }

  /**
   * Assess timeline impact
   */
  private assessTimelineImpact(
    alert: Alert,
    context: WeddingContext,
  ): string[] {
    const impacts: string[] = [];

    if (this.isVendorRelatedAlert(alert)) {
      impacts.push('Vendor coordination timeline');
    }

    if (alert.type.includes('payment')) {
      impacts.push('Payment processing timeline');
    }

    if (context.timeToWedding <= 7) {
      impacts.push('Final week preparations');
    }

    if (context.timeToWedding <= 1) {
      impacts.push('Wedding day schedule');
    }

    return impacts;
  }

  /**
   * Map priority to alert severity
   */
  private mapPriorityToSeverity(priority: AlertPriority): Alert['severity'] {
    switch (priority) {
      case 'emergency':
      case 'immediate':
        return 'critical';
      case 'critical':
        return 'critical';
      case 'high':
        return 'high';
      case 'medium':
        return 'medium';
      default:
        return 'low';
    }
  }

  /**
   * Compare priorities for sorting
   */
  private comparePriority(a: AlertPriority, b: AlertPriority): number {
    const priorityOrder = [
      'low',
      'medium',
      'high',
      'critical',
      'immediate',
      'emergency',
    ];
    return priorityOrder.indexOf(b) - priorityOrder.indexOf(a);
  }

  /**
   * Store wedding alert in database
   */
  private async storeWeddingAlert(alert: WeddingAlert): Promise<void> {
    try {
      await this.supabase.from('wedding_alerts').insert({
        id: alert.id,
        wedding_id: alert.weddingContext?.weddingId,
        alert_type: alert.type,
        severity: alert.severity,
        priority: alert.priority,
        title: alert.title,
        description: alert.description,
        wedding_impact: alert.weddingImpact,
        affected_vendors: alert.affectedVendors,
        timeline_impact: alert.timelineImpact,
        escalation_channels: alert.escalationChannels,
        recommended_response: alert.recommendedResponse,
        wedding_context: alert.weddingContext,
        created_at: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Failed to store wedding alert:', error);
    }
  }

  /**
   * Track wedding alert metrics
   */
  private async trackWeddingAlertMetrics(alert: WeddingAlert): Promise<void> {
    // Implementation would track metrics in database or analytics service
    this.emit('weddingMetrics', {
      weddingPhase: alert.weddingContext?.weddingPhase,
      priority: alert.priority,
      impactLevel: alert.weddingImpact,
      responseTime: Date.now() - alert.timestamp.getTime(),
    });
  }

  /**
   * Schedule follow-up for critical alerts
   */
  private async scheduleFollowUp(alert: WeddingAlert): Promise<void> {
    const followUpDelay =
      alert.priority === 'emergency'
        ? 5 * 60 * 1000 // 5 minutes
        : alert.priority === 'immediate'
          ? 15 * 60 * 1000 // 15 minutes
          : 30 * 60 * 1000; // 30 minutes

    setTimeout(async () => {
      // Check if alert has been resolved
      const { data: currentAlert } = await this.supabase
        .from('wedding_alerts')
        .select('status')
        .eq('id', alert.id)
        .single();

      if (currentAlert?.status !== 'resolved') {
        this.emit('followUpRequired', alert);
      }
    }, followUpDelay);
  }

  /**
   * Get wedding alert metrics
   */
  async getWeddingAlertMetrics(
    weddingId?: string,
    timeRange?: { start: Date; end: Date },
  ): Promise<AlertMetrics> {
    let query = this.supabase
      .from('wedding_alerts')
      .select(
        'priority, wedding_impact, wedding_context, created_at, resolved_at',
      );

    if (weddingId) {
      query = query.eq('wedding_id', weddingId);
    }

    if (timeRange) {
      query = query
        .gte('created_at', timeRange.start.toISOString())
        .lte('created_at', timeRange.end.toISOString());
    }

    const { data: alerts } = await query;

    // Calculate metrics
    const metrics: AlertMetrics = {
      totalAlerts: alerts?.length || 0,
      byWeddingPhase: {} as Record<WeddingPhase, number>,
      byImpactLevel: {} as Record<WeddingImpactLevel, number>,
      byVendorType: {} as Record<VendorType, number>,
      averageResponseTime: 0,
      escalationRate: 0,
      resolutionRate: 0,
    };

    // Process alerts for metrics
    if (alerts) {
      for (const alert of alerts) {
        const phase = alert.wedding_context?.weddingPhase;
        if (phase) {
          metrics.byWeddingPhase[phase] =
            (metrics.byWeddingPhase[phase] || 0) + 1;
        }

        const impact = alert.wedding_impact;
        if (impact) {
          metrics.byImpactLevel[impact] =
            (metrics.byImpactLevel[impact] || 0) + 1;
        }
      }

      // Calculate resolution rate
      const resolved = alerts.filter((a) => a.resolved_at);
      metrics.resolutionRate = resolved.length / alerts.length;

      // Calculate average response time
      if (resolved.length > 0) {
        const totalResponseTime = resolved.reduce((sum, alert) => {
          const responseTime =
            new Date(alert.resolved_at).getTime() -
            new Date(alert.created_at).getTime();
          return sum + responseTime;
        }, 0);
        metrics.averageResponseTime = totalResponseTime / resolved.length;
      }
    }

    return metrics;
  }
}

// Export singleton instance
export const weddingContextAlertManager = new WeddingContextAlertManager();
