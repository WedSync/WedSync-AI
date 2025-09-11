'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  HeartIcon,
  CalendarIcon,
  UsersIcon,
  CameraIcon,
  CheckCircleIcon,
  ClockIcon,
  MapPinIcon,
  CurrencyDollarIcon,
} from '@heroicons/react/24/outline';
import DemoBanner from '@/components/demo/DemoBanner';
import { isDemoMode } from '@/lib/demo/config';
import { demoAuth } from '@/lib/demo/auth';

interface WeddingData {
  id: string;
  wedding_date: string;
  venue_name?: string;
  guest_count?: number;
  budget_total?: number;
  couple_names?: string;
}

interface VendorConnection {
  id: string;
  vendor_name: string;
  vendor_type: string;
  status: 'connected' | 'pending' | 'confirmed';
  last_update: string;
}

export default function ClientDashboard() {
  const [wedding, setWedding] = useState<WeddingData | null>(null);
  const [vendors, setVendors] = useState<VendorConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      let user = null;

      // Check demo mode first
      if (isDemoMode()) {
        const { data: { session } } = await demoAuth.getSession();
        if (session?.user) {
          user = session.user;
        }
      } else {
        // Use real Supabase auth
        const { data: { user: supabaseUser }, error: authError } = await supabase.auth.getUser();
        if (authError || !supabaseUser) {
          router.push('/auth/login?redirect=client');
          return;
        }
        user = supabaseUser;
      }

      if (!user) {
        router.push('/auth/login?redirect=client');
        return;
      }

      // Load wedding data
      let weddingData = null;

      if (isDemoMode()) {
        // Use demo wedding data
        weddingData = {
          id: 'demo-wedding-1',
          wedding_date: '2024-06-15',
          venue_name: 'The Old Barn',
          guest_count: 120,
          budget_total: 25000,
          couple_names: 'Sarah & Michael'
        };
      } else {
        const { data, error: weddingError } = await supabase
          .from('weddings')
          .select('*')
          .eq('couple_id', user.id)
          .single();

        if (weddingError && weddingError.code !== 'PGRST116') {
          throw weddingError;
        }

        weddingData = data;
      }

      setWedding(weddingData);

      // Load vendor connections (mock data for now)
      setVendors([
        {
          id: '1',
          vendor_name: 'Everlight Photography',
          vendor_type: 'photographer',
          status: 'confirmed',
          last_update: '2 hours ago'
        },
        {
          id: '2',
          vendor_name: 'Petal & Stem Florist',
          vendor_type: 'florist',
          status: 'connected',
          last_update: '1 day ago'
        },
        {
          id: '3',
          vendor_name: 'The Old Barn Venue',
          vendor_type: 'venue',
          status: 'pending',
          last_update: '3 days ago'
        }
      ]);

    } catch (error: any) {
      console.error('Error loading dashboard:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const getDaysUntilWedding = () => {
    if (!wedding?.wedding_date) return null;
    const weddingDate = new Date(wedding.wedding_date);
    const today = new Date();
    const diffTime = weddingDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'bg-green-100 text-green-800';
      case 'connected': return 'bg-blue-100 text-blue-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-pink-50 to-purple-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-pink-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading your wedding dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-pink-50 to-purple-50">
        <Card className="w-full max-w-md">
          <CardContent className="text-center p-6">
            <p className="text-red-600 mb-4">Error loading dashboard: {error}</p>
            <Button onClick={loadDashboardData}>Try Again</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const daysUntilWedding = getDaysUntilWedding();

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 to-purple-50">
      {isDemoMode() && <DemoBanner />}
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <HeartIcon className="h-8 w-8 text-pink-600" />
            <h1 className="text-3xl font-bold text-gray-900">
              {wedding?.couple_names || 'Your Wedding Dashboard'}
            </h1>
          </div>
          <p className="text-gray-600">Welcome to WedMe.app - Your wedding planning command center</p>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <CalendarIcon className="h-8 w-8 text-pink-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Days to Go</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {daysUntilWedding !== null ? daysUntilWedding : '--'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <UsersIcon className="h-8 w-8 text-blue-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Guests</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {wedding?.guest_count || '--'}
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
                  <p className="text-sm font-medium text-gray-600">Budget</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {wedding?.budget_total ? `$${wedding.budget_total.toLocaleString()}` : '--'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <CheckCircleIcon className="h-8 w-8 text-purple-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Vendors</p>
                  <p className="text-2xl font-bold text-gray-900">{vendors.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Vendor Connections */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CameraIcon className="h-5 w-5" />
                  Your Wedding Vendors
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {vendors.map((vendor) => (
                    <div key={vendor.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-pink-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold">
                          {vendor.vendor_name.charAt(0)}
                        </div>
                        <div>
                          <h3 className="font-medium text-gray-900">{vendor.vendor_name}</h3>
                          <p className="text-sm text-gray-600 capitalize">{vendor.vendor_type}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge className={getStatusColor(vendor.status)}>
                          {vendor.status}
                        </Badge>
                        <Button size="sm" variant="outline">
                          View
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-6">
                  <Button className="w-full">
                    <UsersIcon className="h-4 w-4 mr-2" />
                    Invite New Vendor
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Wedding Details */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPinIcon className="h-5 w-5" />
                  Wedding Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-sm text-gray-600">Date</p>
                  <p className="font-medium">
                    {wedding?.wedding_date 
                      ? new Date(wedding.wedding_date).toLocaleDateString('en-US', {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })
                      : 'Not set'
                    }
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Venue</p>
                  <p className="font-medium">{wedding?.venue_name || 'Not selected'}</p>
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ClockIcon className="h-5 w-5" />
                  Quick Actions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button className="w-full" variant="outline">
                  View Timeline
                </Button>
                <Button className="w-full" variant="outline">
                  Manage Guest List
                </Button>
                <Button className="w-full" variant="outline">
                  Budget Tracker
                </Button>
                <Button className="w-full" variant="outline">
                  Wedding Website
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
