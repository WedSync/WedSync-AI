'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  DollarSign,
  Globe,
  TrendingUp,
  TrendingDown,
  Minus,
  RefreshCw,
  Info,
  AlertTriangle,
  CheckCircle,
  Eye,
  EyeOff,
  Settings,
  Calculator,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  currencyService,
  Currency,
  ExchangeRate,
  CurrencyConversion,
  formatCurrency,
  getSupportedCurrencies,
} from '@/lib/utils/currency';

interface CurrencySelectorProps {
  selectedCurrency: string;
  amount?: number;
  onCurrencyChange: (currency: string) => void;
  onAmountChange?: (amount: number, currency: string) => void;
  showConverter?: boolean;
  showRates?: boolean;
  className?: string;
  label?: string;
  placeholder?: string;
  disabled?: boolean;
}

interface CurrencyDisplayProps {
  amount: number;
  currency: string;
  baseCurrency?: string;
  showConversion?: boolean;
  className?: string;
}

interface CurrencyConverterProps {
  fromCurrency: string;
  toCurrency: string;
  amount: number;
  onConvert?: (conversion: CurrencyConversion) => void;
  className?: string;
}

interface ExchangeRateDisplayProps {
  fromCurrency: string;
  toCurrency: string;
  showTrend?: boolean;
  className?: string;
}

// Currency Selector Component
export function CurrencySelector({
  selectedCurrency,
  amount,
  onCurrencyChange,
  onAmountChange,
  showConverter = false,
  showRates = false,
  className,
  label = 'Currency',
  placeholder = 'Select currency',
  disabled = false,
}: CurrencySelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [exchangeRates, setExchangeRates] = useState<Map<string, ExchangeRate>>(
    new Map(),
  );
  const [loadingRates, setLoadingRates] = useState(false);

  const currencies = getSupportedCurrencies();
  const selectedCurrencyData = currencies.find(
    (c) => c.code === selectedCurrency,
  );

  // Filter currencies based on search
  const filteredCurrencies = useMemo(() => {
    if (!searchQuery) return currencies;

    const query = searchQuery.toLowerCase();
    return currencies.filter(
      (currency) =>
        currency.code.toLowerCase().includes(query) ||
        currency.name.toLowerCase().includes(query),
    );
  }, [currencies, searchQuery]);

  // Load exchange rates for popular currencies
  useEffect(() => {
    if (showRates && selectedCurrency) {
      loadExchangeRates();
    }
  }, [selectedCurrency, showRates]);

  const loadExchangeRates = async () => {
    setLoadingRates(true);
    try {
      const popularCurrencies = ['USD', 'EUR', 'GBP', 'CAD', 'AUD'];
      const rates = new Map<string, ExchangeRate>();

      for (const currency of popularCurrencies) {
        if (currency !== selectedCurrency) {
          const rate = await currencyService.getExchangeRate(
            selectedCurrency,
            currency,
          );
          rates.set(currency, rate);
        }
      }

      setExchangeRates(rates);
    } catch (error) {
      console.error('Failed to load exchange rates:', error);
    } finally {
      setLoadingRates(false);
    }
  };

  const handleCurrencySelect = (currency: Currency) => {
    onCurrencyChange(currency.code);
    setIsOpen(false);
    setSearchQuery('');
  };

  const formatAmount = (value: number, currencyCode: string) => {
    try {
      return formatCurrency(value, currencyCode);
    } catch {
      return `${value.toFixed(2)} ${currencyCode}`;
    }
  };

  return (
    <div className={cn('relative', className)}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label}
        </label>
      )}

      {/* Currency Selector Button */}
      <div className="relative">
        <button
          type="button"
          onClick={() => !disabled && setIsOpen(!isOpen)}
          disabled={disabled}
          className={cn(
            'w-full px-3 py-2 text-left border rounded-lg text-sm transition-colors',
            'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent',
            disabled
              ? 'bg-gray-100 text-gray-500 cursor-not-allowed border-gray-200'
              : 'bg-white text-gray-900 border-gray-300 hover:border-gray-400',
          )}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {selectedCurrencyData ? (
                <>
                  <span className="font-medium">
                    {selectedCurrencyData.symbol}
                  </span>
                  <span>{selectedCurrencyData.code}</span>
                  <span className="text-gray-500">-</span>
                  <span className="text-gray-600">
                    {selectedCurrencyData.name}
                  </span>
                </>
              ) : (
                <span className="text-gray-500">{placeholder}</span>
              )}
            </div>
            <Globe className="w-4 h-4 text-gray-400" />
          </div>
        </button>

        {/* Dropdown */}
        {isOpen && (
          <>
            <div
              className="fixed inset-0 z-10"
              onClick={() => setIsOpen(false)}
            />
            <div className="absolute z-20 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-hidden">
              {/* Search */}
              <div className="p-2 border-b border-gray-200">
                <input
                  type="text"
                  placeholder="Search currencies..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-primary-500"
                />
              </div>

              {/* Currency List */}
              <div className="max-h-48 overflow-y-auto">
                {filteredCurrencies.map((currency) => (
                  <button
                    key={currency.code}
                    onClick={() => handleCurrencySelect(currency)}
                    className={cn(
                      'w-full px-3 py-2 text-left hover:bg-gray-50 transition-colors',
                      selectedCurrency === currency.code &&
                        'bg-primary-50 text-primary-900',
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-medium w-8">
                          {currency.symbol}
                        </span>
                        <span className="font-medium">{currency.code}</span>
                        <span className="text-gray-600">{currency.name}</span>
                      </div>
                      {selectedCurrency === currency.code && (
                        <CheckCircle className="w-4 h-4 text-primary-600" />
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Exchange Rates */}
      {showRates && selectedCurrency && (
        <div className="mt-3 p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">
              Current Rates
            </span>
            <button
              onClick={loadExchangeRates}
              disabled={loadingRates}
              className="text-xs text-gray-500 hover:text-gray-700 transition-colors"
            >
              <RefreshCw
                className={cn('w-3 h-3', loadingRates && 'animate-spin')}
              />
            </button>
          </div>

          {loadingRates ? (
            <div className="space-y-1">
              {[...Array(3)].map((_, i) => (
                <div
                  key={i}
                  className="h-4 bg-gray-200 rounded animate-pulse"
                />
              ))}
            </div>
          ) : (
            <div className="space-y-1 text-xs">
              {Array.from(exchangeRates.entries())
                .slice(0, 3)
                .map(([currency, rate]) => (
                  <div
                    key={currency}
                    className="flex justify-between text-gray-600"
                  >
                    <span>1 {selectedCurrency} =</span>
                    <span>
                      {rate.rate.toFixed(4)} {currency}
                    </span>
                  </div>
                ))}
            </div>
          )}
        </div>
      )}

      {/* Amount Converter */}
      {showConverter && amount && amount > 0 && (
        <div className="mt-3">
          <CurrencyConverter
            fromCurrency={selectedCurrency}
            toCurrency="USD"
            amount={amount}
          />
        </div>
      )}
    </div>
  );
}

// Currency Display Component
export function CurrencyDisplay({
  amount,
  currency,
  baseCurrency = 'USD',
  showConversion = false,
  className,
}: CurrencyDisplayProps) {
  const [conversion, setConversion] = useState<CurrencyConversion | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (showConversion && currency !== baseCurrency) {
      convertAmount();
    }
  }, [amount, currency, baseCurrency, showConversion]);

  const convertAmount = async () => {
    setLoading(true);
    try {
      const result = await currencyService.convertAmount(
        amount,
        currency,
        baseCurrency,
      );
      setConversion(result);
    } catch (error) {
      console.error('Conversion failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const formattedAmount = formatCurrency(amount, currency);

  return (
    <div className={cn('text-right', className)}>
      <div className="font-semibold text-gray-900">{formattedAmount}</div>

      {showConversion && currency !== baseCurrency && (
        <div className="text-xs text-gray-500 mt-1">
          {loading ? (
            <span>Converting...</span>
          ) : conversion ? (
            <span>
              ≈ {formatCurrency(conversion.converted_amount, baseCurrency)}
            </span>
          ) : (
            <span>Conversion unavailable</span>
          )}
        </div>
      )}
    </div>
  );
}

// Currency Converter Component
export function CurrencyConverter({
  fromCurrency,
  toCurrency,
  amount,
  onConvert,
  className,
}: CurrencyConverterProps) {
  const [conversion, setConversion] = useState<CurrencyConversion | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (amount > 0) {
      performConversion();
    }
  }, [amount, fromCurrency, toCurrency]);

  const performConversion = async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await currencyService.convertAmount(
        amount,
        fromCurrency,
        toCurrency,
      );
      setConversion(result);
      onConvert?.(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Conversion failed');
    } finally {
      setLoading(false);
    }
  };

  if (fromCurrency === toCurrency) {
    return null;
  }

  return (
    <div
      className={cn(
        'p-3 bg-blue-50 rounded-lg border border-blue-200',
        className,
      )}
    >
      <div className="flex items-center gap-2 mb-2">
        <Calculator className="w-4 h-4 text-blue-600" />
        <span className="text-sm font-medium text-blue-900">
          Currency Conversion
        </span>
      </div>

      {loading ? (
        <div className="text-sm text-blue-700">Converting...</div>
      ) : error ? (
        <div className="text-sm text-error-600">{error}</div>
      ) : conversion ? (
        <div className="space-y-1">
          <div className="text-sm text-blue-800">
            {formatCurrency(
              conversion.original_amount,
              conversion.original_currency,
            )}{' '}
            =
            <span className="font-semibold ml-1">
              {formatCurrency(
                conversion.converted_amount,
                conversion.converted_currency,
              )}
            </span>
          </div>
          <div className="text-xs text-blue-600">
            Rate: 1 {fromCurrency} = {conversion.exchange_rate.toFixed(4)}{' '}
            {toCurrency}
          </div>
        </div>
      ) : null}
    </div>
  );
}

// Exchange Rate Display Component
export function ExchangeRateDisplay({
  fromCurrency,
  toCurrency,
  showTrend = false,
  className,
}: ExchangeRateDisplayProps) {
  const [rate, setRate] = useState<ExchangeRate | null>(null);
  const [trend, setTrend] = useState<{
    percentage: number;
    favorable: boolean;
  } | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadRate();
    if (showTrend) {
      loadTrend();
    }
  }, [fromCurrency, toCurrency, showTrend]);

  const loadRate = async () => {
    setLoading(true);
    try {
      const exchangeRate = await currencyService.getExchangeRate(
        fromCurrency,
        toCurrency,
      );
      setRate(exchangeRate);
    } catch (error) {
      console.error('Failed to load exchange rate:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadTrend = async () => {
    try {
      const trendData = await currencyService.getExchangeRateTrend(
        fromCurrency,
        toCurrency,
      );
      setTrend({
        percentage: trendData.trend_percentage,
        favorable: trendData.is_favorable,
      });
    } catch (error) {
      console.error('Failed to load trend:', error);
    }
  };

  if (fromCurrency === toCurrency) {
    return null;
  }

  return (
    <div className={cn('flex items-center gap-2 text-sm', className)}>
      {loading ? (
        <span className="text-gray-500">Loading rate...</span>
      ) : rate ? (
        <>
          <span className="text-gray-600">
            1 {fromCurrency} = {rate.rate.toFixed(4)} {toCurrency}
          </span>

          {showTrend && trend && (
            <div
              className={cn(
                'flex items-center gap-1 px-2 py-1 rounded text-xs',
                trend.favorable
                  ? 'bg-success-100 text-success-700'
                  : 'bg-error-100 text-error-700',
              )}
            >
              {trend.favorable ? (
                <TrendingUp className="w-3 h-3" />
              ) : (
                <TrendingDown className="w-3 h-3" />
              )}
              <span>{Math.abs(trend.percentage).toFixed(1)}%</span>
            </div>
          )}

          <div
            className={cn(
              'px-2 py-1 rounded text-xs',
              rate.source === 'api'
                ? 'bg-success-100 text-success-700'
                : rate.source === 'cached'
                  ? 'bg-warning-100 text-warning-700'
                  : 'bg-gray-100 text-gray-700',
            )}
          >
            {rate.source === 'api'
              ? 'Live'
              : rate.source === 'cached'
                ? 'Cached'
                : 'Manual'}
          </div>
        </>
      ) : (
        <span className="text-error-600">Rate unavailable</span>
      )}
    </div>
  );
}

// Multi-Currency Amount Input Component
interface MultiCurrencyInputProps {
  baseCurrency: string;
  baseAmount: number;
  targetCurrencies: string[];
  onAmountChange: (amount: number, currency: string) => void;
  className?: string;
}

export function MultiCurrencyInput({
  baseCurrency,
  baseAmount,
  targetCurrencies,
  onAmountChange,
  className,
}: MultiCurrencyInputProps) {
  const [conversions, setConversions] = useState<Map<string, number>>(
    new Map(),
  );
  const [loading, setLoading] = useState(false);
  const [activeInput, setActiveInput] = useState<string>(baseCurrency);

  useEffect(() => {
    updateConversions();
  }, [baseAmount, baseCurrency, targetCurrencies]);

  const updateConversions = async () => {
    setLoading(true);
    try {
      const newConversions = new Map<string, number>();

      for (const currency of targetCurrencies) {
        if (currency !== baseCurrency) {
          const conversion = await currencyService.convertAmount(
            baseAmount,
            baseCurrency,
            currency,
          );
          newConversions.set(currency, conversion.converted_amount);
        }
      }

      setConversions(newConversions);
    } catch (error) {
      console.error('Failed to update conversions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = async (value: number, currency: string) => {
    setActiveInput(currency);

    if (currency === baseCurrency) {
      onAmountChange(value, currency);
    } else {
      // Convert back to base currency
      try {
        const conversion = await currencyService.convertAmount(
          value,
          currency,
          baseCurrency,
        );
        onAmountChange(conversion.converted_amount, baseCurrency);
      } catch (error) {
        console.error('Conversion failed:', error);
      }
    }
  };

  const allCurrencies = [
    baseCurrency,
    ...targetCurrencies.filter((c) => c !== baseCurrency),
  ];

  return (
    <div className={cn('space-y-3', className)}>
      {allCurrencies.map((currency) => {
        const isBase = currency === baseCurrency;
        const amount = isBase ? baseAmount : conversions.get(currency) || 0;
        const currencyData = currencyService.getCurrency(currency);

        return (
          <div key={currency} className="flex items-center gap-3">
            <div className="w-16 text-sm font-medium text-gray-700">
              {currency}
            </div>

            <div className="flex-1 relative">
              <span className="absolute left-3 top-2 text-sm text-gray-500">
                {currencyData?.symbol || currency}
              </span>
              <input
                type="number"
                value={amount.toFixed(currencyData?.decimal_places || 2)}
                onChange={(e) =>
                  handleInputChange(parseFloat(e.target.value) || 0, currency)
                }
                className={cn(
                  'w-full pl-8 pr-3 py-2 border rounded-lg text-sm',
                  'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent',
                  activeInput === currency
                    ? 'border-primary-300'
                    : 'border-gray-300',
                )}
                disabled={loading}
              />
            </div>

            {!isBase && (
              <div className="text-xs text-gray-500">
                <ExchangeRateDisplay
                  fromCurrency={baseCurrency}
                  toCurrency={currency}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
