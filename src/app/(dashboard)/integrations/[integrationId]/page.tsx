import { Metadata } from 'next';
import { Suspense } from 'react';
import { notFound } from 'next/navigation';

// Components
import { SyncStatusMonitor } from '@/components/integrations/SyncStatusMonitor';
import { DashboardShell } from '@/components/ui/dashboard-shell';
import { DashboardHeader } from '@/components/ui/dashboard-header';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Settings, RefreshCw, AlertTriangle } from 'lucide-react';

// Utils and Types
import { getCurrentUser } from '@/lib/auth';
import { getCRMIntegration } from '@/lib/api/crm-integrations';
import { redirect } from 'next/navigation';
import type { CRMIntegration } from '@/types/crm';

interface PageProps {
  params: {
    integrationId: string;
  };
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const integration = await getCRMIntegration(params.integrationId);

  return {
    title: `${integration?.connection_name || 'Integration'} | WedSync Integrations`,
    description: `Manage and monitor your ${integration?.crm_provider} CRM integration`,
  };
}

export default async function IntegrationDetailPage({ params }: PageProps) {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login');
  }

  const integration = await getCRMIntegration(params.integrationId);

  if (!integration || integration.organization_id !== user.organization_id) {
    notFound();
  }

  return (
    <DashboardShell>
      <DashboardHeader
        heading={integration.connection_name}
        text={`Manage your ${integration.crm_provider} CRM integration`}
      >
        <IntegrationActions integration={integration} />
      </DashboardHeader>

      <div className="max-w-7xl mx-auto">
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="sync">Sync Monitor</TabsTrigger>
            <TabsTrigger value="mapping">Field Mapping</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <Suspense fallback={<OverviewSkeleton />}>
              <IntegrationOverview integration={integration} />
            </Suspense>
          </TabsContent>

          <TabsContent value="sync" className="space-y-6">
            <Suspense fallback={<SyncMonitorSkeleton />}>
              <SyncStatusMonitor
                integrationId={integration.id}
                autoRefresh={true}
                refreshInterval={5000}
              />
            </Suspense>
          </TabsContent>

          <TabsContent value="mapping" className="space-y-6">
            <div className="text-center py-12">
              <Settings className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">
                Field Mapping Configuration
              </h3>
              <p className="text-muted-foreground mb-4">
                Configure how your CRM fields map to WedSync fields
              </p>
              <Button>Configure Mapping</Button>
            </div>
          </TabsContent>

          <TabsContent value="settings" className="space-y-6">
            <div className="text-center py-12">
              <Settings className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">
                Integration Settings
              </h3>
              <p className="text-muted-foreground mb-4">
                Manage connection settings, sync frequency, and data preferences
              </p>
              <Button>Open Settings</Button>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardShell>
  );
}

// Integration Actions Component
interface IntegrationActionsProps {
  integration: CRMIntegration;
}

function IntegrationActions({ integration }: IntegrationActionsProps) {
  return (
    <div className="flex items-center gap-2">
      <Button variant="outline" size="sm">
        <RefreshCw className="mr-2 h-4 w-4" />
        Sync Now
      </Button>
      <Button variant="outline" size="sm">
        <Settings className="mr-2 h-4 w-4" />
        Configure
      </Button>
    </div>
  );
}

// Integration Overview Component
interface IntegrationOverviewProps {
  integration: CRMIntegration;
}

async function IntegrationOverview({ integration }: IntegrationOverviewProps) {
  // This would fetch additional integration stats and details
  // For now, showing the structure with mock data

  const connectionStatus = integration.connection_status;
  const lastSync = integration.last_sync_at
    ? new Date(integration.last_sync_at)
    : null;

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {/* Connection Status */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Connection Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <Badge
              variant={
                connectionStatus === 'connected' ? 'default' : 'destructive'
              }
              className="capitalize"
            >
              {connectionStatus.replace('_', ' ')}
            </Badge>
            {connectionStatus === 'error' && (
              <AlertTriangle className="h-4 w-4 text-destructive" />
            )}
          </div>
          {lastSync && (
            <p className="text-sm text-muted-foreground mt-2">
              Last synced: {lastSync.toLocaleString()}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Sync Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Sync Settings</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Frequency:</span>
              <span>
                {integration.sync_config.auto_sync_enabled
                  ? `Every ${integration.sync_config.sync_interval_minutes} min`
                  : 'Manual only'}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Direction:</span>
              <span className="capitalize">
                {integration.sync_config.sync_direction.replace('_', ' ')}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Error Information */}
      {integration.sync_error_details && (
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="text-base text-destructive">
              Recent Error
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              {integration.sync_error_details.message ||
                'An error occurred during sync'}
            </p>
            <Button variant="outline" size="sm" className="mt-2">
              View Details
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Loading Skeletons
function OverviewSkeleton() {
  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <Card key={i}>
          <CardHeader>
            <div className="h-4 w-32 bg-muted rounded animate-pulse" />
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="h-6 w-20 bg-muted rounded animate-pulse" />
              <div className="h-3 w-40 bg-muted rounded animate-pulse" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function SyncMonitorSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="h-8 w-48 bg-muted rounded animate-pulse" />
        <div className="h-8 w-24 bg-muted rounded animate-pulse" />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-20 bg-muted rounded animate-pulse" />
        ))}
      </div>

      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-16 bg-muted rounded animate-pulse" />
        ))}
      </div>
    </div>
  );
}
