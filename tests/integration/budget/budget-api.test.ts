// ✅ WS-163 COMPREHENSIVE INTEGRATION TESTING SUITE - Budget Category API
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createClient } from '@/lib/supabase/client';

// Mock notification service
const mockBudgetAlertService = {
  sendBudgetAlert: vi.fn().mockResolvedValue(true),
  sendOverspendAlert: vi.fn().mockResolvedValue(true),
  sendApproachingLimitAlert: vi.fn().mockResolvedValue(true),
  sendBudgetSummaryReport: vi.fn().mockResolvedValue(true)
};

// Types and interfaces for budget system
interface BudgetCategory {
  id: string;
  wedding_id: string;
  category_name: string;
  allocated_amount: number;
  spent_amount: number;
  remaining_amount: number;
  spending_percentage: number;
  is_overspent: boolean;
  overspent_amount: number;
  alert_threshold: number;
  created_at: string;
  updated_at: string;
  created_by: string;
}

interface BudgetExpense {
  id: string;
  category_id: string;
  amount: number;
  description: string;
  vendor: string | null;
  expense_date: string;
  receipt_url: string | null;
  is_recurring: boolean;
  recurring_pattern: any | null;
  status: 'pending' | 'approved' | 'rejected';
  tags: string[];
  approved_by: string | null;
  approved_at: string | null;
  created_at: string;
  updated_at: string;
  created_by: string;
}

interface BudgetAlert {
  id: string;
  category_id: string;
  alert_type: 'approaching_limit' | 'over_budget' | 'significant_expense';
  threshold_percentage: number;
  current_amount: number;
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  triggered_at: string;
  acknowledged: boolean;
  acknowledged_by: string | null;
  acknowledged_at: string | null;
}

describe('WS-163 Budget Category API Integration Tests', () => {
  let testSupabaseClient: any;
  let testWeddingId: string;
  let testUserId: string;
  let testCategoryId: string;

  beforeEach(async () => {
    testSupabaseClient = createClient();
    
    // Create test wedding
    const { data: wedding, error: weddingError } = await testSupabaseClient
      .from('weddings')
      .insert({
        couple_name: 'Test Budget Couple',
        wedding_date: '2024-08-15',
        venue_name: 'Test Budget Venue',
        total_budget: 25000,
        guest_count: 150,
        status: 'planning'
      })
      .select()
      .single();

    if (weddingError) throw weddingError;
    testWeddingId = wedding.id;

    // Create test user
    const { data: user, error: userError } = await testSupabaseClient
      .from('users')
      .insert({
        email: 'budget.test@example.com',
        name: 'Budget Test User',
        role: 'wedding_planner'
      })
      .select()
      .single();

    if (userError) throw userError;
    testUserId = user.id;

    vi.clearAllMocks();
  });

  afterEach(async () => {
    // Cleanup test data
    if (testCategoryId) {
      await testSupabaseClient
        .from('budget_categories')
        .delete()
        .eq('id', testCategoryId);
    }

    if (testWeddingId) {
      await testSupabaseClient
        .from('weddings')
        .delete()
        .eq('id', testWeddingId);
    }

    if (testUserId) {
      await testSupabaseClient
        .from('users')
        .delete()
        .eq('id', testUserId);
    }
  });

  describe('Budget Category CRUD Operations', () => {
    it('should create budget category with proper calculations', async () => {
      const categoryData = {
        wedding_id: testWeddingId,
        category_name: 'Photography',
        allocated_amount: 3500.00,
        alert_threshold: 90,
        created_by: testUserId
      };

      const { data: category, error } = await testSupabaseClient
        .from('budget_categories')
        .insert(categoryData)
        .select()
        .single();

      expect(error).toBeNull();
      expect(category).toBeDefined();
      expect(category.wedding_id).toBe(testWeddingId);
      expect(category.category_name).toBe('Photography');
      expect(category.allocated_amount).toBe(3500.00);
      expect(category.spent_amount).toBe(0);
      expect(category.remaining_amount).toBe(3500.00);
      expect(category.spending_percentage).toBe(0);
      expect(category.is_overspent).toBe(false);
      expect(category.overspent_amount).toBe(0);

      testCategoryId = category.id;
    });

    it('should update budget category and recalculate values', async () => {
      // Create category first
      const { data: category } = await testSupabaseClient
        .from('budget_categories')
        .insert({
          wedding_id: testWeddingId,
          category_name: 'Flowers',
          allocated_amount: 2000.00,
          alert_threshold: 85,
          created_by: testUserId
        })
        .select()
        .single();

      testCategoryId = category.id;

      // Update allocated amount
      const { data: updatedCategory, error: updateError } = await testSupabaseClient
        .from('budget_categories')
        .update({
          allocated_amount: 2500.00,
          updated_at: new Date().toISOString()
        })
        .eq('id', testCategoryId)
        .select()
        .single();

      expect(updateError).toBeNull();
      expect(updatedCategory.allocated_amount).toBe(2500.00);
      expect(updatedCategory.remaining_amount).toBe(2500.00);
    });

    it('should enforce unique category names per wedding', async () => {
      // Create first category
      const { data: category1 } = await testSupabaseClient
        .from('budget_categories')
        .insert({
          wedding_id: testWeddingId,
          category_name: 'Venue',
          allocated_amount: 8000.00,
          created_by: testUserId
        })
        .select()
        .single();

      testCategoryId = category1.id;

      // Try to create duplicate category name
      const { error: duplicateError } = await testSupabaseClient
        .from('budget_categories')
        .insert({
          wedding_id: testWeddingId,
          category_name: 'Venue',
          allocated_amount: 9000.00,
          created_by: testUserId
        });

      expect(duplicateError).toBeDefined();
      expect(duplicateError?.message).toContain('duplicate');
    });

    it('should handle decimal precision in budget amounts', async () => {
      const preciseAmounts = [
        { name: 'Catering', amount: 4567.89 },
        { name: 'Music', amount: 1234.56 },
        { name: 'Decorations', amount: 999.01 }
      ];

      const createdCategories: any[] = [];

      for (const { name, amount } of preciseAmounts) {
        const { data: category, error } = await testSupabaseClient
          .from('budget_categories')
          .insert({
            wedding_id: testWeddingId,
            category_name: name,
            allocated_amount: amount,
            created_by: testUserId
          })
          .select()
          .single();

        expect(error).toBeNull();
        expect(category.allocated_amount).toBe(amount);
        createdCategories.push(category);
      }

      // Cleanup
      await testSupabaseClient
        .from('budget_categories')
        .delete()
        .in('id', createdCategories.map(c => c.id));
    });

    it('should validate budget allocation constraints', async () => {
      const invalidData = [
        {
          wedding_id: testWeddingId,
          category_name: '', // Empty name
          allocated_amount: 1000,
          created_by: testUserId
        },
        {
          wedding_id: testWeddingId,
          category_name: 'Valid Name',
          allocated_amount: -500, // Negative amount
          created_by: testUserId
        },
        {
          wedding_id: testWeddingId,
          category_name: 'Another Valid Name',
          allocated_amount: 1000000000, // Excessive amount
          created_by: testUserId
        }
      ];

      for (const data of invalidData) {
        const { error } = await testSupabaseClient
          .from('budget_categories')
          .insert(data);

        expect(error).toBeDefined();
      }
    });
  });

  describe('Expense Management and Real-time Updates', () => {
    beforeEach(async () => {
      // Create test category for expense tests
      const { data: category } = await testSupabaseClient
        .from('budget_categories')
        .insert({
          wedding_id: testWeddingId,
          category_name: 'Test Expenses',
          allocated_amount: 2000.00,
          alert_threshold: 90,
          created_by: testUserId
        })
        .select()
        .single();

      testCategoryId = category.id;
    });

    it('should add expense and update category calculations in real-time', async () => {
      const expenseData = {
        category_id: testCategoryId,
        amount: 450.75,
        description: 'Professional photography deposit',
        vendor: 'Capture Moments Studio',
        expense_date: '2024-06-01',
        status: 'approved',
        tags: ['photography', 'deposit'],
        created_by: testUserId
      };

      // Add expense
      const { data: expense, error: expenseError } = await testSupabaseClient
        .from('budget_expenses')
        .insert(expenseData)
        .select()
        .single();

      expect(expenseError).toBeNull();
      expect(expense.amount).toBe(450.75);
      expect(expense.category_id).toBe(testCategoryId);

      // Verify category was updated via database triggers/functions
      const { data: updatedCategory } = await testSupabaseClient
        .from('budget_categories')
        .select()
        .eq('id', testCategoryId)
        .single();

      expect(updatedCategory.spent_amount).toBe(450.75);
      expect(updatedCategory.remaining_amount).toBe(1549.25); // 2000 - 450.75
      expect(updatedCategory.spending_percentage).toBe(22.54); // (450.75/2000) * 100, rounded
      expect(updatedCategory.is_overspent).toBe(false);

      // Cleanup expense
      await testSupabaseClient
        .from('budget_expenses')
        .delete()
        .eq('id', expense.id);
    });

    it('should handle multiple concurrent expense additions', async () => {
      const expensePromises = Array.from({ length: 5 }, (_, i) =>
        testSupabaseClient
          .from('budget_expenses')
          .insert({
            category_id: testCategoryId,
            amount: 100 + i, // 100, 101, 102, 103, 104
            description: `Concurrent expense ${i + 1}`,
            expense_date: '2024-06-01',
            status: 'approved',
            created_by: testUserId
          })
          .select()
          .single()
      );

      const results = await Promise.allSettled(expensePromises);
      const successfulExpenses = results
        .filter(r => r.status === 'fulfilled')
        .map(r => (r as any).value.data);

      expect(successfulExpenses.length).toBe(5);

      // Verify final category state
      const { data: finalCategory } = await testSupabaseClient
        .from('budget_categories')
        .select()
        .eq('id', testCategoryId)
        .single();

      const expectedTotal = 100 + 101 + 102 + 103 + 104; // 510
      expect(finalCategory.spent_amount).toBe(expectedTotal);
      expect(finalCategory.remaining_amount).toBe(2000 - expectedTotal);

      // Cleanup
      await testSupabaseClient
        .from('budget_expenses')
        .delete()
        .in('id', successfulExpenses.map(e => e.id));
    });

    it('should trigger budget alerts when thresholds are crossed', async () => {
      // Add expense that brings category to 95% (above 90% threshold)
      const largExpense = {
        category_id: testCategoryId,
        amount: 1900.00, // 95% of 2000
        description: 'Large venue payment',
        expense_date: '2024-06-01',
        status: 'approved',
        created_by: testUserId
      };

      const { data: expense } = await testSupabaseClient
        .from('budget_expenses')
        .insert(largExpense)
        .select()
        .single();

      // Check if alert was created
      const { data: alerts } = await testSupabaseClient
        .from('budget_alerts')
        .select()
        .eq('category_id', testCategoryId)
        .eq('alert_type', 'approaching_limit');

      expect(alerts).toHaveLength(1);
      expect(alerts[0].threshold_percentage).toBe(90);
      expect(alerts[0].severity).toBe('medium');

      // Cleanup
      await testSupabaseClient
        .from('budget_expenses')
        .delete()
        .eq('id', expense.id);
      
      await testSupabaseClient
        .from('budget_alerts')
        .delete()
        .eq('category_id', testCategoryId);
    });

    it('should handle expense modifications and recalculate budget', async () => {
      // Add initial expense
      const { data: expense } = await testSupabaseClient
        .from('budget_expenses')
        .insert({
          category_id: testCategoryId,
          amount: 500.00,
          description: 'Initial payment',
          expense_date: '2024-06-01',
          status: 'approved',
          created_by: testUserId
        })
        .select()
        .single();

      // Modify expense amount
      const { data: updatedExpense } = await testSupabaseClient
        .from('budget_expenses')
        .update({
          amount: 750.00,
          description: 'Adjusted payment amount',
          updated_at: new Date().toISOString()
        })
        .eq('id', expense.id)
        .select()
        .single();

      expect(updatedExpense.amount).toBe(750.00);

      // Verify category recalculation
      const { data: updatedCategory } = await testSupabaseClient
        .from('budget_categories')
        .select()
        .eq('id', testCategoryId)
        .single();

      expect(updatedCategory.spent_amount).toBe(750.00);
      expect(updatedCategory.remaining_amount).toBe(1250.00);

      // Cleanup
      await testSupabaseClient
        .from('budget_expenses')
        .delete()
        .eq('id', expense.id);
    });

    it('should handle expense deletion and budget recalculation', async () => {
      // Add two expenses
      const { data: expense1 } = await testSupabaseClient
        .from('budget_expenses')
        .insert({
          category_id: testCategoryId,
          amount: 300.00,
          description: 'First expense',
          expense_date: '2024-06-01',
          status: 'approved',
          created_by: testUserId
        })
        .select()
        .single();

      const { data: expense2 } = await testSupabaseClient
        .from('budget_expenses')
        .insert({
          category_id: testCategoryId,
          amount: 200.00,
          description: 'Second expense',
          expense_date: '2024-06-02',
          status: 'approved',
          created_by: testUserId
        })
        .select()
        .single();

      // Verify total
      let { data: category } = await testSupabaseClient
        .from('budget_categories')
        .select()
        .eq('id', testCategoryId)
        .single();

      expect(category.spent_amount).toBe(500.00);

      // Delete first expense
      await testSupabaseClient
        .from('budget_expenses')
        .delete()
        .eq('id', expense1.id);

      // Verify recalculation
      ({ data: category } = await testSupabaseClient
        .from('budget_categories')
        .select()
        .eq('id', testCategoryId)
        .single());

      expect(category.spent_amount).toBe(200.00);
      expect(category.remaining_amount).toBe(1800.00);

      // Cleanup
      await testSupabaseClient
        .from('budget_expenses')
        .delete()
        .eq('id', expense2.id);
    });
  });

  describe('Budget Alerts and Notifications', () => {
    beforeEach(async () => {
      const { data: category } = await testSupabaseClient
        .from('budget_categories')
        .insert({
          wedding_id: testWeddingId,
          category_name: 'Alert Test Category',
          allocated_amount: 1000.00,
          alert_threshold: 80,
          created_by: testUserId
        })
        .select()
        .single();

      testCategoryId = category.id;
    });

    it('should create approaching limit alert at custom threshold', async () => {
      // Add expense to reach 85% (above 80% threshold)
      const { data: expense } = await testSupabaseClient
        .from('budget_expenses')
        .insert({
          category_id: testCategoryId,
          amount: 850.00,
          description: 'Large expense triggering alert',
          expense_date: '2024-06-01',
          status: 'approved',
          created_by: testUserId
        })
        .select()
        .single();

      // Check for alert creation
      const { data: alerts } = await testSupabaseClient
        .from('budget_alerts')
        .select()
        .eq('category_id', testCategoryId)
        .eq('alert_type', 'approaching_limit');

      expect(alerts).toHaveLength(1);
      expect(alerts[0].threshold_percentage).toBe(80);
      expect(alerts[0].current_amount).toBe(850.00);
      expect(alerts[0].acknowledged).toBe(false);

      // Test alert acknowledgment
      const { data: acknowledgedAlert } = await testSupabaseClient
        .from('budget_alerts')
        .update({
          acknowledged: true,
          acknowledged_by: testUserId,
          acknowledged_at: new Date().toISOString()
        })
        .eq('id', alerts[0].id)
        .select()
        .single();

      expect(acknowledgedAlert.acknowledged).toBe(true);
      expect(acknowledgedAlert.acknowledged_by).toBe(testUserId);

      // Cleanup
      await testSupabaseClient
        .from('budget_expenses')
        .delete()
        .eq('id', expense.id);
      
      await testSupabaseClient
        .from('budget_alerts')
        .delete()
        .eq('id', alerts[0].id);
    });

    it('should create over-budget alert with appropriate severity', async () => {
      // Add expense that exceeds budget by 20%
      const { data: expense } = await testSupabaseClient
        .from('budget_expenses')
        .insert({
          category_id: testCategoryId,
          amount: 1200.00, // 20% over 1000 budget
          description: 'Expense causing overspend',
          expense_date: '2024-06-01',
          status: 'approved',
          created_by: testUserId
        })
        .select()
        .single();

      const { data: alerts } = await testSupabaseClient
        .from('budget_alerts')
        .select()
        .eq('category_id', testCategoryId)
        .eq('alert_type', 'over_budget')
        .order('created_at', { ascending: false })
        .limit(1);

      expect(alerts).toHaveLength(1);
      expect(alerts[0].current_amount).toBe(1200.00);
      expect(alerts[0].severity).toBe('high'); // 20% overspend should be high severity

      // Cleanup
      await testSupabaseClient
        .from('budget_expenses')
        .delete()
        .eq('id', expense.id);
      
      await testSupabaseClient
        .from('budget_alerts')
        .delete()
        .eq('id', alerts[0].id);
    });

    it('should create significant expense alert for large single expenses', async () => {
      // Add expense that's 30% of budget in single transaction
      const { data: expense } = await testSupabaseClient
        .from('budget_expenses')
        .insert({
          category_id: testCategoryId,
          amount: 300.00, // 30% of 1000 budget
          description: 'Significant single expense',
          vendor: 'Premium Vendor',
          expense_date: new Date().toISOString().split('T')[0], // Today
          status: 'approved',
          created_by: testUserId
        })
        .select()
        .single();

      const { data: alerts } = await testSupabaseClient
        .from('budget_alerts')
        .select()
        .eq('category_id', testCategoryId)
        .eq('alert_type', 'significant_expense');

      expect(alerts).toHaveLength(1);
      expect(alerts[0].current_amount).toBe(300.00);
      expect(alerts[0].severity).toBe('medium');

      // Cleanup
      await testSupabaseClient
        .from('budget_expenses')
        .delete()
        .eq('id', expense.id);
      
      await testSupabaseClient
        .from('budget_alerts')
        .delete()
        .eq('id', alerts[0].id);
    });

    it('should handle alert escalation for critical overspend', async () => {
      // Add expense that exceeds budget by 50% (critical level)
      const { data: expense } = await testSupabaseClient
        .from('budget_expenses')
        .insert({
          category_id: testCategoryId,
          amount: 1500.00, // 50% over budget
          description: 'Critical overspend expense',
          expense_date: '2024-06-01',
          status: 'approved',
          created_by: testUserId
        })
        .select()
        .single();

      const { data: alerts } = await testSupabaseClient
        .from('budget_alerts')
        .select()
        .eq('category_id', testCategoryId)
        .eq('alert_type', 'over_budget')
        .order('created_at', { ascending: false })
        .limit(1);

      expect(alerts).toHaveLength(1);
      expect(alerts[0].severity).toBe('critical');
      expect(alerts[0].current_amount).toBe(1500.00);

      // Verify notification service was called for critical alert
      expect(mockBudgetAlertService.sendOverspendAlert).toHaveBeenCalledWith(
        expect.objectContaining({
          severity: 'critical',
          categoryName: 'Alert Test Category',
          overspendAmount: 500.00
        })
      );

      // Cleanup
      await testSupabaseClient
        .from('budget_expenses')
        .delete()
        .eq('id', expense.id);
      
      await testSupabaseClient
        .from('budget_alerts')
        .delete()
        .eq('id', alerts[0].id);
    });
  });

  describe('Complex Budget Calculations and Reporting', () => {
    let categoryIds: string[] = [];

    beforeEach(async () => {
      // Create multiple categories for complex calculations
      const categories = [
        { name: 'Venue', amount: 8000.00, threshold: 90 },
        { name: 'Catering', amount: 6000.00, threshold: 85 },
        { name: 'Photography', amount: 3000.00, threshold: 80 },
        { name: 'Music', amount: 2000.00, threshold: 75 },
        { name: 'Flowers', amount: 1500.00, threshold: 90 }
      ];

      const createdCategories = await Promise.all(
        categories.map(cat =>
          testSupabaseClient
            .from('budget_categories')
            .insert({
              wedding_id: testWeddingId,
              category_name: cat.name,
              allocated_amount: cat.amount,
              alert_threshold: cat.threshold,
              created_by: testUserId
            })
            .select()
            .single()
        )
      );

      categoryIds = createdCategories.map(result => result.data.id);
    });

    afterEach(async () => {
      // Cleanup categories
      await testSupabaseClient
        .from('budget_categories')
        .delete()
        .in('id', categoryIds);
    });

    it('should calculate wedding-wide budget statistics', async () => {
      // Add various expenses across categories
      const expenses = [
        { categoryId: categoryIds[0], amount: 7200.00, description: 'Venue deposit' }, // Venue: 90%
        { categoryId: categoryIds[1], amount: 4800.00, description: 'Catering deposit' }, // Catering: 80%
        { categoryId: categoryIds[2], amount: 2400.00, description: 'Photography package' }, // Photography: 80%
        { categoryId: categoryIds[3], amount: 1600.00, description: 'DJ service' }, // Music: 80%
        { categoryId: categoryIds[4], amount: 1200.00, description: 'Floral arrangements' } // Flowers: 80%
      ];

      await Promise.all(
        expenses.map(exp =>
          testSupabaseClient
            .from('budget_expenses')
            .insert({
              category_id: exp.categoryId,
              amount: exp.amount,
              description: exp.description,
              expense_date: '2024-06-01',
              status: 'approved',
              created_by: testUserId
            })
        )
      );

      // Calculate overall statistics via database view or function
      const { data: weddingBudget } = await testSupabaseClient
        .from('wedding_budget_summary')
        .select()
        .eq('wedding_id', testWeddingId)
        .single();

      const totalAllocated = 8000 + 6000 + 3000 + 2000 + 1500; // 20,500
      const totalSpent = 7200 + 4800 + 2400 + 1600 + 1200; // 17,200
      const overallPercentage = (totalSpent / totalAllocated) * 100; // ~83.9%

      expect(weddingBudget.total_allocated).toBe(totalAllocated);
      expect(weddingBudget.total_spent).toBe(totalSpent);
      expect(weddingBudget.overall_percentage).toBeCloseTo(83.9, 1);
      expect(weddingBudget.categories_over_budget).toBe(0);
      expect(weddingBudget.categories_approaching_limit).toBeGreaterThan(0);
    });

    it('should handle budget rebalancing across categories', async () => {
      // Simulate scenario where one category needs more budget
      const originalVenueBudget = 8000.00;
      const additionalVenueNeeds = 2000.00;
      
      // Reduce other categories to accommodate venue increase
      const adjustments = [
        { categoryId: categoryIds[1], newAmount: 5000.00 }, // Catering: -1000
        { categoryId: categoryIds[2], newAmount: 2500.00 }, // Photography: -500
        { categoryId: categoryIds[3], newAmount: 1500.00 }  // Music: -500
      ];

      // Update venue budget
      await testSupabaseClient
        .from('budget_categories')
        .update({ allocated_amount: originalVenueBudget + additionalVenueNeeds })
        .eq('id', categoryIds[0]);

      // Update other categories
      await Promise.all(
        adjustments.map(adj =>
          testSupabaseClient
            .from('budget_categories')
            .update({ allocated_amount: adj.newAmount })
            .eq('id', adj.categoryId)
        )
      );

      // Verify total budget remains constant
      const { data: updatedCategories } = await testSupabaseClient
        .from('budget_categories')
        .select('allocated_amount')
        .eq('wedding_id', testWeddingId);

      const newTotal = updatedCategories.reduce((sum, cat) => sum + cat.allocated_amount, 0);
      const originalTotal = 20500; // Same as before rebalancing
      
      expect(newTotal).toBe(originalTotal);
    });

    it('should track budget changes over time', async () => {
      // Create budget history entries
      const historyEntries = [
        { categoryId: categoryIds[0], oldAmount: 8000, newAmount: 8500, reason: 'Venue upgrade' },
        { categoryId: categoryIds[1], oldAmount: 6000, newAmount: 5500, reason: 'Menu simplification' }
      ];

      await Promise.all(
        historyEntries.map(entry =>
          testSupabaseClient
            .from('budget_history')
            .insert({
              category_id: entry.categoryId,
              old_amount: entry.oldAmount,
              new_amount: entry.newAmount,
              change_reason: entry.reason,
              changed_by: testUserId,
              changed_at: new Date().toISOString()
            })
        )
      );

      const { data: history } = await testSupabaseClient
        .from('budget_history')
        .select()
        .in('category_id', categoryIds)
        .order('changed_at', { ascending: false });

      expect(history).toHaveLength(2);
      expect(history[0].change_reason).toContain('Menu simplification');
      expect(history[1].change_reason).toContain('Venue upgrade');

      // Cleanup
      await testSupabaseClient
        .from('budget_history')
        .delete()
        .in('category_id', categoryIds);
    });
  });

  describe('Financial Accuracy and Edge Cases', () => {
    beforeEach(async () => {
      const { data: category } = await testSupabaseClient
        .from('budget_categories')
        .insert({
          wedding_id: testWeddingId,
          category_name: 'Precision Test',
          allocated_amount: 1000.00,
          created_by: testUserId
        })
        .select()
        .single();

      testCategoryId = category.id;
    });

    it('should handle decimal precision in financial calculations', async () => {
      const preciseExpenses = [
        333.33, 333.33, 333.34  // Should total exactly 1000.00
      ];

      for (let i = 0; i < preciseExpenses.length; i++) {
        await testSupabaseClient
          .from('budget_expenses')
          .insert({
            category_id: testCategoryId,
            amount: preciseExpenses[i],
            description: `Precise expense ${i + 1}`,
            expense_date: '2024-06-01',
            status: 'approved',
            created_by: testUserId
          });
      }

      const { data: category } = await testSupabaseClient
        .from('budget_categories')
        .select()
        .eq('id', testCategoryId)
        .single();

      expect(category.spent_amount).toBe(1000.00);
      expect(category.remaining_amount).toBe(0.00);
      expect(category.spending_percentage).toBe(100.00);

      // Cleanup
      await testSupabaseClient
        .from('budget_expenses')
        .delete()
        .eq('category_id', testCategoryId);
    });

    it('should handle negative expenses (refunds) correctly', async () => {
      // Add initial expense
      const { data: initialExpense } = await testSupabaseClient
        .from('budget_expenses')
        .insert({
          category_id: testCategoryId,
          amount: 500.00,
          description: 'Initial payment',
          expense_date: '2024-06-01',
          status: 'approved',
          created_by: testUserId
        })
        .select()
        .single();

      // Add refund
      const { data: refund } = await testSupabaseClient
        .from('budget_expenses')
        .insert({
          category_id: testCategoryId,
          amount: -150.00,
          description: 'Partial refund',
          expense_date: '2024-06-02',
          status: 'approved',
          created_by: testUserId
        })
        .select()
        .single();

      const { data: category } = await testSupabaseClient
        .from('budget_categories')
        .select()
        .eq('id', testCategoryId)
        .single();

      expect(category.spent_amount).toBe(350.00); // 500 - 150
      expect(category.remaining_amount).toBe(650.00); // 1000 - 350
      expect(category.spending_percentage).toBe(35.00);

      // Cleanup
      await testSupabaseClient
        .from('budget_expenses')
        .delete()
        .in('id', [initialExpense.id, refund.id]);
    });

    it('should handle zero-budget categories correctly', async () => {
      // Create zero-budget category
      const { data: zeroCategory } = await testSupabaseClient
        .from('budget_categories')
        .insert({
          wedding_id: testWeddingId,
          category_name: 'Zero Budget Category',
          allocated_amount: 0.00,
          created_by: testUserId
        })
        .select()
        .single();

      // Add expense to zero-budget category
      await testSupabaseClient
        .from('budget_expenses')
        .insert({
          category_id: zeroCategory.id,
          amount: 100.00,
          description: 'Expense to zero category',
          expense_date: '2024-06-01',
          status: 'approved',
          created_by: testUserId
        });

      const { data: updatedZeroCategory } = await testSupabaseClient
        .from('budget_categories')
        .select()
        .eq('id', zeroCategory.id)
        .single();

      expect(updatedZeroCategory.spent_amount).toBe(100.00);
      expect(updatedZeroCategory.remaining_amount).toBe(-100.00);
      expect(updatedZeroCategory.is_overspent).toBe(true);
      expect(updatedZeroCategory.overspent_amount).toBe(100.00);

      // Cleanup
      await testSupabaseClient
        .from('budget_categories')
        .delete()
        .eq('id', zeroCategory.id);
    });

    it('should maintain data consistency during concurrent operations', async () => {
      // Simulate multiple users making simultaneous budget changes
      const concurrentOperations = [
        // User 1: Add expense
        testSupabaseClient
          .from('budget_expenses')
          .insert({
            category_id: testCategoryId,
            amount: 200.00,
            description: 'Concurrent expense 1',
            expense_date: '2024-06-01',
            status: 'approved',
            created_by: testUserId
          }),
        
        // User 2: Add different expense
        testSupabaseClient
          .from('budget_expenses')
          .insert({
            category_id: testCategoryId,
            amount: 300.00,
            description: 'Concurrent expense 2',
            expense_date: '2024-06-01',
            status: 'approved',
            created_by: testUserId
          }),
        
        // User 3: Update budget limit
        testSupabaseClient
          .from('budget_categories')
          .update({ allocated_amount: 1200.00 })
          .eq('id', testCategoryId)
      ];

      const results = await Promise.allSettled(concurrentOperations);
      
      // All operations should succeed
      expect(results.every(r => r.status === 'fulfilled')).toBe(true);

      // Verify final state is consistent
      const { data: finalCategory } = await testSupabaseClient
        .from('budget_categories')
        .select()
        .eq('id', testCategoryId)
        .single();

      expect(finalCategory.spent_amount).toBe(500.00); // 200 + 300
      expect(finalCategory.allocated_amount).toBe(1200.00);
      expect(finalCategory.remaining_amount).toBe(700.00); // 1200 - 500

      // Cleanup
      await testSupabaseClient
        .from('budget_expenses')
        .delete()
        .eq('category_id', testCategoryId);
    });
  });

  describe('Performance and Scalability', () => {
    it('should handle large number of budget categories efficiently', async () => {
      const numberOfCategories = 50;
      const categories = Array.from({ length: numberOfCategories }, (_, i) => ({
        wedding_id: testWeddingId,
        category_name: `Performance Category ${i + 1}`,
        allocated_amount: 1000 + i,
        created_by: testUserId
      }));

      const startTime = performance.now();
      
      // Batch insert categories
      const { data: createdCategories, error } = await testSupabaseClient
        .from('budget_categories')
        .insert(categories)
        .select();

      const creationTime = performance.now() - startTime;

      expect(error).toBeNull();
      expect(createdCategories).toHaveLength(numberOfCategories);
      expect(creationTime).toBeLessThan(5000); // Should complete within 5 seconds

      // Test bulk query performance
      const queryStartTime = performance.now();
      
      const { data: queriedCategories } = await testSupabaseClient
        .from('budget_categories')
        .select(`
          *,
          budget_expenses(*),
          budget_alerts(*)
        `)
        .eq('wedding_id', testWeddingId);

      const queryTime = performance.now() - queryStartTime;

      expect(queriedCategories).toHaveLength(numberOfCategories);
      expect(queryTime).toBeLessThan(3000); // Should complete within 3 seconds

      // Cleanup
      await testSupabaseClient
        .from('budget_categories')
        .delete()
        .in('id', createdCategories.map(c => c.id));
    });

    it('should maintain performance with high-frequency expense additions', async () => {
      // Create category for performance test
      const { data: perfCategory } = await testSupabaseClient
        .from('budget_categories')
        .insert({
          wedding_id: testWeddingId,
          category_name: 'Performance Test Category',
          allocated_amount: 10000.00,
          created_by: testUserId
        })
        .select()
        .single();

      const numberOfExpenses = 100;
      const expenses = Array.from({ length: numberOfExpenses }, (_, i) => ({
        category_id: perfCategory.id,
        amount: Math.round((10 + Math.random() * 90) * 100) / 100, // Random amount between 10-100
        description: `Performance expense ${i + 1}`,
        expense_date: '2024-06-01',
        status: 'approved',
        created_by: testUserId
      }));

      const startTime = performance.now();

      // Batch insert expenses
      const { data: createdExpenses, error } = await testSupabaseClient
        .from('budget_expenses')
        .insert(expenses)
        .select();

      const insertTime = performance.now() - startTime;

      expect(error).toBeNull();
      expect(createdExpenses).toHaveLength(numberOfExpenses);
      expect(insertTime).toBeLessThan(10000); // Should complete within 10 seconds

      // Verify category calculations are correct
      const { data: updatedCategory } = await testSupabaseClient
        .from('budget_categories')
        .select()
        .eq('id', perfCategory.id)
        .single();

      const expectedTotal = expenses.reduce((sum, exp) => sum + exp.amount, 0);
      expect(updatedCategory.spent_amount).toBeCloseTo(expectedTotal, 2);

      // Cleanup
      await testSupabaseClient
        .from('budget_categories')
        .delete()
        .eq('id', perfCategory.id);
    });
  });
});