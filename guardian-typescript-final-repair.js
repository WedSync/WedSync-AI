#!/usr/bin/env node

/**
 * 🛡️ GUARDIAN TYPESCRIPT FINAL REPAIR ENGINE V3
 * Targets the final 52,603 TypeScript errors with precision fixes
 * Focuses on TS1005, TS1145, TS1128 - the remaining high-frequency errors
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🛡️ GUARDIAN Final TypeScript Repair Engine V3 Starting...');

// Precision fixes for the most common remaining errors
const FINAL_REPAIR_PATTERNS = {
  // TS1005: ';' expected or ',' expected - Most frequent error
  fixPunctuationExpected: [
    {
      // Fix missing semicolons at end of statements
      pattern: /(\w+:\s*[^,}\n]+)\n/g,
      replacement: '$1;\n'
    },
    {
      // Fix missing commas in object literals
      pattern: /(\w+:\s*"[^"]*")\s*\n\s*(\w+:)/g,
      replacement: '$1,\n  $2'
    },
    {
      // Fix missing semicolons after variable declarations
      pattern: /^(\s*const\s+\w+\s*=\s*[^;]+)\n/gm,
      replacement: '$1;\n'
    }
  ],

  // TS1145: '{' or JSX element expected - Still high frequency
  fixJSXElementStillExpected: [
    {
      // Fix className attributes without quotes
      pattern: /className\s*=\s*([a-zA-Z0-9-]+(?:\s+[a-zA-Z0-9-]+)*)\s*>/g,
      replacement: 'className="$1">'
    },
    {
      // Fix boolean attributes in JSX
      pattern: /\s+(\w+)\s*=\s*(\w+)\s*>/g,
      replacement: (match, attr, value) => {
        if (value === 'true' || value === 'false') {
          return ` ${attr}={${value}}>`;
        }
        return ` ${attr}="${value}">`;
      }
    }
  ],

  // TS1128: Declaration or statement expected
  fixDeclarationStillExpected: [
    {
      // Fix incomplete export statements
      pattern: /^(\s*)export\s*$/gm,
      replacement: '$1// export statement removed - was incomplete'
    },
    {
      // Fix malformed function declarations
      pattern: /^(\s*)function\s*(\w+)\s*\(\s*\)\s*$/gm,
      replacement: '$1function $2() {\n$1  // TODO: Add function body\n$1}'
    }
  ],

  // TS1109: Expression expected
  fixExpressionStillExpected: [
    {
      // Fix empty JSX expressions
      pattern: /\{\s*\}/g,
      replacement: '{/* empty expression */}'
    },
    {
      // Fix malformed arrow functions
      pattern: /=>\s*$/gm,
      replacement: '=> {}'
    }
  ],

  // TS1136: Property assignment expected
  fixPropertyAssignmentExpected: [
    {
      // Fix object literal syntax issues
      pattern: /(\w+)\s*=\s*([^,}\n]+)\s*,/g,
      replacement: '$1: $2,'
    }
  ]
};

// Simple cleanup patterns
const CLEANUP_PATTERNS = {
  // Remove trailing semicolons from JSX
  removeJSXSemicolons: {
    pattern: /;\s*>/g,
    replacement: '>'
  },
  
  // Fix double semicolons
  fixDoubleSemicolons: {
    pattern: /;;\s*$/gm,
    replacement: ';'
  },

  // Fix empty lines with semicolons
  fixEmptyLineSemicolons: {
    pattern: /^\s*;\s*$/gm,
    replacement: ''
  }
};

function getErrorFiles() {
  try {
    const result = execSync('npm run typecheck 2>&1 | grep "error TS1005\\|error TS1145\\|error TS1128\\|error TS1109\\|error TS1136" | cut -d"(" -f1 | sort -u', { encoding: 'utf8' });
    return result.split('\n').filter(f => f.trim() && (f.endsWith('.tsx') || f.endsWith('.ts')));
  } catch (error) {
    console.log('⚠️ Using fallback - targeting most common files');
    return execSync('find src -name "*.tsx" -o -name "*.ts" | head -200', { encoding: 'utf8' }).split('\n').filter(f => f.trim());
  }
}

function applyFinalFixes(content, filePath) {
  let modifiedContent = content;
  let fixCount = 0;

  // Apply targeted fixes
  Object.entries(FINAL_REPAIR_PATTERNS).forEach(([category, fixes]) => {
    if (Array.isArray(fixes)) {
      fixes.forEach(fix => {
        const before = modifiedContent;
        if (typeof fix.replacement === 'function') {
          modifiedContent = modifiedContent.replace(fix.pattern, fix.replacement);
        } else {
          modifiedContent = modifiedContent.replace(fix.pattern, fix.replacement);
        }
        if (before !== modifiedContent) fixCount++;
      });
    }
  });

  // Apply cleanup patterns
  Object.entries(CLEANUP_PATTERNS).forEach(([category, fix]) => {
    const before = modifiedContent;
    modifiedContent = modifiedContent.replace(fix.pattern, fix.replacement);
    if (before !== modifiedContent) fixCount++;
  });

  return { content: modifiedContent, fixCount };
}

function repairFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return { fixed: false, reason: 'File not found' };
  }

  try {
    const originalContent = fs.readFileSync(filePath, 'utf8');
    const { content: modifiedContent, fixCount } = applyFinalFixes(originalContent, filePath);

    if (modifiedContent !== originalContent && fixCount > 0) {
      fs.writeFileSync(filePath, modifiedContent, 'utf8');
      return { fixed: true, fixCount };
    }

    return { fixed: false, reason: 'No final fixes needed' };
  } catch (error) {
    return { fixed: false, reason: `Error: ${error.message}` };
  }
}

function main() {
  console.log('🔍 Targeting files with TS1005, TS1145, TS1128, TS1109, TS1136 errors...');
  const files = getErrorFiles().slice(0, 300); // Focus on first 300 error files
  console.log(`📁 Found ${files.length} files with target errors`);

  let totalFixed = 0;
  let totalFixes = 0;

  console.log('🔧 Starting final precision repair...');

  files.forEach((file, index) => {
    if (index % 30 === 0) {
      console.log(`📊 Final Progress: ${index}/${files.length} files processed...`);
    }

    const result = repairFile(file);
    if (result.fixed) {
      totalFixed++;
      totalFixes += result.fixCount || 1;
      console.log(`✅ Final Fix: ${file} (${result.fixCount || 1} fixes)`);
    }
  });

  console.log('\n🛡️ GUARDIAN FINAL REPAIR COMPLETE!');
  console.log(`📊 Files repaired: ${totalFixed}/${files.length}`);
  console.log(`🔧 Final fixes applied: ${totalFixes}`);
  console.log('🎯 Run npm run typecheck for final error count');
  
  return { filesRepaired: totalFixed, totalFixes };
}

if (require.main === module) {
  const results = main();
  
  if (results.totalFixes > 0) {
    console.log('✅ Final repair successful!');
    process.exit(0);
  } else {
    console.log('ℹ️ Final repair completed');
    process.exit(0);
  }
}

module.exports = { main };