'use client';

import React, { useState, useMemo } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card-untitled';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import {
  DollarSign,
  PoundSterling,
  Euro,
  Calculator,
  TrendingUp,
  TrendingDown,
  BarChart3,
  Percent,
  Info,
  AlertCircle,
  CheckCircle2,
  X,
  Target,
} from 'lucide-react';

interface PriceRange {
  min?: number;
  max?: number;
  currency: string;
}

interface PriceRangeFilterProps {
  priceRange: PriceRange;
  onChange: (priceRange: PriceRange) => void;
  className?: string;
  compact?: boolean;
  showCurrencySelector?: boolean;
  showBudgetInsights?: boolean;
  category?: string;
}

interface BudgetRange {
  id: string;
  name: string;
  min: number;
  max: number | null;
  description: string;
  popular: boolean;
  savings?: string;
}

interface CategoryBudgetData {
  category: string;
  averagePrice: number;
  priceRange: [number, number];
  budgetTip: string;
  priceBreakdown?: {
    item: string;
    percentage: number;
    averageCost: number;
  }[];
}

// Budget ranges for different price points
const BUDGET_RANGES: BudgetRange[] = [
  {
    id: 'budget',
    name: 'Budget-Friendly',
    min: 0,
    max: 500,
    description: 'Great value options for tight budgets',
    popular: true,
    savings: 'Up to 60% savings',
  },
  {
    id: 'affordable',
    name: 'Affordable',
    min: 500,
    max: 1000,
    description: 'Good quality at reasonable prices',
    popular: true,
  },
  {
    id: 'mid-range',
    name: 'Mid-Range',
    min: 1000,
    max: 2500,
    description: 'Quality service with good value',
    popular: true,
  },
  {
    id: 'premium',
    name: 'Premium',
    min: 2500,
    max: 5000,
    description: 'High-end service and quality',
    popular: false,
  },
  {
    id: 'luxury',
    name: 'Luxury',
    min: 5000,
    max: 10000,
    description: 'Top-tier luxury services',
    popular: false,
  },
  {
    id: 'ultra-luxury',
    name: 'Ultra-Luxury',
    min: 10000,
    max: null,
    description: 'No expense spared premium experience',
    popular: false,
  },
];

// Category-specific budget data
const CATEGORY_BUDGET_DATA: Record<string, CategoryBudgetData> = {
  photography: {
    category: 'Photography',
    averagePrice: 1800,
    priceRange: [500, 5000],
    budgetTip: 'Book early for better rates and consider package deals',
    priceBreakdown: [
      {
        item: 'Wedding day coverage (8 hours)',
        percentage: 60,
        averageCost: 1080,
      },
      { item: 'Edited photos and gallery', percentage: 25, averageCost: 450 },
      { item: 'Travel and equipment', percentage: 10, averageCost: 180 },
      { item: 'Additional services', percentage: 5, averageCost: 90 },
    ],
  },
  videography: {
    category: 'Videography',
    averagePrice: 1200,
    priceRange: [400, 3500],
    budgetTip: 'Consider shorter highlight videos to reduce costs',
  },
  venues: {
    category: 'Venues',
    averagePrice: 4500,
    priceRange: [1500, 15000],
    budgetTip: 'Off-season and weekday bookings offer significant savings',
  },
  catering: {
    category: 'Catering',
    averagePrice: 65,
    priceRange: [25, 150],
    budgetTip: 'Price per person - buffet style can be more cost-effective',
  },
  florists: {
    category: 'Florists',
    averagePrice: 450,
    priceRange: [150, 1200],
    budgetTip: 'Seasonal flowers and local suppliers offer better value',
  },
  'music-dj': {
    category: 'Music & DJ',
    averagePrice: 650,
    priceRange: [200, 2000],
    budgetTip: 'Book local DJs to save on travel costs',
  },
};

const CURRENCIES = [
  { code: 'GBP', symbol: '£', name: 'British Pound' },
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
];

export function PriceRangeFilter({
  priceRange,
  onChange,
  className,
  compact = false,
  showCurrencySelector = true,
  showBudgetInsights = true,
  category,
}: PriceRangeFilterProps) {
  const [customMin, setCustomMin] = useState<string>(
    priceRange.min?.toString() || '',
  );
  const [customMax, setCustomMax] = useState<string>(
    priceRange.max?.toString() || '',
  );
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [pricePerPerson, setPricePerPerson] = useState(false);
  const [guestCount, setGuestCount] = useState(80);

  const currentCurrency =
    CURRENCIES.find((c) => c.code === priceRange.currency) || CURRENCIES[0];
  const categoryData = category ? CATEGORY_BUDGET_DATA[category] : null;

  // Calculate slider values
  const maxSliderValue = categoryData?.priceRange[1] || 10000;
  const sliderMin = priceRange.min || 0;
  const sliderMax = priceRange.max || maxSliderValue;

  // Handle budget range selection
  const handleBudgetRangeSelect = (range: BudgetRange) => {
    onChange({
      ...priceRange,
      min: range.min,
      max: range.max || undefined,
    });
    setCustomMin(range.min.toString());
    setCustomMax(range.max?.toString() || '');
  };

  // Handle slider changes
  const handleSliderChange = ([min, max]: [number, number]) => {
    onChange({
      ...priceRange,
      min: min === 0 ? undefined : min,
      max: max === maxSliderValue ? undefined : max,
    });
    setCustomMin(min === 0 ? '' : min.toString());
    setCustomMax(max === maxSliderValue ? '' : max.toString());
  };

  // Handle custom input changes
  const handleCustomMinChange = (value: string) => {
    setCustomMin(value);
    const numValue = value ? parseInt(value) : undefined;
    onChange({
      ...priceRange,
      min: numValue,
    });
  };

  const handleCustomMaxChange = (value: string) => {
    setCustomMax(value);
    const numValue = value ? parseInt(value) : undefined;
    onChange({
      ...priceRange,
      max: numValue,
    });
  };

  // Handle currency change
  const handleCurrencyChange = (currency: string) => {
    onChange({
      ...priceRange,
      currency,
    });
  };

  // Clear price range
  const clearPriceRange = () => {
    onChange({
      ...priceRange,
      min: undefined,
      max: undefined,
    });
    setCustomMin('');
    setCustomMax('');
  };

  // Format price display
  const formatPrice = (amount: number | undefined, showCurrency = true) => {
    if (amount === undefined) return showCurrency ? 'Any' : '';
    return showCurrency
      ? `${currentCurrency.symbol}${amount.toLocaleString()}`
      : amount.toLocaleString();
  };

  // Calculate per person price
  const calculatePerPersonPrice = (totalPrice: number) => {
    return totalPrice / guestCount;
  };

  // Get price range summary
  const getPriceRangeSummary = () => {
    if (!priceRange.min && !priceRange.max) return null;

    const min = priceRange.min || 0;
    const max = priceRange.max;

    if (max) {
      return `${formatPrice(min)} - ${formatPrice(max)}`;
    } else {
      return `${formatPrice(min)}+`;
    }
  };

  // Find current budget category
  const currentBudgetRange = useMemo(() => {
    if (!priceRange.min && !priceRange.max) return null;

    return BUDGET_RANGES.find((range) => {
      const min = priceRange.min || 0;
      const max = priceRange.max || Number.MAX_VALUE;

      return min >= range.min && (range.max === null || max <= range.max);
    });
  }, [priceRange.min, priceRange.max]);

  return (
    <Card className={cn('space-y-4', className)}>
      <CardHeader className={cn('pb-3', compact && 'pb-2')}>
        <div className="flex items-center justify-between">
          <CardTitle
            className={cn(
              'text-base flex items-center space-x-2',
              compact && 'text-sm',
            )}
          >
            <PoundSterling className="w-4 h-4" />
            <span>Budget Range</span>
            {(priceRange.min || priceRange.max) && (
              <Badge variant="secondary" className="text-xs">
                {getPriceRangeSummary()}
              </Badge>
            )}
          </CardTitle>

          {(priceRange.min || priceRange.max) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearPriceRange}
              className="text-red-500 hover:text-red-700"
            >
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Currency Selector */}
        {showCurrencySelector && (
          <div className="flex items-center space-x-2">
            <Label className="text-sm">Currency:</Label>
            <Select
              value={priceRange.currency}
              onValueChange={handleCurrencyChange}
            >
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CURRENCIES.map((currency) => (
                  <SelectItem key={currency.code} value={currency.code}>
                    {currency.symbol} {currency.code}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Quick Budget Ranges */}
        <div>
          <Label className="text-sm font-medium mb-3 block">
            Popular Budget Ranges
          </Label>
          <div className="grid grid-cols-2 gap-2">
            {BUDGET_RANGES.filter((range) =>
              compact ? range.popular : true,
            ).map((range) => {
              const isSelected = currentBudgetRange?.id === range.id;

              return (
                <Button
                  key={range.id}
                  variant={isSelected ? 'default' : 'outline'}
                  onClick={() => handleBudgetRangeSelect(range)}
                  className={cn(
                    'h-auto p-3 flex flex-col items-start text-left',
                    isSelected && 'ring-2 ring-blue-500',
                  )}
                >
                  <div className="flex items-center justify-between w-full mb-1">
                    <span className="font-medium text-sm">{range.name}</span>
                    {range.popular && (
                      <Badge variant="secondary" className="text-xs">
                        Popular
                      </Badge>
                    )}
                  </div>

                  <div className="text-xs text-left mb-1">
                    {formatPrice(range.min)} -{' '}
                    {range.max ? formatPrice(range.max) : 'No limit'}
                  </div>

                  {range.savings && (
                    <div className="text-xs text-green-600 font-medium">
                      {range.savings}
                    </div>
                  )}
                </Button>
              );
            })}
          </div>
        </div>

        <Separator />

        {/* Custom Range Slider */}
        <div className="space-y-4">
          <Label className="text-sm font-medium">Custom Range</Label>

          <div className="space-y-3">
            <div className="px-2">
              <Slider
                value={[sliderMin, sliderMax]}
                onValueChange={handleSliderChange}
                max={maxSliderValue}
                min={0}
                step={50}
                className="w-full"
                disabled={!categoryData && maxSliderValue === 10000}
              />

              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>{currentCurrency.symbol}0</span>
                <span>{formatPrice(maxSliderValue)}</span>
              </div>
            </div>

            {/* Custom Input Fields */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="min-price" className="text-sm">
                  Minimum {currentCurrency.symbol}
                </Label>
                <Input
                  id="min-price"
                  type="number"
                  placeholder="0"
                  value={customMin}
                  onChange={(e) => handleCustomMinChange(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="max-price" className="text-sm">
                  Maximum {currentCurrency.symbol}
                </Label>
                <Input
                  id="max-price"
                  type="number"
                  placeholder="No limit"
                  value={customMax}
                  onChange={(e) => handleCustomMaxChange(e.target.value)}
                />
              </div>
            </div>

            {/* Price Per Person Toggle */}
            <div className="flex items-center space-x-2">
              <Switch
                id="price-per-person"
                checked={pricePerPerson}
                onCheckedChange={setPricePerPerson}
              />
              <Label htmlFor="price-per-person" className="text-sm">
                Show price per person ({guestCount} guests)
              </Label>
            </div>

            {pricePerPerson && (
              <div className="p-3 bg-blue-50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">
                    Per person budget:
                  </span>
                  <Input
                    type="number"
                    value={guestCount}
                    onChange={(e) =>
                      setGuestCount(parseInt(e.target.value) || 80)
                    }
                    className="w-20 h-8 text-center"
                    min="1"
                  />
                </div>

                {(priceRange.min || priceRange.max) && (
                  <div className="text-sm text-blue-700">
                    {priceRange.min && (
                      <span>
                        Min:{' '}
                        {formatPrice(calculatePerPersonPrice(priceRange.min))}{' '}
                        per person
                      </span>
                    )}
                    {priceRange.min && priceRange.max && (
                      <span className="mx-2">•</span>
                    )}
                    {priceRange.max && (
                      <span>
                        Max:{' '}
                        {formatPrice(calculatePerPersonPrice(priceRange.max))}{' '}
                        per person
                      </span>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Category Insights */}
        {showBudgetInsights && categoryData && !compact && (
          <>
            <Separator />
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <BarChart3 className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-medium">
                  Budget Insights for {categoryData.category}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="p-3 bg-gray-50 rounded-lg">
                  <div className="text-xs text-gray-600 mb-1">
                    Average Price
                  </div>
                  <div className="font-semibold text-gray-900">
                    {formatPrice(categoryData.averagePrice)}
                  </div>
                </div>

                <div className="p-3 bg-gray-50 rounded-lg">
                  <div className="text-xs text-gray-600 mb-1">
                    Typical Range
                  </div>
                  <div className="font-semibold text-gray-900">
                    {formatPrice(categoryData.priceRange[0])} -{' '}
                    {formatPrice(categoryData.priceRange[1])}
                  </div>
                </div>

                <div className="p-3 bg-gray-50 rounded-lg">
                  <div className="text-xs text-gray-600 mb-1">Your Budget</div>
                  <div className="font-semibold text-gray-900">
                    {getPriceRangeSummary() || 'Not set'}
                  </div>
                </div>
              </div>

              {/* Budget Tip */}
              <div className="flex items-start space-x-2 p-3 bg-yellow-50 rounded-lg">
                <Info className="w-4 h-4 text-yellow-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-yellow-800">
                  <strong>Tip:</strong> {categoryData.budgetTip}
                </div>
              </div>

              {/* Price Breakdown */}
              {categoryData.priceBreakdown && (
                <div className="space-y-2">
                  <div className="text-sm font-medium">
                    Typical cost breakdown:
                  </div>
                  {categoryData.priceBreakdown.map((item, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between text-sm"
                    >
                      <span className="text-gray-600">{item.item}</span>
                      <div className="flex items-center space-x-2">
                        <span className="text-gray-500">
                          {item.percentage}%
                        </span>
                        <span className="font-medium">
                          {formatPrice(item.averageCost)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {/* Budget Status */}
        {currentBudgetRange && (
          <div className="flex items-center space-x-2 p-3 bg-green-50 rounded-lg">
            <CheckCircle2 className="w-4 h-4 text-green-600" />
            <div className="flex-1">
              <div className="text-sm font-medium text-green-900">
                {currentBudgetRange.name} Budget Range
              </div>
              <div className="text-xs text-green-700">
                {currentBudgetRange.description}
              </div>
            </div>
            {currentBudgetRange.savings && (
              <Badge
                variant="secondary"
                className="bg-green-100 text-green-800"
              >
                {currentBudgetRange.savings}
              </Badge>
            )}
          </div>
        )}

        {/* Price Comparison */}
        {categoryData && (priceRange.min || priceRange.max) && (
          <div className="space-y-2">
            <div className="text-sm font-medium">Price comparison:</div>
            <div className="space-y-1">
              {priceRange.max && priceRange.max < categoryData.averagePrice && (
                <div className="flex items-center space-x-2 text-green-600">
                  <TrendingDown className="w-4 h-4" />
                  <span className="text-sm">
                    Below average by{' '}
                    {formatPrice(categoryData.averagePrice - priceRange.max)}
                  </span>
                </div>
              )}

              {priceRange.min && priceRange.min > categoryData.averagePrice && (
                <div className="flex items-center space-x-2 text-blue-600">
                  <TrendingUp className="w-4 h-4" />
                  <span className="text-sm">
                    Above average by{' '}
                    {formatPrice(priceRange.min - categoryData.averagePrice)}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default PriceRangeFilter;
