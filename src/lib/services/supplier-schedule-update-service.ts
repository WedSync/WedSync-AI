import { createClient } from '@/lib/supabase/server';
import { Database } from '@/types/supabase';

type SupabaseClient = ReturnType<typeof createClient>;

// =====================================================
// TYPES AND INTERFACES
// =====================================================

interface TimelineChange {
  type:
    | 'event_created'
    | 'event_updated'
    | 'event_deleted'
    | 'timeline_updated';
  timeline_id: string;
  event_id?: string;
  old_data?: any;
  new_data?: any;
  changed_fields?: string[];
  change_metadata: {
    user_id: string;
    timestamp: string;
    change_reason?: string;
  };
}

interface ScheduleUpdateResult {
  supplier_id: string;
  timeline_id: string;
  success: boolean;
  updated_events: number;
  errors?: string[];
  notification_sent?: boolean;
}

interface ScheduleUpdateOptions {
  notify_suppliers?: boolean;
  force_regenerate?: boolean;
  buffer_time_minutes?: number;
  batch_size?: number;
}

// =====================================================
// SUPPLIER SCHEDULE UPDATE SERVICE
// =====================================================

export class SupplierScheduleUpdateService {
  private supabase: SupabaseClient;
  private readonly DEFAULT_BUFFER_TIME = 15; // minutes
  private readonly DEFAULT_BATCH_SIZE = 10;

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase;
  }

  // Main method to handle timeline changes
  async handleTimelineChange(
    change: TimelineChange,
    options: ScheduleUpdateOptions = {},
  ): Promise<ScheduleUpdateResult[]> {
    try {
      console.log(
        `Processing timeline change: ${change.type} for timeline ${change.timeline_id}`,
      );

      // Get all suppliers with schedules for this timeline
      const affectedSuppliers = await this.getAffectedSuppliers(
        change.timeline_id,
      );

      if (affectedSuppliers.length === 0) {
        console.log('No suppliers found with schedules for this timeline');
        return [];
      }

      // Process updates in batches to avoid overwhelming the system
      const batchSize = options.batch_size || this.DEFAULT_BATCH_SIZE;
      const results: ScheduleUpdateResult[] = [];

      for (let i = 0; i < affectedSuppliers.length; i += batchSize) {
        const batch = affectedSuppliers.slice(i, i + batchSize);
        const batchResults = await Promise.allSettled(
          batch.map((supplier) =>
            this.updateSupplierSchedule(supplier, change, options),
          ),
        );

        batchResults.forEach((result, index) => {
          if (result.status === 'fulfilled') {
            results.push(result.value);
          } else {
            console.error(
              `Failed to update schedule for supplier ${batch[index].id}:`,
              result.reason,
            );
            results.push({
              supplier_id: batch[index].id,
              timeline_id: change.timeline_id,
              success: false,
              updated_events: 0,
              errors: [`Update failed: ${result.reason}`],
            });
          }
        });

        // Small delay between batches to prevent overwhelming the database
        if (i + batchSize < affectedSuppliers.length) {
          await new Promise((resolve) => setTimeout(resolve, 100));
        }
      }

      console.log(`Processed timeline change for ${results.length} suppliers`);
      return results;
    } catch (error) {
      console.error('Error handling timeline change:', error);
      throw error;
    }
  }

  // Get suppliers that have schedules for the given timeline
  private async getAffectedSuppliers(timelineId: string) {
    const { data: suppliers, error } = await this.supabase
      .from('supplier_schedules')
      .select(
        `
        supplier_id,
        schedule_data,
        status,
        confirmation_status,
        suppliers:supplier_id (
          id,
          business_name,
          primary_category,
          email,
          phone
        )
      `,
      )
      .eq('timeline_id', timelineId)
      .not('suppliers', 'is', null);

    if (error) {
      throw new Error(`Failed to get affected suppliers: ${error.message}`);
    }

    return (
      suppliers?.map((s) => ({
        id: s.supplier_id,
        ...s.suppliers,
        current_schedule: s.schedule_data,
        status: s.status,
        confirmation_status: s.confirmation_status,
      })) || []
    );
  }

  // Update a specific supplier's schedule
  private async updateSupplierSchedule(
    supplier: any,
    change: TimelineChange,
    options: ScheduleUpdateOptions,
  ): Promise<ScheduleUpdateResult> {
    try {
      // Get current timeline events
      const timelineEvents = await this.getTimelineEvents(change.timeline_id);

      // Get timeline details
      const { data: timeline, error: timelineError } = await this.supabase
        .from('wedding_timelines')
        .select('timeline_name, wedding_date, organization_id')
        .eq('id', change.timeline_id)
        .single();

      if (timelineError || !timeline) {
        throw new Error('Timeline not found');
      }

      // Generate new schedule for this supplier
      const newSchedule = await this.generateSupplierSchedule(
        supplier,
        timelineEvents,
        timeline.wedding_date,
        options.buffer_time_minutes || this.DEFAULT_BUFFER_TIME,
      );

      // Compare with existing schedule to determine what changed
      const changesSummary = this.compareSchedules(
        supplier.current_schedule,
        newSchedule,
        change,
      );

      // Only update if there are meaningful changes
      if (!changesSummary.has_changes && !options.force_regenerate) {
        return {
          supplier_id: supplier.id,
          timeline_id: change.timeline_id,
          success: true,
          updated_events: 0,
        };
      }

      // Update the schedule in database
      const { error: updateError } = await this.supabase
        .from('supplier_schedules')
        .update({
          schedule_data: newSchedule,
          status: changesSummary.requires_reconfirmation
            ? 'needs_review'
            : 'updated',
          updated_at: new Date().toISOString(),
          last_change_reason: change.type,
          change_summary: changesSummary,
        })
        .eq('supplier_id', supplier.id)
        .eq('timeline_id', change.timeline_id);

      if (updateError) {
        throw new Error(`Failed to update schedule: ${updateError.message}`);
      }

      // Send notification if requested and changes are significant
      let notificationSent = false;
      if (options.notify_suppliers && changesSummary.requires_notification) {
        try {
          notificationSent = await this.sendScheduleUpdateNotification(
            supplier,
            change,
            changesSummary,
            timeline,
          );
        } catch (notificationError) {
          console.warn(
            `Failed to send notification to supplier ${supplier.id}:`,
            notificationError,
          );
        }
      }

      return {
        supplier_id: supplier.id,
        timeline_id: change.timeline_id,
        success: true,
        updated_events: changesSummary.affected_events.length,
        notification_sent: notificationSent,
      };
    } catch (error) {
      console.error(
        `Error updating schedule for supplier ${supplier.id}:`,
        error,
      );
      return {
        supplier_id: supplier.id,
        timeline_id: change.timeline_id,
        success: false,
        updated_events: 0,
        errors: [error instanceof Error ? error.message : 'Unknown error'],
      };
    }
  }

  // Get timeline events
  private async getTimelineEvents(timelineId: string) {
    const { data: events, error } = await this.supabase
      .from('timeline_events')
      .select(
        `
        id,
        event_title,
        event_description,
        event_time,
        event_duration_minutes,
        event_location,
        location_details,
        event_category,
        sort_order
      `,
      )
      .eq('timeline_id', timelineId)
      .order('event_time', { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch timeline events: ${error.message}`);
    }

    return events || [];
  }

  // Generate supplier schedule from timeline events
  private async generateSupplierSchedule(
    supplier: any,
    timelineEvents: any[],
    weddingDate: string,
    bufferTime: number,
  ) {
    // Find events relevant to this supplier category
    const relevantEvents = timelineEvents.filter((event) => {
      const category = event.event_category?.toLowerCase() || '';
      const supplierCategory = supplier.primary_category?.toLowerCase() || '';

      return (
        category.includes(supplierCategory) ||
        supplierCategory.includes(category) ||
        // Include setup/breakdown events for all suppliers
        category.includes('setup') ||
        category.includes('breakdown') ||
        category.includes('arrival') ||
        category.includes('departure')
      );
    });

    // Generate schedule items with buffer times
    const scheduleItems = relevantEvents.map((event) => {
      const baseTime = new Date(
        `${weddingDate}T${event.event_time || '00:00:00'}`,
      );
      const startTime = new Date(baseTime.getTime() - bufferTime * 60000);
      const endTime = new Date(
        baseTime.getTime() + (event.event_duration_minutes || 60) * 60000,
      );
      const departureTime = new Date(endTime.getTime() + bufferTime * 60000);

      return {
        event_id: event.id,
        event_title: event.event_title,
        event_description: event.event_description,
        scheduled_arrival: startTime.toISOString(),
        event_start: baseTime.toISOString(),
        event_end: endTime.toISOString(),
        scheduled_departure: departureTime.toISOString(),
        location: event.event_location,
        location_details: event.location_details,
        category: event.event_category,
        duration_minutes: event.event_duration_minutes || 60,
        buffer_before_minutes: bufferTime,
        buffer_after_minutes: bufferTime,
        notes: `Please arrive by ${startTime.toLocaleTimeString()} for ${event.event_title}`,
        status: 'pending',
        last_updated: new Date().toISOString(),
      };
    });

    return {
      supplier_id: supplier.id,
      supplier_name: supplier.business_name,
      supplier_category: supplier.primary_category,
      total_events: scheduleItems.length,
      earliest_arrival:
        scheduleItems.length > 0 ? scheduleItems[0].scheduled_arrival : null,
      latest_departure:
        scheduleItems.length > 0
          ? scheduleItems[scheduleItems.length - 1].scheduled_departure
          : null,
      schedule_items: scheduleItems,
      generated_at: new Date().toISOString(),
      status: 'updated',
      version: (supplier.current_schedule?.version || 0) + 1,
    };
  }

  // Compare old and new schedules to determine changes
  private compareSchedules(
    oldSchedule: any,
    newSchedule: any,
    change: TimelineChange,
  ) {
    const changesSummary = {
      has_changes: false,
      requires_reconfirmation: false,
      requires_notification: false,
      affected_events: [] as string[],
      change_types: [] as string[],
      change_details: [] as string[],
    };

    if (!oldSchedule) {
      changesSummary.has_changes = true;
      changesSummary.requires_notification = true;
      changesSummary.change_types.push('schedule_created');
      return changesSummary;
    }

    // Compare schedule items
    const oldItems = oldSchedule.schedule_items || [];
    const newItems = newSchedule.schedule_items || [];

    // Check for added/removed events
    const oldEventIds = new Set(oldItems.map((item: any) => item.event_id));
    const newEventIds = new Set(newItems.map((item: any) => item.event_id));

    const addedEvents = [...newEventIds].filter((id) => !oldEventIds.has(id));
    const removedEvents = [...oldEventIds].filter((id) => !newEventIds.has(id));

    if (addedEvents.length > 0) {
      changesSummary.has_changes = true;
      changesSummary.requires_notification = true;
      changesSummary.change_types.push('events_added');
      changesSummary.change_details.push(
        `${addedEvents.length} new events added`,
      );
      changesSummary.affected_events.push(...addedEvents);
    }

    if (removedEvents.length > 0) {
      changesSummary.has_changes = true;
      changesSummary.requires_notification = true;
      changesSummary.requires_reconfirmation = true;
      changesSummary.change_types.push('events_removed');
      changesSummary.change_details.push(
        `${removedEvents.length} events removed`,
      );
      changesSummary.affected_events.push(...removedEvents);
    }

    // Check for timing changes in existing events
    const commonEvents = [...newEventIds].filter((id) => oldEventIds.has(id));
    const timingChanges = [];

    for (const eventId of commonEvents) {
      const oldItem = oldItems.find((item: any) => item.event_id === eventId);
      const newItem = newItems.find((item: any) => item.event_id === eventId);

      if (oldItem && newItem) {
        const timingChanged =
          oldItem.scheduled_arrival !== newItem.scheduled_arrival ||
          oldItem.scheduled_departure !== newItem.scheduled_departure ||
          oldItem.event_start !== newItem.event_start ||
          oldItem.event_end !== newItem.event_end;

        if (timingChanged) {
          timingChanges.push({
            event_id: eventId,
            event_title: newItem.event_title,
            old_arrival: oldItem.scheduled_arrival,
            new_arrival: newItem.scheduled_arrival,
          });
          changesSummary.affected_events.push(eventId);
        }
      }
    }

    if (timingChanges.length > 0) {
      changesSummary.has_changes = true;
      changesSummary.requires_notification = true;

      // Significant timing changes require reconfirmation
      const significantChanges = timingChanges.filter((change) => {
        const oldTime = new Date(change.old_arrival).getTime();
        const newTime = new Date(change.new_arrival).getTime();
        const diffMinutes = Math.abs(newTime - oldTime) / (1000 * 60);
        return diffMinutes > 30; // More than 30 minutes difference
      });

      if (significantChanges.length > 0) {
        changesSummary.requires_reconfirmation = true;
      }

      changesSummary.change_types.push('timing_updated');
      changesSummary.change_details.push(
        `${timingChanges.length} events have timing changes`,
      );
    }

    return changesSummary;
  }

  // Send notification to supplier about schedule changes
  private async sendScheduleUpdateNotification(
    supplier: any,
    change: TimelineChange,
    changesSummary: any,
    timeline: any,
  ): Promise<boolean> {
    try {
      // Create notification record
      const notificationData = {
        type: 'schedule_update',
        supplier_id: supplier.id,
        timeline_id: change.timeline_id,
        title: `Wedding Schedule Update - ${timeline.timeline_name}`,
        message: this.generateNotificationMessage(changesSummary, timeline),
        data: {
          change_summary: changesSummary,
          timeline_name: timeline.timeline_name,
          wedding_date: timeline.wedding_date,
          supplier_name: supplier.business_name,
          requires_reconfirmation: changesSummary.requires_reconfirmation,
        },
      };

      // Store notification
      const { error: notificationError } = await this.supabase
        .from('notifications')
        .insert({
          organization_id: timeline.organization_id,
          type: notificationData.type,
          title: notificationData.title,
          message: notificationData.message,
          data: notificationData.data,
          created_at: new Date().toISOString(),
        });

      if (notificationError) {
        console.warn('Failed to store notification:', notificationError);
      }

      // TODO: Send email notification to supplier
      // TODO: Send SMS notification if configured
      // TODO: Send push notification to mobile app

      return true;
    } catch (error) {
      console.error('Failed to send schedule update notification:', error);
      return false;
    }
  }

  // Generate human-readable notification message
  private generateNotificationMessage(
    changesSummary: any,
    timeline: any,
  ): string {
    const messages = [];

    if (changesSummary.change_types.includes('events_added')) {
      messages.push('New events have been added to your schedule');
    }

    if (changesSummary.change_types.includes('events_removed')) {
      messages.push('Some events have been removed from your schedule');
    }

    if (changesSummary.change_types.includes('timing_updated')) {
      messages.push('Event timings have been updated');
    }

    const baseMessage =
      messages.join(', ') || 'Your wedding schedule has been updated';

    if (changesSummary.requires_reconfirmation) {
      return `${baseMessage} for ${timeline.timeline_name} on ${timeline.wedding_date}. Please review and confirm your updated schedule.`;
    } else {
      return `${baseMessage} for ${timeline.timeline_name} on ${timeline.wedding_date}. No action required.`;
    }
  }

  // Static method to create service instance
  static async create(): Promise<SupplierScheduleUpdateService> {
    const supabase = await createClient();
    return new SupplierScheduleUpdateService(supabase);
  }

  // Static method to handle timeline changes (for use in webhooks/triggers)
  static async handleTimelineChange(
    change: TimelineChange,
    options?: ScheduleUpdateOptions,
  ): Promise<ScheduleUpdateResult[]> {
    const service = await SupplierScheduleUpdateService.create();
    return service.handleTimelineChange(change, options);
  }
}

// =====================================================
// WEBHOOK INTEGRATION HELPERS
// =====================================================

// Helper function for timeline event webhooks
export async function onTimelineEventChanged(
  eventType: 'created' | 'updated' | 'deleted',
  eventData: any,
  oldEventData?: any,
  userId?: string,
) {
  try {
    const change: TimelineChange = {
      type: `event_${eventType}`,
      timeline_id: eventData.timeline_id,
      event_id: eventData.id,
      old_data: oldEventData,
      new_data: eventData,
      change_metadata: {
        user_id: userId || 'system',
        timestamp: new Date().toISOString(),
        change_reason: `Event ${eventType}`,
      },
    };

    const results = await SupplierScheduleUpdateService.handleTimelineChange(
      change,
      {
        notify_suppliers: true,
        force_regenerate: eventType === 'created',
      },
    );

    console.log(`Processed ${eventType} for ${results.length} suppliers`);
    return results;
  } catch (error) {
    console.error(`Error processing timeline event ${eventType}:`, error);
    throw error;
  }
}

// Helper function for timeline updates
export async function onTimelineUpdated(
  timelineData: any,
  oldTimelineData: any,
  changedFields: string[],
  userId?: string,
) {
  try {
    // Only process if timing-related fields changed
    const timingFields = [
      'wedding_date',
      'start_time',
      'end_time',
      'buffer_time_minutes',
    ];
    const hasTimingChanges = changedFields.some((field) =>
      timingFields.includes(field),
    );

    if (!hasTimingChanges) {
      console.log('Timeline updated but no timing changes detected');
      return [];
    }

    const change: TimelineChange = {
      type: 'timeline_updated',
      timeline_id: timelineData.id,
      old_data: oldTimelineData,
      new_data: timelineData,
      changed_fields: changedFields,
      change_metadata: {
        user_id: userId || 'system',
        timestamp: new Date().toISOString(),
        change_reason: 'Timeline timing updated',
      },
    };

    const results = await SupplierScheduleUpdateService.handleTimelineChange(
      change,
      {
        notify_suppliers: true,
        force_regenerate: true,
      },
    );

    console.log(`Processed timeline update for ${results.length} suppliers`);
    return results;
  } catch (error) {
    console.error('Error processing timeline update:', error);
    throw error;
  }
}

export default SupplierScheduleUpdateService;
