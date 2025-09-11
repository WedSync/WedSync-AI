# 📥 ERROR INGESTION SYSTEM
## How to Feed 200,000+ Errors Through the Intelligent Workflow

**Created**: 2025-01-22  
**Challenge**: Getting errors from SonarQube/scans into the workflow  
**Solution**: Automated ingestion, classification, and queue distribution  

---

## 🎯 CURRENT SITUATION

### What We Have:
- **SonarQube scan results** with 4,472 TypeScript issues
- **Potential for 200,000+ total issues** across all scans
- **Intelligent verification workflow** ready to process
- **5 parallel sessions** ready to work

### What's Missing:
- Errors aren't in the queue system yet
- Need to parse scan results into processable format
- Need to classify by severity and type
- Need to distribute to session queues

---

## 📊 ERROR SOURCES TO INGEST

### 1. SonarQube Results
```bash
# Already captured in:
TEST-WORKFLOW/QUEUES/BUG-REPORTS/CRITICAL-ASYNC-AWAIT-PATTERNS-20250909.md
TEST-WORKFLOW/SONARQUBE-TYPESCRIPT-ISSUES-20250909.json

# Get fresh scan:
sonar-scanner \
  -Dsonar.projectKey=WedSync \
  -Dsonar.sources=. \
  -Dsonar.host.url=http://localhost:9000 \
  -Dsonar.format=json > sonarqube-results.json
```

### 2. TypeScript Compiler
```bash
cd /Volumes/Extreme\ Pro/CODE/WedSync\ 2.0/WedSync\ Dev/wedsync
npx tsc --noEmit --pretty false 2>&1 | grep "error TS" > typescript-errors.txt
```

### 3. ESLint
```bash
npx eslint . --format json > eslint-results.json
```

### 4. Other Sources
- DeepSource scan results
- CodeRabbit findings  
- Security scan outputs
- Performance audits

---

## 🔄 INGESTION PIPELINE

### Step 1: Create Master Ingestion Script

```bash
#!/bin/bash
# ingest-errors.sh - Parse all error sources into workflow queues

echo "📥 ERROR INGESTION SYSTEM"
echo "========================"

BASE_DIR="/Volumes/Extreme Pro/CODE/WedSync 2.0/WedSync Dev/TEST-WORKFLOW"
QUEUES_DIR="$BASE_DIR/QUEUES"

# Create queue directories
mkdir -p "$QUEUES_DIR/BY-SEVERITY"/{BLOCKER,CRITICAL,MAJOR,MINOR,INFO}
mkdir -p "$QUEUES_DIR/BY-CATEGORY"/{ASYNC-AWAIT,DEPRECATED-API,COMPLEXITY,TYPE-ERRORS,SECURITY}
mkdir -p "$QUEUES_DIR/RAW-INPUTS"
mkdir -p "$QUEUES_DIR/PROCESSED"

echo "📊 Processing error sources..."
```

### Step 2: Parse SonarQube Results

```python
#!/usr/bin/env python3
# parse-sonarqube.py - Convert SonarQube results to queue format

import json
import os
from pathlib import Path

def parse_sonarqube_results(input_file, output_dir):
    """Parse SonarQube JSON into individual error files"""
    
    with open(input_file, 'r') as f:
        data = json.load(f)
    
    issues = data.get('issues', [])
    print(f"📊 Found {len(issues)} issues to process")
    
    # Statistics
    stats = {
        'BLOCKER': 0,
        'CRITICAL': 0,
        'MAJOR': 0,
        'MINOR': 0,
        'INFO': 0
    }
    
    for idx, issue in enumerate(issues):
        # Extract issue details
        severity = issue.get('severity', 'INFO')
        rule = issue.get('rule', 'unknown')
        file_path = issue.get('component', '').replace('WedSync:', '')
        line = issue.get('line', 0)
        message = issue.get('message', '')
        effort = issue.get('effort', '5min')
        
        # Create structured error object
        error_obj = {
            'id': f"SQ-{idx:05d}",
            'source': 'SonarQube',
            'severity': severity,
            'category': classify_category(rule),
            'rule': rule,
            'file': file_path,
            'line': line,
            'message': message,
            'effort': effort,
            'fix_instructions': generate_fix_instructions(rule, message),
            'verification_requirements': generate_verification_requirements(severity, rule),
            'ref_mcp_queries': generate_ref_queries(rule, file_path),
            'required_agents': select_agents(severity, rule)
        }
        
        # Write to appropriate queue
        queue_dir = Path(output_dir) / 'BY-SEVERITY' / severity
        queue_dir.mkdir(parents=True, exist_ok=True)
        
        output_file = queue_dir / f"SQ-{idx:05d}.json"
        with open(output_file, 'w') as f:
            json.dump(error_obj, f, indent=2)
        
        stats[severity] += 1
        
        if idx % 100 == 0:
            print(f"Processed {idx} issues...")
    
    # Print statistics
    print("\n📊 Ingestion Statistics:")
    for severity, count in stats.items():
        print(f"  {severity}: {count} issues")
    
    return stats

def classify_category(rule):
    """Classify issue into category based on rule"""
    if 'S4123' in rule or 'await' in rule.lower():
        return 'ASYNC-AWAIT'
    elif 'deprecated' in rule.lower():
        return 'DEPRECATED-API'
    elif 'complexity' in rule.lower():
        return 'COMPLEXITY'
    elif 'TS' in rule or 'type' in rule.lower():
        return 'TYPE-ERRORS'
    elif 'security' in rule.lower() or 'auth' in rule.lower():
        return 'SECURITY'
    else:
        return 'GENERAL'

def generate_fix_instructions(rule, message):
    """Generate specific fix instructions based on rule"""
    instructions = {
        'typescript:S4123': 'Add or remove await keyword as appropriate',
        'typescript:S1128': 'Remove unused import',
        'typescript:S6582': 'Update to new API version',
        # Add more rule-specific instructions
    }
    return instructions.get(rule, f"Fix: {message}")

def generate_verification_requirements(severity, rule):
    """Define what verification is needed"""
    if severity in ['BLOCKER', 'CRITICAL']:
        return [
            'Run full test suite',
            'Deploy all verification agents',
            'Check pattern compliance with Ref MCP',
            'Verify no regressions',
            'Production guardian approval'
        ]
    elif severity == 'MAJOR':
        return [
            'Run related tests',
            'Pattern check with Ref MCP',
            'Performance verification'
        ]
    else:
        return [
            'Basic verification',
            'Build must pass'
        ]

def generate_ref_queries(rule, file_path):
    """Generate Ref MCP queries for pattern checking"""
    return [
        f"site:wedsync {os.path.basename(file_path)} patterns",
        f"WedSync {rule} best practice",
        f"{rule} common fixes"
    ]

def select_agents(severity, rule):
    """Select which sub-agents to deploy"""
    agents = []
    
    if severity in ['BLOCKER', 'CRITICAL']:
        agents.extend([
            'pre-code-knowledge-gatherer',
            'security-compliance-officer',
            'performance-optimization-expert',
            'test-automation-architect',
            'production-guardian'
        ])
    elif severity == 'MAJOR':
        agents.extend([
            'pre-code-knowledge-gatherer',
            'specification-compliance-overseer'
        ])
    
    # Add specific agents based on rule type
    if 'security' in rule.lower():
        agents.append('security-compliance-officer')
    if 'performance' in rule.lower():
        agents.append('performance-optimization-expert')
    
    return list(set(agents))  # Remove duplicates

if __name__ == "__main__":
    parse_sonarqube_results(
        'sonarqube-results.json',
        '/Volumes/Extreme Pro/CODE/WedSync 2.0/WedSync Dev/TEST-WORKFLOW/QUEUES'
    )
```

### Step 3: Parse TypeScript Errors

```bash
#!/bin/bash
# parse-typescript-errors.sh

echo "📘 Parsing TypeScript errors..."

ERROR_ID=0
while IFS= read -r line; do
    # Extract file, line, and error from TypeScript output
    if [[ $line =~ (.+)\(([0-9]+),([0-9]+)\):\ error\ (TS[0-9]+):\ (.+) ]]; then
        FILE="${BASH_REMATCH[1]}"
        LINE="${BASH_REMATCH[2]}"
        COL="${BASH_REMATCH[3]}"
        CODE="${BASH_REMATCH[4]}"
        MSG="${BASH_REMATCH[5]}"
        
        # Classify severity based on error code
        if [[ $CODE == "TS2345" ]] || [[ $CODE == "TS2322" ]]; then
            SEVERITY="MAJOR"  # Type errors
        elif [[ $CODE == "TS2304" ]]; then
            SEVERITY="CRITICAL"  # Cannot find name
        else
            SEVERITY="MINOR"
        fi
        
        # Create error JSON
        cat > "QUEUES/BY-SEVERITY/$SEVERITY/TS-$(printf %05d $ERROR_ID).json" << EOF
{
  "id": "TS-$(printf %05d $ERROR_ID)",
  "source": "TypeScript",
  "severity": "$SEVERITY",
  "file": "$FILE",
  "line": $LINE,
  "column": $COL,
  "code": "$CODE",
  "message": "$MSG",
  "category": "TYPE-ERRORS",
  "fix_instructions": "Fix TypeScript error $CODE",
  "verification_requirements": ["TypeScript must compile", "No new type errors"],
  "ref_mcp_queries": ["TypeScript $CODE fix", "site:wedsync type patterns"],
  "required_agents": ["pre-code-knowledge-gatherer"]
}
EOF
        
        ((ERROR_ID++))
    fi
done < typescript-errors.txt

echo "✅ Processed $ERROR_ID TypeScript errors"
```

### Step 4: Create Distribution Strategy

```bash
#!/bin/bash
# distribute-to-sessions.sh - Distribute errors to 5 parallel sessions

echo "📊 Distributing errors to session queues..."

QUEUES_DIR="TEST-WORKFLOW/QUEUES/BY-SEVERITY"

# Count errors per severity
BLOCKER_COUNT=$(ls $QUEUES_DIR/BLOCKER/*.json 2>/dev/null | wc -l)
CRITICAL_COUNT=$(ls $QUEUES_DIR/CRITICAL/*.json 2>/dev/null | wc -l)
MAJOR_COUNT=$(ls $QUEUES_DIR/MAJOR/*.json 2>/dev/null | wc -l)
MINOR_COUNT=$(ls $QUEUES_DIR/MINOR/*.json 2>/dev/null | wc -l)
INFO_COUNT=$(ls $QUEUES_DIR/INFO/*.json 2>/dev/null | wc -l)

echo "Error Distribution:"
echo "  Session 1 (BLOCKER): $BLOCKER_COUNT errors"
echo "  Session 2 (CRITICAL): $CRITICAL_COUNT errors"
echo "  Session 3 (MAJOR): $MAJOR_COUNT errors"
echo "  Session 4 (MINOR): $MINOR_COUNT errors"
echo "  Session 5 (INFO): $INFO_COUNT errors"

TOTAL=$((BLOCKER_COUNT + CRITICAL_COUNT + MAJOR_COUNT + MINOR_COUNT + INFO_COUNT))
echo ""
echo "Total errors ready for processing: $TOTAL"

# Calculate time estimates
HOURS_PER_1000=3
ESTIMATED_HOURS=$((TOTAL * HOURS_PER_1000 / 1000 / 5))  # 5 parallel sessions
echo "Estimated time with 5 sessions: $ESTIMATED_HOURS hours"
```

---

## 🚀 COMPLETE INGESTION WORKFLOW

### One-Command Ingestion:

```bash
#!/bin/bash
# master-ingest.sh - Complete error ingestion pipeline

echo "🚀 MASTER ERROR INGESTION"
echo "========================"
echo ""

# 1. Get fresh scans
echo "📊 Step 1: Running fresh scans..."
cd /Volumes/Extreme\ Pro/CODE/WedSync\ 2.0/WedSync\ Dev/wedsync

# TypeScript errors
echo "  • TypeScript compilation..."
npx tsc --noEmit 2>&1 | grep "error TS" > ../TEST-WORKFLOW/QUEUES/RAW-INPUTS/typescript-errors.txt

# ESLint
echo "  • ESLint analysis..."
npx eslint . --format json > ../TEST-WORKFLOW/QUEUES/RAW-INPUTS/eslint-results.json 2>/dev/null

# SonarQube (if running)
if curl -s http://localhost:9000 > /dev/null; then
    echo "  • SonarQube scan..."
    sonar-scanner -Dsonar.format=json > ../TEST-WORKFLOW/QUEUES/RAW-INPUTS/sonarqube-results.json
fi

cd ../TEST-WORKFLOW

# 2. Parse all sources
echo ""
echo "📥 Step 2: Parsing error sources..."
python3 parse-sonarqube.py
./parse-typescript-errors.sh
./parse-eslint.sh

# 3. Distribute to queues
echo ""
echo "📊 Step 3: Distributing to session queues..."
./distribute-to-sessions.sh

# 4. Generate status report
echo ""
echo "📋 Step 4: Generating status report..."
cat > INGESTION-REPORT.md << EOF
# Error Ingestion Report
**Timestamp**: $(date)
**Total Errors Ingested**: $TOTAL

## Distribution by Severity
- BLOCKER: $BLOCKER_COUNT (Session 1)
- CRITICAL: $CRITICAL_COUNT (Session 2)
- MAJOR: $MAJOR_COUNT (Session 3)
- MINOR: $MINOR_COUNT (Session 4)
- INFO: $INFO_COUNT (Session 5)

## Ready for Processing
All errors have been parsed and distributed to session queues.
5 parallel sessions can now begin processing.

## Next Steps
1. Initialize each session: ./init-session.sh session-X
2. Start processing: ./claim-next.sh
3. Monitor progress: ./monitor-all.sh
EOF

echo ""
echo "✅ INGESTION COMPLETE!"
echo "   $TOTAL errors ready for processing"
echo "   See INGESTION-REPORT.md for details"
```

---

## 📋 ERROR FORMAT IN QUEUE

### Each Error File Contains:

```json
{
  "id": "SQ-00234",
  "source": "SonarQube",
  "severity": "CRITICAL",
  "category": "ASYNC-AWAIT",
  "rule": "typescript:S4123",
  "file": "src/app/api/payments/process.ts",
  "line": 45,
  "message": "Await is used on a non-Promise value",
  "effort": "10min",
  "fix_instructions": "Remove unnecessary await on line 45",
  "verification_requirements": [
    "Run full test suite",
    "Check pattern with Ref MCP",
    "Deploy security agent",
    "Verify payment flow still works"
  ],
  "ref_mcp_queries": [
    "site:wedsync payments async patterns",
    "TypeScript S4123 fix",
    "payment processing await usage"
  ],
  "required_agents": [
    "pre-code-knowledge-gatherer",
    "security-compliance-officer",
    "test-automation-architect"
  ],
  "connected_features": ["checkout", "invoicing"],
  "business_impact": "Payment processing reliability",
  "fix_complexity": "low",
  "rollback_instructions": "git checkout -- src/app/api/payments/process.ts"
}
```

---

## 🎬 HOW A SESSION PROCESSES ERRORS

### Session Workflow:

```bash
# Session 1 (BLOCKER issues)
cd TEST-WORKFLOW/QUEUES/PROCESSING/session-1-working

# 1. Claim next error
./claim-next.sh
# Output: "Claimed: SQ-00234.json"

# 2. Read error details
cat SQ-00234.json

# 3. In Claude, process with full intelligence:
```

```typescript
// Claude processes the error:

// 1. Use Ref MCP to understand patterns
const patterns = await ref_search("site:wedsync payments async patterns");

// 2. Deploy knowledge gatherer
await Task({
  subagent_type: "general-purpose",
  prompt: "Understand context of payment processing in process.ts line 45"
});

// 3. Apply fix based on patterns
// ... make the code change ...

// 4. Run verification
bash('./verify-changes.sh');

// 5. Deploy verification agents
await Task({
  subagent_type: "general-purpose",
  prompt: "Security audit this payment processing fix"
});

// 6. Commit if all pass
if (all_verification_passed) {
  git commit -m "fix: Remove unnecessary await in payment processing (SQ-00234)";
}
```

---

## 📊 MONITORING INGESTION

### Real-time Statistics:

```bash
#!/bin/bash
# monitor-ingestion.sh

while true; do
  clear
  echo "📊 ERROR QUEUE STATUS"
  echo "===================="
  echo ""
  
  for SEVERITY in BLOCKER CRITICAL MAJOR MINOR INFO; do
    TOTAL=$(ls QUEUES/BY-SEVERITY/$SEVERITY/*.json 2>/dev/null | wc -l)
    PROCESSED=$(ls QUEUES/PROCESSED/$SEVERITY/*.json 2>/dev/null | wc -l)
    REMAINING=$((TOTAL - PROCESSED))
    
    printf "%-10s: %5d total | %5d processed | %5d remaining\n" \
           "$SEVERITY" "$TOTAL" "$PROCESSED" "$REMAINING"
  done
  
  echo ""
  echo "Processing Rate: $(ls QUEUES/PROCESSED/*/*.json 2>/dev/null | wc -l) errors/hour"
  
  sleep 30
done
```

---

## ✅ READY TO PROCESS

With this ingestion system:
1. **Errors flow automatically** from scans → queues → sessions
2. **Each error has complete context** for intelligent fixing
3. **Verification requirements** are pre-defined
4. **Ref MCP queries** are ready to use
5. **Required agents** are specified

**The pipeline is: Scan → Parse → Queue → Claim → Fix → Verify → Commit**

Your workflow can now handle any volume of errors systematically!