import { createClient } from '@supabase/supabase-js';
import type {
  PopulationRule,
  FormField,
  SupplierType,
  FormType,
  TransformationRule,
} from '@/types/auto-population';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
    (() => {
      throw new Error('Missing environment variable: NEXT_PUBLIC_SUPABASE_URL');
    })(),
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
    (() => {
      throw new Error(
        'Missing environment variable: SUPABASE_SERVICE_ROLE_KEY',
      );
    })(),
);

interface RuleMatch {
  rule: PopulationRule;
  confidence: number;
  transformationNeeded: boolean;
}

interface EnhancedMapping {
  form_field_id: string;
  core_field_key: string;
  confidence: number;
  transformation_rule?: string;
  priority: number;
  matched_rules: PopulationRule[];
  reasoning: string;
}

class PopulationRulesEngine {
  private ruleCache: Map<string, PopulationRule[]> = new Map();
  private cacheExpiry: Map<string, number> = new Map();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  /**
   * Enhanced fuzzy field matching with rule-based confidence boosting
   */
  async enhanceFieldMappings(
    baseMappings: any[],
    formFields: FormField[],
    organizationId: string,
    supplierType?: SupplierType,
    formType?: FormType,
  ): Promise<EnhancedMapping[]> {
    try {
      // Get applicable rules
      const rules = await this.getApplicableRules(
        organizationId,
        supplierType,
        formType,
      );

      // Process each base mapping through rules engine
      const enhancedMappings: EnhancedMapping[] = [];

      for (const baseMapping of baseMappings) {
        const formField = formFields.find(
          (f) => f.id === baseMapping.form_field_id,
        );
        if (!formField) continue;

        const ruleMatches = await this.findMatchingRules(
          formField,
          baseMapping.core_field_key,
          rules,
        );

        const enhancedMapping = await this.applyRuleEnhancements(
          baseMapping,
          formField,
          ruleMatches,
        );

        if (enhancedMapping.confidence >= 0.5) {
          // Only keep mappings above threshold
          enhancedMappings.push(enhancedMapping);
        }
      }

      // Sort by confidence and priority
      return enhancedMappings.sort((a, b) => {
        if (a.confidence !== b.confidence) {
          return b.confidence - a.confidence; // Higher confidence first
        }
        return a.priority - b.priority; // Lower priority number = higher priority
      });
    } catch (error) {
      console.error('Error enhancing field mappings:', error);
      return baseMappings.map((m) => ({
        ...m,
        matched_rules: [],
        reasoning: 'Basic fuzzy matching (rules engine unavailable)',
      }));
    }
  }

  /**
   * Get applicable rules from database with caching
   */
  private async getApplicableRules(
    organizationId: string,
    supplierType?: SupplierType,
    formType?: FormType,
  ): Promise<PopulationRule[]> {
    const cacheKey = `${organizationId}-${supplierType || 'any'}-${formType || 'any'}`;

    // Check cache first
    if (this.ruleCache.has(cacheKey)) {
      const expiry = this.cacheExpiry.get(cacheKey) || 0;
      if (Date.now() < expiry) {
        return this.ruleCache.get(cacheKey) || [];
      }
    }

    try {
      // Build query for applicable rules
      let query = supabase
        .from('auto_population_rules')
        .select('*')
        .eq('is_active', true);

      // Organization-specific rules first
      const { data: orgRules } = await query.eq(
        'organization_id',
        organizationId,
      );

      // Global rules (no organization_id)
      const { data: globalRules } = await supabase
        .from('auto_population_rules')
        .select('*')
        .eq('is_active', true)
        .is('organization_id', null);

      // Supplier-specific rules
      let supplierRules: PopulationRule[] = [];
      if (supplierType) {
        const { data } = await supabase
          .from('auto_population_rules')
          .select('*')
          .eq('is_active', true)
          .eq('supplier_type', supplierType);
        supplierRules = data || [];
      }

      // Form-specific rules
      let formRules: PopulationRule[] = [];
      if (formType) {
        const { data } = await supabase
          .from('auto_population_rules')
          .select('*')
          .eq('is_active', true)
          .eq('form_type', formType);
        formRules = data || [];
      }

      // Combine all rules with proper priority
      const allRules = [
        ...(orgRules || []), // Organization rules have highest priority
        ...supplierRules,
        ...formRules,
        ...(globalRules || []), // Global rules have lowest priority
      ];

      // Remove duplicates and sort by priority
      const uniqueRules = Array.from(
        new Map(allRules.map((rule) => [rule.id, rule])).values(),
      ).sort((a, b) => a.priority - b.priority);

      // Cache the results
      this.ruleCache.set(cacheKey, uniqueRules);
      this.cacheExpiry.set(cacheKey, Date.now() + this.CACHE_DURATION);

      return uniqueRules;
    } catch (error) {
      console.error('Error fetching population rules:', error);
      return [];
    }
  }

  /**
   * Find rules that match a specific form field
   */
  private async findMatchingRules(
    formField: FormField,
    coreFieldKey: string,
    rules: PopulationRule[],
  ): Promise<RuleMatch[]> {
    const matches: RuleMatch[] = [];

    for (const rule of rules) {
      // Check if rule targets this core field
      if (rule.target_core_field !== coreFieldKey) continue;

      const matchResult = await this.evaluateRuleMatch(formField, rule);

      if (matchResult.confidence > 0) {
        matches.push({
          rule,
          confidence: matchResult.confidence,
          transformationNeeded: matchResult.transformationNeeded,
        });
      }
    }

    // Sort by confidence
    return matches.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Evaluate if a rule matches a form field
   */
  private async evaluateRuleMatch(
    formField: FormField,
    rule: PopulationRule,
  ): Promise<{ confidence: number; transformationNeeded: boolean }> {
    const fieldName = formField.name.toLowerCase();
    const fieldLabel = formField.label.toLowerCase();
    const pattern = rule.source_field_pattern.toLowerCase();

    let confidence = 0;
    let transformationNeeded = false;

    // Pattern matching types
    if (this.isRegexPattern(pattern)) {
      // Regex pattern matching
      const regex = new RegExp(pattern, 'i');
      if (regex.test(fieldName) || regex.test(fieldLabel)) {
        confidence = 0.8;
      }
    } else if (pattern.includes('*')) {
      // Wildcard pattern matching
      const regexPattern = pattern.replace(/\*/g, '.*');
      const regex = new RegExp(`^${regexPattern}$`, 'i');
      if (regex.test(fieldName) || regex.test(fieldLabel)) {
        confidence = 0.7;
      }
    } else {
      // Exact or fuzzy string matching
      if (fieldName === pattern || fieldLabel === pattern) {
        confidence = 0.9; // Exact match
      } else if (fieldName.includes(pattern) || fieldLabel.includes(pattern)) {
        confidence = 0.8; // Contains pattern
      } else {
        // Fuzzy matching using Levenshtein distance
        const nameDistance = this.levenshteinDistance(fieldName, pattern);
        const labelDistance = this.levenshteinDistance(fieldLabel, pattern);
        const minDistance = Math.min(nameDistance, labelDistance);
        const maxLength = Math.max(
          fieldName.length,
          fieldLabel.length,
          pattern.length,
        );

        if (maxLength > 0) {
          const similarity = 1 - minDistance / maxLength;
          if (similarity >= 0.7) {
            confidence = similarity * 0.6; // Reduce confidence for fuzzy matches
          }
        }
      }
    }

    // Apply rule confidence modifier
    confidence = Math.min(confidence + rule.confidence_modifier, 1.0);

    // Check if transformation is needed
    if (rule.transformation_function && confidence > 0) {
      transformationNeeded = this.needsTransformation(
        formField.type,
        rule.transformation_function,
      );
    }

    return { confidence, transformationNeeded };
  }

  /**
   * Apply rule enhancements to base mapping
   */
  private async applyRuleEnhancements(
    baseMapping: any,
    formField: FormField,
    ruleMatches: RuleMatch[],
  ): Promise<EnhancedMapping> {
    let enhancedConfidence = baseMapping.confidence;
    let bestTransformationRule: string | undefined;
    let priority = baseMapping.priority || 999;
    const matchedRules: PopulationRule[] = [];
    const reasoningParts: string[] = [
      `Base fuzzy matching: ${Math.round(baseMapping.confidence * 100)}%`,
    ];

    for (const match of ruleMatches) {
      matchedRules.push(match.rule);

      // Apply confidence boost
      const boost = match.confidence * 0.2; // Max 20% boost per rule
      enhancedConfidence = Math.min(enhancedConfidence + boost, 1.0);

      reasoningParts.push(
        `Rule "${match.rule.rule_name}": +${Math.round(boost * 100)}% confidence`,
      );

      // Use transformation if needed
      if (match.transformationNeeded && match.rule.transformation_function) {
        bestTransformationRule = match.rule.transformation_function;
      }

      // Update priority based on rule priority
      if (match.rule.priority < priority) {
        priority = match.rule.priority;
      }
    }

    // Contextual adjustments based on field type compatibility
    const typeCompatibility = this.checkTypeCompatibility(
      formField.type,
      baseMapping.core_field_key,
    );
    if (typeCompatibility < 0.5) {
      enhancedConfidence *= 0.8; // Reduce confidence for type mismatches
      reasoningParts.push('Type mismatch penalty applied');
    } else if (typeCompatibility > 0.9) {
      enhancedConfidence = Math.min(enhancedConfidence * 1.1, 1.0);
      reasoningParts.push('Perfect type match bonus');
    }

    // Wedding industry context boosts
    const contextBoost = this.getWeddingContextBoost(
      formField,
      baseMapping.core_field_key,
    );
    if (contextBoost > 0) {
      enhancedConfidence = Math.min(enhancedConfidence + contextBoost, 1.0);
      reasoningParts.push(
        `Wedding context boost: +${Math.round(contextBoost * 100)}%`,
      );
    }

    return {
      form_field_id: baseMapping.form_field_id,
      core_field_key: baseMapping.core_field_key,
      confidence: Math.round(enhancedConfidence * 100) / 100, // Round to 2 decimal places
      transformation_rule:
        bestTransformationRule || baseMapping.transformation_rule,
      priority,
      matched_rules: matchedRules,
      reasoning: reasoningParts.join('; '),
    };
  }

  /**
   * Check type compatibility between form field and core field
   */
  private checkTypeCompatibility(
    fieldType: string,
    coreFieldKey: string,
  ): number {
    const typeMapping: Record<string, string[]> = {
      couple_name_1: ['text', 'select'],
      couple_name_2: ['text', 'select'],
      wedding_date: ['date'],
      venue_name: ['text', 'textarea'],
      venue_address: ['text', 'textarea'],
      guest_count: ['number'],
      budget_amount: ['number'],
      contact_email: ['email', 'text'],
      contact_phone: ['phone', 'text'],
    };

    const compatibleTypes = typeMapping[coreFieldKey] || [];

    if (compatibleTypes.includes(fieldType)) {
      return 1.0; // Perfect match
    }

    // Secondary compatibility
    if (fieldType === 'text' && !compatibleTypes.includes('text')) {
      return 0.7; // Text can often be converted
    }

    return 0.3; // Poor compatibility
  }

  /**
   * Get wedding industry specific context boosts
   */
  private getWeddingContextBoost(
    formField: FormField,
    coreFieldKey: string,
  ): number {
    const fieldName = formField.name.toLowerCase();
    const fieldLabel = formField.label.toLowerCase();

    // Wedding-specific terminology boosts
    const weddingTerms: Record<string, string[]> = {
      wedding_date: [
        'ceremony',
        'reception',
        'big day',
        'celebration',
        'event date',
      ],
      couple_name_1: [
        'bride',
        'partner',
        'primary',
        'first name',
        'client name',
      ],
      couple_name_2: ['groom', 'spouse', 'secondary', 'second name'],
      venue_name: [
        'location',
        'ceremony site',
        'reception hall',
        'church',
        'venue',
      ],
      guest_count: ['headcount', 'attendees', 'people', 'guests', 'pax'],
      budget_amount: ['budget', 'cost', 'price', 'investment', 'spend'],
    };

    const relevantTerms = weddingTerms[coreFieldKey] || [];

    for (const term of relevantTerms) {
      if (fieldName.includes(term) || fieldLabel.includes(term)) {
        return 0.15; // 15% boost for wedding terminology
      }
    }

    return 0;
  }

  /**
   * Check if a pattern is a regex
   */
  private isRegexPattern(pattern: string): boolean {
    return (
      (pattern.startsWith('/') && pattern.endsWith('/')) ||
      pattern.includes('(') ||
      pattern.includes('[') ||
      pattern.includes('^') ||
      pattern.includes('$')
    );
  }

  /**
   * Check if transformation is needed
   */
  private needsTransformation(
    fieldType: string,
    transformationFunction: string,
  ): boolean {
    const transformationNeeds: Record<string, string[]> = {
      date_iso: ['text', 'number'],
      phone_format: ['text', 'number'],
      email_lowercase: ['text'],
      number_currency: ['text'],
      text_title_case: ['text', 'textarea'],
      text_uppercase: ['text', 'textarea'],
      text_lowercase: ['text', 'textarea'],
    };

    const needsFor = transformationNeeds[transformationFunction] || [];
    return needsFor.includes(fieldType);
  }

  /**
   * Calculate Levenshtein distance for fuzzy matching
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = Array(str2.length + 1)
      .fill(null)
      .map(() => Array(str1.length + 1).fill(null));

    for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;

    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1,
          matrix[j - 1][i] + 1,
          matrix[j - 1][i - 1] + indicator,
        );
      }
    }

    return matrix[str2.length][str1.length];
  }

  /**
   * Create a new population rule
   */
  async createRule(
    organizationId: string,
    ruleName: string,
    sourceFieldPattern: string,
    targetCoreField: string,
    confidenceModifier: number,
    priority: number,
    supplierType?: SupplierType,
    formType?: FormType,
    transformationFunction?: TransformationRule,
    createdBy?: string,
  ): Promise<PopulationRule | null> {
    try {
      const { data, error } = await supabase
        .from('auto_population_rules')
        .insert([
          {
            organization_id: organizationId,
            rule_name: ruleName,
            source_field_pattern: sourceFieldPattern,
            target_core_field: targetCoreField,
            transformation_function: transformationFunction,
            confidence_modifier: confidenceModifier,
            priority,
            supplier_type: supplierType,
            form_type: formType,
            is_active: true,
            usage_count: 0,
            accuracy_score: 0.5, // Start with neutral accuracy
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            created_by: createdBy || 'system',
          },
        ])
        .select()
        .single();

      if (error) {
        console.error('Error creating population rule:', error);
        return null;
      }

      // Clear cache to force refresh
      this.clearRuleCache(organizationId, supplierType, formType);

      return data;
    } catch (error) {
      console.error('Error in createRule:', error);
      return null;
    }
  }

  /**
   * Update rule accuracy based on feedback
   */
  async updateRuleAccuracy(ruleId: string, wasCorrect: boolean): Promise<void> {
    try {
      const accuracyAdjustment = wasCorrect ? 0.05 : -0.1; // Positive feedback +5%, negative -10%

      await supabase
        .from('auto_population_rules')
        .update({
          accuracy_score: supabase.raw(
            `GREATEST(LEAST(accuracy_score + ${accuracyAdjustment}, 1.0), 0.0)`,
          ),
          usage_count: supabase.raw('usage_count + 1'),
          updated_at: new Date().toISOString(),
        })
        .eq('id', ruleId);
    } catch (error) {
      console.error('Error updating rule accuracy:', error);
    }
  }

  /**
   * Clear rule cache
   */
  private clearRuleCache(
    organizationId: string,
    supplierType?: SupplierType,
    formType?: FormType,
  ): void {
    const cacheKey = `${organizationId}-${supplierType || 'any'}-${formType || 'any'}`;
    this.ruleCache.delete(cacheKey);
    this.cacheExpiry.delete(cacheKey);
  }

  /**
   * Get rule performance metrics
   */
  async getRuleMetrics(organizationId: string): Promise<{
    totalRules: number;
    activeRules: number;
    averageAccuracy: number;
    topPerformingRules: {
      rule_name: string;
      accuracy_score: number;
      usage_count: number;
    }[];
  }> {
    try {
      const { data: rules } = await supabase
        .from('auto_population_rules')
        .select('rule_name, accuracy_score, usage_count, is_active')
        .eq('organization_id', organizationId);

      if (!rules) {
        return {
          totalRules: 0,
          activeRules: 0,
          averageAccuracy: 0,
          topPerformingRules: [],
        };
      }

      const totalRules = rules.length;
      const activeRules = rules.filter((r) => r.is_active).length;
      const averageAccuracy =
        rules.length > 0
          ? rules.reduce((sum, r) => sum + r.accuracy_score, 0) / rules.length
          : 0;

      const topPerformingRules = rules
        .filter((r) => r.usage_count > 0)
        .sort((a, b) => b.accuracy_score - a.accuracy_score)
        .slice(0, 5)
        .map((r) => ({
          rule_name: r.rule_name,
          accuracy_score: Math.round(r.accuracy_score * 100) / 100,
          usage_count: r.usage_count,
        }));

      return {
        totalRules,
        activeRules,
        averageAccuracy: Math.round(averageAccuracy * 100) / 100,
        topPerformingRules,
      };
    } catch (error) {
      console.error('Error getting rule metrics:', error);
      return {
        totalRules: 0,
        activeRules: 0,
        averageAccuracy: 0,
        topPerformingRules: [],
      };
    }
  }
}

export const populationRulesEngine = new PopulationRulesEngine();
