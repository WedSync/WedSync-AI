#!/bin/bash
# RESTORE SCRIPT - Use this if something goes wrong

echo "🔄 RESTORE FROM BACKUP"
echo "====================="
echo ""
echo "This will restore your migrations to the backed-up state."
echo "Press Enter to continue or Ctrl+C to cancel..."
read

# Find the latest backup
LATEST_BACKUP=$(ls -dt supabase/migrations-complete-backup-* | head -1)

if [ -z "$LATEST_BACKUP" ]; then
    echo "❌ No backup found!"
    exit 1
fi

echo "📁 Restoring from: $LATEST_BACKUP"

# Clear current migrations
rm -f supabase/migrations/*.sql

# Restore from backup
cp "$LATEST_BACKUP"/*.sql supabase/migrations/

echo "✅ Migrations restored successfully!"
echo "Your migrations are back to their original state."
