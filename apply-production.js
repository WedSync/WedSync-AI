
// PRODUCTION APPLICATION SCRIPT
// Generated at: 2025-08-23T08:26:08.341Z

const migrationsToApply = [
  "025_sms_configuration_system",
  "028_dashboard_templates_system",
  "20250101000011_security_alerts_table"
];

async function applyMigrations() {
  for (const migration of migrationsToApply) {
    const sql = fs.readFileSync(`supabase/migrations-fixed/${migration}.sql`, 'utf8');
    
    // Apply via Supabase MCP
    await mcp__supabase__apply_migration({
      name: migration.replace(/\.sql$/, ''),
      query: sql
    });
    
    console.log(`✅ Applied: ${migration}`);
    
    // Wait between migrations
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
}

// Run with: node apply-production.js
