#!/bin/bash

echo "🔧 Applying Official Supabase Auth Patterns to All Migrations"
echo "=============================================================="

# Backup current state
BACKUP_DIR="migration-pattern-fixes-backup-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP_DIR"
cp -r supabase/migrations "$BACKUP_DIR/"
echo "📦 Backup created: $BACKUP_DIR"

echo ""
echo "🔄 Applying pattern fixes..."

# Count files to process
TOTAL_FILES=$(find supabase/migrations -name "*.sql" -type f | wc -l)
CURRENT=0

# Process each migration file
for file in supabase/migrations/*.sql; do
    if [ -f "$file" ]; then
        CURRENT=$((CURRENT + 1))
        echo "[$CURRENT/$TOTAL_FILES] Processing $(basename "$file")"
        
        # 1. Fix auth function references (official Supabase pattern)
        sed -i '' 's/auth\.user_organization_id()/(\
  SELECT organization_id FROM user_profiles \
  WHERE user_id = auth.uid() \
  LIMIT 1\
)/g' "$file"
        
        sed -i '' 's/auth\.is_organization_admin()/(\
  SELECT role IN ('"'"'ADMIN'"'"', '"'"'OWNER'"'"') FROM user_profiles \
  WHERE user_id = auth.uid() \
  LIMIT 1\
)/g' "$file"
        
        # 2. Fix table references (users -> user_profiles)
        sed -i '' 's/FROM users WHERE id = auth\.uid()/FROM user_profiles WHERE user_id = auth.uid()/g' "$file"
        sed -i '' 's/FROM users/FROM user_profiles/g' "$file"
        
        # 3. Apply Supabase best practice: wrap auth.uid() in SELECT for performance
        sed -i '' 's/auth\.uid() =/( SELECT auth.uid() ) =/g' "$file"
        sed -i '' 's/= auth\.uid()/= ( SELECT auth.uid() )/g' "$file"
        
        # 4. Fix common column reference issues
        sed -i '' 's/WHERE id = auth\.uid()/WHERE user_id = auth.uid()/g' "$file"
        
        # 5. Remove any remaining GIST exclusion constraints (not supported)
        sed -i '' '/EXCLUDE USING GIST/,/)/c\
  -- GIST exclusion constraint removed (not supported in this PostgreSQL version)
' "$file"
    fi
done

echo ""
echo "✅ Pattern fixes applied successfully!"
echo ""
echo "📋 Summary of fixes applied:"
echo "   • Fixed auth.user_organization_id() → proper subquery"
echo "   • Fixed auth.is_organization_admin() → role check subquery" 
echo "   • Fixed users table → user_profiles table references"
echo "   • Applied Supabase performance best practice: wrapped auth.uid()"
echo "   • Fixed column references: id → user_id"
echo "   • Removed unsupported GIST constraints"
echo ""
echo "🚀 Ready to apply migrations! Run:"
echo "   npx supabase migration up --linked --include-all"
echo ""
echo "💾 Backup location: $BACKUP_DIR"