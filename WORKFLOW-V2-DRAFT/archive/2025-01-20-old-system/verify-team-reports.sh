#!/bin/bash
# verify-team-reports.sh - Check if all team reports are in the correct location

REPORTS_DIR="/Users/skyphotography/CODE/WedSync-2.0/WedSync2/WORKFLOW-V2-DRAFT/SESSION-LOGS/today"

echo "================================================"
echo "   TEAM REPORTS VERIFICATION - WORKFLOW V2"
echo "================================================"
echo ""
echo "Checking: $REPORTS_DIR"
echo ""

# Create directory if it doesn't exist
if [ ! -d "$REPORTS_DIR" ]; then
    echo "⚠️  Directory doesn't exist! Creating it..."
    mkdir -p "$REPORTS_DIR"
    echo "✅ Directory created"
    echo ""
fi

# Check each round
for round in 1 2 3; do
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "ROUND $round STATUS:"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    
    total_expected=15  # 5 teams × 3 reports
    found=0
    missing_files=""
    
    for team in a b c d e; do
        echo ""
        echo "Team $(echo $team | tr '[:lower:]' '[:upper:]'):"
        team_complete=true
        
        for type in overview to-dev-manager senior-dev-prompt; do
            file="$REPORTS_DIR/team-$team-round-$round-$type.md"
            if [ -f "$file" ]; then
                echo "  ✅ team-$team-round-$round-$type.md"
                found=$((found + 1))
            else
                echo "  ❌ team-$team-round-$round-$type.md (MISSING)"
                missing_files="${missing_files}\n    - team-$team-round-$round-$type.md"
                team_complete=false
            fi
        done
        
        if [ "$team_complete" = true ]; then
            echo "  ✅ Team $(echo $team | tr '[:lower:]' '[:upper:]') Round $round: COMPLETE"
        else
            echo "  ⚠️  Team $(echo $team | tr '[:lower:]' '[:upper:]') Round $round: INCOMPLETE"
        fi
    done
    
    echo ""
    echo "────────────────────────────────────────────────"
    missing=$((total_expected - found))
    
    if [ $missing -eq 0 ]; then
        echo "🎉 Round $round: ALL REPORTS PRESENT ($found/$total_expected)"
        echo "✅ Ready for Senior Dev review!"
    else
        echo "⚠️  Round $round: $missing/$total_expected reports MISSING"
        echo "❌ Cannot proceed to Senior Dev review"
        if [ -n "$missing_files" ]; then
            echo ""
            echo "Missing files:$missing_files"
        fi
    fi
    echo ""
done

echo "================================================"
echo "                 SUMMARY"
echo "================================================"
echo ""

# Count total files
total_files=$(ls -1 "$REPORTS_DIR"/team-*-round-*-*.md 2>/dev/null | wc -l)

if [ $total_files -eq 45 ]; then
    echo "✅ ALL 45 reports present (15 per round × 3 rounds)"
    echo "✅ Workflow can proceed normally"
else
    echo "⚠️  Only $total_files/45 reports found"
    echo ""
    echo "NEXT STEPS:"
    echo "1. Fix team prompts with correct absolute paths"
    echo "2. Re-run missing teams with corrected prompts"
    echo "3. Verify all reports are saved to:"
    echo "   $REPORTS_DIR"
    echo "4. Run this script again to confirm"
fi

echo ""
echo "================================================"