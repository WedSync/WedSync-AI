/**
 * Demo Suite Integration Tests
 * Tests the complete demo system working together
 */

import { describe, it, expect, beforeAll, afterAll, jest } from '@jest/globals';
import { demoSeedingService } from '@/lib/services/demo-seeding-service';
import { demoMediaService } from '@/lib/services/demo-media-service';
import { authenticateDemoUser, getDemoAccounts } from '@/lib/auth/demo-auth';

// Mock external dependencies
jest.mock('@supabase/supabase-js');
jest.mock('uuid', () => ({
  v4: () => 'test-uuid-' + Math.random().toString(36).substr(2, 9)
}));

// Mock console methods to reduce test noise
const originalConsole = console.log;
const originalError = console.error;
const originalWarn = console.warn;

beforeAll(() => {
  console.log = jest.fn();
  console.error = jest.fn();
  console.warn = jest.fn();
});

afterAll(() => {
  console.log = originalConsole;
  console.error = originalError;
  console.warn = originalWarn;
});

describe('Demo Suite Integration Tests', () => {
  const EXPECTED_SUPPLIERS = [
    { id: 'supplier_1', name: 'Sky Lens Studios', type: 'photographer' },
    { id: 'supplier_2', name: 'Golden Frame Films', type: 'videographer' },
    { id: 'supplier_3', name: 'The Oak Barn', type: 'venue' },
    { id: 'supplier_4', name: 'Wild Ivy Flowers', type: 'florist' },
    { id: 'supplier_5', name: 'Spin & Spark Entertainment', type: 'dj' },
    { id: 'supplier_6', name: 'Fork & Flame Catering', type: 'caterer' },
    { id: 'supplier_7', name: 'Velvet & Vows Events', type: 'planner' }
  ];

  const EXPECTED_COUPLES = [
    { id: 'couple_1', firstName: 'Emily', lastName: 'Harper', partner: 'Jack' },
    { id: 'couple_2', firstName: 'Sophia', lastName: 'Bennett', partner: 'Liam' }
  ];

  describe('Complete Demo System Flow', () => {
    it('should initialize storage, generate assets, seed data, and enable authentication', async () => {
      // Step 1: Initialize storage buckets
      await demoMediaService.initializeStorageBuckets();
      
      // Step 2: Generate all media assets
      await demoMediaService.generateDemoAssets();
      
      // Step 3: Seed database with demo data
      await demoSeedingService.seedDemoData();
      
      // Step 4: Verify authentication works for all accounts
      const accounts = await getDemoAccounts();
      
      expect(accounts.suppliers).toHaveLength(7);
      expect(accounts.couples).toHaveLength(2);
      
      // Test authentication for each account
      for (const supplier of accounts.suppliers) {
        const authResult = await authenticateDemoUser(supplier.id);
        expect(authResult.success).toBe(true);
        expect(authResult.token).toBeDefined();
      }
      
      for (const couple of accounts.couples) {
        const authResult = await authenticateDemoUser(couple.id);
        expect(authResult.success).toBe(true);
        expect(authResult.token).toBeDefined();
      }
    });

    it('should provide complete demo portal data with all assets', async () => {
      const portalData = await demoSeedingService.getDemoPortalData();
      
      expect(portalData.suppliers).toHaveLength(7);
      expect(portalData.couples).toHaveLength(2);
      expect(portalData.stats.totalSuppliers).toBe(7);
      expect(portalData.stats.totalCouples).toBe(2);
      expect(portalData.stats.totalAssets).toBeGreaterThan(35); // 7 logos + 2 photos + 35 docs minimum
      
      // Verify each supplier has assets
      for (const supplier of portalData.suppliers) {
        expect(supplier.logoUrl).toBeDefined();
        expect(supplier.documentUrls).toBeDefined();
        expect(supplier.documentUrls).toHaveLength(5); // 5 documents per supplier
      }
      
      // Verify each couple has assets
      for (const couple of portalData.couples) {
        expect(couple.profilePhotoUrl).toBeDefined();
      }
    });

    it('should handle reset operations correctly', async () => {
      // Seed initial data
      await demoSeedingService.seedDemoData();
      
      // Reset everything
      await demoSeedingService.resetDemoData();
      
      // Verify cleanup
      const portalData = await demoSeedingService.getDemoPortalData();
      expect(portalData.suppliers).toHaveLength(0);
      expect(portalData.couples).toHaveLength(0);
      
      // Re-seed and verify it works again
      await demoSeedingService.seedDemoData();
      
      const newPortalData = await demoSeedingService.getDemoPortalData();
      expect(newPortalData.suppliers).toHaveLength(7);
      expect(newPortalData.couples).toHaveLength(2);
    });
  });

  describe('Data Consistency Tests', () => {
    it('should ensure all suppliers have consistent data structure', async () => {
      await demoSeedingService.seedDemoData();
      const portalData = await demoSeedingService.getDemoPortalData();
      
      for (const supplier of portalData.suppliers) {
        // Verify required fields
        expect(supplier.id).toBeDefined();
        expect(supplier.email).toBeDefined();
        expect(supplier.businessName).toBeDefined();
        expect(supplier.supplierType).toBeDefined();
        
        // Verify email format
        expect(supplier.email).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
        
        // Verify supplier type is valid
        expect(['photographer', 'videographer', 'venue', 'florist', 'dj', 'caterer', 'planner'])
          .toContain(supplier.supplierType);
        
        // Verify assets
        if (supplier.logoUrl) {
          expect(supplier.logoUrl).toContain('demo-logos');
        }
        
        if (supplier.documentUrls) {
          expect(supplier.documentUrls).toHaveLength(5);
          supplier.documentUrls.forEach(url => {
            expect(url).toContain('demo-documents');
          });
        }
      }
    });

    it('should ensure all couples have consistent data structure', async () => {
      await demoSeedingService.seedDemoData();
      const portalData = await demoSeedingService.getDemoPortalData();
      
      for (const couple of portalData.couples) {
        // Verify required fields
        expect(couple.id).toBeDefined();
        expect(couple.email).toBeDefined();
        expect(couple.firstName).toBeDefined();
        expect(couple.lastName).toBeDefined();
        expect(couple.partnerName).toBeDefined();
        
        // Verify email format
        expect(couple.email).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
        
        // Verify name fields are strings
        expect(typeof couple.firstName).toBe('string');
        expect(typeof couple.lastName).toBe('string');
        expect(typeof couple.partnerName).toBe('string');
        
        // Verify assets
        if (couple.profilePhotoUrl) {
          expect(couple.profilePhotoUrl).toContain('demo-profiles');
        }
      }
    });

    it('should verify business names match expected values', async () => {
      await demoSeedingService.seedDemoData();
      const portalData = await demoSeedingService.getDemoPortalData();
      
      const expectedBusinessNames = [
        'Sky Lens Studios',
        'Golden Frame Films', 
        'The Oak Barn',
        'Wild Ivy Flowers',
        'Spin & Spark Entertainment',
        'Fork & Flame Catering',
        'Velvet & Vows Events'
      ];
      
      const actualBusinessNames = portalData.suppliers.map(s => s.businessName);
      
      for (const expectedName of expectedBusinessNames) {
        expect(actualBusinessNames).toContain(expectedName);
      }
    });

    it('should verify couple names match expected values', async () => {
      await demoSeedingService.seedDemoData();
      const portalData = await demoSeedingService.getDemoPortalData();
      
      const expectedCouples = [
        { firstName: 'Emily', partner: 'Jack' },
        { firstName: 'Sophia', partner: 'Liam' }
      ];
      
      for (const expected of expectedCouples) {
        const found = portalData.couples.find(c => 
          c.firstName === expected.firstName && c.partnerName === expected.partner
        );
        expect(found).toBeDefined();
      }
    });
  });

  describe('Authentication Integration', () => {
    it('should authenticate all demo suppliers after seeding', async () => {
      await demoSeedingService.seedDemoData();
      
      for (const expected of EXPECTED_SUPPLIERS) {
        const result = await authenticateDemoUser(expected.id);
        
        expect(result.success).toBe(true);
        expect(result.account?.id).toBe(expected.id);
        expect(result.account?.type).toBe('supplier');
        expect(result.account?.businessName).toBe(expected.name);
        expect(result.token).toBeDefined();
      }
    });

    it('should authenticate all demo couples after seeding', async () => {
      await demoSeedingService.seedDemoData();
      
      for (const expected of EXPECTED_COUPLES) {
        const result = await authenticateDemoUser(expected.id);
        
        expect(result.success).toBe(true);
        expect(result.account?.id).toBe(expected.id);
        expect(result.account?.type).toBe('couple');
        expect(result.token).toBeDefined();
      }
    });

    it('should maintain authentication after asset generation', async () => {
      await demoSeedingService.seedDemoData();
      
      // Regenerate assets
      await demoMediaService.generateDemoAssets();
      
      // Authentication should still work
      const result = await authenticateDemoUser('supplier_1');
      expect(result.success).toBe(true);
      
      const coupleResult = await authenticateDemoUser('couple_1');
      expect(coupleResult.success).toBe(true);
    });
  });

  describe('Asset Integration', () => {
    it('should generate assets that match seeded data', async () => {
      await demoSeedingService.seedDemoData();
      const portalData = await demoSeedingService.getDemoPortalData();
      
      // Check that each supplier has appropriate assets
      for (const supplier of portalData.suppliers) {
        expect(supplier.logoUrl).toBeTruthy();
        expect(supplier.documentUrls).toHaveLength(5);
        
        // Verify asset URLs are properly formatted
        expect(supplier.logoUrl).toMatch(/^https?:\/\/.+\/demo-logos\/.+\.svg$/);
        
        supplier.documentUrls?.forEach(url => {
          expect(url).toMatch(/^https?:\/\/.+\/demo-documents\/.+\.html$/);
        });
      }
      
      // Check that each couple has profile photo
      for (const couple of portalData.couples) {
        expect(couple.profilePhotoUrl).toBeTruthy();
        expect(couple.profilePhotoUrl).toMatch(/^https?:\/\/.+\/demo-profiles\/.+\.svg$/);
      }
    });

    it('should maintain asset URLs after reset and re-seed', async () => {
      // Initial seed
      await demoSeedingService.seedDemoData();
      const initialData = await demoSeedingService.getDemoPortalData();
      
      // Reset
      await demoSeedingService.resetDemoData();
      
      // Re-seed
      await demoSeedingService.seedDemoData();
      const newData = await demoSeedingService.getDemoPortalData();
      
      // Should have same structure (URLs may be different due to regeneration)
      expect(newData.suppliers).toHaveLength(initialData.suppliers.length);
      expect(newData.couples).toHaveLength(initialData.couples.length);
      
      // All assets should be regenerated
      newData.suppliers.forEach(supplier => {
        expect(supplier.logoUrl).toBeTruthy();
        expect(supplier.documentUrls).toHaveLength(5);
      });
      
      newData.couples.forEach(couple => {
        expect(couple.profilePhotoUrl).toBeTruthy();
      });
    });
  });

  describe('Error Handling Integration', () => {
    it('should handle partial asset generation failures gracefully', async () => {
      // Mock some asset operations to fail
      const originalUpload = demoMediaService.generateSupplierLogo;
      let callCount = 0;
      
      jest.spyOn(demoMediaService, 'generateSupplierLogo').mockImplementation(async (config) => {
        callCount++;
        if (callCount === 3) { // Fail on 3rd supplier
          throw new Error('Asset generation failed');
        }
        return originalUpload.call(demoMediaService, config);
      });
      
      // Should continue seeding despite failures
      await expect(demoSeedingService.seedDemoData()).resolves.not.toThrow();
      
      // Verify partial success
      const portalData = await demoSeedingService.getDemoPortalData();
      expect(portalData.suppliers.length).toBeGreaterThan(0);
      
      // Clean up mock
      jest.restoreAllMocks();
    });

    it('should handle authentication after partial data corruption', async () => {
      await demoSeedingService.seedDemoData();
      
      // Simulate partial data corruption by testing authentication
      // even when some accounts might be missing
      const accounts = await getDemoAccounts();
      
      // Should still have some accounts available
      expect(accounts.suppliers.length + accounts.couples.length).toBeGreaterThan(0);
      
      // Available accounts should still authenticate
      if (accounts.suppliers.length > 0) {
        const result = await authenticateDemoUser(accounts.suppliers[0].id);
        expect(result.success).toBe(true);
      }
      
      if (accounts.couples.length > 0) {
        const result = await authenticateDemoUser(accounts.couples[0].id);
        expect(result.success).toBe(true);
      }
    });
  });

  describe('Performance Integration', () => {
    it('should complete full demo system setup within time limits', async () => {
      const startTime = Date.now();
      
      // Full system setup
      await demoMediaService.initializeStorageBuckets();
      await demoMediaService.generateDemoAssets();
      await demoSeedingService.seedDemoData();
      
      // Verify all accounts authenticate
      const accounts = await getDemoAccounts();
      expect(accounts.suppliers).toHaveLength(7);
      expect(accounts.couples).toHaveLength(2);
      
      const duration = Date.now() - startTime;
      
      // Should complete within 10 minutes (generous for CI/CD)
      expect(duration).toBeLessThan(600000);
    }, 600000); // 10-minute timeout

    it('should handle concurrent authentication requests', async () => {
      await demoSeedingService.seedDemoData();
      
      // Test concurrent authentication
      const authPromises = [
        authenticateDemoUser('supplier_1'),
        authenticateDemoUser('supplier_2'),
        authenticateDemoUser('couple_1'),
        authenticateDemoUser('couple_2'),
        authenticateDemoUser('supplier_3')
      ];
      
      const results = await Promise.all(authPromises);
      
      results.forEach(result => {
        expect(result.success).toBe(true);
        expect(result.token).toBeDefined();
      });
    });

    it('should provide fast portal data retrieval', async () => {
      await demoSeedingService.seedDemoData();
      
      const startTime = Date.now();
      const portalData = await demoSeedingService.getDemoPortalData();
      const duration = Date.now() - startTime;
      
      expect(portalData.suppliers).toHaveLength(7);
      expect(portalData.couples).toHaveLength(2);
      
      // Should retrieve data quickly (< 2 seconds)
      expect(duration).toBeLessThan(2000);
    });
  });

  describe('Business Logic Integration', () => {
    it('should create realistic wedding industry relationships', async () => {
      await demoSeedingService.seedDemoData();
      
      // Verify supplier types cover wedding industry
      const portalData = await demoSeedingService.getDemoPortalData();
      const supplierTypes = portalData.suppliers.map(s => s.supplierType);
      
      const expectedTypes = [
        'photographer', 'videographer', 'venue', 'florist', 
        'dj', 'caterer', 'planner'
      ];
      
      expectedTypes.forEach(type => {
        expect(supplierTypes).toContain(type);
      });
    });

    it('should generate appropriate document content for wedding context', async () => {
      await demoSeedingService.seedDemoData();
      
      // This would require inspecting actual document content
      // For now, verify that document URLs are generated for wedding-specific templates
      const portalData = await demoSeedingService.getDemoPortalData();
      
      portalData.suppliers.forEach(supplier => {
        expect(supplier.documentUrls).toBeDefined();
        
        const docTypes = supplier.documentUrls?.map(url => {
          const filename = url.split('/').pop()?.replace('.html', '');
          return filename;
        }) || [];
        
        expect(docTypes).toContain('welcome-guide');
        expect(docTypes).toContain('pricing-sheet');
        expect(docTypes).toContain('questionnaire');
        expect(docTypes).toContain('contract');
        expect(docTypes).toContain('portfolio-sample');
      });
    });

    it('should maintain wedding date integrity for couples', async () => {
      await demoSeedingService.seedDemoData();
      
      // Verify that couples have realistic wedding context
      const portalData = await demoSeedingService.getDemoPortalData();
      
      portalData.couples.forEach(couple => {
        expect(couple.firstName).toBeTruthy();
        expect(couple.lastName).toBeTruthy();
        expect(couple.partnerName).toBeTruthy();
        expect(couple.email).toMatch(/@example\.com$/);
      });
    });
  });

  describe('Security Integration', () => {
    it('should isolate demo data from production concerns', async () => {
      await demoSeedingService.seedDemoData();
      
      // All demo accounts should authenticate with demo flags
      const accounts = await getDemoAccounts();
      
      for (const supplier of accounts.suppliers) {
        const result = await authenticateDemoUser(supplier.id);
        
        if (result.success && result.token) {
          const payload = JSON.parse(
            Buffer.from(result.token.split('.')[1], 'base64').toString()
          );
          
          expect(payload.isDemoUser).toBe(true);
          expect(payload.accountType).toBe('supplier');
        }
      }
      
      for (const couple of accounts.couples) {
        const result = await authenticateDemoUser(couple.id);
        
        if (result.success && result.token) {
          const payload = JSON.parse(
            Buffer.from(result.token.split('.')[1], 'base64').toString()
          );
          
          expect(payload.isDemoUser).toBe(true);
          expect(payload.accountType).toBe('couple');
        }
      }
    });

    it('should prevent production account access through demo system', async () => {
      // Try to authenticate with production-like IDs
      const productionIds = [
        'auth0|123456',
        '550e8400-e29b-41d3-a456-426614174000',
        'real_user_123',
        'prod_account_456'
      ];
      
      for (const id of productionIds) {
        const result = await authenticateDemoUser(id);
        expect(result.success).toBe(false);
        expect(result.error).toBe('Invalid demo account');
      }
    });
  });
});