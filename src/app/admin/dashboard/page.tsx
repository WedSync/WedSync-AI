'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  CogIcon,
  UsersIcon,
  ChartBarIcon,
  ExclamationTriangleIcon,
  ServerIcon,
  CurrencyDollarIcon,
  BuildingOfficeIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';
import DemoBanner from '@/components/demo/DemoBanner';
import { isDemoMode } from '@/lib/demo/config';
import { demoAuth } from '@/lib/demo/auth';

interface AdminStats {
  totalUsers: number;
  totalSuppliers: number;
  totalCouples: number;
  monthlyRevenue: number;
  activeWeddings: number;
  systemHealth: 'healthy' | 'warning' | 'critical';
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<AdminStats>({
    totalUsers: 0,
    totalSuppliers: 0,
    totalCouples: 0,
    monthlyRevenue: 0,
    activeWeddings: 0,
    systemHealth: 'healthy'
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    loadAdminData();
  }, []);

  const loadAdminData = async () => {
    try {
      let user = null;
      let userRole = null;

      // Check demo mode first
      if (isDemoMode()) {
        const { data: { session } } = await demoAuth.getSession();
        if (session?.user) {
          user = session.user;
          userRole = session.user.user_metadata?.role || session.user.user_metadata?.type;
        }
      } else {
        // Use real Supabase auth
        const { data: { user: supabaseUser }, error: authError } = await supabase.auth.getUser();
        if (authError || !supabaseUser) {
          router.push('/auth/login?redirect=admin');
          return;
        }
        user = supabaseUser;

        // Check if user has admin role
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('role')
          .eq('id', user.id)
          .single();

        userRole = profile?.role;
      }

      if (!user) {
        router.push('/auth/login?redirect=admin');
        return;
      }

      // Check admin permissions
      if (!['admin', 'super_admin'].includes(userRole)) {
        // Redirect non-admin users to their appropriate dashboard
        router.push('/dashboard');
        return;
      }

      // Load admin statistics (mock data for now)
      setStats({
        totalUsers: 2847,
        totalSuppliers: 156,
        totalCouples: 423,
        monthlyRevenue: 48500,
        activeWeddings: 89,
        systemHealth: 'healthy'
      });

    } catch (error: any) {
      console.error('Error loading admin dashboard:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const getHealthColor = (health: string) => {
    switch (health) {
      case 'healthy': return 'bg-green-100 text-green-800';
      case 'warning': return 'bg-yellow-100 text-yellow-800';
      case 'critical': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getHealthIcon = (health: string) => {
    switch (health) {
      case 'healthy': return <ServerIcon className="h-5 w-5 text-green-600" />;
      case 'warning': return <ExclamationTriangleIcon className="h-5 w-5 text-yellow-600" />;
      case 'critical': return <ExclamationTriangleIcon className="h-5 w-5 text-red-600" />;
      default: return <ServerIcon className="h-5 w-5 text-gray-600" />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading admin dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50">
        <Card className="w-full max-w-md">
          <CardContent className="text-center p-6">
            <p className="text-red-600 mb-4">Error loading dashboard: {error}</p>
            <Button onClick={loadAdminData}>Try Again</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50">
      {isDemoMode() && <DemoBanner />}
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <CogIcon className="h-8 w-8 text-blue-600" />
            <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
          </div>
          <p className="text-gray-600">WedSync Platform Administration</p>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <UsersIcon className="h-8 w-8 text-blue-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Users</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {stats.totalUsers.toLocaleString()}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <BuildingOfficeIcon className="h-8 w-8 text-purple-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Suppliers</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {stats.totalSuppliers}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <CurrencyDollarIcon className="h-8 w-8 text-green-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Monthly Revenue</p>
                  <p className="text-2xl font-bold text-gray-900">
                    ${stats.monthlyRevenue.toLocaleString()}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <ChartBarIcon className="h-8 w-8 text-indigo-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Active Weddings</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {stats.activeWeddings}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* System Health */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ServerIcon className="h-5 w-5" />
                  System Health & Monitoring
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      {getHealthIcon(stats.systemHealth)}
                      <div>
                        <h3 className="font-medium text-gray-900">Platform Status</h3>
                        <p className="text-sm text-gray-600">All systems operational</p>
                      </div>
                    </div>
                    <Badge className={getHealthColor(stats.systemHealth)}>
                      {stats.systemHealth}
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <ServerIcon className="h-5 w-5 text-green-600" />
                      <div>
                        <h3 className="font-medium text-gray-900">Database</h3>
                        <p className="text-sm text-gray-600">Response time: 45ms</p>
                      </div>
                    </div>
                    <Badge className="bg-green-100 text-green-800">
                      Healthy
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <ChartBarIcon className="h-5 w-5 text-blue-600" />
                      <div>
                        <h3 className="font-medium text-gray-900">API Performance</h3>
                        <p className="text-sm text-gray-600">99.9% uptime this month</p>
                      </div>
                    </div>
                    <Badge className="bg-green-100 text-green-800">
                      Excellent
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ClockIcon className="h-5 w-5" />
                  Quick Actions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button className="w-full" variant="outline">
                  User Management
                </Button>
                <Button className="w-full" variant="outline">
                  System Settings
                </Button>
                <Button className="w-full" variant="outline">
                  Analytics Reports
                </Button>
                <Button className="w-full" variant="outline">
                  Backup & Recovery
                </Button>
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span>New supplier registered</span>
                    <span className="text-gray-500">2 min ago</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>System backup completed</span>
                    <span className="text-gray-500">1 hour ago</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Payment processed</span>
                    <span className="text-gray-500">3 hours ago</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
