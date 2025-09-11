# 🚀 SETUP PARALLEL DEVELOPMENT WITH GIT WORKTREES

Think ultra hard about how to maximize parallel development efficiency!

## What Are Git Worktrees?
Git worktrees allow multiple working directories from the same repository.
This enables running 3+ Claude Code sessions simultaneously without conflicts!

## Setup Parallel Worktrees
```bash
cd /Users/skyphotography/CODE/WedSync-2.0/WedSync2

# Create worktree for frontend work
git worktree add ../WedSync2-frontend main
echo "Frontend worktree created at ../WedSync2-frontend"

# Create worktree for backend work  
git worktree add ../WedSync2-backend main
echo "Backend worktree created at ../WedSync2-backend"

# Create worktree for testing work
git worktree add ../WedSync2-testing main
echo "Testing worktree created at ../WedSync2-testing"

# List all worktrees
git worktree list
```

## Launch Parallel Claude Sessions
```bash
# Terminal 1 - Frontend
cd ../WedSync2-frontend/wedsync
claude "Think hard about UI improvements. You are Session A working on frontend only."

# Terminal 2 - Backend
cd ../WedSync2-backend/wedsync
claude "Think hard about API optimization. You are Session B working on backend only."

# Terminal 3 - Testing
cd ../WedSync2-testing/wedsync
claude "Think hard about test coverage. You are Session C working on tests only."
```

## Benefits
- 3x development speed
- No merge conflicts during work
- Each session has isolated environment
- Can run different features simultaneously
- Easy to merge when ready

## Merge Work Back
```bash
# In each worktree
git add .
git commit -m "feature: [description]"
git push origin HEAD

# Create PRs for review
gh pr create --title "Feature: [Name]" --body "Developed in parallel worktree"
```

## Cleanup When Done
```bash
# Remove worktrees when no longer needed
git worktree remove ../WedSync2-frontend
git worktree remove ../WedSync2-backend
git worktree remove ../WedSync2-testing
git worktree prune
```

REMEMBER: This is the KEY to 3x productivity!