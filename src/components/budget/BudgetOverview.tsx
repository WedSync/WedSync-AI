'use client';

import React, { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import {
  PlusCircle,
  DollarSign,
  AlertTriangle,
  TrendingUp,
  Edit3,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';

interface BudgetCategory {
  id: string;
  name: string;
  category_type: string;
  budgeted_amount: number;
  spent_amount: number;
  remaining_amount: number;
  alert_threshold: number;
  allows_overspend: boolean;
  is_active: boolean;
  sort_order?: number;
  created_at: string;
  updated_at: string;
}

interface BudgetSummary {
  total_budgeted: number;
  total_spent: number;
  total_remaining: number;
  categories_count: number;
  overspent_categories: number;
  categories_near_limit: number;
}

export default function BudgetOverview({
  weddingId,
  organizationId,
  onEditCategory,
  onAddExpense,
}: {
  weddingId: string;
  organizationId: string;
  onEditCategory?: (category: BudgetCategory) => void;
  onAddExpense?: (categoryId: string) => void;
}) {
  const [categories, setCategories] = useState<BudgetCategory[]>([]);
  const [summary, setSummary] = useState<BudgetSummary>({
    total_budgeted: 0,
    total_spent: 0,
    total_remaining: 0,
    categories_count: 0,
    overspent_categories: 0,
    categories_near_limit: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClientComponentClient();

  useEffect(() => {
    fetchBudgetData();
    setupRealtimeSubscription();

    return () => {
      // Cleanup subscription
    };
  }, [weddingId]);

  const fetchBudgetData = async () => {
    try {
      setLoading(true);

      // Fetch categories
      const { data: categoriesData, error: categoriesError } = await supabase
        .from('budget_categories')
        .select('*')
        .eq('wedding_id', weddingId)
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

      if (categoriesError) throw categoriesError;

      setCategories(categoriesData || []);

      // Calculate summary
      const totalBudgeted =
        categoriesData?.reduce((sum, cat) => sum + cat.budgeted_amount, 0) || 0;
      const totalSpent =
        categoriesData?.reduce((sum, cat) => sum + cat.spent_amount, 0) || 0;
      const overspentCategories =
        categoriesData?.filter((cat) => cat.spent_amount > cat.budgeted_amount)
          .length || 0;
      const categoriesNearLimit =
        categoriesData?.filter(
          (cat) =>
            cat.alert_threshold &&
            cat.spent_amount >= cat.budgeted_amount * cat.alert_threshold,
        ).length || 0;

      setSummary({
        total_budgeted: totalBudgeted,
        total_spent: totalSpent,
        total_remaining: totalBudgeted - totalSpent,
        categories_count: categoriesData?.length || 0,
        overspent_categories: overspentCategories,
        categories_near_limit: categoriesNearLimit,
      });

      setError(null);
    } catch (err) {
      console.error('Failed to fetch budget data:', err);
      setError('Failed to load budget information');
      toast.error('Failed to load budget information');
    } finally {
      setLoading(false);
    }
  };

  const setupRealtimeSubscription = () => {
    const channel = supabase
      .channel(`budget-${weddingId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'budget_categories',
          filter: `wedding_id=eq.${weddingId}`,
        },
        () => {
          fetchBudgetData();
        },
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'budget_transactions',
          filter: `wedding_id=eq.${weddingId}`,
        },
        () => {
          fetchBudgetData();
        },
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  };

  const handleDragEnd = async (result: any) => {
    if (!result.destination) return;

    const items = Array.from(categories);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    // Update local state immediately for better UX
    setCategories(items);

    try {
      // Update sort orders in database
      const updates = items.map((item, index) => ({
        id: item.id,
        sort_order: index,
      }));

      for (const update of updates) {
        await supabase
          .from('budget_categories')
          .update({
            sort_order: update.sort_order,
            updated_at: new Date().toISOString(),
          })
          .eq('id', update.id);
      }
    } catch (err) {
      console.error('Failed to reorder categories:', err);
      toast.error('Failed to save category order');
      // Revert on error
      fetchBudgetData();
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getSpentPercentage = (spent: number, budgeted: number) => {
    if (budgeted === 0) return 0;
    return Math.min((spent / budgeted) * 100, 100);
  };

  const getCategoryColor = (categoryType: string) => {
    const colors: Record<string, string> = {
      VENUE: '#9E77ED',
      CATERING: '#F79009',
      PHOTOGRAPHY: '#2E90FA',
      VIDEOGRAPHY: '#175CD3',
      MUSIC: '#7F56D9',
      FLOWERS: '#12B76A',
      ATTIRE: '#F04438',
      TRANSPORTATION: '#6941C6',
      ACCESSORIES: '#B692F6',
      CUSTOM: '#667085',
    };
    return colors[categoryType] || colors['CUSTOM'];
  };

  const overallSpentPercentage =
    summary.total_budgeted > 0
      ? (summary.total_spent / summary.total_budgeted) * 100
      : 0;

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <Card>
          <CardContent className="p-6">
            <div className="h-32 bg-gray-200 rounded"></div>
          </CardContent>
        </Card>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="h-24 bg-gray-200 rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-red-600 mb-4">{error}</p>
          <Button onClick={fetchBudgetData} variant="outline">
            Try Again
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6" data-testid="budget-overview">
      {/* Budget Summary */}
      <Card className="bg-white border border-gray-200 rounded-xl shadow-xs hover:shadow-md transition-all duration-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-gray-900">
            <DollarSign className="w-5 h-5 text-primary-600" />
            Budget Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div className="text-center">
              <p className="text-sm font-medium text-gray-500 mb-1">
                Total Budget
              </p>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(summary.total_budgeted)}
              </p>
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-gray-500 mb-1">
                Total Spent
              </p>
              <p
                className={`text-2xl font-bold ${
                  summary.total_spent > summary.total_budgeted
                    ? 'text-red-600'
                    : 'text-primary-600'
                }`}
              >
                {formatCurrency(summary.total_spent)}
              </p>
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-gray-500 mb-1">
                Remaining
              </p>
              <p
                className={`text-2xl font-bold ${
                  summary.total_remaining < 0
                    ? 'text-red-600'
                    : 'text-green-600'
                }`}
              >
                {formatCurrency(summary.total_remaining)}
              </p>
            </div>
          </div>

          <div className="mb-4">
            <Progress value={overallSpentPercentage} className="h-3 mb-2" />
            <p className="text-sm text-center text-gray-600">
              {overallSpentPercentage.toFixed(1)}% of budget used
            </p>
          </div>

          {overallSpentPercentage > 90 && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
              <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0" />
              <p className="text-sm text-red-700">
                Warning: You're approaching your budget limit!
              </p>
            </div>
          )}

          {summary.overspent_categories > 0 && (
            <div className="flex items-center gap-2 mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <TrendingUp className="w-4 h-4 text-yellow-600 flex-shrink-0" />
              <p className="text-sm text-yellow-700">
                {summary.overspent_categories}{' '}
                {summary.overspent_categories === 1
                  ? 'category is'
                  : 'categories are'}{' '}
                over budget
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Budget Categories - Drag & Drop */}
      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="categories">
          {(provided, snapshot) => (
            <div
              {...provided.droppableProps}
              ref={provided.innerRef}
              className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 ${
                snapshot.isDraggingOver ? 'bg-primary-25 rounded-lg p-4' : ''
              }`}
            >
              {categories.length === 0 ? (
                <div className="col-span-full text-center py-12">
                  <DollarSign className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    No Budget Categories
                  </h3>
                  <p className="text-gray-500 mb-4">
                    Get started by creating your first budget category
                  </p>
                  <Button
                    onClick={() => onEditCategory?.(null as any)}
                    className="inline-flex items-center gap-2"
                  >
                    <PlusCircle className="w-4 h-4" />
                    Add Category
                  </Button>
                </div>
              ) : (
                categories.map((category, index) => {
                  const spentPercentage = getSpentPercentage(
                    category.spent_amount,
                    category.budgeted_amount,
                  );
                  const isOverBudget =
                    category.spent_amount > category.budgeted_amount;
                  const isNearLimit =
                    category.alert_threshold &&
                    category.spent_amount >=
                      category.budgeted_amount * category.alert_threshold;

                  return (
                    <Draggable
                      key={category.id}
                      draggableId={category.id}
                      index={index}
                    >
                      {(provided, snapshot) => (
                        <Card
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          {...provided.dragHandleProps}
                          className={`cursor-move bg-white border border-gray-200 rounded-xl shadow-xs hover:shadow-md transition-all duration-200 ${
                            snapshot.isDragging ? 'shadow-lg rotate-2' : ''
                          }`}
                        >
                          <CardHeader className="pb-3">
                            <CardTitle className="flex items-center justify-between text-lg">
                              <div className="flex items-center gap-2">
                                <div
                                  className="w-4 h-4 rounded-full"
                                  style={{
                                    backgroundColor: getCategoryColor(
                                      category.category_type,
                                    ),
                                  }}
                                />
                                <span className="text-gray-900">
                                  {category.name}
                                </span>
                              </div>
                              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onEditCategory?.(category);
                                  }}
                                  className="h-8 w-8 p-0 hover:bg-gray-100"
                                >
                                  <Edit3 className="w-3 h-3" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onAddExpense?.(category.id);
                                  }}
                                  className="h-8 w-8 p-0 hover:bg-primary-50 text-primary-600"
                                >
                                  <PlusCircle className="w-3 h-3" />
                                </Button>
                              </div>
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-3">
                              <div className="flex justify-between text-sm">
                                <span className="text-gray-500">Budgeted:</span>
                                <span className="font-medium text-gray-900">
                                  {formatCurrency(category.budgeted_amount)}
                                </span>
                              </div>
                              <div className="flex justify-between text-sm">
                                <span className="text-gray-500">Spent:</span>
                                <span
                                  className={`font-medium ${
                                    isOverBudget
                                      ? 'text-red-600'
                                      : 'text-green-600'
                                  }`}
                                >
                                  {formatCurrency(category.spent_amount)}
                                </span>
                              </div>
                              <div className="flex justify-between text-sm">
                                <span className="text-gray-500">
                                  Remaining:
                                </span>
                                <span
                                  className={`font-medium ${
                                    category.remaining_amount < 0
                                      ? 'text-red-600'
                                      : 'text-gray-900'
                                  }`}
                                >
                                  {formatCurrency(category.remaining_amount)}
                                </span>
                              </div>

                              <Progress
                                value={spentPercentage}
                                className="h-2"
                              />

                              <div className="text-xs text-center text-gray-500">
                                {spentPercentage.toFixed(1)}% used
                              </div>

                              {isOverBudget && (
                                <div className="flex items-center gap-1 text-xs text-red-600 bg-red-50 px-2 py-1 rounded">
                                  <AlertTriangle className="w-3 h-3" />
                                  Over budget by{' '}
                                  {formatCurrency(
                                    category.spent_amount -
                                      category.budgeted_amount,
                                  )}
                                </div>
                              )}

                              {isNearLimit && !isOverBudget && (
                                <div className="flex items-center gap-1 text-xs text-yellow-600 bg-yellow-50 px-2 py-1 rounded">
                                  <AlertTriangle className="w-3 h-3" />
                                  Nearing limit (
                                  {(category.alert_threshold * 100).toFixed(0)}
                                  %)
                                </div>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      )}
                    </Draggable>
                  );
                })
              )}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-4 justify-center">
        <Button
          onClick={() => onEditCategory?.(null as any)}
          className="inline-flex items-center gap-2"
          data-testid="add-category-btn"
        >
          <PlusCircle className="w-4 h-4" />
          Add Category
        </Button>
        <Button
          variant="outline"
          onClick={() => onAddExpense?.('')}
          className="inline-flex items-center gap-2"
          data-testid="add-expense-btn"
        >
          <DollarSign className="w-4 h-4" />
          Add Expense
        </Button>
      </div>
    </div>
  );
}
