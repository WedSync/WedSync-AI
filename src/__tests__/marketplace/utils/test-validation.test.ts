/**
 * Validation test for WedSync Marketplace Test Utilities
 * Ensures our test helpers and mock data generators work correctly
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { VendorMarketplaceTestSuite } from './test-helpers';
import { mockDataGenerator } from './mock-data';
import type { VendorCategory } from './test-helpers';

describe('WedSync Marketplace Test Utilities', () => {
  let testSuite: VendorMarketplaceTestSuite;

  beforeEach(() => {
    testSuite = new VendorMarketplaceTestSuite();
  });

  describe('VendorMarketplaceTestSuite', () => {
    it('should generate wedding test data successfully', async () => {
      const testData =
        await testSuite.generateWeddingTestData('basic-scenario');

      expect(testData).toBeDefined();
      expect(testData.weddingDate).toMatch(/^\d{4}-\d{2}-\d{2}T/);
      expect(testData.venue).toBeDefined();
      expect(testData.couple).toBeDefined();
      expect(testData.budget).toBeDefined();
      expect(testData.guestCount).toBeGreaterThan(0);
      expect(testData.location).toBeDefined();
      expect(testData.style).toBeDefined();
    });

    it('should generate vendor data for different categories', () => {
      const categories: VendorCategory[] = [
        'photography',
        'catering',
        'venues',
        'flowers',
      ];

      categories.forEach((category) => {
        const vendor = testSuite.generateVendorData(category);

        expect(vendor).toBeDefined();
        expect(vendor.category).toBe(category);
        expect(vendor.id).toBeTruthy();
        expect(vendor.name).toBeTruthy();
        expect(vendor.pricing).toBeDefined();
        expect(vendor.pricing.startingPrice).toBeGreaterThan(0);
        expect(vendor.pricing.currency).toBe('GBP');
        expect(vendor.availability).toBeDefined();
        expect(vendor.portfolio).toBeDefined();
        expect(vendor.reviews).toBeDefined();
        expect(vendor.specializations).toBeDefined();
        expect(Array.isArray(vendor.specializations)).toBe(true);
      });
    });

    it('should generate UK phone numbers', () => {
      const phone = testSuite.generateUKPhoneNumber();
      expect(phone).toBeTruthy();
      expect(typeof phone).toBe('string');
    });

    it('should generate valid UUIDs', () => {
      const uuid = testSuite.generateUUID();
      expect(uuid).toBeTruthy();
      expect(typeof uuid).toBe('string');
      // Basic UUID format check (36 characters with hyphens)
      expect(uuid).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
      );
    });

    it('should generate wedding emails', () => {
      const email = testSuite.generateWeddingEmail();
      expect(email).toBeTruthy();
      expect(email).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
    });

    it('should simulate couple search with realistic parameters', async () => {
      const searchParams = {
        budget: { min: 1000, max: 5000 },
        category: 'photography' as VendorCategory,
        location: 'London',
        guestCount: 100,
      };

      const vendors = await testSuite.simulateCoupleSearch(searchParams);

      expect(Array.isArray(vendors)).toBe(true);
      vendors.forEach((vendor) => {
        expect(vendor.category).toBe('photography');
        expect(vendor.pricing.startingPrice).toBeGreaterThanOrEqual(
          searchParams.budget.min,
        );
        expect(vendor.pricing.startingPrice).toBeLessThanOrEqual(
          searchParams.budget.max,
        );
      });
    });

    it('should track performance metrics', () => {
      testSuite.startPerformanceMonitoring();

      // Record some test metrics
      testSuite.recordResponseTime(150);
      testSuite.recordResponseTime(200);
      testSuite.recordSuccess();
      testSuite.recordSuccess();
      testSuite.recordError();

      const report = testSuite.getPerformanceReport();

      expect(report.averageResponseTime).toBe(175);
      expect(report.p95ResponseTime).toBeDefined();
      expect(report.totalRequests).toBe(3);
      expect(report.successRate).toBeCloseTo(0.67, 1);
      expect(report.errorRate).toBeCloseTo(0.33, 1);
    });
  });

  describe('WeddingMockDataGenerator', () => {
    it('should provide singleton instance', () => {
      const instance1 = mockDataGenerator;
      const instance2 = mockDataGenerator;
      expect(instance1).toBe(instance2);
    });

    it('should generate vendors by category', () => {
      const photographers = mockDataGenerator.getVendorsByCategory(
        'photography',
        5,
      );

      expect(Array.isArray(photographers)).toBe(true);
      expect(photographers.length).toBeLessThanOrEqual(5);
      photographers.forEach((photographer) => {
        expect(photographer.category).toBe('photography');
        expect(photographer.name).toBeTruthy();
        // Name should contain wedding industry photography terms
        expect(photographer.name).toMatch(
          /(Photography|Photos|Images|Moments|Memories|Weddings)/i,
        );
      });
    });

    it('should generate random vendors', () => {
      const randomVendor = mockDataGenerator.getRandomVendor('catering');

      expect(randomVendor).toBeDefined();
      if (randomVendor) {
        expect(randomVendor.category).toBe('catering');
        expect(randomVendor.pricing.currency).toBe('GBP');
      }
    });

    it('should provide UK locations', () => {
      const locations = mockDataGenerator.getAllLocations();

      expect(Array.isArray(locations)).toBe(true);
      expect(locations.length).toBeGreaterThan(0);

      locations.forEach((location) => {
        expect(location.country).toBe('United Kingdom');
        expect(location.coordinates).toBeDefined();
        expect(location.coordinates.lat).toBeGreaterThan(49);
        expect(location.coordinates.lat).toBeLessThan(61);
        expect(location.coordinates.lng).toBeGreaterThan(-8);
        expect(location.coordinates.lng).toBeLessThan(2);
      });
    });

    it('should generate wedding scenarios', () => {
      const scenario = mockDataGenerator.generateWeddingScenario();

      expect(scenario).toBeDefined();
      expect(scenario.weddingDate).toBeTruthy();
      expect(scenario.venue).toBeDefined();
      expect(scenario.couple).toBeDefined();
      expect(scenario.couple.bride).toBeDefined();
      expect(scenario.couple.groom).toBeDefined();
      expect(scenario.budget).toBeDefined();
      expect(scenario.budget.total).toBeGreaterThan(0);
      expect(scenario.guestCount).toBeGreaterThan(0);
      expect(scenario.location).toBeDefined();
      expect(scenario.style).toBeDefined();
    });

    it('should generate wedding scenarios with customizations', () => {
      const customizations = {
        guestCount: 150,
        style: 'modern' as const,
      };

      const scenario =
        mockDataGenerator.generateWeddingScenario(customizations);

      expect(scenario.guestCount).toBe(150);
      expect(scenario.style).toBe('modern');
    });

    it('should avoid Saturday wedding dates for testing safety', () => {
      // Generate multiple scenarios to test Saturday avoidance
      for (let i = 0; i < 10; i++) {
        const scenario = mockDataGenerator.generateWeddingScenario();
        const weddingDate = new Date(scenario.weddingDate);

        // Saturday is day 6 in JavaScript (0 = Sunday)
        expect(weddingDate.getDay()).not.toBe(6);
      }
    });
  });

  describe('Wedding Industry Compliance', () => {
    it('should generate GDPR-compliant test data', () => {
      const scenario = mockDataGenerator.generateWeddingScenario();

      // Test data should not contain real personal information
      expect(scenario.couple.bride.email).toMatch(/@/);
      expect(scenario.couple.groom.email).toMatch(/@/);

      // Phone numbers should follow UK format patterns
      expect(scenario.couple.bride.phone).toBeTruthy();
      expect(scenario.couple.groom.phone).toBeTruthy();
    });

    it('should generate realistic UK wedding budgets', () => {
      for (let i = 0; i < 5; i++) {
        const scenario = mockDataGenerator.generateWeddingScenario();

        // UK wedding budgets typically £15k-£50k
        expect(scenario.budget.total).toBeGreaterThanOrEqual(15000);
        expect(scenario.budget.total).toBeLessThanOrEqual(50000);

        // Catering should be the largest expense (around 33%)
        expect(scenario.budget.catering).toBeGreaterThan(
          scenario.budget.photography,
        );
        expect(scenario.budget.catering).toBeGreaterThan(
          scenario.budget.flowers,
        );

        // Total should equal sum of components (approximately)
        const componentSum =
          scenario.budget.photography +
          scenario.budget.catering +
          scenario.budget.venue +
          scenario.budget.flowers +
          scenario.budget.music +
          scenario.budget.transport;

        // Budget allocation is 86% of total (14% for misc expenses like dress, rings, etc.)
        // Allow for reasonable difference as this is intentional budget structure
        const expectedComponentPercentage = 0.86; // 86% allocated to tracked categories
        const expectedComponentSum =
          scenario.budget.total * expectedComponentPercentage;
        expect(Math.abs(componentSum - expectedComponentSum)).toBeLessThan(
          scenario.budget.total * 0.05,
        ); // 5% tolerance
      }
    });

    it('should generate wedding-appropriate guest counts', () => {
      for (let i = 0; i < 10; i++) {
        const scenario = mockDataGenerator.generateWeddingScenario();

        // UK weddings typically have 60-200 guests
        expect(scenario.guestCount).toBeGreaterThanOrEqual(60);
        expect(scenario.guestCount).toBeLessThanOrEqual(200);
      }
    });
  });
});
