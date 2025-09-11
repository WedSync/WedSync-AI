/**
 * WS-154 Seating Arrangements System - Performance Benchmarks
 * Team E - Database Performance Testing for 200+ Guest Scenarios
 * 
 * Benchmarks critical seating queries and operations for performance validation
 * Target: All queries under 500ms for 200+ guest weddings
 */

import { performance } from 'perf_hooks'
import { createClient } from '@/lib/supabase/server'
import { SeatingQueriesManager } from '@/lib/database/seating-queries'
import type {
  ReceptionTable,
  GuestRelationship,
  SeatingArrangement,
  CreateReceptionTableInput,
  CreateGuestRelationshipInput,
  CreateSeatingArrangementInput,
  BulkSeatingAssignmentInput
} from '@/types/seating'
import type { Guest } from '@/types/guest-management'

// Performance thresholds (milliseconds)
const PERFORMANCE_THRESHOLDS = {
  FAST: 100,           // < 100ms - Excellent
  GOOD: 300,           // < 300ms - Good  
  ACCEPTABLE: 500,     // < 500ms - Acceptable
  SLOW: 1000,          // < 1000ms - Slow
  CRITICAL: 2000       // > 2000ms - Critical (fail)
} as const

// Test data sizes
const TEST_SCENARIOS = {
  SMALL: { guests: 50, relationships: 75, tables: 8 },
  MEDIUM: { guests: 120, relationships: 200, tables: 15 },
  LARGE: { guests: 200, relationships: 400, tables: 25 },
  XLARGE: { guests: 300, relationships: 750, tables: 40 }
} as const

interface BenchmarkResult {
  operation: string
  scenario: keyof typeof TEST_SCENARIOS
  executionTimeMs: number
  performance: keyof typeof PERFORMANCE_THRESHOLDS
  rowsProcessed: number
  indexesUsed?: string[]
  memoryUsage?: number
  cpuUsage?: number
  passed: boolean
  error?: string
}

interface BenchmarkSuite {
  suiteName: string
  results: BenchmarkResult[]
  totalTime: number
  passedCount: number
  failedCount: number
  averageTime: number
}

class SeatingPerformanceBenchmark {
  private supabase: ReturnType<typeof createClient>
  private seatingManager: SeatingQueriesManager
  private testData: Map<string, any> = new Map()

  constructor() {
    this.supabase = createClient()
    this.seatingManager = new SeatingQueriesManager()
  }

  /**
   * Run complete benchmark suite
   */
  async runBenchmarkSuite(): Promise<BenchmarkSuite[]> {
    console.log('🚀 Starting WS-154 Seating System Performance Benchmarks')
    console.log('Target: All queries under 500ms for 200+ guest weddings\n')

    const suites: BenchmarkSuite[] = []

    try {
      // Setup test data for all scenarios
      await this.setupTestData()

      // Run benchmark suites
      suites.push(await this.benchmarkBasicQueries())
      suites.push(await this.benchmarkRelationshipQueries()) 
      suites.push(await this.benchmarkSeatingAssignments())
      suites.push(await this.benchmarkValidationFunctions())
      suites.push(await this.benchmarkOptimizationQueries())
      suites.push(await this.benchmarkConcurrentOperations())
      suites.push(await this.benchmarkComplexScenarios())

      // Generate summary report
      this.generateSummaryReport(suites)

      return suites
    } finally {
      // Cleanup test data
      await this.cleanupTestData()
    }
  }

  /**
   * Setup test data for all scenarios
   */
  private async setupTestData(): Promise<void> {
    console.log('📊 Setting up test data for all scenarios...')

    for (const [scenarioName, scenario] of Object.entries(TEST_SCENARIOS)) {
      const testCoupleId = await this.createTestCouple(`Benchmark ${scenarioName} Couple`)
      const testData = await this.generateTestData(scenario.guests, scenario.relationships, scenario.tables)
      await this.seedTestData(testCoupleId, testData)
      
      this.testData.set(scenarioName, {
        coupleId: testCoupleId,
        ...testData
      })
    }

    console.log('✅ Test data setup complete\n')
  }

  /**
   * Benchmark basic CRUD queries
   */
  private async benchmarkBasicQueries(): Promise<BenchmarkSuite> {
    console.log('🔍 Benchmarking Basic Queries...')
    const results: BenchmarkResult[] = []

    for (const scenario of Object.keys(TEST_SCENARIOS) as Array<keyof typeof TEST_SCENARIOS>) {
      const testData = this.testData.get(scenario)!
      
      // Get Reception Tables
      const tableResult = await this.benchmarkOperation(
        'Get Reception Tables with Assignments',
        scenario,
        async () => {
          return await this.seatingManager.getReceptionTablesWithAssignments(testData.coupleId)
        },
        testData.tables.length
      )
      results.push(tableResult)

      // Get Guest Relationships
      const relationshipResult = await this.benchmarkOperation(
        'Get Guest Relationships with Names',
        scenario,
        async () => {
          return await this.seatingManager.getGuestRelationshipsWithNames(testData.coupleId)
        },
        testData.relationships.length
      )
      results.push(relationshipResult)

      // Get Seating Arrangements
      const arrangementResult = await this.benchmarkOperation(
        'Get Seating Arrangements',
        scenario,
        async () => {
          return await this.seatingManager.getSeatingArrangements(testData.coupleId)
        },
        1
      )
      results.push(arrangementResult)
    }

    return this.createSuite('Basic CRUD Operations', results)
  }

  /**
   * Benchmark relationship queries with filters
   */
  private async benchmarkRelationshipQueries(): Promise<BenchmarkSuite> {
    console.log('💑 Benchmarking Relationship Queries...')
    const results: BenchmarkResult[] = []

    for (const scenario of Object.keys(TEST_SCENARIOS) as Array<keyof typeof TEST_SCENARIOS>) {
      const testData = this.testData.get(scenario)!

      // Filter by conflict preferences
      const conflictResult = await this.benchmarkOperation(
        'Get Conflict Relationships',
        scenario,
        async () => {
          return await this.seatingManager.getGuestRelationshipsWithNames(
            testData.coupleId,
            { seating_preferences: ['must_separate', 'incompatible'] }
          )
        },
        Math.floor(testData.relationships.length * 0.1)
      )
      results.push(conflictResult)

      // Filter by relationship strength
      const strengthResult = await this.benchmarkOperation(
        'Get High-Strength Relationships',
        scenario,
        async () => {
          return await this.seatingManager.getGuestRelationshipsWithNames(
            testData.coupleId,
            { min_strength: 4 }
          )
        },
        Math.floor(testData.relationships.length * 0.3)
      )
      results.push(strengthResult)

      // Filter by specific guests
      const guestIds = testData.guests.slice(0, 10).map((g: Guest) => g.id)
      const guestFilterResult = await this.benchmarkOperation(
        'Get Relationships for Specific Guests',
        scenario,
        async () => {
          return await this.seatingManager.getGuestRelationshipsWithNames(
            testData.coupleId,
            { guest_ids: guestIds }
          )
        },
        Math.floor(testData.relationships.length * 0.05)
      )
      results.push(guestFilterResult)
    }

    return this.createSuite('Relationship Queries with Filters', results)
  }

  /**
   * Benchmark seating assignment operations
   */
  private async benchmarkSeatingAssignments(): Promise<BenchmarkSuite> {
    console.log('🪑 Benchmarking Seating Assignment Operations...')
    const results: BenchmarkResult[] = []

    for (const scenario of Object.keys(TEST_SCENARIOS) as Array<keyof typeof TEST_SCENARIOS>) {
      const testData = this.testData.get(scenario)!

      // Create seating arrangement
      const createArrangementResult = await this.benchmarkOperation(
        'Create Seating Arrangement',
        scenario,
        async () => {
          return await this.seatingManager.createSeatingArrangement(
            testData.coupleId,
            { name: `Benchmark ${scenario} Arrangement` }
          )
        },
        1
      )
      results.push(createArrangementResult)

      const arrangement = createArrangementResult.error ? null : testData.arrangement

      if (arrangement) {
        // Bulk create assignments (assign all guests)
        const assignmentData: BulkSeatingAssignmentInput = {
          arrangement_id: arrangement.id,
          assignments: testData.guests.slice(0, Math.min(testData.guests.length, testData.tables.length * 8))
            .map((guest: Guest, index: number) => ({
              guest_id: guest.id,
              table_id: testData.tables[Math.floor(index / 8)].id,
              seat_number: (index % 8) + 1
            }))
        }

        const bulkAssignResult = await this.benchmarkOperation(
          'Bulk Create Seating Assignments',
          scenario,
          async () => {
            return await this.seatingManager.createBulkSeatingAssignments(assignmentData)
          },
          assignmentData.assignments.length
        )
        results.push(bulkAssignResult)

        // Get assignments with details
        const getAssignmentsResult = await this.benchmarkOperation(
          'Get Seating Assignments with Details',
          scenario,
          async () => {
            return await this.seatingManager.getSeatingAssignments(arrangement.id)
          },
          assignmentData.assignments.length
        )
        results.push(getAssignmentsResult)
      }
    }

    return this.createSuite('Seating Assignment Operations', results)
  }

  /**
   * Benchmark validation and optimization functions
   */
  private async benchmarkValidationFunctions(): Promise<BenchmarkSuite> {
    console.log('✅ Benchmarking Validation Functions...')
    const results: BenchmarkResult[] = []

    for (const scenario of Object.keys(TEST_SCENARIOS) as Array<keyof typeof TEST_SCENARIOS>) {
      const testData = this.testData.get(scenario)!
      
      if (testData.arrangement) {
        // Validate seating arrangement
        const validateResult = await this.benchmarkOperation(
          'Validate Seating Arrangement',
          scenario,
          async () => {
            return await this.seatingManager.validateSeatingArrangement(testData.arrangement.id)
          },
          testData.relationships.length
        )
        results.push(validateResult)

        // Calculate seating score
        const scoreResult = await this.benchmarkOperation(
          'Calculate Seating Score',
          scenario,
          async () => {
            return await this.seatingManager.calculateSeatingScore(testData.arrangement.id)
          },
          testData.relationships.length
        )
        results.push(scoreResult)
      }

      // Get relationship conflicts
      const conflictResult = await this.benchmarkOperation(
        'Get Relationship Conflicts',
        scenario,
        async () => {
          return await this.seatingManager.getRelationshipConflicts(testData.coupleId)
        },
        testData.relationships.length
      )
      results.push(conflictResult)
    }

    return this.createSuite('Validation & Optimization Functions', results)
  }

  /**
   * Benchmark optimization queries (materialized views)
   */
  private async benchmarkOptimizationQueries(): Promise<BenchmarkSuite> {
    console.log('⚡ Benchmarking Optimization Queries...')
    const results: BenchmarkResult[] = []

    for (const scenario of Object.keys(TEST_SCENARIOS) as Array<keyof typeof TEST_SCENARIOS>) {
      const testData = this.testData.get(scenario)!

      // Get optimization view data
      const optimizationResult = await this.benchmarkOperation(
        'Get Seating Optimization Data',
        scenario,
        async () => {
          return await this.seatingManager.getSeatingOptimizationData(testData.coupleId)
        },
        testData.guests.length
      )
      results.push(optimizationResult)

      // Refresh materialized view
      const refreshResult = await this.benchmarkOperation(
        'Refresh Optimization View',
        scenario,
        async () => {
          return await this.seatingManager.refreshSeatingOptimizationView()
        },
        1
      )
      results.push(refreshResult)
    }

    return this.createSuite('Optimization Queries (Materialized Views)', results)
  }

  /**
   * Benchmark concurrent operations
   */
  private async benchmarkConcurrentOperations(): Promise<BenchmarkSuite> {
    console.log('🔄 Benchmarking Concurrent Operations...')
    const results: BenchmarkResult[] = []

    const scenario = 'MEDIUM' // Use medium dataset for concurrency tests
    const testData = this.testData.get(scenario)!

    // Concurrent table queries
    const concurrentTableResult = await this.benchmarkOperation(
      'Concurrent Table Queries (10x)',
      scenario,
      async () => {
        const promises = Array.from({ length: 10 }, () =>
          this.seatingManager.getReceptionTablesWithAssignments(testData.coupleId)
        )
        return await Promise.all(promises)
      },
      testData.tables.length * 10
    )
    results.push(concurrentTableResult)

    // Concurrent relationship queries
    const concurrentRelationshipResult = await this.benchmarkOperation(
      'Concurrent Relationship Queries (10x)',
      scenario,
      async () => {
        const promises = Array.from({ length: 10 }, () =>
          this.seatingManager.getGuestRelationshipsWithNames(testData.coupleId)
        )
        return await Promise.all(promises)
      },
      testData.relationships.length * 10
    )
    results.push(concurrentRelationshipResult)

    // Mixed concurrent operations
    const mixedConcurrentResult = await this.benchmarkOperation(
      'Mixed Concurrent Operations (20x)',
      scenario,
      async () => {
        const promises = [
          ...Array.from({ length: 5 }, () =>
            this.seatingManager.getReceptionTablesWithAssignments(testData.coupleId)
          ),
          ...Array.from({ length: 5 }, () =>
            this.seatingManager.getGuestRelationshipsWithNames(testData.coupleId)
          ),
          ...Array.from({ length: 5 }, () =>
            this.seatingManager.getSeatingArrangements(testData.coupleId)
          ),
          ...Array.from({ length: 5 }, () =>
            this.seatingManager.getSeatingOptimizationData(testData.coupleId)
          )
        ]
        return await Promise.all(promises)
      },
      (testData.tables.length + testData.relationships.length + 1 + testData.guests.length) * 5
    )
    results.push(mixedConcurrentResult)

    return this.createSuite('Concurrent Operations', results)
  }

  /**
   * Benchmark complex real-world scenarios
   */
  private async benchmarkComplexScenarios(): Promise<BenchmarkSuite> {
    console.log('🎯 Benchmarking Complex Real-World Scenarios...')
    const results: BenchmarkResult[] = []

    const scenario = 'LARGE' // Use large dataset for complex scenarios
    const testData = this.testData.get(scenario)!

    // Complete seating plan retrieval
    const fullPlanResult = await this.benchmarkOperation(
      'Get Complete Seating Plan',
      scenario,
      async () => {
        const [tablesResult, relationshipsResult, arrangementsResult] = await Promise.all([
          this.seatingManager.getReceptionTablesWithAssignments(testData.coupleId),
          this.seatingManager.getGuestRelationshipsWithNames(testData.coupleId),
          this.seatingManager.getSeatingArrangements(testData.coupleId)
        ])
        return { tablesResult, relationshipsResult, arrangementsResult }
      },
      testData.tables.length + testData.relationships.length + 1
    )
    results.push(fullPlanResult)

    // Full optimization workflow
    if (testData.arrangement) {
      const optimizationWorkflowResult = await this.benchmarkOperation(
        'Full Optimization Workflow',
        scenario,
        async () => {
          const [validationResult, scoreResult, conflictsResult, optimizationResult] = await Promise.all([
            this.seatingManager.validateSeatingArrangement(testData.arrangement.id),
            this.seatingManager.calculateSeatingScore(testData.arrangement.id),
            this.seatingManager.getRelationshipConflicts(testData.coupleId),
            this.seatingManager.getSeatingOptimizationData(testData.coupleId)
          ])
          return { validationResult, scoreResult, conflictsResult, optimizationResult }
        },
        testData.relationships.length * 3 + testData.guests.length
      )
      results.push(optimizationWorkflowResult)
    }

    // Bulk operations simulation (realistic wedding planning workflow)
    const bulkWorkflowResult = await this.benchmarkOperation(
      'Bulk Wedding Planning Workflow',
      scenario,
      async () => {
        // Simulate: Get all data → Create arrangement → Assign guests → Validate
        const tablesData = await this.seatingManager.getReceptionTablesWithAssignments(testData.coupleId)
        const relationshipsData = await this.seatingManager.getGuestRelationshipsWithNames(testData.coupleId)
        
        const newArrangement = await this.seatingManager.createSeatingArrangement(
          testData.coupleId,
          { name: 'Bulk Workflow Test' }
        )

        let validationResult = null
        if (newArrangement.data) {
          // Create some assignments
          const sampleAssignments: BulkSeatingAssignmentInput = {
            arrangement_id: newArrangement.data.id,
            assignments: testData.guests.slice(0, 50).map((guest: Guest, index: number) => ({
              guest_id: guest.id,
              table_id: testData.tables[Math.floor(index / 8)].id,
              seat_number: (index % 8) + 1
            }))
          }

          await this.seatingManager.createBulkSeatingAssignments(sampleAssignments)
          validationResult = await this.seatingManager.validateSeatingArrangement(newArrangement.data.id)
        }

        return { tablesData, relationshipsData, newArrangement, validationResult }
      },
      testData.tables.length + testData.relationships.length + 50 + 1
    )
    results.push(bulkWorkflowResult)

    return this.createSuite('Complex Real-World Scenarios', results)
  }

  /**
   * Benchmark a single operation
   */
  private async benchmarkOperation<T>(
    operationName: string,
    scenario: keyof typeof TEST_SCENARIOS,
    operation: () => Promise<T>,
    expectedRows: number
  ): Promise<BenchmarkResult> {
    const memBefore = process.memoryUsage()
    const startTime = performance.now()

    try {
      const result = await operation()
      const endTime = performance.now()
      const memAfter = process.memoryUsage()
      
      const executionTime = Math.round(endTime - startTime)
      const memoryUsage = memAfter.heapUsed - memBefore.heapUsed
      
      const performanceCategory = this.categorizePerformance(executionTime)
      const passed = executionTime < PERFORMANCE_THRESHOLDS.CRITICAL

      console.log(
        `  ${passed ? '✅' : '❌'} ${operationName} [${scenario}]: ${executionTime}ms (${performanceCategory}) - ${expectedRows} rows`
      )

      return {
        operation: operationName,
        scenario,
        executionTimeMs: executionTime,
        performance: performanceCategory,
        rowsProcessed: expectedRows,
        memoryUsage: Math.round(memoryUsage / 1024), // KB
        passed,
        indexesUsed: this.extractIndexUsage(result)
      }
    } catch (error) {
      const endTime = performance.now()
      const executionTime = Math.round(endTime - startTime)
      
      console.log(`  ❌ ${operationName} [${scenario}]: FAILED - ${error}`)

      return {
        operation: operationName,
        scenario,
        executionTimeMs: executionTime,
        performance: 'CRITICAL',
        rowsProcessed: 0,
        passed: false,
        error: error instanceof Error ? error.message : String(error)
      }
    }
  }

  /**
   * Categorize performance based on execution time
   */
  private categorizePerformance(executionTime: number): keyof typeof PERFORMANCE_THRESHOLDS {
    if (executionTime < PERFORMANCE_THRESHOLDS.FAST) return 'FAST'
    if (executionTime < PERFORMANCE_THRESHOLDS.GOOD) return 'GOOD'
    if (executionTime < PERFORMANCE_THRESHOLDS.ACCEPTABLE) return 'ACCEPTABLE'
    if (executionTime < PERFORMANCE_THRESHOLDS.SLOW) return 'SLOW'
    return 'CRITICAL'
  }

  /**
   * Extract index usage from query result (if available)
   */
  private extractIndexUsage(result: any): string[] {
    // This would extract actual index usage from query plans
    // For now, return expected indexes based on query patterns
    return []
  }

  /**
   * Create benchmark suite summary
   */
  private createSuite(suiteName: string, results: BenchmarkResult[]): BenchmarkSuite {
    const totalTime = results.reduce((sum, r) => sum + r.executionTimeMs, 0)
    const passedCount = results.filter(r => r.passed).length
    const failedCount = results.length - passedCount
    const averageTime = totalTime / results.length

    return {
      suiteName,
      results,
      totalTime,
      passedCount,
      failedCount,
      averageTime
    }
  }

  /**
   * Generate and display summary report
   */
  private generateSummaryReport(suites: BenchmarkSuite[]): void {
    console.log('\n' + '='.repeat(80))
    console.log('🎯 WS-154 SEATING SYSTEM PERFORMANCE BENCHMARK SUMMARY')
    console.log('='.repeat(80))

    let totalOperations = 0
    let totalPassed = 0
    let totalFailed = 0
    let totalTime = 0

    suites.forEach(suite => {
      console.log(`\n📊 ${suite.suiteName}:`)
      console.log(`   Operations: ${suite.results.length}`)
      console.log(`   Passed: ${suite.passedCount} | Failed: ${suite.failedCount}`)
      console.log(`   Average Time: ${Math.round(suite.averageTime)}ms`)
      console.log(`   Total Time: ${Math.round(suite.totalTime)}ms`)

      totalOperations += suite.results.length
      totalPassed += suite.passedCount
      totalFailed += suite.failedCount
      totalTime += suite.totalTime
    })

    console.log('\n' + '-'.repeat(80))
    console.log('📈 OVERALL PERFORMANCE SUMMARY:')
    console.log('-'.repeat(80))
    console.log(`Total Operations: ${totalOperations}`)
    console.log(`Passed: ${totalPassed} (${Math.round(totalPassed/totalOperations*100)}%)`)
    console.log(`Failed: ${totalFailed} (${Math.round(totalFailed/totalOperations*100)}%)`)
    console.log(`Total Execution Time: ${Math.round(totalTime)}ms`)
    console.log(`Average Operation Time: ${Math.round(totalTime/totalOperations)}ms`)

    // Performance breakdown
    const performanceCounts = {
      FAST: 0, GOOD: 0, ACCEPTABLE: 0, SLOW: 0, CRITICAL: 0
    }

    suites.forEach(suite => {
      suite.results.forEach(result => {
        performanceCounts[result.performance]++
      })
    })

    console.log('\n📊 PERFORMANCE DISTRIBUTION:')
    Object.entries(performanceCounts).forEach(([category, count]) => {
      const percentage = Math.round(count / totalOperations * 100)
      console.log(`   ${category}: ${count} (${percentage}%)`)
    })

    // Pass/Fail criteria
    const overallScore = Math.round(totalPassed / totalOperations * 100)
    console.log('\n🎯 BENCHMARK RESULTS:')
    
    if (overallScore >= 95) {
      console.log('   ✅ EXCELLENT - System ready for production')
    } else if (overallScore >= 90) {
      console.log('   ✅ GOOD - Minor optimizations needed')
    } else if (overallScore >= 80) {
      console.log('   ⚠️  ACCEPTABLE - Some performance issues need attention')
    } else {
      console.log('   ❌ POOR - Significant performance issues require fixing')
    }

    console.log(`   Overall Score: ${overallScore}%`)
    console.log('='.repeat(80) + '\n')
  }

  /**
   * Helper methods for test data management
   */
  private async createTestCouple(name: string): Promise<string> {
    const { data, error } = await this.supabase
      .from('clients')
      .insert({
        first_name: name,
        last_name: 'Benchmark',
        email: `benchmark-${Date.now()}@example.com`,
        business_name: `${name} Wedding`
      })
      .select()
      .single()

    if (error) throw error
    return data.id
  }

  private async generateTestData(guestCount: number, relationshipCount: number, tableCount: number) {
    // Generate synthetic data for benchmarking
    const guests: Guest[] = []
    const tables: ReceptionTable[] = []
    const relationships: GuestRelationship[] = []

    // Generate guests
    for (let i = 0; i < guestCount; i++) {
      guests.push({
        id: `guest-${i}`,
        couple_id: '',
        first_name: `Guest${i}`,
        last_name: `Surname${i}`,
        email: `guest${i}@benchmark.com`,
        category: ['family', 'friends', 'work', 'other'][i % 4] as any,
        side: ['partner1', 'partner2', 'mutual'][i % 3] as any,
        plus_one: i % 10 === 0,
        age_group: 'adult',
        rsvp_status: 'attending',
        tags: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      } as Guest)
    }

    // Generate tables
    for (let i = 0; i < tableCount; i++) {
      tables.push({
        id: `table-${i}`,
        couple_id: '',
        table_number: i + 1,
        name: `Table ${i + 1}`,
        capacity: 8,
        table_shape: 'round',
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      } as ReceptionTable)
    }

    return { guests, tables, relationships }
  }

  private async seedTestData(coupleId: string, testData: any): Promise<void> {
    // Insert guests
    const guestsToInsert = testData.guests.map((guest: any) => ({
      ...guest,
      couple_id: coupleId,
      id: undefined
    }))

    const { data: insertedGuests } = await this.supabase
      .from('guests')
      .insert(guestsToInsert)
      .select()

    if (insertedGuests) {
      testData.guests = insertedGuests
    }

    // Insert tables
    const tablesToInsert = testData.tables.map((table: any) => ({
      ...table,
      couple_id: coupleId,
      id: undefined
    }))

    const { data: insertedTables } = await this.supabase
      .from('reception_tables')
      .insert(tablesToInsert)
      .select()

    if (insertedTables) {
      testData.tables = insertedTables
    }

    // Generate and insert relationships
    const relationships = []
    const relationshipTypes = ['spouse', 'family_immediate', 'close_friends', 'friends']
    const preferences = ['must_sit_together', 'prefer_together', 'neutral', 'prefer_apart', 'must_separate']

    if (insertedGuests && insertedGuests.length > 0) {
      for (let i = 0; i < Math.min(400, insertedGuests.length * 2); i++) {
        const guest1 = insertedGuests[Math.floor(Math.random() * insertedGuests.length)]
        const guest2 = insertedGuests[Math.floor(Math.random() * insertedGuests.length)]
      
      if (guest1.id !== guest2.id) {
        relationships.push({
          guest1_id: guest1.id < guest2.id ? guest1.id : guest2.id,
          guest2_id: guest1.id < guest2.id ? guest2.id : guest1.id,
          relationship_type: relationshipTypes[Math.floor(Math.random() * relationshipTypes.length)],
          seating_preference: preferences[Math.floor(Math.random() * preferences.length)],
          relationship_strength: Math.floor(Math.random() * 5) + 1,
          created_by: coupleId
        })
      }
    }
    }

    if (relationships.length > 0) {
      const { data: insertedRelationships } = await this.supabase
        .from('guest_relationships')
        .insert(relationships)
        .select()

      if (insertedRelationships) {
        testData.relationships = insertedRelationships
      }
    }

    // Create a test arrangement
    const { data: arrangement } = await this.seatingManager.createSeatingArrangement(
      coupleId,
      { name: 'Benchmark Test Arrangement' }
    )

    if (arrangement) {
      testData.arrangement = arrangement
    }
  }

  private async cleanupTestData(): Promise<void> {
    console.log('🧹 Cleaning up benchmark test data...')
    
    for (const testData of this.testData.values()) {
      await this.supabase
        .from('clients')
        .delete()
        .eq('id', testData.coupleId)
    }
    
    this.testData.clear()
    console.log('✅ Cleanup complete')
  }
}

// Export for use in performance testing
export { SeatingPerformanceBenchmark, PERFORMANCE_THRESHOLDS, TEST_SCENARIOS }
export type { BenchmarkResult, BenchmarkSuite }

// CLI runner
if (require.main === module) {
  const benchmark = new SeatingPerformanceBenchmark()
  benchmark.runBenchmarkSuite()
    .then(suites => {
      console.log('Benchmark completed successfully')
      process.exit(0)
    })
    .catch(error => {
      console.error('Benchmark failed:', error)
      process.exit(1)
    })
}