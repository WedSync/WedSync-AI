import { CalendarIntegrationService } from './CalendarIntegrationService';
import { WeatherIntegrationService } from './WeatherIntegrationService';
import { PlacesIntegrationService } from './PlacesIntegrationService';
import { integrationDataManager } from '../database/IntegrationDataManager';
import {
  IntegrationConfig,
  IntegrationCredentials,
  IntegrationResponse,
  CalendarEvent,
  CalendarEventInput,
  WeatherData,
  IntegrationEvent,
  IntegrationError,
  ErrorCategory,
} from '@/types/integrations';

interface TimelineTask {
  id: string;
  title: string;
  description?: string;
  dueDate: Date;
  priority: 'low' | 'medium' | 'high' | 'critical';
  category:
    | 'venue'
    | 'catering'
    | 'photography'
    | 'music'
    | 'flowers'
    | 'attire'
    | 'invitations'
    | 'other';
  status: 'pending' | 'in_progress' | 'completed' | 'blocked';
  dependencies: string[];
  assigneeId?: string;
  estimatedDuration: number; // minutes
  location?: string;
  reminders: Array<{
    type: 'email' | 'sms' | 'push';
    minutesBefore: number;
  }>;
  externalCalendarEventId?: string;
  weatherDependent: boolean;
}

interface TimelineSyncResult {
  success: boolean;
  syncedEvents: number;
  conflicts: Array<{
    taskId: string;
    conflictType:
      | 'time_overlap'
      | 'weather_risk'
      | 'venue_unavailable'
      | 'dependency_missing';
    details: string;
  }>;
  weatherAlerts: Array<{
    taskId: string;
    alert: string;
    severity: 'low' | 'medium' | 'high';
  }>;
}

interface ConflictResolution {
  taskId: string;
  resolution:
    | 'reschedule'
    | 'split_task'
    | 'change_location'
    | 'add_buffer'
    | 'ignore';
  newDate?: Date;
  newLocation?: string;
  bufferMinutes?: number;
}

export class TimelineIntegrationService {
  private calendarService?: CalendarIntegrationService;
  private weatherService?: WeatherIntegrationService;
  private placesService?: PlacesIntegrationService;
  private conflictDetectionEnabled = true;
  private autoSyncEnabled = true;

  constructor(
    private userId: string,
    private organizationId: string,
    private weddingDate: Date,
    private weddingLocation: string,
  ) {}

  async initialize(): Promise<void> {
    // Initialize integration services with stored credentials
    const calendarCreds = await integrationDataManager.getCredentials(
      this.userId,
      this.organizationId,
      'google-calendar',
    );

    const weatherCreds = await integrationDataManager.getCredentials(
      this.userId,
      this.organizationId,
      'weather-service',
    );

    const placesCreds = await integrationDataManager.getCredentials(
      this.userId,
      this.organizationId,
      'google-places',
    );

    if (calendarCreds) {
      this.calendarService = new CalendarIntegrationService(
        { apiUrl: 'https://www.googleapis.com', timeout: 30000 },
        calendarCreds,
      );
    }

    if (weatherCreds) {
      this.weatherService = new WeatherIntegrationService(
        { apiUrl: 'https://api.openweathermap.org/data/2.5', timeout: 15000 },
        weatherCreds,
      );
    }

    if (placesCreds) {
      this.placesService = new PlacesIntegrationService(
        {
          apiUrl: 'https://maps.googleapis.com/maps/api/place',
          timeout: 20000,
        },
        placesCreds,
      );
    }

    await integrationDataManager.logAudit(
      this.userId,
      this.organizationId,
      'TIMELINE_SERVICE_INITIALIZED',
      undefined,
      'timeline_service',
      {
        hasCalendar: !!this.calendarService,
        hasWeather: !!this.weatherService,
        hasPlaces: !!this.placesService,
        weddingDate: this.weddingDate.toISOString(),
      },
    );
  }

  // Core Timeline Management
  async syncTimelineTasks(tasks: TimelineTask[]): Promise<TimelineSyncResult> {
    if (!this.calendarService) {
      throw new IntegrationError(
        'Calendar service not initialized',
        'CALENDAR_SERVICE_MISSING',
        ErrorCategory.SYSTEM,
      );
    }

    const result: TimelineSyncResult = {
      success: true,
      syncedEvents: 0,
      conflicts: [],
      weatherAlerts: [],
    };

    // Get existing calendar events for conflict detection
    const existingEvents = await this.getExistingCalendarEvents();

    for (const task of tasks) {
      try {
        // Check for conflicts before syncing
        if (this.conflictDetectionEnabled) {
          const conflicts = await this.detectTaskConflicts(
            task,
            existingEvents,
            tasks,
          );
          result.conflicts.push(...conflicts);

          if (
            conflicts.length > 0 &&
            conflicts.some((c) => c.conflictType !== 'weather_risk')
          ) {
            continue; // Skip syncing conflicted tasks
          }
        }

        // Check weather dependency
        if (task.weatherDependent) {
          const weatherAlert = await this.checkWeatherForTask(task);
          if (weatherAlert) {
            result.weatherAlerts.push(weatherAlert);
          }
        }

        // Sync to calendar
        const syncSuccess = await this.syncTaskToCalendar(task);
        if (syncSuccess) {
          result.syncedEvents++;
        }
      } catch (error) {
        result.success = false;
        console.error(`Failed to sync task ${task.id}:`, error);
      }
    }

    await integrationDataManager.logAudit(
      this.userId,
      this.organizationId,
      'TIMELINE_SYNC_COMPLETED',
      undefined,
      'timeline_sync',
      {
        totalTasks: tasks.length,
        syncedEvents: result.syncedEvents,
        conflictCount: result.conflicts.length,
        weatherAlertCount: result.weatherAlerts.length,
      },
    );

    return result;
  }

  async syncTaskToCalendar(task: TimelineTask): Promise<boolean> {
    if (!this.calendarService) return false;

    try {
      const calendarEvent: CalendarEventInput = {
        title: `Wedding Task: ${task.title}`,
        description: this.buildTaskDescription(task),
        startTime: task.dueDate,
        endTime: new Date(
          task.dueDate.getTime() + task.estimatedDuration * 60000,
        ),
        location: task.location,
        attendees: task.assigneeId
          ? [{ email: `user-${task.assigneeId}@example.com` }]
          : undefined,
      };

      let result;
      if (task.externalCalendarEventId) {
        // Update existing event
        result = await this.calendarService.updateEvent(
          task.externalCalendarEventId,
          calendarEvent,
        );
      } else {
        // Create new event
        result = await this.calendarService.createEvent(calendarEvent);
      }

      if (result.success && result.data) {
        // Store the sync relationship
        const integrationEvent: IntegrationEvent = {
          userId: this.userId,
          organizationId: this.organizationId,
          provider: 'google-calendar',
          externalId: result.data.id,
          title: task.title,
          description: task.description,
          startTime: task.dueDate,
          endTime: new Date(
            task.dueDate.getTime() + task.estimatedDuration * 60000,
          ),
          location: task.location,
          syncStatus: 'synced',
          lastSyncAt: new Date(),
        };

        await integrationDataManager.createOrUpdateEvent(integrationEvent);
        return true;
      }

      return false;
    } catch (error) {
      console.error('Failed to sync task to calendar:', error);
      return false;
    }
  }

  // Conflict Detection System
  async detectTaskConflicts(
    task: TimelineTask,
    existingEvents: CalendarEvent[],
    allTasks: TimelineTask[],
  ): Promise<Array<{ taskId: string; conflictType: string; details: string }>> {
    const conflicts = [];

    // Time overlap detection
    const taskEnd = new Date(
      task.dueDate.getTime() + task.estimatedDuration * 60000,
    );

    for (const event of existingEvents) {
      if (
        this.timePeriodsOverlap(
          task.dueDate,
          taskEnd,
          event.startTime,
          event.endTime,
        )
      ) {
        conflicts.push({
          taskId: task.id,
          conflictType: 'time_overlap',
          details: `Conflicts with existing event: ${event.title}`,
        });
      }
    }

    // Dependency checking
    for (const depId of task.dependencies) {
      const dependency = allTasks.find((t) => t.id === depId);
      if (
        dependency &&
        dependency.status !== 'completed' &&
        dependency.dueDate >= task.dueDate
      ) {
        conflicts.push({
          taskId: task.id,
          conflictType: 'dependency_missing',
          details: `Dependency "${dependency.title}" is not completed and scheduled after this task`,
        });
      }
    }

    // Location availability check
    if (task.location && this.placesService) {
      const locationConflict = await this.checkLocationAvailability(task);
      if (locationConflict) {
        conflicts.push(locationConflict);
      }
    }

    // Weather dependency check
    if (task.weatherDependent && this.weatherService) {
      const weatherRisk = await this.checkWeatherRisk(task);
      if (weatherRisk) {
        conflicts.push({
          taskId: task.id,
          conflictType: 'weather_risk',
          details: weatherRisk,
        });
      }
    }

    return conflicts;
  }

  private async checkLocationAvailability(
    task: TimelineTask,
  ): Promise<{ taskId: string; conflictType: string; details: string } | null> {
    if (!this.placesService || !task.location) return null;

    try {
      // Check if it's a business with specific hours
      const placeDetails = await this.placesService.getPlaceDetails(
        task.location,
      );
      if (placeDetails.success && placeDetails.data.businessHours) {
        const isOpen = await this.placesService.validateBusinessHours(
          task.location,
          task.dueDate,
        );

        if (isOpen.success && !isOpen.data.isOpen) {
          return {
            taskId: task.id,
            conflictType: 'venue_unavailable',
            details: `Venue is closed during scheduled time: ${isOpen.data.hours}`,
          };
        }
      }
    } catch (error) {
      console.error('Failed to check location availability:', error);
    }

    return null;
  }

  private async checkWeatherRisk(task: TimelineTask): Promise<string | null> {
    if (!this.weatherService || !task.weatherDependent) return null;

    try {
      const forecast = await this.weatherService.getWeatherForecast(
        this.weddingLocation,
        5,
      );
      if (!forecast.success) return null;

      const taskDate = task.dueDate.toISOString().split('T')[0];
      const dayForecast = forecast.data.forecast.find(
        (f) => f.date === taskDate,
      );

      if (!dayForecast) return null;

      const risks = [];
      if (dayForecast.precipitation > 70) {
        risks.push(
          `High chance of precipitation (${dayForecast.precipitation}%)`,
        );
      }

      if (
        dayForecast.condition.includes('storm') ||
        dayForecast.condition.includes('thunder')
      ) {
        risks.push('Severe weather conditions expected');
      }

      if (
        task.category === 'photography' &&
        dayForecast.condition === 'cloudy'
      ) {
        risks.push('Overcast conditions may affect outdoor photography');
      }

      return risks.length > 0 ? risks.join('; ') : null;
    } catch (error) {
      console.error('Failed to check weather risk:', error);
      return null;
    }
  }

  private async checkWeatherForTask(task: TimelineTask): Promise<{
    taskId: string;
    alert: string;
    severity: 'low' | 'medium' | 'high';
  } | null> {
    const weatherRisk = await this.checkWeatherRisk(task);
    if (!weatherRisk) return null;

    let severity: 'low' | 'medium' | 'high' = 'low';
    if (weatherRisk.includes('severe') || weatherRisk.includes('storm')) {
      severity = 'high';
    } else if (weatherRisk.includes('High chance')) {
      severity = 'medium';
    }

    return {
      taskId: task.id,
      alert: weatherRisk,
      severity,
    };
  }

  // Smart Scheduling and Optimization
  async optimizeTimeline(tasks: TimelineTask[]): Promise<TimelineTask[]> {
    // Sort tasks by priority and dependencies
    const sortedTasks = this.topologicalSort(tasks);

    // Apply intelligent scheduling
    const optimizedTasks = [];
    for (const task of sortedTasks) {
      const optimizedTask = await this.optimizeTaskScheduling(
        task,
        optimizedTasks,
      );
      optimizedTasks.push(optimizedTask);
    }

    await integrationDataManager.logAudit(
      this.userId,
      this.organizationId,
      'TIMELINE_OPTIMIZED',
      undefined,
      'timeline_optimization',
      {
        originalTaskCount: tasks.length,
        optimizedTaskCount: optimizedTasks.length,
      },
    );

    return optimizedTasks;
  }

  private async optimizeTaskScheduling(
    task: TimelineTask,
    existingTasks: TimelineTask[],
  ): Promise<TimelineTask> {
    let optimizedTask = { ...task };

    // Check for weather-dependent tasks
    if (task.weatherDependent && this.weatherService) {
      const bestDate = await this.findBestWeatherDate(task);
      if (bestDate) {
        optimizedTask.dueDate = bestDate;
      }
    }

    // Add buffer time for high-priority tasks
    if (task.priority === 'critical' || task.priority === 'high') {
      optimizedTask.estimatedDuration = Math.floor(
        task.estimatedDuration * 1.2,
      ); // 20% buffer
    }

    // Optimize for location clustering
    if (task.location) {
      const nearbyTasks = this.findNearbyTasks(task, existingTasks);
      if (nearbyTasks.length > 0) {
        // Try to schedule close to related tasks
        optimizedTask = this.scheduleNearRelatedTasks(
          optimizedTask,
          nearbyTasks,
        );
      }
    }

    return optimizedTask;
  }

  private async findBestWeatherDate(task: TimelineTask): Promise<Date | null> {
    if (!this.weatherService) return null;

    try {
      const forecast = await this.weatherService.getWeatherForecast(
        this.weddingLocation,
        5,
      );
      if (!forecast.success) return null;

      let bestDate = task.dueDate;
      let bestScore = this.calculateWeatherScore(forecast.data.forecast[0]);

      for (let i = 1; i < Math.min(forecast.data.forecast.length, 3); i++) {
        const dayForecast = forecast.data.forecast[i];
        const score = this.calculateWeatherScore(dayForecast);

        if (score > bestScore) {
          bestScore = score;
          bestDate = new Date(
            dayForecast.date + 'T' + task.dueDate.toTimeString().slice(0, 8),
          );
        }
      }

      return bestDate !== task.dueDate ? bestDate : null;
    } catch (error) {
      return null;
    }
  }

  private calculateWeatherScore(forecast: any): number {
    let score = 100;

    // Penalize precipitation
    score -= forecast.precipitation * 0.8;

    // Penalize extreme temperatures
    if (forecast.high > 35 || forecast.low < 0) {
      score -= 20;
    }

    // Penalize severe weather conditions
    if (
      forecast.condition.includes('storm') ||
      forecast.condition.includes('thunder')
    ) {
      score -= 50;
    }

    return Math.max(score, 0);
  }

  // Conflict Resolution
  async resolveConflicts(conflicts: ConflictResolution[]): Promise<boolean> {
    let allResolved = true;

    for (const resolution of conflicts) {
      try {
        const success = await this.applyConflictResolution(resolution);
        if (!success) {
          allResolved = false;
        }
      } catch (error) {
        allResolved = false;
        console.error(
          `Failed to resolve conflict for task ${resolution.taskId}:`,
          error,
        );
      }
    }

    await integrationDataManager.logAudit(
      this.userId,
      this.organizationId,
      'CONFLICTS_RESOLVED',
      undefined,
      'conflict_resolution',
      {
        conflictCount: conflicts.length,
        allResolved,
      },
    );

    return allResolved;
  }

  private async applyConflictResolution(
    resolution: ConflictResolution,
  ): Promise<boolean> {
    switch (resolution.resolution) {
      case 'reschedule':
        if (resolution.newDate) {
          return await this.rescheduleTask(
            resolution.taskId,
            resolution.newDate,
          );
        }
        break;

      case 'change_location':
        if (resolution.newLocation) {
          return await this.changeTaskLocation(
            resolution.taskId,
            resolution.newLocation,
          );
        }
        break;

      case 'add_buffer':
        if (resolution.bufferMinutes) {
          return await this.addBufferTime(
            resolution.taskId,
            resolution.bufferMinutes,
          );
        }
        break;

      case 'ignore':
        return true;
    }

    return false;
  }

  private async rescheduleTask(
    taskId: string,
    newDate: Date,
  ): Promise<boolean> {
    // This would typically update the task in your database
    // and resync with calendar
    console.log(`Rescheduling task ${taskId} to ${newDate}`);
    return true;
  }

  private async changeTaskLocation(
    taskId: string,
    newLocation: string,
  ): Promise<boolean> {
    // This would typically update the task location in your database
    // and resync with calendar
    console.log(`Changing task ${taskId} location to ${newLocation}`);
    return true;
  }

  private async addBufferTime(
    taskId: string,
    bufferMinutes: number,
  ): Promise<boolean> {
    // This would typically update the task duration in your database
    // and resync with calendar
    console.log(`Adding ${bufferMinutes} minutes buffer to task ${taskId}`);
    return true;
  }

  // Utility Methods
  private async getExistingCalendarEvents(): Promise<CalendarEvent[]> {
    if (!this.calendarService) return [];

    const startDate = new Date(
      this.weddingDate.getTime() - 30 * 24 * 60 * 60 * 1000,
    ); // 30 days before
    const endDate = new Date(
      this.weddingDate.getTime() + 7 * 24 * 60 * 60 * 1000,
    ); // 7 days after

    const result = await this.calendarService.getEvents(startDate, endDate);
    return result.success ? result.data : [];
  }

  private timePeriodsOverlap(
    start1: Date,
    end1: Date,
    start2: Date,
    end2: Date,
  ): boolean {
    return start1 < end2 && start2 < end1;
  }

  private topologicalSort(tasks: TimelineTask[]): TimelineTask[] {
    const sorted = [];
    const visited = new Set<string>();
    const visiting = new Set<string>();

    const visit = (task: TimelineTask) => {
      if (visiting.has(task.id)) {
        throw new Error(
          `Circular dependency detected involving task: ${task.id}`,
        );
      }

      if (visited.has(task.id)) {
        return;
      }

      visiting.add(task.id);

      // Visit dependencies first
      for (const depId of task.dependencies) {
        const dependency = tasks.find((t) => t.id === depId);
        if (dependency) {
          visit(dependency);
        }
      }

      visiting.delete(task.id);
      visited.add(task.id);
      sorted.push(task);
    };

    for (const task of tasks) {
      if (!visited.has(task.id)) {
        visit(task);
      }
    }

    return sorted;
  }

  private findNearbyTasks(
    task: TimelineTask,
    existingTasks: TimelineTask[],
  ): TimelineTask[] {
    if (!task.location) return [];

    return existingTasks.filter(
      (t) =>
        t.location === task.location &&
        Math.abs(t.dueDate.getTime() - task.dueDate.getTime()) <
          4 * 60 * 60 * 1000, // within 4 hours
    );
  }

  private scheduleNearRelatedTasks(
    task: TimelineTask,
    nearbyTasks: TimelineTask[],
  ): TimelineTask {
    if (nearbyTasks.length === 0) return task;

    // Find optimal time slot near related tasks
    const avgTime =
      nearbyTasks.reduce((sum, t) => sum + t.dueDate.getTime(), 0) /
      nearbyTasks.length;
    const optimalDate = new Date(avgTime);

    // Ensure the new date is reasonable (not too far from original)
    const maxShift = 6 * 60 * 60 * 1000; // 6 hours
    if (Math.abs(optimalDate.getTime() - task.dueDate.getTime()) <= maxShift) {
      return { ...task, dueDate: optimalDate };
    }

    return task;
  }

  private buildTaskDescription(task: TimelineTask): string {
    let description = task.description || '';

    description += `\n\nPriority: ${task.priority.toUpperCase()}`;
    description += `\nCategory: ${task.category}`;
    description += `\nEstimated Duration: ${task.estimatedDuration} minutes`;

    if (task.dependencies.length > 0) {
      description += `\nDependencies: ${task.dependencies.join(', ')}`;
    }

    if (task.weatherDependent) {
      description += '\nWeather Dependent: Yes';
    }

    description += '\n\n⚡ Synced via WedSync Timeline Integration';

    return description;
  }

  // Health and Status
  async getServiceStatus(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    services: Record<string, boolean>;
    lastSync?: Date;
  }> {
    const services = {
      calendar: false,
      weather: false,
      places: false,
      database: false,
    };

    try {
      if (this.calendarService) {
        services.calendar = await this.calendarService.validateConnection();
      }

      if (this.weatherService) {
        services.weather = await this.weatherService.validateConnection();
      }

      if (this.placesService) {
        services.places = await this.placesService.validateConnection();
      }

      const dbHealth = await integrationDataManager.healthCheck();
      services.database = dbHealth.status === 'healthy';

      const healthyCount = Object.values(services).filter(Boolean).length;
      const totalCount = Object.values(services).length;

      let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
      if (healthyCount === 0) {
        status = 'unhealthy';
      } else if (healthyCount < totalCount) {
        status = 'degraded';
      }

      return { status, services };
    } catch (error) {
      return {
        status: 'unhealthy',
        services,
        lastSync: new Date(),
      };
    }
  }

  // Configuration
  setConflictDetection(enabled: boolean): void {
    this.conflictDetectionEnabled = enabled;
  }

  setAutoSync(enabled: boolean): void {
    this.autoSyncEnabled = enabled;
  }
}
