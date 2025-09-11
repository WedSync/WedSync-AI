/**
 * GDPR Preparation for WedSync Encryption Integration
 * Handles data classification, consent tracking, and compliance metadata for encrypted data
 *
 * @fileoverview GDPR compliance preparation for encrypted wedding data
 * @version 1.0.0
 * @since 2025-01-20
 */

import { z } from 'zod';
import type {
  EncryptionMetadata,
  GDPRLegalBasis,
  DataAccessRecord,
  EncryptionAuditEvent,
  EncryptionAuditConfig,
} from '../../../types/encryption-integration';
import { type WeddingDataType } from './data-mapper';

/**
 * GDPR data classification levels for wedding data
 */
export type GDPRDataClassification =
  | 'public'
  | 'internal'
  | 'confidential'
  | 'restricted'
  | 'highly_sensitive';

/**
 * GDPR data categories for wedding planning
 */
export type GDPRDataCategory =
  | 'personal_data'
  | 'special_category'
  | 'financial_data'
  | 'communication_data'
  | 'preference_data'
  | 'health_data'
  | 'location_data';

/**
 * Data subject rights under GDPR
 */
export type DataSubjectRights =
  | 'access'
  | 'rectification'
  | 'erasure'
  | 'restrict_processing'
  | 'data_portability'
  | 'object'
  | 'withdraw_consent';

/**
 * GDPR compliance metadata for wedding data fields
 */
export interface GDPRFieldClassification {
  field_name: string;
  data_type: WeddingDataType;
  classification: GDPRDataClassification;
  category: GDPRDataCategory;
  legal_basis: GDPRLegalBasis;
  retention_period_days: number;
  consent_required: boolean;
  deletion_allowed: boolean;
  anonymization_supported: boolean;
  cross_border_transfer: boolean;
  subject_rights: DataSubjectRights[];
  processing_purposes: string[];
}

/**
 * Consent record for GDPR compliance
 */
export interface ConsentRecord {
  user_id: string;
  data_type: WeddingDataType;
  field_names: string[];
  consent_given: boolean;
  consent_timestamp: string;
  consent_method: 'explicit' | 'implied' | 'opt_in' | 'opt_out';
  purposes: string[];
  expiry_date?: string;
  withdrawal_timestamp?: string;
  ip_address?: string;
  user_agent?: string;
}

/**
 * Data processing record for GDPR audit trail
 */
export interface DataProcessingRecord {
  id: string;
  user_id: string;
  data_type: WeddingDataType;
  operation: 'create' | 'read' | 'update' | 'delete' | 'encrypt' | 'decrypt';
  field_names: string[];
  legal_basis: GDPRLegalBasis;
  processing_purpose: string;
  timestamp: string;
  ip_address?: string;
  user_agent?: string;
  retention_until: string;
}

/**
 * Data subject request tracking
 */
export interface DataSubjectRequest {
  id: string;
  user_id: string;
  request_type: DataSubjectRights;
  status: 'pending' | 'in_progress' | 'completed' | 'rejected';
  requested_at: string;
  completed_at?: string;
  data_types: WeddingDataType[];
  verification_method: string;
  completion_notes?: string;
}

/**
 * GDPR wedding data field classifications
 */
const WEDDING_GDPR_CLASSIFICATIONS: Record<
  WeddingDataType,
  GDPRFieldClassification[]
> = {
  guest: [
    {
      field_name: 'email',
      data_type: 'guest',
      classification: 'confidential',
      category: 'personal_data',
      legal_basis: 'legitimate_interests',
      retention_period_days: 2555, // 7 years for wedding records
      consent_required: true,
      deletion_allowed: true,
      anonymization_supported: true,
      cross_border_transfer: false,
      subject_rights: [
        'access',
        'rectification',
        'erasure',
        'data_portability',
      ],
      processing_purposes: [
        'wedding_coordination',
        'communication',
        'event_planning',
      ],
    },
    {
      field_name: 'phone',
      data_type: 'guest',
      classification: 'confidential',
      category: 'personal_data',
      legal_basis: 'legitimate_interests',
      retention_period_days: 2555,
      consent_required: true,
      deletion_allowed: true,
      anonymization_supported: true,
      cross_border_transfer: false,
      subject_rights: [
        'access',
        'rectification',
        'erasure',
        'data_portability',
      ],
      processing_purposes: ['wedding_coordination', 'emergency_contact'],
    },
    {
      field_name: 'dietary_restrictions',
      data_type: 'guest',
      classification: 'highly_sensitive',
      category: 'health_data',
      legal_basis: 'consent',
      retention_period_days: 90, // Short retention for health data
      consent_required: true,
      deletion_allowed: true,
      anonymization_supported: false, // Health data cannot be easily anonymized
      cross_border_transfer: false,
      subject_rights: [
        'access',
        'rectification',
        'erasure',
        'restrict_processing',
      ],
      processing_purposes: ['catering_arrangements', 'health_accommodation'],
    },
    {
      field_name: 'address',
      data_type: 'guest',
      classification: 'confidential',
      category: 'location_data',
      legal_basis: 'legitimate_interests',
      retention_period_days: 2555,
      consent_required: false,
      deletion_allowed: true,
      anonymization_supported: true,
      cross_border_transfer: false,
      subject_rights: ['access', 'rectification', 'erasure'],
      processing_purposes: ['invitation_delivery', 'transportation_planning'],
    },
  ],
  vendor: [
    {
      field_name: 'contact_email',
      data_type: 'vendor',
      classification: 'confidential',
      category: 'personal_data',
      legal_basis: 'contract',
      retention_period_days: 2555,
      consent_required: false,
      deletion_allowed: false, // Business records retention required
      anonymization_supported: true,
      cross_border_transfer: false,
      subject_rights: ['access', 'rectification'],
      processing_purposes: ['contract_fulfillment', 'business_communication'],
    },
    {
      field_name: 'tax_id',
      data_type: 'vendor',
      classification: 'highly_sensitive',
      category: 'financial_data',
      legal_basis: 'legal_obligation',
      retention_period_days: 2555, // Tax record retention requirement
      consent_required: false,
      deletion_allowed: false,
      anonymization_supported: false,
      cross_border_transfer: false,
      subject_rights: ['access'],
      processing_purposes: ['tax_compliance', 'financial_reporting'],
    },
  ],
  payment: [
    {
      field_name: 'card_number',
      data_type: 'payment',
      classification: 'highly_sensitive',
      category: 'financial_data',
      legal_basis: 'contract',
      retention_period_days: 90, // Short retention for payment data
      consent_required: false,
      deletion_allowed: true,
      anonymization_supported: false,
      cross_border_transfer: false,
      subject_rights: ['access', 'erasure'],
      processing_purposes: ['payment_processing'],
    },
    {
      field_name: 'billing_address',
      data_type: 'payment',
      classification: 'confidential',
      category: 'personal_data',
      legal_basis: 'contract',
      retention_period_days: 365,
      consent_required: false,
      deletion_allowed: true,
      anonymization_supported: true,
      cross_border_transfer: false,
      subject_rights: ['access', 'rectification', 'erasure'],
      processing_purposes: ['payment_processing', 'billing'],
    },
  ],
  timeline: [
    {
      field_name: 'private_notes',
      data_type: 'timeline',
      classification: 'confidential',
      category: 'communication_data',
      legal_basis: 'legitimate_interests',
      retention_period_days: 2555,
      consent_required: false,
      deletion_allowed: true,
      anonymization_supported: true,
      cross_border_transfer: false,
      subject_rights: ['access', 'rectification', 'erasure'],
      processing_purposes: ['wedding_planning', 'internal_coordination'],
    },
  ],
};

/**
 * GDPR Preparation service for encryption integration
 */
export class GDPRPreparationService {
  private auditLog: DataProcessingRecord[] = [];
  private consentRecords: Map<string, ConsentRecord[]> = new Map();

  /**
   * Gets GDPR classification for a specific field
   */
  getFieldClassification(
    dataType: WeddingDataType,
    fieldName: string,
  ): GDPRFieldClassification | null {
    const classifications = WEDDING_GDPR_CLASSIFICATIONS[dataType];
    return classifications?.find((c) => c.field_name === fieldName) || null;
  }

  /**
   * Creates encryption metadata with GDPR compliance information
   */
  createGDPREncryptionMetadata(
    userId: string,
    dataType: WeddingDataType,
    fieldNames: string[],
    processingPurpose: string,
    ipAddress?: string,
  ): EncryptionMetadata {
    const classification = this.getFieldClassification(dataType, fieldNames[0]);

    if (!classification) {
      throw new Error(
        `No GDPR classification found for ${dataType}:${fieldNames[0]}`,
      );
    }

    const retentionDate = new Date();
    retentionDate.setDate(
      retentionDate.getDate() + classification.retention_period_days,
    );

    return {
      legal_basis: classification.legal_basis,
      retention_days: classification.retention_period_days,
      deletion_allowed: classification.deletion_allowed,
      processing_purpose: processingPurpose,
      location_restrictions: classification.cross_border_transfer
        ? []
        : ['EU', 'US'],
      scheduled_deletion_at: retentionDate.toISOString(),
      access_log: [
        {
          accessed_at: new Date().toISOString(),
          accessed_by: userId,
          access_purpose: processingPurpose,
          ip_address: ipAddress,
        },
      ],
    };
  }

  /**
   * Records data processing activity for GDPR compliance
   */
  recordDataProcessing(
    userId: string,
    dataType: WeddingDataType,
    operation: 'create' | 'read' | 'update' | 'delete' | 'encrypt' | 'decrypt',
    fieldNames: string[],
    processingPurpose: string,
    ipAddress?: string,
    userAgent?: string,
  ): void {
    const classification = this.getFieldClassification(dataType, fieldNames[0]);

    if (!classification) {
      console.warn(
        `No GDPR classification found for ${dataType}:${fieldNames[0]}`,
      );
      return;
    }

    const retentionUntil = new Date();
    retentionUntil.setDate(
      retentionUntil.getDate() + classification.retention_period_days,
    );

    const record: DataProcessingRecord = {
      id: `proc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      user_id: userId,
      data_type: dataType,
      operation,
      field_names: fieldNames,
      legal_basis: classification.legal_basis,
      processing_purpose: processingPurpose,
      timestamp: new Date().toISOString(),
      ip_address: ipAddress,
      user_agent: userAgent,
      retention_until: retentionUntil.toISOString(),
    };

    this.auditLog.push(record);
    console.log('[GDPR_AUDIT]', JSON.stringify(record));
  }

  /**
   * Records user consent for data processing
   */
  recordConsent(
    userId: string,
    dataType: WeddingDataType,
    fieldNames: string[],
    consentMethod: 'explicit' | 'implied' | 'opt_in' | 'opt_out',
    purposes: string[],
    expiryDays?: number,
    ipAddress?: string,
    userAgent?: string,
  ): ConsentRecord {
    const expiryDate = expiryDays
      ? new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000).toISOString()
      : undefined;

    const consent: ConsentRecord = {
      user_id: userId,
      data_type: dataType,
      field_names: fieldNames,
      consent_given: true,
      consent_timestamp: new Date().toISOString(),
      consent_method: consentMethod,
      purposes,
      expiry_date: expiryDate,
      ip_address: ipAddress,
      user_agent: userAgent,
    };

    const userConsents = this.consentRecords.get(userId) || [];
    userConsents.push(consent);
    this.consentRecords.set(userId, userConsents);

    console.log('[GDPR_CONSENT]', JSON.stringify(consent));
    return consent;
  }

  /**
   * Withdraws user consent for data processing
   */
  withdrawConsent(
    userId: string,
    dataType: WeddingDataType,
    fieldNames: string[],
  ): boolean {
    const userConsents = this.consentRecords.get(userId) || [];

    let consentWithdrawn = false;
    for (const consent of userConsents) {
      if (
        consent.data_type === dataType &&
        fieldNames.every((field) => consent.field_names.includes(field))
      ) {
        consent.consent_given = false;
        consent.withdrawal_timestamp = new Date().toISOString();
        consentWithdrawn = true;
      }
    }

    if (consentWithdrawn) {
      console.log('[GDPR_CONSENT_WITHDRAWN]', { userId, dataType, fieldNames });
    }

    return consentWithdrawn;
  }

  /**
   * Checks if user consent is valid for data processing
   */
  hasValidConsent(
    userId: string,
    dataType: WeddingDataType,
    fieldNames: string[],
  ): boolean {
    const userConsents = this.consentRecords.get(userId) || [];

    for (const consent of userConsents) {
      if (
        consent.data_type === dataType &&
        consent.consent_given &&
        !consent.withdrawal_timestamp &&
        fieldNames.every((field) => consent.field_names.includes(field))
      ) {
        // Check expiry
        if (consent.expiry_date && new Date() > new Date(consent.expiry_date)) {
          continue;
        }

        return true;
      }
    }

    return false;
  }

  /**
   * Generates data classification report for wedding data
   */
  generateDataClassificationReport(): {
    classifications: GDPRFieldClassification[];
    summary: {
      total_fields: number;
      by_classification: Record<GDPRDataClassification, number>;
      by_category: Record<GDPRDataCategory, number>;
      consent_required_count: number;
      deletion_allowed_count: number;
    };
  } {
    const allClassifications = Object.values(
      WEDDING_GDPR_CLASSIFICATIONS,
    ).flat();

    const summary = {
      total_fields: allClassifications.length,
      by_classification: {} as Record<GDPRDataClassification, number>,
      by_category: {} as Record<GDPRDataCategory, number>,
      consent_required_count: 0,
      deletion_allowed_count: 0,
    };

    // Initialize counters
    [
      'public',
      'internal',
      'confidential',
      'restricted',
      'highly_sensitive',
    ].forEach((c) => {
      summary.by_classification[c as GDPRDataClassification] = 0;
    });

    [
      'personal_data',
      'special_category',
      'financial_data',
      'communication_data',
      'preference_data',
      'health_data',
      'location_data',
    ].forEach((c) => {
      summary.by_category[c as GDPRDataCategory] = 0;
    });

    // Count classifications
    allClassifications.forEach((c) => {
      summary.by_classification[c.classification]++;
      summary.by_category[c.category]++;
      if (c.consent_required) summary.consent_required_count++;
      if (c.deletion_allowed) summary.deletion_allowed_count++;
    });

    return {
      classifications: allClassifications,
      summary,
    };
  }

  /**
   * Generates GDPR compliance audit report
   */
  generateComplianceAuditReport(): {
    processing_records: DataProcessingRecord[];
    consent_records: ConsentRecord[];
    compliance_summary: {
      total_processing_records: number;
      total_consent_records: number;
      expired_consents: number;
      withdrawn_consents: number;
      retention_violations: number;
    };
  } {
    const allConsents = Array.from(this.consentRecords.values()).flat();
    const now = new Date();

    const expiredConsents = allConsents.filter(
      (c) => c.expiry_date && new Date(c.expiry_date) < now,
    ).length;

    const withdrawnConsents = allConsents.filter(
      (c) => c.withdrawal_timestamp,
    ).length;

    const retentionViolations = this.auditLog.filter(
      (r) => new Date(r.retention_until) < now,
    ).length;

    return {
      processing_records: this.auditLog,
      consent_records: allConsents,
      compliance_summary: {
        total_processing_records: this.auditLog.length,
        total_consent_records: allConsents.length,
        expired_consents: expiredConsents,
        withdrawn_consents: withdrawnConsents,
        retention_violations: retentionViolations,
      },
    };
  }

  /**
   * Validates GDPR compliance for data processing operation
   */
  validateGDPRCompliance(
    userId: string,
    dataType: WeddingDataType,
    fieldNames: string[],
    operation: 'create' | 'read' | 'update' | 'delete',
    processingPurpose: string,
  ): { compliant: boolean; issues: string[] } {
    const issues: string[] = [];

    for (const fieldName of fieldNames) {
      const classification = this.getFieldClassification(dataType, fieldName);

      if (!classification) {
        issues.push(
          `No GDPR classification found for ${dataType}:${fieldName}`,
        );
        continue;
      }

      // Check consent requirement
      if (classification.consent_required) {
        if (!this.hasValidConsent(userId, dataType, [fieldName])) {
          issues.push(`Missing or invalid consent for ${fieldName}`);
        }
      }

      // Check processing purpose
      if (!classification.processing_purposes.includes(processingPurpose)) {
        issues.push(
          `Processing purpose '${processingPurpose}' not allowed for ${fieldName}`,
        );
      }

      // Check deletion operations
      if (operation === 'delete' && !classification.deletion_allowed) {
        issues.push(
          `Deletion not allowed for ${fieldName} due to retention requirements`,
        );
      }
    }

    return {
      compliant: issues.length === 0,
      issues,
    };
  }

  /**
   * Creates audit configuration for encrypted data
   */
  createAuditConfig(dataType: WeddingDataType): EncryptionAuditConfig {
    const classification = this.getFieldClassification(dataType, 'default');
    const retentionDays = classification?.retention_period_days || 90;

    return {
      enabled: true,
      log_events: ['encrypt', 'decrypt', 'access_denied', 'gdpr_request'],
      retention_days: Math.min(retentionDays, 2555), // Max 7 years
      encrypt_audit_logs: true, // Encrypt audit logs themselves
      storage_location: 'database',
    };
  }
}

/**
 * Factory function to create GDPR preparation service
 */
export function createGDPRPreparationService(): GDPRPreparationService {
  return new GDPRPreparationService();
}

/**
 * Global GDPR service instance
 */
export const gdprService = new GDPRPreparationService();

/**
 * Default export with utilities
 */
export default {
  GDPRPreparationService,
  createGDPRPreparationService,
  gdprService,
  WEDDING_GDPR_CLASSIFICATIONS,
};
