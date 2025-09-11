#!/usr/bin/env python3
"""
Final cleanup for remaining Context7 references
"""

import os
import re

# List of files that still have Context7 references
remaining_files = [
    "/Users/skyphotography/CODE/WedSync-2.0/WedSync2/WORKFLOW-V2-DRAFT/OUTBOX/team-a/batch19/WS-165-team-a-round-1.md",
    "/Users/skyphotography/CODE/WedSync-2.0/WedSync2/WORKFLOW-V2-DRAFT/OUTBOX/team-a/batch22/WS-173-team-a-round-1.md",
    "/Users/skyphotography/CODE/WedSync-2.0/WedSync2/WORKFLOW-V2-DRAFT/OUTBOX/team-a/batch22/WS-174-team-a-round-1.md",
    "/Users/skyphotography/CODE/WedSync-2.0/WedSync2/WORKFLOW-V2-DRAFT/OUTBOX/team-a/batch25/WS-186-team-a-round-1.md",
    "/Users/skyphotography/CODE/WedSync-2.0/WedSync2/WORKFLOW-V2-DRAFT/OUTBOX/team-a/batch26/WS-188-team-a-round-1.md",
    "/Users/skyphotography/CODE/WedSync-2.0/WedSync2/WORKFLOW-V2-DRAFT/OUTBOX/team-a/batch27/WS-191-team-a-round-1.md",
    "/Users/skyphotography/CODE/WedSync-2.0/WedSync2/WORKFLOW-V2-DRAFT/OUTBOX/team-a/batch27/WS-192-team-a-round-1.md",
    "/Users/skyphotography/CODE/WedSync-2.0/WedSync2/WORKFLOW-V2-DRAFT/OUTBOX/team-a/batch28/WS-194-team-a-round-1.md",
    "/Users/skyphotography/CODE/WedSync-2.0/WedSync2/WORKFLOW-V2-DRAFT/OUTBOX/team-b/batch19/WS-165-team-b-round-1.md",
    "/Users/skyphotography/CODE/WedSync-2.0/WedSync2/WORKFLOW-V2-DRAFT/OUTBOX/team-b/batch22/WS-173-team-b-round-1.md",
    "/Users/skyphotography/CODE/WedSync-2.0/WedSync2/WORKFLOW-V2-DRAFT/OUTBOX/team-b/batch27/WS-191-team-b-round-1.md",
    "/Users/skyphotography/CODE/WedSync-2.0/WedSync2/WORKFLOW-V2-DRAFT/OUTBOX/team-b/batch28/WS-195-team-b-round-1.md",
    "/Users/skyphotography/CODE/WedSync-2.0/WedSync2/WORKFLOW-V2-DRAFT/OUTBOX/team-c/batch19/WS-165-team-c-round-1.md",
    "/Users/skyphotography/CODE/WedSync-2.0/WedSync2/WORKFLOW-V2-DRAFT/OUTBOX/team-c/batch22/WS-173-team-c-round-1.md",
    "/Users/skyphotography/CODE/WedSync-2.0/WedSync2/WORKFLOW-V2-DRAFT/OUTBOX/team-c/batch27/WS-191-team-c-round-1.md",
    "/Users/skyphotography/CODE/WedSync-2.0/WedSync2/WORKFLOW-V2-DRAFT/OUTBOX/team-c/batch28/WS-196-team-c-round-1.md",
    "/Users/skyphotography/CODE/WedSync-2.0/WedSync2/WORKFLOW-V2-DRAFT/OUTBOX/team-c/batch30/WS-202-team-c-round-1.md",
    "/Users/skyphotography/CODE/WedSync-2.0/WedSync2/WORKFLOW-V2-DRAFT/OUTBOX/team-d/batch19/WS-165-team-d-round-1.md",
    "/Users/skyphotography/CODE/WedSync-2.0/WedSync2/WORKFLOW-V2-DRAFT/OUTBOX/team-d/batch22/WS-173-team-d-round-1.md",
    "/Users/skyphotography/CODE/WedSync-2.0/WedSync2/WORKFLOW-V2-DRAFT/OUTBOX/team-d/batch27/WS-191-team-d-round-1.md",
    "/Users/skyphotography/CODE/WedSync-2.0/WedSync2/WORKFLOW-V2-DRAFT/OUTBOX/team-d/batch28/WS-194-team-d-round-1.md",
    "/Users/skyphotography/CODE/WedSync-2.0/WedSync2/WORKFLOW-V2-DRAFT/OUTBOX/team-e/batch22/WS-173-team-e-round-1.md",
    "/Users/skyphotography/CODE/WedSync-2.0/WedSync2/WORKFLOW-V2-DRAFT/OUTBOX/team-e/batch27/WS-191-team-e-round-1.md",
    "/Users/skyphotography/CODE/WedSync-2.0/WedSync2/WORKFLOW-V2-DRAFT/OUTBOX/team-e/batch28/WS-196-team-e-round-1.md"
]

def fix_file(filepath):
    """Fix all Context7 references in a file."""
    try:
        with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
            content = f.read()
        
        original = content
        
        # More aggressive replacements
        
        # Fix library ID resolution lines (may have been duplicated)
        content = re.sub(
            r'// Library ID resolution no longer needed with Ref MCP\n// Library ID resolution no longer needed with Ref MCP',
            '// Library ID resolution no longer needed with Ref MCP',
            content
        )
        
        # Remove any lingering duplicate Ref calls
        lines = content.split('\n')
        cleaned_lines = []
        prev_line = ""
        
        for line in lines:
            # Skip duplicate consecutive lines
            if line.strip() == prev_line.strip() and 'await mcp__Ref__' in line:
                continue
            cleaned_lines.append(line)
            prev_line = line
        
        content = '\n'.join(cleaned_lines)
        
        # Final Context7 cleanup - any remaining references
        content = re.sub(r'Context7', 'Ref MCP', content, flags=re.IGNORECASE)
        content = re.sub(r'context7', 'ref-mcp', content)
        content = re.sub(r'CONTEXT7', 'Ref MCP', content)
        
        # Clean up any malformed Ref calls
        content = content.replace('mcp__Ref__ref_ref_', 'mcp__Ref__ref_')
        
        if content != original:
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(content)
            return True
        return False
    except Exception as e:
        print(f"Error processing {filepath}: {e}")
        return False

print("=" * 60)
print("FINAL MCP REFERENCE CLEANUP")
print("=" * 60)
print()

fixed_count = 0
for filepath in remaining_files:
    filename = os.path.basename(filepath)
    print(f"Processing {filename}... ", end="")
    
    if fix_file(filepath):
        print("✓ Fixed")
        fixed_count += 1
    else:
        print("- No changes needed")

print()
print("=" * 60)
print(f"Cleanup complete! Fixed {fixed_count} files.")
print("=" * 60)