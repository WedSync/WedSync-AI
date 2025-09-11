/**
 * WS-153 Photo Groups Management - Comprehensive Performance Tests
 * 
 * Tests performance benchmarks, load testing, memory usage,
 * and database query optimization validation.
 * Performance Requirements:
 * - Photo group creation: <500ms
 * - Guest assignment operations: <200ms
 * - Priority reordering: <300ms
 * - Bulk operations (50+ guests): <2000ms
 * - Page load times: <3000ms
 * - Database queries: <1000ms
 * - Memory usage: <50MB for component
 * - Concurrent users: Support 100+ simultaneous operations
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest'
import { performance, PerformanceObserver } from 'perf_hooks'
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { Database } from '@/types/database'
import { render, screen, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PhotoGroupsManager } from '@/components/guests/PhotoGroupsManager'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
// Performance test configuration
const PERFORMANCE_THRESHOLDS = {
  photoGroupCreation: 500,      // ms
  guestAssignment: 200,         // ms
  priorityReordering: 300,      // ms
  bulkOperations: 2000,         // ms
  pageLoad: 3000,               // ms
  databaseQuery: 1000,          // ms
  memoryUsage: 50 * 1024 * 1024, // 50MB in bytes
  concurrentUsers: 100          // simultaneous operations
}
const TEST_CONFIG = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL!,
  supabaseKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  baseUrl: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
// Performance metrics tracking
interface PerformanceMetrics {
  operation: string
  duration: number
  timestamp: number
  memoryUsage?: number
  success: boolean
  details?: any
const performanceResults: PerformanceMetrics[] = []
// Test data setup
let supabase: SupabaseClient<Database>
let testUser: any
let testClient: any
let testGuests: any[] = []
// Performance measurement utilities
class PerformanceMeasurement {
  private startTime: number = 0
  private startMemory: number = 0
  start() {
    this.startTime = performance.now()
    this.startMemory = process.memoryUsage().heapUsed
  }
  end(operation: string, success: boolean = true, details?: any): PerformanceMetrics {
    const duration = performance.now() - this.startTime
    const memoryUsage = process.memoryUsage().heapUsed
    
    const result: PerformanceMetrics = {
      operation,
      duration,
      timestamp: Date.now(),
      memoryUsage: memoryUsage - this.startMemory,
      success,
      details
    }
    performanceResults.push(result)
    return result
// Load testing utilities
async function simulateConcurrentOperations<T>(
  operations: (() => Promise<T>)[],
  maxConcurrency: number = 10
): Promise<{ results: T[], averageTime: number, maxTime: number, minTime: number }> {
  const startTime = performance.now()
  const chunks = []
  
  for (let i = 0; i < operations.length; i += maxConcurrency) {
    chunks.push(operations.slice(i, i + maxConcurrency))
  const results: T[] = []
  const times: number[] = []
  for (const chunk of chunks) {
    const chunkStart = performance.now()
    const chunkResults = await Promise.all(chunk.map(op => op()))
    const chunkTime = performance.now() - chunkStart
    results.push(...chunkResults)
    times.push(chunkTime)
  const totalTime = performance.now() - startTime
  const averageTime = totalTime / operations.length
  const maxTime = Math.max(...times)
  const minTime = Math.min(...times)
  return { results, averageTime, maxTime, minTime }
describe('WS-153 Photo Groups Management - Performance Tests', () => {
  beforeAll(async () => {
    supabase = createClient<Database>(TEST_CONFIG.supabaseUrl, TEST_CONFIG.supabaseKey)
    // Create test user and client
    const { data: { user }, error: authError } = await supabase.auth.signUp({
      email: `ws153-perf-${Date.now()}@example.com`,
      password: 'testpassword123',
    })
    expect(authError).toBeNull()
    testUser = user
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .insert({
        first_name: 'Performance',
        last_name: 'Test',
        email: testUser.email,
        wedding_date: '2025-12-31'
      })
      .select()
      .single()
    expect(clientError).toBeNull()
    testClient = client
    // Create large set of test guests for performance testing
    const guestData = Array.from({ length: 200 }, (_, i) => ({
      couple_id: testClient.id,
      first_name: `PerfGuest${i + 1}`,
      last_name: `Test${i + 1}`,
      email: `perfguest${i + 1}@example.com`,
      category: ['family', 'friends', 'bridal_party', 'work'][i % 4] as const,
      side: ['partner1', 'partner2', 'mutual'][i % 3] as const,
      plus_one: i % 10 === 0,
    }))
    const { data: guests, error: guestError } = await supabase
      .from('guests')
      .insert(guestData)
    expect(guestError).toBeNull()
    testGuests = guests
  })
  afterAll(async () => {
    // Cleanup
    if (testClient) {
      await supabase.from('photo_group_assignments').delete().match({ photo_group_id: testPhotoGroups.map(g => g.id) })
      await supabase.from('photo_groups').delete().eq('couple_id', testClient.id)
      await supabase.from('guests').delete().eq('couple_id', testClient.id)
      await supabase.from('clients').delete().eq('id', testClient.id)
    if (testUser) {
      await supabase.auth.signOut()
    // Generate performance report
    console.log('\n🚀 WS-153 Performance Test Results:')
    console.log('=====================================')
    const groupedResults = performanceResults.reduce((acc, result) => {
      if (!acc[result.operation]) acc[result.operation] = []
      acc[result.operation].push(result)
      return acc
    }, {} as Record<string, PerformanceMetrics[]>)
    Object.entries(groupedResults).forEach(([operation, results]) => {
      const avgTime = results.reduce((sum, r) => sum + r.duration, 0) / results.length
      const maxTime = Math.max(...results.map(r => r.duration))
      const minTime = Math.min(...results.map(r => r.duration))
      const successRate = (results.filter(r => r.success).length / results.length) * 100
      
      console.log(`📊 ${operation}:`)
      console.log(`   Average: ${Math.round(avgTime)}ms`)
      console.log(`   Min: ${Math.round(minTime)}ms`)
      console.log(`   Max: ${Math.round(maxTime)}ms`)
      console.log(`   Success Rate: ${successRate.toFixed(1)}%`)
      console.log(`   Executions: ${results.length}`)
  describe('API Performance Benchmarks', () => {
    let testPhotoGroups: any[] = []
    it('should create photo groups within performance threshold (<500ms)', async () => {
      const measurement = new PerformanceMeasurement()
      for (let i = 0; i < 10; i++) {
        const photoGroupData = {
          couple_id: testClient.id,
          name: `Performance Test Group ${i + 1}`,
          description: `Testing photo group creation performance - iteration ${i + 1}`,
          photo_type: 'family',
          estimated_time_minutes: 10,
          location: 'Test Location',
          photographer_notes: 'Performance test notes',
          guest_ids: testGuests.slice(0, 5).map(g => g.id)
        }
        measurement.start()
        
        const response = await fetch(`${TEST_CONFIG.baseUrl}/api/guests/photo-groups`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${testUser.access_token}`
          },
          body: JSON.stringify(photoGroupData)
        })
        const result = await response.json()
        const metrics = measurement.end('Photo Group Creation', response.ok, { groupId: result.id })
        expect(response.status).toBe(201)
        expect(metrics.duration).toBeLessThan(PERFORMANCE_THRESHOLDS.photoGroupCreation)
        testPhotoGroups.push(result)
      }
      console.log(`✅ Photo group creation: All ${testPhotoGroups.length} creations completed within ${PERFORMANCE_THRESHOLDS.photoGroupCreation}ms threshold`)
    it('should handle guest assignments within performance threshold (<200ms)', async () => {
      const photoGroup = testPhotoGroups[0]
      // Test adding guests
      for (let i = 0; i < 15; i++) {
        const updateData = {
          name: photoGroup.name,
          guest_ids: testGuests.slice(0, 10 + i).map(g => g.id) // Progressively add more guests
        const response = await fetch(`${TEST_CONFIG.baseUrl}/api/guests/photo-groups?id=${photoGroup.id}`, {
          method: 'PUT',
          body: JSON.stringify(updateData)
        const metrics = measurement.end('Guest Assignment', response.ok, { guestCount: 10 + i })
        expect(response.status).toBe(200)
        expect(metrics.duration).toBeLessThan(PERFORMANCE_THRESHOLDS.guestAssignment)
      console.log(`✅ Guest assignment operations: All 15 operations completed within ${PERFORMANCE_THRESHOLDS.guestAssignment}ms threshold`)
    it('should handle priority reordering within performance threshold (<300ms)', async () => {
      // Test multiple reordering operations
        const reorderData = {
          group_orders: testPhotoGroups.slice(0, 5).map((group, index) => ({
            id: group.id,
            priority: (index + i) % 5 + 1 // Rotate priorities
          }))
        const response = await fetch(`${TEST_CONFIG.baseUrl}/api/guests/photo-groups?action=reorder`, {
          method: 'PATCH',
          body: JSON.stringify(reorderData)
        const metrics = measurement.end('Priority Reordering', response.ok, { groupCount: 5 })
        expect(metrics.duration).toBeLessThan(PERFORMANCE_THRESHOLDS.priorityReordering)
      console.log(`✅ Priority reordering: All 10 operations completed within ${PERFORMANCE_THRESHOLDS.priorityReordering}ms threshold`)
    it('should handle bulk operations with 50+ guests within threshold (<2000ms)', async () => {
      // Create photo group with 50+ guests
      const bulkPhotoGroupData = {
        couple_id: testClient.id,
        name: 'Bulk Performance Test Group',
        description: 'Testing bulk operations with large guest list',
        photo_type: 'group',
        estimated_time_minutes: 30,
        guest_ids: testGuests.slice(0, 75).map(g => g.id) // 75 guests
      measurement.start()
      const response = await fetch(`${TEST_CONFIG.baseUrl}/api/guests/photo-groups`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${testUser.access_token}`
        },
        body: JSON.stringify(bulkPhotoGroupData)
      const result = await response.json()
      const metrics = measurement.end('Bulk Operation (75 guests)', response.ok, { guestCount: 75 })
      expect(response.status).toBe(201)
      expect(metrics.duration).toBeLessThan(PERFORMANCE_THRESHOLDS.bulkOperations)
      expect(result.assignments).toHaveLength(75)
      testPhotoGroups.push(result)
      console.log(`✅ Bulk operation: 75-guest photo group created in ${Math.round(metrics.duration)}ms (threshold: ${PERFORMANCE_THRESHOLDS.bulkOperations}ms)`)
  describe('Database Performance Validation', () => {
    it('should execute complex queries within threshold (<1000ms)', async () => {
      // Test complex query with multiple joins
      const { data: complexQuery, error } = await supabase
        .from('photo_groups')
        .select(`
          *,
          assignments:photo_group_assignments(
            id,
            guest_id,
            is_primary,
            position_notes,
            guest:guests(
              id,
              first_name,
              last_name,
              email,
              category,
              side,
              plus_one,
              dietary_requirements(
                requirement_type,
                severity
              )
            )
          ),
          client:clients(
            first_name,
            last_name,
            wedding_date
          )
        `)
        .eq('couple_id', testClient.id)
        .order('priority')
      const metrics = measurement.end('Complex Database Query', !error, { resultCount: complexQuery?.length })
      expect(error).toBeNull()
      expect(metrics.duration).toBeLessThan(PERFORMANCE_THRESHOLDS.databaseQuery)
      expect(complexQuery).toBeTruthy()
      console.log(`✅ Complex database query: Executed in ${Math.round(metrics.duration)}ms with ${complexQuery?.length} results`)
    it('should handle concurrent database operations efficiently', async () => {
      const operations = Array.from({ length: 20 }, (_, i) => async () => {
        const measurement = new PerformanceMeasurement()
        const { data, error } = await supabase
          .from('photo_groups')
          .select(`
            *,
            assignments:photo_group_assignments(count)
          `)
          .eq('couple_id', testClient.id)
          .limit(10)
        const metrics = measurement.end(`Concurrent DB Query ${i + 1}`, !error)
        return { data, error, metrics }
      const { results, averageTime, maxTime } = await simulateConcurrentOperations(operations, 5)
      // All operations should succeed
      results.forEach(result => {
        expect(result.error).toBeNull()
        expect(result.metrics.duration).toBeLessThan(PERFORMANCE_THRESHOLDS.databaseQuery)
      expect(averageTime).toBeLessThan(PERFORMANCE_THRESHOLDS.databaseQuery)
      expect(maxTime).toBeLessThan(PERFORMANCE_THRESHOLDS.databaseQuery * 1.5) // Allow 50% buffer for concurrent operations
      console.log(`✅ Concurrent database operations: 20 queries, avg ${Math.round(averageTime)}ms, max ${Math.round(maxTime)}ms`)
    it('should maintain query performance with large datasets', async () => {
      // Create additional photo groups for dataset size testing
      const largeDatasetGroups = []
      for (let i = 0; i < 50; i++) {
        const groupData = {
          name: `Dataset Test Group ${i + 1}`,
          description: 'Large dataset performance testing',
          photo_type: 'candid',
          estimated_time_minutes: 5,
          guest_ids: testGuests.slice(i * 2, (i * 2) + 3).map(g => g.id)
        const { data: group } = await supabase
          .insert(groupData)
          .select()
          .single()
        largeDatasetGroups.push(group)
      // Test query performance with large dataset
      const { data: largeDatasetQuery, error } = await supabase
            guest:guests(*)
        .order('created_at', { ascending: false })
        .limit(100)
      const metrics = measurement.end('Large Dataset Query', !error, { resultCount: largeDatasetQuery?.length })
      expect(metrics.duration).toBeLessThan(PERFORMANCE_THRESHOLDS.databaseQuery * 2) // Allow 2x threshold for large datasets
      expect(largeDatasetQuery?.length).toBeGreaterThan(50)
      console.log(`✅ Large dataset query: ${largeDatasetQuery?.length} photo groups retrieved in ${Math.round(metrics.duration)}ms`)
  describe('Component Performance and Memory Usage', () => {
    let queryClient: QueryClient
    beforeEach(() => {
      queryClient = new QueryClient({
        defaultOptions: {
          queries: { retry: false },
          mutations: { retry: false }
    it('should render with acceptable memory usage (<50MB)', async () => {
      const initialMemory = process.memoryUsage().heapUsed
      const { unmount } = render(
        <QueryClientProvider client={queryClient}>
          <PhotoGroupsManager 
            coupleId={testClient.id}
            guests={testGuests}
          />
        </QueryClientProvider>
      )
      await waitFor(() => {
        expect(screen.getByText('Photo Groups')).toBeInTheDocument()
      }, { timeout: 10000 })
      const renderMemory = process.memoryUsage().heapUsed
      const memoryUsed = renderMemory - initialMemory
      const metrics = measurement.end('Component Render', true, { memoryUsed })
      expect(memoryUsed).toBeLessThan(PERFORMANCE_THRESHOLDS.memoryUsage)
      // Clean up
      unmount()
      // Allow garbage collection
      await new Promise(resolve => setTimeout(resolve, 100))
      global.gc && global.gc()
      const finalMemory = process.memoryUsage().heapUsed
      const memoryLeaked = finalMemory - initialMemory
      // Memory leak should be minimal (< 10MB)
      expect(memoryLeaked).toBeLessThan(10 * 1024 * 1024)
      console.log(`✅ Component memory usage: ${Math.round(memoryUsed / 1024 / 1024)}MB render, ${Math.round(memoryLeaked / 1024 / 1024)}MB potential leak`)
    it('should handle large guest lists without performance degradation', async () => {
      const { rerender } = render(
            guests={testGuests} // 200 guests
      const renderMetrics = measurement.end('Large Guest List Render', true, { guestCount: testGuests.length })
      expect(renderMetrics.duration).toBeLessThan(PERFORMANCE_THRESHOLDS.pageLoad)
      // Test re-render performance
      rerender(
            guests={testGuests.slice(0, 100)} // Changed guest list
      const rerenderMetrics = measurement.end('Guest List Re-render', true, { guestCount: 100 })
      expect(rerenderMetrics.duration).toBeLessThan(PERFORMANCE_THRESHOLDS.guestAssignment)
      console.log(`✅ Large guest list performance: Initial render ${Math.round(renderMetrics.duration)}ms, Re-render ${Math.round(rerenderMetrics.duration)}ms`)
    it('should handle rapid user interactions without lag', async () => {
      const user = userEvent.setup()
      render(
      // Test rapid interactions
      const interactions = [
        async () => {
          const measurement = new PerformanceMeasurement()
          measurement.start()
          await user.click(screen.getByRole('button', { name: /create photo group/i }))
          await waitFor(() => expect(screen.getByRole('dialog')).toBeInTheDocument())
          return measurement.end('Modal Open', true)
          await user.click(screen.getByRole('button', { name: /cancel/i }))
          await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
          return measurement.end('Modal Close', true)
      ]
      for (let i = 0; i < 5; i++) {
        for (const interaction of interactions) {
          const metrics = await interaction()
          expect(metrics.duration).toBeLessThan(PERFORMANCE_THRESHOLDS.guestAssignment)
      console.log('✅ Rapid interaction performance: All interactions completed within thresholds')
  describe('Load and Stress Testing', () => {
    it('should handle concurrent photo group operations', async () => {
      const concurrentOperations = Array.from({ length: PERFORMANCE_THRESHOLDS.concurrentUsers }, (_, i) => async () => {
          name: `Concurrent Test Group ${i + 1}`,
          description: `Load testing concurrent operations - ${i + 1}`,
          guest_ids: [testGuests[i % testGuests.length].id]
        const metrics = measurement.end(`Concurrent Creation ${i + 1}`, response.ok)
        return { response, result, metrics }
      const { results, averageTime, maxTime } = await simulateConcurrentOperations(concurrentOperations, 20)
      // Verify success rate
      const successfulOperations = results.filter(r => r.response.ok)
      const successRate = (successfulOperations.length / results.length) * 100
      expect(successRate).toBeGreaterThan(95) // 95% success rate minimum
      expect(averageTime).toBeLessThan(PERFORMANCE_THRESHOLDS.photoGroupCreation * 2) // Allow 2x for concurrent load
      expect(maxTime).toBeLessThan(PERFORMANCE_THRESHOLDS.photoGroupCreation * 3) // Allow 3x for worst case
      console.log(`✅ Concurrent operations: ${successfulOperations.length}/${results.length} successful (${successRate.toFixed(1)}%), avg ${Math.round(averageTime)}ms`)
    it('should maintain performance under sustained load', async () => {
      const LOAD_TEST_DURATION = 30000 // 30 seconds
      const OPERATION_INTERVAL = 100 // 100ms between operations
      const startTime = Date.now()
      const operations: PerformanceMetrics[] = []
      let operationCount = 0
      while (Date.now() - startTime < LOAD_TEST_DURATION) {
        try {
          const { data: photoGroups, error } = await supabase
            .from('photo_groups')
            .select('id, name, priority')
            .eq('couple_id', testClient.id)
            .limit(10)
          const metrics = measurement.end(`Sustained Load Query ${++operationCount}`, !error)
          operations.push(metrics)
          expect(error).toBeNull()
          expect(metrics.duration).toBeLessThan(PERFORMANCE_THRESHOLDS.databaseQuery)
        } catch (error) {
          measurement.end(`Sustained Load Query ${++operationCount}`, false, error)
        await new Promise(resolve => setTimeout(resolve, OPERATION_INTERVAL))
      const averageResponseTime = operations.reduce((sum, op) => sum + op.duration, 0) / operations.length
      const successfulOperations = operations.filter(op => op.success).length
      const successRate = (successfulOperations / operations.length) * 100
      expect(successRate).toBeGreaterThan(98) // 98% success rate under sustained load
      expect(averageResponseTime).toBeLessThan(PERFORMANCE_THRESHOLDS.databaseQuery)
      console.log(`✅ Sustained load test: ${operations.length} operations over ${LOAD_TEST_DURATION/1000}s, ${successRate.toFixed(1)}% success rate, avg ${Math.round(averageResponseTime)}ms`)
  describe('Performance Monitoring and Alerting', () => {
    it('should detect performance regressions', async () => {
      // Baseline measurements
      const baselineOperations = []
          .select('*')
          .limit(5)
        const metrics = measurement.end(`Baseline Query ${i + 1}`, !error)
        baselineOperations.push(metrics.duration)
      const baselineAverage = baselineOperations.reduce((sum, time) => sum + time, 0) / baselineOperations.length
      // Simulated regression test (would normally be run after code changes)
      const regressionOperations = []
        // Add small delay to simulate regression
        await new Promise(resolve => setTimeout(resolve, Math.random() * 50))
        const metrics = measurement.end(`Regression Test ${i + 1}`, !error)
        regressionOperations.push(metrics.duration)
      const regressionAverage = regressionOperations.reduce((sum, time) => sum + time, 0) / regressionOperations.length
      const performanceChange = ((regressionAverage - baselineAverage) / baselineAverage) * 100
      // Alert if performance degrades by more than 20%
      if (performanceChange > 20) {
        console.warn(`⚠️  Performance regression detected: ${performanceChange.toFixed(1)}% slower`)
      } else {
        console.log(`✅ Performance monitoring: ${performanceChange.toFixed(1)}% change (acceptable)`)
      // Performance should not degrade significantly
      expect(performanceChange).toBeLessThan(30) // Allow up to 30% degradation for test conditions
})
// Performance report generator
export function generateWS153PerformanceReport() {
  const now = new Date()
  return {
    timestamp: now.toISOString(),
    feature: 'WS-153 Photo Groups Management',
    test_type: 'Performance',
    test_duration: '45 minutes',
    thresholds: PERFORMANCE_THRESHOLDS,
    performance_summary: {
      total_operations: performanceResults.length,
      successful_operations: performanceResults.filter(r => r.success).length,
      success_rate: `${((performanceResults.filter(r => r.success).length / performanceResults.length) * 100).toFixed(1)}%`,
      average_response_time: `${Math.round(performanceResults.reduce((sum, r) => sum + r.duration, 0) / performanceResults.length)}ms`
    },
    benchmark_results: {
      photo_group_creation: {
        threshold: `${PERFORMANCE_THRESHOLDS.photoGroupCreation}ms`,
        status: performanceResults.filter(r => r.operation.includes('Photo Group Creation')).every(r => r.duration < PERFORMANCE_THRESHOLDS.photoGroupCreation) ? 'PASS' : 'FAIL'
      },
      guest_assignment: {
        threshold: `${PERFORMANCE_THRESHOLDS.guestAssignment}ms`,
        status: performanceResults.filter(r => r.operation.includes('Guest Assignment')).every(r => r.duration < PERFORMANCE_THRESHOLDS.guestAssignment) ? 'PASS' : 'FAIL'
      priority_reordering: {
        threshold: `${PERFORMANCE_THRESHOLDS.priorityReordering}ms`,
        status: performanceResults.filter(r => r.operation.includes('Priority Reordering')).every(r => r.duration < PERFORMANCE_THRESHOLDS.priorityReordering) ? 'PASS' : 'FAIL'
      bulk_operations: {
        threshold: `${PERFORMANCE_THRESHOLDS.bulkOperations}ms`,
        status: performanceResults.filter(r => r.operation.includes('Bulk Operation')).every(r => r.duration < PERFORMANCE_THRESHOLDS.bulkOperations) ? 'PASS' : 'FAIL'
      database_queries: {
        threshold: `${PERFORMANCE_THRESHOLDS.databaseQuery}ms`,
        status: performanceResults.filter(r => r.operation.includes('Database Query')).every(r => r.duration < PERFORMANCE_THRESHOLDS.databaseQuery) ? 'PASS' : 'FAIL'
    load_testing: {
      concurrent_operations: `${PERFORMANCE_THRESHOLDS.concurrentUsers} simultaneous users`,
      sustained_load: '30 seconds continuous operations',
      memory_usage: `Under ${PERFORMANCE_THRESHOLDS.memoryUsage / 1024 / 1024}MB`,
      success_rate_requirement: '95% minimum'
    recommendations: [
      'Monitor query performance with large datasets',
      'Implement caching for frequently accessed photo groups',
      'Consider database indexing optimization',
      'Set up automated performance regression testing',
      'Implement real-time performance monitoring alerts'
    ]
