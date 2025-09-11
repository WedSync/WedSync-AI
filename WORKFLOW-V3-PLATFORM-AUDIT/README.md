# 🔍 WORKFLOW-V3-PLATFORM-AUDIT
## WedSync Comprehensive Platform Health Check System

**Created**: 2025-09-11  
**Purpose**: Systematic audit of all WedSync platforms with Playwright automation  
**Status**: Active Development  

---

## 🎯 **MISSION STATEMENT**

Conduct a comprehensive audit of **all 3 WedSync platforms** (247 pages total) to identify:
- Broken buttons and non-functional UI elements
- Missing backend integrations and API failures
- Placeholder content vs working features
- Component integration gaps
- Cross-platform functionality issues

**Goal**: Transform scattered, partially-working pages into a fully functional wedding platform.

---

## 🏗️ **WORKFLOW ARCHITECTURE**

```
📊 PLATFORM DISCOVERY AGENT
   ├── Scans all 3 platforms for navigation structure
   ├── Uses Platform Architecture Template as reference
   ├── Creates comprehensive page inventory
   └── Output: complete-navigation-map.json

          ↓

🔍 INTERACTIVE AUDIT AGENT  
   ├── Playwright MCP for automated testing
   ├── Tests every button, link, form, dropdown
   ├── Records console errors and network failures
   └── Output: page-audit-reports/[platform]/[page].md

          ↓

🧩 COMPONENT DISCOVERY AGENT
   ├── Filesystem MCP to scan /src/components/
   ├── Matches broken features to available components
   ├── Memory MCP for persistent component mapping
   └── Output: component-feature-mapping.json

          ↓

📋 ISSUE CLASSIFICATION AGENT
   ├── Categorizes issues by type and severity
   ├── Creates developer-friendly fix instructions
   ├── Sequential Thinking MCP for complex analysis
   └── Output: categorized-issues/[priority]/[type]/

          ↓

🛠️ FIX INSTRUCTION GENERATOR
   ├── Creates IKEA-style assembly instructions
   ├── REF MCP for technical documentation lookup
   ├── Never modifies code - only documents fixes
   └── Output: fix-instructions/[issue-id]/README.md
```

---

## 🤖 **AGENT SPECIFICATIONS**

### **Agent 1: Platform Discovery Agent**
- **MCP Access**: Filesystem, Memory, REF
- **Responsibilities**: 
  - Map all navigation structures
  - Inventory expected vs existing pages
  - Cross-reference with Platform Architecture Template
- **Output**: Navigation discovery reports
- **Resumable**: Yes - saves progress to STATE/discovery-progress.json

### **Agent 2: Interactive Audit Agent**
- **MCP Access**: Playwright, Memory, Filesystem
- **Responsibilities**:
  - Test every interactive element
  - Capture screenshots of broken states
  - Record console errors and network issues
- **Output**: Per-page audit reports with evidence
- **Resumable**: Yes - tracks audited pages in STATE/audit-progress.json

### **Agent 3: Component Discovery Agent** 
- **MCP Access**: Filesystem, Memory, REF
- **Responsibilities**:
  - Scan /src/components/ for available pieces
  - Match components to broken features
  - Analyze component integration patterns
- **Output**: Component-feature mapping database
- **Resumable**: Yes - maintains component inventory

### **Agent 4: Issue Classification Agent**
- **MCP Access**: Sequential Thinking, Memory, Filesystem
- **Responsibilities**:
  - Categorize issues by type and priority
  - Create fix complexity estimates  
  - Generate developer task tickets
- **Output**: Classified issue database
- **Resumable**: Yes - processes issues incrementally

### **Agent 5: Fix Instruction Generator**
- **MCP Access**: REF, Memory, Filesystem
- **Responsibilities**:
  - Create human-readable fix instructions
  - Reference original specifications
  - Generate before/after expectations
- **Output**: Step-by-step fix guides
- **Resumable**: Yes - generates instructions per issue

---

## 📊 **AUDIT SCOPE**

### **Platform Coverage (247 pages total)**
- 🏢 **WedSync Supplier Platform**: 156 pages
  - Dashboard, Forms, Clients, Journey Builder, Analytics, etc.
- 💕 **WedMe Couple Platform**: 68 pages  
  - Client dashboard, wedding planning, guest management
- ⚙️ **Admin Dashboard**: 45 pages
  - Platform management, monitoring, user administration

### **Test Categories**
1. **Navigation**: Links, breadcrumbs, menu items
2. **Buttons**: All clickable elements and their actions
3. **Forms**: Input fields, validation, submission
4. **Data Loading**: API calls, loading states, error handling
5. **Interactive Elements**: Dropdowns, modals, tabs, accordions
6. **Media**: Image uploads, galleries, file handling
7. **Real-time**: WebSocket connections, live updates
8. **Mobile**: Responsive design, touch interactions

---

## 🔧 **MCP SERVER INTEGRATION**

### **Required MCP Servers**
- ✅ **Playwright MCP**: Browser automation and testing
- ✅ **Filesystem MCP**: Component discovery and file operations
- ✅ **Memory MCP**: Persistent state and session continuity
- ✅ **Sequential Thinking MCP**: Complex issue analysis
- ✅ **REF MCP**: Library documentation and technical reference
- ✅ **PostgreSQL MCP**: Database health checking

### **CLI Tool Access**
- ✅ **GitHub CLI**: Issue creation and PR management
- ✅ **Supabase CLI**: Database inspection and migration
- ✅ **Standard CLI**: File operations, git, npm/yarn

---

## 📁 **OUTPUT STRUCTURE**

```
WORKFLOW-V3-PLATFORM-AUDIT/
├── AGENTS/                     # Agent specifications and configs
│   ├── 01-platform-discovery-agent.md
│   ├── 02-interactive-audit-agent.md
│   ├── 03-component-discovery-agent.md
│   ├── 04-issue-classification-agent.md
│   └── 05-fix-instruction-generator.md
├── OUTPUT/                     # Generated reports and data
│   ├── navigation-maps/
│   ├── audit-reports/
│   ├── component-inventories/
│   ├── issue-databases/
│   └── fix-instructions/
├── REPORTS/                    # Executive summaries
│   ├── platform-health-summary.md
│   ├── critical-issues-list.md
│   └── implementation-roadmap.md
├── STATE/                      # Persistent workflow state
│   ├── workflow-progress.json
│   ├── agent-states.json
│   └── session-continuity.json
└── README.md                   # This file
```

---

## 🚀 **EXECUTION WORKFLOW**

### **Phase 1: Discovery (Agent 1)**
1. Load Platform Architecture Template
2. Scan all 3 dashboard navigation structures
3. Create comprehensive page inventory
4. Identify navigation gaps and orphan pages

### **Phase 2: Interactive Testing (Agent 2)**
1. Load discovery results
2. Systematically test every page with Playwright
3. Document all broken interactions with screenshots
4. Record console errors and network failures

### **Phase 3: Component Analysis (Agent 3)**
1. Scan /src/components/ directory structure
2. Map available components to broken features
3. Analyze integration patterns and dependencies
4. Create component-feature relationship database

### **Phase 4: Issue Classification (Agent 4)**
1. Process all discovered issues
2. Categorize by type, severity, and fix complexity
3. Create priority matrix for development work
4. Generate developer task tickets

### **Phase 5: Fix Documentation (Agent 5)**
1. Create step-by-step fix instructions
2. Reference original specifications from REF MCP
3. Generate visual mockups and expectations
4. Produce implementation roadmap

---

## 💾 **SESSION PERSISTENCE**

### **State Management**
- All agents save progress to STATE/ directory
- Workflow can resume from any interruption point
- Cross-session continuity maintained via Memory MCP
- Progress tracking prevents duplicate work

### **Recovery Mechanisms**
- **Agent Crash**: Resume from last saved state
- **Session Timeout**: Continue from progress files
- **Network Issues**: Retry with exponential backoff
- **Memory Limits**: Incremental processing with checkpoints

---

## ⚡ **SUCCESS METRICS**

### **Quantitative Goals**
- ✅ **100% Page Coverage**: All 247 pages audited
- ✅ **Issue Classification**: All problems categorized and prioritized
- ✅ **Fix Instructions**: Clear remediation steps for every issue
- ✅ **Visual Evidence**: Screenshots proving issues and expected fixes

### **Qualitative Goals**
- ✅ **Actionable Results**: Developers can immediately start fixing
- ✅ **Business Impact**: Focus on wedding-critical functionality
- ✅ **Technical Depth**: Component-level integration analysis
- ✅ **Maintainable Process**: Reusable for future audits

---

## 🔄 **WORKFLOW COMMANDS**

### **Start New Audit**
```bash
# Initialize workflow state
echo "Starting WORKFLOW-V3-PLATFORM-AUDIT..."

# Launch Platform Discovery Agent
# (Agent automatically uses appropriate MCP servers)
```

### **Resume Existing Audit**
```bash
# Check current progress
cat STATE/workflow-progress.json

# Continue from last checkpoint
# (Agents read state and resume automatically)
```

### **Generate Reports**
```bash
# Create executive summary
# (Aggregates all agent outputs into business-readable format)
```

---

## 🎯 **EXPECTED DELIVERABLES**

1. **Executive Summary**: Platform health overview for business decisions
2. **Critical Issues List**: High-priority fixes needed for basic functionality
3. **Component Integration Map**: How to wire existing pieces together
4. **Developer Task Tickets**: Specific, actionable development work
5. **Implementation Roadmap**: Phased approach to fixing all issues
6. **Visual Evidence Package**: Screenshots proving issues and expected solutions

---

**This workflow will transform WedSync from a collection of beautiful-but-broken pages into a fully functional, integrated wedding platform.**

---

**Next Steps**: Execute Phase 1 - Platform Discovery Agent