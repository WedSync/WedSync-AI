#!/bin/bash

# ROUTE-MESSAGES.SH - Message Routing Between Workflow Roles
# This script moves files from OUTBOX folders to appropriate INBOX folders

echo "========================================="
echo "MESSAGE ROUTING SYSTEM"
echo "Date: $(date)"
echo "========================================="

# Create all necessary directories
mkdir -p /WORKFLOW-V2-DRAFT/INBOX/{project-orchestrator,feature-designer,dev-manager,sql-expert,senior-dev}
mkdir -p /WORKFLOW-V2-DRAFT/OUTBOX/{project-orchestrator,feature-designer,dev-manager,teams,senior-dev}
mkdir -p /WORKFLOW-V2-DRAFT/.team-states/archive
mkdir -p /WORKFLOW-V2-DRAFT/00-STATUS

# Route 1: Project Orchestrator → Feature Designer
if ls /WORKFLOW-V2-DRAFT/OUTBOX/project-orchestrator/WS-*.md 1> /dev/null 2>&1; then
    echo "Routing: Project Orchestrator → Feature Designer"
    mv /WORKFLOW-V2-DRAFT/OUTBOX/project-orchestrator/WS-*.md /WORKFLOW-V2-DRAFT/INBOX/feature-designer/ 2>/dev/null
    echo "  ✓ Moved feature assignments to Feature Designer inbox"
fi

# Route 2: Feature Designer → Dev Manager
if ls /WORKFLOW-V2-DRAFT/OUTBOX/feature-designer/WS-*-technical.md 1> /dev/null 2>&1; then
    echo "Routing: Feature Designer → Dev Manager"
    mv /WORKFLOW-V2-DRAFT/OUTBOX/feature-designer/WS-*-technical.md /WORKFLOW-V2-DRAFT/INBOX/dev-manager/ 2>/dev/null
    echo "  ✓ Moved technical specs to Dev Manager inbox"
fi

# Route 3: Teams → Senior Dev (completion reports)
for team in a b c d e f g; do
    if ls /WORKFLOW-V2-DRAFT/OUTBOX/team-${team}/batch*/WS-*-round-*-complete.md 1> /dev/null 2>&1; then
        echo "Routing: Team ${team^^} → Senior Dev"
        mv /WORKFLOW-V2-DRAFT/OUTBOX/team-${team}/batch*/WS-*-round-*-complete.md /WORKFLOW-V2-DRAFT/INBOX/senior-dev/ 2>/dev/null
        echo "  ✓ Moved Team ${team^^} completion reports to Senior Dev"
    fi
done

# Route 4: Teams → SQL Expert (migration requests)
for team in a b c d e f g; do
    if ls /WORKFLOW-V2-DRAFT/OUTBOX/team-${team}/migration-request-WS-*.md 1> /dev/null 2>&1; then
        echo "Routing: Team ${team^^} → SQL Expert"
        mv /WORKFLOW-V2-DRAFT/OUTBOX/team-${team}/migration-request-WS-*.md /WORKFLOW-V2-DRAFT/INBOX/sql-expert/ 2>/dev/null
        echo "  ✓ Moved Team ${team^^} migration requests to SQL Expert"
    fi
done

# Route 5: Senior Dev → Dev Manager (feedback for next rounds)
if ls /WORKFLOW-V2-DRAFT/OUTBOX/senior-dev/*-review.md 1> /dev/null 2>&1; then
    echo "Routing: Senior Dev → Dev Manager"
    cp /WORKFLOW-V2-DRAFT/OUTBOX/senior-dev/*-review.md /WORKFLOW-V2-DRAFT/INBOX/dev-manager/ 2>/dev/null
    echo "  ✓ Copied Senior Dev reviews to Dev Manager (kept originals for reference)"
fi

# Update feature status tracker
echo "Updating feature status tracker..."
for feature in $(ls /WORKFLOW-V2-DRAFT/OUTBOX/team-*/batch*/WS-*-round-*-complete.md 2>/dev/null | grep -oE 'WS-[0-9]{3}' | sort -u); do
    ROUND=$(ls /WORKFLOW-V2-DRAFT/OUTBOX/team-*/batch*/${feature}-round-*-complete.md 2>/dev/null | grep -oE 'round-[0-9]' | tail -1)
    echo "$(date '+%Y-%m-%d %H:%M') | $feature | ${ROUND^^}_COMPLETE | teams | route-messages.sh" >> /WORKFLOW-V2-DRAFT/00-STATUS/feature-tracker.log
done

echo "========================================="
echo "Routing complete!"
echo "========================================="