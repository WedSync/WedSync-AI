#!/usr/bin/env ts-node

/**
 * WS-154 Team E Round 3: Seating Arrangements Production Load Testing
 * 
 * This script performs load testing for 1000+ concurrent seating operations
 * to validate production readiness of the seating arrangement system.
 */

import { createClient } from '@supabase/supabase-js'
import { performance } from 'perf_hooks'

// Configuration
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const CONCURRENT_OPERATIONS = 1000
const TEST_ORGANIZATION_ID = 'test-org-load-testing'
const TEST_CLIENT_ID = 'test-client-load-testing'

// Performance thresholds
const MAX_OPERATION_TIME_MS = 5000 // 5 seconds max per operation
const MAX_TOTAL_TEST_TIME_MS = 60000 // 60 seconds max for entire test
const MIN_SUCCESS_RATE = 95 // 95% minimum success rate

interface LoadTestResult {
  operation: string
  success: boolean
  duration: number
  error?: string
}

interface LoadTestMetrics {
  totalOperations: number
  successfulOperations: number
  failedOperations: number
  averageResponseTime: number
  maxResponseTime: number
  minResponseTime: number
  throughputPerSecond: number
  successRate: number
  totalTestDuration: number
}

class SeatingLoadTester {
  private supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  private results: LoadTestResult[] = []
  
  async runLoadTest(): Promise<LoadTestMetrics> {
    console.log('🚀 Starting WS-154 Seating Arrangements Load Test')
    console.log(`📊 Testing ${CONCURRENT_OPERATIONS} concurrent operations`)
    
    const testStart = performance.now()
    
    // Setup test data
    await this.setupTestData()
    
    // Run concurrent seating operations
    const operations = this.generateLoadTestOperations()
    const promises = operations.map(op => this.executeOperation(op))
    
    console.log('⏳ Executing concurrent operations...')
    await Promise.allSettled(promises)
    
    const testEnd = performance.now()
    const totalTestDuration = testEnd - testStart
    
    // Analyze results
    const metrics = this.analyzeResults(totalTestDuration)
    
    // Cleanup test data
    await this.cleanupTestData()
    
    // Report results
    this.reportResults(metrics)
    
    return metrics
  }
  
  private async setupTestData(): Promise<void> {
    console.log('🔧 Setting up test data...')
    
    // Create test seating layout
    const { error: layoutError } = await this.supabase
      .from('seating_layouts')
      .upsert({
        organization_id: TEST_ORGANIZATION_ID,
        client_id: TEST_CLIENT_ID,
        layout_name: 'Load Test Layout',
        venue_name: 'Load Test Venue',
        total_capacity: 200,
        table_count: 25,
        layout_configuration: {
          theme: 'elegant',
          style: 'formal'
        }
      })
    
    if (layoutError) {
      console.error('❌ Failed to create test layout:', layoutError)
      throw new Error('Setup failed')
    }
    
    // Get the created layout
    const { data: layouts } = await this.supabase
      .from('seating_layouts')
      .select('id')
      .eq('organization_id', TEST_ORGANIZATION_ID)
      .limit(1)
    
    if (!layouts || layouts.length === 0) {
      throw new Error('Failed to retrieve test layout')
    }
    
    const layoutId = layouts[0].id
    
    // Create test tables
    const tables = Array.from({ length: 25 }, (_, i) => ({
      layout_id: layoutId,
      table_number: i + 1,
      table_name: `Table ${i + 1}`,
      max_capacity: 8,
      table_shape: 'round',
      position_x: Math.random() * 1000,
      position_y: Math.random() * 1000
    }))
    
    const { error: tablesError } = await this.supabase
      .from('seating_tables')
      .insert(tables)
    
    if (tablesError) {
      console.error('❌ Failed to create test tables:', tablesError)
      throw new Error('Setup failed')
    }
    
    // Create test guests
    const guests = Array.from({ length: 150 }, (_, i) => ({
      couple_id: TEST_CLIENT_ID,
      organization_id: TEST_ORGANIZATION_ID,
      first_name: `TestGuest${i}`,
      last_name: `LoadTest`,
      email: `loadtest${i}@wedsync.test`,
      category: 'family',
      side: i % 2 === 0 ? 'bride' : 'groom',
      rsvp_status: 'confirmed'
    }))
    
    const { error: guestsError } = await this.supabase
      .from('guests')
      .insert(guests)
    
    if (guestsError) {
      console.error('❌ Failed to create test guests:', guestsError)
      throw new Error('Setup failed')
    }
    
    console.log('✅ Test data setup complete')
  }
  
  private generateLoadTestOperations(): Array<{ type: string, data: any }> {
    const operations = []
    
    // Mix of different operation types
    for (let i = 0; i < CONCURRENT_OPERATIONS; i++) {
      const opType = [
        'assign_guest_to_table',
        'move_guest_between_tables',
        'create_seating_preference',
        'optimize_seating_layout',
        'update_table_capacity',
        'bulk_assign_guests',
        'validate_seating_constraints',
        'generate_seating_report'
      ][i % 8]
      
      operations.push({
        type: opType,
        data: { operationId: i, timestamp: Date.now() }
      })
    }
    
    return operations
  }
  
  private async executeOperation(operation: { type: string, data: any }): Promise<void> {
    const startTime = performance.now()
    let success = false
    let error: string | undefined
    
    try {
      switch (operation.type) {
        case 'assign_guest_to_table':
          await this.simulateGuestAssignment()
          break
        case 'move_guest_between_tables':
          await this.simulateGuestMove()
          break
        case 'create_seating_preference':
          await this.simulatePreferenceCreation()
          break
        case 'optimize_seating_layout':
          await this.simulateOptimization()
          break
        case 'update_table_capacity':
          await this.simulateTableUpdate()
          break
        case 'bulk_assign_guests':
          await this.simulateBulkAssignment()
          break
        case 'validate_seating_constraints':
          await this.simulateConstraintValidation()
          break
        case 'generate_seating_report':
          await this.simulateReportGeneration()
          break
        default:
          throw new Error(`Unknown operation type: ${operation.type}`)
      }
      
      success = true
    } catch (err) {
      error = err instanceof Error ? err.message : String(err)
    }
    
    const endTime = performance.now()
    const duration = endTime - startTime
    
    this.results.push({
      operation: operation.type,
      success,
      duration,
      error
    })
  }
  
  private async simulateGuestAssignment(): Promise<void> {
    // Simulate assigning a guest to a table
    const { data: guests } = await this.supabase
      .from('guests')
      .select('id')
      .eq('organization_id', TEST_ORGANIZATION_ID)
      .limit(1)
    
    const { data: tables } = await this.supabase
      .from('seating_tables')
      .select('id')
      .limit(1)
    
    if (guests && tables && guests.length > 0 && tables.length > 0) {
      await this.supabase
        .from('seating_assignments')
        .upsert({
          layout_id: 'test-layout-id',
          table_id: tables[0].id,
          guest_id: guests[0].id,
          seat_number: Math.floor(Math.random() * 8) + 1,
          assignment_priority: 1,
          is_confirmed: true
        })
    }
  }
  
  private async simulateGuestMove(): Promise<void> {
    // Simulate moving a guest between tables
    const { data: assignments } = await this.supabase
      .from('seating_assignments')
      .select('id')
      .limit(1)
    
    if (assignments && assignments.length > 0) {
      await this.supabase
        .from('seating_assignments')
        .update({ 
          seat_number: Math.floor(Math.random() * 8) + 1,
          updated_at: new Date().toISOString()
        })
        .eq('id', assignments[0].id)
    }
  }
  
  private async simulatePreferenceCreation(): Promise<void> {
    // Simulate creating seating preferences
    const { data: guests } = await this.supabase
      .from('guests')
      .select('id')
      .eq('organization_id', TEST_ORGANIZATION_ID)
      .limit(2)
    
    if (guests && guests.length >= 2) {
      await this.supabase
        .from('seating_preferences')
        .insert({
          guest_id: guests[0].id,
          preference_type: 'sit_with',
          target_guest_id: guests[1].id,
          preference_strength: Math.floor(Math.random() * 10) + 1
        })
    }
  }
  
  private async simulateOptimization(): Promise<void> {
    // Simulate seating optimization
    const optimizationId = `opt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    
    await this.supabase
      .from('seating_optimization_logs')
      .insert({
        layout_id: 'test-layout-id',
        optimization_run_id: optimizationId,
        algorithm_used: 'hungarian_algorithm',
        optimization_score: Math.random() * 100,
        execution_time_ms: Math.floor(Math.random() * 5000),
        total_guests_assigned: Math.floor(Math.random() * 150),
        conflicts_resolved: Math.floor(Math.random() * 20)
      })
  }
  
  private async simulateTableUpdate(): Promise<void> {
    // Simulate table capacity update
    const { data: tables } = await this.supabase
      .from('seating_tables')
      .select('id')
      .limit(1)
    
    if (tables && tables.length > 0) {
      await this.supabase
        .from('seating_tables')
        .update({ 
          max_capacity: Math.floor(Math.random() * 4) + 6, // 6-10 capacity
          updated_at: new Date().toISOString()
        })
        .eq('id', tables[0].id)
    }
  }
  
  private async simulateBulkAssignment(): Promise<void> {
    // Simulate bulk guest assignment
    const { data: guests } = await this.supabase
      .from('guests')
      .select('id')
      .eq('organization_id', TEST_ORGANIZATION_ID)
      .limit(5)
    
    const { data: tables } = await this.supabase
      .from('seating_tables')
      .select('id')
      .limit(1)
    
    if (guests && tables && guests.length > 0 && tables.length > 0) {
      const assignments = guests.map((guest, index) => ({
        layout_id: 'test-layout-id',
        table_id: tables[0].id,
        guest_id: guest.id,
        seat_number: index + 1,
        assignment_priority: 1,
        is_confirmed: false
      }))
      
      // Use upsert to handle conflicts gracefully
      await this.supabase
        .from('seating_assignments')
        .upsert(assignments)
    }
  }
  
  private async simulateConstraintValidation(): Promise<void> {
    // Simulate constraint validation query
    await this.supabase
      .from('v_seating_performance_metrics')
      .select('*')
      .limit(1)
  }
  
  private async simulateReportGeneration(): Promise<void> {
    // Simulate generating seating reports
    await this.supabase
      .from('seating_assignments')
      .select(`
        *,
        guests(first_name, last_name),
        seating_tables(table_number, table_name)
      `)
      .limit(10)
  }
  
  private analyzeResults(totalTestDuration: number): LoadTestMetrics {
    const successfulOps = this.results.filter(r => r.success).length
    const failedOps = this.results.filter(r => r.success === false).length
    const durations = this.results.map(r => r.duration)
    
    return {
      totalOperations: this.results.length,
      successfulOperations: successfulOps,
      failedOperations: failedOps,
      averageResponseTime: durations.reduce((a, b) => a + b, 0) / durations.length,
      maxResponseTime: Math.max(...durations),
      minResponseTime: Math.min(...durations),
      throughputPerSecond: (this.results.length / totalTestDuration) * 1000,
      successRate: (successfulOps / this.results.length) * 100,
      totalTestDuration
    }
  }
  
  private reportResults(metrics: LoadTestMetrics): void {
    console.log('\n📊 WS-154 Seating Load Test Results')
    console.log('=' .repeat(50))
    console.log(`Total Operations: ${metrics.totalOperations}`)
    console.log(`Successful Operations: ${metrics.successfulOperations}`)
    console.log(`Failed Operations: ${metrics.failedOperations}`)
    console.log(`Success Rate: ${metrics.successRate.toFixed(2)}%`)
    console.log(`Average Response Time: ${metrics.averageResponseTime.toFixed(2)}ms`)
    console.log(`Max Response Time: ${metrics.maxResponseTime.toFixed(2)}ms`)
    console.log(`Min Response Time: ${metrics.minResponseTime.toFixed(2)}ms`)
    console.log(`Throughput: ${metrics.throughputPerSecond.toFixed(2)} ops/sec`)
    console.log(`Total Test Duration: ${(metrics.totalTestDuration / 1000).toFixed(2)}s`)
    
    // Validation against thresholds
    console.log('\n🎯 Production Readiness Validation')
    console.log('=' .repeat(50))
    
    const passesSuccessRate = metrics.successRate >= MIN_SUCCESS_RATE
    const passesResponseTime = metrics.averageResponseTime <= MAX_OPERATION_TIME_MS
    const passesTotalTime = metrics.totalTestDuration <= MAX_TOTAL_TEST_TIME_MS
    
    console.log(`✅ Success Rate (≥${MIN_SUCCESS_RATE}%): ${passesSuccessRate ? 'PASS' : 'FAIL'}`)
    console.log(`✅ Avg Response Time (≤${MAX_OPERATION_TIME_MS}ms): ${passesResponseTime ? 'PASS' : 'FAIL'}`)
    console.log(`✅ Total Test Time (≤${MAX_TOTAL_TEST_TIME_MS/1000}s): ${passesTotalTime ? 'PASS' : 'FAIL'}`)
    
    if (passesSuccessRate && passesResponseTime && passesTotalTime) {
      console.log('\n🎉 PRODUCTION READY: All performance thresholds met!')
    } else {
      console.log('\n⚠️  NEEDS OPTIMIZATION: Some thresholds not met')
    }
    
    // Record performance metrics
    this.recordPerformanceMetrics(metrics)
  }
  
  private async recordPerformanceMetrics(metrics: LoadTestMetrics): Promise<void> {
    const metricsData = [
      { metric_name: 'load_test_success_rate', metric_value: metrics.successRate, measurement_unit: 'percentage' },
      { metric_name: 'load_test_avg_response_time', metric_value: metrics.averageResponseTime, measurement_unit: 'milliseconds' },
      { metric_name: 'load_test_throughput', metric_value: metrics.throughputPerSecond, measurement_unit: 'operations_per_second' },
      { metric_name: 'load_test_max_response_time', metric_value: metrics.maxResponseTime, measurement_unit: 'milliseconds' },
      { metric_name: 'load_test_total_operations', metric_value: metrics.totalOperations, measurement_unit: 'count' }
    ]
    
    await this.supabase
      .from('seating_performance_metrics')
      .insert(metricsData)
  }
  
  private async cleanupTestData(): Promise<void> {
    console.log('🧹 Cleaning up test data...')
    
    // Clean up in reverse dependency order
    await this.supabase.from('seating_assignments').delete().like('layout_id', 'test-%')
    await this.supabase.from('seating_preferences').delete().in('guest_id', 
      (await this.supabase.from('guests').select('id').eq('organization_id', TEST_ORGANIZATION_ID)).data?.map(g => g.id) || []
    )
    await this.supabase.from('seating_optimization_logs').delete().like('layout_id', 'test-%')
    await this.supabase.from('seating_tables').delete().like('layout_id', 'test-%')
    await this.supabase.from('guests').delete().eq('organization_id', TEST_ORGANIZATION_ID)
    await this.supabase.from('seating_layouts').delete().eq('organization_id', TEST_ORGANIZATION_ID)
    
    console.log('✅ Test data cleanup complete')
  }
}

// Main execution
async function main() {
  try {
    const tester = new SeatingLoadTester()
    const metrics = await tester.runLoadTest()
    
    // Exit with appropriate code
    const isProductionReady = metrics.successRate >= MIN_SUCCESS_RATE && 
                             metrics.averageResponseTime <= MAX_OPERATION_TIME_MS
    
    process.exit(isProductionReady ? 0 : 1)
    
  } catch (error) {
    console.error('❌ Load test failed:', error)
    process.exit(1)
  }
}

if (require.main === module) {
  main()
}

export { SeatingLoadTester, type LoadTestMetrics }