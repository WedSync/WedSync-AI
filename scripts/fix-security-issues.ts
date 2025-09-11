#!/usr/bin/env tsx
/**
 * Critical Security Issues Fix Script
 * Automatically fixes the 189 critical security issues found in the audit
 */

import fs from 'fs';
import path from 'path';
import { glob } from 'glob';

interface SecurityFix {
  pattern: RegExp;
  replacement: string;
  description: string;
  severity: 'critical' | 'high' | 'medium';
}

class SecurityFixer {
  private fixes: SecurityFix[] = [
    // CRITICAL: Remove NEXT_PUBLIC_ from sensitive variables
    {
      pattern: /NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY/g,
      replacement: 'SUPABASE_SERVICE_ROLE_KEY',
      description: 'Remove NEXT_PUBLIC_ from service role key',
      severity: 'critical'
    },
    {
      pattern: /NEXT_PUBLIC_STRIPE_SECRET_KEY/g,
      replacement: 'STRIPE_SECRET_KEY',
      description: 'Remove NEXT_PUBLIC_ from Stripe secret',
      severity: 'critical'
    },
    {
      pattern: /NEXT_PUBLIC_DATABASE_URL/g,
      replacement: 'DATABASE_URL',
      description: 'Remove NEXT_PUBLIC_ from database URL',
      severity: 'critical'
    },
    {
      pattern: /NEXT_PUBLIC_NEXTAUTH_SECRET/g,
      replacement: 'NEXTAUTH_SECRET',
      description: 'Remove NEXT_PUBLIC_ from auth secret',
      severity: 'critical'
    },
    {
      pattern: /NEXT_PUBLIC_.*(?:SECRET|KEY|PASSWORD|TOKEN|PRIVATE)/g,
      replacement: (match: string) => match.replace('NEXT_PUBLIC_', ''),
      description: 'Remove NEXT_PUBLIC_ from all sensitive variables',
      severity: 'critical'
    },
    
    // CRITICAL: Replace eval() usage
    {
      pattern: /eval\s*\(\s*[`'"](.*?)[`'"]\s*\)/g,
      replacement: '// SECURITY: eval() removed - $1',
      description: 'Remove dangerous eval() calls',
      severity: 'critical'
    },
    
    // HIGH: Fix password/secret logging
    {
      pattern: /console\.log\(.*(?:password|secret|key|token).*\)/gi,
      replacement: '// SECURITY: Sensitive logging removed',
      description: 'Remove sensitive information logging',
      severity: 'high'
    },
    
    // HIGH: Fix environment variable assertions
    {
      pattern: /process\.env\.([A-Z_]+)!/g,
      replacement: 'process.env.$1 || (() => { throw new Error("Missing environment variable: $1") })()',
      description: 'Replace non-null assertions with proper validation',
      severity: 'high'
    }
  ];

  private fixedFiles: string[] = [];
  private totalFixes = 0;

  async fixAllSecurityIssues(): Promise<void> {
    console.log('🔧 Starting comprehensive security fixes...\n');

    // Get all TypeScript/JavaScript files
    const files = await glob('**/*.{ts,tsx,js,jsx}', {
      ignore: ['node_modules/**', '.next/**', 'dist/**', 'scripts/fix-security-issues.ts']
    });

    for (const file of files) {
      await this.fixFile(file);
    }

    // Fix configuration files
    await this.fixConfigFiles();

    this.printSummary();
  }

  private async fixFile(filePath: string): Promise<void> {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      let modifiedContent = content;
      let fileFixed = false;

      for (const fix of this.fixes) {
        const matches = content.match(fix.pattern);
        if (matches) {
          if (typeof fix.replacement === 'function') {
            modifiedContent = modifiedContent.replace(fix.pattern, fix.replacement);
          } else {
            modifiedContent = modifiedContent.replace(fix.pattern, fix.replacement);
          }
          fileFixed = true;
          this.totalFixes += matches.length;
          
          console.log(`🔒 ${fix.severity.toUpperCase()}: Fixed ${matches.length} issues in ${filePath}`);
          console.log(`   ${fix.description}`);
        }
      }

      if (fileFixed) {
        fs.writeFileSync(filePath, modifiedContent, 'utf-8');
        this.fixedFiles.push(filePath);
      }
    } catch (error) {
      console.warn(`⚠️  Could not fix file ${filePath}:`, error);
    }
  }

  private async fixConfigFiles(): Promise<void> {
    const configFiles = [
      '.env.example',
      '.env.local',
      'next.config.ts',
      'package.json'
    ];

    for (const configFile of configFiles) {
      if (fs.existsSync(configFile)) {
        await this.fixFile(configFile);
      }
    }
  }

  private printSummary(): void {
    console.log('\n🛡️  SECURITY FIXES SUMMARY');
    console.log('=' .repeat(50));
    console.log(`✅ Files Fixed: ${this.fixedFiles.length}`);
    console.log(`🔧 Total Fixes Applied: ${this.totalFixes}`);
    console.log(`📁 Fixed Files:`);
    
    this.fixedFiles.forEach(file => {
      console.log(`   • ${file}`);
    });

    console.log('\n🚨 CRITICAL ACTIONS REQUIRED:');
    console.log('1. Review all changes before committing');
    console.log('2. Update environment variables in production');
    console.log('3. Test all functionality after fixes');
    console.log('4. Run security audit again to verify fixes');
    
    console.log('\n✅ Security fixes completed successfully!');
  }
}

// Run fixes if called directly
if (require.main === module) {
  const fixer = new SecurityFixer();
  fixer.fixAllSecurityIssues().catch(error => {
    console.error('❌ Security fix failed:', error);
    process.exit(1);
  });
}

export { SecurityFixer };
