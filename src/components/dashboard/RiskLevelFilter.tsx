'use client';

import React from 'react';
import { Card, CardContent } from '@/components/ui/card-untitled';
import { Button } from '@/components/ui/button-untitled';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import {
  Calendar,
  Filter,
  ArrowUpDown,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Search,
  X,
} from 'lucide-react';
import type { HealthDashboardFilters } from '@/types/supplier-health';

interface RiskLevelFilterProps {
  filters: HealthDashboardFilters;
  onChange: (filters: Partial<HealthDashboardFilters>) => void;
  riskDistribution: Record<string, number>;
  disabled?: boolean;
  className?: string;
}

const RISK_LEVELS = [
  {
    value: 'green',
    label: 'Healthy',
    icon: CheckCircle2,
    color: 'text-green-600',
    bgColor: 'bg-green-100',
    borderColor: 'border-green-200',
  },
  {
    value: 'yellow',
    label: 'At Risk',
    icon: AlertTriangle,
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-100',
    borderColor: 'border-yellow-200',
  },
  {
    value: 'red',
    label: 'Critical',
    icon: AlertCircle,
    color: 'text-red-600',
    bgColor: 'bg-red-100',
    borderColor: 'border-red-200',
  },
] as const;

const CATEGORIES = [
  { value: 'photographer', label: 'Photographer' },
  { value: 'planner', label: 'Planner' },
  { value: 'venue', label: 'Venue' },
  { value: 'caterer', label: 'Caterer' },
  { value: 'florist', label: 'Florist' },
  { value: 'music', label: 'Music' },
  { value: 'other', label: 'Other' },
] as const;

const SORT_OPTIONS = [
  { value: 'health_score', label: 'Health Score' },
  { value: 'revenue', label: 'Revenue' },
  { value: 'last_activity', label: 'Last Activity' },
  { value: 'active_clients', label: 'Active Clients' },
  { value: 'client_satisfaction', label: 'Satisfaction' },
] as const;

const DATE_RANGE_OPTIONS = [
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
  { value: '90d', label: 'Last 90 days' },
  { value: '1y', label: 'Last year' },
] as const;

export function RiskLevelFilter({
  filters,
  onChange,
  riskDistribution,
  disabled = false,
  className = '',
}: RiskLevelFilterProps) {
  const handleRiskLevelToggle = (riskLevel: string) => {
    const newRiskLevels = filters.riskLevels.includes(riskLevel as any)
      ? filters.riskLevels.filter((level) => level !== riskLevel)
      : [...filters.riskLevels, riskLevel as any];

    onChange({ riskLevels: newRiskLevels });
  };

  const handleCategoryToggle = (category: string) => {
    const newCategories = filters.categories.includes(category)
      ? filters.categories.filter((cat) => cat !== category)
      : [...filters.categories, category];

    onChange({ categories: newCategories });
  };

  const handleSortChange = (sortBy: string) => {
    onChange({ sortBy: sortBy as any });
  };

  const handleSortOrderChange = (sortOrder: 'asc' | 'desc') => {
    onChange({ sortOrder });
  };

  const handleDateRangeChange = (range: string) => {
    const now = new Date();
    let start: Date;

    switch (range) {
      case '7d':
        start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        start = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case '1y':
        start = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
      default:
        start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    onChange({
      dateRange: { start, end: now },
    });
  };

  const handleHealthScoreRangeChange = (type: 'min' | 'max', value: string) => {
    const numValue = parseInt(value) || 0;
    const clampedValue = Math.max(0, Math.min(100, numValue));

    onChange({
      healthScoreRange: {
        ...filters.healthScoreRange,
        [type]: clampedValue,
      },
    });
  };

  const handleSearchChange = (query: string) => {
    onChange({ searchQuery: query });
  };

  const clearAllFilters = () => {
    onChange({
      riskLevels: [],
      categories: [],
      sortBy: 'health_score',
      sortOrder: 'desc',
      healthScoreRange: { min: 0, max: 100 },
      searchQuery: '',
    });
  };

  const hasActiveFilters =
    filters.riskLevels.length > 0 ||
    filters.categories.length > 0 ||
    filters.searchQuery ||
    filters.healthScoreRange.min > 0 ||
    filters.healthScoreRange.max < 100;

  const getCurrentDateRange = () => {
    const diffTime =
      filters.dateRange.end.getTime() - filters.dateRange.start.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays <= 7) return '7d';
    if (diffDays <= 30) return '30d';
    if (diffDays <= 90) return '90d';
    return '1y';
  };

  return (
    <Card variant="default" padding="md" className={className}>
      <CardContent noPadding className="p-4">
        <div className="space-y-6">
          {/* Search Bar */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">
              Search Suppliers
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                type="text"
                placeholder="Search by name or category..."
                value={filters.searchQuery || ''}
                onChange={(e) => handleSearchChange(e.target.value)}
                disabled={disabled}
                className="pl-10 pr-10"
              />
              {filters.searchQuery && (
                <button
                  onClick={() => handleSearchChange('')}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  disabled={disabled}
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          {/* Risk Level Filters */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-gray-900">Risk Levels</h3>
              {hasActiveFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearAllFilters}
                  disabled={disabled}
                  className="text-xs text-gray-500 hover:text-gray-700 h-6 px-2"
                >
                  Clear All
                </Button>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              {RISK_LEVELS.map(
                ({ value, label, icon: Icon, color, bgColor, borderColor }) => {
                  const count = riskDistribution[value] || 0;
                  const isSelected = filters.riskLevels.includes(value as any);

                  return (
                    <Button
                      key={value}
                      variant={isSelected ? 'primary' : 'secondary'}
                      size="sm"
                      onClick={() => handleRiskLevelToggle(value)}
                      disabled={disabled}
                      className={`flex items-center gap-2 ${
                        !isSelected
                          ? `${bgColor} ${borderColor} ${color} hover:${bgColor}`
                          : ''
                      }`}
                    >
                      <Icon
                        className={`h-3 w-3 ${isSelected ? 'text-white' : color}`}
                      />
                      <span>{label}</span>
                      <Badge variant="secondary" className="ml-1 text-xs">
                        {count}
                      </Badge>
                    </Button>
                  );
                },
              )}
            </div>
          </div>

          {/* Category Filters */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-gray-900">Categories</h3>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map(({ value, label }) => {
                const isSelected = filters.categories.includes(value);

                return (
                  <Button
                    key={value}
                    variant={isSelected ? 'primary' : 'secondary'}
                    size="sm"
                    onClick={() => handleCategoryToggle(value)}
                    disabled={disabled}
                  >
                    {label}
                  </Button>
                );
              })}
            </div>
          </div>

          {/* Health Score Range */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-gray-900">
              Health Score Range
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">
                  Min Score
                </label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={filters.healthScoreRange.min}
                  onChange={(e) =>
                    handleHealthScoreRangeChange('min', e.target.value)
                  }
                  disabled={disabled}
                  className="text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">
                  Max Score
                </label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={filters.healthScoreRange.max}
                  onChange={(e) =>
                    handleHealthScoreRangeChange('max', e.target.value)
                  }
                  disabled={disabled}
                  className="text-sm"
                />
              </div>
            </div>
          </div>

          {/* Date Range and Sorting */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Date Range */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">
                Time Period
              </label>
              <Select
                value={getCurrentDateRange()}
                onValueChange={handleDateRangeChange}
                disabled={disabled}
              >
                <SelectTrigger>
                  <Calendar className="h-4 w-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DATE_RANGE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Sort By */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">
                Sort By
              </label>
              <Select
                value={filters.sortBy}
                onValueChange={handleSortChange}
                disabled={disabled}
              >
                <SelectTrigger>
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SORT_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Sort Order */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Order</label>
              <Select
                value={filters.sortOrder}
                onValueChange={(value: 'asc' | 'desc') =>
                  handleSortOrderChange(value)
                }
                disabled={disabled}
              >
                <SelectTrigger>
                  <ArrowUpDown className="h-4 w-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="desc">High to Low</SelectItem>
                  <SelectItem value="asc">Low to High</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Active Filters Summary */}
          {hasActiveFilters && (
            <div className="pt-3 border-t border-gray-200">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm text-gray-500">Active filters:</span>
                {filters.riskLevels.map((level) => {
                  const riskConfig = RISK_LEVELS.find((r) => r.value === level);
                  return (
                    <Badge
                      key={level}
                      variant="secondary"
                      className={`capitalize ${riskConfig?.color}`}
                    >
                      {riskConfig?.label || level} Risk
                    </Badge>
                  );
                })}
                {filters.categories.map((category) => {
                  const categoryConfig = CATEGORIES.find(
                    (c) => c.value === category,
                  );
                  return (
                    <Badge
                      key={category}
                      variant="outline"
                      className="capitalize"
                    >
                      {categoryConfig?.label || category}
                    </Badge>
                  );
                })}
                {filters.searchQuery && (
                  <Badge variant="outline">
                    Search: "{filters.searchQuery}"
                  </Badge>
                )}
                {(filters.healthScoreRange.min > 0 ||
                  filters.healthScoreRange.max < 100) && (
                  <Badge variant="outline">
                    Score: {filters.healthScoreRange.min}-
                    {filters.healthScoreRange.max}
                  </Badge>
                )}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default RiskLevelFilter;
