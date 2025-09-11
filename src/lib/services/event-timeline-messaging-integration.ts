/**
 * WS-155: Event Timeline Messaging Integration
 * Links messages to wedding timeline events and milestones
 */

import { z } from 'zod';
import { supabase } from '@/lib/supabase/client';
import { pushNotificationSystem } from './push-notification-system';
import { advancedOfflineSync } from './advanced-offline-sync';

// Timeline event types
enum TimelineEventType {
  CEREMONY = 'CEREMONY',
  RECEPTION = 'RECEPTION',
  COCKTAIL_HOUR = 'COCKTAIL_HOUR',
  DINNER = 'DINNER',
  FIRST_DANCE = 'FIRST_DANCE',
  CAKE_CUTTING = 'CAKE_CUTTING',
  SPEECHES = 'SPEECHES',
  PHOTO_SESSION = 'PHOTO_SESSION',
  CUSTOM = 'CUSTOM',
}

// Message trigger types
enum MessageTriggerType {
  BEFORE_EVENT = 'BEFORE_EVENT',
  AT_EVENT_START = 'AT_EVENT_START',
  DURING_EVENT = 'DURING_EVENT',
  AFTER_EVENT = 'AFTER_EVENT',
  REMINDER = 'REMINDER',
  UPDATE = 'UPDATE',
}

// Timeline event
interface TimelineEvent {
  id: string;
  weddingId: string;
  type: TimelineEventType;
  name: string;
  description?: string;
  startTime: Date;
  endTime?: Date;
  location?: string;
  metadata?: any;
  linkedMessages?: LinkedMessage[];
}

// Linked message
interface LinkedMessage {
  id: string;
  eventId: string;
  messageId: string;
  triggerType: MessageTriggerType;
  triggerOffset?: number; // Minutes before/after event
  status: 'scheduled' | 'sent' | 'failed' | 'cancelled';
  scheduledTime: Date;
  sentTime?: Date;
  recipients?: string[];
}

// Message automation rule
interface MessageAutomationRule {
  id: string;
  eventType: TimelineEventType;
  triggerType: MessageTriggerType;
  triggerOffset: number;
  messageTemplate: string;
  recipientFilter?: any;
  enabled: boolean;
  priority: number;
}

export class EventTimelineMessagingIntegration {
  private automationRules: Map<string, MessageAutomationRule> = new Map();
  private scheduledMessages: Map<string, LinkedMessage> = new Map();
  private eventSubscriptions: Map<string, any> = new Map();

  constructor() {
    this.initializeAutomationRules();
    this.startEventMonitoring();
  }

  /**
   * Initialize default automation rules
   */
  private async initializeAutomationRules() {
    const defaultRules: MessageAutomationRule[] = [
      {
        id: 'ceremony_reminder',
        eventType: TimelineEventType.CEREMONY,
        triggerType: MessageTriggerType.BEFORE_EVENT,
        triggerOffset: -60, // 1 hour before
        messageTemplate:
          'The ceremony will begin in 1 hour at {location}. Please make your way to the venue.',
        enabled: true,
        priority: 10,
      },
      {
        id: 'reception_start',
        eventType: TimelineEventType.RECEPTION,
        triggerType: MessageTriggerType.AT_EVENT_START,
        triggerOffset: 0,
        messageTemplate:
          'The reception is now beginning! Join us at {location} for celebration.',
        enabled: true,
        priority: 8,
      },
      {
        id: 'dinner_announcement',
        eventType: TimelineEventType.DINNER,
        triggerType: MessageTriggerType.BEFORE_EVENT,
        triggerOffset: -15,
        messageTemplate:
          'Dinner will be served in 15 minutes. Please find your assigned table.',
        enabled: true,
        priority: 7,
      },
      {
        id: 'photo_session_invite',
        eventType: TimelineEventType.PHOTO_SESSION,
        triggerType: MessageTriggerType.BEFORE_EVENT,
        triggerOffset: -30,
        messageTemplate:
          "Group photo session starting in 30 minutes at {location}. Don't miss this moment!",
        recipientFilter: { tags: ['family', 'wedding_party'] },
        enabled: true,
        priority: 9,
      },
    ];

    // Load custom rules from database
    try {
      const { data: customRules } = await supabase
        .from('message_automation_rules')
        .select('*')
        .eq('enabled', true);

      const allRules = [...defaultRules, ...(customRules || [])];

      allRules.forEach((rule) => {
        this.automationRules.set(rule.id, rule);
      });
    } catch (error) {
      console.error('Error loading automation rules:', error);
    }
  }

  /**
   * Link message to timeline event
   */
  async linkMessageToEvent(
    messageId: string,
    eventId: string,
    triggerType: MessageTriggerType,
    options?: {
      triggerOffset?: number;
      recipients?: string[];
      scheduledTime?: Date;
    },
  ): Promise<LinkedMessage> {
    try {
      // Get event details
      const { data: event, error: eventError } = await supabase
        .from('timeline_events')
        .select('*')
        .eq('id', eventId)
        .single();

      if (eventError) throw eventError;

      // Calculate scheduled time
      let scheduledTime = options?.scheduledTime;
      if (!scheduledTime) {
        const offset = options?.triggerOffset || 0;
        scheduledTime = new Date(event.start_time);
        scheduledTime.setMinutes(scheduledTime.getMinutes() + offset);
      }

      // Create linked message record
      const linkedMessage: LinkedMessage = {
        id: `link_${Date.now()}`,
        eventId,
        messageId,
        triggerType,
        triggerOffset: options?.triggerOffset,
        status: 'scheduled',
        scheduledTime,
        recipients: options?.recipients,
      };

      // Save to database
      const { data, error } = await supabase
        .from('linked_messages')
        .insert({
          event_id: eventId,
          message_id: messageId,
          trigger_type: triggerType,
          trigger_offset: options?.triggerOffset,
          status: 'scheduled',
          scheduled_time: scheduledTime,
          recipients: options?.recipients,
        })
        .select()
        .single();

      if (error) throw error;

      // Schedule message
      await this.scheduleLinkedMessage(linkedMessage);

      return linkedMessage;
    } catch (error) {
      console.error('Error linking message to event:', error);
      throw error;
    }
  }

  /**
   * Create automated messages for event
   */
  async createAutomatedMessagesForEvent(
    event: TimelineEvent,
  ): Promise<LinkedMessage[]> {
    const linkedMessages: LinkedMessage[] = [];

    try {
      // Find applicable automation rules
      const applicableRules = Array.from(this.automationRules.values())
        .filter((rule) => rule.eventType === event.type && rule.enabled)
        .sort((a, b) => b.priority - a.priority);

      for (const rule of applicableRules) {
        // Process message template
        const message = this.processMessageTemplate(
          rule.messageTemplate,
          event,
        );

        // Get recipients based on filter
        const recipients = await this.getRecipientsByFilter(
          event.weddingId,
          rule.recipientFilter,
        );

        if (recipients.length === 0) continue;

        // Calculate scheduled time
        const scheduledTime = new Date(event.startTime);
        scheduledTime.setMinutes(
          scheduledTime.getMinutes() + rule.triggerOffset,
        );

        // Create message
        const { data: messageData, error: messageError } = await supabase
          .from('messages')
          .insert({
            wedding_id: event.weddingId,
            content: message,
            type: 'automated',
            metadata: {
              automation_rule_id: rule.id,
              event_id: event.id,
              event_type: event.type,
            },
          })
          .select()
          .single();

        if (messageError) throw messageError;

        // Link message to event
        const linkedMessage = await this.linkMessageToEvent(
          messageData.id,
          event.id,
          rule.triggerType,
          {
            triggerOffset: rule.triggerOffset,
            recipients: recipients.map((r) => r.id),
            scheduledTime,
          },
        );

        linkedMessages.push(linkedMessage);
      }

      return linkedMessages;
    } catch (error) {
      console.error('Error creating automated messages:', error);
      return [];
    }
  }

  /**
   * Process message template with event data
   */
  private processMessageTemplate(
    template: string,
    event: TimelineEvent,
  ): string {
    let message = template;

    const replacements: Record<string, string> = {
      '{event_name}': event.name,
      '{location}': event.location || 'the venue',
      '{start_time}': this.formatTime(event.startTime),
      '{end_time}': event.endTime ? this.formatTime(event.endTime) : '',
      '{description}': event.description || '',
    };

    Object.entries(replacements).forEach(([placeholder, value]) => {
      message = message.replace(new RegExp(placeholder, 'g'), value);
    });

    return message;
  }

  /**
   * Get recipients based on filter criteria
   */
  private async getRecipientsByFilter(
    weddingId: string,
    filter?: any,
  ): Promise<any[]> {
    try {
      let query = supabase
        .from('guests')
        .select('*')
        .eq('wedding_id', weddingId);

      if (filter) {
        if (filter.tags && Array.isArray(filter.tags)) {
          query = query.contains('tags', filter.tags);
        }
        if (filter.rsvpStatus) {
          query = query.eq('rsvp_status', filter.rsvpStatus);
        }
        if (filter.tableNumber) {
          query = query.eq('table_number', filter.tableNumber);
        }
      }

      const { data, error } = await query;

      if (error) throw error;

      return data || [];
    } catch (error) {
      console.error('Error getting recipients:', error);
      return [];
    }
  }

  /**
   * Schedule linked message
   */
  private async scheduleLinkedMessage(
    linkedMessage: LinkedMessage,
  ): Promise<void> {
    const now = new Date();
    const delay = linkedMessage.scheduledTime.getTime() - now.getTime();

    if (delay <= 0) {
      // Send immediately if scheduled time has passed
      await this.sendLinkedMessage(linkedMessage);
    } else {
      // Schedule for future
      setTimeout(async () => {
        await this.sendLinkedMessage(linkedMessage);
      }, delay);

      // Store in memory for tracking
      this.scheduledMessages.set(linkedMessage.id, linkedMessage);
    }
  }

  /**
   * Send linked message
   */
  private async sendLinkedMessage(linkedMessage: LinkedMessage): Promise<void> {
    try {
      // Get message content
      const { data: message, error: messageError } = await supabase
        .from('messages')
        .select('*')
        .eq('id', linkedMessage.messageId)
        .single();

      if (messageError) throw messageError;

      // Send to recipients
      const sendPromises =
        linkedMessage.recipients?.map(async (recipientId) => {
          // Queue for offline sync
          await advancedOfflineSync.queueOperation(
            'CREATE',
            'sent_messages',
            `sent_${Date.now()}`,
            {
              message_id: linkedMessage.messageId,
              guest_id: recipientId,
              sent_at: new Date().toISOString(),
            },
          );

          // Send push notification
          await pushNotificationSystem.sendNotification(
            recipientId,
            'EVENT_REMINDER',
            {
              title: 'Event Update',
              body: message.content,
              data: {
                eventId: linkedMessage.eventId,
                messageId: linkedMessage.messageId,
              },
            },
          );
        }) || [];

      await Promise.allSettled(sendPromises);

      // Update status
      await supabase
        .from('linked_messages')
        .update({
          status: 'sent',
          sent_time: new Date().toISOString(),
        })
        .eq('id', linkedMessage.id);

      // Remove from scheduled messages
      this.scheduledMessages.delete(linkedMessage.id);
    } catch (error) {
      console.error('Error sending linked message:', error);

      // Update status to failed
      await supabase
        .from('linked_messages')
        .update({ status: 'failed' })
        .eq('id', linkedMessage.id);
    }
  }

  /**
   * Start monitoring timeline events
   */
  private async startEventMonitoring() {
    try {
      // Subscribe to timeline event changes
      const subscription = supabase
        .channel('timeline-events')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'timeline_events',
          },
          async (payload) => {
            if (payload.eventType === 'INSERT') {
              // New event added, create automated messages
              const event = this.mapPayloadToEvent(payload.new);
              await this.createAutomatedMessagesForEvent(event);
            } else if (payload.eventType === 'UPDATE') {
              // Event updated, reschedule messages
              await this.handleEventUpdate(payload.new);
            } else if (payload.eventType === 'DELETE') {
              // Event deleted, cancel messages
              await this.cancelEventMessages(payload.old.id);
            }
          },
        )
        .subscribe();

      this.eventSubscriptions.set('timeline-events', subscription);
    } catch (error) {
      console.error('Error starting event monitoring:', error);
    }
  }

  /**
   * Handle event update
   */
  private async handleEventUpdate(eventData: any): Promise<void> {
    try {
      // Get linked messages for this event
      const { data: linkedMessages } = await supabase
        .from('linked_messages')
        .select('*')
        .eq('event_id', eventData.id)
        .eq('status', 'scheduled');

      if (linkedMessages) {
        for (const linked of linkedMessages) {
          // Recalculate scheduled time
          const newScheduledTime = new Date(eventData.start_time);
          newScheduledTime.setMinutes(
            newScheduledTime.getMinutes() + (linked.trigger_offset || 0),
          );

          // Update scheduled time
          await supabase
            .from('linked_messages')
            .update({ scheduled_time: newScheduledTime })
            .eq('id', linked.id);

          // Reschedule message
          if (this.scheduledMessages.has(linked.id)) {
            const updatedLinked = {
              ...linked,
              scheduledTime: newScheduledTime,
            };
            await this.scheduleLinkedMessage(updatedLinked);
          }
        }
      }
    } catch (error) {
      console.error('Error handling event update:', error);
    }
  }

  /**
   * Cancel messages for deleted event
   */
  private async cancelEventMessages(eventId: string): Promise<void> {
    try {
      // Update all scheduled messages to cancelled
      await supabase
        .from('linked_messages')
        .update({ status: 'cancelled' })
        .eq('event_id', eventId)
        .eq('status', 'scheduled');

      // Remove from scheduled messages
      for (const [id, message] of this.scheduledMessages.entries()) {
        if (message.eventId === eventId) {
          this.scheduledMessages.delete(id);
        }
      }
    } catch (error) {
      console.error('Error cancelling event messages:', error);
    }
  }

  /**
   * Get messaging timeline for wedding
   */
  async getMessagingTimeline(weddingId: string): Promise<any> {
    try {
      // Get all timeline events
      const { data: events } = await supabase
        .from('timeline_events')
        .select('*')
        .eq('wedding_id', weddingId)
        .order('start_time', { ascending: true });

      // Get all linked messages
      const { data: linkedMessages } = await supabase
        .from('linked_messages')
        .select('*, messages(*)')
        .in('event_id', events?.map((e) => e.id) || []);

      // Build timeline
      const timeline = events?.map((event) => ({
        ...event,
        messages:
          linkedMessages?.filter((lm) => lm.event_id === event.id) || [],
      }));

      return {
        events: timeline,
        statistics: {
          totalEvents: events?.length || 0,
          totalMessages: linkedMessages?.length || 0,
          scheduledMessages:
            linkedMessages?.filter((lm) => lm.status === 'scheduled').length ||
            0,
          sentMessages:
            linkedMessages?.filter((lm) => lm.status === 'sent').length || 0,
        },
      };
    } catch (error) {
      console.error('Error getting messaging timeline:', error);
      return null;
    }
  }

  /**
   * Update automation rule
   */
  async updateAutomationRule(
    ruleId: string,
    updates: Partial<MessageAutomationRule>,
  ): Promise<void> {
    try {
      const { error } = await supabase
        .from('message_automation_rules')
        .update(updates)
        .eq('id', ruleId);

      if (error) throw error;

      // Update local cache
      const rule = this.automationRules.get(ruleId);
      if (rule) {
        this.automationRules.set(ruleId, { ...rule, ...updates });
      }
    } catch (error) {
      console.error('Error updating automation rule:', error);
    }
  }

  /**
   * Map payload to event
   */
  private mapPayloadToEvent(payload: any): TimelineEvent {
    return {
      id: payload.id,
      weddingId: payload.wedding_id,
      type: payload.type,
      name: payload.name,
      description: payload.description,
      startTime: new Date(payload.start_time),
      endTime: payload.end_time ? new Date(payload.end_time) : undefined,
      location: payload.location,
      metadata: payload.metadata,
    };
  }

  /**
   * Format time for display
   */
  private formatTime(date: Date): string {
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  }

  /**
   * Get upcoming linked messages
   */
  async getUpcomingMessages(
    weddingId: string,
    hours: number = 24,
  ): Promise<LinkedMessage[]> {
    const now = new Date();
    const future = new Date(now.getTime() + hours * 60 * 60 * 1000);

    try {
      const { data, error } = await supabase
        .from('linked_messages')
        .select('*, timeline_events(*), messages(*)')
        .eq('timeline_events.wedding_id', weddingId)
        .eq('status', 'scheduled')
        .gte('scheduled_time', now.toISOString())
        .lte('scheduled_time', future.toISOString())
        .order('scheduled_time', { ascending: true });

      if (error) throw error;

      return data || [];
    } catch (error) {
      console.error('Error getting upcoming messages:', error);
      return [];
    }
  }

  /**
   * Clean up resources
   */
  dispose(): void {
    // Unsubscribe from all events
    for (const subscription of this.eventSubscriptions.values()) {
      subscription.unsubscribe();
    }
    this.eventSubscriptions.clear();
    this.scheduledMessages.clear();
    this.automationRules.clear();
  }
}

export const eventTimelineMessaging = new EventTimelineMessagingIntegration();
