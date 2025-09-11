# TEAM C - ROUND 1: WS-154 - Seating Arrangements - Integration & Conflict Management

**Date:** 2025-08-25  
**Feature ID:** WS-154 (Track all work with this ID)
**Priority:** P1 - Guest Management Core Feature  
**Mission:** Build relationship conflict detection service and integrate seating with guest management  
**Context:** You are Team C working in parallel with 4 other teams. ALL must complete before next round.

---

## 🎯 USER STORY & WEDDING CONTEXT (CRITICAL - THINK HARD)

**As a:** Wedding couple managing complex family relationships
**I want to:** Receive intelligent warnings about potential seating conflicts before finalizing arrangements
**So that:** I avoid awkward situations and ensure a harmonious reception atmosphere

**Real Wedding Problem This Solves:**
Couples often forget complex family dynamics like "Aunt Sarah and Uncle Tom divorced badly" or "These college friends had a falling out." This system maintains relationship intelligence and prevents social disasters before they happen.

---

## 🎯 TECHNICAL REQUIREMENTS

**From Technical Specification:**
- Relationship conflict detection and warning system
- Integration layer between guest management and seating systems
- Real-time validation of seating assignments
- Relationship data management and privacy controls

**Technology Stack (VERIFIED):**
- Integration: Next.js 15 middleware and API integration
- Database: PostgreSQL via MCP Server (✅ CONNECTED)
- Real-time: Supabase realtime subscriptions
- Testing: Integration testing with Playwright
- Validation: Zod schemas for relationship data

**Integration Points:**
- Guest Management System: Pull relationship data and guest profiles
- Seating Optimization: Validate Team B's algorithm results
- Frontend UI: Provide real-time conflict warnings to Team A

---

## 📚 STEP 1: LOAD CURRENT DOCUMENTATION (MANDATORY FIRST STEP!)

```typescript
// 1. CONTEXT7 MCP - Load integration patterns:
await mcp__context7__resolve_library_id("next.js");
await mcp__context7__get_library_docs("/vercel/next.js", "middleware integration", 5000);
await mcp__context7__get_library_docs("/supabase/supabase", "realtime-subscriptions", 3000);
await mcp__context7__get_library_docs("/supabase/supabase", "row-level-security", 4000);
await mcp__context7__get_library_docs("/typescript/typescript", "integration-patterns", 2000);

// 2. SERENA MCP - Initialize codebase:
await mcp__serena__activate_project("/Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync");
await mcp__serena__switch_modes(["editing", "interactive"]);
await mcp__serena__check_onboarding_performed();

// 3. REVIEW existing integration patterns:
await mcp__serena__find_symbol("integrationService", "", true);
await mcp__serena__get_symbols_overview("src/lib/services");
```

---

## 🚀 STEP 2: LAUNCH PARALLEL AGENTS

1. **task-tracker-coordinator** --integration-focus --conflict-detection
2. **integration-specialist** --service-orchestration --data-validation
3. **supabase-specialist** --realtime-integration --row-level-security
4. **security-compliance-officer** --relationship-privacy --data-access-control
5. **test-automation-architect** --integration-testing --conflict-validation
6. **performance-optimization-expert** --realtime-optimization --caching-strategy

---

## 📋 STEP 3: ROUND 1 DELIVERABLES (Core Implementation)

### **CONFLICT DETECTION SERVICE:**
- [ ] **RelationshipConflictValidator** - Core service for detecting seating conflicts
- [ ] **ConflictSeverityScorer** - Rate conflicts by severity (incompatible > avoid > prefer_apart)
- [ ] **ConflictResolutionSuggester** - Suggest alternative arrangements
- [ ] **RealTimeConflictMonitor** - Live validation during seating assignment
- [ ] **ConflictHistoryTracker** - Log and learn from past conflict resolutions

### **INTEGRATION LAYER:**
- [ ] **GuestSeatingBridge** - Connect guest data to seating system
- [ ] **RelationshipDataSync** - Keep relationship data synchronized
- [ ] **SeatingValidationMiddleware** - Validate all seating operations
- [ ] **ConflictNotificationService** - Real-time warnings to frontend
- [ ] **DataConsistencyValidator** - Ensure data integrity across systems

### **RELATIONSHIP MANAGEMENT:**
- [ ] **RelationshipCRUD** - Create, read, update, delete guest relationships
- [ ] **RelationshipTypeManager** - Manage relationship categories and rules
- [ ] **BulkRelationshipProcessor** - Handle family group relationships efficiently
- [ ] **RelationshipPrivacyController** - Control access to sensitive relationship data

---

## 🔗 DEPENDENCIES

### What you NEED from other teams:
- FROM Team B: Optimization algorithm API and conflict detection logic
- FROM Team E: Database schema for relationships and validation rules
- FROM Team A: Frontend component interfaces for conflict warnings

### What other teams NEED from you:
- TO Team A: Real-time conflict warning API and WebSocket integration
- TO Team B: Conflict validation service for optimization algorithm
- TO Team D: Mobile-optimized conflict detection for WedMe platform

---

## 🔒 SECURITY REQUIREMENTS (MANDATORY)

```typescript
// REQUIRED: Secure relationship data handling
import { withSecureValidation } from '@/lib/validation/middleware';
import { relationshipSchema } from '@/lib/validation/schemas';

export class RelationshipConflictValidator {
  async validateSeatingConflict(coupleId: string, guestIds: string[]): Promise<ConflictResult> {
    // CRITICAL: Verify couple owns all guest data being accessed
    await this.verifyCoupleGuestOwnership(coupleId, guestIds);
    
    // GDPR: Only access relationship data with proper consent
    const relationships = await this.getAuthorizedRelationships(coupleId, guestIds);
    
    return this.analyzeConflicts(relationships);
  }
  
  private async verifyCoupleGuestOwnership(coupleId: string, guestIds: string[]): Promise<void> {
    // Prevent unauthorized access to guest relationship data
  }
}
```

**Security Checklist:**
- [ ] Implement Row Level Security for all relationship queries
- [ ] Validate couple ownership before accessing any relationship data
- [ ] Encrypt sensitive relationship notes and conflict reasons
- [ ] Implement audit logging for relationship data access
- [ ] Rate limit conflict detection API to prevent abuse

---

## 🔄 REAL-TIME INTEGRATION REQUIREMENTS

```typescript
// REQUIRED: Supabase Realtime for live conflict detection
export class RealTimeConflictService {
  async initializeConflictMonitoring(coupleId: string): Promise<void> {
    const supabase = createClient();
    
    // Subscribe to seating assignment changes
    supabase
      .channel(`seating-conflicts-${coupleId}`)
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'seating_assignments',
          filter: `couple_id=eq.${coupleId}` 
        },
        async (payload) => {
          // Real-time conflict validation
          const conflicts = await this.validateAssignment(payload.new);
          if (conflicts.length > 0) {
            // Broadcast conflicts to frontend
            await this.broadcastConflicts(coupleId, conflicts);
          }
        }
      )
      .subscribe();
  }
}
```

---

## 🧪 INTEGRATION TESTING REQUIREMENTS

```typescript
// INTEGRATION TESTING - Test cross-team functionality
describe('Seating Conflict Integration', () => {
  test('detects conflicts in real-time during assignment', async () => {
    // Setup test data with known conflict
    const guestA = await createTestGuest('Uncle Bob');
    const guestB = await createTestGuest('Cousin Jim');
    await createRelationship(guestA.id, guestB.id, 'incompatible');
    
    // Simulate seating assignment
    const conflictResult = await assignGuestsToTable([guestA.id, guestB.id], 'table-1');
    
    expect(conflictResult.conflicts).toHaveLength(1);
    expect(conflictResult.conflicts[0].severity).toBe('incompatible');
  });

  test('suggests alternative seating when conflicts detected', async () => {
    const conflictData = await generateConflictScenario();
    const suggestions = await getConflictResolutionSuggestions(conflictData);
    
    expect(suggestions).toHaveProperty('alternativeArrangements');
    expect(suggestions.alternativeArrangements.length).toBeGreaterThan(0);
  });
});
```

---

## ✅ SUCCESS CRITERIA (Round 1)

**You CANNOT claim completion unless:**
- [ ] ConflictDetection service catching 100% of incompatible relationships
- [ ] Real-time conflict warnings working within 500ms
- [ ] Integration layer connecting all seating and guest systems
- [ ] Relationship data properly secured with RLS policies
- [ ] Unit tests written FIRST and passing (>85% coverage)
- [ ] Integration tests validating cross-team functionality
- [ ] Zero TypeScript errors in integration services
- [ ] Performance benchmarks for real-time conflict detection
- [ ] Security audit passed for relationship data access

---

## 💾 WHERE TO SAVE YOUR WORK

### Code Files:
- Integration: `/wedsync/src/lib/services/seating-integration.ts`
- Conflicts: `/wedsync/src/lib/services/conflict-detection.ts`
- Realtime: `/wedsync/src/lib/realtime/seating-subscriptions.ts`
- Validation: `/wedsync/src/lib/validation/seating-validation.ts`
- Tests: `/wedsync/tests/seating/integration/`

### CRITICAL - Team Output:
**Save to:** `/WORKFLOW-V2-DRAFT/OUTBOX/team-c/batch15/WS-154-team-c-round-1-complete.md`

---

## ⚠️ CRITICAL WARNINGS
- Do NOT implement frontend components (Team A's responsibility)
- Do NOT create optimization algorithms (Team B's responsibility)
- Do NOT modify database schemas directly (Team E handles this)
- REMEMBER: You are the integration bridge between all teams
- PRIVACY: Relationship data is highly sensitive - implement strict access controls

---

END OF ROUND 1 PROMPT - EXECUTE IMMEDIATELY