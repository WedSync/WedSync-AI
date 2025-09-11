'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bell,
  Filter,
  Search,
  MoreVertical,
  Check,
  X,
  Calendar,
  Heart,
  Users,
  Settings,
  AlertTriangle,
  Info,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import type { BroadcastMessage } from '@/lib/broadcast/priority-queue';

interface BroadcastInboxProps {
  userId: string;
  showUnreadOnly?: boolean;
  groupByDate?: boolean;
  weddingContext?: {
    weddingId: string;
    coupleName: string;
  };
  userRole?: 'couple' | 'coordinator' | 'supplier' | 'photographer';
  onBroadcastRead?: (id: string) => void;
}

interface BroadcastItem extends BroadcastMessage {
  readAt?: Date;
  acknowledgedAt?: Date;
}

export function BroadcastInbox({
  userId,
  showUnreadOnly = false,
  groupByDate = true,
  weddingContext,
  userRole,
  onBroadcastRead,
}: BroadcastInboxProps) {
  const [broadcasts, setBroadcasts] = useState<BroadcastItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<{
    priority?: string;
    type?: string;
    search?: string;
  }>({});
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [bulkActionLoading, setBulkActionLoading] = useState(false);

  // Load broadcasts from API
  useEffect(() => {
    loadBroadcasts();
  }, [userId, showUnreadOnly, filter]);

  const loadBroadcasts = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();

      if (showUnreadOnly) params.append('unreadOnly', 'true');
      if (filter.priority) params.append('priority', filter.priority);
      if (filter.type) params.append('type', filter.type);
      if (filter.search) params.append('search', filter.search);
      if (weddingContext?.weddingId)
        params.append('weddingId', weddingContext.weddingId);
      if (userRole) params.append('userRole', userRole);

      const response = await fetch('/api/placeholder');
      const data = await response.json();

      if (response.ok) {
        setBroadcasts(data.broadcasts || []);
      } else {
        console.error('Failed to load broadcasts:', data.error);
      }
    } catch (error) {
      console.error('Failed to load broadcasts:', error);
    } finally {
      setLoading(false);
    }
  };

  // Group broadcasts by date
  const groupBroadcastsByDate = (items: BroadcastItem[]) => {
    if (!groupByDate) return { All: items };

    const groups: Record<string, BroadcastItem[]> = {};

    items.forEach((broadcast) => {
      const date = new Date(broadcast.deliveredAt);
      const today = new Date();
      const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);

      let groupKey: string;
      if (date.toDateString() === today.toDateString()) {
        groupKey = 'Today';
      } else if (date.toDateString() === yesterday.toDateString()) {
        groupKey = 'Yesterday';
      } else if (date.getTime() > today.getTime() - 7 * 24 * 60 * 60 * 1000) {
        groupKey = 'This Week';
      } else {
        groupKey = date.toLocaleDateString('en-US', {
          month: 'long',
          year: 'numeric',
        });
      }

      if (!groups[groupKey]) groups[groupKey] = [];
      groups[groupKey].push(broadcast);
    });

    return groups;
  };

  // Priority icon mapping
  const getPriorityIcon = (priority: string) => {
    const icons = {
      critical: AlertTriangle,
      high: AlertTriangle,
      normal: Info,
      low: Bell,
    };
    return icons[priority as keyof typeof icons] || Bell;
  };

  // Priority color mapping
  const getPriorityColor = (priority: string) => {
    const colors = {
      critical: 'text-red-600 bg-red-50 border-red-200',
      high: 'text-orange-600 bg-orange-50 border-orange-200',
      normal: 'text-blue-600 bg-blue-50 border-blue-200',
      low: 'text-gray-600 bg-gray-50 border-gray-200',
    };
    return colors[priority as keyof typeof colors] || colors.normal;
  };

  // Wedding type icon mapping
  const getWeddingTypeIcon = (type: string) => {
    if (type.includes('wedding') || type.includes('ceremony')) return Heart;
    if (type.includes('timeline') || type.includes('schedule')) return Calendar;
    if (type.includes('supplier') || type.includes('vendor')) return Users;
    return Bell;
  };

  // Handle mark as read
  const handleMarkAsRead = async (broadcastId: string) => {
    try {
      const response = await fetch('/api/broadcast/acknowledge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          broadcastId,
          action: 'read',
        }),
      });

      if (response.ok) {
        // Update local state
        setBroadcasts((prev) =>
          prev.map((b) =>
            b.id === broadcastId ? { ...b, readAt: new Date() } : b,
          ),
        );

        onBroadcastRead?.(broadcastId);
      }
    } catch (error) {
      console.error('Failed to mark as read:', error);
    }
  };

  // Handle bulk actions
  const handleBulkAction = async (action: 'read' | 'delete') => {
    const ids = Array.from(selectedItems);

    try {
      setBulkActionLoading(true);

      if (action === 'read') {
        await Promise.all(ids.map((id) => handleMarkAsRead(id)));
      } else if (action === 'delete') {
        const response = await fetch('/api/broadcast/bulk-delete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ broadcastIds: ids }),
        });

        if (response.ok) {
          setBroadcasts((prev) => prev.filter((b) => !ids.includes(b.id)));
        }
      }

      setSelectedItems(new Set());
    } catch (error) {
      console.error(`Failed to ${action} broadcasts:`, error);
    } finally {
      setBulkActionLoading(false);
    }
  };

  // Toggle item selection
  const toggleSelection = (id: string) => {
    const newSelection = new Set(selectedItems);
    if (newSelection.has(id)) {
      newSelection.delete(id);
    } else {
      newSelection.add(id);
    }
    setSelectedItems(newSelection);
  };

  // Select all visible items
  const selectAllVisible = () => {
    const visibleIds = broadcasts.map((b) => b.id);
    setSelectedItems(new Set(visibleIds));
  };

  // Clear selection
  const clearSelection = () => {
    setSelectedItems(new Set());
  };

  const groupedBroadcasts = groupBroadcastsByDate(broadcasts);

  return (
    <div className="w-full max-w-4xl mx-auto p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Bell className="w-6 h-6 text-blue-600" />
          <h1 className="text-2xl font-bold text-gray-900">Broadcast Inbox</h1>
          {weddingContext && (
            <Badge variant="secondary" className="ml-2">
              <Heart className="w-3 h-3 mr-1" />
              {weddingContext.coupleName}
            </Badge>
          )}
          {userRole && (
            <Badge variant="outline" className="ml-2">
              {userRole.charAt(0).toUpperCase() + userRole.slice(1)}
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-2">
          {selectedItems.size > 0 && (
            <div className="flex items-center gap-2 mr-4">
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleBulkAction('read')}
                disabled={bulkActionLoading}
                className="flex items-center gap-1"
              >
                {bulkActionLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Check className="w-4 h-4" />
                )}
                Mark Read ({selectedItems.size})
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleBulkAction('delete')}
                disabled={bulkActionLoading}
                className="flex items-center gap-1 text-red-600 hover:text-red-700"
              >
                {bulkActionLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <X className="w-4 h-4" />
                )}
                Delete ({selectedItems.size})
              </Button>
              <Button size="sm" variant="ghost" onClick={clearSelection}>
                Clear
              </Button>
            </div>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Filter className="w-4 h-4 mr-2" />
                Filter
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() => setFilter({ priority: 'critical' })}
              >
                Critical Only
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setFilter({ priority: 'high' })}>
                High Priority
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setFilter({})}>
                All Priorities
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setFilter({ type: 'wedding' })}>
                Wedding Updates
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setFilter({ type: 'payment' })}>
                Payment Related
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setFilter({ type: 'timeline' })}>
                Timeline Changes
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {broadcasts.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <Settings className="w-4 h-4 mr-2" />
                  Actions
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={selectAllVisible}>
                  Select All Visible
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setFilter({})}>
                  Clear Filters
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => window.location.reload()}>
                  Refresh
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Search broadcasts..."
            className="pl-10"
            value={filter.search || ''}
            onChange={(e) =>
              setFilter((prev) => ({ ...prev, search: e.target.value }))
            }
          />
        </div>
      </div>

      {/* Loading state */}
      {loading && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          <span className="ml-2 text-gray-600">Loading broadcasts...</span>
        </div>
      )}

      {/* Empty state */}
      {!loading && broadcasts.length === 0 && (
        <div className="text-center py-8">
          <Bell className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No broadcasts found
          </h3>
          <p className="text-gray-600">
            {showUnreadOnly ? 'All caught up!' : 'No broadcasts to show'}
          </p>
        </div>
      )}

      {/* Broadcast groups */}
      {!loading &&
        Object.entries(groupedBroadcasts).map(
          ([groupName, groupBroadcasts]) => (
            <div key={groupName} className="mb-8">
              {groupByDate && (
                <h2 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-200">
                  {groupName}
                </h2>
              )}

              <div className="space-y-3">
                {groupBroadcasts.map((broadcast) => {
                  const PriorityIcon = getPriorityIcon(broadcast.priority);
                  const WeddingIcon = getWeddingTypeIcon(broadcast.type);
                  const isUnread = !broadcast.readAt;
                  const isSelected = selectedItems.has(broadcast.id);

                  return (
                    <motion.div
                      key={broadcast.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={cn(
                        'p-4 rounded-lg border transition-all cursor-pointer',
                        isUnread
                          ? 'bg-blue-50 border-blue-200'
                          : 'bg-white border-gray-200',
                        isSelected && 'ring-2 ring-blue-500',
                        'hover:shadow-md',
                      )}
                      onClick={() => toggleSelection(broadcast.id)}
                    >
                      <div className="flex items-start gap-3">
                        {/* Selection checkbox */}
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => toggleSelection(broadcast.id)}
                          onClick={(e) => e.stopPropagation()}
                          aria-label={`Select broadcast: ${broadcast.title}`}
                        />

                        {/* Priority and type indicators */}
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <div
                            className={cn(
                              'p-1.5 rounded-full border',
                              getPriorityColor(broadcast.priority),
                            )}
                          >
                            <PriorityIcon className="w-4 h-4" />
                          </div>
                          <WeddingIcon className="w-4 h-4 text-gray-500" />
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3
                              className={cn(
                                'font-medium text-sm',
                                isUnread ? 'text-gray-900' : 'text-gray-700',
                              )}
                            >
                              {broadcast.title}
                            </h3>
                            <Badge
                              size="sm"
                              variant={isUnread ? 'default' : 'secondary'}
                              className="text-xs"
                            >
                              {broadcast.priority.toUpperCase()}
                            </Badge>
                            {isUnread && (
                              <div className="w-2 h-2 rounded-full bg-blue-600"></div>
                            )}
                          </div>

                          {/* Wedding context */}
                          {broadcast.weddingContext && (
                            <div className="text-xs text-gray-600 mb-1">
                              <Heart className="w-3 h-3 inline mr-1" />
                              {broadcast.weddingContext.coupleName} •{' '}
                              {new Date(
                                broadcast.weddingContext.weddingDate,
                              ).toLocaleDateString()}
                            </div>
                          )}

                          <p className="text-sm text-gray-600 mb-2">
                            {broadcast.message}
                          </p>

                          <div className="flex items-center justify-between">
                            <span className="text-xs text-gray-500">
                              {new Date(broadcast.deliveredAt).toLocaleString()}
                            </span>

                            <div className="flex items-center gap-2">
                              {broadcast.action && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-xs"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    window.open(
                                      broadcast.action!.url,
                                      '_blank',
                                    );
                                  }}
                                >
                                  {broadcast.action.label}
                                </Button>
                              )}

                              {isUnread && (
                                <Button
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleMarkAsRead(broadcast.id);
                                  }}
                                >
                                  Mark Read
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          ),
        )}
    </div>
  );
}
