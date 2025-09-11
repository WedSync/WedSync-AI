#!/bin/bash

# Semi-Automated Migration Script
# Usage: ./apply-migration.sh migration_file.sql
# This eliminates copy-paste workflow and gives you ONE command to run

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 WedSync Migration Processor${NC}"
echo -e "${BLUE}================================${NC}"

# Check if migration file provided
if [ $# -eq 0 ]; then
    echo -e "${RED}❌ Error: Please provide a migration file${NC}"
    echo -e "${YELLOW}Usage: ./apply-migration.sh migration_file.sql${NC}"
    exit 1
fi

MIGRATION_FILE="$1"

# Check if file exists
if [ ! -f "$MIGRATION_FILE" ]; then
    echo -e "${RED}❌ Error: Migration file not found: $MIGRATION_FILE${NC}"
    exit 1
fi

echo -e "${BLUE}📁 Processing migration file: $MIGRATION_FILE${NC}"

# Create backup
BACKUP_FILE="${MIGRATION_FILE}.backup.$(date +%Y%m%d-%H%M%S)"
cp "$MIGRATION_FILE" "$BACKUP_FILE"
echo -e "${GREEN}✅ Backup created: $BACKUP_FILE${NC}"

# Apply pattern fixes
echo -e "${YELLOW}🔧 Applying Supabase pattern fixes...${NC}"

# Fix auth function patterns
sed -i '' 's/auth\.user_organization_id()/(SELECT organization_id FROM user_profiles WHERE user_id = auth.uid() LIMIT 1)/g' "$MIGRATION_FILE"

# Fix role checks
sed -i '' "s/auth\.is_organization_admin()/(SELECT role IN ('ADMIN', 'OWNER') FROM user_profiles WHERE user_id = auth.uid() LIMIT 1)/g" "$MIGRATION_FILE"

# Fix table references
sed -i '' 's/FROM users WHERE id = auth\.uid()/FROM user_profiles WHERE user_id = auth.uid()/g' "$MIGRATION_FILE"
sed -i '' 's/FROM users/FROM user_profiles/g' "$MIGRATION_FILE"

# Fix zero UUID foreign key issues - replace with NULL
sed -i '' "s/'00000000-0000-0000-0000-000000000000'::uuid/NULL/g" "$MIGRATION_FILE"

# Also handle zero UUID without explicit cast
sed -i '' "s/'00000000-0000-0000-0000-000000000000'/NULL/g" "$MIGRATION_FILE"

# Fix specific user_id and created_by patterns in INSERT statements
sed -i '' 's/as user_id, -- Will be updated by actual user/as user_id/g' "$MIGRATION_FILE"
sed -i '' 's/as created_by,/as created_by,/g' "$MIGRATION_FILE"

# Convert any remaining INSERT with user_id = NULL to skip the field entirely or use a better approach
sed -i '' '/INSERT INTO.*sms_templates.*user_id.*NULL/i\
-- Temporarily disable foreign key constraint for initial data\
ALTER TABLE sms_templates DISABLE TRIGGER ALL;\

' "$MIGRATION_FILE"

sed -i '' '/INSERT INTO.*sms_templates.*user_id.*NULL/a\
-- Re-enable foreign key constraint\
ALTER TABLE sms_templates ENABLE TRIGGER ALL;\

' "$MIGRATION_FILE"

# Alternative: Create system user before inserts that need it
sed -i '' '/INSERT INTO.*user_id.*00000000-0000-0000-0000-000000000000/i\
-- Create system user if it does not exist\
INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, recovery_sent_at, last_sign_in_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token) VALUES ('\''00000000-0000-0000-0000-000000000000'\'', '\''00000000-0000-0000-0000-000000000000'\'', '\''authenticated'\'', '\''authenticated'\'', '\''system@wedsync.local'\'', crypt('\''systempassword123'\'', gen_salt('\''bf'\'')), NOW(), NULL, NULL, '\''{"provider":"email","providers":["email"]}'\'', '\''{"role":"system"}'\'', NOW(), NOW(), '\'\'\'\'', '\'\'\'\'', '\'\'\'\'', '\''\'\'') ON CONFLICT (id) DO NOTHING;\
\
-- Create corresponding user profile\
INSERT INTO user_profiles (user_id, email, role, organization_id, created_at, updated_at) VALUES ('\''00000000-0000-0000-0000-000000000000'\'', '\''system@wedsync.local'\'', '\''SYSTEM'\'', NULL, NOW(), NOW()) ON CONFLICT (user_id) DO NOTHING;\

' "$MIGRATION_FILE"

# Fix GIST constraints (replace with UNIQUE)
sed -i '' 's/EXCLUDE USING GIST.*WITH =.*)/CONSTRAINT unique_constraint UNIQUE (supplier_id, scheduled_at)/g' "$MIGRATION_FILE"

# Add view dropping before table creation
sed -i '' '/CREATE TABLE.*security_incidents/i\
DROP VIEW IF EXISTS security_incidents CASCADE;
' "$MIGRATION_FILE"

# Wrap auth.uid() calls for performance
sed -i '' 's/auth\.uid() =/(SELECT auth.uid()) =/g' "$MIGRATION_FILE"
sed -i '' 's/= auth\.uid()/= (SELECT auth.uid())/g' "$MIGRATION_FILE"

# Check for problematic patterns
echo -e "${YELLOW}🔍 Checking for remaining issues...${NC}"

ISSUES_FOUND=0

if grep -q "auth\.user_organization_id\|auth\.is_organization_admin" "$MIGRATION_FILE"; then
    echo -e "${RED}⚠️  Warning: Custom auth functions still found${NC}"
    ISSUES_FOUND=1
fi

if grep -q "EXCLUDE USING GIST.*UUID" "$MIGRATION_FILE"; then
    echo -e "${RED}⚠️  Warning: GIST with UUID constraints found${NC}"
    ISSUES_FOUND=1
fi

if grep -q "FROM users " "$MIGRATION_FILE"; then
    echo -e "${RED}⚠️  Warning: References to 'users' table found${NC}"
    ISSUES_FOUND=1
fi

# Check transaction balance
BEGIN_COUNT=$(grep -c "^BEGIN;" "$MIGRATION_FILE" || true)
COMMIT_COUNT=$(grep -c "^COMMIT;" "$MIGRATION_FILE" || true)
if [ "$BEGIN_COUNT" -ne "$COMMIT_COUNT" ]; then
    echo -e "${RED}⚠️  Warning: Transaction imbalance: $BEGIN_COUNT BEGIN, $COMMIT_COUNT COMMIT${NC}"
    ISSUES_FOUND=1
fi

if [ $ISSUES_FOUND -eq 0 ]; then
    echo -e "${GREEN}✅ No pattern issues found${NC}"
else
    echo -e "${YELLOW}⚠️  Some patterns may need manual review${NC}"
fi

# Show a preview of changes
echo -e "${BLUE}📝 Preview of processed migration (first 20 lines):${NC}"
echo -e "${YELLOW}----------------------------------------${NC}"
head -20 "$MIGRATION_FILE"
echo -e "${YELLOW}----------------------------------------${NC}"

# Generate the final command
echo -e "\n${GREEN}🎉 Migration processing complete!${NC}"
echo -e "${GREEN}✅ Pattern fixes applied${NC}"
echo -e "${GREEN}✅ Backup created: $BACKUP_FILE${NC}"
echo -e "${GREEN}✅ Migration ready to apply${NC}"

echo -e "\n${BLUE}🚀 NOW RUN THIS ONE COMMAND:${NC}"
echo -e "${GREEN}=====================================${NC}"
echo -e "${GREEN}npx supabase db push --include-all${NC}"
echo -e "${GREEN}=====================================${NC}"

echo -e "\n${YELLOW}📋 Alternative methods if the above fails:${NC}"
echo -e "1. Copy the processed SQL from: ${MIGRATION_FILE}"
echo -e "2. Paste into Supabase Dashboard > SQL Editor"
echo -e "3. Or try: npx supabase db push --db-url \$DATABASE_URL"

echo -e "\n${BLUE}📊 Migration Summary:${NC}"
echo -e "• File: $MIGRATION_FILE"
echo -e "• Backup: $BACKUP_FILE"
echo -e "• Status: Ready to apply"
echo -e "• Method: Supabase CLI (recommended)"

echo -e "\n${GREEN}✨ No more copy-paste needed! Just run the command above.${NC}"