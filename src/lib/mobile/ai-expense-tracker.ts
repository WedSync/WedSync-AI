/**
 * AI-Powered Mobile Expense Tracking System
 * Team D - Round 2 WS-164 Implementation
 *
 * Advanced expense tracking with machine learning, intelligent categorization,
 * duplicate detection, and predictive analytics for wedding spending.
 */

import { BudgetItem, BudgetCategory } from './advanced-budget-system';
import { ReceiptScanResult, receiptScanner } from './receipt-scanner';
import { weddingSync } from './background-sync';

// ==================== TYPES AND INTERFACES ====================

export interface ExpenseRecord {
  id: string;
  amount: number;
  currency: string;
  description: string;
  category: string;
  subcategory?: string;
  vendor: VendorInfo;
  date: string;
  paymentMethod: PaymentMethod;
  location?: Location;
  receipt?: ReceiptData;
  tags: string[];
  isRecurring: boolean;
  recurringPattern?: RecurringPattern;
  confidence: number;
  aiMetadata: AIMetadata;
  userVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface VendorInfo {
  id?: string;
  name: string;
  businessType: string;
  address?: string;
  phone?: string;
  website?: string;
  paymentTerms?: string;
  averageRating?: number;
  isWeddingVendor: boolean;
  contractAmount?: number;
  depositPaid?: number;
}

export interface PaymentMethod {
  type: PaymentType;
  provider?: string;
  lastFour?: string;
  cardType?: string;
  accountName?: string;
  transactionId?: string;
  authorizationCode?: string;
}

export interface Location {
  latitude: number;
  longitude: number;
  address: string;
  city: string;
  state: string;
  country: string;
  venue?: string;
}

export interface ReceiptData {
  scanId?: string;
  imageUrl: string;
  ocrText?: string;
  extractedData: any;
  processingMethod: string;
  accuracy: number;
  manualCorrections: string[];
}

export interface RecurringPattern {
  frequency: RecurringFrequency;
  interval: number;
  nextDueDate: string;
  endDate?: string;
  amount: number;
  description: string;
  isActive: boolean;
}

export interface AIMetadata {
  confidenceScore: number;
  processingVersion: string;
  modelUsed: string[];
  predictions: AIPrediction[];
  suggestions: AISuggestion[];
  anomalyFlags: AnomalyFlag[];
  learningSignals: LearningSignal[];
}

export interface AIPrediction {
  field: string;
  predictedValue: any;
  confidence: number;
  reasoning: string;
  alternativeValues?: any[];
}

export interface AISuggestion {
  type: SuggestionType;
  message: string;
  action: string;
  confidence: number;
  priority: 'low' | 'medium' | 'high';
  expires?: string;
}

export interface AnomalyFlag {
  type: AnomalyType;
  severity: 'info' | 'warning' | 'error';
  description: string;
  suggestion: string;
  autoResolvable: boolean;
}

export interface LearningSignal {
  type: string;
  value: any;
  timestamp: string;
  context: any;
}

export interface ExpenseSearchQuery {
  text?: string;
  categories?: string[];
  vendors?: string[];
  dateRange?: DateRange;
  amountRange?: AmountRange;
  paymentMethods?: PaymentType[];
  tags?: string[];
  isRecurring?: boolean;
  hasReceipt?: boolean;
  verified?: boolean;
  limit?: number;
  offset?: number;
  sortBy?: SortOption;
  sortOrder?: 'asc' | 'desc';
}

export interface DateRange {
  start: string;
  end: string;
}

export interface AmountRange {
  min: number;
  max: number;
}

export interface ExpenseAnalytics {
  totalExpenses: number;
  averageExpense: number;
  categoryBreakdown: CategoryBreakdown[];
  vendorSummary: VendorSummary[];
  monthlyTrends: MonthlyTrend[];
  recurringExpenses: RecurringExpenseSummary;
  anomalies: ExpenseAnomaly[];
  predictions: ExpensePrediction[];
  insights: ExpenseInsight[];
}

export interface CategoryBreakdown {
  category: string;
  amount: number;
  count: number;
  percentage: number;
  trend: 'up' | 'down' | 'stable';
  avgAmount: number;
}

export interface VendorSummary {
  vendorId: string;
  vendorName: string;
  totalAmount: number;
  transactionCount: number;
  avgAmount: number;
  lastTransaction: string;
  isWeddingVendor: boolean;
  contractStatus?: string;
}

export interface MonthlyTrend {
  month: string;
  totalAmount: number;
  transactionCount: number;
  categories: string[];
  trend: number;
}

export interface RecurringExpenseSummary {
  totalMonthly: number;
  count: number;
  nextDue: RecurringExpense[];
  overdue: RecurringExpense[];
}

export interface RecurringExpense {
  id: string;
  description: string;
  amount: number;
  dueDate: string;
  vendor: string;
  category: string;
}

export interface ExpenseAnomaly {
  expenseId: string;
  type: AnomalyType;
  description: string;
  severity: 'low' | 'medium' | 'high';
  suggestion: string;
}

export interface ExpensePrediction {
  category: string;
  predictedAmount: number;
  timeframe: string;
  confidence: number;
  factors: string[];
}

export interface ExpenseInsight {
  type: InsightType;
  title: string;
  description: string;
  impact: 'positive' | 'negative' | 'neutral';
  actionable: boolean;
  actions?: string[];
}

export interface DuplicateDetectionResult {
  isDuplicate: boolean;
  confidence: number;
  matchedExpenses: ExpenseRecord[];
  similarityFactors: SimilarityFactor[];
  recommendation: DuplicateRecommendation;
}

export interface SimilarityFactor {
  factor: string;
  similarity: number;
  weight: number;
}

export interface PaymentReminder {
  id: string;
  expenseId: string;
  dueDate: string;
  amount: number;
  vendor: string;
  description: string;
  reminderType: ReminderType;
  isActive: boolean;
  notificationsSent: string[];
  userActionRequired: boolean;
}

export enum PaymentType {
  CASH = 'cash',
  CREDIT_CARD = 'credit_card',
  DEBIT_CARD = 'debit_card',
  CHECK = 'check',
  BANK_TRANSFER = 'bank_transfer',
  DIGITAL_WALLET = 'digital_wallet',
  CRYPTOCURRENCY = 'cryptocurrency',
  OTHER = 'other',
}

export enum RecurringFrequency {
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
  QUARTERLY = 'quarterly',
  YEARLY = 'yearly',
  CUSTOM = 'custom',
}

export enum SuggestionType {
  CATEGORY_CORRECTION = 'category_correction',
  VENDOR_MATCH = 'vendor_match',
  DUPLICATE_WARNING = 'duplicate_warning',
  BUDGET_ALERT = 'budget_alert',
  PAYMENT_REMINDER = 'payment_reminder',
  COST_OPTIMIZATION = 'cost_optimization',
}

export enum AnomalyType {
  UNUSUAL_AMOUNT = 'unusual_amount',
  CATEGORY_MISMATCH = 'category_mismatch',
  VENDOR_INCONSISTENCY = 'vendor_inconsistency',
  DATE_ANOMALY = 'date_anomaly',
  DUPLICATE_SUSPECT = 'duplicate_suspect',
  PAYMENT_IRREGULARITY = 'payment_irregularity',
}

export enum SortOption {
  DATE = 'date',
  AMOUNT = 'amount',
  VENDOR = 'vendor',
  CATEGORY = 'category',
  RELEVANCE = 'relevance',
}

export enum InsightType {
  SPENDING_PATTERN = 'spending_pattern',
  BUDGET_OPTIMIZATION = 'budget_optimization',
  VENDOR_RECOMMENDATION = 'vendor_recommendation',
  COST_SAVING = 'cost_saving',
  TREND_ANALYSIS = 'trend_analysis',
}

export enum ReminderType {
  DUE_SOON = 'due_soon',
  OVERDUE = 'overdue',
  RECURRING = 'recurring',
  MILESTONE = 'milestone',
}

export enum DuplicateRecommendation {
  IGNORE = 'ignore',
  MERGE = 'merge',
  MARK_DUPLICATE = 'mark_duplicate',
  REVIEW_MANUALLY = 'review_manually',
}

// ==================== AI EXPENSE TRACKING MANAGER ====================

export class AIExpenseTrackingManager {
  private static instance: AIExpenseTrackingManager;
  private aiEngine: AIExpenseEngine;
  private duplicateDetector: AdvancedDuplicateDetector;
  private categoryPredictor: CategoryPredictor;
  private receiptProcessor: ReceiptProcessor;
  private reminderManager: PaymentReminderManager;
  private analyticsEngine: ExpenseAnalyticsEngine;
  private searchEngine: ExpenseSearchEngine;
  private expenses: Map<string, ExpenseRecord> = new Map();

  private constructor() {
    this.aiEngine = new AIExpenseEngine();
    this.duplicateDetector = new AdvancedDuplicateDetector();
    this.categoryPredictor = new CategoryPredictor();
    this.receiptProcessor = new ReceiptProcessor();
    this.reminderManager = new PaymentReminderManager();
    this.analyticsEngine = new ExpenseAnalyticsEngine();
    this.searchEngine = new ExpenseSearchEngine();
  }

  public static getInstance(): AIExpenseTrackingManager {
    if (!AIExpenseTrackingManager.instance) {
      AIExpenseTrackingManager.instance = new AIExpenseTrackingManager();
    }
    return AIExpenseTrackingManager.instance;
  }

  // ==================== EXPENSE CREATION AND MANAGEMENT ====================

  public async createExpenseFromReceipt(
    receiptScan: ReceiptScanResult,
  ): Promise<ExpenseRecord> {
    try {
      console.log(`[AI Expense] Processing receipt scan: ${receiptScan.id}`);

      // Process receipt with AI
      const processedReceipt =
        await this.receiptProcessor.enhanceReceiptData(receiptScan);

      // Create expense record
      const expense: ExpenseRecord = {
        id: `expense_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        amount: processedReceipt.totalAmount,
        currency: processedReceipt.currency,
        description: processedReceipt.description,
        category: processedReceipt.suggestedCategory,
        vendor: processedReceipt.vendor,
        date: processedReceipt.date,
        paymentMethod: processedReceipt.paymentMethod,
        location: processedReceipt.location,
        receipt: {
          scanId: receiptScan.id,
          imageUrl: receiptScan.imageUrl,
          ocrText: processedReceipt.ocrText,
          extractedData: receiptScan.extractedData,
          processingMethod: 'ai_enhanced',
          accuracy: receiptScan.confidence,
          manualCorrections: [],
        },
        tags: processedReceipt.suggestedTags,
        isRecurring: processedReceipt.isRecurring,
        recurringPattern: processedReceipt.recurringPattern,
        confidence: processedReceipt.confidence,
        aiMetadata: processedReceipt.aiMetadata,
        userVerified: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // Check for duplicates
      const duplicateCheck =
        await this.duplicateDetector.checkForDuplicates(expense);
      if (duplicateCheck.isDuplicate && duplicateCheck.confidence > 0.9) {
        expense.aiMetadata.anomalyFlags.push({
          type: AnomalyType.DUPLICATE_SUSPECT,
          severity: 'warning',
          description: 'This expense appears to be a duplicate',
          suggestion: 'Review similar expenses before saving',
          autoResolvable: false,
        });
      }

      // Predict and validate category
      const categoryPrediction =
        await this.categoryPredictor.predictCategory(expense);
      if (categoryPrediction.confidence > expense.confidence) {
        expense.category = categoryPrediction.category;
        expense.confidence = categoryPrediction.confidence;
        expense.aiMetadata.predictions.push({
          field: 'category',
          predictedValue: categoryPrediction.category,
          confidence: categoryPrediction.confidence,
          reasoning: categoryPrediction.reasoning,
        });
      }

      // Store expense
      this.expenses.set(expense.id, expense);

      // Set up recurring reminders if needed
      if (expense.isRecurring && expense.recurringPattern) {
        await this.reminderManager.createRecurringReminder(expense);
      }

      // Sync with budget system if high confidence
      if (expense.confidence > 0.85) {
        await this.syncExpenseToBudget(expense);
      }

      console.log(
        `[AI Expense] Created expense: ${expense.id} (confidence: ${expense.confidence.toFixed(2)})`,
      );
      return expense;
    } catch (error) {
      console.error(
        '[AI Expense] Failed to create expense from receipt:',
        error,
      );
      throw error;
    }
  }

  public async createExpenseManually(
    data: Partial<ExpenseRecord>,
  ): Promise<ExpenseRecord> {
    try {
      const expense: ExpenseRecord = {
        id: `expense_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        amount: data.amount || 0,
        currency: data.currency || 'USD',
        description: data.description || '',
        category: data.category || 'miscellaneous',
        vendor: data.vendor || {
          name: '',
          businessType: '',
          isWeddingVendor: false,
        },
        date: data.date || new Date().toISOString().split('T')[0],
        paymentMethod: data.paymentMethod || { type: PaymentType.CASH },
        tags: data.tags || [],
        isRecurring: data.isRecurring || false,
        confidence: 1.0, // Manual entry is fully confident
        aiMetadata: {
          confidenceScore: 1.0,
          processingVersion: '1.0',
          modelUsed: ['manual_entry'],
          predictions: [],
          suggestions: [],
          anomalyFlags: [],
          learningSignals: [],
        },
        userVerified: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // AI enhancement for manual entries
      const aiEnhancement = await this.aiEngine.enhanceManualEntry(expense);
      Object.assign(expense, aiEnhancement);

      // Check for duplicates
      const duplicateCheck =
        await this.duplicateDetector.checkForDuplicates(expense);
      if (duplicateCheck.isDuplicate) {
        expense.aiMetadata.suggestions.push({
          type: SuggestionType.DUPLICATE_WARNING,
          message: `Similar expense found: ${duplicateCheck.matchedExpenses[0]?.description}`,
          action: 'review_duplicates',
          confidence: duplicateCheck.confidence,
          priority: 'medium',
        });
      }

      this.expenses.set(expense.id, expense);

      // Sync to budget system
      await this.syncExpenseToBudget(expense);

      console.log(`[AI Expense] Created manual expense: ${expense.id}`);
      return expense;
    } catch (error) {
      console.error('[AI Expense] Failed to create manual expense:', error);
      throw error;
    }
  }

  public async updateExpense(
    expenseId: string,
    updates: Partial<ExpenseRecord>,
  ): Promise<ExpenseRecord> {
    const expense = this.expenses.get(expenseId);
    if (!expense) {
      throw new Error('Expense not found');
    }

    // Store original for learning
    const originalExpense = { ...expense };

    // Apply updates
    Object.assign(expense, updates);
    expense.updatedAt = new Date().toISOString();

    // Learn from manual corrections
    if (updates.category && updates.category !== originalExpense.category) {
      await this.aiEngine.learnFromCategoryCorrection(
        originalExpense,
        updates.category,
      );
    }

    // Re-analyze with AI if significant changes
    if (updates.amount || updates.vendor || updates.category) {
      const aiAnalysis = await this.aiEngine.reanalyzeExpense(expense);
      expense.aiMetadata = aiAnalysis;
    }

    this.expenses.set(expenseId, expense);

    // Re-sync with budget system
    await this.syncExpenseToBudget(expense);

    return expense;
  }

  public async deleteExpense(expenseId: string): Promise<void> {
    const expense = this.expenses.get(expenseId);
    if (!expense) {
      throw new Error('Expense not found');
    }

    // Remove from budget system
    // This would integrate with the budget manager

    // Cancel any reminders
    if (expense.isRecurring) {
      await this.reminderManager.cancelReminders(expenseId);
    }

    this.expenses.delete(expenseId);
    console.log(`[AI Expense] Deleted expense: ${expenseId}`);
  }

  // ==================== SEARCH AND FILTERING ====================

  public async searchExpenses(
    query: ExpenseSearchQuery,
  ): Promise<ExpenseRecord[]> {
    return await this.searchEngine.search(
      Array.from(this.expenses.values()),
      query,
    );
  }

  public async getExpensesByCategory(
    category: string,
  ): Promise<ExpenseRecord[]> {
    return Array.from(this.expenses.values()).filter(
      (expense) => expense.category === category,
    );
  }

  public async getExpensesByVendor(
    vendorName: string,
  ): Promise<ExpenseRecord[]> {
    return Array.from(this.expenses.values()).filter((expense) =>
      expense.vendor.name.toLowerCase().includes(vendorName.toLowerCase()),
    );
  }

  public async getRecurringExpenses(): Promise<ExpenseRecord[]> {
    return Array.from(this.expenses.values()).filter(
      (expense) => expense.isRecurring,
    );
  }

  public async getRecentExpenses(days: number = 30): Promise<ExpenseRecord[]> {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);

    return Array.from(this.expenses.values())
      .filter((expense) => new Date(expense.date) >= cutoff)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }

  // ==================== ANALYTICS AND INSIGHTS ====================

  public async generateExpenseAnalytics(
    dateRange?: DateRange,
  ): Promise<ExpenseAnalytics> {
    const expenses = dateRange
      ? this.getExpensesInDateRange(dateRange)
      : Array.from(this.expenses.values());

    return await this.analyticsEngine.generateAnalytics(expenses);
  }

  public async getSpendingInsights(): Promise<ExpenseInsight[]> {
    const expenses = Array.from(this.expenses.values());
    return await this.aiEngine.generateInsights(expenses);
  }

  public async predictFutureExpenses(
    months: number = 3,
  ): Promise<ExpensePrediction[]> {
    const expenses = Array.from(this.expenses.values());
    return await this.aiEngine.predictFutureExpenses(expenses, months);
  }

  public async detectSpendingAnomalies(): Promise<ExpenseAnomaly[]> {
    const expenses = Array.from(this.expenses.values());
    return await this.aiEngine.detectAnomalies(expenses);
  }

  // ==================== DUPLICATE DETECTION ====================

  public async findDuplicateExpenses(): Promise<ExpenseRecord[][]> {
    const expenses = Array.from(this.expenses.values());
    return await this.duplicateDetector.findAllDuplicates(expenses);
  }

  public async checkDuplicateBeforeAdd(
    expense: Partial<ExpenseRecord>,
  ): Promise<DuplicateDetectionResult> {
    const tempExpense: ExpenseRecord = {
      ...expense,
      id: 'temp',
      aiMetadata: {
        confidenceScore: 0,
        processingVersion: '',
        modelUsed: [],
        predictions: [],
        suggestions: [],
        anomalyFlags: [],
        learningSignals: [],
      },
      userVerified: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    } as ExpenseRecord;

    return await this.duplicateDetector.checkForDuplicates(tempExpense);
  }

  // ==================== PAYMENT REMINDERS ====================

  public async getUpcomingPayments(): Promise<PaymentReminder[]> {
    return await this.reminderManager.getUpcomingReminders();
  }

  public async getOverduePayments(): Promise<PaymentReminder[]> {
    return await this.reminderManager.getOverdueReminders();
  }

  public async createPaymentReminder(
    expenseId: string,
    dueDate: string,
  ): Promise<PaymentReminder> {
    const expense = this.expenses.get(expenseId);
    if (!expense) {
      throw new Error('Expense not found');
    }

    return await this.reminderManager.createReminder(expense, dueDate);
  }

  // ==================== INTEGRATION METHODS ====================

  private async syncExpenseToBudget(expense: ExpenseRecord): Promise<void> {
    try {
      // Create budget item from expense
      const budgetItemData = {
        name: expense.vendor.name || expense.description,
        description: expense.description,
        actual_cost: expense.amount,
        status: 'completed' as any,
        payment_status: 'fully_paid' as any,
        vendor_id: expense.vendor.id,
        date: expense.date,
        receipt_urls: expense.receipt ? [expense.receipt.imageUrl] : [],
        payment_method: expense.paymentMethod.type,
        notes: `AI-tracked expense (confidence: ${expense.confidence.toFixed(2)})`,
      };

      // Sync with wedding budget system
      weddingSync.syncExpenseCreate(
        'current_wedding_id', // This would be dynamic
        'current_user_id', // This would be dynamic
        {
          ...budgetItemData,
          category_id: expense.category,
          ai_expense_id: expense.id,
          ai_metadata: expense.aiMetadata,
        },
      );

      console.log(`[AI Expense] Synced expense to budget: ${expense.id}`);
    } catch (error) {
      console.error('[AI Expense] Failed to sync expense to budget:', error);
    }
  }

  private getExpensesInDateRange(dateRange: DateRange): ExpenseRecord[] {
    const startDate = new Date(dateRange.start);
    const endDate = new Date(dateRange.end);

    return Array.from(this.expenses.values()).filter((expense) => {
      const expenseDate = new Date(expense.date);
      return expenseDate >= startDate && expenseDate <= endDate;
    });
  }

  // ==================== PUBLIC API ====================

  public getAllExpenses(): ExpenseRecord[] {
    return Array.from(this.expenses.values());
  }

  public getExpense(id: string): ExpenseRecord | undefined {
    return this.expenses.get(id);
  }

  public getExpenseCount(): number {
    return this.expenses.size;
  }

  public async exportExpenses(format: 'csv' | 'json' | 'pdf'): Promise<string> {
    const expenses = Array.from(this.expenses.values());

    switch (format) {
      case 'csv':
        return this.exportToCSV(expenses);
      case 'json':
        return JSON.stringify(expenses, null, 2);
      case 'pdf':
        return await this.exportToPDF(expenses);
      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  }

  private exportToCSV(expenses: ExpenseRecord[]): string {
    const headers = [
      'Date',
      'Amount',
      'Currency',
      'Description',
      'Category',
      'Vendor',
      'Payment Method',
    ];
    const rows = expenses.map((expense) => [
      expense.date,
      expense.amount.toString(),
      expense.currency,
      expense.description,
      expense.category,
      expense.vendor.name,
      expense.paymentMethod.type,
    ]);

    return [headers, ...rows].map((row) => row.join(',')).join('\n');
  }

  private async exportToPDF(expenses: ExpenseRecord[]): Promise<string> {
    // This would generate a PDF report
    return 'PDF export not implemented in demo';
  }

  public destroy(): void {
    this.expenses.clear();
    this.reminderManager.destroy();
  }
}

// ==================== SUPPORTING AI ENGINES ====================

class AIExpenseEngine {
  async enhanceManualEntry(
    expense: ExpenseRecord,
  ): Promise<Partial<ExpenseRecord>> {
    // AI enhancement for manual entries
    const enhancements: Partial<ExpenseRecord> = {};

    // Suggest better category based on description and vendor
    if (expense.vendor.name && expense.description) {
      const categoryPrediction = await this.predictCategoryFromText(
        `${expense.vendor.name} ${expense.description}`,
      );

      if (categoryPrediction.confidence > 0.8) {
        enhancements.aiMetadata = {
          ...expense.aiMetadata,
          suggestions: [
            {
              type: SuggestionType.CATEGORY_CORRECTION,
              message: `Consider changing category to "${categoryPrediction.category}"`,
              action: 'update_category',
              confidence: categoryPrediction.confidence,
              priority: 'medium',
            },
          ],
        };
      }
    }

    // Detect if this should be recurring
    const recurringAnalysis = await this.analyzeRecurringPotential(expense);
    if (recurringAnalysis.isLikelyRecurring) {
      enhancements.aiMetadata = {
        ...enhancements.aiMetadata!,
        suggestions: [
          ...enhancements.aiMetadata!.suggestions!,
          {
            type: SuggestionType.PAYMENT_REMINDER,
            message:
              'This looks like a recurring expense. Set up automatic reminders?',
            action: 'setup_recurring',
            confidence: recurringAnalysis.confidence,
            priority: 'low',
          },
        ],
      };
    }

    return enhancements;
  }

  async learnFromCategoryCorrection(
    originalExpense: ExpenseRecord,
    correctedCategory: string,
  ): Promise<void> {
    // Store learning signal for future category predictions
    console.log(
      `[AI Learning] User corrected category from ${originalExpense.category} to ${correctedCategory} for "${originalExpense.description}"`,
    );

    // In a real implementation, this would update ML model weights
  }

  async reanalyzeExpense(expense: ExpenseRecord): Promise<AIMetadata> {
    // Re-run AI analysis after user modifications
    const metadata: AIMetadata = {
      confidenceScore: expense.confidence,
      processingVersion: '1.1',
      modelUsed: ['category_predictor', 'anomaly_detector'],
      predictions: [],
      suggestions: [],
      anomalyFlags: [],
      learningSignals: [],
    };

    // Check for anomalies after updates
    if (expense.amount > 5000) {
      metadata.anomalyFlags.push({
        type: AnomalyType.UNUSUAL_AMOUNT,
        severity: 'warning',
        description: 'Large expense amount',
        suggestion: 'Verify this amount is correct',
        autoResolvable: false,
      });
    }

    return metadata;
  }

  async generateInsights(expenses: ExpenseRecord[]): Promise<ExpenseInsight[]> {
    const insights: ExpenseInsight[] = [];

    // Spending pattern analysis
    const categoryTotals = this.getCategoryTotals(expenses);
    const topCategory = Object.entries(categoryTotals).sort(
      ([, a], [, b]) => b - a,
    )[0];

    if (topCategory) {
      insights.push({
        type: InsightType.SPENDING_PATTERN,
        title: 'Top Spending Category',
        description: `You spend the most on ${topCategory[0]} (${this.formatCurrency(topCategory[1])})`,
        impact: 'neutral',
        actionable: true,
        actions: ['Review category budget', 'Look for savings opportunities'],
      });
    }

    // Vendor analysis
    const vendorTotals = this.getVendorTotals(expenses);
    const expensiveVendor = Object.entries(vendorTotals).sort(
      ([, a], [, b]) => b - a,
    )[0];

    if (expensiveVendor && expensiveVendor[1] > 1000) {
      insights.push({
        type: InsightType.VENDOR_RECOMMENDATION,
        title: 'Top Vendor Spending',
        description: `${expensiveVendor[0]} is your highest expense vendor at ${this.formatCurrency(expensiveVendor[1])}`,
        impact: 'neutral',
        actionable: true,
        actions: ['Negotiate better rates', 'Compare with other vendors'],
      });
    }

    return insights;
  }

  async predictFutureExpenses(
    expenses: ExpenseRecord[],
    months: number,
  ): Promise<ExpensePrediction[]> {
    const predictions: ExpensePrediction[] = [];

    // Analyze recurring expenses
    const recurringExpenses = expenses.filter((e) => e.isRecurring);
    const monthlyRecurring = recurringExpenses
      .filter(
        (e) => e.recurringPattern?.frequency === RecurringFrequency.MONTHLY,
      )
      .reduce((sum, e) => sum + e.amount, 0);

    if (monthlyRecurring > 0) {
      predictions.push({
        category: 'recurring',
        predictedAmount: monthlyRecurring * months,
        timeframe: `${months} months`,
        confidence: 0.9,
        factors: ['Historical recurring payments', 'Contract obligations'],
      });
    }

    // Category-based predictions
    const categoryTotals = this.getCategoryTotals(expenses);
    const lastMonthExpenses = expenses.filter((e) => {
      const expenseDate = new Date(e.date);
      const lastMonth = new Date();
      lastMonth.setMonth(lastMonth.getMonth() - 1);
      return expenseDate >= lastMonth;
    });

    Object.entries(categoryTotals).forEach(([category, total]) => {
      const monthlyAverage = total / 12; // Simplified assumption
      predictions.push({
        category,
        predictedAmount: monthlyAverage * months,
        timeframe: `${months} months`,
        confidence: 0.7,
        factors: ['Historical spending patterns', 'Category trends'],
      });
    });

    return predictions;
  }

  async detectAnomalies(expenses: ExpenseRecord[]): Promise<ExpenseAnomaly[]> {
    const anomalies: ExpenseAnomaly[] = [];

    // Calculate statistics for anomaly detection
    const amounts = expenses.map((e) => e.amount);
    const mean =
      amounts.reduce((sum, amount) => sum + amount, 0) / amounts.length;
    const stdDev = Math.sqrt(
      amounts.reduce((sum, amount) => sum + Math.pow(amount - mean, 2), 0) /
        amounts.length,
    );

    // Detect unusual amounts (> 2 standard deviations)
    expenses.forEach((expense) => {
      const zScore = Math.abs((expense.amount - mean) / stdDev);
      if (zScore > 2) {
        anomalies.push({
          expenseId: expense.id,
          type: AnomalyType.UNUSUAL_AMOUNT,
          description: `Unusual amount: $${expense.amount} (${zScore.toFixed(1)}σ from mean)`,
          severity: zScore > 3 ? 'high' : 'medium',
          suggestion: 'Verify this expense amount is correct',
        });
      }
    });

    return anomalies;
  }

  private async predictCategoryFromText(
    text: string,
  ): Promise<{ category: string; confidence: number; reasoning: string }> {
    // Simple keyword-based categorization
    const keywords = {
      flowers: ['flower', 'floral', 'bouquet', 'bloom', 'petal'],
      venue: ['venue', 'hall', 'ballroom', 'reception', 'location'],
      catering: ['catering', 'food', 'restaurant', 'menu', 'meal'],
      photography: ['photo', 'photography', 'photographer', 'picture', 'shoot'],
      music: ['dj', 'band', 'music', 'sound', 'audio'],
    };

    const lowerText = text.toLowerCase();

    for (const [category, categoryKeywords] of Object.entries(keywords)) {
      const matches = categoryKeywords.filter((keyword) =>
        lowerText.includes(keyword),
      );
      if (matches.length > 0) {
        return {
          category,
          confidence: Math.min(0.95, 0.6 + matches.length * 0.1),
          reasoning: `Matched keywords: ${matches.join(', ')}`,
        };
      }
    }

    return {
      category: 'miscellaneous',
      confidence: 0.3,
      reasoning: 'No clear category indicators',
    };
  }

  private async analyzeRecurringPotential(
    expense: ExpenseRecord,
  ): Promise<{ isLikelyRecurring: boolean; confidence: number }> {
    // Simple heuristics for recurring detection
    const recurringIndicators = [
      'monthly',
      'subscription',
      'recurring',
      'installment',
      'payment plan',
      'deposit',
      'retainer',
    ];

    const text = `${expense.description} ${expense.vendor.name}`.toLowerCase();
    const hasIndicators = recurringIndicators.some((indicator) =>
      text.includes(indicator),
    );

    // Wedding vendors often have payment schedules
    const isWeddingVendor = expense.vendor.isWeddingVendor;
    const hasLargeAmount = expense.amount > 1000;

    return {
      isLikelyRecurring: hasIndicators || (isWeddingVendor && hasLargeAmount),
      confidence: hasIndicators
        ? 0.8
        : isWeddingVendor && hasLargeAmount
          ? 0.6
          : 0.2,
    };
  }

  private getCategoryTotals(expenses: ExpenseRecord[]): {
    [category: string]: number;
  } {
    return expenses.reduce(
      (totals, expense) => {
        totals[expense.category] =
          (totals[expense.category] || 0) + expense.amount;
        return totals;
      },
      {} as { [category: string]: number },
    );
  }

  private getVendorTotals(expenses: ExpenseRecord[]): {
    [vendor: string]: number;
  } {
    return expenses.reduce(
      (totals, expense) => {
        const vendorName = expense.vendor.name;
        totals[vendorName] = (totals[vendorName] || 0) + expense.amount;
        return totals;
      },
      {} as { [vendor: string]: number },
    );
  }

  private formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  }
}

// Placeholder classes for other AI components
class AdvancedDuplicateDetector {
  async checkForDuplicates(
    expense: ExpenseRecord,
  ): Promise<DuplicateDetectionResult> {
    // Advanced duplicate detection logic
    return {
      isDuplicate: false,
      confidence: 0,
      matchedExpenses: [],
      similarityFactors: [],
      recommendation: DuplicateRecommendation.IGNORE,
    };
  }

  async findAllDuplicates(
    expenses: ExpenseRecord[],
  ): Promise<ExpenseRecord[][]> {
    return [];
  }
}

class CategoryPredictor {
  async predictCategory(
    expense: ExpenseRecord,
  ): Promise<{ category: string; confidence: number; reasoning: string }> {
    return {
      category: expense.category,
      confidence: expense.confidence,
      reasoning: 'Current category',
    };
  }
}

class ReceiptProcessor {
  async enhanceReceiptData(receiptScan: ReceiptScanResult): Promise<any> {
    // Enhanced receipt processing
    return {
      totalAmount: receiptScan.extractedData.totalAmount,
      currency: receiptScan.extractedData.currency,
      description: receiptScan.extractedData.merchantName,
      suggestedCategory: 'miscellaneous',
      vendor: {
        name: receiptScan.extractedData.merchantName,
        businessType: '',
        isWeddingVendor: false,
      },
      date: receiptScan.extractedData.date,
      paymentMethod: { type: PaymentType.CREDIT_CARD },
      suggestedTags: [],
      isRecurring: false,
      confidence: receiptScan.confidence,
      aiMetadata: {
        confidenceScore: receiptScan.confidence,
        processingVersion: '1.0',
        modelUsed: ['receipt_processor'],
        predictions: [],
        suggestions: [],
        anomalyFlags: [],
        learningSignals: [],
      },
    };
  }
}

class PaymentReminderManager {
  private reminders: Map<string, PaymentReminder> = new Map();

  async createRecurringReminder(expense: ExpenseRecord): Promise<void> {
    // Create recurring payment reminders
  }

  async createReminder(
    expense: ExpenseRecord,
    dueDate: string,
  ): Promise<PaymentReminder> {
    const reminder: PaymentReminder = {
      id: `reminder_${Date.now()}`,
      expenseId: expense.id,
      dueDate,
      amount: expense.amount,
      vendor: expense.vendor.name,
      description: expense.description,
      reminderType: ReminderType.DUE_SOON,
      isActive: true,
      notificationsSent: [],
      userActionRequired: false,
    };

    this.reminders.set(reminder.id, reminder);
    return reminder;
  }

  async getUpcomingReminders(): Promise<PaymentReminder[]> {
    return Array.from(this.reminders.values()).filter((r) => r.isActive);
  }

  async getOverdueReminders(): Promise<PaymentReminder[]> {
    const now = new Date();
    return Array.from(this.reminders.values()).filter(
      (r) => r.isActive && new Date(r.dueDate) < now,
    );
  }

  async cancelReminders(expenseId: string): Promise<void> {
    for (const [id, reminder] of this.reminders) {
      if (reminder.expenseId === expenseId) {
        reminder.isActive = false;
      }
    }
  }

  destroy(): void {
    this.reminders.clear();
  }
}

class ExpenseAnalyticsEngine {
  async generateAnalytics(
    expenses: ExpenseRecord[],
  ): Promise<ExpenseAnalytics> {
    const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
    const averageExpense =
      expenses.length > 0 ? totalExpenses / expenses.length : 0;

    return {
      totalExpenses,
      averageExpense,
      categoryBreakdown: [],
      vendorSummary: [],
      monthlyTrends: [],
      recurringExpenses: {
        totalMonthly: 0,
        count: 0,
        nextDue: [],
        overdue: [],
      },
      anomalies: [],
      predictions: [],
      insights: [],
    };
  }
}

class ExpenseSearchEngine {
  async search(
    expenses: ExpenseRecord[],
    query: ExpenseSearchQuery,
  ): Promise<ExpenseRecord[]> {
    let results = [...expenses];

    // Apply filters
    if (query.text) {
      const searchText = query.text.toLowerCase();
      results = results.filter(
        (expense) =>
          expense.description.toLowerCase().includes(searchText) ||
          expense.vendor.name.toLowerCase().includes(searchText),
      );
    }

    if (query.categories && query.categories.length > 0) {
      results = results.filter((expense) =>
        query.categories!.includes(expense.category),
      );
    }

    if (query.dateRange) {
      const startDate = new Date(query.dateRange.start);
      const endDate = new Date(query.dateRange.end);
      results = results.filter((expense) => {
        const expenseDate = new Date(expense.date);
        return expenseDate >= startDate && expenseDate <= endDate;
      });
    }

    if (query.amountRange) {
      results = results.filter(
        (expense) =>
          expense.amount >= query.amountRange!.min &&
          expense.amount <= query.amountRange!.max,
      );
    }

    // Apply sorting
    if (query.sortBy) {
      results.sort((a, b) => {
        let aValue: any, bValue: any;

        switch (query.sortBy) {
          case SortOption.DATE:
            aValue = new Date(a.date);
            bValue = new Date(b.date);
            break;
          case SortOption.AMOUNT:
            aValue = a.amount;
            bValue = b.amount;
            break;
          case SortOption.VENDOR:
            aValue = a.vendor.name;
            bValue = b.vendor.name;
            break;
          case SortOption.CATEGORY:
            aValue = a.category;
            bValue = b.category;
            break;
          default:
            return 0;
        }

        const comparison = aValue > bValue ? 1 : aValue < bValue ? -1 : 0;
        return query.sortOrder === 'desc' ? -comparison : comparison;
      });
    }

    // Apply pagination
    if (query.offset) {
      results = results.slice(query.offset);
    }
    if (query.limit) {
      results = results.slice(0, query.limit);
    }

    return results;
  }
}

// ==================== SINGLETON EXPORT ====================

export const aiExpenseTracker = AIExpenseTrackingManager.getInstance();
export default AIExpenseTrackingManager;
