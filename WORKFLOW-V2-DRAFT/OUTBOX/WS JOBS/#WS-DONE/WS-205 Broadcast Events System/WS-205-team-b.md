# WS-205 Team B: Broadcast Events System - Backend Infrastructure

## Team B Responsibilities: Server Architecture, Database Operations & API Development

**Feature**: WS-205 Broadcast Events System  
**Team Focus**: Backend services, database design, API endpoints, real-time infrastructure
**Duration**: Sprint 21 (Current)
**Dependencies**: None (foundational backend work)
**MCP Integration**: Use Supabase MCP for database operations, Sequential Thinking MCP for architecture decisions, Ref MCP for backend patterns

## Technical Foundation from Feature Designer

**Source**: `/WORKFLOW-V2-DRAFT/OUTBOX/feature-designer/WS-205-broadcast-events-system-technical.md`

### Database Schema Overview
The broadcast system requires comprehensive database tables for managing notifications across wedding industry stakeholders:

1. **broadcasts** - Core broadcast definitions with targeting and scheduling
2. **broadcast_deliveries** - Delivery tracking per user/channel
3. **broadcast_preferences** - User notification preferences and quiet hours
4. **broadcast_segments** - Audience targeting segments
5. **broadcast_analytics** - Performance and engagement metrics

### Wedding Industry Requirements
- **Wedding photographers** need payment reminders and timeline change alerts
- **Coordinators** require emergency handoff capabilities and multi-wedding management
- **Couples** want gentle notifications without overwhelming their planning experience
- **Suppliers** need wedding-specific updates with strict privacy boundaries

## Primary Deliverables

### 1. Database Migration Implementation

Create comprehensive database schema with Row Level Security:

```sql
-- /wedsync/supabase/migrations/[TIMESTAMP]_create_broadcast_system.sql

-- Enable RLS and create types
ALTER DATABASE postgres SET "app.jwt_secret" TO 'your-jwt-secret';

-- Custom types for broadcast system
DO $$ BEGIN
  CREATE TYPE broadcast_type AS ENUM (
    'maintenance.scheduled', 'maintenance.started', 'maintenance.completed',
    'feature.released', 'security.alert',
    'tier.upgraded', 'tier.downgraded', 'payment.required',
    'trial.ending', 'usage.limit.approaching',
    'form.locked', 'journey.updated', 'timeline.changed',
    'supplier.joined', 'couple.connected', 'wedding.cancelled',
    'wedding.emergency', 'coordinator.handoff'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE broadcast_priority AS ENUM ('critical', 'high', 'normal', 'low');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE broadcast_status AS ENUM ('pending', 'sent', 'cancelled', 'failed');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE delivery_channel AS ENUM ('realtime', 'email', 'sms', 'push', 'in_app');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE delivery_status AS ENUM ('pending', 'sent', 'delivered', 'failed', 'bounced');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Main broadcasts table with wedding context support
CREATE TABLE IF NOT EXISTS broadcasts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type broadcast_type NOT NULL,
  priority broadcast_priority NOT NULL DEFAULT 'normal',
  title TEXT NOT NULL CHECK (length(title) <= 200),
  message TEXT NOT NULL CHECK (length(message) <= 1000),
  action_label TEXT CHECK (length(action_label) <= 50),
  action_url TEXT CHECK (action_url ~ '^https?://.*' OR action_url ~ '^/.*'),
  expires_at TIMESTAMP WITH TIME ZONE,
  targeting JSONB DEFAULT '{}'::jsonb,
  wedding_context JSONB DEFAULT '{}'::jsonb, -- Wedding-specific context
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  scheduled_for TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  status broadcast_status DEFAULT 'pending',
  metadata JSONB DEFAULT '{}'::jsonb,
  
  -- Wedding industry constraints
  CONSTRAINT valid_wedding_context CHECK (
    wedding_context ? 'weddingId' OR 
    wedding_context = '{}'::jsonb
  ),
  CONSTRAINT valid_targeting CHECK (
    targeting ? 'segments' OR 
    targeting ? 'userIds' OR 
    targeting ? 'roles' OR
    targeting ? 'tiers' OR
    targeting = '{}'::jsonb
  ),
  CONSTRAINT scheduled_in_future CHECK (
    scheduled_for >= created_at OR status != 'pending'
  )
);

-- Delivery tracking with wedding context privacy
CREATE TABLE IF NOT EXISTS broadcast_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  broadcast_id UUID NOT NULL REFERENCES broadcasts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  delivered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  read_at TIMESTAMP WITH TIME ZONE,
  acknowledged_at TIMESTAMP WITH TIME ZONE,
  delivery_channel delivery_channel NOT NULL,
  delivery_status delivery_status DEFAULT 'pending',
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  wedding_context_match BOOLEAN DEFAULT false, -- Whether user had access to wedding context
  
  UNIQUE(broadcast_id, user_id, delivery_channel),
  
  -- Performance constraints
  CONSTRAINT valid_retry_count CHECK (retry_count >= 0 AND retry_count <= 5),
  CONSTRAINT valid_timestamps CHECK (
    (read_at IS NULL OR read_at >= delivered_at) AND
    (acknowledged_at IS NULL OR acknowledged_at >= delivered_at)
  )
);

-- User preferences with wedding role context
CREATE TABLE IF NOT EXISTS broadcast_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  system_broadcasts BOOLEAN DEFAULT true,
  business_broadcasts BOOLEAN DEFAULT true,
  collaboration_broadcasts BOOLEAN DEFAULT true,
  wedding_broadcasts BOOLEAN DEFAULT true, -- Wedding-specific broadcasts
  critical_only BOOLEAN DEFAULT false,
  delivery_channels JSONB DEFAULT '["realtime", "in_app"]'::jsonb,
  quiet_hours_start TIME,
  quiet_hours_end TIME,
  timezone TEXT DEFAULT 'UTC',
  role_preferences JSONB DEFAULT '{}'::jsonb, -- Role-specific settings
  wedding_filters JSONB DEFAULT '{}'::jsonb, -- Wedding-specific filters
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Validation constraints
  CONSTRAINT valid_delivery_channels CHECK (
    jsonb_typeof(delivery_channels) = 'array'
  ),
  CONSTRAINT valid_timezone CHECK (
    timezone ~ '^[A-Za-z_/]+$'
  ),
  CONSTRAINT valid_quiet_hours CHECK (
    (quiet_hours_start IS NULL AND quiet_hours_end IS NULL) OR
    (quiet_hours_start IS NOT NULL AND quiet_hours_end IS NOT NULL)
  )
);

-- Audience segments for targeted broadcasting
CREATE TABLE IF NOT EXISTS broadcast_segments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE CHECK (length(name) <= 100),
  description TEXT CHECK (length(description) <= 500),
  criteria JSONB NOT NULL,
  user_count INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Wedding industry segments validation
  CONSTRAINT valid_criteria CHECK (
    criteria ? 'roles' OR 
    criteria ? 'tiers' OR 
    criteria ? 'weddingStatus' OR
    criteria ? 'userType'
  )
);

-- Analytics for broadcast effectiveness
CREATE TABLE IF NOT EXISTS broadcast_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  broadcast_id UUID NOT NULL REFERENCES broadcasts(id) ON DELETE CASCADE,
  total_targeted INTEGER DEFAULT 0,
  total_delivered INTEGER DEFAULT 0,
  total_read INTEGER DEFAULT 0,
  total_acknowledged INTEGER DEFAULT 0,
  total_action_clicked INTEGER DEFAULT 0,
  avg_time_to_read INTERVAL,
  delivery_rate DECIMAL(5,4), -- Percentage as decimal
  engagement_rate DECIMAL(5,4),
  calculated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Performance analytics constraints
  CONSTRAINT valid_counts CHECK (
    total_targeted >= 0 AND
    total_delivered <= total_targeted AND
    total_read <= total_delivered AND
    total_acknowledged <= total_read AND
    total_action_clicked <= total_read
  ),
  CONSTRAINT valid_rates CHECK (
    delivery_rate >= 0 AND delivery_rate <= 1 AND
    engagement_rate >= 0 AND engagement_rate <= 1
  ),
  
  UNIQUE(broadcast_id, calculated_at::date)
);

-- Rate limiting for broadcast sending
CREATE TABLE IF NOT EXISTS broadcast_rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  broadcast_type TEXT NOT NULL,
  sent_count INTEGER DEFAULT 0,
  window_start TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  window_duration INTERVAL DEFAULT '1 hour'::interval,
  max_per_window INTEGER DEFAULT 10,
  
  UNIQUE(user_id, broadcast_type, window_start)
);

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_broadcasts_scheduled ON broadcasts(scheduled_for) 
  WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_broadcasts_type ON broadcasts(type);
CREATE INDEX IF NOT EXISTS idx_broadcasts_priority ON broadcasts(priority);
CREATE INDEX IF NOT EXISTS idx_broadcasts_wedding_context ON broadcasts 
  USING GIN(wedding_context) WHERE wedding_context != '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_deliveries_user_unread ON broadcast_deliveries(user_id, delivered_at DESC) 
  WHERE read_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_deliveries_status ON broadcast_deliveries(delivery_status, retry_count)
  WHERE delivery_status IN ('pending', 'failed');

CREATE INDEX IF NOT EXISTS idx_preferences_user ON broadcast_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_segments_active ON broadcast_segments(is_active, updated_at);

-- Row Level Security Policies
ALTER TABLE broadcasts ENABLE ROW LEVEL SECURITY;
ALTER TABLE broadcast_deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE broadcast_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE broadcast_segments ENABLE ROW LEVEL SECURITY;
ALTER TABLE broadcast_analytics ENABLE ROW LEVEL SECURITY;

-- Broadcasts: Only admins can create, users can read their targeted broadcasts
CREATE POLICY "Admin can manage broadcasts" ON broadcasts
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_id = auth.uid() AND role IN ('admin', 'coordinator')
    )
  );

CREATE POLICY "Users can read targeted broadcasts" ON broadcasts
  FOR SELECT USING (
    -- Global broadcasts
    targeting = '{}'::jsonb OR
    -- User-specific targeting
    targeting ? 'userIds' AND auth.uid()::text = ANY(
      SELECT jsonb_array_elements_text(targeting->'userIds')
    ) OR
    -- Role-based targeting
    targeting ? 'roles' AND EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.user_id = auth.uid() 
        AND up.role = ANY(
          SELECT jsonb_array_elements_text(targeting->'roles')
        )
    ) OR
    -- Wedding context targeting
    targeting ? 'weddingIds' AND EXISTS (
      SELECT 1 FROM wedding_team wt
      WHERE wt.user_id = auth.uid()
        AND wt.wedding_id::text = ANY(
          SELECT jsonb_array_elements_text(targeting->'weddingIds')
        )
    )
  );

-- Deliveries: Users can only see their own deliveries
CREATE POLICY "Users can manage their deliveries" ON broadcast_deliveries
  FOR ALL USING (user_id = auth.uid());

-- Preferences: Users can only manage their own preferences
CREATE POLICY "Users can manage their preferences" ON broadcast_preferences
  FOR ALL USING (user_id = auth.uid());

-- Segments: Admin read, coordinator limited read
CREATE POLICY "Admin can manage segments" ON broadcast_segments
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Coordinators can read segments" ON broadcast_segments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_id = auth.uid() AND role IN ('admin', 'coordinator')
    )
  );

-- Analytics: Admin and coordinators only
CREATE POLICY "Admin can view analytics" ON broadcast_analytics
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_id = auth.uid() AND role IN ('admin', 'coordinator')
    )
  );

-- Function to clean up expired broadcasts
CREATE OR REPLACE FUNCTION cleanup_expired_broadcasts()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM broadcasts 
  WHERE expires_at < NOW() 
    AND status = 'sent'
    AND created_at < NOW() - INTERVAL '30 days';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update segment user counts
CREATE OR REPLACE FUNCTION update_segment_counts()
RETURNS void AS $$
DECLARE
  seg RECORD;
  count INTEGER;
BEGIN
  FOR seg IN SELECT id, criteria FROM broadcast_segments WHERE is_active = true
  LOOP
    -- Count users matching segment criteria
    SELECT COUNT(*) INTO count
    FROM user_profiles up
    WHERE (
      -- Role-based criteria
      (seg.criteria ? 'roles' AND up.role = ANY(
        SELECT jsonb_array_elements_text(seg.criteria->'roles')
      )) OR
      -- Tier-based criteria  
      (seg.criteria ? 'tiers' AND up.subscription_tier = ANY(
        SELECT jsonb_array_elements_text(seg.criteria->'tiers')
      )) OR
      -- Wedding status criteria
      (seg.criteria ? 'weddingStatus' AND EXISTS (
        SELECT 1 FROM weddings w
        JOIN wedding_team wt ON w.id = wt.wedding_id
        WHERE wt.user_id = up.user_id
          AND w.status = ANY(
            SELECT jsonb_array_elements_text(seg.criteria->'weddingStatus')
          )
      ))
    );
    
    UPDATE broadcast_segments 
    SET user_count = count, updated_at = NOW()
    WHERE id = seg.id;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to update analytics on delivery changes
CREATE OR REPLACE FUNCTION update_broadcast_analytics()
RETURNS TRIGGER AS $$
BEGIN
  -- Update analytics when delivery status changes
  IF TG_OP = 'UPDATE' AND OLD.delivery_status != NEW.delivery_status THEN
    INSERT INTO broadcast_analytics (
      broadcast_id, 
      total_delivered, 
      calculated_at
    )
    SELECT 
      NEW.broadcast_id,
      COUNT(*) FILTER (WHERE delivery_status = 'delivered'),
      NOW()
    FROM broadcast_deliveries
    WHERE broadcast_id = NEW.broadcast_id
    ON CONFLICT (broadcast_id, calculated_at::date)
    DO UPDATE SET
      total_delivered = EXCLUDED.total_delivered,
      calculated_at = NOW();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_update_broadcast_analytics
  AFTER UPDATE ON broadcast_deliveries
  FOR EACH ROW
  EXECUTE FUNCTION update_broadcast_analytics();

-- Initial segments for wedding industry
INSERT INTO broadcast_segments (name, description, criteria) VALUES
  (
    'Wedding Coordinators',
    'Professional wedding coordinators managing multiple events',
    '{"roles": ["coordinator"], "userType": "supplier"}'
  ),
  (
    'Wedding Photographers',
    'Photography professionals serving wedding clients',
    '{"roles": ["photographer"], "userType": "supplier"}'
  ),
  (
    'Active Couples',
    'Couples with weddings in the next 12 months',
    '{"userType": "couple", "weddingStatus": ["planning", "confirmed"]}'
  ),
  (
    'Premium Users',
    'Users with professional or enterprise tier subscriptions',
    '{"tiers": ["professional", "enterprise"]}'
  )
ON CONFLICT (name) DO NOTHING;

-- Grant appropriate permissions
GRANT SELECT, INSERT, UPDATE ON broadcasts TO authenticated;
GRANT SELECT, INSERT, UPDATE ON broadcast_deliveries TO authenticated;
GRANT ALL ON broadcast_preferences TO authenticated;
GRANT SELECT ON broadcast_segments TO authenticated;
GRANT SELECT ON broadcast_analytics TO authenticated;

-- Grant function execution
GRANT EXECUTE ON FUNCTION cleanup_expired_broadcasts() TO service_role;
GRANT EXECUTE ON FUNCTION update_segment_counts() TO service_role;
```

### 2. Broadcast Management API Endpoints

Create comprehensive API routes for broadcast operations:

```typescript
// /wedsync/src/app/api/broadcast/send/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { z } from 'zod';
import { BroadcastManager } from '@/lib/broadcast/broadcast-manager';
import { validateWeddingAccess } from '@/lib/auth/wedding-access';
import { checkRateLimit } from '@/lib/rate-limiting/broadcast-limits';

const sendBroadcastSchema = z.object({
  type: z.enum([
    'maintenance.scheduled', 'maintenance.started', 'maintenance.completed',
    'feature.released', 'security.alert',
    'tier.upgraded', 'tier.downgraded', 'payment.required',
    'trial.ending', 'usage.limit.approaching',
    'form.locked', 'journey.updated', 'timeline.changed',
    'supplier.joined', 'couple.connected', 'wedding.cancelled',
    'wedding.emergency', 'coordinator.handoff'
  ]),
  priority: z.enum(['critical', 'high', 'normal', 'low']).default('normal'),
  title: z.string().min(1).max(200),
  message: z.string().min(1).max(1000),
  action: z.object({
    label: z.string().max(50),
    url: z.string().url()
  }).optional(),
  targeting: z.object({
    segments: z.array(z.string()).optional(),
    userIds: z.array(z.string().uuid()).optional(),
    roles: z.array(z.string()).optional(),
    tiers: z.array(z.string()).optional(),
    weddingIds: z.array(z.string().uuid()).optional()
  }).optional(),
  weddingContext: z.object({
    weddingId: z.string().uuid(),
    coupleName: z.string(),
    weddingDate: z.string().datetime()
  }).optional(),
  scheduledFor: z.string().datetime().optional(),
  expiresAt: z.string().datetime().optional()
});

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerClient();
    
    // Authenticate user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check user permissions
    const { data: userProfile } = await supabase
      .from('user_profiles')
      .select('role, subscription_tier')
      .eq('user_id', user.id)
      .single();

    if (!userProfile || !['admin', 'coordinator'].includes(userProfile.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    // Parse and validate request
    const body = await request.json();
    const broadcastData = sendBroadcastSchema.parse(body);

    // Rate limiting check
    const rateLimitCheck = await checkRateLimit(user.id, broadcastData.type, {
      maxPerHour: broadcastData.priority === 'critical' ? 5 : 10,
      maxPerDay: broadcastData.priority === 'critical' ? 20 : 50
    });

    if (!rateLimitCheck.allowed) {
      return NextResponse.json({
        error: 'Rate limit exceeded',
        resetTime: rateLimitCheck.resetTime
      }, { status: 429 });
    }

    // Validate wedding context access if provided
    if (broadcastData.weddingContext) {
      const hasAccess = await validateWeddingAccess(
        user.id, 
        broadcastData.weddingContext.weddingId
      );
      if (!hasAccess) {
        return NextResponse.json(
          { error: 'Access denied to wedding context' },
          { status: 403 }
        );
      }
    }

    // Security validation for critical broadcasts
    if (broadcastData.priority === 'critical') {
      // Additional validation for critical broadcasts
      const criticalTypes = [
        'wedding.emergency',
        'coordinator.handoff',
        'security.alert',
        'wedding.cancelled'
      ];
      
      if (!criticalTypes.includes(broadcastData.type)) {
        return NextResponse.json({
          error: 'Invalid type for critical priority'
        }, { status: 400 });
      }

      // Log critical broadcast for audit
      console.warn('Critical broadcast created:', {
        userId: user.id,
        type: broadcastData.type,
        title: broadcastData.title,
        weddingId: broadcastData.weddingContext?.weddingId
      });
    }

    // Initialize broadcast manager
    const broadcastManager = new BroadcastManager(supabase);

    // Create broadcast
    const { data: broadcast, error: createError } = await supabase
      .from('broadcasts')
      .insert({
        type: broadcastData.type,
        priority: broadcastData.priority,
        title: broadcastData.title,
        message: broadcastData.message,
        action_label: broadcastData.action?.label,
        action_url: broadcastData.action?.url,
        targeting: broadcastData.targeting || {},
        wedding_context: broadcastData.weddingContext || {},
        created_by: user.id,
        scheduled_for: broadcastData.scheduledFor || new Date().toISOString(),
        expires_at: broadcastData.expiresAt,
        status: 'pending'
      })
      .select()
      .single();

    if (createError) {
      console.error('Failed to create broadcast:', createError);
      return NextResponse.json(
        { error: 'Failed to create broadcast' },
        { status: 500 }
      );
    }

    // Determine target users
    const targetedUsers = await broadcastManager.getTargetedUsers(
      broadcastData.targeting || {},
      broadcastData.weddingContext?.weddingId
    );

    // Queue broadcast for delivery
    await broadcastManager.queueBroadcast(broadcast.id, targetedUsers);

    // Update rate limit
    await supabase
      .from('broadcast_rate_limits')
      .upsert({
        user_id: user.id,
        broadcast_type: broadcastData.type,
        sent_count: 1,
        window_start: new Date().toISOString()
      });

    // Return success response
    return NextResponse.json({
      success: true,
      broadcastId: broadcast.id,
      targetedUsers: targetedUsers.length,
      scheduledTime: broadcast.scheduled_for,
      priority: broadcast.priority
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        error: 'Validation error',
        details: error.errors
      }, { status: 400 });
    }

    console.error('Broadcast send error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Handle broadcast status checks
export async function GET(request: NextRequest) {
  try {
    const supabase = createServerClient();
    const { searchParams } = new URL(request.url);
    const broadcastId = searchParams.get('id');

    if (!broadcastId) {
      return NextResponse.json(
        { error: 'Broadcast ID required' },
        { status: 400 }
      );
    }

    // Get broadcast status and analytics
    const { data: broadcast, error } = await supabase
      .from('broadcasts')
      .select(`
        *,
        analytics:broadcast_analytics(*)
      `)
      .eq('id', broadcastId)
      .single();

    if (error || !broadcast) {
      return NextResponse.json(
        { error: 'Broadcast not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      broadcast,
      deliveryStats: broadcast.analytics[0] || null
    });

  } catch (error) {
    console.error('Broadcast status error:', error);
    return NextResponse.json(
      { error: 'Failed to get broadcast status' },
      { status: 500 }
    );
  }
}
```

### 3. User Inbox API Endpoint

Retrieve user's broadcast inbox with filtering:

```typescript
// /wedsync/src/app/api/broadcast/inbox/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { z } from 'zod';

const inboxQuerySchema = z.object({
  unreadOnly: z.string().optional().transform(val => val === 'true'),
  priority: z.array(z.enum(['critical', 'high', 'normal', 'low'])).optional(),
  type: z.string().optional(),
  search: z.string().optional(),
  weddingId: z.string().uuid().optional(),
  limit: z.string().optional().transform(val => val ? parseInt(val) : 50),
  offset: z.string().optional().transform(val => val ? parseInt(val) : 0)
});

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerClient();
    
    // Authenticate user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const queryParams = Object.fromEntries(searchParams.entries());
    const filters = inboxQuerySchema.parse(queryParams);

    // Build base query
    let query = supabase
      .from('broadcast_deliveries')
      .select(`
        id,
        delivered_at,
        read_at,
        acknowledged_at,
        delivery_channel,
        broadcast:broadcasts (
          id,
          type,
          priority,
          title,
          message,
          action_label,
          action_url,
          expires_at,
          wedding_context,
          created_at
        )
      `)
      .eq('user_id', user.id)
      .order('delivered_at', { ascending: false });

    // Apply filters
    if (filters.unreadOnly) {
      query = query.is('read_at', null);
    }

    if (filters.weddingId) {
      query = query.eq('broadcast.wedding_context->>weddingId', filters.weddingId);
    }

    // Execute query with pagination
    const { data: deliveries, error: queryError, count } = await query
      .range(filters.offset, filters.offset + filters.limit - 1);

    if (queryError) {
      console.error('Inbox query error:', queryError);
      return NextResponse.json(
        { error: 'Failed to fetch inbox' },
        { status: 500 }
      );
    }

    // Apply client-side filters for complex criteria
    let filteredDeliveries = deliveries || [];

    if (filters.priority && filters.priority.length > 0) {
      filteredDeliveries = filteredDeliveries.filter(delivery =>
        filters.priority!.includes(delivery.broadcast.priority)
      );
    }

    if (filters.type) {
      filteredDeliveries = filteredDeliveries.filter(delivery =>
        delivery.broadcast.type.includes(filters.type!)
      );
    }

    if (filters.search) {
      const searchTerm = filters.search.toLowerCase();
      filteredDeliveries = filteredDeliveries.filter(delivery =>
        delivery.broadcast.title.toLowerCase().includes(searchTerm) ||
        delivery.broadcast.message.toLowerCase().includes(searchTerm)
      );
    }

    // Format broadcasts for client
    const broadcasts = filteredDeliveries.map(delivery => ({
      id: delivery.broadcast.id,
      type: delivery.broadcast.type,
      priority: delivery.broadcast.priority,
      title: delivery.broadcast.title,
      message: delivery.broadcast.message,
      action: delivery.broadcast.action_label ? {
        label: delivery.broadcast.action_label,
        url: delivery.broadcast.action_url
      } : null,
      deliveredAt: delivery.delivered_at,
      readAt: delivery.read_at,
      acknowledgedAt: delivery.acknowledged_at,
      expiresAt: delivery.broadcast.expires_at,
      weddingContext: delivery.broadcast.wedding_context || null,
      deliveryChannel: delivery.delivery_channel
    }));

    // Get unread count
    const { count: unreadCount } = await supabase
      .from('broadcast_deliveries')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .is('read_at', null);

    return NextResponse.json({
      broadcasts,
      unreadCount: unreadCount || 0,
      totalCount: count || 0,
      hasMore: (filters.offset + filters.limit) < (count || 0)
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        error: 'Invalid query parameters',
        details: error.errors
      }, { status: 400 });
    }

    console.error('Inbox API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

### 4. Broadcast Preferences API Endpoint

Manage user notification preferences:

```typescript
// /wedsync/src/app/api/broadcast/preferences/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { z } from 'zod';

const preferencesSchema = z.object({
  systemBroadcasts: z.boolean().optional(),
  businessBroadcasts: z.boolean().optional(),
  collaborationBroadcasts: z.boolean().optional(),
  weddingBroadcasts: z.boolean().optional(),
  criticalOnly: z.boolean().optional(),
  deliveryChannels: z.array(z.enum(['realtime', 'email', 'sms', 'push', 'in_app'])).optional(),
  quietHours: z.object({
    enabled: z.boolean(),
    start: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/), // HH:MM format
    end: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/),
    timezone: z.string()
  }).optional(),
  rolePreferences: z.record(z.any()).optional(),
  weddingFilters: z.record(z.any()).optional()
});

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user preferences
    const { data: preferences, error: prefError } = await supabase
      .from('broadcast_preferences')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (prefError && prefError.code !== 'PGRST116') { // Not found is OK
      console.error('Preferences fetch error:', prefError);
      return NextResponse.json(
        { error: 'Failed to fetch preferences' },
        { status: 500 }
      );
    }

    // Return default preferences if none exist
    const defaultPreferences = {
      systemBroadcasts: true,
      businessBroadcasts: true,
      collaborationBroadcasts: true,
      weddingBroadcasts: true,
      criticalOnly: false,
      deliveryChannels: ['realtime', 'in_app'],
      quietHours: {
        enabled: false,
        start: '22:00',
        end: '08:00',
        timezone: 'UTC'
      },
      rolePreferences: {},
      weddingFilters: {}
    };

    return NextResponse.json(preferences || defaultPreferences);

  } catch (error) {
    console.error('Get preferences error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = createServerClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse and validate request
    const body = await request.json();
    const preferences = preferencesSchema.parse(body);

    // Validate quiet hours logic
    if (preferences.quietHours?.enabled) {
      const { start, end, timezone } = preferences.quietHours;
      
      // Basic timezone validation
      try {
        new Date().toLocaleString('en-US', { timeZone: timezone });
      } catch {
        return NextResponse.json({
          error: 'Invalid timezone'
        }, { status: 400 });
      }
    }

    // Prepare database update
    const updateData: any = {};
    
    if (preferences.systemBroadcasts !== undefined) {
      updateData.system_broadcasts = preferences.systemBroadcasts;
    }
    if (preferences.businessBroadcasts !== undefined) {
      updateData.business_broadcasts = preferences.businessBroadcasts;
    }
    if (preferences.collaborationBroadcasts !== undefined) {
      updateData.collaboration_broadcasts = preferences.collaborationBroadcasts;
    }
    if (preferences.weddingBroadcasts !== undefined) {
      updateData.wedding_broadcasts = preferences.weddingBroadcasts;
    }
    if (preferences.criticalOnly !== undefined) {
      updateData.critical_only = preferences.criticalOnly;
    }
    if (preferences.deliveryChannels !== undefined) {
      updateData.delivery_channels = JSON.stringify(preferences.deliveryChannels);
    }
    if (preferences.quietHours !== undefined) {
      if (preferences.quietHours.enabled) {
        updateData.quiet_hours_start = preferences.quietHours.start;
        updateData.quiet_hours_end = preferences.quietHours.end;
        updateData.timezone = preferences.quietHours.timezone;
      } else {
        updateData.quiet_hours_start = null;
        updateData.quiet_hours_end = null;
      }
    }
    if (preferences.rolePreferences !== undefined) {
      updateData.role_preferences = preferences.rolePreferences;
    }
    if (preferences.weddingFilters !== undefined) {
      updateData.wedding_filters = preferences.weddingFilters;
    }

    updateData.updated_at = new Date().toISOString();

    // Upsert preferences
    const { data: updatedPrefs, error: updateError } = await supabase
      .from('broadcast_preferences')
      .upsert({
        user_id: user.id,
        ...updateData
      })
      .select()
      .single();

    if (updateError) {
      console.error('Preferences update error:', updateError);
      return NextResponse.json(
        { error: 'Failed to update preferences' },
        { status: 500 }
      );
    }

    // Log significant preference changes
    if (preferences.criticalOnly || (preferences.quietHours?.enabled && preferences.quietHours.enabled)) {
      console.info('User updated notification preferences:', {
        userId: user.id,
        criticalOnly: preferences.criticalOnly,
        quietHours: preferences.quietHours?.enabled
      });
    }

    return NextResponse.json({
      success: true,
      preferences: updatedPrefs
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        error: 'Validation error',
        details: error.errors
      }, { status: 400 });
    }

    console.error('Update preferences error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

### 5. Broadcast Acknowledgment API Endpoint

Handle broadcast read/acknowledgment tracking:

```typescript
// /wedsync/src/app/api/broadcast/acknowledge/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { z } from 'zod';

const acknowledgeSchema = z.object({
  broadcastId: z.string().uuid(),
  action: z.enum(['read', 'acknowledged', 'dismissed', 'action_clicked']),
  actionUrl: z.string().optional() // For tracking action clicks
});

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { broadcastId, action, actionUrl } = acknowledgeSchema.parse(body);

    // Verify delivery exists
    const { data: delivery, error: deliveryError } = await supabase
      .from('broadcast_deliveries')
      .select(`
        *,
        broadcast:broadcasts(priority, type, wedding_context)
      `)
      .eq('broadcast_id', broadcastId)
      .eq('user_id', user.id)
      .single();

    if (deliveryError || !delivery) {
      return NextResponse.json(
        { error: 'Broadcast delivery not found' },
        { status: 404 }
      );
    }

    // Prepare update data
    const updateData: any = {};
    const timestamp = new Date().toISOString();

    switch (action) {
      case 'read':
        if (!delivery.read_at) {
          updateData.read_at = timestamp;
        }
        break;
        
      case 'acknowledged':
        if (!delivery.acknowledged_at) {
          updateData.acknowledged_at = timestamp;
          if (!delivery.read_at) {
            updateData.read_at = timestamp;
          }
        }
        break;
        
      case 'dismissed':
        updateData.acknowledged_at = timestamp;
        if (!delivery.read_at) {
          updateData.read_at = timestamp;
        }
        break;
        
      case 'action_clicked':
        if (!delivery.read_at) {
          updateData.read_at = timestamp;
        }
        // Track action click separately for analytics
        break;
    }

    // Update delivery record
    if (Object.keys(updateData).length > 0) {
      const { error: updateError } = await supabase
        .from('broadcast_deliveries')
        .update(updateData)
        .eq('broadcast_id', broadcastId)
        .eq('user_id', user.id);

      if (updateError) {
        console.error('Delivery update error:', updateError);
        return NextResponse.json(
          { error: 'Failed to update delivery' },
          { status: 500 }
        );
      }
    }

    // Track analytics
    try {
      const analyticsData = {
        broadcastId,
        userId: user.id,
        action,
        timestamp,
        actionUrl: actionUrl || null,
        priority: delivery.broadcast.priority,
        type: delivery.broadcast.type,
        weddingContext: delivery.broadcast.wedding_context
      };

      // For critical broadcasts, log acknowledgments
      if (delivery.broadcast.priority === 'critical' && action === 'acknowledged') {
        console.info('Critical broadcast acknowledged:', analyticsData);
      }

      // Update broadcast analytics
      await supabase.rpc('increment_broadcast_stat', {
        broadcast_id: broadcastId,
        stat_name: action === 'action_clicked' ? 'action_clicked' : action
      });

    } catch (analyticsError) {
      // Analytics failure shouldn't fail the request
      console.warn('Analytics update failed:', analyticsError);
    }

    return NextResponse.json({
      success: true,
      action,
      acknowledgedAt: updateData.acknowledged_at || delivery.acknowledged_at,
      readAt: updateData.read_at || delivery.read_at
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        error: 'Validation error',
        details: error.errors
      }, { status: 400 });
    }

    console.error('Acknowledge API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

### 6. Background Job Processing Service

Create service for processing queued broadcasts:

```typescript
// /wedsync/src/lib/broadcast/broadcast-processor.ts
import { createServerClient } from '@/lib/supabase/server';
import { BroadcastManager } from './broadcast-manager';
import { createClient } from '@supabase/supabase-js';

interface ProcessingResult {
  processed: number;
  failed: number;
  errors: string[];
}

export class BroadcastProcessor {
  private supabase;
  private broadcastManager: BroadcastManager;
  
  constructor() {
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!, // Service role for background processing
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false
        }
      }
    );
    this.broadcastManager = new BroadcastManager(this.supabase);
  }

  async processPendingBroadcasts(): Promise<ProcessingResult> {
    const result: ProcessingResult = {
      processed: 0,
      failed: 0,
      errors: []
    };

    try {
      // Get pending broadcasts that are scheduled for now or earlier
      const { data: pendingBroadcasts, error } = await this.supabase
        .from('broadcasts')
        .select('*')
        .eq('status', 'pending')
        .lte('scheduled_for', new Date().toISOString())
        .order('priority', { ascending: false }) // Critical first
        .order('scheduled_for', { ascending: true })
        .limit(50); // Process in batches

      if (error) {
        throw new Error(`Failed to fetch pending broadcasts: ${error.message}`);
      }

      if (!pendingBroadcasts?.length) {
        return result;
      }

      // Process each broadcast
      for (const broadcast of pendingBroadcasts) {
        try {
          await this.processBroadcast(broadcast);
          result.processed++;
          
          // Add delay between broadcasts to avoid overwhelming users
          if (broadcast.priority !== 'critical') {
            await new Promise(resolve => setTimeout(resolve, 100));
          }
          
        } catch (error) {
          result.failed++;
          result.errors.push(`Broadcast ${broadcast.id}: ${error.message}`);
          console.error(`Failed to process broadcast ${broadcast.id}:`, error);
          
          // Mark broadcast as failed
          await this.supabase
            .from('broadcasts')
            .update({ 
              status: 'failed',
              metadata: { 
                error: error.message,
                failedAt: new Date().toISOString()
              }
            })
            .eq('id', broadcast.id);
        }
      }

      return result;

    } catch (error) {
      console.error('Broadcast processing error:', error);
      throw error;
    }
  }

  private async processBroadcast(broadcast: any): Promise<void> {
    // Determine target users
    const targetUsers = await this.broadcastManager.getTargetedUsers(
      broadcast.targeting || {},
      broadcast.wedding_context?.weddingId
    );

    if (targetUsers.length === 0) {
      console.warn(`No target users found for broadcast ${broadcast.id}`);
      await this.supabase
        .from('broadcasts')
        .update({ status: 'sent' })
        .eq('id', broadcast.id);
      return;
    }

    // Create delivery records
    const deliveryRecords = targetUsers.map(userId => ({
      broadcast_id: broadcast.id,
      user_id: userId,
      delivery_channel: 'realtime',
      delivery_status: 'pending',
      wedding_context_match: this.hasWeddingContextMatch(broadcast, userId)
    }));

    const { error: deliveryError } = await this.supabase
      .from('broadcast_deliveries')
      .upsert(deliveryRecords, {
        onConflict: 'broadcast_id,user_id,delivery_channel'
      });

    if (deliveryError) {
      throw new Error(`Failed to create deliveries: ${deliveryError.message}`);
    }

    // Send real-time broadcast
    await this.sendRealtimeBroadcast(broadcast, targetUsers);

    // Send to other channels if configured
    await this.sendToDeliveryChannels(broadcast, targetUsers);

    // Update broadcast status
    await this.supabase
      .from('broadcasts')
      .update({ 
        status: 'sent',
        metadata: {
          sentAt: new Date().toISOString(),
          targetedUsers: targetUsers.length
        }
      })
      .eq('id', broadcast.id);

    console.info(`Broadcast ${broadcast.id} sent to ${targetUsers.length} users`);
  }

  private async sendRealtimeBroadcast(broadcast: any, targetUsers: string[]): Promise<void> {
    // Send to global broadcast channel
    await this.supabase.channel('broadcast:global').send({
      type: 'broadcast',
      event: 'new_broadcast',
      payload: {
        id: broadcast.id,
        type: broadcast.type,
        priority: broadcast.priority,
        title: broadcast.title,
        message: broadcast.message,
        action_label: broadcast.action_label,
        action_url: broadcast.action_url,
        expires_at: broadcast.expires_at,
        wedding_context: broadcast.wedding_context,
        targetUsers
      }
    });

    // Send to individual user channels for high-priority broadcasts
    if (['critical', 'high'].includes(broadcast.priority)) {
      for (const userId of targetUsers) {
        await this.supabase.channel(`broadcast:user:${userId}`).send({
          type: 'broadcast',
          event: 'priority_broadcast',
          payload: broadcast
        });
      }
    }
  }

  private async sendToDeliveryChannels(broadcast: any, targetUsers: string[]): Promise<void> {
    // Get user preferences for additional delivery channels
    const { data: preferences } = await this.supabase
      .from('broadcast_preferences')
      .select('user_id, delivery_channels')
      .in('user_id', targetUsers);

    // Process email deliveries
    const emailUsers = preferences?.filter(p => 
      JSON.parse(p.delivery_channels).includes('email')
    ).map(p => p.user_id) || [];

    if (emailUsers.length > 0 && ['critical', 'high'].includes(broadcast.priority)) {
      await this.sendEmailNotifications(broadcast, emailUsers);
    }

    // Process push notifications
    const pushUsers = preferences?.filter(p => 
      JSON.parse(p.delivery_channels).includes('push')
    ).map(p => p.user_id) || [];

    if (pushUsers.length > 0) {
      await this.sendPushNotifications(broadcast, pushUsers);
    }
  }

  private async sendEmailNotifications(broadcast: any, userIds: string[]): Promise<void> {
    // Implementation would integrate with email service
    console.info(`Would send email notifications for broadcast ${broadcast.id} to ${userIds.length} users`);
  }

  private async sendPushNotifications(broadcast: any, userIds: string[]): Promise<void> {
    // Implementation would integrate with push notification service
    console.info(`Would send push notifications for broadcast ${broadcast.id} to ${userIds.length} users`);
  }

  private hasWeddingContextMatch(broadcast: any, userId: string): boolean {
    // Check if user has access to the wedding context
    // This would be implemented based on wedding access rules
    return broadcast.wedding_context?.weddingId ? true : false;
  }

  // Cleanup old broadcasts and deliveries
  async cleanup(): Promise<void> {
    try {
      // Clean up expired broadcasts older than 30 days
      await this.supabase.rpc('cleanup_expired_broadcasts');

      // Clean up old delivery records (keep for 90 days for analytics)
      await this.supabase
        .from('broadcast_deliveries')
        .delete()
        .lt('delivered_at', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString());

      console.info('Broadcast cleanup completed');
    } catch (error) {
      console.error('Broadcast cleanup failed:', error);
    }
  }
}
```

## Evidence-Based Completion Requirements

### 1. Database Migration Verification
```bash
# Apply migration to database
npx supabase migration up --linked

# Verify table creation
npx supabase db ls --linked

# Test RLS policies
npx supabase test db --linked
```

### 2. API Endpoint Testing
```bash
# Test broadcast creation
curl -X POST /api/broadcast/send -H "Content-Type: application/json" \
  -d '{"type":"feature.released","priority":"normal","title":"Test","message":"Test message"}'

# Test inbox retrieval
curl /api/broadcast/inbox?unreadOnly=true

# Test preferences update
curl -X PUT /api/broadcast/preferences -H "Content-Type: application/json" \
  -d '{"systemBroadcasts":true,"quietHours":{"enabled":true,"start":"22:00","end":"08:00"}}'
```

### 3. Background Processing Validation
```bash
# Test broadcast processor
npm run test:broadcast-processor

# Verify queue processing
npm run broadcast:process

# Check analytics updates
npm run test:broadcast-analytics
```

### 4. Performance Benchmarks
```bash
# Test concurrent broadcast creation
npm run perf:broadcast-create

# Test delivery performance (1000+ users)
npm run perf:broadcast-delivery

# Memory usage during processing
npm run perf:broadcast-memory
```

## Integration Requirements

### Supabase Realtime Configuration
```typescript
// Configure broadcast channels in Supabase
const broadcastChannels = [
  'broadcast:global',
  'broadcast:segment:*',
  'broadcast:user:*'
];
```

### Rate Limiting Integration
```typescript
// Rate limits by broadcast type
const rateLimits = {
  'critical': { perHour: 5, perDay: 20 },
  'high': { perHour: 10, perDay: 50 },
  'normal': { perHour: 25, perDay: 100 },
  'low': { perHour: 50, perDay: 200 }
};
```

### Wedding Context Security
- Cross-wedding privacy boundaries enforced
- Role-based broadcast access control
- Wedding team membership validation
- Audit logging for critical broadcasts

## Completion Checklist

- [ ] Database migration with comprehensive schema created
- [ ] Row Level Security policies implemented and tested
- [ ] Broadcast send API endpoint with validation completed
- [ ] Inbox API with filtering and pagination implemented  
- [ ] Preferences API with role-based recommendations built
- [ ] Acknowledgment API with analytics tracking finished
- [ ] Background processing service for queued broadcasts created
- [ ] Rate limiting for broadcast sending implemented
- [ ] Wedding context security validation completed
- [ ] Analytics tracking and reporting functional
- [ ] Database cleanup functions implemented
- [ ] Performance benchmarks established
- [ ] Error handling and logging comprehensive
- [ ] API documentation generated
- [ ] Database indexes optimized for performance
- [ ] Migration verification completed
- [ ] Integration testing passed
- [ ] Security audit completed

**Estimated Completion**: End of Sprint 21
**Success Criteria**: Robust backend infrastructure supporting 10,000+ concurrent users with sub-100ms broadcast processing, comprehensive wedding industry privacy controls, and enterprise-grade reliability.

**Next Steps**: Upon completion of WS-205 Team B backend infrastructure, integration with Team A frontend components enables full broadcast system deployment with real-time capabilities.