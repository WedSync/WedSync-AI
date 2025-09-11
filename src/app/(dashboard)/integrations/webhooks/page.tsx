// WS-201 Team A - Webhook Dashboard Page
// Integration with supplier dashboard navigation
// Location: /wedsync/src/app/(dashboard)/integrations/webhooks/page.tsx

import { Suspense } from 'react';
import { WebhookDashboard } from '@/components/webhooks/WebhookDashboard';
import { Card, CardContent } from '@/components/ui/card';
import { Webhook, RefreshCw } from 'lucide-react';

// Loading component for webhook dashboard
function WebhookDashboardSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header skeleton */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
        <div>
          <div className="flex items-center space-x-3">
            <div className="h-8 w-8 bg-gray-200 rounded animate-pulse" />
            <div className="h-8 w-48 bg-gray-200 rounded animate-pulse" />
          </div>
          <div className="h-4 w-96 bg-gray-200 rounded mt-2 animate-pulse" />
        </div>
        <div className="flex items-center space-x-3">
          <div className="h-9 w-20 bg-gray-200 rounded animate-pulse" />
          <div className="h-9 w-32 bg-gray-200 rounded animate-pulse" />
        </div>
      </div>

      {/* Stats cards skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <div className="h-4 w-24 bg-gray-200 rounded animate-pulse" />
                  <div className="h-8 w-16 bg-gray-200 rounded animate-pulse" />
                </div>
                <div className="h-12 w-12 bg-gray-200 rounded-lg animate-pulse" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main content skeleton */}
      <Card>
        <CardContent className="p-6">
          <div className="space-y-4">
            <div className="h-6 w-48 bg-gray-200 rounded animate-pulse" />
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={i}
                  className="h-16 bg-gray-200 rounded animate-pulse"
                />
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Error boundary component
function WebhookDashboardError() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center">
            <Webhook className="mr-3 h-8 w-8 text-primary-600" />
            Webhook Dashboard
          </h1>
          <p className="text-gray-600 mt-1">
            Manage real-time integrations with your photography CRM and booking
            systems
          </p>
        </div>
      </div>

      <Card className="border-red-200 bg-red-50">
        <CardContent className="p-6 text-center">
          <div className="text-red-600 mb-4">
            <RefreshCw className="h-12 w-12 mx-auto mb-2" />
            <h3 className="text-lg font-semibold">
              Unable to Load Webhook Dashboard
            </h3>
          </div>
          <p className="text-red-700 mb-4">
            There was an error loading the webhook dashboard. This might be due
            to a network issue or server problem.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="inline-flex items-center px-4 py-2 border border-red-300 shadow-sm text-sm font-medium rounded-md text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Reload Page
          </button>
        </CardContent>
      </Card>
    </div>
  );
}

// Main page component
export default function WebhookDashboardPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <Suspense fallback={<WebhookDashboardSkeleton />}>
        <WebhookDashboard />
      </Suspense>
    </div>
  );
}

// Metadata for the page
export const metadata = {
  title: 'Webhook Dashboard | WedSync',
  description:
    'Manage real-time webhook integrations with your photography CRM and booking systems',
  keywords: [
    'webhooks',
    'integrations',
    'CRM',
    'wedding photography',
    'real-time notifications',
  ],
};
