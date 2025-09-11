#!/usr/bin/env python3
"""
Add Browser MCP references to testing sections in team prompts
Enhances Playwright MCP sections with Browser MCP for interactive testing
"""

import os
import re
from pathlib import Path

# Base directory
BASE_DIR = "/Users/skyphotography/CODE/WedSync-2.0/WedSync2/WORKFLOW-V2-DRAFT/OUTBOX"

# Teams and batches to process
TEAMS = ['a', 'b', 'c', 'd', 'e']
BATCHES = list(range(17, 31))  # 17 to 30

# Statistics
stats = {
    'total_files': 0,
    'updated_files': 0,
    'errors': 0,
    'files_updated': []
}

# Browser MCP testing addition
BROWSER_MCP_SECTION = """
## 🌐 BROWSER MCP INTERACTIVE TESTING (NEW!)

**🚀 Real Browser Automation with Browser MCP:**

The Browser MCP provides interactive browser testing capabilities that complement Playwright MCP:

```javascript
// BROWSER MCP - Interactive Visual Testing
// Use for real-time UI validation and user flow testing

// 1. NAVIGATE AND CAPTURE STATE
await mcp__browsermcp__browser_navigate({url: "http://localhost:3000/dashboard"});
const snapshot = await mcp__browsermcp__browser_snapshot();

// 2. INTERACTIVE FORM TESTING
await mcp__browsermcp__browser_click({
  element: "Login button",
  ref: snapshot.querySelector('[data-testid="login-btn"]')
});

await mcp__browsermcp__browser_type({
  element: "Email input field", 
  ref: snapshot.querySelector('input[type="email"]'),
  text: "test@wedding.com",
  submit: false
});

// 3. VISUAL REGRESSION TESTING
await mcp__browsermcp__browser_screenshot(); // Captures current state

// 4. RESPONSIVE TESTING
for (const width of [375, 768, 1024, 1920]) {
  await mcp__browsermcp__browser_resize({width, height: 800});
  await mcp__browsermcp__browser_wait({time: 1});
  await mcp__browsermcp__browser_screenshot();
}

// 5. CONSOLE AND NETWORK MONITORING
const logs = await mcp__browsermcp__browser_get_console_logs();
const hasErrors = logs.some(log => log.level === 'error');

// 6. MULTI-TAB TESTING
await mcp__browsermcp__browser_tabs({action: "new"});
await mcp__browsermcp__browser_navigate({url: "http://localhost:3000/settings"});
await mcp__browsermcp__browser_tabs({action: "select", index: 0});
```

**Browser MCP vs Playwright MCP:**
- **Browser MCP**: Interactive, visual, real-time testing during development
- **Playwright MCP**: Automated, programmatic, CI/CD testing
- **Use Both**: Browser MCP for exploration, Playwright MCP for automation

"""

def add_browser_mcp_to_file(file_path: Path) -> bool:
    """Add Browser MCP references to testing sections in a file."""
    try:
        # Read the file
        with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
            content = f.read()
        
        original_content = content
        
        # Check if file already has Browser MCP references
        if 'mcp__browsermcp__' in content or 'Browser MCP' in content:
            return False  # Already has Browser MCP
        
        # Find the Playwright MCP testing section and add Browser MCP after it
        playwright_section_pattern = r'(## 🎭 REVOLUTIONARY PLAYWRIGHT MCP TESTING.*?)(?=##|\n---|\Z)'
        
        match = re.search(playwright_section_pattern, content, re.DOTALL)
        
        if match:
            # Insert Browser MCP section after Playwright section
            end_pos = match.end()
            content = content[:end_pos] + "\n" + BROWSER_MCP_SECTION + content[end_pos:]
        else:
            # If no Playwright section found, look for testing section
            testing_pattern = r'(## .*?(?:TEST|Testing).*?)(?=##|\n---|\Z)'
            match = re.search(testing_pattern, content, re.DOTALL | re.IGNORECASE)
            
            if match:
                end_pos = match.end()
                content = content[:end_pos] + "\n" + BROWSER_MCP_SECTION + content[end_pos:]
        
        # Also update technology stack to mention Browser MCP
        if 'Technology Stack' in content:
            content = re.sub(
                r'(- Testing: Playwright MCP)',
                r'\1, Browser MCP',
                content
            )
        
        # Update agent instructions to mention Browser MCP
        if 'playwright-visual-testing-specialist' in content:
            content = re.sub(
                r'(playwright-visual-testing-specialist[^\n]*)',
                r'\1 --use-browser-mcp',
                content
            )
        
        # Check if content was modified
        if content != original_content:
            # Write updated content
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(content)
            
            stats['files_updated'].append(str(file_path))
            return True
        
        return False
        
    except Exception as e:
        print(f"      Error processing {file_path}: {e}")
        stats['errors'] += 1
        return False

def process_teams():
    """Process all teams and batches."""
    print("=" * 60)
    print("ADDING BROWSER MCP TO TEAM PROMPTS")
    print("Batches: 17-30 | Teams: A-E")
    print("=" * 60)
    print()
    
    for team in TEAMS:
        print(f"Processing Team {team.upper()}...")
        
        for batch in BATCHES:
            batch_dir = Path(BASE_DIR) / f"team-{team}" / f"batch{batch}"
            
            if batch_dir.exists() and batch_dir.is_dir():
                md_files = list(batch_dir.glob("*.md"))
                
                if md_files:
                    print(f"  Batch {batch}: {len(md_files)} files")
                    
                    for file_path in md_files:
                        stats['total_files'] += 1
                        filename = file_path.name
                        
                        # Only update round 1 files (main implementation rounds)
                        # You can change this logic if you want to update all rounds
                        if 'round-1' in filename or 'round-2' in filename or 'round-3' in filename:
                            print(f"    Processing {filename}... ", end="")
                            
                            if add_browser_mcp_to_file(file_path):
                                print("✓ Updated with Browser MCP")
                                stats['updated_files'] += 1
                            else:
                                print("- Already has Browser MCP or no testing section")
                        else:
                            print(f"    Skipping {filename} (not a round file)")
        
        print()
    
    # Print summary
    print("=" * 60)
    print("UPDATE COMPLETE!")
    print("=" * 60)
    print(f"Total files processed: {stats['total_files']}")
    print(f"Files updated with Browser MCP: {stats['updated_files']}")
    print(f"Errors: {stats['errors']}")
    print()
    
    # Verify a sample file
    sample_file = Path(BASE_DIR) / "team-a" / "batch17" / "WS-159-team-a-round-1.md"
    if sample_file.exists():
        print("Sample verification - checking Team A Batch 17:")
        with open(sample_file, 'r') as f:
            content = f.read()
        
        if 'mcp__browsermcp__' in content:
            print("✓ Browser MCP references found in sample file")
        else:
            print("⚠️  WARNING: No Browser MCP references found in sample file!")
        
        if 'Browser MCP' in content:
            print("✓ Browser MCP section found in sample file")
        else:
            print("⚠️  WARNING: No Browser MCP section found in sample file!")
    
    # List first few files that were updated
    if stats['files_updated']:
        print()
        print("Files updated with Browser MCP:")
        for file in stats['files_updated'][:10]:  # Show first 10
            print(f"  - {file}")
        if len(stats['files_updated']) > 10:
            print(f"  ... and {len(stats['files_updated']) - 10} more files")

if __name__ == "__main__":
    process_teams()
    print()
    print("Script complete. Browser MCP has been added to testing sections.")
    print("Teams can now use both Playwright MCP and Browser MCP for comprehensive testing!")