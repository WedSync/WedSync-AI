/**
 * Automated Quality Assessment Service
 * WS-112 Quality Control Implementation - Team E Batch 8 Round 2
 *
 * Comprehensive automated quality checking system for marketplace templates
 * Implements completeness, technical, content, compliance, and performance checks
 */

import { createClient } from '@supabase/supabase-js';
import { Database } from '@/types/database';

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

// Quality check interfaces
export interface QualityCheckResult {
  check_name: string;
  check_category:
    | 'completeness'
    | 'technical'
    | 'content'
    | 'compliance'
    | 'performance'
    | 'security';
  passed: boolean;
  score: number; // 0-100 scale
  check_value?: string;
  expected_value?: string;
  failure_reason?: string;
  suggestions: string[];
  check_details?: Record<string, any>;
  check_duration_ms?: number;
}

export interface AutomatedQualityReport {
  template_id: string;
  overall_passed: boolean;
  overall_score: number; // 0-100 scale
  checks: QualityCheckResult[];
  blocking_failures: string[];
  recommendations: string[];
  estimated_fix_time: number; // minutes
  check_summary: {
    total_checks: number;
    passed_checks: number;
    failed_checks: number;
    critical_failures: number;
  };
}

export interface QualityThresholds {
  completeness: {
    min_title_length: number;
    min_description_length: number;
    min_components: number;
    min_price_cents: number;
    max_price_cents: number;
    required_fields: string[];
  };
  technical: {
    max_load_time_ms: number;
    min_performance_score: number;
    max_memory_usage_mb: number;
  };
  content: {
    max_spelling_errors: number;
    banned_words: string[];
    min_originality_score: number;
    max_duplicate_similarity: number;
  };
  compliance: {
    required_categories: string[];
    min_target_audience_match: number;
  };
}

/**
 * Automated Quality Assessment Service
 * Runs comprehensive quality checks on marketplace templates
 */
export class AutomatedQualityCheckService {
  private static readonly QUALITY_THRESHOLDS: QualityThresholds = {
    completeness: {
      min_title_length: 10,
      min_description_length: 100,
      min_components: 1,
      min_price_cents: 100,
      max_price_cents: 500000,
      required_fields: ['title', 'description', 'category', 'template_type'],
    },
    technical: {
      max_load_time_ms: 3000,
      min_performance_score: 70,
      max_memory_usage_mb: 50,
    },
    content: {
      max_spelling_errors: 3,
      banned_words: ['guarantee', 'unlimited', 'free money', 'get rich quick'],
      min_originality_score: 0.7,
      max_duplicate_similarity: 0.8,
    },
    compliance: {
      required_categories: [
        'photography',
        'catering',
        'venue',
        'planning',
        'florals',
        'music',
      ],
      min_target_audience_match: 0.8,
    },
  };

  /**
   * Run all automated quality checks for a template
   */
  static async runAllChecks(
    templateId: string,
  ): Promise<AutomatedQualityReport> {
    const startTime = Date.now();

    try {
      // Get template data with components
      const { data: template, error } = await supabase
        .from('marketplace_templates')
        .select(
          `
          *,
          marketplace_template_components:template_components(*)
        `,
        )
        .eq('id', templateId)
        .single();

      if (error || !template) {
        throw new Error(`Template not found: ${templateId}`);
      }

      // Get quality check configurations
      const { data: checkConfigs } = await supabase
        .from('marketplace_quality_check_configs')
        .select('*')
        .eq('is_enabled', true)
        .order('check_category', { ascending: true });

      if (!checkConfigs || checkConfigs.length === 0) {
        throw new Error('No quality check configurations found');
      }

      // Run all check categories
      const checks: QualityCheckResult[] = [];

      // Run checks in parallel for performance
      const [
        completenessChecks,
        technicalChecks,
        contentChecks,
        complianceChecks,
      ] = await Promise.all([
        this.runCompletenessChecks(template),
        this.runTechnicalChecks(template),
        this.runContentChecks(template),
        this.runComplianceChecks(template),
      ]);

      checks.push(
        ...completenessChecks,
        ...technicalChecks,
        ...contentChecks,
        ...complianceChecks,
      );

      // Calculate overall results
      const overallPassed = this.isOverallPassed(checks, checkConfigs);
      const overallScore = this.calculateOverallScore(checks);
      const blockingFailures = this.getBlockingFailures(checks, checkConfigs);
      const recommendations = this.generateRecommendations(checks);

      // Create check summary
      const checkSummary = {
        total_checks: checks.length,
        passed_checks: checks.filter((c) => c.passed).length,
        failed_checks: checks.filter((c) => !c.passed).length,
        critical_failures: blockingFailures.length,
      };

      // Save results to database
      await this.saveCheckResults(templateId, checks);

      const report: AutomatedQualityReport = {
        template_id: templateId,
        overall_passed: overallPassed,
        overall_score: overallScore,
        checks,
        blocking_failures: blockingFailures,
        recommendations,
        estimated_fix_time: this.estimateFixTime(
          checks.filter((c) => !c.passed),
        ),
        check_summary: checkSummary,
      };

      // Log quality check completion
      console.log(`Quality check completed for template ${templateId}:`, {
        score: overallScore,
        passed: overallPassed,
        duration: Date.now() - startTime,
        checks: checkSummary,
      });

      return report;
    } catch (error) {
      console.error(`Quality check failed for template ${templateId}:`, error);
      throw error;
    }
  }

  /**
   * Run completeness quality checks
   */
  private static async runCompletenessChecks(
    template: any,
  ): Promise<QualityCheckResult[]> {
    const checks: QualityCheckResult[] = [];
    const thresholds = this.QUALITY_THRESHOLDS.completeness;

    // Title length check
    const titleLength = template.title?.length || 0;
    checks.push({
      check_name: 'title_length',
      check_category: 'completeness',
      passed: titleLength >= thresholds.min_title_length,
      score: Math.min((titleLength / thresholds.min_title_length) * 100, 100),
      check_value: titleLength.toString(),
      expected_value: `${thresholds.min_title_length}+ characters`,
      failure_reason:
        titleLength < thresholds.min_title_length
          ? 'Title is too short'
          : undefined,
      suggestions:
        titleLength < thresholds.min_title_length
          ? [
              'Add more descriptive words to your title',
              'Include the target vendor type in title',
              'Mention key benefits or features',
            ]
          : [],
      check_details: {
        actual_length: titleLength,
        required_length: thresholds.min_title_length,
      },
    });

    // Description length check
    const descriptionLength = template.description?.length || 0;
    checks.push({
      check_name: 'description_length',
      check_category: 'completeness',
      passed: descriptionLength >= thresholds.min_description_length,
      score: Math.min(
        (descriptionLength / thresholds.min_description_length) * 100,
        100,
      ),
      check_value: descriptionLength.toString(),
      expected_value: `${thresholds.min_description_length}+ characters`,
      failure_reason:
        descriptionLength < thresholds.min_description_length
          ? 'Description is too short'
          : undefined,
      suggestions:
        descriptionLength < thresholds.min_description_length
          ? [
              'Explain what the template includes',
              'Describe benefits for buyers',
              'Add use case examples',
              'Mention setup time and complexity',
            ]
          : [],
      check_details: {
        actual_length: descriptionLength,
        required_length: thresholds.min_description_length,
      },
    });

    // Component count check
    const componentCount =
      template.marketplace_template_components?.length || 0;
    checks.push({
      check_name: 'component_count',
      check_category: 'completeness',
      passed: componentCount >= thresholds.min_components,
      score: Math.min(componentCount * 25, 100),
      check_value: componentCount.toString(),
      expected_value: `${thresholds.min_components}+ components`,
      failure_reason:
        componentCount === 0 ? 'No components added to template' : undefined,
      suggestions:
        componentCount === 0
          ? [
              'Add forms, journeys, or email sequences to your template',
              'Include at least one functional component',
            ]
          : [],
      check_details: {
        actual_count: componentCount,
        required_count: thresholds.min_components,
      },
    });

    // Pricing validation check
    const priceCents = template.price_cents || 0;
    const pricingValid =
      priceCents >= thresholds.min_price_cents &&
      priceCents <= thresholds.max_price_cents;
    checks.push({
      check_name: 'pricing_validation',
      check_category: 'completeness',
      passed: pricingValid,
      score: pricingValid ? 100 : 0,
      check_value: `£${(priceCents / 100).toFixed(2)}`,
      expected_value: `£${thresholds.min_price_cents / 100} - £${thresholds.max_price_cents / 100}`,
      failure_reason: !pricingValid
        ? 'Price is outside acceptable range'
        : undefined,
      suggestions: !pricingValid
        ? [
            'Set a reasonable price based on template value and complexity',
            'Consider market rates for similar templates',
          ]
        : [],
      check_details: {
        price_cents: priceCents,
        min_price: thresholds.min_price_cents,
        max_price: thresholds.max_price_cents,
      },
    });

    // Category assignment check
    const hasValidCategory =
      template.category &&
      thresholds.required_categories.includes(template.category);
    checks.push({
      check_name: 'category_assignment',
      check_category: 'completeness',
      passed: hasValidCategory,
      score: hasValidCategory ? 100 : 0,
      check_value: template.category || 'none',
      expected_value:
        'Valid category from: ' + thresholds.required_categories.join(', '),
      failure_reason: !hasValidCategory
        ? 'Invalid or missing category'
        : undefined,
      suggestions: !hasValidCategory
        ? [
            'Select an appropriate category for your template',
            'Choose the primary vendor type this template serves',
          ]
        : [],
      check_details: {
        assigned_category: template.category,
        valid_categories: thresholds.required_categories,
      },
    });

    // Target audience specification check
    const hasTargetAudience =
      template.target_wedding_types?.length > 0 || template.target_price_range;
    checks.push({
      check_name: 'target_audience',
      check_category: 'completeness',
      passed: hasTargetAudience,
      score: hasTargetAudience ? 100 : 50, // Non-blocking but reduces score
      check_value: hasTargetAudience ? 'Specified' : 'Missing',
      expected_value: 'Wedding types or price range specified',
      failure_reason: !hasTargetAudience
        ? 'Target audience not clearly defined'
        : undefined,
      suggestions: !hasTargetAudience
        ? [
            'Specify target wedding types (luxury, budget, destination, etc.)',
            'Define target price range for weddings',
          ]
        : [],
      check_details: {
        wedding_types: template.target_wedding_types || [],
        price_range: template.target_price_range,
      },
    });

    return checks;
  }

  /**
   * Run technical quality checks
   */
  private static async runTechnicalChecks(
    template: any,
  ): Promise<QualityCheckResult[]> {
    const checks: QualityCheckResult[] = [];

    // JSON validation check
    try {
      JSON.parse(JSON.stringify(template.template_data));
      checks.push({
        check_name: 'json_validation',
        check_category: 'technical',
        passed: true,
        score: 100,
        check_value: 'Valid',
        expected_value: 'Valid JSON',
        suggestions: [],
        check_details: {
          data_size: JSON.stringify(template.template_data).length,
        },
      });
    } catch (error) {
      checks.push({
        check_name: 'json_validation',
        check_category: 'technical',
        passed: false,
        score: 0,
        check_value: 'Invalid',
        expected_value: 'Valid JSON',
        failure_reason: 'Template data contains invalid JSON structure',
        suggestions: [
          'Contact support - this is a system error that should not occur',
        ],
        check_details: {
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      });
    }

    // Schema compliance check
    const hasRequiredFields = this.validateTemplateSchema(template);
    checks.push({
      check_name: 'schema_compliance',
      check_category: 'technical',
      passed: hasRequiredFields.valid,
      score: hasRequiredFields.valid
        ? 100
        : Math.max(0, 100 - hasRequiredFields.missing_fields.length * 20),
      check_value: hasRequiredFields.valid
        ? 'Compliant'
        : `${hasRequiredFields.missing_fields.length} missing fields`,
      expected_value: 'All required fields present',
      failure_reason: !hasRequiredFields.valid
        ? 'Missing required schema fields'
        : undefined,
      suggestions: !hasRequiredFields.valid
        ? [
            `Missing fields: ${hasRequiredFields.missing_fields.join(', ')}`,
            'Ensure all required template fields are populated',
          ]
        : [],
      check_details: {
        missing_fields: hasRequiredFields.missing_fields,
        checked_fields: hasRequiredFields.checked_fields,
      },
    });

    // Performance check (if performance data exists)
    const { data: performanceData } = await supabase
      .from('marketplace_template_performance')
      .select('*')
      .eq('template_id', template.id)
      .single();

    if (performanceData) {
      const passesThreshold =
        performanceData.overall_performance_score >=
        this.QUALITY_THRESHOLDS.technical.min_performance_score;
      checks.push({
        check_name: 'performance_threshold',
        check_category: 'technical',
        passed: passesThreshold,
        score: performanceData.overall_performance_score,
        check_value: `${performanceData.overall_performance_score}/100`,
        expected_value: `${this.QUALITY_THRESHOLDS.technical.min_performance_score}/100+`,
        failure_reason: !passesThreshold
          ? 'Template performance below minimum threshold'
          : undefined,
        suggestions: !passesThreshold
          ? [
              'Optimize template loading time',
              'Reduce component complexity',
              'Minimize resource usage',
            ]
          : [],
        check_details: {
          load_time_ms: performanceData.load_time_ms,
          render_time_ms: performanceData.render_time_ms,
          memory_usage_mb: performanceData.memory_usage_mb,
          grade: performanceData.performance_grade,
        },
      });
    } else {
      // Schedule performance test if not run yet
      checks.push({
        check_name: 'performance_threshold',
        check_category: 'technical',
        passed: true, // Don't block for missing performance data initially
        score: 80, // Neutral score
        check_value: 'Not tested',
        expected_value: 'Performance test completed',
        suggestions: ['Performance testing will be run automatically'],
        check_details: {
          status: 'scheduled',
          reason: 'Performance test not yet completed',
        },
      });
    }

    return checks;
  }

  /**
   * Run content quality checks
   */
  private static async runContentChecks(
    template: any,
  ): Promise<QualityCheckResult[]> {
    const checks: QualityCheckResult[] = [];
    const thresholds = this.QUALITY_THRESHOLDS.content;

    // Content quality assessment
    const contentText =
      `${template.title} ${template.description}`.toLowerCase();

    // Profanity and banned words check
    const bannedWordsFound = thresholds.banned_words.filter((word) =>
      contentText.includes(word.toLowerCase()),
    );

    checks.push({
      check_name: 'profanity_check',
      check_category: 'content',
      passed: bannedWordsFound.length === 0,
      score: bannedWordsFound.length === 0 ? 100 : 0,
      check_value:
        bannedWordsFound.length > 0
          ? `${bannedWordsFound.length} violations`
          : 'Clean',
      expected_value: 'No inappropriate content',
      failure_reason:
        bannedWordsFound.length > 0
          ? 'Inappropriate language detected'
          : undefined,
      suggestions:
        bannedWordsFound.length > 0
          ? [
              'Remove inappropriate language from title and description',
              'Use professional, business-appropriate language',
            ]
          : [],
      check_details: {
        banned_words_found: bannedWordsFound,
        checked_words: thresholds.banned_words.length,
      },
    });

    // Basic spell check (simplified - in production would use proper spell check service)
    const spellCheckResults = await this.performBasicSpellCheck(contentText);
    checks.push({
      check_name: 'spelling_grammar',
      check_category: 'content',
      passed: spellCheckResults.errors.length <= thresholds.max_spelling_errors,
      score: Math.max(0, 100 - spellCheckResults.errors.length * 15),
      check_value: `${spellCheckResults.errors.length} potential errors`,
      expected_value: `≤${thresholds.max_spelling_errors} errors`,
      failure_reason:
        spellCheckResults.errors.length > thresholds.max_spelling_errors
          ? 'Too many spelling/grammar errors'
          : undefined,
      suggestions:
        spellCheckResults.errors.length > 0
          ? [
              'Review and fix spelling errors in title and description',
              'Use spell check before submitting',
            ]
          : [],
      check_details: {
        errors: spellCheckResults.errors,
        suggestions: spellCheckResults.suggestions,
      },
    });

    // Originality check (if similarity data exists)
    const { data: similarityData } = await supabase
      .from('marketplace_template_similarity')
      .select('*')
      .eq('template_id', template.id)
      .order('overall_similarity', { ascending: false })
      .limit(1);

    if (similarityData && similarityData.length > 0) {
      const maxSimilarity = similarityData[0].overall_similarity;
      const isOriginal = maxSimilarity <= thresholds.max_duplicate_similarity;

      checks.push({
        check_name: 'originality_check',
        check_category: 'content',
        passed: isOriginal,
        score: Math.round((1 - maxSimilarity) * 100),
        check_value: `${Math.round((1 - maxSimilarity) * 100)}% original`,
        expected_value: `>${Math.round((1 - thresholds.max_duplicate_similarity) * 100)}% original`,
        failure_reason: !isOriginal
          ? 'Template may be too similar to existing content'
          : undefined,
        suggestions: !isOriginal
          ? [
              'Add unique elements to differentiate from similar templates',
              'Focus on your specific expertise or approach',
            ]
          : [],
        check_details: {
          max_similarity: maxSimilarity,
          similar_template_count: similarityData.length,
          threshold: thresholds.max_duplicate_similarity,
        },
      });
    } else {
      checks.push({
        check_name: 'originality_check',
        check_category: 'content',
        passed: true, // Don't block for missing originality data initially
        score: 85, // Assume good originality until proven otherwise
        check_value: 'Not checked',
        expected_value: 'Originality verification completed',
        suggestions: ['Originality check will be run automatically'],
        check_details: {
          status: 'scheduled',
          reason: 'Originality check not yet completed',
        },
      });
    }

    return checks;
  }

  /**
   * Run compliance quality checks
   */
  private static async runComplianceChecks(
    template: any,
  ): Promise<QualityCheckResult[]> {
    const checks: QualityCheckResult[] = [];

    // Platform guidelines compliance (manual assessment placeholder)
    checks.push({
      check_name: 'platform_compliance',
      check_category: 'compliance',
      passed: true, // This will be assessed during manual review
      score: 90, // Neutral high score pending manual review
      check_value: 'Pending review',
      expected_value: 'Meets platform guidelines',
      suggestions: ['Manual compliance review will be conducted'],
      check_details: {
        status: 'pending_manual_review',
        category: template.category,
      },
    });

    // Target audience appropriateness
    const hasAppropriateTargeting =
      template.target_wedding_types?.length > 0 && template.category;
    checks.push({
      check_name: 'target_audience',
      check_category: 'compliance',
      passed: hasAppropriateTargeting,
      score: hasAppropriateTargeting ? 100 : 70,
      check_value: hasAppropriateTargeting
        ? 'Appropriate'
        : 'Needs clarification',
      expected_value: 'Clear target audience definition',
      failure_reason: !hasAppropriateTargeting
        ? 'Target audience not clearly defined'
        : undefined,
      suggestions: !hasAppropriateTargeting
        ? [
            'Clearly define who should use this template',
            'Specify appropriate wedding types and budgets',
          ]
        : [],
      check_details: {
        category: template.category,
        wedding_types: template.target_wedding_types || [],
        price_range: template.target_price_range,
      },
    });

    // Pricing reasonableness (will be assessed during manual review)
    checks.push({
      check_name: 'pricing_fairness',
      check_category: 'compliance',
      passed: true, // This will be assessed during manual review
      score: 85, // Neutral score pending manual review
      check_value: 'Pending review',
      expected_value: 'Fair market pricing',
      suggestions: ['Pricing fairness will be assessed during manual review'],
      check_details: {
        price_cents: template.price_cents,
        category: template.category,
        component_count: template.marketplace_template_components?.length || 0,
      },
    });

    return checks;
  }

  /**
   * Validate template schema compliance
   */
  private static validateTemplateSchema(template: any): {
    valid: boolean;
    missing_fields: string[];
    checked_fields: string[];
  } {
    const requiredFields = this.QUALITY_THRESHOLDS.completeness.required_fields;
    const missingFields: string[] = [];
    const checkedFields: string[] = [];

    for (const field of requiredFields) {
      checkedFields.push(field);
      if (
        !template[field] ||
        (typeof template[field] === 'string' &&
          template[field].trim().length === 0)
      ) {
        missingFields.push(field);
      }
    }

    return {
      valid: missingFields.length === 0,
      missing_fields: missingFields,
      checked_fields: checkedFields,
    };
  }

  /**
   * Perform basic spell check (simplified implementation)
   */
  private static async performBasicSpellCheck(
    text: string,
  ): Promise<{ errors: string[]; suggestions: string[] }> {
    // This is a simplified spell check - in production, would integrate with a proper spell check service
    const commonMisspellings = [
      { wrong: 'recieve', correct: 'receive' },
      { wrong: 'seperate', correct: 'separate' },
      { wrong: 'definately', correct: 'definitely' },
      { wrong: 'occassion', correct: 'occasion' },
      { wrong: 'accomodate', correct: 'accommodate' },
      { wrong: 'bussiness', correct: 'business' },
      { wrong: 'proffessional', correct: 'professional' },
    ];

    const errors: string[] = [];
    const suggestions: string[] = [];

    for (const misspelling of commonMisspellings) {
      if (text.includes(misspelling.wrong)) {
        errors.push(misspelling.wrong);
        suggestions.push(
          `Replace "${misspelling.wrong}" with "${misspelling.correct}"`,
        );
      }
    }

    return { errors, suggestions };
  }

  /**
   * Check if overall quality assessment passes
   */
  private static isOverallPassed(
    checks: QualityCheckResult[],
    configs: any[],
  ): boolean {
    // Get blocking check names from configs
    const blockingChecks = configs
      .filter((config) => config.is_blocking)
      .map((config) => config.check_name);

    // Check if any blocking checks failed
    for (const check of checks) {
      if (blockingChecks.includes(check.check_name) && !check.passed) {
        return false;
      }
    }

    return true;
  }

  /**
   * Calculate overall quality score
   */
  private static calculateOverallScore(checks: QualityCheckResult[]): number {
    if (checks.length === 0) return 0;

    // Weight checks by category
    const weights = {
      completeness: 0.3,
      technical: 0.25,
      content: 0.25,
      compliance: 0.15,
      performance: 0.05,
    };

    let totalScore = 0;
    let totalWeight = 0;

    Object.entries(weights).forEach(([category, weight]) => {
      const categoryChecks = checks.filter(
        (check) => check.check_category === category,
      );
      if (categoryChecks.length > 0) {
        const categoryScore =
          categoryChecks.reduce((sum, check) => sum + check.score, 0) /
          categoryChecks.length;
        totalScore += categoryScore * weight;
        totalWeight += weight;
      }
    });

    return totalWeight > 0 ? Math.round(totalScore / totalWeight) : 0;
  }

  /**
   * Get list of blocking failures
   */
  private static getBlockingFailures(
    checks: QualityCheckResult[],
    configs: any[],
  ): string[] {
    const blockingChecks = configs
      .filter((config) => config.is_blocking)
      .map((config) => config.check_name);

    return checks
      .filter(
        (check) => blockingChecks.includes(check.check_name) && !check.passed,
      )
      .map((check) => check.check_name);
  }

  /**
   * Generate recommendations based on check results
   */
  private static generateRecommendations(
    checks: QualityCheckResult[],
  ): string[] {
    const recommendations: string[] = [];

    const failedChecks = checks.filter((check) => !check.passed);
    const lowScoreChecks = checks.filter((check) => check.score < 80);

    if (failedChecks.length > 0) {
      recommendations.push(
        `Address ${failedChecks.length} failed quality checks before resubmission`,
      );
    }

    if (lowScoreChecks.length > 0) {
      recommendations.push(
        `Improve ${lowScoreChecks.length} areas scoring below 80% for better approval chances`,
      );
    }

    // Category-specific recommendations
    const categoryCounts = {
      completeness: failedChecks.filter(
        (c) => c.check_category === 'completeness',
      ).length,
      technical: failedChecks.filter((c) => c.check_category === 'technical')
        .length,
      content: failedChecks.filter((c) => c.check_category === 'content')
        .length,
      compliance: failedChecks.filter((c) => c.check_category === 'compliance')
        .length,
    };

    if (categoryCounts.completeness > 0) {
      recommendations.push(
        'Complete all required template information and components',
      );
    }
    if (categoryCounts.technical > 0) {
      recommendations.push(
        'Resolve technical issues with template structure and performance',
      );
    }
    if (categoryCounts.content > 0) {
      recommendations.push(
        'Improve content quality, originality, and language usage',
      );
    }
    if (categoryCounts.compliance > 0) {
      recommendations.push(
        'Ensure template meets platform guidelines and target audience requirements',
      );
    }

    return recommendations;
  }

  /**
   * Estimate time needed to fix failed checks
   */
  private static estimateFixTime(failedChecks: QualityCheckResult[]): number {
    // Estimate minutes needed to fix each type of check
    const fixTimeMap: Record<string, number> = {
      title_length: 5,
      description_length: 15,
      component_count: 30,
      pricing_validation: 5,
      category_assignment: 2,
      json_validation: 60, // Technical issue, may need support
      schema_compliance: 20,
      performance_threshold: 45,
      profanity_check: 10,
      spelling_grammar: 15,
      originality_check: 120, // May require significant rework
      platform_compliance: 30,
      target_audience: 10,
      pricing_fairness: 10,
    };

    let totalEstimate = 0;

    for (const check of failedChecks) {
      totalEstimate += fixTimeMap[check.check_name] || 20; // Default 20 minutes
    }

    return Math.round(totalEstimate);
  }

  /**
   * Save check results to database
   */
  private static async saveCheckResults(
    templateId: string,
    checks: QualityCheckResult[],
  ): Promise<void> {
    // Delete existing results for this template
    await supabase
      .from('marketplace_quality_check_results')
      .delete()
      .eq('template_id', templateId);

    // Insert new results
    const checkResults = checks.map((check) => ({
      template_id: templateId,
      check_name: check.check_name,
      passed: check.passed,
      score: check.score,
      check_value: check.check_value,
      expected_value: check.expected_value,
      check_details: check.check_details || {},
      failure_reason: check.failure_reason,
      error_messages: check.failure_reason ? [check.failure_reason] : [],
      suggestions: check.suggestions,
      check_duration_ms: check.check_duration_ms || 0,
      checked_at: new Date().toISOString(),
    }));

    const { error } = await supabase
      .from('marketplace_quality_check_results')
      .insert(checkResults);

    if (error) {
      console.error('Failed to save quality check results:', error);
      throw error;
    }
  }
}

export default AutomatedQualityCheckService;
