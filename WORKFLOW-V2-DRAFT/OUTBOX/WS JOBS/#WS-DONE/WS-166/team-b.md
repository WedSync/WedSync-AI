# TEAM B - ROUND 1: WS-166 - Budget Reports & Export System - Backend API & Processing

**Date:** 2025-01-20  
**Feature ID:** WS-166 (Track all work with this ID)
**Priority:** P1 from roadmap  
**Mission:** Build export processing API, file generation services, and queue management for budget reports
**Context:** You are Team B working in parallel with 4 other teams. ALL must complete before next round.

---

## 🚨 CRITICAL: EVIDENCE OF REALITY REQUIREMENTS (NON-NEGOTIABLE)

**⚠️ MANDATORY: Before claiming completion, you MUST provide:**

1. **FILE EXISTENCE PROOF:**
```bash
ls -la $WS_ROOT/wedsync/src/app/api/wedme/budget/export/
cat $WS_ROOT/wedsync/src/app/api/wedme/budget/export/route.ts | head -20
```

2. **TYPECHECK RESULTS:**
```bash
npm run typecheck
# MUST show: "No errors found"
```

3. **TEST RESULTS:**
```bash
npm test budget-export-api
# MUST show: "All tests passing"
```

**Teams submitting hallucinated implementations will be rejected immediately.**

---

## 🎯 USER STORY & WEDDING CONTEXT

**As a:** Wedding couple managing their wedding budget
**I want to:** Generate and download comprehensive budget reports in PDF, CSV, or Excel formats with customizable filters
**So that:** I can share financial summaries with family, track spending against goals, and have professional documentation

**Real Wedding Problem This Solves:**
Sarah and Mike are 3 months before their wedding. Sarah's parents are contributing $15,000 and want a detailed report showing how their money is being allocated across vendors. Mike needs to provide their financial advisor with a comprehensive payment schedule for cash flow planning. The system must generate professional reports quickly and handle multiple export requests efficiently.

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
- [ ] **Export API Routes** - POST /api/wedme/budget/export and GET endpoints
- [ ] **Database Migrations** - budget_exports and export_queue tables (send to SQL Expert)
- [ ] **PDF Generation Service** - React-PDF based budget report generation
- [ ] **CSV/Excel Export Services** - Data formatting and file creation utilities
- [ ] **Export Queue Management** - Background processing and status tracking
- [ ] **File Storage Integration** - Supabase Storage for export file management
- [ ] **Authentication & Authorization** - Secure access to export endpoints
- [ ] **Unit tests** - >80% coverage for all export services
- [ ] **Evidence package** - Proof of file creation, typecheck, and test results

### Round 2 (Enhancement & Polish):
- [ ] Error handling and retry logic for failed exports
- [ ] Performance optimization for large datasets
- [ ] Export caching and expiration management
- [ ] Email delivery integration for large files

### Round 3 (Integration & Finalization):
- [ ] Full integration with Team A's frontend components
- [ ] Complete E2E testing with Team E
- [ ] Documentation with Team E
- [ ] Production readiness and scaling

## 🔗 DEPENDENCIES

### What you NEED from other teams:
- FROM Team C: File compression and optimization utilities - Required for efficient storage
- FROM Team D: Performance monitoring hooks - Required for export queue optimization
- FROM existing codebase: Budget data structures from WS-163, WS-164, WS-165

### What other teams NEED from you:
- TO Team A: Export API interfaces and status endpoints - Blocking their UI implementation
- TO Team C: File generation completion callbacks - Blocking their delivery services
- TO Team E: API test endpoints and data fixtures - Blocking their automation tests

## 💾 WHERE TO SAVE YOUR WORK

### Code Files:
- Backend: `$WS_ROOT/wedsync/src/app/api/wedme/budget/export/`
- Services: `$WS_ROOT/wedsync/src/lib/services/budget-export/`
- Types: `$WS_ROOT/wedsync/src/types/budget-export.ts`
- Migrations: `$WS_ROOT/wedsync/supabase/migrations/`
- Tests: `$WS_ROOT/wedsync/__tests__/api/budget/export/`

### Team Reports:
- **Output to:** `$WS_ROOT/WORKFLOW-V2-DRAFT/INBOX/senior-dev/WS-166-budget-export-api-team-b-round-1-complete.md`
- **Update tracker:** Add entry to `$WS_ROOT/WORKFLOW-V2-DRAFT/00-STATUS/feature-tracker.log`

## 🛠️ TECHNICAL SPECIFICATIONS

### Database Schema (Send to SQL Expert):
```sql
-- Budget export tracking
CREATE TABLE IF NOT EXISTS budget_exports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id UUID REFERENCES couples(id),
  export_type VARCHAR(20) CHECK (export_type IN ('pdf', 'csv', 'excel')) NOT NULL,
  export_filters JSONB NOT NULL DEFAULT '{}',
  file_name VARCHAR(255) NOT NULL,
  file_url TEXT,
  file_size_bytes INTEGER,
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  download_count INTEGER DEFAULT 0,
  status VARCHAR(20) CHECK (status IN ('generating', 'completed', 'failed', 'expired')) DEFAULT 'generating',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Export generation queue for async processing
CREATE TABLE IF NOT EXISTS export_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  export_id UUID REFERENCES budget_exports(id) ON DELETE CASCADE,
  priority INTEGER DEFAULT 1,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Key API Endpoints to Build:

1. **POST /api/wedme/budget/export**:
```typescript
interface ExportRequest {
  format: 'pdf' | 'csv' | 'excel';
  filters: {
    categories?: string[];
    date_range?: { start: string; end: string };
    payment_status?: 'paid' | 'pending' | 'planned' | 'all';
    include_notes?: boolean;
  };
  options: {
    include_charts?: boolean;
    include_timeline?: boolean;
    email_delivery?: boolean;
  };
}

// Response: { exportId: string, status: 'generating' | 'completed', downloadUrl?: string }
```

2. **GET /api/wedme/budget/export/[exportId]**:
```typescript
// Returns file stream or JSON with download URL and metadata
```

3. **GET /api/wedme/budget/export-status/[exportId]**:
```typescript
// Returns export status, progress, and completion details
```

### Services to Implement:

1. **BudgetPDFGenerator**:
```typescript
class BudgetPDFGenerator {
  static async generatePDF(
    coupleId: string, 
    budgetData: BudgetData, 
    options: PDFOptions
  ): Promise<Buffer> {
    // Use React-PDF to generate professional budget reports
    // Include charts, tables, and formatted layouts
  }
}
```

2. **BudgetExcelGenerator**:
```typescript
class BudgetExcelGenerator {
  static async generateExcel(
    budgetData: BudgetData,
    filters: ExportFilters
  ): Promise<Buffer> {
    // Create multi-sheet Excel file with Summary, Details, Payment Schedule
  }
}
```

3. **ExportQueueManager**:
```typescript
class ExportQueueManager {
  static async addToQueue(exportId: string, priority: number): Promise<void>;
  static async processQueue(): Promise<void>;
  static async getExportStatus(exportId: string): Promise<ExportStatus>;
}
```

### Security Requirements:
- **Authentication validation** - Verify couple access to budget data
- **Rate limiting** - Prevent export abuse (max 5 exports per hour per couple)
- **Input validation** - Sanitize all filter parameters
- **File access control** - Secure download URLs with expiration
- **Data privacy** - Ensure exports only contain couple's own data

### Performance Requirements:
- **Async processing** - Queue large exports for background processing
- **File caching** - Cache identical exports for 24 hours
- **Memory management** - Stream large files to prevent memory issues
- **Response times** - < 2 seconds for simple exports, < 30 seconds for complex PDFs

---

END OF ROUND PROMPT - EXECUTE IMMEDIATELY