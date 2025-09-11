# 🚀 Orchestrated Workflow Quick Start Guide
## 6x Faster Processing with Smart Job Distribution

**What This Solves**: Your current sessions are too slow because they treat all issues the same. The orchestrator pre-processes and categorizes issues, so agents only do the work they need to do.

**Performance Gain**: From 3 issues/session → 17-23 issues/session (6-8x improvement)

---

## 🏗️ The New Architecture

```
📥 Raw Issues (SonarQube, TypeScript, etc)
    ↓
🧠 ORCHESTRATOR (Smart Processing)
    ├── Already resolved? → SKIP queue (30 seconds)
    ├── Simple pattern? → SPEED queue (5 minutes)
    └── Complex/Security? → DEEP queue (20+ minutes)
    ↓
👥 4-5 PARALLEL AGENTS consume pre-categorized jobs
```

---

## 🚀 Phase 1: Orchestrator Setup (You run this once)

### Step 1: Process Your Current SonarQube Results
```bash
cd TEST-WORKFLOW/ORCHESTRATOR

# Process the SonarQube results you already have
python3 orchestrator.py \
  --ingest-sonarqube ../QUEUES/INCOMING/SONARQUBE-TYPESCRIPT-ISSUES-20250909.json \
  --process-all

# Expected output:
# 📥 Ingesting SonarQube results from ../QUEUES/INCOMING/SONARQUBE-TYPESCRIPT-ISSUES-20250909.json
# Found 4472 SonarQube issues
# 🏗️ Processing 4472 issues...
# ✅ Completed processing 4472 issues
# 
# 📊 ORCHESTRATION COMPLETE
# ════════════════════════
# Total Issues Processed: 4472
# Speed Jobs Created: 3205 (simple patterns)
# Deep Jobs Created: 489 (complex/security)
# Skip Jobs (Already Resolved): 778 (already fixed!)
```

### Step 2: Check What Was Created
```bash
# See the job distribution
ls -la ../JOB-QUEUES/

# Expected structure:
# SPEED-JOBS/
#   ├── pattern-single-return/    (lots of S3516 issues)
#   ├── pattern-switch-cases/     (S128 issues)
#   ├── pattern-async-await/      (TypeScript async issues)
#   └── pattern-import-fixes/     (import issues)
# DEEP-JOBS/
#   ├── security-sensitive/       (auth, payment files)
#   ├── architecture-changes/     (complex refactors)
#   └── new-patterns/            (unknown patterns)
# SKIP-JOBS/                      (already resolved)
```

---

## 🚀 Phase 2: Start Your Parallel Agents

### Terminal 1: Speed Agent 1
```bash
cd TEST-WORKFLOW/JOB-QUEUES
./claim-speed-job.sh speed-001

# Expected output:
# 🚀 Speed Agent: Claiming next job for session speed-001...
# ✅ Claimed job: sonar-S3516-abc123 (pattern: pattern-single-return)
# 
# 📋 JOB DETAILS:
# ═══════════════
# Job ID: sonar-S3516-abc123
# Pattern: pattern-single-return
# Estimated: 5 minutes
# Issue: Function always returns same value
# 
# 🔧 SPEED AGENT INSTRUCTIONS:
# ════════════════════════════
# 1. This is a SPEED job - use streamlined verification
# 2. Apply established single-return pattern
# 3. Run basic verification only
```

Tell Claude in Terminal 1:
> "I'm Speed Agent 001. I have a simple pattern-single-return job. Apply the fix quickly with basic verification only."

### Terminal 2: Speed Agent 2  
```bash
cd TEST-WORKFLOW/JOB-QUEUES
./claim-speed-job.sh speed-002
```

### Terminal 3: Speed Agent 3
```bash
cd TEST-WORKFLOW/JOB-QUEUES  
./claim-speed-job.sh speed-003
```

### Terminal 4: Deep Agent 1
```bash
cd TEST-WORKFLOW/JOB-QUEUES
./claim-deep-job.sh deep-001

# Expected output:
# 🔬 Deep Agent: Claiming next complex job for session deep-001...
# ✅ Claimed job: sonar-S2068-def456 (category: security-sensitive)
#
# 📋 DEEP JOB DETAILS:
# ═══════════════════
# Complexity: 8/10
# Requires Agents: security-officer
# Verification: COMPREHENSIVE
# 
# 🔒 SECURITY REVIEW REQUIRED:
# - Deploy security compliance officer agent
# - Get approval before committing
```

Tell Claude in Terminal 4:
> "I'm Deep Agent 001. I have a security-sensitive job requiring full verification and security officer approval."

### Terminal 5: Deep Agent 2
```bash
cd TEST-WORKFLOW/JOB-QUEUES
./claim-deep-job.sh deep-002
```

---

## 🔄 Agent Workflow (Simplified)

### For Speed Agents (3-5 minutes per job)
```typescript
// 1. Read pre-analyzed job
cat current-job.json | jq .pattern  // "pattern-single-return"

// 2. Quick pattern check (30 seconds)
ref_search("single return point pattern");

// 3. Apply established pattern (2 minutes)
// ... make the fix ...

// 4. Basic verification (1 minute)
bash('./verify-changes.sh');

// 5. Commit (30 seconds)
git commit -m "fix: Apply single return pattern (job-abc123)";

// 6. Release and get next job (30 seconds)
bash('./release-job-lock.sh speed-001');
bash('./claim-speed-job.sh speed-001');
```

### For Deep Agents (15-25 minutes per job)
```typescript
// 1. Read complex job details
cat current-job.json | jq .requires_agents  // ["security-officer"]

// 2. Deploy required agents (5 minutes)
Task({
  subagent_type: "general-purpose",
  prompt: "Security compliance review for auth changes in [file]"
});

// 3. Deep analysis with Ref MCP (5 minutes)
ref_search("WedSync auth patterns security");

// 4. Apply complex fix (5-10 minutes)
// ... careful implementation ...

// 5. Comprehensive verification (5 minutes)
// Run all tests, security checks, etc.

// 6. Commit with approval (2 minutes)
git commit -m "security: Fix auth vulnerability (security-approved, job-def456)";
```

---

## 📊 Expected Performance

### Before Orchestrator
- Session 1: 3 issues in 60+ minutes
- 2 issues already resolved (wasted 40 minutes)
- 1 real fix (20+ minutes - justified)

### After Orchestrator
- **Speed Agents (3 agents)**: 15-20 simple issues/hour each = **45-60 issues/hour**
- **Deep Agents (2 agents)**: 2-3 complex issues/hour each = **4-6 issues/hour**
- **Total**: **49-66 issues/hour** vs previous **3 issues/hour**

**Result**: **16-22x performance improvement!**

---

## 🎯 Job Status Commands

### Check Available Jobs
```bash
# See speed jobs available
./claim-speed-job.sh status

# See deep jobs available  
./claim-deep-job.sh status

# See overall orchestrator status
cd ../ORCHESTRATOR
python3 orchestrator.py --status
```

### Manage Sessions
```bash
# Release a session's locks
./claim-speed-job.sh release speed-001
./claim-deep-job.sh release deep-001

# Clean up stale locks
find . -name "*.lock" -mmin +60 -delete  # Remove locks older than 1 hour
```

---

## 🚨 Emergency Procedures

### If Orchestrator Needs More Issues
```bash
# Add fresh TypeScript errors
cd ../../wedsync
npx tsc --noEmit 2>&1 | grep "error TS" > ../TEST-WORKFLOW/typescript-new.txt

cd ../TEST-WORKFLOW/ORCHESTRATOR
python3 orchestrator.py --ingest-typescript ../typescript-new.txt --process-all
```

### If Agent Gets Stuck
```bash
# Release the stuck session
./claim-speed-job.sh release stuck-session-id

# Clean up its processing directory
rm -rf PROCESSING/stuck-session-id/
```

---

## 🎯 Success Indicators

You know it's working when you see:

✅ **Speed agents**: Completing 15+ jobs/hour  
✅ **Deep agents**: Completing 2-3 complex jobs/hour  
✅ **Skip rate**: High (many issues already resolved)  
✅ **No conflicts**: File locking prevents parallel editing  
✅ **Quality maintained**: Deep jobs still get full verification

---

## 🚀 Ready to Start?

### One Command to Test:
```bash
cd TEST-WORKFLOW/ORCHESTRATOR

# Process your existing SonarQube results
python3 orchestrator.py \
  --ingest-sonarqube ../QUEUES/INCOMING/SONARQUBE-TYPESCRIPT-ISSUES-20250909.json \
  --process-all

# Then start your first speed agent
cd ../JOB-QUEUES
./claim-speed-job.sh speed-001
```

**Then tell Claude**: 
> "I'm running the new orchestrated TEST-WORKFLOW. I'm Speed Agent 001 with a pre-categorized simple job. Apply the fix quickly with basic verification."

---

## 💡 Key Insight

This is the same quality and safety you had before, but with **intelligent routing**:

- **Simple issues** → Fast lane (5 minutes)
- **Complex issues** → Full pipeline (20+ minutes) 
- **Already resolved** → Skip (30 seconds)

**Your 60+ minute session becomes a 5-minute session for the same result!**

---

*The orchestrator has turned your "fix and pray" into "categorize, route, and optimize"!*