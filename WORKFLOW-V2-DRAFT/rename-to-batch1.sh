#!/bin/bash
# rename-to-batch1.sh - Renames existing prompts to include batch1 in the filename
# This prevents confusion when creating batch2 prompts

WORKFLOW_DIR="/Users/skyphotography/CODE/WedSync-2.0/WedSync2/WORKFLOW-V2-DRAFT"
cd "$WORKFLOW_DIR"

echo "🔄 Renaming existing prompts to include batch1..."
echo ""

# Process each team's OUTBOX
for team in a b c d e; do
    echo "📁 Processing Team ${team}..."
    
    # Check if team OUTBOX exists
    if [ -d "OUTBOX/team-${team}" ]; then
        cd "OUTBOX/team-${team}"
        
        # Rename round files to include batch1
        for file in WS-*-round-*.md; do
            if [ -f "$file" ]; then
                # Extract components from filename
                # Example: WS-001-round-1.md -> WS-001-batch1-round-1.md
                if [[ $file =~ ^(WS-[0-9]{3})-round-([0-9])(.*)\.md$ ]]; then
                    ws_num="${BASH_REMATCH[1]}"
                    round_num="${BASH_REMATCH[2]}"
                    suffix="${BASH_REMATCH[3]}"
                    
                    # Skip if already has batch number
                    if [[ ! $file =~ batch ]]; then
                        new_name="${ws_num}-batch1-round-${round_num}${suffix}.md"
                        
                        echo "  ✏️  Renaming: $file → $new_name"
                        mv "$file" "$new_name"
                    else
                        echo "  ✓ Already has batch: $file"
                    fi
                fi
            fi
        done
        
        # Also rename completion reports
        for file in WS-*-complete.md; do
            if [ -f "$file" ]; then
                # Example: WS-001-round-1-complete.md -> WS-001-batch1-round-1-complete.md
                if [[ $file =~ ^(WS-[0-9]{3})-round-([0-9])-complete\.md$ ]]; then
                    ws_num="${BASH_REMATCH[1]}"
                    round_num="${BASH_REMATCH[2]}"
                    
                    # Skip if already has batch number
                    if [[ ! $file =~ batch ]]; then
                        new_name="${ws_num}-batch1-round-${round_num}-complete.md"
                        
                        echo "  ✏️  Renaming: $file → $new_name"
                        mv "$file" "$new_name"
                    fi
                fi
            fi
        done
        
        cd "$WORKFLOW_DIR"
    fi
    echo ""
done

# Also update Senior Dev's INBOX if needed
echo "📁 Processing Senior Dev INBOX..."
if [ -d "INBOX/senior-developer" ]; then
    cd "INBOX/senior-developer"
    
    for file in WS-*-round-*-complete.md; do
        if [ -f "$file" ]; then
            if [[ $file =~ ^(WS-[0-9]{3})-round-([0-9])-complete\.md$ ]]; then
                ws_num="${BASH_REMATCH[1]}"
                round_num="${BASH_REMATCH[2]}"
                
                if [[ ! $file =~ batch ]]; then
                    new_name="${ws_num}-batch1-round-${round_num}-complete.md"
                    
                    echo "  ✏️  Renaming: $file → $new_name"
                    mv "$file" "$new_name"
                fi
            fi
        fi
    done
    
    cd "$WORKFLOW_DIR"
fi

echo ""
echo "✅ Renaming complete!"
echo ""
echo "📊 Summary:"
echo "  - All existing prompts now include 'batch1' in the filename"
echo "  - Dev Manager can now safely create 'batch2' prompts"
echo "  - No confusion between different batches!"
echo ""
echo "Next steps:"
echo "  1. Teams continue working on batch1 files"
echo "  2. Run Dev Manager to create batch2 prompts"
echo "  3. Teams will see clear distinction: batch1 vs batch2"