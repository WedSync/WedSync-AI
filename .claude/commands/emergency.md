# 🚨 EMERGENCY FIX MODE

Think ultra hard about the root cause and fastest safe solution!

## 1. Stop Everything
```bash
# Kill all running processes
pkill -f "npm run dev"
pkill -f "next dev"
pkill -f "playwright"
```

## 2. Diagnose Current State
```bash
cd wedsync

# Check build status
npm run build 2>&1 | head -20

# Check for missing dependencies
npm ls --depth=0 | grep UNMET

# Check current git status
git status
git diff --stat
```

## 3. Common Emergency Fixes

### Build Broken (MODULE_NOT_FOUND)
```bash
rm -rf node_modules package-lock.json
npm install
npm run build
```

### Type Errors
```bash
npm run typecheck 2>&1 | head -20
# Fix the specific type errors shown
```

### Database Connection Failed
```bash
# Check Supabase connection
npx prisma db pull
npx prisma generate
```

### Tests Failing
```bash
npm test -- --no-coverage 2>&1 | head -50
# Fix the specific failing tests
```

## 4. Verify Fix
```bash
npm run build
npm run dev &
sleep 5
curl -I http://localhost:3000
kill %1
```

## 5. Document What Happened
Create emergency report in /SESSION-LOGS/[date]/emergency-fix.md with:
- What broke
- Root cause
- Fix applied
- Prevention measures

REMEMBER: Think ultra hard before acting in emergency mode!