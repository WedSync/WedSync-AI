# TEAM E - ROUND 1: WS-196 - API Routes Structure - E2E Testing Framework

**Date:** 2025-01-20  
**Feature ID:** WS-196 (Track all work with this ID)  
**Priority:** P0 from roadmap  
**Mission:** Build comprehensive end-to-end testing framework for API routes with authentication validation, wedding business context testing, and automated API workflow verification  
**Context:** You are Team E working in parallel with 4 other teams. ALL must complete before next round.

---

## 🎯 USER STORY & WEDDING CONTEXT (CRITICAL - THINK HARD)

**As a:** WedSync QA engineer ensuring API reliability for wedding vendor integrations
**I want to:** Comprehensive E2E testing framework that validates API endpoints with real authentication flows, wedding business context scenarios, and supplier/couple workflow testing  
**So that:** I can ensure photography studios can reliably integrate client management APIs, venue booking systems maintain data integrity during peak wedding season, and couples accessing vendor coordination APIs receive consistent responses without failures during critical wedding planning phases

**Real Wedding Problem This Solves:**
A photography studio's integration with WedSync APIs failed during peak season because the `/api/suppliers/{id}/clients` endpoint wasn't properly tested with wedding-specific parameters like guest count ranges, seasonal pricing, and ceremony requirements. The E2E testing framework would have caught authentication failures when switching between supplier types, validated wedding date filtering edge cases, and tested business context scenarios like multiple venue bookings for the same couple, preventing integration failures that disrupted vendor coordination for 15+ weddings.

---

## 🎯 TECHNICAL REQUIREMENTS

**From Technical Specification:**
- End-to-end API testing framework with authentication flow validation, request/response verification, and wedding business context scenarios
- API workflow testing with supplier/couple authentication contexts, parameter validation, and response schema verification
- Automated testing scenarios for wedding industry workflows including venue availability, photographer booking, and vendor coordination
- Performance testing for API endpoints with load validation, response time verification, and error handling scenarios
- Integration testing with database validation, real-time updates, and cross-endpoint dependency verification

**Technology Stack (VERIFIED):**
- Frontend: Next.js 15 App Router, React 19, Tailwind CSS v4
- Database: PostgreSQL via MCP Server (✅ CONNECTED - Direct Supabase access available)
- Backend: Supabase (PostgreSQL 15), Edge Functions
- Testing: Playwright MCP, Browser MCP, Vitest, API testing utilities
- API Testing: Authentication context switching, request validation, response schema verification

**Integration Points:**
- Team A API Routes: Route handler implementations and validation schemas from backend API development
- Team B Infrastructure: API logging, monitoring, and performance metrics for testing validation
- Team C Documentation: API documentation examples and testing scenarios from developer documentation
- Database: api_request_logs, api_versions, api_route_configs, api_business_contexts tables

---


## 🧠 SEQUENTIAL THINKING MCP FOR COMPLEX FEATURE ANALYSIS

### When to Use Sequential Thinking

Before diving into coding, use Sequential Thinking MCP when facing:

- **Complex Feature Architecture**: Multi-component systems with intricate dependencies
- **Integration Challenges**: Features that span multiple systems and require coordination  
- **Business Logic Complexity**: Wedding-specific rules that need careful analysis
- **Technical Trade-offs**: Choosing between multiple implementation approaches
- **Debugging Complex Issues**: Root cause analysis for multi-system problems

### Sequential Thinking Patterns for Development Teams

#### Pattern 1: Feature Architecture Analysis
```typescript
// Before starting complex feature development
mcp__sequential-thinking__sequential_thinking({
  thought: "This task tracking feature needs to integrate with existing task creation (WS-156), helper assignment (WS-157), and real-time notifications. Need to analyze data flow and identify potential integration points.",
  nextThoughtNeeded: true,
  thoughtNumber: 1,
  totalThoughts: 4
});

mcp__sequential-thinking__sequential_thinking({
  thought: "Data flow analysis: User creates task -> assigns helpers -> helpers update status -> triggers notifications -> updates progress indicators. Each step requires API endpoints, validation, and error handling.",
  nextThoughtNeeded: true,
  thoughtNumber: 2,
  totalThoughts: 4
});
```

#### Pattern 2: Integration Strategy Planning  
```typescript
// When coordinating with other teams' work
mcp__sequential-thinking__sequential_thinking({
  thought: "Team A is building UI components, Team C is handling real-time updates, and Team E is implementing testing. Need to define clear API contracts and data structures that all teams can use.",
  nextThoughtNeeded: true,
  thoughtNumber: 1,
  totalThoughts: 3
});

mcp__sequential-thinking__sequential_thinking({
  thought: "API contract definition: /api/tasks/status endpoints need to support CRUD operations, validation schemas, and webhook events. Response format should match Team A's UI expectations.",
  nextThoughtNeeded: true,
  thoughtNumber: 2,
  totalThoughts: 3
});
```

#### Pattern 3: Business Logic Analysis
```typescript
// When implementing wedding-specific business rules
mcp__sequential-thinking__sequential_thinking({
  thought: "Wedding task tracking has unique requirements: tasks can be delegated to multiple helpers, status updates need photo evidence for critical tasks, and deadlines are tied to wedding date proximity.",
  nextThoughtNeeded: true,
  thoughtNumber: 1,
  totalThoughts: 4
});

mcp__sequential-thinking__sequential_thinking({
  thought: "Business rule implementation: Critical tasks (venue confirmation, catering numbers) require photo evidence. Non-critical tasks (decoration pickup) can be marked complete without evidence. Need validation logic for each task type.",
  nextThoughtNeeded: true,
  thoughtNumber: 2,
  totalThoughts: 4
});
```

### Using Sequential Thinking in Your Development Process

1. **Before Documentation Loading**: Use Sequential Thinking to understand the full scope and complexity
2. **During Planning Phase**: Structure your approach to handle all edge cases and integration points  
3. **When Stuck**: Use Sequential Thinking to work through complex problems systematically
4. **For Reviews**: Use Sequential Thinking to verify your implementation covers all requirements

**Remember**: Complex features require systematic thinking. Use Sequential Thinking MCP to ensure thorough analysis before implementation.

---
## 📚 STEP 1: LOAD CURRENT DOCUMENTATION (MANDATORY FIRST STEP!)

**⚠️ CRITICAL: Complete this BEFORE any coding or agent work begins!**

```typescript
// 1. LOAD CORRECT UI STYLE GUIDE (MANDATORY FOR ALL UI WORK):
await mcp__serena__read_file("/WORKFLOW-V2-DRAFT/SAAS-UI-STYLE-GUIDE.md");

// 2. Ref MCP - Load latest docs for THIS SPECIFIC TASK:
await mcp__Ref__ref_search_documentation({query: "Next.js 15 App Router Server Components forms latest"});
await mcp__Ref__ref_search_documentation({query: "Supabase realtime database auth latest documentation"});
await mcp__Ref__ref_search_documentation({query: "Tailwind CSS v4 components styling patterns"});
await mcp__Ref__ref_search_documentation({query: "React 19 hooks patterns best practices"});

// 3. SERENA MCP - Initialize codebase intelligence:
await mcp__serena__activate_project("/Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync");
await mcp__serena__switch_modes(["editing", "interactive"]);
await mcp__serena__check_onboarding_performed();

// 4. REVIEW existing testing patterns and API validation structures:
await mcp__serena__find_symbol("APITest", "", true);
await mcp__serena__get_symbols_overview("tests/api");
```

---

## 🚀 STEP 2: LAUNCH PARALLEL AGENTS (AFTER documentation loaded!)

1. **task-tracker-coordinator** --think-hard --with-ref-mcp-docs "Track E2E API testing framework development with wedding business context validation"
2. **test-automation-architect** --think-hard --use-loaded-docs "Build comprehensive API testing framework with authentication and wedding workflow scenarios" 
3. **playwright-visual-testing-specialist** --think-ultra-hard --follow-existing-patterns "Create E2E API tests with business context validation and error scenario testing" --use-browser-mcp
4. **security-compliance-officer** --think-ultra-hard --check-current-best-practices "Validate API testing security and authentication flow verification"
5. **performance-optimization-expert** --tdd-approach --use-testing-patterns-from-docs "Design performance testing for API endpoints with load and response time validation"
6. **code-quality-guardian** --accessibility-first --multi-tab "Ensure API testing follows established patterns and covers all business scenarios"
7. **database-mcp-specialist** --check-patterns --match-codebase-style "Validate database integration testing and data integrity verification"

---

## 📋 STEP 3: DEVELOPMENT WORKFLOW (With loaded docs + agents)

### **EXPLORE PHASE (NO CODING!)**
- Read existing API testing patterns and E2E testing framework structures
- Understand wedding business context requirements and API workflow scenarios
- Check integration patterns with authentication systems, database validation, and API documentation
- Review similar implementations in API testing frameworks and business context validation
- Continue until you FULLY understand the API testing architecture and wedding industry validation requirements

### **PLAN PHASE (THINK HARD!)**
- Create detailed implementation plan for E2E API testing with wedding business context scenarios
- Write test cases FIRST (TDD) for API endpoint validation, authentication flows, and business workflow testing
- Plan error handling for API failures, authentication timeouts, database connection issues, and business context validation
- Consider edge cases like invalid authentication tokens, malformed wedding data, and cross-endpoint dependencies
- Design testing framework optimized for wedding industry workflows and supplier/couple interaction scenarios

### **CODE PHASE (PARALLEL AGENTS!)**
- Write tests before implementation for API testing framework and business context validation
- Follow existing testing patterns and API validation standards from Ref MCP examples
- Use Playwright MCP for comprehensive API endpoint testing with authentication and business scenarios
- Implement with parallel agents focusing on comprehensive API coverage and wedding workflow validation
- Focus on testing completeness and business context accuracy, not development speed

### **COMMIT PHASE (VERIFY EVERYTHING!)**
- Run all tests including API testing framework validation and business context scenario verification
- Verify with Playwright MCP for API endpoint testing, authentication flows, and wedding workflow scenarios
- Create evidence package showing API testing coverage, business validation accuracy, and error scenario handling
- Generate reports on API testing framework completeness, wedding context validation, and performance testing results
- Only mark complete when E2E testing framework provides comprehensive API validation for wedding industry scenarios

---

## 🎯 SPECIFIC DELIVERABLES FOR ROUND 1

### Core Implementation:
- [ ] **APITestFramework core** with authentication context switching, request/response validation, and wedding business scenario testing
- [ ] **AuthenticationFlowTests** validating supplier/couple login flows, session management, and role-based API access
- [ ] **SupplierAPITests** testing client management endpoints with wedding-specific parameters and business context validation
- [ ] **CoupleAPITests** validating wedding planning endpoints with venue booking, vendor coordination, and timeline management
- [ ] **BusinessContextValidation** testing wedding industry scenarios including guest counts, seasonal pricing, and ceremony requirements
- [ ] **ErrorScenarioTesting** with comprehensive error handling validation, timeout scenarios, and edge case coverage
- [ ] **PerformanceTestSuite** with load testing, response time validation, and API endpoint performance benchmarking
- [ ] **Database integration testing** with data integrity validation, real-time update verification, and cross-endpoint consistency
- [ ] **Unit tests >80% coverage** for all testing framework components with comprehensive API scenario coverage
- [ ] **Automated test execution** with CI/CD integration and comprehensive API validation reporting

### API Testing Features:
- [ ] **Wedding workflow testing** with supplier onboarding, client management, and vendor coordination scenarios
- [ ] **Authentication context switching** between supplier/couple/admin roles with proper permission validation
- [ ] **Business context validation** for wedding industry parameters including dates, venues, guest counts, and budget ranges
- [ ] **Cross-endpoint dependency testing** validating data consistency and integration between related API endpoints

### Database Integration:
- [ ] **API testing data management** with test data setup, cleanup, and isolation for reliable testing scenarios
- [ ] **Database state validation** ensuring API operations maintain data integrity and business rule compliance
- [ ] **Real-time update testing** validating WebSocket connections and live data synchronization in API workflows

---

## 🧭 NAVIGATION INTEGRATION REQUIREMENTS

**Critical Navigation Context:**
This feature must integrate seamlessly with WedSync's navigation system to provide intuitive user flows and maintain consistent user experience across all wedding management workflows.

### Navigation Implementation Requirements

**1. Breadcrumb Integration**
```tsx
// Add breadcrumb support to all new pages/components
import { Breadcrumb } from '@/components/ui/breadcrumb'

// Example breadcrumb hierarchy for this feature:
// Dashboard > Helpers > Schedules > [Helper Name] > [Schedule Details]
const breadcrumbItems = [
  { label: 'Dashboard', href: '/dashboard' },
  { label: 'Helpers', href: '/helpers' },
  { label: 'Schedules', href: '/helpers/schedules' },
  { label: helperName, href: `/helpers/schedules/${helperId}` },
  { label: 'Details', href: undefined } // current page
]
```

**2. Menu Integration Points**
- **Main Navigation**: Add/update relevant menu items in main navigation
- **Contextual Menus**: Implement context-sensitive navigation options
- **Quick Actions**: Provide navigation shortcuts for common workflows

**3. Mobile Navigation Considerations**
```tsx
// Ensure mobile-first responsive navigation
// Use progressive disclosure for complex navigation trees
// Implement touch-friendly navigation controls
// Consider swipe gestures for timeline/schedule navigation
```

**4. Navigation State Management**
```tsx
// Implement navigation state persistence
// Handle deep linking and shareable URLs
// Maintain navigation context across page refreshes
// Support browser back/forward functionality
```

**5. User Flow Integration**
- **Entry Points**: Define how users access this feature from existing workflows
- **Exit Points**: Provide clear paths to related features and main dashboard
- **Cross-Feature Navigation**: Enable seamless transitions between related features

**6. Wedding Context Navigation**
```tsx
// Maintain wedding context in navigation
// Support multi-wedding navigation switching
// Preserve user's current wedding selection across feature navigation
// Implement wedding-specific navigation shortcuts
```

**Navigation Testing Requirements:**
- Test all breadcrumb paths and hierarchy
- Verify mobile navigation responsiveness
- Validate deep linking functionality
- Test navigation state persistence
- Ensure keyboard navigation accessibility
- Verify screen reader navigation support

---

## 🔗 DEPENDENCIES

### What you NEED from other teams:
- FROM Team A: API route implementations and validation schemas - Required for comprehensive endpoint testing
- FROM Team B: API infrastructure monitoring and performance data - Required for load testing and performance validation  
- FROM Team C: API documentation examples and testing scenarios - Required for comprehensive business context testing

### What other teams NEED from you:
- TO Team A: API testing feedback and validation issues - They need this for route implementation improvements
- TO Team B: Performance testing results and load validation data - Required for their infrastructure optimization
- TO Team C: Testing scenario validation and documentation accuracy feedback - Required for their developer guide improvements

---

## 🔒 SECURITY REQUIREMENTS (NON-NEGOTIABLE)

### MANDATORY SECURITY IMPLEMENTATION FOR API TESTING

**EVERY API test MUST use the security framework at `/src/lib/validation/` and `/src/lib/security/`:**

```typescript
// ✅ ALWAYS DO THIS (MANDATORY PATTERN FOR API TESTING):
import { createTestAuthContext } from '@/lib/testing/auth-context';
import { validateAPIResponse } from '@/lib/testing/validation';

// API testing with proper security validation
describe('Supplier Client API', () => {
  it('should validate authentication and business context', async () => {
    const authContext = await createTestAuthContext('supplier');
    // Test implementation with validated authentication
  });
});
```

### SECURITY CHECKLIST FOR API TESTING

Teams MUST implement ALL of these for EVERY API test:

- [ ] **Authentication Testing**: Comprehensive validation of authentication flows, token management, and session handling
- [ ] **Authorization Validation**: MANDATORY testing of role-based access control and permission verification
- [ ] **Rate Limiting Testing**: API testing must verify rate limiting behavior and proper error responses
- [ ] **CSRF Protection Testing**: All state-changing API endpoints must be tested for CSRF protection
- [ ] **Input Validation Testing**: Comprehensive testing of input sanitization and validation for all API parameters
- [ ] **Error Handling Testing**: API error responses must not expose sensitive system information or configuration details
- [ ] **Session Security Testing**: Authentication session behavior testing including timeout and invalidation scenarios
- [ ] **Audit Logging Testing**: Verification that API operations are properly logged with correct user attribution

---

## 🎭 REVOLUTIONARY PLAYWRIGHT MCP TESTING (MANDATORY)

```javascript
// Comprehensive API testing framework with wedding business context
describe('WedSync API E2E Testing Framework', () => {
  
  // Test supplier client management API with wedding context
  test('Supplier client management API with wedding business validation', async () => {
    // Setup supplier authentication context
    const supplierAuth = await createSupplierAuthContext({
      vendorType: 'photographer',
      tier: 'professional'
    });
    
    // Test client creation with wedding-specific parameters
    const clientData = {
      couple_name: 'John & Jane Smith',
      wedding_date: '2025-08-15T14:00:00Z',
      venue_name: 'Yorkshire Dales Manor',
      guest_count: 120,
      budget_range: '2500_5000',
      preferred_style: 'natural_documentary'
    };
    
    // Create client via API
    const response = await fetch('/api/suppliers/test-supplier-id/clients', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supplierAuth.token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(clientData)
    });
    
    // Validate response structure and business context
    expect(response.status).toBe(201);
    const responseData = await response.json();
    
    expect(responseData.success).toBe(true);
    expect(responseData.data.client.days_until_wedding).toBeGreaterThan(0);
    expect(responseData.data.client.wedding_season).toBe('summer');
    expect(responseData.data.client.budget_display).toBe('£2,500 - £5,000');
  });
  
  // Test couple wedding planning API workflows
  test('Couple wedding planning API with vendor coordination', async () => {
    const coupleAuth = await createCoupleAuthContext({
      weddingDate: '2025-06-21',
      venue: 'countryside'
    });
    
    // Test venue availability check
    const availabilityResponse = await fetch('/api/suppliers/venues/venue-id/availability', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${coupleAuth.token}`
      }
    });
    
    expect(availabilityResponse.status).toBe(200);
    const availabilityData = await availabilityResponse.json();
    expect(availabilityData.data.available_dates).toBeInstanceOf(Array);
  });
  
  // Test authentication flow validation
  test('Authentication context switching and role validation', async () => {
    // Test supplier authentication
    const supplierLogin = await fetch('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: 'photographer@example.com',
        password: 'test-password',
        user_type: 'supplier'
      })
    });
    
    expect(supplierLogin.status).toBe(200);
    
    // Test couple authentication
    const coupleLogin = await fetch('/api/auth/login', {
      method: 'POST', 
      body: JSON.stringify({
        email: 'couple@example.com',
        password: 'test-password',
        user_type: 'couple'
      })
    });
    
    expect(coupleLogin.status).toBe(200);
    
    // Validate role-based access
    const supplierToken = (await supplierLogin.json()).data.access_token;
    const unauthorizedResponse = await fetch('/api/couples/couple-id/timeline', {
      headers: { 'Authorization': `Bearer ${supplierToken}` }
    });
    
    expect(unauthorizedResponse.status).toBe(403);
  });
  
  // Test performance and load scenarios
  test('API performance validation with concurrent requests', async () => {
    const startTime = Date.now();
    
    // Create multiple concurrent API requests
    const requests = Array.from({ length: 10 }, (_, i) =>
      fetch(`/api/suppliers/test-supplier/clients?page=${i + 1}`, {
        headers: { 'Authorization': `Bearer ${testSupplierToken}` }
      })
    );
    
    const responses = await Promise.all(requests);
    const endTime = Date.now();
    
    // Validate all requests succeeded
    responses.forEach(response => {
      expect(response.status).toBe(200);
    });
    
    // Validate performance requirements
    const totalTime = endTime - startTime;
    expect(totalTime).toBeLessThan(5000); // All requests under 5 seconds
  });
  
  // Test error handling scenarios
  test('API error handling with wedding context validation', async () => {
    // Test invalid wedding date
    const invalidDateResponse = await fetch('/api/suppliers/test-supplier/clients', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${testSupplierToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        couple_name: 'Test Couple',
        wedding_date: 'invalid-date',
        contact_email: 'test@example.com'
      })
    });
    
    expect(invalidDateResponse.status).toBe(400);
    const errorData = await invalidDateResponse.json();
    expect(errorData.error.code).toBe('VALIDATION_ERROR');
  });
});
```

**REQUIRED TEST COVERAGE:**
- [ ] Complete API endpoint testing with authentication flow validation (comprehensive workflow testing)
- [ ] Wedding business context validation with supplier/couple scenarios (industry-specific testing)
- [ ] Performance testing with load validation and response time benchmarking (scalability verification)
- [ ] Error scenario testing with comprehensive edge case coverage (robustness validation)
- [ ] Database integration testing with data integrity and real-time update verification (data consistency)
- [ ] Cross-endpoint dependency testing ensuring API workflow consistency (integration validation)


## 🌐 BROWSER MCP INTERACTIVE TESTING (NEW!)

**🚀 Real Browser Automation with Browser MCP:**

The Browser MCP provides interactive browser testing capabilities that complement Playwright MCP:

```javascript
// BROWSER MCP - Interactive Visual Testing
// Use for real-time UI validation and user flow testing

// 1. NAVIGATE AND CAPTURE STATE
await mcp__browsermcp__browser_navigate({url: "http://localhost:3000/dashboard"});
const snapshot = await mcp__browsermcp__browser_snapshot();

// 2. INTERACTIVE FORM TESTING
await mcp__browsermcp__browser_click({
  element: "Login button",
  ref: snapshot.querySelector('[data-testid="login-btn"]')
});

await mcp__browsermcp__browser_type({
  element: "Email input field", 
  ref: snapshot.querySelector('input[type="email"]'),
  text: "test@wedding.com",
  submit: false
});

// 3. VISUAL REGRESSION TESTING
await mcp__browsermcp__browser_screenshot(); // Captures current state

// 4. RESPONSIVE TESTING
for (const width of [375, 768, 1024, 1920]) {
  await mcp__browsermcp__browser_resize({width, height: 800});
  await mcp__browsermcp__browser_wait({time: 1});
  await mcp__browsermcp__browser_screenshot();
}

// 5. CONSOLE AND NETWORK MONITORING
const logs = await mcp__browsermcp__browser_get_console_logs();
const hasErrors = logs.some(log => log.level === 'error');

// 6. MULTI-TAB TESTING
await mcp__browsermcp__browser_tabs({action: "new"});
await mcp__browsermcp__browser_navigate({url: "http://localhost:3000/settings"});
await mcp__browsermcp__browser_tabs({action: "select", index: 0});
```

**Browser MCP vs Playwright MCP:**
- **Browser MCP**: Interactive, visual, real-time testing during development
- **Playwright MCP**: Automated, programmatic, CI/CD testing
- **Use Both**: Browser MCP for exploration, Playwright MCP for automation


---

## ✅ SUCCESS CRITERIA (NON-NEGOTIABLE)

**You CANNOT claim completion unless:**

### Technical Implementation:
- [ ] All Round 1 deliverables complete with comprehensive E2E API testing framework
- [ ] Tests written FIRST and passing (>80% coverage) for API endpoints and wedding business context scenarios
- [ ] Playwright tests validating complete API workflows with authentication and business validation  
- [ ] Zero TypeScript errors in testing framework and API validation systems
- [ ] Zero console errors during API testing execution and validation scenarios

### Integration & Performance:
- [ ] Comprehensive API testing coverage including authentication, business context, and error scenarios
- [ ] Performance targets met for API testing execution (<30s full test suite, <2s individual endpoint tests)
- [ ] Business context validation accurate for wedding industry workflows and supplier/couple scenarios
- [ ] Security testing comprehensive with authentication flow and authorization validation
- [ ] Database integration testing ensures data integrity and consistency across API operations

### Evidence Package Required:
- [ ] Screenshot proof of working API testing framework with comprehensive test execution results
- [ ] Test execution reports showing API endpoint coverage, business context validation, and performance metrics
- [ ] API testing performance metrics and load testing results with response time validation
- [ ] Comprehensive test coverage report >80% for API endpoints and wedding business scenarios  
- [ ] Error scenario testing results showing robust error handling and edge case coverage

---

## 💾 WHERE TO SAVE YOUR WORK

### Code Files:
- Testing Framework: `/wedsync/tests/api/`
  - `api-test-framework.ts` - Core API testing framework
  - `auth-context-helpers.ts` - Authentication context management
  - `supplier-api.test.ts` - Supplier endpoint testing
  - `couple-api.test.ts` - Couple endpoint testing
  - `business-context.test.ts` - Wedding business context validation
  - `error-scenarios.test.ts` - Comprehensive error testing
  - `performance.test.ts` - API performance and load testing
- Testing Utilities: `/wedsync/src/lib/testing/`
  - `api-test-client.ts` - API testing client utilities
  - `wedding-context-helpers.ts` - Wedding business context testing utilities
  - `auth-helpers.ts` - Authentication testing utilities
- E2E Tests: `/wedsync/tests/e2e/`
  - `api-workflows.spec.ts` - Complete API workflow testing
  - `wedding-scenarios.spec.ts` - Wedding industry scenario testing

### CRITICAL - Team Reports:
- **Output to:** `/WORKFLOW-V2-DRAFT/OUTBOX/team-e/batch28/WS-196-team-e-round-1-complete.md`
- **Include:** Feature ID (WS-196) AND team identifier in all filenames  
- **Update status:** Add entry to `/WORKFLOW-V2-DRAFT/00-STATUS/feature-tracker.log`:
  ```bash
  echo "$(date '+%Y-%m-%d %H:%M') | WS-196 | ROUND_1_COMPLETE | team-e | batch28" >> /WORKFLOW-V2-DRAFT/00-STATUS/feature-tracker.log
  ```

---

## ⚠️ CRITICAL WARNINGS
- Do NOT modify files assigned to other teams (Team A API routes, Team B infrastructure, Team C documentation)
- Do NOT skip tests - this IS the testing implementation - write comprehensive API validation
- Do NOT ignore security testing requirements - validate authentication and authorization thoroughly
- Do NOT claim completion without evidence of comprehensive API testing framework functionality
- REMEMBER: All 5 teams work in PARALLEL on same features - complete Round 1 before others start Round 2
- CRITICAL: API testing must validate actual wedding business scenarios - use realistic test data and workflows

---

## 🏁 ROUND 1 COMPLETION CHECKLIST
- [ ] E2E API testing framework complete with authentication flow and business context validation
- [ ] Comprehensive API endpoint testing including supplier/couple workflows and wedding industry scenarios
- [ ] Performance testing with load validation, error scenario testing, and database integration verification
- [ ] Tests written and passing >80% coverage for API endpoints and wedding business context validation
- [ ] Security testing comprehensive with authentication flow validation and authorization verification
- [ ] Integration testing contracts defined for Team A API routes, Team B infrastructure, and Team C documentation
- [ ] Testing framework code committed to correct paths with proper API validation organization
- [ ] Round 1 completion report created with evidence package and comprehensive API testing functionality proof

---

END OF ROUND 1 PROMPT - EXECUTE IMMEDIATELY