# TEAM B - ROUND 1: WS-176 - GDPR Compliance System - Backend Data Processing Engine

**Date:** 2025-08-29  
**Feature ID:** WS-176 (Track all work with this ID)  
**Priority:** P1 - Legal Compliance Critical
**Mission:** Implement GDPR data processing engine with consent management and deletion automation.
**Context:** You are Team B working in parallel with 4 other teams. ALL must complete before next round.

---

## 🚨 CRITICAL: EVIDENCE OF REALITY REQUIREMENTS (NON-NEGOTIABLE)

**⚠️ MANDATORY: Before claiming completion, you MUST provide:**

1. **FILE EXISTENCE PROOF:**
```bash
ls -la /Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync/src/lib/gdpr/
cat /Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync/src/lib/gdpr/consent-manager.ts | head -20
```

2. **TYPECHECK RESULTS:**
```bash
npm run typecheck
# MUST show: "No errors found"
```

3. **TEST RESULTS:**
```bash
npm test gdpr
# MUST show: "All tests passing"
```

**Teams submitting hallucinated implementations will be rejected immediately.**

---

## 🎯 USER STORY & WEDDING CONTEXT

**As a:** Wedding supplier processing EU guest data
**I want to:** Automated GDPR compliance for consent, deletion, and data requests
**So that:** I meet legal requirements without manual privacy management overhead

**Real Wedding Problem This Solves:**
A wedding caterer receives GDPR data deletion requests from guests who attended past weddings. The system must automatically find all guest data across all tables, anonymize what can't be deleted (tax records), and provide proof of compliance.

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
- [ ] consent-manager.ts - Consent tracking and validation system (following technical spec)
- [ ] data-processor.ts - Data subject access request handler
- [ ] deletion-engine.ts - Automated GDPR erasure implementation (following technical spec)
- [ ] /api/gdpr/consent and /api/gdpr/data-request API routes
- [ ] Database migrations for GDPR tables (send to SQL Expert)
- [ ] Unit tests with >80% coverage for all GDPR functions
- [ ] Evidence package proving completion

### Round 2 (Enhancement & Polish):
- [ ] Error handling for GDPR processing failures
- [ ] Performance optimization for bulk data operations
- [ ] Integration with Team A's consent interfaces
- [ ] Advanced legal basis tracking

### Round 3 (Integration & Finalization):
- [ ] Full integration with Team A frontend and Team C workflow systems
- [ ] Complete E2E testing with Team E
- [ ] Documentation with Team E
- [ ] Production readiness validation

## 🔗 DEPENDENCIES

### What you NEED from other teams:
- FROM WS-175 Team B: Encryption integration - Required for secure data handling
- FROM Team D: Legal compliance configuration - Required for retention policies

### What other teams NEED from you:
- TO Team A: GDPR consent API - Blocking their consent banner implementation
- TO Team C: GDPR data processing hooks - Blocking their workflow integration
- TO WS-177 Team: GDPR event logging - Blocking audit trail implementation
- TO Team E: GDPR service interfaces - Blocking their compliance testing

## 💾 WHERE TO SAVE YOUR WORK

### Code Files:
- Backend: `/Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync/src/lib/gdpr/`
- API Routes: `/Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync/src/app/api/gdpr/`
- Types: `/Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync/src/types/gdpr.ts`
- Tests: `/Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync/__tests__/lib/gdpr/`
- Migrations: `/Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync/supabase/migrations/`

### Team Reports:
- **Output to:** `/Users/skyphotography/CODE/WedSync-2.0/WedSync2/WORKFLOW-V2-DRAFT/INBOX/senior-dev/WS-176-gdpr-compliance-system-team-b-round-1-complete.md`
- **Update tracker:** Add entry to `/Users/skyphotography/CODE/WedSync-2.0/WedSync2/WORKFLOW-V2-DRAFT/00-STATUS/feature-tracker.log`

---

END OF ROUND PROMPT - EXECUTE IMMEDIATELY