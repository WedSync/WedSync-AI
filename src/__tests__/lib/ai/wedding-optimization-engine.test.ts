/**
 * Comprehensive AI Wedding Optimization Engine Test Suite - WS-341 Team B
 *
 * Complete testing suite for AI-powered wedding optimization system including:
 * - Wedding optimization engine testing
 * - ML recommendation system validation
 * - Budget optimization AI verification
 * - Vendor matching algorithm tests
 * - Timeline optimization validation
 * - Personalization engine testing
 * - API endpoint integration tests
 * - Performance benchmarking
 * - Edge case handling
 * - Error scenario testing
 *
 * Team B - Backend Development - 2025-01-25
 */

import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
  jest,
  beforeAll,
  afterAll,
} from '@jest/globals';
import { WeddingOptimizationEngine } from '@/lib/ai/wedding-optimization-engine';
import { MLRecommendationSystem } from '@/lib/ai/ml-recommendation-system';
import { BudgetOptimizationAI } from '@/lib/ai/budget-optimization-ai';
import { VendorMatchingAlgorithm } from '@/lib/ai/vendor-matching-algorithm';
import { TimelineOptimizationAI } from '@/lib/ai/timeline-optimization-ai';
import { PersonalizationEngine } from '@/lib/ai/personalization-engine';
import type {
  WeddingContext,
  OptimizationRequest,
  OptimizationResult,
  AIRecommendation,
  WeddingBudget,
  VendorCriteria,
  WeddingTimeline,
  OptimizationFeedback,
  UserInteraction,
  BehaviorPattern,
  PersonalizationScore,
} from '@/lib/ai/types';

// ====================================================================
// TEST DATA AND MOCKS
// ====================================================================

const mockWeddingContext: WeddingContext = {
  weddingId: 'test-wedding-123',
  coupleId: 'test-couple-456',
  weddingDate: new Date('2024-06-15'),
  location: 'London, UK',
  guestCount: 120,
  style: 'modern',
  budget: {
    total: 25000,
    allocations: {
      venue: 8000,
      catering: 6000,
      photography: 3000,
      flowers: 2000,
      music: 1500,
      other: 4500,
    },
    priorities: ['venue', 'photography', 'catering'],
    constraints: ['no_alcohol', 'vegetarian_options'],
  },
  timeline: {
    weddingDate: new Date('2024-06-15'),
    tasks: [
      {
        id: '1',
        name: 'Book venue',
        status: 'completed',
        dueDate: new Date('2024-01-15'),
      },
      {
        id: '2',
        name: 'Hire photographer',
        status: 'in_progress',
        dueDate: new Date('2024-02-15'),
      },
      {
        id: '3',
        name: 'Order flowers',
        status: 'pending',
        dueDate: new Date('2024-05-15'),
      },
    ],
    dependencies: [{ taskId: '3', dependsOn: ['1'] }],
    constraints: ['weekend_only', 'daytime_preferred'],
    coupleAvailability: {
      saturday: true,
      sunday: true,
      weekday: false,
    },
    vendorRequirements: {
      venue: { setupTime: 4, breakdownTime: 2 },
      catering: { setupTime: 2, breakdownTime: 1 },
    },
  },
  preferences: [
    {
      category: 'photography',
      importance: 0.9,
      details: { style: 'candid', package: 'full_day' },
    },
    {
      category: 'venue',
      importance: 0.8,
      details: { type: 'outdoor', capacity: '100-150' },
    },
    {
      category: 'catering',
      importance: 0.7,
      details: { type: 'buffet', dietary: 'vegetarian' },
    },
  ],
  currentVendors: [
    { id: 'v1', type: 'venue', name: 'Garden Lodge', booked: true },
    { id: 'v2', type: 'photographer', name: 'Snapshot Studios', booked: false },
  ],
  planningProgress: 0.4,
  coupleProfile: {
    averageAge: 28,
    previousExperience: false,
    personalityTraits: {
      detail_oriented: 0.8,
      budget_conscious: 0.7,
      modern: 0.9,
      social: 0.6,
    },
  },
};

const mockOptimizationRequest: OptimizationRequest = {
  id: 'opt-test-123',
  type: 'comprehensive',
  priority: 'high',
  context: mockWeddingContext,
  budget: mockWeddingContext.budget,
  timeline: mockWeddingContext.timeline,
  vendorCriteria: {
    budget: 15000,
    location: 'London, UK',
    weddingDate: new Date('2024-06-15'),
    preferences: { style: 'modern', quality: 'premium' },
    requirements: ['insured', 'experienced', 'portfolio'],
    couplePersonality: { detail_oriented: 0.8, modern: 0.9 },
    weddingStyle: 'modern',
  },
  constraints: ['no_smoking', 'accessible_venue'],
  preferences: mockWeddingContext.preferences,
};

const mockBudget: WeddingBudget = {
  total: 30000,
  allocations: {
    venue: 10000,
    catering: 8000,
    photography: 4000,
    flowers: 2500,
    music: 2000,
    decor: 1500,
    other: 2000,
  },
  priorities: ['venue', 'catering', 'photography'],
  constraints: ['max_venue_50_percent', 'emergency_fund_10_percent'],
  weddingType: 'garden_party',
  guestCount: 100,
  location: 'countryside',
  seasonality: 'summer',
};

const mockVendorCriteria: VendorCriteria = {
  budget: 12000,
  location: 'Manchester, UK',
  weddingDate: new Date('2024-08-10'),
  preferences: {
    style: 'rustic',
    experience: 'minimum_5_years',
    portfolio: 'outdoor_weddings',
  },
  requirements: ['liability_insurance', 'backup_equipment', 'references'],
  couplePersonality: {
    traditional: 0.7,
    detail_oriented: 0.6,
    quality_focused: 0.8,
  },
  weddingStyle: 'rustic',
};

const mockTimeline: WeddingTimeline = {
  weddingDate: new Date('2024-09-21'),
  tasks: [
    {
      id: 't1',
      name: 'Book venue',
      status: 'pending',
      dueDate: new Date('2024-03-21'),
      priority: 'high',
    },
    {
      id: 't2',
      name: 'Send invitations',
      status: 'pending',
      dueDate: new Date('2024-07-21'),
      priority: 'medium',
    },
    {
      id: 't3',
      name: 'Final headcount',
      status: 'pending',
      dueDate: new Date('2024-09-07'),
      priority: 'high',
    },
  ],
  dependencies: [
    { taskId: 't2', dependsOn: ['t1'] },
    { taskId: 't3', dependsOn: ['t2'] },
  ],
  constraints: ['venue_availability', 'vendor_schedules'],
  coupleAvailability: {
    weekends: true,
    evenings: true,
    mornings: false,
  },
  vendorRequirements: {
    photographer: { arrival: 2, duration: 8 },
    caterer: { setup: 3, service: 5, cleanup: 2 },
  },
};

// Mock external services
jest.mock('@supabase/supabase-js');
jest.mock('openai');

// ====================================================================
// AI ENGINE CONFIGURATION
// ====================================================================

const mockAIConfig = {
  openaiApiKey: 'test-key',
  mlConfig: {
    modelVersion: 'test-v1',
    updateFrequency: 'daily',
    confidenceThreshold: 0.8,
  },
  budgetConfig: {
    maxSavingsTarget: 0.3,
    minQualityThreshold: 0.8,
    industryBenchmarks: true,
  },
  vendorConfig: {
    matchingAlgorithm: 'ensemble',
    personalityWeighting: 0.3,
    emergencyFallback: true,
  },
  timelineConfig: {
    bufferDays: 7,
    criticalPathOptimization: true,
    seasonalAdjustments: true,
  },
  personalizationConfig: {
    learningRate: 0.1,
    memoryWindow: 90,
    adaptationThreshold: 0.3,
    confidenceThreshold: 0.6,
  },
};

// ====================================================================
// TEST SUITES
// ====================================================================

describe('AI Wedding Optimization Engine - Comprehensive Test Suite', () => {
  let optimizationEngine: WeddingOptimizationEngine;
  let mlSystem: MLRecommendationSystem;
  let budgetAI: BudgetOptimizationAI;
  let vendorMatcher: VendorMatchingAlgorithm;
  let timelineAI: TimelineOptimizationAI;
  let personalizationEngine: PersonalizationEngine;

  beforeAll(() => {
    // Set up test environment
    process.env.OPENAI_API_KEY = 'test-key';
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key';
  });

  beforeEach(() => {
    // Initialize AI components
    optimizationEngine = new WeddingOptimizationEngine(mockAIConfig);
    mlSystem = new MLRecommendationSystem(mockAIConfig.mlConfig);
    budgetAI = new BudgetOptimizationAI(mockAIConfig.budgetConfig);
    vendorMatcher = new VendorMatchingAlgorithm(mockAIConfig.vendorConfig);
    timelineAI = new TimelineOptimizationAI(mockAIConfig.timelineConfig);
    personalizationEngine = new PersonalizationEngine(
      mockAIConfig.personalizationConfig,
    );

    // Clear all mocks
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // ====================================================================
  // WEDDING OPTIMIZATION ENGINE TESTS
  // ====================================================================

  describe('Wedding Optimization Engine', () => {
    it('should initialize with correct configuration', () => {
      expect(optimizationEngine).toBeDefined();
      expect(optimizationEngine).toBeInstanceOf(WeddingOptimizationEngine);
    });

    it('should optimize complete wedding plan within performance requirements', async () => {
      const startTime = Date.now();
      const result = await optimizationEngine.optimizeWeddingPlan(
        mockOptimizationRequest,
      );
      const processingTime = Date.now() - startTime;

      expect(processingTime).toBeLessThan(10000); // <10 seconds
      expect(result.status).toBe('completed');
      expect(result.qualityScore).toBeGreaterThan(0.85); // Quality threshold
      expect(result.recommendations).toBeDefined();
      expect(Array.isArray(result.recommendations)).toBe(true);
      expect(result.recommendations.length).toBeGreaterThan(3);
      expect(result.potentialSavings).toBeGreaterThanOrEqual(0);
      expect(result.confidence).toBeGreaterThan(0.7);
    });

    it('should handle budget optimization correctly', async () => {
      const budgetRequest = {
        ...mockOptimizationRequest,
        type: 'budget' as const,
      };
      const result =
        await optimizationEngine.optimizeWeddingPlan(budgetRequest);

      expect(result.budgetOptimization).toBeDefined();
      expect(result.budgetOptimization!.totalSavings).toBeGreaterThanOrEqual(0);
      expect(result.budgetOptimization!.optimizedAllocations).toBeDefined();
      expect(result.budgetOptimization!.qualityMaintained).toBe(true);

      // Verify budget optimization achieves minimum savings
      const savingsPercentage =
        result.budgetOptimization!.totalSavings / mockBudget.total;
      expect(savingsPercentage).toBeGreaterThanOrEqual(0.15); // At least 15% savings
    });

    it('should generate high-quality vendor matches', async () => {
      const vendorRequest = {
        ...mockOptimizationRequest,
        type: 'vendor' as const,
      };
      const result =
        await optimizationEngine.optimizeVendorSelection(mockVendorCriteria);

      expect(result.matches).toBeDefined();
      expect(result.matches.length).toBeGreaterThanOrEqual(3);

      result.matches.forEach((match) => {
        expect(match.compatibilityScore).toBeGreaterThan(0.7); // High compatibility
        expect(match.vendor).toBeDefined();
        expect(match.vendor.verified).toBe(true);
        expect(match.explanations).toBeDefined();
        expect(match.explanations.length).toBeGreaterThan(0);
        expect(match.personalityMatch).toBeGreaterThan(0.6);
      });

      expect(result.averageCompatibility).toBeGreaterThan(0.75);
    });

    it('should optimize timeline without conflicts', async () => {
      const timelineRequest = {
        ...mockOptimizationRequest,
        type: 'timeline' as const,
      };
      const result = await optimizationEngine.optimizeTimeline(mockTimeline);

      expect(result.conflicts).toBeDefined();
      expect(result.conflicts.length).toBeLessThanOrEqual(1); // Minimal conflicts
      expect(result.criticalPath).toBeDefined();
      expect(result.bufferDays).toBeGreaterThanOrEqual(5);

      // Verify all tasks are scheduled before wedding date
      expect(
        result.optimizedSchedule.every(
          (task) => new Date(task.scheduledDate) <= mockTimeline.weddingDate,
        ),
      ).toBe(true);

      // Verify critical path optimization
      expect(result.criticalPath.length).toBeGreaterThan(0);
      expect(result.timelineEfficiency).toBeGreaterThan(0.8);
    });

    it('should handle emergency optimization rapidly', async () => {
      const crisis = {
        id: 'crisis-test-1',
        type: 'vendor_cancellation' as const,
        severity: 'high' as const,
        weddingDate: new Date('2024-05-20'),
        location: 'London',
        affectedVendors: ['photographer-123'],
        availableBudget: 3000,
        minimumRequirements: ['portfolio', 'availability', 'insurance'],
        timeToWedding: 45,
        description: 'Wedding photographer cancelled due to emergency',
      };

      const startTime = Date.now();
      const result = await optimizationEngine.handleCrisisOptimization(crisis);
      const responseTime = Date.now() - startTime;

      expect(responseTime).toBeLessThan(15000); // <15 seconds for crisis
      expect(result.solutions).toBeDefined();
      expect(result.solutions.length).toBeGreaterThanOrEqual(3);
      expect(result.alternativeVendors).toBeDefined();
      expect(result.alternativeVendors.length).toBeGreaterThanOrEqual(3);
      expect(result.actionPlan).toBeDefined();
      expect(result.actionPlan.immediateActions).toBeDefined();
      expect(result.actionPlan.immediateActions.length).toBeGreaterThan(0);
      expect(result.riskAssessment).toBeDefined();
      expect(result.riskAssessment.overallRisk).toBeLessThan(0.5);
    });

    it('should learn from optimization feedback', async () => {
      const feedback: OptimizationFeedback = {
        optimizationId: 'opt-123',
        recommendationId: 'rec-456',
        type: 'vendor_match',
        category: 'photography',
        rating: 5,
        outcome: 'accepted',
        userComments:
          'Perfect match! Photographer understood our style perfectly.',
        satisfactionScore: 0.95,
        actualSavings: 500,
        coupleId: 'couple-123',
        timestamp: new Date(),
      };

      await expect(
        optimizationEngine.learnFromFeedback(feedback),
      ).resolves.not.toThrow();

      // Verify learning occurred (this would typically check internal state)
      // In a real implementation, you might verify database updates or model adjustments
    });

    it('should generate personalized recommendations', async () => {
      const recommendations =
        await optimizationEngine.generateRecommendations(mockWeddingContext);

      expect(recommendations).toBeDefined();
      expect(Array.isArray(recommendations)).toBe(true);
      expect(recommendations.length).toBeGreaterThanOrEqual(5);

      recommendations.forEach((rec) => {
        expect(rec.confidence).toBeGreaterThan(0.6);
        expect(rec.personalizedReasoning).toBeDefined();
        expect(rec.personalizedReasoning.length).toBeGreaterThan(10); // Meaningful explanation
        expect(rec.implementationSteps).toBeDefined();
        expect(rec.implementationSteps.length).toBeGreaterThan(0);
        expect(rec.potentialImpact).toBeGreaterThan(0);
        expect(rec.category).toBeDefined();
        expect(rec.title).toBeDefined();
        expect(rec.summary).toBeDefined();
      });
    });
  });

  // ====================================================================
  // ML RECOMMENDATION SYSTEM TESTS
  // ====================================================================

  describe('ML Recommendation System', () => {
    it('should score recommendations accurately', async () => {
      const mockRecommendation: AIRecommendation = {
        id: 'rec-test-1',
        title: 'Budget-Friendly Photography Package',
        category: 'photography',
        summary: 'High-quality photography at 30% less cost',
        description:
          'Professional wedding photography with experienced photographer',
        confidence: 0.85,
        potentialSavings: 1200,
        implementationSteps: [
          'Research photographer portfolio',
          'Schedule consultation call',
          'Negotiate package details',
          'Sign contract and pay deposit',
        ],
        benefits: ['Cost savings', 'Professional quality', 'Full day coverage'],
        priority: 'high',
        personalizedReasoning:
          'Matches your budget-conscious and quality-focused preferences',
        tags: ['photography', 'budget-friendly', 'professional'],
        implementationTime: 'medium',
        difficultyLevel: 'easy',
      };

      const score = await mlSystem.scoreRecommendation(
        mockRecommendation,
        mockWeddingContext,
      );

      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(1);
      expect(score).toBeGreaterThan(0.6); // Should be reasonably high for good match
    });

    it('should predict budget optimization accurately', async () => {
      const prediction = await mlSystem.predictBudgetOptimization(mockBudget);

      expect(prediction).toBeDefined();
      expect(prediction.optimizedAllocations).toBeDefined();
      expect(prediction.potentialSavings).toBeGreaterThanOrEqual(0);
      expect(prediction.confidence).toBeGreaterThan(0.7);
      expect(prediction.riskFactors).toBeDefined();
      expect(Array.isArray(prediction.riskFactors)).toBe(true);
      expect(prediction.recommendations).toBeDefined();
      expect(Array.isArray(prediction.recommendations)).toBe(true);
    });

    it('should predict vendor compatibility with high accuracy', async () => {
      const mockCoupleProfile = {
        coupleId: 'couple-123',
        personalityTraits: { traditional: 0.8, detail_oriented: 0.7 },
        preferences: { style: 'classic', formality: 'formal' },
        communicationStyle: 'detailed',
        budgetBehavior: 'careful',
      };

      const mockVendorProfile = {
        vendorId: 'vendor-456',
        personalityTraits: { professional: 0.9, detail_oriented: 0.8 },
        workingStyle: 'thorough',
        communicationStyle: 'detailed',
        specialties: ['classic_weddings', 'formal_events'],
        experience: 8,
      };

      const compatibility = await mlSystem.predictVendorCompatibility(
        mockCoupleProfile,
        mockVendorProfile,
      );

      expect(compatibility).toBeDefined();
      expect(compatibility.overallCompatibility).toBeGreaterThan(0.7); // Good match
      expect(compatibility.styleMatch).toBeGreaterThan(0.6);
      expect(compatibility.personalityMatch).toBeGreaterThan(0.6);
      expect(compatibility.communicationStyle).toBeGreaterThan(0.8); // Both detailed
      expect(compatibility.confidenceLevel).toBeGreaterThan(0.7);
      expect(compatibility.reasoningFactors).toBeDefined();
      expect(Array.isArray(compatibility.reasoningFactors)).toBe(true);
    });

    it('should predict timeline success probability', async () => {
      const prediction = await mlSystem.predictTimelineSuccess(mockTimeline);

      expect(prediction).toBeDefined();
      expect(prediction.successProbability).toBeGreaterThanOrEqual(0);
      expect(prediction.successProbability).toBeLessThanOrEqual(1);
      expect(prediction.potentialConflicts).toBeDefined();
      expect(Array.isArray(prediction.potentialConflicts)).toBe(true);
      expect(prediction.optimizationSuggestions).toBeDefined();
      expect(Array.isArray(prediction.optimizationSuggestions)).toBe(true);
      expect(prediction.riskFactors).toBeDefined();
      expect(prediction.criticalPath).toBeDefined();
      expect(prediction.bufferRecommendations).toBeDefined();
    });

    it('should update models from feedback correctly', async () => {
      const feedback: OptimizationFeedback = {
        optimizationId: 'opt-123',
        recommendationId: 'rec-456',
        type: 'budget_optimization',
        category: 'venue',
        rating: 4,
        outcome: 'accepted',
        userComments: 'Good savings but had to compromise on some features',
        satisfactionScore: 0.75,
        coupleId: 'couple-123',
        timestamp: new Date(),
      };

      await expect(
        mlSystem.updateFromFeedback(feedback),
      ).resolves.not.toThrow();
    });
  });

  // ====================================================================
  // BUDGET OPTIMIZATION AI TESTS
  // ====================================================================

  describe('Budget Optimization AI', () => {
    it('should optimize budget while maintaining quality', async () => {
      const optimization = await budgetAI.optimizeBudget({
        totalBudget: mockBudget.total,
        currentAllocations: mockBudget.allocations,
        priorities: mockBudget.priorities,
        constraints: mockBudget.constraints,
        weddingType: mockBudget.weddingType!,
        guestCount: mockBudget.guestCount!,
        location: mockBudget.location!,
        seasonality: mockBudget.seasonality!,
      });

      expect(optimization).toBeDefined();
      expect(optimization.totalSavings).toBeGreaterThan(0);
      expect(optimization.optimizedAllocations).toBeDefined();
      expect(optimization.qualityMaintained).toBe(true);
      expect(optimization.savingsBreakdown).toBeDefined();
      expect(optimization.riskAnalysis).toBeDefined();
      expect(optimization.implementationPlan).toBeDefined();

      // Verify optimized allocations don't exceed total budget
      const totalOptimized = Object.values(
        optimization.optimizedAllocations,
      ).reduce((sum, amount) => sum + amount, 0);
      expect(totalOptimized).toBeLessThanOrEqual(mockBudget.total);

      // Verify priority categories are protected
      mockBudget.priorities.forEach((priority) => {
        const originalAmount = mockBudget.allocations[priority] || 0;
        const optimizedAmount =
          optimization.optimizedAllocations[priority] || 0;
        const reduction = (originalAmount - optimizedAmount) / originalAmount;
        expect(reduction).toBeLessThan(0.2); // Max 20% reduction in priority categories
      });
    });

    it('should generate seasonal optimizations', async () => {
      const summerOptimizations = await budgetAI.generateSeasonalOptimizations({
        currentBudget: mockBudget,
        weddingDate: new Date('2024-07-15'), // Summer
        location: 'garden_venue',
      });

      expect(summerOptimizations).toBeDefined();
      expect(Array.isArray(summerOptimizations.optimizations)).toBe(true);
      expect(summerOptimizations.seasonalFactors).toBeDefined();
      expect(summerOptimizations.potentialSavings).toBeGreaterThanOrEqual(0);

      // Summer should have specific optimizations
      const hasOutdoorOptimizations = summerOptimizations.optimizations.some(
        (opt) =>
          opt.description.toLowerCase().includes('outdoor') ||
          opt.description.toLowerCase().includes('garden'),
      );
      expect(hasOutdoorOptimizations).toBe(true);
    });

    it('should calculate accurate savings breakdown', async () => {
      const savingsBreakdown = await budgetAI.calculateSavingsBreakdown({
        originalBudget: mockBudget.allocations,
        optimizedBudget: {
          venue: 7500, // Reduced from 10000
          catering: 7000, // Reduced from 8000
          photography: 4000, // Same
          flowers: 2000, // Reduced from 2500
          music: 1800, // Reduced from 2000
          decor: 1200, // Reduced from 1500
          other: 1500, // Reduced from 2000
        },
        optimizationStrategies: [
          'venue_negotiation',
          'seasonal_flowers',
          'diy_decor',
        ],
      });

      expect(savingsBreakdown).toBeDefined();
      expect(savingsBreakdown.totalSavings).toBe(5000); // 30000 - 25000
      expect(savingsBreakdown.categoryBreakdown).toBeDefined();
      expect(savingsBreakdown.strategyBreakdown).toBeDefined();
      expect(savingsBreakdown.qualityImpactAnalysis).toBeDefined();
      expect(savingsBreakdown.riskAssessment).toBeDefined();
    });

    it('should handle budget constraints correctly', async () => {
      const constrainedBudget = {
        ...mockBudget,
        constraints: [
          'venue_max_40_percent',
          'emergency_fund_15_percent',
          'no_debt',
        ],
      };

      const optimization = await budgetAI.optimizeBudget({
        totalBudget: constrainedBudget.total,
        currentAllocations: constrainedBudget.allocations,
        priorities: constrainedBudget.priorities,
        constraints: constrainedBudget.constraints,
        weddingType: constrainedBudget.weddingType!,
        guestCount: constrainedBudget.guestCount!,
        location: constrainedBudget.location!,
        seasonality: constrainedBudget.seasonality!,
      });

      // Verify venue constraint (max 40% of total budget)
      const venueAmount = optimization.optimizedAllocations.venue;
      const venuePercentage = venueAmount / constrainedBudget.total;
      expect(venuePercentage).toBeLessThanOrEqual(0.4);

      // Verify emergency fund constraint (15% reserved)
      const totalAllocated = Object.values(
        optimization.optimizedAllocations,
      ).reduce((sum, amount) => sum + amount, 0);
      const emergencyFund = constrainedBudget.total - totalAllocated;
      const emergencyPercentage = emergencyFund / constrainedBudget.total;
      expect(emergencyPercentage).toBeGreaterThanOrEqual(0.15);
    });
  });

  // ====================================================================
  // VENDOR MATCHING ALGORITHM TESTS
  // ====================================================================

  describe('Vendor Matching Algorithm', () => {
    it('should find optimal vendors with high compatibility', async () => {
      const matches =
        await vendorMatcher.findOptimalVendors(mockVendorCriteria);

      expect(matches).toBeDefined();
      expect(matches.matches).toBeDefined();
      expect(Array.isArray(matches.matches)).toBe(true);
      expect(matches.matches.length).toBeGreaterThanOrEqual(3);
      expect(matches.averageCompatibility).toBeGreaterThan(0.7);

      matches.matches.forEach((match) => {
        expect(match.compatibilityScore).toBeGreaterThan(0.6);
        expect(match.vendor).toBeDefined();
        expect(match.vendor.verified).toBe(true);
        expect(match.personalityMatch).toBeGreaterThanOrEqual(0);
        expect(match.personalityMatch).toBeLessThanOrEqual(1);
        expect(match.styleAlignment).toBeGreaterThanOrEqual(0);
        expect(match.styleAlignment).toBeLessThanOrEqual(1);
        expect(match.explanations).toBeDefined();
        expect(Array.isArray(match.explanations)).toBe(true);
        expect(match.explanations.length).toBeGreaterThan(0);
      });
    });

    it('should calculate accurate personality matches', async () => {
      const couplePersonality = {
        detail_oriented: 0.9,
        traditional: 0.7,
        quality_focused: 0.8,
        budget_conscious: 0.4,
      };

      const vendorPersonality = {
        detail_oriented: 0.8,
        professional: 0.9,
        traditional: 0.6,
        client_focused: 0.8,
      };

      const personalityMatch = await vendorMatcher.calculatePersonalityMatch(
        couplePersonality,
        vendorPersonality,
      );

      expect(personalityMatch).toBeGreaterThanOrEqual(0);
      expect(personalityMatch).toBeLessThanOrEqual(1);
      expect(personalityMatch).toBeGreaterThan(0.6); // Good alignment on detail_oriented and traditional
    });

    it('should find emergency alternatives quickly', async () => {
      const emergencyCriteria = {
        crisisType: 'vendor_cancellation',
        location: 'Birmingham, UK',
        date: new Date('2024-04-10'), // Short notice
        budget: 2500,
        requirements: ['immediate_availability', 'experience', 'insurance'],
      };

      const startTime = Date.now();
      const alternatives =
        await vendorMatcher.findEmergencyAlternatives(emergencyCriteria);
      const responseTime = Date.now() - startTime;

      expect(responseTime).toBeLessThan(5000); // <5 seconds for emergency
      expect(alternatives).toBeDefined();
      expect(Array.isArray(alternatives)).toBe(true);
      expect(alternatives.length).toBeGreaterThanOrEqual(2);

      alternatives.forEach((vendor) => {
        expect(vendor.availability).toBeDefined();
        expect(vendor.emergencyCapable).toBe(true);
        expect(vendor.verified).toBe(true);
        expect(vendor.responseTime).toBeLessThan(24); // Hours
      });
    });

    it('should handle style compatibility correctly', async () => {
      const rusticCriteria = {
        ...mockVendorCriteria,
        weddingStyle: 'rustic',
        preferences: {
          style: 'rustic',
          atmosphere: 'relaxed',
          setting: 'outdoor',
        },
      };

      const matches = await vendorMatcher.findOptimalVendors(rusticCriteria);

      // Verify style-appropriate matches
      matches.matches.forEach((match) => {
        expect(match.styleAlignment).toBeGreaterThan(0.6);
        expect(
          match.vendor.specialties?.includes('rustic') ||
            match.vendor.specialties?.includes('outdoor') ||
            match.styleAlignment > 0.7,
        ).toBe(true);
      });
    });

    it('should provide meaningful match explanations', async () => {
      const matches =
        await vendorMatcher.findOptimalVendors(mockVendorCriteria);

      matches.matches.forEach((match) => {
        expect(match.explanations).toBeDefined();
        expect(Array.isArray(match.explanations)).toBe(true);
        expect(match.explanations.length).toBeGreaterThan(0);

        match.explanations.forEach((explanation) => {
          expect(typeof explanation).toBe('string');
          expect(explanation.length).toBeGreaterThan(10); // Meaningful explanation
          expect(
            explanation.includes('personality') ||
              explanation.includes('style') ||
              explanation.includes('experience') ||
              explanation.includes('budget') ||
              explanation.includes('location'),
          ).toBe(true);
        });
      });
    });
  });

  // ====================================================================
  // TIMELINE OPTIMIZATION AI TESTS
  // ====================================================================

  describe('Timeline Optimization AI', () => {
    it('should optimize timeline without creating conflicts', async () => {
      const optimization = await timelineAI.optimizeTimeline({
        weddingDate: mockTimeline.weddingDate,
        currentTasks: mockTimeline.tasks,
        dependencies: mockTimeline.dependencies,
        constraints: mockTimeline.constraints,
        coupleAvailability: mockTimeline.coupleAvailability,
        vendorRequirements: mockTimeline.vendorRequirements,
      });

      expect(optimization).toBeDefined();
      expect(optimization.conflicts).toBeDefined();
      expect(Array.isArray(optimization.conflicts)).toBe(true);
      expect(optimization.conflicts.length).toBeLessThanOrEqual(1); // Minimal conflicts
      expect(optimization.criticalPath).toBeDefined();
      expect(Array.isArray(optimization.criticalPath)).toBe(true);
      expect(optimization.optimizedSchedule).toBeDefined();
      expect(Array.isArray(optimization.optimizedSchedule)).toBe(true);
      expect(optimization.bufferDays).toBeGreaterThanOrEqual(5);
      expect(optimization.timelineEfficiency).toBeGreaterThan(0.75);
    });

    it('should calculate critical path accurately', async () => {
      const criticalPath = await timelineAI.calculateCriticalPath(
        mockTimeline.tasks,
        mockTimeline.dependencies,
      );

      expect(criticalPath).toBeDefined();
      expect(Array.isArray(criticalPath)).toBe(true);
      expect(criticalPath.length).toBeGreaterThan(0);

      // Verify critical path includes high-priority tasks
      const criticalTaskIds = criticalPath.map((task) => task.id);
      const highPriorityTask = mockTimeline.tasks.find(
        (task) => task.priority === 'high',
      );
      if (highPriorityTask) {
        expect(criticalTaskIds).toContain(highPriorityTask.id);
      }

      // Verify dependencies are respected in critical path
      criticalPath.forEach((task) => {
        const taskDependencies = mockTimeline.dependencies.filter(
          (dep) => dep.taskId === task.id,
        );
        taskDependencies.forEach((dependency) => {
          const dependentTaskIndex = criticalPath.findIndex((t) =>
            dependency.dependsOn.includes(t.id),
          );
          const currentTaskIndex = criticalPath.findIndex(
            (t) => t.id === task.id,
          );
          if (dependentTaskIndex !== -1) {
            expect(dependentTaskIndex).toBeLessThan(currentTaskIndex);
          }
        });
      });
    });

    it('should identify and resolve timeline conflicts', async () => {
      const conflictingTimeline = {
        ...mockTimeline,
        tasks: [
          ...mockTimeline.tasks,
          {
            id: 't4',
            name: 'Venue visit',
            status: 'pending',
            dueDate: new Date('2024-03-21'),
            priority: 'high',
          },
        ],
        dependencies: [
          ...mockTimeline.dependencies,
          { taskId: 't4', dependsOn: ['t1'] }, // Same due date as t1
        ],
      };

      const conflicts = await timelineAI.identifyConflicts(conflictingTimeline);

      expect(conflicts).toBeDefined();
      expect(Array.isArray(conflicts)).toBe(true);

      if (conflicts.length > 0) {
        conflicts.forEach((conflict) => {
          expect(conflict.type).toBeDefined();
          expect(conflict.description).toBeDefined();
          expect(conflict.affectedTasks).toBeDefined();
          expect(Array.isArray(conflict.affectedTasks)).toBe(true);
          expect(conflict.severity).toBeDefined();
          expect(['low', 'medium', 'high', 'critical']).toContain(
            conflict.severity,
          );
          expect(conflict.suggestedResolution).toBeDefined();
        });
      }
    });

    it('should generate realistic buffer recommendations', async () => {
      const buffers = await timelineAI.calculateOptimalBuffers(mockTimeline, {
        riskFactors: ['weather_dependent', 'vendor_coordination'],
        timeToWedding: 180, // days
        complexityScore: 0.7,
      });

      expect(buffers).toBeDefined();
      expect(buffers.taskBuffers).toBeDefined();
      expect(buffers.overallBuffer).toBeGreaterThanOrEqual(5);
      expect(buffers.overallBuffer).toBeLessThanOrEqual(30);

      Object.values(buffers.taskBuffers).forEach((buffer) => {
        expect(buffer).toBeGreaterThanOrEqual(1);
        expect(buffer).toBeLessThanOrEqual(14); // Reasonable task buffer
      });
    });

    it('should handle seasonal adjustments', async () => {
      const winterWedding = {
        ...mockTimeline,
        weddingDate: new Date('2024-12-20'), // Winter
      };

      const optimization = await timelineAI.optimizeTimeline({
        weddingDate: winterWedding.weddingDate,
        currentTasks: winterWedding.tasks,
        dependencies: winterWedding.dependencies,
        constraints: [...winterWedding.constraints, 'weather_contingency'],
        coupleAvailability: winterWedding.coupleAvailability,
        vendorRequirements: winterWedding.vendorRequirements,
      });

      expect(optimization.seasonalAdjustments).toBeDefined();
      expect(optimization.bufferDays).toBeGreaterThan(7); // More buffer for winter
      expect(optimization.weatherContingencies).toBeDefined();
      expect(Array.isArray(optimization.weatherContingencies)).toBe(true);
    });
  });

  // ====================================================================
  // PERSONALIZATION ENGINE TESTS
  // ====================================================================

  describe('Personalization Engine', () => {
    it('should score recommendations for users accurately', async () => {
      const mockRecommendation: AIRecommendation = {
        id: 'rec-personal-1',
        title: 'Personalized Venue Recommendation',
        category: 'venue',
        summary: 'Outdoor garden venue perfect for modern weddings',
        description: 'Beautiful outdoor venue with modern amenities',
        confidence: 0.8,
        potentialSavings: 2000,
        implementationSteps: [
          'Visit venue',
          'Check availability',
          'Sign contract',
        ],
        benefits: ['Cost effective', 'Perfect style match', 'Great reviews'],
        priority: 'high',
        personalizedReasoning:
          'Matches your modern style and outdoor preferences',
        tags: ['outdoor', 'modern', 'garden'],
        implementationTime: 'medium',
      };

      const score = await personalizationEngine.scoreForUser(
        mockRecommendation,
        'couple-123',
      );

      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(1);
      expect(typeof score).toBe('number');
    });

    it('should generate meaningful recommendation explanations', async () => {
      const mockRecommendation: AIRecommendation = {
        id: 'rec-explain-1',
        title: 'Budget Photography Package',
        category: 'photography',
        summary: 'Professional photography at 25% savings',
        description: 'Experienced photographer offering discounted rates',
        confidence: 0.75,
        potentialSavings: 800,
        implementationSteps: [
          'Review portfolio',
          'Meet photographer',
          'Book package',
        ],
        benefits: [
          'Cost savings',
          'Professional quality',
          'Flexible scheduling',
        ],
        priority: 'medium',
        tags: ['photography', 'budget-friendly'],
        implementationTime: 'short',
      };

      const explanation = await personalizationEngine.explainRecommendation(
        mockRecommendation,
        mockWeddingContext,
      );

      expect(explanation).toBeDefined();
      expect(typeof explanation).toBe('string');
      expect(explanation.length).toBeGreaterThan(20);
      expect(
        explanation.includes('personalized') ||
          explanation.includes('preference') ||
          explanation.includes('style') ||
          explanation.includes('budget') ||
          explanation.includes('wedding'),
      ).toBe(true);
    });

    it('should update personalization from user interactions', async () => {
      const mockInteractions: UserInteraction[] = [
        {
          id: 'int-1',
          userId: 'couple-123',
          type: 'detailed_research',
          action: 'viewed_vendor_details',
          context: { category: 'photography', vendor: 'pro-photos' },
          timestamp: new Date(),
          trigger: 'search_results',
        },
        {
          id: 'int-2',
          userId: 'couple-123',
          type: 'budget_focus',
          action: 'filtered_by_price',
          context: { category: 'venue', maxBudget: 8000 },
          timestamp: new Date(),
          trigger: 'budget_constraint',
        },
      ];

      await expect(
        personalizationEngine.updatePersonalization(
          'couple-123',
          mockInteractions,
        ),
      ).resolves.not.toThrow();
    });

    it('should incorporate feedback for learning', async () => {
      const feedback: OptimizationFeedback = {
        optimizationId: 'opt-456',
        recommendationId: 'rec-789',
        type: 'vendor_match',
        category: 'photography',
        rating: 4,
        outcome: 'accepted',
        userComments: 'Great photographer but slightly over budget',
        satisfactionScore: 0.8,
        coupleId: 'couple-123',
        timestamp: new Date(),
      };

      await expect(
        personalizationEngine.incorporateFeedback(feedback),
      ).resolves.not.toThrow();
    });

    it('should generate actionable personalization insights', async () => {
      const insights =
        await personalizationEngine.generatePersonalizationInsights(
          'couple-123',
        );

      expect(insights).toBeDefined();
      expect(Array.isArray(insights)).toBe(true);

      insights.forEach((insight) => {
        expect(insight.id).toBeDefined();
        expect(insight.coupleId).toBe('couple-123');
        expect(insight.type).toBeDefined();
        expect([
          'preference_discovery',
          'behavior_change',
          'personality_insight',
          'social_influence',
        ]).toContain(insight.type);
        expect(insight.insight).toBeDefined();
        expect(typeof insight.insight).toBe('string');
        expect(insight.insight.length).toBeGreaterThan(20);
        expect(insight.confidence).toBeGreaterThanOrEqual(0);
        expect(insight.confidence).toBeLessThanOrEqual(1);
        expect(insight.actionable).toBeDefined();
        expect(typeof insight.actionable).toBe('boolean');
        expect(insight.recommendations).toBeDefined();
        expect(Array.isArray(insight.recommendations)).toBe(true);
      });
    });
  });

  // ====================================================================
  // PERFORMANCE AND STRESS TESTS
  // ====================================================================

  describe('Performance and Scalability Tests', () => {
    it('should handle concurrent optimization requests', async () => {
      const concurrentRequests = Array.from({ length: 5 }, (_, i) => ({
        ...mockOptimizationRequest,
        id: `concurrent-opt-${i}`,
        context: {
          ...mockOptimizationRequest.context,
          weddingId: `wedding-${i}`,
        },
      }));

      const startTime = Date.now();
      const results = await Promise.all(
        concurrentRequests.map((request) =>
          optimizationEngine.optimizeWeddingPlan(request),
        ),
      );
      const totalTime = Date.now() - startTime;

      expect(results).toHaveLength(5);
      expect(totalTime).toBeLessThan(15000); // <15 seconds for 5 concurrent requests

      results.forEach((result) => {
        expect(result.status).toBe('completed');
        expect(result.qualityScore).toBeGreaterThan(0.7);
      });
    });

    it('should maintain performance with large wedding contexts', async () => {
      const largeContext = {
        ...mockWeddingContext,
        guestCount: 300,
        preferences: Array.from({ length: 20 }, (_, i) => ({
          category: `category-${i}`,
          importance: Math.random(),
          details: { preference: `value-${i}` },
        })),
        timeline: {
          ...mockWeddingContext.timeline,
          tasks: Array.from({ length: 50 }, (_, i) => ({
            id: `task-${i}`,
            name: `Task ${i}`,
            status: 'pending',
            dueDate: new Date(Date.now() + i * 24 * 60 * 60 * 1000),
            priority: i % 3 === 0 ? 'high' : i % 2 === 0 ? 'medium' : 'low',
          })),
        },
      };

      const largeRequest = {
        ...mockOptimizationRequest,
        context: largeContext,
      };

      const startTime = Date.now();
      const result = await optimizationEngine.optimizeWeddingPlan(largeRequest);
      const processingTime = Date.now() - startTime;

      expect(processingTime).toBeLessThan(20000); // <20 seconds for large context
      expect(result.status).toBe('completed');
      expect(result.qualityScore).toBeGreaterThan(0.7);
    });
  });

  // ====================================================================
  // ERROR HANDLING AND EDGE CASES
  // ====================================================================

  describe('Error Handling and Edge Cases', () => {
    it('should handle invalid wedding context gracefully', async () => {
      const invalidContext = {
        ...mockWeddingContext,
        weddingDate: new Date('invalid-date'),
        guestCount: -1,
        budget: {
          total: -1000,
          allocations: {},
          priorities: [],
          constraints: [],
        },
      };

      const invalidRequest = {
        ...mockOptimizationRequest,
        context: invalidContext,
      };

      // Should either fix the context or handle the error gracefully
      try {
        const result =
          await optimizationEngine.optimizeWeddingPlan(invalidRequest);
        // If it succeeds, verify it fixed the issues
        expect(result.status).toBeDefined();
      } catch (error) {
        // If it fails, verify it's a meaningful error
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toBeDefined();
      }
    });

    it('should handle empty or minimal wedding contexts', async () => {
      const minimalContext: WeddingContext = {
        weddingId: 'minimal-wedding',
        coupleId: 'minimal-couple',
        weddingDate: new Date('2024-08-15'),
        location: 'Unknown',
        guestCount: 50,
        style: 'simple',
        budget: {
          total: 5000,
          allocations: {},
          priorities: [],
          constraints: [],
        },
        timeline: {
          weddingDate: new Date('2024-08-15'),
          tasks: [],
          dependencies: [],
          constraints: [],
          coupleAvailability: {},
          vendorRequirements: {},
        },
        preferences: [],
        currentVendors: [],
        planningProgress: 0,
        coupleProfile: {
          averageAge: 25,
          previousExperience: false,
          personalityTraits: {},
        },
      };

      const minimalRequest = {
        ...mockOptimizationRequest,
        context: minimalContext,
      };

      const result =
        await optimizationEngine.optimizeWeddingPlan(minimalRequest);

      expect(result).toBeDefined();
      expect(result.status).toBeDefined();
      // Should provide basic recommendations even with minimal context
      expect(result.recommendations).toBeDefined();
      expect(result.recommendations.length).toBeGreaterThan(0);
    });

    it('should handle budget optimization with zero budget', async () => {
      const zeroBudget = {
        ...mockBudget,
        total: 0,
        allocations: {},
      };

      try {
        const optimization = await budgetAI.optimizeBudget({
          totalBudget: zeroBudget.total,
          currentAllocations: zeroBudget.allocations,
          priorities: zeroBudget.priorities,
          constraints: zeroBudget.constraints,
          weddingType: zeroBudget.weddingType!,
          guestCount: zeroBudget.guestCount!,
          location: zeroBudget.location!,
          seasonality: zeroBudget.seasonality!,
        });

        // Should either provide free/DIY recommendations or handle gracefully
        expect(optimization).toBeDefined();
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toContain('budget');
      }
    });

    it('should handle timeline with impossible constraints', async () => {
      const impossibleTimeline = {
        ...mockTimeline,
        weddingDate: new Date('2024-03-01'), // Past date or very soon
        tasks: [
          {
            id: 't1',
            name: 'Book venue',
            status: 'pending',
            dueDate: new Date('2024-02-28'),
            priority: 'high',
          },
          {
            id: 't2',
            name: 'Send invitations',
            status: 'pending',
            dueDate: new Date('2024-02-20'),
            priority: 'high',
          },
        ],
      };

      const optimization = await timelineAI.optimizeTimeline({
        weddingDate: impossibleTimeline.weddingDate,
        currentTasks: impossibleTimeline.tasks,
        dependencies: impossibleTimeline.dependencies,
        constraints: impossibleTimeline.constraints,
        coupleAvailability: impossibleTimeline.coupleAvailability,
        vendorRequirements: impossibleTimeline.vendorRequirements,
      });

      // Should identify critical issues and suggest alternatives
      expect(optimization.conflicts).toBeDefined();
      expect(optimization.conflicts.length).toBeGreaterThan(0);
      expect(optimization.emergencyRecommendations).toBeDefined();
    });
  });

  // ====================================================================
  // INTEGRATION TESTS
  // ====================================================================

  describe('System Integration Tests', () => {
    it('should integrate all AI components seamlessly', async () => {
      // Test complete workflow with all AI components working together
      const startTime = Date.now();

      // 1. Generate recommendations
      const recommendations =
        await optimizationEngine.generateRecommendations(mockWeddingContext);

      // 2. Optimize budget
      const budgetOptimization =
        await optimizationEngine.optimizeBudgetAllocation(
          mockWeddingContext.budget,
        );

      // 3. Find vendors
      const vendorMatches =
        await optimizationEngine.optimizeVendorSelection(mockVendorCriteria);

      // 4. Optimize timeline
      const timelineOptimization =
        await optimizationEngine.optimizeTimeline(mockTimeline);

      // 5. Full optimization
      const fullOptimization = await optimizationEngine.optimizeWeddingPlan(
        mockOptimizationRequest,
      );

      const totalTime = Date.now() - startTime;

      // Verify all components worked
      expect(recommendations).toBeDefined();
      expect(recommendations.length).toBeGreaterThan(0);
      expect(budgetOptimization).toBeDefined();
      expect(budgetOptimization.totalSavings).toBeGreaterThanOrEqual(0);
      expect(vendorMatches).toBeDefined();
      expect(vendorMatches.matches.length).toBeGreaterThan(0);
      expect(timelineOptimization).toBeDefined();
      expect(timelineOptimization.criticalPath).toBeDefined();
      expect(fullOptimization).toBeDefined();
      expect(fullOptimization.status).toBe('completed');

      // Performance check
      expect(totalTime).toBeLessThan(30000); // <30 seconds for full integration test
    });

    it('should maintain data consistency across components', async () => {
      const result = await optimizationEngine.optimizeWeddingPlan(
        mockOptimizationRequest,
      );

      // Verify budget consistency
      if (result.budgetOptimization) {
        const totalOptimized = Object.values(
          result.budgetOptimization.optimizedAllocations,
        ).reduce((sum, amount) => sum + amount, 0);
        expect(
          totalOptimized + result.budgetOptimization.totalSavings,
        ).toBeCloseTo(mockWeddingContext.budget.total, 0);
      }

      // Verify timeline consistency
      if (result.timelineOptimization) {
        result.timelineOptimization.optimizedSchedule.forEach((task) => {
          expect(new Date(task.scheduledDate)).toBeLessThanOrEqual(
            mockWeddingContext.weddingDate,
          );
        });
      }

      // Verify recommendation consistency
      result.recommendations.forEach((rec) => {
        expect(rec.confidence).toBeGreaterThanOrEqual(0);
        expect(rec.confidence).toBeLessThanOrEqual(1);
        if (rec.potentialSavings) {
          expect(rec.potentialSavings).toBeGreaterThanOrEqual(0);
        }
      });
    });
  });
});

// ====================================================================
// TEST UTILITIES AND HELPERS
// ====================================================================

/**
 * Helper function to create mock AI recommendation
 */
function createMockRecommendation(
  overrides: Partial<AIRecommendation> = {},
): AIRecommendation {
  return {
    id: 'mock-rec-' + Date.now(),
    title: 'Mock Recommendation',
    category: 'general',
    summary: 'A mock recommendation for testing',
    description: 'Detailed description of the mock recommendation',
    confidence: 0.8,
    potentialSavings: 500,
    implementationSteps: ['Step 1', 'Step 2', 'Step 3'],
    benefits: ['Benefit 1', 'Benefit 2'],
    priority: 'medium',
    personalizedReasoning: 'This matches your preferences',
    tags: ['test', 'mock'],
    implementationTime: 'medium',
    difficultyLevel: 'easy',
    ...overrides,
  };
}

/**
 * Helper function to create mock wedding context with variations
 */
function createMockWeddingContext(
  overrides: Partial<WeddingContext> = {},
): WeddingContext {
  return {
    ...mockWeddingContext,
    ...overrides,
  };
}

/**
 * Helper function to wait for async operations in tests
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Helper function to validate optimization result structure
 */
function validateOptimizationResult(result: OptimizationResult): void {
  expect(result.id).toBeDefined();
  expect(result.type).toBeDefined();
  expect(result.status).toBeDefined();
  expect(['processing', 'completed', 'failed']).toContain(result.status);
  expect(result.processingTime).toBeGreaterThan(0);
  expect(result.qualityScore).toBeGreaterThanOrEqual(0);
  expect(result.qualityScore).toBeLessThanOrEqual(1);
  expect(result.recommendations).toBeDefined();
  expect(Array.isArray(result.recommendations)).toBe(true);
  expect(result.confidence).toBeGreaterThanOrEqual(0);
  expect(result.confidence).toBeLessThanOrEqual(1);
}
