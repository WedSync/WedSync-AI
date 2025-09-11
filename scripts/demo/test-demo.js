#!/usr/bin/env node

/**
 * WedSync Demo Testing Script
 * Comprehensive testing suite for demo mode functionality
 */

const fs = require('fs');
const path = require('path');

// ANSI color codes
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m'
};

// Demo configuration (should match src/lib/demo/config.ts)
const DEMO_PERSONAS = [
  'photographer-everlight',
  'videographer-silver-lining',
  'dj-sunset-sounds',
  'florist-petal-stem',
  'caterer-taste-thyme',
  'musicians-velvet-strings',
  'venue-old-barn',
  'hair-glow-hair',
  'makeup-bloom-makeup',
  'planner-plan-poise',
  'couple-sarah-michael',
  'couple-emma-james',
  'couple-alex-jordan',
  'admin-wedsync'
];

const REQUIRED_ASSETS = [
  'public/demo/logos/supplier-logos.png',
  'public/demo/avatars/couple-sarah-michael.png',
  'public/demo/avatars/couple-emma-james.png',
  'public/demo/avatars/couple-alex-jordan.png'
];

const REQUIRED_FILES = [
  'src/lib/demo/config.ts',
  'src/lib/demo/auth-provider.tsx',
  'src/lib/demo/brand-assets.ts',
  'src/lib/demo/screenshot-helpers.ts',
  'src/lib/demo/demo-time-hook.ts',
  'src/lib/demo/data-provider.ts',
  'src/app/demo/page.tsx',
  'src/components/demo/SupplierTiles.tsx',
  'src/components/demo/ScreenshotModeToggle.tsx',
  'src/components/demo/DemoAssetsProvider.tsx',
  'src/styles/demo-logos.css',
  'docs/demo-mode.md',
  'supabase/migrations/20250122000010_demo_mode_data.sql',
  'supabase/seed/demo_seed.ts'
];

// Helper functions
function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSuccess(message) {
  log(`✅ ${message}`, 'green');
}

function logError(message) {
  log(`❌ ${message}`, 'red');
}

function logWarning(message) {
  log(`⚠️  ${message}`, 'yellow');
}

function logInfo(message) {
  log(`ℹ️  ${message}`, 'blue');
}

function logHeader(message) {
  log(`\n${'='.repeat(50)}`, 'magenta');
  log(`  ${message}`, 'magenta');
  log(`${'='.repeat(50)}\n`, 'magenta');
}

// Test functions
function testEnvironmentSetup() {
  logHeader('Testing Environment Setup');
  
  let passed = 0;
  let total = 0;
  
  // Check NEXT_PUBLIC_DEMO_MODE
  total++;
  if (process.env.NEXT_PUBLIC_DEMO_MODE === 'true') {
    logSuccess('NEXT_PUBLIC_DEMO_MODE is set correctly');
    passed++;
  } else {
    logError('NEXT_PUBLIC_DEMO_MODE is not set to "true"');
    logInfo('Set with: export NEXT_PUBLIC_DEMO_MODE=true');
  }
  
  // Check package.json has demo scripts
  total++;
  try {
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    const demoScripts = Object.keys(packageJson.scripts).filter(script => script.startsWith('demo:'));
    
    if (demoScripts.length >= 10) {
      logSuccess(`Found ${demoScripts.length} demo scripts in package.json`);
      passed++;
    } else {
      logError(`Only found ${demoScripts.length} demo scripts (expected at least 10)`);
    }
  } catch (error) {
    logError('Could not read package.json');
  }
  
  return { passed, total };
}

function testRequiredFiles() {
  logHeader('Testing Required Files');
  
  let passed = 0;
  const total = REQUIRED_FILES.length;
  
  REQUIRED_FILES.forEach(filePath => {
    if (fs.existsSync(filePath)) {
      logSuccess(`Found: ${filePath}`);
      passed++;
    } else {
      logError(`Missing: ${filePath}`);
    }
  });
  
  return { passed, total };
}

function testAssets() {
  logHeader('Testing Demo Assets');
  
  let passed = 0;
  const total = REQUIRED_ASSETS.length;
  
  REQUIRED_ASSETS.forEach(assetPath => {
    if (fs.existsSync(assetPath)) {
      const stats = fs.statSync(assetPath);
      const sizeKB = Math.round(stats.size / 1024);
      logSuccess(`Found: ${assetPath} (${sizeKB}KB)`);
      passed++;
    } else {
      logError(`Missing: ${assetPath}`);
    }
  });
  
  // Check CSS file contains logo classes
  const cssPath = 'src/styles/demo-logos.css';
  if (fs.existsSync(cssPath)) {
    const cssContent = fs.readFileSync(cssPath, 'utf8');
    const logoClasses = DEMO_PERSONAS.filter(persona => 
      persona.startsWith('photographer-') || 
      persona.startsWith('videographer-') ||
      persona.startsWith('dj-') ||
      persona.startsWith('florist-') ||
      persona.startsWith('caterer-') ||
      persona.startsWith('musicians-') ||
      persona.startsWith('venue-') ||
      persona.startsWith('hair-') ||
      persona.startsWith('makeup-') ||
      persona.startsWith('planner-')
    );
    
    const missingClasses = logoClasses.filter(persona => 
      !cssContent.includes(`.demo-logo-${persona}`)
    );
    
    if (missingClasses.length === 0) {
      logSuccess(`All ${logoClasses.length} logo CSS classes found`);
    } else {
      logWarning(`Missing ${missingClasses.length} logo CSS classes: ${missingClasses.join(', ')}`);
    }
  }
  
  return { passed, total };
}

function testConfiguration() {
  logHeader('Testing Demo Configuration');
  
  let passed = 0;
  let total = 0;
  
  // Test config file syntax (basic check)
  total++;
  try {
    const configPath = 'src/lib/demo/config.ts';
    const configContent = fs.readFileSync(configPath, 'utf8');
    
    // Check for key exports
    const requiredExports = [
      'isDemoMode',
      'DEMO_PERSONAS',
      'DEMO_COUPLES',
      'SCREENSHOT_MODE',
      'DEMO_FROZEN_TIME',
      'getPersonaById'
    ];
    
    const missingExports = requiredExports.filter(exportName => 
      !configContent.includes(`export const ${exportName}`) && 
      !configContent.includes(`export function ${exportName}`)
    );
    
    if (missingExports.length === 0) {
      logSuccess('All required config exports found');
      passed++;
    } else {
      logError(`Missing config exports: ${missingExports.join(', ')}`);
    }
  } catch (error) {
    logError('Could not read demo config file');
  }
  
  // Test personas count
  total++;
  const expectedPersonas = DEMO_PERSONAS.length;
  if (expectedPersonas >= 12) {
    logSuccess(`Found ${expectedPersonas} demo personas`);
    passed++;
  } else {
    logError(`Only ${expectedPersonas} personas found (expected at least 12)`);
  }
  
  return { passed, total };
}

function testDatabaseMigrations() {
  logHeader('Testing Database Setup');
  
  let passed = 0;
  let total = 0;
  
  // Check migration file exists
  total++;
  const migrationPath = 'supabase/migrations/20250122000010_demo_mode_data.sql';
  if (fs.existsSync(migrationPath)) {
    logSuccess('Demo migration file found');
    passed++;
    
    // Check migration contains required tables
    const migrationContent = fs.readFileSync(migrationPath, 'utf8');
    const requiredTables = ['suppliers', 'clients', 'supplier_client_connections'];
    
    requiredTables.forEach(table => {
      total++;
      if (migrationContent.includes(`CREATE TABLE`) && migrationContent.includes(table)) {
        logSuccess(`Migration includes ${table} table`);
        passed++;
      } else {
        logError(`Migration missing ${table} table`);
      }
    });
  } else {
    logError('Demo migration file not found');
  }
  
  // Check seed file exists
  total++;
  const seedPath = 'supabase/seed/demo_seed.ts';
  if (fs.existsSync(seedPath)) {
    logSuccess('Demo seed file found');
    passed++;
  } else {
    logError('Demo seed file not found');
  }
  
  return { passed, total };
}

function testScreenshotMode() {
  logHeader('Testing Screenshot Mode');
  
  let passed = 0;
  let total = 0;
  
  // Check screenshot helpers file
  total++;
  const helpersPath = 'src/lib/demo/screenshot-helpers.ts';
  if (fs.existsSync(helpersPath)) {
    logSuccess('Screenshot helpers file found');
    passed++;
    
    // Check for key functions
    const helpersContent = fs.readFileSync(helpersPath, 'utf8');
    const requiredFunctions = [
      'enableScreenshotMode',
      'disableScreenshotMode',
      'isScreenshotMode',
      'getDemoTime',
      'formatDemoTime'
    ];
    
    requiredFunctions.forEach(func => {
      total++;
      if (helpersContent.includes(`export const ${func}`) || helpersContent.includes(`export function ${func}`)) {
        logSuccess(`Found screenshot function: ${func}`);
        passed++;
      } else {
        logError(`Missing screenshot function: ${func}`);
      }
    });
  } else {
    logError('Screenshot helpers file not found');
  }
  
  return { passed, total };
}

function testBrandAssets() {
  logHeader('Testing Brand Assets Integration');
  
  let passed = 0;
  let total = 0;
  
  // Check brand assets file
  total++;
  const assetsPath = 'src/lib/demo/brand-assets.ts';
  if (fs.existsSync(assetsPath)) {
    logSuccess('Brand assets file found');
    passed++;
    
    // Check for key functions
    const assetsContent = fs.readFileSync(assetsPath, 'utf8');
    const requiredFunctions = [
      'getSupplierLogo',
      'getSupplierColors',
      'getCoupleAvatar',
      'SupplierLogoBg'
    ];
    
    requiredFunctions.forEach(func => {
      total++;
      if (assetsContent.includes(func)) {
        logSuccess(`Found brand asset function: ${func}`);
        passed++;
      } else {
        logError(`Missing brand asset function: ${func}`);
      }
    });
  } else {
    logError('Brand assets file not found');
  }
  
  return { passed, total };
}

function testDocumentation() {
  logHeader('Testing Documentation');
  
  let passed = 0;
  let total = 0;
  
  // Check main documentation
  total++;
  const docsPath = 'docs/demo-mode.md';
  if (fs.existsSync(docsPath)) {
    const docsContent = fs.readFileSync(docsPath, 'utf8');
    const wordCount = docsContent.split(/\s+/).length;
    
    if (wordCount >= 1000) {
      logSuccess(`Documentation found (${wordCount} words)`);
      passed++;
    } else {
      logWarning(`Documentation found but seems short (${wordCount} words)`);
      passed++;
    }
    
    // Check for key sections
    const requiredSections = [
      'Quick Start',
      'Architecture',
      'Demo Personas',
      'Configuration',
      'Screenshots & Frozen Time',
      'Troubleshooting'
    ];
    
    requiredSections.forEach(section => {
      total++;
      if (docsContent.includes(section)) {
        logSuccess(`Documentation includes: ${section}`);
        passed++;
      } else {
        logError(`Documentation missing: ${section}`);
      }
    });
  } else {
    logError('Demo documentation not found');
  }
  
  return { passed, total };
}

function generateTestUrls() {
  logHeader('Demo URLs for Testing');
  
  console.log('🔗 Test these URLs manually:');
  console.log('');
  
  // Main demo page
  logInfo('Demo Selector:');
  console.log('  http://localhost:3000/demo');
  console.log('');
  
  // Persona URLs
  logInfo('Supplier Personas:');
  DEMO_PERSONAS.filter(p => p.includes('-')).slice(0, 5).forEach(persona => {
    console.log(`  http://localhost:3000/demo?persona=${persona}`);
  });
  
  logInfo('Couple Personas:');
  DEMO_PERSONAS.filter(p => p.startsWith('couple-')).forEach(persona => {
    console.log(`  http://localhost:3000/demo?persona=${persona}`);
  });
  
  logInfo('Admin Persona:');
  console.log('  http://localhost:3000/demo?persona=admin-wedsync');
  console.log('');
  
  // Screenshot mode
  logInfo('Screenshot Mode:');
  console.log('  http://localhost:3000/demo?screenshot=1');
  console.log('  http://localhost:3000/demo?persona=photographer-everlight&screenshot=1');
  console.log('');
}

// Main test runner
function runAllTests() {
  log('🧪 WedSync Demo Mode Test Suite', 'cyan');
  log('=====================================', 'cyan');
  
  const results = [];
  
  results.push(testEnvironmentSetup());
  results.push(testRequiredFiles());
  results.push(testAssets());
  results.push(testConfiguration());
  results.push(testDatabaseMigrations());
  results.push(testScreenshotMode());
  results.push(testBrandAssets());
  results.push(testDocumentation());
  
  // Calculate totals
  const totalPassed = results.reduce((sum, result) => sum + result.passed, 0);
  const totalTests = results.reduce((sum, result) => sum + result.total, 0);
  const percentage = Math.round((totalPassed / totalTests) * 100);
  
  // Print summary
  logHeader('Test Results Summary');
  
  if (percentage >= 90) {
    logSuccess(`${totalPassed}/${totalTests} tests passed (${percentage}%) - Excellent!`);
  } else if (percentage >= 75) {
    logWarning(`${totalPassed}/${totalTests} tests passed (${percentage}%) - Good, but some issues`);
  } else {
    logError(`${totalPassed}/${totalTests} tests passed (${percentage}%) - Needs attention`);
  }
  
  generateTestUrls();
  
  // Exit with appropriate code
  process.exit(percentage >= 75 ? 0 : 1);
}

// Run the tests
runAllTests();