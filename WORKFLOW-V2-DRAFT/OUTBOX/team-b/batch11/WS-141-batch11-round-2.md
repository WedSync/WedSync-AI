# TEAM B - ROUND 2: WS-141 - Viral Optimization Engine - Enhancement & Polish

**Date:** 2025-08-24  
**Feature ID:** WS-141 (Track all work with this ID)
**Priority:** P0 from roadmap  
**Mission:** Enhance viral optimization with A/B testing, super-connectors, and advanced metrics  
**Context:** Round 2 builds on Round 1 core APIs. Integration with Teams A, C, D required.

---

## 🎯 USER STORY & WEDDING CONTEXT (CRITICAL - THINK HARD)

**As a:** Wedding venue owner with strong local network
**I want to:** The system to automatically identify me as a super-connector and optimize my referral impact
**So that:** My high-value introductions get prioritized and I receive maximum referral rewards

**Real Wedding Problem This Solves:**
The Ritz-Carlton venue coordinator has connected 200+ couples with premium vendors. The viral system identifies her as a super-connector, automatically prioritizes her invitations in recipient inboxes, and provides her with advanced analytics showing her network's $2M+ in wedding business value.

---

## 🎯 TECHNICAL REQUIREMENTS

**Building on Round 1 (MUST be complete):**
- Basic viral metrics calculation ✅
- Core invitation tracking APIs ✅
- Database schema implemented ✅
- Security validation in place ✅

**Round 2 Enhancements:**
- A/B testing framework for invitation templates
- Super-connector identification algorithm
- Advanced viral coefficient breakdowns by generation
- Invitation timing optimization based on recipient patterns
- Referral reward calculation and fulfillment
- Network effect visualization data
- Performance optimization for high-traffic scenarios

---

## 📚 STEP 1: ENHANCED DOCUMENTATION & INTEGRATION ANALYSIS

**⚠️ CRITICAL: Build on Round 1 foundation!**

```typescript
// 1. VALIDATE ROUND 1 COMPLETION:
await mcp__serena__activate_project("/Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync");
await mcp__serena__find_symbol("ViralOptimizationService", "/src/lib/services", true);
await mcp__serena__search_for_pattern("withSecureValidation.*viral");

// 2. INTEGRATION ANALYSIS:
await mcp__serena__find_referencing_symbols("viral-optimization");
await mcp__serena__get_symbols_overview("/src/components/viral");
await mcp__serena__search_for_pattern("marketing.*automation.*attribution");

// 3. LOAD ADVANCED DOCS:
await mcp__context7__get-library-docs("/supabase/supabase", "database performance optimization", 3000);
await mcp__context7__get-library-docs("/vercel/next.js", "streaming responses", 2000);
await mcp__context7__get-library-docs("/supabase/supabase", "realtime subscriptions", 2000);
```

---

## 🚀 STEP 2: LAUNCH ENHANCED AGENTS

1. **task-tracker-coordinator** --think-hard "Track viral optimization enhancements"
2. **algorithm-specialist** --think-ultra-hard "Super-connector identification and A/B testing"
3. **performance-optimizer** --think-ultra-hard "Viral metrics performance optimization"
4. **integration-architect** --think-hard "Team integration and data flow"
5. **analytics-engineer** --think-hard "Advanced viral analytics and breakdowns"
6. **test-automation-architect** --comprehensive-coverage "Advanced API testing"

---

## 🎯 SPECIFIC DELIVERABLES FOR ROUND 2

### Enhanced Backend Features:

#### 1. A/B Testing Framework
- [ ] **Template Variant Management**: 5 invitation templates per relationship type
- [ ] **Random Assignment**: Statistically valid A/B test distribution
- [ ] **Performance Tracking**: Open rates, click rates, conversion by variant
- [ ] **Winner Selection**: Auto-promote best performing variants

#### 2. Super-Connector Algorithm
- [ ] **Network Analysis**: Identify users with >20 couple connections
- [ ] **Influence Scoring**: Weight by connection strength and conversion
- [ ] **Priority Routing**: Super-connector invitations get inbox priority
- [ ] **Reward Multipliers**: Enhanced rewards for high-influence users

#### 3. Advanced Viral Analytics
- [ ] **Generation Analysis**: Track viral chains through 5+ generations
- [ ] **Channel Performance**: Compare email vs WhatsApp vs SMS effectiveness
- [ ] **Timing Optimization**: Best invitation times by recipient type
- [ ] **Geographic Spread**: Track viral expansion across regions

#### 4. Referral Reward System
- [ ] **Reward Calculation**: Points, credits, feature unlocks
- [ ] **Fulfillment Tracking**: Ensure rewards are properly applied
- [ ] **Tier System**: Bronze, Silver, Gold, Platinum referrer levels
- [ ] **Expiration Management**: Time-limited rewards and cleanup

---

## 🔗 INTEGRATION REQUIREMENTS

### From Team A (Frontend):
- **Required**: Viral dashboard component interfaces
- **Usage**: Feed advanced metrics to dashboard widgets
- **Validation**: Ensure API responses match UI expectations

### From Team C (Integration):
- **Required**: Email template system for A/B testing
- **Usage**: Dynamic template selection based on variant
- **Performance**: Template rendering under 100ms

### To Team D (Marketing):
- **Provide**: Attribution data for marketing automation
- **Format**: Standardized attribution events
- **Real-time**: Stream attribution changes via webhooks

---

## 🔒 ENHANCED SECURITY REQUIREMENTS

### Advanced Security Measures:
- [ ] **Invitation Fraud Prevention**: Detect suspicious invitation patterns
- [ ] **Reward Fraud Detection**: Prevent gaming of referral rewards
- [ ] **Network Analysis Security**: Protect against data scraping
- [ ] **Performance DoS Protection**: Rate limit complex analytics queries

### Super-Connector Privacy:
```typescript
// MANDATORY: Protect super-connector data
const superConnectorSchema = z.object({
  // Never expose internal influence scores
  publicScore: z.number().min(1).max(100),
  // Aggregate network stats only
  connectionCount: z.number().min(0),
  // No personal connection details
  networkStrength: z.enum(['strong', 'moderate', 'growing'])
});

export const GET = withSecureValidation(
  z.object({ userId: z.string().uuid() }),
  async (request, { userId }) => {
    // Users can only access their own super-connector status
    const session = await getServerSession(authOptions);
    if (session.user.id !== userId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }
    
    const superConnectorData = await calculatePublicSuperConnectorData(userId);
    return NextResponse.json(superConnectorData);
  }
);
```

---

## 🎭 ADVANCED MCP SERVER USAGE

### PostgreSQL Optimization Queries:
```sql
-- Super-connector identification (OPTIMIZED):
CREATE INDEX CONCURRENTLY idx_network_connections_composite 
ON network_connections(supplier_id, connection_strength, wedding_date);

WITH connector_stats AS (
  SELECT 
    nc.supplier_id,
    COUNT(DISTINCT nc.couple_id) as couple_count,
    AVG(nc.connection_strength) as avg_strength,
    COUNT(DISTINCT CASE WHEN nc.created_at >= NOW() - INTERVAL '90 days' THEN nc.couple_id END) as recent_connections
  FROM network_connections nc
  WHERE nc.connection_strength >= 7
  GROUP BY nc.supplier_id
  HAVING COUNT(DISTINCT nc.couple_id) >= 20
),
viral_impact AS (
  SELECT 
    va.actor_id as supplier_id,
    COUNT(CASE WHEN va.status = 'accepted' THEN 1 END) as successful_invites,
    COUNT(*) as total_invites
  FROM viral_actions va
  WHERE va.actor_type = 'supplier' 
    AND va.created_at >= NOW() - INTERVAL '180 days'
  GROUP BY va.actor_id
)
SELECT 
  cs.supplier_id,
  cs.couple_count,
  cs.avg_strength,
  cs.recent_connections,
  COALESCE(vi.successful_invites, 0) as viral_successes,
  -- Super-connector score: network size × strength × viral success × recency
  ROUND(
    (cs.couple_count * cs.avg_strength * 
     (1 + COALESCE(vi.successful_invites, 0) * 0.1) * 
     (1 + cs.recent_connections * 0.05)), 2
  ) as super_connector_score
FROM connector_stats cs
LEFT JOIN viral_impact vi ON cs.supplier_id = vi.actor_id
WHERE cs.couple_count >= 20
ORDER BY super_connector_score DESC
LIMIT 100;
```

### Supabase Real-time Integration:
```typescript
// Stream viral events to connected clients
await mcp__supabase__execute_sql(`
  CREATE OR REPLACE FUNCTION notify_viral_event()
  RETURNS trigger AS $$
  BEGIN
    PERFORM pg_notify(
      'viral_events',
      json_build_object(
        'event_type', TG_OP,
        'actor_id', NEW.actor_id,
        'viral_coefficient_change', 
        CASE WHEN TG_OP = 'INSERT' THEN calculate_viral_impact(NEW.actor_id) ELSE 0 END
      )::text
    );
    RETURN NEW;
  END;
  $$ LANGUAGE plpgsql;

  CREATE TRIGGER viral_action_notify
    AFTER INSERT OR UPDATE ON viral_actions
    FOR EACH ROW EXECUTE FUNCTION notify_viral_event();
`);
```

---

## 💾 ADVANCED FEATURES IMPLEMENTATION

### A/B Testing Service:
```typescript
// src/lib/services/viral-ab-testing-service.ts
export class ViralABTestingService {
  static async selectInvitationVariant(
    relationship: 'past_client' | 'vendor' | 'friend',
    userId: string
  ): Promise<{ variant: string; template: string }> {
    // Get user's test assignment (sticky for consistency)
    const userSeed = this.getUserSeed(userId);
    
    // Get active variants for relationship type
    const variants = await this.getActiveVariants(relationship);
    
    // Statistical distribution: 40% control, 20% each for 3 variants
    const distribution = [40, 20, 20, 20];
    const selectedIndex = this.weightedRandom(distribution, userSeed);
    
    const selectedVariant = variants[selectedIndex];
    
    // Track assignment for analysis
    await this.trackVariantAssignment(userId, selectedVariant.id, relationship);
    
    return {
      variant: selectedVariant.id,
      template: selectedVariant.template
    };
  }
  
  static async analyzeVariantPerformance(): Promise<ABTestResults> {
    // Complex statistical analysis of variant performance
    const results = await mcp__postgres__query(`
      SELECT 
        template_variant,
        COUNT(*) as sent_count,
        COUNT(opened_at) as opened_count,
        COUNT(clicked_at) as clicked_count,
        COUNT(converted_at) as converted_count,
        ROUND(COUNT(opened_at)::decimal / COUNT(*) * 100, 2) as open_rate,
        ROUND(COUNT(clicked_at)::decimal / COUNT(*) * 100, 2) as click_rate,
        ROUND(COUNT(converted_at)::decimal / COUNT(*) * 100, 2) as conversion_rate
      FROM campaign_sends 
      WHERE created_at >= NOW() - INTERVAL '30 days'
        AND template_variant IS NOT NULL
      GROUP BY template_variant
      ORDER BY conversion_rate DESC
    `);
    
    return this.performStatisticalAnalysis(results);
  }
}
```

---

## 🏁 ROUND 2 ACCEPTANCE CRITERIA & EVIDENCE

### Performance Enhancements:
- [ ] **Super-connector queries** - Complex network analysis under 1s
- [ ] **A/B test selection** - Variant selection under 50ms
- [ ] **Viral coefficient calculation** - 30-day analysis under 200ms
- [ ] **Real-time events** - Attribution updates streamed instantly

### Advanced Features Evidence:
```typescript
// Show A/B testing implementation:
// File: src/lib/services/viral-ab-testing-service.ts:45-67
const variantResult = await ViralABTestingService.selectInvitationVariant(
  'past_client', 
  userId
);
// Serena confirmed: Statistical distribution matches requirement
// Performance: Variant selection averages 23ms
```

### Integration Evidence:
- [ ] **Team A Dashboard** - Advanced metrics feeding to viral dashboard
- [ ] **Team C Templates** - A/B variant templates rendering correctly  
- [ ] **Team D Attribution** - Marketing automation receiving viral events
- [ ] **Performance Metrics** - All endpoints under target response times

---

## 💾 WHERE TO SAVE YOUR WORK

### Enhanced Code Files:
- Advanced APIs: `/wedsync/src/app/api/viral/ab-testing/`, `/api/viral/super-connectors/`
- Services: `/wedsync/src/lib/services/viral-ab-testing-service.ts`
- Services: `/wedsync/src/lib/services/super-connector-service.ts`
- Database Functions: Update migration with advanced queries
- Tests: `/wedsync/src/__tests__/integration/viral-advanced.test.ts`

### Team Report:
- **Output to:** `/WORKFLOW-V2-DRAFT/OUTBOX/team-b/batch11/WS-141-round-2-complete.md`

---

END OF ROUND 2 PROMPT - EXECUTE IMMEDIATELY