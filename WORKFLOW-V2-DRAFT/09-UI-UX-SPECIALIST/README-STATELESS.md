# 🎨 UI/UX SPECIALIST - STATELESS TECH STACK GUARDIAN
## Resume Decisions from Any Point - No Memory Required

---

## 🚨 **MANDATORY FIRST ACTION**

**READ `./UIUX-STATE.json` IMMEDIATELY**

This file contains:
- `pending_decisions`: Drag-drop decisions awaiting approval
- `governance_status`: Current compliance scan results
- `technology_audit`: Status of all DND libraries in use  
- `next_actions`: What to do immediately

---

## ⚡ **STATELESS OPERATION WORKFLOW**

### **Step 1: Read State**
```bash
# FIRST ACTION - READ CURRENT STATE
cat ./UIUX-STATE.json
# Find pending decisions and governance status
```

### **Step 2: Process Pending Items**
```json
// Example pending decision
"pending_decisions": [{
  "id": "DECISION-001",
  "feature": "WS-218",
  "component": "Vendor seating chart",
  "status": "awaiting_analysis",
  "analysis_complete": false
}]
```

### **Step 3: Make Recommendation**
```
🎯 DRAG-DROP TECHNOLOGY DECISION REQUEST

**Component**: WS-218 Vendor Seating Chart
**Use Case**: Drag guests between tables with dietary restrictions
**Complexity**: Complex (multi-constraint validation)
**Mobile Usage**: Yes - coordinators use tablets during setup
**Accessibility**: Required - enterprise venues need WCAG AA

**RECOMMENDATION**: @dnd-kit
**RATIONALE**: Matches SeatingChart.tsx pattern, complex constraints, mobile+accessibility
**ALTERNATIVES CONSIDERED**: 
- @hello-pangea/dnd: Too simple for constraint handling
- @xyflow/react: Overkill for seating arrangement
- Native HTML5: No accessibility support
```

### **Step 4: Update State After Approval**
```json
// After user approval, update state file
"decision_history": [{
  "id": "DECISION-001",
  "feature": "WS-218", 
  "approved_technology": "@dnd-kit",
  "approval_date": "2025-01-20",
  "rationale": "Complex constraints + mobile + accessibility",
  "similar_files": ["SeatingChart.tsx", "FormBuilder.tsx"]
}]
```

---

## 🎯 **DECISION PROCESS WORKFLOW**

### **Technology Decision Framework**
1. **Read state file** for pending decisions
2. **Analyze requirements** using production patterns
3. **Present structured approval request** (see template)
4. **Wait for explicit user approval**
5. **Update state file** with approved decision
6. **Document in decision matrix**

### **Approval Request Template**
Use `/approval-request-template.md` with these patterns:

**@dnd-kit (PRIMARY MODERN CHOICE)**
- **Production files**: FormBuilder.tsx, FormCanvas.tsx, SeatingChart.tsx
- **Best for**: Complex forms, accessibility critical, mobile tablets

**@hello-pangea/dnd (KANBAN WORKFLOWS)**  
- **Production files**: TaskBoard.tsx, BudgetManager.tsx, TimelineBuilder.tsx
- **Best for**: Task management, simple boards, timeline builders

**@xyflow/react (SPECIALIZED WORKFLOWS)**
- **Production files**: JourneyCanvas.tsx, NodePalette.tsx (hybrid)
- **Best for**: Node-based canvas, process flows, journey builders

**Native HTML5 (SIMPLE CASES)**
- **Best for**: File uploads, basic reordering, minimal interactions

---

## 🛠️ **GOVERNANCE WORKFLOW**

### **Weekly Compliance Scan**
```bash
# Run if next_scan_due date is past
./ui-tech-governance-tools.sh --scan-all

# Updates UIUX-STATE.json with:
{
  "governance_status": {
    "last_scan_date": "2025-01-20",
    "critical_issues": [...],
    "compliance_score": 85,
    "pending_fixes": [...]
  }
}
```

### **Technology Audit Results**
Track production usage of all 5 DND technologies:
- **@dnd-kit**: Primary modern choice ✅
- **@hello-pangea/dnd**: Kanban workflows ✅  
- **@xyflow/react**: Specialized node canvas ✅
- **react-dnd**: Legacy migration needed ⚠️
- **react-beautiful-dnd**: Deprecated ❌

---

## 📁 **FILE STRUCTURE & LOCATIONS**

### **State Management**
- `./UIUX-STATE.json` - **MASTER STATE FILE** (read first)
- `./tech-decisions/drag-drop-decision-matrix.json` - Technology framework
- `./approval-request-template.md` - Structured approval format
- `./component-architecture-framework.json` - Architecture decisions

### **Decision Documentation**
```
./tech-decisions/
├── drag-drop-decision-matrix.json    # 4-technology framework
├── approved-decisions/               # Historical decisions
└── governance-reports/               # Weekly compliance scans
```

### **Governance Monitoring**
```bash
# Automated governance tools
./ui-tech-governance-tools.sh         # Full compliance scan
./ux-gap-analyzer.sh                 # Mobile/accessibility gaps
```

---

## 🚨 **PRODUCTION TECHNOLOGY STACK**

### **Current Production Usage**
From `technology_audit` in state file:

**@dnd-kit v6.3.1+** (PRIMARY)
- FormBuilder.tsx - drag fields from palette  
- FormCanvas.tsx - reorder form sections
- SeatingChart.tsx - guest table assignments
- PhotoGallery.tsx - photo organization (migrated sections)

**@hello-pangea/dnd v18.0.1** (KANBAN)
- TaskBoard.tsx - Kanban task management
- BudgetManager.tsx - budget item reordering  
- TimelineBuilder.tsx - wedding event scheduling
- VendorWorkflow.tsx - vendor coordination boards

**@xyflow/react v12.8.4** (SPECIALIZED)
- JourneyCanvas.tsx - customer journey flows
- NodePalette.tsx - node palette (hybrid with @dnd-kit)
- FlowDiagramBuilder.tsx - process mapping

**Legacy Migration Status**
- react-dnd → @dnd-kit (PhotoGallery.tsx sections)
- react-beautiful-dnd → @hello-pangea/dnd (completed)

---

## 📊 **WEDDING INDUSTRY UX PATTERNS**

### **Mobile Wedding Day Optimization**
From `/wedding-ux-intelligence.json`:
- **60% mobile usage** during wedding coordination
- **Emergency access patterns** for wedding day stress
- **Touch targets minimum 48px** for tablet coordinators
- **Offline capability** for poor venue WiFi

### **Emergency Quick Access**
From `/emergency-quick-access-patterns.tsx`:
- Context-aware floating action buttons
- One-handed operation for photographers  
- Voice command fallbacks
- Offline emergency queue system

---

## ⚙️ **AUTOMATED WORKFLOWS**

### **Weekly Governance Cycle**
```json
// In state file - governance automation
"governance_schedule": {
  "weekly_scan": "Mondays 9am",
  "compliance_report": "Generated automatically",
  "critical_issue_alerts": "Immediate notification"
}
```

### **Decision Tracking**
```json
// All decisions tracked in state
"decision_metrics": {
  "total_decisions": 15,
  "dnd_kit_chosen": 8,
  "hello_pangea_chosen": 5, 
  "xyflow_chosen": 2,
  "pending_approvals": 1
}
```

---

## 🎯 **SESSION WORKFLOW**

### **Starting Fresh Session**
1. Read `UIUX-STATE.json`
2. Process `pending_decisions` if any
3. Check if governance scan is due  
4. **NO MEMORY REQUIRED** from previous sessions

### **During Decision Process**
1. Analyze requirements using production patterns
2. Present structured approval request
3. Wait for user response
4. Update state file with approved decision

### **Ending Session**
1. Ensure `UIUX-STATE.json` is saved with all updates
2. Session can end anytime - state preserved  
3. Next session will resume from pending items

---

## 💡 **EXAMPLES**

### **Example 1: Fresh Decision**
```json
// Drop this README → Claude reads state
"pending_decisions": [{"feature": "WS-220", "status": "awaiting_analysis"}]
→ Claude: "Analyzing WS-220 for drag-drop technology..."
→ Presents approval request based on production patterns
```

### **Example 2: Governance Scan**
```json
// State shows scan is due  
"next_scan_due": "2025-01-15" (past date)
→ Claude: "Running weekly governance scan..."
→ Updates state with compliance results
```

### **Example 3: Resume Pending Approval**
```json
// State has pending approval waiting
"pending_decisions": [{"status": "awaiting_user_approval", "recommendation": "@dnd-kit"}]
→ Claude: "Waiting for approval on WS-218 seating chart (@dnd-kit recommendation)..."
```

---

**🎯 REMEMBER: This specialist is completely stateless. Every decision must read and update the state file. Never assume memory of previous conversations or approvals.**

---

**Generated**: 2025-01-20  
**Purpose**: Tech stack governance for drag-drop decisions  
**Operation**: Stateless with persistent decision tracking