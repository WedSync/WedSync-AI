#!/usr/bin/env node
/**
 * WS-091 Wedding Platform Coverage Validator
 * Ensures >80% coverage thresholds are met for all wedding-critical paths
 * Part of comprehensive unit testing infrastructure
 */

const fs = require('fs')
const path = require('path')

console.log('🔧 WedSync Coverage Validator - Enforcing Wedding Platform Quality Standards')

// Coverage thresholds as per WS-091 specification
const COVERAGE_THRESHOLDS = {
  global: {
    branches: 80,
    functions: 80,
    lines: 80,
    statements: 80,
  },
  // Wedding-critical paths require 95% coverage
  wedding_critical: {
    branches: 95,
    functions: 95,
    lines: 95,
    statements: 95,
    paths: [
      'src/lib/auth/*',
      'src/lib/security/*', 
      'src/lib/payments/*',
      'src/app/api/auth/*',
      'src/app/api/clients/*',
      'src/app/api/guests/*',
      'src/app/api/journeys/*',
      'src/lib/journey-engine/*',
    ]
  },
  // API endpoints require 90% coverage
  api_endpoints: {
    branches: 90,
    functions: 90,
    lines: 90,
    statements: 90,
    paths: ['src/app/api/*']
  }
}

// Wedding business impact categories
const BUSINESS_IMPACT_CATEGORIES = {
  CRITICAL: {
    description: 'Wedding disaster prevention - couples losing data, photographers missing bookings',
    required_coverage: 95,
    paths: [
      'src/lib/auth/',
      'src/lib/security/', 
      'src/lib/payments/',
      'src/components/clients/',
      'src/components/guests/',
      'src/lib/journey-engine/'
    ]
  },
  HIGH: {
    description: 'Wedding workflow disruption - timeline delays, vendor miscommunication',
    required_coverage: 90,
    paths: [
      'src/app/api/',
      'src/components/dashboard/',
      'src/lib/services/',
      'src/components/forms/'
    ]
  },
  MEDIUM: {
    description: 'Wedding convenience features - analytics, reporting, notifications',
    required_coverage: 80,
    paths: [
      'src/components/analytics/',
      'src/components/reports/',
      'src/components/notifications/'
    ]
  }
}

function loadCoverageReport() {
  const coveragePath = path.join(__dirname, '../coverage/coverage-summary.json')
  
  if (!fs.existsSync(coveragePath)) {
    console.error('❌ Coverage report not found. Run tests with coverage first: npm run test:vitest:coverage')
    process.exit(1)
  }
  
  try {
    const coverageData = JSON.parse(fs.readFileSync(coveragePath, 'utf8'))
    console.log('✅ Coverage report loaded successfully')
    return coverageData
  } catch (error) {
    console.error('❌ Failed to parse coverage report:', error.message)
    process.exit(1)
  }
}

function validateGlobalCoverage(coverage) {
  console.log('\n📊 Global Coverage Analysis:')
  
  const global = coverage.total
  const failures = []
  
  Object.entries(COVERAGE_THRESHOLDS.global).forEach(([metric, threshold]) => {
    const actual = global[metric].pct
    const status = actual >= threshold ? '✅' : '❌'
    console.log(`  ${status} ${metric}: ${actual}% (required: ${threshold}%)`)
    
    if (actual < threshold) {
      failures.push({
        metric,
        actual,
        required: threshold,
        category: 'global'
      })
    }
  })
  
  return failures
}

function validateWeddingCriticalPaths(coverage) {
  console.log('\n💎 Wedding-Critical Path Analysis:')
  
  const failures = []
  const criticalFiles = []
  
  // Find all wedding-critical files
  Object.keys(coverage).forEach(filePath => {
    const isWeddingCritical = COVERAGE_THRESHOLDS.wedding_critical.paths.some(pattern => 
      filePath.includes(pattern.replace('*', ''))
    )
    
    if (isWeddingCritical && filePath !== 'total') {
      criticalFiles.push(filePath)
    }
  })
  
  console.log(`  Found ${criticalFiles.length} wedding-critical files`)
  
  criticalFiles.forEach(filePath => {
    const fileCoverage = coverage[filePath]
    let fileFailures = 0
    
    Object.entries(COVERAGE_THRESHOLDS.wedding_critical).forEach(([metric, threshold]) => {
      if (metric === 'paths') return
      
      const actual = fileCoverage[metric]?.pct || 0
      const status = actual >= threshold ? '✅' : '❌'
      
      if (actual < threshold) {
        fileFailures++
        failures.push({
          file: filePath,
          metric,
          actual,
          required: threshold,
          category: 'wedding_critical'
        })
      }
    })
    
    if (fileFailures > 0) {
      console.log(`  ❌ ${path.basename(filePath)}: ${fileFailures} coverage failures`)
    } else {
      console.log(`  ✅ ${path.basename(filePath)}: All wedding-critical thresholds met`)
    }
  })
  
  return failures
}

function validateBusinessImpactCategories(coverage) {
  console.log('\n🎯 Business Impact Category Analysis:')
  
  const failures = []
  
  Object.entries(BUSINESS_IMPACT_CATEGORIES).forEach(([category, config]) => {
    console.log(`\n  ${category} - ${config.description}`)
    
    const categoryFiles = []
    Object.keys(coverage).forEach(filePath => {
      const matchesCategory = config.paths.some(pattern => 
        filePath.includes(pattern)
      )
      
      if (matchesCategory && filePath !== 'total') {
        categoryFiles.push(filePath)
      }
    })
    
    if (categoryFiles.length === 0) {
      console.log(`    ⚠️  No files found for ${category} category`)
      return
    }
    
    let categoryFailures = 0
    categoryFiles.forEach(filePath => {
      const fileCoverage = coverage[filePath]
      
      ['branches', 'functions', 'lines', 'statements'].forEach(metric => {
        const actual = fileCoverage[metric]?.pct || 0
        
        if (actual < config.required_coverage) {
          categoryFailures++
          failures.push({
            file: filePath,
            metric,
            actual,
            required: config.required_coverage,
            category,
            business_impact: config.description
          })
        }
      })
    })
    
    if (categoryFailures === 0) {
      console.log(`    ✅ All ${categoryFiles.length} files meet ${config.required_coverage}% threshold`)
    } else {
      console.log(`    ❌ ${categoryFailures} coverage failures in ${category} category`)
    }
  })
  
  return failures
}

function generateFailureReport(allFailures) {
  if (allFailures.length === 0) {
    console.log('\n🎉 All wedding platform coverage requirements met!')
    console.log('✅ Ready for production deployment')
    return true
  }
  
  console.log(`\n💥 Coverage Validation Failed: ${allFailures.length} issues found`)
  console.log('\n📋 Detailed Failure Report:')
  
  // Group failures by category
  const groupedFailures = {}
  allFailures.forEach(failure => {
    const category = failure.category
    if (!groupedFailures[category]) {
      groupedFailures[category] = []
    }
    groupedFailures[category].push(failure)
  })
  
  Object.entries(groupedFailures).forEach(([category, failures]) => {
    console.log(`\n  ${category.toUpperCase()} FAILURES (${failures.length}):`)
    
    failures.forEach(failure => {
      if (failure.file) {
        console.log(`    ❌ ${path.basename(failure.file)}: ${failure.metric} ${failure.actual}% < ${failure.required}%`)
        if (failure.business_impact) {
          console.log(`       Impact: ${failure.business_impact}`)
        }
      } else {
        console.log(`    ❌ Global ${failure.metric}: ${failure.actual}% < ${failure.required}%`)
      }
    })
  })
  
  console.log('\n🚨 WEDDING PLATFORM QUALITY GATE FAILURE')
  console.log('   These coverage gaps could lead to:')
  console.log('   • Couples losing wedding data')
  console.log('   • Photographers missing critical bookings')
  console.log('   • Payment processing failures')
  console.log('   • Wedding timeline disruptions')
  
  console.log('\n💡 Next Steps:')
  console.log('   1. Add missing unit tests for failing files')
  console.log('   2. Increase test coverage for wedding-critical paths')
  console.log('   3. Run: npm run test:vitest:coverage')
  console.log('   4. Re-run: npm run test:quality:gates')
  
  return false
}

function generateCoverageInsights(coverage) {
  console.log('\n📈 Coverage Insights & Recommendations:')
  
  const global = coverage.total
  const totalFiles = Object.keys(coverage).length - 1 // Exclude 'total'
  
  console.log(`  📊 Overall Statistics:`)
  console.log(`     • Total Files Analyzed: ${totalFiles}`)
  console.log(`     • Average Coverage: ${Math.round(
    (global.lines.pct + global.functions.pct + global.branches.pct + global.statements.pct) / 4
  )}%`)
  
  // Find best and worst performing files
  const fileScores = []
  Object.entries(coverage).forEach(([filePath, data]) => {
    if (filePath === 'total') return
    
    const avgScore = Math.round(
      (data.lines.pct + data.functions.pct + data.branches.pct + data.statements.pct) / 4
    )
    fileScores.push({ file: filePath, score: avgScore })
  })
  
  fileScores.sort((a, b) => b.score - a.score)
  
  console.log(`\n  🏆 Top Performing Files (Wedding Quality Champions):`)
  fileScores.slice(0, 3).forEach(({ file, score }) => {
    console.log(`     ${score}% - ${path.basename(file)}`)
  })
  
  console.log(`\n  ⚠️  Files Needing Attention:`)
  fileScores.slice(-3).forEach(({ file, score }) => {
    console.log(`     ${score}% - ${path.basename(file)}`)
  })
  
  console.log(`\n  🎯 Wedding Platform Health Score: ${
    allFailures.length === 0 ? 'EXCELLENT' : 
    allFailures.length <= 5 ? 'GOOD' : 
    allFailures.length <= 15 ? 'NEEDS IMPROVEMENT' : 'CRITICAL'
  }`)
}

// Main execution
function main() {
  console.log('Starting WS-091 Wedding Platform Coverage Validation...\n')
  
  const coverage = loadCoverageReport()
  
  const globalFailures = validateGlobalCoverage(coverage)
  const criticalFailures = validateWeddingCriticalPaths(coverage)
  const businessFailures = validateBusinessImpactCategories(coverage)
  
  const allFailures = [...globalFailures, ...criticalFailures, ...businessFailures]
  
  generateCoverageInsights(coverage)
  const success = generateFailureReport(allFailures)
  
  if (success) {
    console.log('\n🎊 WedSync Wedding Platform: Ready for couples worldwide!')
    process.exit(0)
  } else {
    console.log('\n🛑 Wedding Platform Quality Gates Failed - Fix coverage before deployment')
    process.exit(1)
  }
}

if (require.main === module) {
  main()
}

module.exports = { 
  COVERAGE_THRESHOLDS, 
  BUSINESS_IMPACT_CATEGORIES,
  validateGlobalCoverage,
  validateWeddingCriticalPaths 
}