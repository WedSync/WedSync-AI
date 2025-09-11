/**
 * GDPR Consent Manager
 * WS-176 - GDPR Compliance System
 *
 * Comprehensive consent tracking, validation, and lifecycle management
 * for GDPR compliance in wedding supplier platform.
 */

import { createClient } from '@/lib/supabase/server';
import {
  ConsentRecord,
  ConsentType,
  ConsentStatus,
  GDPRLegalBasis,
  ConsentBundle,
  ConsentConfiguration,
  GDPRApiResponse,
  SecurityContext,
  AuditLogEntry,
} from '@/types/gdpr';
import crypto from 'crypto';

// ============================================================================
// Consent Manager Configuration
// ============================================================================

export const CONSENT_CONFIGURATIONS: Record<ConsentType, ConsentConfiguration> =
  {
    [ConsentType.MARKETING]: {
      consent_type: ConsentType.MARKETING,
      required: false,
      legal_basis: GDPRLegalBasis.CONSENT,
      purpose_description:
        'Send marketing communications about wedding services and promotions',
      data_categories: ['contact_info', 'wedding_info', 'usage_data'],
      retention_period_days: 1095, // 3 years
      third_party_sharing: true,
      withdrawal_mechanism: 'One-click unsubscribe or account settings',
      version: '1.0',
    },
    [ConsentType.ANALYTICS]: {
      consent_type: ConsentType.ANALYTICS,
      required: false,
      legal_basis: GDPRLegalBasis.LEGITIMATE_INTEREST,
      purpose_description: 'Analyze platform usage to improve user experience',
      data_categories: ['usage_data', 'technical_data'],
      retention_period_days: 730, // 2 years
      third_party_sharing: true,
      withdrawal_mechanism: 'Account settings or data subject request',
      version: '1.0',
    },
    [ConsentType.FUNCTIONAL]: {
      consent_type: ConsentType.FUNCTIONAL,
      required: true,
      legal_basis: GDPRLegalBasis.CONTRACT,
      purpose_description:
        'Essential platform functionality and service delivery',
      data_categories: ['personal_details', 'contact_info', 'wedding_info'],
      retention_period_days: 2555, // 7 years for business records
      third_party_sharing: false,
      withdrawal_mechanism: 'Account deletion only',
      version: '1.0',
    },
    [ConsentType.PERFORMANCE]: {
      consent_type: ConsentType.PERFORMANCE,
      required: false,
      legal_basis: GDPRLegalBasis.LEGITIMATE_INTEREST,
      purpose_description:
        'Monitor and improve platform performance and reliability',
      data_categories: ['technical_data', 'usage_data'],
      retention_period_days: 365, // 1 year
      third_party_sharing: false,
      withdrawal_mechanism: 'Account settings',
      version: '1.0',
    },
    [ConsentType.COMMUNICATION]: {
      consent_type: ConsentType.COMMUNICATION,
      required: true,
      legal_basis: GDPRLegalBasis.CONTRACT,
      purpose_description: 'Essential service communications and notifications',
      data_categories: ['contact_info', 'wedding_info', 'communication_logs'],
      retention_period_days: 2555, // 7 years
      third_party_sharing: false,
      withdrawal_mechanism:
        'Limited withdrawal - essential communications required',
      version: '1.0',
    },
    [ConsentType.DATA_SHARING]: {
      consent_type: ConsentType.DATA_SHARING,
      required: false,
      legal_basis: GDPRLegalBasis.CONSENT,
      purpose_description:
        'Share data with verified wedding suppliers in your network',
      data_categories: ['personal_details', 'wedding_info', 'contact_info'],
      retention_period_days: 1095, // 3 years
      third_party_sharing: true,
      withdrawal_mechanism: 'Account settings or supplier management',
      version: '1.0',
    },
  };

// ============================================================================
// Consent Manager Class
// ============================================================================

export class ConsentManager {
  private supabase = createClient();

  /**
   * Create or update consent record for a user
   * Handles consent lifecycle with proper audit logging
   */
  async recordConsent(
    userId: string,
    consentType: ConsentType,
    granted: boolean,
    securityContext: SecurityContext,
    metadata: Record<string, any> = {},
  ): Promise<GDPRApiResponse<ConsentRecord>> {
    try {
      const startTime = Date.now();

      // Validate user exists and is authenticated
      const { data: user, error: userError } = await this.supabase
        .from('user_profiles')
        .select('id')
        .eq('id', userId)
        .single();

      if (userError || !user) {
        await this.auditLog({
          user_id: userId,
          action: 'consent_record_failed',
          resource_type: 'consent',
          details: { consent_type: consentType, error: 'user_not_found' },
          security_context: securityContext,
          timestamp: new Date(),
          result: 'failure',
          error_message: 'User not found or unauthorized',
        });

        return {
          success: false,
          error: {
            code: 'USER_NOT_FOUND',
            message: 'User not found or unauthorized',
            details: { user_id: userId },
          },
        };
      }

      // Get current consent record if exists
      const { data: existingConsent } = await this.supabase
        .from('consent_records')
        .select('*')
        .eq('user_id', userId)
        .eq('consent_type', consentType)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      const config = CONSENT_CONFIGURATIONS[consentType];
      const now = new Date();
      const expiresAt =
        config.legal_basis === GDPRLegalBasis.CONSENT
          ? new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000) // 1 year for consent
          : null;

      // Prepare consent record data
      const consentData = {
        user_id: userId,
        consent_type: consentType,
        status: granted ? ConsentStatus.GRANTED : ConsentStatus.DENIED,
        legal_basis: config.legal_basis,
        granted_at: granted ? now.toISOString() : null,
        withdrawn_at:
          !granted && existingConsent?.status === ConsentStatus.GRANTED
            ? now.toISOString()
            : null,
        expires_at: expiresAt?.toISOString(),
        version: config.version,
        metadata: {
          ...metadata,
          ip_address_hash: securityContext.ip_address_hash,
          user_agent_hash: securityContext.user_agent_hash,
          consent_method: metadata.consent_method || 'explicit',
          previous_status: existingConsent?.status || null,
        },
        updated_at: now.toISOString(),
      };

      // Insert new consent record
      const { data: newConsent, error: insertError } = await this.supabase
        .from('consent_records')
        .insert(consentData)
        .select()
        .single();

      if (insertError) {
        await this.auditLog({
          user_id: userId,
          action: 'consent_record_failed',
          resource_type: 'consent',
          details: { consent_type: consentType, error: insertError.message },
          security_context: securityContext,
          timestamp: new Date(),
          result: 'failure',
          error_message: insertError.message,
        });

        return {
          success: false,
          error: {
            code: 'DATABASE_ERROR',
            message: 'Failed to record consent',
            details: { error: insertError.message },
          },
        };
      }

      // Audit log successful consent recording
      await this.auditLog({
        user_id: userId,
        action: granted ? 'consent_granted' : 'consent_denied',
        resource_type: 'consent',
        resource_id: newConsent.id,
        details: {
          consent_type: consentType,
          previous_status: existingConsent?.status,
          new_status: newConsent.status,
          legal_basis: config.legal_basis,
          expires_at: expiresAt,
        },
        security_context: securityContext,
        timestamp: now,
        result: 'success',
      });

      return {
        success: true,
        data: {
          ...newConsent,
          created_at: new Date(newConsent.created_at),
          updated_at: new Date(newConsent.updated_at),
          granted_at: newConsent.granted_at
            ? new Date(newConsent.granted_at)
            : undefined,
          withdrawn_at: newConsent.withdrawn_at
            ? new Date(newConsent.withdrawn_at)
            : undefined,
          expires_at: newConsent.expires_at
            ? new Date(newConsent.expires_at)
            : undefined,
        },
        metadata: {
          processing_time_ms: Date.now() - startTime,
          request_id: crypto.randomUUID(),
          timestamp: now,
        },
      };
    } catch (error) {
      await this.auditLog({
        user_id: userId,
        action: 'consent_record_error',
        resource_type: 'consent',
        details: { consent_type: consentType, error: error.message },
        security_context: securityContext,
        timestamp: new Date(),
        result: 'failure',
        error_message: error.message,
      });

      return {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Internal server error while recording consent',
          details: { error: error.message },
        },
      };
    }
  }

  /**
   * Withdraw consent for a specific type
   * Updates consent status and triggers data processing changes
   */
  async withdrawConsent(
    userId: string,
    consentType: ConsentType,
    securityContext: SecurityContext,
    reason?: string,
  ): Promise<GDPRApiResponse<ConsentRecord>> {
    try {
      const config = CONSENT_CONFIGURATIONS[consentType];

      // Check if consent can be withdrawn
      if (config.required) {
        return {
          success: false,
          error: {
            code: 'WITHDRAWAL_NOT_ALLOWED',
            message:
              'This consent is required for service operation and cannot be withdrawn',
            details: {
              consent_type: consentType,
              alternative: config.withdrawal_mechanism,
            },
          },
        };
      }

      return await this.recordConsent(
        userId,
        consentType,
        false,
        securityContext,
        {
          withdrawal_reason: reason,
          consent_method: 'withdrawal',
        },
      );
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'WITHDRAWAL_ERROR',
          message: 'Failed to withdraw consent',
          details: { error: error.message },
        },
      };
    }
  }

  /**
   * Get current consent status for a user
   * Returns complete consent bundle with current status
   */
  async getConsentBundle(
    userId: string,
  ): Promise<GDPRApiResponse<ConsentBundle>> {
    try {
      const startTime = Date.now();

      // Get all current consent records for user
      const { data: consents, error } = await this.supabase
        .from('consent_records')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        return {
          success: false,
          error: {
            code: 'DATABASE_ERROR',
            message: 'Failed to retrieve consent records',
            details: { error: error.message },
          },
        };
      }

      // Get latest consent for each type
      const latestConsents = new Map<ConsentType, ConsentRecord>();
      consents?.forEach((consent) => {
        const consentType = consent.consent_type as ConsentType;
        if (!latestConsents.has(consentType)) {
          latestConsents.set(consentType, {
            ...consent,
            created_at: new Date(consent.created_at),
            updated_at: new Date(consent.updated_at),
            granted_at: consent.granted_at
              ? new Date(consent.granted_at)
              : undefined,
            withdrawn_at: consent.withdrawn_at
              ? new Date(consent.withdrawn_at)
              : undefined,
            expires_at: consent.expires_at
              ? new Date(consent.expires_at)
              : undefined,
          });
        }
      });

      // Build consent bundle
      const consentBundle: ConsentBundle = {
        user_id: userId,
        consents: Array.from(latestConsents.values()).map((consent) => ({
          consent_type: consent.consent_type,
          status: this.getEffectiveConsentStatus(consent),
          granted_at: consent.granted_at,
          withdrawn_at: consent.withdrawn_at,
        })),
        last_updated:
          consents && consents.length > 0
            ? new Date(
                Math.max(
                  ...consents.map((c) => new Date(c.created_at).getTime()),
                ),
              )
            : new Date(),
        ip_address_hash: consents?.[0]?.metadata?.ip_address_hash || '',
        user_agent_hash: consents?.[0]?.metadata?.user_agent_hash || '',
        consent_method: consents?.[0]?.metadata?.consent_method || 'explicit',
      };

      return {
        success: true,
        data: consentBundle,
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
          message: 'Internal server error while retrieving consents',
          details: { error: error.message },
        },
      };
    }
  }

  /**
   * Validate if user has valid consent for specific processing
   * Checks consent status, expiry, and legal basis
   */
  async validateConsent(
    userId: string,
    consentType: ConsentType,
    processingPurpose?: string,
  ): Promise<{
    valid: boolean;
    status: ConsentStatus;
    expires_at?: Date;
    legal_basis: GDPRLegalBasis;
    reasons?: string[];
  }> {
    try {
      // Get latest consent record
      const { data: consent } = await this.supabase
        .from('consent_records')
        .select('*')
        .eq('user_id', userId)
        .eq('consent_type', consentType)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      const config = CONSENT_CONFIGURATIONS[consentType];
      const reasons: string[] = [];

      if (!consent) {
        // No consent record found
        if (config.required) {
          reasons.push(
            'Required consent not found - service cannot operate without this consent',
          );
          return {
            valid: false,
            status: ConsentStatus.DENIED,
            legal_basis: config.legal_basis,
            reasons,
          };
        } else {
          reasons.push(
            'Optional consent not provided - processing not permitted',
          );
          return {
            valid: false,
            status: ConsentStatus.DENIED,
            legal_basis: config.legal_basis,
            reasons,
          };
        }
      }

      const effectiveStatus = this.getEffectiveConsentStatus(consent);

      // Check if consent is granted and not expired
      if (effectiveStatus !== ConsentStatus.GRANTED) {
        reasons.push(`Consent status is ${effectiveStatus}`);
        return {
          valid: false,
          status: effectiveStatus,
          expires_at: consent.expires_at
            ? new Date(consent.expires_at)
            : undefined,
          legal_basis: consent.legal_basis as GDPRLegalBasis,
          reasons,
        };
      }

      // Check expiry
      if (consent.expires_at && new Date() > new Date(consent.expires_at)) {
        reasons.push('Consent has expired');
        return {
          valid: false,
          status: ConsentStatus.EXPIRED,
          expires_at: new Date(consent.expires_at),
          legal_basis: consent.legal_basis as GDPRLegalBasis,
          reasons,
        };
      }

      // Valid consent
      return {
        valid: true,
        status: effectiveStatus,
        expires_at: consent.expires_at
          ? new Date(consent.expires_at)
          : undefined,
        legal_basis: consent.legal_basis as GDPRLegalBasis,
      };
    } catch (error) {
      return {
        valid: false,
        status: ConsentStatus.DENIED,
        legal_basis: CONSENT_CONFIGURATIONS[consentType].legal_basis,
        reasons: [`Validation error: ${error.message}`],
      };
    }
  }

  /**
   * Check if consent needs renewal based on expiry and configuration
   */
  async checkConsentRenewal(userId: string): Promise<{
    needs_renewal: ConsentType[];
    expiring_soon: ConsentType[];
    expired: ConsentType[];
  }> {
    const { data: consentBundle } = await this.getConsentBundle(userId);
    const result = {
      needs_renewal: [] as ConsentType[],
      expiring_soon: [] as ConsentType[],
      expired: [] as ConsentType[],
    };

    if (!consentBundle) return result;

    const now = new Date();
    const thirtyDaysFromNow = new Date(
      now.getTime() + 30 * 24 * 60 * 60 * 1000,
    );

    consentBundle.consents.forEach((consent) => {
      const config = CONSENT_CONFIGURATIONS[consent.consent_type];

      // Only check consent-based legal basis for renewal
      if (config.legal_basis !== GDPRLegalBasis.CONSENT) return;

      // Get latest consent record to check expiry
      this.supabase
        .from('consent_records')
        .select('expires_at, status')
        .eq('user_id', userId)
        .eq('consent_type', consent.consent_type)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()
        .then(({ data: record }) => {
          if (!record?.expires_at) return;

          const expiryDate = new Date(record.expires_at);

          if (expiryDate <= now) {
            result.expired.push(consent.consent_type);
            result.needs_renewal.push(consent.consent_type);
          } else if (expiryDate <= thirtyDaysFromNow) {
            result.expiring_soon.push(consent.consent_type);
            result.needs_renewal.push(consent.consent_type);
          }
        });
    });

    return result;
  }

  /**
   * Get effective consent status considering expiry and withdrawal
   */
  private getEffectiveConsentStatus(consent: ConsentRecord): ConsentStatus {
    // Check if explicitly withdrawn
    if (consent.status === ConsentStatus.WITHDRAWN) {
      return ConsentStatus.WITHDRAWN;
    }

    // Check if expired
    if (consent.expires_at && new Date() > new Date(consent.expires_at)) {
      return ConsentStatus.EXPIRED;
    }

    // Return stored status
    return consent.status;
  }

  /**
   * Log audit trail for consent operations
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
      // Log audit failure but don't throw - don't break main operation
      console.error('Failed to write audit log:', error);
    }
  }

  /**
   * Bulk update consents for user (used during onboarding)
   */
  async bulkUpdateConsents(
    userId: string,
    consents: Array<{
      consent_type: ConsentType;
      granted: boolean;
      metadata?: Record<string, any>;
    }>,
    securityContext: SecurityContext,
  ): Promise<GDPRApiResponse<ConsentBundle>> {
    const results = [];
    const errors = [];

    for (const consent of consents) {
      const result = await this.recordConsent(
        userId,
        consent.consent_type,
        consent.granted,
        securityContext,
        consent.metadata || {},
      );

      if (result.success) {
        results.push(result.data);
      } else {
        errors.push({
          consent_type: consent.consent_type,
          error: result.error,
        });
      }
    }

    if (errors.length > 0) {
      return {
        success: false,
        error: {
          code: 'BULK_UPDATE_PARTIAL_FAILURE',
          message: 'Some consent updates failed',
          details: { errors, successful_count: results.length },
        },
      };
    }

    // Return updated consent bundle
    return await this.getConsentBundle(userId);
  }
}

// ============================================================================
// Export default instance
// ============================================================================

export const consentManager = new ConsentManager();
