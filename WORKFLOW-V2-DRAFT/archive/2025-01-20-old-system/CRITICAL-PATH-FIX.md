# 🚨 CRITICAL PATH FIX - WORKFLOW V2 ISSUES
## Date: 2025-08-20
## Updated: Teams B, C, D, E Not Reporting Investigation

---

## ⚠️ IMMEDIATE ACTION REQUIRED

**PROBLEM:** Teams B, C, D, E are NOT reporting to Senior Dev after Rounds 1 & 2.

**SOLUTION:** All roles must use these EXACT paths for Round 2:

---

## 🔴 ROOT CAUSES DISCOVERED

### Issue 1: Path Ambiguity in Team Prompts
- **Problem:** Team prompts use relative path `/SESSION-LOGS/[DATE]/` without full path context
- **Impact:** Teams B, C, D, E don't know where to save reports
- **Evidence:** Only Team A reports found in `/WORKFLOW-V2-DRAFT/SESSION-LOGS/today/`

### Issue 2: Inconsistent Path References
- **In Prompts:** `/SESSION-LOGS/2025-08-20/team-[x]-round-[n]-*.md`
- **Expected by Senior Dev:** `/WORKFLOW-V2-DRAFT/SESSION-LOGS/today/team-[x]-round-[n]-*.md`
- **Result:** Reports saved to non-existent or wrong directories

### Issue 3: Naming Convention Mismatch
- **Project Orchestrator outputs:** `[DATE]-feature-assignments.md`
- **Feature Development expects:** `batch-[N]-assignments.md`
- **Impact:** Workflow steps can't find their inputs

---

## 📁 CORRECT PATHS FOR ROUND 2 (USE THESE!)

### FOR ALL TEAMS (A, B, C, D, E):

**WHERE TO GET YOUR PROMPTS:**
```bash
/Users/skyphotography/CODE/WedSync-2.0/WedSync2/WORKFLOW-V2-DRAFT/session-prompts/active/team-[letter]-round-2.md
```

**WHERE TO SAVE YOUR OUTPUTS:**
```bash
# Overview Report
/Users/skyphotography/CODE/WedSync-2.0/WedSync2/WORKFLOW-V2-DRAFT/SESSION-LOGS/today/team-[letter]-round-2-overview.md

# Dev Manager Feedback
/Users/skyphotography/CODE/WedSync-2.0/WedSync2/WORKFLOW-V2-DRAFT/SESSION-LOGS/today/team-[letter]-round-2-to-dev-manager.md

# Senior Dev Review Request
/Users/skyphotography/CODE/WedSync-2.0/WedSync2/WORKFLOW-V2-DRAFT/SESSION-LOGS/today/team-[letter]-round-2-senior-dev-prompt.md
```

### FOR DEV MANAGER:

**WHERE TO CREATE ROUND 2 PROMPTS:**
```bash
# Team prompts (15 files total)
/Users/skyphotography/CODE/WedSync-2.0/WedSync2/WORKFLOW-V2-DRAFT/session-prompts/active/team-[a-e]-round-[1-3].md

# Coordination document
/Users/skyphotography/CODE/WedSync-2.0/WedSync2/WORKFLOW-V2-DRAFT/03-DEV-MANAGER/output/2025-01-21-coordination.md
```

**WHERE TO READ SENIOR DEV FEEDBACK FROM ROUND 1:**
```bash
/Users/skyphotography/CODE/WedSync-2.0/WedSync2/WORKFLOW-V2-DRAFT/SESSION-LOGS/today/senior-dev-review-round1.md
```

### FOR SENIOR DEV:

**WHERE TO FIND TEAM OUTPUTS:**
```bash
# Round 2 outputs (wait for all 5 teams to complete)
/Users/skyphotography/CODE/WedSync-2.0/WedSync2/WORKFLOW-V2-DRAFT/SESSION-LOGS/today/team-[a-e]-round-2-overview.md
/Users/skyphotography/CODE/WedSync-2.0/WedSync2/WORKFLOW-V2-DRAFT/SESSION-LOGS/today/team-[a-e]-round-2-senior-dev-prompt.md
```

**WHERE TO SAVE YOUR REVIEW:**
```bash
/Users/skyphotography/CODE/WedSync-2.0/WedSync2/WORKFLOW-V2-DRAFT/SESSION-LOGS/today/senior-dev-review-round2.md
```

---

## 🔄 ROUND 2 WORKFLOW (FOLLOW THIS ORDER!)

1. **DEV MANAGER** creates Round 2 prompts at `/WORKFLOW-V2-DRAFT/session-prompts/active/`
2. **TEAMS A-E** work in parallel, save outputs to `/WORKFLOW-V2-DRAFT/SESSION-LOGS/today/`
3. **SENIOR DEV** waits for ALL 5 teams, then reviews from `/WORKFLOW-V2-DRAFT/SESSION-LOGS/today/`
4. **DEV MANAGER** reads Senior Dev review for Round 3 planning

---

## ✅ VERIFICATION CHECKLIST

### After Dev Manager creates prompts:
```bash
ls -la /Users/skyphotography/CODE/WedSync-2.0/WedSync2/WORKFLOW-V2-DRAFT/session-prompts/active/team-*-round-2.md
# Should show 5 files (team-a through team-e)
```

### After Teams complete Round 2:
```bash
ls -la /Users/skyphotography/CODE/WedSync-2.0/WedSync2/WORKFLOW-V2-DRAFT/SESSION-LOGS/today/team-*-round-2-*.md
# Should show 15 files (3 per team)
```

### After Senior Dev review:
```bash
ls -la /Users/skyphotography/CODE/WedSync-2.0/WedSync2/WORKFLOW-V2-DRAFT/SESSION-LOGS/today/senior-dev-review-round2.md
# Should show 1 review file
```

---

## 🚫 DO NOT USE THESE PATHS (INCORRECT!)

- ❌ `/session-prompts/today/` 
- ❌ `/SESSION-LOGS/2025-01-21/`
- ❌ Any path outside `/WORKFLOW-V2-DRAFT/`

---

## 📊 ROUND 1 STATUS (FOR REFERENCE)

**What happened in Round 1:**
- ✅ Teams A-E completed their work
- ✅ Team A created password reset flow 
- ⚠️ Teams B-E outputs location unknown (scattered)
- ❌ Senior Dev couldn't find outputs (wrong paths)
- ❌ Round 2 blocked due to communication breakdown

**Round 1 outputs have been moved to:**
```bash
/Users/skyphotography/CODE/WedSync-2.0/WedSync2/WORKFLOW-V2-DRAFT/SESSION-LOGS/today/team-a-round-1-*.md
```

---

## 🎯 SUCCESS CRITERIA FOR ROUND 2

1. All 5 teams can find their Round 2 prompts
2. All 5 teams save outputs to WORKFLOW-V2-DRAFT location
3. Senior Dev can find and review all team outputs
4. Dev Manager can read Senior Dev feedback for Round 3 planning

---

**REMEMBER:** The entire workflow depends on using the CORRECT paths. Double-check every path before reading or writing files!

---

## 🔧 VERIFICATION SCRIPT

Create and run this script to check team reports:

```bash
#!/bin/bash
# verify-team-reports.sh

REPORTS_DIR="/Users/skyphotography/CODE/WedSync-2.0/WedSync2/WORKFLOW-V2-DRAFT/SESSION-LOGS/today"

echo "=== Checking Team Reports for Current Round ==="
echo ""

for round in 1 2 3; do
    echo "Round $round Status:"
    missing=0
    for team in a b c d e; do
        for type in overview to-dev-manager senior-dev-prompt; do
            file="$REPORTS_DIR/team-$team-round-$round-$type.md"
            if [ -f "$file" ]; then
                echo "  ✅ team-$team-round-$round-$type.md"
            else
                echo "  ❌ team-$team-round-$round-$type.md (MISSING)"
                missing=$((missing + 1))
            fi
        done
    done
    if [ $missing -eq 0 ]; then
        echo "  ✅ Round $round: ALL REPORTS PRESENT - Ready for Senior Dev review"
    else
        echo "  ⚠️ Round $round: $missing reports missing - Teams must complete first"
    fi
    echo ""
done
```

---

## 🚀 IMMEDIATE ACTION ITEMS

1. **Fix Team B, C, D, E Prompts (NOW):**
   - Update all prompts with full absolute paths
   - Replace `/SESSION-LOGS/[DATE]/` with full path
   
2. **Create Missing Directory:**
   ```bash
   mkdir -p /Users/skyphotography/CODE/WedSync-2.0/WedSync2/WORKFLOW-V2-DRAFT/SESSION-LOGS/today
   ```

3. **Re-run Teams B, C, D, E for Round 1:**
   - Use corrected prompts
   - Ensure they save to correct location
   
4. **Standardize Naming (TODAY):**
   - Choose either `[DATE]` or `batch-[N]` format
   - Update all workflow READMEs

5. **Validate Before Proceeding:**
   - Run verification script
   - Confirm all 15 reports exist
   - Then run Senior Dev review

---

## 📝 SUMMARY

**Teams B, C, D, E are not reporting because:**
1. Their prompts have incorrect/ambiguous paths
2. They don't know where `/SESSION-LOGS/` is located
3. The workflow has naming convention mismatches

**Solution:** Fix the paths in prompts, standardize naming, and verify all reports exist before proceeding.

**Critical:** The workflow CANNOT continue until all teams report to the correct location!