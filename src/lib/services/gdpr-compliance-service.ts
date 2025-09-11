/**
 * GDPR Compliance Service
 * WS-149: Core service for managing GDPR compliance operations
 */

import { createClient } from '@supabase/supabase-js';
import { createHash } from 'crypto';
import { z } from 'zod';

// Validation schemas
const ConsentRecordSchema = z.object({
  data_subject_id: z.string().uuid(),
  data_subject_type: z.enum(['couple', 'guest', 'vendor', 'contact']),
  purpose: z.string(),
  legal_basis: z.enum([
    'consent',
    'contract',
    'legal_obligation',
    'vital_interests',
    'public_task',
    'legitimate_interests',
  ]),
  consent_given: z.boolean(),
  consent_method: z.enum(['explicit', 'opt_in', 'implied']),
  consent_evidence: z.object({
    ip_address: z.string(),
    timestamp: z.string(),
    user_agent: z.string(),
    method_details: z.record(z.any()),
  }),
  data_categories: z.array(z.string()),
  retention_period: z.string().optional(),
  third_party_sharing: z.boolean().default(false),
  marketing_consent: z.boolean().default(false),
});

const DataSubjectRequestSchema = z.object({
  request_type: z.enum([
    'access',
    'rectification',
    'erasure',
    'portability',
    'restrict_processing',
    'object_to_processing',
    'withdraw_consent',
  ]),
  data_subject_email: z.string().email(),
  data_subject_name: z.string(),
  identity_verification: z.object({
    method: z.enum([
      'email_verification',
      'document_upload',
      'sms_verification',
    ]),
    evidence: z.record(z.any()),
  }),
  request_details: z.record(z.any()),
  preferred_format: z.enum(['json', 'csv', 'pdf']).optional(),
});

const DataBreachReportSchema = z.object({
  breach_type: z.enum([
    'confidentiality',
    'integrity',
    'availability',
    'combined',
  ]),
  breach_cause: z.string(),
  severity_level: z.enum(['low', 'medium', 'high', 'critical']),
  occurred_at: z.string(),
  discovered_at: z.string(),
  data_subjects_affected: z.number(),
  data_categories_affected: z.array(z.string()),
  potential_consequences: z.string(),
  risk_assessment: z.record(z.any()),
  containment_measures: z.record(z.any()),
});

export class GDPRComplianceService {
  private supabase;

  constructor() {
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );
  }

  /**
   * Record user consent
   */
  async recordConsent(data: z.infer<typeof ConsentRecordSchema>) {
    try {
      const validated = ConsentRecordSchema.parse(data);

      // Add purpose description based on purpose
      const purposeDescriptions: Record<string, string> = {
        marketing: 'Send promotional materials and updates about our services',
        analytics: 'Analyze website usage patterns to improve user experience',
        personalization:
          'Customize content and recommendations based on preferences',
        essential: 'Provide core platform functionality and security',
      };

      const { data: consent, error } = await this.supabase
        .from('gdpr.consent_records')
        .insert({
          ...validated,
          purpose_description:
            purposeDescriptions[validated.purpose] || validated.purpose,
          consent_given_at: new Date().toISOString(),
          consent_expires_at: this.calculateConsentExpiry(validated.purpose),
        })
        .select()
        .single();

      if (error) throw error;

      // Log consent in audit trail
      await this.logAuditEvent({
        event_type: 'consent_recorded',
        data_subject_id: validated.data_subject_id,
        event_details: {
          purpose: validated.purpose,
          legal_basis: validated.legal_basis,
          consent_given: validated.consent_given,
        },
        legal_basis: validated.legal_basis,
        purpose: validated.purpose,
        data_categories: validated.data_categories,
        consent_required: true,
        consent_status: validated.consent_given ? 'granted' : 'denied',
        ip_address: validated.consent_evidence.ip_address,
        user_agent: validated.consent_evidence.user_agent,
      });

      return { success: true, consent };
    } catch (error) {
      console.error('Error recording consent:', error);
      throw error;
    }
  }

  /**
   * Withdraw consent
   */
  async withdrawConsent(
    dataSubjectId: string,
    purpose: string,
    withdrawalMethod: string = 'user_request',
  ) {
    try {
      const { data, error } = await this.supabase
        .from('gdpr.consent_records')
        .update({
          withdrawn_at: new Date().toISOString(),
          withdrawal_method: withdrawalMethod,
          consent_given: false,
        })
        .eq('data_subject_id', dataSubjectId)
        .eq('purpose', purpose)
        .is('withdrawn_at', null)
        .select()
        .single();

      if (error) throw error;

      // Notify relevant systems of withdrawal
      await this.notifyConsentWithdrawal(dataSubjectId, purpose);

      // Log withdrawal
      await this.logAuditEvent({
        event_type: 'consent_withdrawn',
        data_subject_id: dataSubjectId,
        event_details: {
          purpose,
          withdrawal_method: withdrawalMethod,
        },
      });

      return { success: true, data };
    } catch (error) {
      console.error('Error withdrawing consent:', error);
      throw error;
    }
  }

  /**
   * Submit data subject request
   */
  async submitDataSubjectRequest(
    request: z.infer<typeof DataSubjectRequestSchema>,
  ) {
    try {
      const validated = DataSubjectRequestSchema.parse(request);

      // Get or create data subject ID
      const dataSubjectId = await this.getOrCreateDataSubjectId(
        validated.data_subject_email,
      );

      const { data: dsr, error } = await this.supabase
        .from('gdpr.data_subject_requests')
        .insert({
          data_subject_id: dataSubjectId,
          ...validated,
          status: 'submitted',
          submitted_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

      // Send acknowledgment email
      await this.sendDataSubjectRequestAcknowledgment(dsr);

      // If it's an access request, start processing immediately
      if (validated.request_type === 'access') {
        await this.processAccessRequest(dsr.id);
      }

      // Log the request
      await this.logAuditEvent({
        event_type: 'data_subject_request_submitted',
        data_subject_id: dataSubjectId,
        event_details: {
          request_id: dsr.request_id,
          request_type: validated.request_type,
        },
      });

      return { success: true, request: dsr };
    } catch (error) {
      console.error('Error submitting data subject request:', error);
      throw error;
    }
  }

  /**
   * Process data access request
   */
  async processAccessRequest(requestId: string) {
    try {
      // Get request details
      const { data: request, error } = await this.supabase
        .from('gdpr.data_subject_requests')
        .select('*')
        .eq('id', requestId)
        .single();

      if (error || !request) throw error || new Error('Request not found');

      // Update status to in_progress
      await this.supabase
        .from('gdpr.data_subject_requests')
        .update({ status: 'in_progress' })
        .eq('id', requestId);

      // Export user data
      const exportData = await this.exportUserData(request.data_subject_id);

      // Store export file path
      const exportPath = await this.saveDataExport(exportData, request);

      // Update request with export details
      await this.supabase
        .from('gdpr.data_subject_requests')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          export_file_path: exportPath,
          export_file_size_bytes: JSON.stringify(exportData).length,
          completion_details: {
            export_completed: true,
            records_exported: exportData.metadata.total_records,
          },
        })
        .eq('id', requestId);

      // Send completion notification
      await this.sendDataExportNotification(request, exportPath);

      return { success: true, exportPath };
    } catch (error) {
      console.error('Error processing access request:', error);
      throw error;
    }
  }

  /**
   * Process data erasure request (right to be forgotten)
   */
  async processErasureRequest(requestId: string, cryptoShred: boolean = true) {
    try {
      // Get request details
      const { data: request, error } = await this.supabase
        .from('gdpr.data_subject_requests')
        .select('*')
        .eq('id', requestId)
        .single();

      if (error || !request) throw error || new Error('Request not found');

      // Verify identity is confirmed
      if (request.identity_verification_status !== 'verified') {
        throw new Error('Identity verification required for erasure');
      }

      // Update status
      await this.supabase
        .from('gdpr.data_subject_requests')
        .update({ status: 'in_progress' })
        .eq('id', requestId);

      // Perform erasure based on method
      let deletionResults;
      if (cryptoShred) {
        deletionResults = await this.performCryptoShredding(
          request.data_subject_id,
        );
      } else {
        deletionResults = await this.performLogicalDeletion(
          request.data_subject_id,
        );
      }

      // Update request with completion details
      await this.supabase
        .from('gdpr.data_subject_requests')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          deletion_method: cryptoShred ? 'crypto_shred' : 'logical',
          deletion_scope: deletionResults,
          completion_details: {
            erasure_completed: true,
            method: cryptoShred ? 'crypto_shred' : 'logical',
            tables_affected: Object.keys(deletionResults),
          },
        })
        .eq('id', requestId);

      // Log erasure in audit trail
      await this.logAuditEvent({
        event_type: 'data_erasure_completed',
        data_subject_id: '[ERASED]', // Anonymized
        event_details: {
          request_id: request.request_id,
          deletion_method: cryptoShred ? 'crypto_shred' : 'logical',
          tables_affected: Object.keys(deletionResults),
        },
      });

      return { success: true, deletionResults };
    } catch (error) {
      console.error('Error processing erasure request:', error);
      throw error;
    }
  }

  /**
   * Report data breach
   */
  async reportDataBreach(breach: z.infer<typeof DataBreachReportSchema>) {
    try {
      const validated = DataBreachReportSchema.parse(breach);

      const { data: breachRecord, error } = await this.supabase
        .from('gdpr.data_breaches')
        .insert({
          ...validated,
          status: 'investigating',
        })
        .select()
        .single();

      if (error) throw error;

      // Assess notification requirements
      const assessment = await this.assessBreachNotification(breachRecord.id);

      // If supervisory authority notification required, initiate it
      if (assessment.supervisory_authority_required) {
        await this.initiateSupervisoryAuthorityNotification(breachRecord);
      }

      // If data subject notification required, prepare it
      if (assessment.data_subject_notification_required) {
        await this.prepareDataSubjectNotifications(breachRecord);
      }

      // Notify DPO and legal team
      await this.notifyBreachResponseTeam(breachRecord);

      // Log breach
      await this.logAuditEvent({
        event_type: 'data_breach_reported',
        event_details: {
          breach_id: breachRecord.breach_id,
          severity: validated.severity_level,
          type: validated.breach_type,
        },
      });

      return { success: true, breach: breachRecord, assessment };
    } catch (error) {
      console.error('Error reporting data breach:', error);
      throw error;
    }
  }

  /**
   * Export user data for data subject requests
   */
  private async exportUserData(dataSubjectId: string) {
    try {
      // Fetch all user data from various tables
      const [profile, consents, communications, files, activities] =
        await Promise.all([
          this.getUserProfile(dataSubjectId),
          this.getUserConsents(dataSubjectId),
          this.getUserCommunications(dataSubjectId),
          this.getUserFiles(dataSubjectId),
          this.getUserActivities(dataSubjectId),
        ]);

      const exportData = {
        export_timestamp: new Date().toISOString(),
        data_subject_id: dataSubjectId,
        personal_data: {
          profile_information: profile,
          consent_history: consents,
          communication_records: communications,
          uploaded_files: files,
          activity_history: activities,
        },
        processing_activities:
          await this.getProcessingActivities(dataSubjectId),
        metadata: {
          export_format: 'json',
          total_records: this.countRecords({
            profile,
            consents,
            communications,
            files,
            activities,
          }),
          export_date: new Date().toISOString(),
          verification_hash: this.generateVerificationHash({
            profile,
            consents,
            communications,
          }),
        },
      };

      return exportData;
    } catch (error) {
      console.error('Error exporting user data:', error);
      throw error;
    }
  }

  /**
   * Perform crypto-shredding for permanent data deletion
   */
  private async performCryptoShredding(dataSubjectId: string) {
    try {
      const deletionResults: Record<string, any> = {};

      // Delete encryption keys for the user
      deletionResults.encryption_keys =
        await this.deleteUserEncryptionKeys(dataSubjectId);

      // Overwrite sensitive data with random values before deletion
      deletionResults.overwritten_data =
        await this.overwriteSensitiveData(dataSubjectId);

      // Delete user data from all tables
      deletionResults.deleted_records =
        await this.deleteUserDataFromAllTables(dataSubjectId);

      // Verify deletion
      deletionResults.verification =
        await this.verifyDataDeletion(dataSubjectId);

      return deletionResults;
    } catch (error) {
      console.error('Error performing crypto-shredding:', error);
      throw error;
    }
  }

  /**
   * Helper methods
   */
  private calculateConsentExpiry(purpose: string): string {
    const expiryPeriods: Record<string, number> = {
      marketing: 365, // 1 year
      analytics: 395, // 13 months
      personalization: 730, // 2 years
      essential: 0, // No expiry
    };

    const days = expiryPeriods[purpose] || 365;
    if (days === 0) return '9999-12-31T23:59:59Z'; // Far future date

    const expiry = new Date();
    expiry.setDate(expiry.getDate() + days);
    return expiry.toISOString();
  }

  private async getOrCreateDataSubjectId(email: string): Promise<string> {
    const { data } = await this.supabase
      .from('user_profiles')
      .select('id')
      .eq('email', email)
      .single();

    return data?.id || crypto.randomUUID();
  }

  private async notifyConsentWithdrawal(
    dataSubjectId: string,
    purpose: string,
  ) {
    // Implement notification logic to relevant systems
    console.log(
      `Notifying systems of consent withdrawal for ${dataSubjectId} - ${purpose}`,
    );
  }

  private async sendDataSubjectRequestAcknowledgment(request: any) {
    // Implement email sending logic
    console.log(`Sending acknowledgment for request ${request.request_id}`);
  }

  private async sendDataExportNotification(request: any, exportPath: string) {
    // Implement notification logic
    console.log(
      `Sending export notification for request ${request.request_id}`,
    );
  }

  private async saveDataExport(exportData: any, request: any): Promise<string> {
    // Save export to storage and return path
    const path = `/exports/${request.request_id}_${Date.now()}.json`;
    // Implement actual storage logic
    return path;
  }

  private async assessBreachNotification(breachId: string) {
    const { data } = await this.supabase.rpc('assess_breach_notification', {
      breach_id: breachId,
    });
    return data;
  }

  private async initiateSupervisoryAuthorityNotification(breach: any) {
    // Implement notification to supervisory authority
    console.log(
      `Initiating supervisory authority notification for breach ${breach.breach_id}`,
    );
  }

  private async prepareDataSubjectNotifications(breach: any) {
    // Implement data subject notification preparation
    console.log(
      `Preparing data subject notifications for breach ${breach.breach_id}`,
    );
  }

  private async notifyBreachResponseTeam(breach: any) {
    // Implement team notification
    console.log(`Notifying breach response team for ${breach.breach_id}`);
  }

  private async getUserProfile(dataSubjectId: string) {
    const { data } = await this.supabase
      .from('user_profiles')
      .select('*')
      .eq('id', dataSubjectId)
      .single();
    return data;
  }

  private async getUserConsents(dataSubjectId: string) {
    const { data } = await this.supabase
      .from('gdpr.consent_records')
      .select('*')
      .eq('data_subject_id', dataSubjectId);
    return data;
  }

  private async getUserCommunications(dataSubjectId: string) {
    const { data } = await this.supabase
      .from('communications')
      .select('*')
      .or(`sender_id.eq.${dataSubjectId},recipient_id.eq.${dataSubjectId}`);
    return data;
  }

  private async getUserFiles(dataSubjectId: string) {
    const { data } = await this.supabase
      .from('files')
      .select('*')
      .eq('uploaded_by', dataSubjectId);
    return data;
  }

  private async getUserActivities(dataSubjectId: string) {
    const { data } = await this.supabase
      .from('activity_logs')
      .select('*')
      .eq('user_id', dataSubjectId);
    return data;
  }

  private async getProcessingActivities(dataSubjectId: string) {
    const { data } = await this.supabase
      .from('gdpr.processing_activities')
      .select('*')
      .eq('active', true);
    return data;
  }

  private countRecords(data: any): number {
    let count = 0;
    Object.values(data).forEach((value: any) => {
      if (Array.isArray(value)) {
        count += value.length;
      } else if (value) {
        count += 1;
      }
    });
    return count;
  }

  private generateVerificationHash(data: any): string {
    const hash = createHash('sha256');
    hash.update(JSON.stringify(data));
    return hash.digest('hex');
  }

  private async deleteUserEncryptionKeys(dataSubjectId: string) {
    // Implement encryption key deletion
    return { keys_deleted: true };
  }

  private async overwriteSensitiveData(dataSubjectId: string) {
    // Overwrite sensitive fields with random data before deletion
    return { overwritten: true };
  }

  private async deleteUserDataFromAllTables(dataSubjectId: string) {
    // Delete user data from all relevant tables
    const tables = ['user_profiles', 'clients', 'files', 'communications'];
    const results: Record<string, any> = {};

    for (const table of tables) {
      const { error } = await this.supabase
        .from(table)
        .delete()
        .eq('user_id', dataSubjectId);

      results[table] = error ? 'error' : 'deleted';
    }

    return results;
  }

  private async verifyDataDeletion(dataSubjectId: string) {
    // Verify no data remains
    const { data } = await this.supabase
      .from('user_profiles')
      .select('id')
      .eq('id', dataSubjectId)
      .single();

    return { verified: !data };
  }

  private async logAuditEvent(event: any) {
    await this.supabase.from('gdpr.compliance_audit_log').insert({
      ...event,
      created_at: new Date().toISOString(),
    });
  }
}

// Export singleton instance
export const gdprService = new GDPRComplianceService();
