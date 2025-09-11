# 📋 TEAM OUTPUT TEMPLATE
## Standard Format for Team Reports to Senior Developer

**CRITICAL:** Every team must use this format for their outputs to ensure Senior Dev can review efficiently.

---

## FILENAME FORMAT
```
/WORKFLOW-V2-DRAFT/OUTBOX/team-[x]/WS-XXX-round-[N]-complete.md
```
Example: `/WORKFLOW-V2-DRAFT/OUTBOX/team-a/WS-001-round-1-complete.md`

---

## REPORT TEMPLATE

```markdown
# TEAM [A-E] - ROUND [1-3] COMPLETION REPORT
## Feature: WS-XXX - [Feature Name]
## Date: [YYYY-MM-DD]

---

## 📊 COMPLETION STATUS

**Feature ID:** WS-XXX
**Completion:** [X]% complete
**Status:** ✅ COMPLETE / ⚠️ PARTIAL / ❌ BLOCKED

---

## ✅ WHAT WE DELIVERED

### Files Created:
- `/path/to/new/file1.tsx` - [Brief description]
- `/path/to/new/file2.ts` - [Brief description]

### Files Modified:
- `/path/to/existing/file1.tsx` - [What was changed]
- `/path/to/existing/file2.ts` - [What was changed]

### Tests Written:
- `[X]` unit tests in `/tests/unit/[feature].test.ts`
- `[Y]` integration tests in `/tests/integration/[feature].test.ts`
- `[Z]` E2E tests using Playwright

---

## 📋 USER STORY COMPLETION

**Original Story:**
As a [wedding role], I want to [action], so that [value]

**How We Solved It:**
[2-3 sentences explaining the implementation that solves the wedding problem]

---

## 🧪 TEST RESULTS

### Test Coverage:
- Unit Tests: [X]% coverage
- Integration Tests: PASS/FAIL
- Playwright Tests: PASS/FAIL

### Performance Metrics:
- Page Load: [X]ms (target: <1000ms)
- API Response: [Y]ms (target: <200ms)
- Bundle Impact: +[Z]kb

### Evidence:
```bash
# Test command output:
npm run test -- /tests/[feature].test.ts
✓ All tests passing (X tests)
Coverage: X%
```

---

## 🔒 SECURITY CHECKLIST

- [x] Authentication required on all endpoints
- [x] Input validation with Zod schemas
- [x] No sensitive data in logs
- [x] SQL injection prevention
- [x] XSS prevention in place
- [x] Rate limiting implemented

---

## ⚠️ ISSUES & BLOCKERS

### Issues Encountered:
- [Issue 1: Description and how we resolved it]
- [Issue 2: Description and current status]

### Blockers (if any):
- [What's blocking completion]
- [What we need from other teams]

---

## 🔗 DEPENDENCIES

### What We Used From Other Teams:
- FROM Team [X]: [Component/API] - Status: RECEIVED/WAITING

### What Other Teams Need From Us:
- TO Team [Y]: [Component/API] - Status: READY/IN-PROGRESS

---

## 📝 FOR SENIOR DEV REVIEW

### Priority Review Areas:
1. **CRITICAL:** [Security concern in file:line]
2. **IMPORTANT:** [Performance optimization in file:line]
3. **STANDARD:** [Code pattern verification in file:line]

### Questions We Need Answered:
- [ ] [Specific technical question]
- [ ] [Architecture decision validation]

### Verification Commands:
```bash
# Run these to verify our work:
npm run typecheck -- /src/[feature]
npm run test -- /tests/[feature].test.ts
npm run dev # Navigate to /[feature] to test
```

---

## 📊 METRICS SUMMARY

- **Files:** [X] created, [Y] modified
- **Lines of Code:** ~[X] added, [Y] removed
- **Test Coverage:** [X]%
- **TypeScript Errors:** 0
- **Console Errors:** 0
- **Build Status:** ✅ PASSING

---

## 🎯 READY FOR REVIEW

**We confirm that:**
- [ ] All deliverables for Round [N] are complete
- [ ] Tests are written and passing
- [ ] No TypeScript errors
- [ ] No console errors
- [ ] Feature works as specified
- [ ] User story is fulfilled

**Recommendation:** APPROVE / NEEDS_FIXES / BLOCKED

---

**Feature Tracking:** WS-XXX | [feature-name] | TEAM_[X]_COMPLETE | Round [N]
```

---

## USAGE INSTRUCTIONS

1. **Every team** creates this report at the end of each round
2. **Save to:** `/WORKFLOW-V2-DRAFT/OUTBOX/team-[x]/`
3. **Include:** WS-XXX feature ID in filename
4. **Run:** `./route-messages.sh` after saving
5. **Wait:** For Senior Dev review before proceeding

---

## WHY THIS FORMAT MATTERS

- **Senior Dev** can quickly scan multiple team reports
- **Consistent structure** = faster reviews
- **Clear metrics** = objective assessment
- **WS-XXX tracking** = complete traceability
- **User story focus** = ensures wedding context maintained

---

**Remember: A good report saves review time and gets faster approval!**