# 🏃‍♂️ MARATHON SESSION PROTOCOL
## Handling Multi-Day Continuous Development

---

## 🎯 THE CHALLENGE

When you run marathon sessions (Day 1 → Day 2 → Day 3 in one session), the normal feedback loops break:
- "Yesterday's" reports don't exist yet
- Sprint adjustments can't read from future reports
- Information flow gets confused

---

## 💡 THE SOLUTION: VIRTUAL DAYS

Treat each "day" as a 9-hour cycle within your marathon session:

```
HOUR 0-9:    Virtual Day 1 (VD1)
HOUR 9-18:   Virtual Day 2 (VD2)  
HOUR 18-27:  Virtual Day 3 (VD3)
```

---

## 📁 FOLDER STRUCTURE FOR MARATHONS

Instead of date-based folders, use virtual day folders:

```bash
/SESSION-LOGS/MARATHON-[START-DATE]/
├── VD1/
│   ├── team-a-sprint-1-overview.md
│   ├── team-a-sprint-1-to-dev-manager.md
│   ├── team-a-sprint-1-senior-dev-prompt.md
│   └── ... (all VD1 reports)
├── VD2/
│   └── ... (all VD2 reports)
└── VD3/
    └── ... (all VD3 reports)
```

---

## 🔄 MODIFIED INFORMATION FLOW

### Virtual Day 1 (Hours 0-9)
```
8:00 (Hour 0) - Orchestrator
- Read REAL yesterday if exists
- Otherwise read initial state

9:00 (Hour 1) - Sprint 1
- Normal execution

11:30 (Hour 3.5) - Senior Dev Review
- Creates VD1 reports

1:00 (Hour 5) - Sprint 2
- Dev Manager reads VD1/senior-dev-review-sprint1.md

3:30 (Hour 7.5) - Senior Dev Review
- Creates more VD1 reports

5:00 (Hour 9) - Sprint 3
- Dev Manager reads VD1/senior-dev-review-sprint2.md
```

### Virtual Day 2 (Hours 9-18)
```
8:00 (Hour 9) - Orchestrator for VD2
- Reads VD1/senior-dev-review-sprint3.md
- Reads VD1 learnings
- Updates virtual status

[Continue pattern...]
```

---

## 📝 PROMPT MODIFICATIONS FOR MARATHONS

### For Orchestrator (Virtual Day 2+):
```markdown
# MARATHON MODE - VIRTUAL DAY [N]

Read from VIRTUAL DAY [N-1]:
- /SESSION-LOGS/MARATHON-[DATE]/VD[N-1]/senior-dev-review-sprint3.md
- /SESSION-LOGS/MARATHON-[DATE]/VD[N-1]/learnings.md

Instead of yesterday's date, use VD[N-1] paths
```

### For Dev Manager (Sprint 2/3 in Marathon):
```markdown
# MARATHON MODE ACTIVE

For Sprint 2: Read /SESSION-LOGS/MARATHON-[DATE]/VD[N]/senior-dev-review-sprint1.md
For Sprint 3: Read /SESSION-LOGS/MARATHON-[DATE]/VD[N]/senior-dev-review-sprint2.md

Adjustments happen in REAL TIME within the session
```

---

## 🚀 LAUNCHING A MARATHON SESSION

### Step 1: Create Marathon Structure
```bash
MARATHON_DATE=$(date +%Y-%m-%d-%H%M)
mkdir -p /SESSION-LOGS/MARATHON-$MARATHON_DATE/{VD1,VD2,VD3}
mkdir -p /session-prompts/marathon/$MARATHON_DATE/{VD1,VD2,VD3}
```

### Step 2: Flag Marathon Mode
Create `/MARATHON-MODE.flag` containing:
```
ACTIVE: true
START: [timestamp]
CURRENT_VD: 1
BASE_PATH: /SESSION-LOGS/MARATHON-[DATE]
```

### Step 3: Modify All Prompts
Add to EVERY role guide:
```markdown
## 🏃‍♂️ MARATHON MODE CHECK
If file `/MARATHON-MODE.flag` exists:
- Use Virtual Day (VD) paths instead of dates
- Read from previous VD instead of yesterday
- Write to current VD folder
```

---

## 📊 TRACKING MARATHON PROGRESS

Create a master tracker:
```markdown
# MARATHON SESSION - [START DATE]

## Virtual Day 1 (Hours 0-9)
- Features completed: X/Y
- Velocity: [metric]
- Issues: [list]

## Virtual Day 2 (Hours 9-18)
- Features completed: X/Y
- Velocity: [increased/decreased]
- Cumulative progress: X%

## Virtual Day 3 (Hours 18-27)
- Features completed: X/Y
- Total marathon achievement: X features
- Project advancement: X% → Y%
```

---

## 🔄 GITHUB COMMITS IN MARATHONS

During marathons, commits happen at VD boundaries:

### End of VD1 (Hour 9):
```bash
git add .
git commit -m "feat: VD1 complete - [X] features implemented

- [Feature 1]
- [Feature 2]
- [Tests passing]

Part of marathon session started [DATE]"
```

### End of VD2 (Hour 18):
```bash
git commit -m "feat: VD2 complete - [X] more features

Marathon progress: [Y] total features
Project now at [Z]% completion"
```

---

## ⚠️ MARATHON SAFETY RULES

1. **Mandatory breaks:**
   - 10 min break every 3 hours
   - 30 min break between Virtual Days
   - STOP if quality drops below 80%

2. **Checkpoint validations:**
   - End of each VD must have clean tests
   - No CRITICAL issues can carry to next VD
   - Must commit at VD boundaries

3. **Emergency stop triggers:**
   - 3+ CRITICAL issues in one VD
   - Test coverage drops below 70%
   - Integration completely broken

---

## 🏁 ENDING A MARATHON

### Clean Closure:
1. Complete current sprint (don't leave mid-sprint)
2. Run final Senior Dev review
3. Create marathon summary report
4. Push all commits
5. Remove `/MARATHON-MODE.flag`
6. Archive marathon logs

### Conversion to Normal:
```bash
# Convert VD folders to real dates
mv /SESSION-LOGS/MARATHON-*/VD1 /SESSION-LOGS/[date1]
mv /SESSION-LOGS/MARATHON-*/VD2 /SESSION-LOGS/[date2]
mv /SESSION-LOGS/MARATHON-*/VD3 /SESSION-LOGS/[date3]
```

---

## 📈 EXPECTED MARATHON OUTPUT

### 9-Hour Session (1 Virtual Day):
- 15 features (3 sprints × 5 teams)
- 3 GitHub commits
- Full feedback loop

### 18-Hour Session (2 Virtual Days):
- 30 features
- 6 GitHub commits
- Accelerating velocity

### 27-Hour Session (3 Virtual Days):
- 45 features
- 9 GitHub commits
- Major project milestone

---

## 💡 TIPS FOR MARATHON SUCCESS

1. **Pre-marathon prep:**
   - Clear CORE-SPECIFICATIONS path
   - Ensure all dependencies installed
   - Create marathon folder structure
   - Have snacks/hydration ready

2. **During marathon:**
   - Track VD transitions clearly
   - Commit at boundaries
   - Take screenshots of progress
   - Keep energy high

3. **Post-marathon:**
   - Document achievements
   - Update roadmap
   - Rest properly
   - Plan next marathon

---

**Marathon mode: Because sometimes you need to ship FAST! 🚀**