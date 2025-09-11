# TEAM C - ROUND 1: WS-175 - Advanced Data Encryption - Integration & Compliance Bridge

**Date:** 2025-08-29  
**Feature ID:** WS-175 (Track all work with this ID)  
**Priority:** P1 - Security Critical
**Mission:** Integrate encryption system with existing data flows and prepare GDPR compliance integration.
**Context:** You are Team C working in parallel with 4 other teams. ALL must complete before next round.

---

## 🚨 CRITICAL: EVIDENCE OF REALITY REQUIREMENTS (NON-NEGOTIABLE)

**⚠️ MANDATORY: Before claiming completion, you MUST provide:**

1. **FILE EXISTENCE PROOF:**
```bash
ls -la /Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync/src/lib/integrations/encryption/
cat /Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync/src/lib/integrations/encryption/data-mapper.ts | head -20
```

2. **TYPECHECK RESULTS:**
```bash
npm run typecheck
# MUST show: "No errors found"
```

3. **TEST RESULTS:**
```bash
npm test integration
# MUST show: "All tests passing"
```

**Teams submitting hallucinated implementations will be rejected immediately.**

---

## 🎯 USER STORY & WEDDING CONTEXT

**As a:** Wedding supplier using multiple data systems
**I want to:** Encryption to work seamlessly across all existing features
**So that:** Data stays encrypted throughout the entire wedding planning workflow

**Real Wedding Problem This Solves:**
A wedding planner imports guest lists from Excel, stores them encrypted, displays them in planning tools, and exports reports - all while maintaining encryption integrity and preparing for GDPR data subject requests.

---

## 📚 STEP 1: LOAD CURRENT DOCUMENTATION & REQUIREMENTS

**⚠️ CRITICAL: Load navigation and security requirements from centralized templates:**

```typescript
// MANDATORY: Load team prompt templates for requirements
await mcp__serena__read_file("/Users/skyphotography/CODE/WedSync-2.0/WedSync2/WORKFLOW-V2-DRAFT/03-DEV-MANAGER/TEAM-PROMPT-TEMPLATES.md");

// This contains:
// - Navigation Integration Requirements (MANDATORY for all UI features)
// - Security Requirements (MANDATORY for all API routes)  
// - UI Technology Stack requirements
// - All centralized checklists
```

## 🎯 SPECIFIC DELIVERABLES FOR THIS ROUND

### Round 1 (Core Implementation):
- [ ] data-mapper.ts - Maps encrypted fields to existing data structures
- [ ] encryption-middleware.ts - Automatic encryption/decryption for API routes
- [ ] legacy-data-adapter.ts - Handles existing unencrypted data migration
- [ ] gdpr-preparation.ts - Data classification and encryption metadata for GDPR compliance
- [ ] Unit tests with >80% coverage for all integration functions
- [ ] Evidence package proving completion

### Round 2 (Enhancement & Polish):
- [ ] Error handling for encryption integration failures
- [ ] Performance optimization for data transformation
- [ ] Integration with Team A's UI components and Team B's encryption engine
- [ ] Advanced migration scenarios

### Round 3 (Integration & Finalization):
- [ ] Full integration with all teams' deliverables
- [ ] Complete E2E testing with Team E
- [ ] Documentation with Team E
- [ ] Production readiness validation

## 🔗 DEPENDENCIES

### What you NEED from other teams:
- FROM Team B: FieldEncryption service - Required for encryption integration
- FROM Team D: Migration strategy - Required for existing data handling

### What other teams NEED from you:
- TO Team A: Data integration patterns - Blocking their secure data display components
- TO WS-176 Team: GDPR encryption metadata - Blocking GDPR compliance implementation
- TO Team E: Integration test scenarios - Blocking comprehensive testing

## 💾 WHERE TO SAVE YOUR WORK

### Code Files:
- Integration: `/Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync/src/lib/integrations/encryption/`
- Middleware: `/Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync/src/middleware/encryption/`
- Types: `/Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync/src/types/encryption-integration.ts`
- Tests: `/Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync/__tests__/integration/encryption/`

### Team Reports:
- **Output to:** `/Users/skyphotography/CODE/WedSync-2.0/WedSync2/WORKFLOW-V2-DRAFT/INBOX/senior-dev/WS-175-advanced-data-encryption-team-c-round-1-complete.md`
- **Update tracker:** Add entry to `/Users/skyphotography/CODE/WedSync-2.0/WedSync2/WORKFLOW-V2-DRAFT/00-STATUS/feature-tracker.log`

---

END OF ROUND PROMPT - EXECUTE IMMEDIATELY