#!/bin/bash
# cleanup-inbox.sh - Cleans up an agent's inbox after processing
# Usage: ./cleanup-inbox.sh [agent-name]

WORKFLOW_DIR="/Users/skyphotography/CODE/WedSync-2.0/WedSync2/WORKFLOW-V2-DRAFT"
AGENT=$1
DATE=$(date +%Y-%m-%d)

if [ -z "$AGENT" ]; then
    echo "❌ Error: Please specify an agent name"
    echo "Usage: ./cleanup-inbox.sh [agent-name]"
    echo "Valid agents: project-orchestrator, feature-designer, dev-manager, team-a, team-b, team-c, team-d, team-e, senior-developer, git-operations"
    exit 1
fi

cd "$WORKFLOW_DIR"

# Create archive directory if it doesn't exist
mkdir -p "INBOX/${AGENT}/archive/${DATE}"

# Move processed files to archive
if ls INBOX/${AGENT}/WS-*.md 1> /dev/null 2>&1; then
    echo "🧹 Cleaning inbox for ${AGENT}..."
    mv INBOX/${AGENT}/WS-*.md "INBOX/${AGENT}/archive/${DATE}/" 2>/dev/null
    
    # Log the cleanup
    echo "${DATE} $(date +%H:%M) | CLEANUP | ${AGENT} | inbox cleaned | files→archive/${DATE}" >> 00-STATUS/feature-tracker.log
    
    echo "✅ Inbox cleaned - files moved to archive/${DATE}"
else
    echo "📭 Inbox already clean for ${AGENT}"
fi