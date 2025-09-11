# 🚀 Quick Reference - Code Safeguarding

## 🔥 Emergency Commands (Copy & Paste)

### Return to Safe State
```bash
git checkout stable/v1.0-dev-complete
```

### Create Test Branch
```bash
git checkout stable/v1.0-dev-complete
git checkout -b test/toolname-$(date +%Y%m%d-%H%M)
```

### Quick Backup
```bash
tar -czf ~/Desktop/wedsync-quick-backup-$(date +%Y%m%d-%H%M).tar.gz --exclude='*/node_modules' .
```

### Abandon Changes
```bash
git reset --hard HEAD
git checkout stable/v1.0-dev-complete
```

## 📍 Your Safe Checkpoints

| Type | Name | Command to Return |
|------|------|-------------------|
| **Branch** | `stable/v1.0-dev-complete` | `git checkout stable/v1.0-dev-complete` |
| **Tag** | `v1.0-dev-complete` | `git checkout tags/v1.0-dev-complete` |
| **Script** | `safeguard-code.sh` | `./safeguard-code.sh` |
| **Backup** | Desktop tar files | `ls ~/Desktop/wedsync-backup-*.tar.gz` |

## 🔄 Testing Workflow (Step by Step)

```bash
# 1. Start fresh
git checkout stable/v1.0-dev-complete

# 2. Create test branch  
git checkout -b test/sonarqube-$(date +%Y%m%d)

# 3. Run your tool
# ... tool runs ...

# 4a. If it worked - keep changes
git add -A && git commit -m "Applied fixes from [tool]"

# 4b. If it broke - abandon
git checkout stable/v1.0-dev-complete
```

## ⚠️ Golden Rules

1. **NEVER** work directly on `main` or `stable/*`
2. **ALWAYS** create test branches
3. **TEST** after each tool
4. **DOCUMENT** what broke

## 📱 Status Check Commands

```bash
# What branch am I on?
git branch --show-current

# What's changed?
git status --short

# Show recent commits
git log --oneline -5

# List safety branches
git branch -a | grep -E "(stable|test|backup)"
```

## 🆘 Recovery Matrix

| Problem | Solution | Command |
|---------|----------|---------|
| Tool broke code | Return to stable | `git checkout stable/v1.0-dev-complete` |
| Lost changes | Check stash | `git stash list` |
| Wrong branch | Switch branch | `git checkout [branch-name]` |
| Everything broken | Fresh clone | `cd /tmp && git clone -b stable/v1.0-dev-complete [repo-url]` |
| Need yesterday's code | Use backup | `tar -xzf ~/Desktop/wedsync-backup-[date].tar.gz` |

## 📞 Important Locations

- **Main Guide:** `/WORKFLOW-V2-DRAFT/05-GIT-OPERATIONS/CODE-SAFEGUARDING-COMPLETE-GUIDE.md`
- **Safeguard Script:** `./safeguard-code.sh`
- **Stable Branch:** `stable/v1.0-dev-complete`
- **Backups:** `~/Desktop/wedsync-backup-*.tar.gz`

---
**Print this page and keep it handy during testing phase!**