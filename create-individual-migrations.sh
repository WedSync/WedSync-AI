#!/bin/bash

echo "🔧 Creating Individual Migration Files"
echo "======================================"
echo ""

# Create directory for individual migrations
OUTPUT_DIR="migrations-to-apply"
rm -rf "$OUTPUT_DIR"
mkdir -p "$OUTPUT_DIR"

# Get list of original migrations
MIGRATIONS=(
    "20250101000002_base_schema.sql"
    "20250101000003_clients_vendors_schema.sql"
    "20250101000004_communications_system.sql"
    "20250101000005_payment_tables.sql"
    "20250101000006_core_fields_system.sql"
)

# Process first 5 migrations only (most critical)
for migration in "${MIGRATIONS[@]}"; do
    ORIGINAL="supabase/migrations/$migration"
    if [ -f "$ORIGINAL" ]; then
        echo "Processing: $migration"
        # Apply fixes to each migration
        cp "$ORIGINAL" "$OUTPUT_DIR/$migration"
        
        # Apply the same fixes we did in the master script
        sed -i '' "s/'00000000-0000-0000-0000-000000000000'::uuid/NULL/g" "$OUTPUT_DIR/$migration"
        sed -i '' "s/'00000000-0000-0000-0000-000000000000'/NULL/g" "$OUTPUT_DIR/$migration"
        sed -i '' 's/auth\.user_organization_id()/(SELECT organization_id FROM user_profiles WHERE user_id = auth.uid() LIMIT 1)/g' "$OUTPUT_DIR/$migration"
    fi
done

echo ""
echo "✅ Created $(ls -1 $OUTPUT_DIR/*.sql | wc -l) fixed migration files"
echo ""
echo "📋 Apply these in order via Dashboard:"
echo "======================================"
ls -1 $OUTPUT_DIR/*.sql
echo ""
echo "Go to: https://supabase.com/dashboard/project/azhgptjkqiiqvvvhapml/sql"
echo "Run each file one by one, starting with base_schema"
