# 📁 WORKFLOW V2 - CENTRALIZED FOLDER STRUCTURE

## 🎯 EVERYTHING IN ONE PLACE: `/WORKFLOW-V2-DRAFT/`

No more scattered files! All workflow operations happen within this single directory.

---

## 📂 COMPLETE FOLDER STRUCTURE

```
/WORKFLOW-V2-DRAFT/
│
├── 00-ROADMAP/                          # 🏁 START HERE - October 1st deadline!
│   ├── README.md                       # Quick overview - THE GOAL
│   ├── BETA-ROADMAP-OCT1.md            # Complete beta requirements
│   └── DAILY-PROGRESS-TRACKER.md       # Track progress to deadline
│
├── 01-PROJECT-ORCHESTRATOR/            # ROLE 1: Strategic planning
│   ├── README.md                       # Self-contained role guide
│   ├── output/                         # Feature assignments go here
│   │   └── [DATE]-feature-assignments.md
│   └── archive/                        # Yesterday's assignments
│       └── [DATE]/
│
├── 02-FEATURE-DEVELOPMENT/             # ROLE 2: Technical specifications
│   ├── README.md                       # Self-contained role guide
│   ├── output/                         # Technical specs go here
│   │   └── [DATE]/
│   │       └── [feature]-technical.md
│   └── archive/                        # Yesterday's specs
│       └── [DATE]/
│
├── 03-DEV-MANAGER/                     # ROLE 3: Creates 15 team prompts
│   ├── README.md                       # Self-contained role guide
│   ├── output/                         # Coordination docs go here
│   │   └── [DATE]-coordination.md
│   └── archive/                        # Yesterday's coordination
│       └── [DATE]/
│
├── 09-SENIOR-CODE-REVIEWER/            # GUARDIAN: Reviews all work, protects codebase
│   └── README.md                       # Self-contained Guardian role guide
│
├── 05-GIT-OPERATIONS/                  # ROLE 5: Commits approved code
│   └── README.md                       # Self-contained role guide
│
├── SESSION-LOGS/                       # All session outputs centralized
│   ├── today/                          # Today's active logs
│   │   ├── team-[a-e]-round-[1-3]-overview.md
│   │   ├── team-[a-e]-round-[1-3]-to-dev-manager.md
│   │   ├── team-[a-e]-round-[1-3]-senior-dev-prompt.md
│   │   ├── senior-dev-review-round[1-3].md
│   │   ├── git-operations-round[1-3].md
│   │   └── CHANGELOG-[DATE].md
│   ├── archive/                        # Previous days' logs
│   │   └── [DATE]/                     # Organized by date
│   └── LEARNINGS/                      # Accumulated knowledge
│       └── [DATE]-[pattern].md
│
├── session-prompts/                    # All team prompts centralized
│   ├── active/                         # Today's prompts
│   │   └── team-[a-e]-round-[1-3].md  # 15 prompts total
│   └── archive/                        # Previous prompts
│       └── [DATE]/
│
├── 99-OVERVIEW/                         # Overall workflow understanding
│   ├── DAILY-WORKFLOW.md               # Orchestration guide
│   ├── HUMAN-PM-GUIDE.md               # Simple guide for human PM
│   ├── CRITICAL-IMPROVEMENTS.md        # Context7/Serena first approach
│   └── FOLDER-STRUCTURE-GUIDE.md       # This document
│
├── MARATHON-SESSION-PROTOCOL.md        # For multi-day sessions
└── FINAL-VERIFICATION-COMPLETE.md      # Verification checklist
```

---

## 🔄 DAILY CLEANUP PROTOCOL

### Morning (Start of Day) - PROJECT ORCHESTRATOR Does This:
```bash
# 1. Archive yesterday's session logs
mv SESSION-LOGS/today/* SESSION-LOGS/archive/[YESTERDAY]/ 2>/dev/null || true

# 2. Archive yesterday's prompts
mv session-prompts/active/* session-prompts/archive/[YESTERDAY]/ 2>/dev/null || true

# 3. Archive yesterday's outputs
mv 01-PROJECT-ORCHESTRATOR/output/* 01-PROJECT-ORCHESTRATOR/archive/[YESTERDAY]/ 2>/dev/null || true
mv 02-FEATURE-DEVELOPMENT/output/* 02-FEATURE-DEVELOPMENT/archive/[YESTERDAY]/ 2>/dev/null || true
mv 03-DEV-MANAGER/output/* 03-DEV-MANAGER/archive/[YESTERDAY]/ 2>/dev/null || true

# Clean slate for today!
```

### Why Cleanup Matters:
- **No confusion** - Only today's files in active folders
- **No accidents** - Can't accidentally use yesterday's prompts
- **Clean history** - Everything archived by date
- **Easy to find** - Know exactly where today's work is

---

## 📝 HOW TO USE THIS STRUCTURE

### For Human PM:

1. **Start your day:**
   - Open `/00-ROADMAP/README.md` - See the October 1st goal!
   - Check `/00-ROADMAP/DAILY-PROGRESS-TRACKER.md` - Are we on track?
   - Update today's progress target
   - Then `/99-OVERVIEW/DAILY-WORKFLOW.md` - Understand workflow

2. **Launch Project Orchestrator:**
   - Open `/01-PROJECT-ORCHESTRATOR/README.md`
   - Copy entire content to session
   - It will clean up old files first!

3. **Launch Feature Development:**
   - Open `/02-FEATURE-DEVELOPMENT/README.md`
   - Copy entire content to session
   - Reads from `01-PROJECT-ORCHESTRATOR/output/`

4. **Launch Dev Manager:**
   - Open `/03-DEV-MANAGER/README.md`
   - Copy entire content to session
   - Creates 15 prompts in `session-prompts/active/`

5. **Launch Dev Teams:**
   - Open each prompt from `session-prompts/active/`
   - One per team session (15 total)
   - Reports go to `SESSION-LOGS/today/`

6. **Launch Guardian:**
   - Open `/09-SENIOR-CODE-REVIEWER/README.md`
   - Reviews from `SESSION-LOGS/today/`
   - Creates reviews in same folder

7. **Launch Git Operations (if needed):**
   - Open `/05-GIT-OPERATIONS/README.md`
   - Only if Senior Dev approved features
   - Commits approved code

---

## 🎯 KEY BENEFITS OF CENTRALIZATION

### Everything in ONE place:
- ✅ No searching across folders
- ✅ Clear workflow progression
- ✅ Automatic cleanup prevents confusion
- ✅ All logs centralized
- ✅ All prompts centralized
- ✅ Easy to backup/version

### Self-contained roles:
- ✅ Each README has everything needed
- ✅ No memory required between sessions
- ✅ Clear input/output paths
- ✅ Cleanup steps included

### Clean daily workflow:
- ✅ Yesterday archived automatically
- ✅ Today's work always in `today/` or `active/`
- ✅ No accidental file reuse
- ✅ Clear audit trail in archives

---

## ⚠️ CRITICAL RULES

1. **ALWAYS run cleanup first** - Each role guide includes this
2. **NEVER skip archiving** - Prevents confusion
3. **ONLY work in designated folders** - No files outside structure
4. **USE the role README files** - They're self-contained guides

---

## 🚀 QUICK START CHECKLIST

Before starting daily workflow:
- [ ] Open `/WORKFLOW-V2-DRAFT/` folder
- [ ] All 5 role folders present (01-05)
- [ ] SESSION-LOGS/today/ is empty (or will be cleaned)
- [ ] session-prompts/active/ is empty (or will be cleaned)
- [ ] Ready to start with 01-PROJECT-ORCHESTRATOR

---

**This centralized structure ensures clean, organized, confusion-free workflow execution!**