#!/bin/bash
# Speed Agent Production Workflow

echo "⚡ SPEED AGENT PRODUCTION WORKFLOW"
echo "================================="
echo "Job: 3fa6d913-3c01-45f5-9a12-2e8fde9c81ac"
echo "Session: test-auto-chain" 
echo ""
echo "🚀 Quick Commands:"
echo "  File: wedsync/src/__tests__/api/content/content.test.ts"
echo "  Line: $(cat '/Volumes/Extreme Pro/CODE/WedSync 2.0/WedSync Dev/TEST-WORKFLOW/JOB-QUEUES/PROCESSING/test-auto-chain/job-live-0130.json' | python3 -c 'import json,sys; print(json.load(sys.stdin)[\"issue\"][\"line\"])')"
echo "  Pattern: pattern-general"
echo ""
echo "⚡ Speed Workflow:"
echo "  1. Edit file with pattern fix (5 min max)"
echo "  2. Run basic verification"
echo "  3. Commit and move to next job"
echo ""
echo "🔓 When done: ../claim-speed-job.sh release test-auto-chain"
