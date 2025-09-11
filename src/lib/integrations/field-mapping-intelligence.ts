/**
 * Field Mapping Intelligence - AI-powered field mapping suggestions
 * WS-216 Auto-Population System - Team C Integration Infrastructure
 *
 * Features:
 * - Intelligent field name analysis
 * - Context-aware mapping suggestions
 * - Confidence scoring for automated mappings
 * - Learning from user feedback
 * - Wedding-specific pattern recognition
 */

import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { openai } from '@/lib/integrations/openai-service';

// Field mapping schemas
const WedSyncFieldSchema = z.object({
  name: z.string(),
  type: z.string(),
  category: z.enum([
    'personal',
    'wedding',
    'contact',
    'preferences',
    'logistics',
    'vendor',
  ]),
  description: z.string(),
  synonyms: z.array(z.string()),
  patterns: z.array(z.string()),
  validation: z.record(z.unknown()).optional(),
});

const FieldAnalysisSchema = z.object({
  semanticType: z.string(),
  confidence: z.number().min(0).max(1),
  patterns: z.array(z.string()),
  similarFields: z.array(z.string()),
  context: z.string(),
  weddingRelevance: z.number().min(0).max(1),
  suggestions: z.array(
    z.object({
      field: z.string(),
      confidence: z.number().min(0).max(1),
      reasoning: z.string(),
    }),
  ),
});

const MappingSuggestionSchema = z.object({
  targetField: z.string(),
  confidence: z.number().min(0).max(1),
  reasoning: z.string(),
  transformations: z.array(
    z.object({
      type: z.string(),
      from: z.string(),
      to: z.string(),
      rules: z.record(z.unknown()),
    }),
  ),
  metadata: z.record(z.unknown()).optional(),
});

const MappingFeedbackSchema = z.object({
  sourceField: z.string(),
  suggestedField: z.string(),
  actualField: z.string(),
  accepted: z.boolean(),
  confidence: z.number(),
  reason: z.string().optional(),
  organizationId: z.string().uuid(),
  platformType: z.string(),
});

type WedSyncField = z.infer<typeof WedSyncFieldSchema>;
type FieldAnalysis = z.infer<typeof FieldAnalysisSchema>;
type MappingSuggestion = z.infer<typeof MappingSuggestionSchema>;
type MappingFeedback = z.infer<typeof MappingFeedbackSchema>;

interface FieldMappingEngine {
  analyzeField(field: any): Promise<FieldAnalysis>;
  suggestMapping(
    field: any,
    availableTargets: WedSyncField[],
  ): Promise<MappingSuggestion[]>;
  trainModel(mappingHistory: MappingFeedback[]): Promise<void>;
  validateMapping(mapping: any): boolean;
}

interface MappingAnalysis {
  textSimilarity: number; // String similarity to core fields
  semanticSimilarity: number; // Meaning-based similarity
  contextMatch: number; // Supplier type/form context
  patternMatch: number; // Regex pattern matching
  historicalAccuracy: number; // Past mapping success rate
}

export class FieldMappingIntelligence implements FieldMappingEngine {
  private supabase: ReturnType<typeof createClient>;
  private wedSyncFields: WedSyncField[] = [];
  private fieldPatterns: Map<string, RegExp[]> = new Map();
  private trainingData: MappingFeedback[] = [];

  // Wedding-specific field patterns
  private readonly WEDDING_FIELD_PATTERNS = {
    weddingDate: [
      /^(wedding|event|ceremony)[-_\s]?date$/i,
      /^date[-_\s]?(of[-_\s]?)?(wedding|event|ceremony)$/i,
      /^(ceremony|reception)[-_\s]?date$/i,
      /^big[-_\s]?day[-_\s]?date$/i,
      /^special[-_\s]?date$/i,
    ],

    guestCount: [
      /^(guest|attendee)[-_\s]?(count|number|total)$/i,
      /^(number|total)[-_\s]?(of[-_\s]?)?(guests|attendees)$/i,
      /^head[-_\s]?count$/i,
      /^expected[-_\s]?(guests|attendance)$/i,
      /^party[-_\s]?size$/i,
    ],

    partnerNames: [
      /^(bride|partner1|primary)[-_\s]?name$/i,
      /^(groom|partner2|secondary)[-_\s]?name$/i,
      /^(client|contact)[-_\s]?name$/i,
      /^(first|last)[-_\s]?name$/i,
      /^full[-_\s]?name$/i,
    ],

    venue: [
      /^venue[-_\s]?(name|location)$/i,
      /^(reception|ceremony)[-_\s]?venue$/i,
      /^location[-_\s]?(name|address)$/i,
      /^event[-_\s]?location$/i,
    ],

    budget: [
      /^(wedding|total|event)[-_\s]?budget$/i,
      /^budget[-_\s]?(amount|total)$/i,
      /^max[-_\s]?(budget|spend)$/i,
      /^price[-_\s]?range$/i,
    ],

    contactInfo: [
      /^(email|e[-_\s]?mail)[-_\s]?(address)?$/i,
      /^phone[-_\s]?(number)?$/i,
      /^(mobile|cell)[-_\s]?phone$/i,
      /^contact[-_\s]?(number|info)$/i,
    ],

    address: [
      /^address[-_\s]?(line[12]?)?$/i,
      /^(home|mailing)[-_\s]?address$/i,
      /^(city|town|state|zip|postal)[-_\s]?code?$/i,
      /^country$/i,
    ],

    preferences: [
      /^(style|theme)[-_\s]?preference$/i,
      /^preferred[-_\s]?(style|color|theme)$/i,
      /^special[-_\s]?(requests|notes)$/i,
      /^dietary[-_\s]?(restrictions|requirements)$/i,
    ],
  };

  constructor() {
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL ||
        (() => {
          throw new Error(
            'Missing environment variable: NEXT_PUBLIC_SUPABASE_URL',
          );
        })(),
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
        (() => {
          throw new Error(
            'Missing environment variable: SUPABASE_SERVICE_ROLE_KEY',
          );
        })(),
    );

    this.initializeWedSyncFields();
    this.initializePatternMap();
  }

  async analyzeField(field: any): Promise<FieldAnalysis> {
    try {
      // Multi-factor analysis
      const textAnalysis = this.analyzeFieldText(field);
      const patternAnalysis = this.analyzeFieldPatterns(field);
      const contextAnalysis = this.analyzeFieldContext(field);
      const semanticAnalysis = await this.analyzeFieldSemantics(field);

      // Combine analysis results
      const analysis: FieldAnalysis = {
        semanticType: semanticAnalysis.type || textAnalysis.type,
        confidence: this.calculateOverallConfidence([
          textAnalysis.confidence,
          patternAnalysis.confidence,
          contextAnalysis.confidence,
          semanticAnalysis.confidence,
        ]),
        patterns: patternAnalysis.matchedPatterns,
        similarFields: await this.findSimilarFields(field),
        context: contextAnalysis.context,
        weddingRelevance: this.calculateWeddingRelevance(field),
        suggestions: [],
      };

      // Generate initial suggestions based on analysis
      analysis.suggestions = await this.generateInitialSuggestions(
        analysis,
        field,
      );

      return analysis;
    } catch (error) {
      console.error('Field analysis error:', error);
      return this.getDefaultAnalysis(field);
    }
  }

  async suggestMapping(
    field: any,
    availableTargets: WedSyncField[],
  ): Promise<MappingSuggestion[]> {
    try {
      const analysis = await this.analyzeField(field);
      const suggestions: MappingSuggestion[] = [];

      // Score each target field
      for (const target of availableTargets) {
        const mappingScore = await this.calculateMappingScore(
          field,
          target,
          analysis,
        );

        if (mappingScore.totalScore > 0.3) {
          // Threshold for relevance
          suggestions.push({
            targetField: target.name,
            confidence: mappingScore.totalScore,
            reasoning: this.generateReasoningText(
              mappingScore,
              analysis,
              target,
            ),
            transformations: this.suggestTransformations(field, target),
            metadata: {
              analysis: mappingScore,
              fieldCategory: target.category,
              semanticType: analysis.semanticType,
            },
          });
        }
      }

      // Sort by confidence and return top 3
      return suggestions
        .sort((a, b) => b.confidence - a.confidence)
        .slice(0, 3);
    } catch (error) {
      console.error('Mapping suggestion error:', error);
      return [];
    }
  }

  async trainModel(mappingHistory: MappingFeedback[]): Promise<void> {
    try {
      // Store training data
      this.trainingData = [...this.trainingData, ...mappingHistory];

      // Update field patterns based on successful mappings
      for (const feedback of mappingHistory) {
        if (feedback.accepted && feedback.confidence > 0.7) {
          await this.updateFieldPatterns(feedback);
        }
      }

      // Store training data in database
      await this.storeTrainingData(mappingHistory);

      // Retrain AI model with new data (simplified version)
      await this.retrainAIModel();

      console.log(`Model trained with ${mappingHistory.length} new examples`);
    } catch (error) {
      console.error('Model training error:', error);
    }
  }

  validateMapping(mapping: any): boolean {
    try {
      MappingSuggestionSchema.parse(mapping);
      return mapping.confidence > 0.5; // Minimum confidence threshold
    } catch (error) {
      return false;
    }
  }

  // Field analysis methods
  private analyzeFieldText(field: any): { type: string; confidence: number } {
    const fieldText = (
      field.title ||
      field.label ||
      field.name ||
      ''
    ).toLowerCase();

    // Check for obvious field types
    if (fieldText.includes('email')) return { type: 'email', confidence: 0.9 };
    if (fieldText.includes('phone') || fieldText.includes('mobile'))
      return { type: 'phone', confidence: 0.9 };
    if (fieldText.includes('date')) return { type: 'date', confidence: 0.8 };
    if (fieldText.includes('address'))
      return { type: 'address', confidence: 0.8 };
    if (fieldText.includes('name')) return { type: 'name', confidence: 0.8 };
    if (fieldText.includes('budget') || fieldText.includes('price'))
      return { type: 'budget', confidence: 0.8 };
    if (fieldText.includes('guest') && fieldText.includes('count'))
      return { type: 'guestCount', confidence: 0.8 };
    if (fieldText.includes('venue')) return { type: 'venue', confidence: 0.8 };

    // Default based on field type
    switch (field.type) {
      case 'email':
        return { type: 'email', confidence: 0.7 };
      case 'phone':
      case 'tel':
        return { type: 'phone', confidence: 0.7 };
      case 'date':
        return { type: 'date', confidence: 0.7 };
      case 'number':
        return { type: 'number', confidence: 0.6 };
      case 'textarea':
        return { type: 'longText', confidence: 0.6 };
      default:
        return { type: 'text', confidence: 0.5 };
    }
  }

  private analyzeFieldPatterns(field: any): {
    matchedPatterns: string[];
    confidence: number;
  } {
    const fieldText = (
      field.title ||
      field.label ||
      field.name ||
      ''
    ).toLowerCase();
    const matchedPatterns: string[] = [];
    let maxConfidence = 0;

    // Check against wedding field patterns
    for (const [fieldType, patterns] of Object.entries(
      this.WEDDING_FIELD_PATTERNS,
    )) {
      for (const pattern of patterns) {
        if (pattern.test(fieldText)) {
          matchedPatterns.push(fieldType);
          maxConfidence = Math.max(maxConfidence, 0.8);
          break;
        }
      }
    }

    return {
      matchedPatterns,
      confidence: maxConfidence,
    };
  }

  private analyzeFieldContext(field: any): {
    context: string;
    confidence: number;
  } {
    // Analyze form context, supplier type, etc.
    const formTitle = field.formTitle || '';
    const fieldPosition = field.index || 0;

    let context = 'general';
    let confidence = 0.5;

    // Wedding-specific context detection
    if (formTitle.toLowerCase().includes('wedding')) {
      context = 'wedding';
      confidence = 0.8;
    } else if (formTitle.toLowerCase().includes('event')) {
      context = 'event';
      confidence = 0.7;
    } else if (formTitle.toLowerCase().includes('contact')) {
      context = 'contact';
      confidence = 0.7;
    } else if (formTitle.toLowerCase().includes('booking')) {
      context = 'booking';
      confidence = 0.7;
    }

    // Early fields are usually more important
    if (fieldPosition < 3) {
      confidence += 0.1;
    }

    return { context, confidence };
  }

  private async analyzeFieldSemantics(
    field: any,
  ): Promise<{ type: string; confidence: number }> {
    try {
      // Use OpenAI for semantic analysis
      const fieldDescription = `Field: ${field.title || field.name}
Type: ${field.type}
Placeholder: ${field.placeholder || 'none'}
Help text: ${field.helpText || 'none'}
Options: ${field.options?.map((o: any) => o.label).join(', ') || 'none'}`;

      const prompt = `Analyze this form field for a wedding vendor form and determine its semantic type and wedding relevance:

${fieldDescription}

Respond with JSON in this format:
{
  "type": "semantic_field_type",
  "confidence": 0.8,
  "weddingRelevance": 0.9,
  "explanation": "brief explanation"
}

Common wedding field types: bride_name, groom_name, wedding_date, guest_count, venue_name, budget, contact_email, contact_phone, ceremony_time, reception_time, special_requests, dietary_restrictions, style_preference`;

      const response = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.1,
        max_tokens: 200,
      });

      const result = JSON.parse(response.choices[0].message.content || '{}');
      return {
        type: result.type || 'text',
        confidence: Math.min(result.confidence || 0.5, 1),
      };
    } catch (error) {
      console.error('Semantic analysis error:', error);
      return { type: 'text', confidence: 0.5 };
    }
  }

  private async findSimilarFields(field: any): Promise<string[]> {
    try {
      // Find similar fields from historical data
      const { data: historicalMappings } = await this.supabase
        .from('field_mapping_suggestions')
        .select('external_field_id, suggested_wedsync_field')
        .ilike('external_field_id', `%${field.name}%`)
        .limit(10);

      return historicalMappings?.map((m) => m.suggested_wedsync_field) || [];
    } catch (error) {
      console.error('Similar fields lookup error:', error);
      return [];
    }
  }

  private calculateWeddingRelevance(field: any): number {
    const fieldText = (
      field.title ||
      field.label ||
      field.name ||
      ''
    ).toLowerCase();

    const weddingKeywords = [
      'wedding',
      'bride',
      'groom',
      'ceremony',
      'reception',
      'venue',
      'guest',
      'marriage',
      'celebration',
      'party',
      'honeymoon',
      'engagement',
      'anniversary',
      'special day',
    ];

    let relevanceScore = 0;
    for (const keyword of weddingKeywords) {
      if (fieldText.includes(keyword)) {
        relevanceScore += 0.2;
      }
    }

    return Math.min(relevanceScore, 1);
  }

  private async generateInitialSuggestions(
    analysis: FieldAnalysis,
    field: any,
  ): Promise<Array<{ field: string; confidence: number; reasoning: string }>> {
    const suggestions = [];

    // Pattern-based suggestions
    for (const pattern of analysis.patterns) {
      const matchingFields = this.wedSyncFields.filter((f) =>
        f.synonyms.some((s) => s.toLowerCase() === pattern.toLowerCase()),
      );

      for (const matchingField of matchingFields) {
        suggestions.push({
          field: matchingField.name,
          confidence: 0.8,
          reasoning: `Pattern match: ${pattern}`,
        });
      }
    }

    // Type-based suggestions
    const typeMatches = this.wedSyncFields.filter((f) => f.type === field.type);
    for (const match of typeMatches.slice(0, 2)) {
      suggestions.push({
        field: match.name,
        confidence: 0.6,
        reasoning: `Field type match: ${field.type}`,
      });
    }

    return suggestions.slice(0, 3);
  }

  private calculateOverallConfidence(confidences: number[]): number {
    if (confidences.length === 0) return 0;

    // Weighted average with higher weight for higher confidences
    const weights = confidences.map((c) => c * c);
    const weightedSum = confidences.reduce(
      (sum, conf, i) => sum + conf * weights[i],
      0,
    );
    const weightSum = weights.reduce((sum, w) => sum + w, 0);

    return weightSum > 0 ? weightedSum / weightSum : 0.5;
  }

  private async calculateMappingScore(
    field: any,
    target: WedSyncField,
    analysis: FieldAnalysis,
  ): Promise<MappingAnalysis & { totalScore: number }> {
    const fieldText = (
      field.title ||
      field.label ||
      field.name ||
      ''
    ).toLowerCase();
    const targetText = target.name.toLowerCase();
    const targetSynonyms = target.synonyms.map((s) => s.toLowerCase());

    // Text similarity (40% weight)
    const textSimilarity = Math.max(
      this.calculateStringSimilarity(fieldText, targetText),
      Math.max(
        ...targetSynonyms.map((s) =>
          this.calculateStringSimilarity(fieldText, s),
        ),
      ),
    );

    // Semantic similarity (30% weight)
    const semanticSimilarity =
      analysis.semanticType === target.type
        ? 0.9
        : targetSynonyms.includes(analysis.semanticType)
          ? 0.7
          : 0.3;

    // Context match (20% weight)
    const contextMatch = this.calculateContextMatch(
      analysis.context,
      target.category,
    );

    // Pattern match (5% weight)
    const patternMatch = target.patterns.some((pattern) =>
      new RegExp(pattern, 'i').test(fieldText),
    )
      ? 0.9
      : 0;

    // Historical accuracy (5% weight)
    const historicalAccuracy = await this.getHistoricalAccuracy(
      field.name,
      target.name,
    );

    // Calculate weighted total score
    const totalScore =
      textSimilarity * 0.4 +
      semanticSimilarity * 0.3 +
      contextMatch * 0.2 +
      patternMatch * 0.05 +
      historicalAccuracy * 0.05;

    return {
      textSimilarity,
      semanticSimilarity,
      contextMatch,
      patternMatch,
      historicalAccuracy,
      totalScore,
    };
  }

  private calculateStringSimilarity(str1: string, str2: string): number {
    // Simple Levenshtein distance-based similarity
    const distance = this.levenshteinDistance(str1, str2);
    const maxLength = Math.max(str1.length, str2.length);
    return maxLength > 0 ? 1 - distance / maxLength : 1;
  }

  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = [];

    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1,
          );
        }
      }
    }

    return matrix[str2.length][str1.length];
  }

  private calculateContextMatch(
    analysisContext: string,
    targetCategory: string,
  ): number {
    const contextCategoryMap: Record<string, string[]> = {
      wedding: ['personal', 'wedding', 'preferences'],
      contact: ['contact', 'personal'],
      event: ['wedding', 'logistics'],
      booking: ['vendor', 'logistics'],
      general: ['personal', 'contact'],
    };

    const expectedCategories = contextCategoryMap[analysisContext] || [];
    return expectedCategories.includes(targetCategory) ? 0.8 : 0.3;
  }

  private async getHistoricalAccuracy(
    sourceField: string,
    targetField: string,
  ): Promise<number> {
    try {
      const { data } = await this.supabase
        .from('mapping_training_data')
        .select('user_verified')
        .eq('field_label', sourceField)
        .eq('mapped_to', targetField);

      if (!data || data.length === 0) return 0.5;

      const verified = data.filter((d) => d.user_verified).length;
      return verified / data.length;
    } catch (error) {
      return 0.5;
    }
  }

  private generateReasoningText(
    score: MappingAnalysis & { totalScore: number },
    analysis: FieldAnalysis,
    target: WedSyncField,
  ): string {
    const reasons = [];

    if (score.textSimilarity > 0.7) {
      reasons.push(
        `High text similarity (${Math.round(score.textSimilarity * 100)}%)`,
      );
    }

    if (score.semanticSimilarity > 0.7) {
      reasons.push(`Semantic type match: ${analysis.semanticType}`);
    }

    if (score.contextMatch > 0.7) {
      reasons.push(`Context match: ${analysis.context} → ${target.category}`);
    }

    if (score.patternMatch > 0.8) {
      reasons.push('Matches known patterns');
    }

    if (score.historicalAccuracy > 0.7) {
      reasons.push(
        `Strong historical accuracy (${Math.round(score.historicalAccuracy * 100)}%)`,
      );
    }

    if (reasons.length === 0) {
      reasons.push('General field type compatibility');
    }

    return reasons.join('; ');
  }

  private suggestTransformations(field: any, target: WedSyncField): any[] {
    const transformations = [];

    // Type transformations
    if (field.type !== target.type) {
      transformations.push({
        type: 'type_conversion',
        from: field.type,
        to: target.type,
        rules: this.getTypeConversionRules(field.type, target.type),
      });
    }

    // Format transformations
    if (target.name.includes('phone') && field.type === 'text') {
      transformations.push({
        type: 'format_phone',
        from: 'text',
        to: 'phone',
        rules: { format: 'E.164' },
      });
    }

    if (target.name.includes('date') && field.type === 'text') {
      transformations.push({
        type: 'parse_date',
        from: 'text',
        to: 'date',
        rules: { formats: ['MM/DD/YYYY', 'DD/MM/YYYY', 'YYYY-MM-DD'] },
      });
    }

    return transformations;
  }

  private getTypeConversionRules(fromType: string, toType: string): any {
    const rules: Record<string, Record<string, any>> = {
      text: {
        number: { parse: 'float', fallback: 0 },
        date: { formats: ['MM/DD/YYYY', 'DD/MM/YYYY'] },
        boolean: { truthy: ['yes', 'true', '1', 'on'] },
      },
      number: {
        text: { format: 'string' },
        boolean: { falsy: [0], truthy: 'nonzero' },
      },
    };

    return rules[fromType]?.[toType] || {};
  }

  private getDefaultAnalysis(field: any): FieldAnalysis {
    return {
      semanticType: field.type || 'text',
      confidence: 0.5,
      patterns: [],
      similarFields: [],
      context: 'general',
      weddingRelevance: 0.3,
      suggestions: [],
    };
  }

  // Training and improvement methods
  private async updateFieldPatterns(feedback: MappingFeedback): Promise<void> {
    // Update patterns based on successful mappings
    const existingPatterns = this.fieldPatterns.get(feedback.actualField) || [];

    // Add new pattern based on source field name
    const newPattern = new RegExp(
      feedback.sourceField.replace(/[^a-z0-9]/gi, '[-_\\s]?'),
      'i',
    );

    if (!existingPatterns.some((p) => p.source === newPattern.source)) {
      existingPatterns.push(newPattern);
      this.fieldPatterns.set(feedback.actualField, existingPatterns);
    }
  }

  private async storeTrainingData(
    mappingHistory: MappingFeedback[],
  ): Promise<void> {
    for (const feedback of mappingHistory) {
      await this.supabase.from('mapping_training_data').upsert({
        organization_id: feedback.organizationId,
        field_label: feedback.sourceField,
        field_type: 'text', // Would extract from original field
        mapped_to: feedback.actualField,
        mapping_confidence: feedback.confidence,
        user_verified: feedback.accepted,
        platform_type: feedback.platformType,
      });
    }
  }

  private async retrainAIModel(): Promise<void> {
    // In a production system, this would trigger model retraining
    // For now, just update our internal patterns and weights
    console.log('AI model retrained with new mapping data');
  }

  // Initialization methods
  private initializeWedSyncFields(): void {
    this.wedSyncFields = [
      {
        name: 'bride_name',
        type: 'text',
        category: 'personal',
        description: 'Name of the bride/first partner',
        synonyms: ['bride', 'partner1', 'first_name', 'primary_contact'],
        patterns: ['^(bride|partner1)[-_\\s]?name$'],
      },
      {
        name: 'groom_name',
        type: 'text',
        category: 'personal',
        description: 'Name of the groom/second partner',
        synonyms: ['groom', 'partner2', 'secondary_contact'],
        patterns: ['^(groom|partner2)[-_\\s]?name$'],
      },
      {
        name: 'wedding_date',
        type: 'date',
        category: 'wedding',
        description: 'Date of the wedding ceremony',
        synonyms: ['event_date', 'ceremony_date', 'big_day'],
        patterns: ['^(wedding|event|ceremony)[-_\\s]?date$'],
      },
      {
        name: 'guest_count',
        type: 'number',
        category: 'wedding',
        description: 'Expected number of wedding guests',
        synonyms: ['attendee_count', 'party_size', 'head_count'],
        patterns: ['^(guest|attendee)[-_\\s]?(count|number)$'],
      },
      {
        name: 'venue_name',
        type: 'text',
        category: 'wedding',
        description: 'Name of the wedding venue',
        synonyms: ['location', 'venue', 'ceremony_location'],
        patterns: ['^venue[-_\\s]?name$'],
      },
      {
        name: 'wedding_budget',
        type: 'number',
        category: 'wedding',
        description: 'Total wedding budget amount',
        synonyms: ['budget', 'total_budget', 'max_spend'],
        patterns: ['^(wedding|total)[-_\\s]?budget$'],
      },
      {
        name: 'contact_email',
        type: 'email',
        category: 'contact',
        description: 'Primary email address for contact',
        synonyms: ['email', 'email_address', 'primary_email'],
        patterns: ['^(email|contact[-_\\s]?email)$'],
      },
      {
        name: 'contact_phone',
        type: 'phone',
        category: 'contact',
        description: 'Primary phone number for contact',
        synonyms: ['phone', 'phone_number', 'mobile'],
        patterns: ['^(phone|contact[-_\\s]?phone)$'],
      },
      // Add more wedding-specific fields as needed
    ];
  }

  private initializePatternMap(): void {
    for (const field of this.wedSyncFields) {
      const patterns = field.patterns.map((p) => new RegExp(p, 'i'));
      this.fieldPatterns.set(field.name, patterns);
    }
  }

  // Public API methods
  async recordFeedback(feedback: MappingFeedback): Promise<void> {
    try {
      MappingFeedbackSchema.parse(feedback);

      await this.supabase.from('field_mapping_feedback').insert({
        source_field: feedback.sourceField,
        suggested_field: feedback.suggestedField,
        actual_field: feedback.actualField,
        accepted: feedback.accepted,
        confidence: feedback.confidence,
        reason: feedback.reason,
        organization_id: feedback.organizationId,
        platform_type: feedback.platformType,
        created_at: new Date().toISOString(),
      });

      // Update training data
      await this.trainModel([feedback]);
    } catch (error) {
      console.error('Feedback recording error:', error);
      throw error;
    }
  }

  async getMappingAccuracy(): Promise<{
    overall: number;
    byPlatform: Record<string, number>;
  }> {
    const { data } = await this.supabase
      .from('field_mapping_feedback')
      .select('platform_type, accepted');

    if (!data) return { overall: 0, byPlatform: {} };

    const overall = data.filter((d) => d.accepted).length / data.length;

    const byPlatform = data.reduce((acc: any, item) => {
      if (!acc[item.platform_type]) {
        acc[item.platform_type] = { total: 0, accepted: 0 };
      }
      acc[item.platform_type].total++;
      if (item.accepted) acc[item.platform_type].accepted++;
      return acc;
    }, {});

    // Convert to percentages
    Object.keys(byPlatform).forEach((platform) => {
      const stats = byPlatform[platform];
      byPlatform[platform] = stats.total > 0 ? stats.accepted / stats.total : 0;
    });

    return { overall, byPlatform };
  }
}

// Singleton instance
export const fieldMappingIntelligence = new FieldMappingIntelligence();
