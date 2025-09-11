'use client';

/**
 * CRM Integration Dashboard Component
 * WS-343 - Team A - Round 1
 *
 * Main dashboard interface for managing CRM integrations
 * Features: Overview cards, integration list, sync monitoring
 */

import { useState, useCallback, useEffect } from 'react';
import {
  Plus,
  RefreshCw,
  Settings,
  AlertCircle,
  CheckCircle,
  Clock,
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// UI Components (Untitled UI)
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';

// Types
import type {
  CRMIntegrationDashboardProps,
  CRMIntegration,
  CRMProvider,
  CRMSyncJob,
  ConnectionStatus,
} from '@/types/crm';

// Hooks and utilities
import { cn } from '@/lib/utils';
import { getCRMIntegrations, triggerCRMSync } from '@/lib/api/crm-integrations';
import { CRM_PROVIDERS, CONNECTION_STATUS_COLORS } from '@/types/crm';

// Child Components
import { CRMIntegrationCard } from './CRMIntegrationCard';
import { CRMProviderWizard } from './CRMProviderWizard';

export function CRMIntegrationDashboard({
  organizationId,
  className,
  onIntegrationCreated,
}: CRMIntegrationDashboardProps) {
  // State Management
  const [showWizard, setShowWizard] = useState(false);
  const [selectedIntegration, setSelectedIntegration] = useState<string | null>(
    null,
  );

  const queryClient = useQueryClient();

  // Data Fetching
  const {
    data: integrations = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['crm-integrations', organizationId],
    queryFn: () => getCRMIntegrations(organizationId),
    refetchInterval: 30000, // Refresh every 30 seconds
    staleTime: 10000,
  });

  // Mutations
  const syncMutation = useMutation({
    mutationFn: ({ integrationId }: { integrationId: string }) =>
      triggerCRMSync(integrationId, { job_type: 'incremental_sync' }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['crm-integrations', organizationId],
      });
    },
  });

  // Calculate dashboard statistics
  const stats = {
    total: integrations.length,
    connected: integrations.filter((i) => i.connection_status === 'connected')
      .length,
    syncing: integrations.filter(
      (i) => i.connection_status === 'sync_in_progress',
    ).length,
    errors: integrations.filter((i) => i.connection_status === 'error').length,
    lastSync: integrations
      .filter((i) => i.last_sync_at)
      .sort(
        (a, b) =>
          new Date(b.last_sync_at!).getTime() -
          new Date(a.last_sync_at!).getTime(),
      )[0]?.last_sync_at,
  };

  // Event Handlers
  const handleIntegrationCreated = useCallback(
    (integration: CRMIntegration) => {
      setShowWizard(false);
      queryClient.invalidateQueries({
        queryKey: ['crm-integrations', organizationId],
      });
      onIntegrationCreated?.(integration);
    },
    [organizationId, onIntegrationCreated, queryClient],
  );

  const handleSync = useCallback(
    (integrationId: string) => {
      syncMutation.mutate({ integrationId });
    },
    [syncMutation],
  );

  const handleConfigure = useCallback((integrationId: string) => {
    setSelectedIntegration(integrationId);
    // TODO: Open configuration modal/page
  }, []);

  const handleDisconnect = useCallback(async (integrationId: string) => {
    // TODO: Implement disconnect functionality
    console.log('Disconnect integration:', integrationId);
  }, []);

  const handleSyncAll = useCallback(() => {
    const activeIntegrations = integrations.filter(
      (i) => i.connection_status === 'connected',
    );
    activeIntegrations.forEach((integration) => {
      syncMutation.mutate({ integrationId: integration.id });
    });
  }, [integrations, syncMutation]);

  // Render Loading State
  if (isLoading) {
    return (
      <div className={cn('space-y-6 p-6', className)}>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <Skeleton className="h-4 w-16 mb-2" />
                <Skeleton className="h-8 w-8" />
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <Skeleton className="h-16 w-16 rounded-lg mb-4" />
                <Skeleton className="h-4 w-32 mb-2" />
                <Skeleton className="h-3 w-24" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  // Render Error State
  if (error) {
    return (
      <div className={cn('space-y-6 p-6', className)}>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Failed to load CRM integrations. Please check your connection and
            try again.
          </AlertDescription>
        </Alert>

        <div className="flex justify-center">
          <Button onClick={() => refetch()} variant="outline">
            <RefreshCw className="mr-2 h-4 w-4" />
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className={cn('space-y-6 p-6', className)}>
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">
              CRM Integrations
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Connect your existing CRM systems to import clients and sync data
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={isLoading}
            >
              <RefreshCw
                className={cn('mr-2 h-4 w-4', isLoading && 'animate-spin')}
              />
              Refresh
            </Button>

            <Button
              onClick={() => setShowWizard(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Integration
            </Button>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Total Integrations
                  </p>
                  <p className="text-2xl font-semibold">{stats.total}</p>
                </div>
                <Settings className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Connected
                  </p>
                  <p className="text-2xl font-semibold text-green-600">
                    {stats.connected}
                  </p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Syncing
                  </p>
                  <p className="text-2xl font-semibold text-blue-600">
                    {stats.syncing}
                  </p>
                </div>
                <RefreshCw className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Errors
                  </p>
                  <p className="text-2xl font-semibold text-red-600">
                    {stats.errors}
                  </p>
                </div>
                <AlertCircle className="h-8 w-8 text-red-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Last Sync Information */}
        {stats.lastSync && (
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>
                  Last sync: {new Date(stats.lastSync).toLocaleString()}
                </span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Bulk Actions */}
        {stats.connected > 1 && (
          <div className="flex justify-between items-center py-4 border-b">
            <div className="text-sm text-muted-foreground">
              {stats.connected} integration{stats.connected > 1 ? 's' : ''}{' '}
              available for sync
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleSyncAll}
              disabled={syncMutation.isPending}
            >
              <RefreshCw
                className={cn(
                  'mr-2 h-4 w-4',
                  syncMutation.isPending && 'animate-spin',
                )}
              />
              Sync All
            </Button>
          </div>
        )}

        {/* Integrations Grid */}
        {integrations.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
            {integrations.map((integration) => {
              const provider = CRM_PROVIDERS[integration.crm_provider];
              return (
                <CRMIntegrationCard
                  key={integration.id}
                  integration={integration}
                  provider={provider}
                  onConfigure={handleConfigure}
                  onSync={handleSync}
                  onDisconnect={handleDisconnect}
                />
              );
            })}
          </div>
        ) : (
          // Empty State
          <Card className="border-dashed border-2 border-gray-200">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <div className="rounded-full bg-blue-50 p-3 mb-4">
                <Settings className="h-8 w-8 text-blue-600" />
              </div>

              <h3 className="text-lg font-semibold mb-2">
                No integrations yet
              </h3>

              <p className="text-sm text-muted-foreground text-center max-w-md mb-6">
                Connect your first CRM system to start importing your existing
                clients and keep everything in sync automatically.
              </p>

              <Button
                onClick={() => setShowWizard(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Plus className="mr-2 h-4 w-4" />
                Connect Your First CRM
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Trust & Security Notice */}
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <CheckCircle className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="space-y-1">
                <p className="text-sm font-medium text-blue-900">
                  Your data is secure
                </p>
                <p className="text-xs text-blue-700">
                  All CRM connections use encrypted authentication. We never
                  store your passwords or API keys in plain text, and your
                  client data is protected with enterprise-grade security.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Integration Setup Wizard */}
      {showWizard && (
        <CRMProviderWizard
          organizationId={organizationId}
          onComplete={handleIntegrationCreated}
          onCancel={() => setShowWizard(false)}
        />
      )}
    </>
  );
}

// Status Badge Component
interface StatusBadgeProps {
  status: ConnectionStatus;
  className?: string;
}

function StatusBadge({ status, className }: StatusBadgeProps) {
  const statusConfig = {
    connected: { label: 'Connected', icon: CheckCircle },
    disconnected: { label: 'Disconnected', icon: AlertCircle },
    error: { label: 'Error', icon: AlertCircle },
    pending_auth: { label: 'Pending Auth', icon: Clock },
    sync_in_progress: { label: 'Syncing', icon: RefreshCw },
  };

  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <Badge
      variant="secondary"
      className={cn('text-xs', CONNECTION_STATUS_COLORS[status], className)}
    >
      <Icon
        className={cn(
          'mr-1 h-3 w-3',
          status === 'sync_in_progress' && 'animate-spin',
        )}
      />
      {config.label}
    </Badge>
  );
}
