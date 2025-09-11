'use client';

import React, { useState, useMemo } from 'react';
import {
  DollarSign,
  PieChart,
  TrendingUp,
  AlertTriangle,
  Calculator,
  Heart,
  Target,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { WeddingFormField } from '@/types/form-builder';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';

interface BudgetRangeFieldProps {
  field: WeddingFormField;
  value?: {
    total_budget?: number;
    budget_range?: {
      min?: number;
      max?: number;
    };
    budget_flexibility?: 'strict' | 'somewhat_flexible' | 'very_flexible';
    budget_breakdown?: {
      venue?: number;
      catering?: number;
      photography?: number;
      flowers?: number;
      music_entertainment?: number;
      dress_attire?: number;
      transportation?: number;
      rings?: number;
      invitations?: number;
      miscellaneous?: number;
    };
    priority_categories?: string[];
    savings_target?: number;
    payment_timeline?: {
      deposits_paid?: number;
      remaining_balance?: number;
      payment_schedule?: 'monthly' | 'quarterly' | 'milestone_based';
    };
    budget_concerns?: string;
  };
  error?: string;
  onChange: (value: any) => void;
  disabled?: boolean;
}

/**
 * BudgetRangeField - Comprehensive wedding budget management
 *
 * Features:
 * - Total budget with flexible range options
 * - Industry-standard budget category breakdown
 * - Priority category selection
 * - Budget flexibility assessment
 * - Payment timeline tracking
 * - Cost-per-guest calculations
 * - Vendor budget allocation guidance
 * - Regional cost adjustments
 */
export function BudgetRangeField({
  field,
  value = {},
  error,
  onChange,
  disabled = false,
}: BudgetRangeFieldProps) {
  const [activeTab, setActiveTab] = useState('overview');
  const [showAdvancedBreakdown, setShowAdvancedBreakdown] = useState(false);

  // Industry-standard wedding budget categories with typical percentages
  const budgetCategories = [
    {
      key: 'venue',
      label: 'Venue & Reception',
      percentage: 40,
      icon: '🏛️',
      color: 'blue',
    },
    {
      key: 'catering',
      label: 'Catering & Bar',
      percentage: 25,
      icon: '🍽️',
      color: 'green',
    },
    {
      key: 'photography',
      label: 'Photography & Videography',
      percentage: 10,
      icon: '📸',
      color: 'purple',
    },
    {
      key: 'flowers',
      label: 'Flowers & Decorations',
      percentage: 8,
      icon: '💐',
      color: 'rose',
    },
    {
      key: 'music_entertainment',
      label: 'Music & Entertainment',
      percentage: 5,
      icon: '🎵',
      color: 'amber',
    },
    {
      key: 'dress_attire',
      label: 'Dress & Attire',
      percentage: 5,
      icon: '👰',
      color: 'pink',
    },
    {
      key: 'rings',
      label: 'Wedding Rings',
      percentage: 3,
      icon: '💍',
      color: 'yellow',
    },
    {
      key: 'transportation',
      label: 'Transportation',
      percentage: 2,
      icon: '🚗',
      color: 'gray',
    },
    {
      key: 'invitations',
      label: 'Invitations & Stationery',
      percentage: 1,
      icon: '💌',
      color: 'indigo',
    },
    {
      key: 'miscellaneous',
      label: 'Miscellaneous',
      percentage: 1,
      icon: '📝',
      color: 'slate',
    },
  ];

  // Common wedding budget ranges
  const budgetRanges = [
    {
      min: 5000,
      max: 10000,
      label: 'Intimate Wedding',
      description: '£5K - £10K',
    },
    {
      min: 10000,
      max: 20000,
      label: 'Small Wedding',
      description: '£10K - £20K',
    },
    {
      min: 20000,
      max: 35000,
      label: 'Medium Wedding',
      description: '£20K - £35K',
    },
    {
      min: 35000,
      max: 50000,
      label: 'Large Wedding',
      description: '£35K - £50K',
    },
    {
      min: 50000,
      max: 75000,
      label: 'Luxury Wedding',
      description: '£50K - £75K',
    },
    { min: 75000, max: 999999, label: 'Ultra-Luxury', description: '£75K+' },
  ];

  // Calculate budget breakdown
  const calculatedBreakdown = useMemo(() => {
    const totalBudget = value.total_budget || value.budget_range?.max || 30000;
    const breakdown: Record<string, number> = {};
    let allocatedTotal = 0;

    budgetCategories.forEach((category) => {
      const userAmount =
        value.budget_breakdown?.[
          category.key as keyof typeof value.budget_breakdown
        ];
      const suggestedAmount = Math.round(
        totalBudget * (category.percentage / 100),
      );
      breakdown[category.key] = userAmount || suggestedAmount;
      allocatedTotal += breakdown[category.key];
    });

    const remainingBudget = totalBudget - allocatedTotal;
    const isOverBudget = allocatedTotal > totalBudget;

    return {
      breakdown,
      allocatedTotal,
      remainingBudget,
      isOverBudget,
      totalBudget,
    };
  }, [value.total_budget, value.budget_range, value.budget_breakdown]);

  // Handle field changes
  const handleFieldChange = (field: string, newValue: any) => {
    onChange({
      ...value,
      [field]: newValue,
    });
  };

  // Handle nested changes
  const handleNestedChange = (
    section: string,
    field: string,
    newValue: any,
  ) => {
    onChange({
      ...value,
      [section]: {
        ...value[section as keyof typeof value],
        [field]: newValue,
      },
    });
  };

  // Handle budget range selection
  const handleBudgetRangeSelect = (range: (typeof budgetRanges)[0]) => {
    handleFieldChange('budget_range', { min: range.min, max: range.max });
    if (!value.total_budget) {
      handleFieldChange(
        'total_budget',
        Math.round((range.min + range.max) / 2),
      );
    }
  };

  // Handle category budget change
  const handleCategoryBudgetChange = (category: string, amount: number) => {
    handleNestedChange('budget_breakdown', category, amount);
  };

  // Auto-calculate suggested budget from categories
  const suggestBudgetFromBreakdown = () => {
    const total = Object.values(calculatedBreakdown.breakdown).reduce(
      (sum, amount) => sum + amount,
      0,
    );
    handleFieldChange('total_budget', total);
  };

  return (
    <div className="space-y-4">
      {/* Field Label */}
      <div className="flex items-center gap-2">
        <DollarSign className="w-5 h-5 text-green-500" />
        <Label className="text-base font-medium">
          {field.label}
          {field.validation?.required && (
            <span className="text-red-500 ml-1">*</span>
          )}
        </Label>
      </div>

      {/* Field Description */}
      {field.description && (
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {field.description}
        </p>
      )}

      {/* Wedding Context Help */}
      {field.weddingContext?.helpText && (
        <div className="p-3 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg">
          <p className="text-sm text-green-700 dark:text-green-300 flex items-center gap-2">
            <Heart className="w-4 h-4" />
            {field.weddingContext.helpText}
          </p>
        </div>
      )}

      {/* Quick Budget Range Selection */}
      <Card className="p-4">
        <Label className="text-sm font-medium mb-3 block">
          Choose Your Budget Range
        </Label>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {budgetRanges.map((range) => (
            <Button
              key={range.label}
              variant="outline"
              className={cn(
                'h-auto p-4 flex flex-col items-start text-left',
                value.budget_range?.min === range.min &&
                  value.budget_range?.max === range.max &&
                  'border-green-500 bg-green-50 dark:bg-green-950/20',
              )}
              onClick={() => handleBudgetRangeSelect(range)}
              disabled={disabled}
            >
              <div className="font-medium text-sm">{range.label}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                {range.description}
              </div>
            </Button>
          ))}
        </div>
      </Card>

      {/* Budget Overview */}
      <Card className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              £{calculatedBreakdown.totalBudget.toLocaleString()}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              Total Budget
            </div>
          </div>
          <div className="text-center">
            <div
              className={cn(
                'text-2xl font-bold',
                calculatedBreakdown.isOverBudget
                  ? 'text-red-600 dark:text-red-400'
                  : 'text-blue-600 dark:text-blue-400',
              )}
            >
              £{calculatedBreakdown.allocatedTotal.toLocaleString()}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              Allocated
            </div>
          </div>
          <div className="text-center">
            <div
              className={cn(
                'text-2xl font-bold',
                calculatedBreakdown.remainingBudget < 0
                  ? 'text-red-600 dark:text-red-400'
                  : 'text-green-600 dark:text-green-400',
              )}
            >
              £{calculatedBreakdown.remainingBudget.toLocaleString()}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              {calculatedBreakdown.remainingBudget < 0
                ? 'Over Budget'
                : 'Remaining'}
            </div>
          </div>
        </div>

        {/* Budget Progress Bar */}
        <div className="mt-4">
          <Progress
            value={Math.min(
              (calculatedBreakdown.allocatedTotal /
                calculatedBreakdown.totalBudget) *
                100,
              100,
            )}
            className={cn(
              'h-3',
              calculatedBreakdown.isOverBudget && 'bg-red-100 dark:bg-red-900',
            )}
          />
          <div className="flex justify-between mt-1 text-xs text-gray-500 dark:text-gray-400">
            <span>£0</span>
            <span>
              {Math.round(
                (calculatedBreakdown.allocatedTotal /
                  calculatedBreakdown.totalBudget) *
                  100,
              )}
              % allocated
            </span>
            <span>£{calculatedBreakdown.totalBudget.toLocaleString()}</span>
          </div>
        </div>
      </Card>

      {/* Budget Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="breakdown">Breakdown</TabsTrigger>
          <TabsTrigger value="priorities">Priorities</TabsTrigger>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Total Budget */}
            <Card className="p-4">
              <Label className="text-sm font-medium mb-3 block">
                Total Wedding Budget
              </Label>
              <Input
                type="number"
                value={value.total_budget || ''}
                onChange={(e) =>
                  handleFieldChange(
                    'total_budget',
                    parseInt(e.target.value) || 0,
                  )
                }
                placeholder="30000"
                min="1000"
                max="500000"
                step="1000"
                disabled={disabled}
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Enter your maximum wedding budget in GBP
              </p>
            </Card>

            {/* Budget Flexibility */}
            <Card className="p-4">
              <Label className="text-sm font-medium mb-3 block">
                Budget Flexibility
              </Label>
              <Select
                value={value.budget_flexibility || ''}
                onValueChange={(flexibility) =>
                  handleFieldChange('budget_flexibility', flexibility)
                }
                disabled={disabled}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select flexibility" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="strict">
                    <div className="flex flex-col">
                      <span>Strict Budget</span>
                      <span className="text-xs text-gray-500">
                        Cannot exceed budget
                      </span>
                    </div>
                  </SelectItem>
                  <SelectItem value="somewhat_flexible">
                    <div className="flex flex-col">
                      <span>Somewhat Flexible</span>
                      <span className="text-xs text-gray-500">
                        Can exceed by 5-10%
                      </span>
                    </div>
                  </SelectItem>
                  <SelectItem value="very_flexible">
                    <div className="flex flex-col">
                      <span>Very Flexible</span>
                      <span className="text-xs text-gray-500">
                        Budget is just a guideline
                      </span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </Card>
          </div>

          {/* Budget Range Slider */}
          {value.budget_range && (
            <Card className="p-4">
              <Label className="text-sm font-medium mb-3 block">
                Budget Range
              </Label>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400 mb-2">
                    <span>
                      Minimum: £{value.budget_range.min?.toLocaleString()}
                    </span>
                    <span>
                      Maximum: £{value.budget_range.max?.toLocaleString()}
                    </span>
                  </div>
                  <div className="px-3 py-2 bg-gray-50 dark:bg-gray-800 rounded text-center">
                    <span className="text-lg font-medium">
                      £{value.budget_range.min?.toLocaleString()} - £
                      {value.budget_range.max?.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            </Card>
          )}
        </TabsContent>

        {/* Budget Breakdown Tab */}
        <TabsContent value="breakdown" className="space-y-4 mt-4">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">
              Budget Category Breakdown
            </Label>
            <Button
              variant="outline"
              size="sm"
              onClick={suggestBudgetFromBreakdown}
              disabled={disabled}
            >
              <Calculator className="w-4 h-4 mr-2" />
              Use as Total Budget
            </Button>
          </div>

          <div className="space-y-3">
            {budgetCategories.map((category) => {
              const amount = calculatedBreakdown.breakdown[category.key];
              const percentage =
                calculatedBreakdown.totalBudget > 0
                  ? (amount / calculatedBreakdown.totalBudget) * 100
                  : 0;

              return (
                <Card key={category.key} className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{category.icon}</span>
                      <Label className="text-sm font-medium">
                        {category.label}
                      </Label>
                      <Badge variant="secondary" className="text-xs">
                        {category.percentage}% typical
                      </Badge>
                    </div>
                    <div className="text-sm font-medium">
                      £{amount.toLocaleString()} ({Math.round(percentage)}%)
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      type="number"
                      value={
                        value.budget_breakdown?.[
                          category.key as keyof typeof value.budget_breakdown
                        ] || amount
                      }
                      onChange={(e) =>
                        handleCategoryBudgetChange(
                          category.key,
                          parseInt(e.target.value) || 0,
                        )
                      }
                      placeholder={amount.toString()}
                      step="100"
                      disabled={disabled}
                      className="text-sm"
                    />
                    <div className="flex items-center">
                      <Progress
                        value={Math.min(percentage, 100)}
                        className="flex-1"
                      />
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>

          {calculatedBreakdown.isOverBudget && (
            <Card className="p-4 bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800">
              <div className="flex items-center gap-2 text-red-700 dark:text-red-300">
                <AlertTriangle className="w-4 h-4" />
                <span className="font-medium">Budget Exceeded</span>
              </div>
              <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                You're over budget by £
                {Math.abs(calculatedBreakdown.remainingBudget).toLocaleString()}
                . Consider adjusting category amounts or increasing your total
                budget.
              </p>
            </Card>
          )}
        </TabsContent>

        {/* Priorities Tab */}
        <TabsContent value="priorities" className="space-y-4 mt-4">
          <Card className="p-4">
            <Label className="text-sm font-medium mb-3 block">
              Priority Categories
            </Label>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
              Select the most important aspects of your wedding where you want
              to invest more
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {budgetCategories.map((category) => (
                <label
                  key={category.key}
                  className="flex items-center gap-2 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={(value.priority_categories || []).includes(
                      category.key,
                    )}
                    onChange={(e) => {
                      const currentPriorities = value.priority_categories || [];
                      if (e.target.checked) {
                        handleFieldChange('priority_categories', [
                          ...currentPriorities,
                          category.key,
                        ]);
                      } else {
                        handleFieldChange(
                          'priority_categories',
                          currentPriorities.filter((p) => p !== category.key),
                        );
                      }
                    }}
                    disabled={disabled}
                    className="rounded text-green-600 focus:ring-green-500"
                  />
                  <span className="text-lg">{category.icon}</span>
                  <span className="text-sm">{category.label}</span>
                </label>
              ))}
            </div>
          </Card>

          {/* Savings Target */}
          <Card className="p-4">
            <Label className="text-sm font-medium mb-3 block">
              Savings Target
            </Label>
            <Input
              type="number"
              value={value.savings_target || ''}
              onChange={(e) =>
                handleFieldChange(
                  'savings_target',
                  parseInt(e.target.value) || 0,
                )
              }
              placeholder="5000"
              min="0"
              step="500"
              disabled={disabled}
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Amount you're still saving towards your wedding budget
            </p>
          </Card>
        </TabsContent>

        {/* Timeline Tab */}
        <TabsContent value="timeline" className="space-y-4 mt-4">
          <Card className="p-4">
            <Label className="text-sm font-medium mb-3 block">
              Payment Timeline
            </Label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">
                  Deposits Paid
                </Label>
                <Input
                  type="number"
                  value={value.payment_timeline?.deposits_paid || ''}
                  onChange={(e) =>
                    handleNestedChange(
                      'payment_timeline',
                      'deposits_paid',
                      parseInt(e.target.value) || 0,
                    )
                  }
                  placeholder="8000"
                  min="0"
                  step="500"
                  disabled={disabled}
                />
              </div>
              <div>
                <Label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">
                  Remaining Balance
                </Label>
                <Input
                  type="number"
                  value={value.payment_timeline?.remaining_balance || ''}
                  onChange={(e) =>
                    handleNestedChange(
                      'payment_timeline',
                      'remaining_balance',
                      parseInt(e.target.value) || 0,
                    )
                  }
                  placeholder="22000"
                  min="0"
                  step="500"
                  disabled={disabled}
                />
              </div>
            </div>

            <div className="mt-4">
              <Label className="text-xs text-gray-500 dark:text-gray-400 mb-2 block">
                Payment Schedule
              </Label>
              <Select
                value={value.payment_timeline?.payment_schedule || ''}
                onValueChange={(schedule) =>
                  handleNestedChange(
                    'payment_timeline',
                    'payment_schedule',
                    schedule,
                  )
                }
                disabled={disabled}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select payment schedule" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Monthly Payments</SelectItem>
                  <SelectItem value="quarterly">Quarterly Payments</SelectItem>
                  <SelectItem value="milestone_based">
                    Milestone Based
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </Card>

          {/* Budget Concerns */}
          <Card className="p-4">
            <Label className="text-sm font-medium mb-3 block">
              Budget Concerns or Notes
            </Label>
            <textarea
              value={value.budget_concerns || ''}
              onChange={(e) =>
                handleFieldChange('budget_concerns', e.target.value)
              }
              placeholder="Any specific budget concerns, constraints, or notes..."
              rows={3}
              disabled={disabled}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm resize-y"
            />
          </Card>
        </TabsContent>
      </Tabs>

      {/* Budget Tips */}
      <div className="p-4 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg">
        <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2 flex items-center gap-2">
          <Target className="w-4 h-4" />
          Wedding Budget Tips
        </h4>
        <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
          <li>• Set aside 5-10% of your budget for unexpected costs</li>
          <li>
            • Venue and catering typically consume 65% of the total budget
          </li>
          <li>• Consider off-peak dates and times for significant savings</li>
          <li>• Book vendors early for better pricing and availability</li>
          <li>• Track all expenses to avoid budget surprises</li>
        </ul>
      </div>

      {/* Error Display */}
      {error && (
        <div className="flex items-center gap-2 text-red-600 dark:text-red-400 text-sm">
          <AlertTriangle className="w-4 h-4" />
          {error}
        </div>
      )}
    </div>
  );
}

export default BudgetRangeField;
