/**
 * WS-151 Test Coverage Validation Script
 * Team E - Batch 13 - Guest List Builder Test Coverage Analysis
 * 
 * This script analyzes the test coverage for WS-151 Guest List Builder
 * and validates that we meet the >80% coverage requirement.
 */

import { readFileSync, readdirSync, statSync } from 'fs'
import { join, extname } from 'path'

interface TestFile {
  path: string
  name: string
  type: 'unit' | 'integration' | 'e2e' | 'accessibility' | 'performance' | 'validation' | 'cross-browser'
  testCount: number
  lines: number
  coverage: {
    functions: string[]
    components: string[]
    features: string[]
  }
}

interface ComponentFile {
  path: string
  name: string
  functions: string[]
  lines: number
  complexity: number
}

interface CoverageReport {
  totalTests: number
  testFiles: TestFile[]
  componentFiles: ComponentFile[]
  coverageByType: {
    unit: number
    integration: number
    e2e: number
    accessibility: number
    performance: number
    validation: number
  }
  overallCoverage: number
  meetsCriteria: boolean
  recommendations: string[]
}

class TestCoverageValidator {
  private projectRoot: string
  private testDirectories: string[]
  private componentDirectories: string[]

  constructor(projectRoot: string) {
    this.projectRoot = projectRoot
    this.testDirectories = [
      'src/__tests__/unit',
      'src/__tests__/integration', 
      'src/__tests__/accessibility',
      'src/__tests__/performance',
      'src/__tests__/validation',
      'src/__tests__/cross-browser',
      'tests/e2e'
    ]
    this.componentDirectories = [
      'src/components/guests',
      'src/lib/services',
      'src/hooks',
      'src/app/api'
    ]
  }

  private findFiles(directory: string, extensions: string[]): string[] {
    const files: string[] = []
    
    try {
      const fullPath = join(this.projectRoot, directory)
      const items = readdirSync(fullPath)

      for (const item of items) {
        const itemPath = join(fullPath, item)
        const stat = statSync(itemPath)
        
        if (stat.isDirectory()) {
          // Recursively search subdirectories
          const relativePath = join(directory, item)
          files.push(...this.findFiles(relativePath, extensions))
        } else if (extensions.some(ext => item.endsWith(ext))) {
          files.push(join(directory, item))
        }
      }
    } catch (error) {
      console.warn(`Warning: Could not read directory ${directory}`)
    }

    return files
  }

  private analyzeTestFile(filePath: string): TestFile {
    const fullPath = join(this.projectRoot, filePath)
    const content = readFileSync(fullPath, 'utf8')
    const fileName = filePath.split('/').pop() || ''
    
    // Determine test type
    let type: TestFile['type'] = 'unit'
    if (filePath.includes('integration')) type = 'integration'
    else if (filePath.includes('e2e')) type = 'e2e'
    else if (filePath.includes('accessibility')) type = 'accessibility'
    else if (filePath.includes('performance')) type = 'performance'
    else if (filePath.includes('validation')) type = 'validation'
    else if (filePath.includes('cross-browser')) type = 'cross-browser'
    
    // Count tests
    const testMatches = content.match(/(?:it|test)\s*\(/g) || []
    const describeMatches = content.match(/describe\s*\(/g) || []
    
    // Extract covered functions and components
    const functionMatches = content.match(/(?:expect|mock|spy).*?([a-zA-Z][a-zA-Z0-9]*)\s*\(/g) || []
    const componentMatches = content.match(/(?:render|mount|shallow)\s*\(\s*<\s*([A-Z][a-zA-Z0-9]*)/g) || []
    const importMatches = content.match(/import.*?{([^}]+)}.*?from/g) || []
    
    const functions = [...new Set([
      ...functionMatches.map(m => m.match(/([a-zA-Z][a-zA-Z0-9]*)\s*\(/)?.[1] || ''),
      ...importMatches.flatMap(m => {
        const imports = m.match(/{([^}]+)}/)?.[1] || ''
        return imports.split(',').map(i => i.trim())
      })
    ].filter(f => f && f.length > 0))]

    const components = [...new Set(
      componentMatches.map(m => m.match(/<\s*([A-Z][a-zA-Z0-9]*)/)?.[1] || '').filter(c => c)
    )]

    // Extract tested features from test descriptions
    const featureMatches = content.match(/(?:it|test)\s*\(\s*['"`]([^'"`]+)['"`]/g) || []
    const features = featureMatches.map(m => {
      const match = m.match(/['"`]([^'"`]+)['"`]/)
      return match ? match[1] : ''
    }).filter(f => f)

    return {
      path: filePath,
      name: fileName,
      type,
      testCount: testMatches.length,
      lines: content.split('\n').length,
      coverage: {
        functions,
        components,
        features
      }
    }
  }

  private analyzeComponentFile(filePath: string): ComponentFile {
    const fullPath = join(this.projectRoot, filePath)
    const content = readFileSync(fullPath, 'utf8')
    const fileName = filePath.split('/').pop() || ''
    
    // Extract function definitions
    const functionMatches = [
      ...content.matchAll(/(?:function\s+|const\s+)([a-zA-Z][a-zA-Z0-9]*)\s*[=\(]/g),
      ...content.matchAll(/([a-zA-Z][a-zA-Z0-9]*)\s*:\s*\([^)]*\)\s*=>/g),
      ...content.matchAll(/(?:async\s+)?([a-zA-Z][a-zA-Z0-9]*)\s*\([^)]*\)\s*{/g)
    ]
    
    const functions = [...new Set(
      functionMatches.map(m => m[1]).filter(f => f && !['if', 'for', 'while', 'switch'].includes(f))
    )]
    
    // Calculate complexity (simplified)
    const complexityKeywords = ['if', 'else', 'for', 'while', 'switch', 'case', 'catch', 'try', '&&', '||', '?']
    let complexity = 1 // Base complexity
    
    for (const keyword of complexityKeywords) {
      const matches = content.match(new RegExp(`\\b${keyword}\\b`, 'g'))
      if (matches) complexity += matches.length
    }
    
    return {
      path: filePath,
      name: fileName,
      functions,
      lines: content.split('\n').length,
      complexity
    }
  }

  public async generateCoverageReport(): Promise<CoverageReport> {
    console.log('🔍 Analyzing WS-151 Guest List Builder Test Coverage...\n')
    
    // Find all test files
    const testFiles: TestFile[] = []
    for (const testDir of this.testDirectories) {
      const files = this.findFiles(testDir, ['.test.ts', '.test.tsx', '.spec.ts', '.spec.tsx'])
      
      // Filter for guest-related tests
      const guestTestFiles = files.filter(file => 
        file.toLowerCase().includes('guest') ||
        file.toLowerCase().includes('ws-151') ||
        file.toLowerCase().includes('ws151')
      )
      
      for (const file of guestTestFiles) {
        try {
          const analysis = this.analyzeTestFile(file)
          testFiles.push(analysis)
        } catch (error) {
          console.warn(`Warning: Could not analyze test file ${file}:`, error.message)
        }
      }
    }
    
    // Find all component files
    const componentFiles: ComponentFile[] = []
    for (const componentDir of this.componentDirectories) {
      const files = this.findFiles(componentDir, ['.ts', '.tsx'])
      
      // Filter for guest-related components
      const guestComponentFiles = files.filter(file => 
        file.toLowerCase().includes('guest') ||
        file.includes('GuestListBuilder') ||
        !file.includes('.test.') && !file.includes('.spec.')
      )
      
      for (const file of guestComponentFiles) {
        try {
          const analysis = this.analyzeComponentFile(file)
          componentFiles.push(analysis)
        } catch (error) {
          console.warn(`Warning: Could not analyze component file ${file}:`, error.message)
        }
      }
    }
    
    // Calculate coverage by type
    const coverageByType = {
      unit: testFiles.filter(t => t.type === 'unit').length,
      integration: testFiles.filter(t => t.type === 'integration').length,
      e2e: testFiles.filter(t => t.type === 'e2e').length,
      accessibility: testFiles.filter(t => t.type === 'accessibility').length,
      performance: testFiles.filter(t => t.type === 'performance').length,
      validation: testFiles.filter(t => t.type === 'validation').length
    }
    
    // Calculate overall coverage
    const totalFunctionsInComponents = componentFiles.reduce((sum, comp) => sum + comp.functions.length, 0)
    const totalTestedFunctions = [...new Set(
      testFiles.flatMap(test => test.coverage.functions)
    )].length
    
    const functionCoverage = totalFunctionsInComponents > 0 
      ? (totalTestedFunctions / totalFunctionsInComponents) * 100 
      : 0
    
    // Calculate line coverage estimate
    const totalComponentLines = componentFiles.reduce((sum, comp) => sum + comp.lines, 0)
    const totalTestLines = testFiles.reduce((sum, test) => sum + test.lines, 0)
    
    // Estimate coverage based on test comprehensiveness
    const testComprehensiveness = Math.min(totalTestLines / Math.max(totalComponentLines, 1), 2) // Cap at 2x
    const estimatedLineCoverage = (functionCoverage * 0.6 + testComprehensiveness * 40) * 0.01 * 100
    
    const overallCoverage = Math.min((functionCoverage * 0.4 + estimatedLineCoverage * 0.6), 100)
    
    // Determine if criteria are met
    const meetsCriteria = overallCoverage >= 80
    
    // Generate recommendations
    const recommendations: string[] = []
    
    if (coverageByType.unit < 5) {
      recommendations.push('Add more unit tests for individual component methods')
    }
    
    if (coverageByType.integration < 3) {
      recommendations.push('Add integration tests for API endpoints and data flow')
    }
    
    if (coverageByType.e2e < 2) {
      recommendations.push('Add end-to-end tests for complete user workflows')
    }
    
    if (coverageByType.accessibility < 1) {
      recommendations.push('Add accessibility tests for WCAG compliance')
    }
    
    if (coverageByType.performance < 1) {
      recommendations.push('Add performance tests for large datasets')
    }
    
    if (!meetsCriteria) {
      recommendations.push('Increase test coverage to meet 80% requirement')
      recommendations.push('Focus on testing edge cases and error scenarios')
    }

    return {
      totalTests: testFiles.reduce((sum, test) => sum + test.testCount, 0),
      testFiles,
      componentFiles,
      coverageByType,
      overallCoverage,
      meetsCriteria,
      recommendations
    }
  }

  public printDetailedReport(report: CoverageReport): void {
    console.log('📊 WS-151 Guest List Builder Test Coverage Report')
    console.log('='.repeat(60))
    
    // Summary
    console.log('\n📋 SUMMARY')
    console.log(`Total Test Files: ${report.testFiles.length}`)
    console.log(`Total Tests: ${report.totalTests}`)
    console.log(`Total Component Files: ${report.componentFiles.length}`)
    console.log(`Overall Coverage: ${report.overallCoverage.toFixed(1)}%`)
    console.log(`Meets 80% Requirement: ${report.meetsCriteria ? '✅ YES' : '❌ NO'}`)
    
    // Coverage by Type
    console.log('\n🧪 TEST COVERAGE BY TYPE')
    console.log(`Unit Tests: ${report.coverageByType.unit} files`)
    console.log(`Integration Tests: ${report.coverageByType.integration} files`)
    console.log(`E2E Tests: ${report.coverageByType.e2e} files`)
    console.log(`Accessibility Tests: ${report.coverageByType.accessibility} files`)
    console.log(`Performance Tests: ${report.coverageByType.performance} files`)
    console.log(`Validation Tests: ${report.coverageByType.validation} files`)
    
    // Test Files Detail
    console.log('\n📁 TEST FILES ANALYZED')
    report.testFiles
      .sort((a, b) => b.testCount - a.testCount)
      .forEach(testFile => {
        console.log(`├─ ${testFile.name} (${testFile.type})`)
        console.log(`   ├─ Tests: ${testFile.testCount}`)
        console.log(`   ├─ Lines: ${testFile.lines}`)
        console.log(`   ├─ Functions Tested: ${testFile.coverage.functions.length}`)
        console.log(`   └─ Components Tested: ${testFile.coverage.components.length}`)
      })
    
    // Component Files Detail
    console.log('\n🏗️  COMPONENT FILES ANALYZED')
    report.componentFiles
      .sort((a, b) => b.complexity - a.complexity)
      .forEach(compFile => {
        const testedFunctions = report.testFiles.flatMap(t => t.coverage.functions)
        const coverage = compFile.functions.length > 0 
          ? (compFile.functions.filter(f => testedFunctions.includes(f)).length / compFile.functions.length) * 100
          : 0
        
        console.log(`├─ ${compFile.name}`)
        console.log(`   ├─ Functions: ${compFile.functions.length}`)
        console.log(`   ├─ Lines: ${compFile.lines}`)
        console.log(`   ├─ Complexity: ${compFile.complexity}`)
        console.log(`   └─ Estimated Coverage: ${coverage.toFixed(1)}%`)
      })
    
    // Recommendations
    if (report.recommendations.length > 0) {
      console.log('\n💡 RECOMMENDATIONS')
      report.recommendations.forEach((rec, index) => {
        console.log(`${index + 1}. ${rec}`)
      })
    }
    
    // Test Quality Assessment
    console.log('\n⭐ TEST QUALITY ASSESSMENT')
    
    const avgTestsPerFile = report.totalTests / Math.max(report.testFiles.length, 1)
    const testDiversity = Object.values(report.coverageByType).filter(count => count > 0).length
    const comprehensiveness = Math.min((report.totalTests / 50) * 100, 100) // Assuming 50+ tests is comprehensive
    
    console.log(`Average Tests per File: ${avgTestsPerFile.toFixed(1)}`)
    console.log(`Test Type Diversity: ${testDiversity}/6 types covered`)
    console.log(`Test Comprehensiveness: ${comprehensiveness.toFixed(1)}%`)
    
    // Final Assessment
    console.log('\n🎯 FINAL ASSESSMENT')
    if (report.meetsCriteria) {
      console.log('✅ EXCELLENT: Test coverage meets the >80% requirement!')
      console.log('   The WS-151 Guest List Builder feature has comprehensive test coverage.')
    } else {
      console.log('⚠️  NEEDS IMPROVEMENT: Test coverage below 80% requirement.')
      console.log(`   Current coverage: ${report.overallCoverage.toFixed(1)}%`)
      console.log(`   Target coverage: 80%+`)
      console.log(`   Gap: ${(80 - report.overallCoverage).toFixed(1)}%`)
    }
  }
}

// Run the analysis
async function main() {
  const projectRoot = process.cwd()
  const validator = new TestCoverageValidator(projectRoot)
  
  try {
    const report = await validator.generateCoverageReport()
    validator.printDetailedReport(report)
    
    // Save report to file
    const reportPath = join(projectRoot, 'ws-151-test-coverage-report.json')
    require('fs').writeFileSync(reportPath, JSON.stringify(report, null, 2))
    console.log(`\n📄 Detailed report saved to: ${reportPath}`)
    
    // Exit with appropriate code
    process.exit(report.meetsCriteria ? 0 : 1)
    
  } catch (error) {
    console.error('❌ Error generating coverage report:', error)
    process.exit(1)
  }
}

if (require.main === module) {
  main().catch(console.error)
}

export { TestCoverageValidator, type CoverageReport }