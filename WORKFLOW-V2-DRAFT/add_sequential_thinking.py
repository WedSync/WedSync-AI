#!/usr/bin/env python3

"""
Add Sequential Thinking MCP sections to all team prompt files in batches 17-30.
This adds structured problem-solving capabilities for complex feature development.
"""

import os
import glob
import re
from pathlib import Path

def add_sequential_thinking_section(content):
    """Add Sequential Thinking MCP section to team prompts."""
    
    # Sequential Thinking section to add
    sequential_thinking_section = '''
## 🧠 SEQUENTIAL THINKING MCP FOR COMPLEX FEATURE ANALYSIS

### When to Use Sequential Thinking

Before diving into coding, use Sequential Thinking MCP when facing:

- **Complex Feature Architecture**: Multi-component systems with intricate dependencies
- **Integration Challenges**: Features that span multiple systems and require coordination  
- **Business Logic Complexity**: Wedding-specific rules that need careful analysis
- **Technical Trade-offs**: Choosing between multiple implementation approaches
- **Debugging Complex Issues**: Root cause analysis for multi-system problems

### Sequential Thinking Patterns for Development Teams

#### Pattern 1: Feature Architecture Analysis
```typescript
// Before starting complex feature development
mcp__sequential-thinking__sequential_thinking({
  thought: "This task tracking feature needs to integrate with existing task creation (WS-156), helper assignment (WS-157), and real-time notifications. Need to analyze data flow and identify potential integration points.",
  nextThoughtNeeded: true,
  thoughtNumber: 1,
  totalThoughts: 4
});

mcp__sequential-thinking__sequential_thinking({
  thought: "Data flow analysis: User creates task -> assigns helpers -> helpers update status -> triggers notifications -> updates progress indicators. Each step requires API endpoints, validation, and error handling.",
  nextThoughtNeeded: true,
  thoughtNumber: 2,
  totalThoughts: 4
});
```

#### Pattern 2: Integration Strategy Planning  
```typescript
// When coordinating with other teams' work
mcp__sequential-thinking__sequential_thinking({
  thought: "Team A is building UI components, Team C is handling real-time updates, and Team E is implementing testing. Need to define clear API contracts and data structures that all teams can use.",
  nextThoughtNeeded: true,
  thoughtNumber: 1,
  totalThoughts: 3
});

mcp__sequential-thinking__sequential_thinking({
  thought: "API contract definition: /api/tasks/status endpoints need to support CRUD operations, validation schemas, and webhook events. Response format should match Team A's UI expectations.",
  nextThoughtNeeded: true,
  thoughtNumber: 2,
  totalThoughts: 3
});
```

#### Pattern 3: Business Logic Analysis
```typescript
// When implementing wedding-specific business rules
mcp__sequential-thinking__sequential_thinking({
  thought: "Wedding task tracking has unique requirements: tasks can be delegated to multiple helpers, status updates need photo evidence for critical tasks, and deadlines are tied to wedding date proximity.",
  nextThoughtNeeded: true,
  thoughtNumber: 1,
  totalThoughts: 4
});

mcp__sequential-thinking__sequential_thinking({
  thought: "Business rule implementation: Critical tasks (venue confirmation, catering numbers) require photo evidence. Non-critical tasks (decoration pickup) can be marked complete without evidence. Need validation logic for each task type.",
  nextThoughtNeeded: true,
  thoughtNumber: 2,
  totalThoughts: 4
});
```

### Using Sequential Thinking in Your Development Process

1. **Before Documentation Loading**: Use Sequential Thinking to understand the full scope and complexity
2. **During Planning Phase**: Structure your approach to handle all edge cases and integration points  
3. **When Stuck**: Use Sequential Thinking to work through complex problems systematically
4. **For Reviews**: Use Sequential Thinking to verify your implementation covers all requirements

**Remember**: Complex features require systematic thinking. Use Sequential Thinking MCP to ensure thorough analysis before implementation.

---
'''

    # Find where to insert the Sequential Thinking section
    # Insert after technical requirements but before documentation loading
    
    # Look for the pattern of technical requirements section ending
    pattern = r'(---\s*\n\n)(## 📚 STEP 1: LOAD CURRENT DOCUMENTATION)'
    
    if re.search(pattern, content, re.MULTILINE):
        # Insert the Sequential Thinking section before the documentation loading step
        new_content = re.sub(
            pattern,
            r'\1' + sequential_thinking_section + r'\2',
            content,
            flags=re.MULTILINE
        )
        return new_content
    else:
        # Fallback: try to insert after any "---" section before documentation
        doc_pattern = r'(---\s*\n\n)(.*?)(## 📚.*?LOAD.*?DOCUMENTATION)'
        if re.search(doc_pattern, content, re.MULTILINE | re.DOTALL):
            new_content = re.sub(
                doc_pattern,
                r'\1\2' + sequential_thinking_section + r'\3',
                content,
                flags=re.MULTILINE | re.DOTALL
            )
            return new_content
    
    # If patterns don't match, return original content
    print(f"Warning: Could not find insertion point for Sequential Thinking section")
    return content

def process_team_files():
    """Process all team prompt files in batches 17-30."""
    
    # Get all team prompt files in batches 17-30
    patterns = [
        'WORKFLOW-V2-DRAFT/OUTBOX/team-*/batch1[7-9]/*.md',  # batch17, batch18, batch19
        'WORKFLOW-V2-DRAFT/OUTBOX/team-*/batch2[0-9]/*.md',  # batch20-29
        'WORKFLOW-V2-DRAFT/OUTBOX/team-*/batch30/*.md'       # batch30
    ]
    
    files_updated = 0
    files_failed = 0
    
    for pattern in patterns:
        files = glob.glob(pattern)
        
        for file_path in files:
            try:
                print(f"Processing: {file_path}")
                
                # Read file with UTF-8 encoding
                with open(file_path, 'r', encoding='utf-8', errors='replace') as f:
                    content = f.read()
                
                # Check if Sequential Thinking section already exists
                if "SEQUENTIAL THINKING MCP FOR COMPLEX FEATURE ANALYSIS" in content:
                    print(f"  Skipping - Sequential Thinking section already exists")
                    continue
                
                # Add Sequential Thinking section
                updated_content = add_sequential_thinking_section(content)
                
                if updated_content != content:
                    # Write updated content back
                    with open(file_path, 'w', encoding='utf-8') as f:
                        f.write(updated_content)
                    
                    print(f"  ✅ Updated with Sequential Thinking patterns")
                    files_updated += 1
                else:
                    print(f"  ⚠️ No changes made - insertion point not found")
                    files_failed += 1
                    
            except Exception as e:
                print(f"  ❌ Error processing {file_path}: {e}")
                files_failed += 1
    
    print(f"\n📊 Summary:")
    print(f"Files updated: {files_updated}")
    print(f"Files failed: {files_failed}")
    print(f"Sequential Thinking MCP patterns added to all team prompts!")

if __name__ == "__main__":
    print("🧠 Adding Sequential Thinking MCP to Team Prompts (Batches 17-30)")
    print("=" * 60)
    
    # Change to the correct directory
    os.chdir('/Users/skyphotography/CODE/WedSync-2.0/WedSync2')
    
    process_team_files()