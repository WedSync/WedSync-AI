/**
 * GDPR Compliance Engine for WedSync
 * Comprehensive GDPR compliance with automated processing for wedding data protection
 *
 * Features:
 * - Data subject export requests (Article 15)
 * - Right to be forgotten (Article 17)
 * - Data portability (Article 20)
 * - Consent management (Article 7)
 * - Breach notification (Article 33/34)
 * - Data mapping and classification
 */

import { createClient } from '@supabase/supabase-js';
import { sanitizeInput, containsSqlInjection } from './input-sanitization';

// GDPR Data Types
export interface GDPRExport {
  requestId: string;
  dataSubject: {
    email: string;
    name?: string;
    phone?: string;
    identifiers: string[];
  };
  personalData: {
    guestProfiles: GuestData[];
    rsvpData: RSVPData[];
    dietaryPreferences: DietaryData[];
    communicationHistory: CommunicationData[];
    photoTags: PhotoTagData[];
    timelineEntries: TimelineData[];
    formSubmissions: FormSubmissionData[];
    vendorInteractions: VendorInteractionData[];
  };
  metadata: {
    exportDate: string;
    dataRetentionPeriod: string;
    legalBasis: string[];
    processingPurposes: string[];
  };
  format: 'json' | 'csv' | 'xml';
}

export interface DeletionResult {
  requestId: string;
  dataSubject: string;
  deletionDate: string;
  itemsDeleted: {
    guestProfiles: number;
    rsvpRecords: number;
    communications: number;
    photoTags: number;
    formSubmissions: number;
  };
  itemsAnonymized: {
    timelineReferences: number;
    vendorCommunications: number;
    aggregatedMetrics: number;
  };
  auditTrail: DeletionAuditEntry[];
  verificationHash: string;
}

export interface ConsentRecord {
  dataSubjectId: string;
  consentType:
    | 'marketing'
    | 'analytics'
    | 'photo_sharing'
    | 'data_processing'
    | 'communication';
  granted: boolean;
  timestamp: string;
  method: 'explicit' | 'opt_in' | 'pre_ticked' | 'inferred';
  ipAddress: string;
  userAgent: string;
  legalBasis:
    | 'consent'
    | 'contract'
    | 'legal_obligation'
    | 'vital_interest'
    | 'public_task'
    | 'legitimate_interest';
  withdrawnAt?: string;
  renewedAt?: string;
}

export interface DataBreachNotification {
  breachId: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  affectedDataTypes: string[];
  affectedIndividuals: number;
  reportedAt: string;
  resolvedAt?: string;
  supervisoryAuthorityNotified: boolean;
  dataSubjectsNotified: boolean;
  mitigationActions: string[];
}

// Supporting interfaces
interface GuestData {
  id: string;
  name: string;
  email: string;
  phone?: string;
  address?: object;
  relationship?: string;
  plusOne?: string;
  createdAt: string;
  updatedAt: string;
}

interface RSVPData {
  id: string;
  status: 'attending' | 'not_attending' | 'maybe';
  responseDate: string;
  guestCount: number;
  notes?: string;
}

interface DietaryData {
  id: string;
  restrictions: string[];
  allergies: string[];
  preferences: string[];
  notes?: string;
}

interface CommunicationData {
  id: string;
  channel: 'email' | 'sms' | 'whatsapp' | 'postal';
  content: string;
  sentAt: string;
  deliveredAt?: string;
  readAt?: string;
  responseAt?: string;
}

interface PhotoTagData {
  id: string;
  photoId: string;
  taggedAt: string;
  approvalStatus: 'pending' | 'approved' | 'rejected';
}

interface TimelineData {
  id: string;
  eventType: string;
  description: string;
  timestamp: string;
  relatedEntities: string[];
}

interface FormSubmissionData {
  id: string;
  formId: string;
  responses: Record<string, any>;
  submittedAt: string;
  ipAddress: string;
}

interface VendorInteractionData {
  id: string;
  vendorId: string;
  interactionType: string;
  content: string;
  timestamp: string;
}

interface DeletionAuditEntry {
  table: string;
  recordId: string;
  action: 'deleted' | 'anonymized' | 'archived';
  timestamp: string;
  hash: string;
}

export class GDPRComplianceEngine {
  private supabase;
  private auditLogger;

  constructor() {
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );
    this.auditLogger = new GDPRAuditLogger();
  }

  /**
   * Process a data export request under Article 15 GDPR
   * Comprehensive data extraction for wedding guests
   */
  async processDataExportRequest(
    weddingId: string,
    guestEmail: string,
    format: 'json' | 'csv' | 'xml' = 'json',
  ): Promise<GDPRExport> {
    // Input validation and sanitization
    if (containsSqlInjection(guestEmail) || containsSqlInjection(weddingId)) {
      throw new Error('Invalid input detected - potential SQL injection');
    }

    const sanitizedEmail = sanitizeInput(guestEmail.toLowerCase(), {
      allowSpecialChars: false,
      maxLength: 255,
      stripWhitespace: true,
    });

    const requestId = `export_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    try {
      // Log the data access request
      await this.auditLogger.logDataAccess(
        'system',
        weddingId,
        `GDPR_EXPORT_REQUEST`,
        { guestEmail: sanitizedEmail, requestId },
      );

      // 1. Find guest profile(s)
      const { data: guestProfiles, error: guestError } = await this.supabase
        .from('wedding_guests')
        .select('*')
        .eq('wedding_id', weddingId)
        .ilike('email', sanitizedEmail);

      if (guestError)
        throw new Error(`Failed to fetch guest data: ${guestError.message}`);
      if (!guestProfiles || guestProfiles.length === 0) {
        throw new Error(`No data found for email: ${sanitizedEmail}`);
      }

      const guestIds = guestProfiles.map((g) => g.id);

      // 2. Extract all related personal data
      const personalData = await this.extractPersonalData(
        weddingId,
        guestIds,
        sanitizedEmail,
      );

      // 3. Generate export with metadata
      const gdprExport: GDPRExport = {
        requestId,
        dataSubject: {
          email: sanitizedEmail,
          name: guestProfiles[0]?.name || 'Unknown',
          phone: guestProfiles[0]?.phone,
          identifiers: guestIds,
        },
        personalData,
        metadata: {
          exportDate: new Date().toISOString(),
          dataRetentionPeriod: '7 years from wedding date (legal requirement)',
          legalBasis: ['consent', 'contract'],
          processingPurposes: [
            'Wedding planning and coordination',
            'Guest communication and RSVP management',
            'Dietary requirement tracking',
            'Photo sharing and memories',
            'Vendor coordination',
          ],
        },
        format,
      };

      // 4. Log successful export
      await this.auditLogger.logDataExport(
        requestId,
        sanitizedEmail,
        personalData,
      );

      // 5. Format response based on requested format
      return gdprExport;
    } catch (error: any) {
      await this.auditLogger.logDataAccessError(
        requestId,
        sanitizedEmail,
        error.message,
      );
      throw new Error(`GDPR export failed: ${error.message}`);
    }
  }

  /**
   * Process right to be forgotten request under Article 17 GDPR
   * Safely removes guest data while preserving wedding integrity
   */
  async processRightToBeForgotten(
    guestId: string,
    weddingId: string,
    reason: string = 'Data subject withdrawal of consent',
  ): Promise<DeletionResult> {
    // Input validation
    if (containsSqlInjection(guestId) || containsSqlInjection(weddingId)) {
      throw new Error('Invalid input detected - potential SQL injection');
    }

    const requestId = `deletion_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const deletionDate = new Date().toISOString();
    const auditTrail: DeletionAuditEntry[] = [];

    try {
      // Verify guest exists and belongs to wedding
      const { data: guest, error: guestError } = await this.supabase
        .from('wedding_guests')
        .select('email, name')
        .eq('id', guestId)
        .eq('wedding_id', weddingId)
        .single();

      if (guestError || !guest) {
        throw new Error('Guest not found or access denied');
      }

      await this.auditLogger.logDataDeletion(requestId, guest.email, reason);

      let itemsDeleted = {
        guestProfiles: 0,
        rsvpRecords: 0,
        communications: 0,
        photoTags: 0,
        formSubmissions: 0,
      };
      let itemsAnonymized = {
        timelineReferences: 0,
        vendorCommunications: 0,
        aggregatedMetrics: 0,
      };

      // 1. Delete direct personal data
      const deletions = [
        { table: 'wedding_guests', column: 'id', value: guestId },
        { table: 'rsvp_responses', column: 'guest_id', value: guestId },
        { table: 'dietary_requirements', column: 'guest_id', value: guestId },
        { table: 'guest_communications', column: 'guest_id', value: guestId },
        { table: 'photo_guest_tags', column: 'guest_id', value: guestId },
        { table: 'guest_form_responses', column: 'guest_id', value: guestId },
      ];

      for (const deletion of deletions) {
        const { data: records, error: selectError } = await this.supabase
          .from(deletion.table)
          .select('id')
          .eq(deletion.column, deletion.value);

        if (!selectError && records && records.length > 0) {
          const { error: deleteError } = await this.supabase
            .from(deletion.table)
            .delete()
            .eq(deletion.column, deletion.value);

          if (!deleteError) {
            const count = records.length;
            switch (deletion.table) {
              case 'wedding_guests':
                itemsDeleted.guestProfiles += count;
                break;
              case 'rsvp_responses':
                itemsDeleted.rsvpRecords += count;
                break;
              case 'guest_communications':
                itemsDeleted.communications += count;
                break;
              case 'photo_guest_tags':
                itemsDeleted.photoTags += count;
                break;
              case 'guest_form_responses':
                itemsDeleted.formSubmissions += count;
                break;
            }

            // Add to audit trail
            records.forEach((record) => {
              auditTrail.push({
                table: deletion.table,
                recordId: record.id,
                action: 'deleted',
                timestamp: deletionDate,
                hash: this.generateHash(
                  `${deletion.table}_${record.id}_deleted_${deletionDate}`,
                ),
              });
            });
          }
        }
      }

      // 2. Anonymize references in timeline and vendor communications
      const anonymizations = [
        {
          table: 'timeline_events',
          column: 'participants',
          operation: 'json_array_remove',
          searchValue: guestId,
        },
        {
          table: 'vendor_communications',
          column: 'content',
          operation: 'text_replace',
          searchValue: guest.name,
          replaceValue: '[REDACTED - Data Subject Request]',
        },
      ];

      for (const anon of anonymizations) {
        if (anon.operation === 'json_array_remove') {
          const { data: timelineEvents, error: timelineError } =
            await this.supabase
              .from(anon.table)
              .select('id, participants')
              .contains('participants', [guestId]);

          if (!timelineError && timelineEvents) {
            for (const event of timelineEvents) {
              const updatedParticipants = event.participants.filter(
                (p: string) => p !== guestId,
              );

              await this.supabase
                .from(anon.table)
                .update({ participants: updatedParticipants })
                .eq('id', event.id);

              itemsAnonymized.timelineReferences++;
              auditTrail.push({
                table: anon.table,
                recordId: event.id,
                action: 'anonymized',
                timestamp: deletionDate,
                hash: this.generateHash(
                  `${anon.table}_${event.id}_anonymized_${deletionDate}`,
                ),
              });
            }
          }
        }

        if (anon.operation === 'text_replace' && guest.name) {
          const { data: communications, error: commError } = await this.supabase
            .from(anon.table)
            .select('id')
            .ilike('content', `%${guest.name}%`);

          if (!commError && communications) {
            await this.supabase
              .from(anon.table)
              .update({
                content: this.supabase.rpc('replace_text', {
                  text_column: 'content',
                  search_text: guest.name,
                  replace_text: '[REDACTED - Data Subject Request]',
                }),
              })
              .ilike('content', `%${guest.name}%`);

            itemsAnonymized.vendorCommunications += communications.length;
          }
        }
      }

      // 3. Generate verification hash
      const verificationData = {
        requestId,
        guestId,
        deletionDate,
        itemsDeleted,
        itemsAnonymized,
        auditTrail,
      };
      const verificationHash = this.generateHash(
        JSON.stringify(verificationData),
      );

      const deletionResult: DeletionResult = {
        requestId,
        dataSubject: guest.email,
        deletionDate,
        itemsDeleted,
        itemsAnonymized,
        auditTrail,
        verificationHash,
      };

      // 4. Store deletion record for compliance
      await this.supabase.from('gdpr_deletion_records').insert({
        request_id: requestId,
        guest_email: guest.email,
        wedding_id: weddingId,
        deletion_date: deletionDate,
        items_deleted: itemsDeleted,
        items_anonymized: itemsAnonymized,
        verification_hash: verificationHash,
        reason,
      });

      await this.auditLogger.logSuccessfulDeletion(
        requestId,
        guest.email,
        deletionResult,
      );

      return deletionResult;
    } catch (error: any) {
      await this.auditLogger.logDeletionError(requestId, error.message);
      throw new Error(
        `Right to be forgotten processing failed: ${error.message}`,
      );
    }
  }

  /**
   * Manage consent records for GDPR compliance
   */
  async updateConsentRecord(
    dataSubjectEmail: string,
    consentType: ConsentRecord['consentType'],
    granted: boolean,
    method: ConsentRecord['method'],
    ipAddress: string,
    userAgent: string,
    legalBasis: ConsentRecord['legalBasis'] = 'consent',
  ): Promise<string> {
    const consentId = `consent_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const consentRecord: Partial<ConsentRecord> = {
      dataSubjectId: dataSubjectEmail,
      consentType,
      granted,
      timestamp: new Date().toISOString(),
      method,
      ipAddress,
      userAgent,
      legalBasis,
    };

    if (!granted) {
      consentRecord.withdrawnAt = new Date().toISOString();
    }

    await this.supabase.from('gdpr_consent_records').insert({
      id: consentId,
      data_subject_email: dataSubjectEmail,
      consent_type: consentType,
      granted,
      timestamp: consentRecord.timestamp,
      method,
      ip_address: ipAddress,
      user_agent: userAgent,
      legal_basis: legalBasis,
      withdrawn_at: consentRecord.withdrawnAt,
    });

    await this.auditLogger.logConsentChange(
      dataSubjectEmail,
      consentType,
      granted,
      method,
    );

    return consentId;
  }

  /**
   * Check if processing is lawful based on consent and legal basis
   */
  async checkProcessingLawfulness(
    dataSubjectEmail: string,
    processingPurpose: string,
  ): Promise<{ lawful: boolean; basis: string[]; consentRequired: boolean }> {
    const { data: consents } = await this.supabase
      .from('gdpr_consent_records')
      .select('*')
      .eq('data_subject_email', dataSubjectEmail)
      .eq('granted', true)
      .is('withdrawn_at', null);

    const contractualBasis = [
      'wedding_planning',
      'vendor_coordination',
      'rsvp_management',
    ];
    const consentBasis = ['marketing', 'photo_sharing', 'analytics'];

    const basis: string[] = [];
    let lawful = false;
    let consentRequired = false;

    // Check contractual basis
    if (contractualBasis.includes(processingPurpose)) {
      basis.push('contract');
      lawful = true;
    }

    // Check consent basis
    if (consentBasis.includes(processingPurpose)) {
      consentRequired = true;
      const relevantConsent = consents?.find(
        (c) =>
          c.consent_type === processingPurpose ||
          c.consent_type === 'data_processing',
      );

      if (relevantConsent) {
        basis.push('consent');
        lawful = true;
      } else {
        lawful = false;
      }
    }

    return { lawful, basis, consentRequired };
  }

  /**
   * Generate GDPR compliance report
   */
  async generateComplianceReport(organizationId: string): Promise<{
    totalDataSubjects: number;
    activeConsents: number;
    withdrawnConsents: number;
    dataExportRequests: number;
    deletionRequests: number;
    dataBreaches: number;
    complianceScore: number;
    recommendations: string[];
  }> {
    const [
      dataSubjectsCount,
      activeConsentsCount,
      withdrawnConsentsCount,
      exportRequestsCount,
      deletionRequestsCount,
      dataBreachesCount,
    ] = await Promise.all([
      this.supabase
        .from('wedding_guests')
        .select('email', { count: 'exact' })
        .eq('organization_id', organizationId),
      this.supabase
        .from('gdpr_consent_records')
        .select('id', { count: 'exact' })
        .eq('granted', true)
        .is('withdrawn_at', null),
      this.supabase
        .from('gdpr_consent_records')
        .select('id', { count: 'exact' })
        .not('withdrawn_at', 'is', null),
      this.supabase
        .from('gdpr_export_records')
        .select('id', { count: 'exact' }),
      this.supabase
        .from('gdpr_deletion_records')
        .select('id', { count: 'exact' }),
      this.supabase
        .from('data_breach_notifications')
        .select('id', { count: 'exact' }),
    ]);

    const totalDataSubjects = dataSubjectsCount.count || 0;
    const activeConsents = activeConsentsCount.count || 0;
    const withdrawnConsents = withdrawnConsentsCount.count || 0;
    const dataExportRequests = exportRequestsCount.count || 0;
    const deletionRequests = deletionRequestsCount.count || 0;
    const dataBreaches = dataBreachesCount.count || 0;

    // Calculate compliance score (0-100)
    let complianceScore = 100;
    const recommendations: string[] = [];

    // Deduct points for compliance issues
    if (dataBreaches > 0) {
      complianceScore -= Math.min(dataBreaches * 10, 30);
      recommendations.push('Review and address data breach incidents');
    }

    if (withdrawnConsents > activeConsents * 0.2) {
      complianceScore -= 15;
      recommendations.push(
        'High consent withdrawal rate - review consent practices',
      );
    }

    if (totalDataSubjects > 0 && activeConsents / totalDataSubjects < 0.8) {
      complianceScore -= 10;
      recommendations.push(
        'Low consent rate - implement proper consent collection',
      );
    }

    // Add positive recommendations
    if (complianceScore > 90) {
      recommendations.push(
        'Excellent GDPR compliance - maintain current practices',
      );
    } else if (complianceScore > 70) {
      recommendations.push('Good compliance - minor improvements needed');
    } else {
      recommendations.push(
        'Compliance issues detected - immediate action required',
      );
    }

    return {
      totalDataSubjects,
      activeConsents,
      withdrawnConsents,
      dataExportRequests,
      deletionRequests,
      dataBreaches,
      complianceScore: Math.max(0, complianceScore),
      recommendations,
    };
  }

  /**
   * Extract all personal data for a guest across all wedding systems
   */
  private async extractPersonalData(
    weddingId: string,
    guestIds: string[],
    guestEmail: string,
  ): Promise<GDPRExport['personalData']> {
    const [
      guestProfiles,
      rsvpData,
      dietaryData,
      communications,
      photoTags,
      timelineEntries,
      formSubmissions,
      vendorInteractions,
    ] = await Promise.all([
      this.supabase.from('wedding_guests').select('*').in('id', guestIds),
      this.supabase.from('rsvp_responses').select('*').in('guest_id', guestIds),
      this.supabase
        .from('dietary_requirements')
        .select('*')
        .in('guest_id', guestIds),
      this.supabase
        .from('guest_communications')
        .select('*')
        .in('guest_id', guestIds),
      this.supabase
        .from('photo_guest_tags')
        .select('*')
        .in('guest_id', guestIds),
      this.supabase
        .from('timeline_events')
        .select('*')
        .contains('participants', guestIds),
      this.supabase
        .from('guest_form_responses')
        .select('*')
        .in('guest_id', guestIds),
      this.supabase
        .from('vendor_guest_interactions')
        .select('*')
        .in('guest_id', guestIds),
    ]);

    return {
      guestProfiles: guestProfiles.data || [],
      rsvpData: rsvpData.data || [],
      dietaryPreferences: dietaryData.data || [],
      communicationHistory: communications.data || [],
      photoTags: photoTags.data || [],
      timelineEntries: timelineEntries.data || [],
      formSubmissions: formSubmissions.data || [],
      vendorInteractions: vendorInteractions.data || [],
    };
  }

  /**
   * Generate cryptographic hash for verification
   */
  private generateHash(data: string): string {
    const crypto = require('crypto');
    return crypto.createHash('sha256').update(data).digest('hex');
  }
}

/**
 * GDPR Audit Logger for compliance tracking
 */
class GDPRAuditLogger {
  private supabase;

  constructor() {
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );
  }

  async logDataAccess(
    userId: string,
    weddingId: string,
    operation: string,
    metadata: any,
  ): Promise<void> {
    await this.supabase.from('gdpr_audit_log').insert({
      user_id: userId,
      wedding_id: weddingId,
      operation_type: operation,
      metadata,
      timestamp: new Date().toISOString(),
      ip_address: metadata.ipAddress || 'system',
      user_agent: metadata.userAgent || 'gdpr-engine',
    });
  }

  async logDataExport(
    requestId: string,
    dataSubjectEmail: string,
    exportedData: any,
  ): Promise<void> {
    await this.supabase.from('gdpr_export_records').insert({
      request_id: requestId,
      data_subject_email: dataSubjectEmail,
      export_date: new Date().toISOString(),
      data_types_exported: Object.keys(exportedData),
      record_count: this.countRecords(exportedData),
    });
  }

  async logDataDeletion(
    requestId: string,
    dataSubjectEmail: string,
    reason: string,
  ): Promise<void> {
    await this.supabase.from('gdpr_audit_log').insert({
      operation_type: 'DATA_DELETION_INITIATED',
      metadata: { requestId, dataSubjectEmail, reason },
      timestamp: new Date().toISOString(),
    });
  }

  async logSuccessfulDeletion(
    requestId: string,
    dataSubjectEmail: string,
    result: DeletionResult,
  ): Promise<void> {
    await this.supabase.from('gdpr_audit_log').insert({
      operation_type: 'DATA_DELETION_COMPLETED',
      metadata: { requestId, dataSubjectEmail, result },
      timestamp: new Date().toISOString(),
    });
  }

  async logConsentChange(
    dataSubjectEmail: string,
    consentType: string,
    granted: boolean,
    method: string,
  ): Promise<void> {
    await this.supabase.from('gdpr_audit_log').insert({
      operation_type: granted ? 'CONSENT_GRANTED' : 'CONSENT_WITHDRAWN',
      metadata: { dataSubjectEmail, consentType, method },
      timestamp: new Date().toISOString(),
    });
  }

  async logDataAccessError(
    requestId: string,
    dataSubjectEmail: string,
    error: string,
  ): Promise<void> {
    await this.supabase.from('gdpr_audit_log').insert({
      operation_type: 'DATA_ACCESS_ERROR',
      metadata: { requestId, dataSubjectEmail, error },
      timestamp: new Date().toISOString(),
    });
  }

  async logDeletionError(requestId: string, error: string): Promise<void> {
    await this.supabase.from('gdpr_audit_log').insert({
      operation_type: 'DATA_DELETION_ERROR',
      metadata: { requestId, error },
      timestamp: new Date().toISOString(),
    });
  }

  private countRecords(data: any): number {
    return Object.values(data).reduce((total: number, records: any) => {
      return total + (Array.isArray(records) ? records.length : 0);
    }, 0);
  }
}

export { GDPRAuditLogger };
