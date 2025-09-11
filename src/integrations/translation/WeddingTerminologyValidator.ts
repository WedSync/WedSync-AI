/**
 * WeddingTerminologyValidator.ts
 *
 * Enterprise-grade wedding-specific translation validation system
 * Validates terminology accuracy, cultural appropriateness, and industry standards
 *
 * Features:
 * - Comprehensive wedding terminology database
 * - Cultural context validation
 * - Industry-specific term verification
 * - Multi-language wedding protocol validation
 * - Context-aware semantic analysis
 * - Professional wedding vendor terminology
 *
 * @author WS-247 Team C Round 1
 * @version 1.0.0
 * @created 2025-01-15
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '../../types/database';

// ================================
// CORE TYPES & INTERFACES
// ================================

export interface WeddingTerminologyConfig {
  strictMode: boolean;
  culturalValidation: boolean;
  industryStandards: boolean;
  customTerminologies: string[];
  validationThreshold: number; // 0-100
  cacheExpiration: number; // minutes
}

export interface WeddingTerm {
  id: string;
  term: string;
  category: WeddingTermCategory;
  translations: Record<string, WeddingTermTranslation>;
  context: WeddingContext[];
  culturalNotes: CulturalNote[];
  alternativeTerms: string[];
  isRequired: boolean;
  sensitivity: TermSensitivity;
  createdAt: string;
  updatedAt: string;
}

export interface WeddingTermTranslation {
  translation: string;
  confidence: number;
  culturallyAppropriate: boolean;
  formalityLevel: FormalityLevel;
  regionalVariations: Record<string, string>;
  notes?: string;
}

export interface CulturalNote {
  culture: string;
  region?: string;
  note: string;
  severity: 'info' | 'warning' | 'critical';
  alternatives: string[];
}

export interface WeddingContext {
  scenario: WeddingScenario;
  participants: WeddingParticipant[];
  formality: FormalityLevel;
  culturalConsiderations: string[];
}

export interface ValidationResult {
  isValid: boolean;
  score: number; // 0-100
  issues: ValidationIssue[];
  suggestions: ValidationSuggestion[];
  culturalFlags: CulturalFlag[];
  improvedTranslation?: string;
  confidence: number;
}

export interface ValidationIssue {
  type: ValidationIssueType;
  severity: 'low' | 'medium' | 'high' | 'critical';
  term: string;
  context: string;
  message: string;
  position?: {
    start: number;
    end: number;
  };
}

export interface ValidationSuggestion {
  type: SuggestionType;
  originalTerm: string;
  suggestedTerm: string;
  reason: string;
  confidence: number;
  culturalContext?: string;
}

export interface CulturalFlag {
  type: CulturalFlagType;
  severity: 'info' | 'warning' | 'critical';
  culture: string;
  term: string;
  issue: string;
  recommendation: string;
}

// ================================
// ENUMS
// ================================

export enum WeddingTermCategory {
  CEREMONY = 'ceremony',
  RECEPTION = 'reception',
  VENDORS = 'vendors',
  ATTIRE = 'attire',
  FLOWERS = 'flowers',
  PHOTOGRAPHY = 'photography',
  MUSIC = 'music',
  CATERING = 'catering',
  VENUES = 'venues',
  TRADITIONS = 'traditions',
  TIMELINE = 'timeline',
  GUESTS = 'guests',
  DOCUMENTATION = 'documentation',
  PLANNING = 'planning',
  LEGAL = 'legal',
  RELIGIOUS = 'religious',
  CULTURAL = 'cultural',
}

export enum WeddingScenario {
  FORMAL_CEREMONY = 'formal_ceremony',
  CASUAL_CEREMONY = 'casual_ceremony',
  RELIGIOUS_CEREMONY = 'religious_ceremony',
  CIVIL_CEREMONY = 'civil_ceremony',
  DESTINATION_WEDDING = 'destination_wedding',
  ELOPEMENT = 'elopement',
  RECEPTION = 'reception',
  REHEARSAL = 'rehearsal',
  BACHELOR_PARTY = 'bachelor_party',
  BRIDAL_SHOWER = 'bridal_shower',
  VENDOR_MEETING = 'vendor_meeting',
  PLANNING_SESSION = 'planning_session',
}

export enum WeddingParticipant {
  BRIDE = 'bride',
  GROOM = 'groom',
  COUPLE = 'couple',
  PARENTS = 'parents',
  BRIDAL_PARTY = 'bridal_party',
  GUESTS = 'guests',
  OFFICIANT = 'officiant',
  VENDORS = 'vendors',
  PLANNER = 'planner',
  PHOTOGRAPHER = 'photographer',
  CATERER = 'caterer',
  FLORIST = 'florist',
  MUSICIAN = 'musician',
  VENUE_STAFF = 'venue_staff',
}

export enum FormalityLevel {
  VERY_FORMAL = 'very_formal',
  FORMAL = 'formal',
  SEMI_FORMAL = 'semi_formal',
  CASUAL = 'casual',
  INTIMATE = 'intimate',
}

export enum TermSensitivity {
  PUBLIC = 'public',
  INTERNAL = 'internal',
  PRIVATE = 'private',
  CONFIDENTIAL = 'confidential',
}

export enum ValidationIssueType {
  INCORRECT_TERMINOLOGY = 'incorrect_terminology',
  CULTURAL_INSENSITIVITY = 'cultural_insensitivity',
  INAPPROPRIATE_FORMALITY = 'inappropriate_formality',
  MISSING_CONTEXT = 'missing_context',
  AMBIGUOUS_TERM = 'ambiguous_term',
  OUTDATED_TERM = 'outdated_term',
  INCORRECT_TRANSLATION = 'incorrect_translation',
  RELIGIOUS_SENSITIVITY = 'religious_sensitivity',
}

export enum SuggestionType {
  TERMINOLOGY_IMPROVEMENT = 'terminology_improvement',
  CULTURAL_ADAPTATION = 'cultural_adaptation',
  FORMALITY_ADJUSTMENT = 'formality_adjustment',
  CONTEXT_CLARIFICATION = 'context_clarification',
  ALTERNATIVE_PHRASING = 'alternative_phrasing',
}

export enum CulturalFlagType {
  RELIGIOUS_CONFLICT = 'religious_conflict',
  CULTURAL_TABOO = 'cultural_taboo',
  REGIONAL_INAPPROPRIATE = 'regional_inappropriate',
  GENDER_INSENSITIVE = 'gender_insensitive',
  GENERATIONAL_GAP = 'generational_gap',
}

// ================================
// MAIN VALIDATOR CLASS
// ================================

export class WeddingTerminologyValidator {
  private config: WeddingTerminologyConfig;
  private supabase: SupabaseClient<Database>;
  private terminologyCache: Map<string, WeddingTerm[]>;
  private validationCache: Map<string, ValidationResult>;
  private cacheExpiration: number;

  constructor(
    config: WeddingTerminologyConfig,
    supabase: SupabaseClient<Database>,
  ) {
    this.config = config;
    this.supabase = supabase;
    this.terminologyCache = new Map();
    this.validationCache = new Map();
    this.cacheExpiration = config.cacheExpiration * 60 * 1000; // Convert to milliseconds

    // Initialize wedding terminology database
    this.initializeTerminologyDatabase();
  }

  // ================================
  // PUBLIC METHODS
  // ================================

  /**
   * Validates wedding terminology in translated content
   */
  public async validateWeddingTerminology(
    originalText: string,
    translatedText: string,
    sourceLanguage: string,
    targetLanguage: string,
    context: WeddingContext,
    contentType: WeddingTermCategory,
  ): Promise<ValidationResult> {
    const cacheKey = this.generateCacheKey(
      originalText,
      translatedText,
      sourceLanguage,
      targetLanguage,
      context,
    );

    // Check cache first
    const cached = this.validationCache.get(cacheKey);
    if (cached && this.isCacheValid(cacheKey)) {
      return cached;
    }

    try {
      const result = await this.performValidation(
        originalText,
        translatedText,
        sourceLanguage,
        targetLanguage,
        context,
        contentType,
      );

      // Cache result
      this.validationCache.set(cacheKey, result);

      return result;
    } catch (error) {
      console.error('Validation error:', error);
      return {
        isValid: false,
        score: 0,
        issues: [
          {
            type: ValidationIssueType.INCORRECT_TERMINOLOGY,
            severity: 'critical',
            term: 'system_error',
            context: 'validation_failure',
            message: `Validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          },
        ],
        suggestions: [],
        culturalFlags: [],
        confidence: 0,
      };
    }
  }

  /**
   * Validates single wedding term translation
   */
  public async validateSingleTerm(
    term: string,
    translation: string,
    sourceLanguage: string,
    targetLanguage: string,
    context: WeddingContext,
  ): Promise<ValidationResult> {
    const weddingTerms = await this.getWeddingTerms(term, sourceLanguage);
    const issues: ValidationIssue[] = [];
    const suggestions: ValidationSuggestion[] = [];
    const culturalFlags: CulturalFlag[] = [];

    let score = 100;
    let confidence = 90;

    for (const weddingTerm of weddingTerms) {
      const targetTranslation = weddingTerm.translations[targetLanguage];

      if (!targetTranslation) {
        issues.push({
          type: ValidationIssueType.MISSING_CONTEXT,
          severity: 'medium',
          term,
          context: context.scenario,
          message: `No wedding-specific translation found for "${term}" in ${targetLanguage}`,
        });
        score -= 20;
        continue;
      }

      // Check translation accuracy
      const accuracy = this.calculateTranslationAccuracy(
        translation,
        targetTranslation.translation,
      );
      if (accuracy < this.config.validationThreshold) {
        issues.push({
          type: ValidationIssueType.INCORRECT_TERMINOLOGY,
          severity: accuracy < 50 ? 'high' : 'medium',
          term,
          context: context.scenario,
          message: `Translation accuracy is low (${accuracy}%). Expected: "${targetTranslation.translation}", Got: "${translation}"`,
        });

        suggestions.push({
          type: SuggestionType.TERMINOLOGY_IMPROVEMENT,
          originalTerm: translation,
          suggestedTerm: targetTranslation.translation,
          reason: 'Wedding industry standard terminology',
          confidence: targetTranslation.confidence,
        });

        score -= (100 - accuracy) * 0.5;
      }

      // Check cultural appropriateness
      if (
        this.config.culturalValidation &&
        !targetTranslation.culturallyAppropriate
      ) {
        culturalFlags.push({
          type: CulturalFlagType.CULTURAL_TABOO,
          severity: 'critical',
          culture: targetLanguage,
          term,
          issue: 'Term may be culturally inappropriate in target culture',
          recommendation: `Consider alternative: ${weddingTerm.alternativeTerms.join(', ')}`,
        });
        score -= 30;
      }

      // Check formality level
      if (targetTranslation.formalityLevel !== context.formality) {
        issues.push({
          type: ValidationIssueType.INAPPROPRIATE_FORMALITY,
          severity: 'medium',
          term,
          context: context.scenario,
          message: `Formality mismatch. Expected: ${context.formality}, Got: ${targetTranslation.formalityLevel}`,
        });
        score -= 15;
      }
    }

    return {
      isValid: score >= this.config.validationThreshold,
      score: Math.max(0, Math.min(100, score)),
      issues,
      suggestions,
      culturalFlags,
      confidence,
    };
  }

  /**
   * Gets wedding-specific terminology suggestions
   */
  public async getWeddingTerminologySuggestions(
    text: string,
    sourceLanguage: string,
    targetLanguage: string,
    context: WeddingContext,
  ): Promise<ValidationSuggestion[]> {
    const suggestions: ValidationSuggestion[] = [];
    const words = this.extractTerms(text);

    for (const word of words) {
      const weddingTerms = await this.getWeddingTerms(word, sourceLanguage);

      for (const weddingTerm of weddingTerms) {
        const targetTranslation = weddingTerm.translations[targetLanguage];

        if (targetTranslation && targetTranslation.confidence > 80) {
          suggestions.push({
            type: SuggestionType.TERMINOLOGY_IMPROVEMENT,
            originalTerm: word,
            suggestedTerm: targetTranslation.translation,
            reason: `Wedding industry standard for ${weddingTerm.category}`,
            confidence: targetTranslation.confidence,
            culturalContext: weddingTerm.culturalNotes.find(
              (n) => n.culture === targetLanguage,
            )?.note,
          });
        }
      }
    }

    return suggestions;
  }

  /**
   * Updates wedding terminology database
   */
  public async updateWeddingTerminology(term: WeddingTerm): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('wedding_terminology')
        .upsert(term);

      if (error) {
        throw new Error(`Failed to update terminology: ${error.message}`);
      }

      // Clear cache
      this.terminologyCache.clear();
    } catch (error) {
      console.error('Error updating wedding terminology:', error);
      throw error;
    }
  }

  // ================================
  // PRIVATE METHODS
  // ================================

  private async initializeTerminologyDatabase(): Promise<void> {
    // Initialize with core wedding terminology
    const coreTerminology: Partial<WeddingTerm>[] = [
      {
        term: 'bride',
        category: WeddingTermCategory.CEREMONY,
        translations: {
          es: {
            translation: 'novia',
            confidence: 95,
            culturallyAppropriate: true,
            formalityLevel: FormalityLevel.FORMAL,
            regionalVariations: {},
          },
          fr: {
            translation: 'mariée',
            confidence: 95,
            culturallyAppropriate: true,
            formalityLevel: FormalityLevel.FORMAL,
            regionalVariations: {},
          },
          de: {
            translation: 'Braut',
            confidence: 95,
            culturallyAppropriate: true,
            formalityLevel: FormalityLevel.FORMAL,
            regionalVariations: {},
          },
          it: {
            translation: 'sposa',
            confidence: 95,
            culturallyAppropriate: true,
            formalityLevel: FormalityLevel.FORMAL,
            regionalVariations: {},
          },
          pt: {
            translation: 'noiva',
            confidence: 95,
            culturallyAppropriate: true,
            formalityLevel: FormalityLevel.FORMAL,
            regionalVariations: {},
          },
        },
        context: [
          {
            scenario: WeddingScenario.FORMAL_CEREMONY,
            participants: [WeddingParticipant.BRIDE, WeddingParticipant.COUPLE],
            formality: FormalityLevel.FORMAL,
            culturalConsiderations: [],
          },
        ],
        culturalNotes: [],
        alternativeTerms: ['the bride', 'bride-to-be'],
        isRequired: true,
        sensitivity: TermSensitivity.PUBLIC,
      },
      {
        term: 'groom',
        category: WeddingTermCategory.CEREMONY,
        translations: {
          es: {
            translation: 'novio',
            confidence: 95,
            culturallyAppropriate: true,
            formalityLevel: FormalityLevel.FORMAL,
            regionalVariations: {},
          },
          fr: {
            translation: 'marié',
            confidence: 95,
            culturallyAppropriate: true,
            formalityLevel: FormalityLevel.FORMAL,
            regionalVariations: {},
          },
          de: {
            translation: 'Bräutigam',
            confidence: 95,
            culturallyAppropriate: true,
            formalityLevel: FormalityLevel.FORMAL,
            regionalVariations: {},
          },
          it: {
            translation: 'sposo',
            confidence: 95,
            culturallyAppropriate: true,
            formalityLevel: FormalityLevel.FORMAL,
            regionalVariations: {},
          },
          pt: {
            translation: 'noivo',
            confidence: 95,
            culturallyAppropriate: true,
            formalityLevel: FormalityLevel.FORMAL,
            regionalVariations: {},
          },
        },
        context: [
          {
            scenario: WeddingScenario.FORMAL_CEREMONY,
            participants: [WeddingParticipant.GROOM, WeddingParticipant.COUPLE],
            formality: FormalityLevel.FORMAL,
            culturalConsiderations: [],
          },
        ],
        culturalNotes: [],
        alternativeTerms: ['the groom', 'groom-to-be'],
        isRequired: true,
        sensitivity: TermSensitivity.PUBLIC,
      },
      {
        term: 'wedding ceremony',
        category: WeddingTermCategory.CEREMONY,
        translations: {
          es: {
            translation: 'ceremonia de boda',
            confidence: 95,
            culturallyAppropriate: true,
            formalityLevel: FormalityLevel.FORMAL,
            regionalVariations: {},
          },
          fr: {
            translation: 'cérémonie de mariage',
            confidence: 95,
            culturallyAppropriate: true,
            formalityLevel: FormalityLevel.FORMAL,
            regionalVariations: {},
          },
          de: {
            translation: 'Hochzeitszeremonie',
            confidence: 95,
            culturallyAppropriate: true,
            formalityLevel: FormalityLevel.FORMAL,
            regionalVariations: {},
          },
          it: {
            translation: 'cerimonia nuziale',
            confidence: 95,
            culturallyAppropriate: true,
            formalityLevel: FormalityLevel.FORMAL,
            regionalVariations: {},
          },
          pt: {
            translation: 'cerimônia de casamento',
            confidence: 95,
            culturallyAppropriate: true,
            formalityLevel: FormalityLevel.FORMAL,
            regionalVariations: {},
          },
        },
        context: [
          {
            scenario: WeddingScenario.FORMAL_CEREMONY,
            participants: [
              WeddingParticipant.COUPLE,
              WeddingParticipant.GUESTS,
              WeddingParticipant.OFFICIANT,
            ],
            formality: FormalityLevel.FORMAL,
            culturalConsiderations: [
              'religious_considerations',
              'cultural_traditions',
            ],
          },
        ],
        culturalNotes: [
          {
            culture: 'es',
            note: 'May vary by region - "matrimonio" is also commonly used',
            severity: 'info',
            alternatives: ['matrimonio', 'boda'],
          },
        ],
        alternativeTerms: ['ceremony', 'wedding', 'nuptials'],
        isRequired: true,
        sensitivity: TermSensitivity.PUBLIC,
      },
      {
        term: 'wedding reception',
        category: WeddingTermCategory.RECEPTION,
        translations: {
          es: {
            translation: 'recepción de boda',
            confidence: 95,
            culturallyAppropriate: true,
            formalityLevel: FormalityLevel.FORMAL,
            regionalVariations: {},
          },
          fr: {
            translation: 'réception de mariage',
            confidence: 95,
            culturallyAppropriate: true,
            formalityLevel: FormalityLevel.FORMAL,
            regionalVariations: {},
          },
          de: {
            translation: 'Hochzeitsempfang',
            confidence: 95,
            culturallyAppropriate: true,
            formalityLevel: FormalityLevel.FORMAL,
            regionalVariations: {},
          },
          it: {
            translation: 'ricevimento nuziale',
            confidence: 95,
            culturallyAppropriate: true,
            formalityLevel: FormalityLevel.FORMAL,
            regionalVariations: {},
          },
          pt: {
            translation: 'recepção de casamento',
            confidence: 95,
            culturallyAppropriate: true,
            formalityLevel: FormalityLevel.FORMAL,
            regionalVariations: {},
          },
        },
        context: [
          {
            scenario: WeddingScenario.RECEPTION,
            participants: [
              WeddingParticipant.COUPLE,
              WeddingParticipant.GUESTS,
              WeddingParticipant.VENDORS,
            ],
            formality: FormalityLevel.SEMI_FORMAL,
            culturalConsiderations: [
              'dining_customs',
              'entertainment_preferences',
            ],
          },
        ],
        culturalNotes: [],
        alternativeTerms: ['reception', 'celebration', 'party'],
        isRequired: true,
        sensitivity: TermSensitivity.PUBLIC,
      },
      {
        term: 'wedding photographer',
        category: WeddingTermCategory.PHOTOGRAPHY,
        translations: {
          es: {
            translation: 'fotógrafo de bodas',
            confidence: 95,
            culturallyAppropriate: true,
            formalityLevel: FormalityLevel.FORMAL,
            regionalVariations: {},
          },
          fr: {
            translation: 'photographe de mariage',
            confidence: 95,
            culturallyAppropriate: true,
            formalityLevel: FormalityLevel.FORMAL,
            regionalVariations: {},
          },
          de: {
            translation: 'Hochzeitsfotograf',
            confidence: 95,
            culturallyAppropriate: true,
            formalityLevel: FormalityLevel.FORMAL,
            regionalVariations: {},
          },
          it: {
            translation: 'fotografo matrimoniale',
            confidence: 95,
            culturallyAppropriate: true,
            formalityLevel: FormalityLevel.FORMAL,
            regionalVariations: {},
          },
          pt: {
            translation: 'fotógrafo de casamento',
            confidence: 95,
            culturallyAppropriate: true,
            formalityLevel: FormalityLevel.FORMAL,
            regionalVariations: {},
          },
        },
        context: [
          {
            scenario: WeddingScenario.VENDOR_MEETING,
            participants: [
              WeddingParticipant.COUPLE,
              WeddingParticipant.PHOTOGRAPHER,
            ],
            formality: FormalityLevel.FORMAL,
            culturalConsiderations: [
              'photography_customs',
              'privacy_expectations',
            ],
          },
        ],
        culturalNotes: [],
        alternativeTerms: ['photographer', 'wedding photography professional'],
        isRequired: false,
        sensitivity: TermSensitivity.PUBLIC,
      },
    ];

    // Store in database and cache
    for (const term of coreTerminology) {
      const fullTerm = {
        id: `wedding_${term.term?.replace(/\s+/g, '_')}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        ...term,
      } as WeddingTerm;

      await this.updateWeddingTerminology(fullTerm);
    }
  }

  private async performValidation(
    originalText: string,
    translatedText: string,
    sourceLanguage: string,
    targetLanguage: string,
    context: WeddingContext,
    contentType: WeddingTermCategory,
  ): Promise<ValidationResult> {
    const issues: ValidationIssue[] = [];
    const suggestions: ValidationSuggestion[] = [];
    const culturalFlags: CulturalFlag[] = [];

    let score = 100;
    let confidence = 85;

    // Extract terms from both texts
    const originalTerms = this.extractTerms(originalText);
    const translatedTerms = this.extractTerms(translatedText);

    // Validate each term
    for (const term of originalTerms) {
      const termValidation = await this.validateSingleTerm(
        term,
        translatedTerms.find((t) =>
          this.areTermsRelated(term, t, sourceLanguage, targetLanguage),
        ) || '',
        sourceLanguage,
        targetLanguage,
        context,
      );

      issues.push(...termValidation.issues);
      suggestions.push(...termValidation.suggestions);
      culturalFlags.push(...termValidation.culturalFlags);

      score = Math.min(score, termValidation.score);
      confidence = Math.min(confidence, termValidation.confidence);
    }

    // Check for missing wedding-specific terms
    const requiredTerms = await this.getRequiredTermsForContext(
      context,
      contentType,
    );
    for (const requiredTerm of requiredTerms) {
      if (
        !originalTerms.some((t) =>
          t.toLowerCase().includes(requiredTerm.toLowerCase()),
        )
      ) {
        issues.push({
          type: ValidationIssueType.MISSING_CONTEXT,
          severity: 'medium',
          term: requiredTerm,
          context: context.scenario,
          message: `Missing important wedding term: "${requiredTerm}"`,
        });
        score -= 10;
      }
    }

    // Generate improved translation if needed
    let improvedTranslation: string | undefined;
    if (score < this.config.validationThreshold && suggestions.length > 0) {
      improvedTranslation = await this.generateImprovedTranslation(
        translatedText,
        suggestions,
      );
    }

    return {
      isValid: score >= this.config.validationThreshold,
      score: Math.max(0, Math.min(100, score)),
      issues,
      suggestions,
      culturalFlags,
      improvedTranslation,
      confidence,
    };
  }

  private async getWeddingTerms(
    term: string,
    language: string,
  ): Promise<WeddingTerm[]> {
    const cacheKey = `${term}_${language}`;

    // Check cache first
    const cached = this.terminologyCache.get(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const { data, error } = await this.supabase
        .from('wedding_terminology')
        .select('*')
        .ilike('term', `%${term}%`);

      if (error) {
        throw error;
      }

      const terms = (data as WeddingTerm[]) || [];

      // Cache the result
      this.terminologyCache.set(cacheKey, terms);

      return terms;
    } catch (error) {
      console.error('Error fetching wedding terms:', error);
      return [];
    }
  }

  private extractTerms(text: string): string[] {
    // Extract meaningful terms (nouns, important adjectives)
    const words = text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter((word) => word.length > 2);

    // Filter out common stop words
    const stopWords = new Set([
      'the',
      'a',
      'an',
      'and',
      'or',
      'but',
      'in',
      'on',
      'at',
      'to',
      'for',
      'of',
      'with',
      'by',
      'is',
      'are',
      'was',
      'were',
      'be',
      'been',
      'have',
      'has',
      'had',
      'will',
      'would',
      'could',
      'should',
      'may',
      'might',
    ]);

    return words.filter((word) => !stopWords.has(word));
  }

  private calculateTranslationAccuracy(
    translation: string,
    expectedTranslation: string,
  ): number {
    const normalizedTranslation = translation.toLowerCase().trim();
    const normalizedExpected = expectedTranslation.toLowerCase().trim();

    if (normalizedTranslation === normalizedExpected) {
      return 100;
    }

    // Calculate similarity using Levenshtein distance
    const distance = this.levenshteinDistance(
      normalizedTranslation,
      normalizedExpected,
    );
    const maxLength = Math.max(
      normalizedTranslation.length,
      normalizedExpected.length,
    );

    return Math.round((1 - distance / maxLength) * 100);
  }

  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = Array(str2.length + 1)
      .fill(null)
      .map(() => Array(str1.length + 1).fill(null));

    for (let i = 0; i <= str1.length; i += 1) {
      matrix[0][i] = i;
    }

    for (let j = 0; j <= str2.length; j += 1) {
      matrix[j][0] = j;
    }

    for (let j = 1; j <= str2.length; j += 1) {
      for (let i = 1; i <= str1.length; i += 1) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1, // deletion
          matrix[j - 1][i] + 1, // insertion
          matrix[j - 1][i - 1] + indicator, // substitution
        );
      }
    }

    return matrix[str2.length][str1.length];
  }

  private areTermsRelated(
    term1: string,
    term2: string,
    sourceLang: string,
    targetLang: string,
  ): boolean {
    // Simple heuristic - in production would use more sophisticated matching
    return term1.length > 0 && term2.length > 0;
  }

  private async getRequiredTermsForContext(
    context: WeddingContext,
    contentType: WeddingTermCategory,
  ): Promise<string[]> {
    const requiredTerms: string[] = [];

    // Add scenario-specific required terms
    switch (context.scenario) {
      case WeddingScenario.FORMAL_CEREMONY:
        requiredTerms.push('bride', 'groom', 'ceremony', 'officiant');
        break;
      case WeddingScenario.RECEPTION:
        requiredTerms.push('reception', 'celebration', 'guests');
        break;
      case WeddingScenario.VENDOR_MEETING:
        requiredTerms.push('vendor', 'service', 'contract');
        break;
    }

    // Add participant-specific terms
    if (context.participants.includes(WeddingParticipant.PHOTOGRAPHER)) {
      requiredTerms.push('photographer', 'photos');
    }
    if (context.participants.includes(WeddingParticipant.CATERER)) {
      requiredTerms.push('catering', 'menu');
    }

    return requiredTerms;
  }

  private async generateImprovedTranslation(
    originalTranslation: string,
    suggestions: ValidationSuggestion[],
  ): Promise<string> {
    let improved = originalTranslation;

    // Apply suggestions in order of confidence
    suggestions
      .sort((a, b) => b.confidence - a.confidence)
      .forEach((suggestion) => {
        improved = improved.replace(
          new RegExp(suggestion.originalTerm, 'gi'),
          suggestion.suggestedTerm,
        );
      });

    return improved;
  }

  private generateCacheKey(
    originalText: string,
    translatedText: string,
    sourceLanguage: string,
    targetLanguage: string,
    context: WeddingContext,
  ): string {
    const hash = this.simpleHash(
      `${originalText}_${translatedText}_${sourceLanguage}_${targetLanguage}_${context.scenario}`,
    );
    return `validation_${hash}`;
  }

  private isCacheValid(cacheKey: string): boolean {
    // Simple cache validation - in production would track timestamps
    return this.validationCache.has(cacheKey);
  }

  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(16);
  }
}

// ================================
// FACTORY FUNCTION
// ================================

export function createWeddingTerminologyValidator(
  config: Partial<WeddingTerminologyConfig> = {},
  supabase: SupabaseClient<Database>,
): WeddingTerminologyValidator {
  const defaultConfig: WeddingTerminologyConfig = {
    strictMode: true,
    culturalValidation: true,
    industryStandards: true,
    customTerminologies: [],
    validationThreshold: 70,
    cacheExpiration: 60, // minutes
  };

  return new WeddingTerminologyValidator(
    { ...defaultConfig, ...config },
    supabase,
  );
}

// ================================
// UTILITY FUNCTIONS
// ================================

export function getDefaultWeddingContext(): WeddingContext {
  return {
    scenario: WeddingScenario.FORMAL_CEREMONY,
    participants: [WeddingParticipant.COUPLE],
    formality: FormalityLevel.FORMAL,
    culturalConsiderations: [],
  };
}

export function createVendorContext(
  vendorType: WeddingParticipant,
): WeddingContext {
  return {
    scenario: WeddingScenario.VENDOR_MEETING,
    participants: [WeddingParticipant.COUPLE, vendorType],
    formality: FormalityLevel.FORMAL,
    culturalConsiderations: [],
  };
}

export function createCeremonyContext(
  formalityLevel: FormalityLevel,
): WeddingContext {
  return {
    scenario: WeddingScenario.FORMAL_CEREMONY,
    participants: [
      WeddingParticipant.COUPLE,
      WeddingParticipant.GUESTS,
      WeddingParticipant.OFFICIANT,
    ],
    formality: formalityLevel,
    culturalConsiderations: ['religious_considerations', 'cultural_traditions'],
  };
}
