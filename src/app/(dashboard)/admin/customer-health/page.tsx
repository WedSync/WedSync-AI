'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import CustomerHealthDashboard from '@/components/dashboard/CustomerHealthDashboard';
import { Card, CardContent, CardHeader } from '@/components/ui/card-untitled';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button-untitled';
import {
  TrendingUp,
  Users,
  AlertCircle,
  Activity,
  RefreshCw,
  Shield,
  CheckCircle2,
} from 'lucide-react';
import type {
  SupplierHealthMetrics,
  DashboardSummary,
  HealthDashboardFilters,
} from '@/types/supplier-health';

export default function CustomerHealthPage() {
  const [suppliers, setSuppliers] = useState<SupplierHealthMetrics[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [isAdmin, setIsAdmin] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const supabase = createClient();

  // Dashboard summary statistics
  const dashboardSummary = useMemo<DashboardSummary>(() => {
    if (!suppliers.length) {
      return {
        totalSuppliers: 0,
        avgHealthScore: 0,
        riskDistribution: { green: 0, yellow: 0, red: 0 },
        totalRevenue: 0,
        totalActiveClients: 0,
        avgClientSatisfaction: 0,
        criticalInterventions: 0,
        overdueInterventions: 0,
      };
    }

    const totalSuppliers = suppliers.length;
    const avgHealthScore =
      suppliers.reduce((sum, s) => sum + s.health_score, 0) / totalSuppliers;

    const riskDistribution = suppliers.reduce(
      (acc, supplier) => {
        acc[supplier.risk_level]++;
        return acc;
      },
      { green: 0, yellow: 0, red: 0 },
    );

    const totalRevenue = suppliers.reduce((sum, s) => sum + s.revenue, 0);
    const totalActiveClients = suppliers.reduce(
      (sum, s) => sum + s.active_clients,
      0,
    );
    const avgClientSatisfaction =
      suppliers.reduce((sum, s) => sum + s.client_satisfaction, 0) /
      totalSuppliers;

    const allInterventions = suppliers.flatMap((s) => s.interventionsNeeded);
    const criticalInterventions = allInterventions.filter(
      (i) => i.priority === 'critical',
    ).length;
    const overdueInterventions = allInterventions.filter(
      (i) => new Date(i.dueDate) < new Date() && i.status !== 'completed',
    ).length;

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
  }, [suppliers]);

  // Check admin permissions
  useEffect(() => {
    const checkAdminAccess = async () => {
      try {
        const { data: user } = await supabase.auth.getUser();
        if (!user) {
          setError('Authentication required');
          return;
        }

        // Check if user is admin (adjust this based on your auth system)
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('role, organization_id')
          .eq('id', user.id)
          .single();

        if (profile?.role !== 'admin' && profile?.role !== 'owner') {
          setError('Admin access required for customer health dashboard');
          return;
        }

        setIsAdmin(true);
        await loadSupplierHealthData();
      } catch (err) {
        console.error('Admin access check failed:', err);
        setError('Failed to verify admin access');
      }
    };

    checkAdminAccess();
  }, []);

  // Load supplier health data
  const loadSupplierHealthData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Mock data for now - replace with actual API call when database is ready
      const mockData: SupplierHealthMetrics[] = [
        {
          id: '1',
          supplier_id: 'sup_001',
          organization_id: 'org_001',
          supplier_name: 'Perfect Moments Photography',
          supplier_category: 'photographer',
          supplier_email: 'contact@perfectmoments.com',
          supplier_business_name: 'Perfect Moments Photography Ltd',
          health_score: 92,
          risk_level: 'green',
          last_activity: new Date(
            Date.now() - 2 * 24 * 60 * 60 * 1000,
          ).toISOString(),
          active_clients: 8,
          completed_projects: 45,
          avg_response_time: 2.5,
          client_satisfaction: 4.8,
          revenue: 85000,
          trendsData: [
            {
              date: '2024-01-01',
              healthScore: 88,
              activeClients: 6,
              revenue: 78000,
              clientSatisfaction: 4.6,
              avgResponseTime: 3.0,
            },
            {
              date: '2024-02-01',
              healthScore: 92,
              activeClients: 8,
              revenue: 85000,
              clientSatisfaction: 4.8,
              avgResponseTime: 2.5,
            },
          ],
          interventionsNeeded: [
            {
              id: 'int_001',
              type: 'follow_up',
              priority: 'low',
              description: 'Schedule quarterly business review',
              dueDate: new Date(
                Date.now() + 7 * 24 * 60 * 60 * 1000,
              ).toISOString(),
              status: 'pending',
              createdAt: new Date().toISOString(),
            },
          ],
          last_contact_date: new Date(
            Date.now() - 14 * 24 * 60 * 60 * 1000,
          ).toISOString(),
          notes: 'High performing supplier, excellent client feedback',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: '2',
          supplier_id: 'sup_002',
          organization_id: 'org_001',
          supplier_name: 'Elegant Events Planning',
          supplier_category: 'planner',
          supplier_email: 'hello@elegantevents.com',
          supplier_business_name: 'Elegant Events Ltd',
          health_score: 67,
          risk_level: 'yellow',
          last_activity: new Date(
            Date.now() - 5 * 24 * 60 * 60 * 1000,
          ).toISOString(),
          active_clients: 12,
          completed_projects: 28,
          avg_response_time: 8.5,
          client_satisfaction: 4.1,
          revenue: 120000,
          trendsData: [
            {
              date: '2024-01-01',
              healthScore: 75,
              activeClients: 10,
              revenue: 110000,
              clientSatisfaction: 4.3,
              avgResponseTime: 6.0,
            },
            {
              date: '2024-02-01',
              healthScore: 67,
              activeClients: 12,
              revenue: 120000,
              clientSatisfaction: 4.1,
              avgResponseTime: 8.5,
            },
          ],
          interventionsNeeded: [
            {
              id: 'int_002',
              type: 'support',
              priority: 'high',
              description:
                'Response time training needed - averaging 8.5 hours',
              dueDate: new Date(
                Date.now() + 3 * 24 * 60 * 60 * 1000,
              ).toISOString(),
              status: 'pending',
              createdAt: new Date().toISOString(),
            },
            {
              id: 'int_003',
              type: 'follow_up',
              priority: 'medium',
              description:
                'Client satisfaction declining - investigate recent projects',
              dueDate: new Date(
                Date.now() + 5 * 24 * 60 * 60 * 1000,
              ).toISOString(),
              status: 'pending',
              createdAt: new Date().toISOString(),
            },
          ],
          last_contact_date: new Date(
            Date.now() - 21 * 24 * 60 * 60 * 1000,
          ).toISOString(),
          notes: 'Response times increasing, may need additional support',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: '3',
          supplier_id: 'sup_003',
          organization_id: 'org_001',
          supplier_name: 'Fairytale Flowers',
          supplier_category: 'florist',
          supplier_email: 'orders@fairytaleflowers.com',
          supplier_business_name: 'Fairytale Flowers & Events',
          health_score: 34,
          risk_level: 'red',
          last_activity: new Date(
            Date.now() - 12 * 24 * 60 * 60 * 1000,
          ).toISOString(),
          active_clients: 3,
          completed_projects: 15,
          avg_response_time: 18.0,
          client_satisfaction: 3.2,
          revenue: 45000,
          trendsData: [
            {
              date: '2024-01-01',
              healthScore: 52,
              activeClients: 5,
              revenue: 55000,
              clientSatisfaction: 3.8,
              avgResponseTime: 12.0,
            },
            {
              date: '2024-02-01',
              healthScore: 34,
              activeClients: 3,
              revenue: 45000,
              clientSatisfaction: 3.2,
              avgResponseTime: 18.0,
            },
          ],
          interventionsNeeded: [
            {
              id: 'int_004',
              type: 'retention',
              priority: 'critical',
              description:
                'URGENT: Multiple client complaints, risk of losing supplier',
              dueDate: new Date(
                Date.now() + 1 * 24 * 60 * 60 * 1000,
              ).toISOString(),
              status: 'pending',
              createdAt: new Date().toISOString(),
            },
            {
              id: 'int_005',
              type: 'training',
              priority: 'critical',
              description: 'Customer service training required immediately',
              dueDate: new Date(
                Date.now() + 2 * 24 * 60 * 60 * 1000,
              ).toISOString(),
              status: 'pending',
              createdAt: new Date().toISOString(),
            },
          ],
          last_contact_date: new Date(
            Date.now() - 30 * 24 * 60 * 60 * 1000,
          ).toISOString(),
          notes:
            'CRITICAL: Multiple escalated complaints, immediate intervention required',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ];

      setSuppliers(mockData);
      setLastUpdated(new Date());

      // TODO: Replace with actual Supabase query when table is ready
      // const { data, error } = await supabase
      //   .from('supplier_health')
      //   .select(`
      //     *,
      //     suppliers!inner(name, category, email, business_name)
      //   `)
      //   .order('health_score', { ascending: false })

      // if (error) throw error
      // setSuppliers(data || [])
    } catch (err) {
      console.error('Failed to load supplier health data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  // Refresh data manually
  const handleRefresh = async () => {
    setRefreshing(true);
    await loadSupplierHealthData();
    setRefreshing(false);
  };

  // Handle intervention execution
  const handleInterventionExecuted = async (
    supplierId: string,
    intervention: any,
  ) => {
    try {
      // TODO: Implement actual intervention execution
      console.log('Executing intervention:', { supplierId, intervention });

      // Mock success for now
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Update local state to mark intervention as completed
      setSuppliers((prev) =>
        prev.map((supplier) => {
          if (supplier.supplier_id === supplierId) {
            return {
              ...supplier,
              interventionsNeeded: supplier.interventionsNeeded.map((i) =>
                i.id === intervention.id
                  ? {
                      ...i,
                      status: 'completed' as const,
                      completedAt: new Date().toISOString(),
                    }
                  : i,
              ),
            };
          }
          return supplier;
        }),
      );
    } catch (err) {
      console.error('Failed to execute intervention:', err);
      throw err;
    }
  };

  // Error state
  if (error && !isAdmin) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card
          variant="default"
          padding="lg"
          className="border-red-200 bg-red-50"
        >
          <CardContent noPadding className="p-6 text-center">
            <Shield className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-red-900 mb-2">
              Access Denied
            </h2>
            <p className="text-red-700 mb-4">{error}</p>
            <Link href="/dashboard">
              <Button variant="secondary">Return to Dashboard</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Loading state
  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-32 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
          <div className="h-96 bg-gray-200 rounded-lg"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Customer Success Dashboard
          </h1>
          <p className="text-gray-600">
            Monitor supplier health, track interventions, and ensure customer
            success
          </p>
          <div className="flex items-center gap-2 mt-2 text-sm text-gray-500">
            <Activity className="h-4 w-4" />
            <span>Last updated: {lastUpdated.toLocaleString()}</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Badge variant="secondary" className="bg-green-100 text-green-800">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Admin Access
          </Badge>
          <Button
            variant="secondary"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-2"
          >
            <RefreshCw
              className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`}
            />
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </Button>
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Total Suppliers */}
        <Card variant="default" padding="md">
          <CardContent noPadding className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Total Suppliers</p>
                <p className="text-2xl font-bold text-gray-900">
                  {dashboardSummary.totalSuppliers}
                </p>
              </div>
              <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Average Health Score */}
        <Card variant="default" padding="md">
          <CardContent noPadding className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Avg Health Score</p>
                <p className="text-2xl font-bold text-gray-900">
                  {dashboardSummary.avgHealthScore.toFixed(1)}
                </p>
              </div>
              <div className="h-12 w-12 bg-green-100 rounded-lg flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Critical Interventions */}
        <Card variant="default" padding="md">
          <CardContent noPadding className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Critical Actions</p>
                <p className="text-2xl font-bold text-red-600">
                  {dashboardSummary.criticalInterventions}
                </p>
              </div>
              <div className="h-12 w-12 bg-red-100 rounded-lg flex items-center justify-center">
                <AlertCircle className="h-6 w-6 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Revenue */}
        <Card variant="default" padding="md">
          <CardContent noPadding className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Total Revenue</p>
                <p className="text-2xl font-bold text-gray-900">
                  {new Intl.NumberFormat('en-GB', {
                    style: 'currency',
                    currency: 'GBP',
                    notation: 'compact',
                    maximumFractionDigits: 1,
                  }).format(dashboardSummary.totalRevenue)}
                </p>
              </div>
              <div className="h-12 w-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Risk Distribution Overview */}
      <Card variant="default" padding="md" className="mb-8">
        <CardHeader>
          <h3 className="text-lg font-semibold text-gray-900">
            Risk Level Distribution
          </h3>
        </CardHeader>
        <CardContent noPadding className="p-6 pt-0">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-green-500 rounded-full"></div>
              <span className="text-sm text-gray-600">
                Healthy:{' '}
                <span className="font-semibold">
                  {dashboardSummary.riskDistribution.green}
                </span>
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-yellow-500 rounded-full"></div>
              <span className="text-sm text-gray-600">
                At Risk:{' '}
                <span className="font-semibold">
                  {dashboardSummary.riskDistribution.yellow}
                </span>
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-red-500 rounded-full"></div>
              <span className="text-sm text-gray-600">
                Critical:{' '}
                <span className="font-semibold">
                  {dashboardSummary.riskDistribution.red}
                </span>
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Dashboard */}
      <CustomerHealthDashboard
        initialData={suppliers}
        onActionExecuted={handleInterventionExecuted}
      />

      {/* Footer */}
      <div className="mt-8 pt-6 border-t border-gray-200">
        <p className="text-xs text-gray-500 text-center">
          Customer Success Dashboard • Real-time supplier health monitoring •
          Last updated {lastUpdated.toLocaleString()}
        </p>
      </div>
    </div>
  );
}
