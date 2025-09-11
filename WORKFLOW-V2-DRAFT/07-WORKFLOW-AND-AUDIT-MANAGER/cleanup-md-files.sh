#!/bin/bash

# MD File Cleanup Script - Safe and Recoverable
# Created by: Workflow and Audit Manager
# Date: 2025-01-09
# Version: 1.0

set -euo pipefail

# Configuration
BASE_DIR="/Volumes/Extreme Pro/CODE/WedSync 2.0/WedSync Dev"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
ARCHIVE_DIR="$BASE_DIR/ARCHIVED-MD-FILES-$TIMESTAMP"
TRASH_DIR="$BASE_DIR/TRASH-MD-FILES-$TIMESTAMP"
REPORT_DIR="$BASE_DIR/WORKFLOW-V2-DRAFT/07-WORKFLOW-AND-AUDIT-MANAGER/cleanup-reports"
REPORT_FILE="$REPORT_DIR/cleanup-report-$TIMESTAMP.md"
LOG_FILE="$REPORT_DIR/cleanup-log-$TIMESTAMP.txt"

# Counters
TOTAL_FILES=0
KEPT_FILES=0
ARCHIVED_FILES=0
DELETED_FILES=0
ERRORS=0

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Create necessary directories
mkdir -p "$ARCHIVE_DIR"/{workflow,sessions,evidence,reports,documentation,misc}
mkdir -p "$TRASH_DIR"
mkdir -p "$REPORT_DIR"

# Initialize log
echo "MD File Cleanup Started: $(date)" > "$LOG_FILE"
echo "Base Directory: $BASE_DIR" >> "$LOG_FILE"
echo "========================================" >> "$LOG_FILE"

# Function to print colored output
print_status() {
    local color=$1
    local message=$2
    echo -e "${color}${message}${NC}"
    echo "$message" >> "$LOG_FILE"
}

# Function to check if file is critical
is_critical_file() {
    local file=$1
    if [[ "$file" =~ (CLAUDE\.md|README\.md|LICENSE|CONTRIBUTING|SECURITY|CODE_OF_CONDUCT) ]]; then
        return 0
    fi
    if [[ "$file" =~ CORE-SPECIFICATIONS ]]; then
        return 0
    fi
    return 1
}

# Function to check if file is active WS feature
is_active_ws_feature() {
    local file=$1
    if [[ "$file" =~ WS-[0-9]+ ]]; then
        # Check age (30 days = 2592000 seconds)
        local age=$(($(date +%s) - $(stat -f %m "$file" 2>/dev/null || echo 0)))
        if [ $age -lt 2592000 ]; then
            return 0  # Active (< 30 days)
        fi
    fi
    return 1
}

# Function to determine file category
get_file_category() {
    local file=$1
    
    if [[ "$file" =~ SESSION-LOGS ]]; then
        echo "sessions"
    elif [[ "$file" =~ EVIDENCE ]]; then
        echo "evidence"
    elif [[ "$file" =~ (WORKFLOW|INBOX|OUTBOX|WS-[0-9]+) ]]; then
        echo "workflow"
    elif [[ "$file" =~ (REPORT|AUDIT) ]]; then
        echo "reports"
    elif [[ "$file" =~ (docs/|documentation/|README) ]]; then
        echo "documentation"
    else
        echo "misc"
    fi
}

# Function to check file age in days
get_file_age_days() {
    local file=$1
    local age_seconds=$(($(date +%s) - $(stat -f %m "$file" 2>/dev/null || echo 0)))
    echo $((age_seconds / 86400))
}

# Function to safely archive a file
archive_file() {
    local file=$1
    local category=$(get_file_category "$file")
    local dest="$ARCHIVE_DIR/$category/$(basename "$file")"
    
    # Handle duplicate names
    if [[ -f "$dest" ]]; then
        dest="$ARCHIVE_DIR/$category/$(date +%s)-$(basename "$file")"
    fi
    
    if mv "$file" "$dest" 2>/dev/null; then
        print_status "$BLUE" "📦 Archived: $(basename "$file") -> $category/"
        ((ARCHIVED_FILES++))
        return 0
    else
        print_status "$RED" "❌ Failed to archive: $file"
        ((ERRORS++))
        return 1
    fi
}

# Function to safely delete (move to trash)
delete_file() {
    local file=$1
    local dest="$TRASH_DIR/$(basename "$file")"
    
    # Handle duplicate names
    if [[ -f "$dest" ]]; then
        dest="$TRASH_DIR/$(date +%s)-$(basename "$file")"
    fi
    
    if mv "$file" "$dest" 2>/dev/null; then
        print_status "$YELLOW" "🗑️  Deleted: $(basename "$file")"
        ((DELETED_FILES++))
        return 0
    else
        print_status "$RED" "❌ Failed to delete: $file"
        ((ERRORS++))
        return 1
    fi
}

# Main cleanup process
print_status "$GREEN" "🧹 Starting MD File Cleanup Process..."
print_status "$BLUE" "📊 Analyzing MD files in: $BASE_DIR"

# Find all MD files
mapfile -t md_files < <(find "$BASE_DIR" -type f -name "*.md" 2>/dev/null)
TOTAL_FILES=${#md_files[@]}

print_status "$BLUE" "Found $TOTAL_FILES MD files to process"
echo ""

# Process each file
for file in "${md_files[@]}"; do
    # Skip if file doesn't exist (may have been moved already)
    [[ ! -f "$file" ]] && continue
    
    # Get file info
    file_size=$(stat -f %z "$file" 2>/dev/null || echo 0)
    file_age_days=$(get_file_age_days "$file")
    file_name=$(basename "$file")
    
    # Decision logic
    if is_critical_file "$file"; then
        print_status "$GREEN" "✅ Keeping critical: $file_name"
        ((KEPT_FILES++))
        
    elif is_active_ws_feature "$file"; then
        print_status "$GREEN" "✅ Keeping active: $file_name (WS feature < 30 days)"
        ((KEPT_FILES++))
        
    elif [[ $file_size -lt 100 ]]; then
        # Empty or near-empty file
        delete_file "$file"
        
    elif [[ "$file" =~ (temp|draft|test|old|backup|copy) ]]; then
        # Temporary files
        delete_file "$file"
        
    elif [[ "$file" =~ SESSION-LOGS && $file_age_days -gt 7 ]]; then
        # Old session logs
        if [[ $file_age_days -gt 30 ]]; then
            delete_file "$file"
        else
            archive_file "$file"
        fi
        
    elif [[ "$file" =~ (WORKFLOW|INBOX|OUTBOX) && $file_age_days -gt 30 ]]; then
        # Old workflow files
        archive_file "$file"
        
    elif [[ $file_age_days -gt 60 ]]; then
        # Very old files
        delete_file "$file"
        
    else
        # Default: keep for now
        print_status "$GREEN" "✅ Keeping: $file_name (no deletion criteria met)"
        ((KEPT_FILES++))
    fi
done

# Generate summary report
print_status "$BLUE" ""
print_status "$BLUE" "📊 Generating cleanup report..."

cat > "$REPORT_FILE" << EOF
# MD File Cleanup Report
**Date**: $(date)
**Operator**: Workflow and Audit Manager

## Summary Statistics

| Metric | Count | Percentage |
|--------|-------|------------|
| **Total Files Processed** | $TOTAL_FILES | 100% |
| **Files Kept** | $KEPT_FILES | $((KEPT_FILES * 100 / TOTAL_FILES))% |
| **Files Archived** | $ARCHIVED_FILES | $((ARCHIVED_FILES * 100 / TOTAL_FILES))% |
| **Files Deleted** | $DELETED_FILES | $((DELETED_FILES * 100 / TOTAL_FILES))% |
| **Errors** | $ERRORS | $((ERRORS * 100 / TOTAL_FILES))% |

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
└── misc/         (Other files)
\`\`\`

## Recovery Instructions

### To Restore Archived Files:
\`\`\`bash
cp -r "$ARCHIVE_DIR"/* "$BASE_DIR"/
\`\`\`

### To Restore Deleted Files:
\`\`\`bash
cp -r "$TRASH_DIR"/* "$BASE_DIR"/
\`\`\`

### To Permanently Delete Trash:
\`\`\`bash
rm -rf "$TRASH_DIR"
\`\`\`

## Next Steps

1. Review this report for accuracy
2. Check critical files are preserved
3. Test system functionality
4. Permanently delete trash after 7 days
5. Compress archives after 30 days

## Validation Checklist

- [ ] System still builds successfully
- [ ] CLAUDE.md is present and intact
- [ ] All README files preserved
- [ ] Core specifications intact
- [ ] Active WS features accessible
- [ ] No critical files in trash

---

*Report generated by MD File Cleanup Script v1.0*
EOF

# Print final summary
echo ""
print_status "$GREEN" "✅ CLEANUP COMPLETE!"
echo ""
print_status "$BLUE" "📊 Final Statistics:"
print_status "$GREEN" "   Kept: $KEPT_FILES files"
print_status "$YELLOW" "   Archived: $ARCHIVED_FILES files"
print_status "$RED" "   Deleted: $DELETED_FILES files"
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
print_status "$GREEN" "   To restore files: cp -r \"$TRASH_DIR\"/* \"$BASE_DIR\"/"

# Create a safety backup list
find "$BASE_DIR" -type f -name "*.md" > "$REPORT_DIR/remaining-md-files-$TIMESTAMP.txt"
print_status "$GREEN" "📝 List of remaining MD files saved to: $REPORT_DIR/remaining-md-files-$TIMESTAMP.txt"

exit 0