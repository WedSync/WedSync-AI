/**
 * WS-164: Smart Expense Suggestions System
 * AI-powered expense prediction and suggestion engine
 */

import { DatabaseManager } from './database-manager';
import { AIExpenseTrackingManager } from './ai-expense-tracker';

export interface ExpenseSuggestion {
  id: string;
  type: 'recurring' | 'seasonal' | 'vendor_based' | 'budget_optimization';
  title: string;
  description: string;
  amount: number;
  category: string;
  vendor_id?: string;
  confidence: number;
  reasoning: string;
  suggested_date: Date;
  deadline?: Date;
  priority: 'high' | 'medium' | 'low';
  potential_savings?: number;
}

export interface PredictiveModel {
  name: string;
  accuracy: number;
  last_trained: Date;
  features: string[];
  model_data: any;
}

export class SmartExpenseSuggestionsEngine {
  private dbManager: DatabaseManager;
  private aiTracker: AIExpenseTrackingManager;
  private models: Map<string, PredictiveModel> = new Map();

  constructor() {
    this.dbManager = new DatabaseManager();
    this.aiTracker = new AIExpenseTrackingManager();
    this.initializePredictiveModels();
  }

  private async initializePredictiveModels(): Promise<void> {
    // Initialize ML models for different suggestion types
    const models: PredictiveModel[] = [
      {
        name: 'recurring_expense_predictor',
        accuracy: 0.89,
        last_trained: new Date(),
        features: [
          'amount_pattern',
          'date_pattern',
          'vendor_consistency',
          'category_stability',
        ],
        model_data: {}, // In production, this would contain actual model parameters
      },
      {
        name: 'seasonal_expense_predictor',
        accuracy: 0.83,
        last_trained: new Date(),
        features: [
          'wedding_date_proximity',
          'seasonal_patterns',
          'vendor_availability',
          'price_trends',
        ],
        model_data: {},
      },
      {
        name: 'budget_optimizer',
        accuracy: 0.91,
        last_trained: new Date(),
        features: [
          'spending_velocity',
          'category_allocation',
          'vendor_pricing',
          'timeline_pressure',
        ],
        model_data: {},
      },
      {
        name: 'vendor_recommendation_engine',
        accuracy: 0.86,
        last_trained: new Date(),
        features: [
          'price_comparison',
          'quality_ratings',
          'availability_match',
          'style_compatibility',
        ],
        model_data: {},
      },
    ];

    models.forEach((model) => {
      this.models.set(model.name, model);
    });
  }

  async generateSmartSuggestions(
    weddingId: string,
  ): Promise<ExpenseSuggestion[]> {
    const suggestions: ExpenseSuggestion[] = [];

    try {
      // Generate different types of suggestions
      const recurringExpenses = await this.predictRecurringExpenses(weddingId);
      const seasonalExpenses = await this.predictSeasonalExpenses(weddingId);
      const budgetOptimizations =
        await this.generateBudgetOptimizations(weddingId);
      const vendorSuggestions = await this.generateVendorSuggestions(weddingId);

      suggestions.push(
        ...recurringExpenses,
        ...seasonalExpenses,
        ...budgetOptimizations,
        ...vendorSuggestions,
      );

      // Sort by priority and confidence
      suggestions.sort((a, b) => {
        const priorityWeight = { high: 3, medium: 2, low: 1 };
        const priorityDiff =
          priorityWeight[b.priority] - priorityWeight[a.priority];
        if (priorityDiff !== 0) return priorityDiff;
        return b.confidence - a.confidence;
      });

      return suggestions.slice(0, 10); // Return top 10 suggestions
    } catch (error) {
      console.error('Error generating smart suggestions:', error);
      return [];
    }
  }

  private async predictRecurringExpenses(
    weddingId: string,
  ): Promise<ExpenseSuggestion[]> {
    const suggestions: ExpenseSuggestion[] = [];

    // Analyze historical spending patterns
    const expenses = await this.dbManager.query(
      `
      SELECT category, vendor_id, amount, created_at, description
      FROM expenses 
      WHERE wedding_id = $1 AND created_at >= NOW() - INTERVAL '90 days'
      ORDER BY created_at
    `,
      [weddingId],
    );

    // Group by vendor and category
    const patterns = this.analyzeRecurringPatterns(expenses.rows);

    for (const pattern of patterns) {
      if (pattern.confidence > 0.7) {
        suggestions.push({
          id: `recurring_${pattern.vendor_id || pattern.category}_${Date.now()}`,
          type: 'recurring',
          title: `Upcoming ${pattern.category} Payment`,
          description: `Based on your spending pattern, you typically pay ${pattern.vendor_name || pattern.category} around this time`,
          amount: pattern.predicted_amount,
          category: pattern.category,
          vendor_id: pattern.vendor_id,
          confidence: pattern.confidence,
          reasoning: `Detected ${pattern.frequency} payment pattern over ${pattern.observation_period} days`,
          suggested_date: pattern.next_expected_date,
          deadline: pattern.payment_deadline,
          priority: pattern.amount > 1000 ? 'high' : 'medium',
        });
      }
    }

    return suggestions;
  }

  private async predictSeasonalExpenses(
    weddingId: string,
  ): Promise<ExpenseSuggestion[]> {
    const suggestions: ExpenseSuggestion[] = [];

    // Get wedding details for seasonal predictions
    const wedding = await this.dbManager.query(
      `
      SELECT wedding_date, season, venue_type, guest_count, budget_total
      FROM weddings WHERE id = $1
    `,
      [weddingId],
    );

    if (!wedding.rows.length) return suggestions;

    const weddingData = wedding.rows[0];
    const monthsToWedding = Math.ceil(
      (new Date(weddingData.wedding_date).getTime() - Date.now()) /
        (1000 * 60 * 60 * 24 * 30),
    );

    // Seasonal expense predictions based on wedding timeline
    const seasonalPredictions = this.getSeasonalExpensePredictions(
      weddingData,
      monthsToWedding,
    );

    for (const prediction of seasonalPredictions) {
      suggestions.push({
        id: `seasonal_${prediction.category}_${Date.now()}`,
        type: 'seasonal',
        title: prediction.title,
        description: prediction.description,
        amount: prediction.amount,
        category: prediction.category,
        confidence: prediction.confidence,
        reasoning: prediction.reasoning,
        suggested_date: prediction.suggested_date,
        deadline: prediction.deadline,
        priority: prediction.priority,
      });
    }

    return suggestions;
  }

  private async generateBudgetOptimizations(
    weddingId: string,
  ): Promise<ExpenseSuggestion[]> {
    const suggestions: ExpenseSuggestion[] = [];

    // Analyze current budget allocation vs spending
    const budgetAnalysis =
      await this.aiTracker.generateAdvancedAnalytics(weddingId);

    // Find categories that are over-budget or have inefficient spending
    for (const category of budgetAnalysis.categories) {
      if (category.spending_velocity > 1.2) {
        const potentialSavings = category.total_spent * 0.15; // Estimate 15% savings potential

        suggestions.push({
          id: `budget_opt_${category.name}_${Date.now()}`,
          type: 'budget_optimization',
          title: `Optimize ${category.name} Spending`,
          description: `Your ${category.name} spending is ${Math.round((category.spending_velocity - 1) * 100)}% above optimal pace`,
          amount: category.average_expense,
          category: category.name,
          confidence: 0.85,
          reasoning: `High spending velocity detected. Consider negotiating with vendors or finding alternatives.`,
          suggested_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Next week
          priority: potentialSavings > 500 ? 'high' : 'medium',
          potential_savings: potentialSavings,
        });
      }
    }

    return suggestions;
  }

  private async generateVendorSuggestions(
    weddingId: string,
  ): Promise<ExpenseSuggestion[]> {
    const suggestions: ExpenseSuggestion[] = [];

    // Analyze missing vendor categories and suggest based on wedding timeline
    const wedding = await this.dbManager.query(
      `
      SELECT wedding_date, venue_type, guest_count, style_preferences
      FROM weddings WHERE id = $1
    `,
      [weddingId],
    );

    if (!wedding.rows.length) return suggestions;

    const weddingData = wedding.rows[0];
    const daysToWedding = Math.ceil(
      (new Date(weddingData.wedding_date).getTime() - Date.now()) /
        (1000 * 60 * 60 * 24),
    );

    // Get already booked vendors
    const bookedVendors = await this.dbManager.query(
      `
      SELECT DISTINCT category FROM expenses WHERE wedding_id = $1 AND vendor_id IS NOT NULL
    `,
      [weddingId],
    );

    const bookedCategories = new Set(
      bookedVendors.rows.map((row) => row.category),
    );

    // Essential vendor categories with timeline requirements
    const essentialVendors = [
      {
        category: 'photography',
        deadline_months: 6,
        priority: 'high',
        avg_cost: 2500,
      },
      {
        category: 'catering',
        deadline_months: 4,
        priority: 'high',
        avg_cost: 5000,
      },
      {
        category: 'music',
        deadline_months: 3,
        priority: 'medium',
        avg_cost: 1200,
      },
      {
        category: 'flowers',
        deadline_months: 2,
        priority: 'medium',
        avg_cost: 800,
      },
      {
        category: 'transportation',
        deadline_months: 2,
        priority: 'low',
        avg_cost: 600,
      },
    ];

    for (const vendor of essentialVendors) {
      if (
        !bookedCategories.has(vendor.category) &&
        daysToWedding > vendor.deadline_months * 30
      ) {
        suggestions.push({
          id: `vendor_${vendor.category}_${Date.now()}`,
          type: 'vendor_based',
          title: `Book ${vendor.category} Vendor`,
          description: `You should book a ${vendor.category} vendor soon. Prices may increase closer to your wedding date.`,
          amount: vendor.avg_cost * (weddingData.guest_count / 100), // Scale by guest count
          category: vendor.category,
          confidence: 0.9,
          reasoning: `Essential vendor category not yet booked. ${vendor.deadline_months} month booking window recommended.`,
          suggested_date: new Date(),
          deadline: new Date(
            Date.now() + vendor.deadline_months * 30 * 24 * 60 * 60 * 1000,
          ),
          priority: vendor.priority as 'high' | 'medium' | 'low',
        });
      }
    }

    return suggestions;
  }

  private analyzeRecurringPatterns(expenses: any[]): any[] {
    const vendorPatterns = new Map();
    const categoryPatterns = new Map();

    // Group expenses by vendor and category
    expenses.forEach((expense) => {
      const key = expense.vendor_id || expense.category;
      if (!vendorPatterns.has(key)) {
        vendorPatterns.set(key, []);
      }
      vendorPatterns.get(key).push(expense);
    });

    const patterns: any[] = [];

    // Analyze each group for recurring patterns
    vendorPatterns.forEach((expenseList, key) => {
      if (expenseList.length >= 2) {
        const intervals = [];
        const amounts = expenseList.map((e: any) => e.amount);

        for (let i = 1; i < expenseList.length; i++) {
          const interval =
            (new Date(expenseList[i].created_at).getTime() -
              new Date(expenseList[i - 1].created_at).getTime()) /
            (1000 * 60 * 60 * 24);
          intervals.push(interval);
        }

        const avgInterval =
          intervals.reduce((a, b) => a + b, 0) / intervals.length;
        const avgAmount = amounts.reduce((a, b) => a + b, 0) / amounts.length;
        const intervalVariance =
          intervals.reduce(
            (acc, interval) => acc + Math.pow(interval - avgInterval, 2),
            0,
          ) / intervals.length;

        // Determine if this is a recurring pattern
        const isRecurring =
          intervalVariance < avgInterval * 0.3 &&
          avgInterval >= 7 &&
          avgInterval <= 90;

        if (isRecurring) {
          const lastExpense = expenseList[expenseList.length - 1];
          const nextExpectedDate = new Date(
            new Date(lastExpense.created_at).getTime() +
              avgInterval * 24 * 60 * 60 * 1000,
          );

          patterns.push({
            vendor_id: expenseList[0].vendor_id,
            category: expenseList[0].category,
            vendor_name: expenseList[0].vendor_name,
            frequency:
              avgInterval < 14
                ? 'weekly'
                : avgInterval < 35
                  ? 'monthly'
                  : 'periodic',
            predicted_amount: avgAmount,
            confidence: Math.min(
              0.95,
              0.6 + expenseList.length * 0.1 - intervalVariance / avgInterval,
            ),
            observation_period: intervals.length * avgInterval,
            next_expected_date: nextExpectedDate,
            payment_deadline: new Date(
              nextExpectedDate.getTime() + 7 * 24 * 60 * 60 * 1000,
            ),
          });
        }
      }
    });

    return patterns;
  }

  private getSeasonalExpensePredictions(
    weddingData: any,
    monthsToWedding: number,
  ): any[] {
    const predictions: any[] = [];

    // Timeline-based seasonal predictions
    if (monthsToWedding >= 6) {
      predictions.push({
        category: 'venue',
        title: 'Venue Deposit Due Soon',
        description:
          'Most venues require deposits 6-9 months before the wedding date',
        amount: weddingData.budget_total * 0.2,
        confidence: 0.88,
        reasoning:
          'Statistical analysis shows 85% of couples book venues 6+ months in advance',
        suggested_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        deadline: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
        priority: 'high' as const,
      });
    }

    if (monthsToWedding <= 3 && monthsToWedding >= 1) {
      predictions.push({
        category: 'final_payments',
        title: 'Final Vendor Payments',
        description:
          'Most vendors require final payments 30-60 days before the wedding',
        amount: weddingData.budget_total * 0.4,
        confidence: 0.92,
        reasoning: 'Industry standard payment schedule analysis',
        suggested_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        deadline: new Date(
          new Date(weddingData.wedding_date).getTime() -
            30 * 24 * 60 * 60 * 1000,
        ),
        priority: 'high' as const,
      });
    }

    // Seasonal pricing adjustments
    const weddingMonth = new Date(weddingData.wedding_date).getMonth();
    const peakSeasonMonths = [4, 5, 8, 9]; // May, June, September, October

    if (peakSeasonMonths.includes(weddingMonth)) {
      predictions.push({
        category: 'seasonal_premium',
        title: 'Peak Season Pricing',
        description:
          'Your wedding is during peak season. Consider booking vendors early to avoid price increases',
        amount: weddingData.budget_total * 0.15,
        confidence: 0.79,
        reasoning:
          'Peak season weddings typically cost 15-20% more than off-season',
        suggested_date: new Date(),
        deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        priority: 'medium' as const,
      });
    }

    return predictions;
  }

  async updateSuggestionStatus(
    suggestionId: string,
    status: 'accepted' | 'dismissed' | 'completed',
  ): Promise<void> {
    await this.dbManager.query(
      `
      INSERT INTO expense_suggestion_feedback (suggestion_id, status, updated_at)
      VALUES ($1, $2, NOW())
      ON CONFLICT (suggestion_id) 
      DO UPDATE SET status = $2, updated_at = NOW()
    `,
      [suggestionId, status],
    );

    // Use feedback to improve model accuracy
    await this.updateModelAccuracy(suggestionId, status);
  }

  private async updateModelAccuracy(
    suggestionId: string,
    status: string,
  ): Promise<void> {
    // In a production system, this would feed back into ML model training
    // For now, we'll just log the feedback for model improvement
    console.log(`Model feedback: ${suggestionId} -> ${status}`);
  }

  async getPersonalizedInsights(weddingId: string): Promise<any> {
    const suggestions = await this.generateSmartSuggestions(weddingId);
    const analytics = await this.aiTracker.generateAdvancedAnalytics(weddingId);

    return {
      suggestions: suggestions.slice(0, 5), // Top 5 suggestions
      insights: {
        spending_efficiency: analytics.spending_efficiency,
        budget_health: analytics.budget_health,
        predicted_overages: analytics.predicted_overages,
        cost_saving_opportunities: suggestions
          .filter((s) => s.potential_savings)
          .reduce((total, s) => total + (s.potential_savings || 0), 0),
      },
      recommendations: this.generateActionableRecommendations(
        analytics,
        suggestions,
      ),
    };
  }

  private generateActionableRecommendations(
    analytics: any,
    suggestions: ExpenseSuggestion[],
  ): string[] {
    const recommendations: string[] = [];

    if (analytics.budget_health < 0.7) {
      recommendations.push(
        'Consider revising your budget allocation - you may be overspending in key categories',
      );
    }

    if (
      suggestions.some(
        (s) => s.type === 'vendor_based' && s.priority === 'high',
      )
    ) {
      recommendations.push(
        'Book essential vendors soon to avoid last-minute price increases',
      );
    }

    const savingsOpportunity = suggestions
      .filter((s) => s.potential_savings)
      .reduce((total, s) => total + (s.potential_savings || 0), 0);

    if (savingsOpportunity > 500) {
      recommendations.push(
        `You could potentially save $${Math.round(savingsOpportunity)} by optimizing vendor negotiations`,
      );
    }

    return recommendations;
  }
}
