// ✅ WS-163 COMPREHENSIVE UNIT TESTING SUITE - Budget Category Management
import { describe, it, expect, beforeEach, vi, Mock } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';

// Budget-related types and interfaces
interface BudgetCategory {
  id: string;
  weddingId: string;
  categoryName: string;
  allocatedAmount: number;
  spentAmount: number;
  remainingAmount: number;
  budgetLimit: number;
  isOverspent: boolean;
  overspentAmount: number;
  spendingPercentage: number;
  expenses: BudgetExpense[];
  alerts: BudgetAlert[];
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

interface BudgetExpense {
  id: string;
  categoryId: string;
  amount: number;
  description: string;
  vendor?: string;
  date: Date;
  receipt?: string;
  isRecurring: boolean;
  recurringPattern?: RecurringPattern;
  tags: string[];
  approvedBy?: string;
  status: 'pending' | 'approved' | 'rejected';
}

interface BudgetAlert {
  id: string;
  categoryId: string;
  alertType: 'approaching_limit' | 'over_budget' | 'significant_expense';
  threshold: number;
  currentAmount: number;
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  triggered: boolean;
  triggeredAt?: Date;
  acknowledged: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: Date;
}

interface RecurringPattern {
  frequency: 'weekly' | 'monthly' | 'yearly';
  interval: number;
  endDate?: Date;
  maxOccurrences?: number;
}

interface BudgetCalculation {
  totalBudget: number;
  totalSpent: number;
  totalRemaining: number;
  overallSpendingPercentage: number;
  categoriesOverBudget: number;
  predictedTotal: number;
  budgetVariance: number;
  financialHealth: 'excellent' | 'good' | 'warning' | 'critical';
}

// Mock Budget Category Manager
class BudgetCategoryManager {
  private categories: Map<string, BudgetCategory> = new Map();
  private alertService: any;
  
  constructor(alertService?: any) {
    this.alertService = alertService;
  }

  // Core calculation methods
  calculateSpendingPercentage(spentAmount: number, allocatedAmount: number): number {
    if (allocatedAmount === 0) return spentAmount > 0 ? 100 : 0;
    return Math.round((spentAmount / allocatedAmount) * 100 * 100) / 100; // 2 decimal precision
  }

  calculateRemainingBudget(allocatedAmount: number, spentAmount: number): number {
    return Math.round((allocatedAmount - spentAmount) * 100) / 100; // 2 decimal precision
  }

  isOverBudget(spentAmount: number, allocatedAmount: number): boolean {
    return spentAmount > allocatedAmount;
  }

  calculateOverspendAmount(spentAmount: number, allocatedAmount: number): number {
    const overspend = spentAmount - allocatedAmount;
    return overspend > 0 ? Math.round(overspend * 100) / 100 : 0;
  }

  // Advanced financial calculations
  calculateBudgetVariance(categories: BudgetCategory[]): number {
    const totalVariance = categories.reduce((sum, category) => {
      const variance = category.spentAmount - category.allocatedAmount;
      return sum + variance;
    }, 0);
    return Math.round(totalVariance * 100) / 100;
  }

  calculatePredictedTotal(categories: BudgetCategory[], weddingDate: Date): number {
    const now = new Date();
    const daysUntilWedding = Math.max(0, Math.ceil((weddingDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
    
    if (daysUntilWedding === 0) return this.calculateTotalSpent(categories);

    let predictedTotal = 0;
    
    categories.forEach(category => {
      const currentSpendingRate = category.spentAmount / Math.max(1, category.expenses.length);
      const recurringExpenses = category.expenses.filter(e => e.isRecurring);
      const recurringAmount = recurringExpenses.reduce((sum, e) => sum + e.amount, 0);
      
      // Predict based on current rate and remaining time
      const predictedSpending = category.spentAmount + (recurringAmount * (daysUntilWedding / 30));
      predictedTotal += predictedSpending;
    });

    return Math.round(predictedTotal * 100) / 100;
  }

  calculateTotalSpent(categories: BudgetCategory[]): number {
    return categories.reduce((sum, category) => sum + category.spentAmount, 0);
  }

  calculateTotalAllocated(categories: BudgetCategory[]): number {
    return categories.reduce((sum, category) => sum + category.allocatedAmount, 0);
  }

  calculateFinancialHealth(calculation: BudgetCalculation): 'excellent' | 'good' | 'warning' | 'critical' {
    const spendingPercentage = calculation.overallSpendingPercentage;
    const overBudgetCategories = calculation.categoriesOverBudget;
    const totalCategories = calculation.totalBudget > 0 ? 1 : 0; // Simplified for testing

    if (spendingPercentage <= 70 && overBudgetCategories === 0) return 'excellent';
    if (spendingPercentage <= 85 && overBudgetCategories <= 1) return 'good';
    if (spendingPercentage <= 100 && overBudgetCategories <= 2) return 'warning';
    return 'critical';
  }

  // Category management methods
  async addExpense(categoryId: string, expense: Omit<BudgetExpense, 'id'>): Promise<BudgetCategory> {
    const category = this.categories.get(categoryId);
    if (!category) {
      throw new Error(`Category ${categoryId} not found`);
    }

    const newExpense: BudgetExpense = {
      ...expense,
      id: `expense-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    };

    category.expenses.push(newExpense);
    category.spentAmount += expense.amount;
    category.remainingAmount = this.calculateRemainingBudget(category.allocatedAmount, category.spentAmount);
    category.spendingPercentage = this.calculateSpendingPercentage(category.spentAmount, category.allocatedAmount);
    category.isOverspent = this.isOverBudget(category.spentAmount, category.allocatedAmount);
    category.overspentAmount = this.calculateOverspendAmount(category.spentAmount, category.allocatedAmount);
    category.updatedAt = new Date();

    // Check for budget alerts
    await this.checkAndTriggerAlerts(category);

    return category;
  }

  async updateBudgetLimit(categoryId: string, newLimit: number): Promise<BudgetCategory> {
    if (newLimit < 0) {
      throw new Error('Budget limit cannot be negative');
    }

    const category = this.categories.get(categoryId);
    if (!category) {
      throw new Error(`Category ${categoryId} not found`);
    }

    const oldLimit = category.allocatedAmount;
    category.allocatedAmount = Math.round(newLimit * 100) / 100;
    category.remainingAmount = this.calculateRemainingBudget(category.allocatedAmount, category.spentAmount);
    category.spendingPercentage = this.calculateSpendingPercentage(category.spentAmount, category.allocatedAmount);
    category.isOverspent = this.isOverBudget(category.spentAmount, category.allocatedAmount);
    category.overspentAmount = this.calculateOverspendAmount(category.spentAmount, category.allocatedAmount);
    category.updatedAt = new Date();

    // Check if this change triggers any alerts
    await this.checkAndTriggerAlerts(category);

    return category;
  }

  private async checkAndTriggerAlerts(category: BudgetCategory): Promise<void> {
    const alerts: BudgetAlert[] = [];

    // Check for approaching limit (90% threshold)
    if (category.spendingPercentage >= 90 && !category.isOverspent) {
      alerts.push({
        id: `alert-${Date.now()}-1`,
        categoryId: category.id,
        alertType: 'approaching_limit',
        threshold: 90,
        currentAmount: category.spentAmount,
        message: `Budget for ${category.categoryName} is at ${category.spendingPercentage}% (${category.spentAmount}/${category.allocatedAmount})`,
        severity: 'medium',
        triggered: true,
        triggeredAt: new Date(),
        acknowledged: false
      });
    }

    // Check for over budget
    if (category.isOverspent) {
      alerts.push({
        id: `alert-${Date.now()}-2`,
        categoryId: category.id,
        alertType: 'over_budget',
        threshold: 100,
        currentAmount: category.spentAmount,
        message: `Budget for ${category.categoryName} exceeded by ${category.overspentAmount} (${category.spentAmount}/${category.allocatedAmount})`,
        severity: category.overspentAmount > category.allocatedAmount * 0.2 ? 'critical' : 'high',
        triggered: true,
        triggeredAt: new Date(),
        acknowledged: false
      });
    }

    // Check for significant single expenses (>20% of budget)
    const recentExpenses = category.expenses.filter(e => {
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      return new Date(e.date) > oneDayAgo;
    });

    recentExpenses.forEach(expense => {
      if (expense.amount > category.allocatedAmount * 0.2) {
        alerts.push({
          id: `alert-${Date.now()}-3`,
          categoryId: category.id,
          alertType: 'significant_expense',
          threshold: 20,
          currentAmount: expense.amount,
          message: `Large expense of ${expense.amount} added to ${category.categoryName} (${expense.description})`,
          severity: 'medium',
          triggered: true,
          triggeredAt: new Date(),
          acknowledged: false
        });
      }
    });

    // Add new alerts to category
    category.alerts.push(...alerts);

    // Send alerts through service
    if (this.alertService && alerts.length > 0) {
      await this.alertService.sendBudgetAlert({
        categoryId: category.id,
        categoryName: category.categoryName,
        alerts: alerts,
        totalSpent: category.spentAmount,
        allocatedAmount: category.allocatedAmount,
        overspendAmount: category.overspentAmount
      });
    }
  }

  // Complex calculation scenarios
  calculateCategoryDistribution(categories: BudgetCategory[]): Array<{category: string; percentage: number; amount: number}> {
    const totalBudget = this.calculateTotalAllocated(categories);
    
    return categories.map(category => ({
      category: category.categoryName,
      percentage: totalBudget > 0 ? Math.round((category.allocatedAmount / totalBudget) * 100 * 100) / 100 : 0,
      amount: category.allocatedAmount
    }));
  }

  calculateMonthlyBurnRate(categories: BudgetCategory[], months: number = 1): number {
    const totalSpent = this.calculateTotalSpent(categories);
    return totalSpent / Math.max(1, months);
  }

  // Edge case handlers
  handleZeroBudgetCategory(categoryName: string): BudgetCategory {
    return {
      id: 'zero-budget-category',
      weddingId: 'test-wedding',
      categoryName,
      allocatedAmount: 0,
      spentAmount: 0,
      remainingAmount: 0,
      budgetLimit: 0,
      isOverspent: false,
      overspentAmount: 0,
      spendingPercentage: 0,
      expenses: [],
      alerts: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: 'test-user'
    };
  }

  handleNegativeExpense(amount: number): number {
    // Handle refunds or corrections as negative expenses
    return Math.round(amount * 100) / 100;
  }

  // Validation methods
  validateExpenseAmount(amount: number): { isValid: boolean; error?: string } {
    if (typeof amount !== 'number' || isNaN(amount)) {
      return { isValid: false, error: 'Amount must be a valid number' };
    }
    
    if (amount === 0) {
      return { isValid: false, error: 'Amount cannot be zero' };
    }

    if (Math.abs(amount) > 1000000) {
      return { isValid: false, error: 'Amount exceeds maximum limit' };
    }

    // Check decimal places (max 2)
    const decimalPlaces = (amount.toString().split('.')[1] || []).length;
    if (decimalPlaces > 2) {
      return { isValid: false, error: 'Amount cannot have more than 2 decimal places' };
    }

    return { isValid: true };
  }

  validateBudgetAllocation(categories: BudgetCategory[], totalBudget: number): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    const totalAllocated = this.calculateTotalAllocated(categories);

    if (totalAllocated > totalBudget) {
      errors.push(`Total allocated (${totalAllocated}) exceeds total budget (${totalBudget})`);
    }

    categories.forEach(category => {
      if (category.allocatedAmount < 0) {
        errors.push(`Category ${category.categoryName} has negative allocation`);
      }
    });

    return { isValid: errors.length === 0, errors };
  }
}

// Mock alert service
const mockAlertService = {
  sendBudgetAlert: vi.fn().mockResolvedValue(true)
};

describe('WS-163 Budget Category Management - Unit Tests', () => {
  let budgetManager: BudgetCategoryManager;
  let mockCategory: BudgetCategory;

  beforeEach(() => {
    vi.clearAllMocks();
    budgetManager = new BudgetCategoryManager(mockAlertService);
    
    mockCategory = {
      id: 'test-category-1',
      weddingId: 'wedding-123',
      categoryName: 'Flowers',
      allocatedAmount: 2000,
      spentAmount: 1500,
      remainingAmount: 500,
      budgetLimit: 2000,
      isOverspent: false,
      overspentAmount: 0,
      spendingPercentage: 75,
      expenses: [
        {
          id: 'expense-1',
          categoryId: 'test-category-1',
          amount: 800,
          description: 'Bridal bouquet',
          vendor: 'Flower Paradise',
          date: new Date('2024-05-01'),
          isRecurring: false,
          tags: ['bridal', 'flowers'],
          status: 'approved'
        },
        {
          id: 'expense-2',
          categoryId: 'test-category-1',
          amount: 700,
          description: 'Ceremony decorations',
          vendor: 'Flower Paradise',
          date: new Date('2024-05-15'),
          isRecurring: false,
          tags: ['ceremony', 'decorations'],
          status: 'approved'
        }
      ],
      alerts: [],
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-05-15'),
      createdBy: 'wedding-planner-1'
    };
  });

  describe('Basic Calculation Functions', () => {
    it('should calculate spending percentage correctly', () => {
      expect(budgetManager.calculateSpendingPercentage(1500, 2000)).toBe(75);
      expect(budgetManager.calculateSpendingPercentage(2000, 2000)).toBe(100);
      expect(budgetManager.calculateSpendingPercentage(2500, 2000)).toBe(125);
      expect(budgetManager.calculateSpendingPercentage(0, 2000)).toBe(0);
    });

    it('should handle zero budget edge case', () => {
      expect(budgetManager.calculateSpendingPercentage(100, 0)).toBe(100);
      expect(budgetManager.calculateSpendingPercentage(0, 0)).toBe(0);
    });

    it('should calculate remaining budget correctly', () => {
      expect(budgetManager.calculateRemainingBudget(2000, 1500)).toBe(500);
      expect(budgetManager.calculateRemainingBudget(1000, 1000)).toBe(0);
      expect(budgetManager.calculateRemainingBudget(1000, 1200)).toBe(-200);
    });

    it('should identify over-budget situations correctly', () => {
      expect(budgetManager.isOverBudget(1500, 2000)).toBe(false);
      expect(budgetManager.isOverBudget(2000, 2000)).toBe(false);
      expect(budgetManager.isOverBudget(2100, 2000)).toBe(true);
    });

    it('should calculate overspend amount correctly', () => {
      expect(budgetManager.calculateOverspendAmount(1500, 2000)).toBe(0);
      expect(budgetManager.calculateOverspendAmount(2000, 2000)).toBe(0);
      expect(budgetManager.calculateOverspendAmount(2100, 2000)).toBe(100);
      expect(budgetManager.calculateOverspendAmount(2550, 2000)).toBe(550);
    });
  });

  describe('Decimal Precision and Financial Accuracy', () => {
    it('should handle decimal calculations with precision', () => {
      // Test floating point precision issues
      expect(budgetManager.calculateSpendingPercentage(333.33, 1000.00)).toBe(33.33);
      expect(budgetManager.calculateRemainingBudget(1000.00, 333.33)).toBe(666.67);
      expect(budgetManager.calculateOverspendAmount(1000.01, 1000.00)).toBe(0.01);
    });

    it('should handle complex decimal operations', () => {
      const complexCalculations = [
        { spent: 1234.567, allocated: 2000.123, expectedPercentage: 61.72 },
        { spent: 99.99, allocated: 100.01, expectedPercentage: 99.98 },
        { spent: 0.01, allocated: 1000000, expectedPercentage: 0 }
      ];

      complexCalculations.forEach(({ spent, allocated, expectedPercentage }) => {
        const result = budgetManager.calculateSpendingPercentage(spent, allocated);
        expect(result).toBe(expectedPercentage);
      });
    });

    it('should maintain accuracy with large numbers', () => {
      const largeAmount = 999999.99;
      const largeLimit = 1000000.00;
      
      expect(budgetManager.calculateSpendingPercentage(largeAmount, largeLimit)).toBe(100);
      expect(budgetManager.calculateRemainingBudget(largeLimit, largeAmount)).toBe(0.01);
      expect(budgetManager.calculateOverspendAmount(largeAmount, largeLimit)).toBe(0);
    });

    it('should handle recurring decimal scenarios', () => {
      // Test cases that commonly cause precision issues
      expect(budgetManager.calculateSpendingPercentage(1/3 * 1000, 1000)).toBe(33.33);
      expect(budgetManager.calculateRemainingBudget(1000, 1/3 * 1000)).toBe(666.67);
    });
  });

  describe('Expense Management', () => {
    beforeEach(() => {
      budgetManager['categories'].set('test-category-1', { ...mockCategory });
    });

    it('should add expense and update category calculations', async () => {
      const newExpense = {
        categoryId: 'test-category-1',
        amount: 300,
        description: 'Reception centerpieces',
        vendor: 'Flower Paradise',
        date: new Date(),
        isRecurring: false,
        tags: ['reception', 'centerpieces'],
        status: 'pending' as const
      };

      const updatedCategory = await budgetManager.addExpense('test-category-1', newExpense);

      expect(updatedCategory.spentAmount).toBe(1800); // 1500 + 300
      expect(updatedCategory.remainingAmount).toBe(200); // 2000 - 1800
      expect(updatedCategory.spendingPercentage).toBe(90); // 1800/2000 * 100
      expect(updatedCategory.expenses).toHaveLength(3);
      expect(updatedCategory.isOverspent).toBe(false);
    });

    it('should trigger overspend alerts when budget exceeded', async () => {
      const overBudgetExpense = {
        categoryId: 'test-category-1',
        amount: 600, // This will cause overspend (1500 + 600 = 2100 > 2000)
        description: 'Additional flowers',
        date: new Date(),
        isRecurring: false,
        tags: ['additional'],
        status: 'pending' as const
      };

      const updatedCategory = await budgetManager.addExpense('test-category-1', overBudgetExpense);

      expect(updatedCategory.isOverspent).toBe(true);
      expect(updatedCategory.overspentAmount).toBe(100);
      expect(updatedCategory.spentAmount).toBe(2100);
      expect(updatedCategory.alerts).toHaveLength(1);
      expect(updatedCategory.alerts[0].alertType).toBe('over_budget');
      expect(mockAlertService.sendBudgetAlert).toHaveBeenCalled();
    });

    it('should handle negative expenses (refunds)', async () => {
      const refundExpense = {
        categoryId: 'test-category-1',
        amount: -200, // Refund
        description: 'Flower refund',
        date: new Date(),
        isRecurring: false,
        tags: ['refund'],
        status: 'approved' as const
      };

      const updatedCategory = await budgetManager.addExpense('test-category-1', refundExpense);

      expect(updatedCategory.spentAmount).toBe(1300); // 1500 - 200
      expect(updatedCategory.remainingAmount).toBe(700); // 2000 - 1300
      expect(updatedCategory.spendingPercentage).toBe(65); // 1300/2000 * 100
    });

    it('should handle recurring expenses correctly', async () => {
      const recurringExpense = {
        categoryId: 'test-category-1',
        amount: 100,
        description: 'Weekly flower maintenance',
        date: new Date(),
        isRecurring: true,
        recurringPattern: {
          frequency: 'weekly' as const,
          interval: 1,
          maxOccurrences: 12
        },
        tags: ['maintenance', 'recurring'],
        status: 'approved' as const
      };

      const updatedCategory = await budgetManager.addExpense('test-category-1', recurringExpense);

      expect(updatedCategory.expenses.some(e => e.isRecurring)).toBe(true);
      expect(updatedCategory.spentAmount).toBe(1600); // 1500 + 100
    });

    it('should reject invalid expense amounts', () => {
      const invalidAmounts = [
        { amount: NaN, error: 'Amount must be a valid number' },
        { amount: 0, error: 'Amount cannot be zero' },
        { amount: 1234567890, error: 'Amount exceeds maximum limit' },
        { amount: 123.456, error: 'Amount cannot have more than 2 decimal places' }
      ];

      invalidAmounts.forEach(({ amount, error }) => {
        const validation = budgetManager.validateExpenseAmount(amount);
        expect(validation.isValid).toBe(false);
        expect(validation.error).toBe(error);
      });
    });

    it('should accept valid expense amounts', () => {
      const validAmounts = [100, 99.99, -50.50, 0.01, 999999.99];

      validAmounts.forEach(amount => {
        const validation = budgetManager.validateExpenseAmount(amount);
        expect(validation.isValid).toBe(true);
        expect(validation.error).toBeUndefined();
      });
    });
  });

  describe('Budget Limit Updates', () => {
    beforeEach(() => {
      budgetManager['categories'].set('test-category-1', { ...mockCategory });
    });

    it('should update budget limit and recalculate values', async () => {
      const newLimit = 2500;
      const updatedCategory = await budgetManager.updateBudgetLimit('test-category-1', newLimit);

      expect(updatedCategory.allocatedAmount).toBe(2500);
      expect(updatedCategory.remainingAmount).toBe(1000); // 2500 - 1500
      expect(updatedCategory.spendingPercentage).toBe(60); // 1500/2500 * 100
      expect(updatedCategory.isOverspent).toBe(false);
    });

    it('should handle decreasing budget limit that causes overspend', async () => {
      const newLimit = 1200; // Less than current spent amount (1500)
      const updatedCategory = await budgetManager.updateBudgetLimit('test-category-1', newLimit);

      expect(updatedCategory.allocatedAmount).toBe(1200);
      expect(updatedCategory.remainingAmount).toBe(-300); // 1200 - 1500
      expect(updatedCategory.spendingPercentage).toBe(125); // 1500/1200 * 100
      expect(updatedCategory.isOverspent).toBe(true);
      expect(updatedCategory.overspentAmount).toBe(300);
    });

    it('should reject negative budget limits', async () => {
      await expect(budgetManager.updateBudgetLimit('test-category-1', -100))
        .rejects.toThrow('Budget limit cannot be negative');
    });

    it('should handle zero budget limit', async () => {
      const updatedCategory = await budgetManager.updateBudgetLimit('test-category-1', 0);

      expect(updatedCategory.allocatedAmount).toBe(0);
      expect(updatedCategory.spendingPercentage).toBe(100); // Spent > 0, allocated = 0
      expect(updatedCategory.isOverspent).toBe(true);
    });
  });

  describe('Alert System', () => {
    beforeEach(() => {
      // Start with a category that's at 70% spending
      const categoryAt70Percent = {
        ...mockCategory,
        spentAmount: 1400, // 70% of 2000
        remainingAmount: 600,
        spendingPercentage: 70
      };
      budgetManager['categories'].set('test-category-1', categoryAt70Percent);
    });

    it('should trigger approaching limit alert at 90% threshold', async () => {
      const expenseToReach90Percent = {
        categoryId: 'test-category-1',
        amount: 400, // 1400 + 400 = 1800 (90% of 2000)
        description: 'Additional flowers',
        date: new Date(),
        isRecurring: false,
        tags: ['additional'],
        status: 'approved' as const
      };

      const updatedCategory = await budgetManager.addExpense('test-category-1', expenseToReach90Percent);

      expect(updatedCategory.spendingPercentage).toBe(90);
      expect(updatedCategory.alerts).toHaveLength(1);
      expect(updatedCategory.alerts[0].alertType).toBe('approaching_limit');
      expect(updatedCategory.alerts[0].severity).toBe('medium');
      expect(mockAlertService.sendBudgetAlert).toHaveBeenCalled();
    });

    it('should trigger significant expense alert for large single expense', async () => {
      const significantExpense = {
        categoryId: 'test-category-1',
        amount: 500, // 25% of 2000 budget
        description: 'Premium flower package',
        date: new Date(),
        isRecurring: false,
        tags: ['premium'],
        status: 'approved' as const
      };

      const updatedCategory = await budgetManager.addExpense('test-category-1', significantExpense);

      const significantExpenseAlert = updatedCategory.alerts.find(a => a.alertType === 'significant_expense');
      expect(significantExpenseAlert).toBeDefined();
      expect(significantExpenseAlert?.severity).toBe('medium');
      expect(significantExpenseAlert?.currentAmount).toBe(500);
    });

    it('should set critical severity for major overspend', async () => {
      const majorOverspendExpense = {
        categoryId: 'test-category-1',
        amount: 1000, // 1400 + 1000 = 2400 (20% over 2000 budget)
        description: 'Emergency flower replacement',
        date: new Date(),
        isRecurring: false,
        tags: ['emergency'],
        status: 'approved' as const
      };

      const updatedCategory = await budgetManager.addExpense('test-category-1', majorOverspendExpense);

      const overBudgetAlert = updatedCategory.alerts.find(a => a.alertType === 'over_budget');
      expect(overBudgetAlert).toBeDefined();
      expect(overBudgetAlert?.severity).toBe('critical');
      expect(updatedCategory.overspentAmount).toBe(400); // 2400 - 2000
    });

    it('should not duplicate alerts for same threshold', async () => {
      // Add expense to reach 90%
      await budgetManager.addExpense('test-category-1', {
        categoryId: 'test-category-1',
        amount: 400,
        description: 'Flowers 1',
        date: new Date(),
        isRecurring: false,
        tags: [],
        status: 'approved'
      });

      // Add another small expense (should not trigger another approaching_limit alert)
      const updatedCategory = await budgetManager.addExpense('test-category-1', {
        categoryId: 'test-category-1',
        amount: 50,
        description: 'Flowers 2',
        date: new Date(),
        isRecurring: false,
        tags: [],
        status: 'approved'
      });

      // Should have only one approaching_limit alert despite multiple expenses in 90%+ range
      const approachingLimitAlerts = updatedCategory.alerts.filter(a => a.alertType === 'approaching_limit');
      expect(approachingLimitAlerts).toHaveLength(1);
    });
  });

  describe('Complex Financial Calculations', () => {
    let multipleCategories: BudgetCategory[];

    beforeEach(() => {
      multipleCategories = [
        { ...mockCategory }, // Flowers: 2000 allocated, 1500 spent
        {
          id: 'test-category-2',
          weddingId: 'wedding-123',
          categoryName: 'Catering',
          allocatedAmount: 5000,
          spentAmount: 4200,
          remainingAmount: 800,
          budgetLimit: 5000,
          isOverspent: false,
          overspentAmount: 0,
          spendingPercentage: 84,
          expenses: [],
          alerts: [],
          createdAt: new Date(),
          updatedAt: new Date(),
          createdBy: 'wedding-planner-1'
        },
        {
          id: 'test-category-3',
          weddingId: 'wedding-123',
          categoryName: 'Photography',
          allocatedAmount: 3000,
          spentAmount: 3200,
          remainingAmount: -200,
          budgetLimit: 3000,
          isOverspent: true,
          overspentAmount: 200,
          spendingPercentage: 106.67,
          expenses: [],
          alerts: [],
          createdAt: new Date(),
          updatedAt: new Date(),
          createdBy: 'wedding-planner-1'
        }
      ];
    });

    it('should calculate budget variance correctly', () => {
      const variance = budgetManager.calculateBudgetVariance(multipleCategories);
      // Flowers: -500, Catering: -800, Photography: +200 = -1100
      expect(variance).toBe(-1100);
    });

    it('should calculate total spent across categories', () => {
      const totalSpent = budgetManager.calculateTotalSpent(multipleCategories);
      expect(totalSpent).toBe(8900); // 1500 + 4200 + 3200
    });

    it('should calculate total allocated across categories', () => {
      const totalAllocated = budgetManager.calculateTotalAllocated(multipleCategories);
      expect(totalAllocated).toBe(10000); // 2000 + 5000 + 3000
    });

    it('should calculate category distribution percentages', () => {
      const distribution = budgetManager.calculateCategoryDistribution(multipleCategories);
      
      expect(distribution).toEqual([
        { category: 'Flowers', percentage: 20, amount: 2000 },
        { category: 'Catering', percentage: 50, amount: 5000 },
        { category: 'Photography', percentage: 30, amount: 3000 }
      ]);
    });

    it('should calculate predicted spending based on trends', () => {
      const weddingDate = new Date();
      weddingDate.setDate(weddingDate.getDate() + 30); // 30 days from now
      
      const predictedTotal = budgetManager.calculatePredictedTotal(multipleCategories, weddingDate);
      expect(typeof predictedTotal).toBe('number');
      expect(predictedTotal).toBeGreaterThan(0);
    });

    it('should calculate financial health correctly', () => {
      const calculation: BudgetCalculation = {
        totalBudget: 10000,
        totalSpent: 8900,
        totalRemaining: 1100,
        overallSpendingPercentage: 89,
        categoriesOverBudget: 1,
        predictedTotal: 9500,
        budgetVariance: -1100,
        financialHealth: 'good' // Will be recalculated
      };

      const health = budgetManager.calculateFinancialHealth(calculation);
      expect(health).toBe('warning'); // 89% spent with 1 category over budget
    });

    it('should handle edge case of all categories over budget', () => {
      const overBudgetCategories = multipleCategories.map(cat => ({
        ...cat,
        spentAmount: cat.allocatedAmount + 500,
        isOverspent: true,
        overspentAmount: 500
      }));

      const calculation: BudgetCalculation = {
        totalBudget: 10000,
        totalSpent: 11500,
        totalRemaining: -1500,
        overallSpendingPercentage: 115,
        categoriesOverBudget: 3,
        predictedTotal: 12000,
        budgetVariance: 1500,
        financialHealth: 'critical'
      };

      const health = budgetManager.calculateFinancialHealth(calculation);
      expect(health).toBe('critical');
    });
  });

  describe('Validation and Error Handling', () => {
    it('should validate budget allocation across categories', () => {
      const categories = [
        { ...mockCategory, allocatedAmount: 3000 },
        { ...mockCategory, id: 'cat-2', allocatedAmount: 4000 },
        { ...mockCategory, id: 'cat-3', allocatedAmount: 2000 }
      ];
      const totalBudget = 8000;

      const validation = budgetManager.validateBudgetAllocation(categories, totalBudget);
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('Total allocated (9000) exceeds total budget (8000)');
    });

    it('should detect negative allocations in validation', () => {
      const categories = [
        { ...mockCategory, allocatedAmount: -1000 }
      ];
      const totalBudget = 5000;

      const validation = budgetManager.validateBudgetAllocation(categories, totalBudget);
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('Category Flowers has negative allocation');
    });

    it('should pass validation for proper budget allocation', () => {
      const categories = [
        { ...mockCategory, allocatedAmount: 2000 },
        { ...mockCategory, id: 'cat-2', allocatedAmount: 3000 }
      ];
      const totalBudget = 6000;

      const validation = budgetManager.validateBudgetAllocation(categories, totalBudget);
      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should handle zero budget category edge case', () => {
      const zeroCategory = budgetManager.handleZeroBudgetCategory('Emergency Fund');
      
      expect(zeroCategory.allocatedAmount).toBe(0);
      expect(zeroCategory.spentAmount).toBe(0);
      expect(zeroCategory.spendingPercentage).toBe(0);
      expect(zeroCategory.isOverspent).toBe(false);
      expect(zeroCategory.categoryName).toBe('Emergency Fund');
    });

    it('should handle missing category error', async () => {
      await expect(budgetManager.addExpense('non-existent-category', {
        categoryId: 'non-existent-category',
        amount: 100,
        description: 'Test expense',
        date: new Date(),
        isRecurring: false,
        tags: [],
        status: 'pending'
      })).rejects.toThrow('Category non-existent-category not found');
    });
  });

  describe('Performance and Edge Cases', () => {
    it('should handle large number of categories efficiently', () => {
      const largeNumberOfCategories = Array.from({ length: 100 }, (_, i) => ({
        ...mockCategory,
        id: `category-${i}`,
        categoryName: `Category ${i}`,
        allocatedAmount: 1000 + i,
        spentAmount: 500 + i
      }));

      const startTime = performance.now();
      
      const totalAllocated = budgetManager.calculateTotalAllocated(largeNumberOfCategories);
      const totalSpent = budgetManager.calculateTotalSpent(largeNumberOfCategories);
      const variance = budgetManager.calculateBudgetVariance(largeNumberOfCategories);
      const distribution = budgetManager.calculateCategoryDistribution(largeNumberOfCategories);
      
      const endTime = performance.now();
      const executionTime = endTime - startTime;

      expect(executionTime).toBeLessThan(100); // Should complete within 100ms
      expect(totalAllocated).toBeGreaterThan(0);
      expect(totalSpent).toBeGreaterThan(0);
      expect(typeof variance).toBe('number');
      expect(distribution).toHaveLength(100);
    });

    it('should handle extreme decimal precision scenarios', () => {
      const extremeDecimals = [
        { amount: 1/3, expected: 0.33 },
        { amount: 2/3, expected: 0.67 },
        { amount: 1/7, expected: 0.14 },
        { amount: 22/7, expected: 3.14 }
      ];

      extremeDecimals.forEach(({ amount, expected }) => {
        const rounded = Math.round(amount * 100) / 100;
        expect(rounded).toBe(expected);
      });
    });

    it('should maintain precision with currency-style calculations', () => {
      // Common currency calculation scenarios
      const scenarios = [
        { price: 19.95, quantity: 3, total: 59.85 },
        { price: 12.33, quantity: 4, total: 49.32 },
        { price: 0.99, quantity: 12, total: 11.88 }
      ];

      scenarios.forEach(({ price, quantity, total }) => {
        const calculated = Math.round(price * quantity * 100) / 100;
        expect(calculated).toBe(total);
      });
    });

    it('should handle concurrent expense additions safely', async () => {
      budgetManager['categories'].set('test-category-1', { ...mockCategory });

      const expensePromises = Array.from({ length: 10 }, (_, i) =>
        budgetManager.addExpense('test-category-1', {
          categoryId: 'test-category-1',
          amount: 50,
          description: `Concurrent expense ${i}`,
          date: new Date(),
          isRecurring: false,
          tags: [`tag-${i}`],
          status: 'pending'
        })
      );

      const results = await Promise.all(expensePromises);
      const finalCategory = results[results.length - 1];

      expect(finalCategory.expenses).toHaveLength(12); // 2 original + 10 new
      expect(finalCategory.spentAmount).toBe(2000); // 1500 + (10 * 50)
    });
  });
});