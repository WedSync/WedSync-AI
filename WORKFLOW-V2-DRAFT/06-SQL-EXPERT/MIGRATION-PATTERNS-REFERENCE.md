# 🔧 SQL MIGRATION PATTERNS - QUICK REFERENCE
## Copy-Paste Solutions for Common Migration Issues

---

## 🚀 QUICK START FOR NEW SESSION

```bash
# 1. Navigate to project
cd /Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync

# 2. Check migration status
ls -la supabase/migrations/ | wc -l  # Count migrations
ls supabase/migrations/ | head -5    # See first few

# 3. Check for common issues
grep -l "auth.user_organization_id" supabase/migrations/*.sql | wc -l
grep -l "FROM users" supabase/migrations/*.sql | wc -l
grep -l "EXCLUDE USING GIST" supabase/migrations/*.sql | wc -l

# 4. Apply fix script if issues found
./fix-supabase-patterns.sh

# 5. Attempt migration
npx supabase migration up --linked --include-all
```

---

## 📋 COPY-PASTE FIX PATTERNS

### Fix 1: Auth Function Pattern
```bash
# Apply to all files at once
for file in supabase/migrations/*.sql; do
  sed -i '' 's/auth\.user_organization_id()/(SELECT organization_id FROM user_profiles WHERE user_id = auth.uid() LIMIT 1)/g' "$file"
done
```

### Fix 2: Admin Check Pattern
```bash
# Apply to all files
for file in supabase/migrations/*.sql; do
  sed -i '' "s/auth\.is_organization_admin()/(SELECT role IN ('ADMIN', 'OWNER') FROM user_profiles WHERE user_id = auth.uid() LIMIT 1)/g" "$file"
done
```

### Fix 3: Users Table Reference
```bash
# Apply to all files
for file in supabase/migrations/*.sql; do
  sed -i '' 's/FROM users/FROM user_profiles/g' "$file"
  sed -i '' 's/REFERENCES users/REFERENCES user_profiles/g' "$file"
done
```

### Fix 4: View/Table Conflict
```bash
# When you see "ERROR: 'table_name' is a view"
# Find the migration file
grep -n "CREATE TABLE.*table_name" supabase/migrations/*.sql

# Add DROP VIEW before CREATE TABLE
sed -i '' '/CREATE TABLE.*table_name/i\
DROP VIEW IF EXISTS table_name;' [migration_file.sql]
```

### Fix 5: GIST Constraint
```bash
# Find GIST constraints with UUID
grep -n "EXCLUDE USING GIST.*UUID" supabase/migrations/*.sql

# Replace with UNIQUE constraint manually
# Original: EXCLUDE USING GIST (supplier_id WITH =, scheduled_at WITH =)
# Replace:  CONSTRAINT unique_booking UNIQUE (supplier_id, scheduled_at)
```

---

## 🔍 DIAGNOSTIC COMMANDS

### Check Migration Order
```bash
# List migrations in order
ls supabase/migrations/*.sql | sort

# Check for dependency issues
for file in supabase/migrations/*.sql; do
  echo "=== $(basename $file) ==="
  grep "REFERENCES" "$file" | cut -d' ' -f3 | sort -u
done
```

### Find Problem Patterns
```bash
# All-in-one problem finder
echo "🔍 Scanning for known issues..."
echo "Auth functions: $(grep -l "auth\.user_organization_id\|auth\.is_organization_admin" supabase/migrations/*.sql | wc -l) files"
echo "Users table refs: $(grep -l "FROM users\|REFERENCES users" supabase/migrations/*.sql | wc -l) files"
echo "GIST constraints: $(grep -l "EXCLUDE USING GIST" supabase/migrations/*.sql | wc -l) files"
echo "Transaction issues: $(grep -l "BEGIN;" supabase/migrations/*.sql | wc -l) files with BEGIN"
```

### Check Specific Migration
```bash
# Quick check single file
FILE="supabase/migrations/[filename].sql"
echo "Checking $FILE..."
grep -n "auth\.user_organization_id\|auth\.is_organization_admin" "$FILE"
grep -n "FROM users\|REFERENCES users" "$FILE"
grep -n "EXCLUDE USING GIST" "$FILE"
```

---

## 🛠️ COMPLETE FIX SCRIPT

Save this as `fix-all-migrations.sh`:

```bash
#!/bin/bash

echo "🔧 Comprehensive Migration Fix Script"
echo "====================================="

# Backup first
BACKUP_DIR="migrations-backup-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP_DIR"
cp -r supabase/migrations "$BACKUP_DIR/"
echo "✅ Backup created: $BACKUP_DIR"

# Count issues before
ISSUES_BEFORE=$(grep -l "auth\.user_organization_id\|auth\.is_organization_admin\|FROM users\|EXCLUDE USING GIST" supabase/migrations/*.sql | wc -l)
echo "Found issues in $ISSUES_BEFORE files"

# Apply all fixes
for file in supabase/migrations/*.sql; do
  if [ -f "$file" ]; then
    # Auth functions
    sed -i '' 's/auth\.user_organization_id()/(SELECT organization_id FROM user_profiles WHERE user_id = auth.uid() LIMIT 1)/g' "$file"
    sed -i '' "s/auth\.is_organization_admin()/(SELECT role IN ('ADMIN', 'OWNER') FROM user_profiles WHERE user_id = auth.uid() LIMIT 1)/g" "$file"
    
    # Table references
    sed -i '' 's/FROM users WHERE id = auth\.uid()/FROM user_profiles WHERE user_id = auth.uid()/g' "$file"
    sed -i '' 's/FROM users/FROM user_profiles/g' "$file"
    sed -i '' 's/REFERENCES users/REFERENCES user_profiles/g' "$file"
    
    # Performance optimization
    sed -i '' 's/auth\.uid() =/( SELECT auth.uid() ) =/g' "$file"
    sed -i '' 's/= auth\.uid()/= ( SELECT auth.uid() )/g' "$file"
  fi
done

# Count issues after
ISSUES_AFTER=$(grep -l "auth\.user_organization_id\|auth\.is_organization_admin\|FROM users WHERE\|EXCLUDE USING GIST" supabase/migrations/*.sql | wc -l)
echo "✅ Fixed $(($ISSUES_BEFORE - $ISSUES_AFTER)) files"
echo "Remaining issues: $ISSUES_AFTER files"

echo ""
echo "Ready to migrate! Run:"
echo "  npx supabase migration up --linked --include-all"
```

---

## 🚨 EMERGENCY FIXES

### When Migration Fails Mid-Way
```bash
# 1. Find which migration failed
npx supabase migration list --linked | grep "pending"

# 2. Read the error carefully
# Common: "relation does not exist" - missing dependency
# Common: "is a view" - need DROP VIEW first
# Common: "syntax error" - check the specific line

# 3. Fix just that migration
vim supabase/migrations/[failed_migration].sql

# 4. Retry from that point
npx supabase migration up --linked --from [migration_name]
```

### When Everything is Broken
```bash
# Nuclear option - start fresh (WARNING: Loses data)
npx supabase db reset --linked

# Then apply all fixed migrations
npx supabase migration up --linked --include-all
```

### Connection Issues
```bash
# Check if Docker is running
docker info

# If not, start Docker Desktop
open -a "Docker Desktop"
sleep 10

# Check Supabase project status
npx supabase status

# Re-link if needed (requires password)
npx supabase link --project-ref [YOUR_PROJECT_ID]
```

---

## 📊 VALIDATION AFTER MIGRATION

```bash
# Check what was created
echo "Tables created:"
echo "SELECT COUNT(*) as table_count FROM information_schema.tables WHERE table_schema = 'public';" | psql [CONNECTION]

echo "RLS policies:"
echo "SELECT COUNT(*) as policy_count FROM pg_policies;" | psql [CONNECTION]

echo "Indexes:"
echo "SELECT COUNT(*) as index_count FROM pg_indexes WHERE schemaname = 'public';" | psql [CONNECTION]
```

---

## 💡 PRO TIPS

1. **Always backup before fixing**
   ```bash
   cp -r supabase/migrations migrations-backup-$(date +%Y%m%d-%H%M%S)
   ```

2. **Test one migration at a time when debugging**
   ```bash
   npx supabase migration up --linked --file [specific_migration.sql]
   ```

3. **Check logs for detailed errors**
   ```bash
   npx supabase migration up --linked --debug
   ```

4. **Use MCP for direct database access**
   ```bash
   claude mcp list  # Check if postgres MCP is connected
   ```

5. **Keep a success log**
   ```bash
   echo "$(date): Successfully applied migrations up to [migration_name]" >> migration-success.log
   ```

---

**Quick Command when starting fresh session:**
```bash
cd /Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync && \
ls supabase/migrations/*.sql | wc -l && \
grep -l "auth\.user_organization_id" supabase/migrations/*.sql | wc -l && \
echo "Ready to fix and migrate!"
```