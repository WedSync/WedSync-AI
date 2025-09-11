# TEAM B - ROUND 1: WS-175 - Advanced Data Encryption - Backend Encryption Engine

**Date:** 2025-08-29  
**Feature ID:** WS-175 (Track all work with this ID)  
**Priority:** P1 - Security Critical
**Mission:** Implement field-level encryption engine and key management system.
**Context:** You are Team B working in parallel with 4 other teams. ALL must complete before next round.

---

## 🚨 CRITICAL: EVIDENCE OF REALITY REQUIREMENTS (NON-NEGOTIABLE)

**⚠️ MANDATORY: Before claiming completion, you MUST provide:**

1. **FILE EXISTENCE PROOF:**
```bash
ls -la /Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync/src/lib/encryption/
cat /Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync/src/lib/encryption/field-encryption.ts | head -20
```

2. **TYPECHECK RESULTS:**
```bash
npm run typecheck
# MUST show: "No errors found"
```

3. **TEST RESULTS:**
```bash
npm test encryption
# MUST show: "All tests passing"
```

**Teams submitting hallucinated implementations will be rejected immediately.**

---

## 🎯 USER STORY & WEDDING CONTEXT

**As a:** Wedding supplier storing guest personal information
**I want to:** All sensitive data encrypted both in transit and at rest
**So that:** Client privacy is protected and GDPR compliance is maintained

**Real Wedding Problem This Solves:**
A wedding caterer stores guest dietary requirements and contact details. They need automatic field-level encryption for emails, phone numbers, and sensitive notes, with secure key rotation every 90 days.

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
- [ ] field-encryption.ts - Core encryption/decryption service (following technical spec)
- [ ] key-management.ts - Encryption key generation and rotation system
- [ ] secure-storage.ts - Encrypted field storage abstraction layer
- [ ] Database migrations for encryption_keys table (send to SQL Expert)
- [ ] Unit tests with >80% coverage for all encryption functions
- [ ] Evidence package proving completion

### Round 2 (Enhancement & Polish):
- [ ] Error handling for key rotation failures
- [ ] Performance optimization for bulk encryption
- [ ] Integration with Team A's frontend components
- [ ] Advanced security testing scenarios

### Round 3 (Integration & Finalization):
- [ ] Full integration with Team A frontend and Team C GDPR compliance
- [ ] Complete E2E testing with Team E
- [ ] Documentation with Team E
- [ ] Production readiness validation

## 🔗 DEPENDENCIES

### What you NEED from other teams:
- FROM Team D: Security policy configuration - Required for encryption algorithm selection
- FROM Team C: GDPR data classification - Required for encryption scope definition

### What other teams NEED from you:
- TO Team A: FieldEncryption service API - Blocking their encryption status components
- TO Team C: Encryption metadata for GDPR - Blocking their data classification
- TO Team E: Encryption service interfaces - Blocking their security testing

## 💾 WHERE TO SAVE YOUR WORK

### Code Files:
- Backend: `/Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync/src/lib/encryption/`
- Types: `/Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync/src/types/encryption.ts`
- Tests: `/Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync/__tests__/lib/encryption/`
- Migrations: `/Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync/supabase/migrations/`

### Team Reports:
- **Output to:** `/Users/skyphotography/CODE/WedSync-2.0/WedSync2/WORKFLOW-V2-DRAFT/INBOX/senior-dev/WS-175-advanced-data-encryption-team-b-round-1-complete.md`
- **Update tracker:** Add entry to `/Users/skyphotography/CODE/WedSync-2.0/WedSync2/WORKFLOW-V2-DRAFT/00-STATUS/feature-tracker.log`

---

END OF ROUND PROMPT - EXECUTE IMMEDIATELY