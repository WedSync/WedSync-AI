'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import {
  WifiOff,
  Wifi,
  Cloud,
  CloudOff,
  Save,
  Plus,
  Trash2,
  Clock,
  DollarSign,
  AlertCircle,
  CheckCircle,
  Upload,
  Download,
  Smartphone,
  Battery,
  Signal,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface OfflineCostEntry {
  id: string;
  amount: number;
  description: string;
  category: string;
  timestamp: Date;
  location?: string;
  synced: boolean;
}

interface OfflineCostTrackerProps {
  weddingId?: string;
  onSyncComplete?: (entries: OfflineCostEntry[]) => void;
  className?: string;
}

export default function OfflineCostTracker({
  weddingId,
  onSyncComplete,
  className,
}: OfflineCostTrackerProps) {
  const [isOnline, setIsOnline] = useState(true);
  const [entries, setEntries] = useState<OfflineCostEntry[]>([]);
  const [pendingEntries, setPendingEntries] = useState<OfflineCostEntry[]>([]);
  const [newEntry, setNewEntry] = useState({
    amount: '',
    description: '',
    category: 'venue',
  });
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [storageUsed, setStorageUsed] = useState(0);

  // Monitor network status
  useEffect(() => {
    const updateNetworkStatus = () => {
      setIsOnline(navigator.onLine);
    };

    window.addEventListener('online', updateNetworkStatus);
    window.addEventListener('offline', updateNetworkStatus);

    // Check connection quality
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      console.log('Connection type:', connection.effectiveType);
    }

    return () => {
      window.removeEventListener('online', updateNetworkStatus);
      window.removeEventListener('offline', updateNetworkStatus);
    };
  }, []);

  // Load from localStorage on mount
  useEffect(() => {
    const savedEntries = localStorage.getItem(`cost-entries-${weddingId}`);
    const savedPending = localStorage.getItem(`pending-entries-${weddingId}`);
    const savedLastSync = localStorage.getItem(`last-sync-${weddingId}`);

    if (savedEntries) {
      setEntries(JSON.parse(savedEntries));
    }

    if (savedPending) {
      setPendingEntries(JSON.parse(savedPending));
    }

    if (savedLastSync) {
      setLastSync(new Date(savedLastSync));
    }

    // Calculate storage usage
    calculateStorageUsage();
  }, [weddingId]);

  // Auto-save to localStorage
  useEffect(() => {
    if (entries.length > 0) {
      localStorage.setItem(
        `cost-entries-${weddingId}`,
        JSON.stringify(entries),
      );
      setIsAutoSaving(true);

      setTimeout(() => setIsAutoSaving(false), 500);
    }
  }, [entries, weddingId]);

  useEffect(() => {
    if (pendingEntries.length > 0) {
      localStorage.setItem(
        `pending-entries-${weddingId}`,
        JSON.stringify(pendingEntries),
      );
    }
  }, [pendingEntries, weddingId]);

  // Auto-sync when coming online
  useEffect(() => {
    if (isOnline && pendingEntries.length > 0) {
      handleSync();
    }
  }, [isOnline]);

  const calculateStorageUsage = useCallback(() => {
    try {
      let totalSize = 0;
      for (let key in localStorage) {
        if (key.includes('cost-entries') || key.includes('pending-entries')) {
          totalSize += localStorage.getItem(key)?.length || 0;
        }
      }
      setStorageUsed(totalSize);
    } catch (error) {
      console.warn('Could not calculate storage usage:', error);
    }
  }, []);

  const addEntry = useCallback(() => {
    if (!newEntry.amount || !newEntry.description) return;

    const entry: OfflineCostEntry = {
      id: `offline-${Date.now()}-${Math.random()}`,
      amount: parseFloat(newEntry.amount),
      description: newEntry.description,
      category: newEntry.category,
      timestamp: new Date(),
      location: 'Unknown', // Could use geolocation API
      synced: false,
    };

    if (isOnline) {
      // Add directly to entries if online
      setEntries((prev) => [...prev, { ...entry, synced: true }]);
    } else {
      // Add to pending if offline
      setPendingEntries((prev) => [...prev, entry]);
    }

    // Clear form
    setNewEntry({
      amount: '',
      description: '',
      category: 'venue',
    });

    // Trigger haptic feedback
    if ('vibrate' in navigator) {
      navigator.vibrate([50]);
    }
  }, [newEntry, isOnline]);

  const removeEntry = useCallback((id: string, isPending = false) => {
    if (isPending) {
      setPendingEntries((prev) => prev.filter((entry) => entry.id !== id));
    } else {
      setEntries((prev) => prev.filter((entry) => entry.id !== id));
    }
  }, []);

  const handleSync = useCallback(async () => {
    if (!isOnline || pendingEntries.length === 0) return;

    setIsSyncing(true);

    try {
      // Simulate API sync
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Move pending entries to synced entries
      const syncedEntries = pendingEntries.map((entry) => ({
        ...entry,
        synced: true,
      }));

      setEntries((prev) => [...prev, ...syncedEntries]);
      setPendingEntries([]);
      setLastSync(new Date());

      localStorage.setItem(`last-sync-${weddingId}`, new Date().toISOString());
      localStorage.removeItem(`pending-entries-${weddingId}`);

      onSyncComplete?.(syncedEntries);

      // Success haptic feedback
      if ('vibrate' in navigator) {
        navigator.vibrate([100, 50, 100]);
      }
    } catch (error) {
      console.error('Sync failed:', error);
    } finally {
      setIsSyncing(false);
    }
  }, [isOnline, pendingEntries, weddingId, onSyncComplete]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
    }).format(amount);
  };

  const formatStorageSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getTotalAmount = (entryList: OfflineCostEntry[]) => {
    return entryList.reduce((sum, entry) => sum + entry.amount, 0);
  };

  const categories = [
    { value: 'venue', label: 'Venue' },
    { value: 'photography', label: 'Photography' },
    { value: 'catering', label: 'Catering' },
    { value: 'flowers', label: 'Flowers' },
    { value: 'music', label: 'Music' },
    { value: 'other', label: 'Other' },
  ];

  return (
    <div className={cn('w-full max-w-md mx-auto p-4 space-y-4', className)}>
      {/* Connection Status */}
      <Card
        className={cn(
          'border-2',
          isOnline
            ? 'border-green-500 bg-green-50'
            : 'border-red-500 bg-red-50',
        )}
      >
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              {isOnline ? (
                <>
                  <Wifi className="h-5 w-5 text-green-600" />
                  <span className="text-green-700">Online</span>
                </>
              ) : (
                <>
                  <WifiOff className="h-5 w-5 text-red-600" />
                  <span className="text-red-700">Offline Mode</span>
                </>
              )}
            </CardTitle>
            <div className="flex items-center gap-2">
              {isAutoSaving && (
                <Badge variant="outline" className="animate-pulse">
                  <Save className="h-3 w-3 mr-1" />
                  Saving...
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex justify-between text-sm">
            <span>Storage Used: {formatStorageSize(storageUsed)}</span>
            {lastSync && (
              <span>Last Sync: {lastSync.toLocaleTimeString()}</span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Pending Sync Alert */}
      {pendingEntries.length > 0 && (
        <Card className="bg-amber-50 border-amber-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CloudOff className="h-5 w-5 text-amber-600" />
                <div>
                  <div className="font-semibold text-amber-700">
                    {pendingEntries.length} entries pending sync
                  </div>
                  <div className="text-xs text-amber-600">
                    Total: {formatCurrency(getTotalAmount(pendingEntries))}
                  </div>
                </div>
              </div>
              <Button
                onClick={handleSync}
                disabled={!isOnline || isSyncing}
                size="sm"
                className="bg-amber-600 hover:bg-amber-700"
              >
                {isSyncing ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                ) : (
                  <Upload className="h-4 w-4" />
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Add New Entry */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Add Cost Entry
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium mb-1 block">
                Amount (£)
              </label>
              <Input
                type="number"
                placeholder="0.00"
                value={newEntry.amount}
                onChange={(e) =>
                  setNewEntry((prev) => ({ ...prev, amount: e.target.value }))
                }
                className="text-lg"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Category</label>
              <select
                value={newEntry.category}
                onChange={(e) =>
                  setNewEntry((prev) => ({ ...prev, category: e.target.value }))
                }
                className="w-full p-2 border rounded-md bg-background"
              >
                {categories.map((cat) => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium mb-1 block">
              Description
            </label>
            <Input
              placeholder="What was this cost for?"
              value={newEntry.description}
              onChange={(e) =>
                setNewEntry((prev) => ({
                  ...prev,
                  description: e.target.value,
                }))
              }
            />
          </div>

          <Button
            onClick={addEntry}
            disabled={!newEntry.amount || !newEntry.description}
            className="w-full h-12 touch-manipulation"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Entry {!isOnline && '(Offline)'}
          </Button>
        </CardContent>
      </Card>

      {/* Pending Entries */}
      {pendingEntries.length > 0 && (
        <Card className="border-amber-300">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2 text-amber-700">
              <CloudOff className="h-4 w-4" />
              Pending Sync ({pendingEntries.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-40 overflow-y-auto">
              {pendingEntries.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-center justify-between p-3 bg-amber-50 rounded-lg"
                >
                  <div className="flex-1">
                    <div className="font-medium">{entry.description}</div>
                    <div className="text-sm text-muted-foreground">
                      {entry.category} • {entry.timestamp.toLocaleTimeString()}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-amber-700">
                      {formatCurrency(entry.amount)}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeEntry(entry.id, true)}
                      className="text-red-500 hover:text-red-700 p-1"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Synced Entries */}
      {entries.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Cloud className="h-4 w-4 text-green-500" />
              Synced Entries ({entries.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-40 overflow-y-auto">
              {entries.slice(-5).map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-center justify-between p-3 bg-green-50 rounded-lg"
                >
                  <div className="flex-1">
                    <div className="font-medium">{entry.description}</div>
                    <div className="text-sm text-muted-foreground">
                      {entry.category} • {entry.timestamp.toLocaleTimeString()}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-green-700">
                      {formatCurrency(entry.amount)}
                    </span>
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  </div>
                </div>
              ))}
            </div>

            {entries.length > 5 && (
              <div className="text-center text-sm text-muted-foreground mt-2">
                and {entries.length - 5} more entries
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Summary */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="p-4">
          <div className="grid grid-cols-2 gap-4 text-center">
            <div>
              <div className="text-sm text-muted-foreground">Total Synced</div>
              <div className="text-lg font-bold text-green-600">
                {formatCurrency(getTotalAmount(entries))}
              </div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Pending Sync</div>
              <div className="text-lg font-bold text-amber-600">
                {formatCurrency(getTotalAmount(pendingEntries))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Manual Sync Button */}
      {isOnline && pendingEntries.length > 0 && (
        <Button
          onClick={handleSync}
          disabled={isSyncing}
          className="w-full h-12 bg-blue-600 hover:bg-blue-700 touch-manipulation"
        >
          {isSyncing ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
              Syncing...
            </>
          ) : (
            <>
              <Upload className="h-4 w-4 mr-2" />
              Sync {pendingEntries.length} Entries
            </>
          )}
        </Button>
      )}
    </div>
  );
}
