# TEAM C - ROUND 1: WS-013 - Security Enhancement - Multi-Factor Auth & Encryption (P0 CRITICAL!)

**Date:** 2025-01-21  
**Feature ID:** WS-013 (Track all work with this ID)
**Priority:** P0 CRITICAL from roadmap  
**Mission:** Implement comprehensive security foundation including multi-factor authentication, end-to-end encryption, and secure session management for all wedding data  
**Context:** You are Team C working in parallel with 4 other teams. ALL must complete before next round.

---

## 🎯 USER STORY & WEDDING CONTEXT (CRITICAL - THINK HARD)

**As a:** Wedding couple and vendor
**I want to:** Know that my personal wedding details, financial information, and private communications are completely secure and encrypted
**So that:** I can trust the platform with sensitive information like guest lists, budgets, contracts, and personal preferences

**Real Wedding Problem This Solves:**
Wedding data is extremely sensitive - guest lists with addresses, budget details, vendor contracts, personal preferences, family dynamics. A security breach would be devastating for couples and vendors. This security foundation ensures all wedding coordination data is protected with enterprise-grade security that couples and vendors can trust.

---

## 🎯 TECHNICAL REQUIREMENTS

**From Technical Specification:**
- Multi-factor authentication (MFA) with TOTP/SMS
- End-to-end encryption for sensitive data
- Secure session management with token rotation
- Role-based access control (RBAC)
- Audit logging for all security events
- Encryption at rest and in transit
- Secure password policies
- OAuth integration for vendor systems

**Technology Stack (VERIFIED):**
- Frontend: Next.js 15 App Router, React 19, Tailwind CSS v4
- UI Components: Untitled UI + Magic UI (NO Radix/shadcn!)
- Backend: Supabase Auth + Row Level Security (RLS)
- Encryption: Web Crypto API, libsodium
- MFA: TOTP libraries, SMS providers
- Testing: Playwright MCP, Vitest
- Security: OWASP best practices

**Integration Points:**
- [All Teams]: Security middleware for all features
- [Team E Round 1]: Secure notification delivery
- [Team D Round 1]: Secure payment processing
- [Database]: All tables require RLS policies

---

## 📚 STEP 1: LOAD CURRENT DOCUMENTATION (MANDATORY FIRST STEP!)

**⚠️ CRITICAL: Complete this BEFORE any coding or agent work begins!**

```typescript
// 1. LOAD UI STYLE GUIDES (MANDATORY FOR ALL UI WORK):
await mcp__serena__read_file("/WORKFLOW-V2-DRAFT/SAAS-UI-STYLE-GUIDE.md"); // Untitled UI + Magic UI
// CRITICAL: This uses Untitled UI + Magic UI components ONLY - NO Radix/shadcn!

// 2. CONTEXT7 MCP - Load latest docs for THIS SPECIFIC TASK:
await mcp__context7__resolve-library-id("supabase");
await mcp__context7__get-library-docs("/supabase/supabase", "auth-ssr row-level-security mfa", 5000);
await mcp__context7__get-library-docs("/vercel/next.js", "middleware authentication security", 3000);
await mcp__context7__get-library-docs("/owasp/security", "web-security encryption best-practices", 2000);

// 3. SERENA MCP - Initialize codebase intelligence:
await mcp__serena__activate_project("/Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync");
await mcp__serena__switch_modes(["editing", "interactive"]);
await mcp__serena__check_onboarding_performed();

// 4. REVIEW existing security patterns:
await mcp__serena__find_symbol("Auth", "", true);
await mcp__serena__find_symbol("Security", "", true);
await mcp__serena__search_for_pattern("auth|security|encryption|middleware");

// NOW you have current docs + codebase context. Agents can work intelligently!
```

**WHY THIS ORDER MATTERS:**
- Context7 ensures latest security practices (security evolves rapidly!)
- Serena shows existing auth patterns to enhance
- Agents work with current security knowledge

---

## 🚀 STEP 2: LAUNCH PARALLEL AGENTS (AFTER documentation loaded!)

**NOW that you have current docs, launch agents with specific knowledge:**

1. **task-tracker-coordinator** --think-hard --with-context7-docs "Implement comprehensive security foundation"
2. **security-compliance-officer** --think-ultra-hard --use-loaded-docs "Build enterprise-grade authentication and encryption"
3. **supabase-specialist** --think-ultra-hard --follow-existing-patterns "Configure RLS and advanced auth"
4. **integration-specialist** --think-hard --oauth-vendors "Implement secure vendor integrations"
5. **test-automation-architect** --security-first --test-auth-flows
6. **playwright-visual-testing-specialist** --accessibility-first --test-security-ui
7. **code-quality-guardian** --security-patterns --audit-code-security

**AGENT INSTRUCTIONS:** "Use Context7 security docs. This is P0 CRITICAL - ALL teams depend on this foundation."

**AGENT USAGE TARGET:** >75% of session time in parallel execution

---

## 📋 STEP 3: DEVELOPMENT WORKFLOW (With loaded docs + agents)

### **EXPLORE PHASE (NO CODING!)**
- Review existing authentication implementation
- Study Supabase Auth and RLS documentation
- Research MFA implementation patterns
- Check encryption requirements for wedding data
- Continue until you FULLY understand security architecture

### **PLAN PHASE (THINK HARD!)**
- Design comprehensive security architecture
- Plan MFA user experience flows
- Design encryption strategy for sensitive data
- Plan RBAC for different user types
- Don't rush - security mistakes are costly

### **CODE PHASE (PARALLEL AGENTS!)**
- Write security tests FIRST (critical for security)
- Implement MFA with great UX
- Build encryption layer for sensitive data
- Create secure middleware for all routes
- Focus on security AND usability

### **COMMIT PHASE (VERIFY EVERYTHING!)**
- Run extensive security penetration tests
- Validate encryption implementation
- Test MFA flows thoroughly
- Verify with Playwright
- Only mark complete when SECURITY AUDIT PASSED

---

## 🎯 SPECIFIC DELIVERABLES FOR THIS ROUND

### Round 1 (Security Foundation):
- [ ] Multi-factor authentication (TOTP + SMS backup)
- [ ] End-to-end encryption for sensitive wedding data
- [ ] Secure session management with token rotation
- [ ] Role-based access control for all user types
- [ ] Security middleware for all API routes
- [ ] Comprehensive audit logging
- [ ] Secure password policies and validation
- [ ] Security test suite with penetration testing

---

## 🔗 DEPENDENCIES

### What you NEED from other teams:
- NONE - This is the foundation that others build on

### What other teams NEED from you:
- TO All Teams: Security middleware and authentication foundation
- TO Team E: Secure notification delivery mechanisms
- TO Team D: Secure payment processing foundation
- TO Team A: Secure WebSocket authentication

## 🔒 SECURITY REQUIREMENTS (NON-NEGOTIABLE)
- [ ] OWASP Top 10 vulnerabilities prevented
- [ ] Encryption meets AES-256 standards
- [ ] MFA implementation follows RFC 6238
- [ ] Session tokens rotate on privilege escalation
- [ ] All database queries use parameterized queries
- [ ] Rate limiting prevents brute force attacks
- [ ] Audit logs are tamper-proof

---

## 🎭 REVOLUTIONARY PLAYWRIGHT MCP TESTING (MANDATORY)

**🧠 COMPREHENSIVE SECURITY TESTING:**

```javascript
// SECURITY PENETRATION TESTING

// 1. TEST MFA AUTHENTICATION FLOW
await mcp__playwright__browser_navigate({url: "http://localhost:3000/auth/login"});

// Standard login
await mcp__playwright__browser_type({
  element: "Email input", ref: "input[data-testid='email']",
  text: "test@wedding.com"
});

await mcp__playwright__browser_type({
  element: "Password input", ref: "input[data-testid='password']",
  text: "SecurePassword123!"
});

await mcp__playwright__browser_click({
  element: "Login button", ref: "button[data-testid='login']"
});

// Should redirect to MFA
await mcp__playwright__browser_wait_for({text: "Enter verification code", time: 5});

// Test TOTP verification
await mcp__playwright__browser_type({
  element: "MFA code input", ref: "input[data-testid='mfa-code']",
  text: "123456"
});

await mcp__playwright__browser_click({
  element: "Verify button", ref: "button[data-testid='verify-mfa']"
});

// 2. TEST ENCRYPTION OF SENSITIVE DATA
const encryptionTest = await mcp__playwright__browser_evaluate({
  function: `() => {
    // Test client-side encryption
    const sensitiveData = {
      guestList: ['John Doe', 'Jane Smith'],
      budget: 50000,
      specialRequests: 'Gluten-free catering'
    };
    
    return fetch('/api/test/encryption', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(sensitiveData)
    }).then(r => r.json()).then(result => ({
      encrypted: result.encrypted,
      decrypted: result.decrypted,
      matches: JSON.stringify(result.decrypted) === JSON.stringify(sensitiveData)
    }));
  }`
});

// 3. TEST SESSION SECURITY
const sessionTest = await mcp__playwright__browser_evaluate({
  function: `() => {
    // Test session token rotation
    const originalToken = localStorage.getItem('auth-token');
    
    return fetch('/api/auth/elevate-privileges', {
      method: 'POST',
      headers: {'Authorization': 'Bearer ' + originalToken}
    }).then(r => r.json()).then(result => {
      const newToken = localStorage.getItem('auth-token');
      return {
        tokenRotated: originalToken !== newToken,
        privilegesElevated: result.success,
        tokenValid: newToken && newToken.length > 0
      };
    });
  }`
});

// 4. TEST ROLE-BASED ACCESS CONTROL
const rbacTest = await mcp__playwright__browser_evaluate({
  function: `() => {
    const testCases = [
      {role: 'client', endpoint: '/api/vendor/admin', shouldFail: true},
      {role: 'vendor', endpoint: '/api/client/private', shouldFail: true},
      {role: 'planner', endpoint: '/api/wedding/manage', shouldFail: false},
      {role: 'client', endpoint: '/api/wedding/own', shouldFail: false}
    ];
    
    return Promise.all(testCases.map(test => 
      fetch(test.endpoint, {
        headers: {'X-Test-Role': test.role}
      }).then(r => ({
        endpoint: test.endpoint,
        role: test.role,
        status: r.status,
        shouldFail: test.shouldFail,
        correct: test.shouldFail ? r.status >= 400 : r.status < 400
      }))
    ));
  }`
});

// 5. TEST SECURITY VULNERABILITIES
const vulnerabilityTests = await mcp__playwright__browser_evaluate({
  function: `() => {
    const tests = {
      sqlInjection: "'; DROP TABLE users; --",
      xssAttempt: "<script>alert('xss')</script>",
      pathTraversal: "../../../../etc/passwd",
      largePayload: "A".repeat(1000000)
    };
    
    return Promise.all(Object.entries(tests).map(([testName, payload]) =>
      fetch('/api/security/test', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({test: testName, payload})
      }).then(r => ({
        test: testName,
        blocked: r.status === 400 || r.status === 422,
        status: r.status
      }))
    ));
  }`
});

// 6. TEST AUDIT LOGGING
await mcp__playwright__browser_navigate({url: "http://localhost:3000/admin/audit"});

const auditTest = await mcp__playwright__browser_evaluate({
  function: `() => {
    // Perform auditable action
    return fetch('/api/wedding/sensitive-action', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({action: 'view-budget'})
    }).then(() => 
      // Check if audit log was created
      fetch('/api/admin/audit/recent')
        .then(r => r.json())
        .then(logs => ({
          logCreated: logs.some(log => log.action === 'view-budget'),
          logCount: logs.length,
          hasTimestamp: logs[0] && logs[0].timestamp,
          hasUser: logs[0] && logs[0].user_id
        }))
    );
  }`
});

// 7. TEST RATE LIMITING
const rateLimitTest = await mcp__playwright__browser_evaluate({
  function: `() => {
    // Attempt multiple rapid requests
    const requests = Array.from({length: 20}, () => 
      fetch('/api/auth/login', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({email: 'test@test.com', password: 'wrong'})
      })
    );
    
    return Promise.all(requests).then(responses => ({
      totalRequests: responses.length,
      rateLimited: responses.some(r => r.status === 429),
      firstRequestStatus: responses[0].status,
      lastRequestStatus: responses[responses.length - 1].status
    }));
  }`
});
```

**REQUIRED TEST COVERAGE:**
- [ ] MFA authentication flow works perfectly
- [ ] Encryption/decryption preserves data integrity
- [ ] Session tokens rotate on privilege changes
- [ ] RBAC blocks unauthorized access
- [ ] Common vulnerabilities are blocked
- [ ] Audit logs capture all security events
- [ ] Rate limiting prevents abuse

---

## ✅ SUCCESS CRITERIA (NON-NEGOTIABLE)

**You CANNOT claim completion unless:**

### Security Implementation:
- [ ] MFA implementation complete and user-friendly
- [ ] Encryption working for all sensitive data
- [ ] RBAC enforcing proper access controls
- [ ] Security tests written FIRST and passing (>95% coverage)
- [ ] Playwright tests validating security flows
- [ ] Zero security vulnerabilities in audit
- [ ] Zero TypeScript errors

### Security Validation:
- [ ] Penetration testing passed
- [ ] OWASP Top 10 vulnerabilities prevented
- [ ] Performance impact <100ms per request
- [ ] All teams can integrate securely
- [ ] Audit logging captures all events

### Evidence Package Required:
- [ ] Security audit report (CLEAN)
- [ ] MFA user flow demonstration
- [ ] Encryption performance benchmarks
- [ ] Penetration test results
- [ ] RBAC validation matrix

---

## 💾 WHERE TO SAVE YOUR WORK

### Code Files:
- Authentication: `/wedsync/src/lib/auth/`
- Encryption: `/wedsync/src/lib/security/encryption/`
- Middleware: `/wedsync/src/middleware/security/`
- RBAC: `/wedsync/src/lib/rbac/`
- Tests: `/wedsync/__tests__/security/`
- Types: `/wedsync/src/types/security.ts`

### CRITICAL - Team Reports:
- **Output to:** `/WORKFLOW-V2-DRAFT/OUTBOX/team-c/WS-013-round-1-complete.md`
- **Include:** Feature ID (WS-013) in all filenames
- **After completion:** Run `./route-messages.sh`

---

## 📝 TEAM OUTPUT REQUIRED AT END OF ROUND:

### CRITICAL: Use Standard Team Output Template
**Template:** See `/WORKFLOW-V2-DRAFT/TEAM-OUTPUT-TEMPLATE.md` for EXACT format
**Output to:** `/WORKFLOW-V2-DRAFT/OUTBOX/team-c/WS-013-round-1-complete.md`

---

## ⚠️ CRITICAL WARNINGS
- Do NOT proceed if security audit fails
- Do NOT skip any security test
- Do NOT ignore performance impact
- Do NOT claim completion without penetration testing
- REMEMBER: This is P0 CRITICAL - ALL teams depend on this
- REMEMBER: Security bugs affect ALL users and ALL data

## 🏁 ROUND COMPLETION CHECKLIST
- [ ] All deliverables complete
- [ ] Security audit PASSED
- [ ] Tests written and passing
- [ ] Penetration testing completed
- [ ] Performance validated
- [ ] All teams can integrate
- [ ] Code committed
- [ ] Report created

---

END OF ROUND PROMPT - EXECUTE IMMEDIATELY