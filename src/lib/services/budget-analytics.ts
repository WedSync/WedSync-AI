import { startOfMonth, endOfMonth, subMonths, format } from 'date-fns';

export interface BudgetTransaction {
  id: string;
  date: Date;
  amount: number;
  category: string;
  vendor?: string;
  description: string;
  tags?: string[];
}

export interface SpendingTrend {
  period: string;
  totalSpent: number;
  categoryBreakdown: Record<string, number>;
  percentageChange: number;
  averageTransaction: number;
}

export interface BudgetForecast {
  projectedTotal: number;
  confidence: number;
  monthlyProjections: Array<{
    month: string;
    projected: number;
    confidence: number;
  }>;
  riskFactors: string[];
  recommendations: string[];
}

export interface VendorComparison {
  vendorId: string;
  vendorName: string;
  totalSpent: number;
  averageTransaction: number;
  transactionCount: number;
  categoryBreakdown: Record<string, number>;
  priceComparisonPercent: number; // compared to market average
  rating?: number;
}

export interface SavingsOpportunity {
  id: string;
  type:
    | 'vendor_switch'
    | 'bulk_discount'
    | 'timing'
    | 'category_optimization'
    | 'payment_method';
  title: string;
  description: string;
  potentialSavings: number;
  confidence: number;
  actionRequired: string;
  priority: 'high' | 'medium' | 'low';
}

export class BudgetAnalyticsService {
  private transactions: BudgetTransaction[] = [];
  private marketData: Map<string, number> = new Map(); // vendor -> average price

  constructor(transactions: BudgetTransaction[] = []) {
    this.transactions = transactions;
    this.initializeMarketData();
  }

  private initializeMarketData() {
    // Initialize with sample market data for vendor comparisons
    this.marketData.set('photography', 3500);
    this.marketData.set('catering', 8000);
    this.marketData.set('venue', 5000);
    this.marketData.set('flowers', 2000);
    this.marketData.set('music', 1500);
    this.marketData.set('videography', 2500);
    this.marketData.set('decoration', 3000);
  }

  // Calculate spending trends over time
  calculateSpendingTrends(months: number = 6): SpendingTrend[] {
    const trends: SpendingTrend[] = [];
    const now = new Date();

    for (let i = 0; i < months; i++) {
      const monthStart = startOfMonth(subMonths(now, i));
      const monthEnd = endOfMonth(subMonths(now, i));

      const monthTransactions = this.transactions.filter(
        (t) => t.date >= monthStart && t.date <= monthEnd,
      );

      const totalSpent = monthTransactions.reduce(
        (sum, t) => sum + t.amount,
        0,
      );
      const categoryBreakdown = this.getCategoryBreakdown(monthTransactions);

      // Calculate percentage change from previous month
      const prevMonthTotal =
        i < months - 1
          ? trends[trends.length - 1]?.totalSpent || 0
          : totalSpent;
      const percentageChange =
        prevMonthTotal > 0
          ? ((totalSpent - prevMonthTotal) / prevMonthTotal) * 100
          : 0;

      trends.push({
        period: format(monthStart, 'MMM yyyy'),
        totalSpent,
        categoryBreakdown,
        percentageChange,
        averageTransaction:
          monthTransactions.length > 0
            ? totalSpent / monthTransactions.length
            : 0,
      });
    }

    return trends.reverse();
  }

  // Generate budget forecast based on historical data
  generateBudgetForecast(monthsAhead: number = 3): BudgetForecast {
    const trends = this.calculateSpendingTrends(6);
    const averageMonthlySpend =
      trends.reduce((sum, t) => sum + t.totalSpent, 0) / trends.length;

    // Calculate trend direction
    const recentTrend = this.calculateTrendDirection(trends);
    const seasonalFactor = this.calculateSeasonalFactor();

    const monthlyProjections = [];
    let totalProjected = 0;

    for (let i = 1; i <= monthsAhead; i++) {
      const baseProjection = averageMonthlySpend * (1 + recentTrend * i * 0.1);
      const seasonalAdjustment = baseProjection * seasonalFactor;
      const projected = baseProjection + seasonalAdjustment;

      monthlyProjections.push({
        month: format(
          new Date(Date.now() + i * 30 * 24 * 60 * 60 * 1000),
          'MMM yyyy',
        ),
        projected: Math.round(projected),
        confidence: Math.max(0.5, 0.9 - i * 0.1), // Confidence decreases with time
      });

      totalProjected += projected;
    }

    const riskFactors = this.identifyRiskFactors(trends);
    const recommendations = this.generateRecommendations(
      trends,
      totalProjected,
    );

    return {
      projectedTotal: Math.round(totalProjected),
      confidence: 0.75,
      monthlyProjections,
      riskFactors,
      recommendations,
    };
  }

  // Compare vendor prices and performance
  compareVendors(category?: string): VendorComparison[] {
    const vendorMap = new Map<string, BudgetTransaction[]>();

    // Group transactions by vendor
    this.transactions.forEach((t) => {
      if (t.vendor && (!category || t.category === category)) {
        const existing = vendorMap.get(t.vendor) || [];
        existing.push(t);
        vendorMap.set(t.vendor, existing);
      }
    });

    const comparisons: VendorComparison[] = [];

    vendorMap.forEach((transactions, vendorName) => {
      const totalSpent = transactions.reduce((sum, t) => sum + t.amount, 0);
      const categoryBreakdown = this.getCategoryBreakdown(transactions);
      const primaryCategory = Object.keys(categoryBreakdown)[0] || 'general';
      const marketAverage =
        this.marketData.get(primaryCategory.toLowerCase()) || totalSpent;

      comparisons.push({
        vendorId: vendorName.toLowerCase().replace(/\s+/g, '-'),
        vendorName,
        totalSpent,
        averageTransaction: totalSpent / transactions.length,
        transactionCount: transactions.length,
        categoryBreakdown,
        priceComparisonPercent:
          ((totalSpent - marketAverage) / marketAverage) * 100,
        rating: Math.random() * 2 + 3, // Simulated rating between 3-5
      });
    });

    // Sort by total spent descending
    return comparisons.sort((a, b) => b.totalSpent - a.totalSpent);
  }

  // Identify savings opportunities
  identifySavingsOpportunities(): SavingsOpportunity[] {
    const opportunities: SavingsOpportunity[] = [];
    const vendorComparisons = this.compareVendors();
    const categoryAnalysis = this.analyzeCategorySpending();

    // Check for overpriced vendors
    vendorComparisons.forEach((vendor) => {
      if (vendor.priceComparisonPercent > 20) {
        opportunities.push({
          id: `vendor-${vendor.vendorId}`,
          type: 'vendor_switch',
          title: `Consider alternative to ${vendor.vendorName}`,
          description: `${vendor.vendorName} is ${Math.round(vendor.priceComparisonPercent)}% above market average`,
          potentialSavings: Math.round(vendor.totalSpent * 0.2),
          confidence: 0.7,
          actionRequired: 'Research alternative vendors in this category',
          priority: vendor.priceComparisonPercent > 40 ? 'high' : 'medium',
        });
      }
    });

    // Check for bulk discount opportunities
    const frequentCategories = Object.entries(categoryAnalysis).filter(
      ([_, data]) => data.transactionCount > 5,
    );

    frequentCategories.forEach(([category, data]) => {
      opportunities.push({
        id: `bulk-${category}`,
        type: 'bulk_discount',
        title: `Bulk purchase opportunity for ${category}`,
        description: `You have ${data.transactionCount} separate transactions in ${category}`,
        potentialSavings: Math.round(data.total * 0.1),
        confidence: 0.6,
        actionRequired: 'Contact vendor about bulk pricing',
        priority: 'medium',
      });
    });

    // Check for timing opportunities (off-season bookings)
    const seasonalCategories = ['venue', 'catering', 'photography'];
    seasonalCategories.forEach((category) => {
      const categoryData = categoryAnalysis[category];
      if (categoryData && categoryData.total > 2000) {
        opportunities.push({
          id: `timing-${category}`,
          type: 'timing',
          title: `Off-season booking for ${category}`,
          description: 'Consider booking during off-peak months for discounts',
          potentialSavings: Math.round(categoryData.total * 0.15),
          confidence: 0.8,
          actionRequired: 'Check vendor availability for off-peak dates',
          priority: 'low',
        });
      }
    });

    // Check for category optimization
    const budgetThreshold = this.calculateTotalBudget() * 0.3;
    Object.entries(categoryAnalysis).forEach(([category, data]) => {
      if (data.total > budgetThreshold) {
        opportunities.push({
          id: `optimize-${category}`,
          type: 'category_optimization',
          title: `Optimize ${category} spending`,
          description: `${category} represents ${Math.round((data.total / this.calculateTotalBudget()) * 100)}% of your budget`,
          potentialSavings: Math.round(data.total * 0.05),
          confidence: 0.5,
          actionRequired: 'Review and prioritize items in this category',
          priority: 'medium',
        });
      }
    });

    // Check for payment method discounts
    if (this.calculateTotalBudget() > 10000) {
      opportunities.push({
        id: 'payment-method',
        type: 'payment_method',
        title: 'Payment method optimization',
        description: 'Use cashback credit cards or early payment discounts',
        potentialSavings: Math.round(this.calculateTotalBudget() * 0.02),
        confidence: 0.9,
        actionRequired: 'Review payment options with vendors',
        priority: 'low',
      });
    }

    // Sort by potential savings
    return opportunities.sort(
      (a, b) => b.potentialSavings - a.potentialSavings,
    );
  }

  // Helper methods
  private getCategoryBreakdown(
    transactions: BudgetTransaction[],
  ): Record<string, number> {
    const breakdown: Record<string, number> = {};

    transactions.forEach((t) => {
      breakdown[t.category] = (breakdown[t.category] || 0) + t.amount;
    });

    return breakdown;
  }

  private calculateTrendDirection(trends: SpendingTrend[]): number {
    if (trends.length < 2) return 0;

    const recentTrends = trends.slice(-3);
    const avgChange =
      recentTrends.reduce((sum, t) => sum + t.percentageChange, 0) /
      recentTrends.length;

    return avgChange / 100; // Convert percentage to decimal
  }

  private calculateSeasonalFactor(): number {
    const month = new Date().getMonth();
    // Wedding season peaks in summer/fall
    const seasonalFactors = [
      0.7, // Jan
      0.8, // Feb
      0.9, // Mar
      1.1, // Apr
      1.3, // May
      1.4, // Jun
      1.3, // Jul
      1.2, // Aug
      1.3, // Sep
      1.2, // Oct
      0.9, // Nov
      0.8, // Dec
    ];

    return seasonalFactors[month] - 1; // Return as adjustment factor
  }

  private identifyRiskFactors(trends: SpendingTrend[]): string[] {
    const risks: string[] = [];

    // Check for rapid spending increase
    const recentIncrease = trends
      .slice(-2)
      .some((t) => t.percentageChange > 20);
    if (recentIncrease) {
      risks.push('Rapid spending increase detected');
    }

    // Check for category concentration
    const latestTrend = trends[trends.length - 1];
    if (latestTrend) {
      const categories = Object.entries(latestTrend.categoryBreakdown);
      const dominantCategory = categories.find(
        ([_, amount]) => amount > latestTrend.totalSpent * 0.5,
      );
      if (dominantCategory) {
        risks.push(`High concentration in ${dominantCategory[0]} category`);
      }
    }

    // Check for irregular patterns
    const avgSpending =
      trends.reduce((sum, t) => sum + t.totalSpent, 0) / trends.length;
    const hasIrregular = trends.some(
      (t) => Math.abs(t.totalSpent - avgSpending) > avgSpending * 0.5,
    );
    if (hasIrregular) {
      risks.push('Irregular spending patterns detected');
    }

    return risks;
  }

  private generateRecommendations(
    trends: SpendingTrend[],
    projectedTotal: number,
  ): string[] {
    const recommendations: string[] = [];
    const avgMonthlySpend =
      trends.reduce((sum, t) => sum + t.totalSpent, 0) / trends.length;

    if (projectedTotal > avgMonthlySpend * 4) {
      recommendations.push('Consider setting stricter monthly spending limits');
    }

    // Check for underutilized categories
    const allCategories = new Set<string>();
    trends.forEach((t) =>
      Object.keys(t.categoryBreakdown).forEach((c) => allCategories.add(c)),
    );

    if (allCategories.size < 5) {
      recommendations.push(
        'Diversify spending across more categories to reduce risk',
      );
    }

    // Seasonal recommendations
    const month = new Date().getMonth();
    if (month >= 3 && month <= 9) {
      recommendations.push('Book off-season vendors now for better rates');
    }

    recommendations.push(
      'Review and negotiate contracts with high-value vendors',
    );
    recommendations.push('Set up automatic budget alerts for overspending');

    return recommendations;
  }

  private analyzeCategorySpending(): Record<
    string,
    { total: number; transactionCount: number }
  > {
    const analysis: Record<
      string,
      { total: number; transactionCount: number }
    > = {};

    this.transactions.forEach((t) => {
      if (!analysis[t.category]) {
        analysis[t.category] = { total: 0, transactionCount: 0 };
      }
      analysis[t.category].total += t.amount;
      analysis[t.category].transactionCount++;
    });

    return analysis;
  }

  private calculateTotalBudget(): number {
    return this.transactions.reduce((sum, t) => sum + t.amount, 0);
  }

  // Add new transactions
  addTransaction(transaction: BudgetTransaction) {
    this.transactions.push(transaction);
  }

  // Get all transactions
  getTransactions(): BudgetTransaction[] {
    return this.transactions;
  }

  // Clear all data
  clearData() {
    this.transactions = [];
  }
}
