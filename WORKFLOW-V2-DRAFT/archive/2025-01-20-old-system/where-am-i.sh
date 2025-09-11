#!/bin/bash
# where-am-i.sh - Shows exactly where you are in the workflow

WORKFLOW_DIR="/Users/skyphotography/CODE/WedSync-2.0/WedSync2/WORKFLOW-V2-DRAFT"
STATUS_DIR="$WORKFLOW_DIR/00-STATUS"

echo "=============================================="
echo "        WORKFLOW V2 - WHERE AM I?"
echo "=============================================="
echo ""

# Show current step
if [ -f "$STATUS_DIR/current-step.txt" ]; then
    echo "📍 CURRENT STEP:"
    echo "   $(cat $STATUS_DIR/current-step.txt)"
else
    echo "⚠️  Status files not found - workflow may be corrupted"
fi

echo ""
echo "🎯 NEXT ACTION:"
if [ -f "$STATUS_DIR/next-action.txt" ]; then
    head -n 1 "$STATUS_DIR/next-action.txt"
else
    echo "   Status file missing"
fi

echo ""
echo "=============================================="
echo "        DETAILED STATUS"
echo "=============================================="

# Check each workflow step
echo ""
echo "STEP 1: Project Orchestrator"
if [ -f "$WORKFLOW_DIR/01-PROJECT-ORCHESTRATOR/output/2025-08-20-feature-assignments.md" ]; then
    echo "   ✅ COMPLETE - Feature assignments created"
else
    echo "   ❌ INCOMPLETE - Missing feature assignments"
fi

echo ""
echo "STEP 2: Feature Development" 
if [ -d "$WORKFLOW_DIR/02-FEATURE-DEVELOPMENT/output/2025-08-20" ]; then
    spec_count=$(ls -1 "$WORKFLOW_DIR/02-FEATURE-DEVELOPMENT/output/2025-08-20"/*.md 2>/dev/null | wc -l)
    echo "   ✅ COMPLETE - $spec_count technical specs created"
else
    echo "   ❌ INCOMPLETE - Missing technical specs"
fi

echo ""
echo "STEP 3: Dev Manager"
if [ -f "$WORKFLOW_DIR/03-DEV-MANAGER/output/2025-08-20-coordination.md" ]; then
    prompt_count=$(ls -1 "$WORKFLOW_DIR/session-prompts/active"/team-*.md 2>/dev/null | wc -l)
    echo "   ✅ COMPLETE - Coordination + $prompt_count team prompts"
else
    echo "   ❌ INCOMPLETE - Missing coordination"
fi

echo ""
echo "STEP 4: Teams Round 1"
reports_dir="$WORKFLOW_DIR/SESSION-LOGS/today"
if [ -d "$reports_dir" ]; then
    round1_reports=$(ls -1 "$reports_dir"/team-*-round-1-*.md 2>/dev/null | wc -l)
    echo "   📊 PROGRESS - $round1_reports/15 Round 1 reports complete"
    
    for team in a b c d e; do
        team_reports=$(ls -1 "$reports_dir"/team-$team-round-1-*.md 2>/dev/null | wc -l)
        if [ $team_reports -eq 3 ]; then
            echo "      ✅ Team $(echo $team | tr '[:lower:]' '[:upper:]'): COMPLETE (3/3 reports)"
        else
            echo "      ❌ Team $(echo $team | tr '[:lower:]' '[:upper:]'): INCOMPLETE ($team_reports/3 reports)"
        fi
    done
else
    echo "   ❌ INCOMPLETE - Reports directory missing"
fi

echo ""
echo "STEP 5: Senior Dev Review"
if [ -f "$WORKFLOW_DIR/SESSION-LOGS/today/senior-dev-review-round1.md" ]; then
    echo "   ✅ COMPLETE - Round 1 review done"
else
    echo "   ⏸️  WAITING - Needs all teams to complete Round 1"
fi

echo ""
echo "STEP 6: Git Operations"
if [ -f "$WORKFLOW_DIR/SESSION-LOGS/today/git-operations-round1.md" ]; then
    echo "   ✅ COMPLETE - Round 1 committed"
else
    echo "   ⏸️  WAITING - Needs Senior Dev approval"
fi

echo ""
echo "=============================================="
echo "        QUICK ACTIONS"
echo "=============================================="
echo ""
echo "🔍 Check detailed progress:"
echo "   ./show-progress.sh"
echo ""
echo "📋 Verify team reports:"
echo "   ./verify-team-reports.sh" 
echo ""
echo "🔧 Fix team paths:"
echo "   ./fix-team-paths.sh"
echo ""
echo "📖 View full dashboard:"
echo "   cat WORKFLOW-STATUS-DASHBOARD.md"
echo ""
echo "=============================================="