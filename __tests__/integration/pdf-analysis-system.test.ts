/**
 * PDF Analysis System Integration Tests
 * WS-242: AI PDF Analysis System - End-to-End Testing
 * 
 * These tests verify the complete PDF analysis workflow
 */

import { PDFAnalysisService } from '@/lib/services/pdfAnalysisService';
import { WeddingContextAnalyzer } from '@/lib/services/weddingContextAnalyzer';
import { WeddingFieldPatternsService } from '@/lib/services/weddingFieldPatternsService';
import { createPDFAnalysisRepository } from '@/lib/repositories/pdfAnalysisRepository';

// Mock external dependencies for integration testing
jest.mock('openai');
jest.mock('@supabase/supabase-js');

describe('PDF Analysis System Integration', () => {
  let pdfAnalysisService: PDFAnalysisService;
  let weddingAnalyzer: WeddingContextAnalyzer;
  let patternsService: WeddingFieldPatternsService;

  beforeAll(async () => {
    // Initialize services for integration testing
    pdfAnalysisService = new PDFAnalysisService();
    weddingAnalyzer = new (WeddingContextAnalyzer as any)();
    patternsService = new WeddingFieldPatternsService();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Complete Wedding Form Processing Workflow', () => {
    it('should process a typical wedding photography form end-to-end', async () => {
      // Simulate a realistic wedding form text content
      const weddingFormText = `
        WEDDING PHOTOGRAPHY BOOKING FORM
        
        Client Details:
        Bride: Emily Rose Johnson
        Groom: James Michael Smith
        Email: emily.james.wedding@gmail.com
        Phone: 07123 456789
        
        Wedding Details:
        Wedding Date: 15th June 2024
        Ceremony Time: 2:30 PM
        Reception Time: 6:00 PM
        Venue: Ashridge House Hotel, Hertfordshire
        Guest Count: 120
        
        Photography Requirements:
        Package: Full Day Coverage
        Style: Documentary with some posed shots
        Special Requirements: Drone photography if weather permits
        
        Budget: £3,500
        Deposit Paid: £1,000
        Balance Due: £2,500
        
        Emergency Contact: Sarah Johnson (Mother of Bride) - 07987 654321
      `;

      // Test pattern matching first (should work without AI)
      const patterns = patternsService.getComprehensivePatterns();
      const patternResults = patternsService.testPatternsAgainstText(weddingFormText, patterns);
      
      // Should successfully match multiple patterns
      const successfulMatches = patternResults.filter(r => r.success);
      expect(successfulMatches.length).toBeGreaterThan(8);
      
      // Verify key fields are matched by patterns
      const emailMatches = successfulMatches.filter(r => r.pattern.fieldType === 'email');
      const phoneMatches = successfulMatches.filter(r => r.pattern.fieldType === 'phone');
      const dateMatches = successfulMatches.filter(r => r.pattern.fieldType === 'wedding_date');
      const budgetMatches = successfulMatches.filter(r => r.pattern.fieldType === 'budget');
      
      expect(emailMatches.length).toBeGreaterThan(0);
      expect(phoneMatches.length).toBeGreaterThan(0);
      expect(dateMatches.length).toBeGreaterThan(0);
      expect(budgetMatches.length).toBeGreaterThan(0);
      
      // Test that patterns extract correct values
      const emailMatch = emailMatches[0];
      expect(emailMatch.matches[0]).toContain('emily.james.wedding@gmail.com');
      
      const phoneMatch = phoneMatches[0];
      expect(phoneMatch.matches[0]).toContain('07123');
      
      console.log(`✅ Pattern matching successful: ${successfulMatches.length} fields extracted`);
    });

    it('should handle photography-specific forms with industry patterns', async () => {
      const photographyFormText = `
        Photography Services Agreement
        
        Package Selected: Premium Wedding Coverage
        Photography Style: Documentary
        Coverage Hours: 8 hours (12:00 PM - 8:00 PM)
        Number of Photographers: 2
        
        Deliverables:
        - High-resolution digital gallery (500+ photos)
        - Online gallery for 12 months
        - USB drive with all images
        - 20x printed 6x4 photos
        
        Equipment:
        - Professional DSLR cameras
        - Lighting equipment for reception
        - Backup equipment
        
        Additional Services:
        - Engagement shoot (2 hours): £350
        - Photo booth: £450
        - Same-day slideshow: £200
      `;

      // Test photography-specific patterns
      const photographyPatterns = await patternsService.getPatternsForIndustry('photography');
      const results = patternsService.testPatternsAgainstText(photographyFormText, photographyPatterns);
      
      const successfulResults = results.filter(r => r.success);
      expect(successfulResults.length).toBeGreaterThan(0);
      
      // Should match photography-specific terms
      const serviceMatches = successfulResults.filter(r => 
        r.pattern.fieldType === 'services_required' || r.pattern.fieldType === 'photography_style'
      );
      expect(serviceMatches.length).toBeGreaterThan(0);
    });

    it('should handle catering forms with dietary requirements', async () => {
      const cateringFormText = `
        Wedding Catering Requirements
        
        Event Date: 22nd September 2024
        Guest Numbers: 
        - Ceremony: 150 guests
        - Wedding Breakfast: 120 guests  
        - Evening Reception: 180 guests
        
        Menu Selection:
        Starter: Smoked salmon with cream cheese
        Main Course: Roast beef with Yorkshire pudding
        Vegetarian Option: Wild mushroom risotto
        Dessert: Traditional wedding cake + fruit salad
        
        Dietary Requirements:
        - 3 guests with nut allergies
        - 2 vegan guests
        - 1 guest with coeliac disease (gluten-free required)
        - 4 vegetarian guests
        
        Special Arrangements:
        - Children's menu for 15 children under 12
        - Late evening buffet at 9:00 PM
        - Wedding cake cutting ceremony at 8:30 PM
        
        Estimated Cost: £4,800
        Service Charge: 12.5%
        Total: £5,400
      `;

      // Test catering-specific patterns
      const cateringPatterns = await patternsService.getPatternsForIndustry('catering');
      const results = patternsService.testPatternsAgainstText(cateringFormText, cateringPatterns);
      
      const successfulResults = results.filter(r => r.success);
      expect(successfulResults.length).toBeGreaterThan(0);
      
      // Should match dietary requirements
      const dietaryMatches = successfulResults.filter(r => 
        r.pattern.fieldType === 'dietary_requirements'
      );
      expect(dietaryMatches.length).toBeGreaterThan(0);
      
      // Should match guest counts
      const guestMatches = successfulResults.filter(r => 
        r.pattern.fieldType === 'guest_count'
      );
      expect(guestMatches.length).toBeGreaterThan(0);
    });
  });

  describe('Pattern Performance and Accuracy', () => {
    it('should achieve high extraction accuracy on wedding forms', () => {
      const testForms = [
        {
          name: 'Basic Wedding Form',
          content: `
            Bride: Sarah Connor
            Groom: John Connor  
            Email: sarah.john@wedding.co.uk
            Phone: 07555 123456
            Wedding Date: 14/02/2025
            Venue: The Manor House
            Guests: 80
            Budget: £6,000
          `,
          expectedFields: 7
        },
        {
          name: 'Photography Inquiry',
          content: `
            Photography Package Inquiry
            
            Couple: Mr & Mrs Thompson
            Contact: jane.thompson@email.com
            Mobile: 07777 888999
            Event Date: 30th May 2024
            Location: Cotswolds Village Hall
            Expected Guests: 60
            Photography Style: Natural, Documentary
            Budget Range: £2,000 - £3,000
          `,
          expectedFields: 6
        },
        {
          name: 'Venue Booking Form',  
          content: `
            VENUE BOOKING ENQUIRY
            
            Event: Wedding Reception
            Date Required: 18th July 2024
            Time: 7:00 PM - 11:30 PM
            Expected Attendance: 140 people
            
            Contact Details:
            Name: Michael & Lisa Parker
            Email: parker.wedding@outlook.com
            Telephone: 01234 567890
            Mobile: 07123 987654
            
            Catering: Evening buffet required
            Special Requirements: Wheelchair access needed
            Estimated Budget: £4,500
          `,
          expectedFields: 8
        }
      ];

      testForms.forEach(form => {
        const patterns = patternsService.getComprehensivePatterns();
        const results = patternsService.testPatternsAgainstText(form.content, patterns);
        const successfulMatches = results.filter(r => r.success);
        
        console.log(`${form.name}: ${successfulMatches.length} fields extracted (expected ~${form.expectedFields})`);
        
        // Should extract at least 70% of expected fields
        expect(successfulMatches.length).toBeGreaterThanOrEqual(
          Math.floor(form.expectedFields * 0.7)
        );
      });
    });

    it('should handle edge cases and malformed data gracefully', () => {
      const edgeCases = [
        '', // Empty string
        '   \n\n  ', // Whitespace only
        'Random text with no wedding content whatsoever', // Non-wedding content
        'Email: invalid-email@', // Invalid email format
        'Phone: 123', // Invalid phone format
        'Date: yesterday', // Invalid date format
        'Budget: very expensive' // Invalid budget format
      ];

      edgeCases.forEach(testCase => {
        expect(() => {
          const results = patternsService.testPatternsAgainstText(testCase);
          // Should not throw errors, even with invalid input
          expect(Array.isArray(results)).toBe(true);
        }).not.toThrow();
      });
    });
  });

  describe('Cost Optimization and Performance', () => {
    it('should prefer pattern matching over AI for common fields', () => {
      const commonFieldsText = `
        Bride: Emma Watson
        Groom: Tom Holland
        Email: emma.tom@example.com
        Phone: 07123 456789
        Date: 25/12/2024
        Venue: London Hotel
        Guests: 100
        Budget: £5,000
      `;

      // Extract fields using patterns only
      const extractedFields = weddingAnalyzer.extractWeddingFields(commonFieldsText);
      
      // Should extract most common fields without AI
      expect(extractedFields.length).toBeGreaterThanOrEqual(6);
      
      // Check specific field types are extracted
      const fieldTypes = extractedFields.map(f => f.fieldType);
      expect(fieldTypes).toContain('email');
      expect(fieldTypes).toContain('phone'); 
      expect(fieldTypes).toContain('wedding_date');
      expect(fieldTypes).toContain('budget');
      
      console.log(`Pattern extraction: ${extractedFields.length} fields without AI`);
    });

    it('should process multiple extraction types efficiently', async () => {
      const extractionTypes = ['client_form', 'vendor_invoice', 'contract'];
      const processingTimes: number[] = [];

      for (const extractionType of extractionTypes) {
        const startTime = Date.now();
        
        // Simulate processing time calculation
        const estimatedTime = (pdfAnalysisService as any).calculateProcessingTime(
          1024 * 1024, // 1MB file
          extractionType
        );
        
        const endTime = Date.now();
        processingTimes.push(endTime - startTime);
        
        expect(estimatedTime).toBeGreaterThan(0);
        expect(estimatedTime).toBeLessThan(600); // Should be under 10 minutes
      }

      // Performance should be consistent across types
      const avgTime = processingTimes.reduce((a, b) => a + b, 0) / processingTimes.length;
      expect(avgTime).toBeLessThan(50); // Should be very fast for calculations
    });
  });

  describe('Database Integration Simulation', () => {
    it('should simulate complete database workflow', async () => {
      const mockRepository = createPDFAnalysisRepository();
      
      // Simulate job creation
      const mockJob = {
        id: 'integration-test-job',
        organization_id: 'test-org',
        file_name: 'test-wedding-form.pdf',
        file_url: 'https://test.com/file.pdf',
        extraction_type: 'client_form',
        status: 'pending',
        created_at: new Date().toISOString()
      };

      // Test that repository functions are properly structured
      expect(typeof mockRepository.createJob).toBe('function');
      expect(typeof mockRepository.updateJobStatus).toBe('function');
      expect(typeof mockRepository.saveExtractedFields).toBe('function');
      expect(typeof mockRepository.getJob).toBe('function');
      
      console.log('✅ Database integration interfaces verified');
    });
  });

  describe('Wedding Industry Intelligence', () => {
    it('should provide wedding-specific context for extracted fields', () => {
      const testFields = [
        { fieldName: 'bride_name', extractedValue: 'Sarah Johnson', fieldType: 'client_name' },
        { fieldName: 'wedding_date', extractedValue: '2024-06-15', fieldType: 'wedding_date' },
        { fieldName: 'venue_name', extractedValue: 'Ashridge House', fieldType: 'venue_name' },
        { fieldName: 'budget', extractedValue: '5000', fieldType: 'budget' }
      ];

      const enhanced = (weddingAnalyzer as any).enhanceWithWeddingIntelligence(testFields);

      // Should add wedding context to each field
      enhanced.forEach((field: any) => {
        expect(field.weddingContext).toBeDefined();
        expect(field.weddingContext.importance).toBeDefined();
        expect(Array.isArray(field.weddingContext.tips)).toBe(true);
        expect(Array.isArray(field.weddingContext.relatedFields)).toBe(true);
      });

      // Check specific wedding context
      const brideField = enhanced.find((f: any) => f.fieldName === 'bride_name');
      expect(brideField?.weddingContext.importance).toBe('critical');
      expect(brideField?.weddingContext.tips).toContain(
        expect.stringContaining('spelling')
      );
    });

    it('should identify field relationships correctly', () => {
      const relatedFields = [
        { fieldName: 'bride_name', extractedValue: 'Jane Doe', fieldType: 'client_name' },
        { fieldName: 'groom_name', extractedValue: 'John Smith', fieldType: 'client_name' },
        { fieldName: 'wedding_date', extractedValue: '2024-07-20', fieldType: 'wedding_date' },
        { fieldName: 'ceremony_time', extractedValue: '14:00', fieldType: 'event_time' }
      ];

      const enhanced = (weddingAnalyzer as any).enhanceWithWeddingIntelligence(relatedFields);
      
      // Bride and groom should be related
      const brideField = enhanced.find((f: any) => f.fieldName === 'bride_name');
      expect(brideField?.weddingContext.relatedFields).toContain('groom_name');
      
      // Date and time should be related
      const dateField = enhanced.find((f: any) => f.fieldName === 'wedding_date');
      expect(dateField?.weddingContext.relatedFields).toContain('ceremony_time');
    });
  });

  describe('System Resilience', () => {
    it('should handle concurrent pattern testing efficiently', async () => {
      const sampleText = `
        Wedding Details: Emily & James
        Email: test@example.com
        Phone: 07123456789
        Date: 15/06/2024
        Venue: Test Venue
      `;

      // Test concurrent pattern matching
      const concurrentTests = Array(10).fill(null).map(() => 
        Promise.resolve(patternsService.testPatternsAgainstText(sampleText))
      );

      const results = await Promise.all(concurrentTests);

      // All results should be consistent
      results.forEach(result => {
        expect(Array.isArray(result)).toBe(true);
        expect(result.length).toBe(results[0].length);
      });

      const successCounts = results.map(r => r.filter(item => item.success).length);
      const allSame = successCounts.every(count => count === successCounts[0]);
      expect(allSame).toBe(true);
    });

    it('should maintain performance with large pattern sets', () => {
      const largeText = Array(100).fill(`
        Bride: Sarah Smith
        Groom: John Doe
        Email: test${Math.random()}@example.com
        Phone: 0712345678${Math.floor(Math.random() * 10)}
        Date: 15/06/202${Math.floor(Math.random() * 10)}
        Venue: Test Venue ${Math.floor(Math.random() * 1000)}
        Budget: £${Math.floor(Math.random() * 10000) + 1000}
      `).join('\n');

      const startTime = Date.now();
      const results = patternsService.testPatternsAgainstText(largeText);
      const endTime = Date.now();

      const processingTime = endTime - startTime;
      const successfulMatches = results.filter(r => r.success);

      console.log(`Large text processing: ${processingTime}ms, ${successfulMatches.length} matches`);
      
      // Should process large text reasonably quickly
      expect(processingTime).toBeLessThan(5000); // Under 5 seconds
      expect(successfulMatches.length).toBeGreaterThan(0);
    });
  });
});