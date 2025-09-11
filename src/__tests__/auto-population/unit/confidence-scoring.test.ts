/**
 * WS-216 Auto-Population System - Confidence Scoring Unit Tests
 *
 * Tests the confidence scoring algorithm that determines how reliable
 * auto-populated field values are for wedding vendor forms.
 *
 * Wedding Industry Context:
 * - Confidence scores guide vendors on which fields to review
 * - High confidence (>90%) fields can auto-submit safely
 * - Low confidence (<70%) fields require manual verification
 * - Scores must be calibrated for wedding data accuracy requirements
 */

import { describe, it, expect, beforeEach, jest } from '@jest/test';
import {
  ConfidenceScorer,
  calculateFinalConfidence,
  ConfidenceFactors,
  DataSource,
  FieldContext,
  ValidationResult,
} from '@/lib/auto-population/confidence-scorer';

describe('ConfidenceScorer', () => {
  let confidenceScorer: ConfidenceScorer;

  beforeEach(() => {
    confidenceScorer = new ConfidenceScorer();
  });

  describe('String Match Confidence', () => {
    it('should give perfect confidence for exact matches', () => {
      const factors: ConfidenceFactors = {
        stringMatchScore: 1.0,
        patternMatchScore: 0.0,
        contextMatchScore: 0.0,
        historicalAccuracy: 0.0,
        userFeedbackScore: 0.0,
      };

      const confidence = calculateFinalConfidence(factors);
      expect(confidence).toBeCloseTo(1.0, 2);
    });

    it('should calculate confidence for fuzzy matches', () => {
      const testCases = [
        { stringMatch: 0.9, expected: { min: 0.75, max: 0.95 } },
        { stringMatch: 0.8, expected: { min: 0.65, max: 0.85 } },
        { stringMatch: 0.7, expected: { min: 0.55, max: 0.75 } },
        { stringMatch: 0.5, expected: { min: 0.35, max: 0.55 } },
      ];

      testCases.forEach(({ stringMatch, expected }) => {
        const factors: ConfidenceFactors = {
          stringMatchScore: stringMatch,
          patternMatchScore: 0.0,
          contextMatchScore: 0.0,
          historicalAccuracy: 0.0,
          userFeedbackScore: 0.0,
        };

        const confidence = calculateFinalConfidence(factors);
        expect(confidence).toBeGreaterThanOrEqual(expected.min);
        expect(confidence).toBeLessThanOrEqual(expected.max);
      });
    });
  });

  describe('Pattern Match Confidence', () => {
    it('should recognize wedding field patterns', () => {
      const weddingPatterns = [
        { field: 'wedding_date', pattern: 'date', expectedScore: 0.95 },
        { field: 'bride_name', pattern: 'person_name', expectedScore: 0.9 },
        { field: 'guest_count', pattern: 'number', expectedScore: 0.85 },
        { field: 'venue_name', pattern: 'location', expectedScore: 0.8 },
        { field: 'ceremony_time', pattern: 'time', expectedScore: 0.9 },
      ];

      weddingPatterns.forEach(({ field, pattern, expectedScore }) => {
        const patternScore = confidenceScorer.calculatePatternMatchScore(
          field,
          pattern,
        );
        expect(patternScore).toBeGreaterThanOrEqual(expectedScore);
      });
    });

    it('should handle vendor-specific pattern matching', () => {
      const photographyPatterns = [
        { field: 'photo_style', context: 'photographer', expectedScore: 0.9 },
        { field: 'album_pages', context: 'photographer', expectedScore: 0.85 },
        {
          field: 'engagement_session',
          context: 'photographer',
          expectedScore: 0.8,
        },
      ];

      const cateringPatterns = [
        { field: 'menu_style', context: 'caterer', expectedScore: 0.9 },
        {
          field: 'dietary_restrictions',
          context: 'caterer',
          expectedScore: 0.85,
        },
        { field: 'bar_package', context: 'caterer', expectedScore: 0.8 },
      ];

      [...photographyPatterns, ...cateringPatterns].forEach(
        ({ field, context, expectedScore }) => {
          const patternScore = confidenceScorer.calculatePatternMatchScore(
            field,
            'service_specific',
            { vendorType: context },
          );
          expect(patternScore).toBeGreaterThanOrEqual(expectedScore);
        },
      );
    });
  });

  describe('Context Match Confidence', () => {
    it('should boost confidence with relevant wedding context', () => {
      const context: FieldContext = {
        vendorType: 'photographer',
        weddingSize: 'large',
        weddingStyle: 'formal',
        season: 'summer',
        hasEngagementSession: true,
      };

      // Photography fields should get context boost
      const photoContextScore = confidenceScorer.calculateContextMatchScore(
        'photography_style',
        context,
      );
      expect(photoContextScore).toBeGreaterThan(0.8);

      // Non-photography fields should get lower context boost
      const cateringContextScore = confidenceScorer.calculateContextMatchScore(
        'menu_style',
        context,
      );
      expect(cateringContextScore).toBeLessThan(0.6);
    });

    it('should handle multi-vendor coordination context', () => {
      const coordinatorContext: FieldContext = {
        vendorType: 'coordinator',
        isMultiVendor: true,
        relatedVendors: ['photographer', 'caterer', 'venue', 'florist'],
        coordinationLevel: 'full',
      };

      // Coordinator should get good context scores for all vendor types
      const photoScore = confidenceScorer.calculateContextMatchScore(
        'photography_package',
        coordinatorContext,
      );
      const venueScore = confidenceScorer.calculateContextMatchScore(
        'venue_capacity',
        coordinatorContext,
      );
      const cateringScore = confidenceScorer.calculateContextMatchScore(
        'catering_style',
        coordinatorContext,
      );

      expect(photoScore).toBeGreaterThan(0.7);
      expect(venueScore).toBeGreaterThan(0.7);
      expect(cateringScore).toBeGreaterThan(0.7);
    });

    it('should consider seasonal wedding context', () => {
      const summerContext: FieldContext = {
        vendorType: 'florist',
        season: 'summer',
        weddingStyle: 'outdoor',
        venue_type: 'garden',
      };

      const winterContext: FieldContext = {
        vendorType: 'florist',
        season: 'winter',
        weddingStyle: 'indoor',
        venue_type: 'ballroom',
      };

      // Summer flowers should get higher confidence in summer context
      const summerFlowerScore = confidenceScorer.calculateContextMatchScore(
        'summer_bouquet',
        summerContext,
      );
      const summerFlowerWinterScore =
        confidenceScorer.calculateContextMatchScore(
          'summer_bouquet',
          winterContext,
        );

      expect(summerFlowerScore).toBeGreaterThan(summerFlowerWinterScore);
    });
  });

  describe('Historical Accuracy', () => {
    it('should track field accuracy over time', () => {
      const historicalData = {
        field: 'wedding_date',
        totalPopulations: 100,
        correctPopulations: 95,
        userCorrections: 5,
        averageConfidence: 0.92,
      };

      const accuracyScore =
        confidenceScorer.calculateHistoricalAccuracy(historicalData);
      expect(accuracyScore).toBeCloseTo(0.95, 2); // 95% accuracy
    });

    it('should penalize frequently corrected fields', () => {
      const frequentlyCorrected = {
        field: 'guest_count',
        totalPopulations: 100,
        correctPopulations: 70,
        userCorrections: 30,
        averageConfidence: 0.8,
      };

      const accuracyScore =
        confidenceScorer.calculateHistoricalAccuracy(frequentlyCorrected);
      expect(accuracyScore).toBeLessThan(0.75);
    });

    it('should handle fields with limited history', () => {
      const limitedHistory = {
        field: 'new_field',
        totalPopulations: 5,
        correctPopulations: 4,
        userCorrections: 1,
        averageConfidence: 0.85,
      };

      const accuracyScore =
        confidenceScorer.calculateHistoricalAccuracy(limitedHistory);
      // Should use default confidence for fields with <10 samples
      expect(accuracyScore).toBeCloseTo(0.75, 2);
    });
  });

  describe('User Feedback Integration', () => {
    it('should incorporate positive user feedback', () => {
      const positiveFeedback = {
        field: 'photography_style',
        totalFeedbacks: 50,
        positiveMarkings: 45,
        negativeMarkings: 3,
        neutralMarkings: 2,
        averageRating: 4.2,
      };

      const feedbackScore =
        confidenceScorer.calculateUserFeedbackScore(positiveFeedback);
      expect(feedbackScore).toBeGreaterThan(0.85);
    });

    it('should penalize negative user feedback', () => {
      const negativeFeedback = {
        field: 'guest_count',
        totalFeedbacks: 30,
        positiveMarkings: 10,
        negativeMarkings: 15,
        neutralMarkings: 5,
        averageRating: 2.1,
      };

      const feedbackScore =
        confidenceScorer.calculateUserFeedbackScore(negativeFeedback);
      expect(feedbackScore).toBeLessThan(0.5);
    });

    it('should handle mixed feedback appropriately', () => {
      const mixedFeedback = {
        field: 'venue_name',
        totalFeedbacks: 40,
        positiveMarkings: 20,
        negativeMarkings: 10,
        neutralMarkings: 10,
        averageRating: 3.2,
      };

      const feedbackScore =
        confidenceScorer.calculateUserFeedbackScore(mixedFeedback);
      expect(feedbackScore).toBeGreaterThan(0.6);
      expect(feedbackScore).toBeLessThan(0.8);
    });
  });

  describe('Data Source Reliability', () => {
    it('should weight vendor profile data highly', () => {
      const vendorProfileSource: DataSource = {
        type: 'vendor_profile',
        lastUpdated: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
        completeness: 0.95,
        verificationStatus: 'verified',
      };

      const reliability =
        confidenceScorer.calculateDataSourceReliability(vendorProfileSource);
      expect(reliability).toBeGreaterThan(0.9);
    });

    it('should penalize stale data sources', () => {
      const staleSource: DataSource = {
        type: 'client_history',
        lastUpdated: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000), // 1 year ago
        completeness: 0.8,
        verificationStatus: 'unverified',
      };

      const reliability =
        confidenceScorer.calculateDataSourceReliability(staleSource);
      expect(reliability).toBeLessThan(0.5);
    });

    it('should consider data completeness', () => {
      const incompleteSource: DataSource = {
        type: 'wedding_context',
        lastUpdated: new Date(),
        completeness: 0.3,
        verificationStatus: 'partial',
      };

      const reliability =
        confidenceScorer.calculateDataSourceReliability(incompleteSource);
      expect(reliability).toBeLessThan(0.6);
    });
  });

  describe('Composite Confidence Calculation', () => {
    it('should calculate realistic wedding scenario confidence', () => {
      // Scenario: Photographer auto-populating wedding quote form
      const realisticFactors: ConfidenceFactors = {
        stringMatchScore: 0.92, // Good field name match
        patternMatchScore: 0.88, // Photography-specific patterns recognized
        contextMatchScore: 0.85, // Photographer context for photography fields
        historicalAccuracy: 0.91, // Field has been accurate historically
        userFeedbackScore: 0.87, // Users generally satisfied with this field
      };

      const finalConfidence = calculateFinalConfidence(realisticFactors);

      // Should result in high confidence for vendor to trust
      expect(finalConfidence).toBeGreaterThan(0.85);
      expect(finalConfidence).toBeLessThanOrEqual(1.0);
    });

    it('should handle low-confidence scenarios appropriately', () => {
      // Scenario: New field with little historical data and poor matches
      const lowConfidenceFactors: ConfidenceFactors = {
        stringMatchScore: 0.45, // Poor field name match
        patternMatchScore: 0.2, // Pattern not well recognized
        contextMatchScore: 0.3, // Context doesn't strongly support
        historicalAccuracy: 0.55, // Limited historical data, mixed results
        userFeedbackScore: 0.4, // Users often correct this field
      };

      const finalConfidence = calculateFinalConfidence(lowConfidenceFactors);

      // Should result in low confidence requiring manual review
      expect(finalConfidence).toBeLessThan(0.5);
      expect(finalConfidence).toBeGreaterThan(0.0);
    });

    it('should weight factors appropriately', () => {
      // String match should be heavily weighted
      const highStringMatch: ConfidenceFactors = {
        stringMatchScore: 0.95,
        patternMatchScore: 0.3,
        contextMatchScore: 0.3,
        historicalAccuracy: 0.3,
        userFeedbackScore: 0.3,
      };

      const lowStringMatch: ConfidenceFactors = {
        stringMatchScore: 0.3,
        patternMatchScore: 0.95,
        contextMatchScore: 0.95,
        historicalAccuracy: 0.95,
        userFeedbackScore: 0.95,
      };

      const highStringConfidence = calculateFinalConfidence(highStringMatch);
      const lowStringConfidence = calculateFinalConfidence(lowStringMatch);

      // High string match should dominate even with lower other factors
      expect(highStringConfidence).toBeGreaterThan(lowStringConfidence);
    });
  });

  describe('Wedding Industry Edge Cases', () => {
    it('should handle destination wedding complexity', () => {
      const destinationContext: FieldContext = {
        vendorType: 'coordinator',
        weddingType: 'destination',
        location: 'international',
        complexity: 'high',
        timezone: 'different',
        language: 'multiple',
      };

      // Destination weddings should generally have lower confidence due to complexity
      const standardWeddingScore = confidenceScorer.calculateContextMatchScore(
        'venue_name',
        { vendorType: 'coordinator' },
      );
      const destinationWeddingScore =
        confidenceScorer.calculateContextMatchScore(
          'venue_name',
          destinationContext,
        );

      expect(destinationWeddingScore).toBeLessThan(standardWeddingScore);
    });

    it('should handle cultural wedding variations', () => {
      const culturalContexts = [
        { culture: 'indian', ceremonies: 'multiple', duration: 'multi-day' },
        { culture: 'jewish', traditions: 'orthodox', dietary: 'kosher' },
        { culture: 'chinese', traditions: 'tea-ceremony', colors: 'red-gold' },
        { culture: 'muslim', traditions: 'nikah', separation: 'gender' },
      ];

      culturalContexts.forEach((context) => {
        const contextScore = confidenceScorer.calculateContextMatchScore(
          'ceremony_traditions',
          context,
        );
        expect(contextScore).toBeGreaterThan(0.0);
        expect(contextScore).toBeLessThanOrEqual(1.0);
      });
    });

    it('should adjust for wedding size complexity', () => {
      const weddingSizes = [
        { size: 'intimate', guests: 20, complexity: 'low' },
        { size: 'small', guests: 50, complexity: 'low' },
        { size: 'medium', guests: 100, complexity: 'medium' },
        { size: 'large', guests: 200, complexity: 'high' },
        { size: 'grand', guests: 400, complexity: 'very-high' },
      ];

      const baseContext = { vendorType: 'coordinator' };

      weddingSizes.forEach((wedding) => {
        const context = { ...baseContext, ...wedding };
        const score = confidenceScorer.calculateContextMatchScore(
          'logistics_complexity',
          context,
        );

        // Larger weddings should generally have higher confidence for logistics fields
        if (wedding.guests > 100) {
          expect(score).toBeGreaterThan(0.7);
        }
      });
    });
  });

  describe('Performance and Edge Cases', () => {
    it('should handle confidence calculation within performance limits', () => {
      const startTime = performance.now();

      // Calculate confidence for 100 fields
      for (let i = 0; i < 100; i++) {
        const factors: ConfidenceFactors = {
          stringMatchScore: Math.random(),
          patternMatchScore: Math.random(),
          contextMatchScore: Math.random(),
          historicalAccuracy: Math.random(),
          userFeedbackScore: Math.random(),
        };

        calculateFinalConfidence(factors);
      }

      const endTime = performance.now();
      const averageTime = (endTime - startTime) / 100;

      // Should calculate confidence in <1ms per field
      expect(averageTime).toBeLessThan(1);
    });

    it('should handle extreme input values gracefully', () => {
      const extremeFactors: ConfidenceFactors = {
        stringMatchScore: 1.5, // Invalid: >1.0
        patternMatchScore: -0.5, // Invalid: <0.0
        contextMatchScore: NaN,
        historicalAccuracy: Infinity,
        userFeedbackScore: 0.5,
      };

      expect(() => calculateFinalConfidence(extremeFactors)).not.toThrow();

      const result = calculateFinalConfidence(extremeFactors);
      expect(result).toBeGreaterThanOrEqual(0);
      expect(result).toBeLessThanOrEqual(1);
      expect(Number.isFinite(result)).toBe(true);
    });

    it('should provide consistent results for identical inputs', () => {
      const factors: ConfidenceFactors = {
        stringMatchScore: 0.85,
        patternMatchScore: 0.72,
        contextMatchScore: 0.68,
        historicalAccuracy: 0.91,
        userFeedbackScore: 0.79,
      };

      const results = [];
      for (let i = 0; i < 10; i++) {
        results.push(calculateFinalConfidence(factors));
      }

      // All results should be identical
      const firstResult = results[0];
      results.forEach((result) => {
        expect(result).toBeCloseTo(firstResult, 10);
      });
    });
  });

  describe('Validation Integration', () => {
    it('should adjust confidence based on validation results', () => {
      const validationResults: ValidationResult[] = [
        {
          field: 'wedding_date',
          isValid: true,
          validationType: 'format',
          validationScore: 0.95,
        },
        {
          field: 'guest_count',
          isValid: true,
          validationType: 'range',
          validationScore: 0.88,
        },
        {
          field: 'venue_capacity',
          isValid: false,
          validationType: 'business_logic',
          validationScore: 0.2,
          errorReason: 'Guest count exceeds venue capacity',
        },
      ];

      const baseFactors: ConfidenceFactors = {
        stringMatchScore: 0.8,
        patternMatchScore: 0.75,
        contextMatchScore: 0.7,
        historicalAccuracy: 0.85,
        userFeedbackScore: 0.8,
      };

      // Valid fields should get confidence boost
      const validFieldConfidence =
        confidenceScorer.adjustConfidenceByValidation(
          baseFactors,
          validationResults[0],
        );
      expect(validFieldConfidence).toBeGreaterThan(
        calculateFinalConfidence(baseFactors),
      );

      // Invalid fields should get confidence penalty
      const invalidFieldConfidence =
        confidenceScorer.adjustConfidenceByValidation(
          baseFactors,
          validationResults[2],
        );
      expect(invalidFieldConfidence).toBeLessThan(
        calculateFinalConfidence(baseFactors),
      );
    });
  });
});
