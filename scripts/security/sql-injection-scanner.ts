#!/usr/bin/env tsx

/**
 * SQL Injection Security Scanner for WedSync
 * Scans the codebase for potential SQL injection vulnerabilities
 */

import { promises as fs } from 'fs'
import path from 'path'
import glob from 'glob'

interface SecurityIssue {
  file: string
  line: number
  column: number
  severity: 'HIGH' | 'MEDIUM' | 'LOW'
  type: string
  description: string
  code: string
  recommendation: string
}

class SQLInjectionScanner {
  private issues: SecurityIssue[] = []
  private scannedFiles: number = 0

  // Patterns that indicate potential SQL injection vulnerabilities
  private readonly DANGEROUS_PATTERNS = [
    {
      pattern: /\$\{[^}]*\}/g,
      severity: 'HIGH' as const,
      type: 'Template Literal Injection',
      description: 'Template literal used in database query context',
      recommendation: 'Use parameterized queries or proper input validation'
    },
    {
      pattern: /(['"`]).*\+.*\1/g,
      severity: 'HIGH' as const,
      type: 'String Concatenation in Query',
      description: 'String concatenation detected in potential SQL context',
      recommendation: 'Use parameterized queries instead of string concatenation'
    },
    {
      pattern: /\.query\s*\(\s*['"`][^'"`]*\$\{/g,
      severity: 'HIGH' as const,
      type: 'Direct Query with Interpolation',
      description: 'Direct database query with template literal interpolation',
      recommendation: 'Replace with parameterized Supabase query methods'
    },
    {
      pattern: /\.raw\s*\(\s*['"`][^'"`]*\$\{/g,
      severity: 'HIGH' as const,
      type: 'Raw Query with Interpolation',
      description: 'Raw SQL query with template literal interpolation',
      recommendation: 'Replace with parameterized Supabase query methods'
    },
    {
      pattern: /sql\s*`[^`]*\$\{[^}]*\}/g,
      severity: 'HIGH' as const,
      type: 'SQL Template Literal',
      description: 'SQL template literal with variable interpolation',
      recommendation: 'Use parameterized queries instead'
    },
    {
      pattern: /WHERE\s+[^=]*=\s*['"`]\s*\+/g,
      severity: 'HIGH' as const,
      type: 'WHERE Clause Concatenation',
      description: 'WHERE clause using string concatenation',
      recommendation: 'Use .eq() or other Supabase filter methods'
    },
    {
      pattern: /filter:\s*['"`][^'"`]*\$\{/g,
      severity: 'HIGH' as const,
      type: 'Filter String Interpolation',
      description: 'Filter string with template literal interpolation',
      recommendation: 'Use SecureQueryBuilder.createSafeFilter() method'
    }
  ]

  // Safe patterns that should be allowed
  private readonly SAFE_PATTERNS = [
    /\.from\(['"`][^'"`]+['"`]\)/,  // .from('table_name')
    /\.select\(['"`][^'"`]+['"`]\)/, // .select('columns')
    /\.eq\(['"`][^'"`]+['"`],\s*\w+\)/, // .eq('column', variable)
    /\.neq\(['"`][^'"`]+['"`],\s*\w+\)/, // .neq('column', variable)
    /\.in\(['"`][^'"`]+['"`],\s*\[/, // .in('column', array)
  ]

  async scanDirectory(directory: string): Promise<SecurityIssue[]> {
    console.log(`🔍 Scanning ${directory} for SQL injection vulnerabilities...`)
    
    const files = await new Promise<string[]>((resolve, reject) => {
      glob('**/*.{ts,tsx,js,jsx}', {
        cwd: directory,
        ignore: [
          'node_modules/**',
          'dist/**',
          'build/**',
          '.next/**',
          '**/*.test.{ts,tsx,js,jsx}',
          '**/*.spec.{ts,tsx,js,jsx}'
        ]
      }, (err, matches) => {
        if (err) reject(err)
        else resolve(matches)
      })
    })

    for (const file of files) {
      await this.scanFile(path.join(directory, file))
    }

    this.generateReport()
    return this.issues
  }

  private async scanFile(filePath: string): Promise<void> {
    try {
      const content = await fs.readFile(filePath, 'utf-8')
      const lines = content.split('\n')
      
      this.scannedFiles++

      lines.forEach((line, lineIndex) => {
        this.scanLine(line, lineIndex + 1, filePath)
      })

    } catch (error) {
      console.error(`Error scanning file ${filePath}:`, error)
    }
  }

  private scanLine(line: string, lineNumber: number, filePath: string): void {
    // Skip comments and non-code lines
    if (line.trim().startsWith('//') || line.trim().startsWith('*') || line.trim().startsWith('/*')) {
      return
    }

    for (const pattern of this.DANGEROUS_PATTERNS) {
      const matches = line.matchAll(pattern.pattern)
      
      for (const match of matches) {
        // Check if this is actually a safe pattern
        const isSafe = this.SAFE_PATTERNS.some(safePattern => 
          safePattern.test(line)
        )

        if (!isSafe) {
          this.issues.push({
            file: filePath,
            line: lineNumber,
            column: match.index || 0,
            severity: pattern.severity,
            type: pattern.type,
            description: pattern.description,
            code: line.trim(),
            recommendation: pattern.recommendation
          })
        }
      }
    }
  }

  private generateReport(): void {
    console.log('\n📊 SQL Injection Security Scan Report')
    console.log('=' .repeat(50))
    console.log(`Files scanned: ${this.scannedFiles}`)
    console.log(`Issues found: ${this.issues.length}`)
    
    const severityCount = {
      HIGH: this.issues.filter(i => i.severity === 'HIGH').length,
      MEDIUM: this.issues.filter(i => i.severity === 'MEDIUM').length,
      LOW: this.issues.filter(i => i.severity === 'LOW').length
    }

    console.log(`\n🚨 Severity Breakdown:`)
    console.log(`  HIGH:   ${severityCount.HIGH}`)
    console.log(`  MEDIUM: ${severityCount.MEDIUM}`)
    console.log(`  LOW:    ${severityCount.LOW}`)

    if (this.issues.length > 0) {
      console.log('\n🔍 Detailed Issues:')
      console.log('-'.repeat(50))

      this.issues.forEach((issue, index) => {
        console.log(`\n${index + 1}. ${issue.severity} - ${issue.type}`)
        console.log(`   File: ${issue.file}:${issue.line}:${issue.column}`)
        console.log(`   Code: ${issue.code}`)
        console.log(`   Issue: ${issue.description}`)
        console.log(`   Fix: ${issue.recommendation}`)
      })

      console.log('\n❌ SCAN FAILED - SQL injection vulnerabilities detected!')
      console.log('Please fix the issues above before proceeding.')
    } else {
      console.log('\n✅ SCAN PASSED - No SQL injection vulnerabilities detected!')
      console.log('All database queries appear to use safe, parameterized methods.')
    }
  }

  async generateJSONReport(outputPath: string): Promise<void> {
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        filesScanned: this.scannedFiles,
        issuesFound: this.issues.length,
        severity: {
          HIGH: this.issues.filter(i => i.severity === 'HIGH').length,
          MEDIUM: this.issues.filter(i => i.severity === 'MEDIUM').length,
          LOW: this.issues.filter(i => i.severity === 'LOW').length
        }
      },
      issues: this.issues
    }

    await fs.writeFile(outputPath, JSON.stringify(report, null, 2))
    console.log(`\n📄 JSON report saved to: ${outputPath}`)
  }
}

// CLI execution
async function main() {
  const scanner = new SQLInjectionScanner()
  const projectRoot = process.argv[2] || process.cwd()
  
  console.log('🛡️  WedSync SQL Injection Security Scanner')
  console.log(`📁 Scanning directory: ${projectRoot}`)
  
  const issues = await scanner.scanDirectory(projectRoot)
  
  // Generate JSON report
  const reportPath = path.join(projectRoot, 'security-report-sql-injection.json')
  await scanner.generateJSONReport(reportPath)
  
  // Exit with error code if issues found
  process.exit(issues.length > 0 ? 1 : 0)
}

if (require.main === module) {
  main().catch(console.error)
}

export { SQLInjectionScanner }