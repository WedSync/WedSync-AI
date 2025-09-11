/**
 * WS-334 Team B: WeddingNotificationIntelligence
 * Wedding-specific notification processing and intelligence system
 */

import {
  WeddingEvent,
  WeddingNotificationResult,
  EventImpactAnalysis,
  ProcessedNotification,
  TimelineConflict,
  ConflictResolutionResult,
  WeddingContext,
  WeddingNotificationProcessor,
  UrgencyScore,
  CoordinationResult,
  VendorCoordination,
  ImpactArea,
  AffectedParty,
  RecommendedAction,
  CoordinationAction,
  ConflictAnalysis,
  ResolutionOption,
  ConflictResolutionError,
  NotificationContent,
  EventPriority,
} from '../../types/notification-backend';

import {
  WeddingSpecificEvent,
  WeatherEvent,
  TimelineEvent,
  VendorEvent,
  PaymentEvent,
  EmergencyEvent,
  VendorCancellationEvent,
  WeatherAlertEvent,
  TimelineCriticalEvent,
  WeddingEmergencyEvent,
  isWeatherAlertEvent,
  isTimelineCriticalEvent,
  isVendorCancellationEvent,
  isWeddingEmergencyEvent,
} from '../../types/wedding-events';

export interface WeddingAnalytics {
  getWeddingTimeline(weddingId: string): Promise<WeddingTimelineData>;
  getVendorDependencies(weddingId: string): Promise<VendorDependency[]>;
  getWeatherForecast(
    location: { lat: number; lng: number },
    date: Date,
  ): Promise<WeatherForecast>;
  calculateVendorReplacementOptions(
    vendorId: string,
    weddingId: string,
  ): Promise<ReplacementOption[]>;
  assessBudgetImpact(
    weddingId: string,
    change: BudgetChangeEvent,
  ): Promise<BudgetImpactAnalysis>;
}

export interface WeddingTimelineData {
  weddingId: string;
  events: TimelineEvent[];
  criticalPath: string[];
  bufferTimes: Record<string, number>; // eventId -> buffer minutes
  dependencies: EventDependency[];
  totalDuration: number; // minutes
  riskFactors: RiskFactor[];
}

export interface EventDependency {
  eventId: string;
  dependsOn: string[];
  type: 'hard' | 'soft'; // hard = must complete, soft = preferred order
  bufferTime: number; // minutes
}

export interface RiskFactor {
  type: 'weather' | 'vendor' | 'logistics' | 'timing';
  severity: number; // 1-10
  mitigation: string[];
  probability: number; // 0-1
}

export interface VendorDependency {
  vendorId: string;
  dependentVendors: string[];
  sharedResources: string[];
  coordinationWindows: CoordinationWindow[];
  criticalityScore: number; // 1-10
}

export interface CoordinationWindow {
  start: Date;
  end: Date;
  activities: string[];
  conflicts: string[];
}

export interface WeatherForecast {
  location: { lat: number; lng: number };
  forecast: WeatherPoint[];
  alerts: WeatherAlert[];
  recommendations: WeatherRecommendation[];
}

export interface WeatherPoint {
  datetime: Date;
  temperature: number;
  precipitation: number; // mm
  windSpeed: number; // km/h
  conditions: string;
  severity: number; // 1-10
}

export interface WeatherAlert {
  type: string;
  severity: 'low' | 'medium' | 'high' | 'extreme';
  startTime: Date;
  endTime: Date;
  description: string;
  recommendations: string[];
}

export interface WeatherRecommendation {
  condition: string;
  action: string;
  cost: number;
  timeRequired: number; // minutes
  criticality: EventPriority;
}

export interface ReplacementOption {
  vendorId: string;
  name: string;
  services: string[];
  availability: boolean;
  cost: number;
  quality: number; // 1-5 stars
  distance: number; // km
  timeToBook: number; // hours
  pros: string[];
  cons: string[];
}

export interface BudgetChangeEvent {
  type: 'cost_increase' | 'cost_decrease' | 'new_expense' | 'refund';
  amount: number;
  category: string;
  description: string;
  vendorId?: string;
}

export interface BudgetImpactAnalysis {
  originalBudget: number;
  newTotal: number;
  percentageChange: number;
  categoryBreakdown: Record<string, number>;
  recommendations: BudgetRecommendation[];
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
}

export interface BudgetRecommendation {
  action: string;
  potentialSavings: number;
  effort: 'low' | 'medium' | 'high';
  timeline: string;
}

export class WeddingNotificationIntelligence
  implements WeddingNotificationProcessor
{
  private weddingAnalytics: WeddingAnalytics;
  private timelineProcessor: WeddingTimelineProcessor;
  private vendorCoordinator: VendorCoordinator;
  private weatherService: WeatherService;
  private budgetAnalyzer: BudgetAnalyzer;
  private conflictResolver: ConflictResolver;

  constructor() {
    this.weddingAnalytics = new WeddingAnalyticsImpl();
    this.timelineProcessor = new WeddingTimelineProcessor();
    this.vendorCoordinator = new VendorCoordinator();
    this.weatherService = new WeatherService();
    this.budgetAnalyzer = new BudgetAnalyzer();
    this.conflictResolver = new ConflictResolver();
  }

  async processWeddingEvent(
    event: WeddingEvent,
  ): Promise<WeddingNotificationResult> {
    const startTime = Date.now();

    try {
      console.log(
        `🎭 Processing wedding event ${event.eventId} for wedding ${event.weddingContext.weddingId}`,
      );

      // 1. Build comprehensive wedding context
      const weddingContext = await this.buildWeddingContext(
        event.weddingContext.weddingId,
      );

      // 2. Analyze event impact across all wedding dimensions
      const impactAnalysis = await this.analyzeEventImpact(
        event,
        weddingContext,
      );

      // 3. Generate contextual notifications based on impact
      const notifications = await this.generateContextualNotifications(
        event,
        impactAnalysis,
      );

      // 4. Apply wedding business rules and optimizations
      const processedNotifications = await Promise.all(
        notifications.map((notification) =>
          this.applyWeddingBusinessRules(notification, weddingContext),
        ),
      );

      // 5. Generate coordination actions for affected parties
      const coordinationActions = await this.generateCoordinationActions(
        event,
        impactAnalysis,
      );

      const processingTime = Date.now() - startTime;
      console.log(`✅ Wedding event processed in ${processingTime}ms`);

      return {
        eventId: event.eventId,
        weddingId: event.weddingContext.weddingId,
        impactAnalysis,
        generatedNotifications: processedNotifications,
        coordinationActions,
      };
    } catch (error) {
      console.error(
        `❌ Failed to process wedding event ${event.eventId}:`,
        error,
      );
      throw error;
    }
  }

  private async buildWeddingContext(
    weddingId: string,
  ): Promise<WeddingContext> {
    const [timeline, dependencies, forecast] = await Promise.all([
      this.weddingAnalytics.getWeddingTimeline(weddingId),
      this.weddingAnalytics.getVendorDependencies(weddingId),
      this.getWeddingWeatherForecast(weddingId),
    ]);

    // Calculate wedding proximity
    const weddingDate = new Date(timeline.events[0]?.startTime || Date.now());
    const daysToWedding = Math.ceil(
      (weddingDate.getTime() - Date.now()) / (24 * 60 * 60 * 1000),
    );

    return {
      weddingId,
      weddingDate: weddingDate.toISOString(),
      clientId: '', // Would be fetched from database
      vendorIds: dependencies.map((d) => d.vendorId),
      daysToWedding,
      isWeddingWeek: daysToWedding <= 7 && daysToWedding >= 0,
      isWeddingDay: daysToWedding === 0,
      venue: {
        venueId: 'venue_1',
        name: 'Sample Venue',
        location: { lat: 0, lng: 0, address: 'Sample Address' },
        capacity: 150,
        isOutdoor: true,
      },
      isOutdoor: true,
      seasonalContext: this.calculateSeasonalContext(weddingDate),
    };
  }

  private async analyzeEventImpact(
    event: WeddingEvent,
    context: WeddingContext,
  ): Promise<EventImpactAnalysis> {
    const impacts: ImpactArea[] = [];
    const affectedParties: AffectedParty[] = [];
    const recommendedActions: RecommendedAction[] = [];

    // Analyze different types of wedding events
    if (isWeatherAlertEvent(event)) {
      await this.analyzeWeatherImpact(
        event,
        context,
        impacts,
        affectedParties,
        recommendedActions,
      );
    }

    if (isTimelineCriticalEvent(event)) {
      await this.analyzeTimelineImpact(
        event,
        context,
        impacts,
        affectedParties,
        recommendedActions,
      );
    }

    if (isVendorCancellationEvent(event)) {
      await this.analyzeVendorImpact(
        event,
        context,
        impacts,
        affectedParties,
        recommendedActions,
      );
    }

    if (isWeddingEmergencyEvent(event)) {
      await this.analyzeEmergencyImpact(
        event,
        context,
        impacts,
        affectedParties,
        recommendedActions,
      );
    }

    // Calculate overall severity
    const overallSeverity = this.calculateOverallSeverity(impacts);
    const urgencyLevel = this.calculateUrgencyLevel(impacts, context);

    return {
      eventId: event.eventId,
      overallSeverity,
      impacts,
      affectedParties,
      recommendedActions,
      urgencyLevel,
    };
  }

  private async analyzeWeatherImpact(
    event: WeatherAlertEvent,
    context: WeddingContext,
    impacts: ImpactArea[],
    affectedParties: AffectedParty[],
    recommendedActions: RecommendedAction[],
  ): Promise<void> {
    if (!context.isOutdoor) {
      // Indoor wedding - minimal weather impact
      impacts.push({
        area: 'weather',
        severity: 2,
        description: 'Indoor wedding minimally affected by weather',
        affectedElements: ['guest_arrival', 'photography_outdoor_shots'],
      });
      return;
    }

    const weatherData = event.payload;
    const severity = weatherData.severity;

    // Weather impact on outdoor ceremony/reception
    impacts.push({
      area: 'weather',
      severity,
      description: `${weatherData.weatherType} alert with severity ${severity}/10`,
      affectedElements: [
        'ceremony_outdoor',
        'reception_outdoor',
        'photography_session',
        'guest_comfort',
        'vendor_setup',
        'decoration_stability',
      ],
    });

    // Identify affected parties
    affectedParties.push(
      {
        type: 'couple',
        id: context.clientId,
        name: 'Wedding Couple',
        impactLevel:
          severity >= 7 ? 'critical' : severity >= 5 ? 'high' : 'medium',
        requiredActions: ['contingency_decision', 'guest_communication'],
      },
      {
        type: 'venue',
        id: context.venue?.venueId || '',
        name: context.venue?.name || 'Wedding Venue',
        impactLevel: 'high',
        requiredActions: ['indoor_backup_preparation', 'equipment_protection'],
      },
    );

    // Add weather-specific vendors
    const weatherAffectedVendors = [
      'photographer',
      'decorator',
      'caterer',
      'musician',
    ];
    for (const vendorType of weatherAffectedVendors) {
      affectedParties.push({
        type: 'vendor',
        id: `${vendorType}_vendor`,
        name: `${vendorType} Vendor`,
        impactLevel: severity >= 6 ? 'high' : 'medium',
        requiredActions: ['equipment_protection', 'backup_plan_activation'],
      });
    }

    // Generate weather-specific recommendations
    if (severity >= 7) {
      recommendedActions.push({
        id: 'weather_contingency_immediate',
        description: 'Activate severe weather contingency plan immediately',
        priority: 'critical',
        deadline: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2 hours
        estimatedDuration: 120,
      });
    }

    recommendedActions.push({
      id: 'weather_vendor_coordination',
      description:
        'Coordinate with all outdoor vendors for weather preparations',
      priority: severity >= 6 ? 'high' : 'medium',
      deadline: new Date(Date.now() + 6 * 60 * 60 * 1000), // 6 hours
      estimatedDuration: 90,
    });
  }

  private async analyzeTimelineImpact(
    event: TimelineCriticalEvent,
    context: WeddingContext,
    impacts: ImpactArea[],
    affectedParties: AffectedParty[],
    recommendedActions: RecommendedAction[],
  ): Promise<void> {
    const timelineData = event.payload;
    const timeline = await this.weddingAnalytics.getWeddingTimeline(
      context.weddingId,
    );

    // Calculate cascade effects
    const cascadeEffects = await this.calculateCascadeEffects(
      timelineData,
      timeline,
    );

    impacts.push({
      area: 'timeline',
      severity: timelineData.criticalPathImpact ? 8 : 5,
      description: `Timeline ${timelineData.changeType} affecting ${timelineData.affectedActivities.length} activities`,
      affectedElements: timelineData.affectedActivities.map(
        (a) => a.activityId,
      ),
    });

    // Identify affected vendors and guests
    const affectedVendors = new Set<string>();
    for (const activity of timelineData.affectedActivities) {
      if (activity.vendor) {
        affectedVendors.add(activity.vendor);
      }
    }

    for (const vendorId of affectedVendors) {
      affectedParties.push({
        type: 'vendor',
        id: vendorId,
        name: `Vendor ${vendorId}`,
        impactLevel: timelineData.criticalPathImpact ? 'critical' : 'high',
        requiredActions: ['schedule_adjustment', 'coordination_meeting'],
      });
    }

    // Add couple as affected party
    affectedParties.push({
      type: 'couple',
      id: context.clientId,
      name: 'Wedding Couple',
      impactLevel: timelineData.criticalPathImpact ? 'critical' : 'medium',
      requiredActions: [
        'approval_required',
        'guest_notification_consideration',
      ],
    });

    // Generate timeline-specific recommendations
    if (timelineData.criticalPathImpact) {
      recommendedActions.push({
        id: 'critical_path_recovery',
        description: 'Implement critical path recovery strategies',
        priority: 'critical',
        deadline: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
        estimatedDuration: 180,
      });
    }

    if (cascadeEffects.length > 0) {
      recommendedActions.push({
        id: 'cascade_mitigation',
        description: `Address ${cascadeEffects.length} cascade effects on other activities`,
        priority: 'high',
        deadline: new Date(Date.now() + 4 * 60 * 60 * 1000), // 4 hours
        estimatedDuration: 120,
      });
    }
  }

  private async analyzeVendorImpact(
    event: VendorCancellationEvent,
    context: WeddingContext,
    impacts: ImpactArea[],
    affectedParties: AffectedParty[],
    recommendedActions: RecommendedAction[],
  ): Promise<void> {
    const cancellationData = event.payload;
    const timeline = await this.weddingAnalytics.getWeddingTimeline(
      context.weddingId,
    );
    const dependencies = await this.weddingAnalytics.getVendorDependencies(
      context.weddingId,
    );

    // Find vendor in dependencies
    const vendorDependency = dependencies.find(
      (d) => d.vendorId === cancellationData.vendorId,
    );

    impacts.push({
      area: 'vendors',
      severity: vendorDependency?.criticalityScore || 7,
      description: `${cancellationData.vendorType} cancellation with ${cancellationData.noticePeriod} days notice`,
      affectedElements: [
        cancellationData.vendorId,
        ...cancellationData.impactedServices,
        ...(vendorDependency?.dependentVendors || []),
      ],
    });

    // Budget impact
    const budgetImpact = cancellationData.impactAssessment.budgetImpact;
    if (budgetImpact > 0) {
      impacts.push({
        area: 'budget',
        severity: budgetImpact > 5000 ? 8 : budgetImpact > 2000 ? 6 : 4,
        description: `Budget increase of $${budgetImpact} for replacement vendor`,
        affectedElements: ['total_budget', cancellationData.vendorType],
      });
    }

    // Affected parties
    affectedParties.push({
      type: 'couple',
      id: context.clientId,
      name: 'Wedding Couple',
      impactLevel: 'critical',
      requiredActions: [
        'replacement_approval',
        'budget_adjustment',
        'timeline_review',
      ],
    });

    // Dependent vendors
    if (vendorDependency) {
      for (const dependentVendorId of vendorDependency.dependentVendors) {
        affectedParties.push({
          type: 'vendor',
          id: dependentVendorId,
          name: `Dependent Vendor ${dependentVendorId}`,
          impactLevel: 'high',
          requiredActions: ['coordination_update', 'schedule_adjustment'],
        });
      }
    }

    // Generate replacement recommendations
    const replacementOptions =
      await this.weddingAnalytics.calculateVendorReplacementOptions(
        cancellationData.vendorId,
        context.weddingId,
      );

    if (replacementOptions.length > 0) {
      recommendedActions.push({
        id: 'vendor_replacement_urgent',
        description: `Secure replacement ${cancellationData.vendorType} from ${replacementOptions.length} available options`,
        priority: context.daysToWedding <= 30 ? 'critical' : 'high',
        deadline: new Date(
          Date.now() + (context.daysToWedding <= 7 ? 4 : 24) * 60 * 60 * 1000,
        ),
        estimatedDuration: 240,
      });
    } else {
      recommendedActions.push({
        id: 'vendor_replacement_search',
        description: `Urgently source replacement ${cancellationData.vendorType} - no immediate options available`,
        priority: 'critical',
        deadline: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2 hours
        estimatedDuration: 480,
      });
    }
  }

  private async analyzeEmergencyImpact(
    event: WeddingEmergencyEvent,
    context: WeddingContext,
    impacts: ImpactArea[],
    affectedParties: AffectedParty[],
    recommendedActions: RecommendedAction[],
  ): Promise<void> {
    const emergencyData = event.payload;

    // Emergency always has maximum severity
    impacts.push({
      area: 'logistics',
      severity: 10,
      description: `${emergencyData.emergencyType} emergency requiring immediate response`,
      affectedElements: ['entire_wedding', 'all_vendors', 'all_guests'],
    });

    // All parties are affected in an emergency
    affectedParties.push(
      {
        type: 'couple',
        id: context.clientId,
        name: 'Wedding Couple',
        impactLevel: 'critical',
        requiredActions: [
          'immediate_decision_making',
          'guest_communication',
          'emergency_coordination',
        ],
      },
      {
        type: 'planner',
        id: 'wedding_planner',
        name: 'Wedding Planner',
        impactLevel: 'critical',
        requiredActions: [
          'emergency_protocol_activation',
          'vendor_coordination',
          'backup_plan_execution',
        ],
      },
    );

    // Add all vendors as affected parties
    for (const vendorId of context.vendorIds) {
      affectedParties.push({
        type: 'vendor',
        id: vendorId,
        name: `Vendor ${vendorId}`,
        impactLevel: 'critical',
        requiredActions: [
          'emergency_response',
          'immediate_availability_confirmation',
        ],
      });
    }

    // Emergency-specific recommendations
    recommendedActions.push({
      id: 'emergency_response_immediate',
      description: 'Execute immediate emergency response protocol',
      priority: 'critical',
      deadline: new Date(Date.now() + 15 * 60 * 1000), // 15 minutes
      estimatedDuration: 60,
    });

    if (emergencyData.backupPlan.viability >= 7) {
      recommendedActions.push({
        id: 'backup_plan_activation',
        description: 'Activate pre-approved backup plan',
        priority: 'critical',
        deadline: new Date(Date.now() + 30 * 60 * 1000), // 30 minutes
        estimatedDuration: emergencyData.backupPlan.timeToImplement * 60,
      });
    }
  }

  private calculateOverallSeverity(impacts: ImpactArea[]): number {
    if (impacts.length === 0) return 1;

    // Weight different impact areas
    const weights = {
      weather: 0.8,
      timeline: 1.0,
      vendors: 0.9,
      budget: 0.6,
      logistics: 1.0,
    };

    let weightedSum = 0;
    let totalWeight = 0;

    for (const impact of impacts) {
      const weight = weights[impact.area] || 0.7;
      weightedSum += impact.severity * weight;
      totalWeight += weight;
    }

    return totalWeight > 0 ? Math.round(weightedSum / totalWeight) : 1;
  }

  private calculateUrgencyLevel(
    impacts: ImpactArea[],
    context: WeddingContext,
  ): 'low' | 'medium' | 'high' | 'critical' {
    const maxSeverity = Math.max(...impacts.map((i) => i.severity), 1);

    // Wedding day proximity affects urgency
    if (context.isWeddingDay && maxSeverity >= 5) return 'critical';
    if (context.isWeddingWeek && maxSeverity >= 7) return 'critical';
    if (context.daysToWedding <= 30 && maxSeverity >= 8) return 'critical';

    if (maxSeverity >= 8) return 'critical';
    if (maxSeverity >= 6) return 'high';
    if (maxSeverity >= 4) return 'medium';
    return 'low';
  }

  private async generateContextualNotifications(
    event: WeddingEvent,
    impactAnalysis: EventImpactAnalysis,
  ): Promise<ProcessedNotification[]> {
    const notifications: ProcessedNotification[] = [];

    // Generate notifications for each affected party
    for (const party of impactAnalysis.affectedParties) {
      const notification = await this.createPartySpecificNotification(
        event,
        party,
        impactAnalysis,
      );
      notifications.push(notification);
    }

    // Generate coordination notifications for high-impact events
    if (impactAnalysis.overallSeverity >= 7) {
      const coordinationNotifications =
        await this.generateCoordinationNotifications(event, impactAnalysis);
      notifications.push(...coordinationNotifications);
    }

    // Generate escalation notifications for critical events
    if (impactAnalysis.urgencyLevel === 'critical') {
      const escalationNotifications =
        await this.generateEscalationNotifications(event, impactAnalysis);
      notifications.push(...escalationNotifications);
    }

    return notifications;
  }

  private async createPartySpecificNotification(
    event: WeddingEvent,
    party: AffectedParty,
    impactAnalysis: EventImpactAnalysis,
  ): Promise<ProcessedNotification> {
    const notificationId = `wedding_${event.weddingContext.weddingId}_${party.type}_${party.id}_${Date.now()}`;

    // Customize content based on party type and impact
    const content = await this.generatePartySpecificContent(
      event,
      party,
      impactAnalysis,
    );

    // Select channels based on party type and urgency
    const channels = this.selectChannelsForParty(
      party,
      impactAnalysis.urgencyLevel,
    );

    // Create recipient
    const recipient = {
      id: party.id,
      type: party.type,
      contactInfo: { name: party.name, role: party.type, email: '', phone: '' },
      preferences: {
        channels: {
          email: true,
          sms: true,
          push: true,
          inApp: true,
          webhook: false,
          phoneCall: false,
        },
        urgencyThreshold: 'medium' as EventPriority,
        autoEscalation: true,
      },
    };

    return {
      notificationId,
      originalEventId: event.eventId,
      type: this.mapUrgencyToNotificationType(impactAnalysis.urgencyLevel),
      priority: this.mapUrgencyToPriority(impactAnalysis.urgencyLevel),
      channel: channels,
      recipients: [recipient],
      content,
      deliverySchedule: {
        scheduledAt: new Date(),
        maxDeliveryTime: new Date(
          Date.now() + this.getMaxDeliveryTime(impactAnalysis.urgencyLevel),
        ),
      },
      trackingEnabled: true,
      retryPolicy: {
        maxRetries: impactAnalysis.urgencyLevel === 'critical' ? 5 : 3,
        retryInterval:
          impactAnalysis.urgencyLevel === 'critical' ? 10000 : 30000,
        escalateOnFailure: impactAnalysis.urgencyLevel === 'critical',
      },
      weddingContext: event.weddingContext,
    };
  }

  private async generatePartySpecificContent(
    event: WeddingEvent,
    party: AffectedParty,
    impactAnalysis: EventImpactAnalysis,
  ): Promise<NotificationContent> {
    const baseTitle = this.getEventTypeDisplayName(event.eventType);
    const urgencyIndicator =
      impactAnalysis.urgencyLevel === 'critical'
        ? '🚨 URGENT: '
        : impactAnalysis.urgencyLevel === 'high'
          ? '⚠️ IMPORTANT: '
          : '';

    let title = `${urgencyIndicator}${baseTitle}`;
    let message = event.payload.description;

    // Customize based on party type
    switch (party.type) {
      case 'couple':
        title = `${urgencyIndicator}Wedding Update: ${baseTitle}`;
        message = `${message}\n\nThis affects your wedding and requires your attention. Please review the recommended actions.`;
        break;

      case 'vendor':
        title = `${urgencyIndicator}Vendor Coordination: ${baseTitle}`;
        message = `${message}\n\nYour services may be affected. Please confirm your availability and any adjustments needed.`;
        break;

      case 'venue':
        title = `${urgencyIndicator}Venue Alert: ${baseTitle}`;
        message = `${message}\n\nThis may impact your venue operations. Please prepare accordingly.`;
        break;

      case 'planner':
        title = `${urgencyIndicator}Coordination Required: ${baseTitle}`;
        message = `${message}\n\nImmediate coordination needed with ${impactAnalysis.affectedParties.length} affected parties.`;
        break;
    }

    // Add recommended actions
    if (party.requiredActions.length > 0) {
      message += `\n\nRequired Actions:\n${party.requiredActions.map((action) => `• ${action.replace('_', ' ')}`).join('\n')}`;
    }

    // Add impact summary
    if (impactAnalysis.impacts.length > 0) {
      const topImpacts = impactAnalysis.impacts
        .sort((a, b) => b.severity - a.severity)
        .slice(0, 3)
        .map((i) => `${i.area}: ${i.description}`)
        .join('\n');

      message += `\n\nImpact Summary:\n${topImpacts}`;
    }

    return {
      title,
      message,
      actionRequired: party.requiredActions.length > 0,
      actions: this.generateNotificationActions(party, impactAnalysis),
      metadata: {
        weddingId: event.weddingContext.weddingId,
        eventType: event.eventType,
        severity: impactAnalysis.overallSeverity.toString(),
        daysToWedding: event.weddingContext.daysToWedding?.toString() || '0',
      },
    };
  }

  private generateNotificationActions(
    party: AffectedParty,
    impactAnalysis: EventImpactAnalysis,
  ) {
    const actions = [];

    // Common actions
    actions.push({
      id: 'view_details',
      label: 'View Full Details',
      url: `/wedding/${impactAnalysis.eventId}`,
      type: 'link' as const,
      primary: true,
    });

    // Party-specific actions
    if (party.type === 'couple') {
      actions.push({
        id: 'approve_actions',
        label: 'Review & Approve',
        url: `/wedding/approve/${impactAnalysis.eventId}`,
        type: 'button' as const,
      });
    } else if (party.type === 'vendor') {
      actions.push({
        id: 'confirm_availability',
        label: 'Confirm Availability',
        url: `/vendor/confirm/${impactAnalysis.eventId}`,
        type: 'button' as const,
      });
    }

    // Emergency actions
    if (impactAnalysis.urgencyLevel === 'critical') {
      actions.push({
        id: 'emergency_contact',
        label: 'Emergency Contact',
        url: 'tel:+1234567890',
        type: 'link' as const,
      });
    }

    return actions;
  }

  private selectChannelsForParty(party: AffectedParty, urgencyLevel: string) {
    const baseChannels = ['email', 'in_app'];

    if (urgencyLevel === 'critical') {
      return ['sms', 'phone_call', 'push', 'email', 'in_app'];
    } else if (urgencyLevel === 'high') {
      return ['sms', 'push', 'email', 'in_app'];
    } else if (urgencyLevel === 'medium') {
      return ['push', 'email', 'in_app'];
    }

    return baseChannels;
  }

  private mapUrgencyToNotificationType(urgencyLevel: string) {
    const typeMap = {
      critical: 'emergency',
      high: 'alert',
      medium: 'update',
      low: 'reminder',
    };
    return typeMap[urgencyLevel] || 'update';
  }

  private mapUrgencyToPriority(urgencyLevel: string): EventPriority {
    const priorityMap = {
      critical: 'critical' as EventPriority,
      high: 'high' as EventPriority,
      medium: 'medium' as EventPriority,
      low: 'low' as EventPriority,
    };
    return priorityMap[urgencyLevel] || 'medium';
  }

  private getMaxDeliveryTime(urgencyLevel: string): number {
    const timeMap = {
      critical: 30000, // 30 seconds
      high: 120000, // 2 minutes
      medium: 600000, // 10 minutes
      low: 3600000, // 1 hour
    };
    return timeMap[urgencyLevel] || 600000;
  }

  private getEventTypeDisplayName(eventType: string): string {
    const nameMap = {
      weather_alert: 'Weather Alert',
      timeline_change: 'Timeline Change',
      vendor_update: 'Vendor Update',
      payment_received: 'Payment Update',
      emergency: 'Emergency',
      milestone: 'Milestone',
    };
    return nameMap[eventType] || 'Wedding Update';
  }

  private async generateCoordinationNotifications(
    event: WeddingEvent,
    impactAnalysis: EventImpactAnalysis,
  ): Promise<ProcessedNotification[]> {
    // Generate notifications that require coordination between multiple parties
    const notifications: ProcessedNotification[] = [];

    // Create a coordination notification for the wedding planner/coordinator
    if (impactAnalysis.affectedParties.length > 2) {
      // Implementation would create coordination-specific notifications
    }

    return notifications;
  }

  private async generateEscalationNotifications(
    event: WeddingEvent,
    impactAnalysis: EventImpactAnalysis,
  ): Promise<ProcessedNotification[]> {
    // Generate escalation notifications for critical events
    const notifications: ProcessedNotification[] = [];

    // Create escalation notifications for emergency contacts, venue managers, etc.

    return notifications;
  }

  private async generateCoordinationActions(
    event: WeddingEvent,
    impactAnalysis: EventImpactAnalysis,
  ): Promise<CoordinationAction[]> {
    const actions: CoordinationAction[] = [];

    // Generate coordination actions based on affected parties and required coordination
    for (const party of impactAnalysis.affectedParties) {
      if (party.requiredActions.length > 0) {
        for (const requiredAction of party.requiredActions) {
          actions.push({
            id: `coord_${party.id}_${requiredAction}`,
            type: this.mapActionToCoordinationType(requiredAction),
            target: party.id,
            message: `${requiredAction.replace('_', ' ')} required for ${party.name}`,
            deadline: new Date(Date.now() + 4 * 60 * 60 * 1000), // 4 hours default
            status: 'pending',
          });
        }
      }
    }

    return actions;
  }

  private mapActionToCoordinationType(
    action: string,
  ): CoordinationAction['type'] {
    if (action.includes('vendor')) return 'notify_vendor';
    if (action.includes('timeline') || action.includes('schedule'))
      return 'update_timeline';
    if (action.includes('emergency')) return 'escalate_issue';
    return 'coordinate_response';
  }

  // Interface implementation methods
  async calculateWeddingUrgency(
    event: WeddingEvent,
    context: WeddingContext,
  ): Promise<UrgencyScore> {
    // Implementation would calculate urgency based on wedding-specific factors
    const score = context.isWeddingDay ? 10 : context.isWeddingWeek ? 8 : 5;
    return {
      score,
      factors: [
        {
          factor: 'wedding_proximity',
          weight: 100,
          score,
          description: context.isWeddingDay
            ? 'Wedding day - maximum urgency'
            : 'Standard urgency',
        },
      ],
      calculatedAt: new Date(),
    };
  }

  async applyWeddingBusinessRules(
    notification: ProcessedNotification,
    context?: WeddingContext,
  ): Promise<ProcessedNotification> {
    // Apply wedding-specific business rules
    let modified = { ...notification };

    if (context?.isWeddingDay) {
      modified.priority = 'critical';
      modified.channel = ['sms', 'phone_call', 'push', 'email'];
    }

    return modified;
  }

  async handleWeddingDayEmergency(emergency: any): Promise<any> {
    // Handle wedding day emergencies
    return { emergencyId: emergency.emergencyId, status: 'handled' };
  }

  async coordinateVendorNotifications(
    coordination: VendorCoordination,
  ): Promise<CoordinationResult> {
    // Coordinate vendor notifications
    return {
      coordinationId: `coord_${coordination.weddingId}_${Date.now()}`,
      notificationsCreated: coordination.vendorIds.length,
      vendorsContacted: coordination.vendorIds.length,
      expectedResponses: coordination.requiresResponse
        ? coordination.vendorIds.length
        : 0,
    };
  }

  async handleTimelineConflict(
    conflict: TimelineConflict,
  ): Promise<ConflictResolutionResult> {
    const startTime = Date.now();

    try {
      // Analyze the conflict
      const conflictAnalysis = await this.analyzeTimelineConflict(conflict);

      // Generate notifications for affected parties
      const notifications = await this.generateConflictNotifications(
        conflict,
        conflictAnalysis,
      );

      // Propose resolution options
      const resolutionOptions = await this.generateResolutionOptions(
        conflict,
        conflictAnalysis,
      );

      // Send notifications with resolution options
      for (const notification of notifications) {
        notification.content.resolutionOptions = resolutionOptions;
        // Would deliver notification here
      }

      return {
        conflictId: conflict.conflictId,
        analysis: conflictAnalysis,
        notificationsSent: notifications.length,
        resolutionOptions,
        resolutionDeadline: new Date(Date.now() + 3600000), // 1 hour
        processingTime: Date.now() - startTime,
      };
    } catch (error) {
      throw new ConflictResolutionError(
        `Failed to handle timeline conflict ${conflict.conflictId}`,
        error as Error,
      );
    }
  }

  // Helper methods
  private async getWeddingWeatherForecast(
    weddingId: string,
  ): Promise<WeatherForecast> {
    // This would fetch weather forecast for the wedding location and date
    return {
      location: { lat: 0, lng: 0 },
      forecast: [],
      alerts: [],
      recommendations: [],
    };
  }

  private calculateSeasonalContext(weddingDate: Date) {
    const month = weddingDate.getMonth() + 1;

    let season: 'spring' | 'summer' | 'fall' | 'winter';
    let isPeakSeason = false;
    let weatherRisk: 'low' | 'medium' | 'high' = 'low';

    if (month >= 3 && month <= 5) {
      season = 'spring';
      isPeakSeason = month === 5;
      weatherRisk = 'medium';
    } else if (month >= 6 && month <= 8) {
      season = 'summer';
      isPeakSeason = true;
      weatherRisk = 'low';
    } else if (month >= 9 && month <= 11) {
      season = 'fall';
      isPeakSeason = month === 9 || month === 10;
      weatherRisk = 'medium';
    } else {
      season = 'winter';
      isPeakSeason = false;
      weatherRisk = 'high';
    }

    return { season, isPeakSeason, weatherRisk };
  }

  private async calculateCascadeEffects(
    timelineData: any,
    timeline: WeddingTimelineData,
  ): Promise<any[]> {
    // Calculate how timeline changes cascade through dependent events
    return [];
  }

  private async analyzeTimelineConflict(
    conflict: TimelineConflict,
  ): Promise<ConflictAnalysis> {
    return {
      severity: 7,
      impactRadius: 3,
      timeToResolve: 120,
      stakeholderCount: 5,
      resolutionComplexity: 'moderate',
    };
  }

  private async generateConflictNotifications(
    conflict: TimelineConflict,
    analysis: ConflictAnalysis,
  ): Promise<ProcessedNotification[]> {
    return [];
  }

  private async generateResolutionOptions(
    conflict: TimelineConflict,
    analysis: ConflictAnalysis,
  ): Promise<ResolutionOption[]> {
    return [];
  }
}

// Supporting service classes
class WeddingAnalyticsImpl implements WeddingAnalytics {
  async getWeddingTimeline(weddingId: string): Promise<WeddingTimelineData> {
    return {
      weddingId,
      events: [],
      criticalPath: [],
      bufferTimes: {},
      dependencies: [],
      totalDuration: 480,
      riskFactors: [],
    };
  }

  async getVendorDependencies(weddingId: string): Promise<VendorDependency[]> {
    return [];
  }

  async getWeatherForecast(
    location: { lat: number; lng: number },
    date: Date,
  ): Promise<WeatherForecast> {
    return {
      location,
      forecast: [],
      alerts: [],
      recommendations: [],
    };
  }

  async calculateVendorReplacementOptions(
    vendorId: string,
    weddingId: string,
  ): Promise<ReplacementOption[]> {
    return [];
  }

  async assessBudgetImpact(
    weddingId: string,
    change: BudgetChangeEvent,
  ): Promise<BudgetImpactAnalysis> {
    return {
      originalBudget: 25000,
      newTotal: 25000 + change.amount,
      percentageChange: (change.amount / 25000) * 100,
      categoryBreakdown: {},
      recommendations: [],
      riskLevel: 'low',
    };
  }
}

class WeddingTimelineProcessor {
  // Timeline processing implementation
}

class VendorCoordinator {
  // Vendor coordination implementation
}

class WeatherService {
  // Weather service implementation
}

class BudgetAnalyzer {
  // Budget analysis implementation
}

class ConflictResolver {
  // Conflict resolution implementation
}

export default WeddingNotificationIntelligence;
