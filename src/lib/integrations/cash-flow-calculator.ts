/**
 * WS-165: Cash Flow Calculator Integration Service
 * Provides budget impact analysis and cash flow forecasting for wedding couples
 * Team C Integration Implementation
 */

import { createClient } from '@supabase/supabase-js';
import { budgetIntegration } from './budget-integration';
import { IntegrationError, ErrorCategory } from '@/types/integrations';

export interface CashFlowProjection {
  date: Date;
  projectedIncome: number;
  projectedExpenses: number;
  cumulativeBalance: number;
  budgetCategory: string;
  confidenceLevel: 'high' | 'medium' | 'low';
  riskFactors: string[];
}

export interface CashFlowAnalysis {
  weddingId: string;
  analysisDate: Date;
  totalBudget: number;
  totalSpent: number;
  totalPending: number;
  projectedBalance: number;
  burnRate: number; // average monthly spending
  monthsUntilWedding: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  projections: CashFlowProjection[];
  recommendations: CashFlowRecommendation[];
  cashFlowGaps: CashFlowGap[];
}

export interface CashFlowRecommendation {
  id: string;
  type:
    | 'reduce_spending'
    | 'reschedule_payment'
    | 'increase_budget'
    | 'prioritize_category'
    | 'emergency_fund';
  priority: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  category?: string;
  estimatedImpact: number;
  actionItems: string[];
  dueDate?: Date;
}

export interface CashFlowGap {
  startDate: Date;
  endDate: Date;
  shortfall: number;
  affectedCategories: string[];
  severity: 'minor' | 'moderate' | 'severe';
  suggestedActions: string[];
}

export interface PaymentTimingOptimization {
  originalDueDate: Date;
  suggestedDueDate: Date;
  reason: string;
  cashFlowImprovement: number;
  riskAssessment: string;
}

export interface BudgetForecast {
  category: string;
  currentSpent: number;
  projectedTotal: number;
  probabilityRanges: {
    conservative: number;
    realistic: number;
    optimistic: number;
  };
  seasonalFactors: number[];
  historicalVariance: number;
}

export class CashFlowCalculatorService {
  private supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );

  /**
   * Generate comprehensive cash flow analysis
   */
  async generateCashFlowAnalysis(weddingId: string): Promise<CashFlowAnalysis> {
    try {
      // Get wedding details and timeline
      const { data: wedding, error: weddingError } = await this.supabase
        .from('weddings')
        .select('wedding_date, total_budget, currency')
        .eq('id', weddingId)
        .single();

      if (weddingError || !wedding) {
        throw new Error('Wedding not found');
      }

      // Get budget data
      const { data: budgetCategories, error: budgetError } = await this.supabase
        .from('budget_calculations')
        .select('*')
        .eq('wedding_id', weddingId);

      if (budgetError) {
        throw new Error(`Failed to fetch budget data: ${budgetError.message}`);
      }

      // Get payment schedules
      const { data: paymentSchedules, error: paymentError } =
        await this.supabase
          .from('vendor_payment_sync')
          .select('*')
          .eq('wedding_id', weddingId);

      if (paymentError) {
        throw new Error(
          `Failed to fetch payment schedules: ${paymentError.message}`,
        );
      }

      const weddingDate = new Date(wedding.wedding_date);
      const analysisDate = new Date();
      const monthsUntilWedding = this.calculateMonthsUntilWedding(
        weddingDate,
        analysisDate,
      );

      // Calculate totals
      let totalSpent = 0;
      let totalPending = 0;
      const totalBudget = wedding.total_budget || 0;

      for (const category of budgetCategories || []) {
        totalSpent += category.spent_amount || 0;
        totalPending += category.pending_amount || 0;
      }

      const projectedBalance = totalBudget - totalSpent - totalPending;
      const burnRate = this.calculateBurnRate(
        budgetCategories || [],
        analysisDate,
      );

      // Generate projections
      const projections = await this.generateCashFlowProjections(
        weddingId,
        weddingDate,
        budgetCategories || [],
        paymentSchedules || [],
      );

      // Analyze risk level
      const riskLevel = this.assessRiskLevel(
        projectedBalance,
        totalBudget,
        monthsUntilWedding,
        burnRate,
      );

      // Generate recommendations
      const recommendations = await this.generateRecommendations(
        weddingId,
        totalBudget,
        totalSpent,
        totalPending,
        monthsUntilWedding,
        riskLevel,
        budgetCategories || [],
      );

      // Identify cash flow gaps
      const cashFlowGaps = this.identifyCashFlowGaps(projections);

      const analysis: CashFlowAnalysis = {
        weddingId,
        analysisDate,
        totalBudget,
        totalSpent,
        totalPending,
        projectedBalance,
        burnRate,
        monthsUntilWedding,
        riskLevel,
        projections,
        recommendations,
        cashFlowGaps,
      };

      // Save analysis to database
      await this.saveCashFlowAnalysis(analysis);

      return analysis;
    } catch (error) {
      console.error('Cash flow analysis failed:', error);
      throw new IntegrationError(
        `Cash flow analysis failed: ${error}`,
        'CASH_FLOW_ANALYSIS_FAILED',
        ErrorCategory.SYSTEM,
        error as Error,
      );
    }
  }

  /**
   * Generate cash flow projections over time
   */
  private async generateCashFlowProjections(
    weddingId: string,
    weddingDate: Date,
    budgetCategories: any[],
    paymentSchedules: any[],
  ): Promise<CashFlowProjection[]> {
    const projections: CashFlowProjection[] = [];
    const startDate = new Date();
    const endDate = new Date(weddingDate.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days after wedding

    // Generate monthly projections
    const currentDate = new Date(startDate);
    let cumulativeBalance = 0;

    // Calculate starting balance
    const totalBudget = budgetCategories.reduce(
      (sum, cat) => sum + (cat.total_budget || 0),
      0,
    );
    const totalSpent = budgetCategories.reduce(
      (sum, cat) => sum + (cat.spent_amount || 0),
      0,
    );
    cumulativeBalance = totalBudget - totalSpent;

    while (currentDate <= endDate) {
      const monthStart = new Date(
        currentDate.getFullYear(),
        currentDate.getMonth(),
        1,
      );
      const monthEnd = new Date(
        currentDate.getFullYear(),
        currentDate.getMonth() + 1,
        0,
      );

      // Calculate projected expenses for this month
      const monthlyExpenses = this.calculateMonthlyExpenses(
        monthStart,
        monthEnd,
        budgetCategories,
        paymentSchedules,
      );

      // Apply seasonal factors
      const seasonalFactor = this.getSeasonalFactor(currentDate, weddingDate);
      const adjustedExpenses = monthlyExpenses * seasonalFactor;

      cumulativeBalance -= adjustedExpenses;

      const projection: CashFlowProjection = {
        date: new Date(monthStart),
        projectedIncome: 0, // Couples typically don't have income tied to wedding
        projectedExpenses: adjustedExpenses,
        cumulativeBalance,
        budgetCategory: 'overall',
        confidenceLevel: this.calculateConfidenceLevel(
          currentDate,
          weddingDate,
        ),
        riskFactors: this.identifyRiskFactors(
          cumulativeBalance,
          adjustedExpenses,
          currentDate,
          weddingDate,
        ),
      };

      projections.push(projection);

      // Move to next month
      currentDate.setMonth(currentDate.getMonth() + 1);
    }

    return projections;
  }

  private calculateMonthlyExpenses(
    monthStart: Date,
    monthEnd: Date,
    budgetCategories: any[],
    paymentSchedules: any[],
  ): number {
    let monthlyTotal = 0;

    // Calculate from payment schedules
    for (const vendor of paymentSchedules) {
      for (const payment of vendor.payment_schedule || []) {
        const paymentDate = new Date(payment.dueDate);
        if (
          paymentDate >= monthStart &&
          paymentDate <= monthEnd &&
          payment.status === 'pending'
        ) {
          monthlyTotal += payment.amount;
        }
      }
    }

    // If no specific payments, estimate based on budget categories
    if (monthlyTotal === 0) {
      const remainingBudget = budgetCategories.reduce((sum, cat) => {
        return (
          sum +
          Math.max(
            0,
            (cat.total_budget || 0) -
              (cat.spent_amount || 0) -
              (cat.pending_amount || 0),
          )
        );
      }, 0);

      // Distribute remaining budget over remaining months
      const remainingMonths = this.calculateMonthsUntilWedding(
        new Date(monthEnd),
        new Date(),
      );
      monthlyTotal = remainingBudget / Math.max(1, remainingMonths);
    }

    return monthlyTotal;
  }

  private getSeasonalFactor(currentDate: Date, weddingDate: Date): number {
    const monthsUntilWedding = this.calculateMonthsUntilWedding(
      weddingDate,
      currentDate,
    );

    // Wedding expenses typically accelerate as the wedding approaches
    if (monthsUntilWedding <= 1) {
      return 1.5; // 50% increase in final month
    } else if (monthsUntilWedding <= 3) {
      return 1.3; // 30% increase in final quarter
    } else if (monthsUntilWedding <= 6) {
      return 1.1; // 10% increase in final half year
    } else {
      return 0.8; // Lower spending in early planning phases
    }
  }

  private calculateConfidenceLevel(
    currentDate: Date,
    weddingDate: Date,
  ): 'high' | 'medium' | 'low' {
    const monthsUntilWedding = this.calculateMonthsUntilWedding(
      weddingDate,
      currentDate,
    );

    if (monthsUntilWedding <= 2) {
      return 'high'; // Very predictable close to wedding
    } else if (monthsUntilWedding <= 6) {
      return 'medium'; // Moderate predictability
    } else {
      return 'low'; // Many unknowns in early planning
    }
  }

  private identifyRiskFactors(
    balance: number,
    monthlyExpenses: number,
    currentDate: Date,
    weddingDate: Date,
  ): string[] {
    const risks: string[] = [];

    if (balance < 0) {
      risks.push('Budget deficit');
    } else if (balance < monthlyExpenses * 0.5) {
      risks.push('Low cash buffer');
    }

    if (monthlyExpenses > balance) {
      risks.push('Unsustainable spending rate');
    }

    const monthsUntilWedding = this.calculateMonthsUntilWedding(
      weddingDate,
      currentDate,
    );
    if (monthsUntilWedding <= 1 && balance > monthlyExpenses * 2) {
      risks.push('Potential budget overrun');
    }

    return risks;
  }

  /**
   * Generate recommendations based on analysis
   */
  private async generateRecommendations(
    weddingId: string,
    totalBudget: number,
    totalSpent: number,
    totalPending: number,
    monthsUntilWedding: number,
    riskLevel: string,
    budgetCategories: any[],
  ): Promise<CashFlowRecommendation[]> {
    const recommendations: CashFlowRecommendation[] = [];
    const remainingBudget = totalBudget - totalSpent - totalPending;

    // Budget overrun recommendations
    if (remainingBudget < 0) {
      recommendations.push({
        id: crypto.randomUUID(),
        type: 'increase_budget',
        priority: 'critical',
        title: 'Budget Overrun Detected',
        description: `Your current commitments exceed your budget by $${Math.abs(remainingBudget).toFixed(2)}. Consider increasing your budget or reducing expenses.`,
        estimatedImpact: Math.abs(remainingBudget),
        actionItems: [
          'Review and prioritize essential vs. nice-to-have expenses',
          'Negotiate with vendors for payment plan adjustments',
          'Consider increasing your wedding budget',
          'Look for cost-saving alternatives in lower priority categories',
        ],
      });
    }

    // Cash flow timing recommendations
    if (monthsUntilWedding <= 3 && remainingBudget < totalPending) {
      recommendations.push({
        id: crypto.randomUUID(),
        type: 'reschedule_payment',
        priority: 'high',
        title: 'Optimize Payment Timing',
        description:
          'Consider rescheduling some payments to improve cash flow in the final months.',
        estimatedImpact: totalPending * 0.2,
        actionItems: [
          'Contact vendors to negotiate payment schedules',
          'Prioritize payments for services closer to wedding date',
          'Consider partial payments instead of full upfront payments',
        ],
      });
    }

    // Category-specific recommendations
    const overspentCategories = budgetCategories.filter(
      (cat) => cat.spent_amount + cat.pending_amount > cat.total_budget,
    );

    for (const category of overspentCategories) {
      const overage =
        category.spent_amount + category.pending_amount - category.total_budget;
      recommendations.push({
        id: crypto.randomUUID(),
        type: 'reduce_spending',
        priority: overage > 1000 ? 'high' : 'medium',
        title: `Reduce ${category.category_display_name} Spending`,
        description: `${category.category_display_name} is over budget by $${overage.toFixed(2)}`,
        category: category.category,
        estimatedImpact: overage,
        actionItems: [
          `Review ${category.category_display_name} expenses for cost-cutting opportunities`,
          'Compare with industry averages to identify potential savings',
          'Consider alternative options or vendors',
        ],
      });
    }

    // Emergency fund recommendation
    if (remainingBudget > 0 && remainingBudget < totalBudget * 0.1) {
      recommendations.push({
        id: crypto.randomUUID(),
        type: 'emergency_fund',
        priority: 'medium',
        title: 'Low Emergency Buffer',
        description:
          'Consider maintaining at least 10% of your budget as an emergency buffer for unexpected costs.',
        estimatedImpact: totalBudget * 0.1 - remainingBudget,
        actionItems: [
          'Set aside additional funds for unexpected expenses',
          'Review vendor contracts for potential additional costs',
          'Plan for contingencies in weather-dependent services',
        ],
      });
    }

    return recommendations;
  }

  /**
   * Identify cash flow gaps where expenses exceed available funds
   */
  private identifyCashFlowGaps(
    projections: CashFlowProjection[],
  ): CashFlowGap[] {
    const gaps: CashFlowGap[] = [];
    let gapStart: Date | null = null;
    let gapCategories: string[] = [];
    let maxShortfall = 0;

    for (let i = 0; i < projections.length; i++) {
      const projection = projections[i];

      if (projection.cumulativeBalance < 0) {
        // In a gap
        if (!gapStart) {
          gapStart = projection.date;
          gapCategories = [projection.budgetCategory];
        }
        maxShortfall = Math.min(maxShortfall, projection.cumulativeBalance);
      } else {
        // Not in a gap
        if (gapStart) {
          // End of gap
          const gap: CashFlowGap = {
            startDate: gapStart,
            endDate: projection.date,
            shortfall: Math.abs(maxShortfall),
            affectedCategories: [...new Set(gapCategories)],
            severity: this.assessGapSeverity(Math.abs(maxShortfall)),
            suggestedActions: this.generateGapActions(
              Math.abs(maxShortfall),
              gapCategories,
            ),
          };
          gaps.push(gap);

          // Reset for next gap
          gapStart = null;
          gapCategories = [];
          maxShortfall = 0;
        }
      }
    }

    return gaps;
  }

  private assessGapSeverity(
    shortfall: number,
  ): 'minor' | 'moderate' | 'severe' {
    if (shortfall < 1000) return 'minor';
    if (shortfall < 5000) return 'moderate';
    return 'severe';
  }

  private generateGapActions(
    shortfall: number,
    categories: string[],
  ): string[] {
    const actions: string[] = [];

    if (shortfall > 5000) {
      actions.push('Consider increasing overall budget');
      actions.push('Prioritize essential expenses only');
    }

    actions.push('Negotiate payment schedule adjustments with vendors');
    actions.push('Look for cost savings in affected categories');

    if (categories.length > 0) {
      actions.push(`Focus budget review on: ${categories.join(', ')}`);
    }

    return actions;
  }

  /**
   * Optimize payment timing to improve cash flow
   */
  async optimizePaymentTiming(
    weddingId: string,
  ): Promise<PaymentTimingOptimization[]> {
    try {
      const analysis = await this.generateCashFlowAnalysis(weddingId);
      const optimizations: PaymentTimingOptimization[] = [];

      // Get payment schedules
      const { data: paymentSchedules, error } = await this.supabase
        .from('vendor_payment_sync')
        .select('*')
        .eq('wedding_id', weddingId);

      if (error || !paymentSchedules) {
        return optimizations;
      }

      for (const vendor of paymentSchedules) {
        for (const payment of vendor.payment_schedule || []) {
          if (payment.status === 'pending') {
            const optimization = this.analyzePaymentTiming(payment, analysis);
            if (optimization) {
              optimizations.push(optimization);
            }
          }
        }
      }

      return optimizations.sort(
        (a, b) => b.cashFlowImprovement - a.cashFlowImprovement,
      );
    } catch (error) {
      console.error('Payment timing optimization failed:', error);
      return [];
    }
  }

  private analyzePaymentTiming(
    payment: any,
    analysis: CashFlowAnalysis,
  ): PaymentTimingOptimization | null {
    const dueDate = new Date(payment.dueDate);
    const currentDate = new Date();

    // Find the projection for the payment due date
    const dueDateProjection = analysis.projections.find(
      (p) =>
        p.date.getMonth() === dueDate.getMonth() &&
        p.date.getFullYear() === dueDate.getFullYear(),
    );

    if (
      !dueDateProjection ||
      dueDateProjection.cumulativeBalance > payment.amount * 2
    ) {
      return null; // No optimization needed
    }

    // Look for a better month
    const betterMonth = analysis.projections.find(
      (p) =>
        p.date > currentDate &&
        p.cumulativeBalance > payment.amount * 2 &&
        p.date.getTime() !== dueDate.getTime(),
    );

    if (betterMonth) {
      return {
        originalDueDate: dueDate,
        suggestedDueDate: betterMonth.date,
        reason:
          'Improves cash flow by moving payment to month with better balance',
        cashFlowImprovement:
          betterMonth.cumulativeBalance - dueDateProjection.cumulativeBalance,
        riskAssessment:
          'Low risk if vendor agrees to payment schedule adjustment',
      };
    }

    return null;
  }

  /**
   * Helper methods
   */
  private calculateMonthsUntilWedding(
    weddingDate: Date,
    fromDate: Date,
  ): number {
    const months =
      (weddingDate.getFullYear() - fromDate.getFullYear()) * 12 +
      (weddingDate.getMonth() - fromDate.getMonth());
    return Math.max(0, months);
  }

  private calculateBurnRate(
    budgetCategories: any[],
    analysisDate: Date,
  ): number {
    // Calculate average monthly spending based on historical data
    let totalSpent = 0;
    let oldestExpenseDate = analysisDate;

    for (const category of budgetCategories) {
      totalSpent += category.spent_amount || 0;

      if (category.created_at) {
        const createdDate = new Date(category.created_at);
        if (createdDate < oldestExpenseDate) {
          oldestExpenseDate = createdDate;
        }
      }
    }

    const monthsElapsed = Math.max(
      1,
      this.calculateMonthsUntilWedding(analysisDate, oldestExpenseDate),
    );
    return totalSpent / monthsElapsed;
  }

  private assessRiskLevel(
    projectedBalance: number,
    totalBudget: number,
    monthsUntilWedding: number,
    burnRate: number,
  ): 'low' | 'medium' | 'high' | 'critical' {
    if (projectedBalance < 0) {
      return 'critical'; // Already over budget
    }

    const bufferPercentage = (projectedBalance / totalBudget) * 100;
    const projectedRunway =
      burnRate > 0 ? projectedBalance / burnRate : Infinity;

    if (bufferPercentage < 5 || projectedRunway < monthsUntilWedding * 0.5) {
      return 'high';
    } else if (bufferPercentage < 10 || projectedRunway < monthsUntilWedding) {
      return 'medium';
    } else {
      return 'low';
    }
  }

  private async saveCashFlowAnalysis(
    analysis: CashFlowAnalysis,
  ): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('cash_flow_analyses')
        .upsert({
          wedding_id: analysis.weddingId,
          analysis_date: analysis.analysisDate.toISOString(),
          total_budget: analysis.totalBudget,
          total_spent: analysis.totalSpent,
          total_pending: analysis.totalPending,
          projected_balance: analysis.projectedBalance,
          burn_rate: analysis.burnRate,
          months_until_wedding: analysis.monthsUntilWedding,
          risk_level: analysis.riskLevel,
          projections: analysis.projections,
          recommendations: analysis.recommendations,
          cash_flow_gaps: analysis.cashFlowGaps,
          created_at: new Date().toISOString(),
        })
        .eq('wedding_id', analysis.weddingId);

      if (error) {
        console.error('Failed to save cash flow analysis:', error);
      }
    } catch (error) {
      console.error('Error saving cash flow analysis:', error);
    }
  }
}

export const cashFlowCalculator = new CashFlowCalculatorService();
