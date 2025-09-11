#!/bin/bash

echo "=== MIGRATION STATUS ANALYSIS ==="
echo "================================="
echo ""

# Get applied migrations from the list
APPLIED_MIGRATIONS=(
  "026_budget_tracking_system"
  "027_meeting_scheduler_system"
  "20250101000002_base_schema"
  "20250101000003_clients_vendors_schema"
  "20250101000004_communications_system"
  "20250101000005_payment_tables"
  "20250101000006_core_fields_system"
  "20250101000007_pdf_import_tables"
  "20250101000008_security_rls_policies"
  "20250101000009_security_enhancements"
  "20250101000010_enhanced_security_audit"
  "20250822112112_security_alerts_table"
  "20250822112501_api_key_system"
  "20250822112631_enterprise_token_system"
)

echo "📊 APPLIED MIGRATIONS: ${#APPLIED_MIGRATIONS[@]}"
echo "-----------------------------------"
for m in "${APPLIED_MIGRATIONS[@]}"; do
  echo "✅ $m"
done

echo ""
echo "📁 LOCAL MIGRATION FILES:"
echo "-----------------------------------"
echo "Total in /wedsync/supabase/migrations: $(ls supabase/migrations/*.sql 2>/dev/null | wc -l | xargs)"
echo "Total in /supabase/migrations: $(ls ../supabase/migrations/*.sql 2>/dev/null | wc -l | xargs)"

echo ""
echo "❌ UNAPPLIED MIGRATIONS (in /wedsync/supabase/migrations):"
echo "-----------------------------------"

for file in supabase/migrations/*.sql; do
  if [ -f "$file" ]; then
    basename_file=$(basename "$file" .sql)
    is_applied=false
    
    for applied in "${APPLIED_MIGRATIONS[@]}"; do
      if [[ "$basename_file" == "$applied" ]]; then
        is_applied=true
        break
      fi
    done
    
    if [ "$is_applied" = false ]; then
      echo "❌ $basename_file"
    fi
  fi
done

echo ""
echo "🔍 RECENT MIGRATIONS (August 22-23, 2025):"
echo "-----------------------------------"
ls -la supabase/migrations/202508* 2>/dev/null | awk '{print $NF}' | xargs -n1 basename | sed 's/\.sql$//'

