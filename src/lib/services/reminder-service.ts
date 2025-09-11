// WS-084: Reminder Service for Wedding Milestone Notifications
// Handles CRUD operations for reminder schedules and templates

import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

type SupabaseClient = ReturnType<typeof createClient<Database>>;

export interface ReminderTemplate {
  id?: string;
  organization_id: string;
  name: string;
  description?: string;
  category:
    | 'payment'
    | 'milestone'
    | 'vendor_task'
    | 'couple_task'
    | 'deadline'
    | 'general';
  subject_template: string;
  email_template?: string;
  sms_template?: string;
  variables: string[];
  is_active?: boolean;
  is_system?: boolean;
  metadata?: Record<string, any>;
  created_at?: string;
  updated_at?: string;
}

export interface ReminderSchedule {
  id?: string;
  organization_id: string;
  client_id?: string;
  template_id: string;
  entity_type: string;
  entity_id: string;
  entity_name?: string;
  recipient_id?: string;
  recipient_type: 'client' | 'vendor' | 'team' | 'couple';
  recipient_email?: string;
  recipient_phone?: string;
  trigger_date: string;
  advance_days?: number;
  is_recurring?: boolean;
  recurrence_pattern?: 'daily' | 'weekly' | 'monthly';
  recurrence_end?: string;
  send_email?: boolean;
  send_sms?: boolean;
  send_in_app?: boolean;
  status?:
    | 'scheduled'
    | 'processing'
    | 'sent'
    | 'failed'
    | 'cancelled'
    | 'snoozed';
  next_send_at?: string;
  escalation_enabled?: boolean;
  escalation_days?: number;
  escalation_recipient_ids?: string[];
  metadata?: Record<string, any>;
  created_at?: string;
  updated_at?: string;
}

export interface CreateReminderRequest {
  templateId: string;
  entityType: string;
  entityId: string;
  entityName: string;
  triggerDate: string;
  advanceDays?: number;
  recipients: Array<{
    id: string;
    type: 'client' | 'vendor' | 'team' | 'couple';
    email?: string;
    phone?: string;
  }>;
  channels?: {
    email?: boolean;
    sms?: boolean;
    inApp?: boolean;
  };
  isRecurring?: boolean;
  recurrencePattern?: 'daily' | 'weekly' | 'monthly';
  recurrenceEnd?: string;
  metadata?: Record<string, any>;
}

export class ReminderService {
  constructor(private supabase: SupabaseClient) {}

  // Template Management
  async getTemplates(
    organizationId: string,
    category?: string,
  ): Promise<ReminderTemplate[]> {
    let query = this.supabase
      .from('reminder_templates')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('is_active', true)
      .order('name');

    if (category) {
      query = query.eq('category', category);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching reminder templates:', error);
      throw new Error(`Failed to fetch reminder templates: ${error.message}`);
    }

    return data || [];
  }

  async getSystemTemplates(category?: string): Promise<ReminderTemplate[]> {
    let query = this.supabase
      .from('reminder_templates')
      .select('*')
      .eq('is_system', true)
      .eq('is_active', true)
      .order('name');

    if (category) {
      query = query.eq('category', category);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching system reminder templates:', error);
      throw new Error(
        `Failed to fetch system reminder templates: ${error.message}`,
      );
    }

    return data || [];
  }

  async createTemplate(
    template: Omit<ReminderTemplate, 'id' | 'created_at' | 'updated_at'>,
  ): Promise<ReminderTemplate> {
    const { data, error } = await this.supabase
      .from('reminder_templates')
      .insert({
        ...template,
        is_active: template.is_active ?? true,
        is_system: template.is_system ?? false,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating reminder template:', error);
      throw new Error(`Failed to create reminder template: ${error.message}`);
    }

    return data;
  }

  async updateTemplate(
    id: string,
    updates: Partial<ReminderTemplate>,
  ): Promise<ReminderTemplate> {
    const { data, error } = await this.supabase
      .from('reminder_templates')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating reminder template:', error);
      throw new Error(`Failed to update reminder template: ${error.message}`);
    }

    return data;
  }

  async deleteTemplate(id: string): Promise<void> {
    const { error } = await this.supabase
      .from('reminder_templates')
      .update({ is_active: false })
      .eq('id', id);

    if (error) {
      console.error('Error deleting reminder template:', error);
      throw new Error(`Failed to delete reminder template: ${error.message}`);
    }
  }

  // Reminder Schedule Management
  async getReminders(
    organizationId: string,
    filters?: {
      status?: string;
      entityType?: string;
      clientId?: string;
      startDate?: string;
      endDate?: string;
    },
  ): Promise<ReminderSchedule[]> {
    let query = this.supabase
      .from('reminder_schedules')
      .select(
        `
        *,
        reminder_templates!inner(name, category)
      `,
      )
      .eq('organization_id', organizationId)
      .order('next_send_at', { ascending: true });

    if (filters?.status) {
      query = query.eq('status', filters.status);
    }
    if (filters?.entityType) {
      query = query.eq('entity_type', filters.entityType);
    }
    if (filters?.clientId) {
      query = query.eq('client_id', filters.clientId);
    }
    if (filters?.startDate) {
      query = query.gte('trigger_date', filters.startDate);
    }
    if (filters?.endDate) {
      query = query.lte('trigger_date', filters.endDate);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching reminder schedules:', error);
      throw new Error(`Failed to fetch reminder schedules: ${error.message}`);
    }

    return data || [];
  }

  async createReminder(
    organizationId: string,
    clientId: string | undefined,
    request: CreateReminderRequest,
  ): Promise<ReminderSchedule[]> {
    const createdReminders: ReminderSchedule[] = [];

    // Create a reminder schedule for each recipient
    for (const recipient of request.recipients) {
      const reminderData: Omit<
        ReminderSchedule,
        'id' | 'created_at' | 'updated_at'
      > = {
        organization_id: organizationId,
        client_id: clientId,
        template_id: request.templateId,
        entity_type: request.entityType,
        entity_id: request.entityId,
        entity_name: request.entityName,
        recipient_id: recipient.id,
        recipient_type: recipient.type,
        recipient_email: recipient.email,
        recipient_phone: recipient.phone,
        trigger_date: request.triggerDate,
        advance_days: request.advanceDays || 0,
        is_recurring: request.isRecurring || false,
        recurrence_pattern: request.recurrencePattern,
        recurrence_end: request.recurrenceEnd,
        send_email: request.channels?.email ?? true,
        send_sms: request.channels?.sms ?? false,
        send_in_app: request.channels?.inApp ?? true,
        status: 'scheduled',
        metadata: request.metadata || {},
      };

      const { data, error } = await this.supabase
        .from('reminder_schedules')
        .insert(reminderData)
        .select()
        .single();

      if (error) {
        console.error('Error creating reminder schedule:', error);
        throw new Error(`Failed to create reminder schedule: ${error.message}`);
      }

      createdReminders.push(data);
    }

    return createdReminders;
  }

  async updateReminder(
    id: string,
    updates: Partial<ReminderSchedule>,
  ): Promise<ReminderSchedule> {
    const { data, error } = await this.supabase
      .from('reminder_schedules')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating reminder schedule:', error);
      throw new Error(`Failed to update reminder schedule: ${error.message}`);
    }

    return data;
  }

  async cancelReminder(id: string): Promise<void> {
    const { error } = await this.supabase
      .from('reminder_schedules')
      .update({ status: 'cancelled' })
      .eq('id', id);

    if (error) {
      console.error('Error cancelling reminder:', error);
      throw new Error(`Failed to cancel reminder: ${error.message}`);
    }
  }

  async snoozeReminder(id: string, snoozeUntil: string): Promise<void> {
    const { error } = await this.supabase
      .from('reminder_schedules')
      .update({
        status: 'snoozed',
        snoozed_until: snoozeUntil,
      })
      .eq('id', id);

    if (error) {
      console.error('Error snoozing reminder:', error);
      throw new Error(`Failed to snooze reminder: ${error.message}`);
    }
  }

  async acknowledgeReminder(id: string): Promise<void> {
    // Mark reminder as acknowledged in history
    const { error } = await this.supabase
      .from('reminder_history')
      .update({
        acknowledged: true,
        acknowledged_at: new Date().toISOString(),
      })
      .eq('schedule_id', id)
      .order('sent_at', { ascending: false })
      .limit(1);

    if (error) {
      console.error('Error acknowledging reminder:', error);
      throw new Error(`Failed to acknowledge reminder: ${error.message}`);
    }
  }

  // Reminder History and Analytics
  async getReminderHistory(
    organizationId: string,
    filters?: {
      scheduleId?: string;
      channel?: string;
      startDate?: string;
      endDate?: string;
    },
  ): Promise<any[]> {
    let query = this.supabase
      .from('reminder_history')
      .select('*')
      .eq('organization_id', organizationId)
      .order('sent_at', { ascending: false });

    if (filters?.scheduleId) {
      query = query.eq('schedule_id', filters.scheduleId);
    }
    if (filters?.channel) {
      query = query.eq('channel', filters.channel);
    }
    if (filters?.startDate) {
      query = query.gte('sent_at', filters.startDate);
    }
    if (filters?.endDate) {
      query = query.lte('sent_at', filters.endDate);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching reminder history:', error);
      throw new Error(`Failed to fetch reminder history: ${error.message}`);
    }

    return data || [];
  }

  async getReminderStats(
    organizationId: string,
    days = 30,
  ): Promise<{
    totalSent: number;
    totalOpened: number;
    totalClicked: number;
    openRate: number;
    clickRate: number;
    channelBreakdown: Record<string, number>;
    categoryBreakdown: Record<string, number>;
  }> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const { data, error } = await this.supabase
      .from('reminder_history')
      .select(
        `
        delivery_status,
        channel,
        opened_at,
        clicked_at,
        reminder_schedules!inner(
          reminder_templates!inner(category)
        )
      `,
      )
      .eq('organization_id', organizationId)
      .gte('sent_at', startDate.toISOString());

    if (error) {
      console.error('Error fetching reminder stats:', error);
      throw new Error(`Failed to fetch reminder stats: ${error.message}`);
    }

    const stats = {
      totalSent: data?.length || 0,
      totalOpened: data?.filter((r) => r.opened_at).length || 0,
      totalClicked: data?.filter((r) => r.clicked_at).length || 0,
      openRate: 0,
      clickRate: 0,
      channelBreakdown: {} as Record<string, number>,
      categoryBreakdown: {} as Record<string, number>,
    };

    if (stats.totalSent > 0) {
      stats.openRate = (stats.totalOpened / stats.totalSent) * 100;
      stats.clickRate = (stats.totalClicked / stats.totalSent) * 100;
    }

    // Calculate breakdowns
    data?.forEach((record) => {
      // Channel breakdown
      stats.channelBreakdown[record.channel] =
        (stats.channelBreakdown[record.channel] || 0) + 1;

      // Category breakdown
      const category = (record.reminder_schedules as any)?.reminder_templates
        ?.category;
      if (category) {
        stats.categoryBreakdown[category] =
          (stats.categoryBreakdown[category] || 0) + 1;
      }
    });

    return stats;
  }

  // Bulk Operations
  async createBulkReminders(
    organizationId: string,
    entityType: string,
    entities: Array<{
      id: string;
      name: string;
      triggerDate: string;
      recipients: Array<{
        id: string;
        type: 'client' | 'vendor' | 'team' | 'couple';
        email?: string;
        phone?: string;
      }>;
    }>,
    templateId: string,
    options?: {
      advanceDays?: number;
      channels?: { email?: boolean; sms?: boolean; inApp?: boolean };
    },
  ): Promise<ReminderSchedule[]> {
    const allReminders: ReminderSchedule[] = [];

    for (const entity of entities) {
      const reminders = await this.createReminder(organizationId, undefined, {
        templateId,
        entityType,
        entityId: entity.id,
        entityName: entity.name,
        triggerDate: entity.triggerDate,
        recipients: entity.recipients,
        advanceDays: options?.advanceDays,
        channels: options?.channels,
      });

      allReminders.push(...reminders);
    }

    return allReminders;
  }

  // Utility Methods
  async testReminderTemplate(
    templateId: string,
    sampleData: Record<string, any>,
  ): Promise<{
    resolvedSubject: string;
    resolvedEmailContent: string;
    resolvedSmsContent: string;
  }> {
    const { data: template, error } = await this.supabase
      .from('reminder_templates')
      .select('*')
      .eq('id', templateId)
      .single();

    if (error || !template) {
      throw new Error(`Template not found: ${error?.message}`);
    }

    return {
      resolvedSubject: this.resolveTemplate(
        template.subject_template,
        sampleData,
      ),
      resolvedEmailContent: this.resolveTemplate(
        template.email_template || '',
        sampleData,
      ),
      resolvedSmsContent: this.resolveTemplate(
        template.sms_template || '',
        sampleData,
      ),
    };
  }

  private resolveTemplate(template: string, data: Record<string, any>): string {
    if (!template) return '';

    let resolved = template;

    // Replace template variables like {variableName}
    Object.keys(data).forEach((key) => {
      const regex = new RegExp(`\\{${key}\\}`, 'g');
      resolved = resolved.replace(regex, String(data[key] || ''));
    });

    return resolved;
  }
}

// Factory function for creating reminder service instance
export function createReminderService(
  supabase: SupabaseClient,
): ReminderService {
  return new ReminderService(supabase);
}
