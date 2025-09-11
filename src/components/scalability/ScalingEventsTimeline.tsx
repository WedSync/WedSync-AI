'use client';

import React, { useState, useMemo } from 'react';
import { ScalingEvent, ManualScalingAction } from '@/types/scalability';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  TrendingUp,
  TrendingDown,
  User,
  Zap,
  AlertTriangle,
  CheckCircle,
  Clock,
  Activity,
  Filter,
  MoreHorizontal,
} from 'lucide-react';

interface ScalingEventsTimelineProps {
  events: ScalingEvent[];
  onEventDetails: (event: ScalingEvent) => void;
  onManualScale: (action: ManualScalingAction) => void;
}

export const ScalingEventsTimeline: React.FC<ScalingEventsTimelineProps> = ({
  events,
  onEventDetails,
  onManualScale,
}) => {
  const [filter, setFilter] = useState<
    'all' | 'scale_up' | 'scale_down' | 'emergency'
  >('all');
  const [timeRange, setTimeRange] = useState<'1h' | '6h' | '24h' | '7d'>('24h');

  // Filter and sort events
  const filteredEvents = useMemo(() => {
    return events
      .filter((event) => filter === 'all' || event.type === filter)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, 50); // Limit for performance
  }, [events, filter]);

  const formatRelativeTime = (date: Date): string => {
    const now = Date.now();
    const diff = now - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    return `${minutes}m ago`;
  };

  const getEventIcon = (event: ScalingEvent) => {
    switch (event.type) {
      case 'scale_up':
        return <TrendingUp className="w-4 h-4" />;
      case 'scale_down':
        return <TrendingDown className="w-4 h-4" />;
      case 'manual_override':
        return <User className="w-4 h-4" />;
      case 'emergency_scale':
        return <Zap className="w-4 h-4" />;
      default:
        return <Activity className="w-4 h-4" />;
    }
  };

  const getEventColor = (event: ScalingEvent) => {
    if (!event.success) return 'text-red-600 bg-red-50 border-red-200';

    switch (event.type) {
      case 'scale_up':
        return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'scale_down':
        return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'emergency_scale':
        return 'text-red-600 bg-red-50 border-red-200';
      case 'manual_override':
        return 'text-purple-600 bg-purple-50 border-purple-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  return (
    <Card className="scaling-events-timeline">
      <div className="timeline-header p-6 pb-4 border-b">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">
            Scaling Events
          </h3>

          <div className="timeline-controls flex items-center space-x-4">
            {/* Event Type Filter */}
            <div className="event-filter flex items-center bg-gray-100 rounded-lg p-1">
              {[
                { key: 'all', label: 'All', count: events.length },
                {
                  key: 'scale_up',
                  label: 'Scale Up',
                  count: events.filter((e) => e.type === 'scale_up').length,
                },
                {
                  key: 'scale_down',
                  label: 'Scale Down',
                  count: events.filter((e) => e.type === 'scale_down').length,
                },
                {
                  key: 'emergency',
                  label: 'Emergency',
                  count: events.filter((e) => e.type === 'emergency_scale')
                    .length,
                },
              ].map((filterOption) => (
                <Button
                  key={filterOption.key}
                  variant={filter === filterOption.key ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setFilter(filterOption.key as any)}
                  className="px-3 py-1 text-xs"
                >
                  <span>{filterOption.label}</span>
                  <Badge variant="secondary" className="text-xs ml-1">
                    {filterOption.count}
                  </Badge>
                </Button>
              ))}
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                onManualScale({
                  service: 'web',
                  action: 'scale_up',
                  reason: 'Manual scale up from timeline',
                  emergency: false,
                })
              }
            >
              <TrendingUp className="w-4 h-4 mr-1" />
              Manual Scale
            </Button>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="timeline-stats grid grid-cols-4 gap-4">
          <div className="stat-item text-center">
            <div className="text-lg font-bold text-blue-600">
              {events.filter((e) => e.type === 'scale_up').length}
            </div>
            <div className="text-xs text-gray-600">Scale Up Events</div>
          </div>
          <div className="stat-item text-center">
            <div className="text-lg font-bold text-orange-600">
              {events.filter((e) => e.type === 'scale_down').length}
            </div>
            <div className="text-xs text-gray-600">Scale Down Events</div>
          </div>
          <div className="stat-item text-center">
            <div className="text-lg font-bold text-green-600">
              {Math.round(
                (events.filter((e) => e.success).length / events.length) * 100,
              )}
              %
            </div>
            <div className="text-xs text-gray-600">Success Rate</div>
          </div>
          <div className="stat-item text-center">
            <div className="text-lg font-bold text-purple-600">
              {Math.round(
                events.reduce((sum, e) => sum + e.duration, 0) / events.length,
              )}
              s
            </div>
            <div className="text-xs text-gray-600">Avg Duration</div>
          </div>
        </div>
      </div>

      <div className="timeline-content p-6">
        {filteredEvents.length === 0 ? (
          <div className="empty-timeline text-center py-12">
            <Activity className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h4 className="text-lg font-medium text-gray-900 mb-2">
              No scaling events
            </h4>
            <p className="text-gray-600">
              No scaling events found for the selected filter. Events will
              appear here as they occur.
            </p>
          </div>
        ) : (
          <div className="events-timeline space-y-3">
            {filteredEvents.map((event, index) => (
              <EventItem
                key={event.id}
                event={event}
                isFirst={index === 0}
                onDetails={() => onEventDetails(event)}
              />
            ))}
          </div>
        )}
      </div>
    </Card>
  );
};

// Event Item Component
const EventItem: React.FC<{
  event: ScalingEvent;
  isFirst: boolean;
  onDetails: () => void;
}> = ({ event, isFirst, onDetails }) => {
  const formatRelativeTime = (date: Date): string => {
    const now = Date.now();
    const diff = now - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    return `${minutes}m ago`;
  };

  const getEventIcon = (event: ScalingEvent) => {
    switch (event.type) {
      case 'scale_up':
        return <TrendingUp className="w-4 h-4" />;
      case 'scale_down':
        return <TrendingDown className="w-4 h-4" />;
      case 'manual_override':
        return <User className="w-4 h-4" />;
      case 'emergency_scale':
        return <Zap className="w-4 h-4" />;
      default:
        return <Activity className="w-4 h-4" />;
    }
  };

  const getEventColor = (event: ScalingEvent) => {
    if (!event.success) return 'text-red-600 bg-red-50 border-red-200';

    switch (event.type) {
      case 'scale_up':
        return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'scale_down':
        return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'emergency_scale':
        return 'text-red-600 bg-red-50 border-red-200';
      case 'manual_override':
        return 'text-purple-600 bg-purple-50 border-purple-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  return (
    <div
      className={`event-item flex items-start space-x-4 ${
        isFirst
          ? 'relative before:absolute before:left-6 before:top-8 before:h-full before:w-0.5 before:bg-gray-200'
          : 'relative before:absolute before:left-6 before:-top-3 before:h-full before:w-0.5 before:bg-gray-200'
      }`}
    >
      {/* Event Icon */}
      <div
        className={`event-icon flex-shrink-0 w-12 h-12 rounded-full border-2 flex items-center justify-center z-10 bg-white ${getEventColor(
          event,
        )
          .split(' ')
          .slice(1)
          .join(' ')}`}
      >
        {getEventIcon(event)}
      </div>

      {/* Event Content */}
      <Card className="event-content flex-1 hover:shadow-md transition-shadow">
        <div className="p-4">
          <div className="flex items-start justify-between mb-2">
            <div className="event-header">
              <div className="flex items-center space-x-2 mb-1">
                <h4 className="font-medium text-gray-900 capitalize">
                  {event.type.replace('_', ' ')}
                </h4>
                <Badge className={getEventColor(event)}>{event.service}</Badge>
                {event.weddingContext && (
                  <Badge
                    variant="outline"
                    className="text-pink-600 border-pink-200"
                  >
                    Wedding Event
                  </Badge>
                )}
                {event.type === 'emergency_scale' && (
                  <Badge className="bg-red-100 text-red-800 border-red-200 animate-pulse">
                    EMERGENCY
                  </Badge>
                )}
              </div>

              <p className="text-sm text-gray-700">{event.reason}</p>
            </div>

            <div className="event-meta text-right">
              <div className="flex items-center space-x-2 text-xs text-gray-500 mb-1">
                <Clock className="w-3 h-3" />
                <span>{formatRelativeTime(event.timestamp)}</span>
              </div>
              <div className="flex items-center space-x-2">
                {event.success ? (
                  <CheckCircle className="w-4 h-4 text-green-500" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-red-500" />
                )}
                <span
                  className={`text-xs font-medium ${
                    event.success ? 'text-green-600' : 'text-red-600'
                  }`}
                >
                  {event.success ? 'Success' : 'Failed'}
                </span>
              </div>
            </div>
          </div>

          {/* Event Details */}
          <div className="event-details grid grid-cols-1 md:grid-cols-3 gap-4 mt-3 p-3 bg-gray-50 rounded">
            <div className="detail-group">
              <div className="text-xs text-gray-500 mb-1">Instance Change</div>
              <div className="flex items-center space-x-2">
                <span className="font-mono text-sm">
                  {event.beforeState.instances}
                </span>
                <span className="text-gray-400">→</span>
                <span className="font-mono text-sm font-bold">
                  {event.afterState.instances}
                </span>
                <Badge variant="outline" className="text-xs">
                  {event.afterState.instances > event.beforeState.instances
                    ? '+'
                    : ''}
                  {event.afterState.instances - event.beforeState.instances}
                </Badge>
              </div>
            </div>

            <div className="detail-group">
              <div className="text-xs text-gray-500 mb-1">Duration</div>
              <div className="font-mono text-sm">
                {event.duration}s
                {event.duration > 60 && (
                  <span className="text-xs text-gray-500 ml-1">
                    ({Math.floor(event.duration / 60)}m {event.duration % 60}s)
                  </span>
                )}
              </div>
            </div>

            <div className="detail-group">
              <div className="text-xs text-gray-500 mb-1">Triggered By</div>
              <div className="text-sm">
                {event.triggeredBy.startsWith('policy_') ? (
                  <Badge variant="outline" className="text-xs">
                    Auto Policy
                  </Badge>
                ) : event.triggeredBy.startsWith('user_') ? (
                  <Badge variant="outline" className="text-xs">
                    Manual
                  </Badge>
                ) : (
                  <span className="text-xs text-gray-600">
                    {event.triggeredBy}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Wedding Context */}
          {event.weddingContext && (
            <div className="wedding-context mt-3 p-3 bg-pink-50 rounded border border-pink-200">
              <div className="flex items-center space-x-2 mb-2">
                <div className="w-2 h-2 bg-pink-500 rounded-full" />
                <span className="text-sm font-medium text-pink-800">
                  Wedding Event Context
                </span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                {event.weddingContext.weddingId && (
                  <div>
                    <span className="text-pink-600">Wedding ID:</span>
                    <div className="font-mono">
                      {event.weddingContext.weddingId.slice(-8)}
                    </div>
                  </div>
                )}
                {event.weddingContext.weddingDate && (
                  <div>
                    <span className="text-pink-600">Date:</span>
                    <div>
                      {event.weddingContext.weddingDate.toLocaleDateString()}
                    </div>
                  </div>
                )}
                {event.weddingContext.expectedGuests && (
                  <div>
                    <span className="text-pink-600">Guests:</span>
                    <div>
                      {event.weddingContext.expectedGuests.toLocaleString()}
                    </div>
                  </div>
                )}
                {event.weddingContext.weddingType && (
                  <div>
                    <span className="text-pink-600">Type:</span>
                    <div className="capitalize">
                      {event.weddingContext.weddingType}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Error Details */}
          {!event.success && event.errorMessage && (
            <div className="error-details mt-3 p-3 bg-red-50 rounded border border-red-200">
              <div className="flex items-center space-x-2 mb-1">
                <AlertTriangle className="w-4 h-4 text-red-500" />
                <span className="text-sm font-medium text-red-800">
                  Error Details
                </span>
              </div>
              <p className="text-sm text-red-700">{event.errorMessage}</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="event-actions flex items-center justify-between mt-4 pt-3 border-t">
            <div className="flex items-center space-x-2 text-xs text-gray-500">
              <span>Event ID:</span>
              <code className="bg-gray-100 px-1 rounded">
                {event.id.slice(-8)}
              </code>
            </div>

            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={onDetails}
                className="text-xs"
              >
                <MoreHorizontal className="w-3 h-3 mr-1" />
                View Details
              </Button>

              {!event.success && (
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs text-blue-600 border-blue-200 hover:bg-blue-50"
                >
                  <Activity className="w-3 h-3 mr-1" />
                  Retry
                </Button>
              )}
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default ScalingEventsTimeline;
