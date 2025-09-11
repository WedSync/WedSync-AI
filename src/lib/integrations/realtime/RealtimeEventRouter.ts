import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { RealtimeWebhookIntegration } from './RealtimeWebhookIntegration';
import { RealtimeNotificationService } from './RealtimeNotificationService';
import type {
  EventRoutingConfig,
  NotificationConfig,
  ExternalIntegrationConfig,
  RealtimeEventMetadata,
  IntegrationHealthMetrics,
  RealtimeEventType,
  NotificationRecipient,
} from '@/types/realtime-integration';

export class RealtimeEventRouter {
  private supabase: SupabaseClient;
  private webhookIntegration: RealtimeWebhookIntegration;
  private notificationService: RealtimeNotificationService;
  private healthMonitor: IntegrationHealthMonitor;

  constructor(
    supabaseClient: SupabaseClient,
    webhookIntegration: RealtimeWebhookIntegration,
    notificationService: RealtimeNotificationService,
    healthMonitor: IntegrationHealthMonitor,
  ) {
    this.supabase = supabaseClient;
    this.webhookIntegration = webhookIntegration;
    this.notificationService = notificationService;
    this.healthMonitor = healthMonitor;
  }

  // Route database changes to appropriate integrations
  async routeRealtimeEvent(
    table: string,
    eventType: 'INSERT' | 'UPDATE' | 'DELETE',
    oldRecord: any,
    newRecord: any,
    metadata?: RealtimeEventMetadata,
  ): Promise<void> {
    try {
      console.log(`Routing realtime event: ${table}.${eventType}`);

      // Determine event routing based on table and data
      const routingConfig = await this.getEventRoutingConfig(table, eventType);

      if (!routingConfig) {
        console.log(`No routing configuration found for ${table}.${eventType}`);
        return;
      }

      // Check if event should be processed (rate limiting, filters, etc.)
      if (
        !(await this.shouldProcessEvent(table, eventType, newRecord, metadata))
      ) {
        console.log(`Event filtered out: ${table}.${eventType}`);
        return;
      }

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
            metadata || this.createDefaultMetadata(table, eventType),
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
          ),
        );
      }

      // Execute all integrations and monitor health
      const results = await Promise.allSettled(integrationPromises);

      // Monitor integration health
      await this.healthMonitor.recordIntegrationResults(
        table,
        eventType,
        results,
      );

      // Log routing results
      const successCount = results.filter(
        (r) => r.status === 'fulfilled',
      ).length;
      const failureCount = results.filter(
        (r) => r.status === 'rejected',
      ).length;

      if (failureCount > 0) {
        console.warn(
          `Event routing completed with ${failureCount} failures for ${table}.${eventType}`,
        );

        // Log failures for analysis
        const failures = results.filter(
          (r) => r.status === 'rejected',
        ) as PromiseRejectedResult[];
        failures.forEach((failure) => {
          console.error('Integration failure:', failure.reason);
        });
      } else {
        console.log(
          `Event routing successful: ${successCount} integrations processed for ${table}.${eventType}`,
        );
      }
    } catch (error) {
      console.error('Event routing error:', error);
      await this.healthMonitor.recordIntegrationError(table, eventType, error);
    }
  }

  // Route notification events based on table and event type
  private async routeNotificationEvent(
    table: string,
    eventType: string,
    oldRecord: any,
    newRecord: any,
    notificationConfig: NotificationConfig,
  ): Promise<void> {
    try {
      // Determine the notification type and recipients based on the table and event
      const notificationRouting = await this.getNotificationRouting(
        table,
        eventType,
        newRecord,
      );

      if (!notificationRouting) {
        console.log(`No notification routing for ${table}.${eventType}`);
        return;
      }

      const { realtimeEventType, recipients, eventData } = notificationRouting;

      // Send notification if we have recipients
      if (recipients.length > 0) {
        await this.notificationService.sendRealtimeNotification(
          realtimeEventType,
          eventData,
          recipients,
        );
      }
    } catch (error) {
      console.error('Notification routing error:', error);
      throw error;
    }
  }

  // Determine notification routing based on table and event
  private async getNotificationRouting(
    table: string,
    eventType: string,
    record: any,
  ): Promise<{
    realtimeEventType: keyof RealtimeEventType;
    recipients: NotificationRecipient[];
    eventData: any;
  } | null> {
    switch (table) {
      case 'form_responses':
        if (eventType === 'INSERT') {
          const recipients = await this.getSupplierRecipients(
            record.supplier_id,
          );
          return {
            realtimeEventType: 'FORM_RESPONSE_RECEIVED',
            recipients,
            eventData: {
              client_name: record.client_name,
              form_name: record.form_name,
              submitted_at: record.submitted_at,
              response_count: record.question_count || 0,
            },
          };
        }
        break;

      case 'journey_progress':
        if (
          eventType === 'UPDATE' &&
          record.completion_percentage > (record.old_completion_percentage || 0)
        ) {
          const recipients = await this.getSupplierRecipients(
            record.supplier_id,
          );
          return {
            realtimeEventType: 'JOURNEY_MILESTONE_COMPLETED',
            recipients,
            eventData: {
              client_name: record.client_name,
              milestone_name: record.milestone_name,
              completion_percentage: record.completion_percentage,
              completed_at: record.updated_at,
            },
          };
        }
        break;

      case 'weddings':
        if (
          eventType === 'UPDATE' &&
          record.wedding_date !== record.old_wedding_date
        ) {
          const recipients = await this.getWeddingVendorRecipients(record.id);
          return {
            realtimeEventType: 'WEDDING_DATE_CHANGE',
            recipients,
            eventData: {
              wedding_id: record.id,
              old_date: record.old_wedding_date,
              new_date: record.wedding_date,
              couple_names: `${record.bride_name} & ${record.groom_name}`,
              venue_name: record.venue_name,
            },
          };
        }
        break;

      case 'clients':
        if (eventType === 'UPDATE') {
          const changedFields = this.getUpdatedFields(
            record,
            record.old_record || {},
          );
          if (changedFields.length > 0) {
            const recipients = await this.getClientSupplierRecipients(
              record.id,
            );
            return {
              realtimeEventType: 'CLIENT_PROFILE_UPDATED',
              recipients,
              eventData: {
                client_id: record.id,
                client_name: `${record.first_name} ${record.last_name}`,
                updated_fields: changedFields,
                updated_at: record.updated_at,
              },
            };
          }
        }
        break;

      case 'payments':
        if (eventType === 'INSERT') {
          const recipients = await this.getPaymentRecipients(
            record.organization_id,
            record.client_id,
          );
          return {
            realtimeEventType: 'PAYMENT_RECEIVED',
            recipients,
            eventData: {
              amount: record.amount,
              currency: record.currency,
              client_name: record.client_name,
              service_type: record.service_type,
              payment_date: record.created_at,
            },
          };
        }
        break;

      case 'wedding_emergencies':
        if (eventType === 'INSERT') {
          const recipients = await this.getEmergencyRecipients(
            record.wedding_id,
          );
          return {
            realtimeEventType: 'EMERGENCY_ALERT',
            recipients,
            eventData: {
              wedding_id: record.wedding_id,
              emergency_type: record.emergency_type,
              severity: record.severity,
              title: record.title,
              description: record.description,
              reported_at: record.created_at,
            },
          };
        }
        break;

      default:
        return null;
    }

    return null;
  }

  // Route external system integrations
  private async routeExternalIntegrations(
    table: string,
    eventType: string,
    oldRecord: any,
    newRecord: any,
    integrationConfig: ExternalIntegrationConfig,
  ): Promise<void> {
    const integrationPromises: Promise<void>[] = [];

    // Photography CRM integration
    if (
      integrationConfig.photographyCrm?.enabled &&
      this.shouldTriggerPhotographyIntegration(table, eventType, newRecord)
    ) {
      const eventData = this.transformToWeddingEventData(newRecord);
      integrationPromises.push(
        this.webhookIntegration.integratePhotographyCRM(
          newRecord.supplier_id || newRecord.organization_id,
          eventData,
        ),
      );
    }

    // Venue booking system integration
    if (
      integrationConfig.venueBooking?.enabled &&
      this.shouldTriggerVenueIntegration(table, eventType, newRecord)
    ) {
      const eventData = this.transformToWeddingEventData(newRecord);
      integrationPromises.push(
        this.webhookIntegration.integrateVenueBookingSystem(
          newRecord.venue_id || newRecord.supplier_id,
          eventData,
        ),
      );
    }

    // Email platform integration
    if (
      integrationConfig.emailPlatform?.enabled &&
      this.shouldTriggerEmailIntegration(table, eventType, newRecord)
    ) {
      const eventData = this.transformToEmailTriggerData(newRecord);
      integrationPromises.push(
        this.webhookIntegration.integrateEmailPlatform(
          newRecord.supplier_id || newRecord.organization_id,
          eventData,
        ),
      );
    }

    if (integrationPromises.length > 0) {
      await Promise.all(integrationPromises);
    }
  }

  // Event routing configuration based on table and event type
  private async getEventRoutingConfig(
    table: string,
    eventType: string,
  ): Promise<EventRoutingConfig | null> {
    // Check for custom routing configuration in database
    const { data: customConfig } = await this.supabase
      .from('event_routing_configs')
      .select('*')
      .eq('table_name', table)
      .eq('event_type', eventType)
      .eq('is_active', true)
      .single();

    if (customConfig) {
      return customConfig.routing_config;
    }

    // Fall back to default routing rules
    const routingRules: Record<string, Record<string, EventRoutingConfig>> = {
      form_responses: {
        INSERT: {
          webhooks: { enabled: true },
          notifications: {
            enabled: true,
            channels: ['email', 'in_app'],
            recipients: [],
          },
          externalIntegrations: {
            enabled: true,
            photographyCrm: { enabled: true },
            venueBooking: { enabled: false },
            emailPlatform: { enabled: true },
          },
          metadata: this.createDefaultMetadata(table, eventType),
        },
      },
      journey_progress: {
        UPDATE: {
          webhooks: { enabled: true },
          notifications: {
            enabled: true,
            channels: ['email', 'slack'],
            recipients: [],
          },
          externalIntegrations: {
            enabled: true,
            photographyCrm: { enabled: true },
            venueBooking: { enabled: false },
            emailPlatform: { enabled: true },
          },
          metadata: this.createDefaultMetadata(table, eventType),
        },
      },
      weddings: {
        UPDATE: {
          webhooks: { enabled: true },
          notifications: {
            enabled: true,
            channels: ['email', 'slack', 'sms'],
            recipients: [],
          },
          externalIntegrations: {
            enabled: true,
            photographyCrm: { enabled: true },
            venueBooking: { enabled: true },
            emailPlatform: { enabled: true },
          },
          metadata: this.createDefaultMetadata(table, eventType),
        },
      },
      clients: {
        UPDATE: {
          webhooks: { enabled: true },
          notifications: {
            enabled: true,
            channels: ['email', 'in_app'],
            recipients: [],
          },
          externalIntegrations: {
            enabled: true,
            photographyCrm: { enabled: true },
            venueBooking: { enabled: true },
            emailPlatform: { enabled: false },
          },
          metadata: this.createDefaultMetadata(table, eventType),
        },
      },
      payments: {
        INSERT: {
          webhooks: { enabled: true },
          notifications: {
            enabled: true,
            channels: ['email', 'in_app'],
            recipients: [],
          },
          externalIntegrations: {
            enabled: false,
            photographyCrm: { enabled: false },
            venueBooking: { enabled: false },
            emailPlatform: { enabled: false },
          },
          metadata: this.createDefaultMetadata(table, eventType),
        },
      },
      wedding_emergencies: {
        INSERT: {
          webhooks: { enabled: true },
          notifications: {
            enabled: true,
            channels: ['email', 'slack', 'sms', 'in_app'],
            recipients: [],
          },
          externalIntegrations: {
            enabled: true,
            photographyCrm: { enabled: true },
            venueBooking: { enabled: true },
            emailPlatform: { enabled: false },
          },
          metadata: this.createDefaultMetadata(table, eventType),
        },
      },
    };

    return routingRules[table]?.[eventType] || null;
  }

  // Event filtering and validation
  private async shouldProcessEvent(
    table: string,
    eventType: string,
    record: any,
    metadata?: RealtimeEventMetadata,
  ): Promise<boolean> {
    // Skip if no significant changes for UPDATE events
    if (eventType === 'UPDATE' && !this.hasSignificantChanges(table, record)) {
      return false;
    }

    // Check if event is from a valid organization
    const organizationId = record.organization_id || metadata?.organizationId;
    if (!organizationId) {
      console.warn('No organization ID found for event, skipping processing');
      return false;
    }

    // Check organization's event processing preferences
    const { data: orgPrefs } = await this.supabase
      .from('organization_integration_preferences')
      .select('realtime_events_enabled, blocked_events')
      .eq('organization_id', organizationId)
      .single();

    if (orgPrefs) {
      if (!orgPrefs.realtime_events_enabled) {
        return false;
      }

      if (orgPrefs.blocked_events?.includes(`${table}.${eventType}`)) {
        return false;
      }
    }

    // Rate limiting check
    if (!(await this.checkRateLimit(table, eventType, organizationId))) {
      console.warn(
        `Rate limit exceeded for ${table}.${eventType} in organization ${organizationId}`,
      );
      return false;
    }

    // Saturday/Wedding day special handling
    if (this.isWeddingDay(record)) {
      console.log('Wedding day mode: Processing all events with high priority');
      return true;
    }

    return true;
  }

  // Helper methods for integration triggers
  private shouldTriggerPhotographyIntegration(
    table: string,
    eventType: string,
    record: any,
  ): boolean {
    const photographyTables = [
      'form_responses',
      'clients',
      'weddings',
      'journey_progress',
    ];
    return (
      photographyTables.includes(table) &&
      (record.supplier_id || record.organization_id)
    );
  }

  private shouldTriggerVenueIntegration(
    table: string,
    eventType: string,
    record: any,
  ): boolean {
    const venueTables = ['weddings', 'clients'];
    return (
      venueTables.includes(table) && (record.venue_id || record.venue_name)
    );
  }

  private shouldTriggerEmailIntegration(
    table: string,
    eventType: string,
    record: any,
  ): boolean {
    const emailTriggerTables = [
      'form_responses',
      'journey_progress',
      'payments',
    ];
    return (
      emailTriggerTables.includes(table) &&
      (record.supplier_id || record.organization_id)
    );
  }

  // Data transformation methods
  private transformToWeddingEventData(record: any): any {
    return {
      wedding_id: record.wedding_id || record.id,
      bride_name: record.bride_name || record.client_name?.split(' ')[0],
      groom_name: record.groom_name || record.partner_name,
      wedding_date: record.wedding_date,
      ceremony_time: record.ceremony_time,
      reception_time: record.reception_time,
      venue_name: record.venue_name,
      guest_count: record.guest_count,
      special_requests: record.special_requests || record.notes,
      updated_at: record.updated_at || new Date().toISOString(),
    };
  }

  private transformToEmailTriggerData(record: any): any {
    return {
      trigger_type: this.getEmailTriggerType(record),
      client_email: record.client_email || record.email,
      client_first_name: record.client_first_name || record.first_name,
      client_last_name: record.client_last_name || record.last_name,
      wedding_date: record.wedding_date,
      milestone_name: record.milestone_name,
      form_name: record.form_name,
    };
  }

  private getEmailTriggerType(record: any): string {
    if (record.form_name) return 'form_submitted';
    if (record.milestone_name) return 'milestone_completed';
    if (record.amount) return 'payment_received';
    return 'profile_updated';
  }

  // Recipient retrieval methods
  private async getSupplierRecipients(
    supplierId: string,
  ): Promise<NotificationRecipient[]> {
    const { data: supplier } = await this.supabase
      .from('suppliers')
      .select('id, business_name, email, phone, notification_preferences')
      .eq('id', supplierId)
      .single();

    if (!supplier) return [];

    return [
      {
        id: supplier.id,
        name: supplier.business_name,
        email: supplier.email,
        phone: supplier.phone,
        channels: supplier.notification_preferences?.realtime_channels || [
          'email',
          'in_app',
        ],
        preferences: {
          enabled: true,
          channels: supplier.notification_preferences?.realtime_channels || [
            'email',
            'in_app',
          ],
          weddingDayOverride:
            supplier.notification_preferences?.wedding_day_override || true,
          emergencyBypass:
            supplier.notification_preferences?.emergency_bypass || true,
        },
      },
    ];
  }

  private async getWeddingVendorRecipients(
    weddingId: string,
  ): Promise<NotificationRecipient[]> {
    const { data: vendors } = await this.supabase
      .from('wedding_vendors')
      .select(
        `
        vendors (
          id,
          business_name,
          email,
          phone,
          notification_preferences
        )
      `,
      )
      .eq('wedding_id', weddingId);

    if (!vendors) return [];

    return vendors.map((vendor) => ({
      id: vendor.vendors.id,
      name: vendor.vendors.business_name,
      email: vendor.vendors.email,
      phone: vendor.vendors.phone,
      channels: vendor.vendors.notification_preferences?.realtime_channels || [
        'email',
        'in_app',
      ],
      preferences: {
        enabled: true,
        channels: vendor.vendors.notification_preferences
          ?.realtime_channels || ['email', 'in_app'],
        weddingDayOverride: true, // Always notify on wedding date changes
        emergencyBypass: true,
      },
    }));
  }

  private async getClientSupplierRecipients(
    clientId: string,
  ): Promise<NotificationRecipient[]> {
    // Get all suppliers working with this client
    const { data: clientSuppliers } = await this.supabase
      .from('client_suppliers')
      .select(
        `
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

    if (!clientSuppliers) return [];

    return clientSuppliers.map((cs) => ({
      id: cs.suppliers.id,
      name: cs.suppliers.business_name,
      email: cs.suppliers.email,
      phone: cs.suppliers.phone,
      channels: cs.suppliers.notification_preferences?.realtime_channels || [
        'email',
      ],
      preferences: {
        enabled: true,
        channels: cs.suppliers.notification_preferences?.realtime_channels || [
          'email',
        ],
        weddingDayOverride: false,
        emergencyBypass: false,
      },
    }));
  }

  private async getPaymentRecipients(
    organizationId: string,
    clientId?: string,
  ): Promise<NotificationRecipient[]> {
    // Get organization members who should be notified of payments
    const { data: orgMembers } = await this.supabase
      .from('organization_members')
      .select(
        `
        users (
          id,
          first_name,
          last_name,
          email,
          notification_preferences
        )
      `,
      )
      .eq('organization_id', organizationId)
      .eq('role', 'owner'); // Only notify owners of payments

    if (!orgMembers) return [];

    return orgMembers.map((member) => ({
      id: member.users.id,
      name: `${member.users.first_name} ${member.users.last_name}`,
      email: member.users.email,
      channels: ['email', 'in_app'], // Payment notifications via email and in-app
      preferences: {
        enabled: true,
        channels: ['email', 'in_app'],
        weddingDayOverride: false,
        emergencyBypass: false,
      },
    }));
  }

  private async getEmergencyRecipients(
    weddingId: string,
  ): Promise<NotificationRecipient[]> {
    // Get all vendors and key contacts for emergency notifications
    const recipients = await this.getWeddingVendorRecipients(weddingId);

    // Override preferences for emergency notifications
    return recipients.map((recipient) => ({
      ...recipient,
      channels: ['email', 'sms', 'slack', 'in_app'], // All channels for emergencies
      preferences: {
        ...recipient.preferences,
        emergencyBypass: true,
        weddingDayOverride: true,
      },
    }));
  }

  // Utility methods
  private createDefaultMetadata(
    table: string,
    eventType: string,
  ): RealtimeEventMetadata {
    return {
      source: 'supabase',
      triggeredBy: 'system',
      timestamp: new Date().toISOString(),
      priority: 'normal',
      organizationId: '', // Will be populated from record
      correlationId: crypto.randomUUID(),
    };
  }

  private hasSignificantChanges(table: string, record: any): boolean {
    // Define which fields constitute significant changes for each table
    const significantFields: Record<string, string[]> = {
      weddings: ['wedding_date', 'venue_name', 'ceremony_time', 'guest_count'],
      clients: ['email', 'phone', 'first_name', 'last_name'],
      suppliers: ['email', 'phone', 'business_name'],
      journey_progress: ['completion_percentage', 'status'],
    };

    const fields = significantFields[table] || [];

    // Check if any significant field changed
    return fields.some((field) => {
      const oldValue = record[`old_${field}`] || record.old_record?.[field];
      const newValue = record[field];
      return oldValue !== newValue;
    });
  }

  private getUpdatedFields(newRecord: any, oldRecord: any): string[] {
    const updatedFields: string[] = [];

    for (const [key, newValue] of Object.entries(newRecord)) {
      const oldValue = oldRecord[key];
      if (
        oldValue !== newValue &&
        !key.startsWith('old_') &&
        !key.includes('_at')
      ) {
        updatedFields.push(key);
      }
    }

    return updatedFields;
  }

  private isWeddingDay(record: any): boolean {
    if (!record.wedding_date) return false;

    const weddingDate = new Date(record.wedding_date);
    const today = new Date();

    // Check if wedding is today
    return weddingDate.toDateString() === today.toDateString();
  }

  private async checkRateLimit(
    table: string,
    eventType: string,
    organizationId: string,
  ): Promise<boolean> {
    // Simple rate limiting check - in production, use Redis or similar
    const key = `rate_limit:${organizationId}:${table}:${eventType}`;
    const limit = 100; // 100 events per minute per table per organization
    const window = 60 * 1000; // 1 minute

    // For now, always return true - implement proper rate limiting
    return true;
  }
}
