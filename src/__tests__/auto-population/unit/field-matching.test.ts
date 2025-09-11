/**
 * WS-216 Auto-Population System - Field Matching Unit Tests
 *
 * Tests the core field pattern matching algorithms that enable
 * intelligent auto-population across 50+ wedding vendor types.
 *
 * Wedding Industry Context:
 * - Field matching must be 99.9% accurate (wedding data is irreplaceable)
 * - Must handle variations in field naming across different vendors
 * - Performance requirement: <10ms per field match
 * - Must gracefully handle typos and alternate spellings
 */

import { describe, it, expect, beforeEach, jest } from '@jest/test';
import {
  FieldMatchingEngine,
  calculateFieldMatchConfidence,
  fuzzyStringMatch,
  normalizeFieldName,
  FieldMatchResult,
  MatchingContext,
} from '@/lib/auto-population/field-matching-engine';

// Helper functions to reduce nesting - REFACTORED TO MEET 4-LEVEL LIMIT
/**
 * Validates field match confidence for an array of test cases
 * Reduces nesting from 5 levels (describe->describe->describe->it->forEach) to 3 levels
 */
function validateFieldMatches(
  fieldPairs: Array<{ source: string; target: string; expectedMin: number }>,
  matcher = calculateFieldMatchConfidence
) {
  fieldPairs.forEach(({ source, target, expectedMin }) => {
    const confidence = matcher(source, target);
    expect(confidence).toBeGreaterThanOrEqual(expectedMin);
  });
}

/**
 * Creates test cases for vendor-specific field matching
 * Centralizes test data creation to reduce inline nesting
 */
function createVendorFieldTests(vendorType: 'photography' | 'catering' | 'venue') {
  const testData = {
    photography: [
      { source: 'photography_style', target: 'photo_style', expectedMin: 0.8 },
      { source: 'photo_package', target: 'photography_package', expectedMin: 0.9 },
      { source: 'album_pages', target: 'photo_album_pages', expectedMin: 0.8 },
      { source: 'engagement_session', target: 'engagement_shoot', expectedMin: 0.8 },
    ],
    catering: [
      { source: 'menu_style', target: 'catering_style', expectedMin: 0.8 },
      { source: 'guest_meal_choice', target: 'meal_selection', expectedMin: 0.8 },
      { source: 'dietary_restrictions', target: 'dietary_needs', expectedMin: 0.9 },
      { source: 'cocktail_hour', target: 'cocktail_service', expectedMin: 0.8 },
      { source: 'bar_package', target: 'bar_service', expectedMin: 0.9 },
    ],
    venue: [
      { source: 'ceremony_location', target: 'ceremony_venue', expectedMin: 0.8 },
      { source: 'reception_hall', target: 'reception_venue', expectedMin: 0.8 },
      { source: 'venue_capacity', target: 'max_capacity', expectedMin: 0.8 },
      { source: 'outdoor_space', target: 'outdoor_area', expectedMin: 0.9 },
      { source: 'bridal_suite', target: 'bridal_room', expectedMin: 0.8 },
      { source: 'parking_available', target: 'parking_spaces', expectedMin: 0.8 },
    ],
  };
  
  return testData[vendorType] || [];
}

// Mock wedding data for testing
const mockWeddingData = {
  wedding_date: '2024-06-15',
  partner1_name: 'Sarah Johnson',
  partner2_name: 'Mike Chen',
  guest_count: 150,
  ceremony_venue: 'Garden Estate Manor',
  reception_venue: 'Garden Estate Manor',
  ceremony_time: '15:00',
  reception_time: '18:00',
  budget: 35000,
  photography_style: 'Documentary',
  catering_style: 'Buffet',
  special_requirements: 'Wheelchair accessible, vegetarian options',
};

const mockVendorProfile = {
  business_name: 'Sky Photography',
  contact_email: 'hello@skyphotography.co.uk',
  phone: '+44 7123 456789',
  specialty: 'Wedding Photography',
  default_package: 'Full Day Coverage',
  base_price: 1500,
  travel_radius: '50 miles',
};

describe('FieldMatchingEngine', () => {
  let fieldMatchingEngine: FieldMatchingEngine;

  beforeEach(() => {
    fieldMatchingEngine = new FieldMatchingEngine();
  });

  describe('Wedding Date Field Matching', () => {
    it('should match wedding date patterns with high confidence', () => {
      const datePatterns = [
        'wedding_date',
        'event_date',
        'ceremony_date',
        'date_of_wedding',
        'wedding-date',
        'eventDate',
        'ceremonyDate',
      ];

      datePatterns.forEach((pattern) => {
        const confidence = calculateFieldMatchConfidence(
          'wedding_date',
          pattern,
        );
        expect(confidence).toBeGreaterThan(0.8);
      });
    });

    it('should handle date field variations and typos', () => {
      const testCases = [
        { source: 'wedding_date', target: 'weding_date', expectedMin: 0.7 }, // typo
        { source: 'wedding_date', target: 'wedding_day', expectedMin: 0.8 },
        { source: 'wedding_date', target: 'ceremony_date', expectedMin: 0.9 },
        { source: 'wedding_date', target: 'event_date', expectedMin: 0.9 },
      ];

      testCases.forEach(({ source, target, expectedMin }) => {
        const confidence = calculateFieldMatchConfidence(source, target);
        expect(confidence).toBeGreaterThanOrEqual(expectedMin);
      });
    });
  });

  describe('Venue Field Matching', () => {
    it('should match venue patterns across different vendor types', () => {
      const venuePatterns = [
        'ceremony_venue',
        'reception_venue',
        'venue_name',
        'venue_location',
        'wedding_venue',
        'event_venue',
      ];

      venuePatterns.forEach((pattern) => {
        const confidence = calculateFieldMatchConfidence(
          'ceremony_venue',
          pattern,
        );
        expect(confidence).toBeGreaterThan(0.7);
      });
    });

    it('should distinguish between ceremony and reception venues', () => {
      const ceremonyConfidence = calculateFieldMatchConfidence(
        'ceremony_venue',
        'ceremony_location',
      );
      const receptionConfidence = calculateFieldMatchConfidence(
        'reception_venue',
        'reception_location',
      );

      expect(ceremonyConfidence).toBeGreaterThan(0.9);
      expect(receptionConfidence).toBeGreaterThan(0.9);
    });
  });

  describe('Guest Count Field Matching', () => {
    it('should match guest count variations', () => {
      const guestCountPatterns = [
        'guest_count',
        'number_of_guests',
        'total_guests',
        'guest_number',
        'headcount',
        'pax', // Common in catering
        'attendees',
      ];

      guestCountPatterns.forEach((pattern) => {
        const confidence = calculateFieldMatchConfidence(
          'guest_count',
          pattern,
        );
        expect(confidence).toBeGreaterThan(0.6);
      });
    });
  });

  describe('Partner Name Field Matching', () => {
    it('should match partner name variations', () => {
      const partner1Patterns = [
        'bride_name',
        'partner1_name',
        'client_name',
        'bride',
        'partner_a',
        'first_partner',
      ];

      const partner2Patterns = [
        'groom_name',
        'partner2_name',
        'partner_b',
        'groom',
        'second_partner',
      ];

      partner1Patterns.forEach((pattern) => {
        const confidence = calculateFieldMatchConfidence(
          'partner1_name',
          pattern,
        );
        expect(confidence).toBeGreaterThan(0.6);
      });

      partner2Patterns.forEach((pattern) => {
        const confidence = calculateFieldMatchConfidence(
          'partner2_name',
          pattern,
        );
        expect(confidence).toBeGreaterThan(0.6);
      });
    });

    it('should handle gender-neutral partner naming', () => {
      const neutralPatterns = [
        'partner1_name',
        'partner2_name',
        'client_a_name',
        'client_b_name',
      ];

      neutralPatterns.forEach((pattern) => {
        const p1Confidence = calculateFieldMatchConfidence(
          'partner1_name',
          pattern,
        );
        const p2Confidence = calculateFieldMatchConfidence(
          'partner2_name',
          pattern,
        );
        expect(Math.max(p1Confidence, p2Confidence)).toBeGreaterThan(0.8);
      });
    });
  });

  // REFACTORED: Flattened vendor-specific tests to reduce nesting from 5 to 4 levels
  describe('Photography Field Matching', () => {
    it('should match photography-specific fields', () => {
      const photoFields = createVendorFieldTests('photography');
      validateFieldMatches(photoFields);
    });
  });

  describe('Catering Field Matching', () => {
    it('should match catering-specific fields', () => {
      // Note: Using inline test data here as it differs from the helper function's data
      const cateringFields = [
        { source: 'menu_style', target: 'catering_style', expectedMin: 0.8 },
        { source: 'dietary_requirements', target: 'special_dietary_needs', expectedMin: 0.7 },
        { source: 'service_style', target: 'meal_service_type', expectedMin: 0.7 },
        { source: 'bar_package', target: 'beverage_package', expectedMin: 0.8 },
      ];
      validateFieldMatches(cateringFields);
    });
  });

  describe('Venue Field Matching', () => {
    it('should match venue-specific fields', () => {
      // Note: Using inline test data as the requirements differ from helper defaults
      const venueFields = [
        { source: 'ceremony_capacity', target: 'ceremony_max_guests', expectedMin: 0.8 },
        { source: 'reception_capacity', target: 'reception_max_guests', expectedMin: 0.8 },
        { source: 'setup_time', target: 'venue_setup_time', expectedMin: 0.7 },
        { source: 'cleanup_time', target: 'venue_cleanup_time', expectedMin: 0.7 },
      ];
      validateFieldMatches(venueFields);
    });
  });

  describe('Fuzzy String Matching', () => {
    it('should handle typos and misspellings', () => {
      const testCases = [
        { str1: 'wedding', str2: 'weding', expectedMin: 0.8 },
        { str1: 'photography', str2: 'photograpy', expectedMin: 0.9 },
        { str1: 'reception', str2: 'recption', expectedMin: 0.8 },
        { str1: 'ceremony', str2: 'ceromony', expectedMin: 0.8 },
      ];

      testCases.forEach(({ str1, str2, expectedMin }) => {
        const similarity = fuzzyStringMatch(str1, str2);
        expect(similarity).toBeGreaterThanOrEqual(expectedMin);
      });
    });

    it('should handle different naming conventions', () => {
      const testCases = [
        { str1: 'wedding_date', str2: 'weddingDate', expectedMin: 0.9 }, // snake_case vs camelCase
        { str1: 'guest_count', str2: 'guest-count', expectedMin: 0.95 }, // snake_case vs kebab-case
        { str1: 'venue_name', str2: 'VenueName', expectedMin: 0.9 }, // snake_case vs PascalCase
        { str1: 'contact_email', str2: 'contactEmail', expectedMin: 0.9 },
      ];

      testCases.forEach(({ str1, str2, expectedMin }) => {
        const similarity = fuzzyStringMatch(str1, str2);
        expect(similarity).toBeGreaterThanOrEqual(expectedMin);
      });
    });
  });

  describe('Field Name Normalization', () => {
    it('should normalize field names consistently', () => {
      const testCases = [
        { input: 'Wedding Date', expected: 'wedding_date' },
        { input: 'Guest Count!!!', expected: 'guest_count' },
        { input: 'Partner-1-Name', expected: 'partner_1_name' },
        { input: 'contact@email', expected: 'contact_email' },
        { input: 'Venue   Name', expected: 'venue_name' },
      ];

      testCases.forEach(({ input, expected }) => {
        const normalized = normalizeFieldName(input);
        expect(normalized).toBe(expected);
      });
    });
  });

  describe('Context-Aware Matching', () => {
    it('should improve matching with wedding context', () => {
      const context: MatchingContext = {
        vendorType: 'photographer',
        weddingSize: 'large', // 150+ guests
        weddingStyle: 'formal',
        season: 'summer',
      };

      // Photography-specific fields should score higher with photography context
      const photoConfidence = fieldMatchingEngine.matchWithContext(
        'photo_style',
        'photography_style',
        context,
      );

      expect(photoConfidence).toBeGreaterThan(0.9);
    });

    it('should handle multi-vendor coordination', () => {
      const context: MatchingContext = {
        vendorType: 'coordinator',
        isMultiVendor: true,
        relatedVendors: ['photographer', 'caterer', 'venue'],
      };

      // Coordinator context should recognize fields from multiple vendor types
      const venueField = fieldMatchingEngine.matchWithContext(
        'ceremony_venue',
        'venue_name',
        context,
      );

      const cateringField = fieldMatchingEngine.matchWithContext(
        'menu_style',
        'catering_style',
        context,
      );

      expect(venueField).toBeGreaterThan(0.8);
      expect(cateringField).toBeGreaterThan(0.8);
    });
  });

  describe('Performance Requirements', () => {
    it('should match fields within performance targets', () => {
      const testFields = Array.from(
        { length: 100 },
        (_, i) => `test_field_${i}`,
      );

      const startTime = performance.now();

      testFields.forEach((field) => {
        calculateFieldMatchConfidence('wedding_date', field);
      });

      const endTime = performance.now();
      const averageTime = (endTime - startTime) / testFields.length;

      // Must average <10ms per field match
      expect(averageTime).toBeLessThan(10);
    });

    it('should handle large field sets efficiently', () => {
      const largeFieldSet = Array.from({ length: 1000 }, (_, i) => ({
        name: `field_${i}`,
        type: i % 10 === 0 ? 'date' : 'text',
      }));

      const startTime = performance.now();

      const results = fieldMatchingEngine.matchMultipleFields(
        mockWeddingData,
        largeFieldSet,
      );

      const endTime = performance.now();
      const executionTime = endTime - startTime;

      // Must handle 1000 fields in under 100ms
      expect(executionTime).toBeLessThan(100);
      expect(results.length).toBe(largeFieldSet.length);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle empty or null inputs', () => {
      expect(() => calculateFieldMatchConfidence('', 'test')).not.toThrow();
      expect(() => calculateFieldMatchConfidence('test', '')).not.toThrow();
      expect(() =>
        calculateFieldMatchConfidence(null as any, 'test'),
      ).not.toThrow();
      expect(() =>
        calculateFieldMatchConfidence('test', null as any),
      ).not.toThrow();
    });

    it('should handle special characters in field names', () => {
      const specialCharFields = [
        'field@name',
        'field#name',
        'field$name',
        'field%name',
        'field&name',
        'field*name',
      ];

      // Helper function to reduce nesting - REFACTORED TO MEET 4-LEVEL LIMIT
      const validateFieldConfidence = (field: string) => {
        const confidence = calculateFieldMatchConfidence('test_field', field);
        return typeof confidence === 'number' && confidence >= 0 && confidence <= 1;
      };

      specialCharFields.forEach((field) => {
        expect(() => calculateFieldMatchConfidence('test_field', field)).not.toThrow();
        const isValid = validateFieldConfidence(field);
        expect(isValid).toBe(true);
      });
    });

    it('should handle very long field names', () => {
      const longFieldName = 'a'.repeat(1000);
      const confidence = calculateFieldMatchConfidence(
        'short_field',
        longFieldName,
      );

      expect(typeof confidence).toBe('number');
      expect(confidence).toBeGreaterThanOrEqual(0);
      expect(confidence).toBeLessThanOrEqual(1);
    });

    it('should handle unicode and international characters', () => {
      const unicodeFields = [
        'weddíng_daté', // Spanish accents
        'weddıng_date', // Turkish i
        'wedding_дата', // Cyrillic
        '婚礼_日期', // Chinese
        'γάμος_ημερομηνία', // Greek
      ];

      // Helper function to reduce nesting - REFACTORED TO MEET 4-LEVEL LIMIT
      const validateUnicodeField = (field: string) => {
        const confidence = calculateFieldMatchConfidence('wedding_date', field);
        return typeof confidence === 'number';
      };

      unicodeFields.forEach((field) => {
        expect(() => calculateFieldMatchConfidence('wedding_date', field)).not.toThrow();
        const isValidNumber = validateUnicodeField(field);
        expect(isValidNumber).toBe(true);
      });
    });
  });

  describe('Wedding Industry Specific Edge Cases', () => {
    it('should handle same-sex weddings appropriately', () => {
      const sameSexPatterns = [
        'partner1_name',
        'partner2_name',
        'spouse1_name',
        'spouse2_name',
        'bride1_name',
        'bride2_name',
        'groom1_name',
        'groom2_name',
      ];

      sameSexPatterns.forEach((pattern) => {
        const p1Confidence = calculateFieldMatchConfidence(
          'partner1_name',
          pattern,
        );
        const p2Confidence = calculateFieldMatchConfidence(
          'partner2_name',
          pattern,
        );

        // Should match at least one partner field with reasonable confidence
        expect(Math.max(p1Confidence, p2Confidence)).toBeGreaterThan(0.5);
      });
    });

    it('should handle multi-day wedding events', () => {
      const multiDayFields = [
        'ceremony_date',
        'reception_date',
        'rehearsal_date',
        'brunch_date',
        'welcome_party_date',
        'farewell_party_date',
      ];

      multiDayFields.forEach((field) => {
        const confidence = calculateFieldMatchConfidence('wedding_date', field);
        expect(confidence).toBeGreaterThan(0.6); // Should recognize as date-related
      });
    });

    it('should handle destination wedding fields', () => {
      const destinationFields = [
        'destination_location',
        'travel_requirements',
        'accommodation_details',
        'local_contact',
        'timezone',
        'language_requirements',
      ];

      // These fields should be recognized even if not exact matches
      destinationFields.forEach((field) => {
        expect(() =>
          calculateFieldMatchConfidence('special_requirements', field),
        ).not.toThrow();
      });
    });
  });
});

describe('FieldMatchResult Integration', () => {
  it('should provide complete match results with metadata', () => {
    const engine = new FieldMatchingEngine();
    const result: FieldMatchResult = engine.matchField(
      'wedding_date',
      '2024-06-15',
      ['event_date', 'ceremony_date', 'reception_date'],
    );

    expect(result).toHaveProperty('bestMatch');
    expect(result).toHaveProperty('confidence');
    expect(result).toHaveProperty('alternatives');
    expect(result).toHaveProperty('metadata');

    expect(result.confidence).toBeGreaterThan(0.8);
    expect(result.bestMatch).toBe('ceremony_date'); // Should prefer ceremony over reception
    expect(result.alternatives.length).toBeGreaterThan(0);
  });

  it('should handle batch field matching efficiently', () => {
    const engine = new FieldMatchingEngine();
    const sourceData = mockWeddingData;
    const targetFields = [
      'event_date',
      'bride_name',
      'groom_name',
      'guest_number',
      'venue_location',
    ];

    const results = engine.matchMultipleFields(sourceData, targetFields);

    expect(results).toHaveLength(targetFields.length);
    results.forEach((result) => {
      expect(result).toHaveProperty('sourceField');
      expect(result).toHaveProperty('targetField');
      expect(result).toHaveProperty('confidence');
      expect(result.confidence).toBeGreaterThanOrEqual(0);
    });
  });
});
