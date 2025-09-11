# 📋 SESSION TEMPLATE - MANDATORY COMPLIANCE STRUCTURE
## Enterprise-Grade Session Prompt Framework

**PURPOSE:** Standardized session format enforcing PM-WORKFLOW-ENFORCEMENT.md  
**USAGE:** ALL session prompts must follow this exact structure  
**COMPLIANCE:** Missing sections = immediate workflow stoppage

---

## 📄 TEMPLATE STRUCTURE (6 MANDATORY SECTIONS)

### **SECTION 1: MISSION CONTEXT (FROM CORE-SPECIFICATIONS)**
```markdown
# SESSION [A/B/C]: [FEATURE NAME] - [SPECIFIC TECHNICAL FOCUS]

**Date:** [YYYY-MM-DD]  
**Priority:** [P0/P1/P2] [ROADMAP CONTEXT]  
**Mission:** [One-sentence technical objective]  
**Context:** [Project completion % and why this feature blocks progress]

---

## 🎯 TECHNICAL REQUIREMENTS (FROM CORE-SPECIFICATIONS)

**From [SPECIFIC CORE-SPECIFICATIONS PATH]:**
[Paste relevant sections with exact implementation requirements]

**Technology Stack (VERIFIED):**
- [Component]: [Specific technology from tech-stack-decisions.md]
- [Component]: [Specific technology from tech-stack-decisions.md]  
- [Component]: [Specific technology from tech-stack-decisions.md]

**Integration Points:**
- [Existing System 1]: [How this feature connects]
- [Existing System 2]: [How this feature connects]
- [Database]: [Specific schema and relationships]
```

### **SECTION 2: PARALLEL AGENT DEPLOYMENT (6+ AGENTS MANDATORY)**
```markdown
## 🚀 MANDATORY PARALLEL AGENTS (Launch ALL immediately)

**CRITICAL:** [Feature Name] requires [domain] + technical expertise:

1. **task-tracker-coordinator** - [Specific tracking responsibility]
2. **[technical-specialist]** - [Specific technical role and tasks]
3. **[domain-specialist]** - [Specific domain knowledge needed] 
4. **[security-specialist]** - [Security requirements and validation]
5. **[quality-specialist]** - [Quality gates and testing requirements]
6. **playwright-visual-testing-specialist** - [Visual testing and proof requirements]
7. **[additional-specialist]** - [Additional expertise if needed]

**AGENT USAGE TARGET:** >75% of session time in parallel execution
```

### **SECTION 3: DETAILED IMPLEMENTATION ROADMAP**
```markdown  
## 📋 DEVELOPMENT WORKFLOW: [APPROACH-DESCRIPTION]

### **[STEP 1]: [COMPONENT NAME] ([TIME ESTIMATE]) - [SPECIFIC FOCUS]**

**From [CORE-SPECIFICATIONS PATH]:**
[Exact specifications for this component]

**Implementation Requirements:**
- [Requirement 1]: [Specific detail]
- [Requirement 2]: [Specific detail] 
- [Requirement 3]: [Specific detail]

**Code Structure:**
```[language]
// [File path and implementation example]
[Specific code pattern or interface]
```

**Integration Points:**
- [System 1]: [How to integrate]
- [System 2]: [How to integrate]

### **[STEP 2]: [COMPONENT NAME] ([TIME ESTIMATE]) - [SPECIFIC FOCUS]**
[Repeat structure for each major component]

### **[STEP N]: [FINAL COMPONENT] ([TIME ESTIMATE]) - [SPECIFIC FOCUS]**  
[Final implementation step]
```

### **SECTION 4: DATABASE & INTEGRATION SPECIFICATIONS**
```markdown
## 🔗 DATABASE INTEGRATION

**From [CORE-SPECIFICATIONS DATABASE PATH]:**

**Schema Requirements:**
```sql  
[Exact SQL schema from specifications]
```

**Data Relationships:**
- [Table 1] → [Table 2]: [Relationship type and purpose]
- [Table 2] → [Table 3]: [Relationship type and purpose]

**API Integration:**
```typescript
// [API route specifications]
[Interface definitions and endpoint patterns]  
```

**Real-time Updates:**
- [Feature]: [Supabase subscription pattern]
- [Feature]: [Real-time sync requirements]
```

### **SECTION 5: 🎆 REVOLUTIONARY PLAYWRIGHT MCP TESTING (MANDATORY)**
```markdown
## 🎭 REVOLUTIONARY PLAYWRIGHT MCP TESTING

**🧠 ACCESSIBILITY-FIRST VALIDATION (MICROSOFT'S BREAKTHROUGH):**
```javascript
// Revolutionary accessibility-first testing (not screenshot guessing!)
// From Microsoft's Playwright MCP - structured accessibility trees

// 1. ACCESSIBILITY SNAPSHOT ANALYSIS (REVOLUTIONARY!)
await mcp__playwright__browser_navigate({url: "http://localhost:3000/[feature]"});
const accessibilityStructure = await mcp__playwright__browser_snapshot();
// Returns structured accessibility tree for LLM analysis (zero ambiguity!)

// 2. MULTI-TAB COMPLEX USER FLOW TESTING (GAME CHANGER!)
await mcp__playwright__browser_tab_new({url: "/forms/builder"});       // Tab 1: Form builder
await mcp__playwright__browser_tab_new({url: "/dashboard"});           // Tab 2: Dashboard
await mcp__playwright__browser_tab_select({index: 0});                // Switch to builder
await mcp__playwright__browser_drag({                                 // Test drag & drop
  startElement: "[drag-source]", startRef: "[specific-ref]",
  endElement: "[drop-target]", endRef: "[specific-ref]"
});
await mcp__playwright__browser_tab_select({index: 1});                // Switch to dashboard
await mcp__playwright__browser_wait_for({text: "Form created"});      // Verify state sync

// 3. SCIENTIFIC PERFORMANCE MEASUREMENT (NOT ESTIMATES!)
const realMetrics = await mcp__playwright__browser_evaluate({
  function: `() => ({
    LCP: performance.getEntriesByType('largest-contentful-paint')[0]?.startTime,
    FCP: performance.getEntriesByType('paint').find(p => p.name === 'first-contentful-paint')?.startTime,
    TTFB: performance.timing.responseStart - performance.timing.fetchStart,
    loadTime: performance.timing.loadEventEnd - performance.timing.navigationStart,
    memoryUsage: performance.memory ? performance.memory.usedJSHeapSize : 0
  })`
});

// 4. INTELLIGENT ERROR DETECTION
const consoleErrors = await mcp__playwright__browser_console_messages();
const networkFailures = await mcp__playwright__browser_network_requests();
const failedRequests = networkFailures.filter(req => req.status >= 400);

// 5. RESPONSIVE ACCESSIBILITY VALIDATION  
const viewports = [375, 768, 1920];
for (const width of viewports) {
  await mcp__playwright__browser_resize({width, height: 800});
  const responsiveSnapshot = await mcp__playwright__browser_snapshot();
  await mcp__playwright__browser_take_screenshot({filename: `${width}px.png`});
}
```

**🎯 REVOLUTIONARY TEST COVERAGE REQUIREMENTS:**
- [ ] 🧠 **Accessibility-first validation** (structured tree analysis vs pixel guessing)
- [ ] 🎯 **Multi-tab user flow testing** (realistic complex workflows)
- [ ] 📊 **Scientific performance measurement** (real Core Web Vitals, not estimates)
- [ ] 🔍 **Zero-error validation** (console + network monitoring)
- [ ] 📱 **Responsive accessibility** (accessibility maintained at all sizes)
- [ ] 🎨 **Visual regression prevention** (baseline comparison + diff detection)
- [ ] 🌐 **Cross-browser accessibility** (accessibility tree consistency)

**🎆 REVOLUTIONARY EVIDENCE REQUIREMENTS:**
- Accessibility snapshot structure (LLM-analyzable semantic data)
- Multi-tab workflow videos (complex user journey proof)
- Scientific performance measurements (actual Core Web Vitals data)
- Zero console errors proof (mcp__playwright__browser_console_messages output)
- Network request success validation (no 4xx/5xx responses)
- Responsive accessibility screenshots (accessibility maintained at all sizes)
- Multi-viewport performance data (loading metrics at each breakpoint)
```

### **SECTION 6: SUCCESS CRITERIA & VERIFICATION**
```markdown
## ✅ SUCCESS CRITERIA (NON-NEGOTIABLE)

**You CANNOT claim completion unless:**

### **Technical Implementation:**
- [ ] [Specific requirement 1] (screenshot required)
- [ ] [Specific requirement 2] (Playwright test required)
- [ ] [Specific requirement 3] (performance metric required)
- [ ] [Specific requirement 4] (accessibility validation required)

### **Integration Verification:**  
- [ ] [Integration point 1] working end-to-end
- [ ] [Integration point 2] with real data flow
- [ ] [Database operations] with proper JSONB storage
- [ ] [API endpoints] returning correct responses

### **Evidence Package:**
- [ ] Working [feature] with [specific functionality]
- [ ] [Performance requirement] verified by Playwright
- [ ] [Database proof] showing [specific data structure]
- [ ] Playwright test suite covering [specific interactions]
- [ ] Security validation with [specific checks]

**CLEANUP REQUIREMENTS:**
- [ ] Session files moved to /SESSION-LOGS/[date]/
- [ ] No files created in root directory
- [ ] Documentation updated in proper locations only
- [ ] Session report with evidence package complete

---

## 🚨 COMPLIANCE CHECKPOINTS

**Throughout Development:**
- Are you using >75% parallel agent time?
- Are you following CORE-SPECIFICATIONS exactly?  
- Are you creating visual proof via Playwright?
- Are you testing edge cases and error conditions?

**Before Claiming Complete:**
- Run verification checklist line by line
- Test feature with real user workflows
- Measure actual performance metrics
- Provide screenshot evidence package

**Session Report Location:**
`/SESSION-LOGS/[YYYY-MM-DD]/session-[a/b/c]-[feature]-report.md`
```

---

## 🔧 TEMPLATE USAGE INSTRUCTIONS

### **FOR PM:** 
1. Replace all `[BRACKETED]` sections with feature-specific content
2. Copy exact specifications from CORE-SPECIFICATIONS documents
3. Verify technology choices match tech-stack-decisions.md
4. Include specific agent assignments based on feature complexity
5. Add detailed verification requirements with evidence specifications

### **MANDATORY CUSTOMIZATION:**
- **Mission Context:** Must reference specific CORE-SPECIFICATIONS documents
- **Agent Deployment:** Must assign 6+ agents with specific roles
- **Implementation:** Must include exact code patterns and file paths
- **Testing:** Must specify Playwright tests for the feature type
- **Verification:** Must require specific evidence for completion claims

### **COMPLIANCE VERIFICATION:**
Before using any session prompt created from this template:
- [ ] All 6 sections present and complete
- [ ] CORE-SPECIFICATIONS references included
- [ ] 6+ parallel agents assigned
- [ ] Playwright testing requirements specified
- [ ] Evidence requirements clearly defined
- [ ] Cleanup procedures included

**VIOLATION CONSEQUENCE:** Session prompt rejected, must recreate following template

---

## 📋 EXAMPLE USAGE

### **Feature: Journey Builder**
```markdown
# SESSION C: JOURNEY BUILDER - WEDDING-SPECIFIC AUTOMATION CANVAS

**Date:** 2025-01-20  
**Priority:** P1 ROADMAP FEATURE - Phase 2 Critical Path  
**Mission:** Build wedding-specific journey automation canvas with timeline anchors  
**Context:** Project is 75% complete - Journey Builder is #1 blocking feature for Beta Launch

## 🎯 TECHNICAL REQUIREMENTS (FROM CORE-SPECIFICATIONS)

**From CORE-SPECIFICATIONS/02-WEDSYNC-SUPPLIER-PLATFORM/05-Customer-Journey/01-journey-canvas.md:**
- Horizontal timeline layout with wedding date anchors
- Drag-and-drop using @dnd-kit (NOT @xyflow/react)
- JSONB storage for canvas data and node definitions
[Continue with full specification details...]

## 🚀 MANDATORY PARALLEL AGENTS (Launch ALL immediately)

1. **task-tracker-coordinator** - Track all journey canvas components systematically  
2. **react-ui-specialist** - @dnd-kit drag-and-drop canvas with wedding customizations
3. **nextjs-fullstack-developer** - API routes for journey execution and storage
4. **wedding-domain-expert** - Wedding timeline logic and supplier workflows
5. **postgresql-database-expert** - JSONB journey storage with execution tracking
6. **playwright-visual-testing-specialist** - Visual testing of drag-and-drop canvas
[Continue with implementation roadmap, database specs, testing requirements...]
```

---

**THIS TEMPLATE IS MANDATORY**  
**NO SESSION WITHOUT ALL 6 SECTIONS**  
**COMPLIANCE IS NON-NEGOTIABLE**