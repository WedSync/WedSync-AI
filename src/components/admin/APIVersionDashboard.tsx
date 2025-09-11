// src/components/admin/APIVersionDashboard.tsx
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  Clock,
  Users,
  Activity,
  BarChart3,
} from 'lucide-react';

import {
  APIVersionData,
  APIVersionInfo,
  VersionUsageAnalytics,
  MigrationProgressSummary,
  DeprecationSchedule,
  ClientBreakdownData,
  SeasonImpactAnalysis,
} from '@/types/api-versions';

export default function APIVersionDashboard() {
  const [data, setData] = useState<APIVersionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedVersion, setSelectedVersion] = useState<string | null>(null);
  const [migrationView, setMigrationView] = useState<'overview' | 'detailed'>(
    'overview',
  );

  useEffect(() => {
    fetchAPIVersionData();

    // Refresh data every 5 minutes
    const interval = setInterval(fetchAPIVersionData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const fetchAPIVersionData = async () => {
    try {
      const response = await fetch('/api/admin/versions/status');
      const result = await response.json();
      setData(result.data);
    } catch (error) {
      console.error('Failed to fetch API version data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="p-6">Loading API version data...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            API Version Management
          </h1>
          <p className="text-muted-foreground mt-2">
            Enterprise API versioning for wedding supplier ecosystem
          </p>
        </div>
        <Button onClick={fetchAPIVersionData}>Refresh Data</Button>
      </div>

      {/* Critical Alerts */}
      {data?.versions.some(
        (v) => v.status === 'deprecated' && v.active_clients > 100,
      ) && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>Critical:</strong> Deprecated API versions still have
            significant usage. Active migration support needed for{' '}
            {data.versions.filter((v) => v.status === 'deprecated').length}{' '}
            versions.
          </AlertDescription>
        </Alert>
      )}

      {/* Version Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {data?.versions.map((version) => (
          <Card
            key={version.version}
            className="cursor-pointer hover:shadow-lg transition-shadow"
          >
            <CardHeader className="pb-2">
              <div className="flex justify-between items-center">
                <CardTitle className="text-lg">{version.version}</CardTitle>
                <Badge variant={getStatusVariant(version.status)}>
                  {version.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Active Clients</span>
                  <span className="font-medium">
                    {version.active_clients.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    Monthly Requests
                  </span>
                  <span className="font-medium">
                    {(version.monthly_requests / 1000000).toFixed(1)}M
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    Wedding Features
                  </span>
                  <span className="font-medium">
                    {version.wedding_features.length}
                  </span>
                </div>

                {version.deprecation_date && (
                  <div className="flex items-center gap-2 text-sm text-orange-600">
                    <Clock className="h-3 w-3" />
                    <span>
                      Deprecated:{' '}
                      {new Date(version.deprecation_date).toLocaleDateString()}
                    </span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="usage" className="space-y-4">
        <TabsList>
          <TabsTrigger value="usage">Usage Analytics</TabsTrigger>
          <TabsTrigger value="migrations">Migration Progress</TabsTrigger>
          <TabsTrigger value="compatibility">Compatibility Matrix</TabsTrigger>
          <TabsTrigger value="notifications">Deprecation Notices</TabsTrigger>
        </TabsList>

        <TabsContent value="usage">
          <UsageAnalyticsView analytics={data?.usage_analytics || []} />
        </TabsContent>

        <TabsContent value="migrations">
          <MigrationProgressView progress={data?.migration_progress} />
        </TabsContent>

        <TabsContent value="compatibility">
          <CompatibilityMatrixView versions={data?.versions || []} />
        </TabsContent>

        <TabsContent value="notifications">
          <DeprecationNotificationsView
            schedule={data?.deprecation_schedule || []}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Helper function for status variants
const getStatusVariant = (status: string) => {
  switch (status) {
    case 'stable':
      return 'default';
    case 'beta':
      return 'secondary';
    case 'deprecated':
      return 'destructive';
    case 'sunset':
      return 'outline';
    default:
      return 'secondary';
  }
};

// Usage Analytics Component
function UsageAnalyticsView({
  analytics,
}: {
  analytics: VersionUsageAnalytics[];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>API Usage Analytics</CardTitle>
        <p className="text-sm text-muted-foreground">
          Wedding supplier API usage patterns
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {analytics.map((analytic, index) => (
            <div
              key={index}
              className="flex justify-between items-center p-3 border rounded"
            >
              <div>
                <span className="font-medium">{analytic.version}</span>
                <p className="text-sm text-muted-foreground">
                  {analytic.unique_clients} clients,{' '}
                  {analytic.total_requests.toLocaleString()} requests
                </p>
              </div>
              <TrendingUp className="h-4 w-4 text-green-500" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function MigrationProgressView({
  progress,
}: {
  progress: MigrationProgressSummary | undefined;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Migration Progress</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="grid grid-cols-4 gap-4">
            <div className="text-center p-3 bg-blue-50 rounded">
              <p className="text-2xl font-bold text-blue-900">
                {progress?.total_migrations || 0}
              </p>
              <p className="text-sm text-blue-700">Total</p>
            </div>
            <div className="text-center p-3 bg-green-50 rounded">
              <p className="text-2xl font-bold text-green-900">
                {progress?.completed_migrations || 0}
              </p>
              <p className="text-sm text-green-700">Completed</p>
            </div>
            <div className="text-center p-3 bg-orange-50 rounded">
              <p className="text-2xl font-bold text-orange-900">
                {progress?.in_progress_migrations || 0}
              </p>
              <p className="text-sm text-orange-700">In Progress</p>
            </div>
            <div className="text-center p-3 bg-red-50 rounded">
              <p className="text-2xl font-bold text-red-900">
                {progress?.failed_migrations || 0}
              </p>
              <p className="text-sm text-red-700">Failed</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function CompatibilityMatrixView({ versions }: { versions: APIVersionInfo[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Version Compatibility Matrix</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="border p-2 text-left">From/To</th>
                {versions.map((v) => (
                  <th key={v.version} className="border p-2">
                    {v.version}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {versions.map((fromVersion) => (
                <tr key={fromVersion.version}>
                  <td className="border p-2 font-medium">
                    {fromVersion.version}
                  </td>
                  {versions.map((toVersion) => (
                    <td
                      key={toVersion.version}
                      className="border p-2 text-center"
                    >
                      {fromVersion.version === toVersion.version ? (
                        <span className="text-gray-400">-</span>
                      ) : (
                        <Badge variant="secondary" className="text-xs">
                          Compatible
                        </Badge>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

function DeprecationNotificationsView({
  schedule,
}: {
  schedule: DeprecationSchedule[];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Deprecation Schedule</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {schedule.map((item, index) => (
            <div
              key={index}
              className="flex justify-between items-center p-3 border rounded"
            >
              <div>
                <span className="font-medium">{item.version}</span>
                <p className="text-sm text-muted-foreground">
                  {item.description}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium">{item.sunset_date}</p>
                <Badge variant="outline">{item.affected_clients} clients</Badge>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
