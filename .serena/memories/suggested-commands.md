# WedSync Development Commands

## Git Workflow (NEVER SKIP)
```bash
# Every Morning
git pull
git checkout -b today-[YYYY-MM-DD]

# Every Hour
git add .
git commit -m "Progress: [what was built]"
git push origin today-[YYYY-MM-DD]

# End of Day
git checkout main
git merge today-[YYYY-MM-DD]
git push origin main

# If Something Breaks
git stash  # Save current mess
git checkout main  # Go back to working version
```

## Essential Development Commands
```bash
# Check all MCP servers are connected
claude mcp list

# GitHub CLI operations (use with token)
GH_TOKEN=$GITHUB_PERSONAL_ACCESS_TOKEN gh pr create --title "Title" --body "Body"
GH_TOKEN=$GITHUB_PERSONAL_ACCESS_TOKEN gh pr list

# Supabase migrations
npx supabase migration up --linked
npx supabase migration list --linked

# Generate timestamp for new migration
date +%Y%m%d%H%M%S
```

## Project Structure Commands
```bash
# Navigate to main application
cd wedsync

# Check project status
npm run build
npm run typecheck
npm run lint

# Run tests
npm test
npm run test:coverage
```

## Testing & Quality Assurance
- Test everything (minimum 90% coverage)
- Run verification cycles after every feature
- Always test on mobile (iPhone SE - 375px minimum)
- Saturday = ABSOLUTELY NO DEPLOYMENTS (wedding day protocol)

## Wedding Day Protocol
- Saturdays = READ-ONLY MODE
- Response time must be <500ms
- Always have offline fallback
- Friday 6PM = Feature freeze until Monday