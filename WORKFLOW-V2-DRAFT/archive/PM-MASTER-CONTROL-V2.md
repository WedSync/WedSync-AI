# 🎯 PM MASTER CONTROL V2 - 5-TEAM ORCHESTRATION
## Enhanced B-MAD Workflow for Parallel Development at Scale

**DRAFT VERSION - Review before implementation**

---

## 🚨 WHAT'S PRESERVED FROM CURRENT WORKFLOW

Everything that's working stays exactly the same:
- B-MAD agent coordination
- MCP server usage (Context7, Playwright, etc.)
- Sub-agent parallel deployment
- EXPLORE-PLAN-CODE-COMMIT cycle
- Verification protocols
- Document structure and locations
- Quality gates and security checks
- Session prompt templates

---

## 📊 NEW TEAM STRUCTURE

### **From 3 Teams to 5 Teams + Support Roles**

```
CURRENT (Working Well):
- PM (You) → 3 Dev Teams (A, B, C)
- 3 sessions/day × 1 sprint each = 3 prompts

NEW (Scaled):
- Project Orchestrator → Feature Development → Dev Manager → 5 Dev Teams
- 5 teams/day × 3 sprints each = 15 prompts
- Senior Dev reviews all output
```

### **New Role Responsibilities**

**Project Orchestrator (Strategic Layer)**
- Reads WEDSYNC-MASTER-ROADMAP-2025.md
- Identifies day's features from CORE-SPECIFICATIONS
- Coordinates dependencies between teams
- Monitors blocking issues
- Updates PROJECT-STATUS.md

**Feature Development (Technical Specification)**
- Takes feature assignments from Orchestrator
- Reads relevant CORE-SPECIFICATIONS documents
- Creates detailed technical specs with examples
- Links all documentation
- Defines acceptance criteria

**Dev Manager (Execution Layer)**
- Takes specs from Feature Development
- Generates 15 daily prompts (5 teams × 3 sprints)
- Assigns work to avoid conflicts
- Manages integration points
- Tracks completion

**Senior Dev (Quality Layer)**
- Reviews all code from 5 teams
- Ensures consistency
- Catches security issues
- Validates performance
- Approves for merge

---

## 🚀 DAILY WORKFLOW V2

### **MORNING STARTUP (8:00 AM)**

#### **Step 1: Project Orchestrator Activation**
```markdown
ORCHESTRATOR READS:
1. WEDSYNC-MASTER-ROADMAP-2025.md - Current phase and targets
2. FEATURE-COMPLETION-TRACKER.md - What's actually done
3. PROJECT-STATUS.md - Yesterday's results
4. CORE-SPECIFICATIONS/README.md - Available specs

ORCHESTRATOR OUTPUTS:
- Today's feature list (10-15 features)
- Team dependencies map
- Integration points
- Critical path items
```

#### **Step 2: Feature Development Session**
```markdown
FD RECEIVES: Feature list from Orchestrator

FD PROCESS (per feature):
1. Navigate to CORE-SPECIFICATIONS/[category]/[feature]/
2. Read ALL specification documents
3. Create technical design doc
4. Include code examples
5. Define test criteria
6. Specify MCP usage

FD OUTPUTS: /docs/features/[date]/
├── journey-builder-technical.md
├── payment-system-technical.md
├── forms-enhancement-technical.md
└── [feature]-technical.md
```

#### **Step 3: Dev Manager Prompt Generation**
```markdown
DEV MANAGER RECEIVES: Technical specs from FD

PROMPT GENERATION (15 total):
Team A - Frontend (3 sprints):
  Sprint 1: Component implementation
  Sprint 2: Polish and optimization  
  Sprint 3: Integration and testing

Team B - Backend (3 sprints):
  Sprint 1: API implementation
  Sprint 2: Database and services
  Sprint 3: Performance tuning

Team C - Integration (3 sprints):
  Sprint 1: Service connections
  Sprint 2: Third-party APIs
  Sprint 3: End-to-end testing

Team D - WedMe Platform (3 sprints):
  Sprint 1: Couple features
  Sprint 2: Guest management
  Sprint 3: Mobile optimization

Team E - DevOps/Testing (3 sprints):
  Sprint 1: Infrastructure
  Sprint 2: Test automation
  Sprint 3: Deployment prep

SAVES TO: /session-prompts/today/
├── team-a-sprint-[1-3].md
├── team-b-sprint-[1-3].md
├── team-c-sprint-[1-3].md
├── team-d-sprint-[1-3].md
└── team-e-sprint-[1-3].md
```

---

## 📝 PRESERVED SESSION PROMPT TEMPLATE

This successful template stays EXACTLY the same:

```markdown
# TEAM [A-E] - SPRINT [1-3]: [Feature Name]
## [Date] - [Time Block: Morning/Afternoon/Evening]

**YOUR MISSION:** [Specific deliverable in 2 hours]

**THINK ULTRA HARD** about [specific aspect]

## 🚀 IMMEDIATE PARALLEL AGENTS (Launch in first 5 minutes)
1. task-tracker-coordinator --think-hard --break-down-tasks
2. [specialist-1] --think-hard --use-context7
3. [specialist-2] --specific-task
4. security-compliance-officer --think-ultra-hard
5. test-automation-architect --tdd-approach
6. [optional: performance-expert]

## 📚 CONTEXT7 DOCUMENTATION (Load immediately)
```typescript
// MANDATORY - Load current docs:
await mcp__context7__get-library-docs("/vercel/next.js", "[topic]", 3000)
await mcp__context7__get-library-docs("/supabase/supabase", "[topic]", 2000)
await mcp__context7__get-library-docs("/stripe/stripe-node", "[topic]", 1500)
```

## 🎯 SPECIFIC DELIVERABLES
1. [Exact component/feature to build]
2. [Tests to write]
3. [Integration to complete]

## ⚠️ DEPENDENCIES
- FROM Team [X]: [What you need]
- TO Team [Y]: [What they need from you]

## 🔒 SECURITY REQUIREMENTS
[Kept exactly as current workflow]

## 🎭 PLAYWRIGHT TESTING
[Kept exactly as current workflow]

## 📊 SUCCESS CRITERIA
[Kept exactly as current workflow]
```

---

## 🔄 SPRINT SCHEDULE (NEW)

### **Daily Sprint Timing**
```
SPRINT 1 (Morning): 9:00 AM - 12:00 PM
- All teams start Sprint 1 simultaneously
- Focus: Core implementation
- Checkpoint: 11:30 AM

SPRINT 2 (Afternoon): 1:00 PM - 4:00 PM  
- All teams start Sprint 2 simultaneously
- Focus: Enhancement and polish
- Checkpoint: 3:30 PM

SPRINT 3 (Evening): 5:00 PM - 8:00 PM
- All teams start Sprint 3 simultaneously
- Focus: Integration and testing
- Checkpoint: 7:30 PM

REVIEW (Night): 8:00 PM - 9:00 PM
- Senior Dev reviews all code
- Integration validation
- Deployment preparation
```

---

## 👥 COORDINATION PROTOCOLS (ENHANCED)

### **Inter-Team Communication**
```markdown
BLOCKING ISSUE PROTOCOL:
1. Team identifies blocker
2. Posts to #blockers channel (simulated)
3. Dev Manager reassigns work
4. Orchestrator updates plan
5. Continue without delay

INTEGRATION PROTOCOL:
1. Team completes integration point
2. Notifies dependent team
3. Provides interface documentation
4. Confirms contract agreement
5. Both teams test together
```

### **Checkpoints (Every Sprint End)**
```markdown
11:30 AM - Sprint 1 Checkpoint:
□ All teams on track?
□ Any blockers identified?
□ Dependencies being met?
□ Integration points aligned?

3:30 PM - Sprint 2 Checkpoint:
□ Morning work integrated?
□ Performance acceptable?
□ Security checks passing?
□ Tests being written?

7:30 PM - Sprint 3 Checkpoint:
□ Features complete?
□ All tests passing?
□ Ready for review?
□ Documentation updated?
```

---

## 📊 ENHANCED METRICS FOR 5 TEAMS

### **Daily Targets (Scaled)**
```markdown
VELOCITY METRICS:
- Features Completed: 20-30 (was 10-15)
- Tests Written: 100+ (was 50+)
- Code Coverage: >85% (was >80%)
- Integration Points: 15-20 (was 5-10)

QUALITY METRICS (Same Standards):
- Security Score: ≥9/10
- Performance: <1s page, <200ms API
- Error Rate: <1%
- Accessibility: WCAG AA
```

### **Team Performance Tracking**
```markdown
Team A (Frontend):
  Sprint 1: [Component] ✅/❌
  Sprint 2: [Polish] ✅/❌
  Sprint 3: [Integration] ✅/❌
  Daily Score: X/3

[Repeat for Teams B-E]

Overall: X/15 sprints successful
```

---

## 🔧 SENIOR DEV REVIEW PROCESS (NEW)

### **Continuous Review Cycle**
```markdown
REVIEW TRIGGERS:
- End of each sprint (3x daily)
- Critical security changes (immediate)
- Architecture decisions (immediate)
- Integration points (before merge)

REVIEW CHECKLIST:
□ Code follows standards
□ Tests comprehensive
□ Security validated
□ Performance acceptable
□ Documentation complete
□ No code smells
□ Consistent patterns

REVIEW OUTPUT:
- Approved for merge
- Minor fixes needed (can merge)
- Major issues (must fix first)
- Architectural concern (escalate)
```

---

## 🚨 RISK MANAGEMENT FOR 5 TEAMS

### **New Risks with Mitigation**

**1. Coordination Overhead**
- Risk: Too much time coordinating
- Mitigation: Clear sprint boundaries, async communication
- Monitoring: Time spent in coordination vs coding

**2. Integration Conflicts**
- Risk: Teams step on each other
- Mitigation: Clear ownership boundaries
- Monitoring: Merge conflict frequency

**3. Quality Dilution**
- Risk: More code, less quality
- Mitigation: Senior Dev gates, automated testing
- Monitoring: Defect escape rate

**4. Prompt Fatigue**
- Risk: 75 prompts/day overwhelming
- Mitigation: Templates, automation, clear patterns
- Monitoring: Prompt quality scores

---

## 📝 DOCUMENTATION REQUIREMENTS (SAME LOCATIONS)

All documentation stays in current locations:

```
/session-prompts/today/          # Now has 15 files instead of 3
/SESSION-LOGS/[date]/            # Now has 15 reports instead of 3
/docs/features/                  # NEW: FD technical specs
/HANDOFF/                        # Same as before
/SESSION-LOGS/LEARNINGS/         # Same as before
```

---

## ✅ PM DAILY CHECKLIST V2

### **Morning (8:00 AM)**
- [ ] Orchestrator reviews roadmap and status
- [ ] Orchestrator assigns day's features
- [ ] FD creates technical specifications
- [ ] Dev Manager generates 15 prompts
- [ ] Teams launch with prompts

### **Sprint 1 End (11:30 AM)**
- [ ] Check all 5 teams progress
- [ ] Resolve any blockers
- [ ] Verify integration alignment
- [ ] Senior Dev spot review

### **Sprint 2 End (3:30 PM)**
- [ ] Integration testing
- [ ] Performance validation
- [ ] Security checkpoint
- [ ] Dependency verification

### **Sprint 3 End (7:30 PM)**
- [ ] Feature completion check
- [ ] Test coverage verification
- [ ] Senior Dev full review
- [ ] Deployment preparation

### **End of Day (9:00 PM)**
- [ ] Update PROJECT-STATUS.md
- [ ] Archive documentation
- [ ] Extract learnings
- [ ] Plan tomorrow

---

## 🎯 SUCCESS FORMULA V2

```
5 Teams × 3 Sprints × Clear Specs × Senior Review = 2x Velocity
```

**Remember:** Everything that works in current workflow is preserved.
Only the scale and coordination layers are enhanced.

---

**This is a DRAFT. Review thoroughly before implementation.**