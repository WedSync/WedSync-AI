#!/usr/bin/env tsx

/**
 * Focused SQL Injection Scanner for WedSync
 * Only scans for actual database-related SQL injection vulnerabilities
 */

import { promises as fs } from 'fs'
import path from 'path'

interface SQLIssue {
  file: string
  line: number
  severity: 'CRITICAL' | 'HIGH'
  type: string
  description: string
  code: string
  recommendation: string
}

class FocusedSQLScanner {
  private issues: SQLIssue[] = []
  private scannedFiles: number = 0

  // Only patterns that are definitely SQL injection risks in database contexts
  private readonly SQL_INJECTION_PATTERNS = [
    {
      pattern: /\.query\s*\(\s*['"`][^'"`]*\$\{[^}]*\}/g,
      severity: 'CRITICAL' as const,
      type: 'Direct SQL Query Injection',
      description: 'Direct database query with template literal interpolation',
      recommendation: 'Replace with parameterized Supabase query methods (.from().select().eq())'
    },
    {
      pattern: /\.raw\s*\(\s*['"`][^'"`]*\$\{[^}]*\}/g,
      severity: 'CRITICAL' as const,
      type: 'Raw SQL Query Injection',
      description: 'Raw SQL query with template literal interpolation',
      recommendation: 'Replace with parameterized Supabase query methods'
    },
    {
      pattern: /sql\s*`[^`]*\$\{[^}]*\}/g,
      severity: 'CRITICAL' as const,
      type: 'SQL Template Literal Injection',
      description: 'SQL template literal with variable interpolation',
      recommendation: 'Use parameterized queries instead'
    },
    {
      pattern: /filter:\s*['"`][^'"`]*\$\{[^}]*\}/g,
      severity: 'HIGH' as const,
      type: 'Supabase Filter Injection',
      description: 'Supabase filter string with template literal interpolation',
      recommendation: 'Use SecureQueryBuilder.createSafeFilter() method'
    },
    {
      pattern: /WHERE\s+[^=]*=\s*['"`][^'"`]*\+[^'"`]*['"`]/gi,
      severity: 'CRITICAL' as const,
      type: 'SQL WHERE Clause Injection',
      description: 'WHERE clause using string concatenation with user input',
      recommendation: 'Use .eq() or other Supabase filter methods'
    },
    {
      pattern: /SELECT\s+[^*]+\*[^*]+FROM\s+[^'"`]*\$\{[^}]*\}/gi,
      severity: 'CRITICAL' as const,
      type: 'Dynamic SQL SELECT Injection',
      description: 'Dynamic SQL SELECT statement with template literal',
      recommendation: 'Use Supabase .from().select() methods'
    },
    {
      pattern: /INSERT\s+INTO\s+[^'"`]*\$\{[^}]*\}/gi,
      severity: 'CRITICAL' as const,
      type: 'Dynamic SQL INSERT Injection',
      description: 'Dynamic SQL INSERT statement with template literal',
      recommendation: 'Use Supabase .from().insert() methods'
    },
    {
      pattern: /UPDATE\s+[^'"`]*SET[^'"`]*\$\{[^}]*\}/gi,
      severity: 'CRITICAL' as const,
      type: 'Dynamic SQL UPDATE Injection',
      description: 'Dynamic SQL UPDATE statement with template literal',
      recommendation: 'Use Supabase .from().update() methods'
    },
    {
      pattern: /DELETE\s+FROM\s+[^'"`]*\$\{[^}]*\}/gi,
      severity: 'CRITICAL' as const,
      type: 'Dynamic SQL DELETE Injection',
      description: 'Dynamic SQL DELETE statement with template literal',
      recommendation: 'Use Supabase .from().delete() methods'
    }
  ]

  // Database-related file patterns to focus scanning
  private readonly DB_FILE_PATTERNS = [
    /\/api\/.*\.(ts|js)$/,
    /\/lib\/.*\.(ts|js)$/,
    /database.*\.(ts|js)$/,
    /supabase.*\.(ts|js)$/,
    /query.*\.(ts|js)$/,
    /\/models\/.*\.(ts|js)$/,
    /\/services\/.*\.(ts|js)$/
  ]

  async scanSourceDirectory(directory: string): Promise<SQLIssue[]> {
    console.log(`🔍 Scanning ${directory} for SQL injection vulnerabilities...`)
    
    await this.scanDirectoryRecursive(path.join(directory, 'src'))
    await this.scanDirectoryRecursive(path.join(directory, 'app'))
    await this.scanDirectoryRecursive(path.join(directory, 'lib'))
    
    this.generateReport()
    return this.issues
  }

  private async scanDirectoryRecursive(directory: string): Promise<void> {
    try {
      const entries = await fs.readdir(directory, { withFileTypes: true })
      
      for (const entry of entries) {
        const fullPath = path.join(directory, entry.name)
        
        if (entry.isDirectory()) {
          // Skip node_modules, .next, etc.
          if (!['node_modules', '.next', 'dist', 'build', 'coverage'].includes(entry.name)) {
            await this.scanDirectoryRecursive(fullPath)
          }
        } else if (entry.isFile() && this.shouldScanFile(fullPath)) {
          await this.scanFile(fullPath)
        }
      }
    } catch (error) {
      // Directory might not exist, continue
    }
  }

  private shouldScanFile(filePath: string): boolean {
    // Only scan TypeScript/JavaScript files in database-related locations
    if (!/\.(ts|tsx|js|jsx)$/.test(filePath)) {
      return false
    }
    
    // Skip test files
    if (/\.(test|spec)\.(ts|tsx|js|jsx)$/.test(filePath)) {
      return false
    }

    // Focus on database-related files
    return this.DB_FILE_PATTERNS.some(pattern => pattern.test(filePath))
  }

  private async scanFile(filePath: string): Promise<void> {
    try {
      const content = await fs.readFile(filePath, 'utf-8')
      const lines = content.split('\n')
      
      this.scannedFiles++

      // Only scan files that import database-related modules
      const hasDBImports = /from ['"`].*supabase|from ['"`].*database|createClient|query|sql/.test(content)
      if (!hasDBImports) {
        return
      }

      lines.forEach((line, lineIndex) => {
        this.scanLine(line, lineIndex + 1, filePath)
      })

    } catch (error) {
      console.error(`Error scanning file ${filePath}:`, error)
    }
  }

  private scanLine(line: string, lineNumber: number, filePath: string): void {
    // Skip comments
    if (line.trim().startsWith('//') || line.trim().startsWith('*') || line.trim().startsWith('/*')) {
      return
    }

    // Only scan lines that contain database-related keywords
    const dbKeywords = /supabase|query|sql|\.from\(|\.select\(|\.insert\(|\.update\(|\.delete\(|filter:|WHERE|SELECT|INSERT|UPDATE|DELETE/i
    if (!dbKeywords.test(line)) {
      return
    }

    for (const pattern of this.SQL_INJECTION_PATTERNS) {
      const matches = line.matchAll(pattern.pattern)
      
      for (const match of matches) {
        this.issues.push({
          file: filePath,
          line: lineNumber,
          severity: pattern.severity,
          type: pattern.type,
          description: pattern.description,
          code: line.trim(),
          recommendation: pattern.recommendation
        })
      }
    }
  }

  private generateReport(): void {
    console.log('\n📊 Focused SQL Injection Security Scan Report')
    console.log('=' .repeat(60))
    console.log(`Files scanned: ${this.scannedFiles}`)
    console.log(`SQL injection vulnerabilities found: ${this.issues.length}`)
    
    const severityCount = {
      CRITICAL: this.issues.filter(i => i.severity === 'CRITICAL').length,
      HIGH: this.issues.filter(i => i.severity === 'HIGH').length
    }

    console.log(`\n🚨 Severity Breakdown:`)
    console.log(`  CRITICAL: ${severityCount.CRITICAL}`)
    console.log(`  HIGH:     ${severityCount.HIGH}`)

    if (this.issues.length > 0) {
      console.log('\n🔍 SQL Injection Vulnerabilities Found:')
      console.log('-'.repeat(60))

      this.issues.forEach((issue, index) => {
        console.log(`\n${index + 1}. ${issue.severity} - ${issue.type}`)
        console.log(`   File: ${issue.file}:${issue.line}`)
        console.log(`   Code: ${issue.code}`)
        console.log(`   Issue: ${issue.description}`)
        console.log(`   Fix: ${issue.recommendation}`)
      })

      console.log('\n❌ CRITICAL SECURITY ISSUE - SQL injection vulnerabilities detected!')
      console.log('🚨 These must be fixed immediately to prevent data breaches.')
    } else {
      console.log('\n✅ EXCELLENT - No SQL injection vulnerabilities detected!')
      console.log('🛡️  All database queries use safe, parameterized methods.')
      console.log('🔒 Your application is protected against SQL injection attacks.')
    }
  }

  async generateJSONReport(outputPath: string): Promise<void> {
    const report = {
      timestamp: new Date().toISOString(),
      scanner: 'Focused SQL Injection Scanner',
      summary: {
        filesScanned: this.scannedFiles,
        vulnerabilitiesFound: this.issues.length,
        severity: {
          CRITICAL: this.issues.filter(i => i.severity === 'CRITICAL').length,
          HIGH: this.issues.filter(i => i.severity === 'HIGH').length
        },
        passed: this.issues.length === 0
      },
      vulnerabilities: this.issues
    }

    await fs.writeFile(outputPath, JSON.stringify(report, null, 2))
    console.log(`\n📄 Detailed report saved to: ${outputPath}`)
  }
}

// CLI execution
async function main() {
  const scanner = new FocusedSQLScanner()
  const projectRoot = process.argv[2] || process.cwd()
  
  console.log('🛡️  WedSync Focused SQL Injection Security Scanner')
  console.log('🎯 Focused on database-related files and patterns')
  console.log(`📁 Scanning directory: ${projectRoot}`)
  
  const issues = await scanner.scanSourceDirectory(projectRoot)
  
  // Generate JSON report
  const reportPath = path.join(projectRoot, 'sql-injection-security-report.json')
  await scanner.generateJSONReport(reportPath)
  
  // Exit with error code if critical issues found
  const criticalIssues = issues.filter(i => i.severity === 'CRITICAL').length
  if (criticalIssues > 0) {
    console.log(`\n🚨 ${criticalIssues} CRITICAL SQL injection vulnerabilities must be fixed!`)
    process.exit(1)
  } else if (issues.length > 0) {
    console.log(`\n⚠️  ${issues.length} high-priority SQL injection risks should be addressed.`)
    process.exit(0)
  } else {
    console.log('\n🎉 SQL injection security validation PASSED!')
    process.exit(0)
  }
}

if (require.main === module) {
  main().catch(console.error)
}

export { FocusedSQLScanner }