import {
  BudgetAnalyticsService,
  BudgetTransaction,
  SpendingTrend,
  BudgetForecast,
  VendorComparison,
  SavingsOpportunity,
} from './budget-analytics';
import {
  ReceiptScannerService,
  ReceiptData,
  ScanResult,
} from './receipt-scanner';
import {
  PaymentRemindersService,
  PaymentReminder,
  ReminderSchedule,
} from './payment-reminders';
import {
  BankSyncService,
  BankTransaction,
  SyncResult,
} from './bank-sync-service';
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';

export interface EnhancedBudgetConfig {
  autoSyncBanks: boolean;
  autoCreateReminders: boolean;
  autoCategorizationEnabled: boolean;
  receiptScanningEnabled: boolean;
  weeklyReports: boolean;
  budgetAlerts: boolean;
  savingsGoal?: number;
}

export interface BudgetInsight {
  type: 'warning' | 'info' | 'success' | 'error';
  title: string;
  description: string;
  actionRequired?: string;
  priority: 'high' | 'medium' | 'low';
  value?: number;
  category?: string;
}

export interface BudgetDashboard {
  totalBudget: number;
  totalSpent: number;
  remainingBudget: number;
  spentPercentage: number;
  categoryBreakdown: Record<string, number>;
  topExpenses: Array<{ vendor: string; amount: number; category: string }>;
  upcomingPayments: PaymentReminder[];
  recentTransactions: BudgetTransaction[];
  bankBalance: number;
  insights: BudgetInsight[];
  trends: SpendingTrend[];
  forecast: BudgetForecast;
  savingsOpportunities: SavingsOpportunity[];
  lastSync: Date;
}

export class EnhancedBudgetTracker {
  private analyticsService: BudgetAnalyticsService;
  private receiptScanner: ReceiptScannerService;
  private paymentReminders: PaymentRemindersService;
  private bankSync: BankSyncService;
  private config: EnhancedBudgetConfig;

  constructor(config: Partial<EnhancedBudgetConfig> = {}) {
    this.analyticsService = new BudgetAnalyticsService();
    this.receiptScanner = new ReceiptScannerService();
    this.paymentReminders = new PaymentRemindersService();
    this.bankSync = new BankSyncService();

    this.config = {
      autoSyncBanks: true,
      autoCreateReminders: true,
      autoCategorizationEnabled: true,
      receiptScanningEnabled: true,
      weeklyReports: true,
      budgetAlerts: true,
      ...config,
    };
  }

  // Main dashboard data
  async getDashboard(): Promise<BudgetDashboard> {
    // Sync bank data if enabled
    if (this.config.autoSyncBanks) {
      await this.syncBankData();
    }

    const transactions = this.analyticsService.getTransactions();
    const totalSpent = transactions.reduce((sum, t) => sum + t.amount, 0);
    const totalBudget = this.config.savingsGoal || totalSpent * 1.2; // Estimate if no goal set

    const trends = this.analyticsService.calculateSpendingTrends(6);
    const forecast = this.analyticsService.generateBudgetForecast(3);
    const vendorComparisons = this.analyticsService.compareVendors();
    const savingsOpportunities =
      this.analyticsService.identifySavingsOpportunities();
    const upcomingPayments = this.paymentReminders.getUpcomingReminders(30);
    const categoryBreakdown = this.getCategoryBreakdown(transactions);
    const bankBalances = this.bankSync.getAccountBalances();
    const totalBankBalance = bankBalances.reduce(
      (sum, acc) => sum + acc.balance,
      0,
    );

    // Generate insights
    const insights = this.generateInsights(
      transactions,
      trends,
      forecast,
      savingsOpportunities,
    );

    // Get top expenses
    const topExpenses = this.getTopExpenses(transactions, 5);

    return {
      totalBudget,
      totalSpent,
      remainingBudget: totalBudget - totalSpent,
      spentPercentage: (totalSpent / totalBudget) * 100,
      categoryBreakdown,
      topExpenses,
      upcomingPayments,
      recentTransactions: transactions.slice(-10).reverse(),
      bankBalance: totalBankBalance,
      insights,
      trends,
      forecast,
      savingsOpportunities: savingsOpportunities.slice(0, 5),
      lastSync: new Date(),
    };
  }

  // Sync bank transactions and auto-categorize
  async syncBankData(): Promise<SyncResult[]> {
    const syncResults = await this.bankSync.syncAllAccounts();

    for (const result of syncResults) {
      if (result.success) {
        // Convert bank transactions to budget transactions
        for (const bankTxn of result.newTransactions) {
          if (
            bankTxn.isWeddingRelated &&
            bankTxn.confidence &&
            bankTxn.confidence > 0.5
          ) {
            const budgetTxn: BudgetTransaction = {
              id: bankTxn.id,
              date: bankTxn.date,
              amount: Math.abs(bankTxn.amount), // Convert to positive for budget tracking
              category: bankTxn.category || 'other',
              vendor: bankTxn.merchantName || 'Unknown Vendor',
              description: bankTxn.description,
              tags: ['auto-imported', 'bank-sync'],
            };

            this.analyticsService.addTransaction(budgetTxn);

            // Auto-create payment reminders if this looks like a vendor payment
            if (this.config.autoCreateReminders && bankTxn.amount < -1000) {
              await this.createAutoReminder(budgetTxn);
            }
          }
        }
      }
    }

    return syncResults;
  }

  // Scan receipt and add to budget
  async scanAndAddReceipt(imageFile: File | Blob): Promise<{
    success: boolean;
    transaction?: BudgetTransaction;
    error?: string;
  }> {
    if (!this.config.receiptScanningEnabled) {
      return { success: false, error: 'Receipt scanning is disabled' };
    }

    const scanResult = await this.receiptScanner.scanReceipt(imageFile);

    if (!scanResult.success || !scanResult.data) {
      return {
        success: false,
        error: scanResult.error || 'Failed to scan receipt',
      };
    }

    const receiptData = scanResult.data;

    // Convert receipt to budget transaction
    const transaction: BudgetTransaction = {
      id: `receipt-${Date.now()}`,
      date: receiptData.date || new Date(),
      amount: receiptData.totalAmount,
      category: receiptData.category || 'other',
      vendor: receiptData.vendor,
      description: `Receipt scan: ${receiptData.vendor}`,
      tags: [
        'receipt-scan',
        ...(receiptData.category ? [receiptData.category] : []),
      ],
    };

    // Add to analytics
    this.analyticsService.addTransaction(transaction);

    // Create payment reminder if needed
    if (this.config.autoCreateReminders && transaction.amount > 500) {
      await this.createAutoReminder(transaction);
    }

    return { success: true, transaction };
  }

  // Create automatic payment reminder
  private async createAutoReminder(
    transaction: BudgetTransaction,
  ): Promise<void> {
    // Estimate next payment date (30 days from transaction)
    const nextPaymentDate = new Date(
      transaction.date.getTime() + 30 * 24 * 60 * 60 * 1000,
    );

    const reminder = this.paymentReminders.createReminder({
      vendorId:
        transaction.vendor?.toLowerCase().replace(/\s+/g, '-') || 'unknown',
      vendorName: transaction.vendor || 'Unknown Vendor',
      amount: transaction.amount,
      dueDate: nextPaymentDate,
      status: 'pending',
      reminderDates: [],
      notificationChannels: ['email', 'in-app'],
      customMessage: `Auto-generated reminder based on recent transaction`,
    });
  }

  // Get category breakdown
  private getCategoryBreakdown(
    transactions: BudgetTransaction[],
  ): Record<string, number> {
    const breakdown: Record<string, number> = {};

    transactions.forEach((t) => {
      breakdown[t.category] = (breakdown[t.category] || 0) + t.amount;
    });

    return breakdown;
  }

  // Get top expenses
  private getTopExpenses(
    transactions: BudgetTransaction[],
    limit: number,
  ): Array<{ vendor: string; amount: number; category: string }> {
    const vendorTotals = new Map<
      string,
      { amount: number; category: string }
    >();

    transactions.forEach((t) => {
      const vendor = t.vendor || 'Unknown';
      const existing = vendorTotals.get(vendor) || {
        amount: 0,
        category: t.category,
      };
      existing.amount += t.amount;
      vendorTotals.set(vendor, existing);
    });

    return Array.from(vendorTotals.entries())
      .map(([vendor, data]) => ({
        vendor,
        amount: data.amount,
        category: data.category,
      }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, limit);
  }

  // Generate budget insights
  private generateInsights(
    transactions: BudgetTransaction[],
    trends: SpendingTrend[],
    forecast: BudgetForecast,
    opportunities: SavingsOpportunity[],
  ): BudgetInsight[] {
    const insights: BudgetInsight[] = [];

    // Budget overspend warning
    const totalSpent = transactions.reduce((sum, t) => sum + t.amount, 0);
    const budget = this.config.savingsGoal || totalSpent * 1.2;
    const spentPercentage = (totalSpent / budget) * 100;

    if (spentPercentage > 90) {
      insights.push({
        type: 'error',
        title: 'Budget Nearly Exceeded',
        description: `You've spent ${spentPercentage.toFixed(1)}% of your total budget`,
        actionRequired:
          'Review remaining expenses and consider budget adjustments',
        priority: 'high',
        value: spentPercentage,
      });
    } else if (spentPercentage > 75) {
      insights.push({
        type: 'warning',
        title: 'Budget Alert',
        description: `You've spent ${spentPercentage.toFixed(1)}% of your total budget`,
        actionRequired: 'Monitor remaining expenses carefully',
        priority: 'medium',
        value: spentPercentage,
      });
    }

    // Spending trend insights
    if (trends.length >= 2) {
      const latestTrend = trends[trends.length - 1];
      if (latestTrend.percentageChange > 25) {
        insights.push({
          type: 'warning',
          title: 'Spending Increase',
          description: `Spending increased by ${latestTrend.percentageChange.toFixed(1)}% this month`,
          actionRequired: 'Review recent transactions and upcoming expenses',
          priority: 'medium',
          value: latestTrend.percentageChange,
        });
      }
    }

    // Savings opportunities
    const topSavingOpportunity = opportunities[0];
    if (topSavingOpportunity && topSavingOpportunity.potentialSavings > 500) {
      insights.push({
        type: 'info',
        title: 'Savings Opportunity',
        description: topSavingOpportunity.title,
        actionRequired: topSavingOpportunity.actionRequired,
        priority: topSavingOpportunity.priority,
        value: topSavingOpportunity.potentialSavings,
      });
    }

    // Payment reminders
    const overduePayments = this.paymentReminders.getOverdueReminders();
    if (overduePayments.length > 0) {
      const totalOverdue = overduePayments.reduce(
        (sum, p) => sum + p.amount,
        0,
      );
      insights.push({
        type: 'error',
        title: 'Overdue Payments',
        description: `You have ${overduePayments.length} overdue payments totaling $${totalOverdue.toLocaleString()}`,
        actionRequired: 'Make overdue payments immediately',
        priority: 'high',
        value: totalOverdue,
      });
    }

    // Bank sync insights
    const weddingTransactionCount = this.bankSync.getWeddingTransactionCount();
    const totalTransactionCount = this.bankSync.getTransactionCount();
    if (weddingTransactionCount > 0) {
      insights.push({
        type: 'success',
        title: 'Auto-Categorization Working',
        description: `${weddingTransactionCount} of ${totalTransactionCount} bank transactions automatically categorized as wedding-related`,
        priority: 'low',
      });
    }

    // Forecast insights
    if (forecast.confidence > 0.7 && forecast.projectedTotal > budget) {
      insights.push({
        type: 'warning',
        title: 'Budget Forecast Alert',
        description: `Projected spending of $${forecast.projectedTotal.toLocaleString()} will exceed your budget`,
        actionRequired: 'Review forecast and adjust spending plan',
        priority: 'medium',
        value: forecast.projectedTotal,
      });
    }

    return insights.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }

  // Manual transaction entry
  addTransaction(
    transaction: Omit<BudgetTransaction, 'id'>,
  ): BudgetTransaction {
    const newTransaction: BudgetTransaction = {
      ...transaction,
      id: `manual-${Date.now()}`,
    };

    this.analyticsService.addTransaction(newTransaction);

    // Auto-create reminder if needed
    if (this.config.autoCreateReminders && transaction.amount > 500) {
      this.createAutoReminder(newTransaction);
    }

    return newTransaction;
  }

  // Get spending trends
  getSpendingTrends(months: number = 6): SpendingTrend[] {
    return this.analyticsService.calculateSpendingTrends(months);
  }

  // Get budget forecast
  getBudgetForecast(monthsAhead: number = 3): BudgetForecast {
    return this.analyticsService.generateBudgetForecast(monthsAhead);
  }

  // Get vendor comparisons
  getVendorComparisons(category?: string): VendorComparison[] {
    return this.analyticsService.compareVendors(category);
  }

  // Get savings opportunities
  getSavingsOpportunities(): SavingsOpportunity[] {
    return this.analyticsService.identifySavingsOpportunities();
  }

  // Get payment reminders
  getPaymentReminders(): PaymentReminder[] {
    return this.paymentReminders.getReminders();
  }

  // Process due payment reminders
  async processDueReminders() {
    return await this.paymentReminders.processDueReminders();
  }

  // Update configuration
  updateConfig(newConfig: Partial<EnhancedBudgetConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  // Get configuration
  getConfig(): EnhancedBudgetConfig {
    return { ...this.config };
  }

  // Export budget data
  exportBudgetData(): {
    transactions: BudgetTransaction[];
    reminders: PaymentReminder[];
    bankAccounts: any[];
    insights: BudgetInsight[];
    config: EnhancedBudgetConfig;
    exportDate: Date;
  } {
    return {
      transactions: this.analyticsService.getTransactions(),
      reminders: this.paymentReminders.getReminders(),
      bankAccounts: this.bankSync.getAccounts(),
      insights: [],
      config: this.config,
      exportDate: new Date(),
    };
  }

  // Generate weekly report
  generateWeeklyReport(): {
    weeklySpending: number;
    categoryBreakdown: Record<string, number>;
    upcomingPayments: PaymentReminder[];
    insights: BudgetInsight[];
    recommendations: string[];
  } {
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - 7);

    const weeklyTransactions = this.analyticsService
      .getTransactions()
      .filter((t) => t.date >= weekStart);

    const weeklySpending = weeklyTransactions.reduce(
      (sum, t) => sum + t.amount,
      0,
    );
    const categoryBreakdown = this.getCategoryBreakdown(weeklyTransactions);
    const upcomingPayments = this.paymentReminders.getUpcomingReminders(7);

    const trends = this.analyticsService.calculateSpendingTrends(4);
    const forecast = this.analyticsService.generateBudgetForecast(1);
    const opportunities = this.analyticsService.identifySavingsOpportunities();

    const insights = this.generateInsights(
      weeklyTransactions,
      trends,
      forecast,
      opportunities,
    );

    return {
      weeklySpending,
      categoryBreakdown,
      upcomingPayments,
      insights,
      recommendations: forecast.recommendations,
    };
  }

  // Clear all data
  clearAllData(): void {
    this.analyticsService.clearData();
    // Note: We don't clear bank data or payment reminders as they may have external dependencies
  }
}
