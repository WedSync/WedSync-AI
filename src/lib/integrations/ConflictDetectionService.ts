import {
  createClient,
  RealtimeChannel,
  RealtimePostgresChangesPayload,
} from '@supabase/supabase-js';
import { integrationDataManager } from '../database/IntegrationDataManager';
import {
  IntegrationEvent,
  IntegrationError,
  ErrorCategory,
} from '@/types/integrations';

interface ConflictRule {
  id: string;
  name: string;
  type:
    | 'time_overlap'
    | 'resource_conflict'
    | 'dependency_violation'
    | 'business_rule';
  priority: 'low' | 'medium' | 'high' | 'critical';
  enabled: boolean;
  conditions: Record<string, any>;
  actions: ConflictAction[];
}

interface ConflictAction {
  type: 'notify' | 'auto_resolve' | 'block_operation' | 'suggest_alternative';
  config: Record<string, any>;
}

interface DetectedConflict {
  id: string;
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  affectedResources: Array<{
    id: string;
    type: string;
    name: string;
  }>;
  suggestedResolutions: ConflictResolution[];
  createdAt: Date;
  status: 'active' | 'resolved' | 'ignored';
  autoResolvable: boolean;
}

interface ConflictResolution {
  id: string;
  type:
    | 'reschedule'
    | 'reassign_resource'
    | 'split_task'
    | 'change_location'
    | 'add_buffer';
  description: string;
  impact: 'minimal' | 'moderate' | 'significant';
  estimatedEffort: number; // minutes
  autoApplicable: boolean;
  parameters: Record<string, any>;
}

interface ConflictSubscriber {
  id: string;
  userId: string;
  organizationId: string;
  callback: (conflicts: DetectedConflict[]) => void;
  filters?: {
    severity?: string[];
    types?: string[];
    resources?: string[];
  };
}

export class ConflictDetectionService {
  private supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  private channel: RealtimeChannel | null = null;
  private subscribers = new Map<string, ConflictSubscriber>();
  private conflictRules = new Map<string, ConflictRule>();
  private activeConflicts = new Map<string, DetectedConflict>();
  private isInitialized = false;
  private conflictCheckInterval?: NodeJS.Timeout;

  constructor(
    private userId: string,
    private organizationId: string,
  ) {}

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Load conflict rules
      await this.loadConflictRules();

      // Initialize realtime subscriptions
      await this.setupRealtimeSubscriptions();

      // Start conflict checking interval
      this.startConflictChecking();

      this.isInitialized = true;

      await integrationDataManager.logAudit(
        this.userId,
        this.organizationId,
        'CONFLICT_DETECTION_INITIALIZED',
        undefined,
        'conflict_detection',
        {
          rulesLoaded: this.conflictRules.size,
          realtimeEnabled: !!this.channel,
        },
      );
    } catch (error) {
      throw new IntegrationError(
        'Failed to initialize conflict detection service',
        'CONFLICT_SERVICE_INIT_FAILED',
        ErrorCategory.SYSTEM,
        error as Error,
      );
    }
  }

  private async loadConflictRules(): Promise<void> {
    // Default conflict rules
    const defaultRules: ConflictRule[] = [
      {
        id: 'time_overlap_rule',
        name: 'Time Overlap Detection',
        type: 'time_overlap',
        priority: 'high',
        enabled: true,
        conditions: {
          bufferMinutes: 15,
          ignoreShortEvents: true,
          minimumDuration: 30,
        },
        actions: [
          {
            type: 'notify',
            config: { immediate: true },
          },
          {
            type: 'suggest_alternative',
            config: { searchRadius: 2 },
          },
        ],
      },
      {
        id: 'venue_double_booking',
        name: 'Venue Double Booking',
        type: 'resource_conflict',
        priority: 'critical',
        enabled: true,
        conditions: {
          resourceType: 'venue',
          allowSimultaneous: false,
        },
        actions: [
          {
            type: 'block_operation',
            config: { requireManualReview: true },
          },
          {
            type: 'notify',
            config: { escalate: true, urgency: 'high' },
          },
        ],
      },
      {
        id: 'vendor_availability',
        name: 'Vendor Availability Conflict',
        type: 'resource_conflict',
        priority: 'high',
        enabled: true,
        conditions: {
          resourceType: 'vendor',
          checkBusinessHours: true,
          checkBlackoutDates: true,
        },
        actions: [
          {
            type: 'suggest_alternative',
            config: { includeAlternativeVendors: true },
          },
        ],
      },
      {
        id: 'dependency_chain',
        name: 'Task Dependency Violation',
        type: 'dependency_violation',
        priority: 'medium',
        enabled: true,
        conditions: {
          enforceStrict: true,
          allowParallelDependencies: false,
        },
        actions: [
          {
            type: 'auto_resolve',
            config: { rescheduleDependent: true },
          },
        ],
      },
      {
        id: 'weather_dependency',
        name: 'Weather-Dependent Task Risk',
        type: 'business_rule',
        priority: 'medium',
        enabled: true,
        conditions: {
          weatherTypes: ['rain', 'snow', 'storm'],
          precipitationThreshold: 70,
          advanceWarningHours: 24,
        },
        actions: [
          {
            type: 'notify',
            config: { includeWeatherForecast: true },
          },
          {
            type: 'suggest_alternative',
            config: { indoorAlternatives: true },
          },
        ],
      },
    ];

    // Load custom rules from database
    try {
      const { data: customRules } = await this.supabase
        .from('conflict_rules')
        .select('*')
        .eq('organization_id', this.organizationId)
        .eq('enabled', true);

      // Combine default and custom rules
      const allRules = [...defaultRules, ...(customRules || [])];

      for (const rule of allRules) {
        this.conflictRules.set(rule.id, rule);
      }
    } catch (error) {
      // Fall back to default rules if database query fails
      for (const rule of defaultRules) {
        this.conflictRules.set(rule.id, rule);
      }
    }
  }

  private async setupRealtimeSubscriptions(): Promise<void> {
    this.channel = this.supabase
      .channel('conflict_detection')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'integration_events',
          filter: `organization_id=eq.${this.organizationId}`,
        },
        (payload) => this.handleEventChange(payload),
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tasks',
          filter: `organization_id=eq.${this.organizationId}`,
        },
        (payload) => this.handleTaskChange(payload),
      )
      .subscribe();
  }

  private async handleEventChange(
    payload: RealtimePostgresChangesPayload<any>,
  ): Promise<void> {
    try {
      switch (payload.eventType) {
        case 'INSERT':
        case 'UPDATE':
          await this.checkConflictsForEvent(payload.new);
          break;
        case 'DELETE':
          await this.removeConflictsForResource(
            payload.old.id,
            'integration_event',
          );
          break;
      }
    } catch (error) {
      console.error('Error handling event change:', error);
    }
  }

  private async handleTaskChange(
    payload: RealtimePostgresChangesPayload<any>,
  ): Promise<void> {
    try {
      switch (payload.eventType) {
        case 'INSERT':
        case 'UPDATE':
          await this.checkConflictsForTask(payload.new);
          break;
        case 'DELETE':
          await this.removeConflictsForResource(payload.old.id, 'task');
          break;
      }
    } catch (error) {
      console.error('Error handling task change:', error);
    }
  }

  private async checkConflictsForEvent(eventData: any): Promise<void> {
    const conflicts: DetectedConflict[] = [];

    for (const [ruleId, rule] of this.conflictRules.entries()) {
      if (!rule.enabled) continue;

      const ruleConflicts = await this.applyRule(
        rule,
        eventData,
        'integration_event',
      );
      conflicts.push(...ruleConflicts);
    }

    for (const conflict of conflicts) {
      this.activeConflicts.set(conflict.id, conflict);
    }

    if (conflicts.length > 0) {
      await this.notifySubscribers(conflicts);
    }
  }

  private async checkConflictsForTask(taskData: any): Promise<void> {
    const conflicts: DetectedConflict[] = [];

    for (const [ruleId, rule] of this.conflictRules.entries()) {
      if (!rule.enabled) continue;

      const ruleConflicts = await this.applyRule(rule, taskData, 'task');
      conflicts.push(...ruleConflicts);
    }

    for (const conflict of conflicts) {
      this.activeConflicts.set(conflict.id, conflict);
    }

    if (conflicts.length > 0) {
      await this.notifySubscribers(conflicts);
    }
  }

  private async applyRule(
    rule: ConflictRule,
    data: any,
    dataType: string,
  ): Promise<DetectedConflict[]> {
    const conflicts: DetectedConflict[] = [];

    switch (rule.type) {
      case 'time_overlap':
        conflicts.push(...(await this.checkTimeOverlap(rule, data, dataType)));
        break;
      case 'resource_conflict':
        conflicts.push(
          ...(await this.checkResourceConflict(rule, data, dataType)),
        );
        break;
      case 'dependency_violation':
        conflicts.push(
          ...(await this.checkDependencyViolation(rule, data, dataType)),
        );
        break;
      case 'business_rule':
        conflicts.push(...(await this.checkBusinessRule(rule, data, dataType)));
        break;
    }

    return conflicts;
  }

  private async checkTimeOverlap(
    rule: ConflictRule,
    data: any,
    dataType: string,
  ): Promise<DetectedConflict[]> {
    const conflicts: DetectedConflict[] = [];
    const bufferMinutes = rule.conditions.bufferMinutes || 15;

    try {
      // Get overlapping events/tasks
      const startTime = new Date(data.start_time || data.due_date);
      const endTime = new Date(
        data.end_time ||
          new Date(startTime.getTime() + (data.duration || 60) * 60000),
      );

      // Add buffer time
      const bufferedStart = new Date(
        startTime.getTime() - bufferMinutes * 60000,
      );
      const bufferedEnd = new Date(endTime.getTime() + bufferMinutes * 60000);

      // Query for overlapping items
      const { data: overlapping } = await this.supabase
        .from(dataType === 'task' ? 'tasks' : 'integration_events')
        .select('*')
        .neq('id', data.id)
        .eq('organization_id', this.organizationId)
        .or(
          `start_time.lte.${bufferedEnd.toISOString()},due_date.lte.${bufferedEnd.toISOString()}`,
        )
        .or(
          `end_time.gte.${bufferedStart.toISOString()},due_date.gte.${bufferedStart.toISOString()}`,
        );

      if (overlapping && overlapping.length > 0) {
        for (const overlap of overlapping) {
          const conflictId = `time_overlap_${data.id}_${overlap.id}`;

          conflicts.push({
            id: conflictId,
            type: 'time_overlap',
            severity: rule.priority as 'low' | 'medium' | 'high' | 'critical',
            title: 'Time Overlap Detected',
            description: `${data.title || 'Event'} overlaps with ${overlap.title || 'another event'}`,
            affectedResources: [
              {
                id: data.id,
                type: dataType,
                name: data.title || 'Event',
              },
              {
                id: overlap.id,
                type: dataType,
                name: overlap.title || 'Event',
              },
            ],
            suggestedResolutions: [
              {
                id: `reschedule_${data.id}`,
                type: 'reschedule',
                description: 'Reschedule this event to avoid overlap',
                impact: 'moderate',
                estimatedEffort: 10,
                autoApplicable: false,
                parameters: {
                  suggestedTime: new Date(
                    endTime.getTime() + bufferMinutes * 60000,
                  ).toISOString(),
                },
              },
              {
                id: `add_buffer_${data.id}`,
                type: 'add_buffer',
                description: 'Add buffer time between events',
                impact: 'minimal',
                estimatedEffort: 5,
                autoApplicable: true,
                parameters: {
                  bufferMinutes: bufferMinutes * 2,
                },
              },
            ],
            createdAt: new Date(),
            status: 'active',
            autoResolvable: rule.actions.some((a) => a.type === 'auto_resolve'),
          });
        }
      }
    } catch (error) {
      console.error('Error checking time overlap:', error);
    }

    return conflicts;
  }

  private async checkResourceConflict(
    rule: ConflictRule,
    data: any,
    dataType: string,
  ): Promise<DetectedConflict[]> {
    const conflicts: DetectedConflict[] = [];

    try {
      if (rule.conditions.resourceType === 'venue' && data.location) {
        // Check for venue double booking
        const startTime = new Date(data.start_time || data.due_date);
        const endTime = new Date(
          data.end_time || new Date(startTime.getTime() + 60 * 60000),
        );

        const { data: sameLLocationEvents } = await this.supabase
          .from(dataType === 'task' ? 'tasks' : 'integration_events')
          .select('*')
          .neq('id', data.id)
          .eq('organization_id', this.organizationId)
          .eq('location', data.location)
          .or(
            `start_time.lte.${endTime.toISOString()},due_date.lte.${endTime.toISOString()}`,
          )
          .or(
            `end_time.gte.${startTime.toISOString()},due_date.gte.${startTime.toISOString()}`,
          );

        if (sameLLocationEvents && sameLLocationEvents.length > 0) {
          const conflictId = `venue_conflict_${data.id}_${data.location}`;

          conflicts.push({
            id: conflictId,
            type: 'resource_conflict',
            severity: 'critical',
            title: 'Venue Double Booking',
            description: `Multiple events scheduled at ${data.location} at the same time`,
            affectedResources: [
              {
                id: data.id,
                type: dataType,
                name: data.title || 'Event',
              },
              ...sameLLocationEvents.map((e) => ({
                id: e.id,
                type: dataType,
                name: e.title || 'Event',
              })),
            ],
            suggestedResolutions: [
              {
                id: `change_venue_${data.id}`,
                type: 'change_location',
                description: 'Find alternative venue',
                impact: 'significant',
                estimatedEffort: 60,
                autoApplicable: false,
                parameters: {
                  searchCriteria: {
                    capacity: data.capacity,
                    location: data.location,
                  },
                },
              },
            ],
            createdAt: new Date(),
            status: 'active',
            autoResolvable: false,
          });
        }
      }
    } catch (error) {
      console.error('Error checking resource conflict:', error);
    }

    return conflicts;
  }

  private async checkDependencyViolation(
    rule: ConflictRule,
    data: any,
    dataType: string,
  ): Promise<DetectedConflict[]> {
    const conflicts: DetectedConflict[] = [];

    if (
      dataType !== 'task' ||
      !data.dependencies ||
      data.dependencies.length === 0
    ) {
      return conflicts;
    }

    try {
      const taskStartTime = new Date(data.due_date);

      // Check if dependencies are completed or scheduled after this task
      const { data: dependencies } = await this.supabase
        .from('tasks')
        .select('*')
        .in('id', data.dependencies)
        .eq('organization_id', this.organizationId);

      if (dependencies) {
        for (const dependency of dependencies) {
          const depDueDate = new Date(dependency.due_date);

          if (
            dependency.status !== 'completed' &&
            depDueDate >= taskStartTime
          ) {
            const conflictId = `dependency_${data.id}_${dependency.id}`;

            conflicts.push({
              id: conflictId,
              type: 'dependency_violation',
              severity: 'medium',
              title: 'Dependency Scheduling Conflict',
              description: `Task "${data.title}" is scheduled before its dependency "${dependency.title}" is completed`,
              affectedResources: [
                {
                  id: data.id,
                  type: 'task',
                  name: data.title,
                },
                {
                  id: dependency.id,
                  type: 'task',
                  name: dependency.title,
                },
              ],
              suggestedResolutions: [
                {
                  id: `reschedule_task_${data.id}`,
                  type: 'reschedule',
                  description: 'Reschedule task after dependency completion',
                  impact: 'moderate',
                  estimatedEffort: 15,
                  autoApplicable: true,
                  parameters: {
                    newDate: new Date(
                      depDueDate.getTime() + 24 * 60 * 60 * 1000,
                    ).toISOString(),
                  },
                },
              ],
              createdAt: new Date(),
              status: 'active',
              autoResolvable: rule.actions.some(
                (a) => a.type === 'auto_resolve',
              ),
            });
          }
        }
      }
    } catch (error) {
      console.error('Error checking dependency violation:', error);
    }

    return conflicts;
  }

  private async checkBusinessRule(
    rule: ConflictRule,
    data: any,
    dataType: string,
  ): Promise<DetectedConflict[]> {
    const conflicts: DetectedConflict[] = [];

    // Example: Weather-dependent task risk checking
    if (data.weather_dependent && data.location) {
      // This would integrate with weather service to check forecasts
      // For now, we'll create a placeholder conflict

      conflicts.push({
        id: `weather_risk_${data.id}`,
        type: 'business_rule',
        severity: 'medium',
        title: 'Weather Risk Warning',
        description:
          'Weather-dependent task may be affected by adverse conditions',
        affectedResources: [
          {
            id: data.id,
            type: dataType,
            name: data.title || 'Task',
          },
        ],
        suggestedResolutions: [
          {
            id: `indoor_alternative_${data.id}`,
            type: 'change_location',
            description: 'Move to indoor alternative location',
            impact: 'moderate',
            estimatedEffort: 30,
            autoApplicable: false,
            parameters: { indoorRequired: true },
          },
        ],
        createdAt: new Date(),
        status: 'active',
        autoResolvable: false,
      });
    }

    return conflicts;
  }

  // Public API Methods
  async subscribeToConflicts(
    subscriberId: string,
    callback: (conflicts: DetectedConflict[]) => void,
    filters?: ConflictSubscriber['filters'],
  ): Promise<void> {
    const subscriber: ConflictSubscriber = {
      id: subscriberId,
      userId: this.userId,
      organizationId: this.organizationId,
      callback,
      filters,
    };

    this.subscribers.set(subscriberId, subscriber);

    // Send current active conflicts to new subscriber
    const currentConflicts = this.filterConflictsForSubscriber(
      Array.from(this.activeConflicts.values()),
      subscriber,
    );

    if (currentConflicts.length > 0) {
      callback(currentConflicts);
    }
  }

  async unsubscribeFromConflicts(subscriberId: string): Promise<void> {
    this.subscribers.delete(subscriberId);
  }

  async getActiveConflicts(filters?: {
    severity?: string[];
    types?: string[];
    resourceIds?: string[];
  }): Promise<DetectedConflict[]> {
    let conflicts = Array.from(this.activeConflicts.values()).filter(
      (c) => c.status === 'active',
    );

    if (filters) {
      if (filters.severity) {
        conflicts = conflicts.filter((c) =>
          filters.severity!.includes(c.severity),
        );
      }
      if (filters.types) {
        conflicts = conflicts.filter((c) => filters.types!.includes(c.type));
      }
      if (filters.resourceIds) {
        conflicts = conflicts.filter((c) =>
          c.affectedResources.some((r) => filters.resourceIds!.includes(r.id)),
        );
      }
    }

    return conflicts;
  }

  async resolveConflict(
    conflictId: string,
    resolutionId: string,
    parameters?: Record<string, any>,
  ): Promise<boolean> {
    const conflict = this.activeConflicts.get(conflictId);
    if (!conflict) return false;

    const resolution = conflict.suggestedResolutions.find(
      (r) => r.id === resolutionId,
    );
    if (!resolution) return false;

    try {
      const success = await this.applyResolution(resolution, parameters);
      if (success) {
        conflict.status = 'resolved';
        this.activeConflicts.set(conflictId, conflict);

        await integrationDataManager.logAudit(
          this.userId,
          this.organizationId,
          'CONFLICT_RESOLVED',
          conflictId,
          'conflict',
          {
            resolutionType: resolution.type,
            resolutionId,
            parameters,
          },
        );
      }
      return success;
    } catch (error) {
      console.error('Failed to resolve conflict:', error);
      return false;
    }
  }

  async ignoreConflict(conflictId: string): Promise<boolean> {
    const conflict = this.activeConflicts.get(conflictId);
    if (!conflict) return false;

    conflict.status = 'ignored';
    this.activeConflicts.set(conflictId, conflict);

    await integrationDataManager.logAudit(
      this.userId,
      this.organizationId,
      'CONFLICT_IGNORED',
      conflictId,
      'conflict',
      { originalSeverity: conflict.severity },
    );

    return true;
  }

  // Private Helper Methods
  private startConflictChecking(): void {
    this.conflictCheckInterval = setInterval(
      async () => {
        await this.performPeriodicConflictCheck();
      },
      5 * 60 * 1000,
    ); // Check every 5 minutes
  }

  private async performPeriodicConflictCheck(): Promise<void> {
    try {
      // Check for time-based conflicts that might have developed
      const upcomingEvents = await this.getUpcomingEvents();

      for (const event of upcomingEvents) {
        await this.checkConflictsForEvent(event);
      }
    } catch (error) {
      console.error('Periodic conflict check failed:', error);
    }
  }

  private async getUpcomingEvents(): Promise<any[]> {
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const { data } = await this.supabase
      .from('integration_events')
      .select('*')
      .eq('organization_id', this.organizationId)
      .gte('start_time', new Date().toISOString())
      .lte('start_time', tomorrow.toISOString());

    return data || [];
  }

  private async notifySubscribers(
    conflicts: DetectedConflict[],
  ): Promise<void> {
    for (const [subscriberId, subscriber] of this.subscribers.entries()) {
      try {
        const filteredConflicts = this.filterConflictsForSubscriber(
          conflicts,
          subscriber,
        );
        if (filteredConflicts.length > 0) {
          subscriber.callback(filteredConflicts);
        }
      } catch (error) {
        console.error(`Failed to notify subscriber ${subscriberId}:`, error);
        // Remove faulty subscriber
        this.subscribers.delete(subscriberId);
      }
    }
  }

  private filterConflictsForSubscriber(
    conflicts: DetectedConflict[],
    subscriber: ConflictSubscriber,
  ): DetectedConflict[] {
    if (!subscriber.filters) return conflicts;

    return conflicts.filter((conflict) => {
      if (
        subscriber.filters!.severity &&
        !subscriber.filters!.severity.includes(conflict.severity)
      ) {
        return false;
      }
      if (
        subscriber.filters!.types &&
        !subscriber.filters!.types.includes(conflict.type)
      ) {
        return false;
      }
      if (subscriber.filters!.resources) {
        const hasMatchingResource = conflict.affectedResources.some(
          (resource) => subscriber.filters!.resources!.includes(resource.id),
        );
        if (!hasMatchingResource) return false;
      }
      return true;
    });
  }

  private async applyResolution(
    resolution: ConflictResolution,
    parameters?: Record<string, any>,
  ): Promise<boolean> {
    // This would implement the actual resolution logic
    // For now, return success for auto-applicable resolutions
    return resolution.autoApplicable;
  }

  private async removeConflictsForResource(
    resourceId: string,
    resourceType: string,
  ): Promise<void> {
    const toRemove: string[] = [];

    for (const [conflictId, conflict] of this.activeConflicts.entries()) {
      if (
        conflict.affectedResources.some(
          (r) => r.id === resourceId && r.type === resourceType,
        )
      ) {
        toRemove.push(conflictId);
      }
    }

    for (const conflictId of toRemove) {
      this.activeConflicts.delete(conflictId);
    }
  }

  // Cleanup
  async destroy(): Promise<void> {
    if (this.conflictCheckInterval) {
      clearInterval(this.conflictCheckInterval);
    }

    if (this.channel) {
      await this.supabase.removeChannel(this.channel);
      this.channel = null;
    }

    this.subscribers.clear();
    this.activeConflicts.clear();
    this.isInitialized = false;
  }
}
