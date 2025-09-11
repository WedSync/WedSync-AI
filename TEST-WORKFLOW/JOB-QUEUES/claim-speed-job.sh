#!/bin/bash
# Speed Agent Job Claimer - Production Ready
# Claims next available speed job (simple, pattern-based fixes)

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
JOB_QUEUES_DIR="$SCRIPT_DIR"
SPEED_JOBS_DIR="$JOB_QUEUES_DIR/SPEED-JOBS"
PROCESSING_DIR="$JOB_QUEUES_DIR/PROCESSING"

# Create processing directory if needed
mkdir -p "$PROCESSING_DIR"

# Function to find and claim next speed job
claim_next_speed_job() {
    local session_id="${1:-speed-$(date +%H%M%S)}"
    local claimed_job=""
    
    echo "⚡ PRODUCTION Speed Agent: Claiming job for session $session_id..."
    
    # Look through all speed job patterns
    for pattern_dir in "$SPEED_JOBS_DIR"/*/; do
        if [ -d "$pattern_dir" ]; then
            pattern_name=$(basename "$pattern_dir")
            echo "   🔍 Checking $pattern_name..."
            
            # Find first available job
            for job_file in "$pattern_dir"/*.json; do
                if [ -f "$job_file" ] && [[ "$(basename "$job_file")" != ._* ]]; then
                    job_id=$(basename "$job_file" .json)
                    lock_file="$pattern_dir/${job_id}.lock"
                    
                    # Try to claim with lock
                    if (set -C; echo "$session_id" > "$lock_file") 2>/dev/null; then
                        echo "✅ CLAIMED: $job_id (pattern: $pattern_name)"
                        
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
        echo "🎯 PRODUCTION SPEED JOB DETAILS:"
        echo "════════════════════════════════"
        
        # Parse and display job details
        job_type=$(python3 -c "import json; data=json.load(open('$claimed_job')); print(data['job_type'])")
        issue_id=$(python3 -c "import json; data=json.load(open('$claimed_job')); print(data['issue']['id'])")
        file_path=$(python3 -c "import json; data=json.load(open('$claimed_job')); print(data['issue']['file_path'])")
        message=$(python3 -c "import json; data=json.load(open('$claimed_job')); print(data['issue']['message'])")
        pattern=$(python3 -c "import json; data=json.load(open('$claimed_job')); print(data.get('pattern', 'N/A'))")
        estimated_minutes=$(python3 -c "import json; data=json.load(open('$claimed_job')); print(data['estimated_minutes'])")
        
        echo "🆔 Job ID: $issue_id"
        echo "⚡ Type: $job_type (FAST TRACK)"
        echo "📁 File: $file_path"
        echo "🔧 Pattern: $pattern"
        echo "⏰ Estimated: $estimated_minutes minutes"
        echo "💬 Issue: $message"
        
        echo ""
        echo "⚡ SPEED AGENT PRODUCTION INSTRUCTIONS:"
        echo "═════════════════════════════════════"
        echo "1. 🚀 SPEED MODE: Use streamlined verification only"
        echo "2. 🎯 Pattern: $pattern (apply established pattern)"
        echo "3. ⚡ Quick fix: Apply change using known pattern"
        echo "4. 🔍 Basic verification: Run basic tests only"
        echo "5. ✅ Fast commit: Commit when basic verification passes"
        echo "6. ➡️  Next job: Immediately claim next job"
        
        echo ""
        echo "📂 Job file: $claimed_job"
        echo "🔓 Release command: ./claim-speed-job.sh release $session_id"
        
        # Create session convenience script
        cat > "$session_dir/speed-workflow.sh" << EOF
#!/bin/bash
# Speed Agent Production Workflow

echo "⚡ SPEED AGENT PRODUCTION WORKFLOW"
echo "================================="
echo "Job: $issue_id"
echo "Session: $session_id" 
echo ""
echo "🚀 Quick Commands:"
echo "  File: $file_path"
echo "  Line: \$(cat '$claimed_job' | python3 -c 'import json,sys; print(json.load(sys.stdin)[\"issue\"][\"line\"])')"
echo "  Pattern: $pattern"
echo ""
echo "⚡ Speed Workflow:"
echo "  1. Edit file with pattern fix (5 min max)"
echo "  2. Run basic verification"
echo "  3. Commit and move to next job"
echo ""
echo "🔓 When done: ../claim-speed-job.sh release $session_id"
EOF
        chmod +x "$session_dir/speed-workflow.sh"
        
        return 0
    else
        echo "❌ No speed jobs available."
        echo "💡 Try: ./claim-deep-job.sh claim for complex work"
        echo "📊 Status: ./claim-speed-job.sh status"
        return 1
    fi
}

# Function to show available jobs
show_available_jobs() {
    echo "📊 PRODUCTION Speed Jobs Available:"
    echo "═══════════════════════════════════"
    
    total_jobs=0
    for pattern_dir in "$SPEED_JOBS_DIR"/*/; do
        if [ -d "$pattern_dir" ]; then
            pattern_name=$(basename "$pattern_dir")
            job_count=$(find "$pattern_dir" -name "*.json" -not -name "._*" | wc -l)
            total_jobs=$((total_jobs + job_count))
            
            if [ "$job_count" -gt 0 ]; then
                echo "  ⚡ $pattern_name: $job_count jobs"
            fi
        fi
    done
    
    echo "📈 Total Speed Jobs: $total_jobs jobs"
    
    if [ "$total_jobs" -gt 0 ]; then
        echo ""
        echo "💰 Estimated Value:"
        echo "  ⚡ Speed jobs: $total_jobs × 5 min = $((total_jobs * 5)) minutes"
        echo "  🎯 Parallel capacity: 3 agents × 12 jobs/hour = 36 jobs/hour"
        echo "  ⏰ Completion time: ~$((total_jobs / 36)) hours with 3 speed agents"
    fi
}

# Function to release job lock
release_job_lock() {
    local session_id="$1"
    if [ -z "$session_id" ]; then
        echo "Usage: $0 release <session_id>"
        return 1
    fi
    
    echo "🔓 Releasing locks for speed session $session_id..."
    
    # Remove lock files
    find "$SPEED_JOBS_DIR" -name "*.lock" -exec grep -l "$session_id" {} \; -delete
    
    # Clean up processing directory
    rm -rf "$PROCESSING_DIR/$session_id"
    
    echo "✅ Speed session $session_id locks released"
}

# Main command handling
case "${1:-claim}" in
    "claim")
        claim_next_speed_job "$2"
        ;;
    "status"|"available")
        show_available_jobs
        ;;
    "release")
        release_job_lock "$2"
        ;;
    *)
        echo "PRODUCTION Speed Agent Job Claimer"
        echo "Usage: $0 {claim|status|release} [session_id]"
        echo ""
        echo "Commands:"
        echo "  claim [session_id]     - Claim next speed job for processing"
        echo "  status                 - Show available speed jobs"
        echo "  release <session_id>   - Release locks and cleanup session"
        echo ""
        echo "Examples:"
        echo "  $0 claim speed-001     - Claim job for speed-001 session"
        echo "  $0 status              - Show job queue status"
        echo "  $0 release speed-001   - Release speed-001 session"
        exit 1
        ;;
esac