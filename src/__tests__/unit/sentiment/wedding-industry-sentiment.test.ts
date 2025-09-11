/**
 * SENTIMENT ANALYSIS ACCURACY TESTS: WS-236 Wedding Industry Terms
 * Team E - Batch 2, Round 1
 * 
 * Testing AI sentiment analysis accuracy for wedding industry specific:
 * - Terminology and jargon
 * - Emotional contexts
 * - Seasonal stress patterns
 * - Vendor-specific language
 * - Mixed sentiment scenarios
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { SentimentAnalyzer } from '@/lib/feedback/sentiment-analyzer';
import { WeddingTermDictionary } from '@/lib/wedding/term-dictionary';
import { OpenAIService } from '@/lib/services/openai-service';

// Mock OpenAI service
jest.mock('@/lib/services/openai-service');

interface SentimentTestCase {
  text: string;
  expectedSentiment: number; // -1.0 to 1.0
  expectedThemes: string[];
  expectedKeywords: string[];
  expectedEmotions?: string[];
  tolerance?: number; // For sentiment score matching
  context?: string;
  userType?: 'supplier' | 'couple';
  vendorType?: string;
}

interface WeddingContextualFeedback {
  feedback: string;
  context: {
    userType: 'supplier' | 'couple';
    vendorType?: string;
    weddingPhase?: string;
    seasonalContext?: string;
    stressLevel?: number;
  };
  expectedAnalysis: {
    sentiment: number;
    urgency: number;
    themes: string[];
    actionability: number;
  };
}

describe('Wedding Industry Sentiment Analysis - Core Terminology', () => {
  let sentimentAnalyzer: SentimentAnalyzer;
  let mockOpenAIService: jest.Mocked<OpenAIService>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockOpenAIService = {
      analyzeSentiment: jest.fn(),
      extractKeywords: jest.fn(),
      classifyThemes: jest.fn(),
      detectEmotions: jest.fn()
    } as any;

    sentimentAnalyzer = new SentimentAnalyzer({
      openAIService: mockOpenAIService,
      weddingIndustrySpecific: true
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Positive Wedding Industry Sentiment', () => {
    const positiveTestCases: SentimentTestCase[] = [
      {
        text: "The form builder made creating my wedding questionnaire so much easier! My couples love how organized everything is now.",
        expectedSentiment: 0.8,
        expectedThemes: ['efficiency', 'client_satisfaction', 'organization'],
        expectedKeywords: ['easier', 'love', 'organized'],
        expectedEmotions: ['joy', 'satisfaction'],
        context: 'photographer_form_builder_feedback'
      },
      {
        text: "WedSync has revolutionized my wedding planning business. I can handle twice as many couples now without stress!",
        expectedSentiment: 0.9,
        expectedThemes: ['business_growth', 'stress_reduction', 'scalability'],
        expectedKeywords: ['revolutionized', 'twice', 'without stress'],
        expectedEmotions: ['excitement', 'relief'],
        userType: 'supplier',
        vendorType: 'wedding_planner'
      },
      {
        text: "Our venue booking process is seamless now. Couples get instant confirmation and all details are perfectly organized.",
        expectedSentiment: 0.7,
        expectedThemes: ['process_optimization', 'client_experience', 'efficiency'],
        expectedKeywords: ['seamless', 'instant', 'perfectly organized'],
        userType: 'supplier',
        vendorType: 'venue'
      },
      {
        text: "I love how the timeline feature helps me coordinate all our wedding vendors. Everything flows beautifully on the big day!",
        expectedSentiment: 0.8,
        expectedThemes: ['coordination', 'wedding_day_success', 'vendor_management'],
        expectedKeywords: ['love', 'coordinate', 'flows beautifully', 'big day'],
        expectedEmotions: ['love', 'satisfaction'],
        userType: 'couple'
      },
      {
        text: "The automated email sequences have been a game changer for my photography business during peak wedding season.",
        expectedSentiment: 0.7,
        expectedThemes: ['automation', 'business_efficiency', 'seasonal_support'],
        expectedKeywords: ['game changer', 'automated', 'peak wedding season'],
        userType: 'supplier',
        vendorType: 'photographer'
      }
    ];

    positiveTestCases.forEach((testCase, index) => {
      it(`should correctly identify positive sentiment in wedding context ${index + 1}`, async () => {
        // Mock OpenAI response for positive sentiment
        mockOpenAIService.analyzeSentiment.mockResolvedValueOnce({
          sentiment: testCase.expectedSentiment,
          confidence: 0.9,
          explanation: `Positive wedding industry feedback: ${testCase.context}`
        });

        mockOpenAIService.extractKeywords.mockResolvedValueOnce(testCase.expectedKeywords);
        mockOpenAIService.classifyThemes.mockResolvedValueOnce(testCase.expectedThemes);
        if (testCase.expectedEmotions) {
          mockOpenAIService.detectEmotions.mockResolvedValueOnce(testCase.expectedEmotions);
        }

        const result = await sentimentAnalyzer.analyze(testCase.text, {
          userType: testCase.userType,
          vendorType: testCase.vendorType,
          context: testCase.context
        });

        expect(result.sentiment).toBeCloseTo(testCase.expectedSentiment, 1);
        expect(result.keywords).toEqual(expect.arrayContaining(testCase.expectedKeywords));
        expect(result.themes).toEqual(expect.arrayContaining(testCase.expectedThemes));
        
        if (testCase.expectedEmotions) {
          expect(result.emotions).toEqual(expect.arrayContaining(testCase.expectedEmotions));
        }

        // Wedding industry specific validations
        expect(result.weddingIndustryRelevance).toBeGreaterThan(0.8);
        expect(result.actionability).toBeGreaterThan(0.5);
      });
    });
  });

  describe('Negative Wedding Industry Sentiment', () => {
    const negativeTestCases: SentimentTestCase[] = [
      {
        text: "The guest management system is confusing during busy wedding season. My clients keep calling with questions and I'm overwhelmed.",
        expectedSentiment: -0.7,
        expectedThemes: ['usability_issues', 'seasonal_stress', 'client_confusion', 'overwhelm'],
        expectedKeywords: ['confusing', 'busy wedding season', 'questions', 'overwhelmed'],
        expectedEmotions: ['stress', 'frustration', 'overwhelm'],
        context: 'peak_season_stress'
      },
      {
        text: "I'm losing clients because the RSVP system keeps crashing during peak months. This is costing me bookings and reputation.",
        expectedSentiment: -0.9,
        expectedThemes: ['technical_failures', 'business_impact', 'reputation_damage', 'financial_loss'],
        expectedKeywords: ['losing clients', 'crashing', 'peak months', 'costing', 'reputation'],
        expectedEmotions: ['anger', 'concern', 'frustration'],
        userType: 'supplier'
      },
      {
        text: "The form builder is too complicated for my small floral business. I spend more time figuring it out than creating arrangements.",
        expectedSentiment: -0.6,
        expectedThemes: ['complexity_issues', 'small_business_struggles', 'time_waste'],
        expectedKeywords: ['complicated', 'small floral business', 'figuring it out', 'arrangements'],
        userType: 'supplier',
        vendorType: 'florist'
      },
      {
        text: "Our wedding vendors can't figure out how to use the collaboration features. It's creating more work instead of less.",
        expectedSentiment: -0.5,
        expectedThemes: ['vendor_adoption_issues', 'workflow_disruption', 'increased_workload'],
        expectedKeywords: ['can\'t figure out', 'collaboration features', 'more work'],
        userType: 'couple'
      },
      {
        text: "The mobile app crashes every time I try to check my timeline during venue visits. So embarrassing in front of clients.",
        expectedSentiment: -0.8,
        expectedThemes: ['mobile_technical_issues', 'professional_embarrassment', 'client_facing_problems'],
        expectedKeywords: ['crashes', 'timeline', 'venue visits', 'embarrassing', 'clients'],
        expectedEmotions: ['embarrassment', 'frustration', 'anxiety']
      }
    ];

    negativeTestCases.forEach((testCase, index) => {
      it(`should correctly identify negative sentiment in wedding context ${index + 1}`, async () => {
        mockOpenAIService.analyzeSentiment.mockResolvedValueOnce({
          sentiment: testCase.expectedSentiment,
          confidence: 0.85,
          explanation: `Negative wedding industry feedback identifying specific pain points`
        });

        mockOpenAIService.extractKeywords.mockResolvedValueOnce(testCase.expectedKeywords);
        mockOpenAIService.classifyThemes.mockResolvedValueOnce(testCase.expectedThemes);
        mockOpenAIService.detectEmotions.mockResolvedValueOnce(testCase.expectedEmotions || ['frustration']);

        const result = await sentimentAnalyzer.analyze(testCase.text, {
          userType: testCase.userType,
          vendorType: testCase.vendorType,
          context: testCase.context
        });

        expect(result.sentiment).toBeCloseTo(testCase.expectedSentiment, 1);
        expect(result.keywords).toEqual(expect.arrayContaining(testCase.expectedKeywords));
        expect(result.themes).toEqual(expect.arrayContaining(testCase.expectedThemes));
        expect(result.emotions).toEqual(expect.arrayContaining(testCase.expectedEmotions || ['frustration']));

        // Negative feedback should have high actionability for improvement
        expect(result.actionability).toBeGreaterThan(0.7);
        expect(result.urgencyLevel).toBeGreaterThan(0.5);
      });
    });
  });

  describe('Mixed Sentiment Wedding Scenarios', () => {
    const mixedSentimentCases: SentimentTestCase[] = [
      {
        text: "I love the timeline feature for wedding planning, but the venue coordination module needs major improvements. It's frustrating when trying to sync multiple vendors.",
        expectedSentiment: 0.1, // Slightly positive overall
        expectedThemes: ['feature_satisfaction', 'improvement_needed', 'vendor_coordination_issues'],
        expectedKeywords: ['love', 'timeline', 'major improvements', 'frustrating', 'sync vendors'],
        expectedEmotions: ['love', 'frustration'],
        context: 'mixed_feature_feedback'
      },
      {
        text: "The guest list management works great for small weddings, but becomes slow and buggy with 200+ guests. Need better performance for large events.",
        expectedSentiment: 0.2,
        expectedThemes: ['scalability_issues', 'performance_problems', 'size_limitations'],
        expectedKeywords: ['works great', 'small weddings', 'slow', 'buggy', '200+ guests', 'large events'],
        context: 'scalability_feedback'
      },
      {
        text: "WedSync has some fantastic features that save time, but the learning curve is steep for busy wedding season. More tutorials would help.",
        expectedSentiment: 0.3,
        expectedThemes: ['feature_appreciation', 'learning_curve_issues', 'seasonal_challenges', 'training_needs'],
        expectedKeywords: ['fantastic features', 'save time', 'steep', 'busy wedding season', 'tutorials'],
        context: 'learning_curve_feedback'
      }
    ];

    mixedSentimentCases.forEach((testCase, index) => {
      it(`should correctly handle mixed sentiment in wedding context ${index + 1}`, async () => {
        mockOpenAIService.analyzeSentiment.mockResolvedValueOnce({
          sentiment: testCase.expectedSentiment,
          confidence: 0.75,
          explanation: 'Mixed sentiment with both positive and negative elements',
          sentimentBreakdown: {
            positive: 0.6,
            negative: 0.4,
            neutral: 0.0
          }
        });

        mockOpenAIService.extractKeywords.mockResolvedValueOnce(testCase.expectedKeywords);
        mockOpenAIService.classifyThemes.mockResolvedValueOnce(testCase.expectedThemes);
        mockOpenAIService.detectEmotions.mockResolvedValueOnce(testCase.expectedEmotions || ['mixed']);

        const result = await sentimentAnalyzer.analyze(testCase.text, {
          userType: testCase.userType,
          context: testCase.context
        });

        expect(result.sentiment).toBeCloseTo(testCase.expectedSentiment, 1);
        expect(result.sentimentBreakdown).toBeDefined();
        expect(result.sentimentBreakdown.positive).toBeGreaterThan(0);
        expect(result.sentimentBreakdown.negative).toBeGreaterThan(0);

        // Mixed sentiment should identify specific improvement areas
        expect(result.improvementAreas).toBeDefined();
        expect(result.improvementAreas.length).toBeGreaterThan(0);
        expect(result.positiveAspects).toBeDefined();
        expect(result.positiveAspects.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Wedding Season Context Awareness', () => {
    const seasonalContextCases: WeddingContextualFeedback[] = [
      {
        feedback: "System is running slow during peak wedding bookings. Every minute counts when couples are making decisions.",
        context: {
          userType: 'supplier',
          vendorType: 'venue',
          seasonalContext: 'peak_wedding_season',
          stressLevel: 0.9
        },
        expectedAnalysis: {
          sentiment: -0.6,
          urgency: 0.9, // High urgency during peak season
          themes: ['performance_issues', 'seasonal_stress', 'time_critical'],
          actionability: 0.8
        }
      },
      {
        feedback: "Love having time to explore new features during the quiet winter months. Finally got the automation set up perfectly!",
        context: {
          userType: 'supplier',
          vendorType: 'photographer',
          seasonalContext: 'off_season',
          stressLevel: 0.2
        },
        expectedAnalysis: {
          sentiment: 0.8,
          urgency: 0.2, // Low urgency during off-season
          themes: ['feature_exploration', 'automation_success', 'seasonal_opportunity'],
          actionability: 0.4
        }
      },
      {
        feedback: "The mobile app keeps crashing right when I need to show couples our venue during peak booking season. This is critical!",
        context: {
          userType: 'supplier',
          vendorType: 'venue',
          seasonalContext: 'peak_wedding_season',
          stressLevel: 0.8
        },
        expectedAnalysis: {
          sentiment: -0.9,
          urgency: 0.95, // Critical during peak season
          themes: ['mobile_critical_failure', 'client_facing_issues', 'peak_season_crisis'],
          actionability: 0.9
        }
      }
    ];

    seasonalContextCases.forEach((testCase, index) => {
      it(`should adjust sentiment analysis based on wedding season context ${index + 1}`, async () => {
        mockOpenAIService.analyzeSentiment.mockResolvedValueOnce({
          sentiment: testCase.expectedAnalysis.sentiment,
          confidence: 0.9,
          contextualFactors: {
            seasonalStress: testCase.context.stressLevel,
            urgencyMultiplier: testCase.expectedAnalysis.urgency,
            weddingIndustryRelevance: 0.95
          }
        });

        mockOpenAIService.classifyThemes.mockResolvedValueOnce(testCase.expectedAnalysis.themes);

        const result = await sentimentAnalyzer.analyze(testCase.feedback, {
          userType: testCase.context.userType,
          vendorType: testCase.context.vendorType,
          seasonalContext: testCase.context.seasonalContext,
          stressLevel: testCase.context.stressLevel
        });

        expect(result.sentiment).toBeCloseTo(testCase.expectedAnalysis.sentiment, 1);
        expect(result.urgencyLevel).toBeCloseTo(testCase.expectedAnalysis.urgency, 1);
        expect(result.themes).toEqual(expect.arrayContaining(testCase.expectedAnalysis.themes));
        expect(result.actionability).toBeCloseTo(testCase.expectedAnalysis.actionability, 1);

        // Seasonal context should be properly identified
        expect(result.seasonalContext).toBe(testCase.context.seasonalContext);
        expect(result.stressLevelImpact).toBeDefined();
      });
    });
  });

  describe('Vendor-Specific Language Recognition', () => {
    const vendorSpecificCases = [
      {
        vendorType: 'photographer',
        feedback: "The client gallery feature is amazing for delivering wedding photos. Couples love the easy sharing and download options.",
        expectedTerms: ['client gallery', 'wedding photos', 'sharing', 'download'],
        expectedThemes: ['photo_delivery', 'client_satisfaction', 'sharing_workflow'],
        expectedSentiment: 0.8
      },
      {
        vendorType: 'florist',
        feedback: "Inventory tracking for wedding florals is complicated. Hard to manage seasonal availability and arrangement quantities.",
        expectedTerms: ['inventory tracking', 'wedding florals', 'seasonal availability', 'arrangement quantities'],
        expectedThemes: ['inventory_management', 'seasonal_challenges', 'quantity_tracking'],
        expectedSentiment: -0.5
      },
      {
        vendorType: 'wedding_planner',
        feedback: "The timeline builder helps coordinate all vendors seamlessly. From ceremony setup to reception breakdown, everything flows perfectly.",
        expectedTerms: ['timeline builder', 'coordinate vendors', 'ceremony setup', 'reception breakdown'],
        expectedThemes: ['coordination', 'timeline_management', 'event_flow'],
        expectedSentiment: 0.9
      },
      {
        vendorType: 'venue',
        feedback: "Booking management system works well, but we need better floor plan integration for seating arrangements and catering setup.",
        expectedTerms: ['booking management', 'floor plan', 'seating arrangements', 'catering setup'],
        expectedThemes: ['booking_system', 'floor_planning', 'venue_logistics'],
        expectedSentiment: 0.3
      },
      {
        vendorType: 'caterer',
        feedback: "Menu planning and dietary restriction tracking could be more intuitive. Couples often change their minds about guest counts.",
        expectedTerms: ['menu planning', 'dietary restrictions', 'guest counts'],
        expectedThemes: ['menu_management', 'dietary_tracking', 'guest_count_changes'],
        expectedSentiment: -0.2
      },
      {
        vendorType: 'dj',
        feedback: "Music request management is fantastic! Couples can add songs directly and I can see their preferences in real-time.",
        expectedTerms: ['music request', 'songs', 'preferences', 'real-time'],
        expectedThemes: ['music_management', 'client_interaction', 'real_time_updates'],
        expectedSentiment: 0.8
      }
    ];

    vendorSpecificCases.forEach((testCase) => {
      it(`should recognize ${testCase.vendorType} specific language and context`, async () => {
        mockOpenAIService.analyzeSentiment.mockResolvedValueOnce({
          sentiment: testCase.expectedSentiment,
          confidence: 0.85,
          vendorTypeRelevance: 0.9
        });

        mockOpenAIService.extractKeywords.mockResolvedValueOnce(testCase.expectedTerms);
        mockOpenAIService.classifyThemes.mockResolvedValueOnce(testCase.expectedThemes);

        const result = await sentimentAnalyzer.analyze(testCase.feedback, {
          userType: 'supplier',
          vendorType: testCase.vendorType
        });

        expect(result.sentiment).toBeCloseTo(testCase.expectedSentiment, 1);
        expect(result.keywords).toEqual(expect.arrayContaining(testCase.expectedTerms));
        expect(result.themes).toEqual(expect.arrayContaining(testCase.expectedThemes));
        expect(result.vendorTypeRelevance).toBeGreaterThan(0.8);
        expect(result.industrySpecificTerms).toEqual(expect.arrayContaining(testCase.expectedTerms));
      });
    });
  });

  describe('Couple vs Supplier Perspective Recognition', () => {
    const perspectiveTestCases = [
      {
        text: "Our wedding planner is amazing at keeping us organized, but the vendor coordination through WedSync could be smoother.",
        userType: 'couple' as const,
        expectedPerspective: 'couple_managing_vendors',
        expectedThemes: ['vendor_coordination', 'planning_support', 'process_improvement'],
        expectedSentiment: 0.4
      },
      {
        text: "My couples love the timeline feature, but I spend too much time explaining how to use the vendor collaboration tools.",
        userType: 'supplier' as const,
        expectedPerspective: 'supplier_training_clients',
        expectedThemes: ['client_satisfaction', 'training_burden', 'tool_complexity'],
        expectedSentiment: 0.2
      },
      {
        text: "Being able to see our wedding timeline updated in real-time by all our vendors is so reassuring during planning.",
        userType: 'couple' as const,
        expectedPerspective: 'couple_vendor_transparency',
        expectedThemes: ['transparency', 'real_time_updates', 'planning_confidence'],
        expectedSentiment: 0.8
      }
    ];

    perspectiveTestCases.forEach((testCase, index) => {
      it(`should recognize ${testCase.userType} perspective in feedback ${index + 1}`, async () => {
        mockOpenAIService.analyzeSentiment.mockResolvedValueOnce({
          sentiment: testCase.expectedSentiment,
          confidence: 0.8,
          userPerspective: testCase.expectedPerspective
        });

        mockOpenAIService.classifyThemes.mockResolvedValueOnce(testCase.expectedThemes);

        const result = await sentimentAnalyzer.analyze(testCase.text, {
          userType: testCase.userType
        });

        expect(result.sentiment).toBeCloseTo(testCase.expectedSentiment, 1);
        expect(result.themes).toEqual(expect.arrayContaining(testCase.expectedThemes));
        expect(result.userPerspective).toBe(testCase.expectedPerspective);
        expect(result.stakeholderType).toBe(testCase.userType);
      });
    });
  });

  describe('Emotional Context and Stress Detection', () => {
    const emotionalContextCases = [
      {
        feedback: "I'm so stressed trying to coordinate 15 vendors for this Saturday's wedding. The system crashed twice today!",
        expectedEmotions: ['stress', 'anxiety', 'frustration'],
        expectedStressLevel: 0.9,
        expectedUrgency: 0.95,
        context: 'wedding_week_crisis'
      },
      {
        feedback: "Finally had time to set up all my wedding packages properly. Everything is working beautifully now!",
        expectedEmotions: ['relief', 'satisfaction', 'joy'],
        expectedStressLevel: 0.1,
        expectedUrgency: 0.2,
        context: 'peaceful_setup'
      },
      {
        feedback: "Getting nervous about our venue walkthrough tomorrow. Hope the timeline features work properly in front of the couple.",
        expectedEmotions: ['nervousness', 'anxiety', 'hope'],
        expectedStressLevel: 0.6,
        expectedUrgency: 0.7,
        context: 'pre_meeting_anxiety'
      },
      {
        feedback: "Three couples just booked after seeing our streamlined process! WedSync is helping us stand out from competitors.",
        expectedEmotions: ['excitement', 'pride', 'confidence'],
        expectedStressLevel: 0.1,
        expectedUrgency: 0.2,
        context: 'business_success'
      }
    ];

    emotionalContextCases.forEach((testCase, index) => {
      it(`should accurately detect emotional context and stress levels ${index + 1}`, async () => {
        mockOpenAIService.detectEmotions.mockResolvedValueOnce(testCase.expectedEmotions);
        mockOpenAIService.analyzeSentiment.mockResolvedValueOnce({
          sentiment: testCase.expectedStressLevel > 0.7 ? -0.6 : 0.7,
          confidence: 0.9,
          emotionalIntensity: testCase.expectedStressLevel,
          stressIndicators: testCase.expectedStressLevel
        });

        const result = await sentimentAnalyzer.analyze(testCase.feedback, {
          context: testCase.context
        });

        expect(result.emotions).toEqual(expect.arrayContaining(testCase.expectedEmotions));
        expect(result.stressLevel).toBeCloseTo(testCase.expectedStressLevel, 1);
        expect(result.urgencyLevel).toBeCloseTo(testCase.expectedUrgency, 1);
        expect(result.emotionalIntensity).toBeGreaterThan(0.5);
      });
    });
  });

  describe('Industry Jargon and Technical Terms', () => {
    const jargonTestCases = [
      {
        text: "RSVP tracking, guest list management, and seating chart integration work seamlessly together.",
        expectedJargon: ['RSVP tracking', 'guest list management', 'seating chart integration'],
        expectedTechnicalLevel: 0.8,
        context: 'wedding_tech_functionality'
      },
      {
        text: "Our day-of timeline, vendor load-in schedule, and reception timeline sync perfectly with all coordinators.",
        expectedJargon: ['day-of timeline', 'vendor load-in', 'reception timeline', 'coordinators'],
        expectedTechnicalLevel: 0.9,
        context: 'wedding_logistics'
      },
      {
        text: "Ceremony processional, cocktail hour flow, and reception entrance coordination are all managed in one place.",
        expectedJargon: ['ceremony processional', 'cocktail hour', 'reception entrance'],
        expectedTechnicalLevel: 0.7,
        context: 'wedding_ceremony_flow'
      }
    ];

    jargonTestCases.forEach((testCase, index) => {
      it(`should recognize wedding industry jargon and technical terms ${index + 1}`, async () => {
        mockOpenAIService.extractKeywords.mockResolvedValueOnce(testCase.expectedJargon);
        mockOpenAIService.analyzeSentiment.mockResolvedValueOnce({
          sentiment: 0.7,
          confidence: 0.85,
          technicalComplexity: testCase.expectedTechnicalLevel,
          industryJargonLevel: testCase.expectedTechnicalLevel
        });

        const result = await sentimentAnalyzer.analyze(testCase.text, {
          context: testCase.context
        });

        expect(result.keywords).toEqual(expect.arrayContaining(testCase.expectedJargon));
        expect(result.technicalComplexity).toBeCloseTo(testCase.expectedTechnicalLevel, 1);
        expect(result.industryJargonLevel).toBeCloseTo(testCase.expectedTechnicalLevel, 1);
        expect(result.weddingIndustryRelevance).toBeGreaterThan(0.8);
      });
    });
  });

  describe('Sentiment Analysis Performance and Accuracy', () => {
    it('should maintain high accuracy across multiple wedding feedback samples', async () => {
      const testSamples = [
        { text: "Love this platform!", expected: 0.8 },
        { text: "Terrible user experience", expected: -0.8 },
        { text: "It's okay, nothing special", expected: 0.1 },
        { text: "Amazing wedding planning tool!", expected: 0.9 },
        { text: "Confusing interface during busy season", expected: -0.6 }
      ];

      const results = [];
      for (const sample of testSamples) {
        mockOpenAIService.analyzeSentiment.mockResolvedValueOnce({
          sentiment: sample.expected,
          confidence: 0.9
        });

        const result = await sentimentAnalyzer.analyze(sample.text);
        results.push({
          expected: sample.expected,
          actual: result.sentiment,
          accuracy: Math.abs(sample.expected - result.sentiment) < 0.2
        });
      }

      const accuracy = results.filter(r => r.accuracy).length / results.length;
      expect(accuracy).toBeGreaterThan(0.8); // 80%+ accuracy threshold
    });

    it('should handle edge cases gracefully', async () => {
      const edgeCases = [
        '', // Empty string
        '   ', // Whitespace only
        '!@#$%^&*()', // Special characters only
        'a'.repeat(1000), // Very long text
        'Wedding' // Single word
      ];

      for (const edgeCase of edgeCases) {
        mockOpenAIService.analyzeSentiment.mockResolvedValueOnce({
          sentiment: 0.0,
          confidence: 0.1,
          warning: 'Edge case handled'
        });

        const result = await sentimentAnalyzer.analyze(edgeCase);
        
        expect(result.sentiment).toBeDefined();
        expect(result.sentiment).toBeGreaterThanOrEqual(-1.0);
        expect(result.sentiment).toBeLessThanOrEqual(1.0);
        expect(result.confidence).toBeDefined();
      });
    });

    it('should provide confidence scores for reliability assessment', async () => {
      const testFeedback = "The wedding timeline feature is mostly good but has some issues.";

      mockOpenAIService.analyzeSentiment.mockResolvedValueOnce({
        sentiment: 0.2,
        confidence: 0.7,
        uncertaintyFactors: ['mixed_sentiment', 'subjective_language']
      });

      const result = await sentimentAnalyzer.analyze(testFeedback);

      expect(result.confidence).toBeDefined();
      expect(result.confidence).toBeGreaterThan(0.0);
      expect(result.confidence).toBeLessThanOrEqual(1.0);
      
      // Lower confidence for mixed/ambiguous sentiment
      expect(result.confidence).toBeLessThan(0.9);
      expect(result.uncertaintyFactors).toBeDefined();
    });
  });
});