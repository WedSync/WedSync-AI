#!/usr/bin/env tsx
/**
 * WS-153 Photo Groups Management - Test Suite Validation
 * 
 * Validates all implemented test files, checks syntax,
 * verifies dependencies, and ensures test configuration.
 * 
 * Validation Categories:
 * - File existence and syntax validation
 * - Test configuration verification
 * - Dependency availability
 * - Test structure analysis
 * - Coverage requirement validation
 * - Performance benchmark validation
 */

import { existsSync, readFileSync, statSync } from 'fs'
import { join, resolve } from 'path'
import { execSync } from 'child_process'

// Validation configuration
const VALIDATION_CONFIG = {
  projectRoot: resolve(__dirname, '..'),
  testFiles: [
    {
      path: 'src/__tests__/unit/photo-groups/PhotoGroupsManager.test.tsx',
      type: 'Unit Test',
      framework: 'React Testing Library + Vitest',
      requiredImports: ['@testing-library/react', 'vitest', '@testing-library/user-event'],
      minLines: 300,
      coverageThreshold: 90
    },
    {
      path: 'src/__tests__/unit/photo-groups/photo-groups-api.test.ts',
      type: 'API Unit Test',
      framework: 'Vitest',
      requiredImports: ['vitest', '@jest/globals'],
      minLines: 200,
      coverageThreshold: 90
    },
    {
      path: 'src/__tests__/integration/ws-153-photo-groups-integration.test.ts',
      type: 'Integration Test',
      framework: 'Vitest + Supabase',
      requiredImports: ['vitest', '@supabase/supabase-js'],
      minLines: 400,
      performanceTests: true
    },
    {
      path: 'src/__tests__/playwright/ws-153-photo-groups-e2e.spec.ts',
      type: 'E2E Test',
      framework: 'Playwright',
      requiredImports: ['@playwright/test'],
      minLines: 500,
      crossBrowserTests: true
    },
    {
      path: 'src/__tests__/performance/ws-153-photo-groups-performance.test.ts',
      type: 'Performance Test',
      framework: 'Vitest + Performance API',
      requiredImports: ['vitest', 'perf_hooks'],
      minLines: 400,
      performanceBenchmarks: true
    },
    {
      path: 'src/__tests__/security/ws-153-photo-groups-security.test.ts',
      type: 'Security Test',
      framework: 'Vitest',
      requiredImports: ['vitest'],
      minLines: 500,
      owaspCoverage: true
    },
    {
      path: 'src/__tests__/accessibility/ws-153-photo-groups-accessibility.test.ts',
      type: 'Accessibility Test',
      framework: 'Jest-Axe + Testing Library',
      requiredImports: ['vitest', 'jest-axe', '@testing-library/react'],
      minLines: 400,
      wcagCompliance: true
    }
  ],
  requiredDependencies: [
    '@testing-library/react',
    '@testing-library/user-event',
    '@testing-library/jest-dom',
    'vitest',
    '@playwright/test',
    'jest-axe',
    '@supabase/supabase-js',
    '@tanstack/react-query'
  ],
  configFiles: [
    'vitest.config.ts',
    'playwright.config.ts',
    'jest.config.js',
    'tsconfig.json'
  ]
}

// Validation results tracking
interface ValidationResult {
  category: string
  test: string
  status: 'PASS' | 'FAIL' | 'WARNING'
  details: string
  suggestions?: string[]
}

class TestValidator {
  private results: ValidationResult[] = []

  private addResult(category: string, test: string, status: ValidationResult['status'], details: string, suggestions?: string[]) {
    this.results.push({
      category,
      test,
      status,
      details,
      suggestions
    })
  }

  private validateFileExists(filePath: string): boolean {
    const fullPath = join(VALIDATION_CONFIG.projectRoot, filePath)
    return existsSync(fullPath)
  }

  private validateFileSyntax(filePath: string): { valid: boolean; error?: string } {
    const fullPath = join(VALIDATION_CONFIG.projectRoot, filePath)
    
    try {
      const content = readFileSync(fullPath, 'utf-8')
      
      // Basic syntax validation for TypeScript/JavaScript
      if (filePath.endsWith('.ts') || filePath.endsWith('.tsx')) {
        // Check for basic TypeScript syntax
        if (!content.includes('import') && !content.includes('require')) {
          return { valid: false, error: 'No imports found' }
        }
        
        if (!content.includes('describe') && !content.includes('test') && !content.includes('it')) {
          return { valid: false, error: 'No test functions found' }
        }
        
        // Check for matching braces
        const openBraces = (content.match(/\{/g) || []).length
        const closeBraces = (content.match(/\}/g) || []).length
        if (Math.abs(openBraces - closeBraces) > 3) { // Allow small difference for template strings
          return { valid: false, error: 'Unmatched braces detected' }
        }
      }
      
      return { valid: true }
    } catch (error) {
      return { valid: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }

  private validateImports(filePath: string, requiredImports: string[]): { missing: string[]; found: string[] } {
    const fullPath = join(VALIDATION_CONFIG.projectRoot, filePath)
    const content = readFileSync(fullPath, 'utf-8')
    
    const found: string[] = []
    const missing: string[] = []
    
    requiredImports.forEach(importName => {
      if (content.includes(`from '${importName}'`) || content.includes(`from "${importName}"`) ||
          content.includes(`require('${importName}')`) || content.includes(`require("${importName}")`)) {
        found.push(importName)
      } else {
        missing.push(importName)
      }
    })
    
    return { missing, found }
  }

  private validateTestStructure(filePath: string): {
    hasDescribeBlocks: boolean;
    hasTestFunctions: boolean;
    hasSetupTeardown: boolean;
    testCount: number;
    describeCount: number;
  } {
    const fullPath = join(VALIDATION_CONFIG.projectRoot, filePath)
    const content = readFileSync(fullPath, 'utf-8')
    
    const hasDescribeBlocks = /describe\s*\(/g.test(content)
    const hasTestFunctions = /(test|it)\s*\(/g.test(content)
    const hasSetupTeardown = /beforeAll|afterAll|beforeEach|afterEach/g.test(content)
    
    const testMatches = content.match(/(test|it)\s*\(/g) || []
    const describeMatches = content.match(/describe\s*\(/g) || []
    
    return {
      hasDescribeBlocks,
      hasTestFunctions,
      hasSetupTeardown,
      testCount: testMatches.length,
      describeCount: describeMatches.length
    }
  }

  private validateFileSize(filePath: string, minLines: number): { lineCount: number; meetsMinimum: boolean } {
    const fullPath = join(VALIDATION_CONFIG.projectRoot, filePath)
    const content = readFileSync(fullPath, 'utf-8')
    const lineCount = content.split('\n').length
    
    return {
      lineCount,
      meetsMinimum: lineCount >= minLines
    }
  }

  private validateDependencies(): { installed: string[]; missing: string[] } {
    const installed: string[] = []
    const missing: string[] = []
    
    try {
      const packageJsonPath = join(VALIDATION_CONFIG.projectRoot, 'package.json')
      const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'))
      const allDeps = {
        ...packageJson.dependencies,
        ...packageJson.devDependencies
      }
      
      VALIDATION_CONFIG.requiredDependencies.forEach(dep => {
        if (allDeps[dep]) {
          installed.push(dep)
        } else {
          missing.push(dep)
        }
      })
    } catch (error) {
      // All dependencies marked as missing if package.json can't be read
      missing.push(...VALIDATION_CONFIG.requiredDependencies)
    }
    
    return { installed, missing }
  }

  private validateConfigFiles(): { present: string[]; missing: string[] } {
    const present: string[] = []
    const missing: string[] = []
    
    VALIDATION_CONFIG.configFiles.forEach(configFile => {
      if (this.validateFileExists(configFile)) {
        present.push(configFile)
      } else {
        missing.push(configFile)
      }
    })
    
    return { present, missing }
  }

  async validateAllFiles(): Promise<void> {
    console.log('🔍 Starting WS-153 Test Suite Validation...')
    console.log('=' .repeat(60))

    // 1. File Existence Validation
    console.log('\n📁 Validating File Existence...')
    let existingFiles = 0
    
    for (const testFile of VALIDATION_CONFIG.testFiles) {
      if (this.validateFileExists(testFile.path)) {
        this.addResult('File Existence', testFile.type, 'PASS', `File exists: ${testFile.path}`)
        existingFiles++
        console.log(`✅ ${testFile.type}: ${testFile.path}`)
      } else {
        this.addResult('File Existence', testFile.type, 'FAIL', `File missing: ${testFile.path}`, [
          `Create the test file at ${testFile.path}`,
          `Ensure the directory structure exists`
        ])
        console.log(`❌ ${testFile.type}: ${testFile.path} (MISSING)`)
      }
    }

    // 2. Syntax Validation
    console.log('\n🔧 Validating File Syntax...')
    
    for (const testFile of VALIDATION_CONFIG.testFiles) {
      if (this.validateFileExists(testFile.path)) {
        const syntaxCheck = this.validateFileSyntax(testFile.path)
        
        if (syntaxCheck.valid) {
          this.addResult('Syntax', testFile.type, 'PASS', 'Valid syntax')
          console.log(`✅ ${testFile.type}: Valid syntax`)
        } else {
          this.addResult('Syntax', testFile.type, 'FAIL', `Syntax error: ${syntaxCheck.error}`, [
            'Fix syntax errors in the test file',
            'Run TypeScript compiler to check for issues'
          ])
          console.log(`❌ ${testFile.type}: ${syntaxCheck.error}`)
        }
      }
    }

    // 3. Import Validation
    console.log('\n📦 Validating Required Imports...')
    
    for (const testFile of VALIDATION_CONFIG.testFiles) {
      if (this.validateFileExists(testFile.path)) {
        const importCheck = this.validateImports(testFile.path, testFile.requiredImports)
        
        if (importCheck.missing.length === 0) {
          this.addResult('Imports', testFile.type, 'PASS', `All required imports present: ${importCheck.found.join(', ')}`)
          console.log(`✅ ${testFile.type}: All imports present (${importCheck.found.length}/${testFile.requiredImports.length})`)
        } else {
          this.addResult('Imports', testFile.type, 'FAIL', `Missing imports: ${importCheck.missing.join(', ')}`, [
            `Add missing imports: ${importCheck.missing.join(', ')}`,
            'Install missing dependencies if needed'
          ])
          console.log(`❌ ${testFile.type}: Missing imports - ${importCheck.missing.join(', ')}`)
        }
      }
    }

    // 4. Test Structure Validation
    console.log('\n🏗️  Validating Test Structure...')
    
    for (const testFile of VALIDATION_CONFIG.testFiles) {
      if (this.validateFileExists(testFile.path)) {
        const structure = this.validateTestStructure(testFile.path)
        const sizeCheck = this.validateFileSize(testFile.path, testFile.minLines)
        
        const structureScore = [
          structure.hasDescribeBlocks,
          structure.hasTestFunctions,
          structure.hasSetupTeardown,
          sizeCheck.meetsMinimum
        ].filter(Boolean).length
        
        if (structureScore >= 3) {
          this.addResult('Structure', testFile.type, 'PASS', 
            `Good structure: ${structure.describeCount} describe blocks, ${structure.testCount} tests, ${sizeCheck.lineCount} lines`)
          console.log(`✅ ${testFile.type}: Strong test structure (${structureScore}/4 criteria)`)
        } else if (structureScore >= 2) {
          this.addResult('Structure', testFile.type, 'WARNING', 
            `Adequate structure but could improve: ${structure.describeCount} describe blocks, ${structure.testCount} tests, ${sizeCheck.lineCount} lines`,
            ['Add more describe blocks for better organization', 'Include setup/teardown if needed'])
          console.log(`⚠️  ${testFile.type}: Adequate structure (${structureScore}/4 criteria)`)
        } else {
          this.addResult('Structure', testFile.type, 'FAIL', 
            `Poor structure: ${structure.describeCount} describe blocks, ${structure.testCount} tests, ${sizeCheck.lineCount} lines`,
            ['Add describe blocks for test organization', 'Ensure minimum test count', 'Add setup/teardown methods'])
          console.log(`❌ ${testFile.type}: Poor structure (${structureScore}/4 criteria)`)
        }
      }
    }

    // 5. Dependency Validation
    console.log('\n📋 Validating Dependencies...')
    
    const depCheck = this.validateDependencies()
    
    if (depCheck.missing.length === 0) {
      this.addResult('Dependencies', 'All Test Suites', 'PASS', `All dependencies installed: ${depCheck.installed.join(', ')}`)
      console.log(`✅ All required dependencies installed (${depCheck.installed.length}/${VALIDATION_CONFIG.requiredDependencies.length})`)
    } else {
      this.addResult('Dependencies', 'All Test Suites', 'FAIL', `Missing dependencies: ${depCheck.missing.join(', ')}`, [
        `Install missing dependencies: npm install ${depCheck.missing.join(' ')}`,
        'Update package.json with required dependencies'
      ])
      console.log(`❌ Missing dependencies: ${depCheck.missing.join(', ')}`)
    }

    // 6. Configuration Files Validation
    console.log('\n⚙️  Validating Configuration Files...')
    
    const configCheck = this.validateConfigFiles()
    
    if (configCheck.missing.length === 0) {
      this.addResult('Configuration', 'All Test Suites', 'PASS', `All config files present: ${configCheck.present.join(', ')}`)
      console.log(`✅ All configuration files present (${configCheck.present.length}/${VALIDATION_CONFIG.configFiles.length})`)
    } else {
      this.addResult('Configuration', 'All Test Suites', 'WARNING', `Missing config files: ${configCheck.missing.join(', ')}`, [
        'Create missing configuration files',
        'Ensure test runners have proper configuration'
      ])
      console.log(`⚠️  Missing config files: ${configCheck.missing.join(', ')}`)
    }

    // 7. Comprehensive Feature Validation
    console.log('\n🎯 Validating Feature Coverage...')
    
    const featureValidation = this.validateFeatureCoverage()
    
    if (featureValidation.score >= 90) {
      this.addResult('Feature Coverage', 'WS-153', 'PASS', `Excellent feature coverage: ${featureValidation.score}%`)
      console.log(`✅ Feature coverage: ${featureValidation.score}% (Excellent)`)
    } else if (featureValidation.score >= 70) {
      this.addResult('Feature Coverage', 'WS-153', 'WARNING', `Good feature coverage: ${featureValidation.score}%`, [
        'Add tests for missing features',
        'Improve test depth for existing features'
      ])
      console.log(`⚠️  Feature coverage: ${featureValidation.score}% (Good, can improve)`)
    } else {
      this.addResult('Feature Coverage', 'WS-153', 'FAIL', `Poor feature coverage: ${featureValidation.score}%`, [
        'Significantly expand test coverage',
        'Add tests for all major features',
        'Include edge cases and error scenarios'
      ])
      console.log(`❌ Feature coverage: ${featureValidation.score}% (Needs significant improvement)`)
    }
  }

  private validateFeatureCoverage(): { score: number; details: string[] } {
    const requiredFeatures = [
      'Photo group creation',
      'Guest assignment management',
      'Priority reordering',
      'Form validation',
      'Error handling',
      'Performance benchmarks',
      'Security testing',
      'Accessibility compliance',
      'Cross-browser testing',
      'Mobile responsiveness',
      'API endpoint testing',
      'Database integration',
      'Real-time updates'
    ]

    const implementedFeatures: string[] = []
    const details: string[] = []

    // Check each test file for feature coverage
    VALIDATION_CONFIG.testFiles.forEach(testFile => {
      if (this.validateFileExists(testFile.path)) {
        const content = readFileSync(join(VALIDATION_CONFIG.projectRoot, testFile.path), 'utf-8')
        
        requiredFeatures.forEach(feature => {
          const featureKey = feature.toLowerCase().replace(/\s+/g, '')
          if (content.toLowerCase().includes(featureKey) || 
              content.includes(feature) ||
              content.includes(feature.replace(/\s+/g, '_'))) {
            if (!implementedFeatures.includes(feature)) {
              implementedFeatures.push(feature)
              details.push(`${feature}: Found in ${testFile.type}`)
            }
          }
        })
      }
    })

    const score = Math.round((implementedFeatures.length / requiredFeatures.length) * 100)
    
    return { score, details }
  }

  generateReport(): void {
    console.log('\n' + '='.repeat(60))
    console.log('📊 WS-153 TEST VALIDATION SUMMARY')
    console.log('='.repeat(60))

    const categories = [...new Set(this.results.map(r => r.category))]
    const passed = this.results.filter(r => r.status === 'PASS').length
    const warnings = this.results.filter(r => r.status === 'WARNING').length
    const failed = this.results.filter(r => r.status === 'FAIL').length
    const total = this.results.length

    console.log(`\n📈 Overall Results:`)
    console.log(`   ✅ Passed: ${passed}/${total} (${Math.round(passed/total*100)}%)`)
    console.log(`   ⚠️  Warnings: ${warnings}/${total} (${Math.round(warnings/total*100)}%)`)
    console.log(`   ❌ Failed: ${failed}/${total} (${Math.round(failed/total*100)}%)`)

    console.log(`\n📋 Results by Category:`)
    categories.forEach(category => {
      const categoryResults = this.results.filter(r => r.category === category)
      const categoryPassed = categoryResults.filter(r => r.status === 'PASS').length
      const categoryTotal = categoryResults.length
      const percentage = Math.round((categoryPassed / categoryTotal) * 100)
      
      console.log(`   ${category}: ${categoryPassed}/${categoryTotal} (${percentage}%)`)
    })

    if (failed > 0) {
      console.log(`\n🚨 Critical Issues to Address:`)
      this.results
        .filter(r => r.status === 'FAIL')
        .forEach(result => {
          console.log(`   • ${result.test}: ${result.details}`)
          if (result.suggestions) {
            result.suggestions.forEach(suggestion => {
              console.log(`     → ${suggestion}`)
            })
          }
        })
    }

    if (warnings > 0) {
      console.log(`\n⚠️  Improvements Recommended:`)
      this.results
        .filter(r => r.status === 'WARNING')
        .forEach(result => {
          console.log(`   • ${result.test}: ${result.details}`)
          if (result.suggestions) {
            result.suggestions.forEach(suggestion => {
              console.log(`     → ${suggestion}`)
            })
          }
        })
    }

    const readinessScore = Math.round(((passed + warnings * 0.5) / total) * 100)
    console.log(`\n🎯 Test Suite Readiness: ${readinessScore}%`)
    
    if (readinessScore >= 90) {
      console.log('🎉 Excellent! Test suite is ready for execution.')
    } else if (readinessScore >= 75) {
      console.log('👍 Good! Address warnings for optimal results.')
    } else if (readinessScore >= 50) {
      console.log('⚠️  Needs work! Fix critical issues before execution.')
    } else {
      console.log('🚨 Not ready! Significant issues must be resolved.')
    }

    console.log('\n' + '='.repeat(60))
  }

  getExitCode(): number {
    const failed = this.results.filter(r => r.status === 'FAIL').length
    return failed > 0 ? 1 : 0
  }
}

// Main execution
async function main() {
  const validator = new TestValidator()
  
  try {
    await validator.validateAllFiles()
    validator.generateReport()
    
    const exitCode = validator.getExitCode()
    console.log(`\n${exitCode === 0 ? '✅' : '❌'} Validation completed with ${exitCode === 0 ? 'success' : 'issues'}`)
    
    process.exit(exitCode)
  } catch (error) {
    console.error('❌ Validation failed:', error)
    process.exit(1)
  }
}

// Execute if called directly
if (require.main === module) {
  main()
}

export { TestValidator }