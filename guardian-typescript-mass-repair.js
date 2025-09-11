#!/usr/bin/env node

/**
 * 🛡️ GUARDIAN TYPESCRIPT MASS REPAIR ENGINE
 * Systematically fixes the most common TypeScript errors in WedSync
 * Targets simple, repetitive errors that can be safely automated
 */

const fs = require('fs');
const path = require('path');
const glob = require('glob');

console.log('🛡️ GUARDIAN TypeScript Mass Repair Engine Starting...');

// Common corruption patterns discovered in analysis
const CORRUPTION_REPAIR_PATTERNS = {
  // Fix malformed constants (common pattern from corruption)
  malformedConstants: {
    pattern: /const\s+([A-Z_]+)\s*=\s*([A-Z_]+);?\s*$/gm,
    replacement: (match, name, value) => {
      if (name === value) {
        // This is a circular constant - likely corruption
        return ''; // Remove it entirely
      }
      return match; // Keep legitimate constants
    }
  },

  // Fix malformed JSX expressions
  malformedJSXExpressions: {
    pattern: /className\s*=\s*([A-Z_][A-Z_]*)\s/g,
    replacement: 'className="$1" '
  },

  // Fix missing quotes in JSX attributes
  missingJSXQuotes: {
    pattern: /className\s*=\s*([a-zA-Z-]+(?:\s+[a-zA-Z-]+)*)\s/g,
    replacement: 'className="$1" '
  },

  // Fix malformed arrows and expressions
  malformedArrows: {
    pattern: /onClick\s*=\s*\{[^}]*\}>\s*([^<\s]+)\}\s*\/>/g,
    replacement: 'onClick={() => $1} />'
  },

  // Fix incomplete JSX tags
  incompleteJSXTags: {
    pattern: /data-testid\s*=\s*"([^"]*)">\s*([^<\s]+)\}\s*$/gm,
    replacement: 'data-testid="$1">\n        $2\n      </div>'
  },

  // Fix semicolon corruption in JSX
  semicolonCorruption: {
    pattern: /;\s*$/gm,
    replacement: ''
  },

  // Fix export corruption
  exportCorruption: {
    pattern: /export\s+default\s+function\s+([A-Za-z0-9_]+)\s*\(\s*\)\s*\{\s*;\s*return\s*\(\s*;\s*/g,
    replacement: 'export default function $1() {\n  return ('
  }
};

// Simple TypeScript fixes for common error patterns
const TYPESCRIPT_FIXES = {
  // TS1109: Expression expected
  fixExpressionExpected: {
    pattern: /\{\s*\}\s*$/gm,
    replacement: '{}'
  },

  // TS1145: '{' or JSX element expected
  fixJSXElementExpected: {
    pattern: /className\s*=\s*H_4_W_4_MR_2\s*/g,
    replacement: 'className="h-4 w-4 mr-2" '
  },

  // Fix MAX_PERCENTAGE and HALF_PERCENTAGE constants
  fixPercentageConstants: {
    pattern: /(bg-gray-|text-gray-)MAX_PERCENTAGE/g,
    replacement: '$1100'
  },

  fixHalfPercentageConstants: {
    pattern: /(bg-gray-|text-gray-)HALF_PERCENTAGE/g,
    replacement: '$150'
  },

  // Fix malformed class names
  fixMalformedClassNames: {
    pattern: /className\s*=\s*([A-Z_][A-Z_0-9_]*)\s/g,
    replacement: (match, className) => {
      // Convert SCREAMING_CASE to kebab-case for CSS classes
      const kebabCase = className.toLowerCase().replace(/_/g, '-');
      return `className="${kebabCase}" `;
    }
  }
};

function getAllTSXFiles() {
  const patterns = [
    'src/**/*.tsx',
    'src/**/*.ts'
  ];
  
  let allFiles = [];
  patterns.forEach(pattern => {
    const files = glob.sync(pattern);
    allFiles = allFiles.concat(files);
  });
  
  // Remove duplicates and filter out test files for now (focus on main code)
  return [...new Set(allFiles)].filter(file => 
    !file.includes('.test.') && 
    !file.includes('.spec.') && 
    !file.includes('__tests__')
  );
}

function repairFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return { fixed: false, reason: 'File not found' };
  }

  try {
    let content = fs.readFileSync(filePath, 'utf8');
    const originalContent = content;
    let fixCount = 0;

    // Apply corruption repairs first
    Object.entries(CORRUPTION_REPAIR_PATTERNS).forEach(([name, fix]) => {
      if (typeof fix.replacement === 'function') {
        content = content.replace(fix.pattern, fix.replacement);
      } else {
        const before = content;
        content = content.replace(fix.pattern, fix.replacement);
        if (before !== content) fixCount++;
      }
    });

    // Apply TypeScript-specific fixes
    Object.entries(TYPESCRIPT_FIXES).forEach(([name, fix]) => {
      if (typeof fix.replacement === 'function') {
        content = content.replace(fix.pattern, fix.replacement);
      } else {
        const before = content;
        content = content.replace(fix.pattern, fix.replacement);
        if (before !== content) fixCount++;
      }
    });

    // Only write if we made changes
    if (content !== originalContent) {
      fs.writeFileSync(filePath, content, 'utf8');
      return { fixed: true, fixCount, changes: content !== originalContent };
    }

    return { fixed: false, reason: 'No fixes needed' };
  } catch (error) {
    return { fixed: false, reason: `Error: ${error.message}` };
  }
}

function main() {
  console.log('🔍 Discovering TypeScript/TSX files...');
  const files = getAllTSXFiles();
  console.log(`📁 Found ${files.length} files to analyze`);

  let totalFixed = 0;
  let totalFixes = 0;

  console.log('🔧 Starting repair process...');

  files.forEach((file, index) => {
    if (index % 100 === 0) {
      console.log(`📊 Progress: ${index}/${files.length} files processed...`);
    }

    const result = repairFile(file);
    if (result.fixed) {
      totalFixed++;
      totalFixes += result.fixCount || 1;
      console.log(`✅ Fixed: ${file} (${result.fixCount || 1} fixes)`);
    } else if (result.reason && !result.reason.includes('No fixes needed')) {
      console.log(`⚠️ Skipped: ${file} - ${result.reason}`);
    }
  });

  console.log('\n🛡️ GUARDIAN REPAIR COMPLETE!');
  console.log(`📊 Files repaired: ${totalFixed}/${files.length}`);
  console.log(`🔧 Total fixes applied: ${totalFixes}`);
  console.log('🎯 Run npm run typecheck to see remaining errors');
  
  return { filesRepaired: totalFixed, totalFixes };
}

if (require.main === module) {
  const results = main();
  
  // Exit with status based on results
  if (results.totalFixes > 0) {
    console.log('✅ Mass repair successful - fixes applied!');
    process.exit(0);
  } else {
    console.log('ℹ️ No automated fixes could be applied to these errors');
    process.exit(1);
  }
}

module.exports = { main, repairFile, TYPESCRIPT_FIXES };