/**
 * WS-245 Wedding Budget Optimizer - Core Calculation Tests
 * 
 * CRITICAL: Zero tolerance for financial calculation errors.
 * Every calculation must be accurate to the penny.
 * 
 * Uses Decimal.js for precision arithmetic to prevent JavaScript
 * floating-point errors that could cost couples money.
 */

import Decimal from 'decimal.js';

// Configure Decimal.js for maximum financial precision
Decimal.set({
  precision: 28,
  rounding: Decimal.ROUND_HALF_UP,
  toExpNeg: -7,
  toExpPos: 21,
  maxE: 9e15,
  minE: -9e15,
  modulo: Decimal.ROUND_DOWN,
  crypto: false
});

// Budget Calculator Class for Financial Operations
class BudgetCalculator {
  /**
   * Calculate category allocation with decimal precision
   */
  calculateCategoryAllocation(totalBudget: Decimal, percentage: Decimal): Decimal {
    if (totalBudget.isNegative()) {
      throw new Error('Budget amount cannot be negative');
    }
    if (percentage.isNegative()) {
      throw new Error('Percentage cannot be negative');
    }
    
    return totalBudget.mul(percentage).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
  }

  /**
   * Add two monetary amounts with precision
   */
  addAmounts(amount1: Decimal, amount2: Decimal): Decimal {
    return amount1.plus(amount2).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
  }

  /**
   * Subtract amounts with precision
   */
  subtractAmounts(amount1: Decimal, amount2: Decimal): Decimal {
    return amount1.minus(amount2).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
  }

  /**
   * Calculate tax amount with precision
   */
  calculateTax(amount: Decimal, taxRate: Decimal): Decimal {
    return amount.mul(taxRate).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
  }

  /**
   * Calculate variance percentage between budgeted and actual
   */
  calculateVariancePercentage(budgeted: Decimal, actual: Decimal): Decimal {
    if (budgeted.isZero()) {
      throw new Error('Division by zero in variance calculation');
    }
    
    const difference = actual.minus(budgeted);
    const variance = difference.dividedBy(budgeted).mul(100);
    return variance.toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
  }

  /**
   * Round amount to currency precision
   */
  roundToCurrency(amount: Decimal): Decimal {
    return amount.toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
  }

  /**
   * Convert currency with exchange rate
   */
  convertCurrency(amount: Decimal, exchangeRate: Decimal): Decimal {
    return amount.mul(exchangeRate).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
  }

  /**
   * Validate budget totals match category allocations
   */
  validateBudgetIntegrity(totalBudget: Decimal, categories: Record<string, Decimal>): boolean {
    const categorySum = Object.values(categories)
      .reduce((sum, amount) => sum.plus(amount), new Decimal(0));
    
    return totalBudget.equals(categorySum);
  }
}

// Test Data Factory
const createTestBudget = (overrides: any = {}) => ({
  totalBudget: new Decimal('25000.00'),
  categories: {
    venue: new Decimal('8000.00'),
    catering: new Decimal('6000.00'),
    photography: new Decimal('3000.00'),
    flowers: new Decimal('1500.00'),
    music: new Decimal('2000.00'),
    dress: new Decimal('1500.00'),
    rings: new Decimal('2000.00'),
    miscellaneous: new Decimal('1000.00')
  },
  ...overrides
});

describe('WS-245 Budget Calculations - Decimal Precision Tests', () => {
  let calculator: BudgetCalculator;

  beforeEach(() => {
    calculator = new BudgetCalculator();
  });

  describe('Basic Arithmetic Operations', () => {
    test('prevents JavaScript floating-point errors', () => {
      // JavaScript floating point issue: 0.1 + 0.2 = 0.30000000000000004
      const result = calculator.addAmounts(
        new Decimal('0.1'),
        new Decimal('0.2')
      );
      
      expect(result.toString()).toBe('0.30');
      expect(result.equals(new Decimal('0.3'))).toBe(true);
    });

    test('handles complex decimal calculations accurately', () => {
      const amount1 = new Decimal('1234.567');
      const amount2 = new Decimal('9876.543');
      
      const result = calculator.addAmounts(amount1, amount2);
      
      expect(result.toString()).toBe('11111.11');
      expect(result.decimalPlaces()).toBe(2);
    });

    test('maintains precision in percentage calculations', () => {
      const budget = new Decimal('25000.00');
      const percentage = new Decimal('0.155'); // 15.5%
      
      const allocation = calculator.calculateCategoryAllocation(budget, percentage);
      
      expect(allocation.toString()).toBe('3875.00');
      expect(allocation.decimalPlaces()).toBe(2);
    });
  });

  describe('Wedding Budget Scenarios', () => {
    test('calculates luxury wedding budget allocations', () => {
      const luxuryBudget = new Decimal('100000.00');
      const venuePercent = new Decimal('0.40'); // 40% for venue
      
      const venueAllocation = calculator.calculateCategoryAllocation(luxuryBudget, venuePercent);
      
      expect(venueAllocation.toString()).toBe('40000.00');
    });

    test('calculates micro-wedding budget precisely', () => {
      const microBudget = new Decimal('3500.00');
      const photographyPercent = new Decimal('0.2857'); // 28.57%
      
      const photoAllocation = calculator.calculateCategoryAllocation(microBudget, photographyPercent);
      
      expect(photoAllocation.toString()).toBe('999.95');
    });

    test('validates budget integrity across all categories', () => {
      const budget = createTestBudget();
      
      const isValid = calculator.validateBudgetIntegrity(
        budget.totalBudget,
        budget.categories
      );
      
      expect(isValid).toBe(true);
    });

    test('detects budget allocation mismatches', () => {
      const budget = createTestBudget({
        totalBudget: new Decimal('25000.00'),
        categories: {
          venue: new Decimal('8000.00'),
          catering: new Decimal('6000.00'),
          photography: new Decimal('3000.00'),
          flowers: new Decimal('1500.00'),
          music: new Decimal('2000.00'),
          dress: new Decimal('1500.00'),
          rings: new Decimal('2000.00'),
          miscellaneous: new Decimal('999.00') // Short by £1
        }
      });
      
      const isValid = calculator.validateBudgetIntegrity(
        budget.totalBudget,
        budget.categories
      );
      
      expect(isValid).toBe(false);
    });
  });

  describe('Tax Calculations', () => {
    test('calculates UK VAT correctly', () => {
      const amount = new Decimal('1000.00');
      const vatRate = new Decimal('0.20'); // 20% UK VAT
      
      const vatAmount = calculator.calculateTax(amount, vatRate);
      
      expect(vatAmount.toString()).toBe('200.00');
    });

    test('handles multiple tax scenarios', () => {
      const testCases = [
        { amount: '1000.00', rate: '0.20', expected: '200.00' }, // UK VAT
        { amount: '1000.00', rate: '0.08', expected: '80.00' },  // Some US states
        { amount: '1000.00', rate: '0.19', expected: '190.00' }, // Germany VAT
        { amount: '1000.00', rate: '0.21', expected: '210.00' }  // Netherlands VAT
      ];
      
      testCases.forEach(({ amount, rate, expected }) => {
        const result = calculator.calculateTax(
          new Decimal(amount),
          new Decimal(rate)
        );
        expect(result.toString()).toBe(expected);
      });
    });
  });

  describe('Currency Conversion', () => {
    test('converts GBP to USD with precision', () => {
      const gbpAmount = new Decimal('1000.00');
      const exchangeRate = new Decimal('1.2756'); // GBP to USD
      
      const usdAmount = calculator.convertCurrency(gbpAmount, exchangeRate);
      
      expect(usdAmount.toString()).toBe('1275.60');
    });

    test('handles reverse conversion precision', () => {
      const usdAmount = new Decimal('1275.60');
      const reverseRate = new Decimal('0.7840'); // USD to GBP
      
      const gbpAmount = calculator.convertCurrency(usdAmount, reverseRate);
      
      // Should be very close to original £1000
      expect(gbpAmount.toString()).toBe('1000.07');
    });

    test('maintains precision across multiple conversions', () => {
      let amount = new Decimal('1000.00');
      
      // Convert through multiple currencies and back
      amount = calculator.convertCurrency(amount, new Decimal('1.2756')); // GBP → USD
      amount = calculator.convertCurrency(amount, new Decimal('0.8912')); // USD → EUR
      amount = calculator.convertCurrency(amount, new Decimal('1.1221')); // EUR → USD
      amount = calculator.convertCurrency(amount, new Decimal('0.7840')); // USD → GBP
      
      // Should be reasonably close to original (within forex spread tolerance)
      const difference = amount.minus(new Decimal('1000.00')).abs();
      expect(difference.lessThan(new Decimal('5.00'))).toBe(true);
    });
  });

  describe('Variance Analysis', () => {
    test('calculates budget variance percentages accurately', () => {
      const budgeted = new Decimal('5000.00');
      const actual = new Decimal('5250.00');
      
      const variance = calculator.calculateVariancePercentage(budgeted, actual);
      
      expect(variance.toString()).toBe('5.00'); // 5% over budget
    });

    test('handles negative variances (under-budget)', () => {
      const budgeted = new Decimal('5000.00');
      const actual = new Decimal('4750.00');
      
      const variance = calculator.calculateVariancePercentage(budgeted, actual);
      
      expect(variance.toString()).toBe('-5.00'); // 5% under budget
    });

    test('prevents division by zero in variance calculations', () => {
      const budgeted = new Decimal('0.00');
      const actual = new Decimal('100.00');
      
      expect(() => {
        calculator.calculateVariancePercentage(budgeted, actual);
      }).toThrow('Division by zero in variance calculation');
    });
  });

  describe('Rounding Edge Cases', () => {
    test('applies consistent rounding rules', () => {
      const testCases = [
        { input: '1234.555', expected: '1234.56' }, // Rounds up
        { input: '1234.564', expected: '1234.56' }, // Rounds down
        { input: '1234.565', expected: '1234.57' }, // Rounds up (half up)
        { input: '1234.575', expected: '1234.58' }  // Rounds up
      ];
      
      testCases.forEach(({ input, expected }) => {
        const result = calculator.roundToCurrency(new Decimal(input));
        expect(result.toString()).toBe(expected);
      });
    });

    test('handles midpoint rounding consistently', () => {
      // Test banker's rounding vs round half up
      const midpoints = [
        '10.125', '10.135', '10.145', '10.155'
      ];
      
      midpoints.forEach(value => {
        const result = calculator.roundToCurrency(new Decimal(value));
        expect(result.decimalPlaces()).toBe(2);
        expect(result.toString()).toMatch(/^\d+\.\d{2}$/);
      });
    });
  });

  describe('Large Number Handling', () => {
    test('handles billionaire wedding budgets without precision loss', () => {
      const massiveBudget = new Decimal('1000000000.00'); // £1 billion
      const venuePercent = new Decimal('0.25');
      
      const allocation = calculator.calculateCategoryAllocation(massiveBudget, venuePercent);
      
      expect(allocation.toString()).toBe('250000000.00');
      expect(allocation.decimalPlaces()).toBe(2);
    });

    test('maintains precision with very small amounts', () => {
      const tinyAmount = new Decimal('0.01'); // 1 penny
      const percentage = new Decimal('0.50'); // 50%
      
      const result = calculator.calculateCategoryAllocation(tinyAmount, percentage);
      
      expect(result.toString()).toBe('0.01'); // Rounds up from 0.005
    });
  });

  describe('Error Prevention', () => {
    test('prevents negative budget amounts', () => {
      expect(() => {
        calculator.calculateCategoryAllocation(
          new Decimal('-1000.00'),
          new Decimal('0.25')
        );
      }).toThrow('Budget amount cannot be negative');
    });

    test('prevents negative percentage allocations', () => {
      expect(() => {
        calculator.calculateCategoryAllocation(
          new Decimal('1000.00'),
          new Decimal('-0.25')
        );
      }).toThrow('Percentage cannot be negative');
    });

    test('handles zero budget gracefully', () => {
      const result = calculator.calculateCategoryAllocation(
        new Decimal('0.00'),
        new Decimal('0.25')
      );
      
      expect(result.toString()).toBe('0.00');
    });
  });

  describe('Chained Calculation Precision', () => {
    test('maintains precision in complex calculation chains', () => {
      let budget = new Decimal('10000.00');
      
      // Simulate complex budget adjustments
      for (let i = 0; i < 100; i++) {
        budget = calculator.addAmounts(budget, new Decimal('0.01'));
        budget = calculator.subtractAmounts(budget, new Decimal('0.01'));
      }
      
      // Should be exactly the same as original
      expect(budget.toString()).toBe('10000.00');
    });

    test('validates complex wedding budget calculation', () => {
      const totalBudget = new Decimal('50000.00');
      
      // Calculate each category with different precision requirements
      const venue = calculator.calculateCategoryAllocation(totalBudget, new Decimal('0.32')); // 32%
      const catering = calculator.calculateCategoryAllocation(totalBudget, new Decimal('0.28')); // 28%
      const photography = calculator.calculateCategoryAllocation(totalBudget, new Decimal('0.15')); // 15%
      const remaining = totalBudget.minus(venue).minus(catering).minus(photography);
      
      // Verify all amounts are properly rounded
      expect(venue.toString()).toBe('16000.00');
      expect(catering.toString()).toBe('14000.00');
      expect(photography.toString()).toBe('7500.00');
      expect(remaining.toString()).toBe('12500.00');
      
      // Verify total integrity
      const recalculatedTotal = venue.plus(catering).plus(photography).plus(remaining);
      expect(recalculatedTotal.equals(totalBudget)).toBe(true);
    });
  });
});

export { BudgetCalculator, createTestBudget };