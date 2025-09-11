/**
 * WS-163: Budget Category Integration
 * Real-time budget calculations, alerts, and ML-powered categorization
 * Team C Integration Implementation
 */

import { createClient } from '@supabase/supabase-js';
import { financialApiSecurity } from '@/lib/security/financial-api-security';

export interface BudgetCategory {
  id: string;
  weddingId: string;
  category: string;
  categoryDisplayName: string;
  totalBudget: number;
  spentAmount: number;
  pendingAmount: number;
  remainingAmount: number;
  thresholdPercentage: number;
  isOverBudget: boolean;
  isOverTotalBudget: boolean;
  currency: string;
  lastUpdatedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface BudgetAlert {
  id: string;
  weddingId: string;
  categoryId: string;
  alertType:
    | 'threshold_warning'
    | 'budget_exceeded'
    | 'unusual_spending'
    | 'payment_failed';
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  isRead: boolean;
  triggeredAt: Date;
  metadata: Record<string, any>;
}

export interface ExpenseClassification {
  category: string;
  confidence: number;
  suggestedVendors: string[];
  priceRange: { min: number; max: number };
  seasonalTrends: any[];
}

export interface BankingTransaction {
  id: string;
  accountId: string;
  amount: number;
  currency: string;
  description: string;
  date: Date;
  category?: string;
  merchantName?: string;
  pending: boolean;
}

export class BudgetCategoryIntegration {
  private supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );

  /**
   * Real-time budget calculation with automatic updates
   */
  async updateBudgetCalculations(
    weddingId: string,
    expenseData: {
      categoryId: string;
      amount: number;
      status: 'pending' | 'confirmed' | 'cancelled';
      transactionId?: string;
    },
  ): Promise<{
    success: boolean;
    updatedCategory?: BudgetCategory;
    alerts?: BudgetAlert[];
  }> {
    try {
      // Get current budget category
      const { data: category, error: categoryError } = await this.supabase
        .from('budget_calculations')
        .select('*')
        .eq('id', expenseData.categoryId)
        .eq('wedding_id', weddingId)
        .single();

      if (categoryError || !category) {
        throw new Error('Budget category not found');
      }

      // Calculate new amounts based on expense status
      let newSpentAmount = category.spent_amount;
      let newPendingAmount = category.pending_amount;

      switch (expenseData.status) {
        case 'confirmed':
          newSpentAmount += expenseData.amount;
          break;
        case 'pending':
          newPendingAmount += expenseData.amount;
          break;
        case 'cancelled':
          // Remove from pending if it was pending
          newPendingAmount = Math.max(0, newPendingAmount - expenseData.amount);
          break;
      }

      // Update budget category in database (triggers real-time update)
      const { data: updatedCategory, error: updateError } = await this.supabase
        .from('budget_calculations')
        .update({
          spent_amount: newSpentAmount,
          pending_amount: newPendingAmount,
          updated_at: new Date().toISOString(),
        })
        .eq('id', expenseData.categoryId)
        .eq('wedding_id', weddingId)
        .select()
        .single();

      if (updateError) {
        throw new Error(`Failed to update budget: ${updateError.message}`);
      }

      // Generate alerts if necessary
      const alerts = await this.generateBudgetAlerts(updatedCategory);

      return {
        success: true,
        updatedCategory: updatedCategory,
        alerts,
      };
    } catch (error) {
      console.error('Budget calculation update error:', error);
      return { success: false };
    }
  }

  /**
   * ML-powered expense categorization
   */
  async categorizeExpense(
    expenseDescription: string,
    amount: number,
    merchantName?: string,
    weddingId?: string,
  ): Promise<ExpenseClassification> {
    try {
      // Wedding-specific categories with ML confidence scoring
      const weddingCategories = [
        'venue',
        'catering',
        'photography',
        'flowers',
        'music',
        'attire',
        'transportation',
        'stationery',
        'rings',
        'miscellaneous',
      ];

      // Simple ML categorization based on keywords and patterns
      const categoryScores = await this.calculateCategoryScores(
        expenseDescription,
        merchantName,
        amount,
        weddingCategories,
      );

      // Get the highest confidence category
      const bestMatch = categoryScores.reduce((best, current) =>
        current.confidence > best.confidence ? current : best,
      );

      // Get suggested vendors and price ranges from historical data
      const suggestedVendors = await this.getSuggestedVendors(
        bestMatch.category,
        weddingId,
      );
      const priceRange = await this.getPriceRange(bestMatch.category, amount);
      const seasonalTrends = await this.getSeasonalTrends(bestMatch.category);

      return {
        category: bestMatch.category,
        confidence: bestMatch.confidence,
        suggestedVendors,
        priceRange,
        seasonalTrends,
      };
    } catch (error) {
      console.error('Expense categorization error:', error);
      // Fallback to miscellaneous with low confidence
      return {
        category: 'miscellaneous',
        confidence: 0.1,
        suggestedVendors: [],
        priceRange: { min: 0, max: amount * 2 },
        seasonalTrends: [],
      };
    }
  }

  /**
   * Banking integration for automatic transaction import
   */
  async syncBankingTransactions(
    weddingId: string,
    accountId: string,
    userId: string,
  ): Promise<{
    success: boolean;
    importedTransactions: number;
    categorizedExpenses: number;
  }> {
    try {
      // Use secure financial API to fetch transactions
      const bankingResult = await financialApiSecurity.makeSecureApiRequest(
        'plaid',
        '/transactions/get',
        'POST',
        {
          account_ids: [accountId],
          start_date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
            .toISOString()
            .split('T')[0],
          end_date: new Date().toISOString().split('T')[0],
        },
        { userId, auditAction: 'sync_banking_transactions' },
      );

      if (!bankingResult.success || !bankingResult.data?.transactions) {
        throw new Error('Failed to fetch banking transactions');
      }

      const transactions: BankingTransaction[] =
        bankingResult.data.transactions;
      let importedCount = 0;
      let categorizedCount = 0;

      // Process each transaction
      for (const transaction of transactions) {
        // Skip if already imported
        const existingTransaction = await this.checkExistingTransaction(
          weddingId,
          transaction.id,
        );

        if (existingTransaction) continue;

        // Categorize the transaction using ML
        const classification = await this.categorizeExpense(
          transaction.description,
          Math.abs(transaction.amount),
          transaction.merchantName,
          weddingId,
        );

        // Only process transactions with high confidence or manual review needed
        if (classification.confidence > 0.7) {
          // Create expense record
          const { error: expenseError } = await this.supabase
            .from('expense_tracking')
            .insert({
              wedding_id: weddingId,
              expense_name: transaction.description,
              amount: Math.abs(transaction.amount),
              currency: transaction.currency,
              status: 'confirmed',
              confirmation_required: false,
              expense_date: transaction.date.toISOString().split('T')[0],
              created_by: userId,
              tags: [
                classification.category,
                'banking_import',
                'auto_categorized',
              ],
              metadata: {
                bank_transaction_id: transaction.id,
                merchant_name: transaction.merchantName,
                confidence_score: classification.confidence,
                import_source: 'plaid',
              },
            });

          if (!expenseError) {
            importedCount++;
            categorizedCount++;

            // Update budget category
            await this.updateBudgetForCategory(
              weddingId,
              classification.category,
              Math.abs(transaction.amount),
            );
          }
        } else {
          // Create pending expense for manual review
          const { error: pendingError } = await this.supabase
            .from('expense_tracking')
            .insert({
              wedding_id: weddingId,
              expense_name: `Review: ${transaction.description}`,
              amount: Math.abs(transaction.amount),
              currency: transaction.currency,
              status: 'pending',
              confirmation_required: true,
              expense_date: transaction.date.toISOString().split('T')[0],
              created_by: userId,
              tags: ['needs_review', 'banking_import', 'low_confidence'],
              metadata: {
                bank_transaction_id: transaction.id,
                merchant_name: transaction.merchantName,
                suggested_category: classification.category,
                confidence_score: classification.confidence,
                import_source: 'plaid',
              },
            });

          if (!pendingError) {
            importedCount++;
          }
        }
      }

      return {
        success: true,
        importedTransactions: importedCount,
        categorizedExpenses: categorizedCount,
      };
    } catch (error) {
      console.error('Banking sync error:', error);
      return {
        success: false,
        importedTransactions: 0,
        categorizedExpenses: 0,
      };
    }
  }

  /**
   * Generate budget alerts based on thresholds and patterns
   */
  private async generateBudgetAlerts(
    category: BudgetCategory,
  ): Promise<BudgetAlert[]> {
    const alerts: BudgetAlert[] = [];
    const totalSpent = category.spentAmount + category.pendingAmount;
    const budgetUsagePercentage = (totalSpent / category.totalBudget) * 100;

    // Threshold warning alert (80%, 90%, 95%)
    if (
      budgetUsagePercentage >= category.thresholdPercentage &&
      budgetUsagePercentage < 100
    ) {
      alerts.push({
        id: crypto.randomUUID(),
        weddingId: category.weddingId,
        categoryId: category.id,
        alertType: 'threshold_warning',
        message: `${category.categoryDisplayName} budget is ${budgetUsagePercentage.toFixed(1)}% used (${category.currency}${totalSpent.toFixed(2)} of ${category.currency}${category.totalBudget.toFixed(2)})`,
        severity:
          budgetUsagePercentage >= 95
            ? 'high'
            : budgetUsagePercentage >= 90
              ? 'medium'
              : 'low',
        isRead: false,
        triggeredAt: new Date(),
        metadata: {
          budgetUsagePercentage,
          spentAmount: category.spentAmount,
          pendingAmount: category.pendingAmount,
          totalBudget: category.totalBudget,
          remainingBudget: category.totalBudget - totalSpent,
        },
      });
    }

    // Budget exceeded alert
    if (budgetUsagePercentage >= 100) {
      const overspentAmount = totalSpent - category.totalBudget;
      alerts.push({
        id: crypto.randomUUID(),
        weddingId: category.weddingId,
        categoryId: category.id,
        alertType: 'budget_exceeded',
        message: `${category.categoryDisplayName} budget exceeded by ${category.currency}${overspentAmount.toFixed(2)}`,
        severity: 'critical',
        isRead: false,
        triggeredAt: new Date(),
        metadata: {
          budgetUsagePercentage,
          overspentAmount,
          totalBudget: category.totalBudget,
          totalSpent,
        },
      });
    }

    // Unusual spending pattern detection
    const unusualSpending = await this.detectUnusualSpending(category);
    if (unusualSpending) {
      alerts.push({
        id: crypto.randomUUID(),
        weddingId: category.weddingId,
        categoryId: category.id,
        alertType: 'unusual_spending',
        message: `Unusual spending pattern detected in ${category.categoryDisplayName}`,
        severity: 'medium',
        isRead: false,
        triggeredAt: new Date(),
        metadata: unusualSpending,
      });
    }

    // Save alerts to database
    if (alerts.length > 0) {
      const { error } = await this.supabase
        .from('budget_alerts')
        .insert(alerts);

      if (error) {
        console.error('Failed to save budget alerts:', error);
      }
    }

    return alerts;
  }

  /**
   * Calculate category scores using simple ML logic
   */
  private async calculateCategoryScores(
    description: string,
    merchantName: string | undefined,
    amount: number,
    categories: string[],
  ): Promise<Array<{ category: string; confidence: number }>> {
    const scores: Array<{ category: string; confidence: number }> = [];

    // Keywords for each category
    const categoryKeywords: Record<string, string[]> = {
      venue: [
        'venue',
        'hall',
        'ballroom',
        'reception',
        'banquet',
        'hotel',
        'resort',
      ],
      catering: [
        'catering',
        'food',
        'restaurant',
        'chef',
        'menu',
        'appetizer',
        'dinner',
      ],
      photography: [
        'photo',
        'photographer',
        'video',
        'videographer',
        'camera',
        'album',
      ],
      flowers: [
        'flower',
        'florist',
        'bouquet',
        'arrangement',
        'decoration',
        'floral',
      ],
      music: [
        'music',
        'dj',
        'band',
        'sound',
        'audio',
        'entertainment',
        'musician',
      ],
      attire: [
        'dress',
        'tux',
        'suit',
        'gown',
        'alteration',
        'bridal',
        'formal',
      ],
      transportation: [
        'transport',
        'limo',
        'car',
        'uber',
        'lyft',
        'rental',
        'shuttle',
      ],
      stationery: [
        'invitation',
        'card',
        'print',
        'stationery',
        'paper',
        'design',
      ],
      rings: ['ring', 'jewelry', 'diamond', 'gold', 'silver', 'jeweler'],
      miscellaneous: ['gift', 'favor', 'misc', 'other', 'various'],
    };

    // Typical price ranges for scoring
    const priceRanges: Record<string, { min: number; max: number }> = {
      venue: { min: 2000, max: 15000 },
      catering: { min: 1000, max: 10000 },
      photography: { min: 800, max: 5000 },
      flowers: { min: 200, max: 2000 },
      music: { min: 300, max: 2500 },
      attire: { min: 200, max: 3000 },
      transportation: { min: 100, max: 1000 },
      stationery: { min: 50, max: 500 },
      rings: { min: 500, max: 8000 },
      miscellaneous: { min: 10, max: 1000 },
    };

    for (const category of categories) {
      let confidence = 0;

      // Text matching score
      const keywords = categoryKeywords[category] || [];
      const text = `${description} ${merchantName || ''}`.toLowerCase();

      const keywordMatches = keywords.filter((keyword) =>
        text.includes(keyword.toLowerCase()),
      ).length;

      if (keywordMatches > 0) {
        confidence += 0.3 + keywordMatches * 0.1;
      }

      // Price range score
      const priceRange = priceRanges[category];
      if (priceRange && amount >= priceRange.min && amount <= priceRange.max) {
        confidence += 0.3;
      } else if (
        priceRange &&
        amount > priceRange.max * 0.5 &&
        amount < priceRange.max * 2
      ) {
        confidence += 0.1;
      }

      // Historical pattern matching (simplified)
      const historicalMatch = await this.getHistoricalCategoryMatch(
        category,
        description,
        merchantName,
      );
      confidence += historicalMatch * 0.2;

      scores.push({ category, confidence: Math.min(confidence, 1.0) });
    }

    return scores.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Helper methods
   */
  private async checkExistingTransaction(
    weddingId: string,
    transactionId: string,
  ): Promise<boolean> {
    const { data } = await this.supabase
      .from('expense_tracking')
      .select('id')
      .eq('wedding_id', weddingId)
      .contains('metadata', { bank_transaction_id: transactionId })
      .limit(1);

    return (data?.length || 0) > 0;
  }

  private async updateBudgetForCategory(
    weddingId: string,
    categoryName: string,
    amount: number,
  ): Promise<void> {
    const { error } = await this.supabase
      .from('budget_calculations')
      .update({
        spent_amount: this.supabase.raw('spent_amount + ?', [amount]),
        updated_at: new Date().toISOString(),
      })
      .eq('wedding_id', weddingId)
      .eq('category', categoryName);

    if (error) {
      console.error('Failed to update budget category:', error);
    }
  }

  private async getSuggestedVendors(
    category: string,
    weddingId?: string,
  ): Promise<string[]> {
    // This would query your vendors database
    return [`${category}-vendor-1`, `${category}-vendor-2`];
  }

  private async getPriceRange(
    category: string,
    currentAmount: number,
  ): Promise<{ min: number; max: number }> {
    // Return typical price range for the category
    const ranges: Record<string, { min: number; max: number }> = {
      venue: { min: 2000, max: 15000 },
      catering: { min: 1000, max: 10000 },
      photography: { min: 800, max: 5000 },
      flowers: { min: 200, max: 2000 },
      music: { min: 300, max: 2500 },
      attire: { min: 200, max: 3000 },
      transportation: { min: 100, max: 1000 },
      stationery: { min: 50, max: 500 },
      rings: { min: 500, max: 8000 },
      miscellaneous: { min: 10, max: 1000 },
    };

    return (
      ranges[category] || { min: currentAmount * 0.5, max: currentAmount * 2 }
    );
  }

  private async getSeasonalTrends(category: string): Promise<any[]> {
    // This would return seasonal pricing and availability data
    return [];
  }

  private async detectUnusualSpending(
    category: BudgetCategory,
  ): Promise<any | null> {
    // Simple unusual spending detection
    const recentExpenses = await this.getRecentExpenses(
      category.weddingId,
      category.id,
    );

    if (recentExpenses.length < 3) return null;

    const amounts = recentExpenses.map((e) => e.amount);
    const average =
      amounts.reduce((sum, amount) => sum + amount, 0) / amounts.length;
    const latestAmount = amounts[0];

    // If latest expense is 3x the average, flag as unusual
    if (latestAmount > average * 3) {
      return {
        averageSpending: average,
        latestSpending: latestAmount,
        multiplier: latestAmount / average,
        recentExpenseCount: recentExpenses.length,
      };
    }

    return null;
  }

  private async getRecentExpenses(
    weddingId: string,
    categoryId: string,
  ): Promise<any[]> {
    const { data } = await this.supabase
      .from('expense_tracking')
      .select('amount, created_at')
      .eq('wedding_id', weddingId)
      .eq('budget_category_id', categoryId)
      .order('created_at', { ascending: false })
      .limit(10);

    return data || [];
  }

  private async getHistoricalCategoryMatch(
    category: string,
    description: string,
    merchantName?: string,
  ): Promise<number> {
    // This would analyze historical categorization patterns
    // For now, return a simple confidence boost for exact merchant matches
    if (merchantName && merchantName.toLowerCase().includes(category)) {
      return 0.5;
    }
    return 0;
  }
}

export const budgetIntegration = new BudgetCategoryIntegration();
