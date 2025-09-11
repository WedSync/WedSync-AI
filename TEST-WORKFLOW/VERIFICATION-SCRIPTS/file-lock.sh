#!/bin/bash
# File locking mechanism for parallel TEST-WORKFLOW sessions
# Prevents multiple sessions from editing the same file simultaneously

# Configuration
LOCK_DIR="/Volumes/Extreme Pro/CODE/WedSync 2.0/WedSync Dev/TEST-WORKFLOW/LOCKS"
LOCK_TIMEOUT=3600  # 1 hour timeout for stale locks

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Create lock directory if it doesn't exist
mkdir -p "$LOCK_DIR"

# Function to clean up stale locks
cleanup_stale_locks() {
    find "$LOCK_DIR" -type d -name "*.lock" -mmin +60 -exec rm -rf {} \; 2>/dev/null
}

# Function to claim a file
claim_file() {
    local FILE_PATH=$1
    local SESSION_ID=$2
    
    # Normalize file path (remove path, keep just filename)
    local FILE_NAME=$(basename "$FILE_PATH")
    local LOCK_PATH="$LOCK_DIR/${FILE_NAME}.lock"
    
    # Try to create lock directory atomically
    if mkdir "$LOCK_PATH" 2>/dev/null; then
        # Lock acquired successfully
        echo "$SESSION_ID" > "$LOCK_PATH/owner"
        echo "$(date +%Y%m%d-%H%M%S)" > "$LOCK_PATH/claimed_at"
        echo "$FILE_PATH" > "$LOCK_PATH/full_path"
        
        echo -e "${GREEN}✅ File claimed: $FILE_NAME${NC}"
        echo "   ↳ Session: $SESSION_ID"
        echo "   ↳ Lock: $LOCK_PATH"
        return 0
    else
        # Lock already exists
        if [ -f "$LOCK_PATH/owner" ]; then
            local OWNER=$(cat "$LOCK_PATH/owner")
            local CLAIMED_AT=$(cat "$LOCK_PATH/claimed_at" 2>/dev/null || echo "unknown")
            echo -e "${RED}❌ File already locked: $FILE_NAME${NC}"
            echo "   ↳ Owned by: $OWNER"
            echo "   ↳ Since: $CLAIMED_AT"
        else
            echo -e "${YELLOW}⚠️ Lock exists but corrupted: $FILE_NAME${NC}"
        fi
        return 1
    fi
}

# Function to release a file
release_file() {
    local FILE_PATH=$1
    local SESSION_ID=$2
    
    local FILE_NAME=$(basename "$FILE_PATH")
    local LOCK_PATH="$LOCK_DIR/${FILE_NAME}.lock"
    
    # Check if lock exists
    if [ ! -d "$LOCK_PATH" ]; then
        echo -e "${YELLOW}⚠️ No lock found for: $FILE_NAME${NC}"
        return 1
    fi
    
    # Check ownership
    if [ -f "$LOCK_PATH/owner" ]; then
        local OWNER=$(cat "$LOCK_PATH/owner")
        if [ "$OWNER" != "$SESSION_ID" ]; then
            echo -e "${RED}❌ Cannot release: $FILE_NAME${NC}"
            echo "   ↳ Owned by: $OWNER"
            echo "   ↳ Your session: $SESSION_ID"
            return 1
        fi
    fi
    
    # Release the lock
    rm -rf "$LOCK_PATH"
    echo -e "${GREEN}✅ File released: $FILE_NAME${NC}"
    echo "   ↳ Session: $SESSION_ID"
    return 0
}

# Function to check if file is locked
check_lock() {
    local FILE_PATH=$1
    
    local FILE_NAME=$(basename "$FILE_PATH")
    local LOCK_PATH="$LOCK_DIR/${FILE_NAME}.lock"
    
    if [ -d "$LOCK_PATH" ]; then
        if [ -f "$LOCK_PATH/owner" ]; then
            local OWNER=$(cat "$LOCK_PATH/owner")
            local CLAIMED_AT=$(cat "$LOCK_PATH/claimed_at" 2>/dev/null || echo "unknown")
            echo "🔒 Locked by: $OWNER (since $CLAIMED_AT)"
        else
            echo "⚠️ Lock exists but corrupted"
        fi
        return 0
    else
        echo "🔓 File is available"
        return 1
    fi
}

# Function to list all locks
list_locks() {
    echo "📋 Current File Locks"
    echo "===================="
    
    if [ -z "$(ls -A $LOCK_DIR 2>/dev/null)" ]; then
        echo "No active locks"
        return
    fi
    
    for LOCK in "$LOCK_DIR"/*.lock; do
        if [ -d "$LOCK" ]; then
            local FILE_NAME=$(basename "$LOCK" .lock)
            local OWNER=$(cat "$LOCK/owner" 2>/dev/null || echo "unknown")
            local CLAIMED_AT=$(cat "$LOCK/claimed_at" 2>/dev/null || echo "unknown")
            local FULL_PATH=$(cat "$LOCK/full_path" 2>/dev/null || echo "unknown")
            
            echo ""
            echo "File: $FILE_NAME"
            echo "  Owner: $OWNER"
            echo "  Since: $CLAIMED_AT"
            echo "  Path: $FULL_PATH"
        fi
    done
}

# Function to release all locks for a session
release_all_session_locks() {
    local SESSION_ID=$1
    local COUNT=0
    
    echo "🔓 Releasing all locks for session: $SESSION_ID"
    
    for LOCK in "$LOCK_DIR"/*.lock; do
        if [ -d "$LOCK" ]; then
            if [ -f "$LOCK/owner" ]; then
                local OWNER=$(cat "$LOCK/owner")
                if [ "$OWNER" = "$SESSION_ID" ]; then
                    rm -rf "$LOCK"
                    COUNT=$((COUNT + 1))
                fi
            fi
        fi
    done
    
    echo "Released $COUNT locks"
}

# Main script logic
case "$1" in
    claim)
        if [ -z "$2" ] || [ -z "$3" ]; then
            echo "Usage: $0 claim <file_path> <session_id>"
            exit 1
        fi
        cleanup_stale_locks
        claim_file "$2" "$3"
        ;;
        
    release)
        if [ -z "$2" ] || [ -z "$3" ]; then
            echo "Usage: $0 release <file_path> <session_id>"
            exit 1
        fi
        release_file "$2" "$3"
        ;;
        
    check)
        if [ -z "$2" ]; then
            echo "Usage: $0 check <file_path>"
            exit 1
        fi
        check_lock "$2"
        ;;
        
    list)
        list_locks
        ;;
        
    release-all)
        if [ -z "$2" ]; then
            echo "Usage: $0 release-all <session_id>"
            exit 1
        fi
        release_all_session_locks "$2"
        ;;
        
    cleanup)
        echo "🧹 Cleaning up stale locks (older than 1 hour)..."
        cleanup_stale_locks
        echo "✅ Cleanup complete"
        ;;
        
    *)
        echo "TEST-WORKFLOW File Lock Manager"
        echo "==============================="
        echo ""
        echo "Usage:"
        echo "  $0 claim <file_path> <session_id>    - Claim a file for editing"
        echo "  $0 release <file_path> <session_id>  - Release a file lock"
        echo "  $0 check <file_path>                 - Check if file is locked"
        echo "  $0 list                              - List all active locks"
        echo "  $0 release-all <session_id>          - Release all locks for a session"
        echo "  $0 cleanup                           - Remove stale locks"
        echo ""
        echo "Example:"
        echo "  $0 claim src/app/api/route.ts session-1"
        echo "  $0 release src/app/api/route.ts session-1"
        exit 1
        ;;
esac