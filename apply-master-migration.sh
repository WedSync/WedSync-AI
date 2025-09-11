#!/bin/bash

echo "🚀 Applying Master Migration to Supabase"
echo "========================================"
echo ""

# Check if master migration exists
if [ ! -f "MASTER_MIGRATION_FIXED.sql" ]; then
    echo "❌ MASTER_MIGRATION_FIXED.sql not found!"
    exit 1
fi

echo "📁 Found master migration file (1.1MB)"
echo ""

# Create a temporary migration with proper timestamp
TIMESTAMP=$(date +%Y%m%d%H%M%S)
TEMP_MIGRATION="supabase/migrations/${TIMESTAMP}_master_fix.sql"

echo "📝 Creating temporary migration: $TEMP_MIGRATION"
cp MASTER_MIGRATION_FIXED.sql "$TEMP_MIGRATION"

echo "🔄 Applying migration via Supabase CLI..."
echo ""

# Apply the migration
npx supabase db push --linked

# Check result
if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Migration applied successfully!"
    echo ""
    echo "🧹 Cleaning up temporary migration..."
    rm "$TEMP_MIGRATION"
else
    echo ""
    echo "⚠️  Migration had issues. The file is saved at:"
    echo "   $TEMP_MIGRATION"
    echo ""
    echo "You can manually apply it in the Supabase Dashboard:"
    echo "1. Go to: https://supabase.com/dashboard/project/azhgptjkqiiqvvvhapml/sql"
    echo "2. Copy contents of MASTER_MIGRATION_FIXED.sql"
    echo "3. Paste and run"
fi
