/**
 * BudgetAllocation Component for WS-245 Wedding Budget Optimizer System
 * Interactive drag-and-drop budget allocation interface with real-time calculations
 * Built for React 19, TypeScript 5.9, @dnd-kit, and responsive budget management
 */

'use client';

import React, {
  useState,
  useCallback,
  useMemo,
  useRef,
  useEffect,
} from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
  MeasuringStrategy,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  GripVertical,
  DollarSign,
  Percent,
  TrendingUp,
  TrendingDown,
  Target,
  AlertTriangle,
  Plus,
  Minus,
  RotateCcw,
  Settings,
  Eye,
  EyeOff,
  Lock,
  Unlock,
} from 'lucide-react';
import { BudgetAllocationProps, BudgetCategory } from '@/types/budget';
import { useBudgetCalculations } from '@/hooks/useBudgetCalculations';

// Sortable category item component
interface SortableCategoryItemProps {
  category: BudgetCategory;
  totalBudget: number;
  isEditable: boolean;
  showPercentages: boolean;
  showTargets: boolean;
  onAmountChange: (categoryId: string, amount: number) => void;
  onToggleLock?: (categoryId: string) => void;
}

const SortableCategoryItem: React.FC<SortableCategoryItemProps> = ({
  category,
  totalBudget,
  isEditable,
  showPercentages,
  showTargets,
  onAmountChange,
  onToggleLock,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [inputValue, setInputValue] = useState(
    category.allocatedAmount.toString(),
  );
  const [isLocked, setIsLocked] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: category.id, disabled: !isEditable || isLocked });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  // Calculate percentages and status
  const percentage =
    totalBudget > 0 ? (category.allocatedAmount / totalBudget) * 100 : 0;
  const spentPercentage =
    category.allocatedAmount > 0
      ? (category.spentAmount / category.allocatedAmount) * 100
      : 0;

  const status =
    spentPercentage > 100 ? 'over' : spentPercentage > 80 ? 'warning' : 'good';

  const statusConfig = {
    good: {
      color: 'text-success-600',
      bg: 'bg-success-50',
      border: 'border-success-200',
    },
    warning: {
      color: 'text-warning-600',
      bg: 'bg-warning-50',
      border: 'border-warning-200',
    },
    over: {
      color: 'text-error-600',
      bg: 'bg-error-50',
      border: 'border-error-200',
    },
  };

  // Handle amount changes
  const handleAmountChange = useCallback(
    (newAmount: number) => {
      onAmountChange(category.id, Math.max(0, newAmount));
    },
    [category.id, onAmountChange],
  );

  const handleInputSubmit = useCallback(() => {
    const newAmount = parseFloat(inputValue) || 0;
    handleAmountChange(newAmount);
    setIsEditing(false);
  }, [inputValue, handleAmountChange]);

  const handleInputKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        handleInputSubmit();
      } else if (e.key === 'Escape') {
        setInputValue(category.allocatedAmount.toString());
        setIsEditing(false);
      }
    },
    [handleInputSubmit, category.allocatedAmount],
  );

  const handleQuickAdjust = useCallback(
    (delta: number) => {
      const newAmount = Math.max(0, category.allocatedAmount + delta);
      handleAmountChange(newAmount);
    },
    [category.allocatedAmount, handleAmountChange],
  );

  const toggleLock = useCallback(() => {
    setIsLocked(!isLocked);
    onToggleLock?.(category.id);
  }, [isLocked, category.id, onToggleLock]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className={`
        bg-white border border-gray-200 rounded-xl p-4
        transition-all duration-200
        ${isDragging ? 'shadow-lg scale-105 rotate-2' : 'hover:shadow-md'}
        ${status === 'over' ? statusConfig.over.border : ''}
        ${isLocked ? 'opacity-75' : ''}
      `}
    >
      <div className="flex items-center space-x-4">
        {/* Drag handle */}
        {isEditable && !isLocked && (
          <div
            {...attributes}
            {...listeners}
            className="
              flex items-center justify-center w-8 h-8
              text-gray-400 hover:text-gray-600 cursor-grab active:cursor-grabbing
              rounded-lg hover:bg-gray-50
            "
          >
            <GripVertical className="w-4 h-4" />
          </div>
        )}

        {/* Category indicator */}
        <div
          className="w-4 h-4 rounded-full flex-shrink-0"
          style={{ backgroundColor: category.color }}
        />

        {/* Category details */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-medium text-gray-900 capitalize truncate">
              {category.name}
            </h4>

            <div className="flex items-center space-x-2">
              {showPercentages && (
                <span className="text-sm text-gray-600">
                  {percentage.toFixed(1)}%
                </span>
              )}

              {isEditable && (
                <button
                  onClick={toggleLock}
                  className="p-1 text-gray-400 hover:text-gray-600 rounded"
                  title={isLocked ? 'Unlock category' : 'Lock category'}
                >
                  {isLocked ? (
                    <Lock className="w-4 h-4" />
                  ) : (
                    <Unlock className="w-4 h-4" />
                  )}
                </button>
              )}
            </div>
          </div>

          {/* Amount input/display */}
          <div className="flex items-center justify-between mb-3">
            {isEditing && isEditable ? (
              <div className="flex items-center space-x-2">
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    ref={inputRef}
                    type="number"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onBlur={handleInputSubmit}
                    onKeyDown={handleInputKeyDown}
                    className="
                      pl-8 pr-4 py-2 border border-gray-300 rounded-lg
                      text-lg font-semibold w-32
                      focus:outline-none focus:ring-2 focus:ring-primary-500
                    "
                    min="0"
                    step="50"
                  />
                </div>
                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => handleQuickAdjust(-500)}
                    className="p-1 text-gray-400 hover:text-gray-600 rounded"
                    title="Decrease by $500"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleQuickAdjust(500)}
                    className="p-1 text-gray-400 hover:text-gray-600 rounded"
                    title="Increase by $500"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => isEditable && !isLocked && setIsEditing(true)}
                disabled={!isEditable || isLocked}
                className={`
                  text-left ${isEditable && !isLocked ? 'cursor-pointer hover:bg-gray-50' : 'cursor-default'}
                  px-2 py-1 rounded transition-colors duration-200
                `}
              >
                <span className="text-2xl font-semibold text-gray-900">
                  ${category.allocatedAmount.toLocaleString()}
                </span>
              </button>
            )}

            {/* Status indicator */}
            <div
              className={`
              flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium
              ${statusConfig[status].bg} ${statusConfig[status].color}
            `}
            >
              {status === 'over' && <TrendingUp className="w-3 h-3" />}
              {status === 'warning' && <AlertTriangle className="w-3 h-3" />}
              {status === 'good' && <TrendingDown className="w-3 h-3" />}
              <span>{spentPercentage.toFixed(0)}% used</span>
            </div>
          </div>

          {/* Progress bar */}
          <div className="relative">
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className={`
                  h-2 rounded-full transition-all duration-300
                  ${
                    status === 'good'
                      ? 'bg-success-500'
                      : status === 'warning'
                        ? 'bg-warning-500'
                        : 'bg-error-500'
                  }
                `}
                style={{ width: `${Math.min(100, spentPercentage)}%` }}
              />
            </div>

            {spentPercentage > 100 && (
              <div className="absolute -top-1 right-0 transform translate-x-2">
                <div className="bg-error-500 text-white text-xs px-2 py-1 rounded-full">
                  Over budget
                </div>
              </div>
            )}
          </div>

          {/* Target comparison */}
          {showTargets && category.marketPriceRange && (
            <div className="mt-3 text-xs text-gray-600">
              Market range: ${category.marketPriceRange.min.toLocaleString()} -
              ${category.marketPriceRange.max.toLocaleString()}
              (avg: ${category.marketPriceRange.average.toLocaleString()})
            </div>
          )}

          {/* Spending details */}
          <div className="flex items-center justify-between mt-2 text-sm text-gray-600">
            <span>Spent: ${category.spentAmount.toLocaleString()}</span>
            <span>
              Remaining: $
              {Math.max(
                0,
                category.allocatedAmount - category.spentAmount,
              ).toLocaleString()}
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

// Quick preset buttons
interface QuickPresetsProps {
  categories: BudgetCategory[];
  totalBudget: number;
  onApplyPreset: (categories: BudgetCategory[]) => void;
}

const QuickPresets: React.FC<QuickPresetsProps> = ({
  categories,
  totalBudget,
  onApplyPreset,
}) => {
  const presets = [
    {
      name: 'Balanced',
      description: 'Equal allocation across categories',
      apply: () => {
        const amountPerCategory = totalBudget / categories.length;
        return categories.map((cat) => ({
          ...cat,
          allocatedAmount: amountPerCategory,
        }));
      },
    },
    {
      name: 'Venue Focus',
      description: '40% venue, 30% catering, 30% others',
      apply: () => {
        const venueAmount = totalBudget * 0.4;
        const cateringAmount = totalBudget * 0.3;
        const otherAmount =
          (totalBudget * 0.3) / Math.max(1, categories.length - 2);

        return categories.map((cat) => ({
          ...cat,
          allocatedAmount:
            cat.name === 'venue'
              ? venueAmount
              : cat.name === 'catering'
                ? cateringAmount
                : otherAmount,
        }));
      },
    },
    {
      name: 'Photography Focus',
      description: '35% photography, 25% venue, 40% others',
      apply: () => {
        const photoAmount = totalBudget * 0.35;
        const venueAmount = totalBudget * 0.25;
        const otherAmount =
          (totalBudget * 0.4) / Math.max(1, categories.length - 2);

        return categories.map((cat) => ({
          ...cat,
          allocatedAmount:
            cat.name === 'photography'
              ? photoAmount
              : cat.name === 'venue'
                ? venueAmount
                : otherAmount,
        }));
      },
    },
    {
      name: 'Budget-Conscious',
      description: 'Minimal allocations with 20% buffer',
      apply: () => {
        const usableBudget = totalBudget * 0.8; // Keep 20% buffer
        const amountPerCategory = usableBudget / categories.length;

        return categories.map((cat) => ({
          ...cat,
          allocatedAmount: amountPerCategory,
        }));
      },
    },
  ];

  return (
    <div className="space-y-3">
      <h4 className="font-medium text-gray-900">Quick Presets</h4>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {presets.map((preset, index) => (
          <button
            key={index}
            onClick={() => onApplyPreset(preset.apply())}
            className="
              p-3 text-left border border-gray-200 rounded-lg
              hover:bg-gray-50 hover:border-primary-300 transition-all duration-200
              focus:outline-none focus:ring-2 focus:ring-primary-500
            "
          >
            <div className="font-medium text-sm text-gray-900 mb-1">
              {preset.name}
            </div>
            <div className="text-xs text-gray-600">{preset.description}</div>
          </button>
        ))}
      </div>
    </div>
  );
};

// Main component
export const BudgetAllocation: React.FC<BudgetAllocationProps> = ({
  categories: initialCategories,
  totalBudget,
  onAllocationChange,
  onDragEnd,
  showPercentages = true,
  showTargets = false,
  isEditable = true,
  className = '',
}) => {
  const [categories, setCategories] = useState(initialCategories);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [showPresets, setShowPresets] = useState(false);
  const [lockedCategories, setLockedCategories] = useState<Set<string>>(
    new Set(),
  );

  const calculations = useBudgetCalculations(null, categories);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const measuringConfig = {
    strategy: MeasuringStrategy.Always,
  };

  // Handle drag events
  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  }, []);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;

      if (active.id !== over?.id) {
        const oldIndex = categories.findIndex((cat) => cat.id === active.id);
        const newIndex = categories.findIndex((cat) => cat.id === over?.id);

        const newCategories = arrayMove(categories, oldIndex, newIndex);
        setCategories(newCategories);
        onAllocationChange(newCategories);
        onDragEnd?.(event);
      }

      setActiveId(null);
    },
    [categories, onAllocationChange, onDragEnd],
  );

  // Handle amount changes
  const handleAmountChange = useCallback(
    (categoryId: string, newAmount: number) => {
      const updatedCategories = categories.map((cat) =>
        cat.id === categoryId ? { ...cat, allocatedAmount: newAmount } : cat,
      );
      setCategories(updatedCategories);
      onAllocationChange(updatedCategories);
    },
    [categories, onAllocationChange],
  );

  // Handle category locking
  const handleToggleLock = useCallback(
    (categoryId: string) => {
      const newLocked = new Set(lockedCategories);
      if (newLocked.has(categoryId)) {
        newLocked.delete(categoryId);
      } else {
        newLocked.add(categoryId);
      }
      setLockedCategories(newLocked);
    },
    [lockedCategories],
  );

  // Handle preset application
  const handleApplyPreset = useCallback(
    (presetCategories: BudgetCategory[]) => {
      setCategories(presetCategories);
      onAllocationChange(presetCategories);
      setShowPresets(false);
    },
    [onAllocationChange],
  );

  // Reset to original
  const handleReset = useCallback(() => {
    setCategories(initialCategories);
    onAllocationChange(initialCategories);
  }, [initialCategories, onAllocationChange]);

  // Get currently dragged category
  const activeCategory = useMemo(() => {
    return categories.find((cat) => cat.id === activeId);
  }, [categories, activeId]);

  return (
    <div className={`bg-white rounded-xl p-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            Budget Allocation
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            Drag to reorder • Click amounts to edit • Total: $
            {totalBudget.toLocaleString()}
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowPresets(!showPresets)}
            disabled={!isEditable}
            className="
              p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-50
              transition-colors duration-200 disabled:opacity-50
            "
            title="Quick presets"
          >
            <Target className="w-5 h-5" />
          </button>

          <button
            onClick={handleReset}
            disabled={!isEditable}
            className="
              p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-50
              transition-colors duration-200 disabled:opacity-50
            "
            title="Reset to original"
          >
            <RotateCcw className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Budget summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="text-2xl font-semibold text-gray-900">
            {calculations.formatCurrency(calculations.totalAllocated)}
          </div>
          <div className="text-sm text-gray-600">Total Allocated</div>
        </div>

        <div className="bg-gray-50 rounded-lg p-4">
          <div className="text-2xl font-semibold text-gray-900">
            {calculations.formatCurrency(calculations.remainingBudget)}
          </div>
          <div className="text-sm text-gray-600">Remaining</div>
        </div>

        <div className="bg-gray-50 rounded-lg p-4">
          <div className="text-2xl font-semibold text-gray-900">
            {calculations.formatPercentage(calculations.utilizationRate)}
          </div>
          <div className="text-sm text-gray-600">Budget Used</div>
        </div>

        <div className="bg-gray-50 rounded-lg p-4">
          <div className="text-2xl font-semibold text-gray-900">
            {categories.length}
          </div>
          <div className="text-sm text-gray-600">Categories</div>
        </div>
      </div>

      {/* Over budget warning */}
      {calculations.overspentAmount > 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-error-50 border border-error-200 rounded-lg p-4 mb-6"
        >
          <div className="flex items-center space-x-3">
            <AlertTriangle className="w-5 h-5 text-error-600" />
            <div>
              <p className="font-medium text-error-900">Over Budget</p>
              <p className="text-sm text-error-700">
                You are ${calculations.overspentAmount.toLocaleString()} over
                your total budget. Consider reducing some allocations.
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Quick presets */}
      <AnimatePresence>
        {showPresets && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-6 border-b border-gray-200 pb-6"
          >
            <QuickPresets
              categories={categories}
              totalBudget={totalBudget}
              onApplyPreset={handleApplyPreset}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Category list */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        measuring={measuringConfig}
      >
        <SortableContext
          items={categories.map((cat) => cat.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-4">
            {categories.map((category) => (
              <SortableCategoryItem
                key={category.id}
                category={category}
                totalBudget={totalBudget}
                isEditable={isEditable}
                showPercentages={showPercentages}
                showTargets={showTargets}
                onAmountChange={handleAmountChange}
                onToggleLock={handleToggleLock}
              />
            ))}
          </div>
        </SortableContext>

        <DragOverlay>
          {activeCategory ? (
            <div className="bg-white border-2 border-primary-300 rounded-xl p-4 shadow-lg rotate-2">
              <div className="flex items-center space-x-4">
                <div
                  className="w-4 h-4 rounded-full"
                  style={{ backgroundColor: activeCategory.color }}
                />
                <div>
                  <h4 className="font-medium text-gray-900 capitalize">
                    {activeCategory.name}
                  </h4>
                  <p className="text-lg font-semibold text-gray-900">
                    ${activeCategory.allocatedAmount.toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
};
