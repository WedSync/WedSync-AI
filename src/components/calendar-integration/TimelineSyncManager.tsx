'use client';

import React, { useState, useCallback, useEffect } from 'react';
import {
  Calendar,
  Clock,
  Users,
  MapPin,
  Camera,
  Music,
  Utensils,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  Filter,
  Download,
  Settings,
  Eye,
  EyeOff,
  Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Types for wedding timeline and sync management
export interface WeddingEvent {
  id: string;
  title: string;
  description: string;
  startTime: Date;
  endTime: Date;
  location?: string;
  vendorId?: string;
  vendorName?: string;
  vendorRole?: string;
  eventType:
    | 'preparation'
    | 'ceremony'
    | 'reception'
    | 'photos'
    | 'vendor_arrival'
    | 'other';
  priority: 'high' | 'medium' | 'low';
  isPrivate: boolean;
  attendees?: string[];
  notes?: string;
  syncStatus: 'synced' | 'pending' | 'error' | 'conflict';
  lastSynced?: Date;
  syncedToProviders: string[];
  conflicts?: EventConflict[];
}

export interface EventConflict {
  id: string;
  type: 'time_overlap' | 'venue_conflict' | 'vendor_unavailable';
  description: string;
  severity: 'warning' | 'error';
  suggestion?: string;
  affectedEvents: string[];
}

export interface SyncSettings {
  autoSync: boolean;
  syncDirection: 'bidirectional' | 'push_only' | 'pull_only';
  syncPrivateEvents: boolean;
  notifyOnConflicts: boolean;
  bufferTimeMinutes: number;
  excludedEventTypes: string[];
}

interface TimelineSyncManagerProps {
  weddingId: string;
  events: WeddingEvent[];
  providers: string[];
  onSyncEvent: (eventId: string, providers?: string[]) => Promise<void>;
  onBulkSync: (eventIds: string[], providers?: string[]) => Promise<void>;
  onResolveConflict: (
    conflictId: string,
    resolution: 'accept' | 'reject' | 'modify',
  ) => Promise<void>;
  onUpdateSyncSettings: (settings: Partial<SyncSettings>) => Promise<void>;
  className?: string;
}

export function TimelineSyncManager({
  weddingId,
  events,
  providers,
  onSyncEvent,
  onBulkSync,
  onResolveConflict,
  onUpdateSyncSettings,
  className,
}: TimelineSyncManagerProps) {
  const [selectedEvents, setSelectedEvents] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<'timeline' | 'list'>('timeline');
  const [filterType, setFilterType] = useState<
    'all' | WeddingEvent['eventType']
  >('all');
  const [filterStatus, setFilterStatus] = useState<
    'all' | WeddingEvent['syncStatus']
  >('all');
  const [showSettings, setShowSettings] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncSettings, setSyncSettings] = useState<SyncSettings>({
    autoSync: true,
    syncDirection: 'bidirectional',
    syncPrivateEvents: false,
    notifyOnConflicts: true,
    bufferTimeMinutes: 15,
    excludedEventTypes: [],
  });

  // Filter events based on current filters
  const filteredEvents = events.filter((event) => {
    if (filterType !== 'all' && event.eventType !== filterType) return false;
    if (filterStatus !== 'all' && event.syncStatus !== filterStatus)
      return false;
    return true;
  });

  // Get events with conflicts
  const conflictedEvents = filteredEvents.filter(
    (event) => event.conflicts && event.conflicts.length > 0,
  );

  // Get sync statistics
  const syncStats = {
    total: events.length,
    synced: events.filter((e) => e.syncStatus === 'synced').length,
    pending: events.filter((e) => e.syncStatus === 'pending').length,
    errors: events.filter((e) => e.syncStatus === 'error').length,
    conflicts: conflictedEvents.length,
  };

  const handleSelectEvent = useCallback((eventId: string) => {
    setSelectedEvents((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(eventId)) {
        newSet.delete(eventId);
      } else {
        newSet.add(eventId);
      }
      return newSet;
    });
  }, []);

  const handleSelectAll = useCallback(() => {
    if (selectedEvents.size === filteredEvents.length) {
      setSelectedEvents(new Set());
    } else {
      setSelectedEvents(new Set(filteredEvents.map((e) => e.id)));
    }
  }, [selectedEvents.size, filteredEvents]);

  const handleBulkSync = useCallback(async () => {
    if (selectedEvents.size === 0) return;

    setIsSyncing(true);
    try {
      await onBulkSync(Array.from(selectedEvents), providers);
      setSelectedEvents(new Set());
    } catch (error) {
      console.error('Bulk sync failed:', error);
    } finally {
      setIsSyncing(false);
    }
  }, [selectedEvents, onBulkSync, providers]);

  const getEventIcon = (eventType: WeddingEvent['eventType']) => {
    switch (eventType) {
      case 'preparation':
        return <Users className="h-4 w-4" />;
      case 'ceremony':
        return <Calendar className="h-4 w-4" />;
      case 'reception':
        return <Music className="h-4 w-4" />;
      case 'photos':
        return <Camera className="h-4 w-4" />;
      case 'vendor_arrival':
        return <Utensils className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const getStatusIcon = (status: WeddingEvent['syncStatus']) => {
    switch (status) {
      case 'synced':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'pending':
        return <RefreshCw className="h-4 w-4 text-amber-500 animate-spin" />;
      case 'error':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'conflict':
        return <AlertTriangle className="h-4 w-4 text-orange-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  const formatTime = (date: Date) => {
    return new Intl.DateTimeFormat('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(date);
  };

  const formatDuration = (start: Date, end: Date) => {
    const durationMs = end.getTime() - start.getTime();
    const hours = Math.floor(durationMs / (1000 * 60 * 60));
    const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));

    if (hours === 0) return `${minutes}m`;
    if (minutes === 0) return `${hours}h`;
    return `${hours}h ${minutes}m`;
  };

  return (
    <div className={cn('bg-background space-y-6', className)}>
      {/* Header with Stats */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h3 className="text-xl font-semibold text-foreground">
              Timeline Sync Manager
            </h3>
            <p className="text-muted-foreground mt-1">
              Manage wedding timeline synchronization across all calendar
              providers
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowSettings(!showSettings)}
              className={cn(
                'flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                'border border-border hover:bg-muted',
              )}
            >
              <Settings className="h-4 w-4" />
              Settings
            </button>
          </div>
        </div>

        {/* Sync Statistics */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <div className="bg-elevated rounded-lg border border-border p-4">
            <div className="flex items-center gap-3">
              <Calendar className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-lg font-semibold text-foreground">
                  {syncStats.total}
                </p>
                <p className="text-sm text-muted-foreground">Total Events</p>
              </div>
            </div>
          </div>

          <div className="bg-elevated rounded-lg border border-border p-4">
            <div className="flex items-center gap-3">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-lg font-semibold text-foreground">
                  {syncStats.synced}
                </p>
                <p className="text-sm text-muted-foreground">Synced</p>
              </div>
            </div>
          </div>

          <div className="bg-elevated rounded-lg border border-border p-4">
            <div className="flex items-center gap-3">
              <RefreshCw className="h-5 w-5 text-amber-600" />
              <div>
                <p className="text-lg font-semibold text-foreground">
                  {syncStats.pending}
                </p>
                <p className="text-sm text-muted-foreground">Pending</p>
              </div>
            </div>
          </div>

          <div className="bg-elevated rounded-lg border border-border p-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              <div>
                <p className="text-lg font-semibold text-foreground">
                  {syncStats.errors}
                </p>
                <p className="text-sm text-muted-foreground">Errors</p>
              </div>
            </div>
          </div>

          <div className="bg-elevated rounded-lg border border-border p-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-orange-600" />
              <div>
                <p className="text-lg font-semibold text-foreground">
                  {syncStats.conflicts}
                </p>
                <p className="text-sm text-muted-foreground">Conflicts</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters and Actions */}
      <div className="flex flex-col lg:flex-row lg:items-center gap-4 p-4 bg-elevated rounded-lg border border-border">
        <div className="flex flex-col sm:flex-row gap-3 flex-1">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as any)}
              className="px-3 py-1 border border-border rounded-md bg-background text-foreground text-sm"
            >
              <option value="all">All Types</option>
              <option value="preparation">Preparation</option>
              <option value="ceremony">Ceremony</option>
              <option value="reception">Reception</option>
              <option value="photos">Photography</option>
              <option value="vendor_arrival">Vendor Arrival</option>
              <option value="other">Other</option>
            </select>
          </div>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as any)}
            className="px-3 py-1 border border-border rounded-md bg-background text-foreground text-sm"
          >
            <option value="all">All Status</option>
            <option value="synced">Synced</option>
            <option value="pending">Pending</option>
            <option value="error">Error</option>
            <option value="conflict">Conflict</option>
          </select>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewMode('timeline')}
              className={cn(
                'px-3 py-1 rounded-md text-sm font-medium transition-colors',
                viewMode === 'timeline'
                  ? 'bg-accent text-accent-foreground'
                  : 'hover:bg-muted',
              )}
            >
              Timeline
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={cn(
                'px-3 py-1 rounded-md text-sm font-medium transition-colors',
                viewMode === 'list'
                  ? 'bg-accent text-accent-foreground'
                  : 'hover:bg-muted',
              )}
            >
              List
            </button>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleSelectAll}
            className="text-sm text-accent hover:underline"
          >
            {selectedEvents.size === filteredEvents.length
              ? 'Deselect All'
              : 'Select All'}
          </button>

          {selectedEvents.size > 0 && (
            <button
              onClick={handleBulkSync}
              disabled={isSyncing}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors',
                'bg-accent text-accent-foreground hover:bg-accent/90',
                'disabled:opacity-50 disabled:cursor-not-allowed',
              )}
            >
              {isSyncing ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Zap className="h-4 w-4" />
              )}
              Sync Selected ({selectedEvents.size})
            </button>
          )}
        </div>
      </div>

      {/* Conflicts Alert */}
      {conflictedEvents.length > 0 && (
        <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-900/30 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-orange-600 dark:text-orange-400 mt-0.5" />
            <div>
              <h4 className="font-medium text-orange-900 dark:text-orange-100">
                {conflictedEvents.length} event
                {conflictedEvents.length > 1 ? 's' : ''} need attention
              </h4>
              <p className="text-sm text-orange-700 dark:text-orange-200 mt-1">
                There are scheduling conflicts that need to be resolved before
                syncing.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Events List/Timeline */}
      <div className="space-y-4">
        {filteredEvents.length === 0 ? (
          <div className="text-center py-12">
            <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">
              No events match your current filters
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredEvents
              .sort((a, b) => a.startTime.getTime() - b.startTime.getTime())
              .map((event) => (
                <div
                  key={event.id}
                  className={cn(
                    'bg-elevated border border-border rounded-lg p-4 transition-colors',
                    selectedEvents.has(event.id) &&
                      'ring-2 ring-accent/40 border-accent/40',
                    event.syncStatus === 'conflict' &&
                      'border-orange-200 dark:border-orange-800',
                  )}
                >
                  <div className="flex items-start gap-4">
                    {/* Selection Checkbox */}
                    <input
                      type="checkbox"
                      checked={selectedEvents.has(event.id)}
                      onChange={() => handleSelectEvent(event.id)}
                      className="mt-1 h-4 w-4 rounded border-border text-accent focus:ring-accent/40"
                    />

                    {/* Event Icon */}
                    <div className="p-2 bg-muted rounded-lg shrink-0 mt-0.5">
                      {getEventIcon(event.eventType)}
                    </div>

                    {/* Event Details */}
                    <div className="flex-1 min-w-0 space-y-2">
                      <div className="flex items-start justify-between gap-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium text-foreground">
                              {event.title}
                            </h4>
                            {event.isPrivate && (
                              <Eye className="h-4 w-4 text-muted-foreground" />
                            )}
                          </div>
                          {event.description && (
                            <p className="text-sm text-muted-foreground">
                              {event.description}
                            </p>
                          )}
                        </div>
                        {getStatusIcon(event.syncStatus)}
                      </div>

                      <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          <span>
                            {formatTime(event.startTime)} -{' '}
                            {formatTime(event.endTime)}
                          </span>
                          <span className="text-xs">
                            ({formatDuration(event.startTime, event.endTime)})
                          </span>
                        </div>

                        {event.location && (
                          <div className="flex items-center gap-1">
                            <MapPin className="h-4 w-4" />
                            <span>{event.location}</span>
                          </div>
                        )}

                        {event.vendorName && (
                          <div className="flex items-center gap-1">
                            <Users className="h-4 w-4" />
                            <span>
                              {event.vendorName} ({event.vendorRole})
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Sync Status Details */}
                      <div className="flex items-center justify-between pt-2 border-t border-border">
                        <div className="text-xs text-muted-foreground">
                          {event.lastSynced ? (
                            <>Last synced: {formatTime(event.lastSynced)}</>
                          ) : (
                            'Never synced'
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {event.syncedToProviders.map((provider) => (
                            <span
                              key={provider}
                              className="px-2 py-1 bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-300 rounded-full text-xs font-medium"
                            >
                              {provider}
                            </span>
                          ))}
                          {event.syncStatus !== 'synced' && (
                            <button
                              onClick={() => onSyncEvent(event.id)}
                              className="p-1 hover:bg-muted rounded text-accent"
                            >
                              <RefreshCw className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Conflicts */}
                      {event.conflicts && event.conflicts.length > 0 && (
                        <div className="pt-2 space-y-2">
                          {event.conflicts.map((conflict) => (
                            <div
                              key={conflict.id}
                              className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-900/30 rounded-md p-3"
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div>
                                  <p className="text-sm font-medium text-orange-900 dark:text-orange-100">
                                    {conflict.description}
                                  </p>
                                  {conflict.suggestion && (
                                    <p className="text-xs text-orange-700 dark:text-orange-200 mt-1">
                                      {conflict.suggestion}
                                    </p>
                                  )}
                                </div>
                                <div className="flex items-center gap-1 shrink-0">
                                  <button
                                    onClick={() =>
                                      onResolveConflict(conflict.id, 'accept')
                                    }
                                    className="px-2 py-1 bg-green-600 text-white rounded text-xs hover:bg-green-700"
                                  >
                                    Accept
                                  </button>
                                  <button
                                    onClick={() =>
                                      onResolveConflict(conflict.id, 'reject')
                                    }
                                    className="px-2 py-1 bg-red-600 text-white rounded text-xs hover:bg-red-700"
                                  >
                                    Reject
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>

      {/* Sync Settings Panel */}
      {showSettings && (
        <div className="bg-elevated rounded-lg border border-border p-6 space-y-6">
          <h4 className="text-lg font-semibold text-foreground">
            Sync Settings
          </h4>

          <div className="grid gap-6 sm:grid-cols-2">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-foreground">
                  Auto-sync timeline
                </label>
                <input
                  type="checkbox"
                  checked={syncSettings.autoSync}
                  onChange={(e) =>
                    setSyncSettings((prev) => ({
                      ...prev,
                      autoSync: e.target.checked,
                    }))
                  }
                  className="h-4 w-4 rounded border-border text-accent focus:ring-accent/40"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  Sync direction
                </label>
                <select
                  value={syncSettings.syncDirection}
                  onChange={(e) =>
                    setSyncSettings((prev) => ({
                      ...prev,
                      syncDirection: e.target.value as any,
                    }))
                  }
                  className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground"
                >
                  <option value="bidirectional">Bidirectional</option>
                  <option value="push_only">Push to calendars only</option>
                  <option value="pull_only">Pull from calendars only</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  Buffer time (minutes)
                </label>
                <input
                  type="number"
                  min="0"
                  max="60"
                  value={syncSettings.bufferTimeMinutes}
                  onChange={(e) =>
                    setSyncSettings((prev) => ({
                      ...prev,
                      bufferTimeMinutes: parseInt(e.target.value),
                    }))
                  }
                  className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground"
                />
                <p className="text-xs text-muted-foreground">
                  Add buffer time before/after events to prevent conflicts
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-foreground">
                  Sync private events
                </label>
                <input
                  type="checkbox"
                  checked={syncSettings.syncPrivateEvents}
                  onChange={(e) =>
                    setSyncSettings((prev) => ({
                      ...prev,
                      syncPrivateEvents: e.target.checked,
                    }))
                  }
                  className="h-4 w-4 rounded border-border text-accent focus:ring-accent/40"
                />
              </div>

              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-foreground">
                  Notify on conflicts
                </label>
                <input
                  type="checkbox"
                  checked={syncSettings.notifyOnConflicts}
                  onChange={(e) =>
                    setSyncSettings((prev) => ({
                      ...prev,
                      notifyOnConflicts: e.target.checked,
                    }))
                  }
                  className="h-4 w-4 rounded border-border text-accent focus:ring-accent/40"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  Excluded event types
                </label>
                <div className="space-y-2">
                  {['preparation', 'vendor_arrival', 'other'].map((type) => (
                    <div key={type} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={syncSettings.excludedEventTypes.includes(type)}
                        onChange={(e) => {
                          setSyncSettings((prev) => ({
                            ...prev,
                            excludedEventTypes: e.target.checked
                              ? [...prev.excludedEventTypes, type]
                              : prev.excludedEventTypes.filter(
                                  (t) => t !== type,
                                ),
                          }));
                        }}
                        className="h-4 w-4 rounded border-border text-accent focus:ring-accent/40"
                      />
                      <label className="text-sm text-foreground capitalize">
                        {type.replace('_', ' ')}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
            <button
              onClick={() => setShowSettings(false)}
              className="px-4 py-2 border border-border rounded-md hover:bg-muted transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                onUpdateSyncSettings(syncSettings);
                setShowSettings(false);
              }}
              className="px-4 py-2 bg-accent text-accent-foreground rounded-md hover:bg-accent/90 transition-colors"
            >
              Save Settings
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default TimelineSyncManager;
