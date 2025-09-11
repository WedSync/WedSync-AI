'use client';

import React, { useState, useEffect } from 'react';
import {
  Calendar,
  RefreshCw,
  Settings,
  CheckCircle,
  AlertCircle,
  XCircle,
  Plus,
  ExternalLink,
  Clock,
  Shield,
  Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Types for calendar providers and sync status
export interface CalendarProvider {
  id: 'google' | 'outlook' | 'apple';
  name: string;
  isConnected: boolean;
  lastSync: Date | null;
  syncStatus: 'active' | 'error' | 'pending' | 'syncing';
  permissions: string[];
  accountEmail?: string;
  calendarCount?: number;
  errorMessage?: string;
  nextSyncTime?: Date;
}

export interface CalendarSyncStats {
  totalEvents: number;
  syncedToday: number;
  failedSync: number;
  lastFullSync: Date | null;
  syncHealth: number; // 0-100 score
}

interface CalendarSyncDashboardProps {
  weddingId?: string;
  onConnect: (providerId: string) => void;
  onDisconnect: (providerId: string) => void;
  onSync: (providerId?: string) => void;
  onManageSettings: (providerId: string) => void;
  className?: string;
}

export function CalendarSyncDashboard({
  weddingId,
  onConnect,
  onDisconnect,
  onSync,
  onManageSettings,
  className,
}: CalendarSyncDashboardProps) {
  const [providers, setProviders] = useState<CalendarProvider[]>([]);
  const [stats, setStats] = useState<CalendarSyncStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [syncingProvider, setSyncingProvider] = useState<string | null>(null);

  // Mock data - in real implementation, fetch from API
  useEffect(() => {
    const mockProviders: CalendarProvider[] = [
      {
        id: 'google',
        name: 'Google Calendar',
        isConnected: true,
        lastSync: new Date(Date.now() - 30000), // 30 seconds ago
        syncStatus: 'active',
        permissions: ['read', 'write'],
        accountEmail: 'sarah@weddingphoto.com',
        calendarCount: 3,
        nextSyncTime: new Date(Date.now() + 1800000), // 30 minutes from now
      },
      {
        id: 'outlook',
        name: 'Microsoft Outlook',
        isConnected: false,
        lastSync: null,
        syncStatus: 'pending',
        permissions: [],
        calendarCount: 0,
      },
      {
        id: 'apple',
        name: 'Apple Calendar',
        isConnected: true,
        lastSync: new Date(Date.now() - 3600000), // 1 hour ago
        syncStatus: 'error',
        permissions: ['read'],
        accountEmail: 'sarah@icloud.com',
        calendarCount: 2,
        errorMessage: 'Authentication expired. Please reconnect.',
      },
    ];

    const mockStats: CalendarSyncStats = {
      totalEvents: 145,
      syncedToday: 23,
      failedSync: 2,
      lastFullSync: new Date(Date.now() - 1800000), // 30 minutes ago
      syncHealth: 85,
    };

    // Simulate loading
    setTimeout(() => {
      setProviders(mockProviders);
      setStats(mockStats);
      setIsLoading(false);
    }, 1000);
  }, []);

  const handleConnect = async (providerId: string) => {
    setSyncingProvider(providerId);
    try {
      await onConnect(providerId);
      // Update provider status
      setProviders((prev) =>
        prev.map((p) =>
          p.id === providerId ? { ...p, syncStatus: 'syncing' } : p,
        ),
      );
    } catch (error) {
      console.error('Connection failed:', error);
    } finally {
      setSyncingProvider(null);
    }
  };

  const handleSync = async (providerId?: string) => {
    setSyncingProvider(providerId || 'all');
    try {
      await onSync(providerId);
      // Update sync status
      setProviders((prev) =>
        prev.map((p) =>
          !providerId || p.id === providerId
            ? { ...p, syncStatus: 'syncing', lastSync: new Date() }
            : p,
        ),
      );
    } catch (error) {
      console.error('Sync failed:', error);
    } finally {
      setSyncingProvider(null);
    }
  };

  const getStatusIcon = (status: CalendarProvider['syncStatus']) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'error':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'pending':
        return <AlertCircle className="h-5 w-5 text-amber-500" />;
      case 'syncing':
        return <RefreshCw className="h-5 w-5 text-blue-500 animate-spin" />;
      default:
        return <AlertCircle className="h-5 w-5 text-gray-400" />;
    }
  };

  const getStatusText = (provider: CalendarProvider) => {
    if (provider.syncStatus === 'syncing') return 'Syncing...';
    if (!provider.isConnected) return 'Not connected';
    if (provider.syncStatus === 'error')
      return provider.errorMessage || 'Connection error';
    if (provider.syncStatus === 'active')
      return `Last sync: ${formatTimeAgo(provider.lastSync)}`;
    return 'Ready to sync';
  };

  const formatTimeAgo = (date: Date | null): string => {
    if (!date) return 'Never';
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return date.toLocaleDateString();
  };

  const getProviderIcon = (providerId: string) => {
    // In a real implementation, use provider-specific SVG icons
    return <Calendar className="h-6 w-6" />;
  };

  if (isLoading) {
    return (
      <div
        className={cn(
          'bg-background rounded-lg border border-border p-6',
          className,
        )}
      >
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/3"></div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 bg-muted rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('bg-background space-y-6', className)}>
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-foreground">
            Calendar Integration
          </h2>
          <p className="text-muted-foreground mt-1">
            Sync your wedding timelines with your calendar providers
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => handleSync()}
            disabled={syncingProvider === 'all'}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors',
              'bg-accent text-accent-foreground hover:bg-accent/90',
              'disabled:opacity-50 disabled:cursor-not-allowed',
            )}
          >
            {syncingProvider === 'all' ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            Sync All
          </button>
        </div>
      </div>

      {/* Stats Overview */}
      {stats && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="bg-elevated rounded-lg border border-border p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                <Calendar className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-semibold text-foreground">
                  {stats.totalEvents}
                </p>
                <p className="text-sm text-muted-foreground">Total Events</p>
              </div>
            </div>
          </div>

          <div className="bg-elevated rounded-lg border border-border p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg">
                <Zap className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-2xl font-semibold text-foreground">
                  {stats.syncedToday}
                </p>
                <p className="text-sm text-muted-foreground">Synced Today</p>
              </div>
            </div>
          </div>

          <div className="bg-elevated rounded-lg border border-border p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-100 dark:bg-amber-900/20 rounded-lg">
                <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-2xl font-semibold text-foreground">
                  {stats.failedSync}
                </p>
                <p className="text-sm text-muted-foreground">Failed Syncs</p>
              </div>
            </div>
          </div>

          <div className="bg-elevated rounded-lg border border-border p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
                <Shield className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-2xl font-semibold text-foreground">
                  {stats.syncHealth}%
                </p>
                <p className="text-sm text-muted-foreground">Health Score</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Provider Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {providers.map((provider) => (
          <div
            key={provider.id}
            className="bg-elevated rounded-lg border border-border p-6 space-y-4"
          >
            {/* Provider Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {getProviderIcon(provider.id)}
                <div>
                  <h3 className="font-semibold text-foreground">
                    {provider.name}
                  </h3>
                  {provider.accountEmail && (
                    <p className="text-sm text-muted-foreground">
                      {provider.accountEmail}
                    </p>
                  )}
                </div>
              </div>
              {getStatusIcon(provider.syncStatus)}
            </div>

            {/* Connection Status */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Status</span>
                <span
                  className={cn(
                    'font-medium',
                    provider.syncStatus === 'active' &&
                      'text-green-600 dark:text-green-400',
                    provider.syncStatus === 'error' &&
                      'text-red-600 dark:text-red-400',
                    provider.syncStatus === 'pending' &&
                      'text-amber-600 dark:text-amber-400',
                  )}
                >
                  {getStatusText(provider)}
                </span>
              </div>

              {provider.isConnected && provider.calendarCount !== undefined && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Calendars</span>
                  <span className="font-medium text-foreground">
                    {provider.calendarCount}
                  </span>
                </div>
              )}

              {provider.nextSyncTime && provider.syncStatus === 'active' && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span>Next sync: {formatTimeAgo(provider.nextSyncTime)}</span>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2">
              {!provider.isConnected ? (
                <button
                  onClick={() => handleConnect(provider.id)}
                  disabled={syncingProvider === provider.id}
                  className={cn(
                    'flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                    'bg-accent text-accent-foreground hover:bg-accent/90',
                    'disabled:opacity-50 disabled:cursor-not-allowed',
                  )}
                >
                  {syncingProvider === provider.id ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <Plus className="h-4 w-4" />
                  )}
                  Connect
                </button>
              ) : (
                <>
                  <button
                    onClick={() => handleSync(provider.id)}
                    disabled={syncingProvider === provider.id}
                    className={cn(
                      'flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                      'border border-border bg-background hover:bg-muted',
                      'disabled:opacity-50 disabled:cursor-not-allowed',
                    )}
                  >
                    {syncingProvider === provider.id ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                      <RefreshCw className="h-4 w-4" />
                    )}
                  </button>

                  <button
                    onClick={() => onManageSettings(provider.id)}
                    className={cn(
                      'flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                      'border border-border bg-background hover:bg-muted',
                    )}
                  >
                    <Settings className="h-4 w-4" />
                  </button>

                  <button
                    onClick={() => onDisconnect(provider.id)}
                    className={cn(
                      'flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                      'text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20',
                    )}
                  >
                    <XCircle className="h-4 w-4" />
                  </button>
                </>
              )}
            </div>

            {/* Error Message */}
            {provider.syncStatus === 'error' && provider.errorMessage && (
              <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/30 rounded-md">
                <p className="text-sm text-red-700 dark:text-red-300">
                  {provider.errorMessage}
                </p>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="bg-elevated rounded-lg border border-border p-6">
        <h3 className="font-semibold text-foreground mb-4">Quick Actions</h3>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <button className="flex items-center gap-3 p-3 rounded-md border border-border hover:bg-muted transition-colors text-left">
            <Calendar className="h-5 w-5 text-accent" />
            <div>
              <p className="font-medium text-foreground">
                Sync Wedding Timeline
              </p>
              <p className="text-sm text-muted-foreground">
                Export timeline to calendars
              </p>
            </div>
          </button>

          <button className="flex items-center gap-3 p-3 rounded-md border border-border hover:bg-muted transition-colors text-left">
            <Shield className="h-5 w-5 text-accent" />
            <div>
              <p className="font-medium text-foreground">Privacy Settings</p>
              <p className="text-sm text-muted-foreground">
                Manage calendar permissions
              </p>
            </div>
          </button>

          <button className="flex items-center gap-3 p-3 rounded-md border border-border hover:bg-muted transition-colors text-left">
            <ExternalLink className="h-5 w-5 text-accent" />
            <div>
              <p className="font-medium text-foreground">View Help Docs</p>
              <p className="text-sm text-muted-foreground">
                Calendar setup guide
              </p>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}

export default CalendarSyncDashboard;
