/**
 * Smart Mapping Service
 * WS-123: AI-Powered Intelligent Field Mapping for Data Processing
 * Automatically maps extracted fields to database fields with machine learning
 */

import { createClient } from '@supabase/supabase-js';
import { FieldExtractionService } from './field-extraction-service';

// Types for Smart Mapping System
export interface SmartMappingRequest {
  documentId: string;
  extractedFields: ExtractedFieldData[];
  targetSchema?: TargetSchema;
  options?: SmartMappingOptions;
}

export interface ExtractedFieldData {
  id: string;
  name: string;
  value: string | number | boolean;
  type: FieldType;
  confidence: number;
  position?: FieldPosition;
  context?: string[];
}

export interface TargetSchema {
  id: string;
  name: string;
  fields: TargetField[];
  category: string;
}

export interface TargetField {
  id: string;
  name: string;
  label: string;
  type: FieldType;
  required: boolean;
  description?: string;
  aliases?: string[];
  validationRules?: ValidationRule[];
}

export interface SmartMappingOptions {
  confidenceThreshold?: number;
  enableSemanticMatching?: boolean;
  enableLearningMode?: boolean;
  prioritizeAccuracy?: boolean;
  allowMultipleMatches?: boolean;
  includeContextAnalysis?: boolean;
}

export interface FieldMapping {
  sourceFieldId: string;
  targetFieldId: string;
  confidence: number;
  mappingType: MappingType;
  reasoning: string;
  alternatives?: AlternativeMapping[];
}

export interface AlternativeMapping {
  targetFieldId: string;
  confidence: number;
  reasoning: string;
}

export interface SmartMappingResult {
  success: boolean;
  mappings: FieldMapping[];
  unmappedFields: ExtractedFieldData[];
  accuracy: number;
  processingTime: number;
  suggestions: MappingSuggestion[];
  errors?: MappingError[];
}

export interface MappingSuggestion {
  type: 'merge' | 'split' | 'transform' | 'validate';
  description: string;
  fieldIds: string[];
  confidence: number;
}

export interface MappingTemplate {
  id: string;
  name: string;
  description?: string;
  sourceSchema: string;
  targetSchema: string;
  mappings: FieldMapping[];
  accuracy: number;
  usageCount: number;
  isPublic: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface MappingCorrection {
  mappingId: string;
  correctTargetFieldId: string;
  feedback: 'correct' | 'incorrect' | 'partial';
  userConfidence: number;
  notes?: string;
}

export interface LearningUpdate {
  patternType: string;
  sourcePattern: string;
  targetPattern: string;
  successRate: number;
  sampleSize: number;
}

type FieldType =
  | 'text'
  | 'email'
  | 'phone'
  | 'date'
  | 'number'
  | 'currency'
  | 'boolean'
  | 'address'
  | 'url'
  | 'percentage';
type MappingType = 'exact' | 'semantic' | 'pattern' | 'contextual' | 'learned';
type ValidationRule = { type: string; value?: any; message?: string };

interface FieldPosition {
  page?: number;
  x?: number;
  y?: number;
  line?: number;
  column?: number;
}

interface MappingError {
  type: string;
  code: string;
  message: string;
  fieldId?: string;
}

export class SmartMappingService {
  private supabase: any;
  private fieldExtractionService: FieldExtractionService;
  private semanticCache: Map<string, number> = new Map();
  private learningPatterns: Map<string, LearningUpdate> = new Map();

  // Wedding industry semantic keywords for enhanced matching
  private readonly WEDDING_SEMANTICS = {
    bride: [
      'bride',
      'bride name',
      'partner 1',
      'first partner',
      'mrs',
      'ms',
      'bride to be',
    ],
    groom: [
      'groom',
      'groom name',
      'partner 2',
      'second partner',
      'mr',
      'groom to be',
    ],
    date: [
      'wedding date',
      'ceremony date',
      'event date',
      'date of wedding',
      'special date',
    ],
    venue: [
      'venue',
      'location',
      'ceremony location',
      'reception venue',
      'event location',
    ],
    phone: [
      'phone',
      'telephone',
      'mobile',
      'cell',
      'contact number',
      'phone number',
    ],
    email: [
      'email',
      'e-mail',
      'email address',
      'contact email',
      'electronic mail',
    ],
    address: [
      'address',
      'street address',
      'location',
      'residence',
      'home address',
    ],
    budget: [
      'budget',
      'total budget',
      'wedding budget',
      'allocated budget',
      'cost',
      'price',
    ],
    guests: [
      'guest count',
      'number of guests',
      'guest list size',
      'attendees',
      'invites',
    ],
  };

  constructor() {
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );
    this.fieldExtractionService = new FieldExtractionService();
    this.loadLearningPatterns();
  }

  /**
   * Main entry point for smart field mapping
   */
  async performSmartMapping(
    request: SmartMappingRequest,
  ): Promise<SmartMappingResult> {
    const startTime = Date.now();
    const errors: MappingError[] = [];

    try {
      // Get target schema (wedding form fields by default)
      const targetSchema =
        request.targetSchema || (await this.getDefaultWeddingSchema());

      // Perform multi-strategy mapping
      const mappings = await this.performMultiStrategyMapping(
        request.extractedFields,
        targetSchema.fields,
        request.options || {},
      );

      // Calculate accuracy and generate suggestions
      const accuracy = this.calculateMappingAccuracy(mappings);
      const suggestions = await this.generateMappingSuggestions(
        mappings,
        request.extractedFields,
      );

      // Identify unmapped fields
      const mappedSourceIds = new Set(mappings.map((m) => m.sourceFieldId));
      const unmappedFields = request.extractedFields.filter(
        (f) => !mappedSourceIds.has(f.id),
      );

      // Save mapping session for learning
      if (request.options?.enableLearningMode !== false) {
        await this.saveMappingSession({
          documentId: request.documentId,
          mappings,
          accuracy,
          targetSchemaId: targetSchema.id,
        });
      }

      return {
        success: true,
        mappings,
        unmappedFields,
        accuracy,
        processingTime: Date.now() - startTime,
        suggestions,
        errors: errors.length > 0 ? errors : undefined,
      };
    } catch (error: any) {
      errors.push({
        type: 'processing',
        code: 'MAPPING_FAILED',
        message: error.message,
      });

      return {
        success: false,
        mappings: [],
        unmappedFields: request.extractedFields,
        accuracy: 0,
        processingTime: Date.now() - startTime,
        suggestions: [],
        errors,
      };
    }
  }

  /**
   * Perform multi-strategy mapping using different algorithms
   */
  private async performMultiStrategyMapping(
    sourceFields: ExtractedFieldData[],
    targetFields: TargetField[],
    options: SmartMappingOptions,
  ): Promise<FieldMapping[]> {
    const mappings: FieldMapping[] = [];
    const usedTargetIds = new Set<string>();

    for (const sourceField of sourceFields) {
      let bestMapping: FieldMapping | null = null;

      // Strategy 1: Exact name matching
      const exactMatch = this.findExactMatch(
        sourceField,
        targetFields,
        usedTargetIds,
      );
      if (exactMatch && exactMatch.confidence >= 0.95) {
        bestMapping = exactMatch;
      }

      // Strategy 2: Semantic similarity matching
      if (!bestMapping && options.enableSemanticMatching !== false) {
        const semanticMatch = await this.findSemanticMatch(
          sourceField,
          targetFields,
          usedTargetIds,
        );
        if (
          semanticMatch &&
          semanticMatch.confidence >= (options.confidenceThreshold || 0.7)
        ) {
          bestMapping = semanticMatch;
        }
      }

      // Strategy 3: Pattern-based matching
      if (!bestMapping) {
        const patternMatch = this.findPatternMatch(
          sourceField,
          targetFields,
          usedTargetIds,
        );
        if (
          patternMatch &&
          patternMatch.confidence >= (options.confidenceThreshold || 0.6)
        ) {
          bestMapping = patternMatch;
        }
      }

      // Strategy 4: Context-based matching
      if (!bestMapping && options.includeContextAnalysis) {
        const contextMatch = this.findContextualMatch(
          sourceField,
          targetFields,
          usedTargetIds,
        );
        if (
          contextMatch &&
          contextMatch.confidence >= (options.confidenceThreshold || 0.5)
        ) {
          bestMapping = contextMatch;
        }
      }

      // Strategy 5: Learned pattern matching
      if (!bestMapping && options.enableLearningMode !== false) {
        const learnedMatch = this.findLearnedMatch(
          sourceField,
          targetFields,
          usedTargetIds,
        );
        if (
          learnedMatch &&
          learnedMatch.confidence >= (options.confidenceThreshold || 0.6)
        ) {
          bestMapping = learnedMatch;
        }
      }

      if (bestMapping) {
        mappings.push(bestMapping);
        if (!options.allowMultipleMatches) {
          usedTargetIds.add(bestMapping.targetFieldId);
        }
      }
    }

    return mappings;
  }

  /**
   * Find exact name matches
   */
  private findExactMatch(
    sourceField: ExtractedFieldData,
    targetFields: TargetField[],
    usedTargetIds: Set<string>,
  ): FieldMapping | null {
    const sourceName = sourceField.name.toLowerCase().trim();

    for (const targetField of targetFields) {
      if (usedTargetIds.has(targetField.id)) continue;

      // Check exact name match
      if (
        targetField.name.toLowerCase() === sourceName ||
        targetField.label.toLowerCase() === sourceName
      ) {
        return {
          sourceFieldId: sourceField.id,
          targetFieldId: targetField.id,
          confidence: 0.98,
          mappingType: 'exact',
          reasoning: `Exact name match: "${sourceField.name}" → "${targetField.label}"`,
        };
      }

      // Check aliases
      if (targetField.aliases) {
        for (const alias of targetField.aliases) {
          if (alias.toLowerCase() === sourceName) {
            return {
              sourceFieldId: sourceField.id,
              targetFieldId: targetField.id,
              confidence: 0.95,
              mappingType: 'exact',
              reasoning: `Exact alias match: "${sourceField.name}" → "${targetField.label}" (via alias "${alias}")`,
            };
          }
        }
      }
    }

    return null;
  }

  /**
   * Find semantic similarity matches using wedding industry knowledge
   */
  private async findSemanticMatch(
    sourceField: ExtractedFieldData,
    targetFields: TargetField[],
    usedTargetIds: Set<string>,
  ): FieldMapping | null {
    const sourceName = sourceField.name.toLowerCase();
    let bestMatch: FieldMapping | null = null;
    let bestScore = 0;

    for (const targetField of targetFields) {
      if (usedTargetIds.has(targetField.id)) continue;

      const semanticScore = this.calculateSemanticSimilarity(
        sourceName,
        targetField,
      );

      if (semanticScore > bestScore && semanticScore >= 0.7) {
        const alternatives = this.findAlternatives(
          sourceField,
          targetFields,
          usedTargetIds,
          targetField.id,
        );

        bestMatch = {
          sourceFieldId: sourceField.id,
          targetFieldId: targetField.id,
          confidence: semanticScore,
          mappingType: 'semantic',
          reasoning: `Semantic similarity match (${Math.round(semanticScore * 100)}%): "${sourceField.name}" → "${targetField.label}"`,
          alternatives,
        };
        bestScore = semanticScore;
      }
    }

    return bestMatch;
  }

  /**
   * Calculate semantic similarity using wedding industry knowledge
   */
  private calculateSemanticSimilarity(
    sourceName: string,
    targetField: TargetField,
  ): number {
    const cacheKey = `${sourceName}_${targetField.id}`;
    if (this.semanticCache.has(cacheKey)) {
      return this.semanticCache.get(cacheKey)!;
    }

    let maxSimilarity = 0;
    const targetName = targetField.name.toLowerCase();
    const targetLabel = targetField.label.toLowerCase();

    // Direct string similarity
    maxSimilarity = Math.max(
      maxSimilarity,
      this.stringSimilarity(sourceName, targetName),
    );
    maxSimilarity = Math.max(
      maxSimilarity,
      this.stringSimilarity(sourceName, targetLabel),
    );

    // Wedding industry semantic matching
    for (const [category, keywords] of Object.entries(this.WEDDING_SEMANTICS)) {
      const sourceInCategory = keywords.some((keyword) =>
        sourceName.includes(keyword),
      );
      const targetInCategory =
        targetName.includes(category) || targetLabel.includes(category);

      if (sourceInCategory && targetInCategory) {
        maxSimilarity = Math.max(maxSimilarity, 0.85);
      }
    }

    // Type compatibility bonus
    if (this.areTypesCompatible(sourceName, targetField.type)) {
      maxSimilarity += 0.1;
    }

    // Alias matching
    if (targetField.aliases) {
      for (const alias of targetField.aliases) {
        maxSimilarity = Math.max(
          maxSimilarity,
          this.stringSimilarity(sourceName, alias.toLowerCase()),
        );
      }
    }

    // Context keyword matching
    if (targetField.description) {
      const descWords = targetField.description.toLowerCase().split(/\s+/);
      const sourceWords = sourceName.split(/\s+/);
      const commonWords = sourceWords.filter((word) =>
        descWords.includes(word),
      );
      if (commonWords.length > 0) {
        maxSimilarity += 0.05 * commonWords.length;
      }
    }

    maxSimilarity = Math.min(maxSimilarity, 1.0);
    this.semanticCache.set(cacheKey, maxSimilarity);
    return maxSimilarity;
  }

  /**
   * Calculate string similarity using Jaro-Winkler algorithm
   */
  private stringSimilarity(str1: string, str2: string): number {
    if (str1 === str2) return 1.0;
    if (str1.length === 0 || str2.length === 0) return 0.0;

    const matchWindow = Math.floor(Math.max(str1.length, str2.length) / 2) - 1;
    if (matchWindow < 0) return 0.0;

    const str1Matches = new Array(str1.length).fill(false);
    const str2Matches = new Array(str2.length).fill(false);

    let matches = 0;
    let transpositions = 0;

    // Identify matches
    for (let i = 0; i < str1.length; i++) {
      const start = Math.max(0, i - matchWindow);
      const end = Math.min(i + matchWindow + 1, str2.length);

      for (let j = start; j < end; j++) {
        if (str2Matches[j] || str1[i] !== str2[j]) continue;
        str1Matches[i] = true;
        str2Matches[j] = true;
        matches++;
        break;
      }
    }

    if (matches === 0) return 0.0;

    // Count transpositions
    let k = 0;
    for (let i = 0; i < str1.length; i++) {
      if (!str1Matches[i]) continue;
      while (!str2Matches[k]) k++;
      if (str1[i] !== str2[k]) transpositions++;
      k++;
    }

    const jaro =
      (matches / str1.length +
        matches / str2.length +
        (matches - transpositions / 2) / matches) /
      3;

    // Jaro-Winkler
    let prefix = 0;
    for (let i = 0; i < Math.min(str1.length, str2.length, 4); i++) {
      if (str1[i] === str2[i]) prefix++;
      else break;
    }

    return jaro + 0.1 * prefix * (1 - jaro);
  }

  /**
   * Check if field types are compatible
   */
  private areTypesCompatible(
    fieldName: string,
    targetType: FieldType,
  ): boolean {
    const fieldLower = fieldName.toLowerCase();

    switch (targetType) {
      case 'email':
        return fieldLower.includes('email') || fieldLower.includes('mail');
      case 'phone':
        return (
          fieldLower.includes('phone') ||
          fieldLower.includes('tel') ||
          fieldLower.includes('mobile')
        );
      case 'date':
        return (
          fieldLower.includes('date') ||
          fieldLower.includes('time') ||
          fieldLower.includes('when')
        );
      case 'number':
        return (
          fieldLower.includes('count') ||
          fieldLower.includes('number') ||
          fieldLower.includes('quantity')
        );
      case 'currency':
        return (
          fieldLower.includes('budget') ||
          fieldLower.includes('cost') ||
          fieldLower.includes('price')
        );
      case 'address':
        return (
          fieldLower.includes('address') ||
          fieldLower.includes('location') ||
          fieldLower.includes('venue')
        );
      case 'boolean':
        return (
          fieldLower.includes('yes') ||
          fieldLower.includes('no') ||
          fieldLower.includes('check')
        );
      default:
        return true;
    }
  }

  /**
   * Find pattern-based matches
   */
  private findPatternMatch(
    sourceField: ExtractedFieldData,
    targetFields: TargetField[],
    usedTargetIds: Set<string>,
  ): FieldMapping | null {
    for (const targetField of targetFields) {
      if (usedTargetIds.has(targetField.id)) continue;

      const patternScore = this.calculatePatternMatch(sourceField, targetField);

      if (patternScore >= 0.7) {
        return {
          sourceFieldId: sourceField.id,
          targetFieldId: targetField.id,
          confidence: patternScore,
          mappingType: 'pattern',
          reasoning: `Pattern-based match (${Math.round(patternScore * 100)}%): field type and value pattern analysis`,
        };
      }
    }

    return null;
  }

  /**
   * Calculate pattern match score
   */
  private calculatePatternMatch(
    sourceField: ExtractedFieldData,
    targetField: TargetField,
  ): number {
    let score = 0;

    // Type matching
    if (sourceField.type === targetField.type) {
      score += 0.4;
    } else if (this.areTypesCompatible(sourceField.name, targetField.type)) {
      score += 0.2;
    }

    // Value pattern analysis
    const valueString = sourceField.value?.toString() || '';

    switch (targetField.type) {
      case 'email':
        if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(valueString)) score += 0.4;
        break;
      case 'phone':
        if (/^\+?[\d\s\-\(\)]{10,}$/.test(valueString)) score += 0.4;
        break;
      case 'date':
        if (!isNaN(Date.parse(valueString))) score += 0.4;
        break;
      case 'currency':
        if (/^\$?[\d,]+\.?\d{0,2}$/.test(valueString)) score += 0.4;
        break;
      case 'number':
        if (!isNaN(Number(valueString))) score += 0.4;
        break;
    }

    // Position-based heuristics
    if (sourceField.position) {
      // Fields at the top of documents are often more important
      if (sourceField.position.line && sourceField.position.line <= 10) {
        score += 0.1;
      }
    }

    return Math.min(score, 1.0);
  }

  /**
   * Find contextual matches based on surrounding fields
   */
  private findContextualMatch(
    sourceField: ExtractedFieldData,
    targetFields: TargetField[],
    usedTargetIds: Set<string>,
  ): FieldMapping | null {
    if (!sourceField.context || sourceField.context.length === 0) {
      return null;
    }

    for (const targetField of targetFields) {
      if (usedTargetIds.has(targetField.id)) continue;

      const contextScore = this.calculateContextualScore(
        sourceField,
        targetField,
      );

      if (contextScore >= 0.6) {
        return {
          sourceFieldId: sourceField.id,
          targetFieldId: targetField.id,
          confidence: contextScore,
          mappingType: 'contextual',
          reasoning: `Contextual match (${Math.round(contextScore * 100)}%): analyzed surrounding field context`,
        };
      }
    }

    return null;
  }

  /**
   * Calculate contextual matching score
   */
  private calculateContextualScore(
    sourceField: ExtractedFieldData,
    targetField: TargetField,
  ): number {
    if (!sourceField.context) return 0;

    let score = 0;
    const contextText = sourceField.context.join(' ').toLowerCase();
    const targetName = targetField.name.toLowerCase();
    const targetLabel = targetField.label.toLowerCase();

    // Check if target field keywords appear in context
    if (contextText.includes(targetName) || contextText.includes(targetLabel)) {
      score += 0.3;
    }

    // Wedding-specific context analysis
    for (const [category, keywords] of Object.entries(this.WEDDING_SEMANTICS)) {
      if (targetName.includes(category) || targetLabel.includes(category)) {
        const contextMatches = keywords.filter((keyword) =>
          contextText.includes(keyword),
        );
        score += Math.min(contextMatches.length * 0.1, 0.4);
      }
    }

    // Type-specific context clues
    switch (targetField.type) {
      case 'date':
        if (/\b(date|when|time|ceremony|reception)\b/.test(contextText))
          score += 0.2;
        break;
      case 'email':
        if (/\b(email|contact|reach|communication)\b/.test(contextText))
          score += 0.2;
        break;
      case 'phone':
        if (/\b(phone|call|contact|mobile|telephone)\b/.test(contextText))
          score += 0.2;
        break;
    }

    return Math.min(score, 1.0);
  }

  /**
   * Find matches based on learned patterns
   */
  private findLearnedMatch(
    sourceField: ExtractedFieldData,
    targetFields: TargetField[],
    usedTargetIds: Set<string>,
  ): FieldMapping | null {
    const sourceName = sourceField.name.toLowerCase();

    for (const targetField of targetFields) {
      if (usedTargetIds.has(targetField.id)) continue;

      const patternKey = `${sourceName}_${targetField.id}`;
      const learnedPattern = this.learningPatterns.get(patternKey);

      if (
        learnedPattern &&
        learnedPattern.successRate >= 0.7 &&
        learnedPattern.sampleSize >= 3
      ) {
        return {
          sourceFieldId: sourceField.id,
          targetFieldId: targetField.id,
          confidence: learnedPattern.successRate,
          mappingType: 'learned',
          reasoning: `Learned pattern match (${Math.round(learnedPattern.successRate * 100)}% success rate, ${learnedPattern.sampleSize} samples)`,
        };
      }
    }

    return null;
  }

  /**
   * Find alternative mappings for a field
   */
  private findAlternatives(
    sourceField: ExtractedFieldData,
    targetFields: TargetField[],
    usedTargetIds: Set<string>,
    excludeTargetId: string,
  ): AlternativeMapping[] {
    const alternatives: AlternativeMapping[] = [];

    for (const targetField of targetFields) {
      if (
        usedTargetIds.has(targetField.id) ||
        targetField.id === excludeTargetId
      )
        continue;

      const similarity = this.calculateSemanticSimilarity(
        sourceField.name.toLowerCase(),
        targetField,
      );

      if (similarity >= 0.5) {
        alternatives.push({
          targetFieldId: targetField.id,
          confidence: similarity,
          reasoning: `Alternative match (${Math.round(similarity * 100)}%)`,
        });
      }
    }

    return alternatives.sort((a, b) => b.confidence - a.confidence).slice(0, 3);
  }

  /**
   * Calculate overall mapping accuracy
   */
  private calculateMappingAccuracy(mappings: FieldMapping[]): number {
    if (mappings.length === 0) return 0;

    const totalConfidence = mappings.reduce(
      (sum, mapping) => sum + mapping.confidence,
      0,
    );
    return totalConfidence / mappings.length;
  }

  /**
   * Generate mapping suggestions
   */
  private async generateMappingSuggestions(
    mappings: FieldMapping[],
    extractedFields: ExtractedFieldData[],
  ): Promise<MappingSuggestion[]> {
    const suggestions: MappingSuggestion[] = [];

    // Suggest merging similar fields
    const groupedFields = this.groupSimilarFields(extractedFields);
    for (const group of groupedFields) {
      if (group.length > 1) {
        suggestions.push({
          type: 'merge',
          description: `Consider merging similar fields: ${group.map((f) => f.name).join(', ')}`,
          fieldIds: group.map((f) => f.id),
          confidence: 0.7,
        });
      }
    }

    // Suggest splitting compound fields
    for (const field of extractedFields) {
      if (this.isCompoundField(field)) {
        suggestions.push({
          type: 'split',
          description: `Field "${field.name}" appears to contain multiple values that could be split`,
          fieldIds: [field.id],
          confidence: 0.6,
        });
      }
    }

    // Suggest validation for low-confidence mappings
    const lowConfidenceMappings = mappings.filter((m) => m.confidence < 0.7);
    if (lowConfidenceMappings.length > 0) {
      suggestions.push({
        type: 'validate',
        description: `${lowConfidenceMappings.length} mapping(s) have low confidence and should be reviewed`,
        fieldIds: lowConfidenceMappings.map((m) => m.sourceFieldId),
        confidence: 0.8,
      });
    }

    return suggestions;
  }

  /**
   * Group similar fields that might be duplicates
   */
  private groupSimilarFields(
    fields: ExtractedFieldData[],
  ): ExtractedFieldData[][] {
    const groups: ExtractedFieldData[][] = [];
    const processed = new Set<string>();

    for (const field of fields) {
      if (processed.has(field.id)) continue;

      const similarFields = [field];
      processed.add(field.id);

      for (const otherField of fields) {
        if (processed.has(otherField.id)) continue;

        const similarity = this.stringSimilarity(
          field.name.toLowerCase(),
          otherField.name.toLowerCase(),
        );
        if (similarity >= 0.8) {
          similarFields.push(otherField);
          processed.add(otherField.id);
        }
      }

      if (similarFields.length > 1) {
        groups.push(similarFields);
      }
    }

    return groups;
  }

  /**
   * Check if a field contains compound data
   */
  private isCompoundField(field: ExtractedFieldData): boolean {
    const value = field.value?.toString() || '';

    // Check for multiple emails, phones, or addresses in one field
    const emailCount = (value.match(/@/g) || []).length;
    const phoneCount = (value.match(/\d{3}[-.\s]?\d{3}[-.\s]?\d{4}/g) || [])
      .length;
    const addressCount = (
      value.match(
        /\d+\s+\w+\s+(st|street|ave|avenue|rd|road|blvd|boulevard)/gi,
      ) || []
    ).length;

    return emailCount > 1 || phoneCount > 1 || addressCount > 1;
  }

  /**
   * Get default wedding schema
   */
  private async getDefaultWeddingSchema(): Promise<TargetSchema> {
    return {
      id: 'wedding_default',
      name: 'Wedding Form Fields',
      category: 'wedding',
      fields: [
        {
          id: 'bride_name',
          name: 'bride_name',
          label: 'Bride Name',
          type: 'text',
          required: true,
          description: 'Name of the bride',
          aliases: ['bride', 'partner 1', 'first partner', 'bride to be'],
        },
        {
          id: 'groom_name',
          name: 'groom_name',
          label: 'Groom Name',
          type: 'text',
          required: true,
          description: 'Name of the groom',
          aliases: ['groom', 'partner 2', 'second partner', 'groom to be'],
        },
        {
          id: 'wedding_date',
          name: 'wedding_date',
          label: 'Wedding Date',
          type: 'date',
          required: true,
          description: 'Date of the wedding ceremony',
          aliases: ['ceremony date', 'event date', 'date of wedding'],
        },
        {
          id: 'venue_name',
          name: 'venue_name',
          label: 'Venue Name',
          type: 'text',
          required: false,
          description: 'Name of the wedding venue',
          aliases: ['location', 'ceremony location', 'reception venue'],
        },
        {
          id: 'venue_address',
          name: 'venue_address',
          label: 'Venue Address',
          type: 'address',
          required: false,
          description: 'Address of the wedding venue',
          aliases: ['venue location', 'event address', 'ceremony address'],
        },
        {
          id: 'primary_email',
          name: 'primary_email',
          label: 'Primary Email',
          type: 'email',
          required: true,
          description: 'Primary contact email',
          aliases: ['email', 'contact email', 'email address'],
        },
        {
          id: 'primary_phone',
          name: 'primary_phone',
          label: 'Primary Phone',
          type: 'phone',
          required: true,
          description: 'Primary contact phone number',
          aliases: ['phone', 'contact number', 'telephone', 'mobile'],
        },
        {
          id: 'guest_count',
          name: 'guest_count',
          label: 'Guest Count',
          type: 'number',
          required: false,
          description: 'Expected number of wedding guests',
          aliases: ['number of guests', 'guest list size', 'attendees'],
        },
        {
          id: 'budget',
          name: 'budget',
          label: 'Wedding Budget',
          type: 'currency',
          required: false,
          description: 'Total wedding budget',
          aliases: ['total budget', 'wedding budget', 'allocated budget'],
        },
        {
          id: 'ceremony_time',
          name: 'ceremony_time',
          label: 'Ceremony Time',
          type: 'text',
          required: false,
          description: 'Time of the wedding ceremony',
          aliases: ['ceremony start', 'wedding time'],
        },
      ],
    };
  }

  /**
   * Save mapping session for learning
   */
  private async saveMappingSession(session: {
    documentId: string;
    mappings: FieldMapping[];
    accuracy: number;
    targetSchemaId: string;
  }): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('smart_mapping_sessions')
        .insert({
          document_id: session.documentId,
          target_schema_id: session.targetSchemaId,
          mappings: session.mappings,
          accuracy: session.accuracy,
          created_at: new Date().toISOString(),
        });

      if (error) {
        console.error('Failed to save mapping session:', error);
      }
    } catch (error) {
      console.error('Error saving mapping session:', error);
    }
  }

  /**
   * Learn from user corrections
   */
  async learnFromCorrection(correction: MappingCorrection): Promise<void> {
    try {
      // Get the original mapping
      const { data: session } = await this.supabase
        .from('smart_mapping_sessions')
        .select('*')
        .contains('mappings', [
          { sourceFieldId: correction.mappingId.split('_')[0] },
        ])
        .single();

      if (!session) return;

      const originalMapping = session.mappings.find(
        (m: any) =>
          `${m.sourceFieldId}_${m.targetFieldId}` === correction.mappingId,
      );

      if (!originalMapping) return;

      // Update learning patterns
      const patternKey = `${originalMapping.sourceFieldId}_${correction.correctTargetFieldId}`;
      const currentPattern = this.learningPatterns.get(patternKey) || {
        patternType: 'user_correction',
        sourcePattern: originalMapping.sourceFieldId,
        targetPattern: correction.correctTargetFieldId,
        successRate: 0,
        sampleSize: 0,
      };

      // Update success rate based on feedback
      const feedbackValue =
        correction.feedback === 'correct'
          ? 1
          : correction.feedback === 'partial'
            ? 0.5
            : 0;

      currentPattern.successRate =
        (currentPattern.successRate * currentPattern.sampleSize +
          feedbackValue) /
        (currentPattern.sampleSize + 1);
      currentPattern.sampleSize += 1;

      this.learningPatterns.set(patternKey, currentPattern);

      // Save to database
      await this.supabase.from('mapping_corrections').insert({
        mapping_id: correction.mappingId,
        correct_target_field_id: correction.correctTargetFieldId,
        feedback: correction.feedback,
        user_confidence: correction.userConfidence,
        notes: correction.notes,
        created_at: new Date().toISOString(),
      });

      // Update learning patterns in database
      await this.saveLearningPatterns();
    } catch (error) {
      console.error('Error learning from correction:', error);
    }
  }

  /**
   * Load learning patterns from database
   */
  private async loadLearningPatterns(): Promise<void> {
    try {
      const { data } = await this.supabase
        .from('mapping_learning_patterns')
        .select('*');

      if (data) {
        for (const pattern of data) {
          this.learningPatterns.set(pattern.pattern_key, {
            patternType: pattern.pattern_type,
            sourcePattern: pattern.source_pattern,
            targetPattern: pattern.target_pattern,
            successRate: pattern.success_rate,
            sampleSize: pattern.sample_size,
          });
        }
      }
    } catch (error) {
      console.error('Error loading learning patterns:', error);
    }
  }

  /**
   * Save learning patterns to database
   */
  private async saveLearningPatterns(): Promise<void> {
    try {
      const patterns = Array.from(this.learningPatterns.entries()).map(
        ([key, pattern]) => ({
          pattern_key: key,
          pattern_type: pattern.patternType,
          source_pattern: pattern.sourcePattern,
          target_pattern: pattern.targetPattern,
          success_rate: pattern.successRate,
          sample_size: pattern.sampleSize,
          updated_at: new Date().toISOString(),
        }),
      );

      const { error } = await this.supabase
        .from('mapping_learning_patterns')
        .upsert(patterns, { onConflict: 'pattern_key' });

      if (error) {
        console.error('Error saving learning patterns:', error);
      }
    } catch (error) {
      console.error('Error saving learning patterns:', error);
    }
  }

  /**
   * Get mapping templates
   */
  async getMappingTemplates(filters?: {
    sourceSchema?: string;
    targetSchema?: string;
    isPublic?: boolean;
  }): Promise<MappingTemplate[]> {
    try {
      let query = this.supabase.from('mapping_templates').select('*');

      if (filters?.sourceSchema) {
        query = query.eq('source_schema', filters.sourceSchema);
      }
      if (filters?.targetSchema) {
        query = query.eq('target_schema', filters.targetSchema);
      }
      if (filters?.isPublic !== undefined) {
        query = query.eq('is_public', filters.isPublic);
      }

      const { data, error } = await query.order('usage_count', {
        ascending: false,
      });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error getting mapping templates:', error);
      return [];
    }
  }

  /**
   * Save mapping as template
   */
  async saveMappingTemplate(
    template: Partial<MappingTemplate>,
  ): Promise<MappingTemplate> {
    try {
      const { data, error } = await this.supabase
        .from('mapping_templates')
        .insert({
          name: template.name,
          description: template.description,
          source_schema: template.sourceSchema,
          target_schema: template.targetSchema,
          mappings: template.mappings,
          accuracy: template.accuracy,
          is_public: template.isPublic || false,
          created_by: template.createdBy,
          usage_count: 0,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error saving mapping template:', error);
      throw error;
    }
  }

  /**
   * Apply mapping template
   */
  async applyMappingTemplate(
    templateId: string,
    extractedFields: ExtractedFieldData[],
  ): Promise<FieldMapping[]> {
    try {
      // Get template
      const { data: template } = await this.supabase
        .from('mapping_templates')
        .select('*')
        .eq('id', templateId)
        .single();

      if (!template) throw new Error('Template not found');

      // Update usage count
      await this.supabase
        .from('mapping_templates')
        .update({ usage_count: template.usage_count + 1 })
        .eq('id', templateId);

      // Apply template mappings
      const mappings: FieldMapping[] = [];

      for (const templateMapping of template.mappings) {
        const sourceField = extractedFields.find(
          (f) =>
            this.stringSimilarity(
              f.name.toLowerCase(),
              templateMapping.sourceFieldId.toLowerCase(),
            ) >= 0.8,
        );

        if (sourceField) {
          mappings.push({
            ...templateMapping,
            sourceFieldId: sourceField.id,
            confidence: Math.min(templateMapping.confidence, 0.9), // Template confidence cap
            reasoning: `Applied from template: ${template.name}`,
          });
        }
      }

      return mappings;
    } catch (error) {
      console.error('Error applying mapping template:', error);
      return [];
    }
  }

  /**
   * Analyze field mappings for integration layer
   */
  async analyzeFieldMappings(request: {
    documentId: string;
    extractedFields: any[];
    options?: any;
  }): Promise<SmartMappingResult> {
    try {
      const mappingRequest: SmartMappingRequest = {
        documentId: request.documentId,
        extractedFields: request.extractedFields.map((f) => ({
          id: f.fieldId || f.id,
          name: f.name,
          value: f.value,
          type: f.type,
          confidence: f.confidence,
          position: f.position,
          context: f.context,
        })),
        options: request.options,
      };

      return await this.performSmartMapping(mappingRequest);
    } catch (error: any) {
      console.error('Error analyzing field mappings:', error);
      return {
        success: false,
        mappings: [],
        unmappedFields: [],
        accuracy: 0,
        processingTime: 0,
        suggestions: [],
        errors: [
          { type: 'analysis', code: 'ANALYSIS_FAILED', message: error.message },
        ],
      };
    }
  }

  /**
   * Apply mappings and create structured data
   */
  async applyMappings(request: {
    documentId: string;
    mappings: Array<{
      sourceFieldId: string;
      targetFieldId: string;
      confidence: number;
      confirmed: boolean;
    }>;
    options?: {
      createRecord?: boolean;
      validateData?: boolean;
      generateForm?: boolean;
      preserveRawData?: boolean;
    };
  }): Promise<{
    success: boolean;
    formId?: string;
    clientId?: string;
    appliedMappings?: any[];
    metrics?: any;
    error?: string;
  }> {
    try {
      const confirmedMappings = request.mappings.filter((m) => m.confirmed);

      if (confirmedMappings.length === 0) {
        return {
          success: false,
          error: 'No confirmed mappings to apply',
        };
      }

      // Get extracted field values
      const { data: extractedFields } = await this.supabase
        .from('extracted_fields')
        .select('*')
        .eq('document_id', request.documentId);

      const mappedData: Record<string, any> = {};
      const appliedMappings: any[] = [];

      for (const mapping of confirmedMappings) {
        const sourceField = extractedFields?.find(
          (f) => f.field_id === mapping.sourceFieldId,
        );

        if (sourceField) {
          mappedData[mapping.targetFieldId] = sourceField.value;
          appliedMappings.push({
            ...mapping,
            appliedValue: sourceField.value,
            appliedAt: new Date().toISOString(),
          });
        }
      }

      // Create client record if requested
      let clientId: string | undefined;
      if (request.options?.createRecord) {
        const { data: client, error: clientError } = await this.supabase
          .from('clients')
          .insert({
            bride_name: mappedData.bride_name,
            groom_name: mappedData.groom_name,
            wedding_date: mappedData.wedding_date,
            venue_name: mappedData.venue_name,
            venue_address: mappedData.venue_address,
            primary_email: mappedData.primary_email,
            primary_phone: mappedData.primary_phone,
            guest_count: mappedData.guest_count,
            budget: mappedData.budget,
            ceremony_time: mappedData.ceremony_time,
            source_document_id: request.documentId,
            created_at: new Date().toISOString(),
          })
          .select()
          .single();

        if (!clientError && client) {
          clientId = client.id;
        }
      }

      // Generate form ID
      const formId = `form_${request.documentId}_${Date.now()}`;

      // Save applied mappings
      await this.supabase.from('applied_mappings').insert({
        document_id: request.documentId,
        client_id: clientId,
        form_id: formId,
        mappings: appliedMappings,
        mapped_data: mappedData,
        created_at: new Date().toISOString(),
      });

      const metrics = {
        totalMappings: confirmedMappings.length,
        successfulMappings: appliedMappings.length,
        successRate:
          confirmedMappings.length > 0
            ? appliedMappings.length / confirmedMappings.length
            : 0,
        dataCompleteness: this.calculateDataCompleteness(mappedData),
      };

      return {
        success: true,
        formId,
        clientId,
        appliedMappings,
        metrics,
      };
    } catch (error: any) {
      console.error('Error applying mappings:', error);
      return {
        success: false,
        error: error.message || 'Failed to apply mappings',
      };
    }
  }

  /**
   * Calculate data completeness score
   */
  private calculateDataCompleteness(mappedData: Record<string, any>): number {
    const requiredFields = [
      'bride_name',
      'groom_name',
      'primary_email',
      'primary_phone',
      'wedding_date',
    ];
    const presentFields = requiredFields.filter((field) => mappedData[field]);
    return requiredFields.length > 0
      ? presentFields.length / requiredFields.length
      : 0;
  }
}
