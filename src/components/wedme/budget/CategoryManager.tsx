'use client';

import { useState, useEffect } from 'react';
import {
  Plus,
  Pencil,
  Trash2,
  DollarSign,
  Palette,
  AlertTriangle,
  Check,
  X,
  ArrowUpDown,
  Percent,
  Calculator,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface BudgetCategory {
  id: string;
  name: string;
  budgeted_amount: number;
  spent_amount: number;
  percentage_of_total: number;
  color: string;
  description?: string;
  created_at?: Date;
  updated_at?: Date;
}

interface CategoryManagerProps {
  clientId: string;
  totalBudget: number;
  className?: string;
  onCategoriesChange?: (categories: BudgetCategory[]) => void;
}

interface CategoryFormData {
  name: string;
  budgeted_amount: number;
  percentage_of_total: number;
  color: string;
  description: string;
}

const DEFAULT_CATEGORIES = [
  { name: 'Venue', percentage: 40, color: '#9E77ED' },
  { name: 'Catering', percentage: 25, color: '#2E90FA' },
  { name: 'Photography', percentage: 10, color: '#12B76A' },
  { name: 'Flowers', percentage: 8, color: '#F79009' },
  { name: 'Music/DJ', percentage: 7, color: '#F04438' },
  { name: 'Attire', percentage: 5, color: '#7F56D9' },
  { name: 'Transportation', percentage: 3, color: '#06AED4' },
  { name: 'Miscellaneous', percentage: 2, color: '#84CAFF' },
];

const COLOR_OPTIONS = [
  '#9E77ED',
  '#2E90FA',
  '#12B76A',
  '#F79009',
  '#F04438',
  '#7F56D9',
  '#06AED4',
  '#84CAFF',
  '#FF6B6B',
  '#4ECDC4',
  '#45B7D1',
  '#96CEB4',
  '#FFEAA7',
  '#DDA0DD',
  '#98D8C8',
];

export function CategoryManager({
  clientId,
  totalBudget,
  className,
  onCategoriesChange,
}: CategoryManagerProps) {
  // State
  const [categories, setCategories] = useState<BudgetCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState<BudgetCategory | null>(
    null,
  );
  const [showDefaults, setShowDefaults] = useState(false);
  const [inputMode, setInputMode] = useState<'amount' | 'percentage'>(
    'percentage',
  );

  // Form state
  const [formData, setFormData] = useState<CategoryFormData>({
    name: '',
    budgeted_amount: 0,
    percentage_of_total: 0,
    color: COLOR_OPTIONS[0],
    description: '',
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Calculations
  const totalAllocated = categories.reduce(
    (sum, cat) => sum + cat.budgeted_amount,
    0,
  );
  const totalPercentageAllocated = categories.reduce(
    (sum, cat) => sum + cat.percentage_of_total,
    0,
  );
  const remainingBudget = totalBudget - totalAllocated;
  const remainingPercentage = 100 - totalPercentageAllocated;

  // Load categories
  useEffect(() => {
    loadCategories();
  }, [clientId]);

  const loadCategories = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/budget/categories?client_id=${clientId}`,
      );
      if (!response.ok) throw new Error('Failed to load categories');

      const data = await response.json();
      setCategories(data.categories || []);
      onCategoriesChange?.(data.categories || []);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to load categories',
      );
    } finally {
      setLoading(false);
    }
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.name.trim()) {
      errors.name = 'Category name is required';
    }

    if (formData.budgeted_amount <= 0 && formData.percentage_of_total <= 0) {
      errors.amount = 'Budget amount must be greater than 0';
    }

    if (formData.percentage_of_total > 100) {
      errors.percentage = 'Percentage cannot exceed 100%';
    }

    // Check for duplicate names (excluding current edit)
    const duplicateName = categories.find(
      (cat) =>
        cat.name.toLowerCase() === formData.name.toLowerCase() &&
        cat.id !== editingCategory?.id,
    );
    if (duplicateName) {
      errors.name = 'Category name already exists';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    try {
      // Calculate amounts based on input mode
      const finalAmount =
        inputMode === 'percentage'
          ? (formData.percentage_of_total / 100) * totalBudget
          : formData.budgeted_amount;

      const finalPercentage =
        inputMode === 'amount'
          ? totalBudget > 0
            ? (formData.budgeted_amount / totalBudget) * 100
            : 0
          : formData.percentage_of_total;

      const categoryData = {
        ...formData,
        budgeted_amount: finalAmount,
        percentage_of_total: finalPercentage,
        client_id: clientId,
      };

      const url = editingCategory
        ? `/api/budget/categories/${editingCategory.id}`
        : '/api/budget/categories';

      const method = editingCategory ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(categoryData),
      });

      if (!response.ok) throw new Error('Failed to save category');

      await loadCategories();
      resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save category');
    }
  };

  const handleDelete = async (categoryId: string) => {
    if (
      !confirm(
        'Are you sure you want to delete this category? This will also delete all associated transactions.',
      )
    ) {
      return;
    }

    try {
      const response = await fetch(`/api/budget/categories/${categoryId}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete category');

      await loadCategories();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to delete category',
      );
    }
  };

  const handleSetupDefaults = async () => {
    try {
      const defaultCategories = DEFAULT_CATEGORIES.map((cat) => ({
        name: cat.name,
        budgeted_amount: (cat.percentage / 100) * totalBudget,
        percentage_of_total: cat.percentage,
        color: cat.color,
        client_id: clientId,
      }));

      const response = await fetch('/api/budget/categories/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ categories: defaultCategories }),
      });

      if (!response.ok) throw new Error('Failed to create default categories');

      await loadCategories();
      setShowDefaults(false);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to create default categories',
      );
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      budgeted_amount: 0,
      percentage_of_total: 0,
      color: COLOR_OPTIONS[0],
      description: '',
    });
    setFormErrors({});
    setEditingCategory(null);
    setShowForm(false);
  };

  const startEdit = (category: BudgetCategory) => {
    setFormData({
      name: category.name,
      budgeted_amount: category.budgeted_amount,
      percentage_of_total: category.percentage_of_total,
      color: category.color,
      description: category.description || '',
    });
    setEditingCategory(category);
    setShowForm(true);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const handleInputModeChange = (mode: 'amount' | 'percentage') => {
    setInputMode(mode);

    // Convert current value to new mode
    if (mode === 'percentage' && formData.budgeted_amount > 0) {
      const percentage =
        totalBudget > 0 ? (formData.budgeted_amount / totalBudget) * 100 : 0;
      setFormData((prev) => ({
        ...prev,
        percentage_of_total: Number(percentage.toFixed(1)),
      }));
    } else if (mode === 'amount' && formData.percentage_of_total > 0) {
      const amount = (formData.percentage_of_total / 100) * totalBudget;
      setFormData((prev) => ({
        ...prev,
        budgeted_amount: Number(amount.toFixed(0)),
      }));
    }
  };

  if (loading) {
    return (
      <div
        className={cn(
          'bg-white border border-gray-200 rounded-xl p-6',
          className,
        )}
      >
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-1/4"></div>
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'bg-white border border-gray-200 rounded-xl p-6 shadow-xs',
        className,
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            Budget Categories
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            Organize your wedding budget into categories
          </p>
        </div>

        <div className="flex items-center gap-2">
          {categories.length === 0 && (
            <button
              onClick={() => setShowDefaults(true)}
              className="px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Use Defaults
            </button>
          )}

          <button
            onClick={() => setShowForm(true)}
            className="px-4 py-2 bg-primary-600 text-white text-sm font-semibold rounded-lg hover:bg-primary-700 transition-colors flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Category
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-error-50 border border-error-200 rounded-lg">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-error-600" />
            <span className="text-sm text-error-700">{error}</span>
          </div>
        </div>
      )}

      {/* Budget Summary */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-xs text-gray-600 font-medium">Total Budget</p>
            <p className="text-lg font-bold text-gray-900">
              {formatCurrency(totalBudget)}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-600 font-medium">Allocated</p>
            <p className="text-lg font-bold text-blue-600">
              {formatCurrency(totalAllocated)}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-600 font-medium">Remaining</p>
            <p
              className={cn(
                'text-lg font-bold',
                remainingBudget >= 0 ? 'text-success-600' : 'text-error-600',
              )}
            >
              {formatCurrency(Math.abs(remainingBudget))}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-600 font-medium">% Allocated</p>
            <p className="text-lg font-bold text-gray-900">
              {totalPercentageAllocated.toFixed(1)}%
            </p>
          </div>
        </div>

        {totalPercentageAllocated > 100 && (
          <div className="mt-3 flex items-center gap-2 text-error-600">
            <AlertTriangle className="w-4 h-4" />
            <span className="text-xs">Budget allocation exceeds 100%</span>
          </div>
        )}
      </div>

      {/* Categories List */}
      <div className="space-y-3">
        {categories.length === 0 ? (
          <div className="text-center py-8">
            <div className="w-12 h-12 bg-gray-100 rounded-lg mx-auto mb-3 flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-gray-400" />
            </div>
            <p className="text-gray-500 mb-2">No budget categories yet</p>
            <p className="text-sm text-gray-400">
              Add categories to organize your wedding budget
            </p>
          </div>
        ) : (
          categories.map((category) => {
            const spentPercentage =
              category.budgeted_amount > 0
                ? (category.spent_amount / category.budgeted_amount) * 100
                : 0;

            return (
              <div
                key={category.id}
                className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1">
                    <div
                      className="w-4 h-4 rounded-full flex-shrink-0"
                      style={{ backgroundColor: category.color }}
                    />

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium text-gray-900">
                          {category.name}
                        </h4>
                        <span className="text-xs text-gray-500">
                          {category.percentage_of_total.toFixed(1)}%
                        </span>
                      </div>

                      <div className="flex items-center gap-4 mt-1">
                        <span className="text-sm text-gray-600">
                          {formatCurrency(category.spent_amount)} /{' '}
                          {formatCurrency(category.budgeted_amount)}
                        </span>

                        {category.budgeted_amount > 0 && (
                          <div className="flex-1 max-w-32">
                            <div className="w-full bg-gray-200 rounded-full h-1.5">
                              <div
                                className={cn(
                                  'h-1.5 rounded-full transition-all duration-300',
                                  spentPercentage >= 100
                                    ? 'bg-error-500'
                                    : spentPercentage > 85
                                      ? 'bg-warning-500'
                                      : 'bg-success-500',
                                )}
                                style={{
                                  width: `${Math.min(spentPercentage, 100)}%`,
                                }}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 ml-3">
                    <button
                      onClick={() => startEdit(category)}
                      className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => handleDelete(category.id)}
                      className="p-1.5 text-gray-400 hover:text-error-600 hover:bg-error-50 rounded-md transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Category Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-xl">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                {editingCategory ? 'Edit Category' : 'Add Category'}
              </h3>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {/* Category Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category Name
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, name: e.target.value }))
                  }
                  className={cn(
                    'w-full px-3 py-2 border rounded-lg text-sm',
                    'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent',
                    formErrors.name ? 'border-error-300' : 'border-gray-300',
                  )}
                  placeholder="e.g., Venue, Catering, Photography"
                />
                {formErrors.name && (
                  <p className="mt-1 text-xs text-error-600">
                    {formErrors.name}
                  </p>
                )}
              </div>

              {/* Input Mode Toggle */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Budget Amount
                </label>

                <div className="flex bg-gray-100 rounded-lg p-1 mb-3">
                  <button
                    type="button"
                    onClick={() => handleInputModeChange('percentage')}
                    className={cn(
                      'flex-1 px-3 py-1.5 text-xs font-medium rounded-md transition-colors flex items-center justify-center gap-1',
                      inputMode === 'percentage'
                        ? 'bg-white text-gray-900 shadow-xs'
                        : 'text-gray-600 hover:text-gray-900',
                    )}
                  >
                    <Percent className="w-3 h-3" />
                    Percentage
                  </button>
                  <button
                    type="button"
                    onClick={() => handleInputModeChange('amount')}
                    className={cn(
                      'flex-1 px-3 py-1.5 text-xs font-medium rounded-md transition-colors flex items-center justify-center gap-1',
                      inputMode === 'amount'
                        ? 'bg-white text-gray-900 shadow-xs'
                        : 'text-gray-600 hover:text-gray-900',
                    )}
                  >
                    <DollarSign className="w-3 h-3" />
                    Amount
                  </button>
                </div>

                {inputMode === 'percentage' ? (
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.1"
                      value={formData.percentage_of_total || ''}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          percentage_of_total: parseFloat(e.target.value) || 0,
                        }))
                      }
                      className={cn(
                        'w-full px-3 py-2 border rounded-lg text-sm pr-8',
                        'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent',
                        formErrors.percentage
                          ? 'border-error-300'
                          : 'border-gray-300',
                      )}
                      placeholder="0.0"
                    />
                    <span className="absolute right-3 top-2 text-sm text-gray-500">
                      %
                    </span>
                    <p className="mt-1 text-xs text-gray-500">
                      ={' '}
                      {formatCurrency(
                        (formData.percentage_of_total / 100) * totalBudget,
                      )}
                    </p>
                  </div>
                ) : (
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-sm text-gray-500">
                      $
                    </span>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={formData.budgeted_amount || ''}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          budgeted_amount: parseFloat(e.target.value) || 0,
                        }))
                      }
                      className={cn(
                        'w-full px-3 py-2 pl-8 border rounded-lg text-sm',
                        'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent',
                        formErrors.amount
                          ? 'border-error-300'
                          : 'border-gray-300',
                      )}
                      placeholder="0"
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      ={' '}
                      {totalBudget > 0
                        ? (
                            (formData.budgeted_amount / totalBudget) *
                            100
                          ).toFixed(1)
                        : 0}
                      % of total budget
                    </p>
                  </div>
                )}

                {(formErrors.amount || formErrors.percentage) && (
                  <p className="mt-1 text-xs text-error-600">
                    {formErrors.amount || formErrors.percentage}
                  </p>
                )}
              </div>

              {/* Color Picker */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Color
                </label>
                <div className="flex flex-wrap gap-2">
                  {COLOR_OPTIONS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() =>
                        setFormData((prev) => ({ ...prev, color }))
                      }
                      className={cn(
                        'w-8 h-8 rounded-lg border-2 transition-all',
                        formData.color === color
                          ? 'border-gray-900 scale-110'
                          : 'border-gray-200',
                      )}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description <span className="text-gray-400">(optional)</span>
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      description: e.target.value,
                    }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  rows={2}
                  placeholder="Additional notes about this category..."
                />
              </div>

              {/* Form Actions */}
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={resetForm}
                  className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 text-sm font-semibold text-white bg-primary-600 rounded-lg hover:bg-primary-700 transition-colors"
                >
                  {editingCategory ? 'Update' : 'Add'} Category
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Default Categories Modal */}
      {showDefaults && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-xl">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                Set Up Default Categories
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                Create typical wedding budget categories with recommended
                percentages
              </p>
            </div>

            <div className="p-6">
              <div className="space-y-3 mb-6">
                {DEFAULT_CATEGORIES.map((category) => (
                  <div
                    key={category.name}
                    className="flex items-center justify-between py-2"
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: category.color }}
                      />
                      <span className="text-sm font-medium text-gray-900">
                        {category.name}
                      </span>
                    </div>
                    <div className="text-sm text-gray-600">
                      {category.percentage}% •{' '}
                      {formatCurrency(
                        (category.percentage / 100) * totalBudget,
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowDefaults(false)}
                  className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSetupDefaults}
                  className="flex-1 px-4 py-2 text-sm font-semibold text-white bg-primary-600 rounded-lg hover:bg-primary-700 transition-colors"
                >
                  Create Categories
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
