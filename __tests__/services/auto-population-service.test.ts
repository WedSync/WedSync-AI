import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { autoPopulationService } from '@/lib/services/auto-population-service';
import type { FormField } from '@/types/auto-population';

// Mock Supabase
const mockSupabase = {
  from: jest.fn(() => ({
    select: jest.fn(() => ({
      eq: jest.fn(() => ({
        single: jest.fn(),
        limit: jest.fn(() => ({
          single: jest.fn()
        }))
      })),
      insert: jest.fn(() => ({
        select: jest.fn(() => ({
          single: jest.fn()
        }))
      })),
      upsert: jest.fn(() => ({
        select: jest.fn()
      })),
      update: jest.fn(() => ({
        eq: jest.fn()
      }))
    }))
  }))
};

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => mockSupabase)
}));

describe('AutoPopulationService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Field Matching Algorithms', () => {
    describe('Levenshtein Distance', () => {
      it('should calculate distance between identical strings', () => {
        // Access private method for testing
        const service = autoPopulationService as any;
        const distance = service.levenshteinDistance('wedding', 'wedding');
        expect(distance).toBe(0);
      });

      it('should calculate distance between different strings', () => {
        const service = autoPopulationService as any;
        const distance = service.levenshteinDistance('bride', 'groom');
        expect(distance).toBe(5); // Complete replacement
      });

      it('should calculate distance for similar strings', () => {
        const service = autoPopulationService as any;
        const distance = service.levenshteinDistance('wedding_date', 'weding_date');
        expect(distance).toBe(1); // One character difference
      });
    });

    describe('String Similarity', () => {
      it('should return 1.0 for identical strings', () => {
        const service = autoPopulationService as any;
        const similarity = service.stringSimilarity('bride_name', 'bride_name');
        expect(similarity).toBe(1.0);
      });

      it('should return high similarity for similar strings', () => {
        const service = autoPopulationService as any;
        const similarity = service.stringSimilarity('wedding_date', 'wedding_dt');
        expect(similarity).toBeGreaterThan(0.8);
      });

      it('should return low similarity for different strings', () => {
        const service = autoPopulationService as any;
        const similarity = service.stringSimilarity('bride_name', 'venue_address');
        expect(similarity).toBeLessThan(0.5);
      });
    });

    describe('Field Name Normalization', () => {
      it('should normalize field names consistently', () => {
        const service = autoPopulationService as any;
        expect(service.normalizeFieldName('Bride_Name')).toBe('bridename');
        expect(service.normalizeFieldName('bride-name')).toBe('bridename');
        expect(service.normalizeFieldName('Bride Name')).toBe('bridename');
        expect(service.normalizeFieldName('  BRIDE_NAME  ')).toBe('bridename');
      });
    });

    describe('Exact Matching', () => {
      it('should detect exact matches', () => {
        const service = autoPopulationService as any;
        const score = service.exactMatch('wedding_date', 'wedding_date');
        expect(score).toBe(1.0);
      });

      it('should detect exact matches after normalization', () => {
        const service = autoPopulationService as any;
        const score = service.exactMatch('Wedding-Date', 'wedding_date');
        expect(score).toBe(1.0);
      });

      it('should return 0 for non-matches', () => {
        const service = autoPopulationService as any;
        const score = service.exactMatch('bride_name', 'groom_name');
        expect(score).toBe(0);
      });
    });

    describe('Synonym Matching', () => {
      it('should match known synonyms', () => {
        const service = autoPopulationService as any;
        const score = service.synonymMatch('event_date', 'wedding_date');
        expect(score).toBe(0.8);
      });

      it('should match bride/partner1 synonyms', () => {
        const service = autoPopulationService as any;
        const score = service.synonymMatch('bride_name', 'couple_name_1');
        expect(score).toBe(0.8);
      });

      it('should match guest count synonyms', () => {
        const service = autoPopulationService as any;
        const score = service.synonymMatch('headcount', 'guest_count');
        expect(score).toBe(0.8);
      });

      it('should return 0 for non-synonyms', () => {
        const service = autoPopulationService as any;
        const score = service.synonymMatch('random_field', 'wedding_date');
        expect(score).toBe(0);
      });
    });

    describe('Pattern Matching', () => {
      it('should match date patterns', () => {
        const service = autoPopulationService as any;
        const score = service.patternMatch('ceremony_date', 'wedding_date');
        expect(score).toBe(0.6);
      });

      it('should match name patterns', () => {
        const service = autoPopulationService as any;
        const score = service.patternMatch('client_name', 'couple_name_1');
        expect(score).toBe(0.6);
      });

      it('should match email patterns', () => {
        const service = autoPopulationService as any;
        const score = service.patternMatch('email_address', 'contact_email');
        expect(score).toBe(0.6);
      });

      it('should return 0 for non-matching patterns', () => {
        const service = autoPopulationService as any;
        const score = service.patternMatch('random_field', 'wedding_date');
        expect(score).toBe(0);
      });
    });

    describe('Comprehensive Confidence Calculation', () => {
      it('should prioritize exact matches', () => {
        const service = autoPopulationService as any;
        const confidence = service.calculateConfidence('wedding_date', 'wedding_date');
        expect(confidence).toBeGreaterThanOrEqual(0.9);
      });

      it('should score synonym matches highly', () => {
        const service = autoPopulationService as any;
        const confidence = service.calculateConfidence('event_date', 'wedding_date');
        expect(confidence).toBeGreaterThanOrEqual(0.7);
      });

      it('should apply contextual factors', () => {
        const service = autoPopulationService as any;
        const confidence = service.calculateConfidence(
          'ceremony_date',
          'wedding_date',
          {
            contextMatchScore: 0.9,
            historicalAccuracy: 0.8,
            userFeedbackScore: 0.7
          }
        );
        expect(confidence).toBeGreaterThan(0.6);
      });

      it('should filter low confidence matches', () => {
        const service = autoPopulationService as any;
        const confidence = service.calculateConfidence('random_field', 'wedding_date');
        expect(confidence).toBeLessThan(0.5);
      });
    });
  });

  describe('Data Transformation', () => {
    describe('Date Transformation', () => {
      it('should transform valid date strings to ISO format', () => {
        const service = autoPopulationService as any;
        expect(service.transformDate('2024-06-15')).toBe('2024-06-15');
        expect(service.transformDate('06/15/2024')).toBe('2024-06-15');
        expect(service.transformDate('June 15, 2024')).toBe('2024-06-15');
      });

      it('should return null for invalid dates', () => {
        const service = autoPopulationService as any;
        expect(service.transformDate('invalid-date')).toBe(null);
        expect(service.transformDate('')).toBe(null);
        expect(service.transformDate(null)).toBe(null);
      });
    });

    describe('Phone Transformation', () => {
      it('should format US phone numbers consistently', () => {
        const service = autoPopulationService as any;
        expect(service.transformPhone('1234567890')).toBe('(123) 456-7890');
        expect(service.transformPhone('11234567890')).toBe('(123) 456-7890');
        expect(service.transformPhone('(123) 456-7890')).toBe('(123) 456-7890');
        expect(service.transformPhone('123-456-7890')).toBe('(123) 456-7890');
      });

      it('should preserve international numbers', () => {
        const service = autoPopulationService as any;
        const intlNumber = '+44 20 7946 0958';
        expect(service.transformPhone(intlNumber)).toBe('+442079460958');
      });

      it('should return null for invalid phone numbers', () => {
        const service = autoPopulationService as any;
        expect(service.transformPhone('123')).toBe(null);
        expect(service.transformPhone('abc')).toBe(null);
        expect(service.transformPhone('')).toBe(null);
      });
    });

    describe('Email Transformation', () => {
      it('should normalize email addresses', () => {
        const service = autoPopulationService as any;
        expect(service.transformEmail('TEST@EXAMPLE.COM')).toBe('test@example.com');
        expect(service.transformEmail('  user@domain.com  ')).toBe('user@domain.com');
      });

      it('should return null for invalid emails', () => {
        const service = autoPopulationService as any;
        expect(service.transformEmail('invalid-email')).toBe(null);
        expect(service.transformEmail('user@')).toBe(null);
        expect(service.transformEmail('@domain.com')).toBe(null);
      });
    });

    describe('Number Transformation', () => {
      it('should parse valid numbers', () => {
        const service = autoPopulationService as any;
        expect(service.transformNumber('100')).toBe(100);
        expect(service.transformNumber('$1,500.50')).toBe(1500.5);
        expect(service.transformNumber('2,000')).toBe(2000);
      });

      it('should return null for invalid numbers', () => {
        const service = autoPopulationService as any;
        expect(service.transformNumber('not-a-number')).toBe(null);
        expect(service.transformNumber('')).toBe(null);
        expect(service.transformNumber('$')).toBe(null);
      });
    });

    describe('Text Transformation', () => {
      it('should clean and trim text', () => {
        const service = autoPopulationService as any;
        expect(service.transformText('  Sarah Johnson  ')).toBe('Sarah Johnson');
        expect(service.transformText('\n\tSarah\n')).toBe('Sarah');
      });

      it('should return null for empty text', () => {
        const service = autoPopulationService as any;
        expect(service.transformText('')).toBe(null);
        expect(service.transformText('   ')).toBe(null);
        expect(service.transformText(null)).toBe(null);
      });
    });
  });

  describe('Auto-Detection Integration', () => {
    it('should auto-detect mappings for typical wedding form fields', async () => {
      const mockFormFields: FormField[] = [
        {
          id: 'field-1',
          name: 'bride_name',
          type: 'text',
          label: 'Bride Name',
          required: true
        },
        {
          id: 'field-2',
          name: 'groom_name',
          type: 'text',
          label: 'Groom Name',
          required: true
        },
        {
          id: 'field-3',
          name: 'wedding_date',
          type: 'date',
          label: 'Wedding Date',
          required: true
        },
        {
          id: 'field-4',
          name: 'guest_count',
          type: 'number',
          label: 'Number of Guests',
          required: false
        },
        {
          id: 'field-5',
          name: 'contact_email',
          type: 'email',
          label: 'Contact Email',
          required: true
        }
      ];

      const mappings = await autoPopulationService.autoDetectMappings('form-123', mockFormFields);

      expect(mappings).toHaveLength(5);
      
      // Check that each field was mapped correctly
      const brideMapping = mappings.find(m => m.form_field_id === 'field-1');
      expect(brideMapping?.core_field_key).toBe('couple_name_1');
      expect(brideMapping?.confidence).toBeGreaterThan(0.7);

      const groomMapping = mappings.find(m => m.form_field_id === 'field-2');
      expect(groomMapping?.core_field_key).toBe('couple_name_2');
      expect(groomMapping?.confidence).toBeGreaterThan(0.7);

      const dateMapping = mappings.find(m => m.form_field_id === 'field-3');
      expect(dateMapping?.core_field_key).toBe('wedding_date');
      expect(dateMapping?.confidence).toBeGreaterThan(0.8);

      const guestMapping = mappings.find(m => m.form_field_id === 'field-4');
      expect(guestMapping?.core_field_key).toBe('guest_count');
      expect(guestMapping?.confidence).toBeGreaterThan(0.8);

      const emailMapping = mappings.find(m => m.form_field_id === 'field-5');
      expect(emailMapping?.core_field_key).toBe('contact_email');
      expect(emailMapping?.confidence).toBeGreaterThan(0.8);
    });

    it('should handle ambiguous field names gracefully', async () => {
      const ambiguousFields: FormField[] = [
        {
          id: 'field-1',
          name: 'name',
          type: 'text',
          label: 'Name',
          required: true
        },
        {
          id: 'field-2',
          name: 'date',
          type: 'date',
          label: 'Date',
          required: true
        }
      ];

      const mappings = await autoPopulationService.autoDetectMappings('form-123', ambiguousFields);

      // Should still map but with lower confidence
      expect(mappings.length).toBeGreaterThan(0);
      mappings.forEach(mapping => {
        expect(mapping.confidence).toBeGreaterThanOrEqual(0.5); // Above minimum threshold
      });
    });

    it('should filter out low confidence mappings', async () => {
      const randomFields: FormField[] = [
        {
          id: 'field-1',
          name: 'random_field_xyz',
          type: 'text',
          label: 'Random Field XYZ',
          required: false
        },
        {
          id: 'field-2',
          name: 'another_random_field',
          type: 'text',
          label: 'Another Random Field',
          required: false
        }
      ];

      const mappings = await autoPopulationService.autoDetectMappings('form-123', randomFields);

      // Should filter out fields that don't match any core fields
      mappings.forEach(mapping => {
        expect(mapping.confidence).toBeGreaterThanOrEqual(0.5);
      });
    });

    it('should assign priorities correctly', async () => {
      const priorityFields: FormField[] = [
        {
          id: 'field-1',
          name: 'wedding_date',
          type: 'date',
          label: 'Wedding Date',
          required: true
        },
        {
          id: 'field-2',
          name: 'couple_name',
          type: 'text',
          label: 'Couple Name',
          required: true
        }
      ];

      const mappings = await autoPopulationService.autoDetectMappings('form-123', priorityFields);

      // Priorities should be assigned in order
      expect(mappings[0].priority).toBe(1);
      if (mappings.length > 1) {
        expect(mappings[1].priority).toBe(2);
      }

      // Priorities should be unique
      const priorities = mappings.map(m => m.priority);
      const uniquePriorities = [...new Set(priorities)];
      expect(uniquePriorities).toHaveLength(priorities.length);
    });
  });

  describe('Wedding Data Management', () => {
    it('should create wedding data when none exists', async () => {
      const mockInsert = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: { id: 'wedding-123', couple_id: 'couple-123' },
            error: null
          })
        })
      });

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: { code: 'PGRST116' } // Not found
            })
          })
        }),
        insert: mockInsert
      });

      const result = await autoPopulationService.getOrCreateWeddingData('couple-123');

      expect(result).toBeTruthy();
      expect(mockInsert).toHaveBeenCalled();
    });

    it('should return existing wedding data when available', async () => {
      const existingData = { id: 'wedding-123', couple_id: 'couple-123' };

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: existingData,
              error: null
            })
          })
        })
      });

      const result = await autoPopulationService.getOrCreateWeddingData('couple-123');

      expect(result).toBe(existingData);
    });
  });

  describe('Vendor Access Control', () => {
    it('should grant full access for active client relationships', async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: { id: 'client-123', organization_id: 'org-123' },
                  error: null
                })
              })
            })
          })
        })
      });

      const access = await autoPopulationService.checkVendorAccess('org-123', 'wedding-123');

      expect(access.canRead).toBe(true);
      expect(access.canWrite).toBe(true);
      expect(access.accessLevel).toBe('full');
    });

    it('should deny access when no client relationship exists', async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: null,
                  error: { code: 'PGRST116' }
                })
              })
            })
          })
        })
      });

      const access = await autoPopulationService.checkVendorAccess('org-123', 'wedding-123');

      expect(access.canRead).toBe(false);
      expect(access.canWrite).toBe(false);
      expect(access.accessLevel).toBe('none');
    });
  });

  describe('Session Management', () => {
    it('should create population sessions with proper expiry', async () => {
      const sessionId = 'session-123';
      
      // Mock crypto.randomUUID
      Object.defineProperty(global, 'crypto', {
        value: {
          randomUUID: () => sessionId
        },
        writable: true
      });

      mockSupabase.from.mockReturnValue({
        insert: jest.fn().mockResolvedValue({
          error: null
        })
      });

      const result = await autoPopulationService.createPopulationSession(
        'couple-123',
        'supplier-123',
        'form-123',
        { field1: { value: 'test', confidence: 0.9, source: 'existing', coreFieldKey: 'test' } }
      );

      expect(result).toBe(sessionId);
    });

    it('should retrieve population sessions by ID', async () => {
      const sessionData = {
        id: 'session-123',
        couple_id: 'couple-123',
        populated_fields: {}
      };

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: sessionData,
              error: null
            })
          })
        })
      });

      const result = await autoPopulationService.getPopulationSession('session-123');

      expect(result).toBe(sessionData);
    });
  });

  describe('Performance Tests', () => {
    it('should process large forms efficiently', async () => {
      const largeFormFields = Array(100).fill(0).map((_, i) => ({
        id: `field-${i}`,
        name: `field_${i}`,
        type: 'text' as const,
        label: `Field ${i}`,
        required: false
      }));

      const startTime = Date.now();
      
      const mappings = await autoPopulationService.autoDetectMappings('form-123', largeFormFields);
      
      const endTime = Date.now();
      const processingTime = endTime - startTime;

      expect(processingTime).toBeLessThan(1000); // Should complete in <1 second
      expect(Array.isArray(mappings)).toBe(true);
    });

    it('should handle concurrent auto-detection requests', async () => {
      const formFields: FormField[] = [
        {
          id: 'field-1',
          name: 'wedding_date',
          type: 'date',
          label: 'Wedding Date',
          required: true
        }
      ];

      const promises = Array(5).fill(0).map((_, i) =>
        autoPopulationService.autoDetectMappings(`form-${i}`, formFields)
      );

      const results = await Promise.all(promises);

      expect(results).toHaveLength(5);
      results.forEach(mappings => {
        expect(Array.isArray(mappings)).toBe(true);
        expect(mappings.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockRejectedValue(new Error('Database connection failed'))
          })
        })
      });

      const result = await autoPopulationService.getOrCreateWeddingData('couple-123');

      expect(result).toBe(null); // Should return null instead of throwing
    });

    it('should handle malformed form fields', async () => {
      const malformedFields = [
        { id: null, name: '', type: 'invalid', label: undefined } as any
      ];

      const mappings = await autoPopulationService.autoDetectMappings('form-123', malformedFields);

      expect(Array.isArray(mappings)).toBe(true);
      // Should not throw, even with malformed data
    });

    it('should handle empty form fields arrays', async () => {
      const mappings = await autoPopulationService.autoDetectMappings('form-123', []);

      expect(mappings).toEqual([]);
    });
  });
});