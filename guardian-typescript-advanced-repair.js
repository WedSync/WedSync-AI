#!/usr/bin/env node

/**
 * 🛡️ GUARDIAN TYPESCRIPT ADVANCED REPAIR ENGINE V2
 * Targets the remaining 21,945 TypeScript errors with enhanced patterns
 * Focuses on more complex syntax issues and edge cases
 */

const fs = require('fs');
const path = require('path');
const glob = require('glob');

console.log('🛡️ GUARDIAN Advanced TypeScript Repair Engine V2 Starting...');

// Enhanced patterns for remaining error types
const ADVANCED_REPAIR_PATTERNS = {
  // TS1145: '{' or JSX element expected - Enhanced patterns
  fixJSXElementExpected: [
    {
      // Fix malformed className attributes with constants
      pattern: /className\s*=\s*([A-Z_][A-Z_0-9]*)\s*(?=[>\s])/g,
      replacement: (match, className) => {
        // Convert common constant patterns to actual CSS classes
        const classMap = {
          'H_4_W_4_MR_2': 'h-4 w-4 mr-2',
          'MAX_PERCENTAGE': '100',
          'HALF_PERCENTAGE': '50',
          'FULL_WIDTH': 'w-full',
          'FULL_HEIGHT': 'h-full'
        };
        const cssClass = classMap[className] || className.toLowerCase().replace(/_/g, '-');
        return `className="${cssClass}"`;
      }
    },
    {
      // Fix missing quotes around class names
      pattern: /className\s*=\s*([a-zA-Z0-9\s-]+(?:\s+[a-zA-Z0-9-]+)*)\s*(?=[>\s])/g,
      replacement: 'className="$1"'
    }
  ],

  // TS1109: Expression expected - Enhanced patterns
  fixExpressionExpected: [
    {
      // Fix incomplete JSX expressions
      pattern: /\{\s*\}\s*>\s*([^<]+)\s*$/gm,
      replacement: '>\n        $1\n      '
    },
    {
      // Fix malformed onClick handlers
      pattern: /onClick\s*=\s*\{[^}]*\}>\s*([^<\s]+)\}/g,
      replacement: 'onClick={() => $1}'
    }
  ],

  // TS1005: ';' expected - Enhanced patterns
  fixSemicolonExpected: [
    {
      // Fix missing semicolons in object properties
      pattern: /(\w+):\s*([^,}\n]+)\n/g,
      replacement: '$1: $2;\n'
    }
  ],

  // TS1382: Unexpected token in JSX
  fixUnexpectedJSXToken: [
    {
      // Fix malformed JSX attributes
      pattern: /(\w+)\s*=\s*data-testid\s*=\s*"([^"]*)">/g,
      replacement: '$1 data-testid="$2">'
    },
    {
      // Fix JSX boolean attributes
      pattern: /(\w+)\s*=\s*(\w+)\s*>/g,
      replacement: (match, attr, value) => {
        if (value === 'true' || value === 'false') {
          return `${attr}={${value}}>`;
        }
        return `${attr}="${value}">`;
      }
    }
  ],

  // TS1128: Declaration or statement expected
  fixDeclarationExpected: [
    {
      // Fix malformed function declarations
      pattern: /export\s+default\s+function\s+([A-Za-z0-9_]+)\s*\(\s*\)\s*\{\s*;\s*/g,
      replacement: 'export default function $1() {\n  '
    }
  ],

  // TS17002: Unknown module fixes
  fixUnknownModule: [
    {
      // Fix relative imports with missing extensions
      pattern: /import\s+([^}]+)\s+from\s+['"](\.[^'"]*)['"]/g,
      replacement: (match, imports, path) => {
        if (!path.endsWith('.ts') && !path.endsWith('.tsx')) {
          const ext = fs.existsSync(path + '.tsx') ? '.tsx' : '.ts';
          return `import ${imports} from '${path}${ext}'`;
        }
        return match;
      }
    }
  ],

  // TS6188: Numeric separators issues
  fixNumericSeparators: [
    {
      // Fix malformed numeric literals
      pattern: /(\d)_(\d)/g,
      replacement: '$1$2'
    }
  ]
};

// JSX-specific fixes for complex components
const JSX_SPECIFIC_FIXES = {
  // Fix incomplete JSX tags
  incompleteJSXTags: {
    pattern: /<(\w+)\s+([^>]*)\s*>\s*([^<\s]+)\s*$/gm,
    replacement: '<$1 $2>\n      $3\n    </$1>'
  },

  // Fix malformed JSX expressions in attributes
  malformedJSXExpressions: {
    pattern: /(\w+)\s*=\s*\{\s*([^}]*)\s*\}\s*>\s*([^<]+)\}/g,
    replacement: '$1={$2}>\n        $3\n      '
  },

  // Fix data-testid corruption
  fixDataTestId: {
    pattern: /data-testid\s*=\s*"([^"]*)">\s*([^<\s]+)\}\s*$/gm,
    replacement: 'data-testid="$1">\n        $2\n      </div>'
  }
};

function getAllErrorFiles() {
  // Get files that currently have TypeScript errors
  const { execSync } = require('child_process');
  try {
    const result = execSync('npm run typecheck 2>&1 | grep "error TS" | cut -d"(" -f1 | sort -u', { encoding: 'utf8' });
    return result.split('\n').filter(f => f.trim() && f.endsWith('.tsx') || f.endsWith('.ts'));
  } catch (error) {
    console.log('⚠️ Using fallback file discovery');
    return glob.sync('src/**/*.{ts,tsx}').filter(file => 
      !file.includes('.test.') && !file.includes('__tests__')
    );
  }
}

function applyAdvancedFixes(content, filePath) {
  let modifiedContent = content;
  let fixCount = 0;

  // Apply each category of fixes
  Object.entries(ADVANCED_REPAIR_PATTERNS).forEach(([category, fixes]) => {
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
    } else {
      const before = modifiedContent;
      if (typeof fixes.replacement === 'function') {
        modifiedContent = modifiedContent.replace(fixes.pattern, fixes.replacement);
      } else {
        modifiedContent = modifiedContent.replace(fixes.pattern, fixes.replacement);
      }
      if (before !== modifiedContent) fixCount++;
    }
  });

  // Apply JSX-specific fixes
  Object.entries(JSX_SPECIFIC_FIXES).forEach(([category, fix]) => {
    const before = modifiedContent;
    if (typeof fix.replacement === 'function') {
      modifiedContent = modifiedContent.replace(fix.pattern, fix.replacement);
    } else {
      modifiedContent = modifiedContent.replace(fix.pattern, fix.replacement);
    }
    if (before !== modifiedContent) fixCount++;
  });

  // Additional context-aware fixes
  if (filePath.includes('page.tsx')) {
    // Fix common page component patterns
    modifiedContent = modifiedContent.replace(
      /export default function ([A-Za-z0-9_]+)\(\)\s*\{\s*;\s*return\s*\(\s*;\s*/g,
      'export default function $1() {\n  return ('
    );
  }

  return { content: modifiedContent, fixCount };
}

function repairFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return { fixed: false, reason: 'File not found' };
  }

  try {
    const originalContent = fs.readFileSync(filePath, 'utf8');
    const { content: modifiedContent, fixCount } = applyAdvancedFixes(originalContent, filePath);

    if (modifiedContent !== originalContent && fixCount > 0) {
      fs.writeFileSync(filePath, modifiedContent, 'utf8');
      return { fixed: true, fixCount };
    }

    return { fixed: false, reason: 'No advanced fixes needed' };
  } catch (error) {
    return { fixed: false, reason: `Error: ${error.message}` };
  }
}

function main() {
  console.log('🔍 Discovering files with remaining TypeScript errors...');
  const files = getAllErrorFiles();
  console.log(`📁 Found ${files.length} files with errors to repair`);

  let totalFixed = 0;
  let totalFixes = 0;

  console.log('🔧 Starting advanced repair process...');

  files.slice(0, 500).forEach((file, index) => { // Process first 500 files
    if (index % 50 === 0) {
      console.log(`📊 Advanced Progress: ${index}/${Math.min(files.length, 500)} files processed...`);
    }

    const result = repairFile(file);
    if (result.fixed) {
      totalFixed++;
      totalFixes += result.fixCount || 1;
      console.log(`✅ Advanced Fix: ${file} (${result.fixCount || 1} fixes)`);
    }
  });

  console.log('\n🛡️ GUARDIAN ADVANCED REPAIR COMPLETE!');
  console.log(`📊 Files repaired: ${totalFixed}/${Math.min(files.length, 500)}`);
  console.log(`🔧 Advanced fixes applied: ${totalFixes}`);
  console.log('🎯 Run npm run typecheck to see remaining errors');
  
  return { filesRepaired: totalFixed, totalFixes };
}

if (require.main === module) {
  const results = main();
  
  if (results.totalFixes > 0) {
    console.log('✅ Advanced repair successful - additional fixes applied!');
    process.exit(0);
  } else {
    console.log('ℹ️ No additional automated fixes could be applied');
    process.exit(1);
  }
}

module.exports = { main, repairFile, ADVANCED_REPAIR_PATTERNS };