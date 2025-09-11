#!/usr/bin/env node
/**
 * Automated TypeScript Error Fixer for WedSync
 * Fixes the most common TypeScript patterns that are causing 5000+ errors
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🔧 WedSync TypeScript Error Auto-Fixer');
console.log('====================================');

const fixes = [
  {
    name: 'JSX Syntax Errors - bg-opacity-HALF_PERCENTAGE',
    pattern: /bg-opacity-HALF_PERCENTAGE/g,
    replacement: 'bg-opacity-50',
    files: '**/*.tsx'
  },
  {
    name: 'JSX Syntax Errors - Malformed onClick',
    pattern: /onClick\s*\(\)\s*=>/g,
    replacement: 'onClick={() =>',
    files: '**/*.tsx'
  },
  {
    name: 'JSX Syntax Errors - data-testid attribute placement',
    pattern: /= data-testid="([^"]+)"/g,
    replacement: '" data-testid="$1"',
    files: '**/*.tsx'
  },
  {
    name: 'TypeScript any types - General cleanup',
    pattern: /: any\b/g,
    replacement: ': unknown',
    files: '**/*.ts'
  },
  {
    name: 'TypeScript any types - Function parameters',
    pattern: /\(([^)]*): any\)/g,
    replacement: '($1: unknown)',
    files: '**/*.ts'
  },
  {
    name: 'TypeScript any types - Array types',
    pattern: /: any\[\]/g,
    replacement: ': unknown[]',
    files: '**/*.ts'
  },
  {
    name: 'Missing imports - React',
    pattern: /^(?!.*import.*React)(.*)export default function/gm,
    replacement: 'import React from "react"\n$1export default function',
    files: '**/*.tsx'
  },
  {
    name: 'Octal literals - Replace with proper syntax',
    pattern: /\b0([0-7]+)\b/g,
    replacement: '0o$1',
    files: '**/*.ts'
  },
  {
    name: 'Interface property syntax errors',
    pattern: /^(\s*)([a-zA-Z_$][a-zA-Z0-9_$]*)\s*$/gm,
    replacement: '$1$2: unknown;',
    files: '**/*.ts'
  }
];

function findFiles(pattern, dir = './src') {
  try {
    return execSync(`find ${dir} -name "${pattern}" -type f`, { encoding: 'utf8' })
      .split('\n')
      .filter(file => file.trim())
      .slice(0, 50); // Limit to avoid overwhelming
  } catch (error) {
    console.warn(`Could not find files matching ${pattern}:`, error.message);
    return [];
  }
}

function applyFix(fix) {
  console.log(`\n🔨 Applying fix: ${fix.name}`);
  
  const files = findFiles(fix.files.replace('**/', '*.'));
  let fixCount = 0;
  
  files.forEach(filePath => {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const newContent = content.replace(fix.pattern, fix.replacement);
      
      if (content !== newContent) {
        fs.writeFileSync(filePath, newContent);
        fixCount++;
      }
    } catch (error) {
      console.warn(`  ⚠️  Could not process ${filePath}:`, error.message);
    }
  });
  
  console.log(`  ✅ Fixed ${fixCount} files`);
  return fixCount;
}

// Apply all fixes
let totalFixes = 0;
fixes.forEach(fix => {
  try {
    totalFixes += applyFix(fix);
  } catch (error) {
    console.error(`❌ Error applying fix "${fix.name}":`, error.message);
  }
});

console.log(`\n🎉 TypeScript Auto-Fix Complete!`);
console.log(`📊 Total files processed: ${totalFixes}`);
console.log(`\n🔍 Run 'npm run typecheck' to verify improvements`);

// Run a quick type check to show progress
console.log('\n🧪 Running quick type check...');
try {
  execSync('npm run typecheck 2>&1 | head -20', { stdio: 'inherit' });
} catch (error) {
  console.log('Type check results available above.');
}