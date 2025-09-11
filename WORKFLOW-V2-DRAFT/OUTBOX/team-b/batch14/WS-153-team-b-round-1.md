# TEAM B - ROUND 1: WS-153 - Photo Groups Management - Backend API & Business Logic

**Date:** 2025-08-25  
**Feature ID:** WS-153 (Track all work with this ID)  
**Priority:** P1 from roadmap  
**Mission:** Build backend API endpoints and business logic for photo group management system  
**Context:** You are Team B working in parallel with 4 other teams. ALL must complete before next round.

---

## 🎯 USER STORY & WEDDING CONTEXT (CRITICAL - THINK HARD)

**As a:** Wedding couple organizing photo sessions
**I want to:** Create photo groups from my guest list for efficient photography organization
**So that:** My photographer can efficiently capture all desired group combinations without confusion

**Real Wedding Problem This Solves:**
A couple currently creates handwritten lists like "Family photos: Mom's side, Dad's side, siblings only" leading to missed shots. With this feature, they create groups like "Smith Family (8 people): John Sr., Mary, John Jr., Sarah..." with automatic conflict detection if someone is in overlapping photos scheduled simultaneously.

---

## 🎯 TECHNICAL REQUIREMENTS

**From Technical Specification:**
- API endpoints for CRUD operations on photo groups
- Guest-to-group assignment logic
- Conflict detection algorithms (scheduling overlaps)
- Integration with existing guest management (WS-151)
- Photo group validation and business rules
- Real-time updates for group changes

**Technology Stack (VERIFIED):**
- Frontend: Next.js 15 App Router, React 19, Tailwind CSS v4
- Database: PostgreSQL via MCP Server (✅ CONNECTED - Direct Supabase access available)
- Backend: Supabase (PostgreSQL 15), Edge Functions
- Testing: Playwright MCP, Vitest
- API: Next.js App Router API routes

**Integration Points:**
- **Existing Guest System**: Connects to WS-151 guest management
- **Database**: Uses photo_groups and photo_group_members tables
- **Team Dependencies**: UI components from Team A, Database schema from Team C

---

## 📚 STEP 1: LOAD CURRENT DOCUMENTATION (MANDATORY FIRST STEP!)

**⚠️ CRITICAL: Complete this BEFORE any coding or agent work begins!**

```typescript
// 1. LOAD CORRECT UI STYLE GUIDE (MANDATORY FOR ALL UI WORK):
// For ALL OTHER UI features (General SaaS components):
await mcp__serena__read_file("/WORKFLOW-V2-DRAFT/SAAS-UI-STYLE-GUIDE.md");

// 2. CONTEXT7 MCP - Load latest docs for THIS SPECIFIC TASK:
await mcp__context7__resolve-library-id("next.js");  // Get correct library ID first
await mcp__context7__get-library-docs("/vercel/next.js", "app-router api-routes server-actions", 5000);
await mcp__context7__get-library-docs("/supabase/supabase", "database edge-functions rls", 3000);
await mcp__context7__get-library-docs("/supabase/supabase", "realtime subscriptions", 2000);

// 2. SERENA MCP - Initialize codebase intelligence:
await mcp__serena__activate_project("/Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync");
await mcp__serena__switch_modes(["editing", "interactive"]);
await mcp__serena__check_onboarding_performed();

// 3. REVIEW existing patterns before creating new ones:
await mcp__serena__find_symbol("route", "src/app/api", true);
await mcp__serena__get_symbols_overview("src/app/api/guests");
```

**WHY THIS ORDER MATTERS:**
- Context7 prevents using deprecated APIs (Next.js changes weekly!)
- Serena shows existing patterns to follow (don't reinvent the wheel!)
- Agents work with current knowledge (no wasted effort on outdated approaches!)

---

## 🚀 STEP 2: LAUNCH PARALLEL AGENTS (AFTER documentation loaded!)

**NOW that you have current docs, launch agents with specific knowledge:**

1. **task-tracker-coordinator** --think-hard --with-context7-docs "Photo group API development"
2. **nextjs-fullstack-developer** --think-hard --use-loaded-docs "API routes and server actions" 
3. **wedding-domain-expert** --think-ultra-hard --follow-existing-patterns "Photo session business logic" 
4. **security-compliance-officer** --think-ultra-hard --check-current-best-practices
5. **test-automation-architect** --tdd-approach --use-testing-patterns-from-docs
6. **api-architect** --api-design --rest-patterns
7. **code-quality-guardian** --check-patterns --match-codebase-style

**AGENT INSTRUCTIONS:** "Use the Context7 docs loaded in Step 1. Follow Serena patterns."

**AGENT USAGE TARGET:** >75% of session time in parallel execution

---

## 📋 STEP 3: DEVELOPMENT WORKFLOW (With loaded docs + agents)

### **EXPLORE PHASE (NO CODING!)**
- Read ALL relevant files in `/src/app/api/guests/` first
- Understand existing guest API patterns and conventions
- Check WS-151 API integration points
- Review similar CRUD implementations
- Continue until you FULLY understand the codebase

### **PLAN PHASE (THINK HARD!)**
- Create detailed API design for photo group endpoints
- Write test cases FIRST (TDD)
- Plan business logic for conflict detection
- Consider edge cases (invalid groups, orphaned members)
- Don't rush - proper planning prevents problems

### **CODE PHASE (PARALLEL AGENTS!)**
- Write tests before implementation
- Follow existing API patterns
- Use Context7 examples as templates
- Implement with parallel agents
- Focus on completeness, not speed

### **COMMIT PHASE (VERIFY EVERYTHING!)**
- Run all tests
- Verify API with Playwright
- Create evidence package
- Generate reports
- Only mark complete when ACTUALLY complete

---

## 🎯 SPECIFIC DELIVERABLES FOR THIS ROUND

### Round 1 (Core API Implementation):
- [ ] **GET /api/photo-groups/[id]** - Retrieve photo groups for a couple
- [ ] **POST /api/photo-groups** - Create new photo group
- [ ] **PUT /api/photo-groups/[id]** - Update existing photo group
- [ ] **DELETE /api/photo-groups/[id]** - Delete photo group
- [ ] **POST /api/photo-groups/[id]/members** - Add guests to group
- [ ] **DELETE /api/photo-groups/[id]/members/[guestId]** - Remove guest from group
- [ ] **Photo group service class** with business logic
- [ ] **Unit tests with >80% coverage** for all endpoints
- [ ] **Integration tests** with database

### Core Features to Implement:
- [ ] CRUD operations for photo groups with validation
- [ ] Guest assignment and removal logic
- [ ] Basic conflict detection (time slot overlaps)
- [ ] Integration with existing guest system (WS-151)
- [ ] Real-time updates using Supabase subscriptions
- [ ] Row Level Security (RLS) for data protection

---

## 🔗 DEPENDENCIES

### What you NEED from other teams:
- FROM Team C: Database schema and migration files for photo_groups tables
- FROM Team A: Component interface requirements for API contracts

### What other teams NEED from you:
- TO Team A: API endpoint specifications and response schemas
- TO Team D: API integration patterns for WedMe platform
- TO Team E: API endpoints for testing and validation

---

## 🔒 SECURITY REQUIREMENTS (NON-NEGOTIABLE)

### 🚨 CRITICAL SECURITY LEARNINGS FROM PRODUCTION AUDIT

**MANDATORY SECURITY IMPLEMENTATION FOR ALL API ROUTES:**

```typescript
// ❌ NEVER DO THIS (FOUND IN 305+ ROUTES):
export async function POST(request: Request) {
  const body = await request.json(); // NO VALIDATION!
  const { data } = await supabase.from('photo_groups').insert(body); // DIRECT INSERT!
  return NextResponse.json(data);
}

// ✅ ALWAYS DO THIS (MANDATORY PATTERN):
import { withSecureValidation } from '@/lib/validation/middleware';
import { photoGroupSchema } from '@/lib/validation/schemas';

export const POST = withSecureValidation(
  photoGroupSchema,
  async (request: NextRequest, validatedData) => {
    // validatedData is now safe and typed
    const userId = request.headers.get('x-user-id');
    
    // Verify ownership
    const { data: couple } = await supabase
      .from('couples')
      .select('id')
      .eq('user_id', userId)
      .single();
      
    if (!couple) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }
    
    // Safe insert with validated data
    const { data, error } = await supabase
      .from('photo_groups')
      .insert({
        ...validatedData,
        couple_id: couple.id
      });
      
    return NextResponse.json(data);
  }
);
```

**SECURITY CHECKLIST FOR EVERY API ROUTE:**
- [ ] **Authentication Check**: Use existing middleware from `/src/middleware.ts`
- [ ] **Input Validation**: MANDATORY Zod schemas - see `/src/lib/validation/schemas.ts`
- [ ] **Ownership Verification**: Users can only access their own photo groups
- [ ] **Rate Limiting**: Already implemented in middleware - DO NOT bypass
- [ ] **SQL Injection Prevention**: Use parameterized queries ONLY
- [ ] **Error Handling**: NEVER expose stack traces or sensitive errors to users

⚠️ **DATABASE MIGRATIONS:**
- CREATE migration files but DO NOT APPLY them
- SEND to SQL Expert: `/WORKFLOW-V2-DRAFT/INBOX/sql-expert/migration-request-WS-153.md`
- SQL Expert will handle application and conflict resolution

---

## 🎭 REVOLUTIONARY PLAYWRIGHT MCP TESTING (MANDATORY)

**🧠 API TESTING WITH REAL HTTP CALLS:**

```javascript
// REVOLUTIONARY API TESTING APPROACH!

// 1. API ENDPOINT VALIDATION
await mcp__playwright__browser_navigate({url: "http://localhost:3000/api/photo-groups"});
const apiResponse = await mcp__playwright__browser_evaluate({
  function: `async () => {
    const response = await fetch('/api/photo-groups', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Family Photos',
        description: 'All family members',
        shot_type: 'formal',
        estimated_duration: 15,
        priority: 8
      })
    });
    return {
      status: response.status,
      data: await response.json()
    };
  }`
});

// 2. REAL-TIME SUBSCRIPTION TESTING
await mcp__playwright__browser_evaluate({
  function: `() => {
    // Test Supabase real-time subscriptions
    const subscription = supabase
      .from('photo_groups')
      .on('INSERT', (payload) => {
        console.log('New photo group:', payload);
        document.body.setAttribute('data-realtime-test', 'success');
      })
      .subscribe();
      
    // Trigger an insert to test real-time
    return subscription;
  }`
});

// 3. SECURITY VALIDATION
await mcp__playwright__browser_evaluate({
  function: `async () => {
    // Test unauthorized access
    const response = await fetch('/api/photo-groups/unauthorized-id', {
      method: 'DELETE'
    });
    return response.status; // Should be 401 or 403
  }`
});
```

**REQUIRED TEST COVERAGE:**
- [ ] All CRUD endpoints working correctly
- [ ] Authentication and authorization checks
- [ ] Input validation and error handling
- [ ] Real-time subscriptions functioning
- [ ] Performance under load (basic stress test)

---

## ✅ SUCCESS CRITERIA (NON-NEGOTIABLE)

**You CANNOT claim completion unless:**

### Technical Implementation:
- [ ] All Round 1 API endpoints complete and tested
- [ ] Tests written FIRST and passing (>80% coverage)
- [ ] API integration tests with database
- [ ] Zero TypeScript errors
- [ ] All security validations implemented

### Integration & Performance:
- [ ] Integration with existing guest system (WS-151) working
- [ ] Performance targets met (<200ms API response times)
- [ ] Real-time updates functioning
- [ ] Security requirements fully implemented
- [ ] Row Level Security (RLS) policies in place

### Evidence Package Required:
- [ ] API endpoint test results (Postman/Playwright)
- [ ] Database integration test results
- [ ] Performance metrics for API calls
- [ ] Security validation test results
- [ ] Test coverage report

---

## 💾 WHERE TO SAVE YOUR WORK

### Code Files:
- API Routes: `/wedsync/src/app/api/photo-groups/route.ts`
- API Routes: `/wedsync/src/app/api/photo-groups/[id]/route.ts`
- API Routes: `/wedsync/src/app/api/photo-groups/[id]/members/route.ts`
- Services: `/wedsync/src/lib/services/photoGroupService.ts`
- Tests: `/wedsync/src/__tests__/unit/api/photo-groups.test.ts`
- Integration: `/wedsync/src/__tests__/integration/photo-groups-api.test.ts`
- Types: `/wedsync/src/types/photo-groups.ts`
- Schemas: `/wedsync/src/lib/validation/photo-groups-schema.ts`
- Migrations: `/wedsync/supabase/migrations/[timestamp]_photo_groups_system.sql`

### CRITICAL - Team Reports:
- **Output to:** `/WORKFLOW-V2-DRAFT/OUTBOX/team-b/batch14/WS-153-team-b-round-1-complete.md`
- **Update status:** 
  ```bash
  echo "$(date '+%Y-%m-%d %H:%M') | WS-153 | ROUND_1_COMPLETE | team-b | batch14" >> /WORKFLOW-V2-DRAFT/00-STATUS/feature-tracker.log
  ```

---

## ⚠️ CRITICAL WARNINGS
- Do NOT modify files assigned to other teams (causes conflicts)
- Do NOT skip tests - write them FIRST
- Do NOT ignore security requirements
- Do NOT claim completion without evidence
- REMEMBER: All 5 teams work in PARALLEL - no overlapping files
- WAIT: Do not start Round 2 until ALL teams complete Round 1

## 🏁 ROUND COMPLETION CHECKLIST
- [ ] All deliverables complete
- [ ] Tests written and passing
- [ ] Security validated
- [ ] Dependencies provided
- [ ] Code committed
- [ ] Report created

---

END OF ROUND PROMPT - EXECUTE IMMEDIATELY