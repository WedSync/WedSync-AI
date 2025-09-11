# TEAM C - ROUND 1: WS-176 - GDPR Compliance System - Workflow Integration & Automation

**Date:** 2025-08-29  
**Feature ID:** WS-176 (Track all work with this ID)  
**Priority:** P1 - Legal Compliance Critical
**Mission:** Integrate GDPR compliance into existing wedding workflows and automate privacy processes.
**Context:** You are Team C working in parallel with 4 other teams. ALL must complete before next round.

---

## 🚨 CRITICAL: EVIDENCE OF REALITY REQUIREMENTS (NON-NEGOTIABLE)

**⚠️ MANDATORY: Before claiming completion, you MUST provide:**

1. **FILE EXISTENCE PROOF:**
```bash
ls -la /Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync/src/lib/integrations/gdpr/
cat /Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync/src/lib/integrations/gdpr/workflow-privacy.ts | head -20
```

2. **TYPECHECK RESULTS:**
```bash
npm run typecheck
# MUST show: "No errors found"
```

3. **TEST RESULTS:**
```bash
npm test integration/gdpr
# MUST show: "All tests passing"
```

**Teams submitting hallucinated implementations will be rejected immediately.**

---

## 🎯 USER STORY & WEDDING CONTEXT

**As a:** Wedding supplier using existing planning workflows
**I want to:** GDPR compliance seamlessly integrated into my current processes
**So that:** Privacy compliance happens automatically without changing my workflow

**Real Wedding Problem This Solves:**
A wedding photographer's existing workflow includes guest list imports, photo tagging, and album sharing. GDPR compliance must integrate smoothly - auto-collecting consent when guests are added, triggering privacy notices for photo sharing, and handling deletion requests without breaking the workflow.

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
- [ ] workflow-privacy.ts - Privacy integration hooks for existing workflows
- [ ] consent-automation.ts - Automatic consent collection during data entry
- [ ] privacy-impact-tracker.ts - Identifies privacy-sensitive operations
- [ ] gdpr-middleware.ts - API middleware for automatic privacy compliance
- [ ] Unit tests with >80% coverage for all integration functions
- [ ] Evidence package proving completion

### Round 2 (Enhancement & Polish):
- [ ] Error handling for privacy integration failures
- [ ] Performance optimization for privacy checks
- [ ] Integration with Team A's UI components and Team B's processing engine
- [ ] Advanced privacy workflow scenarios

### Round 3 (Integration & Finalization):
- [ ] Full integration with all teams' deliverables
- [ ] Complete E2E testing with Team E
- [ ] Documentation with Team E
- [ ] Production readiness validation

## 🔗 DEPENDENCIES

### What you NEED from other teams:
- FROM Team B: GDPR consent and deletion services - Required for workflow integration
- FROM Team A: Privacy UI components - Required for consent collection automation

### What other teams NEED from you:
- TO Team A: Workflow integration patterns - Blocking their consent banner triggers
- TO Team D: Privacy automation configuration - Blocking their compliance monitoring
- TO Team E: Integration test scenarios - Blocking comprehensive workflow testing

## 💾 WHERE TO SAVE YOUR WORK

### Code Files:
- Integration: `/Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync/src/lib/integrations/gdpr/`
- Middleware: `/Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync/src/middleware/gdpr/`
- Types: `/Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync/src/types/gdpr-integration.ts`
- Tests: `/Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync/__tests__/integration/gdpr/`

### Team Reports:
- **Output to:** `/Users/skyphotography/CODE/WedSync-2.0/WedSync2/WORKFLOW-V2-DRAFT/INBOX/senior-dev/WS-176-gdpr-compliance-system-team-c-round-1-complete.md`
- **Update tracker:** Add entry to `/Users/skyphotography/CODE/WedSync-2.0/WedSync2/WORKFLOW-V2-DRAFT/00-STATUS/feature-tracker.log`

---

END OF ROUND PROMPT - EXECUTE IMMEDIATELY