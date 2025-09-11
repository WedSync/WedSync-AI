import { AIRecommendation, OptimizationResult } from '@/lib/ai/types';

interface CalendarProvider {
  id: string;
  name: string;
  type: 'google' | 'outlook' | 'apple' | 'custom';
  apiClient: CalendarAPIClient;
}

interface CalendarAPIClient {
  createEvent(event: CalendarEventRequest): Promise<CalendarEventResponse>;
  updateEvent(eventId: string, updates: CalendarEventUpdate): Promise<void>;
  deleteEvent(eventId: string): Promise<void>;
  getEvents(query: CalendarQuery): Promise<CalendarEvent[]>;
  checkAvailability(timeSlots: TimeSlot[]): Promise<AvailabilityResult[]>;
  syncCalendar(calendarId: string): Promise<SyncResult>;
  setupWebhook(config: WebhookConfig): Promise<WebhookResult>;
}

interface CalendarEventRequest {
  title: string;
  description?: string;
  startTime: Date;
  endTime: Date;
  location?: string;
  attendees?: Attendee[];
  reminders?: Reminder[];
  recurrence?: RecurrenceRule;
}

interface CalendarEventResponse {
  eventId: string;
  status: 'confirmed' | 'tentative' | 'cancelled';
  url?: string;
  icsLink?: string;
}

interface CalendarEventUpdate {
  title?: string;
  startTime?: Date;
  endTime?: Date;
  location?: string;
  attendees?: Attendee[];
  status?: 'confirmed' | 'tentative' | 'cancelled';
}

interface CalendarQuery {
  startDate: Date;
  endDate: Date;
  calendarIds?: string[];
  keywords?: string[];
  attendeeEmails?: string[];
}

interface CalendarEvent {
  id: string;
  title: string;
  startTime: Date;
  endTime: Date;
  location?: string;
  attendees: Attendee[];
  status: string;
  createdBy: string;
  isWeddingRelated: boolean;
}

interface TimeSlot {
  startTime: Date;
  endTime: Date;
  requiredAttendees?: string[];
}

interface AvailabilityResult {
  timeSlot: TimeSlot;
  isAvailable: boolean;
  conflicts: CalendarEvent[];
  suggestedAlternatives?: TimeSlot[];
}

interface SyncResult {
  calendarId: string;
  eventsSynced: number;
  conflictsFound: number;
  lastSyncTime: Date;
}

interface WebhookConfig {
  url: string;
  events: string[];
  calendarId: string;
}

interface WebhookResult {
  webhookId: string;
  isActive: boolean;
  expirationTime: Date;
}

interface Attendee {
  email: string;
  name: string;
  status: 'accepted' | 'declined' | 'pending' | 'tentative';
  isOrganizer?: boolean;
  role?: 'required' | 'optional';
}

interface Reminder {
  method: 'email' | 'popup' | 'sms';
  minutes: number;
}

interface RecurrenceRule {
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
  interval: number;
  endDate?: Date;
  count?: number;
}

interface WeddingTimeline {
  weddingId: string;
  weddingDate: Date;
  events: TimelineEvent[];
  totalDuration: number;
  bufferTime: number;
  isOptimized: boolean;
}

interface TimelineEvent {
  id: string;
  name: string;
  startTime: Date;
  endTime: Date;
  duration: number;
  category:
    | 'ceremony'
    | 'reception'
    | 'preparation'
    | 'vendor_setup'
    | 'cleanup';
  requiredVendors: string[];
  requiredAttendees: string[];
  location?: string;
  dependencies: string[];
  flexibility: EventFlexibility;
  priority: 'low' | 'medium' | 'high' | 'critical';
}

interface EventFlexibility {
  canMoveEarlier: boolean;
  canMoveLater: boolean;
  maxTimeShift: number; // minutes
  canChangeDuration: boolean;
  minDuration: number;
  maxDuration: number;
}

interface TimelineOptimization {
  optimizationId: string;
  weddingId: string;
  originalTimeline: WeddingTimeline;
  optimizedTimeline: WeddingTimeline;
  improvements: TimelineImprovement[];
  vendorConflicts: VendorConflictResolution[];
  estimatedSavings: TimeSavings;
}

interface TimelineImprovement {
  eventId: string;
  type:
    | 'duration_optimized'
    | 'timing_improved'
    | 'vendor_coordination'
    | 'buffer_added';
  description: string;
  timeSaved: number; // minutes
  impact: 'low' | 'medium' | 'high';
  confidence: number;
}

interface VendorConflictResolution {
  vendorId: string;
  conflictType: 'scheduling' | 'setup_time' | 'location_change';
  originalSlot: TimeSlot;
  resolvedSlot: TimeSlot;
  resolutionStrategy: string;
}

interface TimeSavings {
  totalTimeSaved: number; // minutes
  buffersAdded: number;
  overlapsResolved: number;
  vendorEfficiencyGains: number;
}

interface CalendarAISyncConfig {
  calendarProviders: CalendarProvider[];
  aiServiceUrl: string;
  weddingTimelineRules: TimelineRule[];
  syncSettings: CalendarSyncSettings;
}

interface TimelineRule {
  condition: string;
  action: string;
  priority: number;
  bufferTime: number;
}

interface CalendarSyncSettings {
  autoSyncEnabled: boolean;
  syncIntervalMinutes: number;
  conflictResolutionStrategy:
    | 'ai_optimize'
    | 'manual_review'
    | 'vendor_priority';
  notificationSettings: NotificationSettings;
}

interface NotificationSettings {
  emailReminders: boolean;
  smsReminders: boolean;
  reminderTimes: number[]; // minutes before event
  escalationRules: EscalationRule[];
}

interface EscalationRule {
  condition: string;
  action: string;
  delayMinutes: number;
}

interface SmartSchedulingResult {
  schedulingId: string;
  weddingId: string;
  recommendedTimeSlots: RecommendedTimeSlot[];
  vendorAvailability: VendorAvailability[];
  conflictsResolved: number;
  aiConfidence: number;
}

interface RecommendedTimeSlot {
  eventName: string;
  timeSlot: TimeSlot;
  reasons: string[];
  alternatives: TimeSlot[];
  vendorCompatibility: VendorCompatibility[];
  confidence: number;
}

interface VendorAvailability {
  vendorId: string;
  availableSlots: TimeSlot[];
  busySlots: TimeSlot[];
  preferredTimes: TimeSlot[];
  setupRequirements: SetupRequirement[];
}

interface VendorCompatibility {
  vendorId: string;
  compatibilityScore: number;
  requirements: string[];
  conflicts: string[];
}

interface SetupRequirement {
  type: 'before_event' | 'after_event' | 'concurrent';
  duration: number; // minutes
  description: string;
  priority: 'required' | 'preferred' | 'optional';
}

interface CalendarConflictResolution {
  conflictId: string;
  conflictType:
    | 'vendor_overlap'
    | 'venue_booking'
    | 'guest_availability'
    | 'vendor_travel';
  conflictingEvents: string[];
  resolutionOptions: ResolutionOption[];
  recommendedResolution: string;
  aiReasoning: string;
}

interface ResolutionOption {
  optionId: string;
  description: string;
  impact: ConflictImpact;
  feasibility: number;
  cost: number; // additional cost if any
  timeShift: number; // minutes
}

interface ConflictImpact {
  vendorsAffected: string[];
  guestsAffected: number;
  locationChanges: boolean;
  budgetImpact: number;
}

interface CalendarAISync {
  // Timeline optimization
  optimizeWeddingTimeline(weddingId: string): Promise<TimelineOptimization>;
  implementTimelineOptimization(
    optimization: TimelineOptimization,
  ): Promise<void>;

  // Smart scheduling
  scheduleWithAI(
    weddingId: string,
    eventRequests: CalendarEventRequest[],
  ): Promise<SmartSchedulingResult>;
  findOptimalTimeSlots(
    requirements: SchedulingRequirements,
  ): Promise<RecommendedTimeSlot[]>;

  // Conflict resolution
  resolveSchedulingConflicts(
    conflicts: SchedulingConflict[],
  ): Promise<CalendarConflictResolution[]>;
  handleVendorScheduleChanges(
    vendorId: string,
    changes: ScheduleChange[],
  ): Promise<void>;

  // Real-time synchronization
  syncCalendarsWithAI(weddingId: string): Promise<SyncResult[]>;
  setupAutomatedScheduling(
    weddingId: string,
    rules: TimelineRule[],
  ): Promise<void>;
}

interface SchedulingRequirements {
  weddingId: string;
  weddingDate: Date;
  events: EventRequirement[];
  vendorConstraints: VendorConstraint[];
  guestAvailability?: TimeSlot[];
  locationConstraints: LocationConstraint[];
}

interface EventRequirement {
  name: string;
  duration: number;
  category: string;
  requiredVendors: string[];
  flexibility: EventFlexibility;
  dependencies: string[];
}

interface VendorConstraint {
  vendorId: string;
  availableSlots: TimeSlot[];
  setupTime: number;
  breakdownTime: number;
  travelTime?: number;
  maximumEvents: number;
}

interface LocationConstraint {
  locationId: string;
  availableSlots: TimeSlot[];
  setupRestrictions: string[];
  capacityLimits: Record<string, number>;
}

interface SchedulingConflict {
  id: string;
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  conflictingEvents: string[];
  suggestedResolutions: string[];
}

interface ScheduleChange {
  changeId: string;
  type: 'availability_change' | 'cancellation' | 'reschedule_request';
  originalSlot: TimeSlot;
  newSlot?: TimeSlot;
  reason: string;
  urgency: 'low' | 'medium' | 'high';
}

export class CalendarAISync implements CalendarAISync {
  private calendarProviders: Map<string, CalendarProvider> = new Map();
  private aiServiceUrl: string;
  private timelineRules: TimelineRule[];
  private syncSettings: CalendarSyncSettings;

  constructor(config: CalendarAISyncConfig) {
    this.aiServiceUrl = config.aiServiceUrl;
    this.timelineRules = config.weddingTimelineRules;
    this.syncSettings = config.syncSettings;
    this.initializeCalendarProviders(config.calendarProviders);
  }

  async optimizeWeddingTimeline(
    weddingId: string,
  ): Promise<TimelineOptimization> {
    try {
      // Get current wedding timeline
      const currentTimeline = await this.getWeddingTimeline(weddingId);

      // Get vendor availability and constraints
      const vendorAvailability = await this.getVendorAvailability(weddingId);

      // Get venue and location constraints
      const locationConstraints = await this.getLocationConstraints(weddingId);

      // Request AI timeline optimization
      const aiOptimization = await this.requestAITimelineOptimization({
        weddingId,
        currentTimeline,
        vendorAvailability,
        locationConstraints,
        weddingPreferences: await this.getWeddingPreferences(weddingId),
      });

      // Analyze vendor conflicts and resolutions
      const conflictResolutions = await this.analyzeVendorConflicts(
        currentTimeline,
        aiOptimization.optimizedTimeline,
        vendorAvailability,
      );

      // Calculate time savings
      const timeSavings = this.calculateTimeSavings(
        currentTimeline,
        aiOptimization.optimizedTimeline,
      );

      return {
        optimizationId: `opt-${Date.now()}`,
        weddingId,
        originalTimeline: currentTimeline,
        optimizedTimeline: aiOptimization.optimizedTimeline,
        improvements: aiOptimization.improvements,
        vendorConflicts: conflictResolutions,
        estimatedSavings: timeSavings,
      };
    } catch (error: any) {
      throw new CalendarAIError(
        `Failed to optimize wedding timeline: ${error.message}`,
      );
    }
  }

  async implementTimelineOptimization(
    optimization: TimelineOptimization,
  ): Promise<void> {
    // Update calendar events for each timeline change
    for (const event of optimization.optimizedTimeline.events) {
      const originalEvent = optimization.originalTimeline.events.find(
        (e) => e.id === event.id,
      );

      if (originalEvent && this.hasEventChanged(originalEvent, event)) {
        // Update event in all relevant calendars
        await this.updateEventInAllCalendars(event, originalEvent);

        // Notify attendees and vendors
        await this.notifyEventChange(event, originalEvent);
      }
    }

    // Resolve vendor conflicts
    for (const conflict of optimization.vendorConflicts) {
      await this.resolveVendorConflict(conflict);
    }

    // Update wedding timeline record
    await this.updateWeddingTimelineRecord(
      optimization.weddingId,
      optimization.optimizedTimeline,
    );
  }

  async scheduleWithAI(
    weddingId: string,
    eventRequests: CalendarEventRequest[],
  ): Promise<SmartSchedulingResult> {
    // Get scheduling requirements
    const requirements = await this.getSchedulingRequirements(weddingId);

    // Get vendor availability for all events
    const vendorAvailability = await this.getBulkVendorAvailability(
      eventRequests.flatMap((req) => req.attendees?.map((a) => a.email) || []),
    );

    // Use AI to find optimal time slots
    const aiScheduling = await this.requestAIScheduling({
      weddingId,
      eventRequests,
      requirements,
      vendorAvailability,
    });

    // Process AI recommendations
    const recommendedTimeSlots = aiScheduling.recommendations.map(
      (rec: any): RecommendedTimeSlot => ({
        eventName: rec.eventName,
        timeSlot: rec.timeSlot,
        reasons: rec.reasons,
        alternatives: rec.alternatives,
        vendorCompatibility: rec.vendorCompatibility,
        confidence: rec.confidence,
      }),
    );

    // Resolve any conflicts found
    const conflictsResolved = await this.resolveSchedulingConflictsInBatch(
      aiScheduling.conflicts,
    );

    return {
      schedulingId: `sched-${Date.now()}`,
      weddingId,
      recommendedTimeSlots,
      vendorAvailability,
      conflictsResolved: conflictsResolved.length,
      aiConfidence: this.calculateOverallConfidence(recommendedTimeSlots),
    };
  }

  async findOptimalTimeSlots(
    requirements: SchedulingRequirements,
  ): Promise<RecommendedTimeSlot[]> {
    // Use AI to analyze all constraints and find optimal slots
    const aiRecommendations = await this.requestAIOptimalSlots({
      requirements,
      timelineRules: this.timelineRules,
    });

    return aiRecommendations.map(
      (rec: any): RecommendedTimeSlot => ({
        eventName: rec.eventName,
        timeSlot: {
          startTime: new Date(rec.startTime),
          endTime: new Date(rec.endTime),
          requiredAttendees: rec.requiredAttendees,
        },
        reasons: rec.reasons,
        alternatives: rec.alternatives.map((alt: any) => ({
          startTime: new Date(alt.startTime),
          endTime: new Date(alt.endTime),
          requiredAttendees: alt.requiredAttendees,
        })),
        vendorCompatibility: rec.vendorCompatibility,
        confidence: rec.confidence,
      }),
    );
  }

  async resolveSchedulingConflicts(
    conflicts: SchedulingConflict[],
  ): Promise<CalendarConflictResolution[]> {
    const resolutions: CalendarConflictResolution[] = [];

    for (const conflict of conflicts) {
      // Get AI-powered conflict resolution
      const aiResolution = await this.requestAIConflictResolution({
        conflict,
        contextData: await this.getConflictContext(conflict),
      });

      // Create resolution options
      const resolutionOptions: ResolutionOption[] = aiResolution.options.map(
        (option: any) => ({
          optionId: option.id,
          description: option.description,
          impact: {
            vendorsAffected: option.impact.vendorsAffected,
            guestsAffected: option.impact.guestsAffected,
            locationChanges: option.impact.locationChanges,
            budgetImpact: option.impact.budgetImpact,
          },
          feasibility: option.feasibility,
          cost: option.cost,
          timeShift: option.timeShift,
        }),
      );

      resolutions.push({
        conflictId: conflict.id,
        conflictType: conflict.type as any,
        conflictingEvents: conflict.conflictingEvents,
        resolutionOptions,
        recommendedResolution: aiResolution.recommendedOption,
        aiReasoning: aiResolution.reasoning,
      });
    }

    return resolutions;
  }

  async handleVendorScheduleChanges(
    vendorId: string,
    changes: ScheduleChange[],
  ): Promise<void> {
    for (const change of changes) {
      switch (change.type) {
        case 'availability_change':
          await this.handleAvailabilityChange(vendorId, change);
          break;
        case 'cancellation':
          await this.handleVendorCancellation(vendorId, change);
          break;
        case 'reschedule_request':
          await this.handleRescheduleRequest(vendorId, change);
          break;
      }
    }

    // Re-optimize affected wedding timelines
    const affectedWeddings = await this.getAffectedWeddings(vendorId, changes);
    for (const weddingId of affectedWeddings) {
      await this.reoptimizeTimelineForVendorChange(
        weddingId,
        vendorId,
        changes,
      );
    }
  }

  async syncCalendarsWithAI(weddingId: string): Promise<SyncResult[]> {
    const syncResults: SyncResult[] = [];
    const calendarIds = await this.getWeddingCalendars(weddingId);

    for (const calendarId of calendarIds) {
      const provider = this.findProviderForCalendar(calendarId);
      if (provider) {
        try {
          const syncResult = await provider.apiClient.syncCalendar(calendarId);
          syncResults.push(syncResult);

          // Use AI to analyze sync results and suggest optimizations
          if (syncResult.conflictsFound > 0) {
            await this.analyzeAndResolveConflicts(
              weddingId,
              calendarId,
              syncResult,
            );
          }
        } catch (error) {
          console.error(`Failed to sync calendar ${calendarId}:`, error);
        }
      }
    }

    return syncResults;
  }

  async setupAutomatedScheduling(
    weddingId: string,
    rules: TimelineRule[],
  ): Promise<void> {
    // Set up AI-powered automated scheduling
    await this.setupAISchedulingAutomation({
      weddingId,
      rules,
      syncSettings: this.syncSettings,
    });

    // Set up webhook monitoring for calendar changes
    await this.setupCalendarWebhooks(weddingId);

    // Initialize conflict monitoring
    await this.initializeConflictMonitoring(weddingId);
  }

  private initializeCalendarProviders(providers: CalendarProvider[]): void {
    providers.forEach((provider) => {
      this.calendarProviders.set(provider.id, provider);
    });
  }

  private async getWeddingTimeline(
    weddingId: string,
  ): Promise<WeddingTimeline> {
    // Mock implementation - replace with actual data fetching
    return {
      weddingId,
      weddingDate: new Date('2024-08-15T14:00:00'),
      events: [
        {
          id: 'ceremony',
          name: 'Wedding Ceremony',
          startTime: new Date('2024-08-15T14:00:00'),
          endTime: new Date('2024-08-15T15:00:00'),
          duration: 60,
          category: 'ceremony',
          requiredVendors: ['officiant', 'photographer', 'florist'],
          requiredAttendees: ['bride', 'groom', 'immediate_family'],
          dependencies: ['preparation'],
          flexibility: {
            canMoveEarlier: false,
            canMoveLater: true,
            maxTimeShift: 30,
            canChangeDuration: false,
            minDuration: 45,
            maxDuration: 75,
          },
          priority: 'critical',
        },
      ],
      totalDuration: 480, // 8 hours
      bufferTime: 60,
      isOptimized: false,
    };
  }

  private async getVendorAvailability(
    weddingId: string,
  ): Promise<VendorAvailability[]> {
    // Mock implementation
    return [
      {
        vendorId: 'photographer-1',
        availableSlots: [
          {
            startTime: new Date('2024-08-15T10:00:00'),
            endTime: new Date('2024-08-15T20:00:00'),
          },
        ],
        busySlots: [],
        preferredTimes: [
          {
            startTime: new Date('2024-08-15T12:00:00'),
            endTime: new Date('2024-08-15T18:00:00'),
          },
        ],
        setupRequirements: [
          {
            type: 'before_event',
            duration: 30,
            description: 'Equipment setup and lighting check',
            priority: 'required',
          },
        ],
      },
    ];
  }

  private async getLocationConstraints(
    weddingId: string,
  ): Promise<LocationConstraint[]> {
    return [];
  }

  private async getWeddingPreferences(weddingId: string): Promise<any> {
    return {};
  }

  private async requestAITimelineOptimization(data: any): Promise<any> {
    // Mock AI service call
    return {
      optimizedTimeline: data.currentTimeline,
      improvements: [
        {
          eventId: 'ceremony',
          type: 'buffer_added',
          description: 'Added 15-minute buffer before ceremony',
          timeSaved: 0,
          impact: 'medium',
          confidence: 0.9,
        },
      ],
    };
  }

  private async analyzeVendorConflicts(
    original: WeddingTimeline,
    optimized: WeddingTimeline,
    availability: VendorAvailability[],
  ): Promise<VendorConflictResolution[]> {
    return [];
  }

  private calculateTimeSavings(
    original: WeddingTimeline,
    optimized: WeddingTimeline,
  ): TimeSavings {
    return {
      totalTimeSaved: 30,
      buffersAdded: 2,
      overlapsResolved: 1,
      vendorEfficiencyGains: 15,
    };
  }

  private hasEventChanged(
    original: TimelineEvent,
    updated: TimelineEvent,
  ): boolean {
    return (
      original.startTime.getTime() !== updated.startTime.getTime() ||
      original.endTime.getTime() !== updated.endTime.getTime() ||
      original.location !== updated.location
    );
  }

  private async updateEventInAllCalendars(
    event: TimelineEvent,
    original: TimelineEvent,
  ): Promise<void> {
    // Implementation for updating event across all calendars
  }

  private async notifyEventChange(
    event: TimelineEvent,
    original: TimelineEvent,
  ): Promise<void> {
    // Implementation for notifying attendees of changes
  }

  private async resolveVendorConflict(
    conflict: VendorConflictResolution,
  ): Promise<void> {
    // Implementation for resolving vendor conflicts
  }

  private async updateWeddingTimelineRecord(
    weddingId: string,
    timeline: WeddingTimeline,
  ): Promise<void> {
    // Implementation for updating timeline record
  }

  private async getSchedulingRequirements(
    weddingId: string,
  ): Promise<SchedulingRequirements> {
    return {
      weddingId,
      weddingDate: new Date('2024-08-15'),
      events: [],
      vendorConstraints: [],
      locationConstraints: [],
    };
  }

  private async getBulkVendorAvailability(
    attendeeEmails: string[],
  ): Promise<VendorAvailability[]> {
    return [];
  }

  private async requestAIScheduling(data: any): Promise<any> {
    return {
      recommendations: [],
      conflicts: [],
    };
  }

  private async resolveSchedulingConflictsInBatch(
    conflicts: any[],
  ): Promise<any[]> {
    return [];
  }

  private calculateOverallConfidence(slots: RecommendedTimeSlot[]): number {
    if (slots.length === 0) return 0;
    return slots.reduce((sum, slot) => sum + slot.confidence, 0) / slots.length;
  }

  private async requestAIOptimalSlots(data: any): Promise<any[]> {
    return [];
  }

  private async requestAIConflictResolution(data: any): Promise<any> {
    return {
      options: [],
      recommendedOption: '',
      reasoning: '',
    };
  }

  private async getConflictContext(conflict: SchedulingConflict): Promise<any> {
    return {};
  }

  private async handleAvailabilityChange(
    vendorId: string,
    change: ScheduleChange,
  ): Promise<void> {
    // Implementation for handling availability changes
  }

  private async handleVendorCancellation(
    vendorId: string,
    change: ScheduleChange,
  ): Promise<void> {
    // Implementation for handling vendor cancellations
  }

  private async handleRescheduleRequest(
    vendorId: string,
    change: ScheduleChange,
  ): Promise<void> {
    // Implementation for handling reschedule requests
  }

  private async getAffectedWeddings(
    vendorId: string,
    changes: ScheduleChange[],
  ): Promise<string[]> {
    return [];
  }

  private async reoptimizeTimelineForVendorChange(
    weddingId: string,
    vendorId: string,
    changes: ScheduleChange[],
  ): Promise<void> {
    // Implementation for re-optimizing timeline
  }

  private async getWeddingCalendars(weddingId: string): Promise<string[]> {
    return [];
  }

  private findProviderForCalendar(
    calendarId: string,
  ): CalendarProvider | undefined {
    // Implementation for finding provider
    return Array.from(this.calendarProviders.values())[0];
  }

  private async analyzeAndResolveConflicts(
    weddingId: string,
    calendarId: string,
    syncResult: SyncResult,
  ): Promise<void> {
    // Implementation for analyzing and resolving conflicts
  }

  private async setupAISchedulingAutomation(config: any): Promise<void> {
    // Implementation for setting up AI automation
  }

  private async setupCalendarWebhooks(weddingId: string): Promise<void> {
    // Implementation for setting up webhooks
  }

  private async initializeConflictMonitoring(weddingId: string): Promise<void> {
    // Implementation for initializing conflict monitoring
  }
}

class CalendarAIError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CalendarAIError';
  }
}

export type {
  TimelineOptimization,
  SmartSchedulingResult,
  CalendarConflictResolution,
  WeddingTimeline,
  SchedulingRequirements,
  CalendarAISyncConfig,
};
