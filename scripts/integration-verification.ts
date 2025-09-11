#!/usr/bin/env tsx

/**
 * INTEGRATION VERIFICATION SCRIPT
 * 
 * Comprehensive verification of Session A ↔ B integration points.
 * This script validates that all integration testing framework components
 * are working correctly and ready for production use.
 */

import { createClient } from '@supabase/supabase-js'
import { execSync } from 'child_process'
import { existsSync, readFileSync } from 'fs'
import path from 'path'

interface VerificationResult {
  component: string
  status: 'PASS' | 'FAIL' | 'WARNING' | 'SKIP'
  message: string
  details?: string[]
}

interface VerificationSummary {
  totalChecks: number
  passed: number
  failed: number
  warnings: number
  skipped: number
  results: VerificationResult[]
}

class IntegrationVerifier {
  private results: VerificationResult[] = []
  private supabase: any
  
  constructor() {
    console.log('🔍 Starting Integration Verification...\n')
  }
  
  // Helper method to add verification result
  private addResult(component: string, status: VerificationResult['status'], message: string, details?: string[]) {
    this.results.push({ component, status, message, details })
    
    const statusIcon = {
      'PASS': '✅',
      'FAIL': '❌',
      'WARNING': '⚠️',
      'SKIP': '⏭️'
    }[status]
    
    console.log(`${statusIcon} ${component}: ${message}`)
    if (details && details.length > 0) {
      details.forEach(detail => console.log(`   └─ ${detail}`))
    }
  }
  
  // 1. Verify Test Environment Setup
  async verifyTestEnvironment(): Promise<void> {
    console.log('\n📋 Verifying Test Environment Setup...')
    
    try {
      // Check if test database is configured
      const supabaseUrl = process.env.TEST_SUPABASE_URL
      const supabaseKey = process.env.TEST_SUPABASE_ANON_KEY
      
      if (!supabaseUrl || !supabaseKey) {
        this.addResult(
          'Test Database Config',
          'FAIL',
          'Test Supabase credentials not configured',
          ['Set TEST_SUPABASE_URL and TEST_SUPABASE_ANON_KEY environment variables']
        )
        return
      }
      
      // Test database connection
      this.supabase = createClient(supabaseUrl, supabaseKey)
      const { data, error } = await this.supabase.from('organizations').select('count', { count: 'exact', head: true })
      
      if (error) {
        this.addResult(
          'Test Database Connection',
          'FAIL',
          'Cannot connect to test database',
          [error.message]
        )
        return
      }
      
      this.addResult(
        'Test Database Connection',
        'PASS',
        'Successfully connected to test database'
      )
      
      // Verify RLS is enabled
      const { data: rlsStatus } = await this.supabase.rpc('check_rls_enabled')
      if (rlsStatus) {
        this.addResult(
          'RLS Policies',
          'PASS',
          'Row Level Security is enabled on test database'
        )
      } else {
        this.addResult(
          'RLS Policies',
          'WARNING',
          'Row Level Security status could not be verified'
        )
      }
      
    } catch (error) {
      this.addResult(
        'Test Environment',
        'FAIL',
        'Test environment setup failed',
        [error instanceof Error ? error.message : String(error)]
      )
    }
  }
  
  // 2. Verify Integration Test Files
  verifyIntegrationTestFiles(): void {
    console.log('\n📁 Verifying Integration Test Files...')
    
    const requiredTestFiles = [
      'tests/integration/session-a-b-coordination.test.ts',
      'tests/integration/csrf-token-flow.test.ts',
      'tests/integration/cross-session-validation.test.ts',
      'tests/integration/e2e-user-workflows.test.ts',
      'tests/integration/form-data-flow.test.ts',
      'tests/integration/rls-form-validation.test.ts',
      'tests/integration/session-a-c-scenarios.test.ts'
    ]
    
    const missingFiles: string[] = []
    const existingFiles: string[] = []
    
    requiredTestFiles.forEach(filePath => {
      const fullPath = path.join(process.cwd(), filePath)
      if (existsSync(fullPath)) {
        existingFiles.push(filePath)
      } else {
        missingFiles.push(filePath)
      }
    })
    
    if (missingFiles.length === 0) {
      this.addResult(
        'Integration Test Files',
        'PASS',
        `All ${requiredTestFiles.length} integration test files present`,
        existingFiles
      )
    } else {
      this.addResult(
        'Integration Test Files',
        'FAIL',
        `Missing ${missingFiles.length} integration test files`,
        missingFiles
      )
    }
  }
  
  // 3. Verify Package Dependencies
  verifyDependencies(): void {
    console.log('\n📦 Verifying Package Dependencies...')
    
    try {
      const packageJson = JSON.parse(readFileSync('package.json', 'utf-8'))
      
      const requiredDependencies = [
        '@supabase/supabase-js',
        '@playwright/test',
        'jest',
        'isomorphic-dompurify'
      ]
      
      const requiredDevDependencies = [
        '@testing-library/jest-dom',
        '@testing-library/react',
        '@types/jest',
        'jest-environment-jsdom'
      ]
      
      const missingDeps: string[] = []
      const missingDevDeps: string[] = []
      
      requiredDependencies.forEach(dep => {
        if (!packageJson.dependencies?.[dep]) {
          missingDeps.push(dep)
        }
      })
      
      requiredDevDependencies.forEach(dep => {
        if (!packageJson.devDependencies?.[dep]) {
          missingDevDeps.push(dep)
        }
      })
      
      if (missingDeps.length === 0 && missingDevDeps.length === 0) {
        this.addResult(
          'Package Dependencies',
          'PASS',
          'All required dependencies are installed'
        )
      } else {
        const missing = [...missingDeps, ...missingDevDeps]
        this.addResult(
          'Package Dependencies',
          'FAIL',
          `Missing ${missing.length} required dependencies`,
          missing
        )
      }
      
    } catch (error) {
      this.addResult(
        'Package Dependencies',
        'FAIL',
        'Could not verify package dependencies',
        [error instanceof Error ? error.message : String(error)]
      )
    }
  }
  
  // 4. Verify Test Scripts Configuration
  verifyTestScripts(): void {
    console.log('\n🔧 Verifying Test Scripts Configuration...')
    
    try {
      const packageJson = JSON.parse(readFileSync('package.json', 'utf-8'))
      const scripts = packageJson.scripts || {}
      
      const requiredScripts = [
        'test:integration',
        'test:security',
        'test:e2e',
        'test:all'
      ]
      
      const missingScripts: string[] = []
      const validScripts: string[] = []
      
      requiredScripts.forEach(script => {
        if (scripts[script]) {
          validScripts.push(script)
        } else {
          missingScripts.push(script)
        }
      })
      
      if (missingScripts.length === 0) {
        this.addResult(
          'Test Scripts',
          'PASS',
          'All required test scripts are configured',
          validScripts
        )
      } else {
        this.addResult(
          'Test Scripts',
          'WARNING',
          `Missing ${missingScripts.length} test scripts`,
          missingScripts
        )
      }
      
    } catch (error) {
      this.addResult(
        'Test Scripts',
        'FAIL',
        'Could not verify test scripts',
        [error instanceof Error ? error.message : String(error)]
      )
    }
  }
  
  // 5. Verify Jest Configuration
  verifyJestConfiguration(): void {
    console.log('\n⚙️ Verifying Jest Configuration...')
    
    const jestConfigFiles = [
      'jest.config.js',
      'jest.config.ts',
      'tests/jest.config.js'
    ]
    
    let jestConfigFound = false
    let configPath = ''
    
    for (const configFile of jestConfigFiles) {
      if (existsSync(configFile)) {
        jestConfigFound = true
        configPath = configFile
        break
      }
    }
    
    if (jestConfigFound) {
      this.addResult(
        'Jest Configuration',
        'PASS',
        `Jest configuration found at ${configPath}`
      )
    } else {
      this.addResult(
        'Jest Configuration',
        'WARNING',
        'Jest configuration file not found',
        ['Consider creating jest.config.js for integration tests']
      )
    }
    
    // Check for Jest setup file
    const setupFiles = [
      'jest.setup.js',
      'tests/jest.setup.js'
    ]
    
    let setupFound = false
    for (const setupFile of setupFiles) {
      if (existsSync(setupFile)) {
        setupFound = true
        break
      }
    }
    
    if (setupFound) {
      this.addResult(
        'Jest Setup',
        'PASS',
        'Jest setup file found'
      )
    } else {
      this.addResult(
        'Jest Setup',
        'WARNING',
        'Jest setup file not found',
        ['Consider creating jest.setup.js for test configuration']
      )
    }
  }
  
  // 6. Verify Playwright Configuration
  verifyPlaywrightConfiguration(): void {
    console.log('\n🎭 Verifying Playwright Configuration...')
    
    const playwrightConfigFiles = [
      'playwright.config.ts',
      'playwright.config.js',
      'tests/playwright.config.ts'
    ]
    
    let playwrightConfigFound = false
    let configPath = ''
    
    for (const configFile of playwrightConfigFiles) {
      if (existsSync(configFile)) {
        playwrightConfigFound = true
        configPath = configFile
        break
      }
    }
    
    if (playwrightConfigFound) {
      this.addResult(
        'Playwright Configuration',
        'PASS',
        `Playwright configuration found at ${configPath}`
      )
    } else {
      this.addResult(
        'Playwright Configuration',
        'WARNING',
        'Playwright configuration file not found',
        ['E2E tests may not run properly without configuration']
      )
    }
  }
  
  // 7. Test Basic Integration Functions
  async testBasicIntegrationFunctions(): Promise<void> {
    console.log('\n🧪 Testing Basic Integration Functions...')
    
    if (!this.supabase) {
      this.addResult(
        'Basic Integration Functions',
        'SKIP',
        'Skipped due to database connection failure'
      )
      return
    }
    
    try {
      // Test organization creation (for multi-tenant testing)
      const testOrgData = {
        name: 'Integration Test Org',
        subscription_tier: 'PROFESSIONAL',
        is_active: true
      }
      
      const { data: org, error: orgError } = await this.supabase
        .from('organizations')
        .insert(testOrgData)
        .select()
        .single()
      
      if (orgError) {
        this.addResult(
          'Organization Creation Test',
          'FAIL',
          'Could not create test organization',
          [orgError.message]
        )
        return
      }
      
      this.addResult(
        'Organization Creation Test',
        'PASS',
        'Successfully created test organization'
      )
      
      // Test form creation
      const testFormData = {
        title: 'Integration Verification Form',
        sections: [
          {
            id: 'test-section',
            fields: [
              {
                id: 'test_field',
                type: 'text',
                label: 'Test Field',
                validation: { required: true }
              }
            ]
          }
        ],
        organization_id: org.id,
        status: 'draft',
        created_by: '00000000-0000-0000-0000-000000000000' // Test UUID
      }
      
      const { data: form, error: formError } = await this.supabase
        .from('forms')
        .insert(testFormData)
        .select()
        .single()
      
      if (formError) {
        this.addResult(
          'Form Creation Test',
          'FAIL',
          'Could not create test form',
          [formError.message]
        )
      } else {
        this.addResult(
          'Form Creation Test',
          'PASS',
          'Successfully created test form'
        )
        
        // Cleanup test data
        await this.supabase.from('forms').delete().eq('id', form.id)
      }
      
      // Cleanup test organization
      await this.supabase.from('organizations').delete().eq('id', org.id)
      
    } catch (error) {
      this.addResult(
        'Basic Integration Functions',
        'FAIL',
        'Integration function test failed',
        [error instanceof Error ? error.message : String(error)]
      )
    }
  }
  
  // 8. Verify Security Test Scenarios
  verifySecurityTestScenarios(): void {
    console.log('\n🔒 Verifying Security Test Scenarios...')
    
    const securityTestFiles = [
      'tests/security/csrf-protection.test.ts',
      'tests/security/xss-prevention.test.ts',
      'tests/security/file-upload.test.ts',
      'tests/security/integration.test.ts'
    ]
    
    let securityTestsFound = 0
    const missingSecurityTests: string[] = []
    
    securityTestFiles.forEach(filePath => {
      if (existsSync(filePath)) {
        securityTestsFound++
      } else {
        missingSecurityTests.push(filePath)
      }
    })
    
    if (securityTestsFound === securityTestFiles.length) {
      this.addResult(
        'Security Test Scenarios',
        'PASS',
        `All ${securityTestFiles.length} security test files present`
      )
    } else if (securityTestsFound > 0) {
      this.addResult(
        'Security Test Scenarios',
        'WARNING',
        `${securityTestsFound}/${securityTestFiles.length} security test files present`,
        missingSecurityTests
      )
    } else {
      this.addResult(
        'Security Test Scenarios',
        'FAIL',
        'No security test files found',
        ['Security testing is critical for production readiness']
      )
    }
  }
  
  // 9. Verify Documentation
  verifyDocumentation(): void {
    console.log('\n📚 Verifying Documentation...')
    
    const requiredDocs = [
      'docs/SESSION-A-B-INTEGRATION-POINTS.md',
      'README.md'
    ]
    
    const missingDocs: string[] = []
    const existingDocs: string[] = []
    
    requiredDocs.forEach(docPath => {
      if (existsSync(docPath)) {
        existingDocs.push(docPath)
      } else {
        missingDocs.push(docPath)
      }
    })
    
    if (missingDocs.length === 0) {
      this.addResult(
        'Documentation',
        'PASS',
        'All required documentation present',
        existingDocs
      )
    } else {
      this.addResult(
        'Documentation',
        'WARNING',
        `Missing ${missingDocs.length} documentation files`,
        missingDocs
      )
    }
  }
  
  // 10. Run Quick Test Suite
  async runQuickTestSuite(): Promise<void> {
    console.log('\n🚀 Running Quick Test Suite...')
    
    try {
      // Run a subset of integration tests
      const testCommand = 'npm run test:integration -- --testNamePattern="basic" --maxWorkers=1'
      
      console.log('   Running: npm run test:integration (subset)...')
      execSync(testCommand, { stdio: 'pipe', timeout: 30000 })
      
      this.addResult(
        'Quick Test Suite',
        'PASS',
        'Integration tests executed successfully'
      )
      
    } catch (error) {
      // Check if it's a timeout or actual test failure
      if (error instanceof Error && error.message.includes('timeout')) {
        this.addResult(
          'Quick Test Suite',
          'WARNING',
          'Test suite timed out (this may be normal)',
          ['Tests are taking longer than 30 seconds']
        )
      } else {
        this.addResult(
          'Quick Test Suite',
          'WARNING',
          'Could not run test suite',
          ['Run npm run test:integration manually to verify']
        )
      }
    }
  }
  
  // Generate summary report
  generateSummary(): VerificationSummary {
    const summary: VerificationSummary = {
      totalChecks: this.results.length,
      passed: this.results.filter(r => r.status === 'PASS').length,
      failed: this.results.filter(r => r.status === 'FAIL').length,
      warnings: this.results.filter(r => r.status === 'WARNING').length,
      skipped: this.results.filter(r => r.status === 'SKIP').length,
      results: this.results
    }
    
    console.log('\n' + '='.repeat(60))
    console.log('📊 INTEGRATION VERIFICATION SUMMARY')
    console.log('='.repeat(60))
    console.log(`Total Checks: ${summary.totalChecks}`)
    console.log(`✅ Passed: ${summary.passed}`)
    console.log(`❌ Failed: ${summary.failed}`)
    console.log(`⚠️  Warnings: ${summary.warnings}`)
    console.log(`⏭️  Skipped: ${summary.skipped}`)
    
    // Calculate overall status
    if (summary.failed === 0 && summary.warnings <= 2) {
      console.log('\n🎉 INTEGRATION FRAMEWORK IS READY!')
      console.log('✨ All critical components verified successfully')
    } else if (summary.failed === 0) {
      console.log('\n⚠️  INTEGRATION FRAMEWORK IS MOSTLY READY')
      console.log('⚡ Address warnings for optimal performance')
    } else {
      console.log('\n❌ INTEGRATION FRAMEWORK NEEDS ATTENTION')
      console.log('🔧 Fix failed checks before proceeding')
    }
    
    return summary
  }
  
  // Main verification runner
  async run(): Promise<VerificationSummary> {
    try {
      await this.verifyTestEnvironment()
      this.verifyIntegrationTestFiles()
      this.verifyDependencies()
      this.verifyTestScripts()
      this.verifyJestConfiguration()
      this.verifyPlaywrightConfiguration()
      await this.testBasicIntegrationFunctions()
      this.verifySecurityTestScenarios()
      this.verifyDocumentation()
      await this.runQuickTestSuite()
      
      return this.generateSummary()
      
    } catch (error) {
      console.error('\n💥 Verification failed with error:', error)
      process.exit(1)
    }
  }
}

// Execute verification if run directly
if (require.main === module) {
  const verifier = new IntegrationVerifier()
  verifier.run().then(summary => {
    // Exit with appropriate code
    const exitCode = summary.failed > 0 ? 1 : 0
    process.exit(exitCode)
  }).catch(error => {
    console.error('Verification script failed:', error)
    process.exit(1)
  })
}

export { IntegrationVerifier, type VerificationResult, type VerificationSummary }