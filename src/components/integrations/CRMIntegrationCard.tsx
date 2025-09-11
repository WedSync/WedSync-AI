'use client';

/**
 * CRM Integration Card Component
 * WS-343 - Team A - Round 1
 *
 * Individual CRM integration display card with status and actions
 * Features: Provider branding, status indicators, action buttons
 */

import { useState } from 'react';
import {
  MoreVertical,
  RefreshCw,
  Settings,
  Unplug,
  CheckCircle,
  AlertCircle,
  Clock,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

// UI Components (Untitled UI)
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Progress } from '@/components/ui/progress';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

// Types
import type {
  CRMIntegrationCardProps,
  ConnectionStatus,
  SyncJobStatus,
  LastSyncStatus,
} from '@/types/crm';

// Utils
import { cn } from '@/lib/utils';
import {
  CONNECTION_STATUS_COLORS,
  SYNC_STATUS_COLORS,
  CRM_PROVIDER_DISPLAY_NAMES,
} from '@/types/crm';

export function CRMIntegrationCard({
  integration,
  provider,
  currentJob,
  onConfigure,
  onSync,
  onDisconnect,
  className,
}: CRMIntegrationCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Status Configuration
  const statusConfig = {
    connected: {
      icon: CheckCircle,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200',
    },
    disconnected: {
      icon: WifiOff,
      color: 'text-gray-500',
      bgColor: 'bg-gray-50',
      borderColor: 'border-gray-200',
    },
    error: {
      icon: AlertCircle,
      color: 'text-red-600',
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200',
    },
    pending_auth: {
      icon: Clock,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50',
      borderColor: 'border-yellow-200',
    },
    sync_in_progress: {
      icon: RefreshCw,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
    },
  };

  const config = statusConfig[integration.connection_status];
  const StatusIcon = config.icon;

  // Format last sync time
  const formatLastSync = (timestamp: string | null) => {
    if (!timestamp) return 'Never';
    try {
      return formatDistanceToNow(new Date(timestamp), { addSuffix: true });
    } catch {
      return 'Unknown';
    }
  };

  // Get sync progress
  const getSyncProgress = () => {
    if (currentJob && currentJob.job_status === 'running') {
      return currentJob.progress_percent || 0;
    }
    return null;
  };

  const syncProgress = getSyncProgress();

  // Handle action clicks
  const handleSync = () => {
    if (integration.connection_status === 'connected' && !currentJob) {
      onSync(integration.id);
    }
  };

  const handleConfigure = () => {
    onConfigure(integration.id);
  };

  const handleDisconnect = () => {
    onDisconnect(integration.id);
  };

  return (
    <Card
      className={cn(
        'transition-all duration-200 hover:shadow-md',
        config.borderColor,
        className,
      )}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          {/* Provider Info */}
          <div className="flex items-center space-x-3">
            <Avatar className="h-12 w-12 rounded-lg">
              <AvatarImage
                src={provider.logo_url}
                alt={`${provider.name} logo`}
                className="object-contain"
              />
              <AvatarFallback className="rounded-lg text-sm font-medium">
                {provider.name.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-sm truncate">
                {integration.connection_name ||
                  CRM_PROVIDER_DISPLAY_NAMES[integration.crm_provider]}
              </h3>

              <div className="flex items-center gap-2 mt-1">
                <Badge
                  variant="secondary"
                  className={cn(
                    'text-xs px-2 py-1',
                    CONNECTION_STATUS_COLORS[integration.connection_status],
                  )}
                >
                  <StatusIcon
                    className={cn(
                      'mr-1 h-3 w-3',
                      integration.connection_status === 'sync_in_progress' &&
                        'animate-spin',
                    )}
                  />
                  {integration.connection_status.replace('_', ' ')}
                </Badge>

                {provider.real_time_sync &&
                  integration.connection_status === 'connected' && (
                    <Tooltip>
                      <TooltipTrigger>
                        <Wifi className="h-3 w-3 text-green-500" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Real-time sync enabled</p>
                      </TooltipContent>
                    </Tooltip>
                  )}
              </div>
            </div>
          </div>

          {/* Actions Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={handleConfigure}>
                <Settings className="mr-2 h-4 w-4" />
                Configure
              </DropdownMenuItem>

              {integration.connection_status === 'connected' && !currentJob && (
                <DropdownMenuItem onClick={handleSync}>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Sync Now
                </DropdownMenuItem>
              )}

              <DropdownMenuSeparator />

              <DropdownMenuItem
                onClick={handleDisconnect}
                className="text-red-600 focus:text-red-600"
              >
                <Unplug className="mr-2 h-4 w-4" />
                Disconnect
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>

      <CardContent className="pt-0 space-y-4">
        {/* Sync Progress */}
        {syncProgress !== null && (
          <div className="space-y-2">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Syncing...</span>
              <span>{Math.round(syncProgress)}%</span>
            </div>
            <Progress value={syncProgress} className="h-2" />
            {currentJob && (
              <div className="text-xs text-muted-foreground">
                {currentJob.records_processed} of{' '}
                {currentJob.records_total || '?'} records processed
              </div>
            )}
          </div>
        )}

        {/* Integration Stats */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground">Last Sync</p>
            <p className="font-medium">
              {formatLastSync(integration.last_sync_at)}
            </p>
            {integration.last_sync_status && (
              <div className="flex items-center gap-1 mt-1">
                <div
                  className={cn(
                    'h-2 w-2 rounded-full',
                    integration.last_sync_status === 'success'
                      ? 'bg-green-500'
                      : integration.last_sync_status === 'partial'
                        ? 'bg-yellow-500'
                        : 'bg-red-500',
                  )}
                />
                <span className="text-xs text-muted-foreground capitalize">
                  {integration.last_sync_status}
                </span>
              </div>
            )}
          </div>

          <div>
            <p className="text-muted-foreground">Sync Frequency</p>
            <p className="font-medium">
              {integration.sync_config.auto_sync_enabled
                ? `Every ${integration.sync_config.sync_interval_minutes} min`
                : 'Manual only'}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {integration.sync_config.sync_direction.replace('_', ' ')}
            </p>
          </div>
        </div>

        {/* Error Details */}
        {integration.connection_status === 'error' &&
          integration.sync_error_details && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-800 font-medium">
                Connection Error
              </p>
              <p className="text-xs text-red-700 mt-1">
                {integration.sync_error_details.message ||
                  'An error occurred during sync'}
              </p>
              <Button
                size="sm"
                variant="outline"
                className="mt-2 text-red-700 border-red-300 hover:bg-red-100"
                onClick={handleSync}
              >
                Retry Connection
              </Button>
            </div>
          )}

        {/* Provider Features */}
        {isExpanded && (
          <div className="pt-2 border-t space-y-3">
            <div>
              <p className="text-sm font-medium mb-2">Supported Features</p>
              <div className="flex flex-wrap gap-1">
                {provider.supported_features.map((feature) => (
                  <Badge key={feature} variant="outline" className="text-xs">
                    {feature}
                  </Badge>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <p className="text-muted-foreground">Rate Limit</p>
                <p>{provider.rate_limits.requests_per_minute}/min</p>
              </div>
              <div>
                <p className="text-muted-foreground">Auth Type</p>
                <p className="capitalize">
                  {provider.auth_type.replace('_', ' ')}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Expand/Collapse Button */}
        <Button
          variant="ghost"
          size="sm"
          className="w-full h-8 text-xs"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          {isExpanded ? 'Show Less' : 'Show More'}
        </Button>

        {/* Action Buttons */}
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            className="flex-1"
            onClick={handleConfigure}
          >
            <Settings className="mr-1 h-3 w-3" />
            Configure
          </Button>

          {integration.connection_status === 'connected' && (
            <Button
              size="sm"
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
              onClick={handleSync}
              disabled={!!currentJob}
            >
              <RefreshCw
                className={cn('mr-1 h-3 w-3', currentJob && 'animate-spin')}
              />
              {currentJob ? 'Syncing...' : 'Sync Now'}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
