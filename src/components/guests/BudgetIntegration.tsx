'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Guest } from '@/types/guest-management';
import {
  CurrencyDollarIcon,
  ChartBarIcon,
  ExclamationTriangleIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  CalculatorIcon,
  UsersIcon,
} from '@heroicons/react/20/solid';

interface BudgetCategory {
  id: string;
  name: string;
  color: string;
  allocated_amount: number;
  spent_amount: number;
  per_guest_cost?: number;
  is_per_guest: boolean;
}

interface GuestBudgetData {
  guest_count: number;
  attending_count: number;
  total_budget: number;
  spent_amount: number;
  per_guest_costs: {
    catering: number;
    venue: number;
    gifts: number;
    accommodation: number;
    transportation: number;
    total: number;
  };
  budget_categories: BudgetCategory[];
  projections: {
    if_all_attend: number;
    current_projection: number;
    cost_difference: number;
  };
}

interface BudgetIntegrationProps {
  selectedGuests: Guest[];
  totalGuests: number;
  attendingGuests: number;
  coupleId: string;
  weddingId: string;
}

export function BudgetIntegration({
  selectedGuests,
  totalGuests,
  attendingGuests,
  coupleId,
  weddingId,
}: BudgetIntegrationProps) {
  const [budgetData, setBudgetData] = useState<GuestBudgetData | null>(null);
  const [loading, setLoading] = useState(true);
  const [updatingProjection, setUpdatingProjection] = useState(false);

  useEffect(() => {
    fetchBudgetData();
  }, [totalGuests, attendingGuests, weddingId]);

  const fetchBudgetData = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `/api/budget/analysis?wedding_id=${weddingId}&guest_count=${totalGuests}&attending_count=${attendingGuests}`,
        {
          headers: { 'Content-Type': 'application/json' },
        },
      );

      if (response.ok) {
        const data = await response.json();
        setBudgetData(data.budget_analysis);
      }
    } catch (error) {
      console.error('Failed to fetch budget data:', error);
    }
    setLoading(false);
  };

  const updateGuestProjection = async (newAttendingCount: number) => {
    setUpdatingProjection(true);
    try {
      const response = await fetch('/api/budget/projections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wedding_id: weddingId,
          guest_count: totalGuests,
          attending_count: newAttendingCount,
        }),
      });

      if (response.ok) {
        await fetchBudgetData();
      }
    } catch (error) {
      console.error('Failed to update projection:', error);
    }
    setUpdatingProjection(false);
  };

  const createBudgetTransaction = async (
    amount: number,
    description: string,
    category: string,
  ) => {
    try {
      const response = await fetch('/api/budget/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category_id: category,
          amount: amount,
          description: description,
          transaction_type: 'expense',
          wedding_id: weddingId,
        }),
      });

      if (response.ok) {
        await fetchBudgetData();
      }
    } catch (error) {
      console.error('Failed to create budget transaction:', error);
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

  const getPerGuestCost = () => {
    if (!budgetData || attendingGuests === 0) return 0;
    return budgetData.per_guest_costs.total;
  };

  const getTotalProjectedCost = () => {
    if (!budgetData) return 0;
    return getPerGuestCost() * attendingGuests;
  };

  const getBudgetHealth = () => {
    if (!budgetData) return { status: 'unknown', percentage: 0 };

    const percentage =
      (budgetData.spent_amount / budgetData.total_budget) * 100;

    if (percentage > 100) return { status: 'over', percentage };
    if (percentage > 90) return { status: 'warning', percentage };
    if (percentage > 75) return { status: 'caution', percentage };
    return { status: 'good', percentage };
  };

  const getHealthColor = (status: string) => {
    switch (status) {
      case 'over':
        return 'text-red-600';
      case 'warning':
        return 'text-orange-600';
      case 'caution':
        return 'text-yellow-600';
      default:
        return 'text-green-600';
    }
  };

  const getHealthIcon = (status: string) => {
    switch (status) {
      case 'over':
        return <ExclamationTriangleIcon className="w-5 h-5 text-red-600" />;
      case 'warning':
        return <ArrowTrendingUpIcon className="w-5 h-5 text-orange-600" />;
      case 'caution':
        return <ArrowTrendingUpIcon className="w-5 h-5 text-yellow-600" />;
      default:
        return <ChartBarIcon className="w-5 h-5 text-green-600" />;
    }
  };

  if (loading) {
    return (
      <Card className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-1/3"></div>
          <div className="grid grid-cols-2 gap-4">
            <div className="h-20 bg-gray-200 rounded"></div>
            <div className="h-20 bg-gray-200 rounded"></div>
          </div>
          <div className="h-32 bg-gray-200 rounded"></div>
        </div>
      </Card>
    );
  }

  if (!budgetData) {
    return (
      <Card className="p-6 text-center">
        <CurrencyDollarIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-600">Budget data not available</p>
      </Card>
    );
  }

  const budgetHealth = getBudgetHealth();

  return (
    <div className="space-y-6">
      {/* Budget Overview */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">
            Budget Overview
          </h3>
          {getHealthIcon(budgetHealth.status)}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
          <div className="text-center">
            <div
              className={`text-2xl font-bold ${getHealthColor(budgetHealth.status)}`}
            >
              {formatCurrency(budgetData.total_budget)}
            </div>
            <div className="text-sm text-gray-600">Total Budget</div>
          </div>

          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">
              {formatCurrency(budgetData.spent_amount)}
            </div>
            <div className="text-sm text-gray-600">Spent</div>
          </div>

          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">
              {formatCurrency(
                budgetData.total_budget - budgetData.spent_amount,
              )}
            </div>
            <div className="text-sm text-gray-600">Remaining</div>
          </div>
        </div>

        <div className="mb-2">
          <div className="flex justify-between text-sm text-gray-600 mb-1">
            <span>Budget Usage</span>
            <span>{Math.round(budgetHealth.percentage)}%</span>
          </div>
          <Progress
            value={budgetHealth.percentage}
            className={`h-2 ${
              budgetHealth.status === 'over'
                ? 'bg-red-100'
                : budgetHealth.status === 'warning'
                  ? 'bg-orange-100'
                  : budgetHealth.status === 'caution'
                    ? 'bg-yellow-100'
                    : 'bg-green-100'
            }`}
          />
        </div>

        {budgetHealth.status === 'over' && (
          <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center gap-2">
              <ExclamationTriangleIcon className="w-4 h-4 text-red-600" />
              <span className="text-sm text-red-800 font-medium">
                Budget exceeded by{' '}
                {formatCurrency(
                  budgetData.spent_amount - budgetData.total_budget,
                )}
              </span>
            </div>
          </div>
        )}
      </Card>

      {/* Per-Guest Costs */}
      <Card className="p-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Per-Guest Cost Breakdown
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div>
            <div className="text-center mb-4">
              <div className="text-3xl font-bold text-primary-600">
                {formatCurrency(getPerGuestCost())}
              </div>
              <div className="text-sm text-gray-600">
                Cost per attending guest
              </div>
            </div>

            <div className="space-y-3">
              {Object.entries(budgetData.per_guest_costs).map(
                ([category, cost]) => {
                  if (category === 'total') return null;
                  return (
                    <div
                      key={category}
                      className="flex justify-between items-center"
                    >
                      <span className="text-sm font-medium text-gray-700 capitalize">
                        {category.replace('_', ' ')}
                      </span>
                      <span className="text-sm text-gray-900">
                        {formatCurrency(cost)}
                      </span>
                    </div>
                  );
                },
              )}
            </div>
          </div>

          <div>
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-3">
                Guest Count Impact
              </h4>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Total Invited:</span>
                  <span className="font-medium">{totalGuests}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Currently Attending:</span>
                  <span className="font-medium text-green-600">
                    {attendingGuests}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Current Cost:</span>
                  <span className="font-medium">
                    {formatCurrency(getTotalProjectedCost())}
                  </span>
                </div>

                <div className="border-t pt-2 mt-3">
                  <div className="flex justify-between text-sm font-medium">
                    <span className="text-gray-900">If all attend:</span>
                    <span className="text-orange-600">
                      {formatCurrency(budgetData.projections.if_all_attend)}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>Difference:</span>
                    <span
                      className={
                        budgetData.projections.cost_difference > 0
                          ? 'text-red-600'
                          : 'text-green-600'
                      }
                    >
                      {budgetData.projections.cost_difference > 0 ? '+' : ''}
                      {formatCurrency(budgetData.projections.cost_difference)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Budget Categories */}
      <Card className="p-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Budget Categories
        </h3>

        <div className="space-y-3">
          {budgetData.budget_categories.map((category) => {
            const percentage =
              category.allocated_amount > 0
                ? (category.spent_amount / category.allocated_amount) * 100
                : 0;
            const isOverBudget = percentage > 100;

            return (
              <div
                key={category.id}
                className="border border-gray-200 rounded-lg p-3"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: category.color }}
                    ></div>
                    <span className="font-medium text-gray-900">
                      {category.name}
                    </span>
                    {category.is_per_guest && (
                      <Badge variant="outline" className="text-xs">
                        <UsersIcon className="w-3 h-3 mr-1" />
                        Per Guest
                      </Badge>
                    )}
                  </div>

                  <div className="text-right">
                    <div className="text-sm font-medium">
                      {formatCurrency(category.spent_amount)} /{' '}
                      {formatCurrency(category.allocated_amount)}
                    </div>
                    {category.per_guest_cost && (
                      <div className="text-xs text-gray-500">
                        {formatCurrency(category.per_guest_cost)} per guest
                      </div>
                    )}
                  </div>
                </div>

                <div className="mb-1">
                  <Progress
                    value={Math.min(percentage, 100)}
                    className={`h-2 ${isOverBudget ? 'bg-red-100' : 'bg-gray-100'}`}
                  />
                </div>

                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">
                    {Math.round(percentage)}% used
                  </span>
                  {isOverBudget && (
                    <span className="text-red-600 font-medium">
                      Over by{' '}
                      {formatCurrency(
                        category.spent_amount - category.allocated_amount,
                      )}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Guest Count Scenarios */}
      {selectedGuests.length > 0 && (
        <Card className="p-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Selected Guests Impact
          </h3>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <CalculatorIcon className="w-5 h-5 text-blue-600" />
                <span className="font-medium text-blue-900">
                  {selectedGuests.length} Guest
                  {selectedGuests.length !== 1 ? 's' : ''} Selected
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-blue-600">
                  {formatCurrency(getPerGuestCost() * selectedGuests.length)}
                </div>
                <div className="text-sm text-blue-700">Total Cost</div>
              </div>

              <div>
                <div className="text-2xl font-bold text-blue-600">
                  {formatCurrency(
                    budgetData.per_guest_costs.catering * selectedGuests.length,
                  )}
                </div>
                <div className="text-sm text-blue-700">Catering</div>
              </div>

              <div>
                <div className="text-2xl font-bold text-blue-600">
                  {formatCurrency(
                    budgetData.per_guest_costs.venue * selectedGuests.length,
                  )}
                </div>
                <div className="text-sm text-blue-700">Venue Share</div>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Quick Actions */}
      <Card className="p-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Budget Actions
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Button
            variant="outline"
            onClick={() => updateGuestProjection(attendingGuests + 5)}
            disabled={updatingProjection}
            className="justify-start"
          >
            <ArrowTrendingUpIcon className="w-4 h-4 mr-2" />
            Project +5 More Guests
          </Button>

          <Button
            variant="outline"
            onClick={() =>
              updateGuestProjection(Math.max(0, attendingGuests - 5))
            }
            disabled={updatingProjection}
            className="justify-start"
          >
            <ArrowTrendingDownIcon className="w-4 h-4 mr-2" />
            Project -5 Fewer Guests
          </Button>
        </div>
      </Card>

      {/* Real-time Updates Notice */}
      <div className="text-center text-sm text-gray-600">
        <p>Budget calculations update in real-time as guest RSVPs change</p>
      </div>
    </div>
  );
}
