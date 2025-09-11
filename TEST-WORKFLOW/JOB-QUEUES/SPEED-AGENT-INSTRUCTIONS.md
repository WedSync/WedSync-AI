# ⚡ SPEED AGENT INSTRUCTIONS

## 🎯 Your Mission
Process simple SonarQube issues automatically without stopping for user input.

## 🔄 AUTO-CHAINING WORKFLOW

### Step 1: Claim Job
```bash
./claim-speed-job.sh claim speed-[your-session-id]
```

### Step 2: Process Job (5 minutes max)
- ✅ Read the job file in PROCESSING/[session]/
- ✅ Apply the pattern-based fix
- ✅ Run basic verification only
- ✅ NO user interaction needed

### Step 3: Auto-Chain to Next Job  
- ✅ Release current job: `./claim-speed-job.sh release [session]`
- ✅ Immediately claim next job (repeat Step 1)
- ✅ Continue until queue empty

## 🚫 DO NOT:
- Ask user for approval to continue
- Stop after each job
- Use complex verification
- Deploy sub-agents (speed jobs don't need them)

## ✅ DO:
- Process jobs continuously 
- Use basic pattern matching
- Auto-commit when verification passes
- Chain to next job automatically

## 🎯 Target Rate: 12 jobs/hour per agent
