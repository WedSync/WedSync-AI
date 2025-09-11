#!/bin/bash
# Deep Agent Production Workflow

echo "🧠 DEEP AGENT PRODUCTION WORKFLOW"
echo "================================="
echo "Job: e28727f5-3935-4d53-af33-cec9dfa09be6"
echo "Session: deep-agent-114009"
echo "Complexity: 7/10"
echo ""
echo "🔍 Job Details:"
echo "  File: wedsync/src/__tests__/cross-platform/presence-compatibility.test.ts"
echo "  Line: $(cat '/Volumes/Extreme Pro/CODE/WedSync 2.0/WedSync Dev/TEST-WORKFLOW/JOB-QUEUES/PROCESSING/deep-agent-114009/job-live-0402.json' | python3 -c 'import json,sys; print(json.load(sys.stdin)[\"issue\"][\"line\"])')"
echo "  Agents: architecture-reviewer"
echo "  Verification: COMPREHENSIVE"
echo ""
echo "🧠 Deep Workflow:"
echo "  1. Deploy required agents (architecture-reviewer)"
echo "  2. Use Ref MCP for pattern research"
echo "  3. Implement fix with comprehensive testing"
echo "  4. Get security approvals if needed"
echo "  5. Commit only after all verifications pass"
echo ""
echo "🤖 Agent Deployment Examples:"
if [[ "architecture-reviewer" == *"security-officer"* ]]; then
echo "  Task({ subagent_type: 'general-purpose',"
echo "        prompt: 'Security compliance review for e28727f5-3935-4d53-af33-cec9dfa09be6' })"
fi
if [[ "architecture-reviewer" == *"architecture-reviewer"* ]]; then
echo "  Task({ subagent_type: 'general-purpose',"
echo "        prompt: 'Architecture impact analysis for e28727f5-3935-4d53-af33-cec9dfa09be6' })"
fi
echo ""
echo "🔓 When done: ../claim-deep-job.sh release deep-agent-114009"
