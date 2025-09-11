/**
 * Comprehensive AI Version Intelligence Testing Framework
 * WS-200 API Versioning Strategy - Team D Implementation
 * 
 * Tests all AI components with wedding industry specific scenarios:
 * - API Evolution Intelligence Engine
 * - Version Compatibility Intelligence
 * - Migration Intelligence Orchestrator
 * - Performance Prediction Engine
 * - Cultural API Intelligence System
 * - Version Recommendation AI
 */

import { describe, test, expect, beforeEach, afterEach, vi, beforeAll } from 'vitest';
import { APIEvolutionIntelligenceEngine } from '../../src/lib/ai/version-intelligence/api-evolution-intelligence';
import { CompatibilityIntelligenceEngine } from '../../src/lib/ai/version-intelligence/compatibility-intelligence-engine';
import { MigrationIntelligenceOrchestrator } from '../../src/lib/ai/version-intelligence/migration-intelligence-orchestrator';
import { PerformancePredictionEngine } from '../../src/lib/ai/version-intelligence/performance-prediction-engine';
import { CulturalAPIIntelligence } from '../../src/lib/ai/version-intelligence/cultural-api-intelligence';
import { VersionRecommendationAI } from '../../src/lib/ai/version-intelligence/version-recommendation-ai';
import { createClient } from '@supabase/supabase-js';

// Mock wedding industry test data
const WEDDING_SUPPLIERS = {
  photographer: {
    businessType: 'photographer',
    technicalCapability: 3,
    size: 'small',
    weddingsPerYear: 25,
    peakSeason: { start: 'may', end: 'october' }
  },
  venue: {
    businessType: 'venue',
    technicalCapability: 2,
    size: 'medium',
    weddingsPerYear: 150,
    peakSeason: { start: 'april', end: 'november' }
  },
  florist: {
    businessType: 'florist',
    technicalCapability: 4,
    size: 'small',
    weddingsPerYear: 40,
    peakSeason: { start: 'may', end: 'september' }
  }
};

const CULTURAL_WEDDINGS = {
  hindu: {
    tradition: 'hindu',
    region: 'india',
    language: 'hi',
    ceremonies: ['mehendi', 'sangam', 'wedding', 'reception'],
    duration: 3,
    peakMonths: ['november', 'december', 'february', 'march']
  },
  islamic: {
    tradition: 'islamic',
    region: 'middle_east',
    language: 'ar',
    ceremonies: ['nikah', 'walima'],
    duration: 2,
    peakMonths: ['april', 'may', 'september', 'october']
  },
  jewish: {
    tradition: 'jewish',
    region: 'global',
    language: 'he',
    ceremonies: ['ceremony', 'reception'],
    duration: 1,
    peakMonths: ['may', 'june', 'september', 'october']
  },
  christian: {
    tradition: 'christian',
    region: 'global',
    language: 'en',
    ceremonies: ['ceremony', 'reception'],
    duration: 1,
    peakMonths: ['june', 'july', 'august', 'september']
  }
};

const API_VERSIONS = {
  breaking: {
    from: '2.1.0',
    to: '3.0.0',
    changes: {
      '/api/bookings': { type: 'schema_change', breaking: true },
      '/api/payments': { type: 'removed', breaking: true },
      '/api/venues': { type: 'parameter_change', breaking: true }
    }
  },
  nonBreaking: {
    from: '2.1.0',
    to: '2.2.0',
    changes: {
      '/api/photos': { type: 'new_field', breaking: false },
      '/api/timeline': { type: 'enhancement', breaking: false }
    }
  }
};

// Mock dependencies
vi.mock('@supabase/supabase-js');
vi.mock('openai');

describe('AI Version Intelligence Testing Framework', () => {
  let apiEvolution: APIEvolutionIntelligenceEngine;
  let compatibility: CompatibilityIntelligenceEngine;
  let migration: MigrationIntelligenceOrchestrator;
  let performance: PerformancePredictionEngine;
  let cultural: CulturalAPIIntelligence;
  let recommendation: VersionRecommendationAI;
  
  const mockSupabase = {
    from: vi.fn(() => ({
      select: vi.fn(() => Promise.resolve({ data: [], error: null })),
      insert: vi.fn(() => Promise.resolve({ data: {}, error: null })),
      update: vi.fn(() => Promise.resolve({ data: {}, error: null })),
      upsert: vi.fn(() => Promise.resolve({ data: {}, error: null }))
    })),
    rpc: vi.fn(() => Promise.resolve({ data: [], error: null }))
  };

  const mockOpenAI = {
    embeddings: {
      create: vi.fn(() => Promise.resolve({
        data: [{ embedding: new Array(1536).fill(0.5) }]
      }))
    },
    chat: {
      completions: {
        create: vi.fn(() => Promise.resolve({
          choices: [{ 
            message: { 
              content: JSON.stringify({ 
                compatibility: 0.85,
                breakingChanges: [],
                recommendations: []
              })
            }
          }]
        }))
      }
    }
  };

  beforeAll(() => {
    // Setup environment variables for testing
    process.env.OPENAI_API_KEY = 'test-key';
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';
  });

  beforeEach(() => {
    // Initialize AI components with mocked dependencies
    apiEvolution = new APIEvolutionIntelligenceEngine(mockSupabase as any, mockOpenAI as any);
    compatibility = new CompatibilityIntelligenceEngine(mockSupabase as any, mockOpenAI as any);
    migration = new MigrationIntelligenceOrchestrator(mockSupabase as any, mockOpenAI as any);
    performance = new PerformancePredictionEngine(mockSupabase as any, mockOpenAI as any);
    cultural = new CulturalAPIIntelligence(mockSupabase as any, mockOpenAI as any);
    recommendation = new VersionRecommendationAI(mockSupabase as any, mockOpenAI as any);

    // Reset all mocks
    vi.clearAllMocks();
  });

  describe('API Evolution Intelligence Engine', () => {
    test('should analyze API evolution with wedding industry context', async () => {
      const result = await apiEvolution.analyzeAPIEvolution(
        '123e4567-e89b-12d3-a456-426614174000',
        API_VERSIONS.breaking.from,
        API_VERSIONS.breaking.to,
        API_VERSIONS.breaking.changes
      );

      expect(result).toBeDefined();
      expect(result.compatibilityScore).toBeGreaterThanOrEqual(0);
      expect(result.compatibilityScore).toBeLessThanOrEqual(1);
      expect(result.weddingSeasonImpact).toBeGreaterThanOrEqual(0);
      expect(result.weddingSeasonImpact).toBeLessThanOrEqual(10);
      expect(result.breakingChanges).toBeInstanceOf(Array);
      expect(result.migrationStrategy).toBeDefined();
    });

    test('should handle wedding season timing correctly', async () => {
      const juneAnalysis = await apiEvolution.analyzeAPIEvolution(
        '123e4567-e89b-12d3-a456-426614174000',
        API_VERSIONS.breaking.from,
        API_VERSIONS.breaking.to,
        API_VERSIONS.breaking.changes,
        { month: 'june' } // Peak wedding season
      );

      const februaryAnalysis = await apiEvolution.analyzeAPIEvolution(
        '123e4567-e89b-12d3-a456-426614174000',
        API_VERSIONS.breaking.from,
        API_VERSIONS.breaking.to,
        API_VERSIONS.breaking.changes,
        { month: 'february' } // Off-season
      );

      // June should have higher impact due to wedding season
      expect(juneAnalysis.weddingSeasonImpact).toBeGreaterThan(februaryAnalysis.weddingSeasonImpact);
    });

    test('should predict breaking changes accurately', async () => {
      const result = await apiEvolution.predictBreakingChanges(
        '123e4567-e89b-12d3-a456-426614174000',
        '/api/bookings',
        { currentSchema: {}, proposedSchema: { newField: 'required' } }
      );

      expect(result).toBeDefined();
      expect(result.breakingProbability).toBeGreaterThanOrEqual(0);
      expect(result.breakingProbability).toBeLessThanOrEqual(1);
      expect(result.reasons).toBeInstanceOf(Array);
      expect(result.weddingIndustryImpact).toBeDefined();
    });
  });

  describe('Version Compatibility Intelligence', () => {
    test('should predict client compatibility for different supplier types', async () => {
      for (const [supplierType, supplierData] of Object.entries(WEDDING_SUPPLIERS)) {
        const result = await compatibility.predictClientCompatibility(
          '123e4567-e89b-12d3-a456-426614174000',
          supplierData.businessType,
          API_VERSIONS.breaking.from,
          API_VERSIONS.breaking.to
        );

        expect(result).toBeDefined();
        expect(result.compatibilityScore).toBeGreaterThanOrEqual(0);
        expect(result.compatibilityScore).toBeLessThanOrEqual(1);
        expect(result.riskFactors).toBeInstanceOf(Array);
        expect(result.supplierSpecificRecommendations).toBeInstanceOf(Array);
        expect(result.weddingSeasonConsiderations).toBeDefined();
      }
    });

    test('should segment clients by technical capability', async () => {
      const result = await compatibility.segmentClientsByTechnicalCapability(
        '123e4567-e89b-12d3-a456-426614174000',
        [WEDDING_SUPPLIERS.photographer, WEDDING_SUPPLIERS.venue, WEDDING_SUPPLIERS.florist]
      );

      expect(result).toBeDefined();
      expect(result.segments).toBeDefined();
      expect(result.segments.high_capability).toBeInstanceOf(Array);
      expect(result.segments.medium_capability).toBeInstanceOf(Array);
      expect(result.segments.low_capability).toBeInstanceOf(Array);
      expect(result.migrationRecommendations).toBeInstanceOf(Array);
    });

    test('should optimize gradual migration for wedding suppliers', async () => {
      const result = await compatibility.optimizeGradualMigration(
        '123e4567-e89b-12d3-a456-426614174000',
        API_VERSIONS.breaking.from,
        API_VERSIONS.breaking.to,
        {
          totalClients: 100,
          weddingSeasonStart: 'may',
          culturalConsiderations: ['christian', 'jewish']
        }
      );

      expect(result).toBeDefined();
      expect(result.phases).toBeInstanceOf(Array);
      expect(result.timeline).toBeDefined();
      expect(result.riskMitigation).toBeInstanceOf(Array);
      expect(result.weddingSeasonAlignment).toBeDefined();
    });
  });

  describe('Migration Intelligence Orchestrator', () => {
    test('should generate intelligent migration plan', async () => {
      const result = await migration.generateIntelligentMigrationPlan(
        '123e4567-e89b-12d3-a456-426614174000',
        API_VERSIONS.breaking.from,
        API_VERSIONS.breaking.to,
        {
          supplierTypes: ['photographer', 'venue', 'florist'],
          culturalRequirements: ['hindu', 'christian'],
          seasonalConstraints: { avoidMonths: ['june', 'july', 'august'] }
        }
      );

      expect(result).toBeDefined();
      expect(result.migrationPhases).toBeInstanceOf(Array);
      expect(result.culturalConsiderations).toBeInstanceOf(Array);
      expect(result.weddingSeasonTiming).toBeDefined();
      expect(result.riskAssessment).toBeDefined();
      expect(result.rollbackStrategy).toBeDefined();
    });

    test('should analyze wedding season impact', async () => {
      const result = await migration.analyzeWeddingSeasonImpact(
        '123e4567-e89b-12d3-a456-426614174000',
        {
          migrationStart: '2024-03-01',
          migrationEnd: '2024-04-15',
          supplierTypes: ['photographer', 'venue']
        }
      );

      expect(result).toBeDefined();
      expect(result.impactScore).toBeGreaterThanOrEqual(0);
      expect(result.impactScore).toBeLessThanOrEqual(10);
      expect(result.peakSeasonOverlap).toBeDefined();
      expect(result.recommendedTiming).toBeDefined();
      expect(result.alternativeWindows).toBeInstanceOf(Array);
    });

    test('should handle cultural event considerations', async () => {
      const result = await migration.considerCulturalEvents(
        '123e4567-e89b-12d3-a456-426614174000',
        {
          culturalTraditions: ['hindu', 'islamic'],
          migrationWindow: { start: '2024-02-01', end: '2024-04-01' }
        }
      );

      expect(result).toBeDefined();
      expect(result.culturalConflicts).toBeInstanceOf(Array);
      expect(result.recommendedAdjustments).toBeInstanceOf(Array);
      expect(result.alternativeTimings).toBeInstanceOf(Array);
    });
  });

  describe('Performance Prediction Engine', () => {
    test('should predict performance impact of API changes', async () => {
      const result = await performance.predictPerformanceImpact(
        '123e4567-e89b-12d3-a456-426614174000',
        API_VERSIONS.breaking.from,
        API_VERSIONS.breaking.to,
        {
          expectedTrafficIncrease: 1.5,
          weddingSeasonMultiplier: 2.0,
          supplierCount: 500
        }
      );

      expect(result).toBeDefined();
      expect(result.performanceScore).toBeGreaterThanOrEqual(0);
      expect(result.performanceScore).toBeLessThanOrEqual(1);
      expect(result.bottlenecks).toBeInstanceOf(Array);
      expect(result.weddingDayPerformance).toBeDefined();
      expect(result.scalingRecommendations).toBeInstanceOf(Array);
    });

    test('should optimize version rollout with genetic algorithm', async () => {
      const result = await performance.optimizeVersionRollout(
        '123e4567-e89b-12d3-a456-426614174000',
        {
          populationSize: 50,
          generations: 100,
          mutationRate: 0.1,
          weddingSeasonConstraints: true
        }
      );

      expect(result).toBeDefined();
      expect(result.optimalStrategy).toBeDefined();
      expect(result.performanceScore).toBeGreaterThanOrEqual(0);
      expect(result.convergenceData).toBeDefined();
      expect(result.alternativeStrategies).toBeInstanceOf(Array);
    });

    test('should handle wedding day performance requirements', async () => {
      const result = await performance.validateWeddingDayPerformance(
        '123e4567-e89b-12d3-a456-426614174000',
        {
          expectedConcurrentWeddings: 100,
          peakTrafficMultiplier: 3.0,
          performanceThreshold: 500, // ms response time
          availabilityRequirement: 0.9999 // 99.99% uptime
        }
      );

      expect(result).toBeDefined();
      expect(result.performanceValidation).toBeDefined();
      expect(result.scalingRequirements).toBeDefined();
      expect(result.failureScenarios).toBeInstanceOf(Array);
      expect(result.mitigationStrategies).toBeInstanceOf(Array);
    });
  });

  describe('Cultural API Intelligence System', () => {
    test('should analyze cultural API requirements for each tradition', async () => {
      for (const [cultureName, cultureData] of Object.entries(CULTURAL_WEDDINGS)) {
        const result = await cultural.analyzeCulturalAPIRequirements(
          '123e4567-e89b-12d3-a456-426614174000',
          cultureData.tradition,
          cultureData.region,
          '/api/ceremonies'
        );

        expect(result).toBeDefined();
        expect(result.culturalModifications).toBeDefined();
        expect(result.localizationRequirements).toBeDefined();
        expect(result.calendarConsiderations).toBeDefined();
        expect(result.ceremonyIntegrations).toBeDefined();
        expect(result.culturalValidations).toBeInstanceOf(Array);
      }
    });

    test('should generate cultural API modifications', async () => {
      const result = await cultural.generateCulturalAPIModifications(
        '123e4567-e89b-12d3-a456-426614174000',
        'hindu',
        {
          ceremonies: CULTURAL_WEDDINGS.hindu.ceremonies,
          duration: CULTURAL_WEDDINGS.hindu.duration,
          traditions: ['mehendi_ceremony', 'haldi_ceremony', 'sangam_ceremony']
        }
      );

      expect(result).toBeDefined();
      expect(result.apiEndpointModifications).toBeDefined();
      expect(result.schemaEnhancements).toBeDefined();
      expect(result.validationRules).toBeInstanceOf(Array);
      expect(result.culturalCompliance).toBeDefined();
    });

    test('should validate cultural accuracy', async () => {
      const result = await cultural.validateCulturalAccuracy(
        '123e4567-e89b-12d3-a456-426614174000',
        'islamic',
        {
          apiEndpoint: '/api/ceremonies',
          proposedModifications: {
            nikah_ceremony: { required: true },
            walima_ceremony: { optional: true }
          }
        }
      );

      expect(result).toBeDefined();
      expect(result.accuracyScore).toBeGreaterThanOrEqual(0);
      expect(result.accuracyScore).toBeLessThanOrEqual(1);
      expect(result.culturalViolations).toBeInstanceOf(Array);
      expect(result.recommendations).toBeInstanceOf(Array);
    });
  });

  describe('Version Recommendation AI', () => {
    test('should generate personalized recommendations for each supplier type', async () => {
      for (const [supplierType, supplierData] of Object.entries(WEDDING_SUPPLIERS)) {
        const result = await recommendation.generatePersonalizedVersionRecommendations(
          '123e4567-e89b-12d3-a456-426614174000',
          {
            businessType: supplierData.businessType,
            technicalCapability: supplierData.technicalCapability,
            businessSize: supplierData.size,
            weddingsPerYear: supplierData.weddingsPerYear,
            currentVersion: API_VERSIONS.breaking.from
          }
        );

        expect(result).toBeDefined();
        expect(result.recommendedVersion).toBeDefined();
        expect(result.confidenceScore).toBeGreaterThanOrEqual(0);
        expect(result.confidenceScore).toBeLessThanOrEqual(1);
        expect(result.reasoning).toBeInstanceOf(Array);
        expect(result.migrationTimeline).toBeDefined();
        expect(result.riskFactors).toBeInstanceOf(Array);
        expect(result.supportRequirements).toBeDefined();
      }
    });

    test('should handle cultural requirements in recommendations', async () => {
      const result = await recommendation.generateCulturallyAwareRecommendations(
        '123e4567-e89b-12d3-a456-426614174000',
        {
          businessType: 'photographer',
          culturalFocus: ['hindu', 'islamic'],
          region: 'global',
          currentVersion: API_VERSIONS.breaking.from
        }
      );

      expect(result).toBeDefined();
      expect(result.recommendedVersion).toBeDefined();
      expect(result.culturalCompatibility).toBeInstanceOf(Array);
      expect(result.localizationSupport).toBeDefined();
      expect(result.culturalFeatures).toBeInstanceOf(Array);
    });

    test('should update recommendations based on feedback', async () => {
      const feedbackData = {
        recommendationId: 'rec_123',
        migrationSuccessful: true,
        clientSatisfaction: 4.5,
        performanceImprovement: 0.2,
        issuesEncountered: ['minor_ui_adjustment']
      };

      const result = await recommendation.updateRecommendationsBasedOnFeedback(
        '123e4567-e89b-12d3-a456-426614174000',
        feedbackData
      );

      expect(result).toBeDefined();
      expect(result.modelUpdated).toBe(true);
      expect(result.accuracyImprovement).toBeGreaterThanOrEqual(0);
      expect(result.futureRecommendationAdjustments).toBeDefined();
    });
  });

  describe('Integration Tests', () => {
    test('should coordinate all AI systems for comprehensive analysis', async () => {
      const coordinatedAnalysis = {
        organizationId: '123e4567-e89b-12d3-a456-426614174000',
        fromVersion: API_VERSIONS.breaking.from,
        toVersion: API_VERSIONS.breaking.to,
        supplierProfile: WEDDING_SUPPLIERS.photographer,
        culturalRequirements: ['christian', 'jewish'],
        migrationConstraints: {
          avoidWeddingSeason: true,
          maxDowntime: '2 hours',
          rollbackCapability: true
        }
      };

      // Step 1: API Evolution Analysis
      const evolutionAnalysis = await apiEvolution.analyzeAPIEvolution(
        coordinatedAnalysis.organizationId,
        coordinatedAnalysis.fromVersion,
        coordinatedAnalysis.toVersion,
        API_VERSIONS.breaking.changes
      );

      // Step 2: Compatibility Assessment
      const compatibilityAssessment = await compatibility.predictClientCompatibility(
        coordinatedAnalysis.organizationId,
        coordinatedAnalysis.supplierProfile.businessType,
        coordinatedAnalysis.fromVersion,
        coordinatedAnalysis.toVersion
      );

      // Step 3: Migration Planning
      const migrationPlan = await migration.generateIntelligentMigrationPlan(
        coordinatedAnalysis.organizationId,
        coordinatedAnalysis.fromVersion,
        coordinatedAnalysis.toVersion,
        {
          supplierTypes: [coordinatedAnalysis.supplierProfile.businessType],
          culturalRequirements: coordinatedAnalysis.culturalRequirements,
          seasonalConstraints: { avoidMonths: ['june', 'july', 'august'] }
        }
      );

      // Step 4: Performance Prediction
      const performancePrediction = await performance.predictPerformanceImpact(
        coordinatedAnalysis.organizationId,
        coordinatedAnalysis.fromVersion,
        coordinatedAnalysis.toVersion,
        {
          expectedTrafficIncrease: 1.2,
          weddingSeasonMultiplier: 1.8,
          supplierCount: 1
        }
      );

      // Step 5: Cultural Analysis
      const culturalAnalysis = await Promise.all(
        coordinatedAnalysis.culturalRequirements.map(culture =>
          cultural.analyzeCulturalAPIRequirements(
            coordinatedAnalysis.organizationId,
            culture,
            'global',
            '/api/ceremonies'
          )
        )
      );

      // Step 6: Final Recommendation
      const finalRecommendation = await recommendation.generatePersonalizedVersionRecommendations(
        coordinatedAnalysis.organizationId,
        {
          businessType: coordinatedAnalysis.supplierProfile.businessType,
          technicalCapability: coordinatedAnalysis.supplierProfile.technicalCapability,
          businessSize: coordinatedAnalysis.supplierProfile.size,
          weddingsPerYear: coordinatedAnalysis.supplierProfile.weddingsPerYear,
          currentVersion: coordinatedAnalysis.fromVersion
        }
      );

      // Validate integrated results
      expect(evolutionAnalysis).toBeDefined();
      expect(compatibilityAssessment).toBeDefined();
      expect(migrationPlan).toBeDefined();
      expect(performancePrediction).toBeDefined();
      expect(culturalAnalysis).toHaveLength(2);
      expect(finalRecommendation).toBeDefined();

      // Ensure consistency across analyses
      expect(evolutionAnalysis.compatibilityScore).toBeCloseTo(
        compatibilityAssessment.compatibilityScore, 
        1
      );

      expect(migrationPlan.recommendedTimeline).toBeDefined();
      expect(finalRecommendation.migrationTimeline).toBeDefined();
    });

    test('should handle edge cases and error scenarios', async () => {
      // Test with invalid data
      const invalidResult = await apiEvolution.analyzeAPIEvolution(
        'invalid-uuid',
        'invalid.version',
        'another.invalid.version',
        {}
      );

      // Should handle gracefully without throwing
      expect(invalidResult).toBeDefined();
    });

    test('should maintain performance under load', async () => {
      const startTime = Date.now();
      
      // Run multiple concurrent analyses
      const concurrentAnalyses = Array(10).fill(null).map(() =>
        apiEvolution.analyzeAPIEvolution(
          '123e4567-e89b-12d3-a456-426614174000',
          API_VERSIONS.breaking.from,
          API_VERSIONS.breaking.to,
          API_VERSIONS.breaking.changes
        )
      );

      const results = await Promise.all(concurrentAnalyses);
      const endTime = Date.now();
      const totalTime = endTime - startTime;

      // All analyses should complete
      expect(results).toHaveLength(10);
      results.forEach(result => {
        expect(result).toBeDefined();
        expect(result.compatibilityScore).toBeGreaterThanOrEqual(0);
      });

      // Should complete within reasonable time (10 seconds for 10 analyses)
      expect(totalTime).toBeLessThan(10000);
    });
  });

  describe('Wedding Industry Specific Scenarios', () => {
    test('should handle Saturday wedding day restrictions', async () => {
      const saturdayMigration = await migration.generateIntelligentMigrationPlan(
        '123e4567-e89b-12d3-a456-426614174000',
        API_VERSIONS.breaking.from,
        API_VERSIONS.breaking.to,
        {
          supplierTypes: ['photographer'],
          blackoutDays: ['saturday'],
          emergencyRollback: true
        }
      );

      expect(saturdayMigration).toBeDefined();
      expect(saturdayMigration.weddingDayProtection).toBe(true);
      expect(saturdayMigration.rollbackStrategy.maxRollbackTime).toBeLessThan(300); // 5 minutes max
    });

    test('should prioritize venue vs supplier needs differently', async () => {
      const venueRecommendation = await recommendation.generatePersonalizedVersionRecommendations(
        '123e4567-e89b-12d3-a456-426614174000',
        WEDDING_SUPPLIERS.venue
      );

      const photographerRecommendation = await recommendation.generatePersonalizedVersionRecommendations(
        '123e4567-e89b-12d3-a456-426614174000',
        WEDDING_SUPPLIERS.photographer
      );

      expect(venueRecommendation).toBeDefined();
      expect(photographerRecommendation).toBeDefined();

      // Venues typically need more stability due to booking systems
      expect(venueRecommendation.riskTolerance).toBeLessThanOrEqual(
        photographerRecommendation.riskTolerance
      );
    });

    test('should account for peak season traffic patterns', async () => {
      const peakSeasonAnalysis = await performance.predictPerformanceImpact(
        '123e4567-e89b-12d3-a456-426614174000',
        API_VERSIONS.breaking.from,
        API_VERSIONS.breaking.to,
        {
          expectedTrafficIncrease: 1.0,
          weddingSeasonMultiplier: 5.0, // 500% increase during peak
          supplierCount: 1000
        }
      );

      expect(peakSeasonAnalysis).toBeDefined();
      expect(peakSeasonAnalysis.weddingDayPerformance.responseTime).toBeLessThan(500); // <500ms
      expect(peakSeasonAnalysis.scalingRecommendations).toContain('auto_scaling');
    });
  });
});