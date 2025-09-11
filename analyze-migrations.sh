#!/bin/bash

echo "=== CRITICAL MIGRATION ANALYSIS ==="
echo "===================================="
echo ""

# List of unapplied migrations
UNAPPLIED_MIGRATIONS=(
  "025_sms_configuration_system"
  "028_dashboard_templates_system"
  "035_api_key_management_system"
  "038_couple_signup_system"
  "20250101000011_security_alerts_table"
  "20250101000012_performance_indexes"
  "20250101000013_api_key_system"
  "20250101000014_enterprise_token_system"
  "20250101000015_advanced_performance_optimization"
  "20250101000016_pdf_processing_progress_tracking"
  "20250101000017_journey_execution_system"
  "20250101000018_journey_analytics_dashboard"
  "20250101000019_analytics_data_pipeline"
  "20250101000020_form_templates_library"
  "20250101000021_lead_status_tracking_system"
  "20250101000022_advanced_journey_index_optimization"
  "20250101000023_index_monitoring_system"
  "20250101000024_notes_system"
  "20250101000025_analytics_tracking"
  "20250101000026_query_performance_validation"
  "20250101000027_gdpr_ccpa_compliance"
  "20250101000028_tagging_system"
  "20250101000029_tutorial_system"
  "20250101000030_vendor_portal_system"
  "20250101000031_dashboard_system"
  "20250101000032_import_system"
  "20250101000033_payment_system_extensions"
  "20250101000034_wedding_encryption_system"
  "20250101000035_ab_testing_system"
  "20250101000036_client_profiles_enhancement"
  "20250101000037_journey_canvas_enhancement"
  "20250101000038_guest_management_system"
  "20250101000039_guest_management_rls"
  "20250101000040_guest_management_functions"
  "20250101000041_rsvp_management_system"
  "20250101000042_wedding_website_system"
  "20250101000043_referral_programs_system"
  "20250101000044_task_delegation_system"
  "20250101000045_delegation_workflow_system"
  "20250101000046_deadline_tracking_system"
  "20250101000047_task_status_history"
  "20250101000048_workload_tracking_system"
  "20250101000049_task_collaboration_templates"
  "20250101000050_seo_analytics_system"
  "20250120000001_journey_execution_engine"
  "20250121000001_journey_metrics_analytics"
  "20250121000002_analytics_query_optimization"
  "20250121000003_analytics_automation_setup"
  "20250122000001_rsvp_round2_extensions"
  "20250122000002_team_management_system"
  "20250122000003_faq_management_system"
  "20250122000003_subscription_billing_system"
  "20250122000003_whatsapp_integration_system"
  "20250122000004_invitation_landing_system"
  "20250122000005_automated_reminders_system"
  "20250122000005_contract_management_system"
  "20250822_vendor_chat_system"
  "20250822000001_advanced_section_configuration"
  "20250822000001_wedding_timeline_builder"
  "20250822000083_budget_tracking_round2_enhancements"
  "20250822000090_vendor_review_system"
  "20250822120001_document_storage_system"
  "20250822150001_complete_content_management_integration"
  "20250822222055_photo_gallery_system"
  "20250822235231_master_fix"
  "20250822T205536_temp_migration"
  "20250822T212000_form_response_analytics_schema"
  "20250823000001_vault_encryption_setup"
)

echo "📊 Analyzing ${#UNAPPLIED_MIGRATIONS[@]} unapplied migrations..."
echo ""

# Track issues
TOTAL_ISSUES=0
declare -a CRITICAL_MIGRATIONS
declare -a WARNING_MIGRATIONS
declare -a CLEAN_MIGRATIONS

for migration in "${UNAPPLIED_MIGRATIONS[@]}"; do
  FILE="supabase/migrations/${migration}.sql"
  if [ ! -f "$FILE" ]; then
    echo "❌ MISSING: $migration"
    continue
  fi
  
  ISSUES=""
  CRITICAL=false
  
  # Check for auth function issues
  if grep -q "auth\.user_organization_id()\|auth\.is_organization_admin()" "$FILE" 2>/dev/null; then
    ISSUES="${ISSUES}[AUTH_FUNC] "
    CRITICAL=true
  fi
  
  # Check for users table references
  if grep -q "FROM users\|REFERENCES users\|JOIN users" "$FILE" 2>/dev/null; then
    ISSUES="${ISSUES}[USERS_TABLE] "
    CRITICAL=true
  fi
  
  # Check for GIST constraints with UUID
  if grep -q "EXCLUDE USING GIST.*UUID" "$FILE" 2>/dev/null; then
    ISSUES="${ISSUES}[GIST_UUID] "
    CRITICAL=true
  fi
  
  # Check for CONCURRENTLY in transactions
  if grep -q "CREATE INDEX CONCURRENTLY" "$FILE" 2>/dev/null; then
    ISSUES="${ISSUES}[CONCURRENT] "
    CRITICAL=true
  fi
  
  # Check for uuid_generate_v4
  if grep -q "uuid_generate_v4()" "$FILE" 2>/dev/null; then
    ISSUES="${ISSUES}[UUID_V4] "
  fi
  
  # Check for missing dependencies
  if grep -qE "REFERENCES (vendors|suppliers|bookings|workflows|journey_templates)" "$FILE" 2>/dev/null; then
    ISSUES="${ISSUES}[DEPS] "
  fi
  
  # Check for zero UUIDs
  if grep -q "00000000-0000-0000-0000-000000000000" "$FILE" 2>/dev/null; then
    ISSUES="${ISSUES}[ZERO_UUID] "
    CRITICAL=true
  fi
  
  # Check transaction balance
  BEGIN_COUNT=$(grep -c "^BEGIN;" "$FILE" 2>/dev/null || echo 0)
  COMMIT_COUNT=$(grep -c "^COMMIT;" "$FILE" 2>/dev/null || echo 0)
  if [ "$BEGIN_COUNT" -ne "$COMMIT_COUNT" ]; then
    ISSUES="${ISSUES}[TX_IMBALANCE] "
    CRITICAL=true
  fi
  
  # Report findings
  if [ -n "$ISSUES" ]; then
    if [ "$CRITICAL" = true ]; then
      echo "🔴 CRITICAL: $migration"
      echo "   Issues: $ISSUES"
      CRITICAL_MIGRATIONS+=("$migration")
    else
      echo "⚠️  WARNING: $migration"
      echo "   Issues: $ISSUES"
      WARNING_MIGRATIONS+=("$migration")
    fi
    ((TOTAL_ISSUES++))
  else
    echo "✅ CLEAN: $migration"
    CLEAN_MIGRATIONS+=("$migration")
  fi
done

echo ""
echo "=== ANALYSIS SUMMARY ==="
echo "========================"
echo "🔴 Critical Issues: ${#CRITICAL_MIGRATIONS[@]} migrations"
echo "⚠️  Warnings: ${#WARNING_MIGRATIONS[@]} migrations"
echo "✅ Clean: ${#CLEAN_MIGRATIONS[@]} migrations"
echo "📊 Total Issues Found: $TOTAL_ISSUES"

echo ""
echo "=== ISSUE LEGEND ==="
echo "[AUTH_FUNC] = Custom auth functions that don't exist"
echo "[USERS_TABLE] = References to non-existent 'users' table"
echo "[GIST_UUID] = GIST constraints with UUID (not supported)"
echo "[CONCURRENT] = CONCURRENTLY in transactions"
echo "[UUID_V4] = Uses uuid_generate_v4() instead of gen_random_uuid()"
echo "[DEPS] = May have unmet dependencies"
echo "[ZERO_UUID] = Contains hardcoded zero UUIDs"
echo "[TX_IMBALANCE] = Unbalanced BEGIN/COMMIT statements"

# Save results for fixing
echo ""
echo "=== SAVING ANALYSIS RESULTS ==="
cat > migration-issues.json << EOF
{
  "critical": [$(printf '"%s",' "${CRITICAL_MIGRATIONS[@]}" | sed 's/,$//')]],
  "warning": [$(printf '"%s",' "${WARNING_MIGRATIONS[@]}" | sed 's/,$//')]],
  "clean": [$(printf '"%s",' "${CLEAN_MIGRATIONS[@]}" | sed 's/,$//')]]
}
EOF

echo "✅ Analysis saved to migration-issues.json"