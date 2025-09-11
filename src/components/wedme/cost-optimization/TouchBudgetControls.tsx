'use client';

import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Slider } from '@/components/ui/slider';
import {
  Plus,
  Minus,
  RotateCcw,
  Shield,
  Target,
  Zap,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Vibrate,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface BudgetCategory {
  id: string;
  name: string;
  current: number;
  allocated: number;
  recommended: number;
  color: string;
  icon: React.ReactNode;
}

interface TouchBudgetControlsProps {
  weddingId?: string;
  onBudgetChange?: (categoryId: string, newAmount: number) => void;
  onOptimizationApply?: (optimizations: Record<string, number>) => void;
  className?: string;
}

export default function TouchBudgetControls({
  weddingId,
  onBudgetChange,
  onOptimizationApply,
  className,
}: TouchBudgetControlsProps) {
  const [categories, setCategories] = useState<BudgetCategory[]>([
    {
      id: 'venue',
      name: 'Venue',
      current: 2000,
      allocated: 2500,
      recommended: 2200,
      color: 'bg-blue-500',
      icon: <Target className="h-4 w-4" />,
    },
    {
      id: 'photography',
      name: 'Photography',
      current: 1200,
      allocated: 1500,
      recommended: 1350,
      color: 'bg-purple-500',
      icon: <Zap className="h-4 w-4" />,
    },
    {
      id: 'catering',
      name: 'Catering',
      current: 800,
      allocated: 1000,
      recommended: 900,
      color: 'bg-green-500',
      icon: <TrendingUp className="h-4 w-4" />,
    },
    {
      id: 'flowers',
      name: 'Flowers',
      current: 300,
      allocated: 400,
      recommended: 350,
      color: 'bg-pink-500',
      icon: <Shield className="h-4 w-4" />,
    },
  ]);

  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [hapticEnabled, setHapticEnabled] = useState(true);
  const [isOptimizing, setIsOptimizing] = useState(false);

  // Haptic feedback function
  const triggerHaptic = useCallback(
    (type: 'light' | 'medium' | 'heavy' = 'light') => {
      if (hapticEnabled && 'vibrate' in navigator) {
        const patterns = {
          light: [10],
          medium: [20],
          heavy: [30],
        };
        navigator.vibrate(patterns[type]);
      }
    },
    [hapticEnabled],
  );

  const updateCategoryBudget = useCallback(
    (categoryId: string, newAmount: number) => {
      triggerHaptic('light');

      setCategories((prev) =>
        prev.map((cat) =>
          cat.id === categoryId
            ? { ...cat, allocated: Math.max(0, newAmount) }
            : cat,
        ),
      );

      onBudgetChange?.(categoryId, newAmount);
    },
    [onBudgetChange, triggerHaptic],
  );

  const quickAdjust = useCallback(
    (categoryId: string, amount: number) => {
      const category = categories.find((c) => c.id === categoryId);
      if (category) {
        updateCategoryBudget(categoryId, category.allocated + amount);
      }
    },
    [categories, updateCategoryBudget],
  );

  const applyRecommendations = useCallback(() => {
    setIsOptimizing(true);
    triggerHaptic('medium');

    setTimeout(() => {
      const optimizations: Record<string, number> = {};

      setCategories((prev) =>
        prev.map((cat) => {
          optimizations[cat.id] = cat.recommended;
          return { ...cat, allocated: cat.recommended };
        }),
      );

      onOptimizationApply?.(optimizations);
      setIsOptimizing(false);
      triggerHaptic('heavy');
    }, 1500);
  }, [onOptimizationApply, triggerHaptic]);

  const resetToOriginal = useCallback(() => {
    triggerHaptic('medium');
    setCategories((prev) =>
      prev.map((cat) => ({ ...cat, allocated: cat.current })),
    );
  }, [triggerHaptic]);

  const totalBudget = categories.reduce((sum, cat) => sum + cat.allocated, 0);
  const totalCurrent = categories.reduce((sum, cat) => sum + cat.current, 0);
  const totalRecommended = categories.reduce(
    (sum, cat) => sum + cat.recommended,
    0,
  );
  const savingsFromOptimization = totalBudget - totalRecommended;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
    }).format(amount);
  };

  return (
    <div className={cn('w-full max-w-md mx-auto p-4 space-y-4', className)}>
      {/* Header with Total Budget */}
      <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-2">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Budget Control</CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setHapticEnabled(!hapticEnabled)}
              className="p-2"
            >
              <Vibrate
                className={cn(
                  'h-4 w-4',
                  hapticEnabled ? 'text-green-500' : 'text-gray-400',
                )}
              />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-center space-y-2">
            <div className="text-2xl font-bold text-primary">
              {formatCurrency(totalBudget)}
            </div>
            <div className="text-sm text-muted-foreground">
              Current: {formatCurrency(totalCurrent)}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Optimization Banner */}
      {savingsFromOptimization > 0 && (
        <Card className="bg-green-50 border-green-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-green-600" />
                <div>
                  <div className="font-semibold text-green-700">
                    Save {formatCurrency(savingsFromOptimization)}
                  </div>
                  <div className="text-xs text-green-600">
                    Apply AI recommendations
                  </div>
                </div>
              </div>
              <Button
                onClick={applyRecommendations}
                disabled={isOptimizing}
                className="bg-green-600 hover:bg-green-700 h-12 px-6 touch-manipulation"
              >
                {isOptimizing ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                ) : (
                  'Optimize'
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Category Controls */}
      <div className="space-y-3">
        {categories.map((category) => {
          const usage = (category.current / category.allocated) * 100;
          const isOverBudget = category.current > category.allocated;
          const canOptimize = category.allocated !== category.recommended;

          return (
            <Card
              key={category.id}
              className={cn(
                'transition-all duration-200',
                activeCategory === category.id && 'ring-2 ring-primary',
                isOverBudget && 'border-red-300 bg-red-50',
              )}
            >
              <CardContent className="p-4">
                {/* Category Header */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        'p-2 rounded-full text-white',
                        category.color,
                      )}
                    >
                      {category.icon}
                    </div>
                    <div>
                      <div className="font-semibold">{category.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {formatCurrency(category.current)} spent
                      </div>
                    </div>
                  </div>
                  {canOptimize && (
                    <Badge variant="secondary" className="text-xs">
                      <AlertCircle className="h-3 w-3 mr-1" />
                      Can optimize
                    </Badge>
                  )}
                </div>

                {/* Progress Bar */}
                <div className="mb-3">
                  <Progress
                    value={Math.min(usage, 100)}
                    className={cn('h-2', isOverBudget && '[&>div]:bg-red-500')}
                  />
                  <div className="flex justify-between text-xs mt-1">
                    <span>{usage.toFixed(0)}% used</span>
                    <span>{formatCurrency(category.allocated)}</span>
                  </div>
                </div>

                {/* Budget Slider */}
                <div className="mb-4">
                  <Slider
                    value={[category.allocated]}
                    onValueChange={([value]) =>
                      updateCategoryBudget(category.id, value)
                    }
                    max={category.allocated * 2}
                    min={category.current}
                    step={50}
                    className="touch-manipulation"
                  />
                </div>

                {/* Quick Action Buttons */}
                <div className="grid grid-cols-4 gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => quickAdjust(category.id, -100)}
                    className="h-10 touch-manipulation"
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => quickAdjust(category.id, +100)}
                    className="h-10 touch-manipulation"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      updateCategoryBudget(category.id, category.recommended)
                    }
                    disabled={!canOptimize}
                    className="h-10 touch-manipulation"
                  >
                    <Target className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      updateCategoryBudget(category.id, category.current)
                    }
                    className="h-10 touch-manipulation"
                  >
                    <RotateCcw className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-2 gap-3 pt-4">
        <Button
          variant="outline"
          onClick={resetToOriginal}
          className="h-12 touch-manipulation"
        >
          <RotateCcw className="h-4 w-4 mr-2" />
          Reset All
        </Button>
        <Button
          onClick={() => {
            triggerHaptic('heavy');
            // Save budget changes
          }}
          className="h-12 touch-manipulation"
        >
          <CheckCircle className="h-4 w-4 mr-2" />
          Save Changes
        </Button>
      </div>
    </div>
  );
}
