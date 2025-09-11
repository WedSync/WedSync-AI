#!/bin/bash
# Initialize a TEST-WORKFLOW session for parallel execution
# Each Claude session runs this to set up their workspace

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Check if session ID provided
if [ -z "$1" ]; then
    echo -e "${RED}Error: Session ID required${NC}"
    echo "Usage: $0 <session-id> [priority]"
    echo "Example: $0 session-1 BLOCKER"
    echo ""
    echo "Session IDs: session-1, session-2, session-3, session-4, session-5"
    echo "Priorities: BLOCKER, CRITICAL, MAJOR, MINOR, INFO"
    exit 1
fi

SESSION_ID=$1
PRIORITY=${2:-AUTO}

# Configuration
BASE_DIR="/Volumes/Extreme Pro/CODE/WedSync 2.0/WedSync Dev/TEST-WORKFLOW"
QUEUES_DIR="$BASE_DIR/QUEUES"
WORKSPACE_DIR="$QUEUES_DIR/PROCESSING/$SESSION_ID-working"
METRICS_DIR="$BASE_DIR/METRICS"
SESSION_LOG="$METRICS_DIR/$SESSION_ID.log"

echo -e "${BLUE}═══════════════════════════════════════════${NC}"
echo -e "${BLUE}    TEST-WORKFLOW SESSION INITIALIZATION     ${NC}"
echo -e "${BLUE}═══════════════════════════════════════════${NC}"
echo ""
echo -e "Session ID: ${GREEN}$SESSION_ID${NC}"
echo -e "Timestamp: $(date +%Y-%m-%d' '%H:%M:%S)"
echo ""

# Create necessary directories
echo "📁 Setting up workspace..."
mkdir -p "$WORKSPACE_DIR"
mkdir -p "$METRICS_DIR"
mkdir -p "$BASE_DIR/LOCKS"
mkdir -p "$BASE_DIR/BASELINE"
mkdir -p "$BASE_DIR/VERIFICATION-RESULTS"

# Auto-assign priority based on session number if not specified
if [ "$PRIORITY" = "AUTO" ]; then
    case "$SESSION_ID" in
        session-1) PRIORITY="BLOCKER" ;;
        session-2) PRIORITY="CRITICAL" ;;
        session-3) PRIORITY="MAJOR" ;;
        session-4) PRIORITY="MINOR" ;;
        session-5) PRIORITY="INFO" ;;
        *) PRIORITY="MIXED" ;;
    esac
fi

# Create session configuration
cat > "$WORKSPACE_DIR/session-config.json" << EOF
{
  "session_id": "$SESSION_ID",
  "priority": "$PRIORITY",
  "initialized_at": "$(date -Iseconds)",
  "workspace": "$WORKSPACE_DIR",
  "status": "active",
  "completed_count": 0,
  "current_file": null,
  "verification_enabled": true
}
EOF

# Initialize session log
cat > "$SESSION_LOG" << EOF
TEST-WORKFLOW Session Log
========================
Session ID: $SESSION_ID
Priority Queue: $PRIORITY
Initialized: $(date)

Activity Log:
------------
EOF

# Create session-specific scripts
echo "🔧 Creating session scripts..."

# Create claim script for this session
cat > "$WORKSPACE_DIR/claim-next.sh" << 'EOF'
#!/bin/bash
# Claim next file from queue for this session

SESSION_ID=$(cat session-config.json | grep session_id | cut -d'"' -f4)
PRIORITY=$(cat session-config.json | grep priority | cut -d'"' -f4)
BASE_DIR="/Volumes/Extreme Pro/CODE/WedSync 2.0/WedSync Dev/TEST-WORKFLOW"

echo "🔍 Looking for next $PRIORITY issue..."

# Find next unclaimed file
for FILE in "$BASE_DIR/QUEUES/BY-SEVERITY/$PRIORITY"/*.json; do
    if [ -f "$FILE" ]; then
        FILE_NAME=$(basename "$FILE")
        if "$BASE_DIR/VERIFICATION-SCRIPTS/file-lock.sh" claim "$FILE" "$SESSION_ID"; then
            cp "$FILE" .
            echo "✅ Claimed: $FILE_NAME"
            echo "$(date): Claimed $FILE_NAME" >> "$BASE_DIR/METRICS/$SESSION_ID.log"
            exit 0
        fi
    fi
done

echo "⏸️ No unclaimed $PRIORITY issues available"
EOF
chmod +x "$WORKSPACE_DIR/claim-next.sh"

# Create verify script for this session
cat > "$WORKSPACE_DIR/verify-changes.sh" << 'EOF'
#!/bin/bash
# Verify changes before committing

SESSION_ID=$(cat session-config.json | grep session_id | cut -d'"' -f4)
BASE_DIR="/Volumes/Extreme Pro/CODE/WedSync 2.0/WedSync Dev/TEST-WORKFLOW"

echo "🔍 Verifying changes for $SESSION_ID..."
"$BASE_DIR/VERIFICATION-SCRIPTS/verify-fix.sh"
EOF
chmod +x "$WORKSPACE_DIR/verify-changes.sh"

# Create release script for this session
cat > "$WORKSPACE_DIR/release-all.sh" << 'EOF'
#!/bin/bash
# Release all locks for this session

SESSION_ID=$(cat session-config.json | grep session_id | cut -d'"' -f4)
BASE_DIR="/Volumes/Extreme Pro/CODE/WedSync 2.0/WedSync Dev/TEST-WORKFLOW"

echo "🔓 Releasing all locks for $SESSION_ID..."
"$BASE_DIR/VERIFICATION-SCRIPTS/file-lock.sh" release-all "$SESSION_ID"
EOF
chmod +x "$WORKSPACE_DIR/release-all.sh"

# Display session information
echo ""
echo -e "${GREEN}✅ Session Initialized Successfully!${NC}"
echo ""
echo "📋 Session Details:"
echo "   • ID: $SESSION_ID"
echo "   • Priority Queue: $PRIORITY"
echo "   • Workspace: $WORKSPACE_DIR"
echo "   • Metrics Log: $SESSION_LOG"
echo ""
echo "🛠️ Available Commands:"
echo "   • cd $WORKSPACE_DIR"
echo "   • ./claim-next.sh         - Claim next issue to fix"
echo "   • ./verify-changes.sh     - Verify your fixes"
echo "   • ./release-all.sh        - Release all your locks"
echo ""
echo "📊 Queue Status:"

# Count available issues
if [ -d "$QUEUES_DIR/BY-SEVERITY/$PRIORITY" ]; then
    COUNT=$(ls "$QUEUES_DIR/BY-SEVERITY/$PRIORITY" 2>/dev/null | wc -l)
    echo "   • $PRIORITY issues available: $COUNT"
else
    echo "   • Queue directory not yet created"
fi

echo ""
echo "🚀 Ready to start processing!"
echo ""
echo "Next steps:"
echo "1. cd $WORKSPACE_DIR"
echo "2. ./claim-next.sh"
echo "3. Fix the issue"
echo "4. ./verify-changes.sh"
echo "5. Commit if verification passes"
echo ""
echo -e "${YELLOW}Remember: ALWAYS verify before committing!${NC}"
echo ""

# Create session prompt for Claude
cat > "$WORKSPACE_DIR/CLAUDE-PROMPT.md" << EOF
# TEST-WORKFLOW Session: $SESSION_ID

You are operating as **$SESSION_ID** in the parallel TEST-WORKFLOW system.

## Your Assignment
- **Priority Queue**: $PRIORITY issues
- **Workspace**: $WORKSPACE_DIR
- **Verification**: MANDATORY before any commit

## Workflow
1. Run \`./claim-next.sh\` to get next issue
2. Read the issue details carefully
3. Apply MINIMAL fix necessary
4. Run \`./verify-changes.sh\` to ensure no regressions
5. If verification passes, commit with clear message
6. If verification fails, rollback and try different approach
7. Run \`./release-all.sh\` when stopping work

## Critical Rules
- NEVER edit files without claiming them first
- ALWAYS verify changes before committing
- ROLLBACK if verification fails
- Document every change clearly
- Work ONLY on $PRIORITY issues

## Parallel Safety
You are working alongside other sessions. File locking prevents conflicts.
If a file is locked, move to the next issue rather than waiting.

Remember: Quality over quantity. One properly fixed and verified issue is worth more than ten broken fixes.
EOF

echo "📝 Session prompt saved to: $WORKSPACE_DIR/CLAUDE-PROMPT.md"
echo ""
echo -e "${BLUE}═══════════════════════════════════════════${NC}"