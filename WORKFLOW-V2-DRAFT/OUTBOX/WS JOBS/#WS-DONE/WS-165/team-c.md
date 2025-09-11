# TEAM C - ROUND 1: WS-165 - Payment Calendar - Integration Services

**Date:** 2025-08-29  
**Feature ID:** WS-165 (Track all work with this ID)  
**Priority:** P1 from roadmap  
**Mission:** Build payment calendar integration with budget systems, notification services, and vendor payment tracking  
**Context:** You are Team C working in parallel with 4 other teams. ALL must complete before next round.

---

## 🎯 USER STORY & WEDDING CONTEXT (CRITICAL - THINK HARD)

**As a:** Wedding couple managing payment deadlines
**I want to:** View upcoming payment due dates on a calendar with automatic reminders
**So that:** I never miss important payment deadlines and can plan cash flow effectively

**Real Wedding Problem This Solves:**
Wedding couples lose track of payment deadlines because they're scattered across different vendor contracts, email confirmations, and handwritten notes. A bride might have a photography deposit due next Tuesday, venue balance due next month, and florist payment due the week before the wedding. The Payment Calendar Integration connects all these scattered payment deadlines with budget categories to show cash flow impact, sends automatic email and SMS reminders, and integrates with existing vendor communication systems so nothing falls through the cracks during the stressful final months.

---

## 🎯 TECHNICAL REQUIREMENTS

**From Technical Specification:**
- Integration with budget categories for payment-to-budget mapping
- Email and SMS notification service integration for payment reminders
- Vendor payment tracking integration with supplier communication systems
- Cash flow planning integration showing payment impact on overall budget
- Cross-system data synchronization for payment status updates
- Integration with existing notification preferences and communication channels

**Technology Stack (VERIFIED):**
- Frontend: Next.js 15 App Router, React 19, Tailwind CSS v4
- UI Library: Untitled UI (MANDATORY - no other component libraries allowed)
- Animations: Magic UI (MANDATORY for all animations)
- Icons: Lucide React (ONLY icon library allowed)
- Database: PostgreSQL via MCP Server (✅ CONNECTED - Direct Supabase access available)
- Backend: Supabase (PostgreSQL 15), Edge Functions
- Testing: Playwright MCP, Vitest

**Integration Points:**
- Team A (Frontend UI): Integration status displays, cross-system data flow
- Team B (Backend APIs): Payment data synchronization, budget category connections
- External Services: Email services (SendGrid), SMS services, budget tracking systems

---

## 📚 STEP 1: LOAD CURRENT DOCUMENTATION (MANDATORY FIRST STEP!)

**⚠️ CRITICAL: Complete this BEFORE any coding or agent work begins!**

```typescript
// 1. LOAD CORRECT UI STYLE GUIDE (MANDATORY FOR ALL UI WORK):
await mcp__Ref__ref_read_url("/WORKFLOW-V2-DRAFT/SAAS-UI-STYLE-GUIDE.md");

// 2. REF MCP - Load latest docs for THIS SPECIFIC TASK:
await mcp__Ref__ref_search_documentation({query: "Next.js 15 third-party service integration patterns"});
await mcp__Ref__ref_search_documentation({query: "Supabase Edge Functions email SMS integration"});
await mcp__Ref__ref_search_documentation({query: "Budget system integration wedding payment tracking"});

// 3. UNDERSTAND EXISTING PATTERNS:
// Use Grep to find similar integration implementations
// Use Read to examine existing notification service code
// Use LS to understand integration service structure
```

**WHY THIS ORDER MATTERS:**
- Ref MCP prevents using deprecated APIs (libraries change frequently!)
- UI Style Guides ensure consistent design patterns
- Understanding existing patterns prevents reinventing solutions
- Teams work with current, accurate knowledge

---

## 🧠 STEP 1.5: SEQUENTIAL THINKING FOR COMPLEX FEATURES (WHEN NEEDED)

**Use Sequential Thinking MCP for complex features requiring structured analysis:**

```typescript
// For complex multi-system integration with payment tracking
mcp__sequential-thinking__sequential_thinking({
  thought: "Payment Calendar integration requires: budget category mapping, notification service connections, vendor payment tracking, cash flow calculations, cross-system synchronization. Need to analyze integration patterns, data flow consistency, and service reliability for critical payment reminders.",
  nextThoughtNeeded: true,
  thoughtNumber: 1,
  totalThoughts: 4
});

// Continue with structured analysis for:
// - Budget system integration architecture and data mapping
// - Notification service reliability and delivery tracking
// - Vendor communication system integration patterns
// - Cross-system data synchronization strategies
```

---

## 🚀 STEP 2: LAUNCH PARALLEL AGENTS (AFTER documentation loaded!)

**NOW that you have current docs, launch agents with specific knowledge:**

1. **task-tracker-coordinator** --think-ultra-hard --with-ref-docs --track-dependencies "Payment calendar integration system architecture"
2. **integration-specialist** --think-ultra-hard --use-loaded-docs --follow-existing-patterns "Budget and notification service integrations" 
3. **wedding-domain-expert** --think-ultra-hard --wedding-context --user-focused "Wedding payment tracking across vendor relationships"
4. **security-compliance-officer** --think-ultra-hard --check-current-best-practices --validate-all-inputs "Third-party payment integration security"
5. **test-automation-architect** --tdd-approach --use-testing-patterns-from-docs --accessibility-first "Integration testing with external services"
6. **playwright-visual-testing-specialist** --accessibility-first --multi-tab --comprehensive-validation "Cross-system integration validation testing"
7. **code-quality-guardian** --check-patterns --match-codebase-style --enforce-conventions "Integration service reliability and error handling"

**AGENT INSTRUCTIONS:** "Use the Ref MCP documentation loaded in Step 1. Follow patterns found in existing code."

**AGENT USAGE TARGET:** >75% of session time in parallel execution

---

## 📋 STEP 3: DEVELOPMENT WORKFLOW (With loaded docs + agents)

### **EXPLORE PHASE (NO CODING!)**
- Read ALL relevant integration and service files first using Read tool
- Understand existing notification patterns and conventions using Grep
- Check integration points with budget and vendor systems with LS and Read
- Review similar integration implementations thoroughly
- Continue until you FULLY understand the integration architecture

### **PLAN PHASE (THINK ULTRA HARD!)**
- Create detailed implementation plan for payment integrations
- Write test cases FIRST (TDD approach)
- Plan error handling and edge cases for service failures
- Consider reliability and fallback patterns for critical reminders
- Plan integration monitoring and health check systems

### **CODE PHASE (PARALLEL AGENTS!)**
- Write tests before implementation (TDD mandatory)
- Follow existing patterns from loaded documentation
- Use Ref MCP examples as templates
- Implement with parallel agents working together
- Focus on completeness and quality over speed

### **COMMIT PHASE (VERIFY EVERYTHING!)**
- Run all tests and ensure 100% pass rate
- Verify with Playwright comprehensive testing
- Create complete evidence package
- Generate detailed reports with metrics
- Only mark complete when ACTUALLY complete with proof

---

## 🎯 SPECIFIC DELIVERABLES FOR THIS ROUND

### Round 1 (Core Integration Implementation):
- [ ] BudgetIntegrationService for payment-to-budget category mapping (`/wedsync/src/lib/integrations/budget-integration.ts`)
- [ ] NotificationService for payment reminder emails and SMS (`/wedsync/src/lib/integrations/notification-service.ts`) 
- [ ] VendorPaymentSync for supplier payment tracking integration (`/wedsync/src/lib/integrations/vendor-payment-sync.ts`)
- [ ] CashFlowCalculator for budget impact analysis (`/wedsync/src/lib/integrations/cash-flow-calculator.ts`)
- [ ] Integration health monitoring dashboard component (`/wedsync/src/components/integrations/IntegrationHealth.tsx`)
- [ ] Unit tests with >85% coverage requirement (`/wedsync/tests/integrations/payment-integrations.test.ts`)
- [ ] Integration testing with mock services (`/wedsync/tests/integration/payment-services.test.ts`)

### Round 2 (Enhancement & Polish):
- [ ] Enhanced error handling and service fallback patterns
- [ ] Advanced integration monitoring and alerting
- [ ] Performance optimization with service response metrics
- [ ] Additional test coverage >90%
- [ ] Advanced integration testing scenarios with service failures

### Round 3 (Integration & Finalization):
- [ ] Full integration with all team outputs
- [ ] Complete E2E testing with evidence
- [ ] Performance validation with benchmarks
- [ ] Documentation updates with examples
- [ ] Production readiness validation

## 🔗 DEPENDENCIES

### What you NEED from other teams:
- FROM Team B: Payment schedule API data structures - Required for budget integration mapping
- FROM Team A: Integration status display requirements - Dependency for health monitoring UI

### What other teams NEED from you:
- TO Team A: Budget integration data for calendar display - They need financial planning context
- TO Team D: Mobile notification integration for WedMe - Blocking their payment reminder features

## 🔒 SECURITY REQUIREMENTS (NON-NEGOTIABLE)

### 🚨 CRITICAL SECURITY IMPLEMENTATION

**EVERY integration service MUST use secure patterns:**

```typescript
// ✅ ALWAYS DO THIS (MANDATORY PATTERN):
import { SecureIntegrationConfig } from '@/lib/security/integration-config';
import { validateServiceResponse } from '@/lib/security/service-validation';

export class NotificationService {
  private config: SecureIntegrationConfig;
  
  async sendPaymentReminder(data: ValidatedPaymentData) {
    const sanitizedData = await this.sanitizePaymentData(data);
    const response = await this.externalService.send(sanitizedData);
    return validateServiceResponse(response);
  }
}
```

### MANDATORY SECURITY CHECKLIST:
- [ ] **Service Authentication**: Secure API key management for all third-party services
- [ ] **Data Sanitization**: Sanitize payment data before sending to external services
- [ ] **Response Validation**: Validate all responses from third-party services
- [ ] **CSRF Protection**: Automatic via middleware - DO NOT disable
- [ ] **Service Rate Limiting**: Implement rate limiting for external service calls
- [ ] **Payment Data Encryption**: Encrypt sensitive payment data in transit
- [ ] **Integration Logging**: Audit all integration service interactions
- [ ] **Error Handling**: NEVER expose third-party service credentials in errors

---

## 🎭 REVOLUTIONARY PLAYWRIGHT MCP TESTING (MANDATORY)

**🧠 INTEGRATION AND SERVICE VALIDATION:**

```javascript
// 1. INTEGRATION SERVICE TESTING
await mcp__playwright__browser_navigate({url: "http://localhost:3000/integrations/payment-status"});
const integrationStatus = await mcp__playwright__browser_snapshot();

// 2. NOTIFICATION SERVICE TESTING
const notificationTest = await mcp__playwright__browser_evaluate({
  function: `() => ({
    emailNotifications: document.querySelectorAll('[data-testid="email-notification"]').length,
    smsNotifications: document.querySelectorAll('[data-testid="sms-notification"]').length,
    budgetIntegrations: document.querySelectorAll('[data-testid="budget-integration"]').length,
    serviceHealth: document.querySelector('[data-testid="service-health"]')?.textContent
  })`
});

// 3. BUDGET INTEGRATION VALIDATION
await mcp__playwright__browser_click({
  element: "Budget integration test button",
  ref: "[data-testid='budget-integration-test']"
});

// 4. SERVICE FAILURE RECOVERY TESTING
const failoverTest = await mcp__playwright__browser_evaluate({
  function: `() => ({
    primaryServiceStatus: document.querySelector('[data-testid="primary-service"]')?.textContent,
    fallbackServiceStatus: document.querySelector('[data-testid="fallback-service"]')?.textContent,
    recoveryTime: document.querySelector('[data-testid="recovery-time"]')?.textContent
  })`
});
```

**REQUIRED TEST COVERAGE:**
- [ ] Budget category integration validation
- [ ] Notification service delivery confirmation
- [ ] Vendor payment sync accuracy testing
- [ ] Service failure and recovery scenarios
- [ ] Cross-system data consistency validation
- [ ] Integration health monitoring accuracy

---

## ✅ SUCCESS CRITERIA (NON-NEGOTIABLE)

**You CANNOT claim completion unless:**

### Technical Implementation:
- [ ] All deliverables for this round 100% complete
- [ ] Tests written FIRST and passing with >85% coverage
- [ ] Integration tests validating all service connections
- [ ] Zero TypeScript errors (run npm run typecheck)
- [ ] All external service integrations working

### Integration & Performance:
- [ ] All integration points working perfectly with Team A and B outputs
- [ ] Performance targets met (<500ms integration response, reliable notifications)
- [ ] Service reliability validated with failover testing
- [ ] Security requirements 100% implemented
- [ ] Budget integration accuracy verified

### Evidence Package Required:
- [ ] Integration service testing results with all tests passing
- [ ] Notification delivery confirmation proof
- [ ] Budget integration accuracy evidence
- [ ] Service failure recovery testing proof
- [ ] Security validation proof
- [ ] Test coverage report >85%
- [ ] TypeScript compilation success proof

---

## 💾 WHERE TO SAVE YOUR WORK

### Code Files:
- Integration Services: `/wedsync/src/lib/integrations/`
- Integration Components: `/wedsync/src/components/integrations/`
- Tests: `/wedsync/tests/integrations/`
- Types: `/wedsync/src/types/integrations.ts`
- Configuration: `/wedsync/src/config/integrations.ts`

### CRITICAL - Team Reports:
- **Output to:** `/WORKFLOW-V2-DRAFT/OUTBOX/WS JOBS/WS-165/team-c-complete.md`
- **Include:** Feature ID (WS-165) AND team identifier in all filenames
- **Update status:** Add entry to `/WORKFLOW-V2-DRAFT/00-STATUS/feature-tracker.log`

---

## 📝 TEAM OUTPUT REQUIRED AT END OF ROUND

### CRITICAL: Use Standard Team Output Template
**Must include ALL sections with detailed evidence**

### MANDATORY SECTIONS:
1. **Executive Summary** (2-3 paragraphs with metrics)
2. **Technical Implementation Details** (with code examples)
3. **Testing Evidence** (with actual test results)
4. **Performance Metrics** (with measured values)
5. **Integration Points** (with specific API contracts)
6. **Security Validation** (with checklist completion)
7. **Evidence Package** (screenshots, videos, reports)
8. **Next Steps** (for following rounds)

---

## ⚠️ CRITICAL WARNINGS

- Do NOT modify files assigned to other teams
- Do NOT skip tests - write them FIRST
- Do NOT ignore security requirements
- Do NOT claim completion without evidence
- Do NOT use forbidden UI libraries (only Untitled UI + Magic UI)
- REMEMBER: All 5 teams work in parallel on SAME feature
- WAIT: Do not start next round until ALL teams complete current round

---

END OF TEMPLATE STRUCTURE