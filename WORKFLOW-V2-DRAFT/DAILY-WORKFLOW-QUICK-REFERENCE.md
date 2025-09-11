# 📋 DAILY WORKFLOW QUICK REFERENCE
## Your 5-Minute Guide to Running the Improved Pipeline

---

## 🌅 MORNING STARTUP

### 1. Check Pipeline Status
```bash
# See what's in progress:
tail -20 00-STATUS/feature-tracker.log

# Check for stuck items:
ls INBOX/*/WS-*.md
# If files exist, agents didn't complete - investigate
```

### 2. Start Project Orchestrator
```
Open new Claude Code window
Prompt: "You are the Project Orchestrator. Read your README at /WORKFLOW-V2-DRAFT/01-PROJECT-ORCHESTRATOR/README.md and begin work."
```
- PO will assign WS-XXX numbers
- Output goes to OUTBOX/project-orchestrator/
- Routes to feature-designer inbox

### 3. Run Feature Designer
```
Open new Claude Code window
Prompt: "You are the Feature Designer. Read your README at /WORKFLOW-V2-DRAFT/02-FEATURE-DEVELOPMENT/README.md and process your inbox."
```
- Reads from INBOX/feature-designer/
- Adds user stories and wedding context
- Outputs technical specs to OUTBOX

### 4. Run Dev Manager
```
Open new Claude Code window
Prompt: "You are the Dev Manager. Read your README at /WORKFLOW-V2-DRAFT/03-DEV-MANAGER/README.md and create team prompts from your inbox."
```
- Creates 15 prompts (5 teams × 3 rounds)
- Includes user stories in every prompt
- Distributes to team inboxes

---

## 🏃 RUNNING DEV TEAMS

### Launch 5 Parallel Teams:
```
Team A: "You are Team A. Execute the prompt in your inbox at /WORKFLOW-V2-DRAFT/INBOX/team-a/"
Team B: "You are Team B. Execute the prompt in your inbox at /WORKFLOW-V2-DRAFT/INBOX/team-b/"
Team C: "You are Team C. Execute the prompt in your inbox at /WORKFLOW-V2-DRAFT/INBOX/team-c/"
Team D: "You are Team D. Execute the prompt in your inbox at /WORKFLOW-V2-DRAFT/INBOX/team-d/"
Team E: "You are Team E. Execute the prompt in your inbox at /WORKFLOW-V2-DRAFT/INBOX/team-e/"
```

**CRITICAL:** Wait for ALL teams to complete before Senior Dev review

---

## 🔍 SENIOR DEV REVIEW

### After All Teams Complete:
```
Open new Claude Code window
Prompt: "You are the Guardian of WedSync. Read your README at /WORKFLOW-V2-DRAFT/09-SENIOR-CODE-REVIEWER/README.md and review all team outputs in your inbox."
```
- Verifies against actual specifications
- Checks for hallucinated features
- Approves or rejects each WS-XXX

---

## 📊 MONITORING COMMANDS

### Check Feature Progress:
```bash
# Specific feature status:
grep "WS-000" 00-STATUS/feature-tracker.log

# Today's completed features:
grep "COMPLETE" 00-STATUS/feature-tracker.log | grep "$(date +%Y-%m-%d)"

# Stuck in pipeline:
ls -la INBOX/*/WS-*.md

# Ready for git:
ls OUTBOX/senior-developer/*approved.md
```

### Route Messages Between Agents:
```bash
# After any agent completes:
./route-messages.sh

# Clean specific inbox:
./cleanup-inbox.sh [agent-name]
```

---

## 🚨 TROUBLESHOOTING

### "Agent is inventing features"
- Check their README has anti-hallucination rules
- Verify they're reading from INBOX (not making up work)
- Ensure WS-XXX tracking is being used

### "Teams not outputting reports"
- Check they received prompts in INBOX/team-x/
- Verify prompt includes output requirements
- Ensure they know to write to OUTBOX/team-x/

### "Can't track feature status"
- Check feature-tracker.log is being updated
- Verify agents are logging their actions
- Ensure WS-XXX numbers are sequential

### "Confusion about what to process"
- Run cleanup-inbox.sh for that agent
- Check INBOX should be empty after processing
- Verify routing script is moving files correctly

---

## ✅ END OF DAY CHECKLIST

1. [ ] All INBOXes empty (or archived)
2. [ ] feature-tracker.log shows day's progress
3. [ ] Approved features in OUTBOX/senior-developer/
4. [ ] No WS-XXX numbers skipped
5. [ ] Tomorrow's roadmap items identified

---

## 🎯 SUCCESS METRICS

**Good Day:**
- 8+ features reach COMPLETE status
- Zero hallucinated features
- All teams complete their rounds
- Clean pipeline (empty inboxes)

**Great Day:**
- 10+ features complete
- User stories preventing rework
- Senior Dev approves on first review
- Features solve real wedding problems

---

## 💡 REMEMBER

1. **WS-XXX numbers** - Sequential, never skip
2. **THINK HARD** - Every agent should verify, not assume
3. **User Stories** - Every feature needs wedding context
4. **Clean INBOXes** - Archive after processing
5. **Track Everything** - Update feature-tracker.log

---

**Questions? Check WORKFLOW-IMPROVEMENT-SUMMARY.md for complete details**