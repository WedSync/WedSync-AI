/**
 * Wedding Field Patterns Service Tests
 * WS-242: AI PDF Analysis System - Pattern Management Testing
 */

import { WeddingFieldPatternsService } from '@/lib/services/weddingFieldPatternsService';
import { createPDFAnalysisRepository } from '@/lib/repositories/pdfAnalysisRepository';

// Mock repository
jest.mock('@/lib/repositories/pdfAnalysisRepository');

const mockRepository = {
  createWeddingFieldPatterns: jest.fn(),
  getWeddingFieldPatterns: jest.fn(),
  updateWeddingFieldPatterns: jest.fn(),
  bulkDeletePatterns: jest.fn(),
};

(createPDFAnalysisRepository as jest.Mock).mockReturnValue(mockRepository);

describe('WeddingFieldPatternsService', () => {
  let service: WeddingFieldPatternsService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new WeddingFieldPatternsService();
  });

  describe('getComprehensivePatterns', () => {
    it('should return comprehensive wedding field patterns', () => {
      const patterns = service.getComprehensivePatterns();

      expect(patterns).toBeDefined();
      expect(patterns.length).toBeGreaterThan(50); // Should have many patterns
      
      // Check pattern structure
      patterns.forEach(pattern => {
        expect(pattern).toHaveProperty('patternName');
        expect(pattern).toHaveProperty('fieldType');
        expect(pattern).toHaveProperty('regexPattern');
        expect(pattern).toHaveProperty('priority');
        expect(pattern).toHaveProperty('contextKeywords');
        expect(pattern).toHaveProperty('validationRules');
        expect(pattern).toHaveProperty('description');
        expect(pattern).toHaveProperty('category');
        expect(pattern).toHaveProperty('isActive');
        expect(pattern).toHaveProperty('industry');
      });
    });

    it('should include patterns for all major field types', () => {
      const patterns = service.getComprehensivePatterns();
      const fieldTypes = patterns.map(p => p.fieldType);

      expect(fieldTypes).toContain('client_name');
      expect(fieldTypes).toContain('email');
      expect(fieldTypes).toContain('phone');
      expect(fieldTypes).toContain('wedding_date');
      expect(fieldTypes).toContain('venue_name');
      expect(fieldTypes).toContain('budget');
      expect(fieldTypes).toContain('guest_count');
    });

    it('should include patterns for different industries', () => {
      const patterns = service.getComprehensivePatterns();
      const industries = patterns.map(p => p.industry);

      expect(industries).toContain('photography');
      expect(industries).toContain('catering');
      expect(industries).toContain('venue');
      expect(industries).toContain('general');
    });

    it('should have valid regex patterns', () => {
      const patterns = service.getComprehensivePatterns();

      patterns.forEach(pattern => {
        expect(() => {
          new RegExp(pattern.regexPattern);
        }).not.toThrow();
      });
    });
  });

  describe('initializePatterns', () => {
    it('should initialize patterns in database successfully', async () => {
      mockRepository.createWeddingFieldPatterns.mockResolvedValue([]);

      await service.initializePatterns();

      expect(mockRepository.createWeddingFieldPatterns).toHaveBeenCalled();
      
      // Should be called multiple times for batching
      const callCount = mockRepository.createWeddingFieldPatterns.mock.calls.length;
      expect(callCount).toBeGreaterThan(1);
    });

    it('should handle database errors during initialization', async () => {
      mockRepository.createWeddingFieldPatterns.mockRejectedValue(
        new Error('Database connection failed')
      );

      await expect(service.initializePatterns()).rejects.toThrow(
        'Database connection failed'
      );
    });

    it('should batch patterns to avoid overwhelming database', async () => {
      mockRepository.createWeddingFieldPatterns.mockResolvedValue([]);

      await service.initializePatterns();

      // Check that each call has reasonable batch size
      mockRepository.createWeddingFieldPatterns.mock.calls.forEach(call => {
        const batchSize = call[0].length;
        expect(batchSize).toBeLessThanOrEqual(25); // Max batch size
        expect(batchSize).toBeGreaterThan(0);
      });
    });
  });

  describe('getPatternsForIndustry', () => {
    it('should return patterns for specific industry', async () => {
      const photographyPatterns = await service.getPatternsForIndustry('photography');

      expect(photographyPatterns).toBeDefined();
      
      photographyPatterns.forEach(pattern => {
        expect(['photography', 'general']).toContain(pattern.industry);
      });

      // Should be sorted by priority (highest first)
      for (let i = 0; i < photographyPatterns.length - 1; i++) {
        expect(photographyPatterns[i].priority).toBeGreaterThanOrEqual(
          photographyPatterns[i + 1].priority
        );
      }
    });

    it('should include general patterns for all industries', async () => {
      const cateringPatterns = await service.getPatternsForIndustry('catering');
      const generalPatterns = cateringPatterns.filter(p => p.industry === 'general');

      expect(generalPatterns.length).toBeGreaterThan(0);
    });
  });

  describe('getPatternsForFieldType', () => {
    it('should return patterns for specific field type', async () => {
      const emailPatterns = await service.getPatternsForFieldType('email');

      expect(emailPatterns).toBeDefined();
      
      emailPatterns.forEach(pattern => {
        expect(pattern.fieldType).toBe('email');
      });

      // Should be sorted by priority
      for (let i = 0; i < emailPatterns.length - 1; i++) {
        expect(emailPatterns[i].priority).toBeGreaterThanOrEqual(
          emailPatterns[i + 1].priority
        );
      }
    });

    it('should return multiple patterns for common field types', async () => {
      const phonePatterns = await service.getPatternsForFieldType('phone');
      expect(phonePatterns.length).toBeGreaterThan(1);
      
      const emailPatterns = await service.getPatternsForFieldType('email');
      expect(emailPatterns.length).toBeGreaterThan(1);
    });
  });

  describe('testPatternsAgainstText', () => {
    const sampleWeddingText = `
      Bride: Emily Johnson
      Groom: James Smith  
      Email: emily@example.com
      Mobile: 07123 456789
      Wedding Date: 15/06/2024
      Venue: The Grand Hotel
      Guest Count: 120
      Budget: £8,500
    `;

    it('should test patterns against sample text', () => {
      const results = service.testPatternsAgainstText(sampleWeddingText);

      expect(results).toBeDefined();
      expect(results.length).toBeGreaterThan(0);

      results.forEach(result => {
        expect(result).toHaveProperty('pattern');
        expect(result).toHaveProperty('matches');
        expect(result).toHaveProperty('success');
      });

      // Should have successful matches
      const successfulResults = results.filter(r => r.success);
      expect(successfulResults.length).toBeGreaterThan(5);
    });

    it('should match email patterns correctly', () => {
      const emailText = 'Contact email: test@wedding.com';
      const results = service.testPatternsAgainstText(emailText);
      
      const emailMatches = results.filter(r => 
        r.pattern.fieldType === 'email' && r.success
      );

      expect(emailMatches.length).toBeGreaterThan(0);
      
      emailMatches.forEach(match => {
        expect(match.matches[0]).toContain('test@wedding.com');
      });
    });

    it('should match UK phone numbers correctly', () => {
      const phoneText = 'Mobile: 07123 456789';
      const results = service.testPatternsAgainstText(phoneText);
      
      const phoneMatches = results.filter(r => 
        r.pattern.fieldType === 'phone' && r.success
      );

      expect(phoneMatches.length).toBeGreaterThan(0);
    });

    it('should match UK date formats', () => {
      const dateText = 'Wedding Date: 25/12/2024';
      const results = service.testPatternsAgainstText(dateText);
      
      const dateMatches = results.filter(r => 
        r.pattern.fieldType === 'wedding_date' && r.success
      );

      expect(dateMatches.length).toBeGreaterThan(0);
    });

    it('should match UK currency amounts', () => {
      const budgetText = 'Total cost: £12,500.00';
      const results = service.testPatternsAgainstText(budgetText);
      
      const budgetMatches = results.filter(r => 
        r.pattern.fieldType === 'budget' && r.success
      );

      expect(budgetMatches.length).toBeGreaterThan(0);
    });

    it('should handle invalid regex patterns gracefully', () => {
      const invalidPatterns = [{
        patternName: 'Invalid Pattern',
        fieldType: 'other' as const,
        regexPattern: '(invalid[regex', // Invalid regex
        priority: 50,
        contextKeywords: [],
        validationRules: {},
        description: 'Test invalid pattern',
        category: 'basic' as const,
        isActive: true,
        industry: 'general' as const
      }];

      const results = service.testPatternsAgainstText('test', invalidPatterns);
      
      expect(results).toHaveLength(1);
      expect(results[0].success).toBe(false);
      expect(results[0].matches).toHaveLength(0);
    });
  });

  describe('getPatternStatistics', () => {
    it('should return comprehensive pattern statistics', () => {
      const stats = service.getPatternStatistics();

      expect(stats).toHaveProperty('totalPatterns');
      expect(stats).toHaveProperty('patternsByCategory');
      expect(stats).toHaveProperty('patternsByIndustry');
      expect(stats).toHaveProperty('patternsByFieldType');
      expect(stats).toHaveProperty('highPriorityPatterns');
      expect(stats).toHaveProperty('recommendations');

      expect(stats.totalPatterns).toBeGreaterThan(0);
      expect(Object.keys(stats.patternsByCategory)).toContain('basic');
      expect(Object.keys(stats.patternsByCategory)).toContain('contact');
      expect(Object.keys(stats.patternsByIndustry)).toContain('general');
      expect(Object.keys(stats.patternsByFieldType)).toContain('client_name');
    });

    it('should generate relevant recommendations', () => {
      const stats = service.getPatternStatistics();

      expect(Array.isArray(stats.recommendations)).toBe(true);
      
      // Each recommendation should be a meaningful string
      stats.recommendations.forEach(rec => {
        expect(typeof rec).toBe('string');
        expect(rec.length).toBeGreaterThan(10);
      });
    });

    it('should calculate high priority pattern percentage', () => {
      const stats = service.getPatternStatistics();
      const percentage = stats.highPriorityPatterns / stats.totalPatterns;

      expect(percentage).toBeGreaterThan(0);
      expect(percentage).toBeLessThanOrEqual(1);
    });
  });

  describe('Pattern Quality Tests', () => {
    it('should have patterns with appropriate priority distribution', () => {
      const patterns = service.getComprehensivePatterns();
      const priorities = patterns.map(p => p.priority);

      // Should have a good distribution of priorities
      const highPriority = priorities.filter(p => p >= 90).length;
      const mediumPriority = priorities.filter(p => p >= 70 && p < 90).length;
      const lowPriority = priorities.filter(p => p < 70).length;

      expect(highPriority).toBeGreaterThan(0);
      expect(mediumPriority).toBeGreaterThan(0);
      // Low priority patterns are optional but expected
    });

    it('should have meaningful context keywords for all patterns', () => {
      const patterns = service.getComprehensivePatterns();

      patterns.forEach(pattern => {
        expect(Array.isArray(pattern.contextKeywords)).toBe(true);
        expect(pattern.contextKeywords.length).toBeGreaterThan(0);
        
        pattern.contextKeywords.forEach(keyword => {
          expect(typeof keyword).toBe('string');
          expect(keyword.length).toBeGreaterThan(0);
        });
      });
    });

    it('should have appropriate validation rules for field types', () => {
      const patterns = service.getComprehensivePatterns();

      // Email patterns should have email format validation
      const emailPatterns = patterns.filter(p => p.fieldType === 'email');
      emailPatterns.forEach(pattern => {
        expect(pattern.validationRules.format).toBe('email');
      });

      // Date patterns should have date format validation
      const datePatterns = patterns.filter(p => p.fieldType === 'wedding_date');
      datePatterns.forEach(pattern => {
        expect(pattern.validationRules.dateFormat).toBeDefined();
      });

      // Budget patterns should have currency format validation
      const budgetPatterns = patterns.filter(p => p.fieldType === 'budget');
      budgetPatterns.forEach(pattern => {
        expect(pattern.validationRules.currencyFormat).toBe('GBP');
      });
    });

    it('should categorize patterns appropriately', () => {
      const patterns = service.getComprehensivePatterns();
      const categories = ['basic', 'contact', 'event', 'service', 'financial', 'dietary', 'accessibility'];

      patterns.forEach(pattern => {
        expect(categories).toContain(pattern.category);
      });

      // Check some specific categorizations
      const emailPatterns = patterns.filter(p => p.fieldType === 'email');
      emailPatterns.forEach(pattern => {
        expect(pattern.category).toBe('contact');
      });

      const budgetPatterns = patterns.filter(p => p.fieldType === 'budget');
      budgetPatterns.forEach(pattern => {
        expect(pattern.category).toBe('financial');
      });
    });
  });
});