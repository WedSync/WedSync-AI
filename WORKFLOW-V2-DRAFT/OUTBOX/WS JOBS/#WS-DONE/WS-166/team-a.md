# TEAM A - ROUND 1: WS-166 - Budget Reports & Export System - Frontend UI Components

**Date:** 2025-01-20  
**Feature ID:** WS-166 (Track all work with this ID)
**Priority:** P1 from roadmap  
**Mission:** Build comprehensive export dialog and progress tracking UI for budget report generation
**Context:** You are Team A working in parallel with 4 other teams. ALL must complete before next round.

---

## 🚨 CRITICAL: EVIDENCE OF REALITY REQUIREMENTS (NON-NEGOTIABLE)

**⚠️ MANDATORY: Before claiming completion, you MUST provide:**

1. **FILE EXISTENCE PROOF:**
```bash
ls -la $WS_ROOT/wedsync/src/components/budget/export/
cat $WS_ROOT/wedsync/src/components/budget/export/BudgetExportDialog.tsx | head -20
```

2. **TYPECHECK RESULTS:**
```bash
npm run typecheck
# MUST show: "No errors found"
```

3. **TEST RESULTS:**
```bash
npm test budget-export
# MUST show: "All tests passing"
```

**Teams submitting hallucinated implementations will be rejected immediately.**

---

## 🎯 USER STORY & WEDDING CONTEXT

**As a:** Wedding couple managing their wedding budget
**I want to:** Generate and download comprehensive budget reports in PDF, CSV, or Excel formats with customizable filters
**So that:** I can share financial summaries with family, track spending against goals, and have professional documentation

**Real Wedding Problem This Solves:**
Sarah and Mike are 3 months before their wedding. Sarah's parents are contributing $15,000 and want a detailed report showing how their money is being allocated across vendors. Mike needs to provide his work's HR department with expense documentation for their wedding day off benefits. They also want to export their complete payment schedule to share with their financial advisor for cash flow planning.

---

## 📚 STEP 1: LOAD CURRENT DOCUMENTATION & REQUIREMENTS

**⚠️ CRITICAL: Load navigation and security requirements from centralized templates:**

```typescript
// MANDATORY: Load team prompt templates for requirements
await mcp__serena__read_file("$WS_ROOT/WORKFLOW-V2-DRAFT/03-DEV-MANAGER/TEAM-PROMPT-TEMPLATES.md");

// This contains:
// - Navigation Integration Requirements (MANDATORY for all UI features)
// - Security Requirements (MANDATORY for all API routes)  
// - UI Technology Stack requirements
// - All centralized checklists
```

## 🎯 SPECIFIC DELIVERABLES FOR THIS ROUND

### Round 1 (Core Implementation):
- [ ] **BudgetExportDialog Component** - Main export interface with format selection, filters, and options
- [ ] **ExportFilters Component** - Category, date range, and payment status filtering UI
- [ ] **ExportProgress Component** - Real-time progress tracking for export generation
- [ ] **ExportHistory Component** - List of previous exports with download/re-download functionality
- [ ] **Export format preview cards** - Visual representations of PDF/CSV/Excel outputs
- [ ] **Integration with WedMe navigation** - Proper breadcrumbs and navigation state
- [ ] **Unit tests** - >80% coverage for all export UI components
- [ ] **Evidence package** - Proof of file creation, typecheck, and test results

### Round 2 (Enhancement & Polish):
- [ ] Error handling for failed exports and network issues
- [ ] Mobile-responsive design optimization
- [ ] Advanced filter combinations and validation
- [ ] Export queue management UI

### Round 3 (Integration & Finalization):
- [ ] Full integration with Team B's API endpoints
- [ ] Complete E2E testing with Team E
- [ ] Documentation with Team E
- [ ] Production readiness validation

## 🔗 DEPENDENCIES

### What you NEED from other teams:
- FROM Team B: Export API endpoints (`/api/wedme/budget/export`) - Required for actual export generation
- FROM Team B: Export status polling endpoint - Required for progress tracking
- FROM Team C: File download handling and storage URLs - Required for completed export downloads

### What other teams NEED from you:
- TO Team C: Export filter parameters interface - Blocking their service integrations
- TO Team D: Component performance requirements - Blocking their WedMe optimization
- TO Team E: Component interfaces and test data - Blocking their test automation

## 💾 WHERE TO SAVE YOUR WORK

### Code Files:
- Frontend: `$WS_ROOT/wedsync/src/components/budget/export/`
- Types: `$WS_ROOT/wedsync/src/types/budget-export.ts`
- Hooks: `$WS_ROOT/wedsync/src/hooks/useBudgetExport.ts`
- Tests: `$WS_ROOT/wedsync/__tests__/components/budget/export/`

### Team Reports:
- **Output to:** `$WS_ROOT/WORKFLOW-V2-DRAFT/INBOX/senior-dev/WS-166-budget-export-ui-team-a-round-1-complete.md`
- **Update tracker:** Add entry to `$WS_ROOT/WORKFLOW-V2-DRAFT/00-STATUS/feature-tracker.log`

## 🛠️ TECHNICAL SPECIFICATIONS

### Key Components to Build:

1. **BudgetExportDialog**:
```typescript
interface BudgetExportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  coupleId: string;
  budgetData: BudgetSummary;
}

// Must include:
// - Format selection (PDF, CSV, Excel) with descriptions
// - Filter panel integration
// - Progress tracking during generation
// - Download button/link management
```

2. **ExportFilters**:
```typescript
interface ExportFilters {
  categories: string[];
  dateRange: { start: Date; end: Date } | null;
  paymentStatus: 'all' | 'paid' | 'pending' | 'planned';
  includeNotes: boolean;
}

// Must include:
// - Multi-select category dropdown
// - Date range picker with validation
// - Payment status radio buttons
// - Include/exclude options toggles
```

3. **ExportProgress**:
```typescript
interface ExportProgressProps {
  exportId: string;
  status: 'generating' | 'completed' | 'failed';
  progress?: number;
  onComplete: (downloadUrl: string) => void;
}

// Must include:
// - Real-time status polling
// - Progress bar animation
// - Error state handling
// - Automatic download trigger
```

### UI/UX Requirements:
- **Mobile-first responsive design**
- **Loading states** for all async operations
- **Error boundaries** for component isolation
- **Accessibility compliance** (WCAG 2.1 AA)
- **Toast notifications** for user feedback
- **Proper form validation** with helpful error messages

### Integration Requirements:
- Must integrate with existing WedMe budget dashboard navigation
- Must use consistent design system (Tailwind classes, shadcn/ui components)
- Must handle authentication state properly
- Must work with existing budget data structures

---

END OF ROUND PROMPT - EXECUTE IMMEDIATELY