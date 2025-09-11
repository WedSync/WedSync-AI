# 📂 WORKFLOW V2 FILE CLEANUP ANALYSIS

## ✅ FILES TO KEEP (ACTIVE USE)

### Core Role Guides (MOVED TO FOLDERS):
- **PROJECT-ORCHESTRATOR-GUIDE.md** → `01-PROJECT-ORCHESTRATOR/README.md`
- **FEATURE-DEVELOPMENT-GUIDE.md** → `02-FEATURE-DEVELOPMENT/README.md`
- **DEV-MANAGER-GUIDE.md** → `03-DEV-MANAGER/README.md`
- **SENIOR-DEV-GUIDE.md** → `04-SENIOR-DEV/README.md`
- **GIT-OPERATIONS-GUIDE.md** → `05-GIT-OPERATIONS/README.md`

### Overview Documents (MOVED TO 00-OVERVIEW):
- **DAILY-WORKFLOW-V2.md** - Overall orchestration guide
- **HUMAN-PM-QUICK-START.md** - Simple guide for human PM
- **CRITICAL-IMPROVEMENTS-SUMMARY.md** - Context7/Serena first approach

### Still Useful:
- **MARATHON-SESSION-PROTOCOL.md** - For multi-day continuous sessions
- **FINAL-VERIFICATION-COMPLETE.md** - Verification checklist

## ⚠️ FILES TO ARCHIVE (REDUNDANT/OUTDATED)

### Superseded by New Guides:
- **PM-MASTER-CONTROL-V2.md** - Draft version, now split into role guides
- **MIGRATION-GUIDE.md** - One-time migration, no longer needed
- **README.md** - Generic, not needed with new structure
- **SENIOR-DEV-AUTOMATED-PROMPT.md** - Integrated into SENIOR-DEV-GUIDE
- **TEAM-PROMPT-TEMPLATES.md** - Integrated into DEV-MANAGER-GUIDE

## 📁 NEW FOLDER STRUCTURE

```
/WORKFLOW-V2-DRAFT/
├── 00-OVERVIEW/                    # Start here for understanding
│   ├── DAILY-WORKFLOW.md          # Overall orchestration
│   ├── HUMAN-PM-GUIDE.md          # Simple guide for humans
│   └── CRITICAL-IMPROVEMENTS.md    # Context7 first approach
│
├── 01-PROJECT-ORCHESTRATOR/        # First role in workflow
│   └── README.md                   # Self-contained guide
│
├── 02-FEATURE-DEVELOPMENT/         # Second role
│   └── README.md                   # Self-contained guide
│
├── 03-DEV-MANAGER/                 # Third role (creates 15 prompts)
│   └── README.md                   # Self-contained guide
│
├── 04-SENIOR-DEV/                  # Reviews all work
│   └── README.md                   # Self-contained guide
│
├── 05-GIT-OPERATIONS/              # Commits approved code
│   └── README.md                   # Self-contained guide
│
├── MARATHON-SESSION-PROTOCOL.md    # For multi-day sessions
└── archive/                        # Old/redundant files
    ├── PM-MASTER-CONTROL-V2.md
    ├── MIGRATION-GUIDE.md
    ├── README.md
    ├── SENIOR-DEV-AUTOMATED-PROMPT.md
    └── TEAM-PROMPT-TEMPLATES.md
```

## 🔗 PATH UPDATES NEEDED

All documents need path updates from:
- `/WORKFLOW-V2-DRAFT/[guide-name].md`

To:
- `/WORKFLOW-V2-DRAFT/[folder-number]-[role]/README.md`

This will be done automatically in the next step.