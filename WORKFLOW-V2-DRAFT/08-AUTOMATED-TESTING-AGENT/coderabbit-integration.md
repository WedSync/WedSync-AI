# 🐰 CodeRabbit Integration for Automated Testing Agent

## Integration Overview

CodeRabbit comments will be automatically ingested into the existing TEST-WORKFLOW system through the INBOX mechanism, following the established workflow pattern.

## How It Works

### 1. **Automated Collection (No Manual Steps)**
The Automated Testing Agent will periodically check for CodeRabbit comments using the existing GitHub authentication:

```bash
# This runs automatically as part of the testing agent's routine
gh api repos/WedSync/WedSync2/pulls/comments --jq '.[] | select(.user.login | contains("coderabbit"))'
```

### 2. **INBOX Delivery**
CodeRabbit issues are automatically placed in the appropriate INBOX folder:
- `/WORKFLOW-V2-DRAFT/INBOX/automated-testing/coderabbit-issues-[date].json`
- Follows existing naming conventions (WS-XXX format where applicable)

### 3. **Processing by Automated Testing Agent**
The agent processes CodeRabbit comments as part of its regular workflow:
- Categorizes by severity (using CodeRabbit's ⚠️ 🛠️ 💡 indicators)
- Creates bug reports in the standard format
- Routes to appropriate teams through OUTBOX

### 4. **Integration Points**

#### Input (INBOX):
```json
{
  "source": "coderabbit",
  "pr_number": 3,
  "file": "path/to/file.ts",
  "line": 42,
  "severity": "warning",
  "description": "Issue description",
  "suggested_fix": "```diff...",
  "auto_fixable": true
}
```

#### Output (OUTBOX to Senior Code Reviewer):
```markdown
## Bug Report: [CodeRabbit Finding]
**Feature:** Related WS-XXX feature
**File:** path/to/file.ts:42
**Severity:** Warning
**Description:** [Issue details]
**Suggested Fix:** [If available]
**Re-test Instructions:** [How to verify fix]
```

## No Changes to Existing Workflow

This integration:
- ✅ Uses existing INBOX/OUTBOX folders
- ✅ Follows existing naming conventions
- ✅ Integrates with current agent responsibilities
- ✅ No new scripts in main workflow
- ✅ Automated collection (no manual steps)

## Current Status

- **CodeRabbit Comments Found:** 30 in PR #3
- **Authentication:** ✅ GitHub CLI configured
- **Integration Status:** Ready to activate

## To Activate

The Automated Testing Agent simply needs to add this check to its routine:
1. Check for new PRs with updates
2. Fetch CodeRabbit comments if present
3. Process through standard bug reporting workflow

No modifications to core workflow structure required.