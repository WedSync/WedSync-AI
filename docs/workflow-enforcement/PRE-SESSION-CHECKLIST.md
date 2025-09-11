# ✅ PRE-SESSION CHECKLIST - MANDATORY COMPLIANCE GATES
## Zero-Bypass System for PM Session Creation

**PURPOSE:** Automated checklist system preventing workflow violations  
**USAGE:** Complete ALL items before creating any session prompt  
**ENFORCEMENT:** PM-WORKFLOW-ENFORCEMENT.md violations trigger immediate stoppage

---

## 🔒 GATE 1: KNOWLEDGE VERIFICATION

### **CORE SPECIFICATIONS READING (MANDATORY)**
```bash
# Find relevant CORE-SPECIFICATIONS documents
find CORE-SPECIFICATIONS/ -name "*.md" | grep -E "(forms|journey|pdf|payment)" | head -10

# Example for Journey Builder feature:
□ Read CORE-SPECIFICATIONS/02-WEDSYNC-SUPPLIER-PLATFORM/05-Customer-Journey/01-journey-canvas.md
□ Read CORE-SPECIFICATIONS/02-WEDSYNC-SUPPLIER-PLATFORM/05-Customer-Journey/02-timeline-nodes.md  
□ Read CORE-SPECIFICATIONS/02-WEDSYNC-SUPPLIER-PLATFORM/05-Customer-Journey/03-module-types/
□ Read CORE-SPECIFICATIONS/01-TECHNICAL-ARCHITECTURE/Database\ Schema/05-journeys-tables.md
```

**✅ COMPLETION CRITERIA:** Can answer specific implementation questions from specs without looking

### **TECHNOLOGY VERIFICATION (MANDATORY)**
```bash
# Verify correct technology choices
cat CORE-SPECIFICATIONS/00-PROJECT-OVERVIEW/04-tech-stack-decisions.md | grep -A 5 "Drag & Drop"
# Must show: "@dnd-kit" NOT "@xyflow/react"

□ Drag & Drop: @dnd-kit (confirmed)
□ UI Library: Untitled UI + Magic UI (confirmed)
□ Database: Supabase PostgreSQL (confirmed) 
□ PDF Processing: Google Cloud Vision (confirmed)
□ Payments: Stripe (confirmed)
```

**✅ COMPLETION CRITERIA:** All tech choices match CORE-SPECIFICATIONS exactly

### **CURRENT PHASE VERIFICATION**
```bash
# Check current roadmap phase and priorities
grep -A 10 "CURRENT FOCUS" DEVELOPMENT-ROADMAP.md

□ Current Phase: Phase 2 (Week 7-8)
□ Priority Feature: Journey Builder (blocking Beta Launch)
□ Integration Points: Forms System, Core Fields, Client Management
□ Success Criteria: Forms and journeys working end-to-end
```

**✅ COMPLETION CRITERIA:** Session aligns with roadmap priorities

---

## 🔒 GATE 2: AGENT DEPLOYMENT PLANNING

### **MANDATORY PARALLEL AGENT MATRIX**
```typescript
interface SessionAgentMatrix {
  session: 'A' | 'B' | 'C'
  required: {
    coordinator: 'task-tracker-coordinator'  // ALWAYS FIRST
    technical: TechnicalSpecialist[]         // Based on feature
    domain: DomainSpecialist[]              // Wedding context
    quality: QualitySpecialist[]           // Security + Testing
    validation: 'playwright-visual-testing-specialist'  // MANDATORY
  }
  minimumCount: 6  // Must deploy 6+ agents
}
```

### **AGENT ASSIGNMENT VERIFICATION**
```markdown
FOR JOURNEY BUILDER SESSION:

□ task-tracker-coordinator (systematic component tracking)
□ react-ui-specialist (drag-and-drop canvas with @dnd-kit)
□ nextjs-fullstack-developer (API routes + database integration)
□ wedding-domain-expert (timeline logic + supplier workflows)
□ postgresql-database-expert (JSONB storage + query optimization)
□ playwright-visual-testing-specialist (visual regression + drag-drop testing)
□ security-compliance-officer (authentication + data protection)
```

**✅ COMPLETION CRITERIA:** 6+ agents assigned with specific tasks

---

## 🔒 GATE 3: TECHNICAL CONTEXT PREPARATION

### **CONTEXT ENGINEERING REQUIREMENTS**
```markdown
SESSION PROMPT MUST CONTAIN:

□ COMPLETE TECHNICAL CONTEXT (from CORE-SPECIFICATIONS)
  - Exact implementation requirements
  - Code examples and patterns
  - Integration points with existing features
  - Database schema specifications

□ WEDDING DOMAIN CONTEXT
  - Industry terminology (couples, vendors, venues)
  - Wedding timeline logic (6 months before, day of, etc.)
  - Supplier workflow patterns

□ INTEGRATION REQUIREMENTS  
  - Forms System integration points
  - Core Fields auto-population
  - Client Management connections
  - Database relationships
```

**✅ COMPLETION CRITERIA:** Session has comprehensive context, no discovery needed

### **IMPLEMENTATION GUIDANCE**
```markdown
TECHNICAL SPECIFICATIONS MUST INCLUDE:

□ File paths: Exact locations for all new files
□ Code patterns: Examples from existing codebase  
□ API routes: Complete endpoint specifications
□ Database schema: JSONB structures and relationships
□ UI components: Specific component requirements
□ Integration points: How feature connects to existing system
```

**✅ COMPLETION CRITERIA:** Session can implement without additional research

---

## 🔒 GATE 4: VERIFICATION REQUIREMENTS

### **EVIDENCE REQUIREMENTS**
```markdown
SESSION MUST SPECIFY:

□ SCREENSHOT REQUIREMENTS
  - Feature working at different screen sizes
  - Visual proof of drag-and-drop functionality
  - Mobile responsiveness validation
  - Cross-browser compatibility

□ PLAYWRIGHT TEST REQUIREMENTS
  - Visual regression tests
  - Functional interaction tests  
  - Performance measurement tests
  - Accessibility validation tests

□ PERFORMANCE BENCHMARKS
  - Page load time targets (<1s)
  - API response time targets (<200ms)
  - Memory usage limits
  - Concurrent user handling
```

**✅ COMPLETION CRITERIA:** Clear evidence requirements specified

### **TESTING SPECIFICATIONS**
```typescript
// MANDATORY PLAYWRIGHT TESTS FOR UI FEATURES
const requiredTests = [
  'visual-regression: screenshot comparison',
  'functional: drag-and-drop interactions', 
  'performance: load time measurement',
  'accessibility: WCAG compliance check',
  'responsive: multi-viewport testing',
  'cross-browser: Chrome/Firefox/Safari'
]
```

**✅ COMPLETION CRITERIA:** Comprehensive testing strategy defined

---

## 🔒 GATE 5: WORKFLOW COMPLIANCE

### **FILE CLEANUP PROCEDURES**
```markdown
SESSION MUST INCLUDE:

□ CLEANUP PROCEDURES
  - Session prompt → /SESSION-LOGS/[date]/session-[a/b/c]-prompt.md
  - Session report → /SESSION-LOGS/[date]/session-[a/b/c]-report.md
  - No files created in root directory
  - No duplicate documentation

□ REPORTING REQUIREMENTS
  - Evidence package with screenshots
  - Performance metrics with actual measurements
  - Test execution logs with timestamps
  - Verification checklist completion
```

**✅ COMPLETION CRITERIA:** Complete cleanup and reporting procedures

### **QUALITY GATES**
```markdown
SESSION CANNOT COMPLETE WITHOUT:

□ All Playwright tests EXECUTED (not just written)
□ Visual proof of feature working end-to-end
□ Performance benchmarks met with evidence
□ Security checklist completed with scan results
□ Code quality gates passed (lint, typecheck, build)
```

**✅ COMPLETION CRITERIA:** Enterprise-grade quality standards enforced

---

## 🚨 CHECKLIST VERIFICATION COMMANDS

### **PRE-SESSION AUDIT**
```bash
#!/bin/bash
# Run before creating any session prompt

echo "=== PRE-SESSION COMPLIANCE AUDIT ==="

# 1. Check CORE-SPECIFICATIONS knowledge
echo "1. CORE-SPECIFICATIONS Reading:"
find CORE-SPECIFICATIONS/ -name "*.md" | wc -l
echo "specifications available"

# 2. Verify technology choices
echo "2. Technology Verification:"
grep -c "@dnd-kit" CORE-SPECIFICATIONS/00-PROJECT-OVERVIEW/04-tech-stack-decisions.md

# 3. Check current roadmap phase
echo "3. Roadmap Phase:"
grep "Phase 2" DEVELOPMENT-ROADMAP.md | head -1

# 4. Verify root directory compliance
echo "4. Root Directory Files:"
ls -la . | wc -l
echo "files in root (must be ≤15)"

# 5. Check session organization
echo "5. Session Organization:"
ls -la SESSION-LOGS/ | tail -5

echo "=== COMPLIANCE AUDIT COMPLETE ==="
```

### **POST-SESSION VERIFICATION**
```bash
#!/bin/bash
# Run after session completion claims

echo "=== POST-SESSION VERIFICATION ==="

# 1. Test build status
cd wedsync && npm run build
echo "Build Status: $?"

# 2. Run tests
cd wedsync && npm run test -- --coverage
echo "Test Status: $?"

# 3. Check for new root files
ls -la . | grep -E "\.md$" | grep -v -E "(PM-|WORKFLOW|PROJECT|DEVELOPMENT|SECURITY|PRICING)"
echo "Unauthorized root files: $?"

# 4. Verify screenshots exist
find SESSION-LOGS/$(date +%Y-%m-%d)/ -name "*.png" | wc -l
echo "Screenshot evidence files"

echo "=== VERIFICATION COMPLETE ==="
```

---

## ⚡ QUICK COMPLIANCE CHECK

**Before creating ANY session prompt:**

1. ✅ Read CORE-SPECIFICATIONS for feature area
2. ✅ Verify tech stack choices match specifications  
3. ✅ Plan 6+ parallel agents with specific assignments
4. ✅ Include comprehensive technical context
5. ✅ Specify verification evidence requirements
6. ✅ Add cleanup and reporting procedures

**VIOLATION = IMMEDIATE WORKFLOW STOPPAGE**

**This checklist ensures PM operates at enterprise standards, not hobby project level.**