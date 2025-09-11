/**
 * WS-165: Vendor Payment Sync Integration Service
 * Handles synchronization with various vendor payment systems and supplier communication
 * Team C Integration Implementation
 */

import { BaseIntegrationService } from './BaseIntegrationService';
import {
  IntegrationConfig,
  IntegrationCredentials,
  IntegrationResponse,
  HealthCheck,
  IntegrationError,
  ErrorCategory,
  ErrorSeverity,
} from '@/types/integrations';
import { createClient } from '@supabase/supabase-js';

export interface VendorPaymentData {
  vendorId: string;
  weddingId: string;
  paymentSchedule: PaymentScheduleItem[];
  totalAmount: number;
  currency: string;
  status: 'pending' | 'confirmed' | 'paid' | 'overdue' | 'cancelled';
  contractReference?: string;
  communicationLog: VendorCommunication[];
  lastSyncAt: Date;
}

export interface PaymentScheduleItem {
  id: string;
  description: string;
  amount: number;
  dueDate: Date;
  status: 'pending' | 'paid' | 'overdue' | 'cancelled';
  paymentMethod?: string;
  confirmationRequired: boolean;
  remindersSent: number;
  lastReminderAt?: Date;
}

export interface VendorCommunication {
  id: string;
  type: 'email' | 'sms' | 'call' | 'webhook' | 'manual';
  direction: 'inbound' | 'outbound';
  subject?: string;
  content: string;
  timestamp: Date;
  status: 'sent' | 'delivered' | 'read' | 'failed';
  metadata?: Record<string, any>;
}

export interface VendorIntegrationAdapter {
  type: 'api' | 'email' | 'webhook' | 'manual';
  name: string;
  config: Record<string, any>;
  enabled: boolean;
  supportedOperations: ('sync' | 'notify' | 'confirm' | 'update')[];
}

export interface WebhookPayload {
  vendorId: string;
  eventType:
    | 'payment_received'
    | 'payment_failed'
    | 'schedule_updated'
    | 'communication_received';
  data: Record<string, any>;
  timestamp: Date;
  signature?: string;
}

export class VendorPaymentSyncService extends BaseIntegrationService {
  protected serviceName = 'VendorPaymentSync';
  private supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );

  private adapters = new Map<string, VendorIntegrationAdapter>();

  constructor(config: IntegrationConfig, credentials: IntegrationCredentials) {
    super(config, credentials);
    this.initializeAdapters();
  }

  private initializeAdapters(): void {
    // Common vendor integration adapters
    const defaultAdapters: VendorIntegrationAdapter[] = [
      {
        type: 'api',
        name: 'QuickBooks API',
        config: {
          baseUrl: 'https://api.intuit.com/v3',
          scopes: ['com.intuit.quickbooks.accounting'],
        },
        enabled: !!process.env.QUICKBOOKS_CLIENT_ID,
        supportedOperations: ['sync', 'notify', 'update'],
      },
      {
        type: 'api',
        name: 'Stripe Connect',
        config: {
          baseUrl: 'https://api.stripe.com/v1',
          version: '2023-10-16',
        },
        enabled: !!process.env.STRIPE_SECRET_KEY,
        supportedOperations: ['sync', 'notify', 'confirm'],
      },
      {
        type: 'webhook',
        name: 'Generic Webhook',
        config: {
          endpoint: '/api/webhooks/vendor-payments',
          supportedEvents: [
            'payment_received',
            'payment_failed',
            'schedule_updated',
          ],
        },
        enabled: true,
        supportedOperations: ['sync', 'notify'],
      },
      {
        type: 'email',
        name: 'Email Integration',
        config: {
          processingRules: {
            subject_patterns: ['payment', 'invoice', 'due', 'confirmed'],
            from_patterns: ['vendor', 'supplier', 'invoice'],
          },
        },
        enabled: true,
        supportedOperations: ['sync', 'notify'],
      },
      {
        type: 'manual',
        name: 'Manual Entry',
        config: {
          approval_required: true,
          audit_trail: true,
        },
        enabled: true,
        supportedOperations: ['sync', 'update', 'confirm'],
      },
    ];

    defaultAdapters.forEach((adapter) => {
      this.adapters.set(adapter.name, adapter);
    });
  }

  // Core Integration Methods
  async validateConnection(): Promise<boolean> {
    try {
      // Test database connection
      const { error } = await this.supabase
        .from('vendor_payment_sync')
        .select('id')
        .limit(1);

      return !error;
    } catch {
      return false;
    }
  }

  async refreshToken(): Promise<string> {
    // Implementation depends on specific vendor APIs
    // For now, return existing token
    return this.credentials.accessToken || this.credentials.apiKey;
  }

  protected async makeRequest(
    endpoint: string,
    options?: any,
  ): Promise<IntegrationResponse> {
    try {
      const response = await fetch(`${this.config.apiUrl}${endpoint}`, {
        ...options,
        headers: {
          Authorization: `Bearer ${this.credentials.accessToken}`,
          'Content-Type': 'application/json',
          ...options?.headers,
        },
      });

      const data = await response.json();

      return {
        success: response.ok,
        data,
        error: response.ok ? undefined : data.message,
      };
    } catch (error) {
      throw new IntegrationError(
        `Request failed: ${error}`,
        'REQUEST_FAILED',
        ErrorCategory.EXTERNAL_API,
        error as Error,
      );
    }
  }

  /**
   * Synchronize payment data with vendor systems
   */
  async syncVendorPayments(
    weddingId: string,
    vendorIds?: string[],
  ): Promise<{
    success: boolean;
    syncedVendors: number;
    errors: Array<{ vendorId: string; error: string }>;
    syncTimestamp: Date;
  }> {
    try {
      const startTime = Date.now();
      let syncedCount = 0;
      const errors: Array<{ vendorId: string; error: string }> = [];

      // Get vendors to sync
      const { data: vendors, error: vendorError } = await this.supabase
        .from('vendors')
        .select('id, name, contact_email, integration_config')
        .eq('wedding_id', weddingId)
        .in('id', vendorIds || [])
        .not('integration_config', 'is', null);

      if (vendorError) {
        throw new Error(`Failed to fetch vendors: ${vendorError.message}`);
      }

      if (!vendors?.length) {
        return {
          success: true,
          syncedVendors: 0,
          errors: [],
          syncTimestamp: new Date(),
        };
      }

      // Sync each vendor
      for (const vendor of vendors) {
        try {
          const integrationConfig = vendor.integration_config;
          const adapter = this.adapters.get(integrationConfig.adapter_name);

          if (!adapter || !adapter.enabled) {
            errors.push({
              vendorId: vendor.id,
              error: `Adapter not available: ${integrationConfig.adapter_name}`,
            });
            continue;
          }

          const vendorPaymentData = await this.syncSingleVendor(
            vendor,
            adapter,
          );

          if (vendorPaymentData) {
            await this.saveVendorPaymentData(vendorPaymentData);
            syncedCount++;

            // Trigger payment reminder notifications if needed
            await this.checkAndScheduleReminders(vendorPaymentData);
          }
        } catch (error) {
          errors.push({
            vendorId: vendor.id,
            error:
              error instanceof Error ? error.message : 'Unknown sync error',
          });
        }
      }

      const syncResult = {
        success: errors.length < vendors.length,
        syncedVendors: syncedCount,
        errors,
        syncTimestamp: new Date(),
      };

      // Log sync result
      await this.supabase.from('vendor_sync_logs').insert({
        wedding_id: weddingId,
        vendors_attempted: vendors.length,
        vendors_synced: syncedCount,
        errors_count: errors.length,
        sync_duration_ms: Date.now() - startTime,
        sync_timestamp: new Date().toISOString(),
        metadata: { errors },
      });

      return syncResult;
    } catch (error) {
      console.error('Vendor sync failed:', error);
      return {
        success: false,
        syncedVendors: 0,
        errors: [
          {
            vendorId: 'all',
            error: error instanceof Error ? error.message : 'Sync failed',
          },
        ],
        syncTimestamp: new Date(),
      };
    }
  }

  private async syncSingleVendor(
    vendor: any,
    adapter: VendorIntegrationAdapter,
  ): Promise<VendorPaymentData | null> {
    switch (adapter.type) {
      case 'api':
        return await this.syncVendorViaAPI(vendor, adapter);
      case 'webhook':
        return await this.syncVendorViaWebhook(vendor, adapter);
      case 'email':
        return await this.syncVendorViaEmail(vendor, adapter);
      case 'manual':
        return await this.syncVendorManually(vendor, adapter);
      default:
        throw new Error(`Unsupported adapter type: ${adapter.type}`);
    }
  }

  private async syncVendorViaAPI(
    vendor: any,
    adapter: VendorIntegrationAdapter,
  ): Promise<VendorPaymentData | null> {
    try {
      // Make API request to vendor system
      const response = await this.makeRequestWithRetry(
        `/vendors/${vendor.id}/payments`,
        { method: 'GET' },
      );

      if (!response.success) {
        throw new Error(`API sync failed: ${response.error}`);
      }

      // Transform API response to our data format
      const paymentData: VendorPaymentData = {
        vendorId: vendor.id,
        weddingId: vendor.wedding_id,
        paymentSchedule:
          response.data.schedule?.map((item: any) => ({
            id: item.id,
            description: item.description || 'Payment',
            amount: item.amount,
            dueDate: new Date(item.due_date),
            status: item.status || 'pending',
            paymentMethod: item.payment_method,
            confirmationRequired: item.confirmation_required || false,
            remindersSent: 0,
            lastReminderAt: undefined,
          })) || [],
        totalAmount: response.data.total_amount || 0,
        currency: response.data.currency || 'USD',
        status: response.data.status || 'pending',
        contractReference: response.data.contract_reference,
        communicationLog: [],
        lastSyncAt: new Date(),
      };

      return paymentData;
    } catch (error) {
      console.error(`API sync failed for vendor ${vendor.id}:`, error);
      return null;
    }
  }

  private async syncVendorViaWebhook(
    vendor: any,
    adapter: VendorIntegrationAdapter,
  ): Promise<VendorPaymentData | null> {
    // Webhook sync relies on receiving webhook data
    // For now, return existing data from database
    const { data } = await this.supabase
      .from('vendor_payment_sync')
      .select('*')
      .eq('vendor_id', vendor.id)
      .single();

    return data || null;
  }

  private async syncVendorViaEmail(
    vendor: any,
    adapter: VendorIntegrationAdapter,
  ): Promise<VendorPaymentData | null> {
    // Email parsing would extract payment information from emails
    // This is a complex implementation - for now return null
    return null;
  }

  private async syncVendorManually(
    vendor: any,
    adapter: VendorIntegrationAdapter,
  ): Promise<VendorPaymentData | null> {
    // Manual entry requires UI interaction - return existing data
    const { data } = await this.supabase
      .from('vendor_payment_sync')
      .select('*')
      .eq('vendor_id', vendor.id)
      .single();

    return data || null;
  }

  private async saveVendorPaymentData(
    paymentData: VendorPaymentData,
  ): Promise<void> {
    // Save or update vendor payment data
    const { error } = await this.supabase
      .from('vendor_payment_sync')
      .upsert({
        vendor_id: paymentData.vendorId,
        wedding_id: paymentData.weddingId,
        payment_schedule: paymentData.paymentSchedule,
        total_amount: paymentData.totalAmount,
        currency: paymentData.currency,
        status: paymentData.status,
        contract_reference: paymentData.contractReference,
        communication_log: paymentData.communicationLog,
        last_sync_at: paymentData.lastSyncAt.toISOString(),
      })
      .eq('vendor_id', paymentData.vendorId);

    if (error) {
      throw new Error(`Failed to save payment data: ${error.message}`);
    }
  }

  /**
   * Process incoming webhooks from vendor systems
   */
  async processWebhook(
    payload: WebhookPayload,
    signature?: string,
  ): Promise<{
    success: boolean;
    processed: boolean;
    message: string;
  }> {
    try {
      // Verify webhook signature if provided
      if (
        signature &&
        !(await this.verifyWebhookSignature(payload, signature))
      ) {
        throw new IntegrationError(
          'Invalid webhook signature',
          'WEBHOOK_VERIFICATION_FAILED',
          ErrorCategory.AUTHENTICATION,
        );
      }

      // Process based on event type
      let processed = false;
      let message = '';

      switch (payload.eventType) {
        case 'payment_received':
          processed = await this.handlePaymentReceived(payload);
          message = 'Payment confirmation processed';
          break;
        case 'payment_failed':
          processed = await this.handlePaymentFailed(payload);
          message = 'Payment failure processed';
          break;
        case 'schedule_updated':
          processed = await this.handleScheduleUpdated(payload);
          message = 'Payment schedule updated';
          break;
        case 'communication_received':
          processed = await this.handleCommunicationReceived(payload);
          message = 'Communication logged';
          break;
        default:
          message = `Unsupported event type: ${payload.eventType}`;
      }

      return {
        success: true,
        processed,
        message,
      };
    } catch (error) {
      console.error('Webhook processing failed:', error);
      return {
        success: false,
        processed: false,
        message:
          error instanceof Error ? error.message : 'Webhook processing failed',
      };
    }
  }

  private async verifyWebhookSignature(
    payload: WebhookPayload,
    signature: string,
  ): Promise<boolean> {
    // Implementation depends on vendor's signature method
    // For now, return true (in production, implement proper verification)
    return true;
  }

  private async handlePaymentReceived(
    payload: WebhookPayload,
  ): Promise<boolean> {
    try {
      // Update payment status in database
      const { error } = await this.supabase
        .from('vendor_payment_sync')
        .update({
          status: 'paid',
          payment_schedule: this.supabase.raw(
            `jsonb_set(payment_schedule, '{0,status}', '"paid"')`,
          ),
          last_sync_at: new Date().toISOString(),
        })
        .eq('vendor_id', payload.vendorId);

      return !error;
    } catch {
      return false;
    }
  }

  private async handlePaymentFailed(payload: WebhookPayload): Promise<boolean> {
    try {
      // Update payment status and trigger notifications
      const { error } = await this.supabase
        .from('vendor_payment_sync')
        .update({
          status: 'overdue',
          last_sync_at: new Date().toISOString(),
        })
        .eq('vendor_id', payload.vendorId);

      // TODO: Trigger payment failure notification
      return !error;
    } catch {
      return false;
    }
  }

  private async handleScheduleUpdated(
    payload: WebhookPayload,
  ): Promise<boolean> {
    try {
      // Sync updated payment schedule
      const { error } = await this.supabase
        .from('vendor_payment_sync')
        .update({
          payment_schedule: payload.data.schedule,
          last_sync_at: new Date().toISOString(),
        })
        .eq('vendor_id', payload.vendorId);

      return !error;
    } catch {
      return false;
    }
  }

  private async handleCommunicationReceived(
    payload: WebhookPayload,
  ): Promise<boolean> {
    try {
      // Log vendor communication
      const communication: VendorCommunication = {
        id: crypto.randomUUID(),
        type: payload.data.type || 'webhook',
        direction: 'inbound',
        subject: payload.data.subject,
        content: payload.data.content || JSON.stringify(payload.data),
        timestamp: new Date(payload.timestamp),
        status: 'delivered',
        metadata: payload.data,
      };

      const { error } = await this.supabase
        .from('vendor_payment_sync')
        .update({
          communication_log: this.supabase.raw(
            `communication_log || '${JSON.stringify([communication])}'::jsonb`,
          ),
          last_sync_at: new Date().toISOString(),
        })
        .eq('vendor_id', payload.vendorId);

      return !error;
    } catch {
      return false;
    }
  }

  /**
   * Check payment schedules and schedule reminders
   */
  private async checkAndScheduleReminders(
    paymentData: VendorPaymentData,
  ): Promise<void> {
    const reminderThresholds = [30, 14, 7, 3, 1]; // days before due date

    for (const payment of paymentData.paymentSchedule) {
      if (payment.status === 'pending') {
        const daysUntilDue = Math.ceil(
          (payment.dueDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24),
        );

        for (const threshold of reminderThresholds) {
          if (
            daysUntilDue === threshold &&
            payment.remindersSent < reminderThresholds.length
          ) {
            await this.schedulePaymentReminder(paymentData, payment, threshold);
            break;
          }
        }
      }
    }
  }

  private async schedulePaymentReminder(
    paymentData: VendorPaymentData,
    payment: PaymentScheduleItem,
    daysUntilDue: number,
  ): Promise<void> {
    // Create notification payload for payment reminder
    const reminderData = {
      vendorId: paymentData.vendorId,
      weddingId: paymentData.weddingId,
      paymentId: payment.id,
      paymentDescription: payment.description,
      amount: payment.amount,
      currency: paymentData.currency,
      dueDate: payment.dueDate,
      daysUntilDue,
      urgency:
        daysUntilDue <= 3 ? 'high' : daysUntilDue <= 7 ? 'medium' : 'low',
    };

    // Queue notification via notification service
    await this.supabase.from('notification_queue').insert({
      type: 'payment_reminder',
      recipient_id: this.credentials.userId,
      wedding_id: paymentData.weddingId,
      scheduled_for: new Date(),
      priority: reminderData.urgency,
      data: reminderData,
      created_at: new Date().toISOString(),
    });
  }

  /**
   * Get vendor payment status summary
   */
  async getVendorPaymentSummary(weddingId: string): Promise<{
    totalVendors: number;
    totalAmount: number;
    paidAmount: number;
    overdue: number;
    upcomingPayments: PaymentScheduleItem[];
    syncStatus: string;
  }> {
    try {
      const { data: vendors, error } = await this.supabase
        .from('vendor_payment_sync')
        .select('*')
        .eq('wedding_id', weddingId);

      if (error) {
        throw new Error(`Failed to fetch vendor payments: ${error.message}`);
      }

      if (!vendors?.length) {
        return {
          totalVendors: 0,
          totalAmount: 0,
          paidAmount: 0,
          overdue: 0,
          upcomingPayments: [],
          syncStatus: 'no_data',
        };
      }

      let totalAmount = 0;
      let paidAmount = 0;
      let overdue = 0;
      const upcomingPayments: PaymentScheduleItem[] = [];

      const now = new Date();
      const next30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

      for (const vendor of vendors) {
        totalAmount += vendor.total_amount || 0;

        for (const payment of vendor.payment_schedule || []) {
          if (payment.status === 'paid') {
            paidAmount += payment.amount;
          } else if (
            payment.status === 'overdue' ||
            new Date(payment.dueDate) < now
          ) {
            overdue += payment.amount;
          } else if (new Date(payment.dueDate) <= next30Days) {
            upcomingPayments.push(payment);
          }
        }
      }

      // Sort upcoming payments by due date
      upcomingPayments.sort(
        (a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime(),
      );

      return {
        totalVendors: vendors.length,
        totalAmount,
        paidAmount,
        overdue,
        upcomingPayments,
        syncStatus: 'healthy',
      };
    } catch (error) {
      console.error('Failed to get vendor payment summary:', error);
      throw error;
    }
  }
}

export const vendorPaymentSync = (
  config: IntegrationConfig,
  credentials: IntegrationCredentials,
) => new VendorPaymentSyncService(config, credentials);
