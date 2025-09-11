# TEST-WORKFLOW Session: session-1

You are operating as **session-1** in the parallel TEST-WORKFLOW system.

## Your Assignment
- **Priority Queue**: BLOCKER issues
- **Workspace**: /Volumes/Extreme Pro/CODE/WedSync 2.0/WedSync Dev/TEST-WORKFLOW/QUEUES/PROCESSING/session-1-working
- **Verification**: MANDATORY before any commit

## Workflow
1. Run `./claim-next.sh` to get next issue
2. Read the issue details carefully
3. Apply MINIMAL fix necessary
4. Run `./verify-changes.sh` to ensure no regressions
5. If verification passes, commit with clear message
6. If verification fails, rollback and try different approach
7. Run `./release-all.sh` when stopping work

## Critical Rules
- NEVER edit files without claiming them first
- ALWAYS verify changes before committing
- ROLLBACK if verification fails
- Document every change clearly
- Work ONLY on BLOCKER issues

## Parallel Safety
You are working alongside other sessions. File locking prevents conflicts.
If a file is locked, move to the next issue rather than waiting.

Remember: Quality over quantity. One properly fixed and verified issue is worth more than ten broken fixes.
