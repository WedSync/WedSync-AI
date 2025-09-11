#!/bin/bash
# Deep Agent Production Workflow

echo "🧠 DEEP AGENT PRODUCTION WORKFLOW"
echo "================================="
echo "Job: 856276f2-448a-4e8c-be52-955296c29ba3"
echo "Session: deep-agent-114856"
echo "Complexity: 5/10"
echo ""
echo "🔍 Job Details:"
echo "  File: wedsync/src/__tests__/backup-recovery/disaster-simulation.test.ts"
echo "  Line: $(cat '/Volumes/Extreme Pro/CODE/WedSync 2.0/WedSync Dev/TEST-WORKFLOW/JOB-QUEUES/PROCESSING/deep-agent-114856/job-live-0245.json' | python3 -c 'import json,sys; print(json.load(sys.stdin)[\"issue\"][\"line\"])')"
echo "  Agents: None"
echo "  Verification: COMPREHENSIVE"
echo ""
echo "🧠 Deep Workflow:"
echo "  1. Deploy required agents (None)"
echo "  2. Use Ref MCP for pattern research"
echo "  3. Implement fix with comprehensive testing"
echo "  4. Get security approvals if needed"
echo "  5. Commit only after all verifications pass"
echo ""
echo "🤖 Agent Deployment Examples:"
if [[ "None" == *"security-officer"* ]]; then
echo "  Task({ subagent_type: 'general-purpose',"
echo "        prompt: 'Security compliance review for 856276f2-448a-4e8c-be52-955296c29ba3' })"
fi
if [[ "None" == *"architecture-reviewer"* ]]; then
echo "  Task({ subagent_type: 'general-purpose',"
echo "        prompt: 'Architecture impact analysis for 856276f2-448a-4e8c-be52-955296c29ba3' })"
fi
echo ""
echo "🔓 When done: ../claim-deep-job.sh release deep-agent-114856"
