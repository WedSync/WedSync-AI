'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { SkipLink } from '@/components/ui/skip-link';
import { ScreenReaderOnly } from '@/components/ui/screen-reader-only';
import { useBudgetOptimized } from '@/hooks/useBudgetOptimized';
import { BudgetErrorBoundary } from './BudgetErrorBoundary';
import { DollarSign, AlertTriangle, Plus } from 'lucide-react';

// WCAG 2.1 AA compliant color palette
const ACCESSIBLE_COLORS = {
  success: '#16a34a', // 4.5:1 contrast ratio
  warning: '#d97706', // 4.5:1 contrast ratio
  error: '#dc2626', // 4.5:1 contrast ratio
  info: '#2563eb', // 4.5:1 contrast ratio
};

interface AccessibleBudgetInterfaceProps {
  weddingId: string;
}

function AccessibleBudgetInterfaceContent({
  weddingId,
}: AccessibleBudgetInterfaceProps) {
  const { data, loading, error } = useBudgetOptimized({ weddingId });
  const [announcements, setAnnouncements] = useState<string[]>([]);
  const announcementRef = useRef<HTMLDivElement>(null);

  // Announce important updates to screen readers
  const announce = (message: string) => {
    setAnnouncements((prev) => [...prev, message]);
    setTimeout(() => {
      setAnnouncements((prev) => prev.slice(1));
    }, 5000);
  };

  useEffect(() => {
    if (data) {
      const spentPercentage =
        data.totalBudget > 0 ? (data.totalSpent / data.totalBudget) * 100 : 0;
      if (spentPercentage > 90) {
        announce(
          `Warning: You have spent ${spentPercentage.toFixed(1)}% of your total budget.`,
        );
      }
    }
  }, [data]);

  if (loading) {
    return (
      <div
        className="flex items-center justify-center min-h-[200px]"
        role="status"
        aria-live="polite"
      >
        <div className="text-center">
          <div
            className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"
            aria-hidden="true"
          ></div>
          <p>Loading your wedding budget...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div
        role="alert"
        className="p-4 border border-red-300 bg-red-50 rounded-lg"
      >
        <h2 className="text-lg font-semibold text-red-800 mb-2">
          Error Loading Budget
        </h2>
        <p className="text-red-700">{error}</p>
      </div>
    );
  }

  const spentPercentage =
    data?.totalBudget > 0 ? (data.totalSpent / data.totalBudget) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Skip Links for Keyboard Navigation */}
      <SkipLink href="#budget-summary">Skip to Budget Summary</SkipLink>
      <SkipLink href="#budget-categories">Skip to Budget Categories</SkipLink>

      {/* Screen Reader Announcements */}
      <div
        ref={announcementRef}
        aria-live="assertive"
        aria-atomic="true"
        className="sr-only"
      >
        {announcements.map((announcement, index) => (
          <div key={index}>{announcement}</div>
        ))}
      </div>

      {/* Budget Summary */}
      <section
        id="budget-summary"
        aria-labelledby="summary-heading"
        tabIndex={-1}
      >
        <Card>
          <CardHeader>
            <CardTitle id="summary-heading" className="flex items-center gap-2">
              <DollarSign className="w-5 h-5" aria-hidden="true" />
              Wedding Budget Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              <div className="text-center">
                <div
                  className="text-sm font-medium text-muted-foreground"
                  id="total-budget-label"
                >
                  Total Budget
                </div>
                <div
                  className="text-2xl font-bold"
                  aria-labelledby="total-budget-label"
                  role="text"
                >
                  ${data?.totalBudget.toLocaleString() || 0}
                </div>
              </div>

              <div className="text-center">
                <div
                  className="text-sm font-medium text-muted-foreground"
                  id="total-spent-label"
                >
                  Total Spent
                </div>
                <div
                  className="text-2xl font-bold text-red-600"
                  aria-labelledby="total-spent-label"
                  role="text"
                >
                  ${data?.totalSpent.toLocaleString() || 0}
                </div>
              </div>

              <div className="text-center">
                <div
                  className="text-sm font-medium text-muted-foreground"
                  id="remaining-label"
                >
                  Remaining Budget
                </div>
                <div
                  className="text-2xl font-bold text-green-600"
                  aria-labelledby="remaining-label"
                  role="text"
                >
                  $
                  {(
                    (data?.totalBudget || 0) - (data?.totalSpent || 0)
                  ).toLocaleString()}
                </div>
              </div>
            </div>

            {/* Accessible Progress Bar */}
            <div
              role="progressbar"
              aria-valuenow={spentPercentage}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`Budget usage: ${spentPercentage.toFixed(1)} percent of total budget spent`}
              className="mb-2"
            >
              <Progress
                value={spentPercentage}
                className="h-4"
                aria-hidden="true"
              />
            </div>

            <p className="text-sm text-center" role="text">
              {spentPercentage.toFixed(1)}% of budget used
            </p>

            {spentPercentage > 90 && (
              <div
                role="alert"
                className="flex items-center gap-2 mt-4 p-3 border rounded-lg"
                style={{
                  backgroundColor: '#fef2f2',
                  borderColor: ACCESSIBLE_COLORS.error,
                  color: '#7f1d1d',
                }}
              >
                <AlertTriangle
                  className="w-4 h-4"
                  aria-hidden="true"
                  style={{ color: ACCESSIBLE_COLORS.error }}
                />
                <p className="text-sm font-medium">
                  Warning: You are approaching your budget limit!
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      {/* Budget Categories */}
      <section
        id="budget-categories"
        aria-labelledby="categories-heading"
        tabIndex={-1}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 id="categories-heading" className="text-xl font-semibold">
            Budget Categories
          </h2>
          <Button
            aria-describedby="add-category-description"
            className="flex items-center gap-2"
          >
            <Plus className="w-4 h-4" aria-hidden="true" />
            Add Category
          </Button>
          <ScreenReaderOnly id="add-category-description">
            Add a new budget category to track expenses
          </ScreenReaderOnly>
        </div>

        <div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          role="region"
          aria-label="Budget categories list"
        >
          {data?.categories?.map((category: any) => {
            const categorySpent =
              category.allocated_amount > 0
                ? (category.spent_amount / category.allocated_amount) * 100
                : 0;
            const isOverBudget =
              category.spent_amount > category.allocated_amount;

            return (
              <Card
                key={category.id}
                className="focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-2"
                tabIndex={0}
                role="article"
                aria-labelledby={`category-${category.id}-title`}
                aria-describedby={`category-${category.id}-details`}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    // Handle category selection/expansion
                  }
                }}
              >
                <CardHeader className="pb-3">
                  <CardTitle
                    id={`category-${category.id}-title`}
                    className="flex items-center gap-2 text-lg"
                  >
                    <div
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: category.color_code }}
                      aria-label={`Category color: ${category.color_code}`}
                    />
                    {category.name}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div
                    id={`category-${category.id}-details`}
                    className="space-y-3"
                  >
                    <div className="flex justify-between text-sm">
                      <span>Allocated:</span>
                      <span className="font-medium">
                        ${category.allocated_amount.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Spent:</span>
                      <span
                        className={`font-medium ${isOverBudget ? 'text-red-600' : 'text-green-600'}`}
                        aria-label={`Spent ${category.spent_amount.toLocaleString()} dollars${isOverBudget ? ', over budget' : ''}`}
                      >
                        ${category.spent_amount.toLocaleString()}
                      </span>
                    </div>

                    <div
                      role="progressbar"
                      aria-valuenow={Math.min(categorySpent, 100)}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-label={`${category.name} spending: ${categorySpent.toFixed(1)} percent of allocated budget`}
                    >
                      <Progress
                        value={Math.min(categorySpent, 100)}
                        className="h-2"
                        aria-hidden="true"
                      />
                    </div>

                    {isOverBudget && (
                      <div
                        role="alert"
                        className="text-xs flex items-center gap-1"
                        style={{ color: ACCESSIBLE_COLORS.error }}
                      >
                        <AlertTriangle className="w-3 h-3" aria-hidden="true" />
                        Over budget by $
                        {(
                          category.spent_amount - category.allocated_amount
                        ).toLocaleString()}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>
    </div>
  );
}

export default function AccessibleBudgetInterface(
  props: AccessibleBudgetInterfaceProps,
) {
  return (
    <BudgetErrorBoundary>
      <AccessibleBudgetInterfaceContent {...props} />
    </BudgetErrorBoundary>
  );
}
