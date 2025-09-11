#!/bin/bash

echo "📦 Splitting Master Migration into Smaller Chunks"
echo "================================================"
echo ""

# Create output directory
OUTPUT_DIR="migration-chunks"
rm -rf "$OUTPUT_DIR"
mkdir -p "$OUTPUT_DIR"

# Read the master migration file
MASTER_FILE="MASTER_MIGRATION_FIXED.sql"

if [ ! -f "$MASTER_FILE" ]; then
    echo "❌ $MASTER_FILE not found!"
    exit 1
fi

# Split by migration markers
awk '
    /^-- ========================================/ {
        if (NR > 1) {
            close(outfile)
        }
        if (getline > 0) {
            if ($0 ~ /^-- Migration:/) {
                # Extract migration filename
                match($0, /Migration: (.+)$/, arr)
                filename = arr[1]
                gsub(/\.sql/, "", filename)
                outfile = "migration-chunks/" filename ".sql"
                print "Creating: " outfile
                print header > outfile
                print $0 >> outfile
            }
        }
        next
    }
    NR == 1 {
        # Save header for all files
        header = ""
        while ($0 !~ /^-- ========================================/) {
            header = header $0 "\n"
            if (getline <= 0) break
        }
    }
    outfile {
        print >> outfile
    }
' "$MASTER_FILE"

# Count the chunks
CHUNK_COUNT=$(ls -1 migration-chunks/*.sql 2>/dev/null | wc -l)

echo ""
echo "✅ Split into $CHUNK_COUNT migration files"
echo ""
echo "📁 Files created in: migration-chunks/"
echo ""
echo "To apply them:"
echo "1. Go to: https://supabase.com/dashboard/project/azhgptjkqiiqvvvhapml/sql"
echo "2. Run each file in order (smallest numbers first)"
echo "3. Start with: migration-chunks/20250101000002_base_schema.sql"
