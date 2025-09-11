'use client';

import React, { useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { format } from 'date-fns';
import { CalendarIcon, Filter, X, ChevronDown, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ExportFiltersProps } from '@/types/budget-export';

/**
 * ExportFilters - Category, date range, and payment status filtering UI
 * Provides comprehensive filtering options with validation and clear visual feedback
 */
export function ExportFilters({
  filters,
  onFiltersChange,
  availableCategories,
  isLoading = false,
}: ExportFiltersProps) {
  const [categoryDropdownOpen, setCategoryDropdownOpen] = useState(false);

  const handleCategoryToggle = (category: string) => {
    const newCategories = filters.categories.includes(category)
      ? filters.categories.filter((c) => c !== category)
      : [...filters.categories, category];

    onFiltersChange({
      ...filters,
      categories: newCategories,
    });
  };

  const handleDateRangeChange = (start?: Date, end?: Date) => {
    if (start && end) {
      onFiltersChange({
        ...filters,
        dateRange: { start, end },
      });
    } else {
      onFiltersChange({
        ...filters,
        dateRange: null,
      });
    }
  };

  const handlePaymentStatusChange = (
    status: 'all' | 'paid' | 'pending' | 'planned',
  ) => {
    onFiltersChange({
      ...filters,
      paymentStatus: status,
    });
  };

  const handleIncludeOptionsChange = (
    field: keyof typeof filters,
    value: boolean,
  ) => {
    onFiltersChange({
      ...filters,
      [field]: value,
    });
  };

  const clearAllFilters = () => {
    onFiltersChange({
      categories: [],
      dateRange: null,
      paymentStatus: 'all',
      includeNotes: true,
      includeReceipts: false,
      includeVendors: true,
    });
  };

  const hasActiveFilters =
    filters.categories.length > 0 ||
    filters.dateRange !== null ||
    filters.paymentStatus !== 'all';

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Export Filters
            {hasActiveFilters && (
              <Badge variant="secondary" className="ml-2">
                {filters.categories.length +
                  (filters.dateRange ? 1 : 0) +
                  (filters.paymentStatus !== 'all' ? 1 : 0)}{' '}
                active
              </Badge>
            )}
          </div>
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearAllFilters}
              disabled={isLoading}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              Clear all
            </Button>
          )}
        </CardTitle>
        <CardDescription>
          Choose which data to include in your export. Leave filters empty to
          export all data.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Category Selection */}
        <div className="space-y-2">
          <Label htmlFor="categories">Categories</Label>
          <div className="relative">
            <Popover
              open={categoryDropdownOpen}
              onOpenChange={setCategoryDropdownOpen}
            >
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={categoryDropdownOpen}
                  className="w-full justify-between"
                  disabled={isLoading || availableCategories.length === 0}
                >
                  {filters.categories.length === 0
                    ? 'Select categories...'
                    : `${filters.categories.length} selected`}
                  <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-full p-0" align="start">
                <div className="max-h-60 overflow-auto">
                  {availableCategories.length === 0 ? (
                    <div className="p-4 text-sm text-gray-500">
                      No categories available
                    </div>
                  ) : (
                    <div className="p-2">
                      {availableCategories.map((category) => (
                        <div
                          key={category}
                          className="flex items-center space-x-2 p-2 hover:bg-gray-50 rounded cursor-pointer"
                          onClick={() => handleCategoryToggle(category)}
                        >
                          <Checkbox
                            id={`category-${category}`}
                            checked={filters.categories.includes(category)}
                            onChange={() => handleCategoryToggle(category)}
                          />
                          <Label
                            htmlFor={`category-${category}`}
                            className="flex-1 cursor-pointer"
                          >
                            {category}
                          </Label>
                          {filters.categories.includes(category) && (
                            <Check className="h-4 w-4 text-blue-600" />
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </PopoverContent>
            </Popover>
          </div>

          {/* Selected Categories */}
          {filters.categories.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {filters.categories.map((category) => (
                <Badge
                  key={category}
                  variant="secondary"
                  className="text-xs flex items-center gap-1"
                >
                  {category}
                  <X
                    className="h-3 w-3 cursor-pointer hover:text-red-600"
                    onClick={() => handleCategoryToggle(category)}
                  />
                </Badge>
              ))}
            </div>
          )}
        </div>

        {/* Date Range Selection */}
        <div className="space-y-2">
          <Label>Date Range</Label>
          <div className="flex flex-col sm:flex-row gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    'flex-1 justify-start text-left font-normal',
                    !filters.dateRange?.start && 'text-muted-foreground',
                  )}
                  disabled={isLoading}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {filters.dateRange?.start ? (
                    format(filters.dateRange.start, 'PPP')
                  ) : (
                    <span>Start date</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={filters.dateRange?.start}
                  onSelect={(date) => {
                    if (date) {
                      handleDateRangeChange(
                        date,
                        filters.dateRange?.end || date,
                      );
                    }
                  }}
                  disabled={(date) => date > new Date()}
                  initialFocus
                />
              </PopoverContent>
            </Popover>

            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    'flex-1 justify-start text-left font-normal',
                    !filters.dateRange?.end && 'text-muted-foreground',
                  )}
                  disabled={isLoading}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {filters.dateRange?.end ? (
                    format(filters.dateRange.end, 'PPP')
                  ) : (
                    <span>End date</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={filters.dateRange?.end}
                  onSelect={(date) => {
                    if (date && filters.dateRange?.start) {
                      handleDateRangeChange(filters.dateRange.start, date);
                    }
                  }}
                  disabled={(date) =>
                    date > new Date() ||
                    (filters.dateRange?.start && date < filters.dateRange.start)
                  }
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          {filters.dateRange && (
            <div className="flex items-center gap-2 mt-2">
              <Badge variant="outline" className="text-xs">
                {format(filters.dateRange.start, 'MMM d')} -{' '}
                {format(filters.dateRange.end, 'MMM d, yyyy')}
              </Badge>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleDateRangeChange()}
                className="h-6 w-6 p-0"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          )}
        </div>

        {/* Payment Status Filter */}
        <div className="space-y-2">
          <Label htmlFor="payment-status">Payment Status</Label>
          <Select
            value={filters.paymentStatus}
            onValueChange={handlePaymentStatusChange}
            disabled={isLoading}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select payment status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All transactions</SelectItem>
              <SelectItem value="paid">Paid only</SelectItem>
              <SelectItem value="pending">Pending only</SelectItem>
              <SelectItem value="planned">Planned only</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Include Options */}
        <div className="space-y-3">
          <Label>Include Additional Information</Label>

          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="include-notes"
                checked={filters.includeNotes}
                onCheckedChange={(checked) =>
                  handleIncludeOptionsChange('includeNotes', checked as boolean)
                }
                disabled={isLoading}
              />
              <Label htmlFor="include-notes" className="text-sm">
                Include transaction notes and descriptions
              </Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="include-receipts"
                checked={filters.includeReceipts}
                onCheckedChange={(checked) =>
                  handleIncludeOptionsChange(
                    'includeReceipts',
                    checked as boolean,
                  )
                }
                disabled={isLoading}
              />
              <Label htmlFor="include-receipts" className="text-sm">
                Include receipt attachments (PDF format only)
              </Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="include-vendors"
                checked={filters.includeVendors}
                onCheckedChange={(checked) =>
                  handleIncludeOptionsChange(
                    'includeVendors',
                    checked as boolean,
                  )
                }
                disabled={isLoading}
              />
              <Label htmlFor="include-vendors" className="text-sm">
                Include vendor information
              </Label>
            </div>
          </div>
        </div>

        {/* Filter Summary */}
        {hasActiveFilters && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <h4 className="text-sm font-medium text-blue-900 mb-2">
              Active Filters Summary
            </h4>
            <div className="text-sm text-blue-800 space-y-1">
              {filters.categories.length > 0 && (
                <p>• Categories: {filters.categories.join(', ')}</p>
              )}
              {filters.dateRange && (
                <p>
                  • Date range: {format(filters.dateRange.start, 'MMM d')} -{' '}
                  {format(filters.dateRange.end, 'MMM d, yyyy')}
                </p>
              )}
              {filters.paymentStatus !== 'all' && (
                <p>• Payment status: {filters.paymentStatus}</p>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default ExportFilters;
