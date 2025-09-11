#!/usr/bin/env node

const fs = require('fs').promises;
const path = require('path');

// List of remaining migrations to apply
const migrations = [
  '20250101000015_advanced_performance_optimization.sql',
  '20250101000016_pdf_processing_progress_tracking.sql',
  '20250101000017_journey_execution_system.sql',
  '20250101000018_journey_analytics_dashboard.sql',
  '20250101000019_analytics_data_pipeline.sql',
  '20250101000020_form_templates_library.sql',
  '20250101000021_lead_status_tracking_system.sql',
  '20250101000022_advanced_journey_index_optimization.sql',
  '20250101000023_index_monitoring_system.sql',
  '20250101000024_notes_system.sql',
  '20250101000025_analytics_tracking.sql',
  '20250101000026_query_performance_validation.sql',
  '20250101000027_gdpr_ccpa_compliance.sql',
  '20250101000028_tagging_system.sql',
  '20250101000029_tutorial_system.sql',
  '20250101000030_vendor_portal_system.sql',
  '20250101000031_dashboard_system.sql',
  '20250101000032_import_system.sql',
  '20250101000033_payment_system_extensions.sql',
  '20250101000034_wedding_encryption_system.sql',
  '20250101000035_ab_testing_system.sql',
  '20250101000036_client_profiles_enhancement.sql',
  '20250101000037_journey_canvas_enhancement.sql',
  '20250101000038_guest_management_system.sql',
  '20250101000039_guest_management_rls.sql',
  '20250101000040_guest_management_functions.sql',
  '20250101000041_rsvp_management_system.sql',
  '20250101000042_wedding_website_system.sql',
  '20250101000043_referral_programs_system.sql',
  '20250101000044_task_delegation_system.sql',
  '20250101000045_delegation_workflow_system.sql',
  '20250101000046_deadline_tracking_system.sql',
  '20250101000047_task_status_history.sql',
  '20250101000048_workload_tracking_system.sql',
  '20250101000049_task_collaboration_templates.sql',
  '20250101000050_seo_analytics_system.sql'
];

async function processMigrations() {
  const migrationsDir = path.join(__dirname, 'supabase', 'migrations');
  const results = [];
  
  for (const migrationFile of migrations) {
    const filePath = path.join(migrationsDir, migrationFile);
    
    try {
      // Check if file exists
      await fs.access(filePath);
      
      // Extract migration name
      const migrationName = migrationFile.replace(/^[0-9]+_/, '').replace('.sql', '');
      
      results.push({
        file: migrationFile,
        name: migrationName,
        status: 'ready',
        path: filePath
      });
      
      console.log(`✅ Ready: ${migrationName}`);
    } catch (error) {
      console.log(`❌ Missing: ${migrationFile}`);
      results.push({
        file: migrationFile,
        status: 'missing'
      });
    }
  }
  
  // Write results to JSON for processing
  await fs.writeFile(
    path.join(__dirname, 'migrations-to-process.json'),
    JSON.stringify(results, null, 2)
  );
  
  console.log(`\n📊 Summary:`);
  console.log(`  Total: ${migrations.length}`);
  console.log(`  Ready: ${results.filter(r => r.status === 'ready').length}`);
  console.log(`  Missing: ${results.filter(r => r.status === 'missing').length}`);
}

processMigrations().catch(console.error);