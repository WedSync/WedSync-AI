# WS-205 Team A: Broadcast Events System - Frontend UI Components

## Team A Responsibilities: User Interface Components & User Experience

**Feature**: WS-205 Broadcast Events System
**Team Focus**: Frontend components, user interaction, visual design
**Duration**: Sprint 21 (Current)
**Dependencies**: None (foundational frontend work)
**MCP Integration**: Use Ref MCP for React patterns, Sequential Thinking MCP for component architecture, Context7 MCP for UI libraries

## Technical Foundation from Feature Designer

**Source**: `/WORKFLOW-V2-DRAFT/OUTBOX/feature-designer/WS-205-broadcast-events-system-technical.md`

### Core Components Overview
The broadcast system requires multiple UI components for wedding industry professionals who need organized, priority-based notifications:

1. **BroadcastToast** - Individual notification display with priority-based styling
2. **BroadcastCenter** - Stacked notification management container
3. **BroadcastInbox** - Historical broadcast management interface
4. **BroadcastPreferences** - User settings for notification behavior
5. **BroadcastBadge** - Unread count indicator for navigation

### Wedding Industry Context Requirements
- **Wedding photographers** managing 15+ active weddings need critical updates immediately
- **Coordinators** handling multiple events require priority-based filtering
- **Couples** want gentle notifications without overwhelming their planning experience
- **Suppliers** need wedding-specific updates without cross-contamination

## Primary Deliverables

### 1. Priority-Based Broadcast Toast Component

Create the core notification toast with wedding industry styling:

```typescript
// /wedsync/src/components/broadcast/BroadcastToast.tsx
'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, AlertCircle, Info, CheckCircle, AlertTriangle, Clock, Heart, Calendar, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface BroadcastToastProps {
  broadcast: {
    id: string;
    type: string;
    priority: 'critical' | 'high' | 'normal' | 'low';
    title: string;
    message: string;
    action?: {
      label: string;
      url: string;
    };
    weddingContext?: {
      weddingId: string;
      coupleName: string;
      weddingDate: Date;
    };
    expiresAt?: Date;
    deliveredAt: Date;
  };
  onDismiss: () => void;
  onAction?: (url: string) => void;
  onAcknowledge?: (id: string) => void;
  autoHideDuration?: number;
  position?: 'top-right' | 'bottom-right' | 'top-center';
}

export function BroadcastToast({
  broadcast,
  onDismiss,
  onAction,
  onAcknowledge,
  autoHideDuration,
  position = 'top-right'
}: BroadcastToastProps) {
  const [isVisible, setIsVisible] = useState(true);
  const [timeLeft, setTimeLeft] = useState(autoHideDuration || 0);
  const [isHovered, setIsHovered] = useState(false);

  // Priority-based styling with wedding industry colors
  const priorityConfig = {
    critical: {
      bg: 'bg-gradient-to-r from-red-600 to-red-700',
      border: 'border-red-500',
      icon: AlertCircle,
      iconColor: 'text-red-100',
      textColor: 'text-red-50',
      requiresAck: true,
      sound: true,
      animation: 'animate-pulse'
    },
    high: {
      bg: 'bg-gradient-to-r from-amber-500 to-orange-600',
      border: 'border-amber-400',
      icon: AlertTriangle,
      iconColor: 'text-amber-100',
      textColor: 'text-amber-50',
      requiresAck: false,
      sound: false,
      animation: ''
    },
    normal: {
      bg: 'bg-gradient-to-r from-blue-600 to-blue-700',
      border: 'border-blue-500',
      icon: Info,
      iconColor: 'text-blue-100',
      textColor: 'text-blue-50',
      requiresAck: false,
      sound: false,
      animation: ''
    },
    low: {
      bg: 'bg-gradient-to-r from-slate-600 to-slate-700',
      border: 'border-slate-500',
      icon: CheckCircle,
      iconColor: 'text-slate-100',
      textColor: 'text-slate-50',
      requiresAck: false,
      sound: false,
      animation: ''
    }
  };

  const config = priorityConfig[broadcast.priority];
  const Icon = config.icon;

  // Wedding-specific type icons
  const getWeddingTypeIcon = (type: string) => {
    if (type.includes('wedding') || type.includes('ceremony')) return Heart;
    if (type.includes('timeline') || type.includes('schedule')) return Calendar;
    if (type.includes('supplier') || type.includes('vendor')) return Users;
    if (type.includes('maintenance')) return Clock;
    return Icon;
  };

  const WeddingIcon = getWeddingTypeIcon(broadcast.type);

  // Auto-hide timer with pause on hover
  useEffect(() => {
    if (!autoHideDuration || config.requiresAck || isHovered) return;

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 100) {
          handleAutoHide();
          return 0;
        }
        return prev - 100;
      });
    }, 100);

    return () => clearInterval(timer);
  }, [autoHideDuration, config.requiresAck, isHovered]);

  // Handle auto-hide
  const handleAutoHide = () => {
    setIsVisible(false);
    setTimeout(onDismiss, 300);
  };

  // Handle manual dismiss
  const handleDismiss = async () => {
    if (config.requiresAck) {
      // Critical broadcasts require explicit acknowledgment
      const confirmed = confirm(
        `This is a critical wedding alert. Are you sure you want to dismiss "${broadcast.title}"?`
      );
      if (!confirmed) return;
    }

    setIsVisible(false);
    setTimeout(onDismiss, 300);

    // Track dismissal analytics
    try {
      await fetch('/api/broadcast/analytics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          broadcastId: broadcast.id,
          action: 'dismissed',
          timestamp: new Date().toISOString()
        })
      });
    } catch (error) {
      console.warn('Failed to track broadcast dismissal:', error);
    }
  };

  // Handle action button click
  const handleAction = async () => {
    if (broadcast.action && onAction) {
      onAction(broadcast.action.url);
      
      // Track action click
      try {
        await fetch('/api/broadcast/analytics', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            broadcastId: broadcast.id,
            action: 'action_clicked',
            timestamp: new Date().toISOString(),
            actionUrl: broadcast.action.url
          })
        });
      } catch (error) {
        console.warn('Failed to track broadcast action:', error);
      }
    }
  };

  // Handle acknowledge button
  const handleAcknowledge = async () => {
    if (onAcknowledge) {
      onAcknowledge(broadcast.id);
      setIsVisible(false);
      setTimeout(onDismiss, 300);
    }
  };

  // Position classes
  const positionClasses = {
    'top-right': 'top-4 right-4',
    'bottom-right': 'bottom-4 right-4',
    'top-center': 'top-4 left-1/2 transform -translate-x-1/2'
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ 
            opacity: 0, 
            scale: 0.8,
            x: position.includes('right') ? 100 : 0 
          }}
          animate={{ 
            opacity: 1, 
            scale: 1,
            x: 0 
          }}
          exit={{ 
            opacity: 0, 
            scale: 0.8,
            x: position.includes('right') ? 100 : 0 
          }}
          transition={{ type: 'spring', damping: 20, stiffness: 300 }}
          className={cn(
            'fixed z-50 w-full max-w-sm pointer-events-auto',
            positionClasses[position]
          )}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          <div className={cn(
            'relative overflow-hidden rounded-xl shadow-2xl backdrop-blur-sm',
            'border border-opacity-20',
            config.bg,
            config.border,
            config.animation
          )}>
            {/* Priority indicator stripe */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-white/30" />
            
            {/* Main content */}
            <div className="p-4">
              <div className="flex items-start gap-3">
                {/* Icon with wedding context */}
                <div className="flex-shrink-0 relative">
                  <Icon className={cn('w-5 h-5', config.iconColor)} />
                  {broadcast.weddingContext && (
                    <WeddingIcon className="w-3 h-3 absolute -bottom-1 -right-1 text-white bg-black/20 rounded-full p-0.5" />
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  {/* Title with priority badge */}
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className={cn('font-semibold text-sm', config.textColor)}>
                      {broadcast.title}
                    </h4>
                    <Badge 
                      variant="secondary" 
                      className="text-xs px-1.5 py-0.5 bg-white/20 text-white border-none"
                    >
                      {broadcast.priority.toUpperCase()}
                    </Badge>
                  </div>

                  {/* Wedding context info */}
                  {broadcast.weddingContext && (
                    <div className={cn('text-xs opacity-80 mb-2', config.textColor)}>
                      <Heart className="w-3 h-3 inline mr-1" />
                      {broadcast.weddingContext.coupleName} • {
                        new Date(broadcast.weddingContext.weddingDate).toLocaleDateString()
                      }
                    </div>
                  )}

                  {/* Message */}
                  <p className={cn('text-sm opacity-90 leading-relaxed', config.textColor)}>
                    {broadcast.message}
                  </p>

                  {/* Action buttons */}
                  <div className="flex items-center gap-2 mt-3">
                    {broadcast.action && (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={handleAction}
                        className="text-xs bg-white/20 hover:bg-white/30 text-white border-white/30"
                      >
                        {broadcast.action.label} →
                      </Button>
                    )}

                    {config.requiresAck && (
                      <Button
                        size="sm"
                        onClick={handleAcknowledge}
                        className="text-xs bg-white text-red-600 hover:bg-gray-100 font-medium"
                      >
                        Acknowledge
                      </Button>
                    )}
                  </div>

                  {/* Expiry info */}
                  {broadcast.expiresAt && (
                    <div className={cn('text-xs mt-2 opacity-70', config.textColor)}>
                      <Clock className="w-3 h-3 inline mr-1" />
                      Expires {new Date(broadcast.expiresAt).toLocaleString()}
                    </div>
                  )}
                </div>

                {/* Close button */}
                {!config.requiresAck && (
                  <button
                    onClick={handleDismiss}
                    className={cn(
                      'flex-shrink-0 hover:opacity-70 transition-opacity',
                      config.iconColor
                    )}
                    aria-label="Dismiss notification"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Progress bar for auto-hide */}
            {autoHideDuration && !config.requiresAck && !isHovered && (
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/20">
                <motion.div 
                  className="h-full bg-white/50"
                  initial={{ width: '100%' }}
                  animate={{ 
                    width: `${(timeLeft / autoHideDuration) * 100}%` 
                  }}
                  transition={{ duration: 0.1 }}
                />
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
```

### 2. Broadcast Center Container Component

Create the main container managing multiple broadcasts:

```typescript
// /wedsync/src/components/broadcast/BroadcastCenter.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { BroadcastToast } from './BroadcastToast';
import { useBroadcastSubscription } from '@/hooks/useBroadcastSubscription';
import { BroadcastPriorityQueue } from '@/lib/broadcast/priority-queue';
import { cn } from '@/lib/utils';

interface BroadcastCenterProps {
  userId: string;
  position?: 'top-right' | 'bottom-right' | 'top-center';
  maxVisible?: number;
  weddingId?: string;
  userRole?: 'couple' | 'coordinator' | 'supplier' | 'photographer';
}

interface DisplayedBroadcast {
  id: string;
  broadcast: any;
  options: {
    autoHide: boolean;
    duration?: number;
    requiresAck: boolean;
  };
  key: string;
}

export function BroadcastCenter({
  userId,
  position = 'top-right',
  maxVisible = 3,
  weddingId,
  userRole
}: BroadcastCenterProps) {
  const [displayedBroadcasts, setDisplayedBroadcasts] = useState<DisplayedBroadcast[]>([]);
  const [queue, setQueue] = useState<BroadcastPriorityQueue>(new BroadcastPriorityQueue());
  
  const {
    broadcasts,
    unreadCount,
    markAsRead,
    connectionStatus
  } = useBroadcastSubscription(userId, weddingId);

  // Process new broadcasts through priority queue
  useEffect(() => {
    broadcasts.forEach(broadcast => {
      // Filter based on user role and wedding context
      if (shouldShowBroadcast(broadcast, userRole, weddingId)) {
        queue.enqueue(broadcast);
        processQueue();
      }
    });
  }, [broadcasts, userRole, weddingId]);

  // Wedding industry specific broadcast filtering
  const shouldShowBroadcast = (broadcast: any, role?: string, contextWeddingId?: string) => {
    // Wedding context filtering
    if (contextWeddingId && broadcast.weddingContext) {
      if (broadcast.weddingContext.weddingId !== contextWeddingId) {
        return false;
      }
    }

    // Role-based filtering
    if (role === 'couple' && broadcast.type.startsWith('supplier.')) {
      return false; // Couples don't need internal supplier notifications
    }

    if (role === 'supplier' && broadcast.type.startsWith('admin.')) {
      return false; // Suppliers don't need admin notifications
    }

    // Photographer specific filtering
    if (role === 'photographer') {
      const photographerTypes = [
        'timeline.changed',
        'wedding.cancelled',
        'payment.required',
        'maintenance.scheduled'
      ];
      return photographerTypes.includes(broadcast.type) || broadcast.priority === 'critical';
    }

    return true;
  };

  // Process priority queue and display broadcasts
  const processQueue = useCallback(async () => {
    if (displayedBroadcasts.length >= maxVisible) {
      return;
    }

    const nextBroadcast = queue.dequeue();
    if (!nextBroadcast) return;

    const displayOptions = getDisplayOptions(nextBroadcast);
    const displayBroadcast: DisplayedBroadcast = {
      id: nextBroadcast.id,
      broadcast: nextBroadcast,
      options: displayOptions,
      key: `${nextBroadcast.id}-${Date.now()}`
    };

    setDisplayedBroadcasts(prev => [...prev, displayBroadcast]);

    // Mark as read immediately
    await markAsRead(nextBroadcast.id);

    // Auto-process next if available
    setTimeout(() => {
      if (queue.hasNext()) {
        processQueue();
      }
    }, 500);
  }, [displayedBroadcasts, maxVisible, queue]);

  // Get display options based on priority
  const getDisplayOptions = (broadcast: any) => {
    const priorityConfig = {
      critical: {
        autoHide: false,
        requiresAck: true,
        duration: undefined
      },
      high: {
        autoHide: true,
        requiresAck: false,
        duration: 10000 // 10 seconds
      },
      normal: {
        autoHide: true,
        requiresAck: false,
        duration: 5000 // 5 seconds
      },
      low: {
        autoHide: true,
        requiresAck: false,
        duration: 3000 // 3 seconds
      }
    };

    return priorityConfig[broadcast.priority] || priorityConfig.normal;
  };

  // Handle broadcast dismissal
  const handleDismiss = useCallback((broadcastId: string) => {
    setDisplayedBroadcasts(prev => 
      prev.filter(db => db.id !== broadcastId)
    );

    // Process next in queue after dismissal
    setTimeout(() => {
      if (queue.hasNext() && displayedBroadcasts.length < maxVisible) {
        processQueue();
      }
    }, 300);
  }, [queue, displayedBroadcasts.length, maxVisible, processQueue]);

  // Handle action clicks
  const handleAction = useCallback((url: string) => {
    // Navigate to action URL
    if (url.startsWith('/')) {
      // Internal link
      window.location.href = url;
    } else {
      // External link
      window.open(url, '_blank');
    }
  }, []);

  // Handle acknowledgment
  const handleAcknowledge = useCallback(async (broadcastId: string) => {
    try {
      await fetch('/api/broadcast/acknowledge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          broadcastId,
          action: 'acknowledged'
        })
      });
    } catch (error) {
      console.error('Failed to acknowledge broadcast:', error);
    }
  }, []);

  // Position-based container classes
  const containerClasses = {
    'top-right': 'top-4 right-4 flex-col-reverse',
    'bottom-right': 'bottom-4 right-4 flex-col',
    'top-center': 'top-4 left-1/2 transform -translate-x-1/2 flex-col-reverse'
  };

  return (
    <>
      {/* Connection status indicator for critical contexts */}
      {connectionStatus !== 'connected' && userRole === 'coordinator' && (
        <div className="fixed top-2 left-2 z-40 px-2 py-1 bg-red-500 text-white text-xs rounded">
          Broadcast connection: {connectionStatus}
        </div>
      )}

      {/* Broadcast container */}
      <div className={cn(
        'fixed z-50 flex gap-2 pointer-events-none',
        containerClasses[position]
      )}>
        {displayedBroadcasts.map((db) => (
          <BroadcastToast
            key={db.key}
            broadcast={db.broadcast}
            onDismiss={() => handleDismiss(db.id)}
            onAction={handleAction}
            onAcknowledge={handleAcknowledge}
            autoHideDuration={db.options.autoHide ? db.options.duration : undefined}
            position={position}
          />
        ))}
      </div>

      {/* Queue size indicator for debugging (development only) */}
      {process.env.NODE_ENV === 'development' && queue.size() > 0 && (
        <div className="fixed bottom-2 left-2 z-40 px-2 py-1 bg-blue-500 text-white text-xs rounded">
          Queue: {queue.size()} pending
        </div>
      )}
    </>
  );
}
```

### 3. Broadcast Inbox Management Component

Create comprehensive inbox for historical broadcasts:

```typescript
// /wedsync/src/components/broadcast/BroadcastInbox.tsx
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
  Info
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

interface BroadcastInboxProps {
  userId: string;
  showUnreadOnly?: boolean;
  groupByDate?: boolean;
  weddingContext?: {
    weddingId: string;
    coupleName: string;
  };
  onBroadcastRead?: (id: string) => void;
}

interface BroadcastItem {
  id: string;
  type: string;
  priority: 'critical' | 'high' | 'normal' | 'low';
  title: string;
  message: string;
  action?: { label: string; url: string };
  deliveredAt: Date;
  readAt?: Date;
  acknowledgedAt?: Date;
  expiresAt?: Date;
  weddingContext?: {
    weddingId: string;
    coupleName: string;
    weddingDate: Date;
  };
}

export function BroadcastInbox({
  userId,
  showUnreadOnly = false,
  groupByDate = true,
  weddingContext,
  onBroadcastRead
}: BroadcastInboxProps) {
  const [broadcasts, setBroadcasts] = useState<BroadcastItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<{
    priority?: string;
    type?: string;
    search?: string;
  }>({});
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());

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
      if (weddingContext?.weddingId) params.append('weddingId', weddingContext.weddingId);

      const response = await fetch(`/api/broadcast/inbox?${params}`);
      const data = await response.json();

      setBroadcasts(data.broadcasts || []);
    } catch (error) {
      console.error('Failed to load broadcasts:', error);
    } finally {
      setLoading(false);
    }
  };

  // Group broadcasts by date
  const groupBroadcastsByDate = (items: BroadcastItem[]) => {
    if (!groupByDate) return { 'All': items };

    const groups: Record<string, BroadcastItem[]> = {};
    
    items.forEach(broadcast => {
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
          year: 'numeric' 
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
      low: Bell
    };
    return icons[priority as keyof typeof icons] || Bell;
  };

  // Priority color mapping
  const getPriorityColor = (priority: string) => {
    const colors = {
      critical: 'text-red-600 bg-red-50',
      high: 'text-orange-600 bg-orange-50',
      normal: 'text-blue-600 bg-blue-50',
      low: 'text-gray-600 bg-gray-50'
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
      await fetch('/api/broadcast/acknowledge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          broadcastId,
          action: 'read'
        })
      });

      // Update local state
      setBroadcasts(prev => 
        prev.map(b => 
          b.id === broadcastId 
            ? { ...b, readAt: new Date() }
            : b
        )
      );

      onBroadcastRead?.(broadcastId);
    } catch (error) {
      console.error('Failed to mark as read:', error);
    }
  };

  // Handle bulk actions
  const handleBulkAction = async (action: 'read' | 'delete') => {
    const ids = Array.from(selectedItems);
    
    try {
      if (action === 'read') {
        await Promise.all(ids.map(id => handleMarkAsRead(id)));
      } else if (action === 'delete') {
        await fetch('/api/broadcast/bulk-delete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ broadcastIds: ids })
        });
        
        setBroadcasts(prev => 
          prev.filter(b => !ids.includes(b.id))
        );
      }
      
      setSelectedItems(new Set());
    } catch (error) {
      console.error(`Failed to ${action} broadcasts:`, error);
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

  const groupedBroadcasts = groupBroadcastsByDate(broadcasts);

  return (
    <div className="w-full max-w-4xl mx-auto p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Bell className="w-6 h-6 text-blue-600" />
          <h1 className="text-2xl font-bold text-gray-900">
            Broadcast Inbox
          </h1>
          {weddingContext && (
            <Badge variant="secondary" className="ml-2">
              <Heart className="w-3 h-3 mr-1" />
              {weddingContext.coupleName}
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
              >
                <Check className="w-4 h-4 mr-1" />
                Mark Read ({selectedItems.size})
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleBulkAction('delete')}
              >
                <X className="w-4 h-4 mr-1" />
                Delete ({selectedItems.size})
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
              <DropdownMenuItem onClick={() => setFilter({ priority: 'critical' })}>
                Critical Only
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setFilter({ priority: 'high' })}>
                High Priority
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setFilter({})}>
                All Priorities
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
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
            onChange={(e) => setFilter(prev => ({ ...prev, search: e.target.value }))}
          />
        </div>
      </div>

      {/* Loading state */}
      {loading && (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
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
      {!loading && Object.entries(groupedBroadcasts).map(([groupName, groupBroadcasts]) => (
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
                    isUnread ? 'bg-blue-50 border-blue-200' : 'bg-white border-gray-200',
                    isSelected && 'ring-2 ring-blue-500',
                    'hover:shadow-md'
                  )}
                  onClick={() => !isUnread && toggleSelection(broadcast.id)}
                >
                  <div className="flex items-start gap-3">
                    {/* Selection checkbox */}
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleSelection(broadcast.id)}
                      className="mt-1"
                      onClick={(e) => e.stopPropagation()}
                    />

                    {/* Priority and type indicators */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <div className={cn(
                        'p-1.5 rounded-full',
                        getPriorityColor(broadcast.priority)
                      )}>
                        <PriorityIcon className="w-4 h-4" />
                      </div>
                      <WeddingIcon className="w-4 h-4 text-gray-500" />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className={cn(
                          'font-medium text-sm',
                          isUnread ? 'text-gray-900' : 'text-gray-700'
                        )}>
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
                          {broadcast.weddingContext.coupleName} • {
                            new Date(broadcast.weddingContext.weddingDate).toLocaleDateString()
                          }
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
                                window.open(broadcast.action!.url, '_blank');
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
      ))}
    </div>
  );
}
```

### 4. Broadcast Preferences Component

User settings for notification behavior:

```typescript
// /wedsync/src/components/broadcast/BroadcastPreferences.tsx
'use client';

import { useState, useEffect } from 'react';
import { Bell, Clock, Heart, Users, Settings2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface BroadcastPreferencesProps {
  userId: string;
  userRole?: 'couple' | 'coordinator' | 'supplier' | 'photographer';
}

interface Preferences {
  systemBroadcasts: boolean;
  businessBroadcasts: boolean;
  collaborationBroadcasts: boolean;
  criticalOnly: boolean;
  deliveryChannels: string[];
  quietHours: {
    enabled: boolean;
    start: string;
    end: string;
    timezone: string;
  };
}

export function BroadcastPreferences({ userId, userRole }: BroadcastPreferencesProps) {
  const [preferences, setPreferences] = useState<Preferences>({
    systemBroadcasts: true,
    businessBroadcasts: true,
    collaborationBroadcasts: true,
    criticalOnly: false,
    deliveryChannels: ['realtime', 'in_app'],
    quietHours: {
      enabled: false,
      start: '22:00',
      end: '08:00',
      timezone: 'UTC'
    }
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Load preferences on mount
  useEffect(() => {
    loadPreferences();
  }, [userId]);

  const loadPreferences = async () => {
    try {
      const response = await fetch(`/api/broadcast/preferences?userId=${userId}`);
      if (response.ok) {
        const data = await response.json();
        setPreferences(data);
      }
    } catch (error) {
      console.error('Failed to load preferences:', error);
    }
  };

  const savePreferences = async () => {
    try {
      setSaving(true);
      const response = await fetch('/api/broadcast/preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(preferences)
      });

      if (response.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      }
    } catch (error) {
      console.error('Failed to save preferences:', error);
    } finally {
      setSaving(false);
    }
  };

  // Role-based recommendations
  const getRoleRecommendations = () => {
    switch (userRole) {
      case 'coordinator':
        return {
          title: 'Wedding Coordinator Settings',
          description: 'Recommended settings for managing multiple weddings efficiently',
          recommendations: [
            'Enable all broadcast types for complete oversight',
            'Set quiet hours to avoid disruptions during personal time',
            'Keep critical alerts always enabled for emergencies'
          ]
        };
      case 'photographer':
        return {
          title: 'Wedding Photographer Settings',
          description: 'Optimized for timeline changes and payment notifications',
          recommendations: [
            'Enable timeline and payment broadcasts',
            'Set quiet hours during shooting times if needed',
            'Critical alerts help avoid missing important updates'
          ]
        };
      case 'couple':
        return {
          title: 'Couple Settings',
          description: 'Gentle notifications to keep you informed without overwhelm',
          recommendations: [
            'Consider enabling quiet hours for peaceful planning',
            'Business broadcasts help track vendor progress',
            'Collaboration broadcasts keep you in the loop'
          ]
        };
      default:
        return {
          title: 'Notification Preferences',
          description: 'Customize how you receive wedding-related updates',
          recommendations: []
        };
    }
  };

  const roleInfo = getRoleRecommendations();

  return (
    <div className="w-full max-w-2xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          {roleInfo.title}
        </h1>
        <p className="text-gray-600">
          {roleInfo.description}
        </p>
      </div>

      <div className="space-y-6">
        {/* Broadcast Types */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5" />
              Broadcast Types
            </CardTitle>
            <CardDescription>
              Choose which types of updates you want to receive
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="system-broadcasts" className="font-medium">
                  System Broadcasts
                </Label>
                <p className="text-sm text-gray-600">
                  Platform updates, maintenance, and security alerts
                </p>
              </div>
              <Switch
                id="system-broadcasts"
                checked={preferences.systemBroadcasts}
                onCheckedChange={(checked) =>
                  setPreferences(prev => ({ ...prev, systemBroadcasts: checked }))
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="business-broadcasts" className="font-medium">
                  Business Broadcasts
                </Label>
                <p className="text-sm text-gray-600">
                  Payment reminders, subscription updates, feature releases
                </p>
              </div>
              <Switch
                id="business-broadcasts"
                checked={preferences.businessBroadcasts}
                onCheckedChange={(checked) =>
                  setPreferences(prev => ({ ...prev, businessBroadcasts: checked }))
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="collaboration-broadcasts" className="font-medium">
                  Collaboration Broadcasts
                </Label>
                <p className="text-sm text-gray-600">
                  Wedding timeline changes, vendor updates, team notifications
                </p>
              </div>
              <Switch
                id="collaboration-broadcasts"
                checked={preferences.collaborationBroadcasts}
                onCheckedChange={(checked) =>
                  setPreferences(prev => ({ ...prev, collaborationBroadcasts: checked }))
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="critical-only" className="font-medium">
                  Critical Only Mode
                </Label>
                <p className="text-sm text-gray-600">
                  Only receive critical alerts that require immediate attention
                </p>
              </div>
              <Switch
                id="critical-only"
                checked={preferences.criticalOnly}
                onCheckedChange={(checked) =>
                  setPreferences(prev => ({ ...prev, criticalOnly: checked }))
                }
              />
            </div>
          </CardContent>
        </Card>

        {/* Delivery Channels */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings2 className="w-5 h-5" />
              Delivery Channels
            </CardTitle>
            <CardDescription>
              How would you like to receive notifications?
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {[
              { id: 'realtime', label: 'Real-time Toasts', description: 'Pop-up notifications while using the platform' },
              { id: 'in_app', label: 'In-App Inbox', description: 'Collect notifications in your inbox for later viewing' },
              { id: 'email', label: 'Email Notifications', description: 'Receive important updates via email' },
              { id: 'push', label: 'Push Notifications', description: 'Browser push notifications (when available)' }
            ].map(channel => (
              <div key={channel.id} className="flex items-center justify-between">
                <div>
                  <Label htmlFor={channel.id} className="font-medium">
                    {channel.label}
                  </Label>
                  <p className="text-sm text-gray-600">
                    {channel.description}
                  </p>
                </div>
                <Switch
                  id={channel.id}
                  checked={preferences.deliveryChannels.includes(channel.id)}
                  onCheckedChange={(checked) => {
                    setPreferences(prev => ({
                      ...prev,
                      deliveryChannels: checked
                        ? [...prev.deliveryChannels, channel.id]
                        : prev.deliveryChannels.filter(c => c !== channel.id)
                    }));
                  }}
                />
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Quiet Hours */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Quiet Hours
            </CardTitle>
            <CardDescription>
              Set times when you don't want to receive non-critical notifications
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="quiet-hours" className="font-medium">
                Enable Quiet Hours
              </Label>
              <Switch
                id="quiet-hours"
                checked={preferences.quietHours.enabled}
                onCheckedChange={(checked) =>
                  setPreferences(prev => ({
                    ...prev,
                    quietHours: { ...prev.quietHours, enabled: checked }
                  }))
                }
              />
            </div>

            {preferences.quietHours.enabled && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="quiet-start">Start Time</Label>
                    <Select
                      value={preferences.quietHours.start}
                      onValueChange={(value) =>
                        setPreferences(prev => ({
                          ...prev,
                          quietHours: { ...prev.quietHours, start: value }
                        }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 24 }, (_, i) => (
                          <SelectItem key={i} value={`${i.toString().padStart(2, '0')}:00`}>
                            {i === 0 ? '12:00 AM' : i < 12 ? `${i}:00 AM` : i === 12 ? '12:00 PM' : `${i - 12}:00 PM`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="quiet-end">End Time</Label>
                    <Select
                      value={preferences.quietHours.end}
                      onValueChange={(value) =>
                        setPreferences(prev => ({
                          ...prev,
                          quietHours: { ...prev.quietHours, end: value }
                        }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 24 }, (_, i) => (
                          <SelectItem key={i} value={`${i.toString().padStart(2, '0')}:00`}>
                            {i === 0 ? '12:00 AM' : i < 12 ? `${i}:00 AM` : i === 12 ? '12:00 PM' : `${i - 12}:00 PM`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Role Recommendations */}
        {roleInfo.recommendations.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Heart className="w-5 h-5" />
                Recommendations for {userRole}s
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {roleInfo.recommendations.map((rec, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-600 mt-2 flex-shrink-0" />
                    <span className="text-sm text-gray-600">{rec}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {/* Save Button */}
        <div className="flex items-center gap-3 pt-4">
          <Button
            onClick={savePreferences}
            disabled={saving}
            className="flex items-center gap-2"
          >
            {saving ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            ) : (
              <Settings2 className="w-4 h-4" />
            )}
            {saving ? 'Saving...' : 'Save Preferences'}
          </Button>
          
          {saved && (
            <span className="text-sm text-green-600">
              ✓ Preferences saved successfully
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
```

### 5. Navigation Badge Component

Unread count indicator for main navigation:

```typescript
// /wedsync/src/components/broadcast/BroadcastBadge.tsx
'use client';

import { useState, useEffect } from 'react';
import { Bell } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useBroadcastSubscription } from '@/hooks/useBroadcastSubscription';

interface BroadcastBadgeProps {
  userId: string;
  showLabel?: boolean;
  variant?: 'icon' | 'button';
  onClick?: () => void;
  className?: string;
}

export function BroadcastBadge({
  userId,
  showLabel = false,
  variant = 'icon',
  onClick,
  className
}: BroadcastBadgeProps) {
  const { unreadCount, connectionStatus } = useBroadcastSubscription(userId);
  const [animateCount, setAnimateCount] = useState(false);

  // Animate badge when count changes
  useEffect(() => {
    if (unreadCount > 0) {
      setAnimateCount(true);
      const timer = setTimeout(() => setAnimateCount(false), 500);
      return () => clearTimeout(timer);
    }
  }, [unreadCount]);

  if (variant === 'button') {
    return (
      <Button
        variant="ghost"
        size="sm"
        onClick={onClick}
        className={cn(
          'relative flex items-center gap-2',
          className
        )}
      >
        <Bell className="w-4 h-4" />
        {showLabel && <span>Notifications</span>}
        
        {unreadCount > 0 && (
          <Badge
            variant="destructive"
            className={cn(
              'absolute -top-1 -right-1 min-w-[20px] h-5 rounded-full text-xs font-bold',
              'flex items-center justify-center px-1.5',
              animateCount && 'animate-bounce'
            )}
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </Badge>
        )}
        
        {/* Connection indicator */}
        {connectionStatus !== 'connected' && (
          <div className="absolute -bottom-1 -right-1 w-2 h-2 rounded-full bg-red-500 animate-pulse" />
        )}
      </Button>
    );
  }

  return (
    <div 
      className={cn(
        'relative inline-flex cursor-pointer',
        className
      )}
      onClick={onClick}
    >
      <Bell className="w-5 h-5 text-gray-600 hover:text-gray-800 transition-colors" />
      
      {unreadCount > 0 && (
        <Badge
          variant="destructive"
          className={cn(
            'absolute -top-2 -right-2 min-w-[18px] h-4 rounded-full text-xs font-bold',
            'flex items-center justify-center px-1',
            animateCount && 'animate-bounce'
          )}
        >
          {unreadCount > 99 ? '99+' : unreadCount}
        </Badge>
      )}
      
      {/* Connection status */}
      {connectionStatus !== 'connected' && (
        <div className="absolute -bottom-1 -right-1 w-2 h-2 rounded-full bg-red-500 animate-pulse" />
      )}
    </div>
  );
}
```

## Evidence-Based Completion Requirements

### 1. File Existence Verification
Team A must provide evidence of created files:

```bash
# Core broadcast components
ls -la wedsync/src/components/broadcast/
# Expected: BroadcastToast.tsx, BroadcastCenter.tsx, BroadcastInbox.tsx, BroadcastPreferences.tsx, BroadcastBadge.tsx

# Component tests
ls -la wedsync/src/__tests__/unit/components/broadcast/
# Expected: BroadcastToast.test.tsx, BroadcastCenter.test.tsx, BroadcastInbox.test.tsx

# Storybook stories
ls -la wedsync/src/components/broadcast/*.stories.tsx
# Expected: BroadcastToast.stories.tsx, BroadcastCenter.stories.tsx
```

### 2. TypeScript Compilation Check
```bash
# Verify all components compile without errors
npx tsc --noEmit --project wedsync/tsconfig.json

# Specific broadcast component check
npx tsc --noEmit wedsync/src/components/broadcast/*.tsx
```

### 3. Wedding Industry Context Validation
```bash
# Test wedding-specific features
npm test -- --testPathPattern=broadcast --testNamePattern="wedding"

# Verify role-based filtering works
npm test -- --testPathPattern=broadcast --testNamePattern="role"
```

### 4. Accessibility Compliance Check
```bash
# Run accessibility tests on broadcast components
npm run test:a11y -- --include=broadcast

# Expected results: All broadcast components pass WCAG 2.1 AA
```

## Integration with Navigation System

Ensure broadcast components integrate seamlessly:

```typescript
// Integration point in main layout
const broadcastIntegration = {
  component: 'BroadcastBadge',
  location: 'MainNavigation',
  requirements: [
    'Show unread count in navigation',
    'Open BroadcastInbox on click',
    'Real-time updates',
    'Connection status indicator'
  ]
};
```

## Wedding Industry Specific Requirements

### Priority Mapping for Wedding Contexts
- **Critical**: Wedding cancellations, payment failures, security alerts
- **High**: Timeline changes within 48 hours, vendor no-shows, weather alerts
- **Normal**: New feature announcements, general timeline updates, supplier updates
- **Low**: Marketing messages, tips and tricks, seasonal recommendations

### Role-Based Display Logic
- **Couples**: Gentle notifications, wedding-focused, reduced frequency
- **Coordinators**: All notifications, immediate display, comprehensive inbox
- **Photographers**: Timeline and payment focused, visual priority indicators
- **Suppliers**: Relevant wedding updates only, cross-wedding filtering

## Completion Checklist

- [ ] BroadcastToast component with priority-based styling created
- [ ] BroadcastCenter container with queue management implemented
- [ ] BroadcastInbox with search and filtering functionality built
- [ ] BroadcastPreferences with role-based recommendations completed
- [ ] BroadcastBadge for navigation integration finished
- [ ] Wedding industry context integration throughout all components
- [ ] Accessibility compliance verified (WCAG 2.1 AA)
- [ ] Mobile-responsive design tested across devices
- [ ] Real-time update functionality working
- [ ] Priority queue visual indicators implemented
- [ ] Role-based filtering and customization working
- [ ] Connection status indicators functional
- [ ] Analytics tracking implemented for user engagement
- [ ] File existence verification completed
- [ ] TypeScript compilation successful
- [ ] Unit tests written and passing
- [ ] Integration with navigation system verified

**Estimated Completion**: End of Sprint 21
**Success Criteria**: Wedding industry professionals can receive, manage, and customize broadcast notifications with role-appropriate priority handling and excellent user experience across all devices.

**Next Steps**: Upon completion of WS-205 Team A UI components, the foundation will be ready for Team B backend infrastructure, enabling full broadcast system deployment.