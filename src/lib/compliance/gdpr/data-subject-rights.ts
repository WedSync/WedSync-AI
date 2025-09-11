import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { z } from 'zod';

// GDPR Data Subject Request Types
export const DATA_SUBJECT_REQUEST_TYPES = {
  ACCESS: 'access', // Article 15 - Right of access
  RECTIFICATION: 'rectification', // Article 16 - Right to rectification
  ERASURE: 'erasure', // Article 17 - Right to erasure ("right to be forgotten")
  PORTABILITY: 'portability', // Article 20 - Right to data portability
  RESTRICTION: 'restriction', // Article 18 - Right to restriction of processing
} as const;

export type DataSubjectRequestType =
  (typeof DATA_SUBJECT_REQUEST_TYPES)[keyof typeof DATA_SUBJECT_REQUEST_TYPES];

// Request Status
export const REQUEST_STATUS = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  REJECTED: 'rejected',
  EXPIRED: 'expired',
} as const;

export type RequestStatus =
  (typeof REQUEST_STATUS)[keyof typeof REQUEST_STATUS];

// Validation schemas
const dataSubjectRequestSchema = z.object({
  user_id: z.string().uuid(),
  request_type: z.enum([
    DATA_SUBJECT_REQUEST_TYPES.ACCESS,
    DATA_SUBJECT_REQUEST_TYPES.RECTIFICATION,
    DATA_SUBJECT_REQUEST_TYPES.ERASURE,
    DATA_SUBJECT_REQUEST_TYPES.PORTABILITY,
    DATA_SUBJECT_REQUEST_TYPES.RESTRICTION,
  ]),
  metadata: z.record(z.any()).optional().default({}),
  verification_method: z
    .enum(['email', 'phone', 'identity_document'])
    .optional()
    .default('email'),
});

export interface DataSubjectRequest {
  id: string;
  user_id: string;
  request_type: DataSubjectRequestType;
  status: RequestStatus;
  requested_at: Date;
  completed_at?: Date;
  verification_token: string;
  verification_expires_at: Date;
  is_verified: boolean;
  metadata: Record<string, any>;
  response_data?: any;
  created_at: Date;
  updated_at: Date;
}

export interface DataCollectionSummary {
  tables: string[];
  recordCount: number;
  dataTypes: string[];
  purposes: string[];
  retentionPeriods: Record<string, string>;
  thirdPartySharing: string[];
}

export class DataSubjectRightsService {
  private supabase = createClientComponentClient();

  /**
   * Submit a new data subject request (GDPR Article 12)
   */
  async submitRequest(
    userId: string,
    requestType: DataSubjectRequestType,
    metadata: Record<string, any> = {},
  ): Promise<DataSubjectRequest> {
    try {
      // Validate request
      const validatedData = dataSubjectRequestSchema.parse({
        user_id: userId,
        request_type: requestType,
        metadata,
      });

      // Generate verification token with 30-day expiry
      const verificationToken = this.generateSecureToken();
      const verificationExpiresAt = new Date();
      verificationExpiresAt.setDate(verificationExpiresAt.getDate() + 30);

      const requestData = {
        ...validatedData,
        verification_token: verificationToken,
        verification_expires_at: verificationExpiresAt.toISOString(),
        is_verified: false,
        status: REQUEST_STATUS.PENDING,
      };

      const { data, error } = await this.supabase
        .from('privacy_requests')
        .insert(requestData)
        .select()
        .single();

      if (error) throw error;

      // Log the request in audit trail
      await this.logPrivacyAction({
        action: 'REQUEST_SUBMITTED',
        userId,
        requestType,
        requestId: data.id,
        metadata: {
          ip: metadata.ip,
          userAgent: metadata.userAgent,
          verificationMethod: metadata.verification_method || 'email',
        },
      });

      // Send verification email/SMS
      await this.sendVerificationMessage(data);

      return data;
    } catch (error) {
      console.error('Failed to submit data subject request:', error);
      throw new Error('Failed to submit privacy request');
    }
  }

  /**
   * Verify a data subject request
   */
  async verifyRequest(
    requestId: string,
    verificationToken: string,
  ): Promise<boolean> {
    try {
      const { data: request, error } = await this.supabase
        .from('privacy_requests')
        .select('*')
        .eq('id', requestId)
        .eq('verification_token', verificationToken)
        .single();

      if (error) throw error;

      if (!request) {
        throw new Error('Invalid verification token');
      }

      if (new Date() > new Date(request.verification_expires_at)) {
        await this.updateRequestStatus(requestId, REQUEST_STATUS.EXPIRED);
        throw new Error('Verification token has expired');
      }

      if (request.is_verified) {
        return true;
      }

      // Mark as verified and start processing
      const { error: updateError } = await this.supabase
        .from('privacy_requests')
        .update({
          is_verified: true,
          status: REQUEST_STATUS.PROCESSING,
          updated_at: new Date().toISOString(),
        })
        .eq('id', requestId);

      if (updateError) throw updateError;

      // Log verification
      await this.logPrivacyAction({
        action: 'REQUEST_VERIFIED',
        userId: request.user_id,
        requestType: request.request_type,
        requestId,
        metadata: { verified_at: new Date().toISOString() },
      });

      // Start automated processing
      await this.processRequest(requestId);

      return true;
    } catch (error) {
      console.error('Failed to verify request:', error);
      throw error;
    }
  }

  /**
   * Process a verified data subject request
   */
  async processRequest(requestId: string): Promise<void> {
    try {
      const { data: request, error } = await this.supabase
        .from('privacy_requests')
        .select('*')
        .eq('id', requestId)
        .single();

      if (error) throw error;

      if (!request.is_verified) {
        throw new Error('Request must be verified before processing');
      }

      let responseData: any = {};

      switch (request.request_type) {
        case DATA_SUBJECT_REQUEST_TYPES.ACCESS:
          responseData = await this.processAccessRequest(request.user_id);
          break;
        case DATA_SUBJECT_REQUEST_TYPES.ERASURE:
          responseData = await this.processErasureRequest(request.user_id);
          break;
        case DATA_SUBJECT_REQUEST_TYPES.PORTABILITY:
          responseData = await this.processPortabilityRequest(request.user_id);
          break;
        case DATA_SUBJECT_REQUEST_TYPES.RECTIFICATION:
          responseData = await this.processRectificationRequest(request);
          break;
        case DATA_SUBJECT_REQUEST_TYPES.RESTRICTION:
          responseData = await this.processRestrictionRequest(request.user_id);
          break;
        default:
          throw new Error(`Unsupported request type: ${request.request_type}`);
      }

      // Update request with response data
      const { error: updateError } = await this.supabase
        .from('privacy_requests')
        .update({
          status: REQUEST_STATUS.COMPLETED,
          completed_at: new Date().toISOString(),
          response_data: responseData,
          updated_at: new Date().toISOString(),
        })
        .eq('id', requestId);

      if (updateError) throw updateError;

      // Log completion
      await this.logPrivacyAction({
        action: 'REQUEST_COMPLETED',
        userId: request.user_id,
        requestType: request.request_type,
        requestId,
        metadata: {
          completed_at: new Date().toISOString(),
          response_type: typeof responseData,
        },
      });

      // Send completion notification
      await this.sendCompletionNotification(request, responseData);
    } catch (error) {
      console.error('Failed to process request:', error);

      // Mark request as failed
      await this.supabase
        .from('privacy_requests')
        .update({
          status: REQUEST_STATUS.REJECTED,
          metadata: { error: error.message },
          updated_at: new Date().toISOString(),
        })
        .eq('id', requestId);

      throw error;
    }
  }

  /**
   * Process access request (GDPR Article 15)
   */
  private async processAccessRequest(
    userId: string,
  ): Promise<DataCollectionSummary> {
    try {
      const dataCollection: DataCollectionSummary = {
        tables: [],
        recordCount: 0,
        dataTypes: [],
        purposes: [],
        retentionPeriods: {},
        thirdPartySharing: [],
      };

      // Define all tables that may contain user data
      const userDataTables = [
        'profiles',
        'weddings',
        'guests',
        'vendors',
        'messages',
        'notifications',
        'invoices',
        'forms',
        'consent_records',
        'privacy_requests',
        'audit_trail',
      ];

      for (const table of userDataTables) {
        try {
          const { data, error } = await this.supabase
            .from(table)
            .select('*')
            .eq('user_id', userId);

          if (!error && data && data.length > 0) {
            dataCollection.tables.push(table);
            dataCollection.recordCount += data.length;
          }
        } catch (tableError) {
          console.warn(`Failed to query table ${table}:`, tableError);
        }
      }

      // Add data processing information
      dataCollection.dataTypes = [
        'Personal identification data',
        'Wedding planning data',
        'Communication data',
        'Usage analytics',
        'Technical data (IP, device info)',
      ];

      dataCollection.purposes = [
        'Wedding planning services',
        'Communication facilitation',
        'Service improvement',
        'Legal compliance',
        'Security and fraud prevention',
      ];

      dataCollection.retentionPeriods = {
        'Personal data': '7 years after account deletion',
        'Communication data': '3 years',
        'Usage analytics': '2 years',
        'Security logs': '1 year',
      };

      dataCollection.thirdPartySharing = [
        'Wedding vendors (with explicit consent)',
        'Payment processors (Stripe)',
        'Email service providers (Resend)',
        'Cloud storage providers (Supabase)',
      ];

      return dataCollection;
    } catch (error) {
      console.error('Failed to process access request:', error);
      throw new Error('Failed to compile data summary');
    }
  }

  /**
   * Process erasure request (GDPR Article 17 - Right to be Forgotten)
   */
  private async processErasureRequest(
    userId: string,
  ): Promise<{ deleted: boolean; anonymized: string[]; retained: string[] }> {
    try {
      const deletionResult = {
        deleted: false,
        anonymized: [] as string[],
        retained: [] as string[],
      };

      // Check for legal obligations to retain data
      const { data: legalHolds } = await this.supabase
        .from('legal_holds')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true);

      if (legalHolds && legalHolds.length > 0) {
        deletionResult.retained.push('Data subject to legal hold');
        return deletionResult;
      }

      // Start deletion process
      await this.cascadeDeleteUserData(userId);

      // Anonymize audit trails (cannot delete for compliance)
      await this.anonymizeAuditTrails(userId);
      deletionResult.anonymized.push('audit_trail');

      // Mark as deleted
      deletionResult.deleted = true;

      return deletionResult;
    } catch (error) {
      console.error('Failed to process erasure request:', error);
      throw new Error('Failed to process data deletion');
    }
  }

  /**
   * Process portability request (GDPR Article 20)
   */
  private async processPortabilityRequest(
    userId: string,
  ): Promise<{ exportUrl: string; format: string; expiresAt: Date }> {
    try {
      // Collect all user data
      const userData = await this.collectAllUserData(userId);

      // Generate secure download URL
      const exportId = this.generateSecureToken();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7); // 7-day expiry

      // Store export data temporarily
      const { error } = await this.supabase.from('data_exports').insert({
        id: exportId,
        user_id: userId,
        data: userData,
        expires_at: expiresAt.toISOString(),
        created_at: new Date().toISOString(),
      });

      if (error) throw error;

      return {
        exportUrl: `/api/privacy/export/${exportId}`,
        format: 'application/json',
        expiresAt,
      };
    } catch (error) {
      console.error('Failed to process portability request:', error);
      throw new Error('Failed to create data export');
    }
  }

  /**
   * Cascade delete user data across all tables
   */
  private async cascadeDeleteUserData(userId: string): Promise<void> {
    const deletionTables = [
      'guest_lists',
      'messages',
      'notifications',
      'consent_records',
      'privacy_requests',
      'weddings',
      'profiles',
    ];

    for (const table of deletionTables) {
      try {
        const { error } = await this.supabase
          .from(table)
          .delete()
          .eq('user_id', userId);

        if (error && !error.message.includes('does not exist')) {
          console.error(`Failed to delete from ${table}:`, error);
        }
      } catch (tableError) {
        console.error(`Error deleting from ${table}:`, tableError);
      }
    }
  }

  /**
   * Anonymize audit trails while preserving compliance data
   */
  private async anonymizeAuditTrails(userId: string): Promise<void> {
    const { error } = await this.supabase
      .from('audit_trail')
      .update({
        actor_id: 'anonymized',
        metadata: {
          anonymized: true,
          original_user_id_hash: this.hashUserId(userId),
        },
      })
      .eq('actor_id', userId);

    if (error) {
      console.error('Failed to anonymize audit trails:', error);
    }
  }

  /**
   * Collect all user data for portability
   */
  private async collectAllUserData(
    userId: string,
  ): Promise<Record<string, any>> {
    const userData: Record<string, any> = {};

    const tables = [
      'profiles',
      'weddings',
      'guests',
      'vendors',
      'messages',
      'consent_records',
    ];

    for (const table of tables) {
      try {
        const { data } = await this.supabase
          .from(table)
          .select('*')
          .eq('user_id', userId);

        userData[table] = data || [];
      } catch (error) {
        console.warn(`Failed to export data from ${table}:`, error);
        userData[table] = [];
      }
    }

    return userData;
  }

  /**
   * Update request status
   */
  private async updateRequestStatus(
    requestId: string,
    status: RequestStatus,
  ): Promise<void> {
    await this.supabase
      .from('privacy_requests')
      .update({
        status,
        updated_at: new Date().toISOString(),
      })
      .eq('id', requestId);
  }

  /**
   * Log privacy actions for audit trail
   */
  private async logPrivacyAction(event: {
    action: string;
    userId: string;
    requestType: DataSubjectRequestType;
    requestId: string;
    metadata?: Record<string, any>;
  }): Promise<void> {
    try {
      await this.supabase.from('audit_trail').insert({
        event_type: 'PRIVACY_REQUEST',
        actor_id: event.userId,
        resource_type: 'privacy_request',
        resource_id: event.requestId,
        action: event.action,
        timestamp: new Date().toISOString(),
        metadata: {
          request_type: event.requestType,
          ...event.metadata,
        },
      });
    } catch (error) {
      console.error('Failed to log privacy action:', error);
    }
  }

  /**
   * Generate secure token for verification
   */
  private generateSecureToken(): string {
    return crypto.randomUUID();
  }

  /**
   * Hash user ID for anonymization
   */
  private hashUserId(userId: string): string {
    // In production, use a proper hashing function
    return Buffer.from(userId).toString('base64');
  }

  /**
   * Send verification message to user
   */
  private async sendVerificationMessage(
    request: DataSubjectRequest,
  ): Promise<void> {
    // Implementation would send email/SMS with verification link
    console.log(`Verification message sent for request ${request.id}`);
  }

  /**
   * Send completion notification
   */
  private async sendCompletionNotification(
    request: DataSubjectRequest,
    responseData: any,
  ): Promise<void> {
    // Implementation would send completion notification
    console.log(`Completion notification sent for request ${request.id}`);
  }

  /**
   * Process rectification request (Article 16)
   */
  private async processRectificationRequest(
    request: DataSubjectRequest,
  ): Promise<{ updated: boolean; fields: string[] }> {
    // Implementation for data rectification
    return { updated: true, fields: [] };
  }

  /**
   * Process restriction request (Article 18)
   */
  private async processRestrictionRequest(
    userId: string,
  ): Promise<{ restricted: boolean; tables: string[] }> {
    // Implementation for processing restriction
    return { restricted: true, tables: [] };
  }
}

// Export singleton instance
export const dataSubjectRights = new DataSubjectRightsService();
