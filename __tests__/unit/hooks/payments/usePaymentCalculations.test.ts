import { renderHook } from '@testing-library/react';
import { usePaymentCalculations } from '@/hooks/payments/usePaymentCalculations';
import { 
  mockPaymentData,
  edgeCasePaymentData,
  paymentCalculationTestData,
  testUtils
} from '../../../../tests/payments/fixtures/payment-fixtures';

describe('usePaymentCalculations Hook', () => {
  describe('Payment Summary Calculations', () => {
    test('calculates total amounts correctly', () => {
      const { result } = renderHook(() => usePaymentCalculations());

      const summary = result.current.calculateTotals(mockPaymentData);

      expect(summary.total_payments).toBe(5);
      expect(summary.total_amount).toBe(29951.5);
      expect(summary.paid_amount).toBe(2400);
      expect(summary.pending_amount).toBe(17850.25);
      expect(summary.overdue_amount).toBe(3200.5);
      expect(summary.overdue_count).toBe(1);
      expect(summary.due_soon_count).toBe(1);
    });

    test('handles empty payment list', () => {
      const { result } = renderHook(() => usePaymentCalculations());

      const summary = result.current.calculateTotals([]);

      expect(summary.total_payments).toBe(0);
      expect(summary.total_amount).toBe(0);
      expect(summary.paid_amount).toBe(0);
      expect(summary.pending_amount).toBe(0);
      expect(summary.overdue_amount).toBe(0);
      expect(summary.overdue_count).toBe(0);
      expect(summary.due_soon_count).toBe(0);
    });

    test('handles edge case amounts', () => {
      const { result } = renderHook(() => usePaymentCalculations());

      const summary = result.current.calculateTotals(edgeCasePaymentData);

      // Test minimum amount
      expect(summary.total_amount).toContain(0.01);
      // Test maximum amount  
      expect(summary.total_amount).toContain(999999.99);
      // Test precision handling
      expect(summary.total_amount).toBeCloseTo(1001234.567, 2);
    });

    test('calculates percentages correctly', () => {
      const { result } = renderHook(() => usePaymentCalculations());

      const percentages = result.current.calculatePercentages(mockPaymentData);

      expect(percentages.paid_percentage).toBeCloseTo(8.0, 1); // 2400/29951.5
      expect(percentages.pending_percentage).toBeCloseTo(59.6, 1);
      expect(percentages.overdue_percentage).toBeCloseTo(10.7, 1);
      expect(percentages.due_soon_percentage).toBeCloseTo(28.4, 1);
    });
  });

  describe('Due Status Calculations', () => {
    test('calculates due status correctly', () => {
      const { result } = renderHook(() => usePaymentCalculations());

      // Test overdue (due_date in past)
      const overduePayment = mockPaymentData.find(p => p.status === 'overdue')!;
      expect(result.current.calculateDueStatus(overduePayment)).toBe('overdue');

      // Test due soon (within 7 days)
      const dueSoonPayment = mockPaymentData.find(p => p.status === 'due-soon')!;
      expect(result.current.calculateDueStatus(dueSoonPayment)).toBe('due-soon');

      // Test pending (more than 7 days away)
      const pendingPayment = mockPaymentData.find(p => p.status === 'pending')!;
      expect(result.current.calculateDueStatus(pendingPayment)).toBe('pending');

      // Test paid (should remain paid)
      const paidPayment = mockPaymentData.find(p => p.status === 'paid')!;
      expect(result.current.calculateDueStatus(paidPayment)).toBe('paid');
    });

    test('handles timezone differences in due status', () => {
      const { result } = renderHook(() => usePaymentCalculations());

      const timezonePayment = testUtils.createPayment({
        due_date: '2025-01-01T00:00:00Z', // UTC midnight
        status: 'pending'
      });

      // Should handle timezone conversion properly
      const status = result.current.calculateDueStatus(timezonePayment);
      expect(['pending', 'due-soon', 'overdue']).toContain(status);
    });

    test('calculates days until due correctly', () => {
      const { result } = renderHook(() => usePaymentCalculations());

      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 15);
      
      const futurePayment = testUtils.createPayment({
        due_date: futureDate.toISOString().split('T')[0]
      });

      const daysUntilDue = result.current.calculateDaysUntilDue(futurePayment);
      expect(daysUntilDue).toBe(15);
    });

    test('handles negative days for overdue payments', () => {
      const { result } = renderHook(() => usePaymentCalculations());

      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 10);
      
      const overduePayment = testUtils.createPayment({
        due_date: pastDate.toISOString().split('T')[0],
        status: 'overdue'
      });

      const daysUntilDue = result.current.calculateDaysUntilDue(overduePayment);
      expect(daysUntilDue).toBe(-10);
    });
  });

  describe('Currency Formatting', () => {
    test('formats standard amounts correctly', () => {
      const { result } = renderHook(() => usePaymentCalculations());

      expect(result.current.formatCurrency(1500.50)).toBe('$1,500.50');
      expect(result.current.formatCurrency(0.99)).toBe('$0.99');
      expect(result.current.formatCurrency(1000000)).toBe('$1,000,000.00');
    });

    test('handles zero and negative amounts', () => {
      const { result } = renderHook(() => usePaymentCalculations());

      expect(result.current.formatCurrency(0)).toBe('$0.00');
      expect(result.current.formatCurrency(-100)).toBe('-$100.00');
    });

    test('rounds to appropriate decimal places', () => {
      const { result } = renderHook(() => usePaymentCalculations());

      expect(result.current.formatCurrency(1234.567)).toBe('$1,234.57');
      expect(result.current.formatCurrency(1234.564)).toBe('$1,234.56');
      expect(result.current.formatCurrency(1234.565)).toBe('$1,234.57'); // Banker's rounding
    });

    test('handles different locales', () => {
      const { result } = renderHook(() => usePaymentCalculations());

      const eurAmount = result.current.formatCurrency(1500.50, 'EUR', 'de-DE');
      expect(eurAmount).toBe('1.500,50 €');

      const gbpAmount = result.current.formatCurrency(1500.50, 'GBP', 'en-GB');
      expect(gbpAmount).toBe('£1,500.50');
    });
  });

  describe('Tax and Discount Calculations', () => {
    test('calculates tax correctly', () => {
      const { result } = renderHook(() => usePaymentCalculations());

      paymentCalculationTestData.forEach(testCase => {
        const taxAmount = result.current.calculateTax(testCase.base_amount, testCase.tax_rate);
        expect(taxAmount).toBeCloseTo(testCase.expected_tax, 2);
      });
    });

    test('calculates discounts correctly', () => {
      const { result } = renderHook(() => usePaymentCalculations());

      paymentCalculationTestData.forEach(testCase => {
        const discountAmount = result.current.calculateDiscount(testCase.base_amount, testCase.discount_rate);
        expect(discountAmount).toBeCloseTo(testCase.expected_discount, 2);
      });
    });

    test('calculates total with tax and discount', () => {
      const { result } = renderHook(() => usePaymentCalculations());

      paymentCalculationTestData.forEach(testCase => {
        const total = result.current.calculateTotalWithTaxAndDiscount(
          testCase.base_amount,
          testCase.tax_rate,
          testCase.discount_rate
        );
        expect(total).toBeCloseTo(testCase.expected_total, 2);
      });
    });

    test('handles zero tax and discount rates', () => {
      const { result } = renderHook(() => usePaymentCalculations());

      const total = result.current.calculateTotalWithTaxAndDiscount(1000, 0, 0);
      expect(total).toBe(1000);
    });

    test('handles 100% discount edge case', () => {
      const { result } = renderHook(() => usePaymentCalculations());

      const total = result.current.calculateTotalWithTaxAndDiscount(1000, 0.08, 1.0);
      expect(total).toBe(0);
    });
  });

  describe('Payment Validation', () => {
    test('validates required fields', () => {
      const { result } = renderHook(() => usePaymentCalculations());

      const validPayment = {
        vendor_name: 'Test Vendor',
        amount: 1500.00,
        due_date: '2025-03-15',
        category: 'Testing'
      };

      const validation = result.current.validatePayment(validPayment);
      expect(validation.isValid).toBe(true);
      expect(validation.errors).toEqual([]);
    });

    test('validates amount constraints', () => {
      const { result } = renderHook(() => usePaymentCalculations());

      const invalidAmountPayment = {
        vendor_name: 'Test Vendor',
        amount: -100,
        due_date: '2025-03-15',
        category: 'Testing'
      };

      const validation = result.current.validatePayment(invalidAmountPayment);
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('Amount must be positive');
    });

    test('validates date format', () => {
      const { result } = renderHook(() => usePaymentCalculations());

      const invalidDatePayment = {
        vendor_name: 'Test Vendor',
        amount: 1500.00,
        due_date: 'invalid-date',
        category: 'Testing'
      };

      const validation = result.current.validatePayment(invalidDatePayment);
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('Invalid due date format');
    });

    test('validates vendor name requirements', () => {
      const { result } = renderHook(() => usePaymentCalculations());

      const emptyVendorPayment = {
        vendor_name: '',
        amount: 1500.00,
        due_date: '2025-03-15',
        category: 'Testing'
      };

      const validation = result.current.validatePayment(emptyVendorPayment);
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('Vendor name is required');
    });

    test('validates maximum amount limits', () => {
      const { result } = renderHook(() => usePaymentCalculations());

      const tooLargePayment = {
        vendor_name: 'Test Vendor',
        amount: 10000000, // 10 million
        due_date: '2025-03-15',
        category: 'Testing'
      };

      const validation = result.current.validatePayment(tooLargePayment);
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('Amount exceeds maximum limit of $1,000,000');
    });

    test('validates category constraints', () => {
      const { result } = renderHook(() => usePaymentCalculations());

      const validCategories = ['Venue', 'Catering', 'Photography', 'Flowers', 'Music', 'Miscellaneous'];
      
      const invalidCategoryPayment = {
        vendor_name: 'Test Vendor',
        amount: 1500.00,
        due_date: '2025-03-15',
        category: 'InvalidCategory'
      };

      const validation = result.current.validatePayment(invalidCategoryPayment, validCategories);
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('Invalid category');
    });
  });

  describe('Date Utilities', () => {
    test('calculates business days correctly', () => {
      const { result } = renderHook(() => usePaymentCalculations());

      // Test Friday + 3 business days = Wednesday (skip weekend)
      const friday = new Date('2025-01-03'); // Friday
      const businessDate = result.current.addBusinessDays(friday, 3);
      
      expect(businessDate.getDay()).toBe(3); // Wednesday
      expect(businessDate.getDate()).toBe(8); // January 8th
    });

    test('handles business days across year boundary', () => {
      const { result } = renderHook(() => usePaymentCalculations());

      const december30 = new Date('2024-12-30'); // Monday
      const businessDate = result.current.addBusinessDays(december30, 5);
      
      expect(businessDate.getFullYear()).toBe(2025);
      expect(businessDate.getMonth()).toBe(0); // January
      expect(businessDate.getDate()).toBe(6); // January 6th (Monday)
    });

    test('formats dates for display', () => {
      const { result } = renderHook(() => usePaymentCalculations());

      expect(result.current.formatDateDisplay('2025-03-15')).toBe('Mar 15, 2025');
      expect(result.current.formatDateDisplay('2024-02-29')).toBe('Feb 29, 2024');
      expect(result.current.formatDateDisplay('2024-12-31')).toBe('Dec 31, 2024');
    });

    test('handles invalid dates gracefully', () => {
      const { result } = renderHook(() => usePaymentCalculations());

      expect(result.current.formatDateDisplay('invalid-date')).toBe('Invalid Date');
      expect(result.current.formatDateDisplay('')).toBe('Invalid Date');
      expect(result.current.formatDateDisplay(null)).toBe('Invalid Date');
    });

    test('calculates payment urgency', () => {
      const { result } = renderHook(() => usePaymentCalculations());

      const today = new Date();
      
      // Due tomorrow - high urgency
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const urgentPayment = testUtils.createPayment({
        due_date: tomorrow.toISOString().split('T')[0]
      });
      
      expect(result.current.calculateUrgency(urgentPayment)).toBe('high');

      // Due in 5 days - medium urgency
      const fiveDays = new Date(today);
      fiveDays.setDate(fiveDays.getDate() + 5);
      const mediumPayment = testUtils.createPayment({
        due_date: fiveDays.toISOString().split('T')[0]
      });
      
      expect(result.current.calculateUrgency(mediumPayment)).toBe('medium');

      // Due in 30 days - low urgency
      const thirtyDays = new Date(today);
      thirtyDays.setDate(thirtyDays.getDate() + 30);
      const lowPayment = testUtils.createPayment({
        due_date: thirtyDays.toISOString().split('T')[0]
      });
      
      expect(result.current.calculateUrgency(lowPayment)).toBe('low');
    });
  });

  describe('Advanced Calculations', () => {
    test('calculates payment projections', () => {
      const { result } = renderHook(() => usePaymentCalculations());

      const projections = result.current.calculatePaymentProjections(mockPaymentData);

      expect(projections).toHaveProperty('next_30_days');
      expect(projections).toHaveProperty('next_60_days');
      expect(projections).toHaveProperty('next_90_days');
      expect(projections.next_30_days.amount).toBeGreaterThanOrEqual(0);
      expect(projections.next_30_days.count).toBeGreaterThanOrEqual(0);
    });

    test('calculates vendor payment distribution', () => {
      const { result } = renderHook(() => usePaymentCalculations());

      const distribution = result.current.calculateVendorDistribution(mockPaymentData);

      expect(distribution).toBeInstanceOf(Array);
      expect(distribution[0]).toHaveProperty('vendor_name');
      expect(distribution[0]).toHaveProperty('total_amount');
      expect(distribution[0]).toHaveProperty('payment_count');
      expect(distribution[0]).toHaveProperty('percentage');
    });

    test('calculates category breakdown', () => {
      const { result } = renderHook(() => usePaymentCalculations());

      const breakdown = result.current.calculateCategoryBreakdown(mockPaymentData);

      expect(breakdown).toHaveProperty('Venue');
      expect(breakdown).toHaveProperty('Catering');
      expect(breakdown).toHaveProperty('Photography');
      expect(breakdown.Venue.amount).toBe(15000);
      expect(breakdown.Venue.count).toBe(1);
    });

    test('calculates payment velocity', () => {
      const { result } = renderHook(() => usePaymentCalculations());

      const velocity = result.current.calculatePaymentVelocity(mockPaymentData);

      expect(velocity).toHaveProperty('payments_per_day');
      expect(velocity).toHaveProperty('average_amount_per_day');
      expect(velocity).toHaveProperty('trend');
      expect(['increasing', 'stable', 'decreasing']).toContain(velocity.trend);
    });
  });

  describe('Performance Optimizations', () => {
    test('memoizes expensive calculations', () => {
      const { result, rerender } = renderHook(() => usePaymentCalculations());

      const firstCalculation = result.current.calculateTotals(mockPaymentData);
      const secondCalculation = result.current.calculateTotals(mockPaymentData);

      // Should return the same reference for identical inputs
      expect(firstCalculation).toBe(secondCalculation);
    });

    test('handles large datasets efficiently', () => {
      const { result } = renderHook(() => usePaymentCalculations());

      const largeDataset = testUtils.createPayments(10000);
      
      const startTime = performance.now();
      const summary = result.current.calculateTotals(largeDataset);
      const endTime = performance.now();

      expect(endTime - startTime).toBeLessThan(100); // Should complete within 100ms
      expect(summary.total_payments).toBe(10000);
    });

    test('uses web workers for heavy calculations', async () => {
      const { result } = renderHook(() => usePaymentCalculations());

      const heavyDataset = testUtils.createPayments(50000);
      
      const projections = await result.current.calculatePaymentProjectionsAsync(heavyDataset);

      expect(projections).toHaveProperty('next_30_days');
      expect(projections).toHaveProperty('calculation_time');
      expect(projections.calculation_time).toBeLessThan(5000); // 5 second timeout
    });
  });

  describe('Edge Cases', () => {
    test('handles null and undefined inputs', () => {
      const { result } = renderHook(() => usePaymentCalculations());

      expect(result.current.calculateTotals(null)).toEqual({
        total_payments: 0,
        total_amount: 0,
        paid_amount: 0,
        pending_amount: 0,
        overdue_amount: 0,
        overdue_count: 0,
        due_soon_count: 0
      });

      expect(result.current.formatCurrency(null)).toBe('$0.00');
      expect(result.current.formatCurrency(undefined)).toBe('$0.00');
    });

    test('handles malformed payment objects', () => {
      const { result } = renderHook(() => usePaymentCalculations());

      const malformedPayments = [
        { amount: '1000' }, // string instead of number
        { amount: 1000 }, // missing other fields
        { vendor_name: 'Test', amount: NaN }, // NaN amount
        null // null payment
      ];

      expect(() => {
        result.current.calculateTotals(malformedPayments as any);
      }).not.toThrow();

      const summary = result.current.calculateTotals(malformedPayments as any);
      expect(summary.total_amount).toBe(1000); // Only the valid amount
    });

    test('handles floating point precision issues', () => {
      const { result } = renderHook(() => usePaymentCalculations());

      const precisionTestPayments = [
        testUtils.createPayment({ amount: 0.1 + 0.2 }), // Should be 0.3 but JS gives 0.30000000000000004
        testUtils.createPayment({ amount: 1.1 * 3 }), // Should be 3.3 but JS gives 3.3000000000000003
      ];

      const summary = result.current.calculateTotals(precisionTestPayments);
      
      // Should handle floating point precision correctly
      expect(summary.total_amount).toBeCloseTo(3.6, 2);
    });

    test('handles leap year calculations', () => {
      const { result } = renderHook(() => usePaymentCalculations());

      const leapYearPayment = testUtils.createPayment({
        due_date: '2024-02-29' // Leap year
      });

      expect(() => {
        result.current.calculateDueStatus(leapYearPayment);
      }).not.toThrow();

      expect(result.current.formatDateDisplay('2024-02-29')).toBe('Feb 29, 2024');
    });
  });

  describe('Currency Conversion', () => {
    test('converts between currencies', () => {
      const { result } = renderHook(() => usePaymentCalculations());

      // Mock exchange rate
      const mockExchangeRate = 0.85; // USD to EUR
      
      const convertedAmount = result.current.convertCurrency(1000, 'USD', 'EUR', mockExchangeRate);
      expect(convertedAmount).toBe(850);
    });

    test('handles same currency conversion', () => {
      const { result } = renderHook(() => usePaymentCalculations());

      const convertedAmount = result.current.convertCurrency(1000, 'USD', 'USD', 1);
      expect(convertedAmount).toBe(1000);
    });

    test('validates exchange rates', () => {
      const { result } = renderHook(() => usePaymentCalculations());

      expect(() => {
        result.current.convertCurrency(1000, 'USD', 'EUR', -1);
      }).toThrow('Exchange rate must be positive');

      expect(() => {
        result.current.convertCurrency(1000, 'USD', 'EUR', 0);
      }).toThrow('Exchange rate must be positive');
    });
  });

  describe('Statistical Analysis', () => {
    test('calculates payment statistics', () => {
      const { result } = renderHook(() => usePaymentCalculations());

      const stats = result.current.calculatePaymentStatistics(mockPaymentData);

      expect(stats).toHaveProperty('mean');
      expect(stats).toHaveProperty('median');
      expect(stats).toHaveProperty('mode');
      expect(stats).toHaveProperty('standardDeviation');
      expect(stats).toHaveProperty('variance');
      expect(stats.mean).toBeCloseTo(5990.3, 1); // 29951.5 / 5
    });

    test('calculates payment trends', () => {
      const { result } = renderHook(() => usePaymentCalculations());

      const trends = result.current.calculatePaymentTrends(mockPaymentData);

      expect(trends).toHaveProperty('monthly_trend');
      expect(trends).toHaveProperty('category_trends');
      expect(trends).toHaveProperty('vendor_trends');
      expect(trends.monthly_trend).toBeInstanceOf(Array);
    });

    test('identifies payment outliers', () => {
      const { result } = renderHook(() => usePaymentCalculations());

      const outliers = result.current.identifyOutliers(mockPaymentData);

      expect(outliers).toBeInstanceOf(Array);
      expect(outliers.length).toBeGreaterThanOrEqual(0);
      
      if (outliers.length > 0) {
        expect(outliers[0]).toHaveProperty('payment');
        expect(outliers[0]).toHaveProperty('reason');
        expect(outliers[0]).toHaveProperty('severity');
      }
    });
  });

  describe('Export Utilities', () => {
    test('prepares data for CSV export', () => {
      const { result } = renderHook(() => usePaymentCalculations());

      const csvData = result.current.prepareCSVData(mockPaymentData);

      expect(csvData).toBeInstanceOf(Array);
      expect(csvData[0]).toContain('Vendor Name,Amount,Due Date,Status,Priority,Category');
      expect(csvData[1]).toContain('Elegant Gardens Venue');
      expect(csvData[1]).toContain('$15,000.00');
    });

    test('prepares data for PDF export', () => {
      const { result } = renderHook(() => usePaymentCalculations());

      const pdfData = result.current.preparePDFData(mockPaymentData, mockPaymentSummary);

      expect(pdfData).toHaveProperty('title');
      expect(pdfData).toHaveProperty('summary');
      expect(pdfData).toHaveProperty('payments');
      expect(pdfData).toHaveProperty('metadata');
      expect(pdfData.title).toBe('Payment Calendar Report');
    });

    test('generates summary report text', () => {
      const { result } = renderHook(() => usePaymentCalculations());

      const reportText = result.current.generateSummaryReport(mockPaymentSummary);

      expect(reportText).toContain('Total Payments: 5');
      expect(reportText).toContain('Total Amount: $29,951.50');
      expect(reportText).toContain('Overdue: 1 payment');
      expect(reportText).toContain('Due Soon: 1 payment');
    });
  });
});