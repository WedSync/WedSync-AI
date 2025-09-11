# TEAM B - ROUND 1: WS-057 - RSVP Management System - Core Backend Implementation

**Date:** 2025-08-22  
**Feature ID:** WS-057 (Track all work with this ID)
**Priority:** P1 from roadmap  
**Mission:** Build comprehensive RSVP backend system with real-time tracking and meal preferences  
**Context:** You are Team B working in parallel with 4 other teams. ALL must complete before next round.

---

## 🎯 USER STORY & WEDDING CONTEXT (CRITICAL - THINK HARD)

**As a:** Couple managing 150 wedding invitations
**I want to:** Send digital RSVPs and track responses in real-time
**So that:** I can finalize catering counts 2 weeks before the wedding

**Real Wedding Problem This Solves:**
Emma sends digital RSVP links to 150 guests. The system tracks that 89 have responded, 12 declined, and 49 haven't opened the invitation yet. She sees Aunt Mary marked "maybe" and calls to confirm. Final count: 127 attending, letting her confirm catering and avoid $500 in overage fees.

---

## 🎯 TECHNICAL REQUIREMENTS

**From Technical Specification:**
- Digital RSVP forms with meal selection and dietary restrictions
- Real-time response tracking with guest communication
- Automated reminder system for non-responders
- Unique RSVP tokens for security
- Household-based RSVP (multiple guests, one link)
- Plus-one management and validation
- Response history tracking
- Email/SMS notification integration
- Analytics on response patterns

**Technology Stack (VERIFIED):**
- Frontend: Next.js 15 App Router, React 19, Tailwind CSS v4
- Backend: Supabase (PostgreSQL 15), Edge Functions
- Testing: Playwright MCP, Vitest
- Email: SendGrid or Resend for RSVP invitations
- Real-time: Supabase subscriptions
- Security: JWT tokens for RSVP links

**Integration Points:**
- Guest Database: Links to Team A's guest list (WS-056)
- RSVP Tables: New rsvp_responses and rsvp_links tables
- Email System: Automated RSVP sending
- Analytics: Response tracking and patterns

---

## 📚 STEP 1: LOAD CURRENT DOCUMENTATION (MANDATORY FIRST STEP!)

**⚠️ CRITICAL: Complete this BEFORE any coding or agent work begins!**

```typescript
// 1. LOAD CORRECT UI STYLE GUIDE (Even backend needs to understand UI requirements):
await mcp__serena__read_file("/WORKFLOW-V2-DRAFT/SAAS-UI-STYLE-GUIDE.md");

// 2. CONTEXT7 MCP - Load latest docs for THIS SPECIFIC TASK:
// Think hard about what documentation you need for RSVP backend
await mcp__context7__resolve-library-id("supabase");  // Get correct library ID first
await mcp__context7__get-library-docs("/supabase/supabase", "database functions triggers", 5000);
await mcp__context7__get-library-docs("/supabase/supabase", "edge-functions email", 3000);
await mcp__context7__get-library-docs("/vercel/next.js", "route-handlers dynamic-routes", 3000);

// For this specific feature, also load:
await mcp__context7__get-library-docs("/sendgrid/sendgrid", "email-templates tracking", 2000);
await mcp__context7__get-library-docs("/jsonwebtoken/jsonwebtoken", "jwt-signing verification", 1500);
await mcp__context7__get-library-docs("/supabase/supabase", "real-time broadcast", 2000);

// 3. SERENA MCP - Initialize codebase intelligence:
await mcp__serena__activate_project("/Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync");
await mcp__serena__switch_modes(["editing", "interactive"]);
await mcp__serena__check_onboarding_performed();

// 4. REVIEW existing patterns and Team A's work:
await mcp__serena__find_symbol("guests", "", true);
await mcp__serena__get_symbols_overview("src/app/api");
await mcp__serena__search_for_pattern("email.*send|notification", true);

// NOW you have current docs + codebase context. Agents can work intelligently!
```

**WHY THIS ORDER MATTERS:**
- Context7 prevents using deprecated APIs (Supabase changes frequently!)
- Serena shows existing patterns to follow (don't reinvent the wheel!)
- Agents work with current knowledge (no wasted effort on outdated approaches!)

---

## 🚀 STEP 2: LAUNCH PARALLEL AGENTS (AFTER documentation loaded!)

**NOW that you have current docs, launch agents with specific knowledge:**

1. **task-tracker-coordinator** --think-hard --with-context7-docs "Build RSVP backend with real-time tracking"
2. **database-mcp-specialist** --think-hard --use-loaded-docs "Design RSVP schema with response tracking"
3. **api-architect** --think-ultra-hard --follow-existing-patterns "RESTful RSVP endpoints with token security" 
4. **security-compliance-officer** --think-ultra-hard --check-current-best-practices "Secure RSVP tokens"
5. **test-automation-architect** --tdd-approach --use-testing-patterns-from-docs
6. **integration-specialist** --email-focus "Email notification system for RSVPs"
7. **code-quality-guardian** --check-patterns --match-codebase-style

**AGENT INSTRUCTIONS:** "Use the Context7 docs loaded in Step 1. Follow Serena patterns for APIs."

**AGENT USAGE TARGET:** >75% of session time in parallel execution

---

## 📋 STEP 3: DEVELOPMENT WORKFLOW (With loaded docs + agents)

### **EXPLORE PHASE (NO CODING!)**
- Read Team A's guest structure thoroughly
- Understand existing email patterns
- Check how tokens are handled elsewhere
- Review similar response tracking systems
- Continue until you FULLY understand the codebase

### **PLAN PHASE (THINK HARD!)**
- Design RSVP database schema per specification
- Plan token generation and validation
- Design response tracking algorithm
- Plan email template structure
- Consider edge cases (expired links, duplicate responses)

### **CODE PHASE (PARALLEL AGENTS!)**
- Write tests before implementation
- Follow existing API patterns
- Use Context7 examples as templates
- Implement with parallel agents
- Focus on completeness, not speed

### **COMMIT PHASE (VERIFY EVERYTHING!)**
- Run all tests
- Verify with Postman/API testing
- Test email sending
- Create evidence package
- Only mark complete when ACTUALLY complete

---

## 🎯 SPECIFIC DELIVERABLES FOR THIS ROUND

### Round 1 (Core Implementation):
- [ ] Database schema implementation (rsvp_responses table per spec)
- [ ] `/api/rsvp/[token]/route.ts` - Public RSVP endpoint (no auth)
- [ ] `/api/rsvp/send/route.ts` - Bulk RSVP invitation sending
- [ ] `/api/rsvp/track/route.ts` - Response tracking API
- [ ] `/api/rsvp/analytics/route.ts` - RSVP analytics endpoint
- [ ] Token generation and validation system
- [ ] Email templates for RSVP invitations
- [ ] Real-time response broadcasting
- [ ] Response history tracking
- [ ] Unit tests with >80% coverage
- [ ] API integration tests

---

## 🔗 DEPENDENCIES

### What you NEED from other teams:
- FROM Team A: Guest data structure and IDs (WS-056)

### What other teams NEED from you:
- TO Team A: RSVP status updates for guest display
- TO Team C: RSVP data for task assignments
- TO Team D: Headcount for budget calculations
- TO Team E: RSVP widget for wedding website

---

## 🔒 SECURITY REQUIREMENTS (NON-NEGOTIABLE)
- [ ] Secure token generation (cryptographically random)
- [ ] Token expiration handling
- [ ] Rate limiting on RSVP submissions
- [ ] Input validation for all RSVP data
- [ ] SQL injection prevention
- [ ] XSS prevention in responses
- [ ] CSRF protection on forms
- [ ] Email verification before sending

---

## 🎭 REVOLUTIONARY PLAYWRIGHT MCP TESTING (MANDATORY)

**🧠 ACCESSIBILITY-FIRST VALIDATION (Not Screenshot Guessing!):**

```javascript
// REVOLUTIONARY TESTING APPROACH - Microsoft's Breakthrough!

// 1. PUBLIC RSVP FORM TEST (No auth required)
const rsvpToken = "test-token-abc123";
await mcp__playwright__browser_navigate({url: `http://localhost:3000/rsvp/${rsvpToken}`});
const accessibilityStructure = await mcp__playwright__browser_snapshot();
// Verify RSVP form loads without authentication

// 2. RSVP SUBMISSION TEST
await mcp__playwright__browser_select_option({
  element: "Response dropdown",
  ref: "[data-testid='rsvp-response']",
  values: ["attending"]
});
await mcp__playwright__browser_select_option({
  element: "Meal choice",
  ref: "[data-testid='meal-choice']",
  values: ["vegetarian"]
});
await mcp__playwright__browser_type({
  element: "Dietary restrictions",
  ref: "[data-testid='dietary-input']",
  text: "Nut allergy"
});
await mcp__playwright__browser_click({
  element: "Submit RSVP",
  ref: "[data-testid='submit-rsvp']"
});
await mcp__playwright__browser_wait_for({text: "Thank you for your response!"});

// 3. REAL-TIME UPDATE TEST
// Open admin dashboard in new tab
await mcp__playwright__browser_tab_new({url: "/wedme/rsvp-tracking"});
await mcp__playwright__browser_wait_for({text: "89 attending"}); // Should update in real-time

// 4. EMAIL SENDING TEST (Mock)
const emailSent = await mcp__playwright__browser_evaluate({
  function: `() => window.emailQueue?.length || 0`
});

// 5. TOKEN VALIDATION TEST
await mcp__playwright__browser_navigate({url: "/rsvp/invalid-token"});
await mcp__playwright__browser_wait_for({text: "Invalid or expired RSVP link"});

// 6. PERFORMANCE TEST
const apiResponse = await mcp__playwright__browser_evaluate({
  function: `() => fetch('/api/rsvp/track').then(r => r.json())`
});
```

**REQUIRED TEST COVERAGE:**
- [ ] Public RSVP form accessibility
- [ ] Token validation (valid/invalid/expired)
- [ ] Response submission flow
- [ ] Real-time update verification
- [ ] Email queue validation
- [ ] Error handling for duplicates

---

## ✅ SUCCESS CRITERIA (NON-NEGOTIABLE)

**You CANNOT claim completion unless:**

### Technical Implementation:
- [ ] All deliverables for Round 1 complete
- [ ] RSVP API endpoints working
- [ ] Token system secure and functional
- [ ] Email sending operational (or mocked)
- [ ] Real-time updates working
- [ ] Tests written FIRST and passing (>80% coverage)
- [ ] API tests validating all endpoints
- [ ] Zero TypeScript errors
- [ ] Zero security vulnerabilities

### Integration & Performance:
- [ ] Integrates with Team A's guest data
- [ ] Response time <500ms for RSVP submission
- [ ] Handles concurrent RSVP submissions
- [ ] Token generation <100ms
- [ ] Email queue processing efficient
- [ ] Real-time broadcast latency <200ms

### Evidence Package Required:
- [ ] API documentation (endpoints, payloads)
- [ ] Database schema diagram
- [ ] Sample RSVP tokens (for testing)
- [ ] Email template screenshots
- [ ] Test results and coverage
- [ ] Performance metrics

---

## 💾 WHERE TO SAVE YOUR WORK

### Code Files:
- API Routes: `/wedsync/src/app/api/rsvp/[token]/route.ts`
- Send API: `/wedsync/src/app/api/rsvp/send/route.ts`
- Track API: `/wedsync/src/app/api/rsvp/track/route.ts`
- Analytics: `/wedsync/src/app/api/rsvp/analytics/route.ts`
- Database: `/wedsync/supabase/migrations/XXX_rsvp_system.sql`
- Email Templates: `/wedsync/src/lib/email/templates/rsvp-invitation.tsx`
- Token Service: `/wedsync/src/lib/services/rsvp-token-service.ts`
- Tests: `/wedsync/tests/api/rsvp/`
- Types: `/wedsync/src/types/rsvp.ts`

### CRITICAL - Team Reports:
- **Output to:** `/WORKFLOW-V2-DRAFT/OUTBOX/team-b/batch4/WS-057-batch4-round-1-complete.md`
- **Include:** Feature ID (WS-057) in all filenames
- **Save in:** batch4 folder (NOT in CORRECT folder)
- **After completion:** Update senior dev that Round 1 is complete

---

## 📝 TEAM OUTPUT REQUIRED AT END OF ROUND:

### CRITICAL: Use Standard Team Output Template
**Template:** See `/WORKFLOW-V2-DRAFT/TEAM-OUTPUT-TEMPLATE.md` for EXACT format
**Output to:** `/WORKFLOW-V2-DRAFT/OUTBOX/team-b/batch4/WS-057-batch4-round-1-complete.md`

Must include:
1. Summary of RSVP backend built
2. API endpoints created
3. Database schema implemented
4. Test results and coverage
5. Integration points ready
6. Any blockers or issues

---

## ⚠️ CRITICAL WARNINGS
- Do NOT build guest list UI (Team A's WS-056)
- Do NOT implement task delegation (Team C's WS-058)
- Do NOT build budget features (Team D's WS-059)
- Do NOT create website builder (Team E's WS-060)
- FOCUS ONLY on RSVP backend and API
- REMEMBER: All 5 teams work in PARALLEL - no overlapping work

---

## 🏁 ROUND COMPLETION CHECKLIST
- [ ] RSVP API fully functional
- [ ] Token system secure
- [ ] Database schema implemented
- [ ] Email templates ready
- [ ] Real-time updates working
- [ ] All tests passing
- [ ] Security validated
- [ ] Performance targets met
- [ ] Code committed
- [ ] Report created

---

END OF ROUND 1 PROMPT - EXECUTE IMMEDIATELY