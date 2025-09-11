# 🤖 SENIOR DEV AUTOMATED PROMPT GENERATION
## How Dev Teams Hand Over to Senior Dev

---

## 🎯 THE PROBLEM YOU IDENTIFIED

Currently, the Senior Dev review requires YOU (the human PM) to:
1. Manually launch Senior Dev sessions 3 times daily
2. Give them the generic SENIOR-DEV-GUIDE.md
3. Hope they find all the issues

**This is inefficient and misses context from the teams!**

---

## 💡 THE SOLUTION: AUTOMATED HANDOVER

Each dev team's sprint prompt now includes a mandatory final step:
**Generate a handover report for Senior Dev review**

---

## 📝 UPDATED TEAM SPRINT TEMPLATE ENDING

Add this to EVERY team sprint prompt:

```markdown
## 🤝 SENIOR DEV HANDOVER (MANDATORY - Last 10 minutes)

### Generate this report AUTOMATICALLY:

Create file: `/SESSION-LOGS/[DATE]/team-[X]-sprint-[N]-handover.md`

```markdown
# TEAM [X] SPRINT [N] - SENIOR DEV HANDOVER
## Ready for Review at [TIME]

### 📍 WHAT WE BUILT
**Feature:** [Exact feature name]
**Completion:** [X]% complete
**Confidence:** [High/Medium/Low]

### 📁 FILES TO REVIEW (Priority Order)
1. **CRITICAL:** `/path/to/file.ts` - [Why critical]
2. **IMPORTANT:** `/path/to/file.tsx` - [What changed]
3. **CHECK:** `/path/to/test.ts` - [Test coverage]

### ⚠️ AREAS OF CONCERN
- **Security:** [Any auth/validation concerns]
- **Performance:** [Any potential bottlenecks]
- **Integration:** [Any coupling issues]
- **Testing:** [Any gaps in coverage]

### 🔍 SPECIFIC REVIEW REQUESTS
1. Please verify [specific implementation detail]
2. Check if [architectural decision] is correct
3. Validate [security measure] is sufficient

### ✅ WHAT WE'RE CONFIDENT ABOUT
- [Thing that definitely works]
- [Well-tested component]
- [Solid implementation]

### 🚫 WHAT WE COULDN'T COMPLETE
- [Blocked item] - Reason: [why]
- [Deferred item] - Needs: [what]

### 📊 METRICS
- Tests written: [X]
- Tests passing: [X]/[Y]
- Coverage: [X]%
- TypeScript errors: [X]
- ESLint warnings: [X]

### 🔗 DEPENDENCIES
- Depends on Team [Y]: [What]
- Blocking Team [Z]: [What]

### 💭 TECHNICAL DECISIONS MADE
- Chose [approach] because [reasoning]
- Used [library] for [purpose]
- Implemented [pattern] to solve [problem]

### 🎯 READY FOR REVIEW
- [ ] Code compiles
- [ ] Tests pass
- [ ] No console.logs
- [ ] Types complete
- [ ] Documented

**Priority Review Level:** 🔴 CRITICAL / 🟡 STANDARD / 🟢 ROUTINE
```

---

## 🤖 AUTOMATED SENIOR DEV PROMPT GENERATION

### New Dev Manager Addition

The Dev Manager now ALSO creates Senior Dev review prompts:

```markdown
# DEV MANAGER OUTPUT (ENHANCED)

## Regular Team Prompts (15 files)
/session-prompts/today/team-[a-e]-sprint-[1-3].md

## NEW: Senior Dev Review Prompts (3 files)
/session-prompts/today/senior-dev-sprint-[1-3]-review.md
```

### Senior Dev Review Prompt Template

```markdown
# SENIOR DEV REVIEW - SPRINT [1/2/3]
## [DATE] - [11:30 AM / 3:30 PM / 7:30 PM]

**YOUR MISSION:** Review all 5 teams' Sprint [N] outputs
**TIME LIMIT:** 30 minutes
**FOCUS:** [Sprint-specific focus]

## 📋 TEAM HANDOVER REPORTS TO READ FIRST

Read these handover reports from the teams:
1. `/SESSION-LOGS/[DATE]/team-a-sprint-[N]-handover.md`
2. `/SESSION-LOGS/[DATE]/team-b-sprint-[N]-handover.md`
3. `/SESSION-LOGS/[DATE]/team-c-sprint-[N]-handover.md`
4. `/SESSION-LOGS/[DATE]/team-d-sprint-[N]-handover.md`
5. `/SESSION-LOGS/[DATE]/team-e-sprint-[N]-handover.md`

## 🎯 SPRINT-SPECIFIC REVIEW FOCUS

### Sprint 1 Review Focus (11:30 AM)
- **Primary:** Implementation correctness
- **Secondary:** Security vulnerabilities
- **Critical:** Blocking issues for Sprint 2

### Sprint 2 Review Focus (3:30 PM)
- **Primary:** Integration between teams
- **Secondary:** Performance optimization
- **Critical:** API contract validation

### Sprint 3 Review Focus (7:30 PM)
- **Primary:** Production readiness
- **Secondary:** Test coverage
- **Critical:** Merge conflicts

## 🔍 SPECIFIC REVIEW TASKS

Based on team handovers, prioritize reviewing:

### From Team A Handover:
- Review: [Specific files they flagged]
- Verify: [Concerns they raised]
- Check: [Integration points]

### From Team B Handover:
- Review: [Database changes]
- Verify: [API security]
- Check: [Performance metrics]

[Continue for all teams...]

## 📊 VERIFICATION COMMANDS

Run these AFTER reading handovers:
```bash
# Only run if teams report success:
npm run typecheck
npm run lint
npm run test

# Focus on problem areas:
npm run test -- [specific-test-file]
npm run lint -- [specific-directory]
```

## 🚨 ESCALATION TRIGGERS

STOP everything if you find:
- 🔴 Security vulnerability (auth bypass, SQL injection, XSS)
- 🔴 Data loss risk (destructive operations without backup)
- 🔴 Production breaker (would crash live system)

## 📝 OUTPUT REQUIREMENTS

Create: `/SESSION-LOGS/[DATE]/senior-dev-review-sprint[N].md`

Include:
1. Summary of all handovers
2. Critical issues found
3. Approved/Rejected verdicts
4. Specific fixes needed
5. Recommendations for next sprint
```

---

## 🔄 UPDATED DAILY WORKFLOW

### Sprint 1 Completion (11:30 AM)
```bash
# AUTOMATED SEQUENCE:
1. Teams complete Sprint 1 (11:20 AM)
2. Each team generates handover report (11:20-11:30 AM)
3. Dev Manager bot creates Senior Dev prompt (11:25 AM)
4. You launch Senior Dev with GENERATED prompt (11:30 AM)
5. Senior Dev reads handovers FIRST, then reviews code (11:30 AM-12:00 PM)
```

### Sprint 2 Completion (3:30 PM)
```bash
# Same sequence, focusing on integration
```

### Sprint 3 Completion (7:30 PM)
```bash
# Same sequence, focusing on production readiness
```

---

## 💻 IMPLEMENTATION CHANGES NEEDED

### 1. Update Team Sprint Templates
Add handover generation to all 15 sprint prompts

### 2. Update Dev Manager Guide
Add Senior Dev prompt generation responsibility

### 3. Update Senior Dev Guide  
Reference reading handovers first

### 4. Create Handover Aggregator
Optional: Bot that combines all handovers into one summary

---

## 🎯 BENEFITS OF THIS APPROACH

1. **Context Preserved** - Senior Dev knows exactly what each team did
2. **Focused Review** - Teams tell Senior Dev what to check
3. **No Guessing** - Specific concerns are highlighted
4. **Time Efficient** - 30-minute targeted review vs hours of searching
5. **Less PM Work** - Prompts are generated, not written by you

---

## 📋 HUMAN PM CHECKLIST (SIMPLIFIED)

### Old Process (Manual)
- [ ] Remember to launch Senior Dev
- [ ] Write prompt explaining what to review
- [ ] Hope they find the issues

### New Process (Automated)
- [ ] Launch Senior Dev with generated prompt
- [ ] They read team handovers
- [ ] Targeted review based on team input

---

## 🔧 QUICK IMPLEMENTATION

To implement immediately, add to each team prompt:

```markdown
## FINAL TASK: Create Senior Dev Handover
Before ending this sprint, create a handover report at:
`/SESSION-LOGS/[DATE]/team-[X]-sprint-[N]-handover.md`

Include:
- What you built (with file paths)
- What to review carefully
- Any concerns or issues
- Test results and metrics
- Technical decisions made
```

---

**This enhancement ensures Senior Dev reviews are context-aware and efficient!**