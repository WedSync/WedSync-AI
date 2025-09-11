/**
 * Advanced Currency Converter for International Weddings
 * Team D - Round 2 WS-163 Implementation
 *
 * Provides real-time currency conversion, historical rates, and smart budget
 * management for destination and international weddings.
 */

import { BudgetItem, BudgetCategory } from './advanced-budget-system';

// ==================== TYPES AND INTERFACES ====================

export interface CurrencyRate {
  baseCurrency: string;
  targetCurrency: string;
  rate: number;
  timestamp: string;
  source: RateSource;
  bid?: number;
  ask?: number;
  spread?: number;
}

export interface CurrencyConversion {
  amount: number;
  fromCurrency: string;
  toCurrency: string;
  convertedAmount: number;
  rate: number;
  timestamp: string;
  fees?: ConversionFees;
  provider: string;
}

export interface ConversionFees {
  exchangeFee: number;
  bankFee: number;
  cardFee: number;
  totalFees: number;
  effectiveRate: number;
}

export interface CurrencyInfo {
  code: string;
  name: string;
  symbol: string;
  decimalPlaces: number;
  country: string;
  flag: string;
  isPopular: boolean;
  weddingRelevant: boolean;
}

export interface WeddingCurrencyPair {
  homeCurrency: string;
  destinationCurrency: string;
  currentRate: number;
  averageRate: number;
  bestRate: number;
  worstRate: number;
  trend: RateTrend;
  prediction: RatePrediction;
  hedgingRecommendation?: HedgingRecommendation;
}

export interface RateTrend {
  direction: 'up' | 'down' | 'stable';
  strength: number;
  period: string;
  volatility: number;
}

export interface RatePrediction {
  nextWeek: number;
  nextMonth: number;
  weddingDate: number;
  confidence: number;
  factors: PredictionFactor[];
}

export interface PredictionFactor {
  name: string;
  impact: 'positive' | 'negative' | 'neutral';
  weight: number;
  description: string;
}

export interface HedgingRecommendation {
  strategy: HedgingStrategy;
  timing: string;
  expectedSavings: number;
  riskLevel: 'low' | 'medium' | 'high';
  description: string;
}

export interface CurrencyAlert {
  id: string;
  type: AlertType;
  targetRate: number;
  currentRate: number;
  currency: string;
  baseCurrency: string;
  threshold: number;
  isActive: boolean;
  createdAt: string;
  triggeredAt?: string;
  message: string;
}

export interface ExchangeProvider {
  name: string;
  id: string;
  type: ProviderType;
  features: ProviderFeature[];
  fees: FeeStructure;
  supportedCurrencies: string[];
  deliveryMethods: DeliveryMethod[];
  processingTime: string;
  minimumAmount: number;
  maximumAmount: number;
  rating: number;
  isRecommended: boolean;
}

export interface FeeStructure {
  exchangeRate: number; // Markup percentage
  fixedFee: number;
  percentageFee: number;
  minimumFee: number;
  transferFee: number;
  cardFee: number;
}

export enum RateSource {
  BANK = 'bank',
  EXCHANGE = 'exchange',
  API = 'api',
  REAL_TIME = 'real_time',
}

export enum HedgingStrategy {
  FORWARD_CONTRACT = 'forward_contract',
  LIMIT_ORDER = 'limit_order',
  REGULAR_PURCHASE = 'regular_purchase',
  WAIT_AND_WATCH = 'wait_and_watch',
}

export enum AlertType {
  RATE_TARGET = 'rate_target',
  RATE_DROP = 'rate_drop',
  RATE_INCREASE = 'rate_increase',
  VOLATILITY = 'volatility',
  PAYMENT_DUE = 'payment_due',
}

export enum ProviderType {
  BANK = 'bank',
  ONLINE_EXCHANGE = 'online_exchange',
  MONEY_TRANSFER = 'money_transfer',
  FINTECH = 'fintech',
}

export enum ProviderFeature {
  REAL_TIME_RATES = 'real_time_rates',
  RATE_ALERTS = 'rate_alerts',
  FORWARD_CONTRACTS = 'forward_contracts',
  SAME_DAY_TRANSFER = 'same_day_transfer',
  CASH_PICKUP = 'cash_pickup',
  MOBILE_APP = 'mobile_app',
}

export enum DeliveryMethod {
  BANK_TRANSFER = 'bank_transfer',
  CASH_PICKUP = 'cash_pickup',
  HOME_DELIVERY = 'home_delivery',
  DIGITAL_WALLET = 'digital_wallet',
}

// ==================== ADVANCED CURRENCY CONVERTER ====================

export class AdvancedCurrencyConverter {
  private static instance: AdvancedCurrencyConverter;
  private rateCache: Map<string, CurrencyRate[]> = new Map();
  private currencies: Map<string, CurrencyInfo> = new Map();
  private providers: Map<string, ExchangeProvider> = new Map();
  private alerts: Map<string, CurrencyAlert> = new Map();
  private rateHistory: Map<string, CurrencyRate[]> = new Map();
  private updateInterval: NodeJS.Timeout | null = null;

  private constructor() {
    this.initializeCurrencies();
    this.initializeProviders();
    this.startRateUpdates();
  }

  public static getInstance(): AdvancedCurrencyConverter {
    if (!AdvancedCurrencyConverter.instance) {
      AdvancedCurrencyConverter.instance = new AdvancedCurrencyConverter();
    }
    return AdvancedCurrencyConverter.instance;
  }

  // ==================== INITIALIZATION ====================

  private initializeCurrencies(): void {
    const popularCurrencies: CurrencyInfo[] = [
      {
        code: 'USD',
        name: 'US Dollar',
        symbol: '$',
        decimalPlaces: 2,
        country: 'United States',
        flag: '🇺🇸',
        isPopular: true,
        weddingRelevant: true,
      },
      {
        code: 'EUR',
        name: 'Euro',
        symbol: '€',
        decimalPlaces: 2,
        country: 'European Union',
        flag: '🇪🇺',
        isPopular: true,
        weddingRelevant: true,
      },
      {
        code: 'GBP',
        name: 'British Pound',
        symbol: '£',
        decimalPlaces: 2,
        country: 'United Kingdom',
        flag: '🇬🇧',
        isPopular: true,
        weddingRelevant: true,
      },
      {
        code: 'CAD',
        name: 'Canadian Dollar',
        symbol: 'C$',
        decimalPlaces: 2,
        country: 'Canada',
        flag: '🇨🇦',
        isPopular: true,
        weddingRelevant: true,
      },
      {
        code: 'AUD',
        name: 'Australian Dollar',
        symbol: 'A$',
        decimalPlaces: 2,
        country: 'Australia',
        flag: '🇦🇺',
        isPopular: true,
        weddingRelevant: true,
      },
      {
        code: 'JPY',
        name: 'Japanese Yen',
        symbol: '¥',
        decimalPlaces: 0,
        country: 'Japan',
        flag: '🇯🇵',
        isPopular: true,
        weddingRelevant: true,
      },
      {
        code: 'MXN',
        name: 'Mexican Peso',
        symbol: '$',
        decimalPlaces: 2,
        country: 'Mexico',
        flag: '🇲🇽',
        isPopular: true,
        weddingRelevant: true,
      },
      {
        code: 'THB',
        name: 'Thai Baht',
        symbol: '฿',
        decimalPlaces: 2,
        country: 'Thailand',
        flag: '🇹🇭',
        isPopular: false,
        weddingRelevant: true,
      },
      {
        code: 'INR',
        name: 'Indian Rupee',
        symbol: '₹',
        decimalPlaces: 2,
        country: 'India',
        flag: '🇮🇳',
        isPopular: true,
        weddingRelevant: true,
      },
      {
        code: 'CNY',
        name: 'Chinese Yuan',
        symbol: '¥',
        decimalPlaces: 2,
        country: 'China',
        flag: '🇨🇳',
        isPopular: true,
        weddingRelevant: false,
      },
    ];

    popularCurrencies.forEach((currency) => {
      this.currencies.set(currency.code, currency);
    });
  }

  private initializeProviders(): void {
    const exchangeProviders: ExchangeProvider[] = [
      {
        name: 'Wise (formerly TransferWise)',
        id: 'wise',
        type: ProviderType.FINTECH,
        features: [
          ProviderFeature.REAL_TIME_RATES,
          ProviderFeature.MOBILE_APP,
          ProviderFeature.SAME_DAY_TRANSFER,
        ],
        fees: {
          exchangeRate: 0.3, // 0.3% markup
          fixedFee: 1.5,
          percentageFee: 0.5,
          minimumFee: 1.0,
          transferFee: 0,
          cardFee: 1.0,
        },
        supportedCurrencies: ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY'],
        deliveryMethods: [
          DeliveryMethod.BANK_TRANSFER,
          DeliveryMethod.DIGITAL_WALLET,
        ],
        processingTime: '1-2 business days',
        minimumAmount: 1,
        maximumAmount: 1000000,
        rating: 4.8,
        isRecommended: true,
      },
      {
        name: 'XE Money',
        id: 'xe',
        type: ProviderType.ONLINE_EXCHANGE,
        features: [
          ProviderFeature.REAL_TIME_RATES,
          ProviderFeature.RATE_ALERTS,
          ProviderFeature.MOBILE_APP,
        ],
        fees: {
          exchangeRate: 1.0, // 1% markup
          fixedFee: 0,
          percentageFee: 0,
          minimumFee: 0,
          transferFee: 4.99,
          cardFee: 0,
        },
        supportedCurrencies: ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'MXN', 'THB'],
        deliveryMethods: [
          DeliveryMethod.BANK_TRANSFER,
          DeliveryMethod.CASH_PICKUP,
        ],
        processingTime: '1-4 business days',
        minimumAmount: 10,
        maximumAmount: 50000,
        rating: 4.5,
        isRecommended: true,
      },
      {
        name: 'Western Union',
        id: 'western_union',
        type: ProviderType.MONEY_TRANSFER,
        features: [
          ProviderFeature.CASH_PICKUP,
          ProviderFeature.SAME_DAY_TRANSFER,
          ProviderFeature.MOBILE_APP,
        ],
        fees: {
          exchangeRate: 3.0, // 3% markup
          fixedFee: 5.0,
          percentageFee: 0,
          minimumFee: 5.0,
          transferFee: 0,
          cardFee: 3.0,
        },
        supportedCurrencies: ['USD', 'EUR', 'GBP', 'MXN', 'THB', 'INR', 'CNY'],
        deliveryMethods: [
          DeliveryMethod.CASH_PICKUP,
          DeliveryMethod.BANK_TRANSFER,
          DeliveryMethod.HOME_DELIVERY,
        ],
        processingTime: 'Minutes to hours',
        minimumAmount: 1,
        maximumAmount: 10000,
        rating: 4.2,
        isRecommended: false,
      },
    ];

    exchangeProviders.forEach((provider) => {
      this.providers.set(provider.id, provider);
    });
  }

  private startRateUpdates(): void {
    // Update rates every 5 minutes
    this.updateInterval = setInterval(
      async () => {
        await this.updateAllRates();
      },
      5 * 60 * 1000,
    );

    // Initial update
    this.updateAllRates();
  }

  // ==================== CURRENCY CONVERSION ====================

  public async convertCurrency(
    amount: number,
    fromCurrency: string,
    toCurrency: string,
    providerId?: string,
  ): Promise<CurrencyConversion> {
    if (fromCurrency === toCurrency) {
      return {
        amount,
        fromCurrency,
        toCurrency,
        convertedAmount: amount,
        rate: 1,
        timestamp: new Date().toISOString(),
        provider: 'direct',
      };
    }

    const rate = await this.getCurrentRate(fromCurrency, toCurrency);
    const convertedAmount = amount * rate.rate;

    const conversion: CurrencyConversion = {
      amount,
      fromCurrency,
      toCurrency,
      convertedAmount,
      rate: rate.rate,
      timestamp: rate.timestamp,
      provider: providerId || rate.source,
    };

    // Calculate fees if provider specified
    if (providerId) {
      const provider = this.providers.get(providerId);
      if (provider) {
        conversion.fees = this.calculateFees(amount, convertedAmount, provider);
      }
    }

    return conversion;
  }

  public async convertBudgetItem(
    item: BudgetItem,
    targetCurrency: string,
  ): Promise<BudgetItem> {
    if (!item.actual_cost) return item;

    // Assume item currency is stored somewhere - for demo, assume USD
    const sourceCurrency = 'USD';

    if (sourceCurrency === targetCurrency) return item;

    const conversion = await this.convertCurrency(
      item.actual_cost,
      sourceCurrency,
      targetCurrency,
    );

    return {
      ...item,
      actual_cost: conversion.convertedAmount,
      notes: `${item.notes || ''}\nConverted from ${sourceCurrency} ${item.actual_cost} at rate ${conversion.rate.toFixed(4)}`,
    };
  }

  public async convertBudgetCategory(
    category: BudgetCategory,
    targetCurrency: string,
  ): Promise<BudgetCategory> {
    const convertedItems: BudgetItem[] = [];

    for (const item of category.items) {
      const convertedItem = await this.convertBudgetItem(item, targetCurrency);
      convertedItems.push(convertedItem);
    }

    // Convert allocated amount
    const allocatedConversion = await this.convertCurrency(
      category.allocated_amount,
      'USD',
      targetCurrency,
    );

    // Recalculate spent amount from converted items
    const spentAmount = convertedItems.reduce(
      (sum, item) => sum + (item.actual_cost || 0),
      0,
    );

    return {
      ...category,
      allocated_amount: allocatedConversion.convertedAmount,
      spent_amount: spentAmount,
      items: convertedItems,
    };
  }

  // ==================== RATE MANAGEMENT ====================

  private async getCurrentRate(
    fromCurrency: string,
    toCurrency: string,
  ): Promise<CurrencyRate> {
    const cacheKey = `${fromCurrency}-${toCurrency}`;
    const cached = this.rateCache.get(cacheKey);

    if (cached && cached.length > 0) {
      const latest = cached[cached.length - 1];
      const ageMinutes =
        (Date.now() - new Date(latest.timestamp).getTime()) / (1000 * 60);

      if (ageMinutes < 5) {
        // Use cached rate if less than 5 minutes old
        return latest;
      }
    }

    // Fetch fresh rate
    const rate = await this.fetchExchangeRate(fromCurrency, toCurrency);
    this.cacheRate(cacheKey, rate);

    return rate;
  }

  private async fetchExchangeRate(
    baseCurrency: string,
    targetCurrency: string,
  ): Promise<CurrencyRate> {
    try {
      // In a real implementation, this would call actual exchange rate APIs
      // For demo, we'll simulate realistic rates
      const mockRates = this.getMockExchangeRates();
      const rateKey = `${baseCurrency}-${targetCurrency}`;

      if (mockRates[rateKey]) {
        return {
          baseCurrency,
          targetCurrency,
          rate: mockRates[rateKey],
          timestamp: new Date().toISOString(),
          source: RateSource.API,
        };
      }

      // If direct rate not available, try inverse
      const inverseKey = `${targetCurrency}-${baseCurrency}`;
      if (mockRates[inverseKey]) {
        return {
          baseCurrency,
          targetCurrency,
          rate: 1 / mockRates[inverseKey],
          timestamp: new Date().toISOString(),
          source: RateSource.API,
        };
      }

      throw new Error(
        `Exchange rate not available for ${baseCurrency} to ${targetCurrency}`,
      );
    } catch (error) {
      console.error('[Currency] Failed to fetch exchange rate:', error);
      throw error;
    }
  }

  private getMockExchangeRates(): { [key: string]: number } {
    // Mock exchange rates - in reality, these would come from APIs
    return {
      'USD-EUR': 0.85,
      'USD-GBP': 0.73,
      'USD-CAD': 1.35,
      'USD-AUD': 1.52,
      'USD-JPY': 110.0,
      'USD-MXN': 20.5,
      'USD-THB': 33.2,
      'USD-INR': 82.1,
      'EUR-GBP': 0.86,
      'EUR-USD': 1.18,
      'GBP-USD': 1.37,
      'CAD-USD': 0.74,
      'AUD-USD': 0.66,
      'JPY-USD': 0.0091,
      'MXN-USD': 0.049,
      'THB-USD': 0.03,
      'INR-USD': 0.012,
    };
  }

  private cacheRate(cacheKey: string, rate: CurrencyRate): void {
    if (!this.rateCache.has(cacheKey)) {
      this.rateCache.set(cacheKey, []);
    }

    const cached = this.rateCache.get(cacheKey)!;
    cached.push(rate);

    // Keep only last 100 rates per pair
    if (cached.length > 100) {
      cached.splice(0, cached.length - 100);
    }

    // Also update history for analytics
    if (!this.rateHistory.has(cacheKey)) {
      this.rateHistory.set(cacheKey, []);
    }

    const history = this.rateHistory.get(cacheKey)!;
    history.push(rate);

    // Keep 30 days of history
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const filteredHistory = history.filter(
      (r) => new Date(r.timestamp).getTime() > thirtyDaysAgo,
    );
    this.rateHistory.set(cacheKey, filteredHistory);
  }

  private async updateAllRates(): Promise<void> {
    const popularPairs = [
      'USD-EUR',
      'USD-GBP',
      'USD-CAD',
      'USD-AUD',
      'USD-JPY',
      'EUR-GBP',
      'EUR-USD',
      'GBP-USD',
    ];

    for (const pair of popularPairs) {
      const [base, target] = pair.split('-');
      try {
        await this.fetchExchangeRate(base, target);
      } catch (error) {
        console.error(`[Currency] Failed to update rate for ${pair}:`, error);
      }
    }
  }

  // ==================== WEDDING-SPECIFIC FEATURES ====================

  public async createWeddingCurrencyPair(
    homeCurrency: string,
    destinationCurrency: string,
    weddingDate: string,
  ): Promise<WeddingCurrencyPair> {
    const currentRate = await this.getCurrentRate(
      homeCurrency,
      destinationCurrency,
    );
    const history = this.getRateHistory(homeCurrency, destinationCurrency);

    // Calculate statistics
    const rates = history.map((h) => h.rate);
    const averageRate =
      rates.reduce((sum, rate) => sum + rate, 0) / rates.length;
    const bestRate = Math.max(...rates);
    const worstRate = Math.min(...rates);

    // Analyze trend
    const trend = this.analyzeTrend(history);

    // Generate prediction
    const prediction = await this.predictRate(
      homeCurrency,
      destinationCurrency,
      weddingDate,
    );

    // Generate hedging recommendation
    const hedgingRecommendation = this.generateHedgingRecommendation(
      currentRate.rate,
      prediction,
      weddingDate,
    );

    return {
      homeCurrency,
      destinationCurrency,
      currentRate: currentRate.rate,
      averageRate,
      bestRate,
      worstRate,
      trend,
      prediction,
      hedgingRecommendation,
    };
  }

  private analyzeTrend(history: CurrencyRate[]): RateTrend {
    if (history.length < 2) {
      return {
        direction: 'stable',
        strength: 0,
        period: '0 days',
        volatility: 0,
      };
    }

    const recentRates = history.slice(-10); // Last 10 rates
    const oldestRate = recentRates[0].rate;
    const latestRate = recentRates[recentRates.length - 1].rate;

    const change = ((latestRate - oldestRate) / oldestRate) * 100;
    const direction = change > 1 ? 'up' : change < -1 ? 'down' : 'stable';
    const strength = Math.abs(change);

    // Calculate volatility
    const rates = recentRates.map((r) => r.rate);
    const mean = rates.reduce((sum, rate) => sum + rate, 0) / rates.length;
    const variance =
      rates.reduce((sum, rate) => sum + Math.pow(rate - mean, 2), 0) /
      rates.length;
    const volatility = (Math.sqrt(variance) / mean) * 100;

    return {
      direction,
      strength,
      period: `${recentRates.length} readings`,
      volatility,
    };
  }

  private async predictRate(
    baseCurrency: string,
    targetCurrency: string,
    weddingDate: string,
  ): Promise<RatePrediction> {
    const currentRate = await this.getCurrentRate(baseCurrency, targetCurrency);
    const history = this.getRateHistory(baseCurrency, targetCurrency);

    // Simple prediction based on trend
    const trend = this.analyzeTrend(history);
    const trendMultiplier =
      trend.direction === 'up' ? 1.01 : trend.direction === 'down' ? 0.99 : 1.0;

    const daysToWedding = Math.ceil(
      (new Date(weddingDate).getTime() - Date.now()) / (24 * 60 * 60 * 1000),
    );
    const weeksTillWedding = Math.ceil(daysToWedding / 7);
    const monthsTillWedding = Math.ceil(daysToWedding / 30);

    return {
      nextWeek: currentRate.rate * Math.pow(trendMultiplier, 7),
      nextMonth: currentRate.rate * Math.pow(trendMultiplier, 30),
      weddingDate: currentRate.rate * Math.pow(trendMultiplier, daysToWedding),
      confidence: Math.max(0.1, 0.8 - monthsTillWedding * 0.1), // Decreasing confidence over time
      factors: [
        {
          name: 'Historical Trend',
          impact:
            trend.direction === 'up'
              ? 'positive'
              : trend.direction === 'down'
                ? 'negative'
                : 'neutral',
          weight: 0.6,
          description: `Currency has been trending ${trend.direction} recently`,
        },
        {
          name: 'Volatility',
          impact: trend.volatility > 5 ? 'negative' : 'positive',
          weight: 0.4,
          description: `${trend.volatility > 5 ? 'High' : 'Low'} volatility observed`,
        },
      ],
    };
  }

  private generateHedgingRecommendation(
    currentRate: number,
    prediction: RatePrediction,
    weddingDate: string,
  ): HedgingRecommendation {
    const daysToWedding = Math.ceil(
      (new Date(weddingDate).getTime() - Date.now()) / (24 * 60 * 60 * 1000),
    );
    const predictedChange =
      ((prediction.weddingDate - currentRate) / currentRate) * 100;

    if (daysToWedding < 30) {
      return {
        strategy: HedgingStrategy.REGULAR_PURCHASE,
        timing: 'Immediately',
        expectedSavings: 0,
        riskLevel: 'low',
        description:
          'Wedding is soon - convert currency now to avoid last-minute volatility',
      };
    }

    if (predictedChange < -5) {
      return {
        strategy: HedgingStrategy.WAIT_AND_WATCH,
        timing: 'Wait for better rates',
        expectedSavings: Math.abs(predictedChange),
        riskLevel: 'medium',
        description:
          'Rates may improve in your favor - consider waiting but monitor closely',
      };
    }

    if (predictedChange > 5) {
      return {
        strategy: HedgingStrategy.FORWARD_CONTRACT,
        timing: 'Lock in current rates',
        expectedSavings: predictedChange,
        riskLevel: 'low',
        description:
          'Rates may worsen - consider locking in current favorable rates',
      };
    }

    return {
      strategy: HedgingStrategy.REGULAR_PURCHASE,
      timing: '2-4 weeks before wedding',
      expectedSavings: 0,
      riskLevel: 'low',
      description:
        'Rates appear stable - convert currency closer to wedding date',
    };
  }

  // ==================== RATE ALERTS ====================

  public async createRateAlert(
    baseCurrency: string,
    targetCurrency: string,
    targetRate: number,
    type: AlertType,
  ): Promise<CurrencyAlert> {
    const currentRate = await this.getCurrentRate(baseCurrency, targetCurrency);

    const alert: CurrencyAlert = {
      id: `alert_${Date.now()}`,
      type,
      targetRate,
      currentRate: currentRate.rate,
      currency: targetCurrency,
      baseCurrency,
      threshold: Math.abs(targetRate - currentRate.rate),
      isActive: true,
      createdAt: new Date().toISOString(),
      message: this.generateAlertMessage(
        type,
        baseCurrency,
        targetCurrency,
        targetRate,
      ),
    };

    this.alerts.set(alert.id, alert);
    return alert;
  }

  private generateAlertMessage(
    type: AlertType,
    base: string,
    target: string,
    rate: number,
  ): string {
    switch (type) {
      case AlertType.RATE_TARGET:
        return `Alert me when ${base}/${target} reaches ${rate}`;
      case AlertType.RATE_DROP:
        return `Alert me when ${base}/${target} drops to ${rate} or below`;
      case AlertType.RATE_INCREASE:
        return `Alert me when ${base}/${target} increases to ${rate} or above`;
      default:
        return `Rate alert for ${base}/${target}`;
    }
  }

  public async checkAlerts(): Promise<CurrencyAlert[]> {
    const triggeredAlerts: CurrencyAlert[] = [];

    for (const alert of this.alerts.values()) {
      if (!alert.isActive || alert.triggeredAt) continue;

      try {
        const currentRate = await this.getCurrentRate(
          alert.baseCurrency,
          alert.currency,
        );
        let shouldTrigger = false;

        switch (alert.type) {
          case AlertType.RATE_TARGET:
            shouldTrigger =
              Math.abs(currentRate.rate - alert.targetRate) <= alert.threshold;
            break;
          case AlertType.RATE_DROP:
            shouldTrigger = currentRate.rate <= alert.targetRate;
            break;
          case AlertType.RATE_INCREASE:
            shouldTrigger = currentRate.rate >= alert.targetRate;
            break;
        }

        if (shouldTrigger) {
          alert.triggeredAt = new Date().toISOString();
          alert.currentRate = currentRate.rate;
          triggeredAlerts.push(alert);
        }
      } catch (error) {
        console.error('[Currency] Error checking alert:', alert.id, error);
      }
    }

    return triggeredAlerts;
  }

  // ==================== UTILITY METHODS ====================

  private calculateFees(
    amount: number,
    convertedAmount: number,
    provider: ExchangeProvider,
  ): ConversionFees {
    const exchangeFee = convertedAmount * (provider.fees.exchangeRate / 100);
    const bankFee = provider.fees.fixedFee;
    const cardFee = amount * (provider.fees.cardFee / 100);
    const percentageFee = amount * (provider.fees.percentageFee / 100);

    const totalFees =
      exchangeFee +
      bankFee +
      cardFee +
      Math.max(percentageFee, provider.fees.minimumFee);
    const effectiveRate = (convertedAmount - totalFees) / amount;

    return {
      exchangeFee,
      bankFee,
      cardFee,
      totalFees,
      effectiveRate,
    };
  }

  private getRateHistory(
    baseCurrency: string,
    targetCurrency: string,
  ): CurrencyRate[] {
    const cacheKey = `${baseCurrency}-${targetCurrency}`;
    return this.rateHistory.get(cacheKey) || [];
  }

  public formatCurrency(amount: number, currencyCode: string): string {
    const currency = this.currencies.get(currencyCode);
    if (!currency) return `${amount} ${currencyCode}`;

    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currencyCode,
      minimumFractionDigits: currency.decimalPlaces,
      maximumFractionDigits: currency.decimalPlaces,
    }).format(amount);
  }

  // ==================== PUBLIC API ====================

  public getSupportedCurrencies(): CurrencyInfo[] {
    return Array.from(this.currencies.values());
  }

  public getPopularCurrencies(): CurrencyInfo[] {
    return Array.from(this.currencies.values()).filter((c) => c.isPopular);
  }

  public getWeddingRelevantCurrencies(): CurrencyInfo[] {
    return Array.from(this.currencies.values()).filter(
      (c) => c.weddingRelevant,
    );
  }

  public getExchangeProviders(): ExchangeProvider[] {
    return Array.from(this.providers.values());
  }

  public getRecommendedProviders(): ExchangeProvider[] {
    return Array.from(this.providers.values())
      .filter((p) => p.isRecommended)
      .sort((a, b) => b.rating - a.rating);
  }

  public getActiveAlerts(): CurrencyAlert[] {
    return Array.from(this.alerts.values()).filter((a) => a.isActive);
  }

  public async getBestRateProvider(
    fromCurrency: string,
    toCurrency: string,
    amount: number,
  ): Promise<{
    provider: ExchangeProvider;
    effectiveRate: number;
    totalCost: number;
  }> {
    let bestProvider: ExchangeProvider | null = null;
    let bestEffectiveRate = 0;
    let bestTotalCost = Infinity;

    for (const provider of this.providers.values()) {
      if (
        !provider.supportedCurrencies.includes(fromCurrency) ||
        !provider.supportedCurrencies.includes(toCurrency)
      ) {
        continue;
      }

      const conversion = await this.convertCurrency(
        fromCurrency,
        amount,
        toCurrency,
        provider.id,
      );
      if (conversion.fees) {
        const totalCost = amount + conversion.fees.totalFees;
        if (totalCost < bestTotalCost) {
          bestProvider = provider;
          bestEffectiveRate = conversion.fees.effectiveRate;
          bestTotalCost = totalCost;
        }
      }
    }

    if (!bestProvider) {
      throw new Error('No suitable provider found');
    }

    return {
      provider: bestProvider,
      effectiveRate: bestEffectiveRate,
      totalCost: bestTotalCost,
    };
  }

  public destroy(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }
    this.rateCache.clear();
    this.rateHistory.clear();
    this.alerts.clear();
  }
}

// ==================== SINGLETON EXPORT ====================

export const currencyConverter = AdvancedCurrencyConverter.getInstance();
export default AdvancedCurrencyConverter;
