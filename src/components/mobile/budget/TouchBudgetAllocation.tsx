'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { motion, PanInfo } from 'framer-motion';
// useMotionValue // useMotionValue removed - use useState
// useTransform // useTransform removed - use useState/useEffect
import { cn } from '@/lib/utils';

interface BudgetCategory {
  id: string;
  name: string;
  allocated: number;
  spent: number;
  color: string;
  percentage: number;
}

interface BudgetAllocation {
  [categoryId: string]: number;
}

interface TouchBudgetAllocationProps {
  categories: BudgetCategory[];
  totalBudget: number;
  onCategoriesUpdate: (categories: BudgetCategory[]) => void;
  gestureEnabled: boolean;
  hapticFeedback: boolean;
}

interface DragState {
  isDragging: boolean;
  dragCategory: string | null;
  startValue: number;
  originalAllocations: BudgetAllocation;
}

export function TouchBudgetAllocation({
  categories,
  totalBudget,
  onCategoriesUpdate,
  gestureEnabled,
  hapticFeedback,
}: TouchBudgetAllocationProps) {
  const [dragState, setDragState] = useState<DragState>({
    isDragging: false,
    dragCategory: null,
    startValue: 0,
    originalAllocations: {},
  });
  const [tempAllocations, setTempAllocations] = useState<BudgetAllocation>({});

  const containerRef = useRef<HTMLDivElement>(null);

  // Initialize allocations from categories
  useEffect(() => {
    const allocations: BudgetAllocation = {};
    categories.forEach((cat) => {
      allocations[cat.id] = cat.allocated;
    });
    setTempAllocations(allocations);
  }, [categories]);

  // Haptic feedback helper
  const triggerHaptic = useCallback(
    (type: 'light' | 'medium' | 'heavy' = 'light') => {
      if (!hapticFeedback || !('vibrate' in navigator)) return;

      const patterns = {
        light: 10,
        medium: 20,
        heavy: 50,
      };
      navigator.vibrate(patterns[type]);
    },
    [hapticFeedback],
  );

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount / 100);
  };

  // Calculate percentage of total budget
  const getPercentage = (amount: number) => {
    return ((amount / totalBudget) * 100).toFixed(1);
  };

  // Handle drag start
  const handleDragStart = useCallback(
    (categoryId: string, currentValue: number) => {
      if (!gestureEnabled) return;

      const allocations: BudgetAllocation = {};
      categories.forEach((cat) => {
        allocations[cat.id] = tempAllocations[cat.id] || cat.allocated;
      });

      setDragState({
        isDragging: true,
        dragCategory: categoryId,
        startValue: currentValue,
        originalAllocations: allocations,
      });

      triggerHaptic('light');
    },
    [categories, tempAllocations, gestureEnabled, triggerHaptic],
  );

  // Handle drag motion
  const handleDrag = useCallback(
    (categoryId: string, info: PanInfo) => {
      if (!dragState.isDragging || dragState.dragCategory !== categoryId)
        return;

      const sensitivity = totalBudget / 300; // Adjust sensitivity based on budget size
      const change = -info.offset.y * sensitivity; // Negative for natural gesture (up = increase)
      const newValue = Math.max(0, dragState.startValue + change);

      // Update temp allocations
      setTempAllocations((prev) => ({
        ...prev,
        [categoryId]: Math.round(newValue),
      }));
    },
    [dragState, totalBudget],
  );

  // Handle drag end
  const handleDragEnd = useCallback(
    (categoryId: string, info: PanInfo) => {
      if (!dragState.isDragging) return;

      const velocity = Math.abs(info.velocity.y);
      if (velocity > 50) {
        triggerHaptic('medium');
      }

      // Update categories with final allocations
      const updatedCategories = categories.map((cat) => ({
        ...cat,
        allocated: tempAllocations[cat.id] || cat.allocated,
        percentage:
          ((tempAllocations[cat.id] || cat.allocated) / totalBudget) * 100,
      }));

      onCategoriesUpdate(updatedCategories);

      setDragState({
        isDragging: false,
        dragCategory: null,
        startValue: 0,
        originalAllocations: {},
      });

      triggerHaptic('light');
    },
    [
      dragState,
      categories,
      tempAllocations,
      totalBudget,
      onCategoriesUpdate,
      triggerHaptic,
    ],
  );

  // Handle slider input
  const handleSliderChange = useCallback(
    (categoryId: string, value: number) => {
      const newAllocations = {
        ...tempAllocations,
        [categoryId]: value,
      };
      setTempAllocations(newAllocations);

      const updatedCategories = categories.map((cat) => ({
        ...cat,
        allocated: newAllocations[cat.id] || cat.allocated,
        percentage:
          ((newAllocations[cat.id] || cat.allocated) / totalBudget) * 100,
      }));

      onCategoriesUpdate(updatedCategories);
      triggerHaptic('light');
    },
    [
      categories,
      tempAllocations,
      totalBudget,
      onCategoriesUpdate,
      triggerHaptic,
    ],
  );

  // Calculate total allocated and remaining
  const totalAllocated = Object.values(tempAllocations).reduce(
    (sum, val) => sum + (val || 0),
    0,
  );
  const remaining = totalBudget - totalAllocated;
  const isOverAllocated = totalAllocated > totalBudget;

  // Reset allocations
  const handleReset = useCallback(() => {
    const resetAllocations: BudgetAllocation = {};
    categories.forEach((cat) => {
      resetAllocations[cat.id] = cat.spent + remaining / categories.length;
    });

    setTempAllocations(resetAllocations);

    const updatedCategories = categories.map((cat) => ({
      ...cat,
      allocated: resetAllocations[cat.id],
      percentage: (resetAllocations[cat.id] / totalBudget) * 100,
    }));

    onCategoriesUpdate(updatedCategories);
    triggerHaptic('heavy');
  }, [categories, remaining, totalBudget, onCategoriesUpdate, triggerHaptic]);

  // Auto-balance allocations
  const handleAutoBalance = useCallback(() => {
    const totalSpent = categories.reduce((sum, cat) => sum + cat.spent, 0);
    const availableForAllocation = totalBudget - totalSpent;

    const balancedAllocations: BudgetAllocation = {};
    categories.forEach((cat) => {
      // Keep spent amount and distribute remaining proportionally
      const proportionalShare = (cat.percentage / 100) * availableForAllocation;
      balancedAllocations[cat.id] = cat.spent + Math.max(0, proportionalShare);
    });

    setTempAllocations(balancedAllocations);

    const updatedCategories = categories.map((cat) => ({
      ...cat,
      allocated: balancedAllocations[cat.id],
      percentage: (balancedAllocations[cat.id] / totalBudget) * 100,
    }));

    onCategoriesUpdate(updatedCategories);
    triggerHaptic('medium');
  }, [categories, totalBudget, onCategoriesUpdate, triggerHaptic]);

  return (
    <div className="h-full bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b px-4 py-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">
            Budget Allocation
          </h2>
          <div className="flex gap-2">
            <button
              onClick={handleAutoBalance}
              className="px-3 py-1 bg-blue-500 text-white text-sm rounded-full"
            >
              Auto Balance
            </button>
            <button
              onClick={handleReset}
              className="px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded-full"
            >
              Reset
            </button>
          </div>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-sm font-medium text-gray-900">
              {formatCurrency(totalBudget)}
            </div>
            <div className="text-xs text-gray-500">Total Budget</div>
          </div>
          <div>
            <div className="text-sm font-medium text-blue-600">
              {formatCurrency(totalAllocated)}
            </div>
            <div className="text-xs text-gray-500">Allocated</div>
          </div>
          <div>
            <div
              className={cn(
                'text-sm font-medium',
                isOverAllocated ? 'text-red-600' : 'text-green-600',
              )}
            >
              {formatCurrency(Math.abs(remaining))}
            </div>
            <div className="text-xs text-gray-500">
              {isOverAllocated ? 'Over' : 'Remaining'}
            </div>
          </div>
        </div>

        {/* Over-allocation warning */}
        {isOverAllocated && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mt-4 bg-red-50 border border-red-200 rounded-lg p-3"
          >
            <div className="flex items-center gap-2">
              <span className="text-red-500">⚠️</span>
              <span className="text-sm text-red-800">
                You've allocated {formatCurrency(Math.abs(remaining))} more than
                your budget
              </span>
            </div>
          </motion.div>
        )}
      </div>

      {/* Instructions */}
      <div className="bg-blue-50 border-b px-4 py-3">
        <p className="text-sm text-blue-800">
          {gestureEnabled
            ? 'Drag up/down on categories to adjust allocation, or use sliders below'
            : 'Use the sliders to adjust budget allocation for each category'}
        </p>
      </div>

      {/* Categories List */}
      <div className="flex-1 overflow-y-auto" ref={containerRef}>
        <div className="p-4 space-y-4">
          {categories.map((category, index) => {
            const currentAllocation =
              tempAllocations[category.id] || category.allocated;
            const spentPercentage = (category.spent / currentAllocation) * 100;
            const isDragging =
              dragState.isDragging && dragState.dragCategory === category.id;

            return (
              <motion.div
                key={category.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className={cn(
                  'bg-white rounded-xl p-4 shadow-sm border-2 transition-all',
                  isDragging
                    ? 'border-blue-300 shadow-lg'
                    : 'border-transparent',
                )}
              >
                {/* Category Header */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-5 h-5 rounded-full"
                      style={{ backgroundColor: category.color }}
                    />
                    <div>
                      <h3 className="font-medium text-gray-900">
                        {category.name}
                      </h3>
                      <p className="text-xs text-gray-500">
                        {getPercentage(currentAllocation)}% of total budget
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-semibold text-gray-900">
                      {formatCurrency(currentAllocation)}
                    </div>
                    <div className="text-xs text-gray-500">
                      {formatCurrency(category.spent)} spent
                    </div>
                  </div>
                </div>

                {/* Drag Handle for Touch Gestures */}
                {gestureEnabled && (
                  <motion.div
                    drag="y"
                    dragConstraints={{ top: 0, bottom: 0 }}
                    dragElastic={0.1}
                    onDragStart={() =>
                      handleDragStart(category.id, currentAllocation)
                    }
                    onDrag={(_, info) => handleDrag(category.id, info)}
                    onDragEnd={(_, info) => handleDragEnd(category.id, info)}
                    className={cn(
                      'mb-4 p-3 bg-gray-50 rounded-lg border-2 border-dashed',
                      'cursor-grab active:cursor-grabbing',
                      'flex items-center justify-center gap-2',
                      isDragging
                        ? 'border-blue-300 bg-blue-50'
                        : 'border-gray-200',
                    )}
                    whileDrag={{ scale: 1.02 }}
                  >
                    <div className="flex flex-col items-center gap-1">
                      <div className="w-6 h-1 bg-gray-400 rounded-full" />
                      <div className="w-6 h-1 bg-gray-400 rounded-full" />
                      <div className="w-6 h-1 bg-gray-400 rounded-full" />
                    </div>
                    <span className="text-sm text-gray-600">
                      {isDragging ? 'Adjusting...' : 'Drag to adjust'}
                    </span>
                  </motion.div>
                )}

                {/* Spending Progress */}
                <div className="mb-4">
                  <div className="flex justify-between text-xs text-gray-500 mb-2">
                    <span>Spent vs Allocated</span>
                    <span>{Math.round(spentPercentage)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2 relative">
                    <motion.div
                      className="h-2 rounded-full"
                      style={{ backgroundColor: category.color }}
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(spentPercentage, 100)}%` }}
                      transition={{ duration: 0.5 }}
                    />
                    {spentPercentage > 100 && (
                      <div className="absolute inset-0 bg-red-500/20 rounded-full" />
                    )}
                  </div>
                </div>

                {/* Allocation Slider */}
                <div className="space-y-2">
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>Allocation Amount</span>
                    <span>Max: {formatCurrency(totalBudget)}</span>
                  </div>
                  <input
                    type="range"
                    min={category.spent}
                    max={totalBudget}
                    step={100}
                    value={currentAllocation}
                    onChange={(e) =>
                      handleSliderChange(category.id, parseInt(e.target.value))
                    }
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                    style={{
                      background: `linear-gradient(to right, ${category.color} 0%, ${category.color} ${(currentAllocation / totalBudget) * 100}%, #e5e7eb ${(currentAllocation / totalBudget) * 100}%, #e5e7eb 100%)`,
                    }}
                  />
                  <div className="flex justify-between text-xs text-gray-400">
                    <span>{formatCurrency(category.spent)}</span>
                    <span>{formatCurrency(totalBudget)}</span>
                  </div>
                </div>

                {/* Quick Adjust Buttons */}
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={() => {
                      const newValue = Math.max(
                        category.spent,
                        currentAllocation - totalBudget * 0.05,
                      );
                      handleSliderChange(category.id, newValue);
                    }}
                    className="flex-1 py-2 px-3 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm rounded-lg"
                  >
                    -5%
                  </button>
                  <button
                    onClick={() => {
                      const newValue = Math.min(
                        totalBudget,
                        currentAllocation + totalBudget * 0.05,
                      );
                      handleSliderChange(category.id, newValue);
                    }}
                    className="flex-1 py-2 px-3 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm rounded-lg"
                  >
                    +5%
                  </button>
                  <button
                    onClick={() => {
                      const newValue = Math.min(
                        totalBudget,
                        currentAllocation + totalBudget * 0.1,
                      );
                      handleSliderChange(category.id, newValue);
                    }}
                    className="flex-1 py-2 px-3 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm rounded-lg"
                  >
                    +10%
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
