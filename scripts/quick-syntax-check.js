#!/usr/bin/env node
/**
 * Quick syntax check for specific TypeScript files
 */

const fs = require('fs');
const path = require('path');

const filesToCheck = [
  'src/components/forms/DynamicFormBuilder.tsx',
  'src/hooks/useFieldEngine.ts',
  'src/lib/monitoring/hooks/use-api-tracking.tsx'
];

function checkFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    
    // Basic syntax checks for common issues we just fixed
    const issues = [];
    
    // Check for unmatched brackets/parentheses (basic check)
    const openBrackets = (content.match(/\{/g) || []).length;
    const closeBrackets = (content.match(/\}/g) || []).length;
    const openParens = (content.match(/\(/g) || []).length;
    const closeParens = (content.match(/\)/g) || []).length;
    
    if (openBrackets !== closeBrackets) {
      issues.push(`Unmatched brackets: ${openBrackets} open vs ${closeBrackets} close`);
    }
    
    if (openParens !== closeParens) {
      issues.push(`Unmatched parentheses: ${openParens} open vs ${closeParens} close`);
    }
    
    // Check for JSX in .ts files
    if (filePath.endsWith('.ts') && content.includes('<') && content.includes('>')){
      if (content.match(/<[A-Z][^>]*>/)) {
        issues.push('JSX syntax detected in .ts file (should be .tsx)');
      }
    }
    
    console.log(`✅ ${filePath}: ${issues.length === 0 ? 'OK' : issues.length + ' issues'}`);
    if (issues.length > 0) {
      issues.forEach(issue => console.log(`   - ${issue}`));
    }
    
    return issues.length === 0;
    
  } catch (error) {
    console.log(`❌ ${filePath}: Error reading file - ${error.message}`);
    return false;
  }
}

console.log('🔍 Quick syntax validation...\n');

let allGood = true;
for (const file of filesToCheck) {
  const result = checkFile(file);
  allGood = allGood && result;
}

console.log(`\n${allGood ? '✅' : '❌'} Overall result: ${allGood ? 'All files look good!' : 'Some issues found'}`);

process.exit(allGood ? 0 : 1);