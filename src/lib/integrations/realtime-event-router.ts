// WS-202: Realtime Event Router
// Intelligent event routing for Supabase realtime integration system

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { RealtimeWebhookIntegration } from './realtime-webhook-integration';
import { RealtimeNotificationService } from './realtime-notification-service';
import {
  RealtimeEventMetadata,
  EventRoutingConfig,
  NotificationConfig,
  ExternalIntegrationConfig,
  NotificationRecipient,
  WeddingEventData,
  EmailTriggerEventData,
  RealtimeIntegrationError,
  EventPriority,
} from '@/types/realtime-integration';

export class RealtimeEventRouter {
  private webhookIntegration: RealtimeWebhookIntegration;
  private notificationService: RealtimeNotificationService;
  private supabase: SupabaseClient;

  constructor(
    webhookIntegration: RealtimeWebhookIntegration,
    notificationService: RealtimeNotificationService,
    supabaseClient: SupabaseClient,
  ) {
    this.webhookIntegration = webhookIntegration;
    this.notificationService = notificationService;
    this.supabase = supabaseClient;
  }

  /**
   * Route database changes to appropriate integrations
   * Main entry point for all realtime events
   */
  async routeRealtimeEvent(
    table: string,
    eventType: 'INSERT' | 'UPDATE' | 'DELETE',
    oldRecord: any,
    newRecord: any,
  ): Promise<void> {
    try {
      // Create metadata for this event
      const metadata: RealtimeEventMetadata = {
        source: 'supabase',
        triggeredBy: 'database_trigger',
        timestamp: new Date().toISOString(),
        priority: await this.calculateEventPriority(
          table,
          eventType,
          newRecord,
        ),
        weddingId: this.extractWeddingId(table, newRecord),
        organizationId: this.extractOrganizationId(table, newRecord),
        correlationId: this.generateCorrelationId(),
      };

      // Determine event routing configuration
      const routingConfig = await this.getEventRoutingConfig(
        table,
        eventType,
        metadata,
      );

      // Execute all configured integrations in parallel
      const integrationPromises: Promise<void>[] = [];

      // Webhook integrations
      if (routingConfig.webhooks.enabled) {
        integrationPromises.push(
          this.webhookIntegration.handleDatabaseChange(
            table,
            eventType,
            oldRecord,
            newRecord,
            metadata,
          ),
        );
      }

      // Notification integrations
      if (routingConfig.notifications.enabled) {
        integrationPromises.push(
          this.routeNotificationEvent(
            table,
            eventType,
            oldRecord,
            newRecord,
            routingConfig.notifications,
            metadata,
          ),
        );
      }

      // External system integrations
      if (routingConfig.externalIntegrations.enabled) {
        integrationPromises.push(
          this.routeExternalIntegrations(
            table,
            eventType,
            oldRecord,
            newRecord,
            routingConfig.externalIntegrations,
            metadata,
          ),
        );
      }

      // Execute all integrations and collect results
      const results = await Promise.allSettled(integrationPromises);

      // Log integration results for monitoring
      await this.logEventRoutingResults(table, eventType, metadata, results);

      // Handle any critical failures
      await this.handleCriticalFailures(table, eventType, metadata, results);
    } catch (error) {
      console.error('Event routing error:', error);
      await this.logEventRoutingError(table, eventType, error);

      // Don't throw - routing failures shouldn't break the main application
    }
  }

  /**
   * Route notification events based on table and event type
   */
  private async routeNotificationEvent(
    table: string,
    eventType: string,
    oldRecord: any,
    newRecord: any,
    notificationConfig: NotificationConfig,
    metadata: RealtimeEventMetadata,
  ): Promise<void> {
    try {
      switch (table) {
        case 'form_responses':
          if (eventType === 'INSERT') {
            await this.notificationService.notifyFormResponse(
              newRecord.supplier_id,
              {
                responseId: newRecord.id,
                formId: newRecord.form_id,
                formName: newRecord.form_name || 'Client Form',
                clientId: newRecord.client_id,
                clientName: newRecord.client_name || 'Client',
                supplierId: newRecord.supplier_id,
                questionCount: newRecord.responses?.length || 0,
                submittedAt: newRecord.created_at,
                responses: newRecord.responses || [],
              },
            );
          }
          break;

        case 'journey_progress':
          if (
            eventType === 'UPDATE' &&
            this.hasSignificantProgressChange(oldRecord, newRecord)
          ) {
            await this.notificationService.notifyJourneyProgress(
              newRecord.supplier_id,
              {
                journeyId: newRecord.journey_id,
                stepId: newRecord.step_id,
                clientId: newRecord.client_id,
                clientName: newRecord.client_name || 'Client',
                supplierId: newRecord.supplier_id,
                milestoneName: newRecord.milestone_name || 'Progress Update',
                completionPercentage: newRecord.completion_percentage,
                completedAt: newRecord.updated_at,
                nextSteps: newRecord.next_steps || [],
              },
            );
          }
          break;

        case 'wedding_details':
        case 'weddings':
          if (eventType === 'UPDATE') {
            await this.handleWeddingDetailsUpdate(
              oldRecord,
              newRecord,
              metadata,
            );
          }
          break;

        case 'core_fields':
        case 'client_profiles':
          if (eventType === 'UPDATE') {
            await this.handleClientProfileUpdate(
              oldRecord,
              newRecord,
              metadata,
            );
          }
          break;

        case 'payments':
          if (eventType === 'INSERT') {
            await this.handlePaymentNotification(newRecord, metadata);
          }
          break;

        default:
          console.log(`No notification routing configured for table: ${table}`);
      }
    } catch (error) {
      console.error(
        `Notification routing error for ${table}.${eventType}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Route external system integrations
   */
  private async routeExternalIntegrations(
    table: string,
    eventType: string,
    oldRecord: any,
    newRecord: any,
    integrationConfig: ExternalIntegrationConfig,
    metadata: RealtimeEventMetadata,
  ): Promise<void> {
    const integrationPromises: Promise<void>[] = [];

    // Photography CRM integration
    if (
      integrationConfig.photographyCrm?.enabled &&
      this.shouldTriggerPhotographyIntegration(table, eventType, newRecord)
    ) {
      const weddingData = this.transformToWeddingEventData(newRecord, metadata);
      integrationPromises.push(
        this.webhookIntegration.integratePhotographyCRM(
          newRecord.supplier_id || newRecord.organization_id,
          weddingData,
        ),
      );
    }

    // Venue booking system integration
    if (
      integrationConfig.venueBooking?.enabled &&
      this.shouldTriggerVenueIntegration(table, eventType, newRecord)
    ) {
      const weddingData = this.transformToWeddingEventData(newRecord, metadata);
      integrationPromises.push(
        this.webhookIntegration.integrateVenueBookingSystem(
          newRecord.venue_id || newRecord.organization_id,
          weddingData,
        ),
      );
    }

    // Email platform integration
    if (
      integrationConfig.emailPlatform?.enabled &&
      this.shouldTriggerEmailIntegration(table, eventType, newRecord)
    ) {
      const emailData = this.transformToEmailTriggerData(newRecord, metadata);
      integrationPromises.push(
        this.webhookIntegration.integrateEmailPlatform(
          newRecord.supplier_id || newRecord.organization_id,
          emailData,
        ),
      );
    }

    await Promise.allSettled(integrationPromises);
  }

  /**
   * Handle wedding details updates with vendor coordination
   */
  private async handleWeddingDetailsUpdate(
    oldRecord: any,
    newRecord: any,
    metadata: RealtimeEventMetadata,
  ): Promise<void> {
    // Check for wedding date changes
    if (oldRecord.wedding_date !== newRecord.wedding_date) {
      const affectedVendors = await this.getAffectedVendorIds(newRecord.id);
      await this.notificationService.notifyWeddingDateChange(
        newRecord.id,
        oldRecord.wedding_date,
        newRecord.wedding_date,
        affectedVendors,
      );
    }

    // Check for venue changes
    if (oldRecord.venue_id !== newRecord.venue_id) {
      await this.handleVenueChange(oldRecord, newRecord, metadata);
    }

    // Check for timeline changes
    if (this.hasTimelineChanges(oldRecord, newRecord)) {
      await this.handleTimelineUpdate(oldRecord, newRecord, metadata);
    }
  }

  /**
   * Handle client profile updates
   */
  private async handleClientProfileUpdate(
    oldRecord: any,
    newRecord: any,
    metadata: RealtimeEventMetadata,
  ): Promise<void> {
    const updatedFields = this.getUpdatedFields(oldRecord, newRecord);
    const recipients = await this.getSupplierRecipients(
      newRecord.couple_id || newRecord.client_id,
    );

    if (recipients.length > 0) {
      await this.notificationService.sendRealtimeNotification(
        'CLIENT_PROFILE_UPDATED',
        {
          couple_id: newRecord.couple_id || newRecord.client_id,
          client_name:
            newRecord.first_name && newRecord.last_name
              ? `${newRecord.first_name} ${newRecord.last_name}`
              : 'Client',
          updated_fields: updatedFields,
          updated_at: newRecord.updated_at,
        },
        recipients,
      );
    }
  }

  /**
   * Handle payment notifications
   */
  private async handlePaymentNotification(
    newRecord: any,
    metadata: RealtimeEventMetadata,
  ): Promise<void> {
    const recipients = await this.getSupplierRecipients(newRecord.client_id);

    if (recipients.length > 0) {
      await this.notificationService.sendRealtimeNotification(
        'PAYMENT_RECEIVED',
        {
          client_id: newRecord.client_id,
          amount: newRecord.amount,
          currency: newRecord.currency || 'USD',
          payment_method: newRecord.payment_method,
          received_at: newRecord.created_at,
        },
        recipients,
      );
    }
  }

  /**
   * Calculate event priority based on context
   */
  private async calculateEventPriority(
    table: string,
    eventType: string,
    record: any,
  ): Promise<EventPriority> {
    // Wedding day events are always critical
    if (record.wedding_date && this.isWithin24Hours(record.wedding_date)) {
      return 'critical';
    }

    // Payment events are high priority
    if (table === 'payments') {
      return 'high';
    }

    // Wedding detail changes are high priority
    if (table === 'wedding_details' || table === 'weddings') {
      return 'high';
    }

    // Form responses and journey progress are normal priority
    if (table === 'form_responses' || table === 'journey_progress') {
      return 'normal';
    }

    return 'low';
  }

  /**
   * Event routing configuration based on table and event type
   */
  private async getEventRoutingConfig(
    table: string,
    eventType: string,
    metadata: RealtimeEventMetadata,
  ): Promise<EventRoutingConfig> {
    // Define routing rules for different tables and events
    const routingRules: Record<string, Record<string, any>> = {
      form_responses: {
        INSERT: {
          webhooks: { enabled: true },
          notifications: { enabled: true, channels: ['email', 'in_app'] },
          externalIntegrations: {
            enabled: true,
            photographyCrm: { enabled: true },
            emailPlatform: { enabled: true },
          },
        },
      },
      journey_progress: {
        UPDATE: {
          webhooks: { enabled: true },
          notifications: { enabled: true, channels: ['email', 'slack'] },
          externalIntegrations: {
            enabled: true,
            emailPlatform: { enabled: true },
          },
        },
      },
      wedding_details: {
        UPDATE: {
          webhooks: { enabled: true },
          notifications: {
            enabled: true,
            channels: ['email', 'slack', 'in_app'],
          },
          externalIntegrations: {
            enabled: true,
            photographyCrm: { enabled: true },
            venueBooking: { enabled: true },
          },
        },
      },
      payments: {
        INSERT: {
          webhooks: { enabled: true },
          notifications: { enabled: true, channels: ['email', 'in_app'] },
          externalIntegrations: {
            enabled: false,
          },
        },
      },
    };

    const defaultConfig = {
      webhooks: { enabled: false },
      notifications: { enabled: false },
      externalIntegrations: { enabled: false },
    };

    return routingRules[table]?.[eventType] || defaultConfig;
  }

  /**
   * Helper methods for integration triggers
   */

  private shouldTriggerPhotographyIntegration(
    table: string,
    eventType: string,
    record: any,
  ): boolean {
    const photographyTables = [
      'wedding_details',
      'form_responses',
      'journey_progress',
    ];
    return photographyTables.includes(table) && record.supplier_id;
  }

  private shouldTriggerVenueIntegration(
    table: string,
    eventType: string,
    record: any,
  ): boolean {
    const venueTables = ['wedding_details', 'weddings'];
    return venueTables.includes(table) && (record.venue_id || record.location);
  }

  private shouldTriggerEmailIntegration(
    table: string,
    eventType: string,
    record: any,
  ): boolean {
    const emailTables = ['journey_progress', 'form_responses'];
    return emailTables.includes(table);
  }

  private transformToWeddingEventData(
    record: any,
    metadata: RealtimeEventMetadata,
  ): WeddingEventData {
    return {
      weddingId: metadata.weddingId || record.wedding_id || record.id,
      coupleId: record.couple_id || record.client_id,
      brideName: record.bride_name || record.partner1_name || 'Bride',
      groomName: record.groom_name || record.partner2_name || 'Groom',
      weddingDate: record.wedding_date,
      ceremonyTime: record.ceremony_time,
      receptionTime: record.reception_time,
      setupTime: record.setup_time,
      venueName: record.venue_name || record.location,
      venueId: record.venue_id,
      guestCount: record.guest_count || 0,
      specialRequests: record.special_requests,
      dietaryRequirements: record.dietary_requirements,
      venueNotes: record.venue_notes,
      updatedAt: record.updated_at || metadata.timestamp,
    };
  }

  private transformToEmailTriggerData(
    record: any,
    metadata: RealtimeEventMetadata,
  ): EmailTriggerEventData {
    return {
      eventType: 'JOURNEY_MILESTONE_COMPLETED',
      recipientEmail: record.client_email,
      templateId: this.getEmailTemplateId(record),
      variables: {
        client_name: record.client_name,
        milestone_name: record.milestone_name,
        completion_date: record.completed_at,
      },
      priority: metadata.priority,
      weddingId: metadata.weddingId,
      organizationId: metadata.organizationId,
    };
  }

  /**
   * Utility methods
   */

  private hasSignificantProgressChange(
    oldRecord: any,
    newRecord: any,
  ): boolean {
    const oldProgress = oldRecord.completion_percentage || 0;
    const newProgress = newRecord.completion_percentage || 0;
    return Math.abs(newProgress - oldProgress) >= 25; // 25% change threshold
  }

  private hasTimelineChanges(oldRecord: any, newRecord: any): boolean {
    const timeFields = ['ceremony_time', 'reception_time', 'setup_time'];
    return timeFields.some((field) => oldRecord[field] !== newRecord[field]);
  }

  private getUpdatedFields(oldRecord: any, newRecord: any): string[] {
    const updatedFields: string[] = [];
    const importantFields = [
      'first_name',
      'last_name',
      'email',
      'phone',
      'address',
      'wedding_date',
    ];

    importantFields.forEach((field) => {
      if (oldRecord[field] !== newRecord[field]) {
        updatedFields.push(field);
      }
    });

    return updatedFields;
  }

  private async getAffectedVendorIds(weddingId: string): Promise<string[]> {
    try {
      const { data: vendors, error } = await this.supabase
        .from('wedding_vendors')
        .select('vendor_id')
        .eq('wedding_id', weddingId);

      if (error) {
        console.error('Error fetching affected vendors:', error);
        return [];
      }

      return vendors?.map((v) => v.vendor_id) || [];
    } catch (error) {
      console.error('Error in getAffectedVendorIds:', error);
      return [];
    }
  }

  private async getSupplierRecipients(
    clientId: string,
  ): Promise<NotificationRecipient[]> {
    try {
      const { data: suppliers, error } = await this.supabase
        .from('client_suppliers')
        .select(
          `
          supplier_id,
          suppliers (
            id,
            business_name,
            email,
            phone,
            notification_preferences
          )
        `,
        )
        .eq('client_id', clientId);

      if (error || !suppliers) {
        return [];
      }

      return suppliers.map((s) => ({
        id: s.supplier_id,
        name: s.suppliers.business_name,
        email: s.suppliers.email,
        phone: s.suppliers.phone,
        channels: s.suppliers.notification_preferences?.realtime_channels || [
          'email',
        ],
        preferences: s.suppliers.notification_preferences || {
          enabled: true,
          channels: ['email'],
          weddingDayOverride: true,
          emergencyBypass: true,
        },
      }));
    } catch (error) {
      console.error('Error in getSupplierRecipients:', error);
      return [];
    }
  }

  private extractWeddingId(table: string, record: any): string | undefined {
    return record.wedding_id || record.id;
  }

  private extractOrganizationId(table: string, record: any): string {
    return record.organization_id || record.supplier_id || 'unknown';
  }

  private generateCorrelationId(): string {
    return `rt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private isWithin24Hours(dateString: string): boolean {
    const date = new Date(dateString);
    const now = new Date();
    const hoursDiff =
      Math.abs(date.getTime() - now.getTime()) / (1000 * 60 * 60);
    return hoursDiff <= 24;
  }

  private getEmailTemplateId(record: any): string {
    if (record.milestone_name?.includes('contract'))
      return 'contract_milestone';
    if (record.milestone_name?.includes('payment')) return 'payment_milestone';
    return 'generic_milestone';
  }

  private async handleVenueChange(
    oldRecord: any,
    newRecord: any,
    metadata: RealtimeEventMetadata,
  ): Promise<void> {
    // Implementation for venue change notifications
    console.log('Venue change detected - implementing notification logic');
  }

  private async handleTimelineUpdate(
    oldRecord: any,
    newRecord: any,
    metadata: RealtimeEventMetadata,
  ): Promise<void> {
    // Implementation for timeline update notifications
    console.log('Timeline update detected - implementing notification logic');
  }

  private async logEventRoutingResults(
    table: string,
    eventType: string,
    metadata: RealtimeEventMetadata,
    results: PromiseSettledResult<void>[],
  ): Promise<void> {
    try {
      const successCount = results.filter(
        (r) => r.status === 'fulfilled',
      ).length;
      const failureCount = results.length - successCount;

      await this.supabase.from('event_routing_logs').insert({
        table_name: table,
        event_type: eventType,
        correlation_id: metadata.correlationId,
        success_count: successCount,
        failure_count: failureCount,
        priority: metadata.priority,
        logged_at: metadata.timestamp,
      });
    } catch (error) {
      console.error('Failed to log event routing results:', error);
    }
  }

  private async logEventRoutingError(
    table: string,
    eventType: string,
    error: any,
  ): Promise<void> {
    try {
      await this.supabase.from('event_routing_error_logs').insert({
        table_name: table,
        event_type: eventType,
        error_message: error instanceof Error ? error.message : String(error),
        error_details: error instanceof Error ? error.stack : undefined,
        logged_at: new Date().toISOString(),
      });
    } catch (logError) {
      console.error('Failed to log event routing error:', logError);
    }
  }

  private async handleCriticalFailures(
    table: string,
    eventType: string,
    metadata: RealtimeEventMetadata,
    results: PromiseSettledResult<void>[],
  ): Promise<void> {
    const failures = results.filter((r) => r.status === 'rejected');

    if (failures.length > 0 && metadata.priority === 'critical') {
      console.error(
        `Critical event routing failures for ${table}.${eventType}:`,
        failures,
      );
      // Implement alerting logic for critical failures
    }
  }
}
