# 🚀 WEDSYNC WORKFLOW V2 - 42 DAYS TO BETA

## ⏰ OCTOBER 1ST DEADLINE - EVERYTHING LIVES HERE

This folder contains the COMPLETE workflow for reaching beta by October 1st.
All documents, prompts, logs, and outputs are centralized here.

---

## 📁 CLEAN FOLDER STRUCTURE

```
00-ROADMAP/              → 🎯 START HERE - October 1st deadline & tracking
01-PROJECT-ORCHESTRATOR/ → First role: Plans daily features
02-FEATURE-DEVELOPMENT/  → Second role: Creates technical specs  
03-DEV-MANAGER/         → Third role: Creates 15 team prompts
09-SENIOR-CODE-REVIEWER/ → Guardian role: Reviews all work, protects codebase
05-GIT-OPERATIONS/      → Fifth role: Commits approved code
06-SQL-EXPERT/          → Sixth role: Reviews & applies ALL database migrations
07-WORKFLOW-MANAGER/    → NEW: Process orchestration & bottleneck prevention

99-OVERVIEW/            → Workflow guides and documentation
SESSION-LOGS/           → All team outputs (centralized)
session-prompts/        → All team prompts (centralized)
archive/                → Old/outdated documents
INBOX/                  → Migration requests for SQL Expert
OUTBOX/                 → Completed migration reports from SQL Expert

🎨 UI DESIGN SYSTEM:
SAAS-UI-STYLE-GUIDE.md            → Complete UI/UX design system for general application (MANDATORY)
JOURNEY-BUILDER-UI-STYLE-GUIDE.md → UI design system for Journey Builder feature only
```

---

## 🎯 HOW TO USE THIS WORKFLOW

### Every Morning:

1. **Check Progress:**
   - Open `00-ROADMAP/DAILY-PROGRESS-TRACKER.md`
   - Are we at [X]% complete? (Should increase 2% daily)
   - Update today's target

2. **Run the Workflow:**
   - FIRST: `07-WORKFLOW-MANAGER/README.md` (check workflow health & bottlenecks)
   - Start with `01-PROJECT-ORCHESTRATOR/README.md`
   - Then `02-FEATURE-DEVELOPMENT/README.md`
   - Then `03-DEV-MANAGER/README.md`
   - Then launch 15 dev teams with prompts from `session-prompts/active/`
   - Then `09-SENIOR-CODE-REVIEWER/README.md` (Guardian protection)
   - Then `06-SQL-EXPERT/README.md` (reviews ALL migrations from dev teams)
   - Finally `05-GIT-OPERATIONS/README.md` (if approvals exist)
   - END: `07-WORKFLOW-MANAGER/README.md` (update status & prepare for V3)

3. **Track Everything:**
   - All outputs go to `SESSION-LOGS/today/`
   - All learnings go to `SESSION-LOGS/LEARNINGS/`
   - Archive yesterday's work automatically

---

## 📊 CURRENT STATUS

**DEADLINE:** October 1st (42 days)
**COMPLETION:** 15-20%
**REQUIRED DAILY:** 8 features minimum (2% progress)
**WITH 5 TEAMS:** 10-15 features/day achievable

---

## 🔧 POSTGRESQL MCP SERVER (DATABASE ACCESS)

**✅ STATUS: CONNECTED** - Full database access available via PostgreSQL MCP
- **Connection**: Direct access to Supabase database (Project: azhgptjkqiiqvvvhapml)
- **Capabilities**: Query execution, migrations, schema operations
- **Usage**: All dev teams can request database operations through Claude
- **Documentation**: See CLAUDE.md for full MCP details

## ⚠️ CRITICAL RULES

1. **Everything stays in this folder** - No scattered files
2. **Archive daily** - Each role guide includes cleanup
3. **Track progress daily** - Update DAILY-PROGRESS-TRACKER.md
4. **Focus on October 1st** - Every decision serves the deadline
5. **Use PostgreSQL MCP** - For all database operations and migrations

---

## 🔗 QUICK LINKS

- [October 1st Goal](00-ROADMAP/README.md)
- [Beta Requirements](00-ROADMAP/BETA-ROADMAP-OCT1.md)
- [Daily Progress](00-ROADMAP/DAILY-PROGRESS-TRACKER.md)
- [Workflow Overview](99-OVERVIEW/DAILY-WORKFLOW.md)
- [Folder Structure](99-OVERVIEW/FOLDER-STRUCTURE-GUIDE.md)

---

**Remember: 42 days. 320 features. October 1st. Let's ship this beta!**