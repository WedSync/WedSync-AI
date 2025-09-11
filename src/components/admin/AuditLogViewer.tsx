'use client';

import React, {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
} from 'react';
import { createClient } from '@/lib/supabase/client';
import { RealtimeChannel } from '@supabase/supabase-js';
import {
  ChevronDownIcon,
  ChevronRightIcon,
  SearchIcon,
  FilterIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import type {
  AuditEvent,
  AuditSearchFilters,
  AuditRiskLevel,
} from '@/types/audit';

interface AuditLogViewerProps {
  initialFilters?: Partial<AuditSearchFilters>;
  showActions?: boolean;
  compact?: boolean;
  realTimeUpdates?: boolean;
}

const ITEM_HEIGHT = 72;
const EXPANDED_HEIGHT = 200;
const PAGE_SIZE = 50;

// Custom hook for virtualization without external dependency
const useVirtualization = ({
  itemCount,
  itemHeight,
  containerHeight,
  getItemHeight,
}: {
  itemCount: number;
  itemHeight: number;
  containerHeight: number;
  getItemHeight?: (index: number) => number;
}) => {
  const [scrollTop, setScrollTop] = useState(0);

  const getHeight = useCallback(
    (index: number) => {
      return getItemHeight ? getItemHeight(index) : itemHeight;
    },
    [getItemHeight, itemHeight],
  );

  const totalHeight = useMemo(() => {
    if (!getItemHeight) return itemCount * itemHeight;

    let total = 0;
    for (let i = 0; i < itemCount; i++) {
      total += getHeight(i);
    }
    return total;
  }, [itemCount, getHeight, itemHeight, getItemHeight]);

  const visibleRange = useMemo(() => {
    if (itemCount === 0) return { start: 0, end: 0 };

    const visibleStart = Math.max(0, Math.floor(scrollTop / itemHeight) - 2);
    const visibleEnd = Math.min(
      itemCount - 1,
      Math.ceil((scrollTop + containerHeight) / itemHeight) + 2,
    );

    return { start: visibleStart, end: visibleEnd };
  }, [scrollTop, containerHeight, itemCount, itemHeight]);

  const getItemOffset = useCallback(
    (index: number) => {
      return index * itemHeight;
    },
    [itemHeight],
  );

  return {
    totalHeight,
    visibleRange,
    getItemOffset,
    setScrollTop,
  };
};

// Risk level badge component
const RiskLevelBadge = ({ riskLevel }: { riskLevel: AuditRiskLevel }) => {
  const baseClasses =
    'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium';
  const variants = {
    LOW: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
    MEDIUM:
      'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
    HIGH: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
    CRITICAL:
      'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
  };

  return (
    <span className={`${baseClasses} ${variants[riskLevel]}`}>{riskLevel}</span>
  );
};

// Action description formatter
const formatActionDescription = (event: AuditEvent): string => {
  const { action, resource_type, metadata } = event;

  switch (action) {
    case 'CREATE':
      return `Created ${resource_type.toLowerCase()}`;
    case 'UPDATE':
      return `Updated ${resource_type.toLowerCase()}`;
    case 'DELETE':
      return `Deleted ${resource_type.toLowerCase()}`;
    case 'LOGIN':
      return 'User logged in';
    case 'LOGOUT':
      return 'User logged out';
    default:
      return `${action.toLowerCase()} on ${resource_type.toLowerCase()}`;
  }
};

// Expanded details component
const ExpandedDetails = ({ event }: { event: AuditEvent }) => {
  const { metadata, created_at } = event;

  return (
    <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg space-y-3">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
        <div>
          <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">
            Event Details
          </h4>
          <div className="space-y-1">
            <div>
              <span className="text-gray-500">Event ID:</span> {event.id}
            </div>
            <div>
              <span className="text-gray-500">User ID:</span> {event.user_id}
            </div>
            <div>
              <span className="text-gray-500">Resource:</span>{' '}
              {event.resource_type}
            </div>
            <div>
              <span className="text-gray-500">Timestamp:</span>{' '}
              {new Date(created_at).toLocaleString()}
            </div>
          </div>
        </div>

        {metadata && (
          <div>
            <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">
              Metadata
            </h4>
            <div className="space-y-1">
              {metadata.ip_address && (
                <div>
                  <span className="text-gray-500">IP:</span>{' '}
                  {metadata.ip_address}
                </div>
              )}
              {metadata.user_agent && (
                <div>
                  <span className="text-gray-500">User Agent:</span>{' '}
                  {metadata.user_agent.substring(0, 50)}...
                </div>
              )}
              {metadata.wedding_context && (
                <div>
                  <span className="text-gray-500">Wedding:</span>{' '}
                  {metadata.wedding_context.wedding_id}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Loading skeleton
const LoadingSkeleton = () => (
  <div className="space-y-3 p-4">
    {Array.from({ length: 5 }).map((_, i) => (
      <div key={i} className="flex items-center space-x-3 animate-pulse">
        <div className="h-10 w-10 bg-gray-300 dark:bg-gray-600 rounded-full" />
        <div className="space-y-2 flex-1">
          <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-1/3" />
          <div className="h-3 bg-gray-300 dark:bg-gray-600 rounded w-2/3" />
        </div>
        <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-20" />
      </div>
    ))}
  </div>
);

// Table row component
const AuditLogRow = ({
  event,
  isExpanded,
  onToggleExpanded,
  style,
  compact = false,
}: {
  event: AuditEvent;
  isExpanded: boolean;
  onToggleExpanded: () => void;
  style: React.CSSProperties;
  compact?: boolean;
}) => {
  const actionDescription = useMemo(
    () => formatActionDescription(event),
    [event],
  );

  return (
    <div
      style={style}
      className="border-b border-gray-200 dark:border-gray-700"
    >
      <div className="p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3 flex-1 min-w-0">
            <Button
              variant="ghost"
              size="sm"
              onClick={onToggleExpanded}
              className="p-1 h-6 w-6"
              aria-label={isExpanded ? 'Collapse details' : 'Expand details'}
            >
              {isExpanded ? (
                <ChevronDownIcon className="h-4 w-4" />
              ) : (
                <ChevronRightIcon className="h-4 w-4" />
              )}
            </Button>

            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2 mb-1">
                <span className="font-medium text-gray-900 dark:text-gray-100 truncate">
                  {event.user_id}
                </span>
                <RiskLevelBadge riskLevel={event.risk_level} />
              </div>

              <div className="text-sm text-gray-600 dark:text-gray-400 truncate">
                {actionDescription}
              </div>
            </div>
          </div>

          <div className="text-sm text-gray-500 dark:text-gray-400 ml-4">
            {new Date(event.created_at).toLocaleTimeString()}
          </div>
        </div>

        {isExpanded && (
          <div className="mt-3">
            <ExpandedDetails event={event} />
          </div>
        )}
      </div>
    </div>
  );
};

export default function AuditLogViewer({
  initialFilters = {},
  showActions = true,
  compact = false,
  realTimeUpdates = true,
}: AuditLogViewerProps) {
  const [auditLogs, setAuditLogs] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [filters, setFilters] =
    useState<Partial<AuditSearchFilters>>(initialFilters);
  const [hasNextPage, setHasNextPage] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const supabase = createClient();
  const subscriptionRef = useRef<RealtimeChannel | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const containerHeight = 384;

  // Memoized filtered data
  const processedLogs = useMemo(() => {
    let filtered = [...auditLogs];

    // Apply filters
    if (filters.risk_level) {
      filtered = filtered.filter(
        (log) => log.risk_level === filters.risk_level,
      );
    }

    if (filters.action) {
      filtered = filtered.filter((log) => log.action === filters.action);
    }

    if (filters.resource_type) {
      filtered = filtered.filter(
        (log) => log.resource_type === filters.resource_type,
      );
    }

    if (filters.user_id) {
      filtered = filtered.filter((log) => log.user_id === filters.user_id);
    }

    // Sort by timestamp (newest first)
    return filtered.sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );
  }, [auditLogs, filters]);

  // Virtualization
  const getItemHeight = useCallback(
    (index: number) => {
      const event = processedLogs[index];
      if (!event) return ITEM_HEIGHT;
      return expandedRows.has(event.id) ? EXPANDED_HEIGHT : ITEM_HEIGHT;
    },
    [processedLogs, expandedRows],
  );

  const { totalHeight, visibleRange, getItemOffset, setScrollTop } =
    useVirtualization({
      itemCount: processedLogs.length,
      itemHeight: ITEM_HEIGHT,
      containerHeight,
      getItemHeight,
    });

  // Load audit logs
  const loadAuditLogs = useCallback(async (reset = false) => {
    try {
      if (reset) {
        setLoading(true);
        setError(null);
      } else {
        setIsLoadingMore(true);
      }

      // Mock data for now since we don't have the actual database setup
      const mockData: AuditEvent[] = [
        {
          id: '1',
          user_id: 'user-123',
          action: 'LOGIN',
          resource_type: 'USER',
          risk_level: 'LOW',
          description: 'User logged in successfully',
          metadata: {
            ip_address: '192.168.1.100',
            user_agent: 'Mozilla/5.0 Chrome/91.0',
          },
          created_at: new Date().toISOString(),
        },
        {
          id: '2',
          user_id: 'user-456',
          action: 'CREATE',
          resource_type: 'WEDDING',
          risk_level: 'MEDIUM',
          description: 'Created new wedding',
          metadata: {
            wedding_context: { wedding_id: 'wedding-789' },
          },
          created_at: new Date(Date.now() - 60000).toISOString(),
        },
      ];

      if (reset) {
        setAuditLogs(mockData);
      } else {
        setAuditLogs((prev) => [...prev, ...mockData]);
      }

      setHasNextPage(false); // Mock: no more pages
    } catch (err) {
      console.error('Error loading audit logs:', err);
      setError(
        err instanceof Error ? err.message : 'Failed to load audit logs',
      );
    } finally {
      setLoading(false);
      setIsLoadingMore(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    loadAuditLogs(true);
  }, [loadAuditLogs]);

  // Handle scroll
  const handleScroll = useCallback(
    (e: React.UIEvent<HTMLDivElement>) => {
      const scrollTop = e.currentTarget.scrollTop;
      setScrollTop(scrollTop);
    },
    [setScrollTop],
  );

  // Toggle row expansion
  const toggleRowExpansion = useCallback((eventId: string) => {
    setExpandedRows((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(eventId)) {
        newSet.delete(eventId);
      } else {
        newSet.add(eventId);
      }
      return newSet;
    });
  }, []);

  if (error) {
    return (
      <div className="m-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
        <div className="text-red-800 dark:text-red-200">
          Error loading audit logs: {error}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Audit Log Viewer
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Monitor user activities and system events across your wedding
              platform
            </p>
          </div>
          {realTimeUpdates && (
            <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse mr-1" />
              Live Updates
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="">
        {loading && auditLogs.length === 0 ? (
          <LoadingSkeleton />
        ) : processedLogs.length === 0 ? (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400">
            <FilterIcon className="mx-auto h-12 w-12 mb-4 opacity-50" />
            <p>No audit logs found matching your criteria.</p>
          </div>
        ) : (
          <div
            ref={containerRef}
            className="h-96 overflow-auto"
            onScroll={handleScroll}
            style={{ contain: 'strict' }}
          >
            <div
              style={{
                height: `${totalHeight}px`,
                width: '100%',
                position: 'relative',
              }}
            >
              {Array.from({
                length: visibleRange.end - visibleRange.start + 1,
              }).map((_, i) => {
                const index = visibleRange.start + i;
                const event = processedLogs[index];

                if (!event) return null;

                const isExpanded = expandedRows.has(event.id);

                return (
                  <AuditLogRow
                    key={event.id}
                    event={event}
                    isExpanded={isExpanded}
                    onToggleExpanded={() => toggleRowExpansion(event.id)}
                    compact={compact}
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      transform: `translateY(${getItemOffset(index)}px)`,
                    }}
                  />
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
