#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🚀 MIGRATION APPLICATION VIA SUPABASE MCP');
console.log('==========================================\n');

// Load migration order
const orderFile = 'migration-application-order.json';
if (!fs.existsSync(orderFile)) {
  console.error('❌ Migration order file not found!');
  console.error('   Run fix-critical-migrations.js first');
  process.exit(1);
}

const migrationOrder = JSON.parse(fs.readFileSync(orderFile, 'utf8'));
const fixedDir = 'supabase/migrations-fixed';

// Phase 1 - Start with just the first 5 migrations as a test
const testBatch = [
  '025_sms_configuration_system',
  '028_dashboard_templates_system', 
  '035_api_key_management_system',
  '038_couple_signup_system',
  '20250101000011_security_alerts_table'
];

console.log('📋 TEST BATCH: Applying first 5 migrations');
console.log('===========================================\n');

// Status tracking
const results = {
  applied: [],
  failed: [],
  skipped: []
};

// Function to read migration SQL
function readMigration(name) {
  const filePath = path.join(fixedDir, `${name}.sql`);
  if (!fs.existsSync(filePath)) {
    console.error(`❌ Migration file not found: ${filePath}`);
    return null;
  }
  return fs.readFileSync(filePath, 'utf8');
}

// Process each migration
async function processMigrations() {
  console.log('Starting migration application...\n');
  
  for (const migration of testBatch) {
    console.log(`\n📝 Processing: ${migration}`);
    console.log('─'.repeat(50));
    
    const sql = readMigration(migration);
    if (!sql) {
      results.skipped.push(migration);
      continue;
    }
    
    // Clean up migration name for Supabase
    const cleanName = migration.replace(/\.sql$/, '');
    
    // Log what we're about to do
    console.log(`   Name: ${cleanName}`);
    console.log(`   Size: ${sql.length} characters`);
    console.log(`   Lines: ${sql.split('\n').length}`);
    
    // Check for critical warnings in the SQL
    if (sql.includes('WARNING:')) {
      console.log('   ⚠️  Contains warnings - needs review');
      const warnings = sql.match(/WARNING:.*$/gm);
      if (warnings) {
        warnings.forEach(w => console.log(`      ${w}`));
      }
    }
    
    // For safety, we'll output the command that would be run
    console.log('\n   🔧 SUPABASE MCP COMMAND:');
    console.log('   ─────────────────────────');
    console.log(`   Tool: mcp__supabase__apply_migration`);
    console.log(`   Name: ${cleanName}`);
    console.log(`   SQL: [${sql.length} characters]`);
    
    // Mark as would-be-applied
    results.applied.push(migration);
    console.log('\n   ✅ Ready to apply (in production mode)');
  }
  
  // Summary
  console.log('\n' + '='.repeat(50));
  console.log('📊 TEST BATCH SUMMARY');
  console.log('='.repeat(50));
  console.log(`✅ Ready to apply: ${results.applied.length}`);
  console.log(`⚠️  Skipped: ${results.skipped.length}`);
  console.log(`❌ Failed: ${results.failed.length}`);
  
  if (results.applied.length > 0) {
    console.log('\n📋 Migrations ready for application:');
    results.applied.forEach((m, i) => {
      console.log(`   ${i + 1}. ${m}`);
    });
  }
  
  // Create application script for production
  const productionScript = `
// PRODUCTION APPLICATION SCRIPT
// Generated at: ${new Date().toISOString()}

const migrationsToApply = ${JSON.stringify(results.applied, null, 2)};

async function applyMigrations() {
  for (const migration of migrationsToApply) {
    const sql = fs.readFileSync(\`supabase/migrations-fixed/\${migration}.sql\`, 'utf8');
    
    // Apply via Supabase MCP
    await mcp__supabase__apply_migration({
      name: migration.replace(/\\.sql$/, ''),
      query: sql
    });
    
    console.log(\`✅ Applied: \${migration}\`);
    
    // Wait between migrations
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
}

// Run with: node apply-production.js
`;
  
  fs.writeFileSync('apply-production.js', productionScript);
  console.log('\n💾 Production script saved to: apply-production.js');
  
  // Create validation queries
  const validationQueries = [
    "SELECT COUNT(*) as migration_count FROM supabase_migrations.schema_migrations;",
    "SELECT version, name, executed_at FROM supabase_migrations.schema_migrations ORDER BY executed_at DESC LIMIT 10;",
    "SELECT COUNT(*) as table_count FROM information_schema.tables WHERE table_schema = 'public';",
    "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name LIMIT 20;"
  ];
  
  console.log('\n🔍 VALIDATION QUERIES:');
  console.log('─'.repeat(50));
  validationQueries.forEach((q, i) => {
    console.log(`${i + 1}. ${q}`);
  });
  
  console.log('\n⚠️  IMPORTANT NEXT STEPS:');
  console.log('─'.repeat(50));
  console.log('1. Review the migrations in supabase/migrations-fixed/');
  console.log('2. Check for any WARNING comments in the SQL files');
  console.log('3. Use Supabase MCP to apply migrations one by one');
  console.log('4. Run validation queries after each batch');
  console.log('5. Monitor application logs for any errors');
  
  console.log('\n🛡️  SAFETY CHECKLIST:');
  console.log('─'.repeat(50));
  console.log('[ ] Database backup created');
  console.log('[ ] Migration fixes reviewed');
  console.log('[ ] Dependency order verified');
  console.log('[ ] Rollback plan prepared');
  console.log('[ ] Application downtime scheduled (if needed)');
}

// Run the process
processMigrations().catch(console.error);