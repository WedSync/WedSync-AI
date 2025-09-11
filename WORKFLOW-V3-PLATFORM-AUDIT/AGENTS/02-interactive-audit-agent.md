# 🔍 INTERACTIVE AUDIT AGENT
## Agent 2: Comprehensive UI/UX Testing & Validation

**Agent ID**: 02-interactive-audit-agent  
**Status**: Ready for Deployment  
**MCP Requirements**: Playwright, Filesystem, Memory, Sequential Thinking  
**CLI Requirements**: Screenshot management, file operations  

---

## 🎯 **MISSION STATEMENT**

Systematically test every interactive element across all 3 WedSync platforms using Playwright automation, documenting broken functionality, capturing visual evidence, and providing detailed issue reports for developer remediation.

---

## 🛠️ **MCP SERVER ACCESS**

### **Required MCP Servers**
```json
{
  "playwright_mcp": {
    "purpose": "Browser automation and comprehensive UI testing",
    "operations": [
      "browser_navigate", "browser_click", "browser_type", "browser_snapshot",
      "browser_take_screenshot", "browser_console_messages", "browser_network_requests",
      "browser_fill_form", "browser_press_key", "browser_hover", "browser_wait_for"
    ]
  },
  "filesystem_mcp": {
    "purpose": "Save audit reports and manage screenshot evidence",
    "operations": ["write_file", "create_directory", "list_directory", "read_text_file"]
  },
  "memory_mcp": {
    "purpose": "Session persistence and progress tracking",
    "operations": ["store", "retrieve", "update_session_state"]
  },
  "sequential_thinking_mcp": {
    "purpose": "Complex issue analysis and root cause determination", 
    "operations": ["analyze_patterns", "determine_root_causes", "prioritize_issues"]
  }
}
```

---

## 📊 **AUDIT SCOPE & METHODOLOGY**

### **Testing Categories**
1. **🔗 Navigation Testing**
   - All sidebar navigation links
   - Breadcrumb navigation
   - Tab switching within pages
   - Cross-platform navigation

2. **🖱️ Interactive Element Testing**
   - All buttons (primary, secondary, icon buttons)
   - Dropdown menus and select components
   - Modal triggers and closures
   - Accordion expansions/collapses

3. **📝 Form Testing**
   - Input field functionality
   - Form validation (client-side and server-side)
   - Form submission and error handling
   - File upload capabilities

4. **📊 Data Loading Testing**
   - API endpoint health
   - Loading state management
   - Error state handling
   - Empty state displays

5. **📱 Responsive Testing**
   - Mobile viewport testing (375px, 768px, 1920px)
   - Touch interaction validation
   - Mobile navigation functionality

---

## 🔍 **TESTING METHODOLOGY**

### **Phase 1: Page Discovery & Initial Load**
```typescript
// Load discovery results from Platform Discovery Agent
const discoveryReport = await memory_mcp.retrieve("platform-discovery-results");
const pagesToTest = discoveryReport.discovered_pages;

// Test each page systematically
for (const page of pagesToTest) {
  await testPageComprehensively(page);
}

async function testPageComprehensively(pageUrl: string) {
  // Navigate to page
  await playwright_mcp.browser_navigate({ url: pageUrl });
  
  // Take initial screenshot
  const screenshotPath = `audit-evidence/${pageUrl.replace(/[^a-zA-Z0-9]/g, '-')}-initial.png`;
  await playwright_mcp.browser_take_screenshot({ 
    filename: screenshotPath,
    fullPage: true 
  });
  
  // Capture page accessibility snapshot
  const pageSnapshot = await playwright_mcp.browser_snapshot();
  
  // Record console errors
  const consoleMessages = await playwright_mcp.browser_console_messages();
  const errors = consoleMessages.filter(msg => msg.type === 'error');
}
```

### **Phase 2: Interactive Element Discovery**
```typescript
async function discoverInteractiveElements(pageSnapshot: any) {
  const interactiveElements = [];
  
  // Find all buttons
  const buttons = extractElementsByType(pageSnapshot, 'button');
  interactiveElements.push(...buttons.map(btn => ({ type: 'button', ...btn })));
  
  // Find all links  
  const links = extractElementsByType(pageSnapshot, 'link');
  interactiveElements.push(...links.map(link => ({ type: 'link', ...link })));
  
  // Find all form elements
  const forms = extractElementsByType(pageSnapshot, ['textbox', 'combobox', 'checkbox']);
  interactiveElements.push(...forms.map(form => ({ type: 'form', ...form })));
  
  return interactiveElements;
}
```

### **Phase 3: Systematic Element Testing**
```typescript
async function testInteractiveElement(element: InteractiveElement) {
  const testResults = {
    element: element,
    tests: [],
    issues: [],
    evidence: []
  };
  
  try {
    switch (element.type) {
      case 'button':
        await testButton(element, testResults);
        break;
      case 'link':  
        await testNavigation(element, testResults);
        break;
      case 'form':
        await testFormElement(element, testResults);
        break;
    }
  } catch (error) {
    testResults.issues.push({
      type: 'interaction_error',
      error: error.message,
      element: element.ref
    });
  }
  
  return testResults;
}

async function testButton(element: any, results: any) {
  // Test button click
  const beforeClick = await playwright_mcp.browser_take_screenshot({ 
    filename: `before-click-${element.ref}.png` 
  });
  
  await playwright_mcp.browser_click({ 
    element: element.name, 
    ref: element.ref 
  });
  
  // Wait for potential modal/dropdown/navigation
  await playwright_mcp.browser_wait_for({ time: 2 });
  
  const afterClick = await playwright_mcp.browser_take_screenshot({ 
    filename: `after-click-${element.ref}.png` 
  });
  
  // Analyze what changed
  const pageChange = analyzePageChange(beforeClick, afterClick);
  
  if (pageChange.noChange) {
    results.issues.push({
      type: 'non_functional_button',
      description: `Button "${element.name}" shows no visible response when clicked`,
      evidence: [beforeClick, afterClick]
    });
  }
}
```

### **Phase 4: Complex Workflow Testing**
```typescript
async function testComplexWorkflows() {
  // Test multi-step user journeys
  const workflows = [
    {
      name: 'form_creation_workflow',
      steps: [
        { action: 'navigate', target: '/dashboard/forms' },
        { action: 'click', target: 'Create Form' },
        { action: 'type', target: 'form name input', text: 'Test Wedding Form' },
        { action: 'click', target: 'Save Form' },
        { action: 'verify', expected: 'form created successfully' }
      ]
    },
    {
      name: 'client_import_workflow', 
      steps: [
        { action: 'navigate', target: '/clients' },
        { action: 'click', target: 'Import Clients' },
        { action: 'upload', target: 'csv file input', file: 'test-clients.csv' },
        { action: 'click', target: 'Process Import' },
        { action: 'verify', expected: 'clients imported' }
      ]
    }
  ];
  
  for (const workflow of workflows) {
    await executeWorkflow(workflow);
  }
}
```

---

## 📋 **OUTPUT SPECIFICATIONS**

### **Per-Page Audit Report**
```json
{
  "page": "/dashboard/forms",
  "url": "http://localhost:3001/dashboard/forms",
  "timestamp": "2025-09-11T14:30:00Z",
  "agent": "02-interactive-audit-agent",
  "test_summary": {
    "total_elements_tested": 47,
    "functional_elements": 31,
    "broken_elements": 16,
    "critical_issues": 5,
    "minor_issues": 11
  },
  "page_health": {
    "loads_successfully": true,
    "console_errors": 3,
    "network_errors": 2,
    "accessibility_score": 85,
    "mobile_responsive": true
  },
  "interactive_elements": [
    {
      "element": {
        "type": "button",
        "name": "Create Form", 
        "ref": "e93",
        "location": "header actions"
      },
      "test_results": {
        "clickable": true,
        "navigates_correctly": true,
        "issues": []
      }
    },
    {
      "element": {
        "type": "button",
        "name": "Preferences",
        "ref": "e95",
        "location": "music database header"
      },
      "test_results": {
        "clickable": true,
        "shows_visual_feedback": true,
        "functional_response": false,
        "issues": [
          {
            "type": "non_functional_button",
            "severity": "medium",
            "description": "Button shows active state but no modal or dropdown appears",
            "evidence": ["before-click-e95.png", "after-click-e95.png"],
            "expected_behavior": "Should open preferences modal or settings dropdown",
            "root_cause": "Missing event handler or modal component integration"
          }
        ]
      }
    }
  ],
  "api_health": [
    {
      "endpoint": "/api/forms",
      "status": 500,
      "error": "Internal Server Error",
      "impact": "Forms list cannot load - shows permanent loading state"
    }
  ],
  "console_errors": [
    {
      "type": "TypeError",
      "message": "getCLS is not a function",
      "file": "monitoring-integration.js",
      "impact": "Web vitals monitoring broken"
    }
  ],
  "recommendations": [
    {
      "priority": "high",
      "issue": "Non-functional Preferences button",
      "fix": "Connect button click handler to preferences modal component",
      "components_available": ["PreferencesModal.tsx", "SettingsDropdown.tsx"]
    }
  ]
}
```

### **Cross-Platform Summary Report**
```json
{
  "audit_summary": {
    "total_pages_tested": 247,
    "wedsync_pages": 156,
    "wedme_pages": 68,
    "admin_pages": 45,
    "overall_health_score": 73,
    "critical_issues": 34,
    "total_issues": 189
  },
  "issue_breakdown": {
    "non_functional_buttons": 67,
    "api_errors": 23,
    "broken_forms": 15,
    "navigation_issues": 12,
    "console_errors": 72
  },
  "platform_scores": {
    "wedsync": { "health": 68, "critical_issues": 19 },
    "wedme": { "health": 82, "critical_issues": 8 },
    "admin": { "health": 71, "critical_issues": 7 }
  }
}
```

---

## 🔄 **EXECUTION WORKFLOW**

### **Step 1: Load Discovery Data**
- Retrieve Platform Discovery Agent results via Memory MCP
- Load priority page list and expected navigation flows
- Initialize testing queue with systematic coverage plan

### **Step 2: Browser Environment Setup**
- Configure Playwright browser with optimal settings
- Set viewport sizes for responsive testing
- Initialize screenshot and evidence collection directories

### **Step 3: Systematic Page Testing**
```bash
# Testing sequence per page:
# 1. Navigate to page
# 2. Capture initial state (screenshot + accessibility snapshot)
# 3. Record console errors and network requests  
# 4. Discover all interactive elements
# 5. Test each element systematically
# 6. Capture evidence of broken vs working elements
# 7. Generate per-page audit report
```

### **Step 4: Complex Workflow Testing** 
- Execute multi-step user journeys
- Test cross-platform navigation flows
- Validate form submission and data persistence
- Test responsive design across breakpoints

### **Step 5: Issue Analysis & Classification**
- Use Sequential Thinking MCP for complex issue analysis
- Determine root causes of broken functionality  
- Classify issues by severity and business impact
- Generate fix recommendations with available components

---

## 💾 **STATE PERSISTENCE**

### **Progress Tracking**
```json
{
  "agent": "02-interactive-audit-agent",
  "status": "in_progress",
  "progress": {
    "pages_completed": 127,
    "pages_total": 247,
    "current_page": "/dashboard/clients",
    "elements_tested": 1847,
    "issues_found": 156
  },
  "last_updated": "2025-09-11T14:45:00Z",
  "resume_point": {
    "page": "/dashboard/clients", 
    "element_index": 23,
    "test_phase": "interactive_element_testing"
  }
}
```

### **Evidence Management**
```
OUTPUT/audit-evidence/
├── page-screenshots/
│   ├── dashboard-forms-initial.png
│   ├── dashboard-music-initial.png
│   └── ...
├── element-interactions/
│   ├── before-click-preferences-e95.png
│   ├── after-click-preferences-e95.png
│   └── ...
├── error-states/
│   ├── api-500-error-forms.png
│   ├── console-errors-music.png
│   └── ...
└── responsive-testing/
    ├── mobile-375px-dashboard.png
    ├── tablet-768px-dashboard.png
    └── desktop-1920px-dashboard.png
```

---

## 🎯 **SUCCESS CRITERIA**

### **Completion Requirements**
- ✅ All 247 pages systematically tested with Playwright automation
- ✅ Every interactive element tested with visual evidence
- ✅ Console errors and API failures documented
- ✅ Responsive design validated across 3 breakpoints
- ✅ Complex workflow testing completed
- ✅ Comprehensive issue database generated

### **Quality Gates**
- >95% element coverage across all pages
- Visual evidence for every reported issue
- Root cause analysis using Sequential Thinking MCP
- Clear fix recommendations with component suggestions

---

## 🔗 **HANDOFF TO NEXT AGENT**

### **Data Provided to Agent 3 (Component Discovery Agent)**
1. **Detailed issue inventory** - exact broken elements needing fixes
2. **Visual evidence package** - screenshots showing expected vs actual behavior
3. **API health report** - backend integration status
4. **Priority issue list** - business-critical functionality gaps

### **Recommended Analysis for Agent 3**
1. **Map broken buttons to available components** - find existing modal/dropdown components
2. **Match broken forms to form components** - identify missing wiring/integration
3. **Connect API errors to backend endpoints** - prioritize API fixes
4. **Analyze placeholder content** - find fully-built components for "coming soon" features

---

## 🚀 **DEPLOYMENT INSTRUCTIONS**

### **Agent Activation Command**
```bash
# Execute Interactive Audit Agent
echo "🔍 ACTIVATING INTERACTIVE AUDIT AGENT"
echo "Agent ID: 02-interactive-audit-agent"  
echo "MCP Servers Required: playwright, filesystem, memory, sequential-thinking"
echo "Starting comprehensive UI testing..."

# Agent will automatically:
# 1. Load Platform Discovery results via Memory MCP
# 2. Initialize Playwright browser automation 
# 3. Test every page and interactive element systematically
# 4. Capture visual evidence using Playwright MCP
# 5. Generate detailed audit reports via Filesystem MCP
# 6. Analyze complex issues via Sequential Thinking MCP
# 7. Save persistent progress state via Memory MCP
```

**The Interactive Audit Agent will provide comprehensive UI/UX testing with visual proof of every broken element, creating a detailed issue database for rapid remediation.**