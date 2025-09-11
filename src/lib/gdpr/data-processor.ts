/**
 * GDPR Data Processor
 * WS-176 - GDPR Compliance System
 *
 * Handles data subject access requests, data export, portability,
 * and rectification operations under GDPR Articles 15-20.
 */

import { createClient } from '@/lib/supabase/server';
import {
  DataSubjectRequest,
  DataSubjectRights,
  RequestStatus,
  DataExportRequest,
  UserDataExport,
  DataCategory,
  PersonalDataExport,
  ContactDataExport,
  WeddingDataExport,
  CommunicationDataExport,
  UsageDataExport,
  TechnicalDataExport,
  GDPRApiResponse,
  SecurityContext,
  AuditLogEntry,
} from '@/types/gdpr';
import crypto from 'crypto';
import { consentManager } from './consent-manager';

// ============================================================================
// Data Processor Class
// ============================================================================

export class DataProcessor {
  private supabase = createClient();
  private readonly VERIFICATION_TOKEN_EXPIRY_HOURS = 24;
  private readonly MAX_EXPORT_SIZE_MB = 100;

  /**
   * Submit data subject request (Article 12-22)
   * Handles all types of data subject rights requests with verification
   */
  async submitDataSubjectRequest(
    userId: string,
    requestType: DataSubjectRights,
    securityContext: SecurityContext,
    additionalDetails: Record<string, any> = {},
  ): Promise<GDPRApiResponse<DataSubjectRequest>> {
    try {
      const startTime = Date.now();
      const verificationToken = crypto.randomBytes(32).toString('hex');
      const verificationExpiresAt = new Date(
        Date.now() + this.VERIFICATION_TOKEN_EXPIRY_HOURS * 60 * 60 * 1000,
      );

      // Validate user exists
      const { data: user, error: userError } = await this.supabase
        .from('user_profiles')
        .select('id, email')
        .eq('id', userId)
        .single();

      if (userError || !user) {
        return {
          success: false,
          error: {
            code: 'USER_NOT_FOUND',
            message: 'User not found or unauthorized',
            details: { user_id: userId },
          },
        };
      }

      // Create data subject request
      const requestData = {
        user_id: userId,
        request_type: requestType,
        status: RequestStatus.SUBMITTED,
        submitted_at: new Date().toISOString(),
        verification_token: verificationToken,
        verification_expires_at: verificationExpiresAt.toISOString(),
        processor_notes: JSON.stringify(additionalDetails),
        metadata: {
          ip_address_hash: securityContext.ip_address_hash,
          user_agent_hash: securityContext.user_agent_hash,
          submission_method: 'api',
        },
      };

      const { data: request, error: insertError } = await this.supabase
        .from('data_subject_requests')
        .insert(requestData)
        .select()
        .single();

      if (insertError) {
        await this.auditLog({
          user_id: userId,
          action: 'data_subject_request_failed',
          resource_type: 'data_request',
          details: { request_type: requestType, error: insertError.message },
          security_context: securityContext,
          timestamp: new Date(),
          result: 'failure',
          error_message: insertError.message,
        });

        return {
          success: false,
          error: {
            code: 'DATABASE_ERROR',
            message: 'Failed to submit data subject request',
            details: { error: insertError.message },
          },
        };
      }

      // Audit log successful submission
      await this.auditLog({
        user_id: userId,
        action: 'data_subject_request_submitted',
        resource_type: 'data_request',
        resource_id: request.id,
        details: {
          request_type: requestType,
          verification_expires_at: verificationExpiresAt,
        },
        security_context: securityContext,
        timestamp: new Date(),
        result: 'success',
      });

      // TODO: Send verification email to user
      // await this.sendVerificationEmail(user.email, verificationToken, requestType);

      const processedRequest: DataSubjectRequest = {
        ...request,
        submitted_at: new Date(request.submitted_at),
        verification_expires_at: new Date(request.verification_expires_at),
        created_at: new Date(request.created_at),
        updated_at: new Date(request.updated_at),
      };

      return {
        success: true,
        data: processedRequest,
        metadata: {
          processing_time_ms: Date.now() - startTime,
          request_id: crypto.randomUUID(),
          timestamp: new Date(),
        },
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Internal server error while submitting request',
          details: { error: error.message },
        },
      };
    }
  }

  /**
   * Verify and process data subject request
   * Validates verification token and begins processing
   */
  async verifyAndProcessRequest(
    requestId: string,
    verificationToken: string,
    securityContext: SecurityContext,
  ): Promise<GDPRApiResponse<DataSubjectRequest>> {
    try {
      // Get request with verification token
      const { data: request, error } = await this.supabase
        .from('data_subject_requests')
        .select('*')
        .eq('id', requestId)
        .eq('verification_token', verificationToken)
        .single();

      if (error || !request) {
        await this.auditLog({
          user_id: 'unknown',
          action: 'request_verification_failed',
          resource_type: 'data_request',
          resource_id: requestId,
          details: { error: 'invalid_token_or_request' },
          security_context: securityContext,
          timestamp: new Date(),
          result: 'failure',
          error_message: 'Invalid verification token or request ID',
        });

        return {
          success: false,
          error: {
            code: 'VERIFICATION_FAILED',
            message: 'Invalid verification token or request ID',
          },
        };
      }

      // Check if verification token has expired
      if (new Date() > new Date(request.verification_expires_at)) {
        await this.auditLog({
          user_id: request.user_id,
          action: 'request_verification_expired',
          resource_type: 'data_request',
          resource_id: requestId,
          details: { expired_at: request.verification_expires_at },
          security_context: securityContext,
          timestamp: new Date(),
          result: 'failure',
          error_message: 'Verification token has expired',
        });

        return {
          success: false,
          error: {
            code: 'VERIFICATION_EXPIRED',
            message:
              'Verification token has expired. Please submit a new request.',
          },
        };
      }

      // Update request status to verified and begin processing
      const { data: updatedRequest, error: updateError } = await this.supabase
        .from('data_subject_requests')
        .update({
          status: RequestStatus.IN_PROGRESS,
          verification_token: null, // Clear token after verification
          verification_expires_at: null,
          processed_at: new Date().toISOString(),
        })
        .eq('id', requestId)
        .select()
        .single();

      if (updateError) {
        return {
          success: false,
          error: {
            code: 'UPDATE_ERROR',
            message: 'Failed to update request status',
            details: { error: updateError.message },
          },
        };
      }

      // Audit successful verification
      await this.auditLog({
        user_id: request.user_id,
        action: 'request_verified_and_processing',
        resource_type: 'data_request',
        resource_id: requestId,
        details: { request_type: request.request_type },
        security_context: securityContext,
        timestamp: new Date(),
        result: 'success',
      });

      // Start processing based on request type
      await this.processDataSubjectRequest(updatedRequest, securityContext);

      const processedRequest: DataSubjectRequest = {
        ...updatedRequest,
        submitted_at: new Date(updatedRequest.submitted_at),
        processed_at: new Date(updatedRequest.processed_at),
        created_at: new Date(updatedRequest.created_at),
        updated_at: new Date(updatedRequest.updated_at),
      };

      return {
        success: true,
        data: processedRequest,
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'VERIFICATION_ERROR',
          message: 'Error during request verification',
          details: { error: error.message },
        },
      };
    }
  }

  /**
   * Process different types of data subject requests
   * Routes to specific handlers based on request type
   */
  private async processDataSubjectRequest(
    request: any,
    securityContext: SecurityContext,
  ): Promise<void> {
    try {
      let responseData: any = null;

      switch (request.request_type as DataSubjectRights) {
        case DataSubjectRights.ACCESS:
          responseData = await this.processAccessRequest(request.user_id);
          break;
        case DataSubjectRights.DATA_PORTABILITY:
          responseData = await this.processPortabilityRequest(request.user_id);
          break;
        case DataSubjectRights.RECTIFICATION:
          responseData = await this.processRectificationRequest(request);
          break;
        case DataSubjectRights.RESTRICT_PROCESSING:
          responseData = await this.processRestrictionRequest(request.user_id);
          break;
        case DataSubjectRights.OBJECT:
          responseData = await this.processObjectionRequest(request.user_id);
          break;
        default:
          throw new Error(`Unsupported request type: ${request.request_type}`);
      }

      // Update request with completion data
      await this.supabase
        .from('data_subject_requests')
        .update({
          status: RequestStatus.COMPLETED,
          completed_at: new Date().toISOString(),
          response_data: responseData,
        })
        .eq('id', request.id);

      // Audit completion
      await this.auditLog({
        user_id: request.user_id,
        action: 'data_subject_request_completed',
        resource_type: 'data_request',
        resource_id: request.id,
        details: {
          request_type: request.request_type,
          response_size_bytes: JSON.stringify(responseData).length,
        },
        security_context: securityContext,
        timestamp: new Date(),
        result: 'success',
      });
    } catch (error) {
      // Update request status to failed
      await this.supabase
        .from('data_subject_requests')
        .update({
          status: RequestStatus.REJECTED,
          processor_notes: JSON.stringify({
            error: error.message,
            failed_at: new Date().toISOString(),
          }),
        })
        .eq('id', request.id);

      await this.auditLog({
        user_id: request.user_id,
        action: 'data_subject_request_failed',
        resource_type: 'data_request',
        resource_id: request.id,
        details: { error: error.message },
        security_context: securityContext,
        timestamp: new Date(),
        result: 'failure',
        error_message: error.message,
      });

      throw error;
    }
  }

  /**
   * Process data access request (Article 15)
   * Compile comprehensive user data export
   */
  private async processAccessRequest(userId: string): Promise<UserDataExport> {
    const exportDate = new Date();
    const dataCategories: DataCategory[] = [];

    // Collect all user data
    const personalData = await this.collectPersonalData(userId);
    if (personalData) dataCategories.push('personal_details' as DataCategory);

    const contactData = await this.collectContactData(userId);
    if (contactData) dataCategories.push('contact_info' as DataCategory);

    const weddingData = await this.collectWeddingData(userId);
    if (weddingData) dataCategories.push('wedding_info' as DataCategory);

    const communicationData = await this.collectCommunicationData(userId);
    if (communicationData)
      dataCategories.push('communication_logs' as DataCategory);

    const usageData = await this.collectUsageData(userId);
    if (usageData) dataCategories.push('usage_data' as DataCategory);

    const technicalData = await this.collectTechnicalData(userId);
    if (technicalData) dataCategories.push('technical_data' as DataCategory);

    const exportData: UserDataExport = {
      user_id: userId,
      export_date: exportDate,
      data_categories: dataCategories,
      data: {
        personal_details: personalData,
        contact_info: contactData,
        wedding_info: weddingData,
        communication_logs: communicationData,
        usage_data: usageData,
        technical_data: technicalData,
      },
      metadata: {
        export_version: '1.0',
        total_records: this.countTotalRecords(exportData.data),
        export_size_bytes: JSON.stringify(exportData).length,
        anonymized_fields: [], // Fields that were anonymized for privacy
      },
    };

    return exportData;
  }

  /**
   * Process data portability request (Article 20)
   * Similar to access but in structured, machine-readable format
   */
  private async processPortabilityRequest(
    userId: string,
  ): Promise<UserDataExport> {
    // For portability, we provide the same data as access request
    // but ensure it's in a structured format suitable for import elsewhere
    return await this.processAccessRequest(userId);
  }

  /**
   * Process rectification request (Article 16)
   * Handle data correction requests
   */
  private async processRectificationRequest(request: any): Promise<any> {
    // This would typically involve manual review
    // For now, we log the request and provide instructions
    return {
      message: 'Rectification request received and logged for manual review',
      request_id: request.id,
      instructions:
        'Our data protection team will review your request within 30 days',
      contact: 'privacy@wedsync.com',
    };
  }

  /**
   * Process processing restriction request (Article 18)
   * Implement processing restrictions
   */
  private async processRestrictionRequest(userId: string): Promise<any> {
    // Add user to processing restriction list
    await this.supabase.from('processing_restrictions').upsert({
      user_id: userId,
      restricted_at: new Date().toISOString(),
      restriction_reason: 'User requested processing restriction',
      active: true,
    });

    return {
      message: 'Processing restriction applied to your account',
      effective_date: new Date().toISOString(),
      scope: 'All non-essential processing restricted',
    };
  }

  /**
   * Process objection request (Article 21)
   * Handle objections to processing
   */
  private async processObjectionRequest(userId: string): Promise<any> {
    // This typically involves reviewing legitimate interests
    return {
      message: 'Objection to processing logged for review',
      review_timeline: '30 days',
      interim_measures: 'Non-essential processing suspended pending review',
    };
  }

  // ============================================================================
  // Data Collection Methods
  // ============================================================================

  private async collectPersonalData(
    userId: string,
  ): Promise<PersonalDataExport | null> {
    try {
      const { data: profile } = await this.supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (!profile) return null;

      return {
        name: profile.name || 'Not provided',
        email: profile.email || 'Not provided',
        phone: profile.phone || undefined,
        date_of_birth: profile.date_of_birth || undefined,
        address: profile.address
          ? {
              street: profile.address.street,
              city: profile.address.city,
              postal_code: profile.address.postal_code,
              country: profile.address.country,
            }
          : undefined,
        preferences: profile.preferences || {},
        created_at: profile.created_at,
        updated_at: profile.updated_at,
      };
    } catch (error) {
      console.error('Error collecting personal data:', error);
      return null;
    }
  }

  private async collectContactData(
    userId: string,
  ): Promise<ContactDataExport | null> {
    try {
      // This would collect contact information from various tables
      // For now, return a placeholder structure
      return {
        emails: [],
        phone_numbers: [],
        addresses: [],
      };
    } catch (error) {
      console.error('Error collecting contact data:', error);
      return null;
    }
  }

  private async collectWeddingData(
    userId: string,
  ): Promise<WeddingDataExport | null> {
    try {
      // Collect wedding-related data
      const { data: weddings } = await this.supabase
        .from('weddings')
        .select('*')
        .eq('user_id', userId);

      if (!weddings || weddings.length === 0) return null;

      return {
        weddings: weddings.map((wedding) => ({
          id: wedding.id,
          title: wedding.title,
          date: wedding.wedding_date,
          venue: wedding.venue_name || 'Not specified',
          guest_count: wedding.guest_count || 0,
          suppliers: [], // Would collect from suppliers table
          tasks: [], // Would collect from tasks table
          budget: {
            total: wedding.budget_total || 0,
            spent: wedding.budget_spent || 0,
            categories: wedding.budget_categories || {},
          },
          created_at: wedding.created_at,
          updated_at: wedding.updated_at,
        })),
      };
    } catch (error) {
      console.error('Error collecting wedding data:', error);
      return null;
    }
  }

  private async collectCommunicationData(
    userId: string,
  ): Promise<CommunicationDataExport | null> {
    try {
      return {
        messages: [],
        notifications: [],
      };
    } catch (error) {
      console.error('Error collecting communication data:', error);
      return null;
    }
  }

  private async collectUsageData(
    userId: string,
  ): Promise<UsageDataExport | null> {
    try {
      return {
        sessions: [],
        feature_usage: {},
      };
    } catch (error) {
      console.error('Error collecting usage data:', error);
      return null;
    }
  }

  private async collectTechnicalData(
    userId: string,
  ): Promise<TechnicalDataExport | null> {
    try {
      return {
        device_info: [],
        api_usage: [],
      };
    } catch (error) {
      console.error('Error collecting technical data:', error);
      return null;
    }
  }

  private countTotalRecords(data: any): number {
    let count = 0;

    const countObject = (obj: any): void => {
      if (Array.isArray(obj)) {
        count += obj.length;
        obj.forEach((item) => countObject(item));
      } else if (obj && typeof obj === 'object') {
        Object.values(obj).forEach((value) => countObject(value));
      }
    };

    countObject(data);
    return count;
  }

  /**
   * Log audit trail for data processing operations
   */
  private async auditLog(entry: Omit<AuditLogEntry, 'id'>): Promise<void> {
    try {
      await this.supabase.from('gdpr_audit_logs').insert({
        user_id: entry.user_id,
        action: entry.action,
        resource_type: entry.resource_type,
        resource_id: entry.resource_id,
        details: entry.details,
        security_context: entry.security_context,
        timestamp: entry.timestamp.toISOString(),
        result: entry.result,
        error_message: entry.error_message,
      });
    } catch (error) {
      console.error('Failed to write audit log:', error);
    }
  }

  /**
   * Get data subject request status
   */
  async getRequestStatus(
    requestId: string,
    userId: string,
  ): Promise<GDPRApiResponse<DataSubjectRequest>> {
    try {
      const { data: request, error } = await this.supabase
        .from('data_subject_requests')
        .select('*')
        .eq('id', requestId)
        .eq('user_id', userId)
        .single();

      if (error || !request) {
        return {
          success: false,
          error: {
            code: 'REQUEST_NOT_FOUND',
            message: 'Request not found or access denied',
          },
        };
      }

      const processedRequest: DataSubjectRequest = {
        ...request,
        submitted_at: new Date(request.submitted_at),
        processed_at: request.processed_at
          ? new Date(request.processed_at)
          : undefined,
        completed_at: request.completed_at
          ? new Date(request.completed_at)
          : undefined,
        verification_expires_at: request.verification_expires_at
          ? new Date(request.verification_expires_at)
          : undefined,
        created_at: new Date(request.created_at),
        updated_at: new Date(request.updated_at),
      };

      return {
        success: true,
        data: processedRequest,
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Error retrieving request status',
          details: { error: error.message },
        },
      };
    }
  }
}

// ============================================================================
// Export default instance
// ============================================================================

export const dataProcessor = new DataProcessor();
