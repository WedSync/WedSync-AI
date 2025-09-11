/**
 * OutlookCalendarSync - Main Outlook Calendar Integration Dashboard
 * Comprehensive calendar synchronization management for wedding professionals
 *
 * Features:
 * - OAuth authentication flow
 * - Real-time sync status monitoring
 * - Event conflict resolution
 * - Wedding-specific event management
 * - Mobile-optimized interface
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Calendar,
  RefreshCw,
  Settings,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
} from 'lucide-react';
import { useOutlookSync } from '@/hooks/useOutlookSync';
import { OutlookOAuthFlow } from './OutlookOAuthFlow';
import { OutlookSyncStatus } from './OutlookSyncStatus';
import { OutlookEventMapping } from './OutlookEventMapping';
import { OutlookSyncSettings } from './OutlookSyncSettings';
import { Button } from '@/components/untitled-ui/button';
import { Card } from '@/components/untitled-ui/card';
import { Badge } from '@/components/untitled-ui/badge';
import { ShimmerButton } from '@/components/magicui/shimmer-button';
import {
  OutlookCalendarSyncProps,
  WeddingCalendarEvent,
} from '@/types/outlook';

/**
 * Main Outlook Calendar Integration Container
 * Orchestrates authentication, sync, settings, and conflict resolution
 */
export function OutlookCalendarSync({
  organizationId,
  userId,
  initialSettings,
  onSyncComplete,
  onError,
  className = '',
}: OutlookCalendarSyncProps) {
  // Integration state
  const {
    authState,
    authenticate,
    disconnect,
    syncStatus,
    syncEvents,
    syncCalendars,
    pauseSync,
    resumeSync,
    conflicts,
    resolveConflict,
    detectConflicts,
    settings,
    updateSettings,
    isHealthy,
    lastError,
    validateConnection,
  } = useOutlookSync();

  // UI state
  const [activeTab, setActiveTab] = useState<
    'overview' | 'settings' | 'mapping' | 'conflicts'
  >('overview');
  const [isLoading, setIsLoading] = useState(false);
  const [upcomingEvents, setUpcomingEvents] = useState<WeddingCalendarEvent[]>(
    [],
  );
  const [syncHistory, setSyncHistory] = useState<any[]>([]);

  /**
   * Initialize component and load user settings
   */
  useEffect(() => {
    if (authState.isAuthenticated) {
      loadUpcomingEvents();
      loadSyncHistory();
    }
  }, [authState.isAuthenticated]);

  /**
   * Handle sync completion callback
   */
  useEffect(() => {
    if (syncStatus.status === 'completed' && onSyncComplete) {
      onSyncComplete(syncStatus);
    }
  }, [syncStatus.status, onSyncComplete]);

  /**
   * Handle error callback
   */
  useEffect(() => {
    if (lastError && onError) {
      onError(lastError);
    }
  }, [lastError, onError]);

  /**
   * Load upcoming wedding events
   */
  const loadUpcomingEvents = useCallback(async () => {
    try {
      setIsLoading(true);

      // Get events for next 30 days (typical wedding planning window)
      const startDate = new Date().toISOString();
      const endDate = new Date(
        Date.now() + 30 * 24 * 60 * 60 * 1000,
      ).toISOString();

      // This would typically come from your WedSync database
      // For now, we'll simulate upcoming wedding events
      const mockEvents: WeddingCalendarEvent[] = [
        {
          id: 'event-1',
          title: 'Johnson-Smith Wedding Consultation',
          start: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
          end: new Date(
            Date.now() + 2 * 24 * 60 * 60 * 1000 + 60 * 60 * 1000,
          ).toISOString(),
          type: 'consultation',
          priority: 'high',
          status: 'confirmed',
          location: 'Photography Studio',
          reminderMinutes: [15, 60],
          clientId: 'client-1',
          weddingDate: '2024-06-15',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: 'event-2',
          title: 'Williams Venue Visit - Ashridge House',
          start: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
          end: new Date(
            Date.now() + 5 * 24 * 60 * 60 * 1000 + 120 * 60 * 1000,
          ).toISOString(),
          type: 'venue_visit',
          priority: 'medium',
          status: 'confirmed',
          location: 'Ashridge House, Hertfordshire',
          reminderMinutes: [30],
          clientId: 'client-2',
          weddingDate: '2024-08-20',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];

      setUpcomingEvents(mockEvents);
    } catch (error) {
      console.error('Failed to load upcoming events:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Load sync history
   */
  const loadSyncHistory = useCallback(async () => {
    try {
      // This would come from your database
      const mockHistory = [
        {
          id: 'sync-1',
          timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
          status: 'completed',
          eventsProcessed: 15,
          duration: 32000,
        },
        {
          id: 'sync-2',
          timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
          status: 'completed',
          eventsProcessed: 8,
          duration: 18000,
        },
      ];

      setSyncHistory(mockHistory);
    } catch (error) {
      console.error('Failed to load sync history:', error);
    }
  }, []);

  /**
   * Handle manual sync trigger
   */
  const handleManualSync = useCallback(async () => {
    try {
      setIsLoading(true);

      // Sync upcoming events to Outlook
      await syncEvents(upcomingEvents);

      // Also sync from Outlook to WedSync
      await syncCalendars();
    } catch (error) {
      console.error('Manual sync failed:', error);
      onError?.(error instanceof Error ? error.message : 'Sync failed');
    } finally {
      setIsLoading(false);
    }
  }, [upcomingEvents, syncEvents, syncCalendars, onError]);

  /**
   * Handle connection test
   */
  const handleConnectionTest = useCallback(async () => {
    try {
      setIsLoading(true);
      const isConnected = await validateConnection();

      if (isConnected) {
        // Show success feedback
        console.log('Connection test successful');
      } else {
        onError?.('Connection test failed - please check your authentication');
      }
    } catch (error) {
      console.error('Connection test failed:', error);
      onError?.(
        error instanceof Error ? error.message : 'Connection test failed',
      );
    } finally {
      setIsLoading(false);
    }
  }, [validateConnection, onError]);

  /**
   * Render connection status indicator
   */
  const renderConnectionStatus = () => {
    if (!authState.isAuthenticated) {
      return (
        <div className="flex items-center space-x-2 text-gray-500">
          <XCircle className="h-4 w-4" />
          <span className="text-sm">Not connected</span>
        </div>
      );
    }

    if (!isHealthy) {
      return (
        <div className="flex items-center space-x-2 text-amber-600">
          <AlertTriangle className="h-4 w-4" />
          <span className="text-sm">Connection issues</span>
        </div>
      );
    }

    return (
      <div className="flex items-center space-x-2 text-green-600">
        <CheckCircle className="h-4 w-4" />
        <span className="text-sm">
          Connected to {authState.userAccount?.name || 'Outlook'}
        </span>
      </div>
    );
  };

  /**
   * Render upcoming events preview
   */
  const renderUpcomingEvents = () => {
    if (upcomingEvents.length === 0) {
      return (
        <div className="text-center py-8 text-gray-500">
          <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>No upcoming wedding events</p>
          <p className="text-sm">
            Events will appear here once you schedule consultations and meetings
          </p>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {upcomingEvents.map((event) => (
          <div
            key={event.id}
            className="border border-gray-200 rounded-lg p-4 hover:border-primary-300 transition-colors"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h4 className="font-medium text-gray-900">{event.title}</h4>
                <p className="text-sm text-gray-600 mt-1">
                  {new Date(event.start).toLocaleDateString('en-GB', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}{' '}
                  at{' '}
                  {new Date(event.start).toLocaleTimeString('en-GB', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
                {event.location && (
                  <p className="text-sm text-gray-500 mt-1">{event.location}</p>
                )}
              </div>
              <div className="flex items-center space-x-2">
                <Badge
                  variant={
                    event.priority === 'high'
                      ? 'destructive'
                      : event.priority === 'medium'
                        ? 'warning'
                        : 'secondary'
                  }
                >
                  {event.type.replace('_', ' ')}
                </Badge>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  /**
   * Render sync statistics
   */
  const renderSyncStats = () => {
    const lastSync = syncHistory[0];

    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <RefreshCw className="h-8 w-8 text-primary-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Last Sync</p>
              <p className="text-2xl font-semibold text-gray-900">
                {lastSync
                  ? new Date(lastSync.timestamp).toLocaleDateString()
                  : 'Never'}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Calendar className="h-8 w-8 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Events Synced</p>
              <p className="text-2xl font-semibold text-gray-900">
                {syncHistory.reduce(
                  (total, sync) => total + sync.eventsProcessed,
                  0,
                )}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <AlertTriangle className="h-8 w-8 text-amber-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Conflicts</p>
              <p className="text-2xl font-semibold text-gray-900">
                {conflicts.length}
              </p>
            </div>
          </div>
        </Card>
      </div>
    );
  };

  /**
   * Render tab navigation
   */
  const renderTabNavigation = () => {
    const tabs = [
      { id: 'overview', label: 'Overview', icon: Calendar },
      { id: 'settings', label: 'Settings', icon: Settings },
      { id: 'mapping', label: 'Event Mapping', icon: RefreshCw },
      {
        id: 'conflicts',
        label: 'Conflicts',
        icon: AlertTriangle,
        badge: conflicts.length,
      },
    ];

    return (
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`
                  group inline-flex items-center py-4 px-1 border-b-2 font-medium text-sm
                  ${
                    isActive
                      ? 'border-primary-500 text-primary-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }
                `}
              >
                <Icon
                  className={`
                  -ml-0.5 mr-2 h-5 w-5
                  ${isActive ? 'text-primary-500' : 'text-gray-400 group-hover:text-gray-500'}
                `}
                />
                {tab.label}
                {tab.badge && tab.badge > 0 && (
                  <Badge variant="destructive" className="ml-2">
                    {tab.badge}
                  </Badge>
                )}
              </button>
            );
          })}
        </nav>
      </div>
    );
  };

  /**
   * Render tab content
   */
  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <div className="space-y-8">
            {renderSyncStats()}

            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Upcoming Wedding Events
              </h3>
              {renderUpcomingEvents()}
            </div>

            {syncStatus.isRunning && (
              <OutlookSyncStatus
                syncStatus={syncStatus}
                onPause={pauseSync}
                onCancel={pauseSync}
                showDetails
              />
            )}
          </div>
        );

      case 'settings':
        return settings ? (
          <OutlookSyncSettings
            settings={settings}
            onSettingsChange={updateSettings}
            onSave={async () => true}
            onTest={handleConnectionTest}
            isLoading={isLoading}
          />
        ) : (
          <div className="text-center py-8">
            <p className="text-gray-500">Loading settings...</p>
          </div>
        );

      case 'mapping':
        return (
          <OutlookEventMapping
            mappings={[]} // This would come from settings
            onMappingChange={() => {}}
            onSave={async () => true}
            isLoading={isLoading}
          />
        );

      case 'conflicts':
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900">
                Event Conflicts
              </h3>
              {conflicts.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => detectConflicts(upcomingEvents)}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh Conflicts
                </Button>
              )}
            </div>

            {conflicts.length === 0 ? (
              <div className="text-center py-8">
                <CheckCircle className="h-12 w-12 mx-auto text-green-500 mb-4" />
                <p className="text-gray-600">
                  No scheduling conflicts detected
                </p>
                <p className="text-sm text-gray-500">
                  Your wedding schedule looks perfectly coordinated!
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {conflicts.map((conflict) => (
                  <Card
                    key={conflict.conflictId}
                    className="p-6 border-amber-200"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <AlertTriangle className="h-5 w-5 text-amber-600" />
                          <h4 className="font-medium text-gray-900">
                            {conflict.type.replace('_', ' ')} Conflict
                          </h4>
                          <Badge variant="warning">{conflict.severity}</Badge>
                        </div>

                        <div className="space-y-2 text-sm text-gray-600">
                          <p>
                            <strong>Event 1:</strong>{' '}
                            {conflict.sourceEvent.title}
                          </p>
                          <p>
                            <strong>Event 2:</strong>{' '}
                            {conflict.conflictingEvent.title}
                          </p>
                          <p>
                            <strong>Suggested Resolution:</strong>{' '}
                            {conflict.suggestedResolution?.action}
                          </p>
                        </div>
                      </div>

                      <div className="flex space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            resolveConflict(
                              conflict.conflictId,
                              conflict.suggestedResolution!,
                            )
                          }
                        >
                          Apply Suggestion
                        </Button>
                        <Button variant="outline" size="sm">
                          Manual Resolve
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  // Show authentication flow if not authenticated
  if (!authState.isAuthenticated) {
    return (
      <div className={`bg-white rounded-xl shadow-sm ${className}`}>
        <div className="p-8 text-center">
          <Calendar className="h-16 w-16 mx-auto text-primary-600 mb-6" />
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">
            Connect Your Outlook Calendar
          </h2>
          <p className="text-gray-600 mb-8 max-w-md mx-auto">
            Sync your wedding events seamlessly with Microsoft Outlook. Perfect
            for photographers, venue coordinators, and wedding planners who need
            their schedules in sync.
          </p>

          <OutlookOAuthFlow
            onSuccess={() => {
              loadUpcomingEvents();
              loadSyncHistory();
            }}
            onError={onError}
          />
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-xl shadow-sm ${className}`}>
      {/* Header */}
      <div className="border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Calendar className="h-8 w-8 text-primary-600" />
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">
                Outlook Calendar Integration
              </h1>
              <p className="text-sm text-gray-600">
                Manage your wedding schedule synchronization
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            {renderConnectionStatus()}

            <div className="flex space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleConnectionTest}
                disabled={isLoading}
              >
                Test Connection
              </Button>

              <ShimmerButton
                onClick={handleManualSync}
                disabled={isLoading || syncStatus.isRunning}
                className="shadow-2xl"
              >
                <RefreshCw
                  className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`}
                />
                Sync Now
              </ShimmerButton>

              <Button
                variant="outline"
                size="sm"
                onClick={disconnect}
                className="text-red-600 hover:text-red-700"
              >
                Disconnect
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      {renderTabNavigation()}

      {/* Tab Content */}
      <div className="p-6">{renderTabContent()}</div>

      {/* Status Messages */}
      {lastError && (
        <div className="fixed bottom-4 right-4 bg-red-50 border border-red-200 rounded-lg p-4 max-w-md">
          <div className="flex items-start space-x-2">
            <XCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-red-800">Sync Error</p>
              <p className="text-sm text-red-600">{lastError}</p>
            </div>
          </div>
        </div>
      )}

      {syncStatus.status === 'completed' && syncStatus.endTime && (
        <div className="fixed bottom-4 right-4 bg-green-50 border border-green-200 rounded-lg p-4 max-w-md">
          <div className="flex items-start space-x-2">
            <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-green-800">
                Sync Completed
              </p>
              <p className="text-sm text-green-600">
                {syncStatus.progress.created} events synced to Outlook
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
