#!/usr/bin/env tsx
/**
 * Fix JSX Syntax Issues
 * Repairs corrupted dangerouslySetInnerHTML attributes caused by security fixes
 */

import fs from 'fs';
import path from 'path';
import { glob } from 'glob';

class JSXSyntaxFixer {
  private fixedFiles: string[] = [];
  private totalFixes = 0;

  async fixAllJSXIssues(): Promise<void> {
    console.log('🔧 Starting JSX syntax fixes...\n');

    // Get all TypeScript/JavaScript React files
    const files = await glob('**/*.{tsx,jsx}', {
      ignore: ['node_modules/**', '.next/**', 'dist/**', 'scripts/fix-jsx-syntax.ts']
    });

    for (const file of files) {
      await this.fixFile(file);
    }

    this.printSummary();
  }

  private async fixFile(filePath: string): Promise<void> {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      let modifiedContent = content;
      let fileFixed = false;
      let fixCount = 0;

      // Fix corrupted dangerouslySetInnerHTML
      const corruptedPattern = /dangerouslySet\/\/ SECURITY: innerHTML removed - textContent=/g;
      const matches = content.match(corruptedPattern);
      
      if (matches) {
        modifiedContent = modifiedContent.replace(
          corruptedPattern,
          'dangerouslySetInnerHTML='
        );
        fixCount += matches.length;
        fileFixed = true;
        
        console.log(`🔒 Fixed ${matches.length} corrupted dangerouslySetInnerHTML in ${filePath}`);
      }

      // Fix other common JSX syntax issues caused by our security fixes
      const otherPatterns = [
        {
          from: /\/\/ SECURITY: innerHTML removed - textContent=/g,
          to: 'innerHTML='
        },
        {
          from: /\/\/ SECURITY: dangerouslySetInnerHTML removed/g,
          to: 'dangerouslySetInnerHTML'
        }
      ];

      otherPatterns.forEach(pattern => {
        const patternMatches = modifiedContent.match(pattern.from);
        if (patternMatches) {
          modifiedContent = modifiedContent.replace(pattern.from, pattern.to);
          fixCount += patternMatches.length;
          fileFixed = true;
        }
      });

      if (fileFixed) {
        fs.writeFileSync(filePath, modifiedContent, 'utf-8');
        this.fixedFiles.push(filePath);
        this.totalFixes += fixCount;
      }
    } catch (error) {
      console.warn(`⚠️  Could not fix file ${filePath}:`, error);
    }
  }

  private printSummary(): void {
    console.log('\n🛠️  JSX SYNTAX FIXES SUMMARY');
    console.log('=' .repeat(50));
    console.log(`✅ Files Fixed: ${this.fixedFiles.length}`);
    console.log(`🔧 Total Fixes Applied: ${this.totalFixes}`);
    
    if (this.fixedFiles.length > 0) {
      console.log(`📁 Fixed Files:`);
      this.fixedFiles.forEach(file => {
        console.log(`   • ${file}`);
      });
    }

    console.log('\n✅ JSX syntax fixes completed successfully!');
  }
}

// Run fixes if called directly
if (require.main === module) {
  const fixer = new JSXSyntaxFixer();
  fixer.fixAllJSXIssues().catch(error => {
    console.error('❌ JSX syntax fix failed:', error);
    process.exit(1);
  });
}

export { JSXSyntaxFixer };
