'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { TrendingUpIcon, TrendingDownIcon, InfoIcon } from 'lucide-react';
import {
  type WeddingMarketLocale,
  type WeddingMarketCurrency,
  type CurrencyPosition,
  type NumberFormatConfig,
  type WeddingVendorCategory,
} from '@/types/i18n';

// =============================================================================
// CURRENCY CONFIGURATIONS & UTILITIES
// =============================================================================

const CURRENCY_CONFIGS: Record<
  WeddingMarketCurrency,
  {
    symbol: string;
    name: string;
    decimalPlaces: number;
    position: CurrencyPosition;
    numberFormat: NumberFormatConfig;
    averageWeddingBudget: number;
    exchangeRateBase: number; // Relative to USD for comparison
  }
> = {
  USD: {
    symbol: '$',
    name: 'US Dollar',
    decimalPlaces: 2,
    position: 'before',
    numberFormat: {
      decimalSeparator: '.',
      thousandsSeparator: ',',
      decimalPlaces: 2,
    },
    averageWeddingBudget: 35000,
    exchangeRateBase: 1.0,
  },
  EUR: {
    symbol: '€',
    name: 'Euro',
    decimalPlaces: 2,
    position: 'after',
    numberFormat: {
      decimalSeparator: ',',
      thousandsSeparator: '.',
      decimalPlaces: 2,
    },
    averageWeddingBudget: 32000,
    exchangeRateBase: 0.85,
  },
  GBP: {
    symbol: '£',
    name: 'British Pound',
    decimalPlaces: 2,
    position: 'before',
    numberFormat: {
      decimalSeparator: '.',
      thousandsSeparator: ',',
      decimalPlaces: 2,
    },
    averageWeddingBudget: 28000,
    exchangeRateBase: 0.73,
  },
  CAD: {
    symbol: 'C$',
    name: 'Canadian Dollar',
    decimalPlaces: 2,
    position: 'before',
    numberFormat: {
      decimalSeparator: '.',
      thousandsSeparator: ',',
      decimalPlaces: 2,
    },
    averageWeddingBudget: 45000,
    exchangeRateBase: 1.35,
  },
  AUD: {
    symbol: 'A$',
    name: 'Australian Dollar',
    decimalPlaces: 2,
    position: 'before',
    numberFormat: {
      decimalSeparator: '.',
      thousandsSeparator: ',',
      decimalPlaces: 2,
    },
    averageWeddingBudget: 48000,
    exchangeRateBase: 1.52,
  },
  JPY: {
    symbol: '¥',
    name: 'Japanese Yen',
    decimalPlaces: 0,
    position: 'before',
    numberFormat: {
      decimalSeparator: '',
      thousandsSeparator: ',',
      decimalPlaces: 0,
    },
    averageWeddingBudget: 3500000,
    exchangeRateBase: 150,
  },
  CNY: {
    symbol: '¥',
    name: 'Chinese Yuan',
    decimalPlaces: 2,
    position: 'before',
    numberFormat: {
      decimalSeparator: '.',
      thousandsSeparator: ',',
      decimalPlaces: 2,
    },
    averageWeddingBudget: 250000,
    exchangeRateBase: 7.2,
  },
  INR: {
    symbol: '₹',
    name: 'Indian Rupee',
    decimalPlaces: 2,
    position: 'before',
    numberFormat: {
      decimalSeparator: '.',
      thousandsSeparator: ',',
      decimalPlaces: 2,
    },
    averageWeddingBudget: 1500000,
    exchangeRateBase: 83,
  },
  BRL: {
    symbol: 'R$',
    name: 'Brazilian Real',
    decimalPlaces: 2,
    position: 'before',
    numberFormat: {
      decimalSeparator: ',',
      thousandsSeparator: '.',
      decimalPlaces: 2,
    },
    averageWeddingBudget: 180000,
    exchangeRateBase: 5.0,
  },
  AED: {
    symbol: 'د.إ',
    name: 'UAE Dirham',
    decimalPlaces: 2,
    position: 'before',
    numberFormat: {
      decimalSeparator: '.',
      thousandsSeparator: ',',
      decimalPlaces: 2,
    },
    averageWeddingBudget: 150000,
    exchangeRateBase: 3.67,
  },
  SAR: {
    symbol: 'ر.س',
    name: 'Saudi Riyal',
    decimalPlaces: 2,
    position: 'before',
    numberFormat: {
      decimalSeparator: '.',
      thousandsSeparator: ',',
      decimalPlaces: 2,
    },
    averageWeddingBudget: 120000,
    exchangeRateBase: 3.75,
  },
  RUB: {
    symbol: '₽',
    name: 'Russian Ruble',
    decimalPlaces: 2,
    position: 'after',
    numberFormat: {
      decimalSeparator: ',',
      thousandsSeparator: ' ',
      decimalPlaces: 2,
    },
    averageWeddingBudget: 2500000,
    exchangeRateBase: 90,
  },
  KRW: {
    symbol: '₩',
    name: 'South Korean Won',
    decimalPlaces: 0,
    position: 'before',
    numberFormat: {
      decimalSeparator: '',
      thousandsSeparator: ',',
      decimalPlaces: 0,
    },
    averageWeddingBudget: 45000000,
    exchangeRateBase: 1300,
  },
  TRY: {
    symbol: '₺',
    name: 'Turkish Lira',
    decimalPlaces: 2,
    position: 'after',
    numberFormat: {
      decimalSeparator: ',',
      thousandsSeparator: '.',
      decimalPlaces: 2,
    },
    averageWeddingBudget: 800000,
    exchangeRateBase: 30,
  },
  MXN: {
    symbol: '$',
    name: 'Mexican Peso',
    decimalPlaces: 2,
    position: 'before',
    numberFormat: {
      decimalSeparator: '.',
      thousandsSeparator: ',',
      decimalPlaces: 2,
    },
    averageWeddingBudget: 600000,
    exchangeRateBase: 17,
  },
  PLN: {
    symbol: 'zł',
    name: 'Polish Zloty',
    decimalPlaces: 2,
    position: 'after',
    numberFormat: {
      decimalSeparator: ',',
      thousandsSeparator: ' ',
      decimalPlaces: 2,
    },
    averageWeddingBudget: 140000,
    exchangeRateBase: 4.2,
  },
  SEK: {
    symbol: 'kr',
    name: 'Swedish Krona',
    decimalPlaces: 2,
    position: 'after',
    numberFormat: {
      decimalSeparator: ',',
      thousandsSeparator: ' ',
      decimalPlaces: 2,
    },
    averageWeddingBudget: 350000,
    exchangeRateBase: 10.8,
  },
  CHF: {
    symbol: 'CHF',
    name: 'Swiss Franc',
    decimalPlaces: 2,
    position: 'before',
    numberFormat: {
      decimalSeparator: '.',
      thousandsSeparator: "'",
      decimalPlaces: 2,
    },
    averageWeddingBudget: 38000,
    exchangeRateBase: 0.88,
  },
  NOK: {
    symbol: 'kr',
    name: 'Norwegian Krone',
    decimalPlaces: 2,
    position: 'after',
    numberFormat: {
      decimalSeparator: ',',
      thousandsSeparator: ' ',
      decimalPlaces: 2,
    },
    averageWeddingBudget: 380000,
    exchangeRateBase: 10.5,
  },
  DKK: {
    symbol: 'kr',
    name: 'Danish Krone',
    decimalPlaces: 2,
    position: 'after',
    numberFormat: {
      decimalSeparator: ',',
      thousandsSeparator: '.',
      decimalPlaces: 2,
    },
    averageWeddingBudget: 240000,
    exchangeRateBase: 6.8,
  },
};

const VENDOR_BUDGET_PERCENTAGES: Record<
  WeddingVendorCategory,
  {
    min: number;
    max: number;
    average: number;
    description: string;
  }
> = {
  venue: {
    min: 25,
    max: 45,
    average: 35,
    description: 'Largest expense - ceremony and reception location',
  },
  catering: {
    min: 20,
    max: 35,
    average: 28,
    description: 'Food, drinks, and service for guests',
  },
  photographer: {
    min: 8,
    max: 15,
    average: 12,
    description: 'Photography and videography services',
  },
  music_dj: {
    min: 5,
    max: 12,
    average: 8,
    description: 'DJ, band, or entertainment services',
  },
  florist: {
    min: 6,
    max: 10,
    average: 8,
    description: 'Flowers and decorative arrangements',
  },
  beauty: {
    min: 3,
    max: 8,
    average: 5,
    description: 'Hair, makeup, and beauty services',
  },
  fashion: {
    min: 4,
    max: 12,
    average: 8,
    description: 'Wedding dress, suit, and attire',
  },
  transportation: {
    min: 2,
    max: 5,
    average: 3,
    description: 'Wedding day transportation',
  },
  cake: {
    min: 2,
    max: 4,
    average: 3,
    description: 'Wedding cake and desserts',
  },
  stationary: {
    min: 2,
    max: 4,
    average: 3,
    description: 'Invitations and paper goods',
  },
  jewelry: {
    min: 3,
    max: 8,
    average: 5,
    description: 'Wedding rings and jewelry',
  },
  planning: {
    min: 8,
    max: 15,
    average: 12,
    description: 'Wedding planning and coordination',
  },
  // Additional categories with lower percentages
  videographer: {
    min: 5,
    max: 10,
    average: 7,
    description: 'Wedding videography services',
  },
  decoration: {
    min: 4,
    max: 8,
    average: 6,
    description: 'Additional decorations and lighting',
  },
  officiant: {
    min: 1,
    max: 3,
    average: 2,
    description: 'Ceremony officiant fees',
  },
  gifts: {
    min: 2,
    max: 5,
    average: 3,
    description: 'Wedding party and guest gifts',
  },
  honeymoon: {
    min: 8,
    max: 15,
    average: 12,
    description: 'Honeymoon travel and accommodation',
  },
  insurance: {
    min: 1,
    max: 2,
    average: 1,
    description: 'Wedding insurance coverage',
  },
  security: {
    min: 1,
    max: 3,
    average: 2,
    description: 'Event security services',
  },
  // Cultural specific
  henna_artist: {
    min: 2,
    max: 5,
    average: 3,
    description: 'Henna/Mehendi artist services',
  },
  mehendi_artist: {
    min: 2,
    max: 5,
    average: 3,
    description: 'Traditional Mehendi ceremony',
  },
  tea_ceremony: {
    min: 1,
    max: 3,
    average: 2,
    description: 'Traditional tea ceremony setup',
  },
  dragon_lion_dance: {
    min: 2,
    max: 4,
    average: 3,
    description: 'Dragon/Lion dance performance',
  },
  traditional_music: {
    min: 3,
    max: 6,
    average: 4,
    description: 'Cultural music performance',
  },
  cultural_attire: {
    min: 3,
    max: 8,
    average: 5,
    description: 'Traditional wedding attire',
  },
  religious_items: {
    min: 1,
    max: 4,
    average: 2,
    description: 'Religious ceremony items',
  },
  traditional_food: {
    min: 10,
    max: 20,
    average: 15,
    description: 'Traditional cuisine catering',
  },
};

// =============================================================================
// FORMATTING UTILITIES
// =============================================================================

const formatNumber = (amount: number, config: NumberFormatConfig): string => {
  const { decimalSeparator, thousandsSeparator, decimalPlaces } = config;

  // Handle decimal places
  const fixedAmount =
    decimalPlaces > 0
      ? amount.toFixed(decimalPlaces)
      : Math.round(amount).toString();

  // Split integer and decimal parts
  const [integerPart, decimalPart] = fixedAmount.split('.');

  // Add thousands separators
  const formattedInteger = integerPart.replace(
    /\B(?=(\d{3})+(?!\d))/g,
    thousandsSeparator,
  );

  // Combine parts
  if (decimalPart && decimalPlaces > 0) {
    return `${formattedInteger}${decimalSeparator}${decimalPart}`;
  }

  return formattedInteger;
};

const formatCurrencyAmount = (
  amount: number,
  currency: WeddingMarketCurrency,
  options: {
    showSymbol?: boolean;
    showCode?: boolean;
    compact?: boolean;
  } = {},
): string => {
  const { showSymbol = true, showCode = false, compact = false } = options;
  const config = CURRENCY_CONFIGS[currency];

  let displayAmount = amount;
  let suffix = '';

  // Compact formatting for large amounts
  if (compact && amount >= 1000000) {
    displayAmount = amount / 1000000;
    suffix = 'M';
  } else if (compact && amount >= 1000) {
    displayAmount = amount / 1000;
    suffix = 'K';
  }

  const formattedNumber = formatNumber(displayAmount, config.numberFormat);

  let result = formattedNumber + suffix;

  if (showSymbol) {
    result =
      config.position === 'before'
        ? `${config.symbol}${result}`
        : `${result} ${config.symbol}`;
  }

  if (showCode) {
    result += ` ${currency}`;
  }

  return result;
};

// =============================================================================
// COMPONENT INTERFACES
// =============================================================================

export interface CurrencyFormatterProps {
  amount: number;
  currency: WeddingMarketCurrency;
  locale?: WeddingMarketLocale;
  className?: string;
  showSymbol?: boolean;
  showCode?: boolean;
  compact?: boolean;
  showComparison?: boolean;
  comparisonCurrency?: WeddingMarketCurrency;
  showBudgetContext?: boolean;
  vendorCategory?: WeddingVendorCategory;
  animated?: boolean;
  trend?: 'up' | 'down' | 'neutral';
  precision?: number;
}

export interface BudgetBreakdownProps {
  totalBudget: number;
  currency: WeddingMarketCurrency;
  locale?: WeddingMarketLocale;
  className?: string;
  categories?: WeddingVendorCategory[];
  showPercentages?: boolean;
  interactive?: boolean;
}

// =============================================================================
// MAIN CURRENCY FORMATTER COMPONENT
// =============================================================================

export const CurrencyFormatter: React.FC<CurrencyFormatterProps> = ({
  amount,
  currency,
  locale = 'en-US',
  className = '',
  showSymbol = true,
  showCode = false,
  compact = false,
  showComparison = false,
  comparisonCurrency = 'USD',
  showBudgetContext = false,
  vendorCategory,
  animated = false,
  trend = 'neutral',
  precision,
}) => {
  const [displayAmount, setDisplayAmount] = useState(0);
  const [isVisible, setIsVisible] = useState(false);

  const config = CURRENCY_CONFIGS[currency];
  const comparisonConfig = CURRENCY_CONFIGS[comparisonCurrency];

  // Animated counting effect
  useEffect(() => {
    if (!animated) {
      setDisplayAmount(amount);
      return;
    }

    setIsVisible(true);
    const duration = 1000; // 1 second
    const steps = 60;
    const stepValue = amount / steps;
    let currentValue = 0;

    const interval = setInterval(() => {
      currentValue += stepValue;
      if (currentValue >= amount) {
        currentValue = amount;
        clearInterval(interval);
      }
      setDisplayAmount(currentValue);
    }, duration / steps);

    return () => clearInterval(interval);
  }, [amount, animated]);

  // Calculate comparison amount
  const comparisonAmount =
    showComparison && currency !== comparisonCurrency
      ? (amount / config.exchangeRateBase) * comparisonConfig.exchangeRateBase
      : null;

  // Calculate budget context
  const budgetContext =
    showBudgetContext && vendorCategory && config.averageWeddingBudget
      ? {
          percentage: (amount / config.averageWeddingBudget) * 100,
          categoryRange: VENDOR_BUDGET_PERCENTAGES[vendorCategory],
          isWithinRange:
            amount >=
              (config.averageWeddingBudget *
                VENDOR_BUDGET_PERCENTAGES[vendorCategory].min) /
                100 &&
            amount <=
              (config.averageWeddingBudget *
                VENDOR_BUDGET_PERCENTAGES[vendorCategory].max) /
                100,
        }
      : null;

  const formattedAmount = formatCurrencyAmount(displayAmount, currency, {
    showSymbol,
    showCode,
    compact,
  });

  const trendIcon = {
    up: <TrendingUpIcon className="w-4 h-4 text-green-500" />,
    down: <TrendingDownIcon className="w-4 h-4 text-red-500" />,
    neutral: null,
  };

  return (
    <div className={`inline-flex items-center gap-2 ${className}`}>
      {/* Main Amount */}
      <motion.span
        initial={animated ? { scale: 0.8, opacity: 0 } : undefined}
        animate={isVisible ? { scale: 1, opacity: 1 } : undefined}
        className="font-medium text-gray-900"
      >
        {formattedAmount}
      </motion.span>

      {/* Trend Indicator */}
      {trend !== 'neutral' && trendIcon[trend]}

      {/* Comparison Amount */}
      {showComparison &&
        comparisonAmount &&
        currency !== comparisonCurrency && (
          <span className="text-sm text-gray-500">
            (≈{' '}
            {formatCurrencyAmount(comparisonAmount, comparisonCurrency, {
              compact,
            })}
            )
          </span>
        )}

      {/* Budget Context */}
      {budgetContext && (
        <div className="flex items-center gap-1">
          <InfoIcon className="w-4 h-4 text-blue-500" />
          <span
            className={`text-xs px-2 py-1 rounded ${
              budgetContext.isWithinRange
                ? 'bg-green-100 text-green-700'
                : 'bg-yellow-100 text-yellow-700'
            }`}
          >
            {budgetContext.percentage.toFixed(1)}% of avg budget
          </span>
        </div>
      )}

      {/* Category Context */}
      {vendorCategory && VENDOR_BUDGET_PERCENTAGES[vendorCategory] && (
        <span className="text-xs text-gray-400">
          ({VENDOR_BUDGET_PERCENTAGES[vendorCategory].average}% typical)
        </span>
      )}
    </div>
  );
};

// =============================================================================
// BUDGET BREAKDOWN COMPONENT
// =============================================================================

export const BudgetBreakdown: React.FC<BudgetBreakdownProps> = ({
  totalBudget,
  currency,
  locale = 'en-US',
  className = '',
  categories = ['venue', 'catering', 'photographer', 'florist', 'music_dj'],
  showPercentages = true,
  interactive = true,
}) => {
  const [selectedCategory, setSelectedCategory] =
    useState<WeddingVendorCategory | null>(null);

  const config = CURRENCY_CONFIGS[currency];

  const budgetItems = categories.map((category) => {
    const categoryInfo = VENDOR_BUDGET_PERCENTAGES[category];
    const amount = (totalBudget * categoryInfo.average) / 100;

    return {
      category,
      amount,
      percentage: categoryInfo.average,
      description: categoryInfo.description,
      range: {
        min: (totalBudget * categoryInfo.min) / 100,
        max: (totalBudget * categoryInfo.max) / 100,
      },
    };
  });

  const totalAllocated = budgetItems.reduce(
    (sum, item) => sum + item.amount,
    0,
  );
  const remaining = totalBudget - totalAllocated;

  return (
    <div
      className={`bg-white rounded-lg border border-gray-200 p-6 ${className}`}
    >
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900">
          Budget Breakdown
        </h3>
        <div className="text-sm text-gray-500">
          Total:{' '}
          <CurrencyFormatter amount={totalBudget} currency={currency} compact />
        </div>
      </div>

      <div className="space-y-4">
        {budgetItems.map((item) => (
          <motion.div
            key={item.category}
            className={`
              p-4 rounded-lg border-2 transition-all duration-200 cursor-pointer
              ${
                selectedCategory === item.category
                  ? 'border-primary-500 bg-primary-50'
                  : 'border-gray-200 hover:border-gray-300'
              }
            `}
            onClick={() =>
              interactive &&
              setSelectedCategory(
                selectedCategory === item.category ? null : item.category,
              )
            }
            whileHover={interactive ? { scale: 1.02 } : undefined}
          >
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-medium text-gray-900 capitalize">
                    {item.category.replace('_', ' ')}
                  </h4>
                  {showPercentages && (
                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                      {item.percentage}%
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-600">{item.description}</p>
              </div>

              <div className="text-right">
                <div className="font-semibold text-gray-900">
                  <CurrencyFormatter
                    amount={item.amount}
                    currency={currency}
                    compact
                  />
                </div>
                <div className="text-xs text-gray-500">
                  <CurrencyFormatter
                    amount={item.range.min}
                    currency={currency}
                    compact
                  />{' '}
                  -{' '}
                  <CurrencyFormatter
                    amount={item.range.max}
                    currency={currency}
                    compact
                  />
                </div>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="mt-3">
              <div className="w-full bg-gray-200 rounded-full h-2">
                <motion.div
                  className="bg-primary-600 h-2 rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${item.percentage}%` }}
                  transition={{ duration: 1, delay: 0.1 }}
                />
              </div>
            </div>
          </motion.div>
        ))}

        {/* Remaining Budget */}
        {remaining > 0 && (
          <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between">
              <span className="font-medium text-gray-700">
                Remaining / Other
              </span>
              <span className="font-semibold text-gray-900">
                <CurrencyFormatter
                  amount={remaining}
                  currency={currency}
                  compact
                />
              </span>
            </div>
            <div className="text-sm text-gray-500 mt-1">
              {((remaining / totalBudget) * 100).toFixed(1)}% unallocated
            </div>
          </div>
        )}
      </div>

      {/* Market Context */}
      <div className="mt-6 pt-4 border-t border-gray-200">
        <div className="text-sm text-gray-600">
          <div className="flex items-center justify-between">
            <span>Average {config.name} wedding budget:</span>
            <span className="font-medium">
              <CurrencyFormatter
                amount={config.averageWeddingBudget}
                currency={currency}
                compact
              />
            </span>
          </div>
          <div className="mt-1 text-xs text-gray-500">
            Your budget is{' '}
            {((totalBudget / config.averageWeddingBudget) * 100).toFixed(0)}% of
            average
          </div>
        </div>
      </div>
    </div>
  );
};

export default CurrencyFormatter;
