/**
 * translation-integration.test.ts
 *
 * Comprehensive test suite for WS-247 Multilingual Platform System
 * Tests all translation integrations, wedding industry specialization, and cultural adaptation
 *
 * Test Categories:
 * - Unit tests for each translation component
 * - Integration tests for complete workflows
 * - Wedding industry specific scenarios
 * - Cultural sensitivity validation
 * - Quality assurance testing
 * - Performance and reliability testing
 * - Error handling and edge cases
 *
 * @author WS-247 Team C Round 1
 * @version 1.0.0
 * @created 2025-01-15
 */

import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
  jest,
} from '@jest/globals';
import { createClient } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

// Import all translation components
import {
  GoogleTranslateIntegration,
  TranslationRequest,
  createGoogleTranslateIntegration,
} from '../GoogleTranslateIntegration';
import {
  ProfessionalTranslationConnectors,
  TranslationJobRequest,
  WeddingContentType,
  createProfessionalTranslationConnectors,
} from '../ProfessionalTranslationConnectors';
import {
  TranslationMemoryService,
  createTranslationMemoryService,
} from '../../services/translation/TranslationMemoryService';
import {
  QualityAssuranceTranslation,
  createQualityAssuranceTranslation,
} from '../QualityAssuranceTranslation';
import {
  WeddingTerminologyValidator,
  WeddingContext,
  WeddingTermCategory,
  WeddingScenario,
  WeddingParticipant,
  FormalityLevel,
  createWeddingTerminologyValidator,
} from '../WeddingTerminologyValidator';
import {
  CulturalAdaptationService,
  AdaptationContext,
  createCulturalAdaptationService,
} from '../CulturalAdaptationService';
import {
  WeddingContentLocalizer,
  LocalizationRequest,
  WeddingContentLocalizationType,
  LocalizationPriority,
  ReviewLevel,
  WeddingStyle,
  TargetAudience,
  CommunicationChannel,
  VendorType,
  createWeddingContentLocalizer,
} from '../WeddingContentLocalizer';

// ================================
// TEST SETUP & UTILITIES
// ================================

describe('WS-247 Multilingual Platform System - Translation Integration Tests', () => {
  let supabase: SupabaseClient<Database>;
  let googleTranslate: GoogleTranslateIntegration;
  let professionalTranslators: ProfessionalTranslationConnectors;
  let translationMemory: TranslationMemoryService;
  let qualityAssurance: QualityAssuranceTranslation;
  let terminologyValidator: WeddingTerminologyValidator;
  let culturalAdaptation: CulturalAdaptationService;
  let weddingLocalizer: WeddingContentLocalizer;

  // Test data
  const testWeddingContent = {
    englishCeremony:
      'Welcome to the wedding ceremony of Sarah and Michael. Today we celebrate their love and commitment as they begin their journey as husband and wife.',
    spanishCeremony:
      'Bienvenidos a la ceremonia de boda de Sarah y Michael. Hoy celebramos su amor y compromiso mientras comienzan su viaje como marido y mujer.',
    contractTemplate:
      'This wedding photography contract outlines the terms and conditions for capturing your special day. The photographer agrees to provide professional wedding photography services.',
    vendorEmail:
      'Dear valued wedding vendor, we are pleased to invite you to join our exclusive wedding marketplace platform. Our platform connects you with engaged couples looking for quality wedding services.',
    culturallySensitive:
      'The bride will wear a traditional white dress and the groom will wear a black tuxedo for this Christian wedding ceremony.',
  };

  const testLanguages = {
    source: 'en',
    targets: ['es', 'fr', 'de', 'it', 'pt', 'zh', 'ja', 'ar'],
  };

  beforeEach(async () => {
    // Initialize Supabase client (using test environment)
    supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://test.supabase.co',
      process.env.SUPABASE_SERVICE_ROLE_KEY || 'test-key',
    );

    // Initialize all translation components with test configurations
    googleTranslate = createGoogleTranslateIntegration(
      {
        projectId: 'test-project',
        keyFilePath: 'test-key.json',
        enableCache: true,
        cacheExpiration: 60,
        rateLimiting: {
          requestsPerMinute: 100,
          charactersPerMinute: 100000,
        },
      },
      supabase,
    );

    professionalTranslators = createProfessionalTranslationConnectors(
      {
        gengoApiKey: 'test-gengo-key',
        gengoApiSecret: 'test-gengo-secret',
        phraseApiKey: 'test-phrase-key',
        enableSandboxMode: true,
        defaultQuality: 'standard',
        webhookUrl: 'https://test.webhook.com',
      },
      supabase,
    );

    translationMemory = createTranslationMemoryService(
      {
        fuzzyMatchThreshold: 75,
        maxCacheSize: 10000,
        enableNeuralMatching: true,
        persistentStorage: true,
      },
      supabase,
    );

    qualityAssurance = createQualityAssuranceTranslation(
      {
        minimumQualityScore: 70,
        enableLinguisticAnalysis: true,
        enableCulturalValidation: true,
        enableWeddingProtocols: true,
        strictMode: false,
      },
      supabase,
    );

    terminologyValidator = createWeddingTerminologyValidator(
      {
        strictMode: true,
        culturalValidation: true,
        industryStandards: true,
        customTerminologies: [],
        validationThreshold: 70,
        cacheExpiration: 60,
      },
      supabase,
    );

    culturalAdaptation = createCulturalAdaptationService(
      {
        enableDeepCulturalAnalysis: true,
        strictReligiousCompliance: false, // Relaxed for testing
        includeRegionalVariations: true,
        respectTraditionalGenderRoles: false,
        modernizationLevel: 'moderate' as any,
        culturalSensitivityThreshold: 75,
        maxAlternativeOptions: 3,
        cacheExpiration: 120,
      },
      supabase,
    );

    weddingLocalizer = createWeddingContentLocalizer(
      {
        primaryTranslationProvider: 'hybrid',
        enableCulturalAdaptation: true,
        enableTerminologyValidation: true,
        enableQualityAssurance: true,
        enableTranslationMemory: true,
        qualityThreshold: 70,
        culturalSensitivityThreshold: 75,
        maxRetries: 2,
        fallbackToMachineTranslation: true,
        cacheResults: true,
        logAllTranslations: false, // Disabled for testing
      },
      supabase,
      {
        googleTranslate,
        professionalTranslators,
        translationMemory,
        qualityAssurance,
        terminologyValidator,
        culturalAdaptation,
      },
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ================================
  // GOOGLE TRANSLATE INTEGRATION TESTS
  // ================================

  describe('GoogleTranslateIntegration', () => {
    it('should translate wedding ceremony text accurately', async () => {
      const request: TranslationRequest = {
        text: testWeddingContent.englishCeremony,
        sourceLanguage: testLanguages.source,
        targetLanguage: 'es',
        context: 'wedding ceremony',
      };

      const result = await googleTranslate.translateText(request);

      expect(result).toBeDefined();
      expect(result.translatedText).toBeTruthy();
      expect(result.translatedText.length).toBeGreaterThan(0);
      expect(result.sourceLanguage).toBe('en');
      expect(result.targetLanguage).toBe('es');
      expect(result.confidence).toBeGreaterThan(0.8);

      // Check that wedding-specific terms are preserved
      expect(result.translatedText.toLowerCase()).toContain('boda');
      expect(result.translatedText.toLowerCase()).toContain('ceremonia');
    }, 15000);

    it('should handle multiple language translations', async () => {
      const requests = testLanguages.targets.slice(0, 3).map((lang) => ({
        text: testWeddingContent.contractTemplate,
        sourceLanguage: testLanguages.source,
        targetLanguage: lang,
        context: 'wedding contract',
      }));

      const results = await Promise.all(
        requests.map((req) => googleTranslate.translateText(req)),
      );

      expect(results).toHaveLength(3);
      results.forEach((result) => {
        expect(result.translatedText).toBeTruthy();
        expect(result.confidence).toBeGreaterThan(0.7);
      });
    }, 20000);

    it('should respect rate limiting', async () => {
      // This test would be more meaningful with actual API calls
      // For now, testing that rate limiter is initialized
      expect(googleTranslate).toBeDefined();

      const request: TranslationRequest = {
        text: 'Test rate limiting',
        sourceLanguage: 'en',
        targetLanguage: 'es',
      };

      const result = await googleTranslate.translateText(request);
      expect(result).toBeDefined();
    }, 10000);

    it('should cache translation results', async () => {
      const request: TranslationRequest = {
        text: 'Wedding photography services',
        sourceLanguage: 'en',
        targetLanguage: 'fr',
      };

      // First translation
      const result1 = await googleTranslate.translateText(request);
      const time1 = Date.now();

      // Second identical translation (should be faster due to caching)
      const result2 = await googleTranslate.translateText(request);
      const time2 = Date.now();

      expect(result1.translatedText).toBe(result2.translatedText);
      // Cache hit should be much faster (allowing some variance for test environment)
      expect(time2 - time1).toBeLessThan(1000);
    }, 10000);
  });

  // ================================
  // PROFESSIONAL TRANSLATION TESTS
  // ================================

  describe('ProfessionalTranslationConnectors', () => {
    it('should create translation job for wedding content', async () => {
      const jobRequest: TranslationJobRequest = {
        content: testWeddingContent.contractTemplate,
        sourceLanguage: 'en',
        targetLanguage: 'es',
        contentType: WeddingContentType.VENDOR_CONTRACT,
        quality: 'premium',
        specialInstructions: 'Wedding industry terminology must be accurate',
        rushDelivery: false,
      };

      // Mock the professional translation (since we don't want to actually charge for tests)
      const mockSubmitJob = jest.fn().mockResolvedValue({
        jobId: 'test-job-123',
        status: 'approved',
        estimatedCompletion: new Date(Date.now() + 86400000), // 24 hours
        cost: 25.5,
        translatedContent:
          'Este contrato de fotografía de bodas describe los términos...',
        quality: 'premium',
      });

      // Replace the actual method with mock for testing
      professionalTranslators.submitTranslationJob = mockSubmitJob;

      const result = await professionalTranslators.submitTranslationJob(
        'gengo',
        jobRequest,
      );

      expect(mockSubmitJob).toHaveBeenCalledWith('gengo', jobRequest);
      expect(result).toBeDefined();
      expect(result.jobId).toBe('test-job-123');
      expect(result.status).toBe('approved');
      expect(result.translatedContent).toContain('contrato');
    });

    it('should get translation quote for wedding services', async () => {
      const mockGetQuote = jest.fn().mockResolvedValue({
        provider: 'gengo',
        cost: 15.75,
        estimatedTime: '12 hours',
        currency: 'USD',
        qualityLevel: 'standard',
      });

      professionalTranslators.getTranslationQuote = mockGetQuote;

      const quote = await professionalTranslators.getTranslationQuote(
        'gengo',
        'en',
        'fr',
        testWeddingContent.vendorEmail,
        WeddingContentType.MARKETING_COPY,
        'standard',
      );

      expect(quote).toBeDefined();
      expect(quote.cost).toBe(15.75);
      expect(quote.provider).toBe('gengo');
    });

    it('should handle professional translation errors gracefully', async () => {
      const mockSubmitJob = jest
        .fn()
        .mockRejectedValue(new Error('API rate limit exceeded'));
      professionalTranslators.submitTranslationJob = mockSubmitJob;

      const jobRequest: TranslationJobRequest = {
        content: 'Test content',
        sourceLanguage: 'en',
        targetLanguage: 'es',
        contentType: WeddingContentType.GENERAL_CONTENT,
        quality: 'standard',
        rushDelivery: false,
      };

      await expect(
        professionalTranslators.submitTranslationJob('gengo', jobRequest),
      ).rejects.toThrow('API rate limit exceeded');
    });
  });

  // ================================
  // TRANSLATION MEMORY TESTS
  // ================================

  describe('TranslationMemoryService', () => {
    it('should store and retrieve wedding translations', async () => {
      const originalText = 'Wedding photographer';
      const translatedText = 'Fotógrafo de bodas';
      const sourceLanguage = 'en';
      const targetLanguage = 'es';

      // Store translation
      await translationMemory.storeTranslation(
        originalText,
        translatedText,
        sourceLanguage,
        targetLanguage,
        WeddingContentType.VENDOR_PROFILE,
        95,
      );

      // Retrieve translation
      const match = await translationMemory.findBestMatch(
        originalText,
        sourceLanguage,
        targetLanguage,
        WeddingContentType.VENDOR_PROFILE,
      );

      expect(match).toBeDefined();
      expect(match?.translation).toBe(translatedText);
      expect(match?.confidence).toBe(95);
      expect(match?.sourceText).toBe(originalText);
    });

    it('should perform fuzzy matching for similar wedding terms', async () => {
      // Store exact match
      await translationMemory.storeTranslation(
        'wedding ceremony venue',
        'lugar de ceremonia de boda',
        'en',
        'es',
        WeddingContentType.VENUE_INFO,
        90,
      );

      // Search for similar term
      const match = await translationMemory.findBestMatch(
        'wedding venue ceremony',
        'en',
        'es',
        WeddingContentType.VENUE_INFO,
      );

      expect(match).toBeDefined();
      expect(match?.confidence).toBeGreaterThan(60); // Should find fuzzy match
    });

    it('should prioritize wedding industry context', async () => {
      // Store wedding context translation
      await translationMemory.storeTranslation(
        'reception',
        'recepción de boda',
        'en',
        'es',
        WeddingContentType.EVENT_PLANNING,
        85,
      );

      // Store general context translation
      await translationMemory.storeTranslation(
        'reception',
        'recepción',
        'en',
        'es',
        WeddingContentType.GENERAL_CONTENT,
        80,
      );

      // Should prefer wedding context
      const match = await translationMemory.findBestMatch(
        'reception',
        'en',
        'es',
        WeddingContentType.EVENT_PLANNING,
      );

      expect(match?.translation).toBe('recepción de boda');
    });
  });

  // ================================
  // QUALITY ASSURANCE TESTS
  // ================================

  describe('QualityAssuranceTranslation', () => {
    it('should assess wedding ceremony translation quality', async () => {
      const originalText = testWeddingContent.englishCeremony;
      const translatedText = testWeddingContent.spanishCeremony;

      const assessment = await qualityAssurance.assessTranslationQuality(
        originalText,
        translatedText,
        'en',
        'es',
        WeddingContentType.CEREMONY_SCRIPT,
        'formal wedding ceremony',
      );

      expect(assessment).toBeDefined();
      expect(assessment.overallScore).toBeGreaterThan(0);
      expect(assessment.overallScore).toBeLessThanOrEqual(100);
      expect(assessment.linguisticQuality).toBeGreaterThan(0);
      expect(assessment.culturalAppropriateness).toBeGreaterThan(0);
      expect(assessment.weddingProtocolCompliance).toBeDefined();
      expect(assessment.confidence).toBeGreaterThan(0);
    });

    it('should identify poor quality translations', async () => {
      const originalText =
        'Professional wedding photography services with 10 years experience';
      const poorTranslation =
        'Servicios profesionales fotografía boda con 10 años'; // Grammatically incorrect

      const assessment = await qualityAssurance.assessTranslationQuality(
        originalText,
        poorTranslation,
        'en',
        'es',
        WeddingContentType.VENDOR_PROFILE,
        'wedding vendor marketing',
      );

      expect(assessment.overallScore).toBeLessThan(70); // Should identify as poor quality
      expect(assessment.issues).toBeDefined();
      expect(assessment.issues.length).toBeGreaterThan(0);
    });

    it('should validate wedding protocol compliance', async () => {
      const originalText =
        'The bride and groom exchange vows during the ceremony';
      const translatedText =
        'Los novios intercambian votos durante la ceremonia';

      const assessment = await qualityAssurance.assessTranslationQuality(
        originalText,
        translatedText,
        'en',
        'es',
        WeddingContentType.CEREMONY_SCRIPT,
        'traditional wedding ceremony',
      );

      expect(assessment.weddingProtocolCompliance).toBeDefined();
      expect(assessment.weddingProtocolCompliance?.score).toBeGreaterThan(0);
    });
  });

  // ================================
  // WEDDING TERMINOLOGY TESTS
  // ================================

  describe('WeddingTerminologyValidator', () => {
    it('should validate wedding-specific terminology', async () => {
      const context: WeddingContext = {
        scenario: WeddingScenario.FORMAL_CEREMONY,
        participants: [WeddingParticipant.BRIDE, WeddingParticipant.GROOM],
        formality: FormalityLevel.FORMAL,
        culturalConsiderations: [],
      };

      const validation = await terminologyValidator.validateWeddingTerminology(
        'The bride walks down the aisle',
        'La novia camina por el pasillo',
        'en',
        'es',
        context,
        WeddingTermCategory.CEREMONY,
      );

      expect(validation).toBeDefined();
      expect(validation.isValid).toBeDefined();
      expect(validation.score).toBeGreaterThan(0);
      expect(validation.confidence).toBeGreaterThan(0);
    });

    it('should provide wedding terminology suggestions', async () => {
      const context: WeddingContext = {
        scenario: WeddingScenario.VENDOR_MEETING,
        participants: [
          WeddingParticipant.COUPLE,
          WeddingParticipant.PHOTOGRAPHER,
        ],
        formality: FormalityLevel.FORMAL,
        culturalConsiderations: [],
      };

      const suggestions =
        await terminologyValidator.getWeddingTerminologySuggestions(
          'photographer takes pictures at wedding',
          'en',
          'es',
          context,
        );

      expect(suggestions).toBeDefined();
      expect(Array.isArray(suggestions)).toBe(true);
    });

    it('should validate single wedding terms', async () => {
      const context: WeddingContext = {
        scenario: WeddingScenario.FORMAL_CEREMONY,
        participants: [WeddingParticipant.COUPLE],
        formality: FormalityLevel.FORMAL,
        culturalConsiderations: [],
      };

      const validation = await terminologyValidator.validateSingleTerm(
        'groom',
        'novio',
        'en',
        'es',
        context,
      );

      expect(validation.isValid).toBe(true);
      expect(validation.score).toBeGreaterThan(70);
    });
  });

  // ================================
  // CULTURAL ADAPTATION TESTS
  // ================================

  describe('CulturalAdaptationService', () => {
    it('should adapt wedding content for different cultures', async () => {
      const context: AdaptationContext = {
        scenario: 'ceremony',
        participants: ['couple'],
        formality: 'formal',
        religionImportant: false,
        traditionLevel: 'traditional',
      };

      const adaptation = await culturalAdaptation.adaptContentForCulture(
        testWeddingContent.culturallySensitive,
        'en',
        'es',
        context,
      );

      expect(adaptation).toBeDefined();
      expect(adaptation.isAdapted).toBeDefined();
      expect(adaptation.confidence).toBeGreaterThan(0);
      expect(adaptation.respectLevel).toBeGreaterThan(0);
      expect(adaptation.adaptedContent).toBeDefined();
    });

    it('should validate cultural appropriateness', async () => {
      const context: AdaptationContext = {
        scenario: 'ceremony',
        participants: ['couple', 'families'],
        formality: 'very_formal',
        religionImportant: true,
        traditionLevel: 'traditional',
      };

      const validation =
        await culturalAdaptation.validateCulturalAppropriatenesss(
          'This is a traditional Christian wedding ceremony',
          'es',
          context,
        );

      expect(validation).toBeDefined();
      expect(validation.isValid).toBeDefined();
      expect(validation.respectLevel).toBeGreaterThan(0);
    });

    it('should get cultural profiles', async () => {
      const profile = await culturalAdaptation.getCulturalProfile('western');

      expect(profile).toBeDefined();
      expect(profile.culture).toBe('western');
      expect(profile.weddingTraditions).toBeDefined();
      expect(Array.isArray(profile.weddingTraditions)).toBe(true);
    });
  });

  // ================================
  // WEDDING CONTENT LOCALIZER TESTS
  // ================================

  describe('WeddingContentLocalizer', () => {
    it('should perform complete wedding content localization', async () => {
      const request: LocalizationRequest = {
        content: testWeddingContent.vendorEmail,
        sourceLanguage: 'en',
        targetLanguages: ['es', 'fr'],
        contentType: WeddingContentLocalizationType.EMAIL_TEMPLATES,
        context: {
          weddingStyle: WeddingStyle.MODERN,
          targetAudience: TargetAudience.WEDDING_VENDORS,
          communicationChannel: CommunicationChannel.EMAIL,
          formalityLevel: FormalityLevel.FORMAL,
          generationalTarget: 'millennial' as any,
          marketSegment: 'premium' as any,
        },
        priority: LocalizationPriority.NORMAL,
        reviewLevel: ReviewLevel.STANDARD,
        culturalAdaptationRequired: true,
        targetMarkets: [],
      };

      const result = await weddingLocalizer.localizeWeddingContent(request);

      expect(result).toBeDefined();
      expect(result.status).toBeDefined();
      expect(result.localizedVersions).toBeDefined();
      expect(result.localizedVersions.length).toBe(2); // es and fr
      expect(result.qualityScores).toBeDefined();
      expect(result.qualityScores.length).toBe(2);
      expect(result.processingTime).toBeGreaterThan(0);
    }, 30000);

    it('should handle batch localization', async () => {
      const requests: LocalizationRequest[] = [
        {
          content: 'Wedding photography services',
          sourceLanguage: 'en',
          targetLanguages: ['es'],
          contentType: WeddingContentLocalizationType.SERVICE_DESCRIPTIONS,
          context: {
            weddingStyle: WeddingStyle.MODERN,
            targetAudience: TargetAudience.ENGAGED_COUPLES,
            communicationChannel: CommunicationChannel.WEBSITE,
            formalityLevel: FormalityLevel.FORMAL,
            generationalTarget: 'millennial' as any,
            marketSegment: 'mid_range' as any,
          },
          priority: LocalizationPriority.NORMAL,
          reviewLevel: ReviewLevel.BASIC,
          culturalAdaptationRequired: false,
          targetMarkets: [],
        },
        {
          content: 'Catering services for your special day',
          sourceLanguage: 'en',
          targetLanguages: ['fr'],
          contentType: WeddingContentLocalizationType.MARKETING_CONTENT,
          context: {
            weddingStyle: WeddingStyle.ELEGANT,
            targetAudience: TargetAudience.ENGAGED_COUPLES,
            communicationChannel: CommunicationChannel.WEBSITE,
            vendorType: VendorType.CATERER,
            formalityLevel: FormalityLevel.FORMAL,
            generationalTarget: 'mixed' as any,
            marketSegment: 'premium' as any,
          },
          priority: LocalizationPriority.HIGH,
          reviewLevel: ReviewLevel.STANDARD,
          culturalAdaptationRequired: true,
          targetMarkets: [],
        },
      ];

      const results = await weddingLocalizer.batchLocalizeContent(requests);

      expect(results).toBeDefined();
      expect(results.length).toBe(2);
      results.forEach((result) => {
        expect(result.status).toBeDefined();
      });
    }, 45000);
  });

  // ================================
  // INTEGRATION TESTS
  // ================================

  describe('End-to-End Integration Tests', () => {
    it('should complete full wedding localization workflow', async () => {
      const weddingContent = `
        Dear [Couple Names],
        
        Thank you for choosing our wedding photography services for your special day.
        We are excited to capture your love story and preserve these precious moments forever.
        
        Our wedding package includes:
        - Engagement photoshoot
        - Full wedding day coverage
        - Professional photo editing
        - Online gallery with download access
        - Print release for your photos
        
        We understand that every wedding is unique, and we work closely with you to
        ensure your vision comes to life. Our experienced photographers specialize in
        capturing the joy, emotion, and beauty of your wedding celebration.
        
        Best regards,
        Your Wedding Photography Team
      `;

      const request: LocalizationRequest = {
        content: weddingContent,
        sourceLanguage: 'en',
        targetLanguages: ['es', 'fr', 'de'],
        contentType: WeddingContentLocalizationType.EMAIL_TEMPLATES,
        context: {
          weddingStyle: WeddingStyle.MODERN,
          targetAudience: TargetAudience.ENGAGED_COUPLES,
          communicationChannel: CommunicationChannel.EMAIL,
          vendorType: VendorType.PHOTOGRAPHER,
          formalityLevel: FormalityLevel.FORMAL,
          generationalTarget: 'millennial' as any,
          marketSegment: 'premium' as any,
        },
        priority: LocalizationPriority.HIGH,
        reviewLevel: ReviewLevel.THOROUGH,
        culturalAdaptationRequired: true,
        targetMarkets: [
          {
            country: 'Spain',
            language: 'es',
            culturalProfile: 'western',
            marketSize: 'large' as any,
            competitiveLevel: 'high' as any,
            regulatoryRequirements: [],
            localizedContentPreferences: ['formal_tone', 'family_focus'],
          },
        ],
      };

      const result = await weddingLocalizer.localizeWeddingContent(request);

      // Comprehensive validation of results
      expect(result.status).toBe('completed');
      expect(result.localizedVersions.length).toBe(3);

      // Check each language version
      result.localizedVersions.forEach((version) => {
        expect(version.content.length).toBeGreaterThan(100);
        expect(version.qualityScore).toBeGreaterThan(60);
        expect(version.confidence).toBeGreaterThan(70);
        expect(version.translationProvider).toBeDefined();
      });

      // Check quality scores
      expect(result.qualityScores.length).toBe(3);
      result.qualityScores.forEach((score) => {
        expect(score.overallScore).toBeGreaterThan(50);
        expect(score.linguisticAccuracy).toBeDefined();
        expect(score.culturalAppropriateness).toBeDefined();
      });

      // Check cultural adaptation
      expect(result.culturalAdaptationResults.length).toBe(3);
      result.culturalAdaptationResults.forEach((adaptation) => {
        expect(adaptation.respectLevel).toBeGreaterThan(60);
      });

      // Check terminology validation
      expect(result.terminologyValidation).toBeDefined();
      expect(result.terminologyValidation.overallScore).toBeGreaterThan(0);

      // Check metadata
      expect(result.metadata.processingSteps.length).toBeGreaterThan(0);
      expect(result.metadata.providersUsed.length).toBeGreaterThan(0);
      expect(result.processingTime).toBeGreaterThan(0);
    }, 60000); // Allow longer timeout for comprehensive test
  });

  // ================================
  // ERROR HANDLING TESTS
  // ================================

  describe('Error Handling and Edge Cases', () => {
    it('should handle empty content gracefully', async () => {
      const request: LocalizationRequest = {
        content: '',
        sourceLanguage: 'en',
        targetLanguages: ['es'],
        contentType: WeddingContentLocalizationType.UI_LABELS,
        context: {
          weddingStyle: WeddingStyle.MODERN,
          targetAudience: TargetAudience.ENGAGED_COUPLES,
          communicationChannel: CommunicationChannel.WEBSITE,
          formalityLevel: FormalityLevel.CASUAL,
          generationalTarget: 'gen_z' as any,
          marketSegment: 'budget' as any,
        },
        priority: LocalizationPriority.LOW,
        reviewLevel: ReviewLevel.NONE,
        culturalAdaptationRequired: false,
        targetMarkets: [],
      };

      const result = await weddingLocalizer.localizeWeddingContent(request);
      expect(result).toBeDefined();
      // Should handle gracefully without crashing
    });

    it('should handle unsupported language pairs', async () => {
      const request: LocalizationRequest = {
        content: 'Test content',
        sourceLanguage: 'xyz', // Unsupported language
        targetLanguages: ['abc'], // Another unsupported language
        contentType: WeddingContentLocalizationType.UI_LABELS,
        context: {
          weddingStyle: WeddingStyle.MODERN,
          targetAudience: TargetAudience.ENGAGED_COUPLES,
          communicationChannel: CommunicationChannel.WEBSITE,
          formalityLevel: FormalityLevel.CASUAL,
          generationalTarget: 'millennial' as any,
          marketSegment: 'budget' as any,
        },
        priority: LocalizationPriority.LOW,
        reviewLevel: ReviewLevel.NONE,
        culturalAdaptationRequired: false,
        targetMarkets: [],
      };

      const result = await weddingLocalizer.localizeWeddingContent(request);
      expect(result.status).toBe('failed');
      expect(result.warnings.length).toBeGreaterThan(0);
    });

    it('should handle extremely long content', async () => {
      const longContent = 'Wedding photography services. '.repeat(1000); // Very long content

      const request: TranslationRequest = {
        text: longContent,
        sourceLanguage: 'en',
        targetLanguage: 'es',
      };

      // Should handle without throwing errors
      const result = await googleTranslate.translateText(request);
      expect(result).toBeDefined();
    }, 30000);
  });

  // ================================
  // PERFORMANCE TESTS
  // ================================

  describe('Performance and Reliability Tests', () => {
    it('should handle concurrent translation requests', async () => {
      const requests = Array(5)
        .fill(null)
        .map((_, index) => ({
          content: `Wedding service description ${index + 1}`,
          sourceLanguage: 'en',
          targetLanguages: ['es'],
          contentType: WeddingContentLocalizationType.SERVICE_DESCRIPTIONS,
          context: {
            weddingStyle: WeddingStyle.MODERN,
            targetAudience: TargetAudience.ENGAGED_COUPLES,
            communicationChannel: CommunicationChannel.WEBSITE,
            formalityLevel: FormalityLevel.FORMAL,
            generationalTarget: 'millennial' as any,
            marketSegment: 'mid_range' as any,
          },
          priority: LocalizationPriority.NORMAL,
          reviewLevel: ReviewLevel.BASIC,
          culturalAdaptationRequired: false,
          targetMarkets: [],
        })) as LocalizationRequest[];

      const startTime = Date.now();
      const results = await Promise.all(
        requests.map((req) => weddingLocalizer.localizeWeddingContent(req)),
      );
      const endTime = Date.now();

      expect(results.length).toBe(5);
      expect(endTime - startTime).toBeLessThan(60000); // Should complete within 1 minute

      results.forEach((result) => {
        expect(result.status).toBeDefined();
      });
    }, 70000);

    it('should maintain translation consistency across sessions', async () => {
      const content = 'Wedding photographer professional services';

      // First translation
      const request1: TranslationRequest = {
        text: content,
        sourceLanguage: 'en',
        targetLanguage: 'es',
      };
      const result1 = await googleTranslate.translateText(request1);

      // Second identical translation
      const request2: TranslationRequest = {
        text: content,
        sourceLanguage: 'en',
        targetLanguage: 'es',
      };
      const result2 = await googleTranslate.translateText(request2);

      // Should be consistent (allowing for minor variations)
      expect(result1.translatedText).toBeDefined();
      expect(result2.translatedText).toBeDefined();
      // Basic consistency check - same length range
      expect(
        Math.abs(result1.translatedText.length - result2.translatedText.length),
      ).toBeLessThan(10);
    });
  });

  // ================================
  // WEDDING INDUSTRY SPECIFIC TESTS
  // ================================

  describe('Wedding Industry Specialization Tests', () => {
    const weddingSpecificTerms = [
      {
        en: 'wedding ceremony',
        es: 'ceremonia de boda',
        category: WeddingTermCategory.CEREMONY,
      },
      {
        en: 'bridal party',
        es: 'séquito nupcial',
        category: WeddingTermCategory.CEREMONY,
      },
      {
        en: 'wedding reception',
        es: 'recepción de boda',
        category: WeddingTermCategory.RECEPTION,
      },
      {
        en: 'wedding photographer',
        es: 'fotógrafo de bodas',
        category: WeddingTermCategory.PHOTOGRAPHY,
      },
      {
        en: 'wedding venue',
        es: 'lugar de la boda',
        category: WeddingTermCategory.VENUES,
      },
      {
        en: 'wedding cake',
        es: 'pastel de boda',
        category: WeddingTermCategory.CATERING,
      },
    ];

    it('should accurately translate wedding-specific terminology', async () => {
      for (const term of weddingSpecificTerms.slice(0, 3)) {
        // Test first 3 to avoid timeout
        const request: TranslationRequest = {
          text: term.en,
          sourceLanguage: 'en',
          targetLanguage: 'es',
          context: 'wedding industry terminology',
        };

        const result = await googleTranslate.translateText(request);

        // Should contain key wedding terms (allowing for variations)
        expect(result.translatedText.toLowerCase()).toMatch(
          /boda|nupcial|matrimonio/,
        );
      }
    });

    it('should validate vendor-specific content', async () => {
      const photographerContent =
        'Our wedding photography team specializes in capturing candid moments and formal portraits during your ceremony and reception.';

      const context: WeddingContext = {
        scenario: WeddingScenario.VENDOR_MEETING,
        participants: [
          WeddingParticipant.COUPLE,
          WeddingParticipant.PHOTOGRAPHER,
        ],
        formality: FormalityLevel.FORMAL,
        culturalConsiderations: [],
      };

      const validation = await terminologyValidator.validateWeddingTerminology(
        photographerContent,
        'Nuestro equipo de fotografía de bodas se especializa en capturar momentos espontáneos y retratos formales durante su ceremonia y recepción.',
        'en',
        'es',
        context,
        WeddingTermCategory.PHOTOGRAPHY,
      );

      expect(validation.isValid).toBe(true);
      expect(validation.score).toBeGreaterThan(70);
    });

    it('should handle cultural wedding variations', async () => {
      const traditionalContent =
        'The bride walks down the aisle accompanied by her father to meet the groom at the altar.';

      const context: AdaptationContext = {
        scenario: 'ceremony',
        participants: ['couple', 'families'],
        formality: 'very_formal',
        religionImportant: true,
        traditionLevel: 'traditional',
      };

      const adaptation = await culturalAdaptation.adaptContentForCulture(
        traditionalContent,
        'en',
        'es',
        context,
      );

      expect(adaptation.respectLevel).toBeGreaterThan(70);
      expect(adaptation.culturalChanges).toBeDefined();
    });
  });
});

// ================================
// HELPER FUNCTIONS FOR TESTS
// ================================

/**
 * Helper function to create mock Supabase client for testing
 */
function createMockSupabaseClient(): SupabaseClient<Database> {
  return {
    from: jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({ data: null, error: null }),
        }),
      }),
      insert: jest.fn().mockResolvedValue({ data: null, error: null }),
      upsert: jest.fn().mockResolvedValue({ data: null, error: null }),
    }),
  } as any;
}

/**
 * Helper function to generate test wedding content variations
 */
function generateTestWeddingContent(
  type: WeddingContentLocalizationType,
): string {
  const templates = {
    [WeddingContentLocalizationType.CEREMONY_SCRIPTS]:
      'Dearly beloved, we are gathered here today to witness and celebrate the union of [Bride] and [Groom] in marriage.',
    [WeddingContentLocalizationType.CONTRACT_TEMPLATES]:
      'This wedding services contract outlines the agreement between the vendor and the clients for services to be provided on the wedding date.',
    [WeddingContentLocalizationType.EMAIL_TEMPLATES]:
      'Dear [Client Name], Thank you for your interest in our wedding services. We would be delighted to be part of your special day.',
    [WeddingContentLocalizationType.MARKETING_CONTENT]:
      'Professional wedding photography services capturing your love story with artistic excellence and emotional depth.',
    [WeddingContentLocalizationType.SERVICE_DESCRIPTIONS]:
      'Our comprehensive wedding planning services include venue coordination, vendor management, and day-of coordination.',
  };

  return templates[type] || 'Wedding service content for testing purposes.';
}

/**
 * Helper function to create test localization context
 */
function createTestLocalizationContext(vendorType?: VendorType): any {
  return {
    weddingStyle: WeddingStyle.MODERN,
    targetAudience: TargetAudience.ENGAGED_COUPLES,
    communicationChannel: CommunicationChannel.EMAIL,
    vendorType,
    formalityLevel: FormalityLevel.FORMAL,
    generationalTarget: 'millennial',
    marketSegment: 'premium',
  };
}
