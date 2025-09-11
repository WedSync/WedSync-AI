#!/bin/bash

echo "📦 Splitting Master Migration into Smaller Chunks"
echo "================================================"
echo ""

# Create output directory
OUTPUT_DIR="migration-chunks"
rm -rf "$OUTPUT_DIR"
mkdir -p "$OUTPUT_DIR"

# Check file size
SIZE=$(wc -c < MASTER_MIGRATION_FIXED.sql)
echo "📊 Master migration size: $(($SIZE / 1024))KB"
echo ""

# Split into manageable chunks (100KB each)
split -b 100k MASTER_MIGRATION_FIXED.sql "$OUTPUT_DIR/chunk_"

# Add SQL extension and create wrapper files
COUNT=1
for file in $OUTPUT_DIR/chunk_*; do
    if [ -f "$file" ]; then
        NEW_NAME="$OUTPUT_DIR/part_$(printf "%03d" $COUNT).sql"
        mv "$file" "$NEW_NAME"
        echo "Created: $NEW_NAME ($(wc -c < "$NEW_NAME" | awk '{print int($1/1024)}')KB)"
        COUNT=$((COUNT + 1))
    fi
done

echo ""
echo "✅ Split into $((COUNT - 1)) chunks"
echo ""
echo "📋 IMPORTANT: Apply in Supabase Dashboard"
echo "========================================="
echo "1. Go to: https://supabase.com/dashboard/project/azhgptjkqiiqvvvhapml/sql"
echo "2. Run each part IN ORDER:"
echo ""
ls -1 $OUTPUT_DIR/part_*.sql | head -5
echo "   ..."
echo ""
echo "⚠️  MUST run in sequence: part_001.sql, part_002.sql, etc."
echo ""
echo "Alternative: Use Supabase CLI with your database password:"
echo "  npx supabase db push --linked"
