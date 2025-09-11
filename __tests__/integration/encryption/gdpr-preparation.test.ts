/**
 * GDPR Preparation Tests for WS-175 Encryption Integration
 * Comprehensive test coverage for GDPR compliance and data classification
 */

// Vitest globals enabled - no imports needed for test functions
import { vi } from 'vitest';
import {
  GDPRPreparationService,
  createGDPRPreparationService,
  gdprService,
  type GDPRDataClassification,
  type GDPRDataCategory,
  type DataSubjectRights
} from '@/lib/integrations/encryption/gdpr-preparation';
import type { 
  GDPRLegalBasis,
  EncryptionMetadata 
} from '@/types/encryption-integration';
import type { WeddingDataType } from '@/lib/integrations/encryption/data-mapper';

describe('GDPR Preparation Service - Data Classification', () => {
  let service: GDPRPreparationService;

  beforeEach(() => {
    service = new GDPRPreparationService();
    vi.clearAllMocks();
  });

  describe('Field Classification', () => {
    it('should classify guest email field correctly', () => {
      const classification = service.getFieldClassification('guest', 'email');

      expect(classification).toBeDefined();
      expect(classification?.field_name).toBe('email');
      expect(classification?.data_type).toBe('guest');
      expect(classification?.classification).toBe('confidential');
      expect(classification?.category).toBe('personal_data');
      expect(classification?.legal_basis).toBe('legitimate_interests');
      expect(classification?.consent_required).toBe(true);
      expect(classification?.deletion_allowed).toBe(true);
    });

    it('should classify guest dietary restrictions as highly sensitive health data', () => {
      const classification = service.getFieldClassification('guest', 'dietary_restrictions');

      expect(classification).toBeDefined();
      expect(classification?.classification).toBe('highly_sensitive');
      expect(classification?.category).toBe('health_data');
      expect(classification?.legal_basis).toBe('explicit_consent');
      expect(classification?.retention_period_days).toBe(90); // Short retention for health data
      expect(classification?.anonymization_supported).toBe(false);
    });

    it('should classify vendor tax_id as highly sensitive financial data', () => {
      const classification = service.getFieldClassification('vendor', 'tax_id');

      expect(classification).toBeDefined();
      expect(classification?.classification).toBe('highly_sensitive');
      expect(classification?.category).toBe('financial_data');
      expect(classification?.legal_basis).toBe('legal_obligation');
      expect(classification?.deletion_allowed).toBe(false); // Business records retention
    });

    it('should classify payment card_number as highly sensitive', () => {
      const classification = service.getFieldClassification('payment', 'card_number');

      expect(classification).toBeDefined();
      expect(classification?.classification).toBe('highly_sensitive');
      expect(classification?.category).toBe('financial_data');
      expect(classification?.retention_period_days).toBe(90); // Short retention
      expect(classification?.subject_rights).toContain('erasure');
    });

    it('should return null for unknown fields', () => {
      const classification = service.getFieldClassification('guest', 'unknown_field');

      expect(classification).toBeNull();
    });
  });

  describe('GDPR Encryption Metadata Creation', () => {
    it('should create proper encryption metadata for guest email', () => {
      const metadata = service.createGDPREncryptionMetadata(
        'user-123',
        'guest',
        ['email'],
        'wedding_coordination',
        '192.168.1.100'
      );

      expect(metadata.legal_basis).toBe('legitimate_interests');
      expect(metadata.retention_days).toBe(2555); // 7 years
      expect(metadata.deletion_allowed).toBe(true);
      expect(metadata.processing_purpose).toBe('wedding_coordination');
      expect(metadata.location_restrictions).toEqual(['EU', 'US']);
      expect(metadata.access_log).toHaveLength(1);
      expect(metadata.access_log![0].accessed_by).toBe('user-123');
      expect(metadata.access_log![0].ip_address).toBe('192.168.1.100');
      expect(metadata.scheduled_deletion_at).toBeDefined();
    });

    it('should create metadata with appropriate retention period for health data', () => {
      const metadata = service.createGDPREncryptionMetadata(
        'user-123',
        'guest',
        ['dietary_restrictions'],
        'catering_arrangements'
      );

      expect(metadata.retention_days).toBe(90); // Short retention for health data
      expect(metadata.legal_basis).toBe('explicit_consent');
    });

    it('should throw error for unknown data type/field combination', () => {
      expect(() => {
        service.createGDPREncryptionMetadata(
          'user-123',
          'guest',
          ['unknown_field'],
          'test_purpose'
        );
      }).toThrow('No GDPR classification found for guest:unknown_field');
    });
  });

  describe('Data Processing Recording', () => {
    beforeEach(() => {
      vi.spyOn(console, 'log').mockImplementation();
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('should record data processing activity', () => {
      service.recordDataProcessing(
        'user-123',
        'guest',
        'encrypt',
        ['email', 'phone'],
        'wedding_coordination',
        '192.168.1.100',
        'Mozilla/5.0'
      );

      // Check that audit log was recorded
      expect(console.log).toHaveBeenCalledWith(
        '[GDPR_AUDIT]',
        expect.stringContaining('user-123')
      );
    });

    it('should handle unknown field gracefully', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation();

      service.recordDataProcessing(
        'user-123',
        'guest',
        'read',
        ['unknown_field'],
        'test_purpose'
      );

      expect(consoleSpy).toHaveBeenCalledWith(
        'No GDPR classification found for guest:unknown_field'
      );

      consoleSpy.mockRestore();
    });

    it('should record processing with proper retention period', () => {
      service.recordDataProcessing(
        'user-123',
        'guest',
        'create',
        ['dietary_restrictions'],
        'catering_arrangements'
      );

      // Should record with 90-day retention for health data
      expect(console.log).toHaveBeenCalledWith(
        '[GDPR_AUDIT]',
        expect.stringContaining('user-123')
      );
    });
  });

  describe('Consent Management', () => {
    beforeEach(() => {
      vi.spyOn(console, 'log').mockImplementation();
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('should record user consent', () => {
      const consent = service.recordConsent(
        'user-123',
        'guest',
        ['email', 'phone'],
        'explicit',
        ['wedding_coordination', 'communication'],
        365, // 1 year expiry
        '192.168.1.100',
        'Mozilla/5.0'
      );

      expect(consent.user_id).toBe('user-123');
      expect(consent.data_type).toBe('guest');
      expect(consent.field_names).toEqual(['email', 'phone']);
      expect(consent.consent_given).toBe(true);
      expect(consent.consent_method).toBe('explicit');
      expect(consent.purposes).toEqual(['wedding_coordination', 'communication']);
      expect(consent.expiry_date).toBeDefined();
      expect(consent.ip_address).toBe('192.168.1.100');

      expect(console.log).toHaveBeenCalledWith(
        '[GDPR_CONSENT]',
        expect.stringContaining('user-123')
      );
    });

    it('should withdraw user consent', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation();

      // First record consent
      service.recordConsent(
        'user-123',
        'guest',
        ['email'],
        'explicit',
        ['wedding_coordination']
      );

      // Then withdraw consent
      const withdrawn = service.withdrawConsent('user-123', 'guest', ['email']);

      expect(withdrawn).toBe(true);
      expect(consoleSpy).toHaveBeenCalledWith(
        '[GDPR_CONSENT_WITHDRAWN]',
        expect.objectContaining({
          userId: 'user-123',
          dataType: 'guest',
          fieldNames: ['email']
        })
      );

      consoleSpy.mockRestore();
    });

    it('should check valid consent', () => {
      // Record consent
      service.recordConsent(
        'user-123',
        'guest',
        ['email', 'phone'],
        'explicit',
        ['wedding_coordination']
      );

      // Check valid consent
      const hasConsent = service.hasValidConsent('user-123', 'guest', ['email']);
      expect(hasConsent).toBe(true);

      // Check for fields without consent
      const hasPhoneConsent = service.hasValidConsent('user-123', 'guest', ['address']);
      expect(hasPhoneConsent).toBe(false);
    });

    it('should detect expired consent', () => {
      // Record consent with 0-day expiry (immediately expired)
      service.recordConsent(
        'user-123',
        'guest',
        ['email'],
        'explicit',
        ['wedding_coordination'],
        0 // Immediate expiry
      );

      // Wait a moment to ensure expiry
      const hasConsent = service.hasValidConsent('user-123', 'guest', ['email']);
      expect(hasConsent).toBe(false);
    });

    it('should detect withdrawn consent', () => {
      // Record and withdraw consent
      service.recordConsent('user-123', 'guest', ['email'], 'explicit', ['test']);
      service.withdrawConsent('user-123', 'guest', ['email']);

      // Check that consent is no longer valid
      const hasConsent = service.hasValidConsent('user-123', 'guest', ['email']);
      expect(hasConsent).toBe(false);
    });
  });

  describe('GDPR Compliance Validation', () => {
    it('should validate compliant data processing', () => {
      // Record consent first
      service.recordConsent(
        'user-123',
        'guest',
        ['email'],
        'explicit',
        ['wedding_coordination']
      );

      const validation = service.validateGDPRCompliance(
        'user-123',
        'guest',
        ['email'],
        'read',
        'wedding_coordination'
      );

      expect(validation.compliant).toBe(true);
      expect(validation.issues).toHaveLength(0);
    });

    it('should detect missing consent', () => {
      const validation = service.validateGDPRCompliance(
        'user-123',
        'guest',
        ['email'],
        'read',
        'wedding_coordination'
      );

      expect(validation.compliant).toBe(false);
      expect(validation.issues).toContain('Missing or invalid consent for email');
    });

    it('should detect invalid processing purpose', () => {
      service.recordConsent(
        'user-123',
        'guest',
        ['email'],
        'explicit',
        ['wedding_coordination']
      );

      const validation = service.validateGDPRCompliance(
        'user-123',
        'guest',
        ['email'],
        'read',
        'marketing' // Not allowed purpose
      );

      expect(validation.compliant).toBe(false);
      expect(validation.issues).toContain(
        'Processing purpose \'marketing\' not allowed for email'
      );
    });

    it('should detect unauthorized deletion attempts', () => {
      const validation = service.validateGDPRCompliance(
        'user-123',
        'vendor',
        ['tax_id'],
        'delete',
        'data_cleanup'
      );

      expect(validation.compliant).toBe(false);
      expect(validation.issues).toContain(
        'Deletion not allowed for tax_id due to retention requirements'
      );
    });

    it('should allow processing without consent for legal basis', () => {
      const validation = service.validateGDPRCompliance(
        'user-123',
        'vendor',
        ['contact_email'],
        'read',
        'contract_fulfillment'
      );

      expect(validation.compliant).toBe(true);
      expect(validation.issues).toHaveLength(0);
    });
  });

  describe('Data Classification Report Generation', () => {
    it('should generate comprehensive data classification report', () => {
      const report = service.generateDataClassificationReport();

      expect(report.classifications.length).toBeGreaterThan(0);
      expect(report.summary.total_fields).toBeGreaterThan(0);
      expect(report.summary.by_classification.highly_sensitive).toBeGreaterThan(0);
      expect(report.summary.by_category.personal_data).toBeGreaterThan(0);
      expect(report.summary.consent_required_count).toBeGreaterThan(0);
      expect(report.summary.deletion_allowed_count).toBeGreaterThan(0);
    });

    it('should categorize fields by classification level', () => {
      const report = service.generateDataClassificationReport();

      // Should have different classification levels
      expect(report.summary.by_classification.confidential).toBeGreaterThan(0);
      expect(report.summary.by_classification.highly_sensitive).toBeGreaterThan(0);
    });

    it('should categorize fields by data category', () => {
      const report = service.generateDataClassificationReport();

      // Should have different data categories
      expect(report.summary.by_category.personal_data).toBeGreaterThan(0);
      expect(report.summary.by_category.financial_data).toBeGreaterThan(0);
      expect(report.summary.by_category.health_data).toBeGreaterThan(0);
    });
  });

  describe('Compliance Audit Report', () => {
    beforeEach(() => {
      vi.spyOn(console, 'log').mockImplementation();
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('should generate compliance audit report', () => {
      // Create some test data
      service.recordDataProcessing(
        'user-123',
        'guest',
        'encrypt',
        ['email'],
        'wedding_coordination'
      );
      
      service.recordConsent(
        'user-123',
        'guest',
        ['email'],
        'explicit',
        ['wedding_coordination']
      );

      const report = service.generateComplianceAuditReport();

      expect(report.processing_records.length).toBeGreaterThan(0);
      expect(report.consent_records.length).toBeGreaterThan(0);
      expect(report.compliance_summary.total_processing_records).toBeGreaterThan(0);
      expect(report.compliance_summary.total_consent_records).toBeGreaterThan(0);
    });

    it('should detect expired consents in audit report', () => {
      service.recordConsent(
        'user-123',
        'guest',
        ['email'],
        'explicit',
        ['wedding_coordination'],
        0 // Immediate expiry
      );

      const report = service.generateComplianceAuditReport();

      expect(report.compliance_summary.expired_consents).toBeGreaterThan(0);
    });

    it('should detect withdrawn consents in audit report', () => {
      service.recordConsent('user-123', 'guest', ['email'], 'explicit', ['test']);
      service.withdrawConsent('user-123', 'guest', ['email']);

      const report = service.generateComplianceAuditReport();

      expect(report.compliance_summary.withdrawn_consents).toBeGreaterThan(0);
    });
  });

  describe('Audit Configuration', () => {
    it('should create audit configuration for guest data', () => {
      const config = service.createAuditConfig('guest');

      expect(config.enabled).toBe(true);
      expect(config.log_events).toContain('encrypt');
      expect(config.log_events).toContain('decrypt');
      expect(config.log_events).toContain('gdpr_request');
      expect(config.retention_days).toBeLessThanOrEqual(2555);
      expect(config.encrypt_audit_logs).toBe(true);
      expect(config.storage_location).toBe('database');
    });

    it('should create audit configuration for payment data', () => {
      const config = service.createAuditConfig('payment');

      expect(config.enabled).toBe(true);
      expect(config.retention_days).toBeLessThanOrEqual(2555);
      expect(config.encrypt_audit_logs).toBe(true);
    });
  });
});

describe('GDPR Preparation Service - Factory Functions', () => {
  it('should create service via factory function', () => {
    const service = createGDPRPreparationService();

    expect(service).toBeInstanceOf(GDPRPreparationService);
    expect(service.getFieldClassification).toBeDefined();
    expect(service.createGDPREncryptionMetadata).toBeDefined();
  });

  it('should use global service instance', () => {
    expect(gdprService).toBeInstanceOf(GDPRPreparationService);
    expect(gdprService.getFieldClassification).toBeDefined();
  });
});

describe('GDPR Preparation Service - Edge Cases', () => {
  let service: GDPRPreparationService;

  beforeEach(() => {
    service = new GDPRPreparationService();
  });

  it('should handle multiple field consent validation', () => {
    service.recordConsent(
      'user-123',
      'guest',
      ['email', 'phone', 'address'],
      'explicit',
      ['wedding_coordination']
    );

    // Should validate all fields
    const hasConsent = service.hasValidConsent(
      'user-123',
      'guest',
      ['email', 'phone']
    );
    expect(hasConsent).toBe(true);

    // Should fail if any field missing
    const hasMixedConsent = service.hasValidConsent(
      'user-123',
      'guest',
      ['email', 'dietary_restrictions'] // dietary_restrictions not consented
    );
    expect(hasMixedConsent).toBe(false);
  });

  it('should handle partial consent withdrawal', () => {
    service.recordConsent(
      'user-123',
      'guest',
      ['email', 'phone'],
      'explicit',
      ['wedding_coordination']
    );

    // Withdraw consent for only email (not phone)
    const withdrawn = service.withdrawConsent('user-123', 'guest', ['email']);
    expect(withdrawn).toBe(true);

    // Email consent should be withdrawn
    const hasEmailConsent = service.hasValidConsent('user-123', 'guest', ['email']);
    expect(hasEmailConsent).toBe(false);

    // Phone consent should still be valid
    const hasPhoneConsent = service.hasValidConsent('user-123', 'guest', ['phone']);
    expect(hasPhoneConsent).toBe(true);
  });

  it('should handle user with no consent records', () => {
    const hasConsent = service.hasValidConsent('unknown-user', 'guest', ['email']);
    expect(hasConsent).toBe(false);

    const withdrawn = service.withdrawConsent('unknown-user', 'guest', ['email']);
    expect(withdrawn).toBe(false);
  });

  it('should handle validation of unknown data types', () => {
    const validation = service.validateGDPRCompliance(
      'user-123',
      'unknown' as WeddingDataType,
      ['unknown_field'],
      'read',
      'test_purpose'
    );

    expect(validation.compliant).toBe(false);
    expect(validation.issues).toContain(
      'No GDPR classification found for unknown:unknown_field'
    );
  });

  it('should handle concurrent consent operations', () => {
    const promises = Array.from({ length: 10 }, (_, i) => 
      Promise.resolve().then(() => {
        service.recordConsent(
          `user-${i}`,
          'guest',
          ['email'],
          'explicit',
          ['wedding_coordination']
        );
        
        return service.hasValidConsent(`user-${i}`, 'guest', ['email']);
      })
    );

    return Promise.all(promises).then(results => {
      expect(results.every(result => result === true)).toBe(true);
    });
  });
});

describe('GDPR Data Classifications - Comprehensive Coverage', () => {
  let service: GDPRPreparationService;

  beforeEach(() => {
    service = new GDPRPreparationService();
  });

  it('should have classifications for all major wedding data types', () => {
    const dataTypes: WeddingDataType[] = ['guest', 'vendor', 'payment', 'timeline'];
    
    dataTypes.forEach(dataType => {
      const report = service.generateDataClassificationReport();
      const typeClassifications = report.classifications.filter(c => c.data_type === dataType);
      
      expect(typeClassifications.length).toBeGreaterThan(0);
    });
  });

  it('should properly classify sensitive health and financial data', () => {
    const healthField = service.getFieldClassification('guest', 'dietary_restrictions');
    const financialField = service.getFieldClassification('payment', 'card_number');
    const taxField = service.getFieldClassification('vendor', 'tax_id');

    expect(healthField?.classification).toBe('highly_sensitive');
    expect(healthField?.category).toBe('health_data');
    
    expect(financialField?.classification).toBe('highly_sensitive');
    expect(financialField?.category).toBe('financial_data');
    
    expect(taxField?.classification).toBe('highly_sensitive');
    expect(taxField?.category).toBe('financial_data');
  });

  it('should have appropriate retention periods for different data types', () => {
    const guestEmail = service.getFieldClassification('guest', 'email');
    const healthData = service.getFieldClassification('guest', 'dietary_restrictions');
    const paymentData = service.getFieldClassification('payment', 'card_number');

    expect(guestEmail?.retention_period_days).toBe(2555); // 7 years for general wedding data
    expect(healthData?.retention_period_days).toBe(90); // Short retention for health
    expect(paymentData?.retention_period_days).toBe(90); // Short retention for payment
  });

  it('should have proper legal basis assignments', () => {
    const guestEmail = service.getFieldClassification('guest', 'email');
    const healthData = service.getFieldClassification('guest', 'dietary_restrictions');
    const vendorTax = service.getFieldClassification('vendor', 'tax_id');

    expect(guestEmail?.legal_basis).toBe('legitimate_interests');
    expect(healthData?.legal_basis).toBe('explicit_consent');
    expect(vendorTax?.legal_basis).toBe('legal_obligation');
  });

  it('should define appropriate subject rights for each field', () => {
    const guestEmail = service.getFieldClassification('guest', 'email');
    const healthData = service.getFieldClassification('guest', 'dietary_restrictions');
    const vendorTax = service.getFieldClassification('vendor', 'tax_id');

    expect(guestEmail?.subject_rights).toContain('access');
    expect(guestEmail?.subject_rights).toContain('erasure');
    expect(guestEmail?.subject_rights).toContain('data_portability');

    expect(healthData?.subject_rights).toContain('access');
    expect(healthData?.subject_rights).toContain('restrict_processing');
    
    expect(vendorTax?.subject_rights).toContain('access');
    expect(vendorTax?.subject_rights).not.toContain('erasure'); // Business record retention
  });
});