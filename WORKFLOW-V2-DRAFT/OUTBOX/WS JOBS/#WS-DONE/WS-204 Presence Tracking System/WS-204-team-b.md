# WS-204-TEAM-B: Presence Tracking Backend Infrastructure
## Generated: 2025-01-20 | Development Manager Session | Feature: WS-204 Presence Tracking System

---

## 🎯 MISSION: BULLETPROOF PRESENCE BACKEND ARCHITECTURE

**Your mission as Team B (Backend/API Specialists):** Build scalable presence tracking backend that manages real-time user status, activity detection, and privacy settings while handling 1000+ concurrent presence subscriptions during peak wedding season with sub-2-second status updates and comprehensive audit logging.

**Impact:** Enables reliable presence data for venue coordinators tracking 20+ suppliers across multiple weddings, with persistent last-seen data surviving connection drops and privacy-compliant presence sharing that builds trust while enabling coordination.

---

## 📋 EVIDENCE OF REALITY REQUIREMENTS (NON-NEGOTIABLE)

Before you can claim completion, you MUST provide concrete evidence:

### 🔍 MANDATORY FILE PROOF
```bash
# Run these exact commands and include output in your completion report:
ls -la $WS_ROOT/wedsync/src/lib/presence/
ls -la $WS_ROOT/wedsync/src/app/api/presence/
ls -la $WS_ROOT/wedsync/supabase/migrations/ | grep presence
cat $WS_ROOT/wedsync/src/lib/presence/presence-manager.ts | head -20
```

### 🧪 MANDATORY TEST VALIDATION
```bash
# All these commands MUST pass:
cd $WS_ROOT/wedsync && npm run typecheck
cd $WS_ROOT/wedsync && npm test -- --testPathPattern=presence
cd $WS_ROOT/wedsync && npm test -- --testPathPattern=activity-tracker
```

### 🎭 MANDATORY E2E PROOF
Your delivery MUST include Playwright test evidence showing:
- Presence status persisting across connection drops
- Privacy settings properly enforced at API level
- Activity logging working for enterprise analytics
- Last seen timestamps updating correctly
- Bulk presence queries performing under load

**NO EXCEPTIONS:** Without this evidence, your work is incomplete regardless of backend quality.

---

## 🧠 ENHANCED SERENA MCP ACTIVATION

### 🤖 SERENA INTELLIGENCE SETUP
```bash
# MANDATORY: Activate Serena's backend pattern analysis
mcp__serena__activate_project("wedsync")
mcp__serena__get_symbols_overview("src/lib/presence")
mcp__serena__find_symbol("PresenceManager")
mcp__serena__write_memory("presence-backend", "Presence tracking backend with privacy controls and enterprise analytics")
```

**Serena-Enhanced Backend Development:**
1. **Pattern Recognition**: Analyze existing API and database patterns for consistency
2. **Performance Optimization**: Use Serena to identify efficient query patterns
3. **Security Integration**: Build on existing authentication and authorization patterns
4. **Error Handling**: Leverage consistent error handling patterns across the application

---

## 🧩 SEQUENTIAL THINKING ACTIVATION - PRESENCE BACKEND DESIGN

```typescript
mcp__sequential_thinking__sequentialthinking({
  thought: "I need to design a comprehensive presence tracking backend system for wedding coordination. Key challenges: 1) Real-time presence state management using Supabase Realtime Presence (in-memory) 2) Persistent data storage for last-seen tracking and analytics 3) Privacy controls respecting user settings and relationship permissions 4) Activity logging for enterprise analytics 5) Scalable architecture supporting 1000+ concurrent presence subscriptions. The system must bridge real-time ephemeral presence with persistent user preferences and audit data.",
  nextThoughtNeeded: true,
  thoughtNumber: 1,
  totalThoughts: 8
})

mcp__sequential_thinking__sequentialthinking({
  thought: "For the technical architecture, I need: 1) Database schema with presence_settings, user_last_seen, and presence_activity_logs tables 2) API endpoints for tracking presence, updating settings, and querying presence data 3) Privacy enforcement middleware ensuring users only see authorized presence data 4) Activity detection service tracking page views, focus events, and user interactions 5) Background job for cleaning up stale presence data and updating last-seen timestamps. The wedding context requires relationship-based permissions - coordinators see their wedding team, photographers see their clients.",
  nextThoughtNeeded: true,
  thoughtNumber: 2,
  totalThoughts: 8
})

mcp__sequential_thinking__sequentialthinking({
  thought: "For privacy and security implementation: All presence data access must validate user relationships and respect privacy settings. The hierarchy is: 'everyone' (public), 'team' (organization members), 'contacts' (wedding collaboration), 'nobody' (invisible). The 'appear offline' override always shows offline regardless of actual status. Enterprise features include activity logging with JSONB metadata for detailed analytics. Rate limiting prevents presence spam (max 1 status update/second per user).",
  nextThoughtNeeded: true,
  thoughtNumber: 3,
  totalThoughts: 8
})

// Continue structured analysis through database optimization, caching, monitoring...
```

---

## 🔐 SECURITY REQUIREMENTS (TEAM B SPECIALIZATION)

### 🚨 MANDATORY SECURITY IMPLEMENTATION

**ALL presence endpoints must implement comprehensive security:**
```typescript
import { withSecureValidation } from '$WS_ROOT/wedsync/src/lib/validation/middleware';
import { z } from 'zod';
import { getServerSession } from 'next-auth';
import { checkPresencePermissions } from '$WS_ROOT/wedsync/src/lib/auth/presence-permissions';
import { rateLimitService } from '$WS_ROOT/wedsync/src/lib/rate-limiter';

const trackPresenceSchema = z.object({
  status: z.enum(['online', 'idle', 'away', 'busy']),
  currentPage: z.string().optional(),
  isTyping: z.boolean().optional(),
  device: z.enum(['desktop', 'mobile', 'tablet']).optional(),
  customStatus: z.string().max(100).optional(),
  customEmoji: z.string().max(10).optional()
});

export const POST = withSecureValidation(
  trackPresenceSchema,
  async (request, validatedData) => {
    const session = await getServerSession();
    if (!session?.user) throw new Error('Authentication required');
    
    // Rate limiting: 1 presence update per second per user
    await rateLimitService.checkLimit(`presence:${session.user.id}`, 1, 1);
    
    // Validate presence permissions and privacy settings
    const hasPermission = await checkPresencePermissions(session.user.id, validatedData);
    if (!hasPermission) throw new Error('Presence tracking not permitted');
    
    // Sanitize custom status for XSS prevention
    const sanitizedData = sanitizePresenceData(validatedData);
    
    // Audit logging for enterprise analytics
    await logPresenceActivity(session.user.id, 'status_update', sanitizedData);
  }
);
```

### 🔒 TEAM B SECURITY CHECKLIST
- [ ] Authentication required for all presence endpoints
- [ ] Rate limiting: 1 presence update per second per user
- [ ] Privacy permission validation for all presence data access
- [ ] Custom status message sanitization (XSS prevention)
- [ ] Relationship-based access control (team, contacts, organization)
- [ ] Activity logging with sensitive data filtering
- [ ] Row Level Security policies for all presence tables
- [ ] Audit trail for presence settings changes

---

## 💡 UI TECHNOLOGY REQUIREMENTS

### 🎨 DESIGN SYSTEM INTEGRATION
Use our premium component libraries for presence administration:

**Untitled UI Components (License: $247 - Premium):**
```typescript
// For presence analytics dashboards and admin interfaces
import { Card, Badge, Button, Table } from '@/components/untitled-ui';
import { StatsGrid, MetricCard } from '@/components/untitled-ui/analytics';
```

**Magic UI Components (Free Tier):**
```typescript
// For presence status indicators in admin views
import { StatusDot, ActivityGraph } from '@/components/magic-ui';
import { RealTimeCounter } from '@/components/magic-ui/data-display';
```

**Mandatory Navigation Integration:**
Every presence administration feature MUST integrate with navigation:
```typescript
// Add to: src/components/navigation/NavigationItems.tsx
{
  label: 'Presence Analytics',
  href: '/admin/presence/analytics',
  icon: 'activity',
  badge: activeUsers > 100 ? '100+' : activeUsers.toString()
}
```

---

## 🔧 TEAM B BACKEND SPECIALIZATION

### 🎯 YOUR CORE DELIVERABLES

**1. Presence Management Service**
```typescript
// Required: /src/lib/presence/presence-manager.ts
interface PresenceManager {
  // Core presence tracking
  trackUserPresence(userId: string, data: PresenceData): Promise<void>;
  getUserPresence(userId: string, viewerId: string): Promise<PresenceState | null>;
  getBulkPresence(userIds: string[], viewerId: string): Promise<Record<string, PresenceState>>;
  
  // Privacy and settings
  updatePresenceSettings(userId: string, settings: PresenceSettings): Promise<void>;
  getPresenceSettings(userId: string): Promise<PresenceSettings>;
  checkPresencePermissions(targetUserId: string, viewerId: string): Promise<boolean>;
  
  // Activity logging (Enterprise)
  logActivity(userId: string, activityType: ActivityType, metadata?: any): Promise<void>;
  getActivityAnalytics(organizationId: string, dateRange: DateRange): Promise<ActivityAnalytics>;
  
  // Maintenance
  updateLastSeen(userId: string, deviceInfo?: DeviceInfo): Promise<void>;
  cleanupStalePresence(): Promise<number>;
}

interface PresenceData {
  status: 'online' | 'idle' | 'away' | 'busy';
  currentPage?: string;
  isTyping?: boolean;
  device?: 'desktop' | 'mobile' | 'tablet';
  customStatus?: string;
  customEmoji?: string;
}

interface PresenceSettings {
  visibility: 'everyone' | 'team' | 'contacts' | 'nobody';
  showActivity: boolean;
  showCurrentPage: boolean;
  appearOffline: boolean;
  customStatus?: string;
  customEmoji?: string;
}
```

**2. Database Migration for Presence Tables**
```sql
-- Required: Migration file /supabase/migrations/[TIMESTAMP]_presence_tracking.sql

-- Presence settings table
CREATE TABLE IF NOT EXISTS presence_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  visibility TEXT CHECK (visibility IN ('everyone', 'team', 'contacts', 'nobody')) DEFAULT 'contacts',
  show_activity BOOLEAN DEFAULT true,
  show_current_page BOOLEAN DEFAULT false,
  appear_offline BOOLEAN DEFAULT false,
  custom_status TEXT,
  custom_status_emoji TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Last seen tracking table
CREATE TABLE IF NOT EXISTS user_last_seen (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  last_seen_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_page TEXT,
  last_device TEXT,
  last_activity_type TEXT,
  session_duration_minutes INTEGER,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enterprise activity logging
CREATE TABLE IF NOT EXISTS presence_activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL,
  page_viewed TEXT,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  device_type TEXT,
  session_id UUID,
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Row Level Security Policies
ALTER TABLE presence_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_last_seen ENABLE ROW LEVEL SECURITY;
ALTER TABLE presence_activity_logs ENABLE ROW LEVEL SECURITY;

-- Users can only manage their own presence settings
CREATE POLICY "Users manage own presence settings" ON presence_settings
  FOR ALL USING (auth.uid() = user_id);

-- Last seen visibility based on relationships
CREATE POLICY "Last seen visibility based on relationship" ON user_last_seen
  FOR SELECT USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM presence_settings ps 
      WHERE ps.user_id = user_last_seen.user_id 
      AND ps.visibility != 'nobody'
      AND (
        ps.visibility = 'everyone' OR
        (ps.visibility = 'team' AND EXISTS (
          SELECT 1 FROM user_organizations uo1, user_organizations uo2
          WHERE uo1.user_id = auth.uid() 
          AND uo2.user_id = user_last_seen.user_id
          AND uo1.organization_id = uo2.organization_id
        )) OR
        (ps.visibility = 'contacts' AND EXISTS (
          SELECT 1 FROM wedding_collaborations wc
          WHERE (wc.supplier_id = auth.uid() AND wc.client_id = user_last_seen.user_id)
          OR (wc.client_id = auth.uid() AND wc.supplier_id = user_last_seen.user_id)
        ))
      )
    )
  );

-- Enterprise activity logs restricted to organization admins
CREATE POLICY "Organization admins see activity logs" ON presence_activity_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_organizations uo
      WHERE uo.user_id = auth.uid()
      AND uo.organization_id = presence_activity_logs.organization_id
      AND uo.role IN ('admin', 'owner')
    )
  );

-- Indexes for performance
CREATE INDEX idx_presence_settings_user_id ON presence_settings(user_id);
CREATE INDEX idx_user_last_seen_user_id ON user_last_seen(user_id);
CREATE INDEX idx_presence_activity_org_timestamp ON presence_activity_logs(organization_id, timestamp DESC);
CREATE INDEX idx_presence_activity_user_timestamp ON presence_activity_logs(user_id, timestamp DESC);
```

**3. API Endpoints for Presence Management**
```typescript
// Required: /src/app/api/presence/track/route.ts
export async function POST(request: Request) {
  // Track user presence with real-time broadcasting
  // Validate presence permissions and privacy settings
  // Update last-seen data with activity context
  // Log activity for enterprise analytics
  // Return broadcast confirmation
}

// Required: /src/app/api/presence/users/route.ts  
export async function GET(request: Request) {
  // Get bulk presence data for multiple users
  // Filter by context (wedding, organization, global)
  // Respect privacy settings and relationships
  // Return formatted presence states
}

// Required: /src/app/api/presence/settings/route.ts
export async function PUT(request: Request) {
  // Update user presence settings
  // Validate permission levels and relationships
  // Broadcast settings changes to active sessions
  // Audit log settings modifications
}

// Required: /src/app/api/presence/analytics/route.ts
export async function GET(request: Request) {
  // Enterprise analytics for presence data
  // Organization-level activity insights
  // Peak usage hours and user engagement
  // Page view analytics and session duration
}
```

**4. Privacy and Permission Service**
```typescript
// Required: /src/lib/presence/permission-service.ts
interface PresencePermissionService {
  checkViewPermission(targetUserId: string, viewerId: string): Promise<boolean>;
  filterPresenceByPermissions(presenceData: PresenceState[], viewerId: string): Promise<PresenceState[]>;
  validateRelationship(userId1: string, userId2: string): Promise<RelationshipType>;
  getVisibilityLevel(userId: string): Promise<VisibilityLevel>;
}

enum RelationshipType {
  SAME_USER = 'same_user',
  ORGANIZATION_MEMBER = 'organization_member', 
  WEDDING_COLLABORATOR = 'wedding_collaborator',
  PUBLIC = 'public',
  NONE = 'none'
}

async function checkPresencePermissions(
  targetUserId: string, 
  viewerId: string
): Promise<boolean> {
  if (targetUserId === viewerId) return true;
  
  const settings = await getPresenceSettings(targetUserId);
  if (settings.appearOffline || settings.visibility === 'nobody') {
    return false;
  }
  
  const relationship = await validateRelationship(targetUserId, viewerId);
  
  switch (settings.visibility) {
    case 'everyone': return true;
    case 'team': return relationship === RelationshipType.ORGANIZATION_MEMBER;
    case 'contacts': return relationship === RelationshipType.WEDDING_COLLABORATOR;
    default: return false;
  }
}
```

**5. Activity Tracking and Analytics**
```typescript
// Required: /src/lib/presence/activity-tracker.ts
interface ActivityTracker {
  trackPageView(userId: string, page: string, deviceInfo: DeviceInfo): Promise<void>;
  trackUserInteraction(userId: string, interactionType: string, metadata?: any): Promise<void>;
  updateSessionDuration(userId: string, sessionId: string): Promise<void>;
  generateActivityReport(organizationId: string, dateRange: DateRange): Promise<ActivityReport>;
}

interface ActivityReport {
  totalSessions: number;
  averageSessionDuration: number;
  peakHours: { hour: number; activeUsers: number }[];
  mostActiveUsers: { userId: string; totalMinutes: number }[];
  pageViews: { page: string; views: number; uniqueUsers: number }[];
  deviceBreakdown: { desktop: number; mobile: number; tablet: number };
}

// Enterprise activity logging with privacy protection
async function logPresenceActivity(
  userId: string,
  activityType: ActivityType,
  metadata: any = {}
): Promise<void> {
  const user = await getUserById(userId);
  if (!user.organization?.hasEnterprisePlan) {
    return; // Activity logging only for Enterprise tier
  }
  
  // Filter sensitive metadata before logging
  const sanitizedMetadata = sanitizeMetadata(metadata);
  
  await supabase
    .from('presence_activity_logs')
    .insert({
      user_id: userId,
      organization_id: user.organizationId,
      activity_type: activityType,
      page_viewed: metadata.page,
      device_type: metadata.device,
      session_id: metadata.sessionId,
      metadata: sanitizedMetadata,
      timestamp: new Date().toISOString()
    });
}
```

---

## 💒 WEDDING INDUSTRY CONTEXT

### 🤝 REAL WEDDING SCENARIOS FOR TEAM B

**Scenario 1: Multi-Wedding Venue Coordination Backend**
- Backend tracks presence for 50+ suppliers across 3 weekend weddings
- Privacy settings ensure Sarah's photographer only sees Sarah's team presence
- Last-seen persistence maintains coordination context across connection drops
- Activity logging provides insights into peak coordination hours (Friday evening setup)

**Scenario 2: Photography Team Mobile Coordination**
- Backend handles mobile presence updates during venue setup
- Device tracking distinguishes between desktop planning and mobile on-site work
- Activity patterns show when teams transition from planning to execution phases
- Enterprise analytics identify optimal communication timing patterns

**Scenario 3: Supplier Privacy and Trust Building**
- Backend enforces strict privacy controls - couples can't see supplier presence outside their wedding
- "Appear offline" option respects supplier focus time needs
- Relationship validation ensures presence data sharing follows business context
- Custom status backend enables professional availability communication

### 🔗 WEDDING WORKFLOW BACKEND INTEGRATION

**Context-Based Presence Filtering:**
```typescript
// Wedding-specific presence contexts
async function getWeddingTeamPresence(
  weddingId: string, 
  viewerId: string
): Promise<PresenceState[]> {
  // Get all wedding collaborators
  const collaborators = await getWeddingCollaborators(weddingId);
  
  // Filter by viewer permissions
  const authorizedUsers = await Promise.all(
    collaborators.map(async (user) => {
      const canView = await checkPresencePermissions(user.id, viewerId);
      return canView ? user : null;
    })
  );
  
  // Get presence data for authorized users
  const presenceData = await getBulkPresence(
    authorizedUsers.filter(Boolean).map(u => u.id),
    viewerId
  );
  
  return presenceData;
}
```

**Wedding Season Analytics Patterns:**
```typescript
const weddingSeasonAnalytics = {
  peakMonths: ['may', 'june', 'september', 'october'],
  dailyPatterns: {
    planning: { hours: [9, 10, 11, 14, 15, 16], activity: 'high' },
    coordination: { hours: [17, 18, 19], activity: 'peak' },
    execution: { hours: [8, 9, 12, 13, 17, 18, 19, 20], activity: 'mobile' }
  },
  supplierTypes: {
    photographers: { avgSessions: 12, peakHours: [18, 19, 20] },
    venues: { avgSessions: 6, peakHours: [9, 10, 14, 15] },
    planners: { avgSessions: 18, peakHours: [10, 11, 15, 16, 17] }
  }
};
```

---

## 🚀 PERFORMANCE REQUIREMENTS

### ⚡ TEAM B PERFORMANCE STANDARDS

**Database Query Performance:**
- Single user presence query: < 50ms
- Bulk presence query (50 users): < 200ms
- Privacy permission check: < 30ms
- Activity logging insert: < 100ms

**API Response Times:**
- Presence tracking endpoint: < 200ms
- Settings update endpoint: < 300ms
- Analytics query endpoint: < 2 seconds
- Bulk presence retrieval: < 500ms

**Scalability Targets:**
```typescript
const presencePerformanceTargets = {
  concurrent: {
    maxPresenceSubscriptions: 1000,
    maxConcurrentTracking: 500,
    maxAnalyticsQueries: 10
  },
  
  database: {
    presenceQueryTime: '< 50ms',
    bulkQueryTime: '< 200ms (50 users)',
    settingsUpdateTime: '< 100ms',
    activityLogInsert: '< 50ms'
  },
  
  caching: {
    presenceSettings: '5 minutes',
    lastSeenData: '1 minute',
    relationshipData: '10 minutes',
    analyticsData: '15 minutes'
  },
  
  cleanup: {
    stalePresenceCleanup: 'every 5 minutes',
    oldActivityLogs: 'archive after 90 days',
    inactiveSessionCleanup: 'every 1 hour'
  }
};
```

---

## 🧪 TESTING REQUIREMENTS

### ✅ MANDATORY TEST COVERAGE (>90%)

**Unit Tests:**
```typescript
describe('PresenceManager', () => {
  it('enforces privacy settings correctly', async () => {
    const manager = new PresenceManager();
    
    // User with 'nobody' visibility
    await manager.updatePresenceSettings('user-1', { visibility: 'nobody' });
    
    // Different user tries to view presence
    const presence = await manager.getUserPresence('user-1', 'user-2');
    expect(presence).toBeNull();
  });

  it('validates relationship-based permissions', async () => {
    // Same organization users
    const canViewTeam = await manager.checkPresencePermissions('user-1', 'user-2');
    expect(canViewTeam).toBe(true);
    
    // Wedding collaborators  
    const canViewCollaborator = await manager.checkPresencePermissions('supplier-1', 'client-1');
    expect(canViewCollaborator).toBe(true);
    
    // No relationship
    const canViewStranger = await manager.checkPresencePermissions('user-1', 'stranger');
    expect(canViewStranger).toBe(false);
  });

  it('tracks activity with proper data sanitization', async () => {
    const tracker = new ActivityTracker();
    
    await tracker.trackPageView('user-1', '/sensitive-page', { 
      device: 'desktop',
      sensitiveData: 'should-be-filtered' 
    });
    
    const logs = await getActivityLogs('user-1');
    expect(logs[0].metadata).not.toHaveProperty('sensitiveData');
    expect(logs[0].page_viewed).toBe('/sensitive-page');
  });
});
```

**Integration Tests:**
```typescript
describe('Presence API Integration', () => {
  it('handles concurrent presence updates correctly', async () => {
    const updates = Array.from({length: 10}, (_, i) => 
      updatePresence(`user-${i}`, { status: 'online' })
    );
    
    await Promise.all(updates);
    
    // Verify all updates processed
    const bulkPresence = await getBulkPresence(
      Array.from({length: 10}, (_, i) => `user-${i}`),
      'viewer-user'
    );
    
    expect(Object.keys(bulkPresence)).toHaveLength(10);
  });

  it('enforces rate limiting on presence updates', async () => {
    // Attempt multiple rapid updates
    const rapidUpdates = Array.from({length: 5}, () => 
      updatePresence('user-1', { status: 'online' })
    );
    
    // Should throw rate limit error
    await expect(Promise.all(rapidUpdates)).rejects.toThrow('Rate limit exceeded');
  });
});
```

**Performance Tests:**
```typescript
describe('Presence Performance Tests', () => {
  it('bulk presence queries complete within performance targets', async () => {
    const userIds = Array.from({length: 50}, (_, i) => `user-${i}`);
    
    const startTime = Date.now();
    await getBulkPresence(userIds, 'viewer-user');
    const duration = Date.now() - startTime;
    
    expect(duration).toBeLessThan(200); // < 200ms target
  });

  it('activity logging does not impact presence update performance', async () => {
    const startTime = Date.now();
    
    await Promise.all([
      updatePresence('user-1', { status: 'online' }),
      logActivity('user-1', 'page_view', { page: '/dashboard' })
    ]);
    
    const duration = Date.now() - startTime;
    expect(duration).toBeLessThan(300); // Total < 300ms
  });
});
```

---

## 📚 MCP INTEGRATION WORKFLOWS

### 🔧 REQUIRED MCP OPERATIONS

**Ref MCP - Backend Documentation Research:**
```typescript
await mcp__Ref__ref_search_documentation("Supabase Realtime Presence server-side");
await mcp__Ref__ref_search_documentation("PostgreSQL Row Level Security best practices");  
await mcp__Ref__ref_search_documentation("Node.js activity tracking patterns");
await mcp__Ref__ref_search_documentation("privacy-preserving analytics");
```

**Supabase MCP - Database Operations:**
```typescript
await mcp__supabase__apply_migration("presence_tracking", presenceTrackingMigration);
await mcp__supabase__execute_sql("SELECT * FROM presence_settings LIMIT 5");
await mcp__supabase__get_advisors("security"); // Check RLS policy coverage
await mcp__supabase__get_logs("api"); // Monitor presence endpoint performance
```

### 🎯 AGENT COORDINATION REQUIRED

Launch specialized agents for comprehensive backend development:

```typescript
// 1. Backend task coordination
await Task({
  description: "Coordinate presence backend tasks",
  prompt: `You are the task-tracker-coordinator for WS-204 Team B presence tracking backend development.
  Break down the backend implementation into database schema, API endpoints, privacy services, activity tracking, and analytics tasks.
  Track dependencies between presence data management, permission validation, and enterprise logging features.`,
  subagent_type: "task-tracker-coordinator"
});

// 2. Database specialist for presence schema
await Task({
  description: "Presence database architecture", 
  prompt: `You are the postgresql-database-expert for WS-204 presence tracking database.
  Design and implement comprehensive database schema for presence_settings, user_last_seen, and presence_activity_logs.
  Create Row Level Security policies enforcing privacy settings and relationship-based access control.
  Optimize database queries for bulk presence retrieval and activity logging performance.
  Focus on wedding industry requirements: supplier-client relationships, organization boundaries, and privacy compliance.`,
  subagent_type: "postgresql-database-expert"
});

// 3. API architecture specialist
await Task({
  description: "Presence API endpoints",
  prompt: `You are the api-architect for WS-204 presence tracking API design.
  Implement comprehensive REST endpoints for presence tracking, settings management, and analytics queries.
  Design privacy-compliant bulk presence retrieval with relationship validation.
  Integrate with Supabase Realtime Presence for ephemeral status broadcasting.
  Follow Next.js App Router patterns and implement proper rate limiting and authentication.`,
  subagent_type: "api-architect"
});

// 4. Security validation specialist  
await Task({
  description: "Presence security implementation",
  prompt: `You are the security-compliance-officer for WS-204 presence tracking security.
  Validate all presence endpoints implement proper authentication and privacy controls.
  Ensure Row Level Security policies prevent unauthorized presence data access.
  Audit activity logging for enterprise compliance while protecting user privacy.
  Verify relationship-based permissions correctly enforce wedding industry access patterns.`,
  subagent_type: "security-compliance-officer"
});

// 5. Performance optimization specialist
await Task({
  description: "Presence backend performance",
  prompt: `You are the performance-optimization-expert for WS-204 presence backend performance.
  Optimize database queries for sub-200ms bulk presence retrieval with 50+ users.
  Implement efficient caching strategies for presence settings and relationship data.
  Design scalable activity logging supporting 1000+ concurrent presence subscriptions.
  Create cleanup jobs for stale presence data and activity log archival.`,
  subagent_type: "performance-optimization-expert"
});
```

---

## 🎖️ COMPLETION CRITERIA

### ✅ DEFINITION OF DONE

**Code Implementation (All MUST exist):**
- [ ] `/src/lib/presence/presence-manager.ts` - Complete presence management service
- [ ] `/src/lib/presence/permission-service.ts` - Privacy and relationship validation
- [ ] `/src/lib/presence/activity-tracker.ts` - Enterprise activity logging
- [ ] `/src/app/api/presence/track/route.ts` - Presence tracking endpoint
- [ ] `/src/app/api/presence/users/route.ts` - Bulk presence retrieval endpoint
- [ ] `/src/app/api/presence/settings/route.ts` - Settings management endpoint
- [ ] `/supabase/migrations/[TIMESTAMP]_presence_tracking.sql` - Complete database schema

**Performance Validation:**
- [ ] Single user presence query < 50ms
- [ ] Bulk presence query (50 users) < 200ms
- [ ] Privacy permission validation < 30ms
- [ ] Activity logging insert < 100ms

**Security Validation:**
- [ ] All endpoints implement authentication and rate limiting
- [ ] Privacy settings properly enforced at database level
- [ ] Row Level Security policies prevent unauthorized data access  
- [ ] Activity logging respects user privacy preferences

**Database Schema:**
- [ ] presence_settings table with proper constraints and indexes
- [ ] user_last_seen table with relationship-based access policies
- [ ] presence_activity_logs table for enterprise analytics
- [ ] Comprehensive RLS policies enforcing privacy controls

**Enterprise Features:**
- [ ] Activity logging for organization analytics
- [ ] Privacy-compliant data collection and storage
- [ ] Relationship-based presence visibility controls
- [ ] Cleanup jobs for data retention compliance

---

## 📖 DOCUMENTATION REQUIREMENTS

### 📝 MANDATORY DOCUMENTATION

Create comprehensive backend API documentation:

**API Reference Documentation:**
```markdown
# Presence Tracking API

## Track User Presence
`POST /api/presence/track`

Updates user's real-time presence status and broadcasts to connected clients.

### Request Body
```json
{
  "status": "online|idle|away|busy",
  "currentPage": "/dashboard/wedding/123",
  "isTyping": false,
  "device": "desktop|mobile|tablet",
  "customStatus": "At venue - ceremony prep",
  "customEmoji": "📸"
}
```

### Response
```json
{
  "success": true,
  "broadcastId": "uuid-broadcast-id"
}
```

## Get User Presence
`GET /api/presence/users?userIds[]=id1&userIds[]=id2`

Retrieves presence data for multiple users with privacy filtering.

### Privacy Filtering
- Respects user visibility settings (everyone, team, contacts, nobody)
- Validates relationship between viewer and target users
- Enforces "appear offline" overrides

### Response
```json
{
  "users": [
    {
      "userId": "uuid",
      "status": "online",
      "lastSeen": "2024-01-20T10:30:00Z",
      "currentPage": "/timeline",
      "isTyping": false,
      "device": "desktop",
      "customStatus": "Reviewing timeline",
      "customEmoji": "📝"
    }
  ]
}
```
```

**Privacy and Security Documentation:**
```markdown
# Presence Privacy Controls

## Visibility Levels
- **everyone**: Public presence visible to all platform users
- **team**: Presence visible to organization members only
- **contacts**: Presence visible to wedding collaborators only  
- **nobody**: Presence hidden from all users (always offline)

## Relationship Validation
The system validates relationships before showing presence:

1. **Same User**: Users always see their own presence
2. **Organization Members**: Users in same organization see team presence
3. **Wedding Collaborators**: Suppliers and clients see each other's presence
4. **Public**: Users with 'everyone' setting visible to all

## Privacy Overrides
- **Appear Offline**: Always shows offline regardless of actual status
- **Custom Status**: Only visible when privacy settings allow
- **Current Page**: Optional sharing based on user preference

## Enterprise Analytics
- Activity logging only enabled for Enterprise tier organizations
- Personal data sanitized before storage
- Aggregated insights respect individual privacy
- Data retention follows compliance requirements
```

---

## 💼 WEDDING BUSINESS IMPACT

### 📊 SUCCESS METRICS

**Backend Reliability Improvements:**
- 99.9% presence data accuracy with connection persistence
- Sub-200ms response times for bulk presence queries during peak usage
- Privacy-compliant data sharing building supplier trust
- Enterprise analytics enabling workflow optimization insights

**Wedding Coordination Enhancement:**
- Real-time presence data supporting 1000+ concurrent users during wedding season
- Relationship-based permissions ensuring appropriate data access
- Activity insights identifying peak coordination patterns
- Mobile presence tracking supporting on-site wedding coordination

**Trust and Compliance Benefits:**
- Granular privacy controls respecting supplier work-life boundaries
- Enterprise-grade audit logging for compliance requirements  
- Secure data handling preventing unauthorized presence exposure
- Professional custom status system enhancing business communication

---

**🎯 TEAM B SUCCESS DEFINITION:**
You've succeeded when the presence backend reliably handles 1000+ concurrent presence subscriptions with sub-200ms response times, enforces privacy settings that build supplier trust through granular visibility controls, and provides enterprise analytics enabling wedding businesses to optimize their coordination workflows.

---

**🚨 FINAL REMINDER - EVIDENCE REQUIRED:**
Your completion report MUST include:
1. File existence proof (`ls -la` output)
2. TypeScript compilation success (`npm run typecheck`)
3. All tests passing (`npm test`)
4. Database migration successfully applied
5. API endpoint performance benchmarks
6. Privacy enforcement validation results

**No exceptions. Evidence-based delivery only.**

---

*Generated by WedSync Development Manager*  
*Feature: WS-204 Presence Tracking System*  
*Team: B (Backend/API Specialists)*  
*Scope: Scalable presence backend with privacy controls*  
*Standards: Evidence-based completion with enterprise-grade security*