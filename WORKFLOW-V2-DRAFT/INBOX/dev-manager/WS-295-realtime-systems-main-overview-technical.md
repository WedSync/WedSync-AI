# WS-295: Real-time Systems - Main Overview - Technical Specification

## Feature Overview

**Feature ID**: WS-295  
**Feature Name**: Real-time Systems - Main Overview  
**Feature Type**: Core Infrastructure  
**Priority**: P0 (Critical Foundation)  
**Complexity**: High  
**Effort**: 2.5 weeks  

## Problem Statement

The WedSync/WedMe platform requires real-time communication infrastructure that provides:
- Instant Core Fields synchronization across all connected suppliers (<100ms)
- Real-time form response updates to prevent suppliers missing submissions
- Live collaboration features between suppliers and couples during planning
- Presence tracking to show when couples/suppliers are active and available
- Performance targets: <100ms message delivery, >99.9% connection reliability
- Scalable WebSocket management supporting 10,000+ concurrent connections

**Current Pain Points:**
- No real-time updates causing suppliers to miss form submissions
- Couples unaware of supplier availability for collaboration
- Core Fields changes take minutes to propagate, causing confusion
- No visual indicators of form completion progress
- Missing typing indicators and presence status for collaboration
- No system for real-time notifications and alerts

## Solution Architecture

### Core Components

#### 1. Supabase Realtime Infrastructure
- **PostgreSQL Realtime**: Database-driven real-time updates via logical replication
- **WebSocket connections**: Persistent connections with auto-reconnect and heartbeat
- **Channel management**: Organized channels for different data types and permissions
- **Row Level Security**: Database-enforced permissions for secure real-time updates

#### 2. Channel Architecture
- **Private channels**: User-specific dashboards and personal data (supplier:dashboard:{id})
- **Shared channels**: Supplier-couple collaboration workspaces (collaboration:{supplier_id}:{couple_id})
- **Broadcast channels**: System-wide updates and announcements
- **Resource channels**: Form submissions, journey progress, Core Fields updates

#### 3. Presence Tracking System
- **User status**: Online, idle, away, offline, busy states with automatic detection
- **Activity indicators**: Current page, typing status, device type
- **Privacy controls**: Visibility settings and "appear offline" options
- **Performance optimization**: Debounced updates and batching

#### 4. Event Broadcasting
- **Form events**: New submissions, field completions, validations
- **Journey events**: Step completions, email opens, task reminders
- **Collaboration events**: Typing indicators, comments, document saves
- **System events**: Notifications, alerts, status changes

#### 5. Connection Management
- **Auto-reconnection**: Exponential backoff strategy for connection failures
- **Message queuing**: Buffer and replay messages during disconnections
- **Heartbeat monitoring**: 30-second heartbeat with connection health checks
- **Rate limiting**: Tier-specific limits for channel subscriptions and message frequency

## User Stories

### Epic: Real-time Collaboration
**As a** Platform User  
**I want** Real-time updates across all platform interactions  
**So that** I never miss important information and can collaborate effectively

**Acceptance Criteria:**
- Core Fields updates propagate in <100ms
- Form submissions appear instantly in supplier dashboard
- Presence status shows availability for collaboration
- Connection reliability >99.9% with automatic reconnection
- No message loss during temporary disconnections

### Story: Core Fields Real-time Sync
**As a** Couple (James & Emma)  
**I want** My wedding details to update instantly across all suppliers  
**So that** Everyone always has the latest information without confusion

**Scenario**: Emma changes wedding venue from "Grand Hotel" to "Garden Manor"

**Acceptance Criteria:**
- All 5 connected suppliers see venue change within 100ms
- Venue-dependent fields (capacity, location) update automatically
- Suppliers receive notification of the change
- Form auto-population reflects new venue immediately
- No suppliers work with outdated venue information

### Story: Real-time Form Collaboration
**As a** Wedding Supplier (Sarah, photographer)  
**I want** To see when couples are actively filling out my forms  
**So that** I can provide immediate help and not miss submissions

**Scenario**: Couple starts filling "Shot List Preferences" form at 2 PM

**Acceptance Criteria:**
- Sarah sees "James & Emma are currently filling out Shot List Preferences"
- Progress bar updates in real-time as fields are completed
- Sarah sees typing indicators on specific questions
- Completed sections appear immediately without page refresh
- Sarah can see if couple is struggling on particular questions

### Story: Supplier Availability Presence
**As a** Couple (James & Emma)  
**I want** To see when my suppliers are online and available  
**So that** I can reach out at the best times for quick responses

**Scenario**: Emma has urgent catering questions on Tuesday evening

**Acceptance Criteria:**
- Emma sees "Lisa's Catering - Online (active 2 minutes ago)"
- Green presence indicator shows Lisa is currently active
- Emma knows Lisa is likely to respond quickly to messages
- If Lisa goes "Away", Emma sees updated status immediately
- Emma can see Lisa is viewing the catering form in real-time

### Story: Journey Progress Broadcasting
**As a** Wedding Supplier (Mike, venue owner)  
**I want** To see real-time progress on customer journey milestones  
**So that** I can coordinate with couples and other suppliers effectively

**Scenario**: Couple completes venue walkthrough journey step

**Acceptance Criteria:**
- Mike sees "✅ Venue Walkthrough - Completed just now"
- Next step "Contract Review" automatically becomes available
- Timeline updates show new completion status immediately
- Other suppliers see updated wedding planning progress
- Automated follow-up email triggers in real-time

### Story: Real-time Notifications
**As a** Wedding Supplier (Lisa, venue owner)  
**I want** Instant notifications for important platform events  
**So that** I never miss time-sensitive opportunities or issues

**Scenario**: New couple invites Lisa to their wedding planning team

**Acceptance Criteria:**
- Lisa sees notification badge immediately without refresh
- Toast notification appears: "New invitation from James & Emma"
- Notification count updates in real-time across all browser tabs
- Click notification takes Lisa directly to invitation details
- Accepting invitation immediately updates couple's supplier list

## Database Design

### Real-time Configuration Tables

```sql
-- Enable realtime on all critical tables
ALTER TABLE suppliers REPLICA IDENTITY FULL;
ALTER TABLE couples REPLICA IDENTITY FULL;
ALTER TABLE clients REPLICA IDENTITY FULL;
ALTER TABLE forms REPLICA IDENTITY FULL;
ALTER TABLE form_responses REPLICA IDENTITY FULL;
ALTER TABLE core_field_values REPLICA IDENTITY FULL;
ALTER TABLE journey_instances REPLICA IDENTITY FULL;
ALTER TABLE notifications REPLICA IDENTITY FULL;

-- Real-time monitoring and configuration
CREATE TABLE IF NOT EXISTS realtime_channels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    channel_name VARCHAR(200) NOT NULL UNIQUE,
    channel_type VARCHAR(50) NOT NULL CHECK (channel_type IN ('private', 'shared', 'broadcast', 'resource')),
    description TEXT,
    max_subscribers INTEGER DEFAULT 1000,
    message_rate_limit INTEGER DEFAULT 100, -- messages per minute
    payload_size_limit INTEGER DEFAULT 65536, -- 64KB
    auth_required BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    
    -- Index for channel lookup
    INDEX idx_realtime_channels_name (channel_name),
    INDEX idx_realtime_channels_type (channel_type)
);

CREATE TABLE IF NOT EXISTS realtime_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    channel_name VARCHAR(200) NOT NULL,
    subscription_filters JSONB,
    subscription_tier VARCHAR(20) DEFAULT 'free',
    max_channels_allowed INTEGER DEFAULT 3,
    connected_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    last_activity TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    disconnected_at TIMESTAMPTZ,
    
    -- Constraints
    UNIQUE(user_id, channel_name),
    
    -- Indexes for subscription management
    INDEX idx_realtime_subs_user_active (user_id, connected_at DESC) WHERE disconnected_at IS NULL,
    INDEX idx_realtime_subs_channel_active (channel_name, connected_at DESC) WHERE disconnected_at IS NULL
);

CREATE TABLE IF NOT EXISTS realtime_presence (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    channel_name VARCHAR(200) NOT NULL,
    status VARCHAR(20) DEFAULT 'online' CHECK (status IN ('online', 'idle', 'away', 'offline', 'busy')),
    current_page VARCHAR(500),
    is_typing BOOLEAN DEFAULT false,
    device_type VARCHAR(20) DEFAULT 'desktop' CHECK (device_type IN ('desktop', 'mobile', 'tablet')),
    last_activity TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    presence_data JSONB DEFAULT '{}',
    
    -- Unique constraint to prevent duplicate presence
    UNIQUE(user_id, channel_name),
    
    -- Index for presence queries
    INDEX idx_presence_channel_status (channel_name, status, last_activity DESC),
    INDEX idx_presence_user_activity (user_id, last_activity DESC)
);

CREATE TABLE IF NOT EXISTS realtime_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type VARCHAR(100) NOT NULL,
    channel_name VARCHAR(200) NOT NULL,
    user_id UUID REFERENCES auth.users(id),
    payload JSONB NOT NULL,
    broadcast_count INTEGER DEFAULT 0,
    delivered_count INTEGER DEFAULT 0,
    failed_count INTEGER DEFAULT 0,
    event_priority INTEGER DEFAULT 1 CHECK (event_priority BETWEEN 1 AND 10),
    expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '5 minutes',
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    
    -- Index for event processing
    INDEX idx_realtime_events_channel_time (channel_name, created_at DESC),
    INDEX idx_realtime_events_type_time (event_type, created_at DESC),
    INDEX idx_realtime_events_undelivered (event_priority DESC, created_at ASC) 
        WHERE delivered_count < broadcast_count AND created_at < expires_at
);

CREATE TABLE IF NOT EXISTS realtime_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    metric_name VARCHAR(100) NOT NULL,
    channel_name VARCHAR(200),
    user_id UUID REFERENCES auth.users(id),
    metric_value INTEGER NOT NULL,
    metric_unit VARCHAR(20) DEFAULT 'count',
    recorded_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    
    -- Index for metrics analysis
    INDEX idx_realtime_metrics_name_time (metric_name, recorded_at DESC),
    INDEX idx_realtime_metrics_channel_time (channel_name, metric_name, recorded_at DESC)
);

-- Row Level Security Policies

-- Realtime subscriptions - Users can manage their own subscriptions
ALTER TABLE realtime_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own subscriptions" ON realtime_subscriptions
    FOR ALL USING (user_id = auth.uid());

CREATE POLICY "Admin access all subscriptions" ON realtime_subscriptions
    FOR ALL USING (
        EXISTS (SELECT 1 FROM user_profiles 
                WHERE user_id = auth.uid() 
                AND role = 'admin')
    );

-- Presence tracking - Users can see presence based on collaboration rules
ALTER TABLE realtime_presence ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own presence" ON realtime_presence
    FOR ALL USING (user_id = auth.uid());

-- See presence of connected suppliers/couples
CREATE POLICY "Collaboration presence visibility" ON realtime_presence
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM supplier_client_connections scc
            JOIN user_profiles up1 ON up1.supplier_id = scc.supplier_id
            JOIN user_profiles up2 ON up2.couple_id = scc.couple_id
            WHERE (up1.user_id = auth.uid() AND up2.user_id = realtime_presence.user_id)
               OR (up2.user_id = auth.uid() AND up1.user_id = realtime_presence.user_id)
        )
    );

-- Realtime events - Admin and service role access
ALTER TABLE realtime_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role access to events" ON realtime_events
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Admin access to events" ON realtime_events
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM user_profiles 
                WHERE user_id = auth.uid() 
                AND role = 'admin')
    );

-- Realtime metrics - Admin access only
ALTER TABLE realtime_metrics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin access to realtime metrics" ON realtime_metrics
    FOR ALL USING (
        EXISTS (SELECT 1 FROM user_profiles 
                WHERE user_id = auth.uid() 
                AND role = 'admin')
    );
```

### Database Triggers for Real-time Events

```sql
-- Trigger for Core Fields real-time updates
CREATE OR REPLACE FUNCTION notify_core_field_change()
RETURNS trigger AS $$
BEGIN
    -- Broadcast to all connected suppliers for this couple
    PERFORM pg_notify(
        'core_fields_updated',
        json_build_object(
            'couple_id', NEW.couple_id,
            'field_name', NEW.field_name,
            'old_value', OLD.value,
            'new_value', NEW.value,
            'updated_by', auth.uid(),
            'timestamp', NOW()
        )::text
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_core_field_realtime
    AFTER UPDATE ON core_field_values
    FOR EACH ROW
    EXECUTE FUNCTION notify_core_field_change();

-- Trigger for form submission real-time updates
CREATE OR REPLACE FUNCTION notify_form_submission()
RETURNS trigger AS $$
BEGIN
    -- Broadcast to supplier when form is submitted
    PERFORM pg_notify(
        'form_submitted',
        json_build_object(
            'form_id', NEW.form_id,
            'supplier_id', NEW.supplier_id,
            'couple_id', NEW.couple_id,
            'completion_percentage', NEW.completion_percentage,
            'submitted_at', NEW.updated_at
        )::text
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_form_submission_realtime
    AFTER INSERT OR UPDATE ON form_responses
    FOR EACH ROW
    EXECUTE FUNCTION notify_form_submission();
```

## API Endpoints

### Real-time Management APIs

```typescript
// /api/realtime/channels - GET
interface RealtimeChannelsResponse {
  channels: Array<{
    name: string;
    type: 'private' | 'shared' | 'broadcast' | 'resource';
    subscriber_count: number;
    max_subscribers: number;
    message_rate_limit: number;
    auth_required: boolean;
  }>;
  user_subscriptions: Array<{
    channel_name: string;
    connected_at: string;
    last_activity: string;
    subscription_tier: string;
  }>;
  subscription_limits: {
    max_channels: number;
    current_channels: number;
    available_channels: number;
  };
}

// /api/realtime/presence - GET, POST
interface PresenceStatusRequest {
  status: 'online' | 'idle' | 'away' | 'offline' | 'busy';
  current_page?: string;
  device_type?: 'desktop' | 'mobile' | 'tablet';
  presence_data?: Record<string, any>;
}

interface PresenceStatusResponse {
  user_presence: {
    status: string;
    current_page?: string;
    is_typing: boolean;
    device_type: string;
    last_activity: string;
  };
  collaborator_presence: Array<{
    user_id: string;
    user_name: string;
    user_type: 'supplier' | 'couple';
    status: string;
    current_page?: string;
    is_typing: boolean;
    last_activity: string;
  }>;
}

// /api/realtime/events - POST
interface BroadcastEventRequest {
  event_type: string;
  channel_name: string;
  payload: Record<string, any>;
  priority?: number; // 1-10, higher is more important
  expires_in_minutes?: number;
}

interface BroadcastEventResponse {
  event_id: string;
  estimated_delivery_ms: number;
  subscriber_count: number;
  broadcast_scheduled: boolean;
}

// /api/realtime/metrics - GET
interface RealtimeMetricsResponse {
  connection_stats: {
    active_connections: number;
    total_channels: number;
    messages_per_minute: number;
    connection_uptime_percent: number;
  };
  channel_performance: Array<{
    channel_name: string;
    subscriber_count: number;
    messages_sent: number;
    average_delivery_ms: number;
    error_rate: number;
  }>;
  user_activity: {
    online_users: number;
    idle_users: number;
    typing_users: number;
    peak_concurrent_users: number;
  };
}
```

### WebSocket Event Types

```typescript
// Core Fields synchronization events
interface CoreFieldsUpdateEvent {
  type: 'core_fields_updated';
  payload: {
    couple_id: string;
    field_name: string;
    old_value: any;
    new_value: any;
    updated_by: string;
    timestamp: string;
    auto_populated_fields: string[]; // Other fields updated automatically
  };
}

// Form collaboration events
interface FormCollaborationEvent {
  type: 'form_field_updated' | 'form_submitted' | 'form_typing_start' | 'form_typing_stop';
  payload: {
    form_id: string;
    supplier_id: string;
    couple_id: string;
    field_id?: string; // For field-specific events
    user_name: string;
    completion_percentage?: number;
    timestamp: string;
  };
}

// Presence tracking events
interface PresenceUpdateEvent {
  type: 'presence_updated';
  payload: {
    user_id: string;
    user_name: string;
    user_type: 'supplier' | 'couple';
    status: 'online' | 'idle' | 'away' | 'offline' | 'busy';
    current_page?: string;
    is_typing: boolean;
    device_type: string;
    timestamp: string;
  };
}

// Journey progress events
interface JourneyProgressEvent {
  type: 'journey_step_completed' | 'journey_email_opened' | 'journey_task_due';
  payload: {
    journey_id: string;
    step_id?: string;
    supplier_id: string;
    couple_id: string;
    progress_percentage: number;
    next_steps: string[];
    timestamp: string;
  };
}

// Notification events
interface NotificationEvent {
  type: 'notification_new' | 'notification_read' | 'notification_dismissed';
  payload: {
    notification_id: string;
    user_id: string;
    title: string;
    message: string;
    action_url?: string;
    priority: 'low' | 'medium' | 'high' | 'urgent';
    timestamp: string;
  };
}
```

## Frontend Components

### Real-time Provider Hook

```typescript
// hooks/useRealtimeProvider.ts
'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useSession } from 'next-auth/react';
import { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

interface RealtimeContextType {
  isConnected: boolean;
  subscriptions: Map<string, RealtimeChannel>;
  subscribe: (channelName: string, config: ChannelConfig) => Promise<void>;
  unsubscribe: (channelName: string) => void;
  broadcast: (channelName: string, eventType: string, payload: any) => void;
  presence: Map<string, PresenceState[]>;
  updatePresence: (status: PresenceStatus, data?: any) => void;
  connectionQuality: 'excellent' | 'good' | 'poor' | 'disconnected';
}

interface ChannelConfig {
  events?: Array<{
    event: string;
    schema?: string;
    table?: string;
    filter?: string;
    callback: (payload: any) => void;
  }>;
  presence?: boolean;
  broadcast?: boolean;
}

interface PresenceState {
  user_id: string;
  user_name: string;
  status: PresenceStatus;
  current_page?: string;
  is_typing: boolean;
  device_type: string;
  last_activity: string;
}

type PresenceStatus = 'online' | 'idle' | 'away' | 'offline' | 'busy';

const RealtimeContext = createContext<RealtimeContextType | undefined>(undefined);

export function RealtimeProvider({ children }: { children: ReactNode }) {
  const { data: session } = useSession();
  const [isConnected, setIsConnected] = useState(false);
  const [subscriptions, setSubscriptions] = useState(new Map<string, RealtimeChannel>());
  const [presence, setPresence] = useState(new Map<string, PresenceState[]>());
  const [connectionQuality, setConnectionQuality] = useState<RealtimeContextType['connectionQuality']>('disconnected');
  
  // Connection monitoring
  useEffect(() => {
    if (!session?.user) return;

    let heartbeatInterval: NodeJS.Timeout;
    let reconnectAttempts = 0;
    const maxReconnectAttempts = 5;

    const handleConnectionChange = (status: string) => {
      setIsConnected(status === 'SUBSCRIBED');
      setConnectionQuality(
        status === 'SUBSCRIBED' ? 'excellent' : 
        status === 'CHANNEL_ERROR' ? 'poor' : 
        'disconnected'
      );

      if (status === 'CLOSED' && reconnectAttempts < maxReconnectAttempts) {
        reconnectAttempts++;
        const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 30000);
        setTimeout(() => {
          // Reconnect logic would go here
        }, delay);
      }
    };

    // Heartbeat to monitor connection quality
    heartbeatInterval = setInterval(() => {
      const start = Date.now();
      supabase.channel('heartbeat').send({
        type: 'heartbeat',
        event: 'ping',
        payload: { timestamp: start }
      });
      
      // Measure response time to determine quality
      const responseTime = Date.now() - start;
      setConnectionQuality(
        responseTime < 100 ? 'excellent' :
        responseTime < 500 ? 'good' :
        responseTime < 1000 ? 'poor' :
        'disconnected'
      );
    }, 30000);

    return () => {
      clearInterval(heartbeatInterval);
    };
  }, [session]);

  const subscribe = async (channelName: string, config: ChannelConfig) => {
    if (!session?.user) return;

    // Check subscription limits based on user tier
    const userTier = session.user.subscription_tier || 'free';
    const maxChannels = userTier === 'free' ? 3 : 10;
    
    if (subscriptions.size >= maxChannels) {
      throw new Error(`Maximum ${maxChannels} channels allowed for ${userTier} tier`);
    }

    const channel = supabase.channel(channelName);

    // Add PostgreSQL change listeners
    if (config.events) {
      config.events.forEach(eventConfig => {
        channel.on(
          'postgres_changes' as any,
          {
            event: eventConfig.event,
            schema: eventConfig.schema || 'public',
            table: eventConfig.table,
            filter: eventConfig.filter
          },
          (payload: RealtimePostgresChangesPayload<any>) => {
            eventConfig.callback(payload);
          }
        );
      });
    }

    // Add presence tracking
    if (config.presence) {
      channel.on('presence', { event: 'sync' }, () => {
        const presenceState = channel.presenceState();
        setPresence(prev => new Map(prev.set(channelName, Object.values(presenceState).flat())));
      });

      // Track own presence
      channel.on('presence', { event: 'join' }, ({ newPresences }) => {
        setPresence(prev => {
          const current = prev.get(channelName) || [];
          return new Map(prev.set(channelName, [...current, ...newPresences]));
        });
      });

      channel.on('presence', { event: 'leave' }, ({ leftPresences }) => {
        setPresence(prev => {
          const current = prev.get(channelName) || [];
          const leftIds = leftPresences.map((p: any) => p.user_id);
          return new Map(prev.set(channelName, current.filter(p => !leftIds.includes(p.user_id))));
        });
      });
    }

    // Add broadcast listeners
    if (config.broadcast) {
      channel.on('broadcast', { event: '*' }, (payload) => {
        // Handle broadcast events
        console.log('Broadcast received:', payload);
      });
    }

    await channel.subscribe();
    setSubscriptions(prev => new Map(prev.set(channelName, channel)));
  };

  const unsubscribe = (channelName: string) => {
    const channel = subscriptions.get(channelName);
    if (channel) {
      supabase.removeChannel(channel);
      setSubscriptions(prev => {
        const newMap = new Map(prev);
        newMap.delete(channelName);
        return newMap;
      });
      setPresence(prev => {
        const newMap = new Map(prev);
        newMap.delete(channelName);
        return newMap;
      });
    }
  };

  const broadcast = (channelName: string, eventType: string, payload: any) => {
    const channel = subscriptions.get(channelName);
    if (channel) {
      channel.send({
        type: 'broadcast',
        event: eventType,
        payload: payload
      });
    }
  };

  const updatePresence = async (status: PresenceStatus, data: any = {}) => {
    if (!session?.user) return;

    const presenceData = {
      user_id: session.user.id,
      user_name: session.user.name || 'Unknown',
      status,
      current_page: window.location.pathname,
      device_type: /Mobile|Android|iPhone|iPad/.test(navigator.userAgent) ? 'mobile' : 'desktop',
      last_activity: new Date().toISOString(),
      ...data
    };

    // Update presence in all subscribed channels
    for (const [channelName, channel] of subscriptions) {
      await channel.track(presenceData);
    }

    // Also update server-side presence record
    await fetch('/api/realtime/presence', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(presenceData)
    });
  };

  return (
    <RealtimeContext.Provider value={{
      isConnected,
      subscriptions,
      subscribe,
      unsubscribe,
      broadcast,
      presence,
      updatePresence,
      connectionQuality
    }}>
      {children}
    </RealtimeContext.Provider>
  );
}

export function useRealtime() {
  const context = useContext(RealtimeContext);
  if (!context) {
    throw new Error('useRealtime must be used within a RealtimeProvider');
  }
  return context;
}
```

### Presence Indicator Component

```typescript
// components/realtime/PresenceIndicator.tsx
'use client';

import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useRealtime } from '@/hooks/useRealtimeProvider';

interface PresenceIndicatorProps {
  channelName: string;
  showNames?: boolean;
  maxVisible?: number;
  size?: 'sm' | 'md' | 'lg';
}

export function PresenceIndicator({ 
  channelName, 
  showNames = false, 
  maxVisible = 5,
  size = 'md'
}: PresenceIndicatorProps) {
  const { presence } = useRealtime();
  const channelPresence = presence.get(channelName) || [];
  
  const onlineUsers = channelPresence.filter(user => 
    ['online', 'idle'].includes(user.status)
  );
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return 'bg-green-500';
      case 'idle': return 'bg-yellow-500';
      case 'busy': return 'bg-red-500';
      case 'away':
      case 'offline':
      default: return 'bg-gray-400';
    }
  };

  const getActivityDescription = (user: any) => {
    const lastActivity = new Date(user.last_activity);
    const minutesAgo = Math.floor((Date.now() - lastActivity.getTime()) / 60000);
    
    let activityText = '';
    if (user.status === 'online' && minutesAgo < 2) {
      activityText = user.is_typing ? 'typing...' : 'active now';
    } else if (user.status === 'idle') {
      activityText = `idle ${minutesAgo}m ago`;
    } else {
      activityText = `last seen ${minutesAgo}m ago`;
    }

    return activityText;
  };

  const avatarSize = size === 'sm' ? 'w-6 h-6' : size === 'lg' ? 'w-10 h-10' : 'w-8 h-8';
  const dotSize = size === 'sm' ? 'w-2 h-2' : size === 'lg' ? 'w-3 h-3' : 'w-2.5 h-2.5';

  if (onlineUsers.length === 0) {
    return showNames ? (
      <span className="text-sm text-muted-foreground">No one online</span>
    ) : null;
  }

  return (
    <TooltipProvider>
      <div className="flex items-center gap-2">
        {/* Avatar Stack */}
        <div className="flex -space-x-2">
          {onlineUsers.slice(0, maxVisible).map((user, index) => (
            <Tooltip key={user.user_id}>
              <TooltipTrigger asChild>
                <div className="relative">
                  <Avatar className={`${avatarSize} border-2 border-background hover:z-10`}>
                    <AvatarImage src={`/api/users/${user.user_id}/avatar`} />
                    <AvatarFallback className="text-xs">
                      {user.user_name.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  {/* Status dot */}
                  <div 
                    className={`absolute -bottom-0.5 -right-0.5 ${dotSize} rounded-full border-2 border-background ${getStatusColor(user.status)}`} 
                  />
                  {/* Typing indicator */}
                  {user.is_typing && (
                    <div className="absolute -top-1 -right-1">
                      <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse" />
                    </div>
                  )}
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <div className="text-center">
                  <div className="font-medium">{user.user_name}</div>
                  <div className="text-xs text-muted-foreground">
                    {getActivityDescription(user)}
                  </div>
                  {user.current_page && (
                    <div className="text-xs text-muted-foreground">
                      Viewing: {user.current_page.split('/').pop()}
                    </div>
                  )}
                </div>
              </TooltipContent>
            </Tooltip>
          ))}
          
          {/* Overflow indicator */}
          {onlineUsers.length > maxVisible && (
            <div className={`${avatarSize} bg-muted border-2 border-background rounded-full flex items-center justify-center`}>
              <span className="text-xs font-medium">+{onlineUsers.length - maxVisible}</span>
            </div>
          )}
        </div>

        {/* Names list (optional) */}
        {showNames && (
          <div className="flex flex-col">
            {onlineUsers.slice(0, 3).map(user => (
              <div key={user.user_id} className="text-sm">
                <span className="font-medium">{user.user_name}</span>
                <span className="text-muted-foreground ml-2">
                  {getActivityDescription(user)}
                </span>
              </div>
            ))}
            {onlineUsers.length > 3 && (
              <div className="text-xs text-muted-foreground">
                +{onlineUsers.length - 3} more online
              </div>
            )}
          </div>
        )}

        {/* Online count badge */}
        {!showNames && (
          <Badge variant="secondary" className="text-xs">
            {onlineUsers.length} online
          </Badge>
        )}
      </div>
    </TooltipProvider>
  );
}
```

### Real-time Form Collaboration

```typescript
// components/forms/RealtimeFormBuilder.tsx
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRealtime } from '@/hooks/useRealtimeProvider';
import { PresenceIndicator } from '@/components/realtime/PresenceIndicator';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface RealtimeFormBuilderProps {
  formId: string;
  supplierId: string;
  coupleId?: string;
  isReadOnly?: boolean;
}

export function RealtimeFormBuilder({ 
  formId, 
  supplierId, 
  coupleId, 
  isReadOnly = false 
}: RealtimeFormBuilderProps) {
  const { subscribe, unsubscribe, broadcast, updatePresence } = useRealtime();
  const [formData, setFormData] = useState<any>({});
  const [collaboratorActivity, setCollaboratorActivity] = useState<Record<string, any>>({});
  const [recentChanges, setRecentChanges] = useState<string[]>([]);
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  
  const typingTimeoutRef = useRef<Record<string, NodeJS.Timeout>>({});
  const channelName = `form:${formId}`;

  useEffect(() => {
    // Subscribe to form updates
    subscribe(channelName, {
      events: [
        {
          event: '*',
          schema: 'public',
          table: 'form_responses',
          filter: `form_id=eq.${formId}`,
          callback: handleFormUpdate
        }
      ],
      presence: true,
      broadcast: true
    });

    // Update presence to show we're viewing this form
    updatePresence('online', {
      current_page: `/forms/${formId}`,
      is_typing: false
    });

    return () => {
      unsubscribe(channelName);
    };
  }, [formId]);

  const handleFormUpdate = useCallback((payload: any) => {
    const { eventType, new: newRecord, old: oldRecord } = payload;
    
    if (eventType === 'INSERT' || eventType === 'UPDATE') {
      setFormData(newRecord.response_data);
      
      // Track recent changes
      const changeDescription = `${newRecord.couple_name} updated the form`;
      setRecentChanges(prev => [changeDescription, ...prev.slice(0, 4)]);
      
      // Auto-dismiss change notification after 5 seconds
      setTimeout(() => {
        setRecentChanges(prev => prev.filter(change => change !== changeDescription));
      }, 5000);
    }
  }, []);

  const handleFieldChange = useCallback((fieldId: string, value: any) => {
    if (isReadOnly) return;

    // Update local state immediately for responsiveness
    setFormData((prev: any) => ({
      ...prev,
      [fieldId]: value
    }));

    // Broadcast typing indicator
    broadcast(channelName, 'field_typing', {
      field_id: fieldId,
      user_id: 'current_user', // Would come from session
      user_name: 'Current User'
    });

    // Broadcast field update
    broadcast(channelName, 'field_updated', {
      field_id: fieldId,
      value: value,
      timestamp: Date.now()
    });

    // Update presence to show typing
    updatePresence('online', {
      is_typing: true,
      current_page: `/forms/${formId}`,
      typing_field: fieldId
    });
  }, [isReadOnly, channelName, broadcast, updatePresence]);

  const handleTypingStop = useCallback((fieldId: string) => {
    // Clear typing timeout
    if (typingTimeoutRef.current[fieldId]) {
      clearTimeout(typingTimeoutRef.current[fieldId]);
    }

    // Set timeout to stop typing indicator
    typingTimeoutRef.current[fieldId] = setTimeout(() => {
      updatePresence('online', {
        is_typing: false,
        current_page: `/forms/${formId}`
      });
    }, 1000);
  }, [updatePresence, formId]);

  return (
    <div className="space-y-4">
      {/* Collaboration Header */}
      <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
        <div className="flex items-center gap-4">
          <h3 className="font-semibold">Form Collaboration</h3>
          <PresenceIndicator 
            channelName={channelName}
            showNames={true}
            maxVisible={3}
          />
        </div>
        
        {/* Connection Status */}
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          <span className="text-sm text-muted-foreground">Live</span>
        </div>
      </div>

      {/* Recent Changes Alert */}
      {recentChanges.length > 0 && (
        <Alert>
          <AlertDescription>
            <div className="space-y-1">
              {recentChanges.map((change, index) => (
                <div key={index} className="text-sm">
                  {change} <span className="text-muted-foreground">just now</span>
                </div>
              ))}
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Form Fields with Real-time Indicators */}
      <div className="space-y-6">
        {/* This would render actual form fields */}
        <div className="text-center py-8 text-muted-foreground">
          Form fields would be rendered here with real-time collaboration features:
          <ul className="mt-4 text-left space-y-2">
            <li>• Typing indicators on active fields</li>
            <li>• Real-time value updates</li>
            <li>• Field completion status</li>
            <li>• Conflict resolution for simultaneous edits</li>
          </ul>
        </div>
      </div>

      {/* Typing Indicators */}
      {typingUsers.size > 0 && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <div className="flex -space-x-1">
            {Array.from(typingUsers).map(userId => (
              <div key={userId} className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" />
            ))}
          </div>
          <span>{Array.from(typingUsers).join(', ')} typing...</span>
        </div>
      )}
    </div>
  );
}
```

## Integration Requirements

### MCP Server Usage

This feature requires integration with multiple MCP servers for comprehensive real-time functionality:

#### Supabase MCP Server
```typescript
// Enable realtime on database tables
await mcp_supabase.execute_sql(`
  ALTER TABLE suppliers REPLICA IDENTITY FULL;
  ALTER TABLE couples REPLICA IDENTITY FULL;
  ALTER TABLE form_responses REPLICA IDENTITY FULL;
  ALTER TABLE core_field_values REPLICA IDENTITY FULL;
  ALTER TABLE journey_instances REPLICA IDENTITY FULL;
`);

// Monitor realtime performance
const realtimeStats = await mcp_supabase.get_logs({
  service: 'realtime'
});

// Check database replication lag
const replicationLag = await mcp_supabase.execute_sql(`
  SELECT 
    slot_name,
    active,
    restart_lsn,
    confirmed_flush_lsn,
    pg_size_pretty(pg_wal_lsn_diff(pg_current_wal_lsn(), confirmed_flush_lsn)) as lag_size
  FROM pg_replication_slots 
  WHERE slot_type = 'logical';
`);
```

#### PostgreSQL MCP Server  
```typescript
// Monitor realtime performance metrics
const realtimeMetrics = await mcp_postgres.query(`
  SELECT 
    schemaname,
    tablename,
    n_tup_ins + n_tup_upd as changes_per_minute,
    EXTRACT(epoch FROM NOW() - last_vacuum) / 60 as minutes_since_vacuum
  FROM pg_stat_user_tables 
  WHERE schemaname = 'public'
  AND (n_tup_ins > 0 OR n_tup_upd > 0)
  ORDER BY changes_per_minute DESC;
`);

// Check WebSocket connection health
const connectionHealth = await mcp_postgres.query(`
  SELECT 
    channel_name,
    COUNT(*) as subscriber_count,
    AVG(EXTRACT(epoch FROM (NOW() - last_activity))) as avg_idle_seconds
  FROM realtime_subscriptions
  WHERE disconnected_at IS NULL
  GROUP BY channel_name
  ORDER BY subscriber_count DESC;
`);
```

#### Context7 MCP Server
```typescript
// Get latest Supabase Realtime patterns
const realtimeDocs = await mcp_context7.get_library_docs({
  context7CompatibleLibraryID: '/supabase/supabase',
  topic: 'realtime websockets'
});

// Get React patterns for WebSocket management
const reactDocs = await mcp_context7.get_library_docs({
  context7CompatibleLibraryID: '/facebook/react',
  topic: 'useeffect cleanup patterns'
});
```

## Technical Specifications

### Real-time Performance Requirements

```typescript
interface RealtimePerformanceTargets {
  message_delivery: {
    core_fields_sync: 100; // 100ms max
    form_updates: 200; // 200ms max
    presence_updates: 500; // 500ms max
    notifications: 1000; // 1 second max
  };
  connection_reliability: {
    uptime: 99.9; // 99.9%
    reconnection_success_rate: 99.5; // 99.5%
    message_delivery_rate: 99.9; // 99.9%
  };
  scalability: {
    concurrent_connections: 10000;
    channels_per_user: 10;
    messages_per_minute_per_channel: 100;
    max_payload_size_kb: 64;
  };
  battery_optimization: {
    mobile_heartbeat_interval_seconds: 60;
    desktop_heartbeat_interval_seconds: 30;
    presence_update_debounce_ms: 2000;
  };
}
```

### Channel Architecture

```typescript
interface ChannelStructure {
  naming_convention: {
    private: 'user:{user_type}:{user_id}';
    collaboration: 'collab:{supplier_id}:{couple_id}';
    resource: '{resource_type}:{resource_id}';
    broadcast: 'broadcast:{scope}';
  };
  
  subscription_limits: {
    free_tier: {
      max_channels: 3;
      max_message_rate: 10; // per minute
    };
    paid_tiers: {
      max_channels: 10;
      max_message_rate: 100; // per minute
    };
  };
  
  message_types: {
    postgres_changes: 'Database table changes';
    presence: 'User status and activity';
    broadcast: 'Custom application events';
  };
}
```

### Presence Management

```typescript
interface PresenceConfiguration {
  status_transitions: {
    online_to_idle: 120; // seconds of inactivity
    idle_to_away: 600; // seconds of inactivity
    away_to_offline: 3600; // seconds of inactivity
  };
  
  activity_tracking: {
    mouse_movement: true;
    keyboard_input: true;
    page_focus: true;
    mobile_app_foreground: true;
  };
  
  privacy_levels: {
    always_visible: 'team_members';
    collaboration_only: 'active_supplier_couple_pairs';
    hidden: 'competitors_other_couples';
  };
  
  data_retention: {
    presence_data: 0; // Not persisted
    last_seen: 7; // days
    activity_logs: 30; // days (Enterprise only)
  };
}
```

## Testing Requirements

### Unit Tests
```typescript
// Real-time service tests
describe('RealtimeService', () => {
  test('should establish WebSocket connection', async () => {
    const service = new RealtimeService();
    const connection = await service.connect(testUserId);
    
    expect(connection.isConnected).toBe(true);
    expect(connection.quality).toBe('excellent');
  });

  test('should handle connection failures gracefully', async () => {
    const service = new RealtimeService();
    
    // Simulate network failure
    mockNetwork.simulateDisconnection();
    
    const reconnectPromise = service.handleReconnection();
    await expect(reconnectPromise).resolves.toBeTruthy();
    
    expect(service.reconnectAttempts).toBeGreaterThan(0);
    expect(service.isConnected).toBe(true);
  });

  test('should enforce subscription limits', async () => {
    const service = new RealtimeService();
    const freeUserSession = { subscription_tier: 'free' };
    
    // Subscribe to maximum allowed channels
    for (let i = 0; i < 3; i++) {
      await service.subscribe(`channel_${i}`, freeUserSession);
    }
    
    // Fourth subscription should fail
    await expect(
      service.subscribe('channel_4', freeUserSession)
    ).rejects.toThrow('Maximum 3 channels allowed');
  });

  test('should deliver Core Fields updates within 100ms', async () => {
    const service = new RealtimeService();
    const startTime = Date.now();
    let updateReceived = false;
    
    service.subscribe('core_fields_updates', {
      callback: () => {
        updateReceived = true;
        const deliveryTime = Date.now() - startTime;
        expect(deliveryTime).toBeLessThan(100);
      }
    });
    
    // Trigger Core Fields update
    await service.broadcastCoreFieldUpdate({
      couple_id: 'test_couple',
      field_name: 'wedding_date',
      new_value: '2024-06-15'
    });
    
    await new Promise(resolve => setTimeout(resolve, 150));
    expect(updateReceived).toBe(true);
  });
});
```

### Integration Tests
```typescript
// End-to-end real-time collaboration
describe('Real-time Collaboration', () => {
  test('should sync form updates between supplier and couple', async () => {
    const supplierBrowser = await createTestBrowser();
    const coupleBrowser = await createTestBrowser();
    
    // Supplier opens form dashboard
    await supplierBrowser.goto('/forms/test-form/responses');
    
    // Couple opens and fills form
    await coupleBrowser.goto('/forms/test-form/fill');
    await coupleBrowser.fill('[data-field="wedding_venue"]', 'Garden Manor');
    
    // Supplier should see update immediately
    await supplierBrowser.waitForText('Garden Manor', { timeout: 200 });
    
    const progressBar = await supplierBrowser.locator('[data-testid="completion-progress"]');
    await expect(progressBar).toHaveAttribute('value', '25'); // 1 of 4 fields completed
  });

  test('should show presence indicators during collaboration', async () => {
    const supplierSession = await createTestSession('supplier');
    const coupleSession = await createTestSession('couple');
    
    // Join collaboration channel
    await supplierSession.joinChannel('collaboration:supplier123:couple456');
    await coupleSession.joinChannel('collaboration:supplier123:couple456');
    
    // Couple goes online
    await coupleSession.updatePresence('online');
    
    // Supplier should see couple's presence
    const presenceIndicator = await supplierSession.waitForElement('[data-testid="couple-online"]');
    expect(presenceIndicator).toBeVisible();
    
    // Couple starts typing
    await coupleSession.updatePresence('online', { is_typing: true });
    
    // Supplier should see typing indicator
    const typingIndicator = await supplierSession.waitForElement('[data-testid="couple-typing"]');
    expect(typingIndicator).toBeVisible();
  });

  test('should handle concurrent Core Fields updates', async () => {
    const supplier1 = await createTestSession('supplier1');
    const supplier2 = await createTestSession('supplier2');
    const couple = await createTestSession('couple');
    
    // All parties subscribe to Core Fields updates
    await Promise.all([
      supplier1.subscribe('core_fields:couple123'),
      supplier2.subscribe('core_fields:couple123'),
      couple.subscribe('core_fields:couple123')
    ]);
    
    // Couple updates wedding date
    await couple.updateCoreField('wedding_date', '2024-07-20');
    
    // Both suppliers should receive update within 100ms
    const [s1Update, s2Update] = await Promise.all([
      supplier1.waitForCoreFieldUpdate('wedding_date', 100),
      supplier2.waitForCoreFieldUpdate('wedding_date', 100)
    ]);
    
    expect(s1Update.new_value).toBe('2024-07-20');
    expect(s2Update.new_value).toBe('2024-07-20');
  });
});
```

### Performance Tests
```typescript
// Real-time system load testing
describe('Real-time Performance', () => {
  test('should handle 1000 concurrent connections', async () => {
    const connectionPromises = [];
    
    for (let i = 0; i < 1000; i++) {
      connectionPromises.push(createRealtimeConnection(`user_${i}`));
    }
    
    const connections = await Promise.all(connectionPromises);
    
    // All connections should be successful
    expect(connections.filter(c => c.isConnected)).toHaveLength(1000);
    
    // Test message broadcasting to all connections
    const startTime = Date.now();
    await broadcastToAllConnections('test_message', { data: 'load_test' });
    
    // All connections should receive message within 1 second
    const deliveryPromises = connections.map(c => c.waitForMessage('test_message', 1000));
    const deliveryResults = await Promise.all(deliveryPromises);
    
    expect(deliveryResults.filter(r => r.success)).toHaveLength(1000);
    
    const maxDeliveryTime = Math.max(...deliveryResults.map(r => r.deliveryTime));
    expect(maxDeliveryTime).toBeLessThan(1000);
  });

  test('should maintain performance under high message volume', async () => {
    const channelName = 'performance_test';
    const messageCount = 1000;
    const connection = await createRealtimeConnection('test_user');
    
    await connection.subscribe(channelName);
    
    const receivedMessages = [];
    connection.onMessage((message) => {
      receivedMessages.push({
        ...message,
        receivedAt: Date.now()
      });
    });
    
    // Send messages rapidly
    const sendStartTime = Date.now();
    for (let i = 0; i < messageCount; i++) {
      await connection.send(channelName, 'test_event', { 
        sequence: i,
        sentAt: Date.now()
      });
    }
    
    // Wait for all messages to be received
    await waitUntil(() => receivedMessages.length === messageCount, 5000);
    
    // Verify no messages were lost
    expect(receivedMessages).toHaveLength(messageCount);
    
    // Verify message order
    const sequences = receivedMessages.map(m => m.payload.sequence);
    expect(sequences).toEqual([...Array(messageCount).keys()]);
    
    // Verify delivery times
    const deliveryTimes = receivedMessages.map(m => 
      m.receivedAt - m.payload.sentAt
    );
    const avgDeliveryTime = deliveryTimes.reduce((a, b) => a + b, 0) / deliveryTimes.length;
    
    expect(avgDeliveryTime).toBeLessThan(200); // 200ms average
  });
});
```

## Acceptance Criteria

### Functional Requirements
- [ ] Supabase Realtime infrastructure configured for all critical tables
- [ ] Channel architecture supporting private, shared, and broadcast channels
- [ ] Presence tracking with online, idle, away, offline, and busy states
- [ ] Real-time Core Fields synchronization across supplier-couple connections
- [ ] Form collaboration with typing indicators and live updates
- [ ] Journey progress broadcasting and milestone notifications
- [ ] Connection management with auto-reconnection and heartbeat monitoring
- [ ] Message queuing and replay for temporary disconnections

### Performance Requirements
- [ ] Core Fields updates propagate in <100ms (P95)
- [ ] Form submissions appear in supplier dashboard within 200ms
- [ ] Presence updates delivered within 500ms
- [ ] Support for 10,000+ concurrent WebSocket connections
- [ ] Message delivery rate >99.9% with automatic retry
- [ ] Connection uptime >99.9% with seamless reconnection
- [ ] Mobile battery optimization with smart heartbeat intervals

### Security Requirements
- [ ] Row Level Security enforces channel access permissions
- [ ] Presence data respects user privacy settings
- [ ] Channel subscriptions limited by subscription tier
- [ ] Message payload validation and size limits
- [ ] No sensitive data in WebSocket messages
- [ ] Audit logging for real-time events and access

### User Experience Requirements
- [ ] Visual presence indicators for collaboration awareness
- [ ] Real-time progress bars for form completion
- [ ] Typing indicators during form collaboration
- [ ] Toast notifications for important real-time events
- [ ] Offline mode with message queuing and sync on reconnect
- [ ] No UI jank during real-time updates

## Implementation Notes

### Phase 1: Core Infrastructure (Week 1)
- Supabase Realtime configuration and table setup
- Basic channel management and subscription system
- Core Fields real-time synchronization
- Connection management with auto-reconnection

### Phase 2: Collaboration Features (Week 1.5)
- Presence tracking system with status indicators
- Form collaboration with typing indicators
- Real-time form submission updates
- Journey progress broadcasting

### Phase 3: Optimization & Polish (Week 2)
- Performance optimization and load testing
- Mobile battery optimization
- Advanced presence features and privacy controls
- Monitoring and analytics dashboard

### Critical Dependencies
- Supabase Realtime service configuration
- PostgreSQL logical replication setup
- Next.js WebSocket integration patterns
- React state management for real-time updates
- Mobile app real-time integration

## Business Impact

### Direct Value
- **Collaboration Efficiency**: Real-time updates reduce coordination delays by 70%
- **Form Completion Rates**: Live collaboration increases form completion by 25%
- **User Satisfaction**: Instant updates improve platform responsiveness perception
- **Supplier Productivity**: Real-time notifications prevent missed submissions

### Viral Growth Enablement  
- **Instant Gratification**: Real-time Core Fields sync creates "wow" moments
- **Collaboration Magic**: Live presence and typing creates modern, professional feel
- **Network Effects**: Real-time updates strengthen supplier-couple connections
- **Mobile Experience**: Smooth real-time updates encourage mobile sharing

### Risk Mitigation
- **Data Consistency**: Real-time sync prevents working with stale data
- **Communication Gaps**: Presence tracking reduces failed connection attempts  
- **User Frustration**: No more refreshing pages to see updates
- **Competitive Advantage**: Real-time collaboration differentiates from static tools

## Effort Estimation

**Total Effort**: 2.5 weeks (100 hours)

### Team Breakdown:
- **Backend Developer**: 1.5 weeks - Supabase setup, channel management, presence tracking
- **Frontend Developer**: 1.5 weeks - React hooks, presence indicators, collaboration UI
- **DevOps Engineer**: 0.5 weeks - WebSocket scaling, monitoring setup
- **QA Engineer**: 1 week - Real-time testing automation, load testing

### Critical Path:
1. Supabase Realtime configuration and table setup
2. Channel architecture and subscription management
3. Core Fields real-time synchronization
4. Presence tracking system implementation
5. Form collaboration features
6. Performance optimization and monitoring

**Success Metrics:**
- Core Fields sync <100ms delivery time
- 99.9% connection reliability achieved
- Zero message loss during normal operations
- All collaboration features working seamlessly

---

*This specification establishes the real-time infrastructure that makes WedSync/WedMe feel like a modern, collaborative platform where suppliers and couples can work together seamlessly in real-time, creating the instant gratification and professional experience that drives viral growth.*