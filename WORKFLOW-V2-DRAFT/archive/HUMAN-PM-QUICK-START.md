# 🚀 HUMAN PM QUICK START GUIDE
## What YOU Actually Do in the 5-Team Workflow

---

## 📌 TLDR: YOUR DAILY ROUTINE

You launch sessions in this sequence:
1. **Orchestrator** - Picks today's features
2. **Feature Dev** - Creates technical specs  
3. **Dev Manager** - Generates 15 team prompts (5 teams × 3 rounds)
4. **Round 1:** Launch 5 teams in PARALLEL → Wait for ALL to complete
5. **Senior Dev** - Reviews Round 1
6. **Git Ops** (if approvals) - Commits code
7. **Round 2:** Launch 5 teams again → Wait for ALL
8. **Senior Dev** - Reviews Round 2
9. **Git Ops** (if approvals)
10. **Round 3:** Final round → Wait for ALL
11. **Senior Dev** - Final review
12. **Final Git Ops** - Day complete

**Key Rule: All 5 teams must complete before moving to next round**

---

## 🔄 YOUR ACTUAL WORKFLOW (No Fixed Times)

### Step 1: Launch Orchestrator
```bash
# Open new Claude session
# Paste: PROJECT-ORCHESTRATOR-GUIDE.md
# Wait for completion
# It outputs: today's feature assignments
```

### Step 2: Launch Feature Dev
```bash
# After Orchestrator completes
# Open new Claude session  
# Paste: FEATURE-DEVELOPMENT-GUIDE.md
# Wait for completion
# It outputs: technical specs for each feature
```

### Step 3: Launch Dev Manager
```bash
# After Feature Dev completes
# Open new Claude session
# Paste: DEV-MANAGER-GUIDE.md
# Wait for completion
# It outputs: 15 team prompts in /session-prompts/today/
```

### Step 4: ROUND 1 - Launch ALL 5 Teams Together
```bash
# Open 5 Claude sessions SIMULTANEOUSLY
# Paste into each:
Team A: team-a-round-1.md
Team B: team-b-round-1.md
Team C: team-c-round-1.md
Team D: team-d-round-1.md
Team E: team-e-round-1.md

# CRITICAL: All work in parallel
# WAIT for ALL 5 to complete before proceeding
```

### Step 5: Senior Dev Review Round 1
```bash
# ONLY after ALL teams complete Round 1
# Open new Claude session
# Paste the 5 team-generated prompts:
team-[a-e]-round-1-senior-dev-prompt.md

# Wait for completion
# It outputs: review report with verdicts
```

### Step 6: Git Operations (ONLY if approvals)
```bash
# If ANY features marked "APPROVED":
# Open new Claude session
# Paste: GIT-OPERATIONS-GUIDE.md
# Creates commits, then close
```

### Step 7: ROUND 2 - Launch ALL 5 Teams Again
```bash
# After Round 1 complete + reviewed
# Open 5 Claude sessions SIMULTANEOUSLY
# Paste round-2 prompts
# WAIT for ALL 5 to complete
```

### Step 8: Senior Dev Review Round 2
```bash
# After ALL teams complete Round 2
# Review with team-generated prompts
```

### Step 9: Git Operations Round 2
```bash
# If approvals exist, create commits
```

### Step 10: ROUND 3 - Final Launch
```bash
# After Round 2 complete + reviewed
# Open 5 Claude sessions SIMULTANEOUSLY  
# Paste round-3 prompts
# WAIT for ALL 5 to complete
```

### Step 11: Final Senior Dev Review
```bash
# After ALL teams complete Round 3
# Final review of the day
```

### Step 12: Final Git Operations
```bash
# If approvals exist:
# Create commits and daily summary
# Update changelog
# You decide whether to push to GitHub
```

### Step 13: Collect & Update
```bash
# Read all reports
# Update PROJECT-STATUS.md
# Plan tomorrow
```

---

## ⚠️ CRITICAL SYNCHRONIZATION RULES

**NEVER:**
- ❌ Start Round 2 while ANY Round 1 team is still working
- ❌ Mix rounds (Team A on Round 2 while Team B on Round 1)
- ❌ Skip waiting for slow teams

**ALWAYS:**
- ✅ Launch all 5 teams SIMULTANEOUSLY for each round
- ✅ Wait for ALL 5 to complete before ANY review
- ✅ Keep all teams on the SAME round
- ✅ If one team fails/crashes, fix before proceeding

**Why This Matters:**
- Teams share dependencies
- File conflicts if on different rounds
- Integration breaks if out of sync
- Testing becomes impossible

## 🎯 WHAT EACH ROLE DOES FOR YOU

### Project Orchestrator
**What it does:** Reads the roadmap and picks features
**What you get:** Today's prioritized feature list
**Why it helps:** You don't need to read 380+ spec documents

### Feature Development  
**What it does:** Turns specs into technical designs
**What you get:** Detailed implementation plans
**Why it helps:** Teams know exactly what to build

### Dev Manager
**What it does:** Creates all 15 team prompts
**What you get:** Ready-to-paste prompts for each team
**Why it helps:** You don't write prompts anymore

### Dev Teams (A-E)
**What they do:** Actually build the features
**What you get:** Working code, tests, documentation
**Why it helps:** 5 teams = 3x more done daily

### Senior Dev
**What it does:** Reviews all code for quality
**What you get:** Approval/rejection verdicts
**Why it helps:** Catches issues before they break things

---

## 📝 DOCUMENTS YOU NEED READY

Keep these 7 guides bookmarked:
1. `PROJECT-ORCHESTRATOR-GUIDE.md` - For 8 AM
2. `FEATURE-DEVELOPMENT-GUIDE.md` - For 8:15 AM
3. `DEV-MANAGER-GUIDE.md` - For 8:45 AM
4. `SENIOR-DEV-GUIDE.md` - Backup if automated prompt fails
5. `DAILY-WORKFLOW-V2.md` - Your master timeline
6. `MIGRATION-GUIDE.md` - For transitioning
7. This guide - Your quick reference

---

## ❌ WHAT YOU DON'T DO ANYMORE

### Before (3-Team Model)
- ❌ Read specifications yourself
- ❌ Write technical designs
- ❌ Create all prompts manually
- ❌ Coordinate dependencies in your head
- ❌ Review code yourself
- ❌ Track everything manually

### Now (5-Team Model)
- ✅ Launch pre-defined sessions
- ✅ Use generated prompts
- ✅ Let bots coordinate
- ✅ Monitor progress
- ✅ Make decisions only when blocked

---

## 🚨 WHEN TO INTERVENE

Only step in when:
1. **Session fails to start** - Relaunch with same prompt
2. **Blocking issue reported** - Make a decision
3. **Senior Dev finds CRITICAL issue** - Stop all work
4. **Teams report conflict** - Adjust assignments
5. **End of day** - Update status docs

Otherwise, let the system run!

---

## 💡 PRO TIPS

### Morning Setup (5 minutes)
```bash
# Create today's folders
mkdir -p /session-prompts/today
mkdir -p /SESSION-LOGS/$(date +%Y-%m-%d)
mkdir -p /WORKFLOW-V2-DRAFT/orchestrator-output
mkdir -p /WORKFLOW-V2-DRAFT/feature-development-output/$(date +%Y-%m-%d)

# Clear yesterday's prompts
mv /session-prompts/today/* /session-prompts/archive/
```

### Parallel Launch Trick
```bash
# Open all 5 team sessions at once:
# Use browser tabs or terminal multiplexer
# Paste all 5 prompts within 1 minute
# They run simultaneously, not sequentially
```

### Quick Status Check
```bash
# At any time, run:
ls -la /SESSION-LOGS/$(date +%Y-%m-%d)/

# See which teams have reported
# Check for handover files
# Monitor progress without interrupting
```

---

## 📊 SUCCESS METRICS

You're doing it right when:
- ✅ 15 prompts generated automatically daily
- ✅ 10+ features completed per day
- ✅ Senior Dev approves >80% on first review
- ✅ No file conflicts between teams
- ✅ You spend <3 hours actively managing

You need to adjust when:
- ❌ Teams waiting for dependencies
- ❌ Same files modified by multiple teams
- ❌ Senior Dev rejecting >50%
- ❌ Features not integrating
- ❌ You're coding instead of orchestrating

---

## 🆘 EMERGENCY PROCEDURES

### If Orchestrator Fails
```bash
# Use yesterday's feature list
# Or manually pick 10 features from CORE-SPECIFICATIONS
```

### If Dev Manager Fails
```bash
# Use TEAM-PROMPT-TEMPLATES.md
# Manually create 15 prompts (takes 30 min)
```

### If Senior Dev Misses Issues
```bash
# Run your own spot checks:
npm run typecheck
npm run lint
npm run test
```

### If Everything Breaks
```bash
# Revert to 3-team model immediately
# Use backup workflow docs
# No progress lost
```

---

## 📅 FIRST WEEK EXPECTATIONS

### Day 1
- Morning only (test the orchestration)
- 3-5 features completed
- Learn the rhythm

### Day 2-3  
- Full day (all 3 sprints)
- 8-10 features completed
- Iron out issues

### Day 4-5
- Smooth operation
- 12-15 features completed
- Consider optimizations

### Week 2
- Full velocity
- 15+ features daily
- 75+ features per week

---

## ✅ YOUR DAILY CHECKLIST

### Morning (8:00 AM)
- [ ] Launch Orchestrator
- [ ] Launch Feature Dev
- [ ] Launch Dev Manager
- [ ] Launch 5 Teams (Sprint 1)

### Midday (11:30 AM)
- [ ] Launch Senior Dev Review 1
- [ ] Check for blockers
- [ ] Launch 5 Teams (Sprint 2)

### Afternoon (3:30 PM)
- [ ] Launch Senior Dev Review 2
- [ ] Verify integration
- [ ] Launch 5 Teams (Sprint 3)

### Evening (7:30 PM)
- [ ] Launch Senior Dev Review 3
- [ ] Collect all reports
- [ ] Update PROJECT-STATUS.md
- [ ] Archive today's prompts

---

## 🔀 GIT OPERATIONS - WHEN TO LAUNCH?

**Quick Decision Guide:**

After each Senior Dev review, check their report for "APPROVED FOR MERGE":
- ✅ Has approvals → Launch Git Operations (10 min session)
- ❌ No approvals → Skip Git Operations
- ⚠️ Only "NEEDS FIXES" → Skip Git Operations

**The Git Operations role is:**
- NOT a persistent service
- NOT always running
- ONLY launched when needed
- Closes after ~10 minutes

**Example flow:**
```
11:30 AM: Senior Dev reviews Sprint 1
11:55 AM: You read report - sees 3 features approved
12:00 PM: Launch Git Operations → commits created → session ends
12:10 PM: Git session closed, commits ready
```

## 🎯 REMEMBER

**You are the conductor, not the orchestra.**

Let the automated roles do their jobs. Your value is in:
- Starting the right processes
- Making strategic decisions
- Removing blockers
- Maintaining velocity

The system is designed to run itself once started.

---

**Ready? Start with the Migration Guide, then use this for daily operations!**