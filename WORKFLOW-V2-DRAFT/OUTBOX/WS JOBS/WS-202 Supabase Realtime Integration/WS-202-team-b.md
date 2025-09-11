# TEAM B - ROUND 1: WS-202 - Supabase Realtime Integration
## 2025-01-20 - Development Round 1

**YOUR MISSION:** Implement backend realtime subscription management and API endpoints for Supabase realtime integration including secure channel subscriptions, connection tracking, and wedding industry event filtering
**FEATURE ID:** WS-202 (Track all work with this ID)
**TIME LIMIT:** 2-3 hours per round  
**THINK ULTRA HARD** about creating secure and scalable realtime backend that handles 200+ simultaneous connections per supplier during peak wedding season

## 🚨 CRITICAL: EVIDENCE OF REALITY REQUIREMENTS (NON-NEGOTIABLE)

**⚠️ MANDATORY: Before claiming completion, you MUST provide:**

1. **FILE EXISTENCE PROOF:**
```bash
ls -la $WS_ROOT/wedsync/src/lib/realtime/subscription-manager.ts
ls -la $WS_ROOT/wedsync/src/app/api/realtime/subscribe/route.ts
ls -la $WS_ROOT/wedsync/src/app/api/realtime/status/route.ts
cat $WS_ROOT/wedsync/src/lib/realtime/subscription-manager.ts | head -20
```

2. **TYPECHECK RESULTS:**
```bash
npm run typecheck
# MUST show: "No errors found"
```

3. **TEST RESULTS:**
```bash
npm test realtime-backend
# MUST show: "All tests passing"
```

**Teams submitting hallucinated implementations will be rejected immediately.**

## 📚 STEP 1: ENHANCED DOCUMENTATION & CODEBASE ANALYSIS (MANDATORY - 10 MINUTES!)

### A. SERENA PROJECT ACTIVATION (MINUTES 1-3)
```typescript
// CRITICAL: Activate Serena for semantic code understanding
await mcp__serena__activate_project("$WS_ROOT/wedsync");
await mcp__serena__switch_modes(["editing", "interactive"]);
await mcp__serena__check_onboarding_performed();

// Query realtime backend patterns
await mcp__serena__search_for_pattern("api.*realtime");
await mcp__serena__find_symbol("SubscriptionManager", "", true);
await mcp__serena__get_symbols_overview("src/lib/realtime");
await mcp__serena__search_for_pattern("supabase.*subscription");
```

### B. REF MCP CURRENT DOCS (MINUTES 3-5)
```typescript
// Load documentation SPECIFIC to backend realtime
await mcp__Ref__ref_search_documentation("Supabase Realtime server-side Node.js");
await mcp__Ref__ref_search_documentation("Next.js API routes websocket management");
await mcp__Ref__ref_search_documentation("PostgreSQL Row Level Security realtime");
```

## 🧠 STEP 2A: SEQUENTIAL THINKING FOR BACKEND PLANNING

### Use Sequential Thinking MCP for Backend Architecture
```typescript
mcp__sequential-thinking__sequential_thinking({
  thought: "Realtime backend requires secure subscription management: API endpoints for subscribing/unsubscribing to channels, subscription tracking database for analytics, user authentication for channel access, Row Level Security for data filtering, and connection monitoring for performance. I need to analyze: 1) Subscription manager for channel lifecycle, 2) API endpoints with authentication and validation, 3) Database schema for tracking subscriptions, 4) RLS policies for secure data access, 5) Connection monitoring and cleanup for scalability.",
  nextThoughtNeeded: true,
  thoughtNumber: 1,
  totalThoughts: 5
});
```

## 🚀 STEP 2B: LAUNCH ENHANCED AGENTS WITH SPECIFIC MISSIONS

Launch these agents with comprehensive requirements:

1. **task-tracker-coordinator** - Break down backend realtime tasks and dependencies
2. **database-mcp-specialist** - Handle realtime database schema and RLS policies
3. **security-compliance-officer** - Ensure secure realtime subscriptions
4. **code-quality-guardian** - Maintain backend performance and reliability
5. **test-automation-architect** - Comprehensive backend testing for realtime
6. **documentation-chronicler** - Evidence-based backend API documentation

## 🔒 SECURITY REQUIREMENTS (NON-NEGOTIABLE!)

### REALTIME BACKEND SECURITY CHECKLIST:
- [ ] **Authentication validation** - All subscription endpoints require valid session
- [ ] **Channel authorization** - Users can only subscribe to authorized channels
- [ ] **Row Level Security** - RLS policies enforce data access permissions
- [ ] **Rate limiting** - Prevent subscription spam and DoS attacks
- [ ] **Connection limits** - Maximum connections per user/supplier
- [ ] **Data sanitization** - Sanitize all subscription parameters
- [ ] **Audit logging** - Log all subscription activities
- [ ] **Connection cleanup** - Automatic cleanup of dead connections

### REQUIRED SECURITY IMPORTS:
```typescript
import { withSecureValidation } from '$WS_ROOT/wedsync/src/lib/validation/middleware';
import { z } from 'zod';
import { getServerSession } from 'next-auth';
import { authOptions } from '$WS_ROOT/wedsync/src/lib/auth/options';
import { rateLimitService } from '$WS_ROOT/wedsync/src/lib/rate-limiter';
import { createServerClient } from '@supabase/ssr';
```

## 🎯 TEAM B SPECIALIZATION: BACKEND/API FOCUS

**BACKEND/API RESPONSIBILITIES:**
- API endpoints with security validation for realtime subscriptions
- Database operations and migrations for subscription tracking
- withSecureValidation middleware for all realtime endpoints
- Authentication and rate limiting for connection management
- Comprehensive error handling and connection cleanup
- Business logic for wedding industry event filtering

### SPECIFIC DELIVERABLES FOR WS-202:

1. **Realtime Subscription Manager:**
```typescript
// Location: $WS_ROOT/wedsync/src/lib/realtime/subscription-manager.ts
export class RealtimeSubscriptionManager {
  private supabase: SupabaseClient;
  private subscriptions: Map<string, RealtimeChannel> = new Map();
  
  constructor(supabaseClient: SupabaseClient) {
    this.supabase = supabaseClient;
  }
  
  // Channel subscription management
  async subscribeToChannel(
    userId: string, 
    channelName: string, 
    tableFilter: RealtimeChannelFilter,
    callback: (payload: RealtimePostgresChangesPayload<any>) => void
  ): Promise<SubscriptionResult> {
    // Validate user permissions for channel
    const hasPermission = await this.validateChannelPermission(userId, channelName, tableFilter);
    if (!hasPermission) {
      throw new Error('Unauthorized channel access');
    }
    
    // Create unique channel identifier
    const channelId = `${channelName}-${userId}-${Date.now()}`;
    
    // Create and configure channel
    const channel = this.supabase.channel(channelId);
    
    // Set up postgres changes subscription
    channel.on<any>(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: tableFilter.table,
        filter: this.buildRLSFilter(userId, tableFilter)
      },
      (payload) => {
        // Log subscription activity for audit
        this.logSubscriptionActivity(userId, channelId, payload.eventType);
        callback(payload);
      }
    );
    
    // Subscribe and track
    await channel.subscribe();
    this.subscriptions.set(channelId, channel);
    
    // Record subscription in database
    await this.recordSubscription(userId, channelId, channelName, tableFilter);
    
    return {
      success: true,
      channelId,
      filter: this.buildRLSFilter(userId, tableFilter)
    };
  }
  
  // Wedding industry specific subscriptions
  async subscribeToFormResponses(supplierId: string): Promise<SubscriptionResult> {
    return this.subscribeToChannel(
      supplierId,
      'form-responses',
      {
        table: 'form_responses',
        filter: `supplier_id=eq.${supplierId}`
      },
      (payload) => {
        // Handle form response updates
        this.handleFormResponseUpdate(supplierId, payload);
      }
    );
  }
  
  async subscribeToJourneyProgress(supplierId: string): Promise<SubscriptionResult> {
    return this.subscribeToChannel(
      supplierId,
      'journey-progress',
      {
        table: 'journey_progress',
        filter: `supplier_id=eq.${supplierId}`
      },
      (payload) => {
        // Handle journey progress updates
        this.handleJourneyUpdate(supplierId, payload);
      }
    );
  }
  
  async subscribeToCoreFields(coupleId: string): Promise<SubscriptionResult> {
    return this.subscribeToChannel(
      coupleId,
      'core-fields',
      {
        table: 'core_fields',
        filter: `couple_id=eq.${coupleId}`
      },
      (payload) => {
        // Handle core field updates
        this.handleCoreFieldUpdate(coupleId, payload);
      }
    );
  }
  
  // Connection cleanup and management
  async unsubscribeFromChannel(channelId: string): Promise<void> {
    const channel = this.subscriptions.get(channelId);
    if (channel) {
      await channel.unsubscribe();
      this.subscriptions.delete(channelId);
      await this.removeSubscriptionRecord(channelId);
    }
  }
  
  async cleanup(): Promise<void> {
    // Unsubscribe from all channels
    const unsubscribePromises = Array.from(this.subscriptions.keys()).map(
      channelId => this.unsubscribeFromChannel(channelId)
    );
    await Promise.all(unsubscribePromises);
  }
  
  // Validation and security
  private async validateChannelPermission(
    userId: string,
    channelName: string,
    filter: RealtimeChannelFilter
  ): Promise<boolean> {
    // Check user permissions based on channel type and filter
    const { data: user } = await this.supabase
      .from('user_profiles')
      .select('id, user_type, supplier_id, couple_id')
      .eq('id', userId)
      .single();
    
    if (!user) return false;
    
    // Validate permission based on user type and channel
    switch (channelName) {
      case 'form-responses':
        return user.user_type === 'supplier' && 
               filter.filter?.includes(`supplier_id=eq.${user.supplier_id}`);
      case 'journey-progress':
        return user.user_type === 'supplier' && 
               filter.filter?.includes(`supplier_id=eq.${user.supplier_id}`);
      case 'core-fields':
        return user.user_type === 'couple' && 
               filter.filter?.includes(`couple_id=eq.${user.couple_id}`);
      default:
        return false;
    }
  }
  
  private buildRLSFilter(userId: string, filter: RealtimeChannelFilter): string {
    // Build RLS-compliant filter string
    return filter.filter || '';
  }
  
  private async recordSubscription(
    userId: string,
    channelId: string,
    channelName: string,
    filter: RealtimeChannelFilter
  ): Promise<void> {
    await this.supabase
      .from('realtime_subscriptions')
      .insert({
        user_id: userId,
        channel_name: channelName,
        table_name: filter.table,
        filter_params: filter,
        active: true
      });
  }
  
  private async logSubscriptionActivity(
    userId: string,
    channelId: string,
    eventType: string
  ): Promise<void> {
    // Log for audit and analytics
    await this.supabase
      .from('realtime_activity_logs')
      .insert({
        user_id: userId,
        channel_id: channelId,
        event_type: eventType,
        timestamp: new Date().toISOString()
      });
  }
}
```

2. **Database Migration for Realtime System:**
```sql
-- Location: $WS_ROOT/wedsync/supabase/migrations/[timestamp]_realtime_system.sql

-- Enable realtime for critical tables
ALTER TABLE suppliers REPLICA IDENTITY FULL;
ALTER TABLE couples REPLICA IDENTITY FULL;
ALTER TABLE form_responses REPLICA IDENTITY FULL;
ALTER TABLE core_fields REPLICA IDENTITY FULL;
ALTER TABLE journey_progress REPLICA IDENTITY FULL;
ALTER TABLE clients REPLICA IDENTITY FULL;
ALTER TABLE wedding_details REPLICA IDENTITY FULL;

-- Create realtime subscriptions tracking table
CREATE TABLE IF NOT EXISTS realtime_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  channel_name TEXT NOT NULL,
  table_name TEXT NOT NULL,
  filter_params JSONB,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_ping_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  UNIQUE(user_id, channel_name, table_name)
);

-- Create realtime activity logs for monitoring
CREATE TABLE IF NOT EXISTS realtime_activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  channel_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  payload JSONB,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_realtime_subs_user ON realtime_subscriptions(user_id);
CREATE INDEX idx_realtime_subs_channel ON realtime_subscriptions(channel_name);
CREATE INDEX idx_realtime_subs_active ON realtime_subscriptions(active) WHERE active = true;
CREATE INDEX idx_activity_logs_user ON realtime_activity_logs(user_id);
CREATE INDEX idx_activity_logs_timestamp ON realtime_activity_logs(timestamp);

-- RLS Policies for realtime_subscriptions
ALTER TABLE realtime_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own subscriptions" ON realtime_subscriptions
  FOR ALL USING (auth.uid() = user_id);

-- RLS Policies for realtime_activity_logs  
ALTER TABLE realtime_activity_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own activity logs" ON realtime_activity_logs
  FOR SELECT USING (auth.uid() = user_id);

-- Function to cleanup inactive subscriptions
CREATE OR REPLACE FUNCTION cleanup_inactive_subscriptions()
RETURNS INTEGER AS $$
DECLARE
  cleanup_count INTEGER;
BEGIN
  DELETE FROM realtime_subscriptions 
  WHERE active = false 
  OR last_ping_at < NOW() - INTERVAL '5 minutes';
  
  GET DIAGNOSTICS cleanup_count = ROW_COUNT;
  RETURN cleanup_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

3. **API Endpoints Implementation:**
```typescript
// Location: $WS_ROOT/wedsync/src/app/api/realtime/subscribe/route.ts
const subscribeSchema = z.object({
  channels: z.array(z.string().min(1)),
  filters: z.object({
    supplier_id: z.string().uuid().optional(),
    couple_id: z.string().uuid().optional(),
    wedding_id: z.string().uuid().optional()
  }).optional()
});

export const POST = withSecureValidation(
  subscribeSchema,
  async (request, validatedData) => {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Rate limiting check
    const rateLimitResult = await rateLimitService.checkLimit(
      `realtime-subscribe-${session.user.id}`,
      10, // 10 subscriptions per minute
      60000
    );
    
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded' },
        { status: 429 }
      );
    }
    
    try {
      const { channels, filters } = validatedData;
      const subscriptionManager = new RealtimeSubscriptionManager(
        createServerClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY!
        )
      );
      
      const subscriptions: SubscriptionResult[] = [];
      
      // Process each channel subscription
      for (const channelName of channels) {
        let subscriptionResult: SubscriptionResult;
        
        switch (channelName) {
          case 'form-responses':
            if (filters?.supplier_id) {
              subscriptionResult = await subscriptionManager.subscribeToFormResponses(
                filters.supplier_id
              );
            } else {
              throw new Error('supplier_id required for form-responses channel');
            }
            break;
            
          case 'journey-progress':
            if (filters?.supplier_id) {
              subscriptionResult = await subscriptionManager.subscribeToJourneyProgress(
                filters.supplier_id
              );
            } else {
              throw new Error('supplier_id required for journey-progress channel');
            }
            break;
            
          case 'core-fields':
            if (filters?.couple_id) {
              subscriptionResult = await subscriptionManager.subscribeToCoreFields(
                filters.couple_id
              );
            } else {
              throw new Error('couple_id required for core-fields channel');
            }
            break;
            
          default:
            throw new Error(`Unknown channel: ${channelName}`);
        }
        
        subscriptions.push(subscriptionResult);
      }
      
      return NextResponse.json({
        success: true,
        subscriptions: subscriptions.map(sub => ({
          channel: sub.channelId,
          status: 'active' as const,
          filter: sub.filter
        }))
      });
      
    } catch (error) {
      console.error('Subscription error:', error);
      return NextResponse.json(
        { error: 'Subscription failed' },
        { status: 500 }
      );
    }
  }
);
```

```typescript
// Location: $WS_ROOT/wedsync/src/app/api/realtime/status/route.ts
export const GET = withSecureValidation(
  z.object({}),
  async (request) => {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    try {
      const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );
      
      // Get user's active subscriptions
      const { data: subscriptions } = await supabase
        .from('realtime_subscriptions')
        .select('channel_name, table_name, created_at, last_ping_at')
        .eq('user_id', session.user.id)
        .eq('active', true);
      
      // Get recent activity count
      const { count: messageCount } = await supabase
        .from('realtime_activity_logs')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', session.user.id)
        .gte('timestamp', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());
      
      // Get last message timestamp
      const { data: lastActivity } = await supabase
        .from('realtime_activity_logs')
        .select('timestamp')
        .eq('user_id', session.user.id)
        .order('timestamp', { ascending: false })
        .limit(1)
        .single();
      
      return NextResponse.json({
        connected: true,
        activeChannels: subscriptions?.map(sub => sub.channel_name) || [],
        messageCount: messageCount || 0,
        lastMessageAt: lastActivity?.timestamp || null
      });
      
    } catch (error) {
      console.error('Status check error:', error);
      return NextResponse.json(
        { error: 'Status check failed' },
        { status: 500 }
      );
    }
  }
);
```

4. **Connection Health Monitor:**
```typescript
// Location: $WS_ROOT/wedsync/src/lib/realtime/connection-monitor.ts
export class RealtimeConnectionMonitor {
  private cleanupInterval: NodeJS.Timeout | null = null;
  
  constructor(private supabase: SupabaseClient) {}
  
  // Start monitoring connections
  startMonitoring(): void {
    // Clean up inactive subscriptions every 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanupInactiveConnections();
    }, 5 * 60 * 1000);
  }
  
  // Stop monitoring
  stopMonitoring(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }
  
  // Update subscription ping timestamp
  async updateSubscriptionPing(userId: string, channelName: string): Promise<void> {
    await this.supabase
      .from('realtime_subscriptions')
      .update({ last_ping_at: new Date().toISOString() })
      .eq('user_id', userId)
      .eq('channel_name', channelName);
  }
  
  // Cleanup inactive connections
  private async cleanupInactiveConnections(): Promise<void> {
    try {
      const { data } = await this.supabase.rpc('cleanup_inactive_subscriptions');
      console.log(`Cleaned up ${data} inactive subscriptions`);
    } catch (error) {
      console.error('Cleanup failed:', error);
    }
  }
  
  // Get connection statistics
  async getConnectionStats(): Promise<ConnectionStats> {
    const { data: activeConnections, count: activeCount } = await this.supabase
      .from('realtime_subscriptions')
      .select('*', { count: 'exact', head: true })
      .eq('active', true);
    
    const { data: todayActivity, count: todayCount } = await this.supabase
      .from('realtime_activity_logs')
      .select('*', { count: 'exact', head: true })
      .gte('timestamp', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());
    
    return {
      activeConnections: activeCount || 0,
      todayMessages: todayCount || 0,
      avgMessagesPerConnection: activeCount ? (todayCount || 0) / activeCount : 0
    };
  }
}
```

## 📋 TECHNICAL SPECIFICATION FROM WS-202

**Backend Requirements:**
- Secure channel subscription management with authentication
- Database schema for tracking active subscriptions
- Row Level Security policies for data access control
- Connection monitoring and cleanup for scalability
- Rate limiting to prevent abuse and maintain performance

**Wedding Industry Context:**
- Form response subscriptions for suppliers receiving couple updates
- Journey progress notifications for milestone tracking
- Core field subscriptions for wedding detail changes
- Client profile update notifications for coordination

## 🎯 SPECIFIC DELIVERABLES FOR ROUND 1

### Core Backend Implementation:
- [ ] RealtimeSubscriptionManager with channel lifecycle management
- [ ] Database migration for subscription tracking and activity logs
- [ ] API endpoints for subscribe/unsubscribe operations
- [ ] Connection health monitoring and cleanup system
- [ ] Row Level Security policies for secure data access

### Security Implementation:
- [ ] Authentication validation for all subscription endpoints
- [ ] Channel authorization based on user type and permissions
- [ ] Rate limiting for subscription requests
- [ ] Audit logging for all realtime activities
- [ ] Connection cleanup for inactive subscriptions

### Wedding Industry Backend:
- [ ] Form response subscription logic for suppliers
- [ ] Journey progress notification system
- [ ] Core field change tracking for wedding details
- [ ] Client profile update subscription management
- [ ] Multi-tenant data filtering for supplier/couple isolation

### Performance & Monitoring:
- [ ] Connection statistics and monitoring dashboard
- [ ] Automatic cleanup of inactive connections
- [ ] Performance metrics for subscription activities
- [ ] Error handling and recovery for connection failures
- [ ] Scalable architecture for 200+ concurrent connections

## 💾 WHERE TO SAVE YOUR WORK
- Core Logic: $WS_ROOT/wedsync/src/lib/realtime/
- API Routes: $WS_ROOT/wedsync/src/app/api/realtime/
- Database: $WS_ROOT/wedsync/supabase/migrations/
- Monitoring: $WS_ROOT/wedsync/src/lib/monitoring/
- Types: $WS_ROOT/wedsync/src/types/realtime.ts
- Tests: $WS_ROOT/wedsync/__tests__/lib/realtime/
- Reports: $WS_ROOT/WORKFLOW-V2-DRAFT/INBOX/senior-dev/WS-202-team-b-round-1-complete.md

## 🏁 COMPLETION CHECKLIST
- [ ] RealtimeSubscriptionManager implemented with secure channel management
- [ ] Database migration created and applied for subscription tracking
- [ ] API endpoints secure and fully validated with authentication
- [ ] Connection monitoring system active with cleanup automation
- [ ] Row Level Security policies enforced for all realtime data
- [ ] Rate limiting implemented for subscription endpoints
- [ ] Wedding industry subscription logic fully functional
- [ ] Audit logging system active for all realtime activities
- [ ] Performance requirements met (200+ concurrent connections)
- [ ] TypeScript compilation successful
- [ ] All backend realtime tests passing
- [ ] Evidence package prepared with API testing results
- [ ] Senior dev review prompt created

---

**EXECUTE IMMEDIATELY - This is a comprehensive prompt with all requirements for realtime backend implementation!**