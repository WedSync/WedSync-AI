# 📚 MD FILE CLEANUP & LIFECYCLE MANAGEMENT PROCESS
## Workflow and Audit Manager - Extended Responsibility

**Created**: 2025-01-09
**Status**: 🚨 CRITICAL - 7,622 MD files detected requiring cleanup
**Owner**: Workflow and Audit Manager (Grae)

---

## 🔍 CURRENT SITUATION ANALYSIS

### Scope of Problem
- **Total MD Files**: 7,622 files
- **Workflow/Session Related**: 5,628 files (74%)
- **Major Concentrations**:
  - `/WORKFLOW-V2-DRAFT/INBOX/senior-dev/`: 1,778 files
  - `/WORKFLOW-V2-DRAFT/OUTBOX/`: 1,663 files
  - `/WS JOBS/`: 1,373 files
  - `/WORKFLOW-V2-DRAFT/OUTBOX/feature-designer/`: 396 files

### File Categories Identified

#### 1. 🔴 **CRITICAL - MUST KEEP** (Est. 5-10%)
- `CLAUDE.md` - Primary Claude configuration
- `README.md` files in active directories
- Core specification documents in `/CORE-SPECIFICATIONS/`
- Active workflow documentation
- Current project roadmaps and architecture docs

#### 2. 🟡 **ACTIVE - KEEP TEMPORARILY** (Est. 15-20%)
- Current WS-XXX features in development
- Active session logs from last 7 days
- Recent evidence packages
- In-progress workflow documents
- Current sprint documentation

#### 3. 🟠 **ARCHIVE CANDIDATES** (Est. 30-40%)
- Completed WS-XXX features (older than 30 days)
- Session logs older than 7 days
- Old evidence packages
- Completed workflow documents
- Historical reports and audits

#### 4. 🔴 **DELETE CANDIDATES** (Est. 40-50%)
- Duplicate files (same content, different locations)
- Empty or near-empty MD files
- Temporary session files
- Auto-generated reports older than 30 days
- Test/draft documents
- Claude-generated exploratory files

---

## 🛡️ MD FILE VALIDATION RULES

### Rule 1: Core System Files (NEVER DELETE)
```bash
PROTECT_PATTERNS=(
  "CLAUDE.md"
  "README.md"
  "CORE-SPECIFICATIONS/*.md"
  "WORKFLOW-V2-DRAFT/*/README.md"
  "docs/architecture/*.md"
  "LICENSE.md"
  "CONTRIBUTING.md"
  "SECURITY.md"
)
```

### Rule 2: Active Development Files (KEEP 30 DAYS)
```bash
ACTIVE_PATTERNS=(
  "WS-[0-9]+-*.md"           # Active features
  "SESSION-LOGS/$(date +%Y-%m)*/*.md"  # Current month sessions
  "*-EVIDENCE-PACKAGE.md"     # Recent evidence
  "*-in-progress.md"          # Work in progress
  "*-TODO.md"                 # Active task lists
)
```

### Rule 3: Archive After Criteria
- Session logs: Archive after 7 days
- WS features: Archive 30 days after completion
- Evidence packages: Archive with their WS feature
- Reports: Archive after 30 days
- Workflow outputs: Archive after review completion

### Rule 4: Safe to Delete Criteria
- File size < 100 bytes (likely empty)
- Contains only template text (no actual content)
- Duplicate content (keep newest, delete older)
- Test files matching pattern `*-test-*.md`, `*-temp-*.md`
- Auto-generated files older than 30 days

---

## 🔧 CLEANUP PROCESS

### Phase 1: Analysis & Inventory (Day 1)
```bash
#!/bin/bash
# MD File Inventory Script

echo "=== MD FILE INVENTORY ANALYSIS ==="
echo "Date: $(date)"
echo ""

# Count by category
echo "📊 FILE STATISTICS:"
total_files=$(find . -name "*.md" | wc -l)
echo "Total MD files: $total_files"

# Critical files
critical=$(find . -name "CLAUDE.md" -o -name "README.md" | wc -l)
echo "Critical system files: $critical"

# WS feature files
ws_files=$(find . -name "WS-[0-9]*-*.md" | wc -l)
echo "WS feature files: $ws_files"

# Session logs
session_logs=$(find . -path "*/SESSION-LOGS/*.md" | wc -l)
echo "Session log files: $session_logs"

# Evidence packages
evidence=$(find . -name "*EVIDENCE*.md" | wc -l)
echo "Evidence packages: $evidence"

# Check for duplicates
echo ""
echo "🔍 DUPLICATE DETECTION:"
find . -name "*.md" -exec md5sum {} \; | sort | uniq -d -w 32

# Find empty files
echo ""
echo "📄 EMPTY FILES:"
find . -name "*.md" -size -100c | head -20

# Age analysis
echo ""
echo "📅 AGE ANALYSIS:"
echo "Files older than 30 days:"
find . -name "*.md" -mtime +30 | wc -l
echo "Files older than 7 days:"
find . -name "*.md" -mtime +7 | wc -l
```

### Phase 2: Validation & Categorization (Day 2)
```bash
#!/bin/bash
# Categorize MD files for cleanup

ARCHIVE_DIR="./ARCHIVED-MD-FILES-$(date +%Y%m%d)"
DELETE_LIST="./delete-candidates.txt"
ARCHIVE_LIST="./archive-candidates.txt"
KEEP_LIST="./keep-files.txt"

# Create lists
> "$DELETE_LIST"
> "$ARCHIVE_LIST"
> "$KEEP_LIST"

# Categorize each file
find . -name "*.md" | while read -r file; do
  # Check if critical
  if [[ "$file" =~ (CLAUDE\.md|README\.md|LICENSE|CONTRIBUTING|SECURITY) ]]; then
    echo "$file" >> "$KEEP_LIST"
    continue
  fi
  
  # Check if active WS feature
  if [[ "$file" =~ WS-[0-9]+ ]]; then
    age_days=$((($(date +%s) - $(stat -f %m "$file")) / 86400))
    if [ $age_days -gt 30 ]; then
      echo "$file" >> "$ARCHIVE_LIST"
    else
      echo "$file" >> "$KEEP_LIST"
    fi
    continue
  fi
  
  # Check if empty or tiny
  size=$(stat -f %z "$file")
  if [ $size -lt 100 ]; then
    echo "$file" >> "$DELETE_LIST"
    continue
  fi
  
  # Check age for other files
  age_days=$((($(date +%s) - $(stat -f %m "$file")) / 86400))
  if [ $age_days -gt 30 ]; then
    echo "$file" >> "$DELETE_LIST"
  elif [ $age_days -gt 7 ]; then
    echo "$file" >> "$ARCHIVE_LIST"
  else
    echo "$file" >> "$KEEP_LIST"
  fi
done

echo "Categorization complete:"
echo "Keep: $(wc -l < $KEEP_LIST) files"
echo "Archive: $(wc -l < $ARCHIVE_LIST) files"
echo "Delete: $(wc -l < $DELETE_LIST) files"
```

### Phase 3: Safe Archival Process (Day 3)
```bash
#!/bin/bash
# Safe archival with verification

ARCHIVE_DIR="./ARCHIVED-MD-FILES-$(date +%Y%m%d)"
ARCHIVE_LOG="$ARCHIVE_DIR/archive-log.txt"

# Create archive directory structure
mkdir -p "$ARCHIVE_DIR"/{workflow,sessions,evidence,reports,misc}

echo "=== ARCHIVAL PROCESS STARTED ===" > "$ARCHIVE_LOG"
echo "Date: $(date)" >> "$ARCHIVE_LOG"
echo "" >> "$ARCHIVE_LOG"

# Archive files by category
archive_file() {
  local source="$1"
  local category="$2"
  local dest="$ARCHIVE_DIR/$category/$(basename "$source")"
  
  # Check if file exists and is not empty
  if [[ -f "$source" && -s "$source" ]]; then
    # Create checksum before move
    checksum=$(md5sum "$source" | cut -d' ' -f1)
    
    # Move file
    mv "$source" "$dest"
    
    # Verify move
    if [[ -f "$dest" ]]; then
      new_checksum=$(md5sum "$dest" | cut -d' ' -f1)
      if [[ "$checksum" == "$new_checksum" ]]; then
        echo "✅ Archived: $source -> $dest" >> "$ARCHIVE_LOG"
      else
        echo "❌ Checksum mismatch: $source" >> "$ARCHIVE_LOG"
        # Restore file
        mv "$dest" "$source"
      fi
    fi
  fi
}

# Process archive list
while IFS= read -r file; do
  if [[ "$file" =~ SESSION-LOGS ]]; then
    archive_file "$file" "sessions"
  elif [[ "$file" =~ EVIDENCE ]]; then
    archive_file "$file" "evidence"
  elif [[ "$file" =~ (WORKFLOW|INBOX|OUTBOX) ]]; then
    archive_file "$file" "workflow"
  elif [[ "$file" =~ (REPORT|AUDIT) ]]; then
    archive_file "$file" "reports"
  else
    archive_file "$file" "misc"
  fi
done < "./archive-candidates.txt"

# Create archive summary
echo "" >> "$ARCHIVE_LOG"
echo "=== ARCHIVE SUMMARY ===" >> "$ARCHIVE_LOG"
echo "Total archived: $(find "$ARCHIVE_DIR" -name "*.md" | wc -l) files" >> "$ARCHIVE_LOG"
echo "Archive size: $(du -sh "$ARCHIVE_DIR" | cut -f1)" >> "$ARCHIVE_LOG"

# Compress archive
tar -czf "$ARCHIVE_DIR.tar.gz" "$ARCHIVE_DIR"
echo "Archive compressed: $ARCHIVE_DIR.tar.gz" >> "$ARCHIVE_LOG"
```

### Phase 4: Deletion with Safety Checks (Day 4)
```bash
#!/bin/bash
# Safe deletion process with multiple confirmations

DELETE_LOG="./deletion-log-$(date +%Y%m%d).txt"
TRASH_DIR="./TRASH-MD-FILES-$(date +%Y%m%d)"

# Create trash directory (recoverable deletes)
mkdir -p "$TRASH_DIR"

echo "=== DELETION PROCESS ===" > "$DELETE_LOG"
echo "Date: $(date)" >> "$DELETE_LOG"
echo "" >> "$DELETE_LOG"

# Safety check function
safe_delete() {
  local file="$1"
  
  # Skip if doesn't exist
  [[ ! -f "$file" ]] && return
  
  # Double-check not critical
  if [[ "$file" =~ (CLAUDE\.md|README\.md|CORE-SPECIFICATIONS) ]]; then
    echo "⚠️ BLOCKED: Critical file $file" >> "$DELETE_LOG"
    return
  fi
  
  # Move to trash first (recoverable)
  mv "$file" "$TRASH_DIR/"
  echo "🗑️ Trashed: $file" >> "$DELETE_LOG"
}

# Process delete list
deleted_count=0
while IFS= read -r file; do
  safe_delete "$file"
  ((deleted_count++))
done < "./delete-candidates.txt"

echo "" >> "$DELETE_LOG"
echo "=== DELETION SUMMARY ===" >> "$DELETE_LOG"
echo "Files moved to trash: $deleted_count" >> "$DELETE_LOG"
echo "Trash location: $TRASH_DIR" >> "$DELETE_LOG"
echo "To permanently delete: rm -rf $TRASH_DIR" >> "$DELETE_LOG"
echo "To recover: mv $TRASH_DIR/* ./" >> "$DELETE_LOG"
```

---

## 📊 MONITORING & MAINTENANCE

### Weekly MD File Health Check
```bash
#!/bin/bash
# Weekly health check for MD proliferation

echo "=== WEEKLY MD FILE HEALTH CHECK ==="
echo "Date: $(date)"

# Growth rate check
current_count=$(find . -name "*.md" | wc -l)
last_week_count=$(cat ./.md-file-count 2>/dev/null || echo 0)
growth=$((current_count - last_week_count))

echo "Current MD files: $current_count"
echo "Last week: $last_week_count"
echo "Growth: $growth files"

# Save current count
echo "$current_count" > ./.md-file-count

# Alert if excessive growth
if [ $growth -gt 100 ]; then
  echo "⚠️ WARNING: Excessive MD file growth detected!"
  echo "Manual review recommended"
fi

# Find newest problem areas
echo ""
echo "📁 Directories with most recent MD files:"
find . -name "*.md" -mtime -7 | xargs dirname | sort | uniq -c | sort -rn | head -10

# Recommend cleanup
if [ $current_count -gt 1000 ]; then
  echo ""
  echo "🧹 CLEANUP RECOMMENDED"
  echo "Run cleanup process to archive/delete old files"
fi
```

### Prevention Rules for Claude Sessions

1. **Session File Naming Convention**:
   - Use WS-XXX prefix for feature-related docs
   - Add `-TEMP` suffix for exploratory files
   - Include date in session logs: `session-YYYY-MM-DD-*.md`

2. **Auto-Cleanup Triggers**:
   - Session ends: Move logs to SESSION-LOGS
   - Feature completes: Archive evidence packages
   - Sprint ends: Clean workflow directories

3. **File Creation Guidelines**:
   - Check if similar file exists before creating
   - Use existing templates when available
   - Prefer updating over creating new files
   - Mark temporary files clearly

---

## 🎯 EXPECTED OUTCOMES

### After Initial Cleanup
- **Reduce MD files by 60-70%** (from 7,622 to ~2,500)
- **Archive 30%** for historical reference
- **Delete 40%** redundant/empty files
- **Organize remaining 30%** into clear structure

### Ongoing Maintenance
- **Weekly growth**: <50 new MD files
- **Monthly cleanup**: Remove 80% of session files
- **Quarterly archive**: Move completed features
- **Annual review**: Full audit and restructure

---

## 🚨 EMERGENCY RECOVERY

If cleanup goes wrong:

1. **Archived files**: Restore from `ARCHIVED-MD-FILES-*.tar.gz`
2. **Deleted files**: Recover from `TRASH-MD-FILES-*` directory
3. **Git recovery**: `git checkout -- "*.md"` (if tracked)
4. **Backup restoration**: Check system backups

---

## ✅ IMPLEMENTATION CHECKLIST

- [ ] Run initial inventory analysis
- [ ] Review and approve categorization rules
- [ ] Create backup of entire project
- [ ] Execute Phase 1: Analysis
- [ ] Execute Phase 2: Categorization
- [ ] Execute Phase 3: Archival
- [ ] Execute Phase 4: Deletion
- [ ] Verify system still functional
- [ ] Document lessons learned
- [ ] Set up weekly monitoring
- [ ] Train team on prevention rules

---

**Next Steps**: 
1. Review this process document
2. Approve cleanup approach
3. Schedule cleanup window (recommend weekend)
4. Execute with monitoring

**Estimated Time**: 4-6 hours for initial cleanup
**Risk Level**: Low (with safety measures in place)
**Recovery Time**: <30 minutes if issues occur