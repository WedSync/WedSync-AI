# 📅 DAILY WORKFLOW V2 - COMPLETE ORCHESTRATION
## How All Roles Work Together (5 Teams × 3 Rounds)

---

## 🚀 WORKFLOW SEQUENCE (No Fixed Times)

### STEP 1: Project Orchestrator
```bash
# Launch when ready to start the day
1. Give them: PROJECT-ORCHESTRATOR-GUIDE.md
2. They read roadmap and status
3. They output: /orchestrator-output/[DATE]-feature-assignments.md
4. Session ends when complete
```

### STEP 2: Feature Development
```bash
# Launch after Orchestrator completes
1. Give them: FEATURE-DEVELOPMENT-GUIDE.md
2. They read orchestrator's assignments
3. They create technical specs for each feature
4. They output: /feature-development-output/[DATE]/[feature]-technical.md
5. Session ends when complete
```

### STEP 3: Dev Manager
```bash
# Launch after Feature Development completes
1. Give them: DEV-MANAGER-GUIDE.md
2. They read technical specs
3. They create 15 prompts (5 teams × 3 rounds)
4. They output: /session-prompts/today/team-[a-e]-round-[1-3].md
5. Session ends when complete
```

### STEP 4: ROUND 1 - All 5 Teams Launch Together
```bash
# Launch 5 Parallel Sessions SIMULTANEOUSLY:
Team A: Give them team-a-round-1.md
Team B: Give them team-b-round-1.md
Team C: Give them team-c-round-1.md
Team D: Give them team-d-round-1.md
Team E: Give them team-e-round-1.md

IMPORTANT: All teams work in parallel
WAIT: For ALL 5 teams to complete before proceeding
```

---

## 🔄 ROUND EXECUTION PATTERN

### ROUND 1 COMPLETE SEQUENCE
```
1. ALL 5 teams complete their work
2. Each team generates 3 reports:
   - team-[a-e]-round-1-overview.md
   - team-[a-e]-round-1-to-dev-manager.md
   - team-[a-e]-round-1-senior-dev-prompt.md

3. Senior Dev Review:
   - Give them the 5 team-generated prompts
   - They review ALL Round 1 work
   - Output: senior-dev-review-round1.md

4. Git Operations (IF approvals exist):
   - Read Senior Dev approvals
   - Create atomic commits
   - Output: git-operations-round1.md

5. Dev Manager Round 2 Planning:
   - Read Senior Dev feedback
   - Read team feedback to Dev Manager
   - Adjust Round 2 assignments
```

### ROUND 2 COMPLETE SEQUENCE
```
ONLY AFTER Round 1 fully complete:

1. Launch all 5 teams with round-2 prompts
2. WAIT for ALL to complete
3. Generate reports
4. Senior Dev Review
5. Git Operations (if approvals)
6. Dev Manager plans Round 3
```

### ROUND 3 COMPLETE SEQUENCE
```
ONLY AFTER Round 2 fully complete:

1. Launch all 5 teams with round-3 prompts
2. WAIT for ALL to complete
3. Generate reports
4. Final Senior Dev Review
5. Final Git Operations
6. Update all status documents
```

---

## 📊 DAILY METRICS TRACKING

### 8:00 PM - End of Day Compilation & Feedback Loop
```bash
# Collect from all teams:
- 15 session reports (5 teams × 3 sprints)
- 15 handover reports (5 teams × 3 sprints)
- 3 senior dev reviews
- Test results
- Performance metrics

# Update (CRITICAL for tomorrow):
- PROJECT-STATUS.md with completion percentages
- FEATURE-COMPLETION-TRACKER.md with new completions
- WEDSYNC-MASTER-ROADMAP-2025.md if milestones reached
- /SESSION-LOGS/LEARNINGS/ if patterns emerged

# Information Flow for Tomorrow:
1. Orchestrator reads updated status → picks new features
2. Feature Dev reads learnings → avoids repeated mistakes
3. Dev Manager reads Senior Dev reports → adjusts Sprint 2/3
4. Teams read updated prompts → implement fixes first
5. Senior Dev reads handovers → targeted review
```

---

## 🔄 COMPLETE INFORMATION FLOW

```
DOCUMENT UPDATES & FEEDBACK LOOPS:

Yesterday's Reports ──→ PROJECT-STATUS.md
                    ──→ FEATURE-TRACKER.md
                    ──→ LEARNINGS/*.md
                           ↓
Morning:              [Orchestrator reads all]
                           ↓
                      Feature Assignments
                           ↓
                      [Feature Dev reads learnings]
                           ↓
                      Technical Specs
                           ↓
                      [Dev Manager reads]
                           ↓
Sprint 1:             15 Team Prompts
                           ↓
                      Teams Execute → Reports + Handovers
                                            ↓
                      [Senior Dev reads handovers] → Review
                                            ↓
Sprint 2:             [Dev Manager reads review] → Adjusted Prompts
                           ↓
                      Teams Execute → Reports + Handovers
                                            ↓
                      [Senior Dev targeted review]
                                            ↓
Sprint 3:             [Dev Manager final adjustments]
                           ↓
                      Teams Execute → Final Integration
                                            ↓
                      [Senior Dev approval]
                           ↓
Evening:              Update all status docs → Ready for tomorrow
```

---

## 📁 FILE STRUCTURE CREATED DAILY

```
/WORKFLOW-V2-DRAFT/
├── /orchestrator-output/
│   └── [DATE]-feature-assignments.md (1 file)
│
├── /feature-development-output/
│   └── /[DATE]/
│       ├── feature1-technical.md
│       ├── feature2-technical.md
│       └── ... (10-15 files)
│
├── /dev-manager-output/
│   └── [DATE]-coordination.md (1 file)

/session-prompts/today/
├── team-a-sprint-1.md
├── team-a-sprint-2.md
├── team-a-sprint-3.md
├── team-b-sprint-1.md
├── team-b-sprint-2.md
├── team-b-sprint-3.md
├── team-c-sprint-1.md
├── team-c-sprint-2.md
├── team-c-sprint-3.md
├── team-d-sprint-1.md
├── team-d-sprint-2.md
├── team-d-sprint-3.md
├── team-e-sprint-1.md
├── team-e-sprint-2.md
└── team-e-sprint-3.md (15 files total)

/SESSION-LOGS/[DATE]/
├── team-a-sprint-1-report.md
├── team-a-sprint-2-report.md
├── team-a-sprint-3-report.md
├── [... 12 more team reports]
├── senior-dev-review-sprint1.md
├── senior-dev-review-sprint2.md
└── senior-dev-review-sprint3.md (18 files total)
```

---

## ⏱️ TIME INVESTMENT

### Management Roles (Sequential)
- Project Orchestrator: 15 minutes
- Feature Development: 30 minutes
- Dev Manager: 15 minutes
- Senior Dev: 30 minutes × 3 = 90 minutes
**Total Management:** 2.5 hours

### Development Teams (Parallel)
- 5 teams × 3 sprints × 3 hours = 45 team-hours
- But running in parallel = 9 actual hours

**Total Day:** ~11.5 hours of oversight

---

## 🚦 QUALITY GATES

### After Each Sprint:
1. Senior Dev must review
2. Critical issues must be fixed
3. Tests must pass
4. Security must be validated

### End of Day:
1. All features at 100% or documented why not
2. Integration tests passing
3. No blocking issues for tomorrow
4. Documentation updated

---

## 🎯 SUCCESS METRICS

### Daily Targets:
- Features completed: 10-15
- Code coverage: >85%
- All tests passing
- Security score: 9/10
- Performance: <1s page, <200ms API

### Team Velocity:
- Sprint completion rate: 15/15 (100%)
- Rework rate: <10%
- Integration success: >90%
- Review approval rate: >80%

---

## 🔴 STOP CONDITIONS

If any of these occur, STOP all work:

1. **Security breach found** - All teams stop, fix immediately
2. **Data loss detected** - Stop, backup, investigate
3. **Integration completely broken** - Stop, emergency sync
4. **More than 5 sprints rejected** - Stop, process review
5. **Teams working on same files** - Stop, coordination fix

---

## 📋 HUMAN PM CHECKLIST

### Morning (8:00 AM)
- [ ] Launch Orchestrator session
- [ ] Launch Feature Dev session
- [ ] Launch Dev Manager session
- [ ] Launch 5 team sessions for Sprint 1

### Midday (11:30 AM)
- [ ] Launch Senior Dev review
- [ ] Check for blockers
- [ ] Launch Sprint 2 for all teams

### Afternoon (3:30 PM)
- [ ] Launch Senior Dev review
- [ ] Verify integration working
- [ ] Launch Sprint 3 for all teams

### Evening (7:30 PM)
- [ ] Launch final Senior Dev review
- [ ] Collect all reports
- [ ] Update status documents
- [ ] Plan tomorrow's features

---

## 💡 TIPS FOR SUCCESS

1. **Keep roles separated** - Each role has ONE job
2. **Use templates** - Don't recreate, just fill in
3. **Trust the process** - Let each role do their part
4. **Review early** - Catch issues in Sprint 1
5. **Document everything** - Reports are crucial

---

**This workflow produces 10-15 completed features daily with 5 parallel teams.**
**Estimated velocity: 2-3x current 3-team model.**