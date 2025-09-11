/**
 * WS-176 GDPR Compliance System - Team D Round 1
 * Unit tests for Legal Configuration Manager
 * 
 * @fileoverview Comprehensive test suite for the legal configuration system
 * managing multi-jurisdictional compliance requirements
 */

import { describe, test, expect, beforeEach, afterEach, beforeAll, vi } from 'vitest';
import { LegalConfigurationManager } from '../../../src/config/legal/legal-config';
import { Jurisdiction, LegalConfiguration, LegalRequirement, RequirementCategory } from '../../../src/types/gdpr-compliance';

// Create test directory structure
beforeAll(async () => {
  const fs = require('fs').promises;
  try {
    await fs.mkdir('/Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync/__tests__/config', { recursive: true });
    await fs.mkdir('/Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync/__tests__/config/legal', { recursive: true });
  } catch (error) {
    // Directory might already exist
  }
});

// Mock Supabase client
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      upsert: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis()
    }))
  }))
}));

// Mock audit logger
vi.mock('../../../src/lib/middleware/audit', () => ({
  auditLogger: {
    log: vi.fn().mockResolvedValue(undefined)
  }
}));

describe('LegalConfigurationManager', () => {
  let manager: LegalConfigurationManager;
  let mockSupabase: any;

  beforeEach(() => {
    manager = (LegalConfigurationManager as any).getInstance();
    mockSupabase = {
      from: vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        insert: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        upsert: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis()
      }))
    };

    // Reset singleton instance for testing
    (LegalConfigurationManager as any).instance = null;
    manager = (LegalConfigurationManager as any).getInstance();
    (manager as any).supabase = mockSupabase;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Singleton Pattern', () => {
    test('should return same instance when called multiple times', () => {
      const manager1 = (LegalConfigurationManager as any).getInstance();
      const manager2 = (LegalConfigurationManager as any).getInstance();
      expect(manager1).toBe(manager2);
    });

    test('should initialize with default configurations', () => {
      const allConfigs = manager.getAllConfigurations();
      expect(allConfigs.length).toBeGreaterThan(0);
      
      // Check for expected default jurisdictions
      const jurisdictions = allConfigs.map(c => c.jurisdiction);
      expect(jurisdictions).toContain('EU');
      expect(jurisdictions).toContain('UK');
      expect(jurisdictions).toContain('US_CALIFORNIA');
      expect(jurisdictions).toContain('CANADA');
    });
  });

  describe('Configuration Retrieval', () => {
    test('should get configuration for EU jurisdiction', () => {
      const euConfig = manager.getConfiguration('EU');
      expect(euConfig).toBeDefined();
      expect(euConfig?.jurisdiction).toBe('EU');
      expect(euConfig?.regulations.length).toBeGreaterThan(0);
      expect(euConfig?.regulations[0].abbreviation).toBe('GDPR');
    });

    test('should get configuration for UK jurisdiction', () => {
      const ukConfig = manager.getConfiguration('UK');
      expect(ukConfig).toBeDefined();
      expect(ukConfig?.jurisdiction).toBe('UK');
      expect(ukConfig?.regulations[0].abbreviation).toBe('UK GDPR');
    });

    test('should get configuration for California jurisdiction', () => {
      const caConfig = manager.getConfiguration('US_CALIFORNIA');
      expect(caConfig).toBeDefined();
      expect(caConfig?.jurisdiction).toBe('US_CALIFORNIA');
      expect(caConfig?.regulations[0].abbreviation).toBe('CPRA');
    });

    test('should get configuration for Canada jurisdiction', () => {
      const canadaConfig = manager.getConfiguration('CANADA');
      expect(canadaConfig).toBeDefined();
      expect(canadaConfig?.jurisdiction).toBe('CANADA');
      expect(canadaConfig?.regulations[0].abbreviation).toBe('PIPEDA');
    });

    test('should return null for unknown jurisdiction', () => {
      const unknownConfig = manager.getConfiguration('MARS' as Jurisdiction);
      expect(unknownConfig).toBeNull();
    });

    test('should get all active configurations', () => {
      const allConfigs = manager.getAllConfigurations();
      expect(allConfigs.length).toBeGreaterThanOrEqual(4); // At least EU, UK, CA, Canada
      
      // All returned configs should be active
      allConfigs.forEach(config => {
        expect(config.isActive).toBe(true);
      });
    });
  });

  describe('Applicable Jurisdictions', () => {
    test('should determine applicable jurisdictions based on user location', async () => {
      const jurisdictions = await manager.getApplicableJurisdictions('DE');
      expect(jurisdictions).toContain('EU');
    });

    test('should determine applicable jurisdictions based on organization location', async () => {
      const jurisdictions = await manager.getApplicableJurisdictions(undefined, 'UK');
      expect(jurisdictions).toContain('UK');
    });

    test('should determine applicable jurisdictions for multiple processing locations', async () => {
      const jurisdictions = await manager.getApplicableJurisdictions(
        undefined, 
        undefined, 
        ['US-CA', 'DE', 'CA']
      );
      expect(jurisdictions).toContain('US_CALIFORNIA');
      expect(jurisdictions).toContain('EU');
      expect(jurisdictions).toContain('CANADA');
    });

    test('should handle unknown location codes gracefully', async () => {
      const jurisdictions = await manager.getApplicableJurisdictions('XX');
      expect(jurisdictions).toEqual([]);
    });
  });

  describe('Data Transfer Validation', () => {
    test('should allow EU to UK transfer with adequacy decision', () => {
      const result = manager.isTransferAllowed('EU', 'UK');
      expect(result.allowed).toBe(true);
      expect(result.requiredMechanism).toBe('adequacy_decision');
    });

    test('should allow EU to Canada transfer with adequacy decision', () => {
      const result = manager.isTransferAllowed('EU', 'CANADA');
      expect(result.allowed).toBe(true);
      expect(result.requiredMechanism).toBe('adequacy_decision');
    });

    test('should require SCCs for EU to US transfer', () => {
      const result = manager.isTransferAllowed('EU', 'US_CALIFORNIA');
      expect(result.allowed).toBe(true);
      expect(result.requiredMechanism).toBe('standard_contractual_clauses');
      expect(result.additionalSafeguards).toContain('Encryption in transit');
    });

    test('should handle non-EU source jurisdictions', () => {
      const result = manager.isTransferAllowed('US_CALIFORNIA', 'CANADA');
      expect(result.allowed).toBe(true);
      expect(result.requiredMechanism).toBe('standard_contractual_clauses');
    });

    test('should validate specific transfer mechanism', () => {
      const result = manager.isTransferAllowed('EU', 'US_CALIFORNIA', 'explicit_consent');
      expect(result.allowed).toBe(false); // Should require SCCs, not consent
      expect(result.requiredMechanism).toBe('standard_contractual_clauses');
    });

    test('should handle unknown source jurisdiction', () => {
      const result = manager.isTransferAllowed('MARS' as Jurisdiction, 'EU');
      expect(result.allowed).toBe(false);
      expect(result.restrictions).toContain('Unknown source jurisdiction');
    });
  });

  describe('Requirements Management', () => {
    test('should get requirements by category for EU', () => {
      const consentReqs = manager.getRequirementsByCategory('EU', 'consent_management');
      expect(consentReqs.length).toBeGreaterThan(0);
      
      const gdprConsent = consentReqs.find(req => req.id === 'gdpr-consent-management');
      expect(gdprConsent).toBeDefined();
      expect(gdprConsent?.legalReference).toBe('GDPR Article 7');
    });

    test('should get requirements by category for UK', () => {
      const consentReqs = manager.getRequirementsByCategory('UK', 'consent_management');
      expect(consentReqs.length).toBeGreaterThan(0);
      
      const ukConsent = consentReqs.find(req => req.id === 'uk-gdpr-consent');
      expect(ukConsent).toBeDefined();
    });

    test('should return empty array for unknown category', () => {
      const unknownReqs = manager.getRequirementsByCategory('EU', 'unknown_category' as RequirementCategory);
      expect(unknownReqs).toEqual([]);
    });

    test('should get mandatory requirements with approaching deadlines', () => {
      const upcomingReqs = manager.getMandatoryRequirementsWithDeadlines('EU', 365); // Within 1 year
      // Some requirements should have deadlines
      expect(Array.isArray(upcomingReqs)).toBe(true);
    });

    test('should add custom requirement successfully', async () => {
      mockSupabase.from.mockReturnValue({
        upsert: vi.fn().mockResolvedValue({ data: [{ id: 'config-id' }], error: null })
      });

      const customRequirement = {
        category: 'data_minimization' as RequirementCategory,
        description: 'Custom data minimization requirement for wedding platform',
        legalReference: 'Custom Policy 1.0',
        compliance: 'mandatory' as const,
        implementationDeadline: new Date('2024-12-31'),
        verificationMethod: 'Automated compliance check'
      };

      const requirementId = await manager.addRequirement('EU', customRequirement);
      expect(requirementId).toBeDefined();
      expect(typeof requirementId).toBe('string');
    });

    test('should throw error when adding requirement to unknown jurisdiction', async () => {
      const customRequirement = {
        category: 'consent_management' as RequirementCategory,
        description: 'Test requirement',
        legalReference: 'Test Law',
        compliance: 'optional' as const,
        verificationMethod: 'Manual review'
      };

      await expect(manager.addRequirement('MARS' as Jurisdiction, customRequirement))
        .rejects.toThrow('Configuration not found for jurisdiction');
    });
  });

  describe('Breach Notification Requirements', () => {
    test('should get EU breach notification requirements', () => {
      const euNotification = manager.getBreachNotificationRequirements('EU');
      expect(euNotification).toBeDefined();
      expect(euNotification?.timeline).toBe('72 hours');
      expect(euNotification?.authority).toBe('European Data Protection Board');
      expect(euNotification?.mandatoryFields).toContain('nature_of_breach');
    });

    test('should get UK breach notification requirements', () => {
      const ukNotification = manager.getBreachNotificationRequirements('UK');
      expect(ukNotification).toBeDefined();
      expect(ukNotification?.timeline).toBe('72 hours');
      expect(ukNotification?.authority).toBe('Information Commissioner\'s Office');
    });

    test('should get California breach notification requirements', () => {
      const caNotification = manager.getBreachNotificationRequirements('US_CALIFORNIA');
      expect(caNotification).toBeDefined();
      expect(caNotification?.timeline).toBe('Without unreasonable delay');
      expect(caNotification?.authority).toBe('California Privacy Protection Agency');
    });

    test('should get Canada breach notification requirements', () => {
      const canadaNotification = manager.getBreachNotificationRequirements('CANADA');
      expect(canadaNotification).toBeDefined();
      expect(canadaNotification?.timeline).toBe('As soon as feasible');
      expect(canadaNotification?.authority).toBe('Office of the Privacy Commissioner of Canada');
    });

    test('should return null for unknown jurisdiction', () => {
      const unknownNotification = manager.getBreachNotificationRequirements('MARS' as Jurisdiction);
      expect(unknownNotification).toBeNull();
    });
  });

  describe('Configuration Updates', () => {
    test('should update configuration successfully', async () => {
      mockSupabase.from.mockReturnValue({
        upsert: vi.fn().mockResolvedValue({ data: [{ id: 'updated-config' }], error: null })
      });

      const updates = {
        isActive: false,
        lastUpdated: new Date()
      };

      await expect(manager.updateConfiguration('EU', updates)).resolves.not.toThrow();
    });

    test('should throw error when updating non-existent jurisdiction', async () => {
      const updates = {
        isActive: false
      };

      await expect(manager.updateConfiguration('MARS' as Jurisdiction, updates))
        .rejects.toThrow('Configuration not found for jurisdiction');
    });

    test('should validate configuration before updating', async () => {
      const invalidUpdates = {
        regulations: [] // Empty regulations array should be invalid
      };

      await expect(manager.updateConfiguration('EU', invalidUpdates))
        .rejects.toThrow('Configuration must have at least one regulation');
    });
  });

  describe('Compliance Status Checking', () => {
    test('should check compliance status for EU jurisdiction', async () => {
      const complianceStatus = await manager.checkComplianceStatus('EU');
      expect(complianceStatus).toBeDefined();
      expect(complianceStatus.overallCompliance).toBeGreaterThanOrEqual(0);
      expect(complianceStatus.overallCompliance).toBeLessThanOrEqual(100);
      expect(complianceStatus.mandatoryRequirements).toBeDefined();
      expect(complianceStatus.mandatoryRequirements.total).toBeGreaterThan(0);
      expect(Array.isArray(complianceStatus.recommendations)).toBe(true);
    });

    test('should handle compliance status for unknown jurisdiction', async () => {
      await expect(manager.checkComplianceStatus('MARS' as Jurisdiction))
        .rejects.toThrow('Configuration not found for jurisdiction');
    });
  });

  describe('Regulatory Updates', () => {
    test('should check for regulatory updates', async () => {
      const updates = await manager.checkForRegulatoryUpdates();
      expect(updates).toBeDefined();
      expect(updates.lastChecked).toBeInstanceOf(Date);
      expect(Array.isArray(updates.updates)).toBe(true);
      
      if (updates.updates.length > 0) {
        const firstUpdate = updates.updates[0];
        expect(firstUpdate).toHaveProperty('jurisdiction');
        expect(firstUpdate).toHaveProperty('regulation');
        expect(firstUpdate).toHaveProperty('updateType');
        expect(firstUpdate).toHaveProperty('description');
        expect(firstUpdate).toHaveProperty('effectiveDate');
        expect(firstUpdate).toHaveProperty('actionRequired');
      }
    });
  });

  describe('Configuration Import/Export', () => {
    test('should export configuration as JSON', () => {
      const exportedConfig = manager.exportConfiguration('EU', 'json');
      expect(exportedConfig).toBeDefined();
      expect(typeof exportedConfig).toBe('string');
      
      // Should be valid JSON
      const parsed = JSON.parse(exportedConfig);
      expect(parsed.jurisdiction).toBe('EU');
      expect(parsed.regulations).toBeDefined();
    });

    test('should throw error for unknown jurisdiction export', () => {
      expect(() => manager.exportConfiguration('MARS' as Jurisdiction))
        .toThrow('Configuration not found for jurisdiction');
    });

    test('should throw error for unsupported export format', () => {
      expect(() => manager.exportConfiguration('EU', 'xml' as any))
        .toThrow('XML export not yet implemented');
    });

    test('should import configuration successfully', async () => {
      mockSupabase.from.mockReturnValue({
        upsert: vi.fn().mockResolvedValue({ data: [{ id: 'imported-config' }], error: null })
      });

      const configToImport = {
        isActive: true,
        penalties: {
          currency: 'EUR',
          maxFineAmount: 25000000, // Updated amount
          maxFinePercentage: 4,
          criminalLiability: false,
          additionalConsequences: ['Updated consequences']
        }
      };

      const configJson = JSON.stringify(configToImport);
      await expect(manager.importConfiguration('EU', configJson, 'json'))
        .resolves.not.toThrow();
    });

    test('should handle invalid JSON during import', async () => {
      const invalidJson = '{ invalid json structure }';
      await expect(manager.importConfiguration('EU', invalidJson))
        .rejects.toThrow('Failed to parse configuration data');
    });

    test('should throw error for unsupported import format', async () => {
      await expect(manager.importConfiguration('EU', '<xml></xml>', 'xml' as any))
        .rejects.toThrow('XML import not yet implemented');
    });
  });

  describe('Location Mapping', () => {
    test('should map EU country codes correctly', async () => {
      const germanJurisdictions = await manager.getApplicableJurisdictions('DE');
      expect(germanJurisdictions).toContain('EU');

      const frenchJurisdictions = await manager.getApplicableJurisdictions('FR');
      expect(frenchJurisdictions).toContain('EU');

      const italianJurisdictions = await manager.getApplicableJurisdictions('IT');
      expect(italianJurisdictions).toContain('EU');
    });

    test('should map non-EU countries correctly', async () => {
      const ukJurisdictions = await manager.getApplicableJurisdictions('UK');
      expect(ukJurisdictions).toContain('UK');

      const canadianJurisdictions = await manager.getApplicableJurisdictions('CA');
      expect(canadianJurisdictions).toContain('CANADA');
    });

    test('should handle unknown country codes', async () => {
      const unknownJurisdictions = await manager.getApplicableJurisdictions('ZZ');
      expect(unknownJurisdictions).toEqual([]);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    test('should handle database errors during save operations', async () => {
      mockSupabase.from.mockReturnValue({
        upsert: vi.fn().mockResolvedValue({ 
          data: null, 
          error: { message: 'Database constraint violation' } 
        })
      });

      const updates = { isActive: true };
      await expect(manager.updateConfiguration('EU', updates))
        .rejects.toThrow('Failed to save configuration');
    });

    test('should validate requirement fields properly', async () => {
      mockSupabase.from.mockReturnValue({
        upsert: vi.fn().mockResolvedValue({ data: [{ id: 'config-id' }], error: null })
      });

      const invalidRequirement = {
        // Missing required fields
        category: undefined as any,
        description: '',
        legalReference: 'Test',
        compliance: 'mandatory' as const,
        verificationMethod: 'Test'
      };

      await expect(manager.addRequirement('EU', invalidRequirement))
        .rejects.toThrow('Requirement must have ID, category, and description');
    });

    test('should handle past deadline validation', async () => {
      mockSupabase.from.mockReturnValue({
        upsert: vi.fn().mockResolvedValue({ data: [{ id: 'config-id' }], error: null })
      });

      const pastDeadlineRequirement = {
        category: 'dpo_appointment' as RequirementCategory,
        description: 'Past deadline requirement',
        legalReference: 'Test Article',
        compliance: 'mandatory' as const,
        implementationDeadline: new Date('2020-01-01'), // Past date
        verificationMethod: 'Manual check'
      };

      // Should not throw but should log warning
      const requirementId = await manager.addRequirement('EU', pastDeadlineRequirement);
      expect(requirementId).toBeDefined();
    });

    test('should handle empty or null configuration values', () => {
      const config = manager.getConfiguration('EU');
      expect(config).toBeDefined();
      
      // Ensure required fields are not empty
      expect(config?.id).toBeTruthy();
      expect(config?.jurisdiction).toBeTruthy();
      expect(config?.regulations.length).toBeGreaterThan(0);
    });

    test('should handle malformed penalty structures', () => {
      const config = manager.getConfiguration('EU');
      expect(config?.penalties).toBeDefined();
      expect(config?.penalties.currency).toBeTruthy();
      expect(config?.penalties.maxFineAmount).toBeGreaterThan(0);
      expect(config?.penalties.maxFinePercentage).toBeGreaterThan(0);
    });
  });
});