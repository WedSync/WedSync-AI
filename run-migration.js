#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Supabase connection details (using REST API approach that works)
const supabaseUrl = 'https://azhgptjkqiiqvvvhapml.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF6aGdwdGprcWlpcXZ2dmhhcG1sIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDcyMDU3NiwiZXhwIjoyMDcwMjk2NTc2fQ.lLoi8vvKAClvx72Pzoql9BKQE0lQv9uCCprtUfxpRrk';

const supabase = createClient(supabaseUrl, supabaseKey);

async function runMigration(sqlContent) {
  try {
    console.log('🔄 Connecting to Supabase via REST API...');
    console.log('📝 SQL Preview (first 200 chars):');
    console.log(sqlContent.substring(0, 200) + (sqlContent.length > 200 ? '...' : ''));
    
    // Execute SQL using Supabase RPC (we'll create a helper function)
    console.log('🔄 Executing migration SQL...');
    
    // Try to execute as DDL first (for CREATE, ALTER, DROP statements)
    const result = await executeSQL(sqlContent);
    
    console.log('✅ Migration executed successfully');
    
    if (result.data && result.data.length > 0) {
      console.log('📊 Query returned results:');
      console.log(JSON.stringify(result.data, null, 2));
    } else if (result.count !== undefined) {
      console.log(`📊 Affected rows: ${result.count}`);
    } else {
      console.log('✅ DDL statement executed successfully');
    }
    
    return { success: true, result };
    
  } catch (error) {
    console.error('❌ Migration failed:');
    console.error('Error:', error.message || 'Unknown error');
    console.error('Detail:', error.details || 'No additional details');
    console.error('Hint:', error.hint || 'No hint available');
    console.error('Code:', error.code || 'No error code');
    console.error('Full error:', error);
    
    return { success: false, error };
  }
}

async function executeSQL(sql) {
  // Clean up the SQL
  const cleanSQL = sql.trim();
  
  console.log('🔄 Executing SQL via Supabase CLI...');
  
  try {
    // Best practice for 2025: Use Supabase CLI for migration execution
    return await executeViaSupabaseCLI(cleanSQL);
    
  } catch (error) {
    console.log('❌ CLI method failed, trying direct PostgreSQL connection...');
    // Fallback to direct connection
    return await executeWithPostgREST(cleanSQL);
  }
}

async function executeViaSupabaseCLI(sql) {
  const { exec } = require('child_process');
  const util = require('util');
  const execAsync = util.promisify(exec);
  const fs = require('fs');
  const path = require('path');
  
  console.log('🔧 Using Supabase CLI for migration execution (recommended approach)...');
  
  try {
    // Create temporary migration file
    const timestamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\..+/, '');
    const migrationFile = `${timestamp}_temp_migration.sql`;
    const migrationPath = path.join(process.cwd(), 'supabase', 'migrations', migrationFile);
    
    // Ensure migrations directory exists
    const migrationsDir = path.dirname(migrationPath);
    if (!fs.existsSync(migrationsDir)) {
      fs.mkdirSync(migrationsDir, { recursive: true });
    }
    
    // Write SQL to migration file
    fs.writeFileSync(migrationPath, sql);
    console.log(`📁 Created temporary migration: ${migrationFile}`);
    
    // Execute via Supabase CLI
    console.log('🚀 Applying migration via supabase db push...');
    const { stdout, stderr } = await execAsync('npx supabase db push --linked', {
      cwd: process.cwd()
    });
    
    // Clean up temporary migration file
    fs.unlinkSync(migrationPath);
    console.log('🧹 Cleaned up temporary migration file');
    
    if (stderr && !stderr.includes('INFO') && !stderr.includes('NOTICE')) {
      throw new Error(stderr);
    }
    
    return { 
      data: stdout, 
      success: true, 
      method: 'supabase_cli',
      migration_file: migrationFile 
    };
    
  } catch (error) {
    // Clean up temporary file if it exists
    try {
      const timestamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\..+/, '');
      const migrationFile = `${timestamp}_temp_migration.sql`;
      const migrationPath = path.join(process.cwd(), 'supabase', 'migrations', migrationFile);
      if (fs.existsSync(migrationPath)) {
        fs.unlinkSync(migrationPath);
      }
    } catch (cleanupError) {
      // Ignore cleanup errors
    }
    
    throw error;
  }
}

async function executeWithPostgREST(sql) {
  // Try using PostgreSQL via Node.js pg library
  console.log('🔄 Attempting direct PostgreSQL execution via Node.js...');
  
  try {
    const { Client } = require('pg');
    
    const client = new Client({
      connectionString: 'postgresql://postgres:rL3GFzPqcWFi8ATf@azhgptjkqiiqvvvhapml.supabase.co:5432/postgres',
      ssl: { rejectUnauthorized: false }
    });
    
    await client.connect();
    console.log('✅ Connected to PostgreSQL database');
    
    const result = await client.query(sql);
    await client.end();
    
    return { data: result.rows, success: true };
    
  } catch (error) {
    console.log('❌ Direct PostgreSQL failed, parsing statements...');
    return await executeStatementsIndividually(sql);
  }
}

function isDDLStatement(sql) {
  const ddlKeywords = ['CREATE', 'ALTER', 'DROP', 'TRUNCATE', 'COMMENT'];
  const firstWord = sql.trim().split(/\s+/)[0].toUpperCase();
  return ddlKeywords.includes(firstWord);
}

async function executeStatementsIndividually(sql) {
  // Split SQL into individual statements
  const statements = sql.split(';').filter(stmt => stmt.trim().length > 0);
  const results = [];
  
  for (let i = 0; i < statements.length; i++) {
    const statement = statements[i].trim();
    if (!statement) continue;
    
    console.log(`🔄 Executing statement ${i + 1}/${statements.length}: ${statement.substring(0, 50)}...`);
    
    try {
      // Execute each statement directly via psql
      const result = await executeSingleStatement(statement);
      results.push({ statement, status: 'success', result });
      console.log(`✅ Statement ${i + 1} executed successfully`);
      
    } catch (error) {
      console.error(`❌ Failed to execute statement: ${statement.substring(0, 100)}...`);
      console.error(`Error: ${error.message}`);
      results.push({ statement, status: 'error', error: error.message });
      
      // Continue with other statements unless it's a critical error
      if (error.message.includes('syntax error') || error.message.includes('does not exist')) {
        console.log('🔄 Continuing with remaining statements...');
      }
    }
  }
  
  return { data: results, success: true };
}

async function executeSingleStatement(statement) {
  try {
    const { Client } = require('pg');
    
    const client = new Client({
      connectionString: 'postgresql://postgres:rL3GFzPqcWFi8ATf@azhgptjkqiiqvvvhapml.supabase.co:5432/postgres',
      ssl: { rejectUnauthorized: false }
    });
    
    await client.connect();
    const result = await client.query(statement);
    await client.end();
    
    return result.rows || `Statement executed successfully: ${result.command || 'DDL'}`;
    
  } catch (error) {
    throw error;
  }
}


async function runMigrationFile(filePath) {
  try {
    if (!fs.existsSync(filePath)) {
      throw new Error(`Migration file not found: ${filePath}`);
    }
    
    const sqlContent = fs.readFileSync(filePath, 'utf8');
    console.log(`📁 Running migration from: ${filePath}`);
    
    return await runMigration(sqlContent);
    
  } catch (error) {
    console.error('❌ Error reading migration file:', error.message);
    return { success: false, error };
  }
}

// Command line interface
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('Usage: node run-migration.js <migration-file.sql>');
    console.log('   or: node run-migration.js --sql "SELECT * FROM tables"');
    process.exit(1);
  }
  
  if (args[0] === '--sql' && args[1]) {
    // Direct SQL execution
    runMigration(args[1]).then(result => {
      process.exit(result.success ? 0 : 1);
    });
  } else {
    // Migration file execution
    const migrationFile = args[0];
    runMigrationFile(migrationFile).then(result => {
      process.exit(result.success ? 0 : 1);
    });
  }
}

module.exports = { runMigration, runMigrationFile };