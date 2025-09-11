# 🚨 PM WORKFLOW ENFORCEMENT - MANDATORY COMPLIANCE SYSTEM
## Zero Tolerance for Workflow Violations

**CRITICAL:** This document OVERRIDES all other guidance when conflicts arise  
**STATUS:** ACTIVE - All PM activities must follow these protocols  
**VIOLATION CONSEQUENCE:** Immediate workflow stoppage and correction required

---

## 🔒 MANDATORY COMPLIANCE GATES

### **GATE 1: PRE-SESSION REQUIREMENTS (NON-BYPASSED)**

**BEFORE creating ANY session prompt, PM MUST:**

```markdown
□ Read complete CORE-SPECIFICATIONS for feature area (not summaries)
□ Verify tech stack in CORE-SPECIFICATIONS/00-PROJECT-OVERVIEW/04-tech-stack-decisions.md
□ Check DEVELOPMENT-ROADMAP.md current phase and week priorities
□ Review WORKFLOW-V2-BULLETPROOF.md for cleanup protocols
□ Confirm 5+ parallel agents assigned with specific roles
□ Include Playwright MCP testing requirements
□ Add verification checkpoints with evidence requirements
□ Specify exact file cleanup procedures in prompt
```

**VIOLATION:** Creating session without this checklist = WORKFLOW STOPPED

### **GATE 2: SESSION PROMPT QUALITY STANDARDS**

**EVERY session prompt MUST contain:**

```markdown
MANDATORY SECTIONS:
1. COMPLETE TECHNICAL CONTEXT (from CORE-SPECIFICATIONS)
2. PARALLEL AGENT DEPLOYMENT (5+ agents named)
3. PLAYWRIGHT MCP TESTING REQUIREMENTS
4. VERIFICATION EVIDENCE REQUIREMENTS
5. FILE CLEANUP PROCEDURES
6. WORKFLOW COMPLIANCE CHECKPOINTS
```

**VIOLATION:** Incomplete prompt = WORKFLOW STOPPED

### **GATE 3: VERIFICATION PROTOCOLS (TRUST BUT VERIFY)**

**DAILY VERIFICATION REQUIREMENTS:**

```markdown
MORNING VERIFICATION (8:30 AM):
□ Test all "completed" features from yesterday (actually run them)
□ Verify security claims with independent scans
□ Check agent usage logs show >75% parallel execution
□ Document verification results with evidence

EVENING VERIFICATION (6:00 PM):
□ Manual testing of all claimed completions
□ Screenshot collection for UI changes
□ Playwright test execution verification
□ Performance metrics validation
```

**VIOLATION:** Accepting completion claims without verification = WORKFLOW STOPPED

---

## 📋 MANDATORY PM DAILY CHECKLIST

### **8:00 AM - WORKFLOW PREPARATION**

```bash
# 1. Read yesterday's session reports
find /SESSION-LOGS/$(date -d "1 day ago" +%Y-%m-%d)/ -name "*.md" -exec cat {} \;

# 2. Verify yesterday's claims
cd wedsync && npm run build  # Must succeed
cd wedsync && npm run test   # Must pass
cd wedsync && npm run lint   # Must pass

# 3. Check CORE-SPECIFICATIONS updates
ls -la CORE-SPECIFICATIONS/ | head -20

# 4. Review current roadmap phase
grep "CURRENT FOCUS" DEVELOPMENT-ROADMAP.md
```

### **SESSION CREATION PROCESS**

```markdown
STEP 1: RESEARCH (30 minutes minimum)
- Read ALL relevant CORE-SPECIFICATIONS documents
- Note exact implementation requirements
- Identify integration points with existing features
- Document technology choices from specifications

STEP 2: CONTEXT ENGINEERING (15 minutes)
- Create comprehensive technical context from specs
- Include exact file paths and code examples
- Specify integration requirements
- Add wedding domain context where relevant

STEP 3: AGENT DEPLOYMENT PLANNING
- task-tracker-coordinator (ALWAYS FIRST)
- Technical specialist (based on feature)
- Domain specialist (wedding-domain-expert if relevant)
- Security specialist (security-compliance-officer)
- Quality specialist (code-quality-guardian OR test-automation-architect)
- Playwright specialist (playwright-visual-testing-specialist)

STEP 4: VERIFICATION REQUIREMENTS
- Specific evidence requirements
- Performance benchmarks
- Security validation steps
- Screenshot/video proof requirements
```

### **6:00 PM - MANDATORY VERIFICATION**

```markdown
VERIFICATION PROTOCOL:

1. FUNCTIONAL TESTING
   □ Run each "completed" feature manually
   □ Test edge cases and error conditions
   □ Verify mobile responsiveness
   □ Check cross-browser compatibility

2. SECURITY VERIFICATION
   □ Run npm audit
   □ Check authentication on new endpoints
   □ Test rate limiting
   □ Scan for exposed secrets

3. PERFORMANCE VALIDATION
   □ Measure page load times
   □ Check bundle size impact
   □ Test with realistic data volumes
   □ Verify memory usage stable

4. DOCUMENTATION COMPLIANCE
   □ Verify file cleanup completed
   □ Check session reports created
   □ Confirm no root directory pollution
   □ Update PROJECT-STATUS.md only
```

---

## 🚫 WORKFLOW VIOLATION CONSEQUENCES

### **LEVEL 1: DOCUMENTATION VIOLATION**
- **Examples:** Wrong tech stack, missing CORE-SPECIFICATIONS reading
- **Action:** Immediate correction required, session re-creation
- **Escalation:** Level 2 after 2 violations

### **LEVEL 2: VERIFICATION VIOLATION**
- **Examples:** False completion claims, no evidence provided
- **Action:** All future claims require proof
- **Escalation:** Level 3 after 2 violations

### **LEVEL 3: SYSTEMATIC VIOLATION**
- **Examples:** Repeated workflow bypassing, consistent false claims
- **Action:** Complete workflow review and re-training
- **Escalation:** Project workflow evaluation

---

## 📁 MANDATORY FILE STRUCTURE COMPLIANCE

### **ROOT DIRECTORY PROTECTION**
```
/WedSync2/ (5 FILES ONLY - NEVER EXCEED)
├── PM-MASTER-CONTROL.md
├── WORKFLOW-V2-BULLETPROOF.md
├── PROJECT-STATUS.md
├── DEVELOPMENT-ROADMAP.md
├── SECURITY-REQUIREMENTS.md
├── PRICING-TIERS.md
└── PM-WORKFLOW-ENFORCEMENT.md (THIS FILE)
```

**VIOLATION:** Creating files in root = IMMEDIATE CLEANUP REQUIRED

### **SESSION FILES LOCATION**
```
ALL SESSION FILES GO HERE:
/SESSION-LOGS/[YYYY-MM-DD]/
├── session-[a/b/c]-prompt.md
├── session-[a/b/c]-report.md
└── verification-report.md
```

### **CLEANUP VERIFICATION**
```bash
# Run after every session
ls -la . | wc -l  # Must be ≤15 (including hidden files)
find . -maxdepth 1 -name "*.md" | grep -v -E "(PM-|WORKFLOW|PROJECT|DEVELOPMENT|SECURITY|PRICING)" | wc -l  # Must be 0
```

---

## 🎯 AGENT USAGE ENFORCEMENT

### **MINIMUM AGENT REQUIREMENTS**
- **Required:** >75% of session time using parallel agents
- **Proof:** Agent usage must be logged and verifiable
- **Sessions:** Must show evidence of parallel execution

### **MANDATORY AGENT TYPES PER SESSION**
```typescript
interface SessionAgentRequirements {
  always: ['task-tracker-coordinator']
  technical: ['react-ui-specialist' | 'nextjs-fullstack-developer' | 'postgresql-database-expert']
  domain: ['wedding-domain-expert'] // if wedding features
  quality: ['code-quality-guardian' | 'test-automation-architect']
  security: ['security-compliance-officer']
  testing: ['playwright-visual-testing-specialist']
}
```

**VIOLATION:** <75% agent usage = SESSION MARKED FAILED

---

## 🔍 VERIFICATION SCORECARD SYSTEM

### **SESSION ACCURACY TRACKING**
```markdown
SESSION ACCURACY = (Verified Claims / Total Claims) × 100

90-100%: TRUSTED - Continue with minimal oversight
70-89%:  VERIFY - Increase verification frequency  
50-69%:  SUSPICIOUS - Deep verification required
<50%:    UNRELIABLE - All claims require proof
```

### **DAILY VERIFICATION REPORT TEMPLATE**
```markdown
# VERIFICATION REPORT - [DATE]

## CLAIMS vs REALITY
**Session A:** [X]% accuracy - [Details]
**Session B:** [X]% accuracy - [Details]  
**Session C:** [X]% accuracy - [Details]

## CRITICAL FINDINGS
- Security issues: [List]
- Broken features: [List]
- Test failures: [List]

## REMEDIATION REQUIRED
P0 (Block new work): [List]
P1 (Fix within 24h): [List]

## WORKFLOW COMPLIANCE
□ All sessions used >75% parallel agents
□ All sessions provided evidence
□ All sessions cleaned up files
□ All sessions followed CORE-SPECIFICATIONS
```

---

## 🚀 PLAYWRIGHT MCP ENFORCEMENT

### **MANDATORY PLAYWRIGHT USAGE**
**EVERY UI feature MUST have:**
```typescript
// Visual regression test
await mcp__playwright__browser_take_screenshot({
  filename: `${feature}-baseline.png`
})

// Functional test
await mcp__playwright__browser_click({
  element: "Feature Button",
  ref: "feature-btn"
})

// Performance test
const metrics = await mcp__playwright__browser_evaluate({
  function: '() => performance.timing'
})

// Accessibility test
await mcp__playwright__browser_snapshot()
```

**VIOLATION:** UI feature without Playwright tests = INCOMPLETE

---

## 📊 SUCCESS METRICS ENFORCEMENT

### **DAILY TARGETS (NON-NEGOTIABLE)**
- Agent usage: >75% (logged and verified)
- Security score: ≥8/10 (scanned)
- Test coverage: >80% (measured)
- Performance: <1s page loads (Playwright verified)
- Documentation: Structured in correct locations

### **WEEKLY TARGETS**
- Code quality: Improving trend
- Bug rate: Decreasing trend  
- Verification accuracy: >90%
- Workflow compliance: 100%

---

## ⚠️ IMPLEMENTATION NOTICE

**EFFECTIVE IMMEDIATELY:** All PM activities must follow these protocols.

**NO EXCEPTIONS:** These are minimum standards for enterprise-grade development.

**ACCOUNTABILITY:** PM is responsible for enforcing these standards consistently.

**RESULT:** Systematic elimination of workflow gaps and achievement of enterprise quality standards.

---

**THIS DOCUMENT SUPERSEDES ALL CONFLICTING GUIDANCE**
**COMPLIANCE IS MANDATORY**
**VIOLATIONS WILL BE ADDRESSED IMMEDIATELY**