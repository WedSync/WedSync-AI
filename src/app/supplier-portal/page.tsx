'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  CalendarIcon,
  UsersIcon,
  CameraIcon,
  ClockIcon,
} from '@heroicons/react/20/solid';

export default function SupplierPortalDashboard() {
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setRefreshing(false);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile-First Layout */}
      <div className="max-w-md mx-auto bg-white min-h-screen">
        {/* Header */}
        <div className="bg-white border-b p-4">
          <h1 className="text-xl font-semibold text-gray-900">
            Supplier Portal
          </h1>
          <p className="text-sm text-gray-600">Wedding vendor dashboard</p>
        </div>

        {/* Status Summary */}
        <div className="p-4 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <CalendarIcon className="h-5 w-5 text-blue-600" />
                  <div>
                    <p className="text-sm font-medium">Today</p>
                    <p className="text-2xl font-bold">3</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <UsersIcon className="h-5 w-5 text-green-600" />
                  <div>
                    <p className="text-sm font-medium">Clients</p>
                    <p className="text-2xl font-bold">12</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button className="w-full" variant="outline">
                <CameraIcon className="h-4 w-4 mr-2" />
                Upload Photos
              </Button>
              <Button className="w-full" variant="outline">
                <ClockIcon className="h-4 w-4 mr-2" />
                Update Schedule
              </Button>
              <Button
                className="w-full"
                onClick={handleRefresh}
                disabled={refreshing}
              >
                {refreshing ? 'Refreshing...' : 'Refresh Data'}
              </Button>
            </CardContent>
          </Card>

          {/* Today's Events */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Today's Events</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
                  <div>
                    <p className="font-medium">Smith Wedding</p>
                    <p className="text-sm text-gray-600">2:00 PM - 6:00 PM</p>
                  </div>
                  <Button size="sm" variant="outline">
                    View
                  </Button>
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
                  <div>
                    <p className="font-medium">Johnson Engagement</p>
                    <p className="text-sm text-gray-600">7:00 PM - 9:00 PM</p>
                  </div>
                  <Button size="sm" variant="outline">
                    View
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
