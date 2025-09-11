import {
  differenceInDays,
  addDays,
  subDays,
  isAfter,
  isBefore,
} from 'date-fns';

// Types
export interface VisibilityRule {
  id: string;
  type:
    | 'timeline'
    | 'package'
    | 'form_state'
    | 'custom'
    | 'milestone_completed'
    | 'client_metadata';
  condition: string;
  value: any;
  operator:
    | 'equals'
    | 'not_equals'
    | 'greater_than'
    | 'less_than'
    | 'between'
    | 'in'
    | 'not_in'
    | 'contains'
    | 'exists';
  logic?: 'and' | 'or';
  description?: string;
  isActive: boolean;
  priority: number;
  cacheKey?: string;
}

export interface ClientContext {
  id: string;
  weddingDate?: Date;
  packageLevel?: string;
  budget?: number;
  guestCount?: number;
  venueType?: string;
  weddingStyle?: string;
  completedForms?: string[];
  completedMilestones?: string[];
  customFields?: Record<string, any>;
  bookingDate?: Date;
  lastActivity?: Date;
  supplierFields?: Record<string, any>;
}

export interface SectionVisibilityResult {
  visible: boolean;
  reason: string;
  matchedRules: string[];
  cacheable: boolean;
  cacheExpiry?: Date;
  debugInfo?: {
    rulesEvaluated: number;
    processingTime: number;
    errors: string[];
  };
}

export interface WeddingMilestone {
  id: string;
  label: string;
  daysFromWedding: number;
  category: 'early' | 'planning' | 'details' | 'final' | 'wedding' | 'post';
  description: string;
  suggestedActions: string[];
  formsTrigger?: string[];
  contentReveal?: string[];
}

// Wedding planning milestones with intelligent content scheduling
const WEDDING_MILESTONES: WeddingMilestone[] = [
  {
    id: '12_months_before',
    label: '12+ Months Before',
    daysFromWedding: -365,
    category: 'early',
    description: 'Early planning phase - setting the foundation',
    suggestedActions: ['Set budget', 'Create vision board', 'Research venues'],
    formsTrigger: ['wedding_vision', 'initial_budget'],
    contentReveal: ['planning_guide', 'inspiration_gallery'],
  },
  {
    id: '9_months_before',
    label: '9 Months Before',
    daysFromWedding: -270,
    category: 'early',
    description: 'Venue and vendor selection',
    suggestedActions: ['Book venue', 'Research vendors', 'Send save-the-dates'],
    formsTrigger: ['venue_requirements', 'vendor_preferences'],
    contentReveal: ['vendor_directory', 'venue_checklist'],
  },
  {
    id: '6_months_before',
    label: '6 Months Before',
    daysFromWedding: -180,
    category: 'planning',
    description: 'Detailed planning and bookings',
    suggestedActions: ['Book major vendors', 'Order invitations', 'Plan menu'],
    formsTrigger: [
      'catering_choices',
      'photography_style',
      'music_preferences',
    ],
    contentReveal: ['menu_planner', 'invitation_designer', 'timeline_builder'],
  },
  {
    id: '3_months_before',
    label: '3 Months Before',
    daysFromWedding: -90,
    category: 'details',
    description: 'Finalizing details and logistics',
    suggestedActions: ['Finalize guest list', 'Order flowers', 'Plan seating'],
    formsTrigger: [
      'final_guest_list',
      'seating_preferences',
      'special_requests',
    ],
    contentReveal: ['seating_chart', 'day_of_timeline', 'vendor_contacts'],
  },
  {
    id: '1_month_before',
    label: '1 Month Before',
    daysFromWedding: -30,
    category: 'final',
    description: 'Final preparations and confirmations',
    suggestedActions: [
      'Confirm final details',
      'Prepare emergency kit',
      'Final fittings',
    ],
    formsTrigger: [
      'final_headcount',
      'special_dietary',
      'timeline_confirmation',
    ],
    contentReveal: ['final_checklist', 'emergency_contacts', 'day_of_guide'],
  },
  {
    id: '1_week_before',
    label: '1 Week Before',
    daysFromWedding: -7,
    category: 'final',
    description: 'Final week countdown',
    suggestedActions: [
      'Rehearsal',
      'Final venue check',
      'Delegate responsibilities',
    ],
    formsTrigger: ['rehearsal_attendance', 'final_requests'],
    contentReveal: [
      'countdown_timer',
      'final_week_checklist',
      'relaxation_tips',
    ],
  },
  {
    id: 'wedding_day',
    label: 'Wedding Day',
    daysFromWedding: 0,
    category: 'wedding',
    description: 'Your special day!',
    suggestedActions: ['Enjoy your day!', 'Follow timeline', 'Trust your team'],
    contentReveal: [
      'day_of_timeline',
      'emergency_contacts',
      'celebration_guide',
    ],
  },
  {
    id: '1_week_after',
    label: '1 Week After',
    daysFromWedding: 7,
    category: 'post',
    description: 'Post-wedding follow-up',
    suggestedActions: ['Thank you notes', 'Preserve bouquet', 'Share photos'],
    contentReveal: [
      'thank_you_templates',
      'photo_sharing',
      'preservation_guide',
    ],
  },
  {
    id: '1_month_after',
    label: '1 Month After',
    daysFromWedding: 30,
    category: 'post',
    description: 'Settling into married life',
    suggestedActions: [
      'Change name documents',
      'Update accounts',
      'Plan honeymoon',
    ],
    contentReveal: [
      'name_change_checklist',
      'newlywed_guide',
      'anniversary_planning',
    ],
  },
];

// Package level hierarchy for visibility rules
const PACKAGE_HIERARCHY = {
  bronze: 1,
  silver: 2,
  gold: 3,
  platinum: 4,
  custom: 5,
};

class SectionVisibilityEngine {
  private ruleCache = new Map<
    string,
    { result: boolean; expiry: Date; reason: string }
  >();
  private performanceMetrics = {
    totalRulesEvaluated: 0,
    averageProcessingTime: 0,
    cacheHitRate: 0,
  };

  /**
   * Evaluate all visibility rules for a section
   */
  async evaluateSection(
    rules: VisibilityRule[],
    clientContext: ClientContext,
    debugMode = false,
  ): Promise<SectionVisibilityResult> {
    const startTime = Date.now();
    const errors: string[] = [];
    let rulesEvaluated = 0;

    try {
      // Filter active rules and sort by priority
      const activeRules = rules
        .filter((rule) => rule.isActive)
        .sort((a, b) => a.priority - b.priority);

      if (activeRules.length === 0) {
        return {
          visible: true,
          reason: 'No active rules - section always visible',
          matchedRules: [],
          cacheable: true,
          debugInfo: debugMode
            ? {
                rulesEvaluated: 0,
                processingTime: Date.now() - startTime,
                errors: [],
              }
            : undefined,
        };
      }

      let result: boolean | null = null;
      const matchedRules: string[] = [];
      const reasons: string[] = [];

      // Evaluate each rule
      for (const rule of activeRules) {
        rulesEvaluated++;

        try {
          const ruleResult = await this.evaluateRule(rule, clientContext);

          if (result === null) {
            // First rule
            result = ruleResult.passed;
            reasons.push(
              `${rule.description || rule.type}: ${ruleResult.message}`,
            );
            if (ruleResult.passed) {
              matchedRules.push(rule.id);
            }
          } else {
            // Subsequent rules with logic operators
            const logicOperator = rule.logic || 'and';

            if (logicOperator === 'or') {
              result = result || ruleResult.passed;
              reasons.push(
                `OR ${rule.description || rule.type}: ${ruleResult.message}`,
              );
            } else {
              result = result && ruleResult.passed;
              reasons.push(
                `AND ${rule.description || rule.type}: ${ruleResult.message}`,
              );
            }

            if (ruleResult.passed) {
              matchedRules.push(rule.id);
            }
          }
        } catch (error) {
          errors.push(`Rule ${rule.id}: ${error.message}`);
          if (debugMode) {
            console.error('Rule evaluation error:', error);
          }
        }
      }

      const processingTime = Date.now() - startTime;
      this.performanceMetrics.totalRulesEvaluated += rulesEvaluated;
      this.performanceMetrics.averageProcessingTime =
        (this.performanceMetrics.averageProcessingTime + processingTime) / 2;

      return {
        visible: result || false,
        reason: reasons.join(' • '),
        matchedRules,
        cacheable: this.isResultCacheable(activeRules),
        cacheExpiry: this.calculateCacheExpiry(activeRules, clientContext),
        debugInfo: debugMode
          ? {
              rulesEvaluated,
              processingTime,
              errors,
            }
          : undefined,
      };
    } catch (error) {
      errors.push(`Engine error: ${error.message}`);

      return {
        visible: true, // Fail open for safety
        reason: 'Error in rule evaluation - defaulting to visible',
        matchedRules: [],
        cacheable: false,
        debugInfo: debugMode
          ? {
              rulesEvaluated,
              processingTime: Date.now() - startTime,
              errors,
            }
          : undefined,
      };
    }
  }

  /**
   * Evaluate a single visibility rule
   */
  private async evaluateRule(
    rule: VisibilityRule,
    context: ClientContext,
  ): Promise<{ passed: boolean; message: string; cacheable?: boolean }> {
    // Check cache first
    const cacheKey = this.generateCacheKey(rule, context);
    const cached = this.ruleCache.get(cacheKey);

    if (cached && cached.expiry > new Date()) {
      this.performanceMetrics.cacheHitRate++;
      return { passed: cached.result, message: cached.reason, cacheable: true };
    }

    let result: { passed: boolean; message: string; cacheable?: boolean };

    switch (rule.type) {
      case 'timeline':
        result = this.evaluateTimelineRule(rule, context);
        break;
      case 'package':
        result = this.evaluatePackageRule(rule, context);
        break;
      case 'form_state':
        result = this.evaluateFormStateRule(rule, context);
        break;
      case 'milestone_completed':
        result = this.evaluateMilestoneRule(rule, context);
        break;
      case 'client_metadata':
        result = this.evaluateClientMetadataRule(rule, context);
        break;
      case 'custom':
        result = await this.evaluateCustomRule(rule, context);
        break;
      default:
        result = {
          passed: false,
          message: `Unknown rule type: ${rule.type}`,
          cacheable: false,
        };
    }

    // Cache result if cacheable
    if (result.cacheable !== false) {
      const expiry = addDays(new Date(), 1); // Cache for 1 day by default
      this.ruleCache.set(cacheKey, {
        result: result.passed,
        expiry,
        reason: result.message,
      });
    }

    return result;
  }

  /**
   * Evaluate timeline-based visibility rule
   */
  private evaluateTimelineRule(
    rule: VisibilityRule,
    context: ClientContext,
  ): { passed: boolean; message: string; cacheable: boolean } {
    if (!context.weddingDate) {
      return {
        passed: false,
        message: 'No wedding date set',
        cacheable: false,
      };
    }

    const daysUntilWedding = differenceInDays(context.weddingDate, new Date());
    const milestone = this.getCurrentWeddingMilestone(context.weddingDate);

    switch (rule.condition) {
      case 'days_until_wedding':
        return this.evaluateDaysCondition(rule, daysUntilWedding);

      case 'milestone_phase':
        const targetPhase = rule.value;
        const passed = milestone.category === targetPhase;
        return {
          passed,
          message: `Current phase: ${milestone.category} (target: ${targetPhase})`,
          cacheable: true,
        };

      case 'milestone_reached':
        const targetMilestone = WEDDING_MILESTONES.find(
          (m) => m.id === rule.value,
        );
        if (!targetMilestone) {
          return {
            passed: false,
            message: `Unknown milestone: ${rule.value}`,
            cacheable: true,
          };
        }

        const milestoneReached =
          daysUntilWedding <= Math.abs(targetMilestone.daysFromWedding);
        return {
          passed: milestoneReached,
          message: `${targetMilestone.label} ${milestoneReached ? 'reached' : 'not reached'} (${daysUntilWedding} days)`,
          cacheable: true,
        };

      default:
        return {
          passed: false,
          message: `Unknown timeline condition: ${rule.condition}`,
          cacheable: true,
        };
    }
  }

  /**
   * Evaluate package-based visibility rule
   */
  private evaluatePackageRule(
    rule: VisibilityRule,
    context: ClientContext,
  ): { passed: boolean; message: string; cacheable: boolean } {
    if (!context.packageLevel) {
      return {
        passed: false,
        message: 'No package level set',
        cacheable: false,
      };
    }

    const clientPackageLevel =
      PACKAGE_HIERARCHY[context.packageLevel as keyof typeof PACKAGE_HIERARCHY];
    if (!clientPackageLevel) {
      return {
        passed: false,
        message: `Unknown package level: ${context.packageLevel}`,
        cacheable: true,
      };
    }

    const requiredPackages = Array.isArray(rule.value)
      ? rule.value
      : [rule.value];

    switch (rule.operator) {
      case 'in':
        const packageMatch = requiredPackages.includes(context.packageLevel);
        return {
          passed: packageMatch,
          message: `Package ${context.packageLevel} ${packageMatch ? 'is' : 'is not'} in [${requiredPackages.join(', ')}]`,
          cacheable: true,
        };

      case 'greater_than':
        const minLevel =
          PACKAGE_HIERARCHY[rule.value as keyof typeof PACKAGE_HIERARCHY];
        const hasMinLevel = clientPackageLevel > minLevel;
        return {
          passed: hasMinLevel,
          message: `Package level ${clientPackageLevel} ${hasMinLevel ? '>' : '<='} ${minLevel} (${rule.value})`,
          cacheable: true,
        };

      default:
        return {
          passed: false,
          message: `Unsupported package operator: ${rule.operator}`,
          cacheable: true,
        };
    }
  }

  /**
   * Evaluate form completion state rule
   */
  private evaluateFormStateRule(
    rule: VisibilityRule,
    context: ClientContext,
  ): { passed: boolean; message: string; cacheable: boolean } {
    if (!context.completedForms) {
      return {
        passed: false,
        message: 'No form completion data available',
        cacheable: false,
      };
    }

    const requiredForms = Array.isArray(rule.value) ? rule.value : [rule.value];

    switch (rule.operator) {
      case 'contains':
        const formsCompleted = requiredForms.filter((form) =>
          context.completedForms!.includes(form),
        );
        const allFormsCompleted =
          formsCompleted.length === requiredForms.length;

        return {
          passed: allFormsCompleted,
          message: `Forms completed: ${formsCompleted.length}/${requiredForms.length} (${formsCompleted.join(', ') || 'none'})`,
          cacheable: true,
        };

      case 'not_in':
        const hasBlockingForm = requiredForms.some((form) =>
          context.completedForms!.includes(form),
        );

        return {
          passed: !hasBlockingForm,
          message: `Blocking forms ${hasBlockingForm ? 'found' : 'not found'}: [${requiredForms.join(', ')}]`,
          cacheable: true,
        };

      default:
        return {
          passed: false,
          message: `Unsupported form state operator: ${rule.operator}`,
          cacheable: true,
        };
    }
  }

  /**
   * Evaluate milestone completion rule
   */
  private evaluateMilestoneRule(
    rule: VisibilityRule,
    context: ClientContext,
  ): { passed: boolean; message: string; cacheable: boolean } {
    if (!context.completedMilestones) {
      return {
        passed: false,
        message: 'No milestone completion data available',
        cacheable: false,
      };
    }

    const requiredMilestones = Array.isArray(rule.value)
      ? rule.value
      : [rule.value];
    const completedCount = requiredMilestones.filter((milestone) =>
      context.completedMilestones!.includes(milestone),
    ).length;

    switch (rule.operator) {
      case 'contains':
        const allMilestonesCompleted =
          completedCount === requiredMilestones.length;
        return {
          passed: allMilestonesCompleted,
          message: `Milestones completed: ${completedCount}/${requiredMilestones.length}`,
          cacheable: true,
        };

      case 'greater_than':
        const hasEnoughMilestones = completedCount > parseInt(rule.value);
        return {
          passed: hasEnoughMilestones,
          message: `Completed milestones: ${completedCount} (need >${rule.value})`,
          cacheable: true,
        };

      default:
        return {
          passed: false,
          message: `Unsupported milestone operator: ${rule.operator}`,
          cacheable: true,
        };
    }
  }

  /**
   * Evaluate client metadata rule (budget, guest count, etc.)
   */
  private evaluateClientMetadataRule(
    rule: VisibilityRule,
    context: ClientContext,
  ): { passed: boolean; message: string; cacheable: boolean } {
    const fieldValue =
      context.customFields?.[rule.condition] ??
      context[rule.condition as keyof ClientContext];

    if (fieldValue === undefined || fieldValue === null) {
      return {
        passed: false,
        message: `Field '${rule.condition}' not found or is null`,
        cacheable: false,
      };
    }

    switch (rule.operator) {
      case 'equals':
        const equals = fieldValue === rule.value;
        return {
          passed: equals,
          message: `${rule.condition} = ${fieldValue} (expected: ${rule.value})`,
          cacheable: true,
        };

      case 'greater_than':
        const greater = Number(fieldValue) > Number(rule.value);
        return {
          passed: greater,
          message: `${rule.condition} = ${fieldValue} (need >${rule.value})`,
          cacheable: true,
        };

      case 'less_than':
        const less = Number(fieldValue) < Number(rule.value);
        return {
          passed: less,
          message: `${rule.condition} = ${fieldValue} (need <${rule.value})`,
          cacheable: true,
        };

      case 'between':
        const [min, max] = String(rule.value).split(',').map(Number);
        const numValue = Number(fieldValue);
        const between = numValue >= min && numValue <= max;
        return {
          passed: between,
          message: `${rule.condition} = ${fieldValue} (need ${min}-${max})`,
          cacheable: true,
        };

      case 'contains':
        const contains = String(fieldValue)
          .toLowerCase()
          .includes(String(rule.value).toLowerCase());
        return {
          passed: contains,
          message: `${rule.condition} contains '${rule.value}': ${contains}`,
          cacheable: true,
        };

      case 'exists':
        const exists =
          fieldValue !== null && fieldValue !== undefined && fieldValue !== '';
        return {
          passed: exists,
          message: `${rule.condition} exists: ${exists}`,
          cacheable: true,
        };

      default:
        return {
          passed: false,
          message: `Unsupported metadata operator: ${rule.operator}`,
          cacheable: true,
        };
    }
  }

  /**
   * Evaluate custom rule (extensible for complex logic)
   */
  private async evaluateCustomRule(
    rule: VisibilityRule,
    context: ClientContext,
  ): Promise<{ passed: boolean; message: string; cacheable: boolean }> {
    try {
      // This could be extended to support various custom evaluation strategies
      // For now, implement basic JavaScript expression evaluation with safety

      if (rule.condition.startsWith('js:')) {
        // JavaScript expression evaluation (sanitized)
        const expression = rule.condition.substring(3);
        const safeContext = this.createSafeEvaluationContext(context);

        // Very basic expression evaluation - in production, use a proper sandbox
        const result = this.evaluateJavaScriptExpression(
          expression,
          safeContext,
        );

        return {
          passed: Boolean(result),
          message: `Custom JS: ${expression} = ${result}`,
          cacheable: false, // Custom rules typically shouldn't be cached
        };
      }

      // Default: treat as simple field comparison
      return this.evaluateClientMetadataRule(rule, context);
    } catch (error) {
      return {
        passed: false,
        message: `Custom rule error: ${error.message}`,
        cacheable: false,
      };
    }
  }

  /**
   * Helper methods
   */

  private evaluateDaysCondition(
    rule: VisibilityRule,
    daysUntilWedding: number,
  ): { passed: boolean; message: string; cacheable: boolean } {
    switch (rule.operator) {
      case 'equals':
        const targetDays = parseInt(rule.value);
        const passed = Math.abs(daysUntilWedding - targetDays) <= 3; // 3-day tolerance
        return {
          passed,
          message: `${daysUntilWedding} days until wedding (target: ${targetDays}±3)`,
          cacheable: true,
        };

      case 'greater_than':
        return {
          passed: daysUntilWedding > parseInt(rule.value),
          message: `${daysUntilWedding} days until wedding (need >${rule.value})`,
          cacheable: true,
        };

      case 'less_than':
        return {
          passed: daysUntilWedding < parseInt(rule.value),
          message: `${daysUntilWedding} days until wedding (need <${rule.value})`,
          cacheable: true,
        };

      case 'between':
        const [min, max] = String(rule.value).split(',').map(Number);
        const inRange = daysUntilWedding >= min && daysUntilWedding <= max;
        return {
          passed: inRange,
          message: `${daysUntilWedding} days until wedding (need ${min}-${max})`,
          cacheable: true,
        };

      default:
        return {
          passed: false,
          message: `Unsupported timeline operator: ${rule.operator}`,
          cacheable: true,
        };
    }
  }

  private getCurrentWeddingMilestone(weddingDate: Date): WeddingMilestone {
    const daysUntilWedding = differenceInDays(weddingDate, new Date());

    // Find the most appropriate milestone
    for (const milestone of WEDDING_MILESTONES) {
      if (daysUntilWedding >= milestone.daysFromWedding) {
        return milestone;
      }
    }

    // Default to post-wedding if we're past all milestones
    return WEDDING_MILESTONES[WEDDING_MILESTONES.length - 1];
  }

  private generateCacheKey(
    rule: VisibilityRule,
    context: ClientContext,
  ): string {
    const contextKey = `${context.id}-${context.weddingDate?.getTime()}-${context.packageLevel}`;
    const ruleKey = `${rule.id}-${rule.type}-${rule.condition}-${JSON.stringify(rule.value)}`;
    return `${contextKey}:${ruleKey}`;
  }

  private isResultCacheable(rules: VisibilityRule[]): boolean {
    // Results are cacheable if they don't depend on frequently changing data
    return !rules.some(
      (rule) =>
        rule.type === 'custom' ||
        rule.condition.includes('lastActivity') ||
        rule.condition.includes('currentTime'),
    );
  }

  private calculateCacheExpiry(
    rules: VisibilityRule[],
    context: ClientContext,
  ): Date | undefined {
    if (!context.weddingDate) return undefined;

    // Calculate appropriate cache expiry based on how close we are to the wedding
    const daysUntilWedding = differenceInDays(context.weddingDate, new Date());

    if (daysUntilWedding > 180) {
      return addDays(new Date(), 7); // 1 week cache for early planning
    } else if (daysUntilWedding > 30) {
      return addDays(new Date(), 3); // 3 days cache for active planning
    } else if (daysUntilWedding > 7) {
      return addDays(new Date(), 1); // 1 day cache for final preparations
    } else {
      return addDays(new Date(), 0.25); // 6 hours cache for final week
    }
  }

  private createSafeEvaluationContext(context: ClientContext) {
    // Create a safe context for JavaScript evaluation
    return {
      weddingDate: context.weddingDate,
      packageLevel: context.packageLevel,
      budget: context.budget,
      guestCount: context.guestCount,
      venueType: context.venueType,
      weddingStyle: context.weddingStyle,
      completedFormsCount: context.completedForms?.length || 0,
      completedMilestonesCount: context.completedMilestones?.length || 0,
      daysUntilWedding: context.weddingDate
        ? differenceInDays(context.weddingDate, new Date())
        : null,
      // Add safe utility functions
      Math: {
        max: Math.max,
        min: Math.min,
        abs: Math.abs,
        round: Math.round,
      },
    };
  }

  private evaluateJavaScriptExpression(expression: string, context: any): any {
    // Very basic expression evaluation - replace with proper sandbox in production
    try {
      // This is a simplified implementation - use a proper sandbox like vm2 in production
      const Function = () => {};
      Function.constructor = () => {};

      const safeEval = new Function(
        'context',
        `
        with(context) {
          return ${expression};
        }
      `,
      );

      return safeEval(context);
    } catch (error) {
      throw new Error(`JavaScript evaluation failed: ${error.message}`);
    }
  }

  /**
   * Public utility methods
   */

  public getPerformanceMetrics() {
    return { ...this.performanceMetrics };
  }

  public clearCache() {
    this.ruleCache.clear();
  }

  public getCacheSize() {
    return this.ruleCache.size;
  }

  public getWeddingMilestones() {
    return [...WEDDING_MILESTONES];
  }

  public getCurrentMilestone(weddingDate: Date) {
    return this.getCurrentWeddingMilestone(weddingDate);
  }
}

// Export singleton instance
export const sectionVisibilityEngine = new SectionVisibilityEngine();

// Export types and constants
export { WEDDING_MILESTONES, PACKAGE_HIERARCHY };
export type { WeddingMilestone };
