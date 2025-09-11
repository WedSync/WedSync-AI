'use client';

import React, {
  useState,
  useCallback,
  useMemo,
  useTransition,
  memo,
} from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card-untitled';
import { Button } from '@/components/ui/button-untitled';
import { Badge } from '@/components/ui/badge';
import { DashboardSkeleton, Skeleton } from '@/components/ui/LoadingSkeleton';
import { Alert } from '@/components/ui/alert';
import {
  Users,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  ArrowUpIcon,
  ArrowDownIcon,
  FileText,
  Calendar,
} from 'lucide-react';
import { HealthTrendChart } from './HealthTrendChart';
import { InterventionActions } from './InterventionActions';
import { RiskLevelFilter } from './RiskLevelFilter';
import { HealthExportButton } from './HealthExportButton';
import { useSupabaseRealtime } from '@/hooks/useSupabaseRealtime';
import { createClient } from '@/lib/supabase/client';
import type {
  SupplierHealthMetrics,
  HealthDashboardFilters,
  DashboardSummary,
  InterventionAction,
  HealthUpdateEvent,
} from '@/types/supplier-health';

interface CustomerHealthDashboardProps {
  initialData?: SupplierHealthMetrics[];
  className?: string;
}

const CustomerHealthDashboard = memo(function CustomerHealthDashboard({
  initialData = [],
  className = '',
}: CustomerHealthDashboardProps) {
  const [suppliers, setSuppliers] =
    useState<SupplierHealthMetrics[]>(initialData);
  const [filters, setFilters] = useState<HealthDashboardFilters>({
    riskLevels: [],
    categories: [],
    dateRange: {
      start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
      end: new Date(),
    },
    healthScoreRange: { min: 0, max: 100 },
    sortBy: 'health_score',
    sortOrder: 'desc',
  });
  const [selectedSupplier, setSelectedSupplier] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Supabase client and realtime subscription
  const supabase = createClient();

  useSupabaseRealtime(
    supabase,
    'supplier_health_metrics',
    useCallback((payload: any) => {
      if (payload.eventType === 'UPDATE') {
        setSuppliers((prev) =>
          prev.map((supplier) =>
            supplier.supplier_id === payload.new.supplier_id
              ? { ...supplier, ...mapSupabaseToHealth(payload.new) }
              : supplier,
          ),
        );
      }
    }, []),
  );

  // Memoized filtered and sorted suppliers
  const filteredSuppliers = useMemo(() => {
    let filtered = suppliers;

    // Risk level filter
    if (filters.riskLevels.length > 0) {
      filtered = filtered.filter((supplier) =>
        filters.riskLevels.includes(supplier.risk_level),
      );
    }

    // Category filter
    if (filters.categories.length > 0) {
      filtered = filtered.filter((supplier) =>
        filters.categories.includes(supplier.supplier_category),
      );
    }

    // Health score range filter
    filtered = filtered.filter(
      (supplier) =>
        supplier.health_score >= filters.healthScoreRange.min &&
        supplier.health_score <= filters.healthScoreRange.max,
    );

    // Date range filter (last activity)
    filtered = filtered.filter((supplier) => {
      const lastActivity = new Date(supplier.last_activity);
      return (
        lastActivity >= filters.dateRange.start &&
        lastActivity <= filters.dateRange.end
      );
    });

    // Search query filter
    if (filters.searchQuery) {
      const query = filters.searchQuery.toLowerCase();
      filtered = filtered.filter(
        (supplier) =>
          supplier.supplier_name.toLowerCase().includes(query) ||
          supplier.supplier_category.toLowerCase().includes(query),
      );
    }

    // Sorting
    filtered.sort((a, b) => {
      let aValue: number | Date;
      let bValue: number | Date;

      switch (filters.sortBy) {
        case 'health_score':
          aValue = a.health_score;
          bValue = b.health_score;
          break;
        case 'revenue':
          aValue = a.revenue;
          bValue = b.revenue;
          break;
        case 'last_activity':
          aValue = new Date(a.last_activity);
          bValue = new Date(b.last_activity);
          break;
        case 'active_clients':
          aValue = a.active_clients;
          bValue = b.active_clients;
          break;
        case 'client_satisfaction':
          aValue = a.client_satisfaction;
          bValue = b.client_satisfaction;
          break;
        default:
          aValue = a.health_score;
          bValue = b.health_score;
      }

      const multiplier = filters.sortOrder === 'asc' ? 1 : -1;

      if (aValue instanceof Date && bValue instanceof Date) {
        return (aValue.getTime() - bValue.getTime()) * multiplier;
      }

      return ((aValue as number) - (bValue as number)) * multiplier;
    });

    return filtered;
  }, [suppliers, filters]);

  // Dashboard summary metrics
  const dashboardSummary = useMemo<DashboardSummary>(() => {
    const totalSuppliers = filteredSuppliers.length;
    const avgHealthScore =
      totalSuppliers > 0
        ? filteredSuppliers.reduce((sum, s) => sum + s.health_score, 0) /
          totalSuppliers
        : 0;

    const riskDistribution = filteredSuppliers.reduce(
      (acc, supplier) => {
        acc[supplier.risk_level] = (acc[supplier.risk_level] || 0) + 1;
        return acc;
      },
      { green: 0, yellow: 0, red: 0 },
    );

    const totalRevenue = filteredSuppliers.reduce(
      (sum, s) => sum + s.revenue,
      0,
    );
    const totalActiveClients = filteredSuppliers.reduce(
      (sum, s) => sum + s.active_clients,
      0,
    );
    const avgClientSatisfaction =
      totalSuppliers > 0
        ? filteredSuppliers.reduce((sum, s) => sum + s.client_satisfaction, 0) /
          totalSuppliers
        : 0;

    const criticalInterventions = filteredSuppliers
      .flatMap((s) => s.interventionsNeeded)
      .filter((i) => i.priority === 'critical').length;

    const overdueInterventions = filteredSuppliers
      .flatMap((s) => s.interventionsNeeded)
      .filter((i) => new Date(i.dueDate) < new Date()).length;

    return {
      totalSuppliers,
      avgHealthScore,
      riskDistribution,
      totalRevenue,
      totalActiveClients,
      avgClientSatisfaction,
      criticalInterventions,
      overdueInterventions,
    };
  }, [filteredSuppliers]);

  const handleFilterChange = useCallback(
    (newFilters: Partial<HealthDashboardFilters>) => {
      startTransition(() => {
        setFilters((prev) => ({ ...prev, ...newFilters }));
      });
    },
    [],
  );

  const handleInterventionAction = useCallback(
    async (supplierId: string, intervention: InterventionAction) => {
      try {
        setIsLoading(true);

        // Execute intervention via API
        const response = await fetch(
          `/api/admin/suppliers/${supplierId}/interventions`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(intervention),
          },
        );

        if (!response.ok) {
          throw new Error('Failed to execute intervention');
        }

        // Update local state
        setSuppliers((prev) =>
          prev.map((supplier) =>
            supplier.supplier_id === supplierId
              ? {
                  ...supplier,
                  interventionsNeeded: supplier.interventionsNeeded.filter(
                    (i) => i.id !== intervention.id,
                  ),
                }
              : supplier,
          ),
        );

        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  const getRiskBadgeVariant = (riskLevel: string) => {
    switch (riskLevel) {
      case 'green':
        return 'success';
      case 'yellow':
        return 'warning';
      case 'red':
        return 'destructive';
      default:
        return 'secondary';
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  // Loading state
  if (isLoading && suppliers.length === 0) {
    return (
      <div className={`space-y-6 ${className}`}>
        <DashboardSkeleton />
      </div>
    );
  }

  return (
    <div
      className={`space-y-6 ${className}`}
      role="main"
      aria-label="Customer Health Dashboard"
    >
      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <div>
            <strong>Error:</strong> {error}
          </div>
        </Alert>
      )}

      {/* Dashboard Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">
            Customer Success Dashboard
          </h1>
          <p className="text-gray-600">
            Monitor supplier engagement and identify growth opportunities
          </p>
        </div>
        <HealthExportButton
          suppliers={filteredSuppliers}
          filters={filters}
          summary={dashboardSummary}
          disabled={isLoading}
        />
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card variant="default" padding="md">
          <CardContent noPadding className="p-6">
            <div className="flex items-center">
              <Users className="h-4 w-4 text-gray-500" />
              <span className="ml-2 text-sm font-medium text-gray-600">
                Total Suppliers
              </span>
            </div>
            <div className="text-2xl font-bold text-gray-900">
              {dashboardSummary.totalSuppliers}
            </div>
          </CardContent>
        </Card>

        <Card variant="default" padding="md">
          <CardContent noPadding className="p-6">
            <div className="flex items-center">
              <TrendingUp className="h-4 w-4 text-gray-500" />
              <span className="ml-2 text-sm font-medium text-gray-600">
                Avg Health Score
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold text-gray-900">
                {dashboardSummary.avgHealthScore.toFixed(1)}
              </span>
              <Badge variant="outline">
                {dashboardSummary.avgHealthScore >= 80 ? (
                  <ArrowUpIcon className="h-3 w-3 text-green-600" />
                ) : (
                  <ArrowDownIcon className="h-3 w-3 text-red-600" />
                )}
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card variant="default" padding="md">
          <CardContent noPadding className="p-6">
            <div className="flex items-center">
              <CheckCircle2 className="h-4 w-4 text-gray-500" />
              <span className="ml-2 text-sm font-medium text-gray-600">
                Total Revenue
              </span>
            </div>
            <div className="text-2xl font-bold text-gray-900">
              {formatCurrency(dashboardSummary.totalRevenue)}
            </div>
          </CardContent>
        </Card>

        <Card variant="default" padding="md">
          <CardContent noPadding className="p-6">
            <div className="flex items-center">
              <AlertTriangle className="h-4 w-4 text-gray-500" />
              <span className="ml-2 text-sm font-medium text-gray-600">
                Critical Actions
              </span>
            </div>
            <div className="text-2xl font-bold text-red-600">
              {dashboardSummary.criticalInterventions}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <RiskLevelFilter
        filters={filters}
        onChange={handleFilterChange}
        riskDistribution={dashboardSummary.riskDistribution}
        disabled={isPending}
      />

      {/* Main Dashboard Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Health Trend Chart */}
        <Card variant="default" padding="none" className="lg:col-span-2">
          <CardHeader noPadding className="p-6">
            <CardTitle>Health Trends</CardTitle>
          </CardHeader>
          <CardContent noPadding className="p-6 pt-0">
            <HealthTrendChart
              suppliers={filteredSuppliers}
              dateRange={filters.dateRange}
              selectedSupplier={selectedSupplier}
              onSupplierSelect={setSelectedSupplier}
            />
          </CardContent>
        </Card>

        {/* Intervention Actions */}
        <Card variant="default" padding="none">
          <CardHeader noPadding className="p-6">
            <CardTitle>Required Actions</CardTitle>
          </CardHeader>
          <CardContent noPadding className="p-6 pt-0">
            <InterventionActions
              suppliers={filteredSuppliers}
              onActionExecuted={handleInterventionAction}
              loading={isLoading}
            />
          </CardContent>
        </Card>
      </div>

      {/* Supplier Health Grid */}
      <Card variant="default" padding="none">
        <CardHeader noPadding className="p-6">
          <CardTitle>Supplier Health Overview</CardTitle>
        </CardHeader>
        <CardContent noPadding className="p-6 pt-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-2 font-medium text-gray-900">
                    Supplier
                  </th>
                  <th className="text-left py-3 px-2 font-medium text-gray-900">
                    Category
                  </th>
                  <th className="text-left py-3 px-2 font-medium text-gray-900">
                    Health Score
                  </th>
                  <th className="text-left py-3 px-2 font-medium text-gray-900">
                    Risk Level
                  </th>
                  <th className="text-left py-3 px-2 font-medium text-gray-900">
                    Active Clients
                  </th>
                  <th className="text-left py-3 px-2 font-medium text-gray-900">
                    Revenue
                  </th>
                  <th className="text-left py-3 px-2 font-medium text-gray-900">
                    Last Activity
                  </th>
                  <th className="text-left py-3 px-2 font-medium text-gray-900">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredSuppliers.map((supplier) => (
                  <tr
                    key={supplier.supplier_id}
                    className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() =>
                      setSelectedSupplier(
                        selectedSupplier === supplier.supplier_id
                          ? null
                          : supplier.supplier_id,
                      )
                    }
                  >
                    <td className="py-3 px-2">
                      <div className="font-medium text-gray-900">
                        {supplier.supplier_name}
                      </div>
                      {supplier.supplier_business_name && (
                        <div className="text-sm text-gray-500">
                          {supplier.supplier_business_name}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-2">
                      <Badge variant="outline" className="capitalize">
                        {supplier.supplier_category}
                      </Badge>
                    </td>
                    <td className="py-3 px-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-medium">
                          {supplier.health_score}
                        </span>
                        <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className={`h-full transition-all duration-300 ${
                              supplier.health_score >= 80
                                ? 'bg-green-500'
                                : supplier.health_score >= 60
                                  ? 'bg-yellow-500'
                                  : 'bg-red-500'
                            }`}
                            style={{ width: `${supplier.health_score}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-2">
                      <Badge
                        variant={getRiskBadgeVariant(supplier.risk_level)}
                        className="uppercase"
                      >
                        {supplier.risk_level}
                      </Badge>
                    </td>
                    <td className="py-3 px-2 font-medium">
                      {supplier.active_clients}
                    </td>
                    <td className="py-3 px-2 font-medium">
                      {formatCurrency(supplier.revenue)}
                    </td>
                    <td className="py-3 px-2 text-gray-600">
                      {formatDate(supplier.last_activity)}
                    </td>
                    <td className="py-3 px-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedSupplier(supplier.supplier_id);
                        }}
                      >
                        View Details
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {filteredSuppliers.length === 0 && (
              <div className="text-center py-12">
                <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No suppliers found
                </h3>
                <p className="text-gray-500">
                  Try adjusting your filters to see more results.
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
});

// Utility function to map Supabase data to health metrics interface
function mapSupabaseToHealth(data: any): Partial<SupplierHealthMetrics> {
  return {
    health_score: data.health_score,
    risk_level: data.risk_level,
    last_activity: data.last_activity,
    active_clients: data.active_clients,
    revenue: data.revenue,
    client_satisfaction: data.client_satisfaction,
    avg_response_time: data.avg_response_time,
    trendsData: data.trends_data || [],
    interventionsNeeded: data.interventions_needed || [],
  };
}

export default CustomerHealthDashboard;
