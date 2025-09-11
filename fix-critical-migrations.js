#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔧 CRITICAL MIGRATION FIXER');
console.log('===========================\n');

// Critical migrations that need fixing
const criticalMigrations = [
  '025_sms_configuration_system',
  '20250101000012_performance_indexes',
  '20250101000015_advanced_performance_optimization',
  '20250101000022_advanced_journey_index_optimization',
  '20250101000023_index_monitoring_system',
  '20250101000041_rsvp_management_system',
  '20250101000046_deadline_tracking_system',
  '20250121000002_analytics_query_optimization',
  '20250122000001_rsvp_round2_extensions',
  '20250122000003_whatsapp_integration_system',
  '20250822000001_advanced_section_configuration',
  '20250822235231_master_fix'
];

// All migrations with warnings
const warningMigrations = [
  '028_dashboard_templates_system',
  '20250101000011_security_alerts_table',
  '20250101000014_enterprise_token_system',
  '20250101000016_pdf_processing_progress_tracking',
  '20250101000017_journey_execution_system',
  '20250101000018_journey_analytics_dashboard',
  '20250101000019_analytics_data_pipeline',
  '20250101000021_lead_status_tracking_system',
  '20250101000024_notes_system',
  '20250101000025_analytics_tracking',
  '20250101000030_vendor_portal_system',
  '20250101000031_dashboard_system',
  '20250101000033_payment_system_extensions',
  '20250101000036_client_profiles_enhancement',
  '20250101000043_referral_programs_system',
  '20250101000044_task_delegation_system',
  '20250101000045_delegation_workflow_system',
  '20250101000049_task_collaboration_templates',
  '20250101000050_seo_analytics_system',
  '20250120000001_journey_execution_engine',
  '20250121000001_journey_metrics_analytics',
  '20250122000002_team_management_system',
  '20250122000003_faq_management_system',
  '20250122000004_invitation_landing_system',
  '20250122000005_automated_reminders_system',
  '20250122000005_contract_management_system',
  '20250822_vendor_chat_system',
  '20250822000001_wedding_timeline_builder',
  '20250822000083_budget_tracking_round2_enhancements',
  '20250822000090_vendor_review_system',
  '20250822150001_complete_content_management_integration',
  '20250822222055_photo_gallery_system'
];

// Combine all migrations that need fixing
const migrationsToFix = [...criticalMigrations, ...warningMigrations];

let totalFixed = 0;
let totalIssues = 0;

// Create fixed migrations directory
const fixedDir = 'supabase/migrations-fixed';
if (!fs.existsSync(fixedDir)) {
  fs.mkdirSync(fixedDir, { recursive: true });
}

// Pattern fixes
const fixes = [
  // Remove CONCURRENTLY from CREATE INDEX
  {
    pattern: /CREATE INDEX CONCURRENTLY/gi,
    replacement: 'CREATE INDEX',
    description: 'Remove CONCURRENTLY from index creation'
  },
  // Fix users table references
  {
    pattern: /FROM users(\s|$|;)/gi,
    replacement: 'FROM user_profiles$1',
    description: 'Replace users table with user_profiles'
  },
  {
    pattern: /JOIN users(\s|$|;)/gi,
    replacement: 'JOIN user_profiles$1',
    description: 'Replace users table in JOINs'
  },
  {
    pattern: /REFERENCES users\s*\(/gi,
    replacement: 'REFERENCES user_profiles(',
    description: 'Replace users table in foreign keys'
  },
  {
    pattern: /EXISTS\s+users(\s|$|;)/gi,
    replacement: 'EXISTS user_profiles$1',
    description: 'Replace users table in EXISTS'
  },
  // Fix UUID generation
  {
    pattern: /uuid_generate_v4\(\)/gi,
    replacement: 'gen_random_uuid()',
    description: 'Use built-in UUID function'
  },
  // Fix zero UUIDs in defaults
  {
    pattern: /DEFAULT '00000000-0000-0000-0000-000000000000'::uuid/gi,
    replacement: 'DEFAULT NULL',
    description: 'Replace zero UUID with NULL'
  },
  {
    pattern: /'00000000-0000-0000-0000-000000000000'::uuid/gi,
    replacement: 'NULL',
    description: 'Replace zero UUID literals with NULL'
  },
  // Fix auth functions (more complex, needs context)
  {
    pattern: /auth\.user_organization_id\(\)/gi,
    replacement: '(SELECT organization_id FROM user_profiles WHERE user_id = auth.uid() LIMIT 1)',
    description: 'Replace custom auth function with subquery'
  },
  {
    pattern: /auth\.is_organization_admin\(\)/gi,
    replacement: "(SELECT role IN ('ADMIN', 'OWNER') FROM user_profiles WHERE user_id = auth.uid() LIMIT 1)",
    description: 'Replace admin check with subquery'
  },
  // Fix GIST constraints with UUID
  {
    pattern: /EXCLUDE USING GIST\s*\([^)]*uuid[^)]*\)/gi,
    replacement: match => {
      console.log(`  ⚠️  Found GIST constraint with UUID - needs manual review: ${match}`);
      return match + ' -- NEEDS MANUAL FIX: GIST with UUID not supported';
    },
    description: 'Flag GIST constraints for manual review'
  }
];

// Process each migration
for (const migration of migrationsToFix) {
  const inputFile = path.join('supabase/migrations', `${migration}.sql`);
  const outputFile = path.join(fixedDir, `${migration}.sql`);
  
  if (!fs.existsSync(inputFile)) {
    console.log(`❌ SKIP: ${migration} - file not found`);
    continue;
  }
  
  let content = fs.readFileSync(inputFile, 'utf8');
  let originalContent = content;
  let issuesFixed = 0;
  
  console.log(`\n📝 Processing: ${migration}`);
  
  // Apply all fixes
  for (const fix of fixes) {
    const matches = content.match(fix.pattern);
    if (matches && matches.length > 0) {
      content = content.replace(fix.pattern, fix.replacement);
      issuesFixed += matches.length;
      console.log(`  ✅ ${fix.description} (${matches.length} occurrences)`);
    }
  }
  
  // Additional manual checks for complex issues
  
  // Check for table dependencies
  const tableRefs = content.match(/REFERENCES\s+(\w+)\s*\(/gi);
  if (tableRefs) {
    const uniqueTables = [...new Set(tableRefs.map(ref => {
      const match = ref.match(/REFERENCES\s+(\w+)/i);
      return match ? match[1] : null;
    }).filter(Boolean))];
    
    const missingTables = uniqueTables.filter(table => 
      !['organizations', 'user_profiles', 'clients', 'vendors', 'suppliers'].includes(table)
    );
    
    if (missingTables.length > 0) {
      console.log(`  ⚠️  References potentially missing tables: ${missingTables.join(', ')}`);
      // Add comment to migration
      content = `-- WARNING: This migration references tables that may not exist: ${missingTables.join(', ')}\n-- Ensure these tables are created first\n\n${content}`;
    }
  }
  
  // Check for transaction balance
  const beginCount = (content.match(/^BEGIN;/gm) || []).length;
  const commitCount = (content.match(/^COMMIT;/gm) || []).length;
  if (beginCount !== commitCount) {
    console.log(`  ⚠️  Transaction imbalance: ${beginCount} BEGIN, ${commitCount} COMMIT`);
    if (beginCount > commitCount) {
      content += '\n-- FIX: Added missing COMMIT\nCOMMIT;\n';
      issuesFixed++;
    }
  }
  
  // Save fixed migration
  if (issuesFixed > 0) {
    fs.writeFileSync(outputFile, content);
    console.log(`  💾 Saved fixed version with ${issuesFixed} corrections`);
    totalFixed++;
    totalIssues += issuesFixed;
  } else if (content !== originalContent) {
    fs.writeFileSync(outputFile, content);
    console.log(`  💾 Saved with minor adjustments`);
    totalFixed++;
  } else {
    // Copy unchanged migrations too for completeness
    fs.copyFileSync(inputFile, outputFile);
    console.log(`  📋 Copied unchanged (no issues found)`);
  }
}

console.log('\n' + '='.repeat(50));
console.log('🎯 FIXING COMPLETE');
console.log('='.repeat(50));
console.log(`✅ Fixed ${totalFixed} migrations`);
console.log(`🔧 Total issues corrected: ${totalIssues}`);
console.log(`📁 Fixed migrations saved to: ${fixedDir}`);

// Create application order file
const applicationOrder = [
  // Phase 1: Core Infrastructure
  '025_sms_configuration_system',
  '028_dashboard_templates_system',
  '035_api_key_management_system',
  '038_couple_signup_system',
  '20250101000011_security_alerts_table',
  '20250101000012_performance_indexes',
  '20250101000013_api_key_system',
  '20250101000014_enterprise_token_system',
  '20250101000015_advanced_performance_optimization',
  
  // Phase 2: Core Features
  '20250101000016_pdf_processing_progress_tracking',
  '20250101000017_journey_execution_system',
  '20250101000018_journey_analytics_dashboard',
  '20250101000019_analytics_data_pipeline',
  '20250101000020_form_templates_library',
  '20250101000021_lead_status_tracking_system',
  '20250101000022_advanced_journey_index_optimization',
  '20250101000023_index_monitoring_system',
  '20250101000024_notes_system',
  '20250101000025_analytics_tracking',
  '20250101000026_query_performance_validation',
  '20250101000027_gdpr_ccpa_compliance',
  '20250101000028_tagging_system',
  '20250101000029_tutorial_system',
  '20250101000030_vendor_portal_system',
  
  // Phase 3: Extended Features
  '20250101000031_dashboard_system',
  '20250101000032_import_system',
  '20250101000033_payment_system_extensions',
  '20250101000034_wedding_encryption_system',
  '20250101000035_ab_testing_system',
  '20250101000036_client_profiles_enhancement',
  '20250101000037_journey_canvas_enhancement',
  '20250101000038_guest_management_system',
  '20250101000039_guest_management_rls',
  '20250101000040_guest_management_functions',
  '20250101000041_rsvp_management_system',
  '20250101000042_wedding_website_system',
  '20250101000043_referral_programs_system',
  
  // Phase 4: Task Management
  '20250101000044_task_delegation_system',
  '20250101000045_delegation_workflow_system',
  '20250101000046_deadline_tracking_system',
  '20250101000047_task_status_history',
  '20250101000048_workload_tracking_system',
  '20250101000049_task_collaboration_templates',
  '20250101000050_seo_analytics_system',
  
  // Phase 5: Recent Updates
  '20250120000001_journey_execution_engine',
  '20250121000001_journey_metrics_analytics',
  '20250121000002_analytics_query_optimization',
  '20250121000003_analytics_automation_setup',
  '20250122000001_rsvp_round2_extensions',
  '20250122000002_team_management_system',
  '20250122000003_faq_management_system',
  '20250122000003_subscription_billing_system',
  '20250122000003_whatsapp_integration_system',
  '20250122000004_invitation_landing_system',
  '20250122000005_automated_reminders_system',
  '20250122000005_contract_management_system',
  
  // Phase 6: August Updates
  '20250822_vendor_chat_system',
  '20250822000001_advanced_section_configuration',
  '20250822000001_wedding_timeline_builder',
  '20250822000083_budget_tracking_round2_enhancements',
  '20250822000090_vendor_review_system',
  '20250822120001_document_storage_system',
  '20250822150001_complete_content_management_integration',
  '20250822222055_photo_gallery_system',
  '20250822235231_master_fix',
  '20250822T205536_temp_migration',
  '20250822T212000_form_response_analytics_schema',
  '20250823000001_vault_encryption_setup'
];

// Save application order
fs.writeFileSync('migration-application-order.json', JSON.stringify({
  totalMigrations: applicationOrder.length,
  phases: {
    phase1_core: applicationOrder.slice(0, 9),
    phase2_features: applicationOrder.slice(9, 24),
    phase3_extended: applicationOrder.slice(24, 37),
    phase4_tasks: applicationOrder.slice(37, 44),
    phase5_recent: applicationOrder.slice(44, 56),
    phase6_august: applicationOrder.slice(56)
  },
  order: applicationOrder
}, null, 2));

console.log('\n📋 Application order saved to: migration-application-order.json');
console.log('\n⚠️  IMPORTANT: Review fixed migrations before applying!');
console.log('   Especially check migrations with dependency warnings.');