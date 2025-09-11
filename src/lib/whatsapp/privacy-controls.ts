import { createClient } from '@supabase/supabase-js';
import { createWhatsAppService } from './service';

interface OptInRecord {
  id?: string;
  phoneNumber: string;
  status: 'opted_in' | 'opted_out' | 'pending';
  consentType: 'marketing' | 'transactional' | 'all';
  source: 'web_form' | 'whatsapp_message' | 'sms' | 'phone_call' | 'in_person';
  ipAddress?: string;
  userAgent?: string;
  timestamp: Date;
  expiresAt?: Date;
  metadata?: Record<string, any>;
}

interface ConsentLog {
  id?: string;
  phoneNumber: string;
  action: 'opt_in' | 'opt_out' | 'update' | 'delete';
  previousStatus?: string;
  newStatus: string;
  reason?: string;
  source: string;
  timestamp: Date;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, any>;
}

interface DataProcessingRecord {
  id?: string;
  phoneNumber: string;
  dataType: 'contact_info' | 'message_content' | 'media_files' | 'metadata';
  purpose:
    | 'wedding_coordination'
    | 'customer_service'
    | 'marketing'
    | 'analytics';
  legalBasis: 'consent' | 'contract' | 'legitimate_interest' | 'vital_interest';
  retentionPeriod: number; // days
  processedAt: Date;
  processedBy: string;
  metadata?: Record<string, any>;
}

export class WhatsAppPrivacyControls {
  private supabase: ReturnType<typeof createClient>;
  private whatsAppService: ReturnType<typeof createWhatsAppService>;

  constructor() {
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );
    this.whatsAppService = createWhatsAppService();
  }

  // Record opt-in consent
  async recordOptIn(
    phoneNumber: string,
    consentType: 'marketing' | 'transactional' | 'all',
    source: string,
    ipAddress?: string,
    userAgent?: string,
    metadata?: Record<string, any>,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const timestamp = new Date();
      const expiresAt = new Date();
      expiresAt.setFullYear(expiresAt.getFullYear() + 1); // Consent expires in 1 year

      // Record opt-in
      const { error: optInError } = await this.supabase
        .from('whatsapp_opt_ins')
        .upsert({
          phone_number: phoneNumber,
          status: 'opted_in',
          consent_type: consentType,
          source,
          ip_address: ipAddress,
          user_agent: userAgent,
          timestamp: timestamp.toISOString(),
          expires_at: expiresAt.toISOString(),
          metadata: metadata || {},
        });

      if (optInError) throw optInError;

      // Log the consent action
      await this.logConsentAction({
        phoneNumber,
        action: 'opt_in',
        newStatus: 'opted_in',
        source,
        timestamp,
        ipAddress,
        userAgent,
        metadata: { consentType, ...metadata },
      });

      // Send opt-in confirmation message
      await this.sendOptInConfirmation(phoneNumber, consentType);

      return { success: true };
    } catch (error) {
      console.error('Record opt-in error:', error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : 'Failed to record opt-in',
      };
    }
  }

  // Record opt-out request
  async recordOptOut(
    phoneNumber: string,
    reason?: string,
    source: string = 'user_request',
    ipAddress?: string,
    userAgent?: string,
    metadata?: Record<string, any>,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const timestamp = new Date();

      // Get previous status
      const { data: previousRecord } = await this.supabase
        .from('whatsapp_opt_ins')
        .select('status')
        .eq('phone_number', phoneNumber)
        .single();

      // Update opt-in record
      const { error: optOutError } = await this.supabase
        .from('whatsapp_opt_ins')
        .upsert({
          phone_number: phoneNumber,
          status: 'opted_out',
          source,
          ip_address: ipAddress,
          user_agent: userAgent,
          timestamp: timestamp.toISOString(),
          metadata: { ...metadata, opt_out_reason: reason },
        });

      if (optOutError) throw optOutError;

      // Log the consent action
      await this.logConsentAction({
        phoneNumber,
        action: 'opt_out',
        previousStatus: previousRecord?.status || 'unknown',
        newStatus: 'opted_out',
        reason,
        source,
        timestamp,
        ipAddress,
        userAgent,
        metadata,
      });

      // Remove from all active groups
      await this.removeFromAllGroups(phoneNumber);

      // Send opt-out confirmation
      await this.sendOptOutConfirmation(phoneNumber);

      return { success: true };
    } catch (error) {
      console.error('Record opt-out error:', error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : 'Failed to record opt-out',
      };
    }
  }

  // Check opt-in status
  async checkOptInStatus(phoneNumber: string): Promise<{
    success: boolean;
    status?: 'opted_in' | 'opted_out' | 'pending' | 'not_found';
    consentType?: string;
    expiresAt?: Date;
    error?: string;
  }> {
    try {
      const { data, error } = await this.supabase
        .from('whatsapp_opt_ins')
        .select('status, consent_type, expires_at')
        .eq('phone_number', phoneNumber)
        .single();

      if (error && error.code !== 'PGRST116') {
        // PGRST116 = no rows found
        throw error;
      }

      if (!data) {
        return { success: true, status: 'not_found' };
      }

      // Check if consent has expired
      const expiresAt = new Date(data.expires_at as string);
      const now = new Date();

      if (data.status === 'opted_in' && expiresAt < now) {
        // Consent has expired, update status
        await this.supabase
          .from('whatsapp_opt_ins')
          .update({ status: 'pending' })
          .eq('phone_number', phoneNumber);

        return {
          success: true,
          status: 'pending',
          consentType: data.consent_type as string,
          expiresAt,
        };
      }

      return {
        success: true,
        status: data.status as
          | 'opted_in'
          | 'opted_out'
          | 'pending'
          | 'not_found',
        consentType: data.consent_type as string | undefined,
        expiresAt,
      };
    } catch (error) {
      console.error('Check opt-in status error:', error);
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to check opt-in status',
      };
    }
  }

  // Validate message sending permission
  async validateMessagePermission(
    phoneNumber: string,
    messageType: 'marketing' | 'transactional' | 'customer_service',
  ): Promise<{ allowed: boolean; reason?: string }> {
    try {
      const statusResult = await this.checkOptInStatus(phoneNumber);

      if (!statusResult.success) {
        return { allowed: false, reason: 'Unable to verify opt-in status' };
      }

      switch (statusResult.status) {
        case 'opted_out':
          return {
            allowed: false,
            reason: 'User has opted out of WhatsApp messages',
          };

        case 'not_found':
        case 'pending':
          if (messageType === 'marketing') {
            return {
              allowed: false,
              reason: 'Marketing messages require explicit opt-in consent',
            };
          }
          // Allow transactional and customer service messages without explicit consent
          return { allowed: true };

        case 'opted_in':
          // Check consent type
          if (
            messageType === 'marketing' &&
            statusResult.consentType === 'transactional'
          ) {
            return {
              allowed: false,
              reason: 'User only consented to transactional messages',
            };
          }
          return { allowed: true };

        default:
          return { allowed: false, reason: 'Unknown opt-in status' };
      }
    } catch (error) {
      console.error('Validate message permission error:', error);
      return { allowed: false, reason: 'Error validating permissions' };
    }
  }

  // Process data deletion request (GDPR)
  async processDataDeletion(
    phoneNumber: string,
    requestedBy: string,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const timestamp = new Date();

      // Log the deletion request
      await this.logConsentAction({
        phoneNumber,
        action: 'delete',
        newStatus: 'deleted',
        source: 'gdpr_request',
        timestamp,
        metadata: { requestedBy },
      });

      // Delete from multiple tables
      const tables = [
        'whatsapp_messages',
        'whatsapp_group_members',
        'whatsapp_opt_ins',
      ];

      for (const table of tables) {
        const { error } = await this.supabase
          .from(table)
          .delete()
          .eq('phone_number', phoneNumber);

        if (error && error.code !== 'PGRST116') {
          console.error(`Error deleting from ${table}:`, error);
        }
      }

      return { success: true };
    } catch (error) {
      console.error('Process data deletion error:', error);
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to process data deletion',
      };
    }
  }

  // Export user data (GDPR)
  async exportUserData(
    phoneNumber: string,
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const userData: any = {
        phoneNumber,
        exportedAt: new Date().toISOString(),
        optInRecords: [],
        consentLogs: [],
        messages: [],
        groupMemberships: [],
      };

      // Get opt-in records
      const { data: optIns } = await this.supabase
        .from('whatsapp_opt_ins')
        .select('*')
        .eq('phone_number', phoneNumber);

      userData.optInRecords = optIns || [];

      // Get consent logs
      const { data: consentLogs } = await this.supabase
        .from('whatsapp_consent_logs')
        .select('*')
        .eq('phone_number', phoneNumber);

      userData.consentLogs = consentLogs || [];

      // Get messages
      const { data: messages } = await this.supabase
        .from('whatsapp_messages')
        .select('*')
        .eq('phone_number', phoneNumber);

      userData.messages = messages || [];

      // Get group memberships
      const { data: groups } = await this.supabase
        .from('whatsapp_group_members')
        .select('*, whatsapp_groups(name, type)')
        .eq('phone_number', phoneNumber);

      userData.groupMemberships = groups || [];

      return { success: true, data: userData };
    } catch (error) {
      console.error('Export user data error:', error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : 'Failed to export user data',
      };
    }
  }

  // Log consent action
  private async logConsentAction(log: Omit<ConsentLog, 'id'>): Promise<void> {
    try {
      await this.supabase.from('whatsapp_consent_logs').insert({
        phone_number: log.phoneNumber,
        action: log.action,
        previous_status: log.previousStatus,
        new_status: log.newStatus,
        reason: log.reason,
        source: log.source,
        timestamp: log.timestamp.toISOString(),
        ip_address: log.ipAddress,
        user_agent: log.userAgent,
        metadata: log.metadata || {},
      });
    } catch (error) {
      console.error('Log consent action error:', error);
    }
  }

  // Remove from all groups
  private async removeFromAllGroups(phoneNumber: string): Promise<void> {
    try {
      await this.supabase
        .from('whatsapp_group_members')
        .update({
          is_active: false,
          opt_in_status: 'opted_out',
          updated_at: new Date().toISOString(),
        })
        .eq('phone_number', phoneNumber);
    } catch (error) {
      console.error('Remove from all groups error:', error);
    }
  }

  // Send opt-in confirmation
  private async sendOptInConfirmation(
    phoneNumber: string,
    consentType: string,
  ): Promise<void> {
    try {
      const message =
        consentType === 'marketing'
          ? "Thanks for opting in! You'll now receive wedding planning updates and promotional messages via WhatsApp."
          : "Thanks for confirming! You'll receive important wedding-related notifications via WhatsApp.";

      await this.whatsAppService.sendTextMessage(phoneNumber, message, {
        messageType: 'opt_in_confirmation',
        consentType,
      });
    } catch (error) {
      console.error('Send opt-in confirmation error:', error);
    }
  }

  // Send opt-out confirmation
  private async sendOptOutConfirmation(phoneNumber: string): Promise<void> {
    try {
      const message =
        'You have successfully opted out. You will no longer receive marketing messages from us on WhatsApp. You may still receive important transactional messages related to your wedding services.';

      await this.whatsAppService.sendTextMessage(phoneNumber, message, {
        messageType: 'opt_out_confirmation',
      });
    } catch (error) {
      console.error('Send opt-out confirmation error:', error);
    }
  }

  // Get consent audit trail
  async getConsentAuditTrail(
    phoneNumber: string,
  ): Promise<{ success: boolean; logs?: ConsentLog[]; error?: string }> {
    try {
      const { data, error } = await this.supabase
        .from('whatsapp_consent_logs')
        .select('*')
        .eq('phone_number', phoneNumber)
        .order('timestamp', { ascending: false });

      if (error) throw error;

      const logs: ConsentLog[] = data.map((row) => ({
        id: row.id as string,
        phoneNumber: row.phone_number as string,
        action: row.action as 'opt_in' | 'opt_out' | 'update' | 'delete',
        previousStatus: row.previous_status as string,
        newStatus: row.new_status as string,
        reason: row.reason as string,
        source: row.source as string,
        timestamp: new Date(row.timestamp as string),
        ipAddress: row.ip_address as string,
        userAgent: row.user_agent as string,
        metadata: (row.metadata as Record<string, any>) || {},
      }));

      return { success: true, logs };
    } catch (error) {
      console.error('Get consent audit trail error:', error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : 'Failed to get audit trail',
      };
    }
  }

  // Refresh expired consents
  async refreshExpiredConsents(): Promise<{
    success: boolean;
    updatedCount?: number;
    error?: string;
  }> {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data, error } = await this.supabase
        .from('whatsapp_opt_ins')
        .update({ status: 'pending' })
        .lt('expires_at', new Date().toISOString())
        .eq('status', 'opted_in')
        .select('phone_number');

      if (error) throw error;

      // Send re-consent messages to users whose consent expired
      for (const record of data || []) {
        await this.sendReconsentMessage(record.phone_number as string);
      }

      return { success: true, updatedCount: data?.length || 0 };
    } catch (error) {
      console.error('Refresh expired consents error:', error);
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to refresh expired consents',
      };
    }
  }

  // Send re-consent message
  private async sendReconsentMessage(phoneNumber: string): Promise<void> {
    try {
      const message =
        'Hi! Your WhatsApp marketing consent has expired. Please reply "YES" to continue receiving wedding planning updates and offers, or "STOP" to opt out completely.';

      await this.whatsAppService.sendTextMessage(phoneNumber, message, {
        messageType: 'reconsent_request',
      });
    } catch (error) {
      console.error('Send reconsent message error:', error);
    }
  }
}

// Export factory function
export function createWhatsAppPrivacyControls(): WhatsAppPrivacyControls {
  return new WhatsAppPrivacyControls();
}

// Export types
export type { OptInRecord, ConsentLog, DataProcessingRecord };
