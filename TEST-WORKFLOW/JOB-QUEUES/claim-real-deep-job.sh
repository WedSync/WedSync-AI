#!/bin/bash
# Deep Agent Job Claimer - Production Ready
# Claims next available deep job (complex, security-sensitive, requires full verification)

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
JOB_QUEUES_DIR="$SCRIPT_DIR"
DEEP_JOBS_DIR="$JOB_QUEUES_DIR/REAL-DEEP-JOBS"
PROCESSING_DIR="$JOB_QUEUES_DIR/PROCESSING"

# Create processing directory if needed
mkdir -p "$PROCESSING_DIR"

# Function to find and claim next deep job
claim_next_deep_job() {
    local session_id="${1:-deep-$(date +%H%M%S)}"
    local claimed_job=""
    
    echo "🧠 PRODUCTION Deep Agent: Claiming complex job for session $session_id..."
    
    # Prioritize by criticality: security > architecture > performance > new-patterns
    local job_priorities=("security-sensitive" "architecture-changes" "performance-critical" "new-patterns")
    
    for category in "${job_priorities[@]}"; do
        category_dir="$DEEP_JOBS_DIR/$category"
        if [ -d "$category_dir" ]; then
            echo "   🔍 Checking $category jobs..."
            
            # Find first available job in this category
            for job_file in "$category_dir"/*.json; do
                if [ -f "$job_file" ] && [[ "$(basename "$job_file")" != ._* ]]; then
                    job_id=$(basename "$job_file" .json)
                    lock_file="$category_dir/${job_id}.lock"
                    
                    # Try to claim with lock
                    if (set -C; echo "$session_id" > "$lock_file") 2>/dev/null; then
                        echo "✅ CLAIMED: $job_id (category: $category)"
                        
                        # Move job to processing
                        session_dir="$PROCESSING_DIR/$session_id"
                        mkdir -p "$session_dir"
                        
                        cp "$job_file" "$session_dir/"
                        claimed_job="$session_dir/$(basename "$job_file")"
                        
                        # Remove from queue (but keep lock)
                        rm "$job_file"
                        
                        break 2  # Break out of both loops
                    fi
                fi
            done
        fi
    done
    
    if [ -n "$claimed_job" ]; then
        echo ""
        echo "🧠 PRODUCTION DEEP JOB DETAILS:"
        echo "════════════════════════════════"
        
        # Parse and display job details
        job_type=$(python3 -c "import json; data=json.load(open('$claimed_job')); print(data['job_type'])")
        issue_id=$(python3 -c "import json; data=json.load(open('$claimed_job')); print(data['issue']['id'])")
        file_path=$(python3 -c "import json; data=json.load(open('$claimed_job')); print(data['issue']['file_path'])")
        message=$(python3 -c "import json; data=json.load(open('$claimed_job')); print(data['issue']['message'])")
        complexity=$(python3 -c "import json; data=json.load(open('$claimed_job')); print(data['complexity_score'])")
        estimated_minutes=$(python3 -c "import json; data=json.load(open('$claimed_job')); print(data['estimated_minutes'])")
        requires_agents=$(python3 -c "import json; data=json.load(open('$claimed_job')); print(', '.join(data['requires_agents']) if data['requires_agents'] else 'None')")
        verification_level=$(python3 -c "import json; data=json.load(open('$claimed_job')); print(data['verification_level'])")
        
        echo "🆔 Job ID: $issue_id"
        echo "🧠 Type: $job_type (COMPREHENSIVE)"
        echo "📁 File: $file_path"
        echo "🔥 Complexity: $complexity/10"
        echo "⏰ Estimated: $estimated_minutes minutes"
        echo "🔒 Verification: $verification_level"
        echo "🤖 Required Agents: $requires_agents"
        echo "💬 Issue: $message"
        
        echo ""
        echo "🧠 DEEP AGENT PRODUCTION INSTRUCTIONS:"
        echo "═══════════════════════════════════════"
        echo "1. 🔍 DEEP MODE: Use comprehensive verification pipeline"
        echo "2. 🤖 Deploy agents: $requires_agents"
        echo "3. 📖 Research: Use Ref MCP for pattern analysis"
        echo "4. 🛠️  Implement: Apply fix with full testing"
        echo "5. 🔒 Security: Get required approvals"
        echo "6. ✅ Commit: Only after all verifications pass"
        
        if [ "$complexity" -ge 8 ]; then
            echo ""
            echo "⚠️  🚨 HIGH COMPLEXITY WARNING:"
            echo "   - Complexity score: $complexity/10 (MAXIMUM)"
            echo "   - Consider breaking into smaller steps"
            echo "   - Extra caution with security/performance"
            echo "   - Document all architectural decisions"
        fi
        
        if [[ "$requires_agents" == *"security-officer"* ]]; then
            echo ""
            echo "🔒 🚨 SECURITY REVIEW MANDATORY:"
            echo "   - Deploy security compliance officer agent"
            echo "   - Complete security impact assessment" 
            echo "   - Get explicit approval before committing"
            echo "   - Document security considerations"
        fi
        
        echo ""
        echo "📂 Job file: $claimed_job"
        echo "🔓 Release command: ./claim-deep-job.sh release $session_id"
        
        # Create session convenience script
        cat > "$session_dir/deep-workflow.sh" << EOF
#!/bin/bash
# Deep Agent Production Workflow

echo "🧠 DEEP AGENT PRODUCTION WORKFLOW"
echo "================================="
echo "Job: $issue_id"
echo "Session: $session_id"
echo "Complexity: $complexity/10"
echo ""
echo "🔍 Job Details:"
echo "  File: $file_path"
echo "  Line: \$(cat '$claimed_job' | python3 -c 'import json,sys; print(json.load(sys.stdin)[\"issue\"][\"line\"])')"
echo "  Agents: $requires_agents"
echo "  Verification: $verification_level"
echo ""
echo "🧠 Deep Workflow:"
echo "  1. Deploy required agents ($requires_agents)"
echo "  2. Use Ref MCP for pattern research"
echo "  3. Implement fix with comprehensive testing"
echo "  4. Get security approvals if needed"
echo "  5. Commit only after all verifications pass"
echo ""
echo "🤖 Agent Deployment Examples:"
if [[ "$requires_agents" == *"security-officer"* ]]; then
echo "  Task({ subagent_type: 'general-purpose',"
echo "        prompt: 'Security compliance review for $issue_id' })"
fi
if [[ "$requires_agents" == *"architecture-reviewer"* ]]; then
echo "  Task({ subagent_type: 'general-purpose',"
echo "        prompt: 'Architecture impact analysis for $issue_id' })"
fi
echo ""
echo "🔓 When done: ../claim-deep-job.sh release $session_id"
EOF
        chmod +x "$session_dir/deep-workflow.sh"
        
        return 0
    else
        echo "❌ No deep jobs available."
        echo "💡 Try: ./claim-speed-job.sh claim for simple work"
        echo "📊 Status: ./claim-deep-job.sh status"
        return 1
    fi
}

# Function to show available jobs
show_available_jobs() {
    echo "📊 PRODUCTION Deep Jobs Available:"
    echo "══════════════════════════════════"
    
    total_jobs=0
    total_minutes=0
    
    for category_dir in "$DEEP_JOBS_DIR"/*/; do
        if [ -d "$category_dir" ]; then
            category_name=$(basename "$category_dir")
            job_count=$(find "$category_dir" -name "*.json" -not -name "._*" | wc -l)
            total_jobs=$((total_jobs + job_count))
            
            if [ "$job_count" -gt 0 ]; then
                echo "  🧠 $category_name: $job_count jobs"
                
                # Show sample jobs with complexity
                for job_file in "$category_dir"/*.json; do
                    if [ -f "$job_file" ] && [[ "$(basename "$job_file")" != ._* ]]; then
                        complexity=$(python3 -c "import json; data=json.load(open('$job_file')); print(data['complexity_score'])" 2>/dev/null || echo "?")
                        estimated=$(python3 -c "import json; data=json.load(open('$job_file')); print(data['estimated_minutes'])" 2>/dev/null || echo "?")
                        total_minutes=$((total_minutes + estimated))
                        echo "    - $(basename "$job_file" .json): complexity $complexity, ~${estimated}min"
                    fi
                done | head -3
            fi
        fi
    done
    
    echo "📈 Total Deep Jobs: $total_jobs jobs (~$total_minutes minutes)"
    
    if [ "$total_jobs" -gt 0 ]; then
        echo ""
        echo "💰 Estimated Value:"
        echo "  🧠 Deep jobs: $total_jobs × 25 min avg = ~$((total_jobs * 25)) minutes"
        echo "  🎯 Parallel capacity: 2 agents × 2.4 jobs/hour = 4.8 jobs/hour"
        echo "  ⏰ Completion time: ~$((total_jobs / 5)) hours with 2 deep agents"
        echo ""
        echo "🚨 Priority Categories:"
        echo "  1. 🔒 security-sensitive (HIGHEST)"
        echo "  2. 🏗️  architecture-changes (HIGH)"
        echo "  3. ⚡ performance-critical (MEDIUM)"
        echo "  4. 🆕 new-patterns (LOW)"
    fi
}

# Function to release job lock (same as speed job)
release_job_lock() {
    local session_id="$1"
    if [ -z "$session_id" ]; then
        echo "Usage: $0 release <session_id>"
        return 1
    fi
    
    echo "🔓 Releasing locks for deep session $session_id..."
    
    # Remove lock files
    find "$DEEP_JOBS_DIR" -name "*.lock" -exec grep -l "$session_id" {} \; -delete
    
    # Clean up processing directory
    rm -rf "$PROCESSING_DIR/$session_id"
    
    echo "✅ Deep session $session_id locks released"
}

# Main command handling
case "${1:-claim}" in
    "claim")
        claim_next_deep_job "$2"
        ;;
    "status"|"available")
        show_available_jobs
        ;;
    "release")
        release_job_lock "$2"
        ;;
    *)
        echo "PRODUCTION Deep Agent Job Claimer"
        echo "Usage: $0 {claim|status|release} [session_id]"
        echo ""
        echo "Commands:"
        echo "  claim [session_id]     - Claim next deep job for processing"
        echo "  status                 - Show available deep jobs by priority"
        echo "  release <session_id>   - Release locks and cleanup session"
        echo ""
        echo "Examples:"
        echo "  $0 claim deep-001      - Claim job for deep-001 session"
        echo "  $0 status              - Show job queue status and priorities"
        echo "  $0 release deep-001    - Release deep-001 session"
        exit 1
        ;;
esac