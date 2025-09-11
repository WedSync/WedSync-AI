# 🌅 NEW MORNING WORKFLOW - QUICK START GUIDE
## Your Daily PM Startup with Enforcement System

**TIME:** 8:00 AM - 9:00 AM  
**PURPOSE:** Start your day with compliance and clarity

---

## 📱 YOUR NEW MORNING ROUTINE (SIMPLIFIED)

### **STEP 1: OPEN PROJECT (8:00 AM)**
```bash
cd /Users/skyphotography/CODE/WedSync-2.0/WedSync2
code .  # Open in VS Code
```

### **STEP 2: READ TODAY'S STATUS (8:05 AM)**
```bash
# Check project status first
cat PROJECT-STATUS.md | grep -A 5 "EMERGENCY PRIORITIES"

# See roadmap phase
cat DEVELOPMENT-ROADMAP.md | grep -A 3 "CURRENT FOCUS"
```

### **STEP 3: VERIFY YESTERDAY (8:10 AM)**
```bash
# Quick verification - did yesterday's work actually complete?
cd wedsync
npm run build  # Should work
npm run dev    # Should start without errors

# If errors, STOP and fix before new work
```

### **STEP 4: CREATE TODAY'S SESSIONS (8:20 AM)**

**For Session A:**
1. Read enforcement checklist:
   ```bash
   cat wedsync/docs/workflow-enforcement/PRE-SESSION-CHECKLIST.md
   ```

2. Find relevant CORE-SPECIFICATIONS:
   ```bash
   find CORE-SPECIFICATIONS/ -name "*.md" | grep -i "[feature-name]"
   ```

3. Use the template:
   ```bash
   cp wedsync/docs/workflow-enforcement/SESSION-TEMPLATE.md \
      SESSION-LOGS/$(date +%Y-%m-%d)/session-a-prompt.md
   ```

4. Fill in template with:
   - Feature from roadmap
   - Tech from CORE-SPECIFICATIONS  
   - 6+ parallel agents
   - Playwright tests

**Repeat for Sessions B and C**

### **STEP 5: LAUNCH SESSIONS (8:45 AM)**
```bash
# Session A
code SESSION-LOGS/$(date +%Y-%m-%d)/session-a-prompt.md

# Session B  
code SESSION-LOGS/$(date +%Y-%m-%d)/session-b-prompt.md

# Session C
code SESSION-LOGS/$(date +%Y-%m-%d)/session-c-prompt.md
```

---

## 🚨 WHAT'S DIFFERENT NOW?

### **OLD WAY (What Failed):**
- Create prompts without reading specs → Wrong technology
- Skip verification → False progress claims
- No cleanup → Document chaos
- <25% agent usage → Slow development

### **NEW WAY (Enforced):**
- ✅ Must read CORE-SPECIFICATIONS first
- ✅ Must verify yesterday's claims work
- ✅ Must use 6+ parallel agents
- ✅ Must include Playwright testing
- ✅ Must provide evidence for completion

---

## ⚡ QUICK COMPLIANCE CHECKLIST

**Before ANY session prompt:**
```markdown
□ Read relevant CORE-SPECIFICATIONS
□ Verify tech choices (@dnd-kit NOT @xyflow/react)
□ Plan 6+ parallel agents
□ Include Playwright tests
□ Add verification requirements
```

**End of day:**
```markdown
□ Run verification protocol
□ Move session files to /SESSION-LOGS/[date]/
□ Update PROJECT-STATUS.md only
□ Root directory still ≤7 files
```

---

## 📁 WHERE EVERYTHING LIVES NOW

```
ROOT (6 FILES ONLY):
├── PM-MASTER-CONTROL.md         # Workflow coordination
├── WORKFLOW-V2-BULLETPROOF.md   # Enterprise methodology  
├── PROJECT-STATUS.md            # Current status/priorities
├── DEVELOPMENT-ROADMAP.md       # Phase planning
├── SECURITY-REQUIREMENTS.md     # Security standards
└── PRICING-TIERS.md            # Business rules

ENFORCEMENT DOCS:
/wedsync/docs/workflow-enforcement/
├── PM-WORKFLOW-ENFORCEMENT.md   # Compliance gates
├── PRE-SESSION-CHECKLIST.md     # Pre-session requirements
├── VERIFICATION-PROTOCOL.md     # Trust-but-verify system
├── SESSION-TEMPLATE.md          # Mandatory template
└── MORNING-WORKFLOW-QUICK-START.md  # This guide

DAILY WORK:
/SESSION-LOGS/[YYYY-MM-DD]/
├── session-a-prompt.md
├── session-b-prompt.md  
├── session-c-prompt.md
└── verification-report.md
```

---

## 🎯 MORNING SUCCESS FORMULA

```
Read Status → Verify Yesterday → Read Specs → Create Prompts → Launch Sessions
     ↓              ↓                ↓              ↓              ↓
  (5 min)       (10 min)         (15 min)      (20 min)       (5 min)
```

**Total: 55 minutes to proper session launch**

---

## 🔴 RED FLAGS TO WATCH FOR

**STOP if you see:**
- Build system broken from yesterday
- Sessions claiming completion without evidence
- Root directory has >7 files
- Using wrong technology (@xyflow/react)
- <75% agent usage in reports

**These indicate workflow violations that need immediate correction**

---

## 💡 QUICK TIPS

1. **Always verify first** - Don't trust yesterday's "complete" claims
2. **Read specs completely** - Not summaries, full documents
3. **Launch agents immediately** - Don't wait, parallel execution
4. **Demand evidence** - Screenshots, logs, metrics
5. **Clean as you go** - Don't let files accumulate

---

**THIS IS YOUR NEW MORNING ROUTINE**  
**COMPLIANCE IS MANDATORY**  
**QUALITY IS NON-NEGOTIABLE**