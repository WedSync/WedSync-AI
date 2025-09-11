'use client';

import React, { useState, useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  ArrowLeftRight,
  DollarSign,
  AlertCircle,
  CheckCircle,
  History,
  Info,
  TrendingUp,
  TrendingDown,
  Move,
} from 'lucide-react';

interface Category {
  id: string;
  name: string;
  allocated_amount: number;
  spent_amount: number;
  remaining_amount: number;
  color: string;
  icon: string;
}

interface ReallocationHistory {
  id: string;
  from_category: string;
  to_category: string;
  amount: number;
  reason: string;
  reallocation_date: string;
}

interface DragItem {
  categoryId: string;
  categoryName: string;
  availableAmount: number;
  color: string;
}

export default function BudgetReallocation() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [history, setHistory] = useState<ReallocationHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [draggedItem, setDraggedItem] = useState<DragItem | null>(null);
  const [reallocationAmount, setReallocationAmount] = useState('');
  const [reallocationReason, setReallocationReason] = useState('');
  const [selectedFromCategory, setSelectedFromCategory] =
    useState<Category | null>(null);
  const [selectedToCategory, setSelectedToCategory] = useState<Category | null>(
    null,
  );
  const [showReallocationModal, setShowReallocationModal] = useState(false);

  const supabase = await createClient();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch categories
      const { data: categoriesData } = await supabase
        .from('budget_categories')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('sort_order');

      setCategories(categoriesData || []);

      // Fetch reallocation history
      const { data: historyData } = await supabase
        .from('budget_reallocations')
        .select(
          `
          *,
          from_category:budget_categories!budget_reallocations_from_category_id_fkey(name),
          to_category:budget_categories!budget_reallocations_to_category_id_fkey(name)
        `,
        )
        .eq('user_id', user.id)
        .order('reallocation_date', { ascending: false })
        .limit(10);

      setHistory(historyData || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleReallocation = async () => {
    if (!selectedFromCategory || !selectedToCategory || !reallocationAmount)
      return;

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const amount = parseFloat(reallocationAmount);

      // Call the reallocation function
      const { data, error } = await supabase.rpc('reallocate_budget', {
        p_user_id: user.id,
        p_from_category_id: selectedFromCategory.id,
        p_to_category_id: selectedToCategory.id,
        p_amount: amount,
        p_reason: reallocationReason || null,
      });

      if (error) {
        console.error('Reallocation error:', error);
        alert(`Error: ${error.message}`);
        return;
      }

      // Reset form and refresh data
      setReallocationAmount('');
      setReallocationReason('');
      setSelectedFromCategory(null);
      setSelectedToCategory(null);
      setShowReallocationModal(false);
      fetchData();

      // Show success message
      alert(
        `Successfully reallocated $${amount.toLocaleString()} from ${selectedFromCategory.name} to ${selectedToCategory.name}`,
      );
    } catch (error) {
      console.error('Error during reallocation:', error);
      alert('An error occurred during reallocation. Please try again.');
    }
  };

  const handleDragStart = (categoryId: string) => {
    const category = categories.find((c) => c.id === categoryId);
    if (category && category.remaining_amount > 0) {
      setDraggedItem({
        categoryId: category.id,
        categoryName: category.name,
        availableAmount: category.remaining_amount,
        color: category.color,
      });
    }
  };

  const handleDragEnd = (result: DropResult) => {
    const { source, destination } = result;

    if (!destination || !draggedItem) {
      setDraggedItem(null);
      return;
    }

    const fromCategory = categories.find(
      (c) => c.id === draggedItem.categoryId,
    );
    const toCategory = categories.find((c) => c.id === destination.droppableId);

    if (fromCategory && toCategory && fromCategory.id !== toCategory.id) {
      setSelectedFromCategory(fromCategory);
      setSelectedToCategory(toCategory);
      setShowReallocationModal(true);
    }

    setDraggedItem(null);
  };

  const quickReallocationSuggestions = [
    {
      title: 'Overspent Categories',
      categories: categories.filter((c) => c.spent_amount > c.allocated_amount),
      color: 'error',
    },
    {
      title: 'Underutilized Categories',
      categories: categories
        .filter((c) => c.remaining_amount > c.allocated_amount * 0.5)
        .sort((a, b) => b.remaining_amount - a.remaining_amount)
        .slice(0, 3),
      color: 'success',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900">
            Budget Reallocation
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Move funds between budget categories with drag & drop
          </p>
        </div>
        <button
          onClick={() => setShowReallocationModal(true)}
          className="px-4 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-sm font-semibold transition-all duration-200 flex items-center gap-2"
        >
          <ArrowLeftRight className="w-4 h-4" />
          Manual Reallocation
        </button>
      </div>

      {/* Quick Suggestions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {quickReallocationSuggestions.map((suggestion) => (
          <div
            key={suggestion.title}
            className="bg-white rounded-xl border border-gray-200 p-6"
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              {suggestion.color === 'error' ? (
                <AlertCircle className="w-5 h-5 text-error-600" />
              ) : (
                <CheckCircle className="w-5 h-5 text-success-600" />
              )}
              {suggestion.title}
            </h3>
            {suggestion.categories.length === 0 ? (
              <p className="text-gray-500 text-sm">
                No categories in this group
              </p>
            ) : (
              <div className="space-y-3">
                {suggestion.categories.map((category) => (
                  <div
                    key={category.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-gray-50"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: category.color }}
                      />
                      <div>
                        <p className="font-medium text-gray-900">
                          {category.name}
                        </p>
                        <p className="text-sm text-gray-500">
                          {suggestion.color === 'error'
                            ? `Over by $${(category.spent_amount - category.allocated_amount).toLocaleString()}`
                            : `Available: $${category.remaining_amount.toLocaleString()}`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      {suggestion.color === 'error' ? (
                        <TrendingUp className="w-5 h-5 text-error-500" />
                      ) : (
                        <TrendingDown className="w-5 h-5 text-success-500" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Drag & Drop Categories */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Move className="w-5 h-5 text-gray-400" />
          <h3 className="text-lg font-semibold text-gray-900">
            Drag & Drop Reallocation
          </h3>
          <div className="ml-auto">
            <div className="flex items-center gap-1 text-sm text-gray-500">
              <Info className="w-4 h-4" />
              Drag from source to destination category
            </div>
          </div>
        </div>

        <DragDropContext
          onDragStart={(start) => handleDragStart(start.draggableId)}
          onDragEnd={handleDragEnd}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {categories.map((category) => (
              <Droppable key={category.id} droppableId={category.id}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`border-2 border-dashed rounded-lg p-4 transition-all duration-200 ${
                      snapshot.isDraggedOver
                        ? 'border-primary-400 bg-primary-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <Draggable
                      draggableId={category.id}
                      index={0}
                      isDragDisabled={category.remaining_amount <= 0}
                    >
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          {...provided.dragHandleProps}
                          className={`bg-white rounded-lg border border-gray-200 p-4 transition-all duration-200 ${
                            snapshot.isDragging
                              ? 'shadow-lg rotate-2'
                              : category.remaining_amount > 0
                                ? 'cursor-move hover:shadow-md'
                                : 'cursor-not-allowed opacity-50'
                          }`}
                          style={{
                            ...provided.draggableProps.style,
                            borderLeftColor: category.color,
                            borderLeftWidth: '4px',
                          }}
                        >
                          <div className="flex items-center gap-3 mb-3">
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: category.color }}
                            />
                            <h4 className="font-medium text-gray-900 truncate">
                              {category.name}
                            </h4>
                          </div>

                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span className="text-gray-500">Allocated:</span>
                              <span className="font-medium">
                                ${category.allocated_amount.toLocaleString()}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-500">Spent:</span>
                              <span className="font-medium">
                                ${category.spent_amount.toLocaleString()}
                              </span>
                            </div>
                            <div className="flex justify-between border-t border-gray-100 pt-2">
                              <span className="text-gray-500">Available:</span>
                              <span
                                className={`font-semibold ${
                                  category.remaining_amount < 0
                                    ? 'text-error-600'
                                    : 'text-success-600'
                                }`}
                              >
                                ${category.remaining_amount.toLocaleString()}
                              </span>
                            </div>
                          </div>

                          {/* Progress Bar */}
                          <div className="mt-3">
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div
                                className="h-2 rounded-full transition-all duration-300"
                                style={{
                                  width: `${Math.min((category.spent_amount / category.allocated_amount) * 100, 100)}%`,
                                  backgroundColor:
                                    category.spent_amount >
                                    category.allocated_amount
                                      ? '#EF4444'
                                      : category.spent_amount /
                                            category.allocated_amount >
                                          0.8
                                        ? '#F59E0B'
                                        : '#10B981',
                                }}
                              />
                            </div>
                          </div>
                        </div>
                      )}
                    </Draggable>
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            ))}
          </div>
        </DragDropContext>
      </div>

      {/* Reallocation History */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center gap-2 mb-4">
          <History className="w-5 h-5 text-gray-400" />
          <h3 className="text-lg font-semibold text-gray-900">
            Recent Reallocations
          </h3>
        </div>

        {history.length === 0 ? (
          <div className="text-center py-8">
            <ArrowLeftRight className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No reallocations yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {history.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between p-4 rounded-lg border border-gray-100 hover:bg-gray-50"
              >
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <ArrowLeftRight className="w-4 h-4 text-gray-400" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">
                      {item.from_category?.name} → {item.to_category?.name}
                    </p>
                    <p className="text-sm text-gray-500">
                      {new Date(item.reallocation_date).toLocaleDateString()}
                      {item.reason && ` • ${item.reason}`}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-success-600">
                    +${item.amount.toLocaleString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Manual Reallocation Modal */}
      {showReallocationModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4">
            <div
              className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm"
              onClick={() => setShowReallocationModal(false)}
            />

            <div className="relative bg-white rounded-2xl max-w-lg w-full shadow-xl">
              <div className="p-6 border-b border-gray-200">
                <h3 className="text-xl font-semibold text-gray-900">
                  Reallocate Budget
                </h3>
                <p className="text-sm text-gray-500 mt-1">
                  Move funds from one category to another
                </p>
              </div>

              <div className="p-6 space-y-4">
                {/* From Category */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    From Category
                  </label>
                  <select
                    value={selectedFromCategory?.id || ''}
                    onChange={(e) => {
                      const category = categories.find(
                        (c) => c.id === e.target.value,
                      );
                      setSelectedFromCategory(category || null);
                    }}
                    className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-4 focus:ring-primary-100 focus:border-primary-300"
                  >
                    <option value="">Select source category</option>
                    {categories
                      .filter((c) => c.remaining_amount > 0)
                      .map((cat) => (
                        <option key={cat.id} value={cat.id}>
                          {cat.name} (${cat.remaining_amount.toLocaleString()}{' '}
                          available)
                        </option>
                      ))}
                  </select>
                </div>

                {/* To Category */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    To Category
                  </label>
                  <select
                    value={selectedToCategory?.id || ''}
                    onChange={(e) => {
                      const category = categories.find(
                        (c) => c.id === e.target.value,
                      );
                      setSelectedToCategory(category || null);
                    }}
                    className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-4 focus:ring-primary-100 focus:border-primary-300"
                  >
                    <option value="">Select destination category</option>
                    {categories
                      .filter((c) => c.id !== selectedFromCategory?.id)
                      .map((cat) => (
                        <option key={cat.id} value={cat.id}>
                          {cat.name}
                        </option>
                      ))}
                  </select>
                </div>

                {/* Amount */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Amount
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">
                      $
                    </span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max={selectedFromCategory?.remaining_amount || 0}
                      value={reallocationAmount}
                      onChange={(e) => setReallocationAmount(e.target.value)}
                      className="w-full pl-8 pr-3.5 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-4 focus:ring-primary-100 focus:border-primary-300"
                      placeholder="0.00"
                    />
                  </div>
                  {selectedFromCategory && (
                    <p className="text-xs text-gray-500 mt-1">
                      Maximum available: $
                      {selectedFromCategory.remaining_amount.toLocaleString()}
                    </p>
                  )}
                </div>

                {/* Reason */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Reason (Optional)
                  </label>
                  <textarea
                    value={reallocationReason}
                    onChange={(e) => setReallocationReason(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-4 focus:ring-primary-100 focus:border-primary-300"
                    rows={3}
                    placeholder="Why are you making this reallocation?"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
                <button
                  onClick={() => setShowReallocationModal(false)}
                  className="px-4 py-2.5 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-all duration-200"
                >
                  Cancel
                </button>
                <button
                  onClick={handleReallocation}
                  disabled={
                    !selectedFromCategory ||
                    !selectedToCategory ||
                    !reallocationAmount
                  }
                  className="px-4 py-2.5 bg-primary-600 hover:bg-primary-700 disabled:bg-gray-300 text-white rounded-lg text-sm font-semibold transition-all duration-200 flex items-center gap-2"
                >
                  <ArrowLeftRight className="w-4 h-4" />
                  Reallocate
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
