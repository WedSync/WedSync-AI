# TEAM C - ROUND 1: WS-196 - API Routes Structure - API Documentation System

**Date:** 2025-01-20  
**Feature ID:** WS-196 (Track all work with this ID)  
**Priority:** P0 from roadmap  
**Mission:** Build comprehensive API documentation system with interactive endpoint explorer, developer integration guides, and automated documentation generation for wedding industry API patterns  
**Context:** You are Team C working in parallel with 4 other teams. ALL must complete before next round.

---

## 🎯 USER STORY & WEDDING CONTEXT (CRITICAL - THINK HARD)

**As a:** Third-party integration developer connecting to WedSync API for wedding vendor services
**I want to:** Access comprehensive API documentation with interactive testing, clear parameter examples, authentication guides, and wedding industry business context  
**So that:** I can successfully integrate photography studio booking systems with WedSync client management, connect venue availability systems to couple planning workflows, and build custom CRM integrations that understand wedding-specific data structures and supplier coordination patterns

**Real Wedding Problem This Solves:**
A photography studio needs to integrate their existing booking system with WedSync to automatically sync client information for 15 couples with weddings scheduled over 6 months. The API documentation system provides clear examples of `/api/suppliers/{id}/clients` endpoint usage, authentication patterns, parameter validation, and response structures specific to wedding coordination data. Meanwhile, a venue's custom CRM developer can find documented endpoints for checking availability (`/api/suppliers/venues/{venueId}/availability`) with wedding-specific parameters like guest count, seasonal pricing, and ceremony requirements, enabling seamless integration between venue management and couple planning systems.

---

## 🎯 TECHNICAL REQUIREMENTS

**From Technical Specification:**
- API documentation system with interactive endpoint explorer, real-time testing capabilities, and wedding industry context
- Developer integration guides with authentication examples, parameter validation, and business context explanations
- Automated documentation generation from API route patterns with OpenAPI specification compliance
- Interactive API testing interface with authentication context switching and response schema validation
- Wedding industry specific examples with supplier/couple workflows and third-party integration patterns

**Technology Stack (VERIFIED):**
- Frontend: Next.js 15 App Router, React 19, Tailwind CSS v4
- Database: PostgreSQL via MCP Server (✅ CONNECTED - Direct Supabase access available)
- Backend: Supabase (PostgreSQL 15), Edge Functions
- Testing: Playwright MCP, Browser MCP, Vitest
- Documentation: OpenAPI specification, interactive API explorer, automated schema generation

**Integration Points:**
- Team A API Routes: Route handler patterns and validation schemas from backend API implementation
- Team B Infrastructure: API logging, monitoring data, and performance metrics for documentation
- Team D Developer Tools: Developer interface components and API testing tools integration
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

// 4. REVIEW existing API patterns and documentation structures:
await mcp__serena__find_symbol("APIDocumentation", "", true);
await mcp__serena__get_symbols_overview("src/app/api");
```

---

## 🚀 STEP 2: LAUNCH PARALLEL AGENTS (AFTER documentation loaded!)

1. **task-tracker-coordinator** --think-hard --with-ref-mcp-docs "Track API documentation system development with interactive testing capabilities"
2. **api-architect** --think-hard --use-loaded-docs "Build comprehensive API documentation with wedding industry context and developer guides" 
3. **nextjs-fullstack-developer** --think-ultra-hard --follow-existing-patterns "Create interactive API explorer with authentication and testing functionality"
4. **security-compliance-officer** --think-ultra-hard --check-current-best-practices "Validate API documentation security and developer access controls"
5. **test-automation-architect** --tdd-approach --use-testing-patterns-from-docs "Design comprehensive testing for API documentation and interactive explorer"
6. **playwright-visual-testing-specialist** --accessibility-first --multi-tab "Test API documentation with developer workflows and testing interfaces" --use-browser-mcp
7. **code-quality-guardian** --check-patterns --match-codebase-style "Ensure documentation follows established API standards and developer experience patterns"

---

## 📋 STEP 3: DEVELOPMENT WORKFLOW (With loaded docs + agents)

### **EXPLORE PHASE (NO CODING!)**
- Read existing API route patterns and documentation structures
- Understand wedding industry API requirements and business context patterns
- Check integration patterns with authentication systems and developer tools
- Review similar implementations in API documentation and interactive testing tools
- Continue until you FULLY understand the API documentation architecture and developer experience

### **PLAN PHASE (THINK HARD!)**
- Create detailed implementation plan for API documentation system with interactive testing
- Write test cases FIRST (TDD) for documentation components, API explorer, and developer workflows
- Plan error handling for API testing failures, authentication errors, and schema validation issues
- Consider edge cases like invalid API endpoints, authentication timeouts, and malformed requests
- Design developer-focused interface optimized for integration workflows and testing scenarios

### **CODE PHASE (PARALLEL AGENTS!)**
- Write tests before implementation for documentation components and interactive API explorer
- Follow existing API documentation patterns and developer experience standards
- Use Ref MCP examples for API documentation layouts, interactive testing, and schema generation
- Implement with parallel agents focusing on accurate API documentation and developer usability
- Focus on developer experience completeness and API accuracy, not development speed

### **COMMIT PHASE (VERIFY EVERYTHING!)**
- Run all tests including API documentation tests and interactive explorer functionality
- Verify with Playwright for developer workflows, API testing scenarios, and responsive design
- Create evidence package showing documentation accuracy, API explorer functionality, and developer guides
- Generate reports on API documentation completeness, testing interface usability, and integration examples
- Only mark complete when API documentation system provides comprehensive developer experience

---

## 🎯 SPECIFIC DELIVERABLES FOR ROUND 1

### Core Implementation:
- [ ] **APIDocumentation component** with comprehensive endpoint listing, parameter documentation, and wedding industry context
- [ ] **APIExplorer component** with interactive endpoint testing, authentication context switching, and real-time response validation
- [ ] **EndpointDocumentation component** showing individual API route details with parameter examples and response schemas
- [ ] **AuthenticationGuide component** with authentication flow documentation and developer integration examples
- [ ] **SchemaViewer component** displaying request/response schemas with validation rules and wedding business context
- [ ] **CodeExamples component** with language-specific integration examples and supplier/couple workflow patterns
- [ ] **APITesting component** with real-time API endpoint testing and response validation functionality
- [ ] **Developer navigation** with categorized API endpoints and search functionality for efficient documentation browsing
- [ ] **Unit tests >80% coverage** for all documentation components with API schema validation and testing scenarios
- [ ] **Basic Playwright tests** for API explorer functionality, authentication flows, and responsive developer interface

### Documentation Features:
- [ ] **Interactive API endpoint testing** with parameter input, authentication token management, and response display
- [ ] **Wedding industry API context** with supplier/couple specific examples and business workflow documentation
- [ ] **Developer integration guides** with authentication setup, error handling patterns, and best practices
- [ ] **Automated schema generation** from existing API routes with validation rules and parameter documentation

### Database Integration:
- [ ] **Supabase integration** for api_route_configs, api_business_contexts, api_versions, api_request_logs tables
- [ ] **API metadata fetching** with route discovery, business context loading, and usage analytics
- [ ] **Documentation data management** with error handling and loading states for developer interface

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
- FROM Team A: API route handler patterns and validation schemas - Required for accurate documentation generation
- FROM Team B: API infrastructure monitoring data and performance metrics - Required for comprehensive API documentation  
- FROM Team D: Developer tools components and testing interfaces - Required for enhanced API explorer functionality

### What other teams NEED from you:
- TO Team A: API documentation requirements and schema structure - They need this for consistent route implementation
- TO Team B: API logging requirements and monitoring specifications - Required for their infrastructure monitoring
- TO Team E: API documentation test interfaces and validation scenarios - Required for their comprehensive testing framework

---

## 🔒 SECURITY REQUIREMENTS (NON-NEGOTIABLE)

### MANDATORY SECURITY IMPLEMENTATION FOR API DOCUMENTATION

**EVERY documentation component MUST use the security framework at `/src/lib/validation/` and `/src/lib/security/`:**

```typescript
// ✅ ALWAYS DO THIS (MANDATORY PATTERN FOR API DOCUMENTATION):
import { withSecureDeveloperAccess } from '@/lib/validation/middleware';
import { apiDocumentationSchema } from '@/lib/validation/schemas';

// API documentation with proper developer access security
export const APIDocumentation = withSecureDeveloperAccess(
  ['developer', 'admin'], // Required roles for API documentation access
  async (user: DeveloperUser) => {
    // User is validated developer with API documentation access
    // Documentation implementation here
  }
);
```

### SECURITY CHECKLIST FOR API DOCUMENTATION

Teams MUST implement ALL of these for EVERY documentation component:

- [ ] **Developer Authentication**: Use existing middleware with developer role validation for API access
- [ ] **API Documentation Access Control**: MANDATORY role-based access for comprehensive API documentation
- [ ] **Rate Limiting**: API testing calls must respect developer tier rate limits - DO NOT bypass
- [ ] **CSRF Protection**: All API testing forms use CSRF tokens - automatic via middleware
- [ ] **Input Sanitization**: All API example data uses proper validation - see `/src/lib/security/input-validation.ts`
- [ ] **Audit Logging**: All API documentation access and testing logged - use existing audit framework
- [ ] **Session Security**: Developer sessions have proper timeout and API access validation
- [ ] **Error Handling**: NEVER expose internal API implementation details or sensitive system information

---

## 🎭 REVOLUTIONARY PLAYWRIGHT MCP TESTING (MANDATORY)

```javascript
// API documentation testing with interactive explorer validation
await mcp__playwright__browser_navigate({url: "http://localhost:3000/developers/api-docs"});
const documentationStructure = await mcp__playwright__browser_snapshot();

// Test API endpoint discovery and documentation browsing
await mcp__playwright__browser_click({
  element: "suppliers endpoints section",
  ref: "[data-testid='api-section-suppliers']"
});

await mcp__playwright__browser_wait_for({text: "Supplier Client Management"});

// Test interactive API explorer with authentication
await mcp__playwright__browser_click({
  element: "test api endpoint button", 
  ref: "[data-testid='test-endpoint-btn']"
});

// Fill in API testing parameters
await mcp__playwright__browser_type({
  element: "supplier ID parameter",
  ref: "[data-testid='param-supplier-id']",
  text: "550e8400-e29b-41d4-a716-446655440000"
});

await mcp__playwright__browser_click({
  element: "execute API test button",
  ref: "[data-testid='execute-test-btn']"
});

await mcp__playwright__browser_wait_for({text: "Response received"});

// Verify API response display and validation
const apiTestResult = await mcp__playwright__browser_evaluate({
  function: `() => ({
    responseStatus: document.querySelector('[data-testid="response-status"]')?.textContent,
    responseTime: document.querySelector('[data-testid="response-time"]')?.textContent,
    responseBody: document.querySelector('[data-testid="response-body"]')?.textContent,
    validationResult: document.querySelector('[data-testid="validation-result"]')?.textContent
  })`
});

// Test responsive design for developer workflows
for (const width of [1200, 1440, 1920]) {
  await mcp__playwright__browser_resize({width, height: 900});
  await mcp__playwright__browser_take_screenshot({filename: `api-docs-${width}px.png`});
}
```

**REQUIRED TEST COVERAGE:**
- [ ] API documentation browsing with endpoint discovery and parameter examples (accessibility tree validation)
- [ ] Interactive API explorer with authentication flow and real-time testing (complex developer workflow)
- [ ] API schema validation with request/response structure verification (data integrity testing)
- [ ] Developer integration guides with code examples and authentication setup (documentation completeness)
- [ ] Zero console errors during API documentation interactions and testing scenarios (error monitoring)
- [ ] Responsive design optimized for developer workflows and integration scenarios (1200px+)


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
- [ ] All Round 1 deliverables complete with API documentation system and interactive explorer functionality
- [ ] Tests written FIRST and passing (>80% coverage) for documentation components and API testing functionality
- [ ] Playwright tests validating API explorer workflows and developer documentation accuracy  
- [ ] Zero TypeScript errors in documentation components and API integration systems
- [ ] Zero console errors during API documentation interactions and interactive testing scenarios

### Integration & Performance:
- [ ] Real-time integration with API routes for documentation generation and testing functionality
- [ ] Performance targets met (<2s documentation load, <1s API testing response display)
- [ ] Accessibility validation passed for API documentation and interactive developer interface
- [ ] Security requirements met with developer access control and API testing session management
- [ ] Responsive design works optimally for developer workflows and integration scenarios (1200px+)

### Evidence Package Required:
- [ ] Screenshot proof of working API documentation system with interactive explorer functionality
- [ ] Playwright test results showing API testing workflows and documentation browsing
- [ ] Performance metrics for documentation load times and API testing response times
- [ ] Console error-free proof during API documentation interactions and developer workflows  
- [ ] Test coverage report >80% for documentation components and interactive API explorer

---

## 💾 WHERE TO SAVE YOUR WORK

### Code Files:
- Frontend: `/wedsync/src/components/developer/`
  - `APIDocumentation.tsx` - Main API documentation interface
  - `APIExplorer.tsx` - Interactive API endpoint testing
  - `EndpointDocumentation.tsx` - Individual endpoint details
  - `AuthenticationGuide.tsx` - Developer authentication guide
  - `SchemaViewer.tsx` - API schema visualization
  - `CodeExamples.tsx` - Integration code examples
  - `APITesting.tsx` - Real-time API testing interface
- API Logic: `/wedsync/src/lib/api-docs/`
  - `documentation-generator.ts` - Automated API docs generation
  - `schema-extractor.ts` - API schema extraction utilities
  - `testing-client.ts` - API testing functionality
- Tests: `/wedsync/tests/api-docs/`
  - `api-documentation.test.tsx` - Documentation component tests
  - `api-explorer.test.ts` - Interactive testing functionality tests
- E2E Tests: `/wedsync/tests/e2e/`
  - `api-documentation.spec.ts` - Developer workflow tests

### CRITICAL - Team Reports:
- **Output to:** `/WORKFLOW-V2-DRAFT/OUTBOX/team-c/batch28/WS-196-team-c-round-1-complete.md`
- **Include:** Feature ID (WS-196) AND team identifier in all filenames  
- **Update status:** Add entry to `/WORKFLOW-V2-DRAFT/00-STATUS/feature-tracker.log`:
  ```bash
  echo "$(date '+%Y-%m-%d %H:%M') | WS-196 | ROUND_1_COMPLETE | team-c | batch28" >> /WORKFLOW-V2-DRAFT/00-STATUS/feature-tracker.log
  ```

---

## ⚠️ CRITICAL WARNINGS
- Do NOT modify files assigned to other teams (Team A API routes, Team B infrastructure)
- Do NOT skip tests - write them FIRST before documentation implementation
- Do NOT ignore developer security requirements - use existing security middleware for API access
- Do NOT claim completion without evidence of working API documentation and interactive testing
- REMEMBER: All 5 teams work in PARALLEL on same features - complete Round 1 before others start Round 2
- CRITICAL: API documentation must accurately reflect actual API implementation - verify with Team A patterns

---

## 🏁 ROUND 1 COMPLETION CHECKLIST
- [ ] API documentation system complete with comprehensive endpoint listing and wedding industry context
- [ ] Interactive API explorer with real-time testing, authentication flows, and response validation
- [ ] Developer integration guides with code examples, authentication setup, and best practices
- [ ] Tests written FIRST and passing >80% coverage for documentation functionality and API testing
- [ ] Security validation with developer access control and API testing session management
- [ ] Integration contracts defined for Team A API patterns and Team B infrastructure monitoring
- [ ] Documentation code committed to correct paths with proper developer experience organization
- [ ] Round 1 completion report created with evidence package and API documentation functionality proof

---

END OF ROUND 1 PROMPT - EXECUTE IMMEDIATELY