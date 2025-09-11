# TEAM A - ROUND 1: WS-176 - GDPR Compliance System - Frontend Consent Interface

**Date:** 2025-08-29  
**Feature ID:** WS-176 (Track all work with this ID)  
**Priority:** P1 - Legal Compliance Critical
**Mission:** Create GDPR-compliant frontend components for consent management and data request interfaces.
**Context:** You are Team A working in parallel with 4 other teams. ALL must complete before next round.

---

## 🚨 CRITICAL: EVIDENCE OF REALITY REQUIREMENTS (NON-NEGOTIABLE)

**⚠️ MANDATORY: Before claiming completion, you MUST provide:**

1. **FILE EXISTENCE PROOF:**
```bash
ls -la /Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync/src/components/gdpr/
cat /Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync/src/components/gdpr/ConsentBanner.tsx | head -20
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
**I want to:** GDPR-compliant consent collection and data request interfaces
**So that:** I meet legal requirements with clear, user-friendly consent management

**Real Wedding Problem This Solves:**
A wedding planner working with international guests needs consent banners that collect specific permissions for marketing emails, photo sharing, and dietary data processing, plus a simple interface for guests to request their data or ask for deletion.

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
- [ ] ConsentBanner.tsx - GDPR-compliant consent collection banner (following technical spec)
- [ ] DataRequestForm.tsx - Form for data access/deletion requests
- [ ] ConsentManager.tsx - Interface for viewing/managing consent preferences
- [ ] PrivacyPolicyModal.tsx - Modal for displaying privacy policy
- [ ] Unit tests with >80% coverage for all GDPR components
- [ ] Evidence package proving completion

### Round 2 (Enhancement & Polish):
- [ ] Error handling for consent collection failures
- [ ] Accessibility compliance for GDPR forms
- [ ] Integration with Team B's consent management API
- [ ] Advanced consent withdrawal scenarios

### Round 3 (Integration & Finalization):
- [ ] Full integration with Team B backend and Team C workflow integration
- [ ] Complete E2E testing with Team E
- [ ] Documentation with Team E
- [ ] Production readiness validation

## 🔗 DEPENDENCIES

### What you NEED from other teams:
- FROM Team B: GDPR consent API endpoints - Required for consent submission
- FROM Team D: Privacy policy configuration - Required for policy display

### What other teams NEED from you:
- TO Team C: GDPR UI components - Blocking their workflow integration
- TO Team E: Testable GDPR interfaces - Blocking their compliance testing
- TO WS-177 Team: Consent tracking events - Blocking audit logging

## 💾 WHERE TO SAVE YOUR WORK

### Code Files:
- Frontend: `/Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync/src/components/gdpr/`
- Types: `/Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync/src/types/gdpr.ts`
- Tests: `/Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync/__tests__/components/gdpr/`

### Team Reports:
- **Output to:** `/Users/skyphotography/CODE/WedSync-2.0/WedSync2/WORKFLOW-V2-DRAFT/INBOX/senior-dev/WS-176-gdpr-compliance-system-team-a-round-1-complete.md`
- **Update tracker:** Add entry to `/Users/skyphotography/CODE/WedSync-2.0/WedSync2/WORKFLOW-V2-DRAFT/00-STATUS/feature-tracker.log`

---

END OF ROUND PROMPT - EXECUTE IMMEDIATELY