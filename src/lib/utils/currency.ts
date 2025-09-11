// Multi-Currency Support Utilities for Wedding Budget System
// Handles currency conversion, formatting, and management

export interface Currency {
  code: string;
  name: string;
  symbol: string;
  decimal_places: number;
  symbol_position: 'before' | 'after';
  thousand_separator: string;
  decimal_separator: string;
  is_default?: boolean;
}

export interface ExchangeRate {
  from_currency: string;
  to_currency: string;
  rate: number;
  last_updated: Date;
  source: 'manual' | 'api' | 'cached';
  confidence: number;
}

export interface CurrencyConversion {
  original_amount: number;
  original_currency: string;
  converted_amount: number;
  converted_currency: string;
  exchange_rate: number;
  conversion_date: Date;
}

export interface MultiCurrencyAmount {
  amounts: Record<string, number>;
  base_currency: string;
  base_amount: number;
  display_currency?: string;
  last_updated: Date;
}

// Supported currencies for wedding industry
export const SUPPORTED_CURRENCIES: Currency[] = [
  {
    code: 'USD',
    name: 'US Dollar',
    symbol: '$',
    decimal_places: 2,
    symbol_position: 'before',
    thousand_separator: ',',
    decimal_separator: '.',
    is_default: true,
  },
  {
    code: 'EUR',
    name: 'Euro',
    symbol: '€',
    decimal_places: 2,
    symbol_position: 'after',
    thousand_separator: '.',
    decimal_separator: ',',
  },
  {
    code: 'GBP',
    name: 'British Pound',
    symbol: '£',
    decimal_places: 2,
    symbol_position: 'before',
    thousand_separator: ',',
    decimal_separator: '.',
  },
  {
    code: 'CAD',
    name: 'Canadian Dollar',
    symbol: 'C$',
    decimal_places: 2,
    symbol_position: 'before',
    thousand_separator: ',',
    decimal_separator: '.',
  },
  {
    code: 'AUD',
    name: 'Australian Dollar',
    symbol: 'A$',
    decimal_places: 2,
    symbol_position: 'before',
    thousand_separator: ',',
    decimal_separator: '.',
  },
  {
    code: 'CHF',
    name: 'Swiss Franc',
    symbol: 'CHF',
    decimal_places: 2,
    symbol_position: 'before',
    thousand_separator: "'",
    decimal_separator: '.',
  },
  {
    code: 'JPY',
    name: 'Japanese Yen',
    symbol: '¥',
    decimal_places: 0,
    symbol_position: 'before',
    thousand_separator: ',',
    decimal_separator: '.',
  },
  {
    code: 'INR',
    name: 'Indian Rupee',
    symbol: '₹',
    decimal_places: 2,
    symbol_position: 'before',
    thousand_separator: ',',
    decimal_separator: '.',
  },
  {
    code: 'MXN',
    name: 'Mexican Peso',
    symbol: '$',
    decimal_places: 2,
    symbol_position: 'before',
    thousand_separator: ',',
    decimal_separator: '.',
  },
  {
    code: 'BRL',
    name: 'Brazilian Real',
    symbol: 'R$',
    decimal_places: 2,
    symbol_position: 'before',
    thousand_separator: '.',
    decimal_separator: ',',
  },
];

// Exchange rate cache
let exchangeRateCache: Map<string, ExchangeRate> = new Map();
let cacheExpiry: Date = new Date();

export class CurrencyService {
  private static instance: CurrencyService;
  private exchangeRates: Map<string, ExchangeRate> = new Map();
  private baseCurrency: string = 'USD';
  private apiKey?: string;

  constructor(apiKey?: string) {
    this.apiKey = apiKey;
  }

  static getInstance(apiKey?: string): CurrencyService {
    if (!CurrencyService.instance) {
      CurrencyService.instance = new CurrencyService(apiKey);
    }
    return CurrencyService.instance;
  }

  // Get currency information
  getCurrency(code: string): Currency | undefined {
    return SUPPORTED_CURRENCIES.find((c) => c.code === code);
  }

  // Get all supported currencies
  getSupportedCurrencies(): Currency[] {
    return SUPPORTED_CURRENCIES;
  }

  // Set base currency for the system
  setBaseCurrency(currencyCode: string): void {
    const currency = this.getCurrency(currencyCode);
    if (!currency) {
      throw new Error(`Unsupported currency: ${currencyCode}`);
    }
    this.baseCurrency = currencyCode;
  }

  // Format amount according to currency rules
  formatAmount(
    amount: number,
    currencyCode: string,
    options?: {
      showSymbol?: boolean;
      showCode?: boolean;
      precision?: number;
    },
  ): string {
    const currency = this.getCurrency(currencyCode);
    if (!currency) {
      throw new Error(`Unsupported currency: ${currencyCode}`);
    }

    const {
      showSymbol = true,
      showCode = false,
      precision = currency.decimal_places,
    } = options || {};

    // Format the number
    const parts = amount.toFixed(precision).split('.');
    const integerPart = parts[0];
    const decimalPart = parts[1];

    // Add thousand separators
    const formattedInteger = integerPart.replace(
      /\B(?=(\d{3})+(?!\d))/g,
      currency.thousand_separator,
    );

    // Combine integer and decimal parts
    let formattedAmount = formattedInteger;
    if (precision > 0 && decimalPart) {
      formattedAmount += currency.decimal_separator + decimalPart;
    }

    // Add currency symbol/code
    let result = formattedAmount;
    if (showSymbol) {
      if (currency.symbol_position === 'before') {
        result = currency.symbol + result;
      } else {
        result = result + ' ' + currency.symbol;
      }
    }

    if (showCode) {
      result = result + ' ' + currency.code;
    }

    return result;
  }

  // Parse amount from formatted string
  parseAmount(formattedAmount: string, currencyCode: string): number {
    const currency = this.getCurrency(currencyCode);
    if (!currency) {
      throw new Error(`Unsupported currency: ${currencyCode}`);
    }

    // Remove currency symbols and codes
    let cleanAmount = formattedAmount
      .replace(currency.symbol, '')
      .replace(currency.code, '')
      .trim();

    // Replace thousand separators
    cleanAmount = cleanAmount.replace(
      new RegExp('\\' + currency.thousand_separator, 'g'),
      '',
    );

    // Replace decimal separator with standard dot
    if (currency.decimal_separator !== '.') {
      cleanAmount = cleanAmount.replace(currency.decimal_separator, '.');
    }

    return parseFloat(cleanAmount) || 0;
  }

  // Get exchange rate between two currencies
  async getExchangeRate(
    fromCurrency: string,
    toCurrency: string,
  ): Promise<ExchangeRate> {
    if (fromCurrency === toCurrency) {
      return {
        from_currency: fromCurrency,
        to_currency: toCurrency,
        rate: 1,
        last_updated: new Date(),
        source: 'manual',
        confidence: 1,
      };
    }

    const cacheKey = `${fromCurrency}_${toCurrency}`;
    const cached = this.exchangeRates.get(cacheKey);

    // Check if cached rate is still valid (1 hour)
    if (cached && Date.now() - cached.last_updated.getTime() < 3600000) {
      return cached;
    }

    try {
      // Try to fetch from API
      const rate = await this.fetchExchangeRateFromAPI(
        fromCurrency,
        toCurrency,
      );
      this.exchangeRates.set(cacheKey, rate);
      return rate;
    } catch (error) {
      // Fallback to cached rate if available
      if (cached) {
        return { ...cached, source: 'cached' as const };
      }

      // Fallback to hardcoded rates for common pairs
      const fallbackRate = this.getFallbackRate(fromCurrency, toCurrency);
      if (fallbackRate) {
        return fallbackRate;
      }

      throw new Error(
        `Unable to get exchange rate for ${fromCurrency} to ${toCurrency}`,
      );
    }
  }

  // Fetch exchange rate from external API
  private async fetchExchangeRateFromAPI(
    fromCurrency: string,
    toCurrency: string,
  ): Promise<ExchangeRate> {
    if (!this.apiKey) {
      throw new Error('API key required for live exchange rates');
    }

    // Using exchangerate-api.com as example
    const response = await fetch(
      `https://v6.exchangerate-api.com/v6/${this.apiKey}/pair/${fromCurrency}/${toCurrency}`,
    );

    if (!response.ok) {
      throw new Error('Failed to fetch exchange rate from API');
    }

    const data = await response.json();

    return {
      from_currency: fromCurrency,
      to_currency: toCurrency,
      rate: data.conversion_rate,
      last_updated: new Date(),
      source: 'api',
      confidence: 0.95,
    };
  }

  // Get fallback exchange rates for common currency pairs
  private getFallbackRate(
    fromCurrency: string,
    toCurrency: string,
  ): ExchangeRate | null {
    // Hardcoded fallback rates (should be updated periodically)
    const fallbackRates: Record<string, number> = {
      USD_EUR: 0.85,
      EUR_USD: 1.18,
      USD_GBP: 0.73,
      GBP_USD: 1.37,
      USD_CAD: 1.25,
      CAD_USD: 0.8,
      USD_AUD: 1.35,
      AUD_USD: 0.74,
      USD_CHF: 0.92,
      CHF_USD: 1.09,
      USD_JPY: 110,
      JPY_USD: 0.009,
      USD_INR: 74,
      INR_USD: 0.014,
      USD_MXN: 20,
      MXN_USD: 0.05,
      USD_BRL: 5.2,
      BRL_USD: 0.19,
    };

    const key = `${fromCurrency}_${toCurrency}`;
    const rate = fallbackRates[key];

    if (rate) {
      return {
        from_currency: fromCurrency,
        to_currency: toCurrency,
        rate,
        last_updated: new Date(),
        source: 'manual',
        confidence: 0.7, // Lower confidence for fallback rates
      };
    }

    return null;
  }

  // Convert amount between currencies
  async convertAmount(
    amount: number,
    fromCurrency: string,
    toCurrency: string,
  ): Promise<CurrencyConversion> {
    const exchangeRate = await this.getExchangeRate(fromCurrency, toCurrency);
    const convertedAmount = amount * exchangeRate.rate;

    return {
      original_amount: amount,
      original_currency: fromCurrency,
      converted_amount: convertedAmount,
      converted_currency: toCurrency,
      exchange_rate: exchangeRate.rate,
      conversion_date: new Date(),
    };
  }

  // Convert amount and format in target currency
  async convertAndFormat(
    amount: number,
    fromCurrency: string,
    toCurrency: string,
    options?: Parameters<CurrencyService['formatAmount']>[2],
  ): Promise<string> {
    const conversion = await this.convertAmount(
      amount,
      fromCurrency,
      toCurrency,
    );
    return this.formatAmount(conversion.converted_amount, toCurrency, options);
  }

  // Create multi-currency amount object
  async createMultiCurrencyAmount(
    baseAmount: number,
    baseCurrency: string,
    targetCurrencies: string[] = [],
  ): Promise<MultiCurrencyAmount> {
    const amounts: Record<string, number> = {};
    amounts[baseCurrency] = baseAmount;

    // Convert to all target currencies
    for (const currency of targetCurrencies) {
      if (currency !== baseCurrency) {
        const conversion = await this.convertAmount(
          baseAmount,
          baseCurrency,
          currency,
        );
        amounts[currency] = conversion.converted_amount;
      }
    }

    return {
      amounts,
      base_currency: baseCurrency,
      base_amount: baseAmount,
      last_updated: new Date(),
    };
  }

  // Update exchange rates in bulk
  async updateExchangeRates(
    currencyPairs: Array<{ from: string; to: string }>,
  ): Promise<void> {
    const promises = currencyPairs.map((pair) =>
      this.getExchangeRate(pair.from, pair.to),
    );

    await Promise.all(promises);
  }

  // Get currency by country code (ISO 3166-1 alpha-2)
  getCurrencyByCountry(countryCode: string): Currency | undefined {
    const countryToCurrency: Record<string, string> = {
      US: 'USD',
      CA: 'CAD',
      GB: 'GBP',
      AU: 'AUD',
      DE: 'EUR',
      FR: 'EUR',
      IT: 'EUR',
      ES: 'EUR',
      NL: 'EUR',
      BE: 'EUR',
      AT: 'EUR',
      IE: 'EUR',
      CH: 'CHF',
      JP: 'JPY',
      IN: 'INR',
      MX: 'MXN',
      BR: 'BRL',
    };

    const currencyCode = countryToCurrency[countryCode.toUpperCase()];
    return currencyCode ? this.getCurrency(currencyCode) : undefined;
  }

  // Detect currency from browser locale
  detectCurrencyFromLocale(): Currency {
    try {
      const locale = navigator.language || 'en-US';
      const countryCode = locale.split('-')[1];

      if (countryCode) {
        const currency = this.getCurrencyByCountry(countryCode);
        if (currency) return currency;
      }
    } catch (error) {
      console.warn('Failed to detect currency from locale:', error);
    }

    // Fallback to USD
    return this.getCurrency('USD')!;
  }

  // Calculate total in multiple currencies
  async calculateTotalInCurrencies(
    amounts: Array<{ amount: number; currency: string }>,
    targetCurrency: string,
  ): Promise<{
    total: number;
    currency: string;
    conversions: CurrencyConversion[];
  }> {
    const conversions: CurrencyConversion[] = [];
    let total = 0;

    for (const item of amounts) {
      if (item.currency === targetCurrency) {
        total += item.amount;
      } else {
        const conversion = await this.convertAmount(
          item.amount,
          item.currency,
          targetCurrency,
        );
        conversions.push(conversion);
        total += conversion.converted_amount;
      }
    }

    return {
      total,
      currency: targetCurrency,
      conversions,
    };
  }

  // Format currency with intelligent rounding
  formatWithRounding(amount: number, currencyCode: string): string {
    const currency = this.getCurrency(currencyCode);
    if (!currency) {
      throw new Error(`Unsupported currency: ${currencyCode}`);
    }

    // Smart rounding based on amount size
    let precision = currency.decimal_places;
    if (amount >= 1000 && currency.decimal_places > 0) {
      precision = 0; // Round to whole numbers for large amounts
    }

    return this.formatAmount(amount, currencyCode, { precision });
  }

  // Get exchange rate trend (requires historical data)
  async getExchangeRateTrend(
    fromCurrency: string,
    toCurrency: string,
    days: number = 30,
  ): Promise<{
    current_rate: number;
    trend_percentage: number;
    is_favorable: boolean;
  }> {
    // This would require historical data API
    // For now, return mock trend data
    const currentRate = await this.getExchangeRate(fromCurrency, toCurrency);

    // Mock trend calculation
    const mockTrendPercentage = (Math.random() - 0.5) * 10; // ±5%

    return {
      current_rate: currentRate.rate,
      trend_percentage: mockTrendPercentage,
      is_favorable: mockTrendPercentage > 0,
    };
  }
}

// Export singleton instance
export const currencyService = CurrencyService.getInstance();

// Utility functions for easy access
export const formatCurrency = (
  amount: number,
  currency: string,
  options?: any,
) => currencyService.formatAmount(amount, currency, options);

export const convertCurrency = (amount: number, from: string, to: string) =>
  currencyService.convertAmount(amount, from, to);

export const getSupportedCurrencies = () =>
  currencyService.getSupportedCurrencies();

export const parseCurrency = (formatted: string, currency: string) =>
  currencyService.parseAmount(formatted, currency);

// Helper for React components
export const useCurrency = (currencyCode?: string) => {
  const defaultCurrency = currencyCode || 'USD';

  return {
    format: (amount: number, options?: any) =>
      formatCurrency(amount, defaultCurrency, options),
    parse: (formatted: string) => parseCurrency(formatted, defaultCurrency),
    currency: currencyService.getCurrency(defaultCurrency),
    convert: (amount: number, toCurrency: string) =>
      convertCurrency(amount, defaultCurrency, toCurrency),
  };
};
