'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRealtimeConnection } from '@/hooks/useRealtime';
import { ActivityService } from '@/lib/activity/service';
import { ActivityItem } from './ActivityItem';
import { ActivityFilter } from './ActivityFilter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import {
  RefreshCw,
  Search,
  Filter,
  Eye,
  EyeOff,
  MoreVertical,
} from 'lucide-react';
import {
  ActivityFeed as ActivityFeedType,
  ActivityFeedInsert,
} from '@/types/communications';
import { FixedSizeList as List } from 'react-window';

interface ActivityFeedProps {
  organizationId: string;
  userId: string;
  entityType?: string;
  entityId?: string;
  showFilter?: boolean;
  showSearch?: boolean;
  showAnalytics?: boolean;
  height?: number;
  autoRefresh?: boolean;
  refreshInterval?: number;
  pageSize?: number;
  enableVirtualization?: boolean;
  onActivityClick?: (activity: ActivityFeedType) => void;
  onMarkAsRead?: (activityId: string) => void;
}

interface FilterState {
  entityTypes: string[];
  activityTypes: string[];
  dateRange: { start: Date | null; end: Date | null };
  readStatus: 'all' | 'read' | 'unread';
  actorTypes: string[];
}

export function ActivityFeed({
  organizationId,
  userId,
  entityType,
  entityId,
  showFilter = true,
  showSearch = true,
  showAnalytics = false,
  height = 600,
  autoRefresh = true,
  refreshInterval = 30000,
  pageSize = 50,
  enableVirtualization = true,
  onActivityClick,
  onMarkAsRead,
}: ActivityFeedProps) {
  const [activities, setActivities] = useState<ActivityFeedType[]>([]);
  const [filteredActivities, setFilteredActivities] = useState<
    ActivityFeedType[]
  >([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [currentPage, setCurrentPage] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [filters, setFilters] = useState<FilterState>({
    entityTypes: [],
    activityTypes: [],
    dateRange: { start: null, end: null },
    readStatus: 'all',
    actorTypes: [],
  });

  const supabase = await createClient();

  // Real-time connection for activity updates
  const { isConnected, send } = useRealtimeConnection(
    `activities:${organizationId}`,
    {
      autoReconnect: true,
      trackMetrics: true,
      onMessage: (message) => {
        if (message.event === 'activity:new') {
          const newActivity = message.payload as ActivityFeedType;
          setActivities((prev) => [newActivity, ...prev]);
          if (
            message.payload.target_user_ids?.includes(userId) ||
            message.payload.is_public
          ) {
            setUnreadCount((prev) => prev + 1);
          }
        } else if (message.event === 'activity:update') {
          const updatedActivity = message.payload as ActivityFeedType;
          setActivities((prev) =>
            prev.map((activity) =>
              activity.id === updatedActivity.id ? updatedActivity : activity,
            ),
          );
        }
      },
    },
  );

  // Load activities
  const loadActivities = useCallback(
    async (reset = false) => {
      try {
        if (reset) {
          setIsLoading(true);
          setCurrentPage(0);
        } else {
          setIsRefreshing(true);
        }

        let activitiesData: ActivityFeedType[];

        if (entityType && entityId) {
          activitiesData = await ActivityService.getActivitiesForEntity(
            organizationId,
            entityType,
            entityId,
            pageSize,
          );
        } else {
          activitiesData = await ActivityService.getActivitiesForUser(
            organizationId,
            userId,
            pageSize,
            reset ? 0 : currentPage * pageSize,
          );
        }

        if (reset) {
          setActivities(activitiesData);
        } else {
          setActivities((prev) => [...prev, ...activitiesData]);
        }

        setHasMore(activitiesData.length === pageSize);

        if (!reset) {
          setCurrentPage((prev) => prev + 1);
        }

        // Load unread count
        const count = await ActivityService.getUnreadCount(
          organizationId,
          userId,
        );
        setUnreadCount(count);
      } catch (error) {
        console.error('Error loading activities:', error);
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [organizationId, userId, entityType, entityId, pageSize, currentPage],
  );

  // Filter activities
  const applyFilters = useCallback(() => {
    let filtered = activities;

    // Text search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (activity) =>
          activity.title.toLowerCase().includes(query) ||
          (activity.description &&
            activity.description.toLowerCase().includes(query)) ||
          (activity.actor_name &&
            activity.actor_name.toLowerCase().includes(query)),
      );
    }

    // Entity type filter
    if (filters.entityTypes.length > 0) {
      filtered = filtered.filter((activity) =>
        filters.entityTypes.includes(activity.entity_type),
      );
    }

    // Activity type filter
    if (filters.activityTypes.length > 0) {
      filtered = filtered.filter((activity) =>
        filters.activityTypes.includes(activity.activity_type),
      );
    }

    // Actor type filter
    if (filters.actorTypes.length > 0) {
      filtered = filtered.filter((activity) =>
        filters.actorTypes.includes(activity.actor_type),
      );
    }

    // Read status filter
    if (filters.readStatus !== 'all') {
      const isRead = (activity: ActivityFeedType) =>
        activity.read_by?.includes(userId) || false;

      filtered = filtered.filter((activity) =>
        filters.readStatus === 'read' ? isRead(activity) : !isRead(activity),
      );
    }

    // Date range filter
    if (filters.dateRange.start || filters.dateRange.end) {
      filtered = filtered.filter((activity) => {
        const activityDate = new Date(activity.created_at);
        const start = filters.dateRange.start;
        const end = filters.dateRange.end;

        if (start && activityDate < start) return false;
        if (end && activityDate > end) return false;
        return true;
      });
    }

    setFilteredActivities(filtered);
  }, [activities, searchQuery, filters, userId]);

  // Handle mark as read
  const handleMarkAsRead = useCallback(
    async (activityId: string) => {
      try {
        await ActivityService.markAsRead(activityId, userId);

        setActivities((prev) =>
          prev.map((activity) => {
            if (activity.id === activityId) {
              const readBy = activity.read_by || [];
              return {
                ...activity,
                read_by: [...readBy, userId],
              };
            }
            return activity;
          }),
        );

        setUnreadCount((prev) => Math.max(0, prev - 1));
        onMarkAsRead?.(activityId);
      } catch (error) {
        console.error('Error marking activity as read:', error);
      }
    },
    [userId, onMarkAsRead],
  );

  // Handle mark all as read
  const handleMarkAllAsRead = useCallback(async () => {
    try {
      const unreadActivities = filteredActivities.filter(
        (activity) => !activity.read_by?.includes(userId),
      );

      await Promise.all(
        unreadActivities.map((activity) =>
          ActivityService.markAsRead(activity.id, userId),
        ),
      );

      setActivities((prev) =>
        prev.map((activity) => {
          if (!activity.read_by?.includes(userId)) {
            const readBy = activity.read_by || [];
            return {
              ...activity,
              read_by: [...readBy, userId],
            };
          }
          return activity;
        }),
      );

      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking all activities as read:', error);
    }
  }, [filteredActivities, userId]);

  // Load more activities (infinite scroll)
  const loadMore = useCallback(() => {
    if (!isLoading && !isRefreshing && hasMore) {
      loadActivities(false);
    }
  }, [isLoading, isRefreshing, hasMore, loadActivities]);

  // Apply filters when dependencies change
  useEffect(() => {
    applyFilters();
  }, [applyFilters]);

  // Initial load
  useEffect(() => {
    loadActivities(true);
  }, [organizationId, userId, entityType, entityId]);

  // Auto refresh
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      if (!isLoading && !isRefreshing) {
        loadActivities(true);
      }
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, isLoading, isRefreshing, loadActivities]);

  // Virtualized item renderer
  const VirtualizedItem = useCallback(
    ({ index, style }: { index: number; style: React.CSSProperties }) => {
      const activity = filteredActivities[index];
      if (!activity) return null;

      return (
        <div style={style}>
          <ActivityItem
            activity={activity}
            isRead={activity.read_by?.includes(userId) || false}
            onClick={() => onActivityClick?.(activity)}
            onMarkAsRead={() => handleMarkAsRead(activity.id)}
            showEntityInfo={!entityType}
          />
        </div>
      );
    },
    [filteredActivities, userId, onActivityClick, handleMarkAsRead, entityType],
  );

  // Scroll to load more
  const handleItemsRendered = useCallback(
    ({ visibleStopIndex }: { visibleStopIndex: number }) => {
      if (visibleStopIndex >= filteredActivities.length - 5) {
        loadMore();
      }
    },
    [filteredActivities.length, loadMore],
  );

  const itemHeight = 120; // Estimated height per activity item

  if (isLoading && activities.length === 0) {
    return (
      <Card className="p-6 space-y-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-2/3" />
          </div>
        ))}
      </Card>
    );
  }

  return (
    <Card className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <h3 className="text-lg font-semibold">Activity Feed</h3>
            {isConnected && (
              <Badge
                variant="outline"
                className="text-green-600 border-green-600"
              >
                Live
              </Badge>
            )}
            {unreadCount > 0 && (
              <Badge variant="destructive">{unreadCount}</Badge>
            )}
          </div>

          <div className="flex items-center space-x-2">
            {unreadCount > 0 && (
              <Button
                size="sm"
                variant="outline"
                onClick={handleMarkAllAsRead}
                className="text-xs"
              >
                <Eye className="w-3 h-3 mr-1" />
                Mark all read
              </Button>
            )}

            <Button
              size="sm"
              variant="outline"
              onClick={() => loadActivities(true)}
              disabled={isRefreshing}
            >
              <RefreshCw
                className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`}
              />
            </Button>

            {showFilter && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowFilters(!showFilters)}
              >
                <Filter className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Search */}
        {showSearch && (
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search activities..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        )}

        {/* Filters */}
        {showFilters && (
          <ActivityFilter
            filters={filters}
            onFiltersChange={setFilters}
            activities={activities}
          />
        )}
      </div>

      {/* Activity List */}
      <div className="flex-1 overflow-hidden">
        {filteredActivities.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-500">
            <div className="text-center">
              <div className="text-lg mb-2">No activities found</div>
              <div className="text-sm">
                {searchQuery ||
                Object.values(filters).some((f) =>
                  Array.isArray(f) ? f.length > 0 : f && f !== 'all',
                )
                  ? 'Try adjusting your filters'
                  : 'Activities will appear here as they happen'}
              </div>
            </div>
          </div>
        ) : enableVirtualization ? (
          <List
            height={height - 150} // Account for header
            itemCount={filteredActivities.length}
            itemSize={itemHeight}
            onItemsRendered={handleItemsRendered}
          >
            {VirtualizedItem}
          </List>
        ) : (
          <ScrollArea className="h-full">
            <div className="p-4 space-y-4">
              {filteredActivities.map((activity) => (
                <ActivityItem
                  key={activity.id}
                  activity={activity}
                  isRead={activity.read_by?.includes(userId) || false}
                  onClick={() => onActivityClick?.(activity)}
                  onMarkAsRead={() => handleMarkAsRead(activity.id)}
                  showEntityInfo={!entityType}
                />
              ))}

              {hasMore && (
                <div className="flex justify-center py-4">
                  <Button
                    variant="outline"
                    onClick={loadMore}
                    disabled={isLoading || isRefreshing}
                  >
                    {isLoading || isRefreshing ? (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                        Loading...
                      </>
                    ) : (
                      'Load More'
                    )}
                  </Button>
                </div>
              )}
            </div>
          </ScrollArea>
        )}
      </div>
    </Card>
  );
}
