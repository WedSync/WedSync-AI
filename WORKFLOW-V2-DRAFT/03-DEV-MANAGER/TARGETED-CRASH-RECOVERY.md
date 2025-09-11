# 🎯 TARGETED CRASH RECOVERY SYSTEM
## Lightweight State Tracking for Teams A-G

**Problem Solved:** With hundreds of features and thousands of files, teams need to know EXACTLY what they were working on without searching through everything.

---

## 🚀 THE SOLUTION: TEAM STATE FILES

### Each team maintains ONE small state file:

```
/WORKFLOW-V2-DRAFT/.team-states/
├── team-a.current
├── team-b.current
├── team-c.current
├── team-d.current
├── team-e.current
├── team-f.current
└── team-g.current
```

Each file contains ONLY:
```
FEATURE=WS-XXX
ROUND=N
BATCH=N
LAST_FILE=/path/to/last/file/worked/on
LAST_ACTION=what_i_was_doing
TIMESTAMP=2025-01-25T10:30:00
```

---

## 📝 FOR DEV MANAGER: Setup Instructions

### When creating team prompts, ALSO create state files:

```bash
# When assigning work to teams, create their state files
for team in a b c d e f g; do
    cat > /WORKFLOW-V2-DRAFT/.team-states/team-${team}.current << EOF
FEATURE=${WS_NUMBER}
ROUND=${ROUND_NUMBER}
BATCH=${BATCH_NUMBER}
LAST_FILE=none
LAST_ACTION=starting
TIMESTAMP=$(date -Iseconds)
EOF
done
```

---

## 👥 FOR EACH TEAM: Simple Recovery Process

### Step 1: Read Your Current State (5 seconds)

```bash
#!/bin/bash
# RECOVERY SCRIPT - Give this exact script to each team

# Detect which team I am
TEAM_LETTER=$(echo "I need to know which team I am - a, b, c, d, e, f, or g")

# Read my state
if [ -f /WORKFLOW-V2-DRAFT/.team-states/team-${TEAM_LETTER}.current ]; then
    source /WORKFLOW-V2-DRAFT/.team-states/team-${TEAM_LETTER}.current
    echo "========================================="
    echo "RECOVERY: You are Team ${TEAM_LETTER^^}"
    echo "========================================="
    echo "Feature: $FEATURE"
    echo "Round: $ROUND"
    echo "Batch: $BATCH"
    echo "Last file: $LAST_FILE"
    echo "Last action: $LAST_ACTION"
    echo "Since: $TIMESTAMP"
    echo "========================================="
else
    echo "No current assignment - check for new work in:"
    echo "/WORKFLOW-V2-DRAFT/OUTBOX/team-${TEAM_LETTER}/batch*/"
    exit 0
fi
```

### Step 2: Check Your Specific Work (10 seconds)

```bash
# Check ONLY your feature's work - not hundreds of others
echo "Checking your work on $FEATURE..."

# Your prompt
PROMPT="/WORKFLOW-V2-DRAFT/OUTBOX/team-${TEAM_LETTER}/batch${BATCH}/${FEATURE}-round-${ROUND}.md"
echo "Your assignment: $PROMPT"

# Your files (much faster - targeted search)
echo "Your files:"
find /wedsync -name "*${FEATURE}*" -newer /WORKFLOW-V2-DRAFT/.team-states/team-${TEAM_LETTER}.current 2>/dev/null | head -10

# Your tests
echo "Your tests:"
find /wedsync/tests -name "*${FEATURE}*" 2>/dev/null

# TypeScript status for YOUR feature only
npm run typecheck 2>&1 | grep -A2 -B2 "$FEATURE" || echo "No TS errors for $FEATURE"
```

### Step 3: Resume From Exact Point (immediate)

```bash
# Based on LAST_ACTION, you know exactly where you were:

case "$LAST_ACTION" in
    "creating_component")
        echo "→ Continue creating component at: $LAST_FILE"
        ;;
    "writing_tests")
        echo "→ Continue writing tests for: $FEATURE"
        ;;
    "fixing_typescript")
        echo "→ Continue fixing TS errors in: $LAST_FILE"
        ;;
    "implementing_api")
        echo "→ Continue API implementation at: $LAST_FILE"
        ;;
    "complete")
        echo "→ Round $ROUND complete! Check for Round $((ROUND+1))"
        ;;
    *)
        echo "→ Review your prompt and continue from: $LAST_ACTION"
        ;;
esac
```

---

## 💾 FOR TEAMS: Update Your State As You Work

### Teams should update their state file periodically:

```bash
# Function to include in team workflow
update_my_state() {
    local action="$1"
    local file="$2"
    
    cat > /WORKFLOW-V2-DRAFT/.team-states/team-${TEAM_LETTER}.current << EOF
FEATURE=$FEATURE
ROUND=$ROUND
BATCH=$BATCH
LAST_FILE=$file
LAST_ACTION=$action
TIMESTAMP=$(date -Iseconds)
EOF
    echo "State saved: $action on $file"
}

# Usage examples:
update_my_state "creating_component" "/wedsync/src/components/Feature.tsx"
update_my_state "writing_tests" "/wedsync/tests/feature.test.ts"
update_my_state "fixing_typescript" "/wedsync/src/lib/service.ts"
update_my_state "complete" "round_${ROUND}_done"
```

---

## 🎯 ULTRA-TARGETED RECOVERY (< 30 seconds)

### The Complete Recovery Script for Teams:

```bash
#!/bin/bash
# GIVE THIS EXACT SCRIPT TO CRASHED TEAMS

# 1. WHO AM I?
read -p "Which team are you (a/b/c/d/e/f/g)? " TEAM_LETTER

# 2. WHAT WAS I DOING?
STATE_FILE="/WORKFLOW-V2-DRAFT/.team-states/team-${TEAM_LETTER}.current"
if [ ! -f "$STATE_FILE" ]; then
    echo "No active work. Check /WORKFLOW-V2-DRAFT/OUTBOX/team-${TEAM_LETTER}/ for new assignments"
    exit 0
fi

source "$STATE_FILE"

# 3. SHOW MY EXACT CONTEXT (not hundreds of files)
clear
echo "╔════════════════════════════════════════╗"
echo "║     QUICK RECOVERY - TEAM ${TEAM_LETTER^^}           ║"
echo "╠════════════════════════════════════════╣"
echo "║ Feature: $FEATURE                      "
echo "║ Round:   $ROUND                        "
echo "║ Batch:   $BATCH                        "
echo "╠════════════════════════════════════════╣"
echo "║ Last Activity:                         "
echo "║ → $LAST_ACTION                         "
echo "║ → $LAST_FILE                           "
echo "║ → $TIMESTAMP                           "
echo "╚════════════════════════════════════════╝"

# 4. QUICK HEALTH CHECK
echo ""
echo "Quick Status Check:"
if [ -f "$LAST_FILE" ]; then
    echo "✓ Last file exists"
else
    echo "✗ Last file not found (may be normal)"
fi

# Only check YOUR feature's TypeScript
TS_ERRORS=$(npm run typecheck 2>&1 | grep -c "$FEATURE" || echo "0")
echo "TypeScript errors for $FEATURE: $TS_ERRORS"

# 5. EXACT RESUMPTION POINT
echo ""
echo "RESUME HERE:"
echo "────────────"
case "$LAST_ACTION" in
    starting)
        echo "📍 Start fresh with your Round $ROUND prompt"
        echo "   File: /WORKFLOW-V2-DRAFT/OUTBOX/team-${TEAM_LETTER}/batch${BATCH}/${FEATURE}-round-${ROUND}.md"
        ;;
    creating_*)
        echo "📍 Continue creating in: $LAST_FILE"
        echo "   Check if file is complete, then move to next task"
        ;;
    implementing_*)
        echo "📍 Continue implementing in: $LAST_FILE"
        echo "   Finish implementation, then add tests"
        ;;
    writing_tests)
        echo "📍 Continue test writing for $FEATURE"
        echo "   Check test coverage, aim for >80%"
        ;;
    fixing_*)
        echo "📍 Continue fixing issues in: $LAST_FILE"
        echo "   Run 'npm run typecheck' to verify"
        ;;
    complete)
        echo "📍 Round $ROUND is DONE!"
        echo "   Check for Round $((ROUND+1)) assignment"
        NEW_PROMPT="/WORKFLOW-V2-DRAFT/OUTBOX/team-${TEAM_LETTER}/batch${BATCH}/${FEATURE}-round-$((ROUND+1)).md"
        if [ -f "$NEW_PROMPT" ]; then
            echo "   Found: $NEW_PROMPT"
            # Update state for new round
            sed -i "s/ROUND=$ROUND/ROUND=$((ROUND+1))/" "$STATE_FILE"
            sed -i "s/LAST_ACTION=complete/LAST_ACTION=starting/" "$STATE_FILE"
        else
            echo "   No next round - feature complete!"
        fi
        ;;
    *)
        echo "📍 Unknown state - check your prompt:"
        echo "   /WORKFLOW-V2-DRAFT/OUTBOX/team-${TEAM_LETTER}/batch${BATCH}/${FEATURE}-round-${ROUND}.md"
        ;;
esac

echo ""
echo "Ready to continue? Your context is loaded."
```

---

## 🔄 STATE LIFECYCLE

### 1. Dev Manager Creates States
When assigning WS-123 Round 1 to Team A:
```bash
echo "FEATURE=WS-123
ROUND=1  
BATCH=5
LAST_FILE=none
LAST_ACTION=starting
TIMESTAMP=$(date -Iseconds)" > /WORKFLOW-V2-DRAFT/.team-states/team-a.current
```

### 2. Team Updates During Work
```bash
# After creating a component
update_my_state "creating_component" "/wedsync/src/components/WS-123-Widget.tsx"

# After writing tests
update_my_state "writing_tests" "/wedsync/tests/WS-123.test.ts"

# When complete
update_my_state "complete" "round_1_done"
```

### 3. Recovery Reads State
Crash? Just run recovery script - instantly knows:
- Exact feature (not searching hundreds)
- Exact round
- Exact last action
- Exact file to check

### 4. Cleanup After Feature Complete
```bash
# Archive state when feature is fully done
mv /WORKFLOW-V2-DRAFT/.team-states/team-a.current \
   /WORKFLOW-V2-DRAFT/.team-states/archive/team-a-WS-123-$(date +%Y%m%d).done
```

---

## ✅ BENEFITS OF THIS APPROACH

1. **INSTANT RECOVERY** - No searching through thousands of files
2. **EXACT CONTEXT** - Know precisely what you were doing
3. **LIGHTWEIGHT** - Just 6 lines per team state file
4. **FOCUSED** - Only look at YOUR feature, not hundreds
5. **STATEFUL** - Remembers across crashes
6. **SIMPLE** - Teams just source one file

---

## 📊 EXAMPLE WITH SCALE

**Traditional Recovery:**
- Search through 200 features × 21 prompts = 4,200 files
- Check git status on entire repo = 1000s of files
- Run full test suite = 10+ minutes
- **Total Recovery Time: 15-30 minutes**

**Targeted Recovery:**
- Read 1 state file = instant
- Check 1 feature's files = 5-10 files
- Check 1 feature's tests = 2-3 files
- **Total Recovery Time: 30 seconds**

---

## 🚨 FOR YOU TO IMPLEMENT

1. **Create state directory once:**
```bash
mkdir -p /WORKFLOW-V2-DRAFT/.team-states/archive
```

2. **When prompting teams, include:**
```
"First, run: source /WORKFLOW-V2-DRAFT/.team-states/team-[letter].current
This tells you exactly what you're working on."
```

3. **Have teams update state:**
```
"As you work, periodically run:
update_my_state 'what_you_did' '/file/you/modified'"
```

This targeted approach means teams can recover in seconds, not minutes, even with thousands of features in the system.