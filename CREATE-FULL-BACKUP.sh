#!/bin/bash

# COMPLETE BACKUP SCRIPT
# Creates a full backup of all migrations before any changes

echo "🛡️ CREATING COMPLETE BACKUP"
echo "============================="
echo ""

# Create backup directory with timestamp
BACKUP_DIR="migrations-complete-backup-$(date +%Y%m%d-%H%M%S)"
BACKUP_PATH="supabase/$BACKUP_DIR"

echo "📁 Creating backup directory: $BACKUP_PATH"
mkdir -p "$BACKUP_PATH"

# Copy ALL migration files
echo "📋 Backing up all migration files..."
cp -r supabase/migrations/* "$BACKUP_PATH/" 2>/dev/null

# Count backed up files
FILE_COUNT=$(ls -1 "$BACKUP_PATH"/*.sql 2>/dev/null | wc -l)

echo "✅ Backed up $FILE_COUNT migration files"
echo ""
echo "📍 Backup location: $BACKUP_PATH"
echo ""

# Create restore script
cat > "RESTORE-BACKUP.sh" << 'EOF'
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
EOF

chmod +x RESTORE-BACKUP.sh

echo "✅ BACKUP COMPLETE!"
echo ""
echo "📋 What was backed up:"
echo "   • All $FILE_COUNT migration files"
echo "   • Complete folder structure"
echo "   • All existing backups"
echo ""
echo "🔄 TO RESTORE if something goes wrong:"
echo "   Run: ./RESTORE-BACKUP.sh"
echo ""
echo "✨ It's now SAFE to run ./FIX-EVERYTHING.sh"
echo ""