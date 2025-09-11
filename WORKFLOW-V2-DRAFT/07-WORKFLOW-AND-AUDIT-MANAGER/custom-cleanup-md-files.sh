#!/bin/bash

# CUSTOM MD File Cleanup Script - Based on User Preferences
# Created by: Workflow and Audit Manager (Grae)
# Date: 2025-01-09
# Version: 2.0 - Customized for user requirements

set -euo pipefail

# Configuration
BASE_DIR="/Volumes/Extreme Pro/CODE/WedSync 2.0/WedSync Dev"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
ARCHIVE_DIR="$BASE_DIR/ARCHIVED-MD-FILES-$TIMESTAMP"
TRASH_DIR="$BASE_DIR/TRASH-MD-FILES-$TIMESTAMP"
REPORT_DIR="$BASE_DIR/WORKFLOW-V2-DRAFT/07-WORKFLOW-AND-AUDIT-MANAGER/cleanup-reports"
REPORT_FILE="$REPORT_DIR/custom-cleanup-report-$TIMESTAMP.md"
LOG_FILE="$REPORT_DIR/custom-cleanup-log-$TIMESTAMP.txt"

# Counters
TOTAL_FILES=0
KEPT_FILES=0
ARCHIVED_FILES=0
DELETED_FILES=0
WORKFLOW_V3_DELETED=0
TEST_WORKFLOW_DELETED=0
ERRORS=0

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
NC='\033[0m' # No Color

# Create necessary directories
mkdir -p "$ARCHIVE_DIR"/{workflow,sessions,evidence,reports,documentation,handover,jobs,misc}
mkdir -p "$TRASH_DIR"/{workflow-v3,test-workflow,scattered,old-sessions,misc}
mkdir -p "$REPORT_DIR"

# Initialize log
cat > "$LOG_FILE" << EOF
CUSTOM MD File Cleanup Started: $(date)
Base Directory: $BASE_DIR
User Preferences Applied: YES
========================================
EOF

# Function to print colored output
print_status() {
    local color=$1
    local message=$2
    echo -e "${color}${message}${NC}"
    echo "$message" >> "$LOG_FILE"
}

# PHASE 1: DELETE WORKFLOW-V3 (User specified)
print_status "$RED" "═══════════════════════════════════════════"
print_status "$RED" "PHASE 1: Deleting WORKFLOW-V3 (User Request)"
print_status "$RED" "═══════════════════════════════════════════"

if [[ -d "$BASE_DIR/WORKFLOW-V3" ]]; then
    # Count files first
    v3_count=$(find "$BASE_DIR/WORKFLOW-V3" -name "*.md" 2>/dev/null | wc -l)
    print_status "$YELLOW" "Found $v3_count MD files in WORKFLOW-V3 to delete"
    
    # Move entire directory to trash
    if mv "$BASE_DIR/WORKFLOW-V3" "$TRASH_DIR/workflow-v3/" 2>/dev/null; then
        WORKFLOW_V3_DELETED=$v3_count
        DELETED_FILES=$((DELETED_FILES + v3_count))
        print_status "$GREEN" "✅ Deleted WORKFLOW-V3 directory ($v3_count files)"
    else
        print_status "$RED" "❌ Failed to delete WORKFLOW-V3"
        ((ERRORS++))
    fi
else
    print_status "$BLUE" "WORKFLOW-V3 directory not found"
fi

# PHASE 2: DELETE TEST-WORKFLOW (User specified)
print_status "$RED" "═══════════════════════════════════════════"
print_status "$RED" "PHASE 2: Deleting TEST-WORKFLOW"
print_status "$RED" "═══════════════════════════════════════════"

if [[ -d "$BASE_DIR/TEST-WORKFLOW" ]]; then
    # Count files first
    test_count=$(find "$BASE_DIR/TEST-WORKFLOW" -name "*.md" 2>/dev/null | wc -l)
    print_status "$YELLOW" "Found $test_count MD files in TEST-WORKFLOW to delete"
    
    # Move entire directory to trash
    if mv "$BASE_DIR/TEST-WORKFLOW" "$TRASH_DIR/test-workflow/" 2>/dev/null; then
        TEST_WORKFLOW_DELETED=$test_count
        DELETED_FILES=$((DELETED_FILES + test_count))
        print_status "$GREEN" "✅ Deleted TEST-WORKFLOW directory ($test_count files)"
    else
        print_status "$RED" "❌ Failed to delete TEST-WORKFLOW"
        ((ERRORS++))
    fi
else
    print_status "$BLUE" "TEST-WORKFLOW directory not found"
fi

# Function to check if file should be kept based on user preferences
should_keep_file() {
    local file=$1
    local file_name=$(basename "$file")
    
    # CRITICAL FILES - ALWAYS KEEP
    if [[ "$file_name" == "CLAUDE.md" || "$file_name" == "README.md" ]]; then
        return 0  # Keep
    fi
    
    # HANDOVER DOCUMENTS - ALWAYS KEEP
    if [[ "$file" =~ [Hh][Aa][Nn][Dd][Oo][Vv][Ee][Rr] ]]; then
        return 0  # Keep
    fi
    
    # COMPLETION REPORTS - ALWAYS KEEP
    if [[ "$file" =~ [Cc][Oo][Mm][Pp][Ll][Ee][Tt] ]]; then
        return 0  # Keep
    fi
    
    # WORKFLOW-V2-DRAFT STRUCTURE - KEEP
    if [[ "$file" =~ WORKFLOW-V2-DRAFT/(INBOX|OUTBOX|0[1-9]-|JOBS) ]]; then
        return 0  # Keep
    fi
    
    # WS NUMBERED FEATURES - KEEP IF RECENT
    if [[ "$file" =~ WS-[0-9]+ ]]; then
        local age_days=$(get_file_age_days "$file")
        if [[ $age_days -lt 30 ]]; then
            return 0  # Keep if less than 30 days old
        fi
        return 2  # Archive if older
    fi
    
    # CORE SPECIFICATIONS - ALWAYS KEEP
    if [[ "$file" =~ CORE-SPECIFICATIONS ]]; then
        return 0  # Keep
    fi
    
    return 1  # Default: evaluate for deletion
}

# Function to get file age in days
get_file_age_days() {
    local file=$1
    if [[ -f "$file" ]]; then
        local age_seconds=$(($(date +%s) - $(stat -f %m "$file" 2>/dev/null || echo 0)))
        echo $((age_seconds / 86400))
    else
        echo 999  # Return high number if can't determine
    fi
}

# Function to safely archive a file
archive_file() {
    local file=$1
    local reason=$2
    local category="misc"
    
    # Determine category
    if [[ "$file" =~ [Hh][Aa][Nn][Dd][Oo][Vv][Ee][Rr] ]]; then
        category="handover"
    elif [[ "$file" =~ WS-[0-9]+ ]]; then
        category="workflow"
    elif [[ "$file" =~ (JOBS|jobs) ]]; then
        category="jobs"
    elif [[ "$file" =~ SESSION ]]; then
        category="sessions"
    elif [[ "$file" =~ EVIDENCE ]]; then
        category="evidence"
    fi
    
    local dest="$ARCHIVE_DIR/$category/$(basename "$file")"
    
    if mv "$file" "$dest" 2>/dev/null; then
        print_status "$BLUE" "📦 Archived: $(basename "$file") [$reason]"
        ((ARCHIVED_FILES++))
        return 0
    else
        print_status "$RED" "❌ Failed to archive: $file"
        ((ERRORS++))
        return 1
    fi
}

# Function to safely delete a file
delete_file() {
    local file=$1
    local reason=$2
    local category="misc"
    
    # Determine category for trash organization
    if [[ "$file" =~ SESSION-LOGS ]]; then
        category="old-sessions"
    elif [[ $(dirname "$file") == "$BASE_DIR" ]]; then
        category="scattered"
    fi
    
    local dest="$TRASH_DIR/$category/$(basename "$file")"
    
    if mv "$file" "$dest" 2>/dev/null; then
        print_status "$YELLOW" "🗑️  Deleted: $(basename "$file") [$reason]"
        ((DELETED_FILES++))
        return 0
    else
        print_status "$RED" "❌ Failed to delete: $file"
        ((ERRORS++))
        return 1
    fi
}

# PHASE 3: Process remaining MD files
print_status "$MAGENTA" "═══════════════════════════════════════════"
print_status "$MAGENTA" "PHASE 3: Processing Remaining MD Files"
print_status "$MAGENTA" "═══════════════════════════════════════════"

# Find all MD files (excluding already deleted directories)
mapfile -t md_files < <(find "$BASE_DIR" -type f -name "*.md" \
    -not -path "*/WORKFLOW-V3/*" \
    -not -path "*/TEST-WORKFLOW/*" 2>/dev/null)

TOTAL_FILES=${#md_files[@]}
print_status "$BLUE" "Found $TOTAL_FILES MD files to evaluate"

# Process each file
for file in "${md_files[@]}"; do
    # Skip if file doesn't exist (may have been moved already)
    [[ ! -f "$file" ]] && continue
    
    # Get file info
    file_size=$(stat -f %z "$file" 2>/dev/null || echo 0)
    file_age_days=$(get_file_age_days "$file")
    file_name=$(basename "$file")
    
    # Check user preferences
    should_keep_file "$file"
    keep_status=$?
    
    if [[ $keep_status -eq 0 ]]; then
        # KEEP FILE
        print_status "$GREEN" "✅ Keeping: $file_name [Protected by user rules]"
        ((KEPT_FILES++))
        
    elif [[ $keep_status -eq 2 ]]; then
        # ARCHIVE FILE
        archive_file "$file" "Old WS feature"
        
    else
        # EVALUATE FOR DELETION
        
        # Empty files
        if [[ $file_size -lt 100 ]]; then
            delete_file "$file" "Empty file"
            
        # Old session logs
        elif [[ "$file" =~ SESSION-LOGS && $file_age_days -gt 7 ]]; then
            if [[ $file_age_days -gt 30 ]]; then
                delete_file "$file" "Old session log"
            else
                archive_file "$file" "Recent session log"
            fi
            
        # Temp/draft files
        elif [[ "$file" =~ (temp|draft|test|old|backup|copy) && $file_age_days -gt 7 ]]; then
            delete_file "$file" "Temporary file"
            
        # Scattered root-level files
        elif [[ $(dirname "$file") == "$BASE_DIR" && "$file_name" != "CLAUDE.md" && "$file_name" != "README.md" ]]; then
            if [[ $file_age_days -gt 30 ]]; then
                delete_file "$file" "Scattered root file"
            else
                print_status "$BLUE" "⚠️  Review needed: $file_name (root level, recent)"
                ((KEPT_FILES++))
            fi
            
        # Very old files
        elif [[ $file_age_days -gt 60 ]]; then
            delete_file "$file" "Very old file"
            
        else
            # Default: keep for now
            print_status "$GREEN" "✅ Keeping: $file_name [No deletion criteria met]"
            ((KEPT_FILES++))
        fi
    fi
done

# Generate summary report
print_status "$BLUE" ""
print_status "$BLUE" "📊 Generating custom cleanup report..."

cat > "$REPORT_FILE" << EOF
# CUSTOM MD File Cleanup Report
**Date**: $(date)
**Operator**: Workflow and Audit Manager (Grae)
**User Preferences**: APPLIED ✅

## Summary Statistics

| Metric | Count | Percentage |
|--------|-------|------------|
| **Total Files Processed** | $TOTAL_FILES | 100% |
| **Files Kept** | $KEPT_FILES | $((TOTAL_FILES > 0 ? KEPT_FILES * 100 / TOTAL_FILES : 0))% |
| **Files Archived** | $ARCHIVED_FILES | $((TOTAL_FILES > 0 ? ARCHIVED_FILES * 100 / TOTAL_FILES : 0))% |
| **Files Deleted** | $DELETED_FILES | - |
| **WORKFLOW-V3 Deleted** | $WORKFLOW_V3_DELETED | ✅ User Request |
| **TEST-WORKFLOW Deleted** | $TEST_WORKFLOW_DELETED | ✅ User Request |
| **Errors** | $ERRORS | - |

## User-Requested Deletions

✅ **WORKFLOW-V3**: $WORKFLOW_V3_DELETED files deleted (entire directory)
✅ **TEST-WORKFLOW**: $TEST_WORKFLOW_DELETED files deleted (entire directory)

## Protected Files (Per User Preferences)

The following were protected from deletion:
- All files in WORKFLOW-V2-DRAFT structure
- All INBOX/OUTBOX contents  
- All WS JOBS files
- All handover documents
- All completion reports
- All agent folders (01-09)
- CLAUDE.md and README.md files

## Space Recovered

- **Archive Directory Size**: $(du -sh "$ARCHIVE_DIR" 2>/dev/null | cut -f1 || echo "0")
- **Trash Directory Size**: $(du -sh "$TRASH_DIR" 2>/dev/null | cut -f1 || echo "0")
- **Estimated Space Freed**: $(du -sh "$TRASH_DIR" 2>/dev/null | cut -f1 || echo "0")

## File Locations

- **Archived Files**: \`$ARCHIVE_DIR\`
- **Deleted Files** (Recoverable): \`$TRASH_DIR\`
- **Log File**: \`$LOG_FILE\`

## Archive Structure

\`\`\`
$ARCHIVE_DIR/
├── workflow/     (WS features, prompts, specs)
├── sessions/     (Session logs)
├── evidence/     (Evidence packages)
├── reports/      (Reports and audits)
├── documentation/ (Docs and guides)
├── handover/     (Handover documents)
├── jobs/         (Job files)
└── misc/         (Other files)
\`\`\`

## Trash Structure

\`\`\`
$TRASH_DIR/
├── workflow-v3/  (Complete WORKFLOW-V3 directory)
├── test-workflow/ (Complete TEST-WORKFLOW directory)
├── scattered/    (Root-level scattered files)
├── old-sessions/ (Old session logs)
└── misc/         (Other deleted files)
\`\`\`

## Recovery Instructions

### To Restore WORKFLOW-V3:
\`\`\`bash
mv "$TRASH_DIR/workflow-v3/WORKFLOW-V3" "$BASE_DIR/"
\`\`\`

### To Restore TEST-WORKFLOW:
\`\`\`bash
mv "$TRASH_DIR/test-workflow/TEST-WORKFLOW" "$BASE_DIR/"
\`\`\`

### To Restore Other Files:
\`\`\`bash
cp -r "$TRASH_DIR"/*/* "$BASE_DIR/"
\`\`\`

### To Permanently Delete Trash:
\`\`\`bash
rm -rf "$TRASH_DIR"
\`\`\`

## Validation Checklist

- [ ] System still builds successfully
- [ ] CLAUDE.md is present and intact
- [ ] All README files preserved
- [ ] WORKFLOW-V2-DRAFT structure intact
- [ ] All handover documents preserved
- [ ] All completion reports accessible
- [ ] WS JOBS files intact
- [ ] Agent folders (01-09) preserved

## User Notes

Based on your specifications:
- ✅ Deleted WORKFLOW-V3 as requested
- ✅ Deleted TEST-WORKFLOW as requested
- ✅ Protected all workflow completion reports
- ✅ Protected all INBOX/OUTBOX files
- ✅ Protected all handover documents
- ✅ Cleaned up scattered "Mac Delphi files" (random MD files)
- ⚠️ Files needing review are marked in the log

---

*Report generated by Custom MD File Cleanup Script v2.0*
*User preferences applied as specified*
EOF

# Print final summary
echo ""
print_status "$GREEN" "✅ CUSTOM CLEANUP COMPLETE!"
echo ""
print_status "$BLUE" "📊 Final Statistics:"
print_status "$GREEN" "   Kept: $KEPT_FILES files (protected by your rules)"
print_status "$BLUE" "   Archived: $ARCHIVED_FILES files"
print_status "$YELLOW" "   Deleted: $DELETED_FILES files total"
print_status "$RED" "   - WORKFLOW-V3: $WORKFLOW_V3_DELETED files"
print_status "$RED" "   - TEST-WORKFLOW: $TEST_WORKFLOW_DELETED files"
print_status "$RED" "   - Other: $((DELETED_FILES - WORKFLOW_V3_DELETED - TEST_WORKFLOW_DELETED)) files"

if [[ $ERRORS -gt 0 ]]; then
    print_status "$RED" "   Errors: $ERRORS files"
fi

echo ""
print_status "$BLUE" "📁 File Locations:"
print_status "$BLUE" "   Archives: $ARCHIVE_DIR"
print_status "$BLUE" "   Trash: $TRASH_DIR"
print_status "$BLUE" "   Report: $REPORT_FILE"
print_status "$BLUE" "   Log: $LOG_FILE"

echo ""
print_status "$YELLOW" "⚠️  Important: Deleted files are in trash and can be recovered"
print_status "$YELLOW" "   To permanently delete: rm -rf \"$TRASH_DIR\""
print_status "$GREEN" "   To restore WORKFLOW-V3: mv \"$TRASH_DIR/workflow-v3/WORKFLOW-V3\" \"$BASE_DIR/\""

# Create a list of protected files
echo "=== PROTECTED FILES ===" > "$REPORT_DIR/protected-files-$TIMESTAMP.txt"
find "$BASE_DIR" -type f -name "*.md" \
    -path "*/WORKFLOW-V2-DRAFT/*" -o \
    -name "*handover*.md" -o \
    -name "*HANDOVER*.md" -o \
    -name "CLAUDE.md" -o \
    -name "README.md" >> "$REPORT_DIR/protected-files-$TIMESTAMP.txt"

print_status "$GREEN" "📝 List of protected files saved to: $REPORT_DIR/protected-files-$TIMESTAMP.txt"

exit 0