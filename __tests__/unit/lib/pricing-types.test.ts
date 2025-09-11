/**
 * WS-245 Wedding Budget Optimizer - Type System Unit Tests
 * Comprehensive tests for TypeScript pricing types and validation
 */

import { describe, test, expect } from '@jest/globals';
import {
  ServiceType,
  RegionCode,
  Currency,
  MarketSegment,
  PricingConfidence,
  PricingSource,
  PricingError,
  ValidationError,
  RateLimitError,
  ServiceUnavailableError,
  PRICING_CONSTANTS
} from '@/types/pricing';

describe('WS-245 Pricing Types - Unit Tests', () => {
  describe('Enum Types', () => {
    test('ServiceType enum should have all wedding service categories', () => {
      expect(ServiceType.VENUE).toBe('venue');
      expect(ServiceType.PHOTOGRAPHY).toBe('photography');
      expect(ServiceType.CATERING).toBe('catering');
      expect(ServiceType.FLOWERS).toBe('flowers');
      expect(ServiceType.ENTERTAINMENT).toBe('entertainment');
      expect(ServiceType.DRESS).toBe('dress');
      expect(ServiceType.CAKE).toBe('cake');
      expect(ServiceType.TRANSPORT).toBe('transport');
      expect(ServiceType.STATIONERY).toBe('stationery');
      expect(ServiceType.OTHER).toBe('other');

      // Verify all values are strings
      Object.values(ServiceType).forEach(value => {
        expect(typeof value).toBe('string');
      });
    });

    test('RegionCode enum should cover all UK regions', () => {
      expect(RegionCode.UK_LONDON).toBe('UK-LON');
      expect(RegionCode.UK_SOUTHEAST).toBe('UK-SE');
      expect(RegionCode.UK_SOUTHWEST).toBe('UK-SW');
      expect(RegionCode.UK_MIDLANDS).toBe('UK-MID');
      expect(RegionCode.UK_NORTH).toBe('UK-N');
      expect(RegionCode.UK_SCOTLAND).toBe('UK-SCT');
      expect(RegionCode.UK_WALES).toBe('UK-WAL');
      expect(RegionCode.UK_NI).toBe('UK-NI');

      // Verify all regions follow UK- prefix pattern
      Object.values(RegionCode).forEach(value => {
        expect(value).toMatch(/^UK-[A-Z]+$/);
      });
    });

    test('Currency enum should support major currencies', () => {
      expect(Currency.GBP).toBe('GBP');
      expect(Currency.EUR).toBe('EUR');
      expect(Currency.USD).toBe('USD');

      // Verify currency codes are 3 letters uppercase
      Object.values(Currency).forEach(value => {
        expect(value).toMatch(/^[A-Z]{3}$/);
      });
    });

    test('MarketSegment enum should cover pricing tiers', () => {
      expect(MarketSegment.BUDGET).toBe('budget');
      expect(MarketSegment.MID_RANGE).toBe('mid_range');
      expect(MarketSegment.PREMIUM).toBe('premium');
      expect(MarketSegment.LUXURY).toBe('luxury');

      // Verify logical ordering (alphabetical for consistency)
      const segments = Object.values(MarketSegment).sort();
      expect(segments).toEqual(['budget', 'luxury', 'mid_range', 'premium']);
    });

    test('PricingConfidence enum should indicate reliability levels', () => {
      expect(PricingConfidence.HIGH).toBe('high');
      expect(PricingConfidence.MEDIUM).toBe('medium');
      expect(PricingConfidence.LOW).toBe('low');
      expect(PricingConfidence.ESTIMATED).toBe('estimated');

      // Verify all values are descriptive strings
      Object.values(PricingConfidence).forEach(value => {
        expect(['high', 'medium', 'low', 'estimated']).toContain(value);
      });
    });

    test('PricingSource enum should cover all data sources', () => {
      expect(PricingSource.WEDDING_WIRE).toBe('wedding_wire');
      expect(PricingSource.THE_KNOT).toBe('the_knot');
      expect(PricingSource.ZOLA).toBe('zola');
      expect(PricingSource.DIRECT_VENDOR).toBe('direct_vendor');
      expect(PricingSource.MARKET_SURVEY).toBe('market_survey');
      expect(PricingSource.HISTORICAL_DATA).toBe('historical_data');

      // Verify all sources use snake_case naming
      Object.values(PricingSource).forEach(value => {
        expect(value).toMatch(/^[a-z_]+$/);
      });
    });
  });

  describe('Error Classes', () => {
    test('PricingError should be base error class', () => {
      const error = new PricingError('Test error', 'TEST_CODE', true);
      
      expect(error).toBeInstanceOf(Error);
      expect(error.name).toBe('PricingError');
      expect(error.message).toBe('Test error');
      expect(error.code).toBe('TEST_CODE');
      expect(error.retryable).toBe(true);
    });

    test('ValidationError should extend PricingError', () => {
      const error = new ValidationError('Invalid field', 'budgetRange');
      
      expect(error).toBeInstanceOf(PricingError);
      expect(error).toBeInstanceOf(ValidationError);
      expect(error.name).toBe('PricingError');
      expect(error.message).toBe('Invalid field');
      expect(error.code).toBe('VALIDATION_ERROR');
      expect(error.retryable).toBe(false);
      expect(error.field).toBe('budgetRange');
    });

    test('RateLimitError should include retry timing', () => {
      const error = new RateLimitError('Rate limit exceeded', 30000);
      
      expect(error).toBeInstanceOf(PricingError);
      expect(error).toBeInstanceOf(RateLimitError);
      expect(error.message).toBe('Rate limit exceeded');
      expect(error.code).toBe('RATE_LIMIT_EXCEEDED');
      expect(error.retryable).toBe(true);
      expect(error.retryAfter).toBe(30000);
    });

    test('ServiceUnavailableError should identify service', () => {
      const error = new ServiceUnavailableError('wedding_wire', 'Connection timeout');
      
      expect(error).toBeInstanceOf(PricingError);
      expect(error).toBeInstanceOf(ServiceUnavailableError);
      expect(error.message).toBe('Connection timeout');
      expect(error.code).toBe('SERVICE_UNAVAILABLE');
      expect(error.retryable).toBe(true);
    });

    test('ServiceUnavailableError should use default message', () => {
      const error = new ServiceUnavailableError('market_pricing');
      
      expect(error.message).toBe('Service market_pricing is unavailable');
    });
  });

  describe('Constants Validation', () => {
    test('PRICING_CONSTANTS should have sensible defaults', () => {
      expect(PRICING_CONSTANTS.DEFAULT_CACHE_TTL_MS).toBe(15 * 60 * 1000); // 15 minutes
      expect(PRICING_CONSTANTS.DEFAULT_TIMEOUT_MS).toBe(10 * 1000); // 10 seconds
      expect(PRICING_CONSTANTS.DEFAULT_RETRY_ATTEMPTS).toBe(3);
      expect(PRICING_CONSTANTS.DEFAULT_RETRY_DELAY_MS).toBe(1000);
      expect(PRICING_CONSTANTS.MAX_GUEST_COUNT).toBe(1000);
      expect(PRICING_CONSTANTS.MIN_GUEST_COUNT).toBe(1);
      expect(PRICING_CONSTANTS.MAX_BUDGET_AMOUNT).toBe(100000000); // £1M in pence
      expect(PRICING_CONSTANTS.MIN_BUDGET_AMOUNT).toBe(100000); // £1K in pence
    });

    test('PRICING_CONSTANTS should be readonly', () => {
      // TypeScript should prevent modification, but we can test runtime behavior
      expect(() => {
        // @ts-expect-error Testing readonly behavior
        PRICING_CONSTANTS.MAX_GUEST_COUNT = 2000;
      }).toThrow();
    });

    test('Budget amounts should be realistic for UK weddings', () => {
      const minBudgetPounds = PRICING_CONSTANTS.MIN_BUDGET_AMOUNT / 100;
      const maxBudgetPounds = PRICING_CONSTANTS.MAX_BUDGET_AMOUNT / 100;
      
      expect(minBudgetPounds).toBe(1000); // £1,000 minimum
      expect(maxBudgetPounds).toBe(1000000); // £1,000,000 maximum
      
      // Verify range is sensible
      expect(minBudgetPounds).toBeGreaterThan(0);
      expect(maxBudgetPounds).toBeGreaterThan(minBudgetPounds);
    });

    test('Timing constants should be production-ready', () => {
      // Cache TTL should not be too short (causing excessive API calls) or too long (stale data)
      expect(PRICING_CONSTANTS.DEFAULT_CACHE_TTL_MS).toBeGreaterThanOrEqual(5 * 60 * 1000); // At least 5 minutes
      expect(PRICING_CONSTANTS.DEFAULT_CACHE_TTL_MS).toBeLessThanOrEqual(60 * 60 * 1000); // At most 1 hour
      
      // Timeout should be reasonable for external API calls
      expect(PRICING_CONSTANTS.DEFAULT_TIMEOUT_MS).toBeGreaterThanOrEqual(5000); // At least 5 seconds
      expect(PRICING_CONSTANTS.DEFAULT_TIMEOUT_MS).toBeLessThanOrEqual(30000); // At most 30 seconds
      
      // Retry attempts should be modest to avoid overloading APIs
      expect(PRICING_CONSTANTS.DEFAULT_RETRY_ATTEMPTS).toBeGreaterThanOrEqual(1);
      expect(PRICING_CONSTANTS.DEFAULT_RETRY_ATTEMPTS).toBeLessThanOrEqual(5);
      
      // Retry delay should prevent rapid hammering
      expect(PRICING_CONSTANTS.DEFAULT_RETRY_DELAY_MS).toBeGreaterThanOrEqual(500);
      expect(PRICING_CONSTANTS.DEFAULT_RETRY_DELAY_MS).toBeLessThanOrEqual(5000);
    });
  });

  describe('Type Interface Validation', () => {
    test('ServiceType values should match wedding industry standards', () => {
      const expectedServices = [
        'venue', 'photography', 'catering', 'flowers', 'entertainment',
        'dress', 'cake', 'transport', 'stationery', 'other'
      ];
      
      const actualServices = Object.values(ServiceType).sort();
      expect(actualServices).toEqual(expectedServices.sort());
    });

    test('RegionCode values should cover UK geography comprehensively', () => {
      const regions = Object.values(RegionCode);
      
      // Should include major regions
      expect(regions).toContain('UK-LON'); // London
      expect(regions).toContain('UK-SE');  // Southeast
      expect(regions).toContain('UK-SW');  // Southwest
      expect(regions).toContain('UK-MID'); // Midlands
      expect(regions).toContain('UK-N');   // North
      expect(regions).toContain('UK-SCT'); // Scotland
      expect(regions).toContain('UK-WAL'); // Wales
      expect(regions).toContain('UK-NI');  // Northern Ireland
      
      // Should have comprehensive coverage
      expect(regions.length).toBeGreaterThanOrEqual(8);
    });

    test('MarketSegment values should represent price tiers logically', () => {
      const segments = Object.values(MarketSegment);
      
      // Should have logical progression from budget to luxury
      expect(segments).toContain('budget');
      expect(segments).toContain('mid_range');
      expect(segments).toContain('premium');
      expect(segments).toContain('luxury');
      
      // Should have reasonable number of tiers
      expect(segments.length).toBe(4);
    });

    test('PricingSource values should cover major wedding platforms', () => {
      const sources = Object.values(PricingSource);
      
      // Should include major wedding platforms
      expect(sources).toContain('wedding_wire');
      expect(sources).toContain('the_knot');
      expect(sources).toContain('zola');
      
      // Should include vendor sources
      expect(sources).toContain('direct_vendor');
      
      // Should include analytical sources
      expect(sources).toContain('market_survey');
      expect(sources).toContain('historical_data');
      
      // Should have comprehensive coverage
      expect(sources.length).toBeGreaterThanOrEqual(6);
    });
  });

  describe('Type Safety and Constraints', () => {
    test('Currency codes should follow ISO 4217 standard', () => {
      const currencies = Object.values(Currency);
      
      currencies.forEach(currency => {
        // ISO 4217 codes are 3 uppercase letters
        expect(currency).toMatch(/^[A-Z]{3}$/);
        
        // Should be recognized currency codes
        expect(['GBP', 'EUR', 'USD']).toContain(currency);
      });
    });

    test('RegionCode format should be consistent', () => {
      const regions = Object.values(RegionCode);
      
      regions.forEach(region => {
        // Should follow UK-XXX pattern
        expect(region).toMatch(/^UK-[A-Z]+$/);
        
        // Code part should be reasonable length
        const code = region.split('-')[1];
        expect(code.length).toBeGreaterThanOrEqual(1);
        expect(code.length).toBeLessThanOrEqual(4);
      });
    });

    test('ServiceType values should use consistent naming', () => {
      const services = Object.values(ServiceType);
      
      services.forEach(service => {
        // Should be lowercase
        expect(service).toBe(service.toLowerCase());
        
        // Should not contain spaces (use underscores if needed)
        expect(service).not.toMatch(/\s/);
        
        // Should be reasonable length
        expect(service.length).toBeGreaterThan(2);
        expect(service.length).toBeLessThan(20);
      });
    });

    test('Error codes should follow consistent format', () => {
      const error1 = new PricingError('Test', 'TEST_CODE', false);
      const error2 = new ValidationError('Invalid');
      const error3 = new RateLimitError('Limited', 1000);
      const error4 = new ServiceUnavailableError('service');
      
      [error1, error2, error3, error4].forEach(error => {
        // Error codes should be UPPER_CASE
        expect(error.code).toBe(error.code.toUpperCase());
        
        // Should use underscores for separation
        if (error.code.includes(' ')) {
          expect(error.code).toMatch(/^[A-Z_]+$/);
        }
        
        // Should be descriptive
        expect(error.code.length).toBeGreaterThan(5);
      });
    });
  });

  describe('Business Logic Validation', () => {
    test('Guest count limits should be realistic for weddings', () => {
      const minGuests = PRICING_CONSTANTS.MIN_GUEST_COUNT;
      const maxGuests = PRICING_CONSTANTS.MAX_GUEST_COUNT;
      
      // Minimum should accommodate intimate weddings
      expect(minGuests).toBe(1);
      
      // Maximum should accommodate large weddings but not be unrealistic
      expect(maxGuests).toBe(1000);
      expect(maxGuests).toBeGreaterThan(minGuests);
    });

    test('Budget limits should reflect UK wedding market', () => {
      const minBudget = PRICING_CONSTANTS.MIN_BUDGET_AMOUNT / 100; // Convert to pounds
      const maxBudget = PRICING_CONSTANTS.MAX_BUDGET_AMOUNT / 100; // Convert to pounds
      
      // Minimum should accommodate budget weddings
      expect(minBudget).toBe(1000); // £1,000
      
      // Maximum should accommodate luxury weddings
      expect(maxBudget).toBe(1000000); // £1,000,000
      
      // Range should be sensible
      expect(maxBudget / minBudget).toBe(1000); // 1000x range
    });

    test('Timeout and retry values should balance responsiveness with reliability', () => {
      const timeout = PRICING_CONSTANTS.DEFAULT_TIMEOUT_MS;
      const retries = PRICING_CONSTANTS.DEFAULT_RETRY_ATTEMPTS;
      const delay = PRICING_CONSTANTS.DEFAULT_RETRY_DELAY_MS;
      
      // Timeout should allow for slow API responses but not hang
      expect(timeout).toBeGreaterThanOrEqual(5000);
      expect(timeout).toBeLessThanOrEqual(30000);
      
      // Retries should be reasonable
      expect(retries).toBeGreaterThanOrEqual(1);
      expect(retries).toBeLessThanOrEqual(5);
      
      // Total possible wait time should be reasonable
      const maxWaitTime = timeout + (retries * delay * Math.pow(2, retries - 1)); // With exponential backoff
      expect(maxWaitTime).toBeLessThan(5 * 60 * 1000); // Should not exceed 5 minutes total
    });

    test('Cache settings should balance freshness with performance', () => {
      const cacheTtl = PRICING_CONSTANTS.DEFAULT_CACHE_TTL_MS;
      
      // Should not be too short (causing excessive API calls)
      expect(cacheTtl).toBeGreaterThanOrEqual(5 * 60 * 1000); // At least 5 minutes
      
      // Should not be too long (stale pricing data)
      expect(cacheTtl).toBeLessThanOrEqual(2 * 60 * 60 * 1000); // At most 2 hours
      
      // 15 minutes is a good default for pricing data
      expect(cacheTtl).toBe(15 * 60 * 1000);
    });
  });

  describe('Integration Compatibility', () => {
    test('ServiceType should align with wedding industry categories', () => {
      // Check that we cover major wedding expense categories
      const services = Object.values(ServiceType);
      
      // Major categories that should be present
      const majorCategories = ['venue', 'photography', 'catering', 'flowers'];
      majorCategories.forEach(category => {
        expect(services).toContain(category);
      });
      
      // Should have catch-all category
      expect(services).toContain('other');
    });

    test('RegionCode should map to actual UK regions', () => {
      const regionMappings = {
        'UK-LON': 'London',
        'UK-SE': 'Southeast',
        'UK-SW': 'Southwest',  
        'UK-MID': 'Midlands',
        'UK-N': 'North',
        'UK-SCT': 'Scotland',
        'UK-WAL': 'Wales',
        'UK-NI': 'Northern Ireland'
      };
      
      Object.keys(regionMappings).forEach(code => {
        expect(Object.values(RegionCode)).toContain(code as RegionCode);
      });
    });

    test('PricingSource should include major UK wedding platforms', () => {
      const sources = Object.values(PricingSource);
      
      // Should include international platforms popular in UK
      expect(sources).toContain('wedding_wire');
      expect(sources).toContain('the_knot');
      
      // Should support direct vendor integration
      expect(sources).toContain('direct_vendor');
      
      // Should support data analysis
      expect(sources).toContain('historical_data');
      expect(sources).toContain('market_survey');
    });

    test('Currency support should be appropriate for UK market', () => {
      const currencies = Object.values(Currency);
      
      // Primary currency should be GBP
      expect(currencies).toContain('GBP');
      
      // Should support major international currencies for comparison
      expect(currencies).toContain('EUR');
      expect(currencies).toContain('USD');
      
      // Should not be overwhelming number of currencies
      expect(currencies.length).toBeLessThanOrEqual(5);
    });
  });
});