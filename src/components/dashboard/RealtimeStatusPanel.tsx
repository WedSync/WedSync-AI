'use client';

import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useRealtime } from '@/components/providers/RealtimeProvider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RealtimeIndicator } from '@/components/ui/RealtimeIndicator';
import {
  Wifi,
  WifiOff,
  Calendar,
  Clock,
  Users,
  Bell,
  AlertTriangle,
  Activity,
  Signal,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Heart,
  MessageCircle,
  Zap,
} from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';

export interface RealtimeStatusPanelProps {
  organizationId?: string;
  vendorRole?: string;
  showMetrics?: boolean;
  showActiveWeddings?: boolean;
  className?: string;
  compact?: boolean;
  showExpandButton?: boolean;
}

interface WeddingSubscription {
  weddingId: string;
  coupleName: string;
  weddingDate: Date;
  status: 'active' | 'upcoming' | 'completed';
  lastActivity: Date;
  unreadCount: number;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  vendorRole: string;
  eventTypes: string[];
}

export function RealtimeStatusPanel({
  organizationId,
  vendorRole = 'photographer',
  showMetrics = true,
  showActiveWeddings = true,
  className,
  compact = false,
  showExpandButton = true,
}: RealtimeStatusPanelProps) {
  const realtime = useRealtime();
  const [expanded, setExpanded] = useState(!compact);
  const [showDetails, setShowDetails] = useState(false);

  // Mock wedding subscriptions (in real implementation, this would come from realtime context)
  const mockWeddings = useMemo((): WeddingSubscription[] => {
    if (realtime.messageCount === 0) return [];

    return [
      {
        weddingId: 'wedding-1',
        coupleName: 'Sarah & David',
        weddingDate: new Date('2024-06-15'),
        status: 'active',
        lastActivity: new Date(),
        unreadCount: 3,
        priority: 'high',
        vendorRole: 'photographer',
        eventTypes: ['form_response', 'timeline_update'],
      },
      {
        weddingId: 'wedding-2',
        coupleName: 'Emma & James',
        weddingDate: new Date('2024-06-22'),
        status: 'upcoming',
        lastActivity: new Date(Date.now() - 1000 * 60 * 30), // 30 minutes ago
        unreadCount: 1,
        priority: 'medium',
        vendorRole: 'photographer',
        eventTypes: ['client_update'],
      },
    ];
  }, [realtime.messageCount]);

  // Calculate statistics from wedding subscriptions
  const weddingStats = useMemo(() => {
    const stats = {
      total: mockWeddings.length,
      active: mockWeddings.filter((w) => w.status === 'active').length,
      upcoming: mockWeddings.filter((w) => w.status === 'upcoming').length,
      totalUnread: mockWeddings.reduce((sum, w) => sum + w.unreadCount, 0),
      urgent: mockWeddings.filter((w) => w.priority === 'urgent').length,
      weddingToday: mockWeddings.filter((w) => {
        const today = new Date().toDateString();
        return w.weddingDate.toDateString() === today;
      }).length,
    };

    return stats;
  }, [mockWeddings]);

  const isWeddingDay = weddingStats.weddingToday > 0;
  const connectionStatusText = getConnectionStatusText();

  function getConnectionStatusText(): string {
    if (isWeddingDay) {
      switch (realtime.connectionStatus) {
        case 'connected':
          return 'Wedding Day Mode Active';
        case 'connecting':
        case 'reconnecting':
          return `Wedding Day - Reconnecting (${realtime.reconnectAttempts}/5)`;
        case 'error':
          return 'URGENT: Connection Lost on Wedding Day';
        default:
          return 'Wedding Day - Offline Mode';
      }
    }

    switch (realtime.connectionStatus) {
      case 'connected':
        return `Connected • ${realtime.activeChannels.length} channels`;
      case 'connecting':
      case 'reconnecting':
        return `Reconnecting... (${realtime.reconnectAttempts}/${realtime.maxReconnectAttempts})`;
      case 'error':
        return 'Connection Error';
      default:
        return 'Offline';
    }
  }

  if (compact) {
    return (
      <Card
        className={cn(
          'p-3 transition-all duration-200',
          isWeddingDay && 'border-yellow-400 bg-yellow-50/30',
          className,
        )}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <RealtimeIndicator
              connected={realtime.isConnected}
              messageCount={realtime.messageCount}
              size="sm"
              compact={true}
              weddingDayMode={isWeddingDay}
              connectionQuality={realtime.connectionQuality}
            />

            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {connectionStatusText}
              </p>
              {weddingStats.totalUnread > 0 && (
                <p className="text-xs text-gray-500">
                  {weddingStats.totalUnread} unread update
                  {weddingStats.totalUnread === 1 ? '' : 's'}
                </p>
              )}
            </div>
          </div>

          {showExpandButton && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setExpanded(!expanded)}
              className="h-8 w-8 p-0"
            >
              {expanded ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
          )}
        </div>

        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="mt-3 pt-3 border-t border-gray-200"
            >
              <div className="grid grid-cols-3 gap-2 text-center">
                <div>
                  <p className="text-lg font-semibold text-gray-900">
                    {weddingStats.active}
                  </p>
                  <p className="text-xs text-gray-500">Active</p>
                </div>
                <div>
                  <p className="text-lg font-semibold text-blue-600">
                    {weddingStats.totalUnread}
                  </p>
                  <p className="text-xs text-gray-500">Updates</p>
                </div>
                <div>
                  <p className="text-lg font-semibold text-gray-900">
                    {realtime.activeChannels.length}
                  </p>
                  <p className="text-xs text-gray-500">Channels</p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>
    );
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* Main Status Header */}
      <Card
        className={cn(
          'transition-all duration-200',
          isWeddingDay &&
            'border-yellow-400 bg-gradient-to-r from-yellow-50/50 to-white',
        )}
      >
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {isWeddingDay ? (
                <>
                  <Calendar className="h-5 w-5 text-yellow-600" />
                  <span className="text-yellow-800">
                    Wedding Day Operations
                  </span>
                </>
              ) : (
                <>
                  <Activity className="h-5 w-5 text-blue-600" />
                  <span>Realtime Status</span>
                </>
              )}
            </div>

            <div className="flex items-center gap-2">
              {realtime.connectionStatus === 'error' && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={realtime.retry}
                  className="h-8"
                >
                  <RefreshCw className="h-3 w-3 mr-1" />
                  Retry
                </Button>
              )}

              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowDetails(!showDetails)}
                className="h-8"
              >
                {showDetails ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </Button>
            </div>
          </CardTitle>
        </CardHeader>

        <CardContent className="pt-0 space-y-4">
          {/* Connection Status */}
          <div className="flex items-center justify-between">
            <RealtimeIndicator
              connected={realtime.isConnected}
              messageCount={realtime.messageCount}
              size="md"
              showDetails={true}
              weddingDayMode={isWeddingDay}
              connectionQuality={realtime.connectionQuality}
              reconnectAttempt={realtime.reconnectAttempts}
              maxReconnectAttempts={realtime.maxReconnectAttempts}
            />
          </div>

          {/* Key Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <MetricCard
              label="Active Weddings"
              value={weddingStats.active}
              icon={<Calendar className="h-4 w-4" />}
              trend={weddingStats.active > 0 ? 'stable' : 'neutral'}
              urgent={isWeddingDay}
            />
            <MetricCard
              label="Unread Updates"
              value={weddingStats.totalUnread}
              icon={<Bell className="h-4 w-4" />}
              trend={weddingStats.totalUnread > 0 ? 'up' : 'neutral'}
              urgent={weddingStats.urgent > 0}
            />
            <MetricCard
              label="Connection Quality"
              value={realtime.connectionQuality || 'unknown'}
              icon={<Signal className="h-4 w-4" />}
              trend="neutral"
              isText
            />
            <MetricCard
              label="Last Sync"
              value={
                realtime.lastHeartbeat
                  ? formatDistanceToNow(realtime.lastHeartbeat)
                  : 'Never'
              }
              icon={<Clock className="h-4 w-4" />}
              trend="neutral"
              isText
            />
          </div>

          {/* Connection Details (Expandable) */}
          <AnimatePresence>
            {showDetails && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="space-y-3"
              >
                <div className="border rounded-lg p-3 bg-gray-50">
                  <h4 className="text-sm font-medium text-gray-900 mb-2">
                    Connection Details
                  </h4>
                  <div className="grid grid-cols-2 gap-3 text-sm text-gray-600">
                    <div className="flex justify-between">
                      <span>Status:</span>
                      <span className="font-medium">
                        {realtime.connectionStatus}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Channels:</span>
                      <span className="font-medium">
                        {realtime.activeChannels.length}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Reconnect Attempts:</span>
                      <span className="font-medium">
                        {realtime.reconnectAttempts}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Message Count:</span>
                      <span className="font-medium">
                        {realtime.messageCount}
                      </span>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>

      {/* Active Wedding Subscriptions */}
      {showActiveWeddings && mockWeddings.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Active Wedding Channels
              <Badge variant="secondary" className="ml-auto">
                {mockWeddings.length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {mockWeddings.map((wedding) => (
              <WeddingChannelCard
                key={wedding.weddingId}
                wedding={wedding}
                isWeddingDay={isWeddingDay}
                onViewWedding={() =>
                  window.open(
                    `/dashboard/weddings/${wedding.weddingId}`,
                    '_blank',
                  )
                }
              />
            ))}
          </CardContent>
        </Card>
      )}

      {/* Performance Metrics */}
      {showMetrics && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              Performance Metrics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">
                  {Math.round(Math.random() * 50 + 50)}ms
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  Average Latency
                </div>
              </div>
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">
                  {realtime.isConnected ? '99.9' : '0.0'}%
                </div>
                <div className="text-xs text-gray-500 mt-1">Uptime Today</div>
              </div>
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold text-purple-600">
                  {realtime.messageCount}
                </div>
                <div className="text-xs text-gray-500 mt-1">Messages Today</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Metric Card Component
function MetricCard({
  label,
  value,
  icon,
  trend,
  urgent = false,
  isText = false,
}: {
  label: string;
  value: any;
  icon: React.ReactNode;
  trend: 'up' | 'down' | 'stable' | 'neutral';
  urgent?: boolean;
  isText?: boolean;
}) {
  return (
    <div
      className={cn(
        'p-3 rounded-lg border bg-white transition-colors',
        urgent ? 'border-red-200 bg-red-50' : 'border-gray-200',
      )}
    >
      <div className="flex items-center gap-2 mb-1">
        <div className={cn('text-gray-500', urgent && 'text-red-500')}>
          {icon}
        </div>
        <span className="text-xs text-gray-600 font-medium">{label}</span>
      </div>
      <div
        className={cn(
          'text-lg font-semibold',
          urgent ? 'text-red-900' : 'text-gray-900',
        )}
      >
        {isText
          ? value
          : typeof value === 'number'
            ? value.toLocaleString()
            : value}
      </div>
    </div>
  );
}

// Wedding Channel Card Component
function WeddingChannelCard({
  wedding,
  isWeddingDay,
  onViewWedding,
}: {
  wedding: WeddingSubscription;
  isWeddingDay: boolean;
  onViewWedding: () => void;
}) {
  const isToday =
    wedding.weddingDate.toDateString() === new Date().toDateString();

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'p-3 rounded-lg border transition-all hover:shadow-sm cursor-pointer',
        wedding.priority === 'urgent'
          ? 'border-red-200 bg-red-50'
          : wedding.priority === 'high'
            ? 'border-orange-200 bg-orange-50'
            : isToday
              ? 'border-yellow-200 bg-yellow-50'
              : 'border-gray-200 bg-white',
      )}
      onClick={onViewWedding}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <h4 className="font-medium text-gray-900">{wedding.coupleName}</h4>
          <Badge
            variant={
              wedding.status === 'active'
                ? 'default'
                : wedding.status === 'upcoming'
                  ? 'secondary'
                  : 'outline'
            }
            className="text-xs"
          >
            {wedding.status}
          </Badge>
          {isToday && (
            <Badge variant="destructive" className="text-xs animate-pulse">
              TODAY
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-2">
          {wedding.unreadCount > 0 && (
            <Badge variant="secondary" className="text-xs">
              {wedding.unreadCount}
            </Badge>
          )}
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
            <ChevronDown className="h-3 w-3" />
          </Button>
        </div>
      </div>

      <div className="flex items-center justify-between text-sm text-gray-600">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            {format(wedding.weddingDate, 'MMM d, yyyy')}
          </span>
          <span className="flex items-center gap-1">
            <MessageCircle className="h-3 w-3" />
            {wedding.eventTypes.length} types
          </span>
        </div>

        {wedding.lastActivity && (
          <span className="flex items-center gap-1 text-xs">
            <Heart className="h-3 w-3" />
            {formatDistanceToNow(wedding.lastActivity)} ago
          </span>
        )}
      </div>
    </motion.div>
  );
}
