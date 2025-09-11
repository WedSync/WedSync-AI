'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RefreshCw, Users, Clock, CheckCircle } from 'lucide-react';

interface GuestSyncStats {
  total_guests: number;
  last_sync: string | null;
  synced_count: number;
  sync_needed: boolean;
  by_rsvp_status: Record<string, number>;
  by_category: Record<string, number>;
  by_side: Record<string, number>;
}

interface Guest {
  id: string;
  name: string;
  first_name: string;
  last_name: string;
  email?: string;
  category: string;
  side: string;
  rsvp_status: string;
  table_number?: number;
  dietary_restrictions?: string;
  household?: {
    id: string;
    name: string;
    address: any;
  } | null;
}

interface GuestListSyncProps {
  websiteId: string;
  className?: string;
  autoSync?: boolean;
}

export function GuestListSync({
  websiteId,
  className = '',
  autoSync = false,
}: GuestListSyncProps) {
  const [stats, setStats] = useState<GuestSyncStats | null>(null);
  const [guests, setGuests] = useState<Guest[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('overview');

  const fetchSyncStatus = async () => {
    try {
      const response = await fetch(
        `/api/wedding-website/guests/sync?website_id=${websiteId}`,
      );
      const result = await response.json();

      if (result.success) {
        setStats(result.data);
        setError(null);
      } else {
        setError(result.error || 'Failed to fetch sync status');
      }
    } catch (err) {
      setError('Error connecting to server');
      console.error('Error fetching sync status:', err);
    } finally {
      setLoading(false);
    }
  };

  const performSync = async (
    options: {
      includeCategories?: string[];
      includeRSVPStatus?: string[];
    } = {},
  ) => {
    setSyncing(true);
    try {
      const response = await fetch('/api/wedding-website/guests/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          websiteId,
          ...options,
        }),
      });

      const result = await response.json();

      if (result.success) {
        setGuests(result.data.guests);
        setStats((prev) =>
          prev
            ? {
                ...prev,
                last_sync: result.data.summary.last_sync,
                synced_count: result.data.summary.total_guests,
                sync_needed: false,
              }
            : null,
        );
        setError(null);
      } else {
        setError(result.error || 'Failed to sync guest list');
      }
    } catch (err) {
      setError('Error during sync');
      console.error('Error syncing guests:', err);
    } finally {
      setSyncing(false);
    }
  };

  useEffect(() => {
    fetchSyncStatus();

    if (autoSync) {
      // Auto sync every 5 minutes
      const interval = setInterval(fetchSyncStatus, 5 * 60 * 1000);
      return () => clearInterval(interval);
    }
  }, [websiteId, autoSync]);

  const formatTimestamp = (timestamp: string | null) => {
    if (!timestamp) return 'Never';
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

  const getRSVPStatusColor = (status: string) => {
    switch (status) {
      case 'attending':
        return 'bg-green-100 text-green-800';
      case 'not_attending':
        return 'bg-red-100 text-red-800';
      case 'maybe':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'family':
        return 'bg-blue-100 text-blue-800';
      case 'friends':
        return 'bg-green-100 text-green-800';
      case 'work':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <Card className={`animate-pulse ${className}`}>
        <CardHeader>
          <div className="h-6 bg-gray-200 rounded w-48"></div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="h-4 bg-gray-200 rounded w-full"></div>
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !stats) {
    return (
      <Card className={`border-red-200 ${className}`}>
        <CardContent className="pt-6">
          <p className="text-red-600 text-center">
            {error || 'Unable to load guest sync data'}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Users className="h-5 w-5" />
              <span>Guest List Sync</span>
            </div>
            <div className="flex items-center space-x-2">
              {stats.sync_needed && (
                <Badge
                  variant="outline"
                  className="bg-yellow-50 text-yellow-700"
                >
                  Sync Needed
                </Badge>
              )}
              {!stats.sync_needed && stats.last_sync && (
                <Badge variant="outline" className="bg-green-50 text-green-700">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Up to Date
                </Badge>
              )}
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Sync Status */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {stats.total_guests}
              </div>
              <div className="text-sm text-gray-600">Total Guests</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {stats.synced_count}
              </div>
              <div className="text-sm text-gray-600">Synced</div>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center space-x-1">
                <Clock className="h-4 w-4 text-gray-500" />
                <div className="text-sm text-gray-600">
                  {formatTimestamp(stats.last_sync)}
                </div>
              </div>
              <div className="text-xs text-gray-500">Last Sync</div>
            </div>
          </div>

          {/* Sync Actions */}
          <div className="flex space-x-3">
            <Button
              onClick={() => performSync()}
              disabled={syncing}
              className="flex items-center space-x-2"
            >
              <RefreshCw
                className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`}
              />
              <span>{syncing ? 'Syncing...' : 'Sync All Guests'}</span>
            </Button>
            <Button
              variant="outline"
              onClick={() => performSync({ includeRSVPStatus: ['attending'] })}
              disabled={syncing}
            >
              Sync Attending Only
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Guest Statistics Tabs */}
      <Card>
        <CardHeader>
          <CardTitle>Guest Statistics</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="categories">Categories</TabsTrigger>
              <TabsTrigger value="rsvp">RSVP Status</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {Object.entries(stats.by_side).map(([side, count]) => (
                  <div
                    key={side}
                    className="text-center p-4 bg-gray-50 rounded-lg"
                  >
                    <div className="text-lg font-semibold">{count}</div>
                    <div className="text-sm text-gray-600 capitalize">
                      {side}
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="categories" className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {Object.entries(stats.by_category).map(([category, count]) => (
                  <div key={category} className="text-center">
                    <Badge
                      className={getCategoryColor(category)}
                      variant="secondary"
                    >
                      {category}: {count}
                    </Badge>
                  </div>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="rsvp" className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {Object.entries(stats.by_rsvp_status).map(([status, count]) => (
                  <div key={status} className="text-center">
                    <Badge
                      className={getRSVPStatusColor(status)}
                      variant="secondary"
                    >
                      {status}: {count}
                    </Badge>
                  </div>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Guest List Preview */}
      {guests.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Sync - Guest Preview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {guests.slice(0, 20).map((guest) => (
                <div
                  key={guest.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div>
                    <div className="font-medium">{guest.name}</div>
                    <div className="text-sm text-gray-600 space-x-2">
                      <Badge
                        className={getCategoryColor(guest.category)}
                        variant="secondary"
                        size="sm"
                      >
                        {guest.category}
                      </Badge>
                      <Badge
                        className={getRSVPStatusColor(guest.rsvp_status)}
                        variant="secondary"
                        size="sm"
                      >
                        {guest.rsvp_status}
                      </Badge>
                    </div>
                  </div>
                  {guest.table_number && (
                    <div className="text-sm text-gray-500">
                      Table {guest.table_number}
                    </div>
                  )}
                </div>
              ))}
              {guests.length > 20 && (
                <div className="text-center text-gray-500 text-sm">
                  ... and {guests.length - 20} more guests
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
