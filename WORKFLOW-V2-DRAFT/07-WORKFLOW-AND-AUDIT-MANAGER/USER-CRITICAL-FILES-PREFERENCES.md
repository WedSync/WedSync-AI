# 📌 USER-SPECIFIED CRITICAL FILES & PREFERENCES
## Custom Validation Rules Based on User Requirements

**Created**: 2025-01-09
**User Preferences Documented By**: Workflow and Audit Manager

---

## ✅ FILES/DIRECTORIES TO KEEP (User Specified)

### 1. **WORKFLOW-V2-DRAFT Components**
- ✅ **Completion Reports** (WS-XXX completion documents)
- ✅ **Job Files** (`/WORKFLOW-V2-DRAFT/OUTBOX/WS JOBS/`)
- ✅ **INBOX Files** in each agent folder:
  - `/WORKFLOW-V2-DRAFT/INBOX/senior-dev/`
  - `/WORKFLOW-V2-DRAFT/INBOX/dev-manager/`
  - `/WORKFLOW-V2-DRAFT/INBOX/project-orchestrator/`
  - `/WORKFLOW-V2-DRAFT/INBOX/feature-designer/`
- ✅ **OUTBOX Files** in each agent folder:
  - `/WORKFLOW-V2-DRAFT/OUTBOX/project-orchestrator/`
  - `/WORKFLOW-V2-DRAFT/OUTBOX/feature-designer/`
  - `/WORKFLOW-V2-DRAFT/OUTBOX/dev-manager/`
  - `/WORKFLOW-V2-DRAFT/OUTBOX/WS JOBS/`

### 2. **Agent-Specific Documents**
- ✅ All files in numbered agent folders (01-09):
  - `01-PROJECT-ORCHESTRATOR/`
  - `02-FEATURE-DEVELOPMENT/`
  - `03-DEV-MANAGER/`
  - `04-SENIOR-DEVELOPER/`
  - `05-WORKFLOW-MANAGER/`
  - `06-QUALITY-ASSURANCE/`
  - `07-WORKFLOW-AND-AUDIT-MANAGER/` (especially)
  - `08-MIGRATION-MASTER/`
  - `09-GUARDIAN-OF-WEDSYNC/`

### 3. **Handover Documents**
Located handover documents to KEEP:
- ✅ `/wedsync/docs/WS-167-TRIAL-MANAGEMENT-HANDOVER.md`
- ✅ `/WS-167-TECHNICAL-HANDOVER-COMPLETE.md`
- ✅ `/WS-167-TECHNICAL-HANDOVER-ROUND3.md`
- ✅ Any file with "handover" or "HANDOVER" in the name

### 4. **Core System Files**
- ✅ `CLAUDE.md` (all locations)
- ✅ `README.md` (all locations)
- ✅ All files in `/CORE-SPECIFICATIONS/`

---

## 🗑️ FILES/DIRECTORIES TO DELETE (User Specified)

### 1. **WORKFLOW-V3 Directory**
- ❌ **DELETE ENTIRELY**: `/WORKFLOW-V3/` (46 MD files)
- User quote: "Test flow workflow v3 can just be deleted; I'm not going to use that"

### 2. **TEST-WORKFLOW Directory**
- ❌ **DELETE ENTIRELY**: `/TEST-WORKFLOW/`
- Related test workflow files

### 3. **Scattered MD Files**
User quote: "There's just so many items that are Mac Delphi files just floating around in places, and if they're not being used then let's just delete them"

Delete patterns:
- ❌ Random MD files in root directory (not in organized folders)
- ❌ Temporary session files older than 7 days
- ❌ Draft files with no recent updates
- ❌ Empty or near-empty files (<100 bytes)
- ❌ Files with generic/template content

---

## 🔍 SPECIAL SEARCH PATTERNS

### Files to Find and Evaluate:
```bash
# Handover documents (KEEP)
find . -name "*handover*.md" -o -name "*HANDOVER*.md"

# Completion reports (KEEP)
find . -name "*completion*.md" -o -name "*COMPLETION*.md"
find . -name "*complete*.md" -o -name "*COMPLETE*.md"

# Job files and reports (KEEP)
find . -path "*/WS JOBS/*.md"
find . -name "WS-[0-9]*-*.md"  # WS numbered features

# Random scattered files (EVALUATE FOR DELETION)
find . -maxdepth 2 -name "*.md"  # Root level MD files
find . -name "*temp*.md" -o -name "*draft*.md"
find . -name "*test*.md" -o -name "*TEST*.md"
```

---

## 📋 UPDATED VALIDATION RULES

### KEEP Priority (Override default deletion)
1. **Location-based**:
   - Any MD in `/WORKFLOW-V2-DRAFT/` main structure
   - Any MD in agent folders (01-09)
   - Any MD in INBOX/OUTBOX folders
   - Any MD in WS JOBS folders

2. **Name-based**:
   - Contains "handover" or "HANDOVER"
   - Contains "completion" or "COMPLETION"
   - Matches WS-XXX pattern (feature files)
   - Is named README.md or CLAUDE.md

3. **Content-based**:
   - Contains actual job specifications
   - Contains completion evidence
   - Contains technical specifications
   - Contains workflow instructions

### DELETE Priority (Override default keep)
1. **Location-based**:
   - Everything in `/WORKFLOW-V3/`
   - Everything in `/TEST-WORKFLOW/`
   - Root level MD files (unless critical)

2. **Name-based**:
   - Contains "temp" or "draft" (unless recent)
   - Contains "test" (unless in active test suite)
   - Auto-generated session logs > 7 days

3. **Content-based**:
   - File size < 100 bytes
   - Only contains template text
   - Duplicate content

---

## ⚠️ USER NOTES & WARNINGS

### From User:
> "Don't take this as gospel because I might be wrong"

### Safety Measures:
1. **Archive before delete** - Everything goes to archive first
2. **Review large deletions** - If deleting >50 files, create list for review
3. **Check references** - Ensure files aren't referenced in code
4. **Keep recent files** - If modified in last 7 days, keep by default

### Uncertainty Areas:
- Some handover documents location unknown
- Some completion reports may have non-standard names
- Some critical workflow files may not follow naming conventions

**Recommendation**: Run cleanup in phases:
1. Phase 1: Delete obvious targets (WORKFLOW-V3, TEST-WORKFLOW)
2. Phase 2: Archive old session logs and drafts
3. Phase 3: Manual review of edge cases
4. Phase 4: Final cleanup of validated deletions

---

## 🎯 CUSTOMIZED CLEANUP APPROACH

Based on your preferences, the cleanup will:

### Definitely Delete:
- `/WORKFLOW-V3/` - 46 files
- `/TEST-WORKFLOW/` - all files
- Session logs > 7 days old
- Empty files < 100 bytes
- Obvious duplicates

### Definitely Keep:
- All WORKFLOW-V2-DRAFT structure
- All agent folders (01-09)
- All INBOX/OUTBOX contents
- All WS JOBS files
- All handover documents
- All completion reports

### Review Before Action:
- Root level MD files
- Files with ambiguous names
- Files 7-30 days old
- Files in unexpected locations

---

**Next Step**: Create customized cleanup script based on these preferences?