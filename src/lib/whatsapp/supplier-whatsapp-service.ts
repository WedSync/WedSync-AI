// WS-161: Supplier WhatsApp Integration Service
import { WhatsAppService, createWhatsAppService } from '@/lib/whatsapp/service';
import { SupplierScheduleEvent, SupplierContactInfo } from '@/types/suppliers';
import { createClient } from '@/lib/supabase/server';

export interface SupplierWhatsAppTemplate {
  name: string;
  language_code: string;
  category: 'UTILITY' | 'MARKETING' | 'AUTHENTICATION';
  components: Array<{
    type: 'HEADER' | 'BODY' | 'FOOTER' | 'BUTTONS';
    parameters?: Array<{
      type: 'text' | 'currency' | 'date_time';
      text?: string;
      currency?: {
        fallback_value: string;
        code: string;
        amount_1000: number;
      };
      date_time?: {
        fallback_value: string;
        calendar: string;
        year: number;
        month: number;
        day: number;
        hour?: number;
        minute?: number;
      };
    }>;
  }>;
}

export interface SupplierWhatsAppNotification {
  id: string;
  supplier_id: string;
  organization_id: string;
  phone_number: string;

  // Message details
  message_type:
    | 'schedule_update'
    | 'schedule_reminder'
    | 'conflict_alert'
    | 'feedback_request'
    | 'approval_needed';
  template_name: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';

  // Schedule event context
  schedule_event_id?: string;
  wedding_id?: string;
  couple_names?: string;

  // Message content
  subject: string;
  message_preview: string;
  template_parameters: Record<string, any>;

  // Delivery tracking
  status: 'queued' | 'sent' | 'delivered' | 'read' | 'failed';
  whatsapp_message_id?: string;
  sent_at?: Date;
  delivered_at?: Date;
  read_at?: Date;

  // Response tracking
  response_required: boolean;
  response_received?: boolean;
  response_content?: string;
  response_at?: Date;

  // Metadata
  created_at: Date;
  updated_at: Date;
  metadata: {
    original_values?: any;
    new_values?: any;
    change_type?: string;
    urgency_reason?: string;
    action_buttons?: Array<{
      id: string;
      text: string;
      action_type: 'confirm' | 'reschedule' | 'feedback' | 'call';
      action_data?: any;
    }>;
  };
}

export interface SupplierWhatsAppConversation {
  id: string;
  supplier_id: string;
  organization_id: string;
  phone_number: string;

  // Context
  wedding_id?: string;
  schedule_event_id?: string;
  feedback_id?: string;

  // Conversation details
  conversation_type:
    | 'support'
    | 'schedule_discussion'
    | 'conflict_resolution'
    | 'general';
  status: 'active' | 'resolved' | 'archived';
  priority: 'low' | 'medium' | 'high';

  // Participants
  supplier_name: string;
  planner_name?: string;
  planner_phone?: string;

  // Message tracking
  total_messages: number;
  last_message_at: Date;
  last_message_from: 'supplier' | 'planner' | 'system';
  unread_count: number;

  // Automation
  automated_responses_enabled: boolean;
  escalation_threshold: number;
  escalated: boolean;
  escalated_at?: Date;

  created_at: Date;
  updated_at: Date;
}

export interface BulkWhatsAppResult {
  total_suppliers: number;
  successful_sends: number;
  failed_sends: number;
  supplier_results: Array<{
    supplier_id: string;
    phone_number: string;
    success: boolean;
    message_id?: string;
    error?: string;
  }>;
  errors: string[];
}

export class SupplierWhatsAppService {
  private whatsappService: WhatsAppService;

  constructor() {
    this.whatsappService = createWhatsAppService();
  }

  /**
   * Send schedule update notification to supplier
   */
  static async sendScheduleUpdateNotification(
    supplier: SupplierContactInfo,
    scheduleEvent: SupplierScheduleEvent,
    changeDetails: {
      change_type: string;
      original_values: any;
      new_values: any;
      change_reason: string;
      urgency_level: 'low' | 'medium' | 'high' | 'urgent';
    },
    organizationId: string,
  ): Promise<{
    success: boolean;
    notification_id?: string;
    message_id?: string;
    error?: string;
  }> {
    try {
      if (!supplier.phone || !supplier.preferences.whatsapp_notifications) {
        return {
          success: false,
          error: 'Supplier WhatsApp notifications not enabled',
        };
      }

      const service = new SupplierWhatsAppService();
      const supabase = await createClient();

      // Determine template based on change type and urgency
      const template = service.getScheduleUpdateTemplate(
        changeDetails.change_type,
        changeDetails.urgency_level,
      );

      // Prepare template parameters
      const parameters = service.buildScheduleUpdateParameters(
        supplier,
        scheduleEvent,
        changeDetails,
      );

      // Send WhatsApp message
      const sendResult = await service.whatsappService.sendTemplateMessage(
        service.normalizePhoneNumber(supplier.phone),
        template.name,
        template.language_code,
        template.components,
        {
          supplier_id: supplier.id,
          organization_id: organizationId,
          schedule_event_id: scheduleEvent.id,
          change_type: changeDetails.change_type,
        },
      );

      if (!sendResult.success) {
        return { success: false, error: sendResult.error };
      }

      // Create notification record
      const notificationData = {
        supplier_id: supplier.id,
        organization_id: organizationId,
        phone_number: supplier.phone,
        message_type: 'schedule_update',
        template_name: template.name,
        priority: changeDetails.urgency_level === 'urgent' ? 'urgent' : 'high',
        schedule_event_id: scheduleEvent.id,
        wedding_id: scheduleEvent.wedding_date ? 'wedding-id' : undefined, // Would get from scheduleEvent
        couple_names: scheduleEvent.couple_names,
        subject: service.getUpdateSubject(
          changeDetails.change_type,
          scheduleEvent,
        ),
        message_preview: service.getUpdatePreview(changeDetails, scheduleEvent),
        template_parameters: parameters,
        status: 'sent',
        whatsapp_message_id: sendResult.messageId,
        sent_at: new Date().toISOString(),
        response_required: service.isResponseRequired(
          changeDetails.change_type,
          changeDetails.urgency_level,
        ),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        metadata: {
          original_values: changeDetails.original_values,
          new_values: changeDetails.new_values,
          change_type: changeDetails.change_type,
          urgency_reason: changeDetails.change_reason,
          action_buttons: service.getActionButtons(changeDetails.change_type),
        },
      };

      const { data: notification, error: insertError } = await supabase
        .from('supplier_whatsapp_notifications')
        .insert(notificationData)
        .select()
        .single();

      if (insertError) {
        console.error('Failed to create notification record:', insertError);
      }

      return {
        success: true,
        notification_id: notification?.id,
        message_id: sendResult.messageId,
      };
    } catch (error) {
      console.error('Failed to send supplier WhatsApp schedule update:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Send schedule reminder to supplier
   */
  static async sendScheduleReminder(
    supplier: SupplierContactInfo,
    scheduleEvent: SupplierScheduleEvent,
    reminderType: '24h' | '2h' | '30min',
    organizationId: string,
  ): Promise<{
    success: boolean;
    notification_id?: string;
    message_id?: string;
    error?: string;
  }> {
    try {
      if (!supplier.phone || !supplier.preferences.whatsapp_notifications) {
        return {
          success: false,
          error: 'Supplier WhatsApp notifications not enabled',
        };
      }

      const service = new SupplierWhatsAppService();
      const supabase = await createClient();

      // Get reminder template
      const template = service.getScheduleReminderTemplate(reminderType);

      // Prepare template parameters
      const parameters = service.buildScheduleReminderParameters(
        supplier,
        scheduleEvent,
        reminderType,
      );

      // Send WhatsApp message
      const sendResult = await service.whatsappService.sendTemplateMessage(
        service.normalizePhoneNumber(supplier.phone),
        template.name,
        template.language_code,
        template.components,
        {
          supplier_id: supplier.id,
          organization_id: organizationId,
          schedule_event_id: scheduleEvent.id,
          reminder_type: reminderType,
        },
      );

      if (!sendResult.success) {
        return { success: false, error: sendResult.error };
      }

      // Create notification record
      const notificationData = {
        supplier_id: supplier.id,
        organization_id: organizationId,
        phone_number: supplier.phone,
        message_type: 'schedule_reminder',
        template_name: template.name,
        priority:
          reminderType === '30min'
            ? 'urgent'
            : reminderType === '2h'
              ? 'high'
              : 'medium',
        schedule_event_id: scheduleEvent.id,
        couple_names: scheduleEvent.couple_names,
        subject: `Wedding Reminder - ${scheduleEvent.title}`,
        message_preview: `Reminder: Your wedding event "${scheduleEvent.title}" starts ${reminderType === '30min' ? 'in 30 minutes' : reminderType === '2h' ? 'in 2 hours' : 'tomorrow'}`,
        template_parameters: parameters,
        status: 'sent',
        whatsapp_message_id: sendResult.messageId,
        sent_at: new Date().toISOString(),
        response_required: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        metadata: {
          reminder_type: reminderType,
          event_start_time: scheduleEvent.start_time.toISOString(),
        },
      };

      const { data: notification, error: insertError } = await supabase
        .from('supplier_whatsapp_notifications')
        .insert(notificationData)
        .select()
        .single();

      if (insertError) {
        console.error('Failed to create notification record:', insertError);
      }

      return {
        success: true,
        notification_id: notification?.id,
        message_id: sendResult.messageId,
      };
    } catch (error) {
      console.error('Failed to send supplier WhatsApp reminder:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Send conflict alert to supplier
   */
  static async sendConflictAlert(
    supplier: SupplierContactInfo,
    scheduleEvent: SupplierScheduleEvent,
    conflictDetails: {
      conflict_type: string;
      conflicting_event?: any;
      suggested_solutions: Array<{
        solution_type: string;
        description: string;
      }>;
    },
    organizationId: string,
  ): Promise<{
    success: boolean;
    notification_id?: string;
    message_id?: string;
    error?: string;
  }> {
    try {
      if (!supplier.phone || !supplier.preferences.whatsapp_notifications) {
        return {
          success: false,
          error: 'Supplier WhatsApp notifications not enabled',
        };
      }

      const service = new SupplierWhatsAppService();
      const supabase = await createClient();

      // Get conflict alert template
      const template = service.getConflictAlertTemplate(
        conflictDetails.conflict_type,
      );

      // Prepare template parameters
      const parameters = service.buildConflictAlertParameters(
        supplier,
        scheduleEvent,
        conflictDetails,
      );

      // Send WhatsApp message
      const sendResult = await service.whatsappService.sendTemplateMessage(
        service.normalizePhoneNumber(supplier.phone),
        template.name,
        template.language_code,
        template.components,
        {
          supplier_id: supplier.id,
          organization_id: organizationId,
          schedule_event_id: scheduleEvent.id,
          conflict_type: conflictDetails.conflict_type,
        },
      );

      if (!sendResult.success) {
        return { success: false, error: sendResult.error };
      }

      // Create notification record
      const notificationData = {
        supplier_id: supplier.id,
        organization_id: organizationId,
        phone_number: supplier.phone,
        message_type: 'conflict_alert',
        template_name: template.name,
        priority: 'urgent',
        schedule_event_id: scheduleEvent.id,
        couple_names: scheduleEvent.couple_names,
        subject: `Schedule Conflict Alert - ${scheduleEvent.title}`,
        message_preview: `URGENT: Schedule conflict detected for ${scheduleEvent.title}. Immediate attention required.`,
        template_parameters: parameters,
        status: 'sent',
        whatsapp_message_id: sendResult.messageId,
        sent_at: new Date().toISOString(),
        response_required: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        metadata: {
          conflict_type: conflictDetails.conflict_type,
          suggested_solutions: conflictDetails.suggested_solutions,
          action_buttons: [
            {
              id: 'confirm_availability',
              text: 'Confirm Available',
              action_type: 'confirm',
            },
            {
              id: 'request_reschedule',
              text: 'Request Reschedule',
              action_type: 'reschedule',
            },
            {
              id: 'provide_feedback',
              text: 'Provide Details',
              action_type: 'feedback',
            },
          ],
        },
      };

      const { data: notification, error: insertError } = await supabase
        .from('supplier_whatsapp_notifications')
        .insert(notificationData)
        .select()
        .single();

      if (insertError) {
        console.error('Failed to create notification record:', insertError);
      }

      return {
        success: true,
        notification_id: notification?.id,
        message_id: sendResult.messageId,
      };
    } catch (error) {
      console.error('Failed to send supplier WhatsApp conflict alert:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Send bulk WhatsApp notifications to multiple suppliers
   */
  static async sendBulkSupplierWhatsAppNotifications(
    suppliers: Array<{
      supplier: SupplierContactInfo;
      scheduleEvent: SupplierScheduleEvent;
      messageType: 'schedule_update' | 'schedule_reminder' | 'conflict_alert';
      messageData: any;
    }>,
    organizationId: string,
  ): Promise<BulkWhatsAppResult> {
    const result: BulkWhatsAppResult = {
      total_suppliers: suppliers.length,
      successful_sends: 0,
      failed_sends: 0,
      supplier_results: [],
      errors: [],
    };

    // Process suppliers in batches to respect rate limits
    const batchSize = 10;
    for (let i = 0; i < suppliers.length; i += batchSize) {
      const batch = suppliers.slice(i, i + batchSize);

      const batchPromises = batch.map(async (supplierData) => {
        try {
          let sendResult;

          switch (supplierData.messageType) {
            case 'schedule_update':
              sendResult = await this.sendScheduleUpdateNotification(
                supplierData.supplier,
                supplierData.scheduleEvent,
                supplierData.messageData,
                organizationId,
              );
              break;

            case 'schedule_reminder':
              sendResult = await this.sendScheduleReminder(
                supplierData.supplier,
                supplierData.scheduleEvent,
                supplierData.messageData.reminderType,
                organizationId,
              );
              break;

            case 'conflict_alert':
              sendResult = await this.sendConflictAlert(
                supplierData.supplier,
                supplierData.scheduleEvent,
                supplierData.messageData,
                organizationId,
              );
              break;

            default:
              throw new Error(
                `Unsupported message type: ${supplierData.messageType}`,
              );
          }

          if (sendResult.success) {
            result.successful_sends++;
            result.supplier_results.push({
              supplier_id: supplierData.supplier.id,
              phone_number: supplierData.supplier.phone,
              success: true,
              message_id: sendResult.message_id,
            });
          } else {
            result.failed_sends++;
            result.supplier_results.push({
              supplier_id: supplierData.supplier.id,
              phone_number: supplierData.supplier.phone,
              success: false,
              error: sendResult.error,
            });
            result.errors.push(
              `Supplier ${supplierData.supplier.id}: ${sendResult.error}`,
            );
          }
        } catch (error) {
          result.failed_sends++;
          const errorMessage =
            error instanceof Error ? error.message : 'Unknown error';
          result.supplier_results.push({
            supplier_id: supplierData.supplier.id,
            phone_number: supplierData.supplier.phone,
            success: false,
            error: errorMessage,
          });
          result.errors.push(
            `Supplier ${supplierData.supplier.id}: ${errorMessage}`,
          );
        }
      });

      await Promise.allSettled(batchPromises);

      // Add delay between batches to respect rate limits
      if (i + batchSize < suppliers.length) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    return result;
  }

  /**
   * Handle incoming WhatsApp message from supplier
   */
  static async handleSupplierWhatsAppMessage(
    phoneNumber: string,
    messageContent: string,
    messageType: string,
    whatsappMessageId: string,
    metadata: any,
  ): Promise<{
    success: boolean;
    response_sent?: boolean;
    error?: string;
  }> {
    try {
      const supabase = await createClient();

      // Find supplier by phone number
      const { data: supplier } = await supabase
        .from('supplier_portal_users')
        .select(
          `
          supplier_id, organization_id, name, 
          supplier:suppliers(id, name, company_name, organization_id)
        `,
        )
        .eq('phone', phoneNumber)
        .single();

      if (!supplier) {
        console.log(
          `Received WhatsApp message from unknown supplier: ${phoneNumber}`,
        );
        return { success: true }; // Don't error for unknown numbers
      }

      // Store the message
      await supabase.from('supplier_whatsapp_messages').insert({
        supplier_id: supplier.supplier_id,
        organization_id: supplier.organization_id,
        phone_number: phoneNumber,
        whatsapp_message_id,
        message_type: messageType,
        content: messageContent,
        direction: 'incoming',
        received_at: new Date().toISOString(),
        metadata,
      });

      // Process message for business logic
      const processingResult = await this.processSupplierMessage(
        supplier.supplier_id,
        supplier.organization_id,
        messageContent,
        messageType,
        metadata,
      );

      return {
        success: true,
        response_sent: processingResult.response_sent,
      };
    } catch (error) {
      console.error('Failed to handle supplier WhatsApp message:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get supplier WhatsApp notification history
   */
  static async getSupplierWhatsAppHistory(
    supplierId: string,
    organizationId: string,
    filters: {
      message_type?: string;
      status?: string;
      from_date?: Date;
      to_date?: Date;
      limit?: number;
      offset?: number;
    } = {},
  ): Promise<{
    notifications: SupplierWhatsAppNotification[];
    total: number;
    has_more: boolean;
  }> {
    try {
      const supabase = await createClient();

      let query = supabase
        .from('supplier_whatsapp_notifications')
        .select('*', { count: 'exact' })
        .eq('supplier_id', supplierId)
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false });

      // Apply filters
      if (filters.message_type) {
        query = query.eq('message_type', filters.message_type);
      }
      if (filters.status) {
        query = query.eq('status', filters.status);
      }
      if (filters.from_date) {
        query = query.gte('created_at', filters.from_date.toISOString());
      }
      if (filters.to_date) {
        query = query.lte('created_at', filters.to_date.toISOString());
      }

      // Apply pagination
      const limit = filters.limit || 50;
      const offset = filters.offset || 0;
      query = query.range(offset, offset + limit - 1);

      const { data, error, count } = await query;

      if (error) throw error;

      const notifications = (data || []).map((item) => ({
        ...item,
        created_at: new Date(item.created_at),
        updated_at: new Date(item.updated_at),
        sent_at: item.sent_at ? new Date(item.sent_at) : undefined,
        delivered_at: item.delivered_at
          ? new Date(item.delivered_at)
          : undefined,
        read_at: item.read_at ? new Date(item.read_at) : undefined,
        response_at: item.response_at ? new Date(item.response_at) : undefined,
      }));

      return {
        notifications,
        total: count || 0,
        has_more: (data?.length || 0) === limit,
      };
    } catch (error) {
      console.error('Failed to get supplier WhatsApp history:', error);
      throw error;
    }
  }

  // Private helper methods

  private getScheduleUpdateTemplate(
    changeType: string,
    urgencyLevel: string,
  ): SupplierWhatsAppTemplate {
    // Return appropriate template based on change type and urgency
    if (urgencyLevel === 'urgent') {
      return {
        name: 'supplier_urgent_schedule_update',
        language_code: 'en_US',
        category: 'UTILITY',
        components: [
          {
            type: 'HEADER',
            parameters: [{ type: 'text', text: 'URGENT SCHEDULE UPDATE' }],
          },
          {
            type: 'BODY',
            parameters: [
              { type: 'text', text: '{{supplier_name}}' },
              { type: 'text', text: '{{couple_names}}' },
              { type: 'text', text: '{{event_title}}' },
              { type: 'text', text: '{{change_details}}' },
            ],
          },
          {
            type: 'BUTTONS',
          },
        ],
      };
    }

    return {
      name: 'supplier_schedule_update',
      language_code: 'en_US',
      category: 'UTILITY',
      components: [
        {
          type: 'BODY',
          parameters: [
            { type: 'text', text: '{{supplier_name}}' },
            { type: 'text', text: '{{couple_names}}' },
            { type: 'text', text: '{{event_title}}' },
            { type: 'text', text: '{{change_details}}' },
          ],
        },
      ],
    };
  }

  private getScheduleReminderTemplate(
    reminderType: string,
  ): SupplierWhatsAppTemplate {
    return {
      name: `supplier_reminder_${reminderType}`,
      language_code: 'en_US',
      category: 'UTILITY',
      components: [
        {
          type: 'BODY',
          parameters: [
            { type: 'text', text: '{{supplier_name}}' },
            { type: 'text', text: '{{couple_names}}' },
            { type: 'text', text: '{{event_title}}' },
            { type: 'text', text: '{{start_time}}' },
            { type: 'text', text: '{{venue_address}}' },
          ],
        },
      ],
    };
  }

  private getConflictAlertTemplate(
    conflictType: string,
  ): SupplierWhatsAppTemplate {
    return {
      name: 'supplier_conflict_alert',
      language_code: 'en_US',
      category: 'UTILITY',
      components: [
        {
          type: 'HEADER',
          parameters: [{ type: 'text', text: 'SCHEDULE CONFLICT DETECTED' }],
        },
        {
          type: 'BODY',
          parameters: [
            { type: 'text', text: '{{supplier_name}}' },
            { type: 'text', text: '{{event_title}}' },
            { type: 'text', text: '{{conflict_description}}' },
            { type: 'text', text: '{{suggested_solution}}' },
          ],
        },
        {
          type: 'BUTTONS',
        },
      ],
    };
  }

  private buildScheduleUpdateParameters(
    supplier: SupplierContactInfo,
    scheduleEvent: SupplierScheduleEvent,
    changeDetails: any,
  ): any[] {
    return [
      { type: 'text', text: supplier.name },
      { type: 'text', text: scheduleEvent.couple_names },
      { type: 'text', text: scheduleEvent.title },
      { type: 'text', text: this.formatChangeDetails(changeDetails) },
    ];
  }

  private buildScheduleReminderParameters(
    supplier: SupplierContactInfo,
    scheduleEvent: SupplierScheduleEvent,
    reminderType: string,
  ): any[] {
    return [
      { type: 'text', text: supplier.name },
      { type: 'text', text: scheduleEvent.couple_names },
      { type: 'text', text: scheduleEvent.title },
      { type: 'text', text: scheduleEvent.start_time.toLocaleString() },
      {
        type: 'text',
        text: scheduleEvent.venue_address || 'Address to be confirmed',
      },
    ];
  }

  private buildConflictAlertParameters(
    supplier: SupplierContactInfo,
    scheduleEvent: SupplierScheduleEvent,
    conflictDetails: any,
  ): any[] {
    return [
      { type: 'text', text: supplier.name },
      { type: 'text', text: scheduleEvent.title },
      {
        type: 'text',
        text: `${conflictDetails.conflict_type.replace('_', ' ')} conflict detected`,
      },
      {
        type: 'text',
        text:
          conflictDetails.suggested_solutions[0]?.description ||
          'Please contact support',
      },
    ];
  }

  private normalizePhoneNumber(phoneNumber: string): string {
    // Remove all non-numeric characters
    const cleaned = phoneNumber.replace(/\D/g, '');

    // Add country code if missing (assuming US/Canada)
    if (cleaned.length === 10) {
      return `1${cleaned}`;
    }

    return cleaned;
  }

  private formatChangeDetails(changeDetails: any): string {
    const { change_type, original_values, new_values, change_reason } =
      changeDetails;

    switch (change_type) {
      case 'time_update':
        return `Time changed from ${original_values.start_time} to ${new_values.start_time}. Reason: ${change_reason}`;
      case 'location_update':
        return `Location changed from ${original_values.location} to ${new_values.location}. Reason: ${change_reason}`;
      case 'cancellation':
        return `Event cancelled. Reason: ${change_reason}`;
      default:
        return `Schedule updated. Reason: ${change_reason}`;
    }
  }

  private getUpdateSubject(
    changeType: string,
    scheduleEvent: SupplierScheduleEvent,
  ): string {
    return `Schedule ${changeType.replace('_', ' ')} - ${scheduleEvent.title}`;
  }

  private getUpdatePreview(
    changeDetails: any,
    scheduleEvent: SupplierScheduleEvent,
  ): string {
    return `${scheduleEvent.title} schedule has been updated. ${changeDetails.change_reason}`;
  }

  private isResponseRequired(
    changeType: string,
    urgencyLevel: string,
  ): boolean {
    return (
      urgencyLevel === 'urgent' ||
      changeType === 'cancellation' ||
      changeType === 'time_update'
    );
  }

  private getActionButtons(changeType: string): Array<any> {
    switch (changeType) {
      case 'time_update':
      case 'location_update':
        return [
          {
            id: 'confirm_change',
            text: 'Confirm Change',
            action_type: 'confirm',
          },
          {
            id: 'request_discussion',
            text: 'Discuss Change',
            action_type: 'feedback',
          },
        ];
      case 'cancellation':
        return [
          {
            id: 'acknowledge_cancellation',
            text: 'Acknowledged',
            action_type: 'confirm',
          },
          {
            id: 'request_compensation',
            text: 'Discuss Terms',
            action_type: 'feedback',
          },
        ];
      default:
        return [
          {
            id: 'acknowledge_update',
            text: 'Acknowledged',
            action_type: 'confirm',
          },
        ];
    }
  }

  private static async processSupplierMessage(
    supplierId: string,
    organizationId: string,
    messageContent: string,
    messageType: string,
    metadata: any,
  ): Promise<{ response_sent: boolean }> {
    // Process supplier message for automated responses or business logic
    // This is where you'd implement keyword recognition, automated responses, etc.

    console.log(
      `Processing message from supplier ${supplierId}: ${messageContent}`,
    );

    // For now, just log the message
    return { response_sent: false };
  }
}
