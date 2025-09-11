# 📅 DAILY COMMIT & PROGRESS CHECK

Think hard about what was accomplished today and prepare daily commit.

## 1. Check Current Status
```bash
cd wedsync
git status
git diff --stat
```

## 2. Run Verification Suite
```bash
npm run build
npm run test:coverage
npm run security:scan
```

## 3. Create Daily Branch
```bash
git checkout -b daily/$(date +%Y-%m-%d)
git add .
```

## 4. Generate Commit Message
```bash
git commit -m "daily: Progress update $(date +%Y-%m-%d)

Features worked on:
- Session A: [CHECK SESSION LOGS]
- Session B: [CHECK SESSION LOGS]
- Session C: [CHECK SESSION LOGS]

Tests: [PASTE COVERAGE %]
Security: [PASTE SCAN RESULTS]
Build: [SUCCESS/FAIL]

Next: [TOMORROW'S PRIORITIES FROM PROJECT-STATUS.md]"
```

## 5. Push and Create PR
```bash
git push origin daily/$(date +%Y-%m-%d)
gh pr create --title "Daily Progress - $(date +%Y-%m-%d)" --body "
## Today's Progress

### Session Reports
- Session A: [Link to report]
- Session B: [Link to report]
- Session C: [Link to report]

### Metrics
- Test Coverage: X%
- Security Score: X/10
- Build Status: ✅/❌

### Evidence
- Screenshots in /screenshots/
- Test reports in /coverage/
- Playwright results in /playwright-report/

Waiting for CodeRabbit review...
"
```

## 6. Update PROJECT-STATUS.md
Update the status document with:
- New completion percentages
- Tomorrow's priorities
- Any new blockers
- Security score
- Test coverage

## 7. Rotate Session Prompts
```bash
# Archive today's prompts
mv session-prompts/yesterday/* session-prompts/archive/$(date -d yesterday +%Y-%m-%d)/ 2>/dev/null || true
mv session-prompts/today/* session-prompts/yesterday/
mkdir -p session-prompts/today
```

Create tomorrow's prompts in session-prompts/today/