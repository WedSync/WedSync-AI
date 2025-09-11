'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

interface RSVPStats {
  total_responses: number;
  attending: number;
  not_attending: number;
  maybe: number;
  total_guests_attending: number;
  response_rate: number;
  recent_responses: Array<{
    guest_name: string;
    response_status: 'attending' | 'not_attending' | 'maybe';
    party_size: number;
    timestamp: string;
  }>;
}

interface LiveRSVPDisplayProps {
  websiteId: string;
  className?: string;
  showRecentResponses?: boolean;
  refreshInterval?: number;
}

export function LiveRSVPDisplay({
  websiteId,
  className = '',
  showRecentResponses = true,
  refreshInterval = 30000, // 30 seconds
}: LiveRSVPDisplayProps) {
  const [stats, setStats] = useState<RSVPStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRSVPStats = async () => {
    try {
      const response = await fetch(
        `/api/wedding-website/rsvp/live?website_id=${websiteId}`,
      );
      const result = await response.json();

      if (result.success) {
        setStats(result.data);
        setError(null);
      } else {
        setError(result.error || 'Failed to fetch RSVP data');
      }
    } catch (err) {
      setError('Error connecting to server');
      console.error('Error fetching RSVP stats:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRSVPStats();

    // Set up polling for live updates
    const interval = setInterval(fetchRSVPStats, refreshInterval);

    return () => clearInterval(interval);
  }, [websiteId, refreshInterval]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'attending':
        return 'bg-green-500';
      case 'not_attending':
        return 'bg-red-500';
      case 'maybe':
        return 'bg-yellow-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'attending':
        return 'Attending';
      case 'not_attending':
        return "Can't Attend";
      case 'maybe':
        return 'Maybe';
      default:
        return 'Unknown';
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60 * 60),
    );

    if (diffInHours < 1) {
      const diffInMinutes = Math.floor(
        (now.getTime() - date.getTime()) / (1000 * 60),
      );
      return diffInMinutes < 1 ? 'Just now' : `${diffInMinutes}m ago`;
    } else if (diffInHours < 24) {
      return `${diffInHours}h ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  if (loading) {
    return (
      <Card className={`animate-pulse ${className}`}>
        <CardHeader>
          <div className="h-6 bg-gray-200 rounded w-32"></div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="h-4 bg-gray-200 rounded w-full"></div>
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
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
            {error || 'Unable to load RSVP data'}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Main Stats Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>RSVP Status</span>
            <Badge variant="outline">{stats.response_rate}% responded</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Response Rate Progress */}
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span>Response Rate</span>
              <span>{stats.response_rate}%</span>
            </div>
            <Progress value={stats.response_rate} className="h-2" />
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {stats.attending}
              </div>
              <div className="text-sm text-gray-600">Attending</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">
                {stats.not_attending}
              </div>
              <div className="text-sm text-gray-600">Can't Attend</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">
                {stats.maybe}
              </div>
              <div className="text-sm text-gray-600">Maybe</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {stats.total_guests_attending}
              </div>
              <div className="text-sm text-gray-600">Total Guests</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent Responses */}
      {showRecentResponses && stats.recent_responses.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Responses</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.recent_responses.map((response, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center space-x-3">
                    <div
                      className={`w-3 h-3 rounded-full ${getStatusColor(response.response_status)}`}
                    />
                    <div>
                      <div className="font-medium">{response.guest_name}</div>
                      <div className="text-sm text-gray-600">
                        {getStatusText(response.response_status)}
                        {response.response_status === 'attending' &&
                          response.party_size > 1 &&
                          ` (${response.party_size} guests)`}
                      </div>
                    </div>
                  </div>
                  <div className="text-sm text-gray-500">
                    {formatTimestamp(response.timestamp)}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Live Indicator */}
      <div className="flex items-center justify-center space-x-2 text-sm text-gray-500">
        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
        <span>Live updates every {refreshInterval / 1000} seconds</span>
      </div>
    </div>
  );
}
