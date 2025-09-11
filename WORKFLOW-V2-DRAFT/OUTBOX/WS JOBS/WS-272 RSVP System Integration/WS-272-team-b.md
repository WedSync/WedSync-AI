# TEAM B - ROUND 1: WS-272 - RSVP System Integration
## 2025-01-20 - Development Round 1

**YOUR MISSION:** Build comprehensive backend API and database systems for RSVP management including guest matching algorithms, real-time synchronization, supplier notifications, and analytics processing
**FEATURE ID:** WS-272 (Track all work with this ID)
**TIME LIMIT:** 2-3 hours per round  
**THINK ULTRA HARD** about intelligent guest matching, real-time data synchronization, supplier integration workflows, and wedding-specific business logic

## 🚨 CRITICAL: EVIDENCE OF REALITY REQUIREMENTS (NON-NEGOTIABLE)

**⚠️ MANDATORY: Before claiming completion, you MUST provide:**

1. **FILE EXISTENCE PROOF:**
```bash
ls -la $WS_ROOT/wedsync/src/app/api/rsvp/
cat $WS_ROOT/wedsync/src/app/api/rsvp/responses/route.ts | head -20
cat $WS_ROOT/wedsync/src/lib/rsvp/RSVPService.ts | head -20
```

2. **TYPECHECK RESULTS:**
```bash
npm run typecheck
# MUST show: "No errors found"
```

3. **TEST RESULTS:**
```bash
npm test rsvp-backend
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

// Query existing API patterns and database services
await mcp__serena__search_for_pattern("api.*route|service.*class|database.*operation");
await mcp__serena__find_symbol("GuestService", "", true);
await mcp__serena__get_symbols_overview("src/app/api");
await mcp__serena__get_symbols_overview("src/lib");
```

### B. DATABASE & API PATTERNS (MANDATORY FOR BACKEND)
```typescript
// CRITICAL: Load existing database and API patterns
await mcp__serena__search_for_pattern("supabase.*client|database.*query|api.*handler");
await mcp__serena__find_symbol("DatabaseService", "", true);
await mcp__serena__search_for_pattern("notification.*service|email.*service");
```

### C. REF MCP CURRENT DOCS (MINUTES 3-5)
```typescript
// Load documentation for backend services and database operations
await mcp__Ref__ref_search_documentation("Next.js 15 API routes server actions");
await mcp__Ref__ref_search_documentation("Supabase real-time subscriptions PostgreSQL");
await mcp__Ref__ref_search_documentation("PostgreSQL JSONB queries indexing performance");
await mcp__Ref__ref_search_documentation("Node.js string matching algorithms fuzzy search");
```

## 🧠 STEP 2A: SEQUENTIAL THINKING FOR COMPLEX RSVP BACKEND SYSTEM

### Use Sequential Thinking MCP for Complex RSVP Backend Analysis
```typescript
// Use for complex RSVP backend architecture decisions
mcp__sequential-thinking__sequentialthinking({
  thought: "This RSVP backend system requires sophisticated data processing: 1) Intelligent guest matching algorithm for fuzzy name matching when guests RSVP, 2) Real-time synchronization of RSVP responses across multiple clients using Supabase realtime, 3) Automated supplier notification system for headcount changes, 4) Complex analytics processing for response rates and dietary requirements, 5) Secure public API endpoints for wedding website RSVP forms. The main challenges are: Accurate guest matching with variations in names, real-time data consistency across concurrent responses, supplier notification triggering and batching, analytics calculation performance with large guest lists, and rate limiting for public endpoints. I need to ensure data integrity, fast response times, reliable notifications, and wedding-specific business logic.",
  nextThoughtNeeded: true,
  thoughtNumber: 1,
  totalThoughts: 6
});
```

## 🚀 STEP 2B: LAUNCH ENHANCED AGENTS WITH SPECIFIC MISSIONS

Launch these agents with comprehensive requirements:

1. **task-tracker-coordinator** - Break down RSVP backend services, track database dependencies
2. **nextjs-fullstack-developer** - Use Serena for Next.js 15 API patterns and server actions  
3. **postgresql-database-expert** - Database schema optimization and query performance
4. **security-compliance-officer** - API security, rate limiting, and data protection
5. **test-automation-architect** - Comprehensive backend testing with edge cases
6. **documentation-chronicler** - Evidence-based API documentation with endpoint testing

## 🔒 SECURITY REQUIREMENTS FOR RSVP BACKEND (NON-NEGOTIABLE!)

### RSVP API SECURITY CHECKLIST:
- [ ] **Public API Rate Limiting** - Protect RSVP endpoints from spam and abuse
- [ ] **Input Validation** - Sanitize all guest names, emails, and text inputs
- [ ] **SQL Injection Prevention** - Parameterized queries for all database operations
- [ ] **Authentication Verification** - Verify couple authentication for dashboard APIs
- [ ] **Guest Token Security** - Secure guest lookup tokens with expiration
- [ ] **Data Sanitization** - Clean all user inputs before database storage
- [ ] **CORS Configuration** - Proper CORS for wedding website domains
- [ ] **Error Message Security** - No sensitive data leakage in error responses
- [ ] **Database Access Control** - Row-level security for multi-tenant data
- [ ] **Supplier Data Protection** - Secure headcount sharing with proper permissions

### Wedding-Specific Backend Security:
- [ ] **Guest Privacy Protection** - Encrypt sensitive guest information
- [ ] **Response Data Integrity** - Prevent RSVP response tampering
- [ ] **Supplier Authorization** - Verify supplier access to couple data
- [ ] **Wedding Day Isolation** - Ensure data integrity during high-traffic periods

## 🧭 WEDDING DATABASE REQUIREMENTS (MANDATORY FOR WEDDING FEATURES)

**❌ FORBIDDEN: Creating generic event management APIs without wedding context**
**✅ MANDATORY: RSVP backend must integrate seamlessly with wedding coordination workflow**

### WEDDING DATABASE INTEGRATION CHECKLIST
- [ ] RSVP responses linked to existing guest management system
- [ ] Meal preferences connected to catering supplier workflows
- [ ] Dietary requirements formatted for vendor planning systems
- [ ] Headcount updates trigger venue capacity validation
- [ ] Response analytics calculated for wedding timeline planning
- [ ] Guest communication integrated with wedding notification system

## 🎯 TEAM B SPECIALIZATION: BACKEND/API FOCUS

**BACKEND/API FOCUS:**
- Database schema design and optimization for RSVP data
- API endpoint development for couple dashboard and public forms
- Real-time synchronization using Supabase channels
- Intelligent guest matching algorithms and fuzzy search
- Supplier notification system and headcount processing
- Analytics calculation and caching for performance

### RSVP-Specific Backend Requirements:
- **Guest Matching Service**: Fuzzy name matching with multiple strategies
- **Real-time Sync**: Supabase realtime for live RSVP updates
- **Supplier Integration**: Automated notifications for headcount changes
- **Analytics Processing**: Fast calculation of response metrics
- **Public API Security**: Rate limiting and validation for wedding websites
- **Data Integrity**: Atomic operations for concurrent RSVP submissions

## 📋 TECHNICAL SPECIFICATION ANALYSIS

### Core RSVP Backend Services to Build:

1. **RSVPService**:
   - Guest matching and RSVP submission processing
   - Real-time response synchronization
   - Analytics calculation and caching

2. **GuestMatchingService**:
   - Intelligent name matching algorithms
   - Fuzzy search with multiple strategies
   - Confidence scoring for matches

3. **SupplierNotificationService**:
   - Automated headcount change notifications
   - Dietary requirement processing
   - Vendor-specific data formatting

4. **RSVPAnalyticsService**:
   - Response rate calculations
   - Meal preference aggregation
   - Timeline analysis and projections

5. **PublicRSVPHandler**:
   - Secure public API endpoints
   - Rate limiting and validation
   - Guest lookup and form processing

## 🎯 SPECIFIC DELIVERABLES FOR ROUND 1

### PRIMARY BACKEND SERVICES (MUST COMPLETE):
- [ ] **RSVPService.ts** - Core RSVP processing and guest matching logic
- [ ] **GuestMatchingService.ts** - Intelligent fuzzy name matching algorithms
- [ ] **SupplierNotificationService.ts** - Automated vendor notifications
- [ ] **RSVPAnalyticsService.ts** - Real-time analytics calculation

### API ENDPOINTS:
- [ ] **/api/rsvp/responses/route.ts** - RSVP response management
- [ ] **/api/rsvp/analytics/route.ts** - Analytics dashboard data
- [ ] **/api/public/rsvp/[websiteId]/submit/route.ts** - Public RSVP submission
- [ ] **/api/public/rsvp/[websiteId]/lookup/route.ts** - Guest lookup endpoint

### DATABASE OPERATIONS:
- [ ] **rsvp-database-operations.ts** - Database queries and mutations
- [ ] **guest-matching-queries.ts** - Guest lookup and matching queries
- [ ] **analytics-aggregation.ts** - Analytics calculation queries
- [ ] **supplier-notification-data.ts** - Vendor notification data processing

### REAL-TIME FEATURES:
- [ ] **rsvp-realtime-service.ts** - Supabase realtime integration
- [ ] **response-synchronization.ts** - Live response updates
- [ ] **supplier-live-notifications.ts** - Real-time vendor alerts
- [ ] **analytics-live-updates.ts** - Live dashboard metrics

### MIGRATION & SCHEMA:
- [ ] Create comprehensive database migration for RSVP tables
- [ ] Implement proper indexes for performance optimization
- [ ] Set up Row-Level Security policies for multi-tenant data
- [ ] Configure database triggers for automated notifications

## 🧪 TESTING REQUIREMENTS FOR RSVP BACKEND

### Service Tests (Required):
```typescript
// RSVPService.test.ts
describe('RSVPService', () => {
  describe('guest matching', () => {
    it('should match exact guest names correctly', async () => {
      const testGuest = await createTestGuest({
        name: 'Jennifer Smith',
        email: 'jennifer@example.com',
        couple_id: testCoupleId
      });

      const match = await rsvpService.matchGuestByNameAndEmail(
        testCoupleId,
        'Jennifer Smith',
        'jennifer@example.com'
      );

      expect(match).toBeDefined();
      expect(match.id).toBe(testGuest.id);
      expect(match.email).toBe('jennifer@example.com');
    });

    it('should handle fuzzy name matching', async () => {
      await createTestGuest({
        name: 'Jennifer Marie Smith',
        email: 'jenny@example.com',
        couple_id: testCoupleId
      });

      const match = await rsvpService.matchGuestByNameAndEmail(
        testCoupleId,
        'Jenny Smith' // Nickname and abbreviated name
      );

      expect(match).toBeDefined();
      expect(match.name).toBe('Jennifer Marie Smith');
    });

    it('should reject low-confidence matches', async () => {
      await createTestGuest({
        name: 'Jennifer Smith',
        couple_id: testCoupleId
      });

      const match = await rsvpService.matchGuestByNameAndEmail(
        testCoupleId,
        'Robert Johnson' // Completely different name
      );

      expect(match).toBeNull();
    });
  });

  describe('RSVP submission', () => {
    it('should process valid RSVP submission', async () => {
      const submissionData = {
        guest_name: 'Test Guest',
        guest_email: 'test@example.com',
        attending_status: 'yes',
        guest_count: 2,
        meal_choice: 'vegetarian',
        dietary_requirements: 'gluten-free, nut allergy',
        message_to_couple: 'So excited for your wedding!'
      };

      const result = await rsvpService.submitPublicRSVP(
        testWebsiteId,
        submissionData
      );

      expect(result.success).toBe(true);
      expect(result.rsvpId).toBeDefined();

      // Verify database record
      const rsvpRecord = await getRSVPById(result.rsvpId);
      expect(rsvpRecord.attending_status).toBe('yes');
      expect(rsvpRecord.guest_count).toBe(2);
      expect(rsvpRecord.dietary_requirements).toEqual(['gluten-free', 'nut allergy']);
    });

    it('should handle duplicate RSVP submissions', async () => {
      const guest = await createTestGuest({ couple_id: testCoupleId });
      
      // First submission
      await rsvpService.submitPublicRSVP(testWebsiteId, {
        guest_name: guest.name,
        attending_status: 'yes'
      });

      // Second submission - should update, not duplicate
      const result = await rsvpService.submitPublicRSVP(testWebsiteId, {
        guest_name: guest.name,
        attending_status: 'no'
      });

      expect(result.success).toBe(true);

      // Check only one RSVP record exists
      const rsvpRecords = await getRSVPsByGuest(guest.id);
      expect(rsvpRecords).toHaveLength(1);
      expect(rsvpRecords[0].attending_status).toBe('no');
    });
  });
});

// GuestMatchingService.test.ts
describe('GuestMatchingService', () => {
  it('should calculate accurate name match scores', () => {
    const matcher = new GuestMatchingService();

    // Exact match
    expect(matcher.calculateNameMatchScore('John Smith', 'John Smith'))
      .toBeCloseTo(1.0);

    // Partial match
    expect(matcher.calculateNameMatchScore('John', 'John Smith'))
      .toBeGreaterThan(0.8);

    // Nickname match
    expect(matcher.calculateNameMatchScore('Jenny Smith', 'Jennifer Smith'))
      .toBeGreaterThan(0.7);

    // No match
    expect(matcher.calculateNameMatchScore('John Smith', 'Mary Johnson'))
      .toBeLessThan(0.3);
  });

  it('should handle various name formats', async () => {
    const testCases = [
      { input: 'john smith', existing: 'John Smith', expectedMatch: true },
      { input: 'J. Smith', existing: 'John Smith', expectedMatch: true },
      { input: 'Johnny Smith', existing: 'John Smith', expectedMatch: true },
      { input: 'John B. Smith', existing: 'John Smith', expectedMatch: true },
      { input: 'Smith, John', existing: 'John Smith', expectedMatch: true }
    ];

    for (const testCase of testCases) {
      const match = await guestMatchingService.matchGuestByNameAndEmail(
        testCoupleId,
        testCase.input
      );

      if (testCase.expectedMatch) {
        expect(match).toBeDefined();
      } else {
        expect(match).toBeNull();
      }
    }
  });
});
```

### API Endpoint Tests:
```typescript
// API endpoint testing
describe('/api/rsvp/responses', () => {
  it('should return RSVP responses for authenticated couple', async () => {
    const session = await createAuthenticatedSession(testCouple);

    const response = await fetch('/api/rsvp/responses', {
      headers: { 'Authorization': `Bearer ${session.access_token}` }
    });

    expect(response.ok).toBe(true);
    
    const data = await response.json();
    expect(data.responses).toBeDefined();
    expect(Array.isArray(data.responses)).toBe(true);
  });

  it('should reject unauthenticated requests', async () => {
    const response = await fetch('/api/rsvp/responses');
    
    expect(response.status).toBe(401);
  });

  it('should handle RSVP response updates', async () => {
    const session = await createAuthenticatedSession(testCouple);
    const rsvpResponse = await createTestRSVPResponse();

    const updateData = {
      attending_status: 'no',
      special_notes: 'Unfortunately cannot attend'
    };

    const response = await fetch(`/api/rsvp/responses/${rsvpResponse.id}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(updateData)
    });

    expect(response.ok).toBe(true);

    const updated = await response.json();
    expect(updated.attending_status).toBe('no');
    expect(updated.special_notes).toBe('Unfortunately cannot attend');
  });
});

// Public API testing
describe('/api/public/rsvp/[websiteId]/submit', () => {
  it('should accept valid public RSVP submission', async () => {
    const submissionData = {
      guest_name: 'Public Test Guest',
      guest_email: 'public@example.com',
      attending_status: 'yes',
      guest_count: 1
    };

    const response = await fetch(`/api/public/rsvp/${testWebsiteId}/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(submissionData)
    });

    expect(response.ok).toBe(true);

    const result = await response.json();
    expect(result.success).toBe(true);
    expect(result.rsvpId).toBeDefined();
  });

  it('should enforce rate limiting', async () => {
    // Send multiple requests rapidly
    const requests = Array.from({ length: 6 }, () =>
      fetch(`/api/public/rsvp/${testWebsiteId}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          guest_name: 'Rate Limit Test',
          attending_status: 'yes'
        })
      })
    );

    const responses = await Promise.all(requests);
    
    // Some requests should be rate limited
    const rateLimitedResponses = responses.filter(r => r.status === 429);
    expect(rateLimitedResponses.length).toBeGreaterThan(0);
  });

  it('should validate required fields', async () => {
    const response = await fetch(`/api/public/rsvp/${testWebsiteId}/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        guest_name: 'Test Guest'
        // Missing attending_status
      })
    });

    expect(response.status).toBe(400);

    const error = await response.json();
    expect(error.message).toContain('attending_status is required');
  });
});
```

### Analytics & Performance Tests:
```typescript
// Analytics calculation testing
describe('RSVPAnalyticsService', () => {
  it('should calculate response metrics accurately', async () => {
    // Create test scenario
    const responses = await createTestRSVPResponses([
      { attending_status: 'yes', guest_count: 2 },
      { attending_status: 'yes', guest_count: 1 },
      { attending_status: 'no', guest_count: 1 },
      { attending_status: 'maybe', guest_count: 1 }
    ]);

    const analytics = await analyticsService.calculateRSVPAnalytics(testCoupleId);

    expect(analytics.total_responded).toBe(4);
    expect(analytics.attending_count).toBe(3); // 2 + 1 = 3 guests attending
    expect(analytics.declined_count).toBe(1);
    expect(analytics.maybe_count).toBe(1);
    expect(analytics.response_rate).toBe(80); // 4 out of 5 invited
  });

  it('should aggregate dietary requirements correctly', async () => {
    await createTestRSVPResponses([
      { dietary_requirements: ['vegetarian', 'gluten-free'] },
      { dietary_requirements: ['vegetarian'] },
      { dietary_requirements: ['nut allergy'] },
      { dietary_requirements: [] }
    ]);

    const analytics = await analyticsService.calculateRSVPAnalytics(testCoupleId);

    expect(analytics.dietary_summary).toEqual([
      { requirement: 'vegetarian', count: 2 },
      { requirement: 'gluten-free', count: 1 },
      { requirement: 'nut allergy', count: 1 }
    ]);
  });

  it('should handle performance with large guest lists', async () => {
    // Create large number of test responses
    const responses = Array.from({ length: 1000 }, (_, i) => ({
      guest_name: `Guest ${i}`,
      attending_status: i % 3 === 0 ? 'yes' : 'no',
      meal_choice: ['chicken', 'beef', 'vegetarian'][i % 3]
    }));

    await createTestRSVPResponses(responses);

    const startTime = Date.now();
    const analytics = await analyticsService.calculateRSVPAnalytics(testCoupleId);
    const endTime = Date.now();

    // Should complete within 3 seconds for 1000 responses
    expect(endTime - startTime).toBeLessThan(3000);
    expect(analytics.total_responded).toBe(1000);
  });
});
```

## 💾 WHERE TO SAVE YOUR WORK

### RSVP Backend Structure:
```
$WS_ROOT/wedsync/src/lib/rsvp/
├── RSVPService.ts                      # Core RSVP processing service
├── GuestMatchingService.ts             # Intelligent guest matching
├── SupplierNotificationService.ts      # Vendor notification system
├── RSVPAnalyticsService.ts             # Analytics calculation
├── RSVPRealtimeService.ts              # Real-time synchronization
├── PublicRSVPHandler.ts                # Public API processing
├── rsvp-database-operations.ts        # Database queries
├── guest-matching-algorithms.ts       # Fuzzy matching logic
└── rsvp-validation.ts                  # Input validation schemas
```

### API Routes:
```
$WS_ROOT/wedsync/src/app/api/rsvp/
├── responses/
│   ├── route.ts                        # RSVP response management
│   └── [id]/route.ts                   # Individual response operations
├── analytics/
│   ├── route.ts                        # Analytics dashboard data
│   └── export/route.ts                 # Export functionality
├── reminders/
│   ├── route.ts                        # Reminder management
│   └── send/route.ts                   # Send reminder operations
└── config/
    ├── route.ts                        # RSVP configuration
    └── test/route.ts                   # Configuration testing
```

### Public APIs:
```
$WS_ROOT/wedsync/src/app/api/public/rsvp/
├── [websiteId]/
│   ├── lookup/route.ts                 # Guest lookup endpoint
│   ├── submit/route.ts                 # RSVP submission
│   ├── config/route.ts                 # Form configuration
│   └── resend/route.ts                 # Resend confirmation
└── qr/
    ├── [token]/route.ts                # QR code RSVP access
    └── [token]/submit/route.ts         # QR code submission
```

### Database Migrations:
```
$WS_ROOT/wedsync/supabase/migrations/
└── [timestamp]_rsvp_system_integration.sql    # Complete RSVP schema
```

## 🏁 COMPLETION CHECKLIST

### MANDATORY BACKEND REQUIREMENTS:
- [ ] RSVP service processes guest responses with intelligent name matching
- [ ] Guest matching algorithm achieves 95%+ accuracy for exact names
- [ ] Real-time synchronization using Supabase channels for live updates
- [ ] Supplier notification system automatically sends headcount updates
- [ ] Public API endpoints secured with rate limiting and validation
- [ ] Analytics service calculates response metrics in under 3 seconds
- [ ] Database operations use parameterized queries preventing SQL injection
- [ ] Row-level security policies protect multi-tenant RSVP data
- [ ] Error handling provides clear messages without data leakage
- [ ] TypeScript compilation successful with no 'any' types

### WEDDING CONTEXT VALIDATION:
- [ ] RSVP processing specifically designed for wedding guest management
- [ ] Guest matching handles wedding invitation name variations
- [ ] Meal preferences structured for wedding catering coordination
- [ ] Dietary requirements formatted for vendor planning workflows
- [ ] Analytics calculations focus on wedding planning insights
- [ ] Supplier notifications designed for wedding vendor coordination

### PERFORMANCE & RELIABILITY:
- [ ] Guest lookup responses within 500ms for 1000+ guest databases
- [ ] RSVP submission processing completes within 2 seconds
- [ ] Analytics calculations handle 500+ guest responses efficiently
- [ ] Real-time updates propagate within 1 second across clients
- [ ] Database queries optimized with proper indexing strategies
- [ ] Concurrent RSVP submissions handled without data corruption

### EVIDENCE PACKAGE:
- [ ] Backend service testing results showing 95%+ code coverage
- [ ] Guest matching accuracy testing with various name variations
- [ ] API endpoint testing covering all success and error scenarios
- [ ] Performance testing results for large guest lists
- [ ] Real-time functionality demonstration with live updates
- [ ] Security testing results showing proper validation and rate limiting
- [ ] Database migration testing with schema validation

---

**EXECUTE IMMEDIATELY - This is a comprehensive prompt with all RSVP backend requirements!**

**SUCCESS CRITERIA:** You will have created a complete RSVP backend system that intelligently matches wedding guests by name, processes responses in real-time with proper validation, automatically notifies suppliers of headcount changes, calculates comprehensive analytics for wedding planning, and provides secure public APIs for wedding websites - all while maintaining data integrity and optimal performance for wedding coordination workflows.