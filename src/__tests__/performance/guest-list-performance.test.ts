/**
 * Performance Tests for Guest List Builder with Large Datasets
 * Team E - Batch 13 - WS-151 Guest List Builder Performance Testing
 * 
 * Testing Requirements:
 * - 500+ guest handling performance
 * - Memory usage optimization
 * - Rendering performance
 * - Search and filter performance
 * - Bulk operations performance
 * - Virtual scrolling validation
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll, Mock } from 'vitest';
import { createClient } from '@supabase/supabase-js'
import { Database } from '@/types/database'
import Papa from 'papaparse'
// Performance test configuration
const TEST_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const TEST_SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
// Performance thresholds
const PERFORMANCE_THRESHOLDS = {
  GUEST_LIST_LOAD_TIME: 2000, // 2 seconds
  SEARCH_RESPONSE_TIME: 500, // 0.5 seconds
  FILTER_RESPONSE_TIME: 300, // 0.3 seconds
  BULK_OPERATION_TIME: 5000, // 5 seconds for 100 guests
  IMPORT_TIME_PER_GUEST: 50, // 50ms per guest max
  MEMORY_USAGE_MB: 100, // 100MB max for 1000 guests
  VIRTUAL_SCROLL_RENDER_TIME: 100 // 100ms for viewport rendering
}
// Test data
let supabase: ReturnType<typeof createClient<Database>>
let testUser: any
let testClient: any
let performanceResults: any = {}
describe('Guest List Performance Tests (500+ Guests)', () => {
  beforeAll(async () => {
    supabase = createClient<Database>(TEST_SUPABASE_URL, TEST_SUPABASE_ANON_KEY)
    
    // Create test user and client
    const { data: { user }, error: authError } = await supabase.auth.signUp({
      email: `perf-test-${Date.now()}@example.com`,
      password: 'testpassword123',
    })
    expect(authError).toBeNull()
    expect(user).toBeTruthy()
    testUser = user
    // Create test client
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .insert({
        first_name: 'Performance',
        last_name: 'TestCouple',
        email: testUser.email,
        wedding_date: '2025-12-31'
      })
      .select()
      .single()
    expect(clientError).toBeNull()
    expect(client).toBeTruthy()
    testClient = client
  })
  afterAll(async () => {
    // Cleanup
    if (testClient) {
      await supabase.from('guests').delete().eq('couple_id', testClient.id)
      await supabase.from('clients').delete().eq('id', testClient.id)
    }
    if (testUser) {
      await supabase.auth.signOut()
    // Log performance results
    console.log('\n=== PERFORMANCE TEST RESULTS ===')
    console.log(JSON.stringify(performanceResults, null, 2))
  describe('Large Dataset Creation and Validation', () => {
    it('should create 1000 test guests within acceptable time', async () => {
      const guestCount = 1000
      const startTime = Date.now()
      // Generate large guest dataset
      const guests = Array.from({ length: guestCount }, (_, i) => ({
        couple_id: testClient.id,
        first_name: `Guest${i + 1}`,
        last_name: `Test${Math.floor(i / 10) + 1}`,
        email: `guest${i + 1}@example.com`,
        phone: `555-${String(i + 1000).padStart(4, '0')}`,
        category: ['family', 'friends', 'work', 'other'][i % 4],
        side: ['partner1', 'partner2', 'mutual'][i % 3],
        plus_one: i % 5 === 0,
        plus_one_name: i % 5 === 0 ? `Plus${i + 1}` : null,
        dietary_restrictions: i % 10 === 0 ? 'Vegetarian' : null,
        table_number: i % 20 === 0 ? Math.floor(i / 20) + 1 : null,
        notes: i % 50 === 0 ? `Important note for guest ${i + 1}` : null,
        rsvp_status: ['pending', 'yes', 'no', 'maybe'][i % 4],
        age_group: i % 15 === 0 ? 'child' : 'adult',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }))
      // Insert in batches for better performance
      const batchSize = 100
      const batches = []
      for (let i = 0; i < guests.length; i += batchSize) {
        batches.push(guests.slice(i, i + batchSize))
      }
      let totalInserted = 0
      for (const batch of batches) {
        const { data, error } = await supabase
          .from('guests')
          .insert(batch)
          .select('id')
        expect(error).toBeNull()
        totalInserted += data?.length || 0
      const creationTime = Date.now() - startTime
      
      expect(totalInserted).toBe(guestCount)
      expect(creationTime).toBeLessThan(60000) // Under 60 seconds
      performanceResults.dataCreation = {
        guestCount,
        creationTimeMs: creationTime,
        creationTimePerGuest: creationTime / guestCount,
        passed: creationTime < 60000
      console.log(`✅ Created ${guestCount} guests in ${creationTime}ms (${(creationTime / guestCount).toFixed(2)}ms per guest)`)
    it('should verify dataset integrity after bulk creation', async () => {
      const { data: allGuests, error } = await supabase
        .from('guests')
        .select('*')
        .eq('couple_id', testClient.id)
      expect(error).toBeNull()
      expect(allGuests?.length).toBe(1000)
      // Verify data distribution
      const categories = allGuests?.reduce((acc, guest) => {
        acc[guest.category] = (acc[guest.category] || 0) + 1
        return acc
      }, {})
      expect(categories.family).toBe(250)
      expect(categories.friends).toBe(250)
      expect(categories.work).toBe(250)
      expect(categories.other).toBe(250)
      const sidesDistribution = allGuests?.reduce((acc, guest) => {
        acc[guest.side] = (acc[guest.side] || 0) + 1
      expect(sidesDistribution.partner1).toBeGreaterThan(300)
      expect(sidesDistribution.partner2).toBeGreaterThan(300)
      expect(sidesDistribution.mutual).toBeGreaterThan(300)
  describe('Guest List Loading Performance', () => {
    it('should load 1000 guests within performance threshold', async () => {
      const { data: guests, error } = await supabase
        .order('last_name', { ascending: true })
      const loadTime = Date.now() - startTime
      expect(guests?.length).toBe(1000)
      expect(loadTime).toBeLessThan(PERFORMANCE_THRESHOLDS.GUEST_LIST_LOAD_TIME)
      performanceResults.guestListLoad = {
        guestCount: guests?.length,
        loadTimeMs: loadTime,
        threshold: PERFORMANCE_THRESHOLDS.GUEST_LIST_LOAD_TIME,
        passed: loadTime < PERFORMANCE_THRESHOLDS.GUEST_LIST_LOAD_TIME
      console.log(`✅ Loaded ${guests?.length} guests in ${loadTime}ms`)
    it('should load guests with complex joins within threshold', async () => {
      const { data: guestsWithRelations, error } = await supabase
        .select(`
          *,
          dietary_requirements(*),
          photo_group_assignments(
            photo_group:photo_groups(*)
          )
        `)
        .limit(500) // Test with subset for complex joins
      const complexLoadTime = Date.now() - startTime
      expect(complexLoadTime).toBeLessThan(PERFORMANCE_THRESHOLDS.GUEST_LIST_LOAD_TIME * 2)
      performanceResults.complexGuestListLoad = {
        guestCount: guestsWithRelations?.length,
        loadTimeMs: complexLoadTime,
        threshold: PERFORMANCE_THRESHOLDS.GUEST_LIST_LOAD_TIME * 2,
        passed: complexLoadTime < PERFORMANCE_THRESHOLDS.GUEST_LIST_LOAD_TIME * 2
      console.log(`✅ Loaded ${guestsWithRelations?.length} guests with relations in ${complexLoadTime}ms`)
  describe('Search Performance', () => {
    it('should search guests by name within performance threshold', async () => {
      const searchQueries = ['Guest1', 'Test5', 'example.com', '555-1234']
      const searchResults = []
      for (const query of searchQueries) {
        const startTime = Date.now()
        const { data: searchResults: results, error } = await supabase
          .select('*')
          .eq('couple_id', testClient.id)
          .or(`first_name.ilike.%${query}%,last_name.ilike.%${query}%,email.ilike.%${query}%,phone.ilike.%${query}%`)
        const searchTime = Date.now() - startTime
        expect(searchTime).toBeLessThan(PERFORMANCE_THRESHOLDS.SEARCH_RESPONSE_TIME)
        searchResults.push({
          query,
          resultCount: results?.length || 0,
          searchTimeMs: searchTime,
          passed: searchTime < PERFORMANCE_THRESHOLDS.SEARCH_RESPONSE_TIME
        })
      performanceResults.searchPerformance = searchResults
      const avgSearchTime = searchResults.reduce((sum, result) => sum + result.searchTimeMs, 0) / searchResults.length
      console.log(`✅ Average search time: ${avgSearchTime.toFixed(2)}ms across ${searchQueries.length} queries`)
    it('should handle fuzzy search efficiently', async () => {
      const fuzzyQueries = ['Gues', 'Test', '@example', '555-']
      const fuzzyResults = []
      for (const query of fuzzyQueries) {
        // Simulate fuzzy search with ILIKE patterns
        const { data: results, error } = await supabase
          .or(`first_name.ilike.%${query}%,last_name.ilike.%${query}%,email.ilike.%${query}%`)
          .limit(50)
        const fuzzyTime = Date.now() - startTime
        expect(fuzzyTime).toBeLessThan(PERFORMANCE_THRESHOLDS.SEARCH_RESPONSE_TIME)
        fuzzyResults.push({
          searchTimeMs: fuzzyTime
      performanceResults.fuzzySearchPerformance = fuzzyResults
  describe('Filter Performance', () => {
    it('should filter by category within threshold', async () => {
      const categories = ['family', 'friends', 'work', 'other']
      const filterResults = []
      for (const category of categories) {
        const { data: filtered, error } = await supabase
          .eq('category', category)
        const filterTime = Date.now() - startTime
        expect(filterTime).toBeLessThan(PERFORMANCE_THRESHOLDS.FILTER_RESPONSE_TIME)
        expect(filtered?.length).toBe(250) // Each category should have 250 guests
        filterResults.push({
          category,
          resultCount: filtered?.length || 0,
          filterTimeMs: filterTime,
          passed: filterTime < PERFORMANCE_THRESHOLDS.FILTER_RESPONSE_TIME
      performanceResults.categoryFilterPerformance = filterResults
    it('should handle complex multi-filter queries', async () => {
      const { data: complexFiltered, error } = await supabase
        .eq('category', 'family')
        .eq('side', 'partner1')
        .eq('rsvp_status', 'yes')
        .not('plus_one', 'is', null)
      const complexFilterTime = Date.now() - startTime
      expect(complexFilterTime).toBeLessThan(PERFORMANCE_THRESHOLDS.FILTER_RESPONSE_TIME * 2)
      performanceResults.complexFilterPerformance = {
        resultCount: complexFiltered?.length || 0,
        filterTimeMs: complexFilterTime,
        threshold: PERFORMANCE_THRESHOLDS.FILTER_RESPONSE_TIME * 2,
        passed: complexFilterTime < PERFORMANCE_THRESHOLDS.FILTER_RESPONSE_TIME * 2
      console.log(`✅ Complex filter query returned ${complexFiltered?.length} results in ${complexFilterTime}ms`)
  describe('Bulk Operations Performance', () => {
    it('should perform bulk category update within threshold', async () => {
      // Get first 100 guests for bulk update
      const { data: guestsToUpdate } = await supabase
        .select('id')
        .limit(100)
      const guestIds = guestsToUpdate?.map(g => g.id) || []
      const { error } = await supabase
        .update({ category: 'friends' })
        .in('id', guestIds)
      const bulkUpdateTime = Date.now() - startTime
      expect(bulkUpdateTime).toBeLessThan(PERFORMANCE_THRESHOLDS.BULK_OPERATION_TIME)
      performanceResults.bulkCategoryUpdate = {
        guestCount: guestIds.length,
        updateTimeMs: bulkUpdateTime,
        timePerGuest: bulkUpdateTime / guestIds.length,
        threshold: PERFORMANCE_THRESHOLDS.BULK_OPERATION_TIME,
        passed: bulkUpdateTime < PERFORMANCE_THRESHOLDS.BULK_OPERATION_TIME
      console.log(`✅ Bulk updated ${guestIds.length} guests in ${bulkUpdateTime}ms (${(bulkUpdateTime / guestIds.length).toFixed(2)}ms per guest)`)
    it('should perform bulk RSVP status update efficiently', async () => {
      const { data: pendingGuests } = await supabase
        .eq('rsvp_status', 'pending')
        .limit(150)
      const guestIds = pendingGuests?.map(g => g.id) || []
        .update({ rsvp_status: 'yes' })
      const bulkRsvpTime = Date.now() - startTime
      expect(bulkRsvpTime).toBeLessThan(PERFORMANCE_THRESHOLDS.BULK_OPERATION_TIME)
      performanceResults.bulkRsvpUpdate = {
        updateTimeMs: bulkRsvpTime,
        timePerGuest: bulkRsvpTime / guestIds.length
    it('should handle bulk table assignments', async () => {
      const { data: unassignedGuests } = await supabase
        .is('table_number', null)
        .limit(80)
      const guestIds = unassignedGuests?.map(g => g.id) || []
      // Assign guests to tables (10 guests per table)
      const tableAssignments = guestIds.map((id, index) => ({
        id,
        table_number: Math.floor(index / 10) + 1
      // Update in batches
      const updates = []
      for (const assignment of tableAssignments) {
        updates.push(
          supabase
            .from('guests')
            .update({ table_number: assignment.table_number })
            .eq('id', assignment.id)
        )
      await Promise.all(updates)
      const bulkTableTime = Date.now() - startTime
      expect(bulkTableTime).toBeLessThan(PERFORMANCE_THRESHOLDS.BULK_OPERATION_TIME * 2)
      performanceResults.bulkTableAssignment = {
        assignmentTimeMs: bulkTableTime,
        timePerGuest: bulkTableTime / guestIds.length
  describe('Import Performance', () => {
    it('should import 500 guests within acceptable time', async () => {
      const importGuestCount = 500
      const importGuests = Array.from({ length: importGuestCount }, (_, i) => ({
        'First Name': `ImportGuest${i + 1}`,
        'Last Name': `ImportTest${i + 1}`,
        'Email': `import${i + 1}@example.com`,
        'Phone': `555-${String(i + 2000).padStart(4, '0')}`,
        'Category': ['family', 'friends', 'work', 'other'][i % 4],
        'Side': ['partner1', 'partner2', 'mutual'][i % 3],
        'Plus One': i % 4 === 0 ? 'Yes' : 'No'
      const csvContent = Papa.unparse(importGuests)
      // Simulate import process timing
      // Parse CSV (simulated)
      const parseStartTime = Date.now()
      Papa.parse(csvContent, {
        header: true,
        complete: () => {}
      const parseTime = Date.now() - parseStartTime
      // Batch import processing
      const batchSize = 50
      const importBatches = []
      for (let i = 0; i < importGuests.length; i += batchSize) {
        importBatches.push(importGuests.slice(i, i + batchSize))
      let importedCount = 0
      for (const batch of importBatches) {
        const batchStartTime = Date.now()
        
        const guestsToInsert = batch.map(guest => ({
          couple_id: testClient.id,
          first_name: guest['First Name'],
          last_name: guest['Last Name'],
          email: guest['Email'],
          phone: guest['Phone'],
          category: guest['Category'].toLowerCase(),
          side: guest['Side'].toLowerCase(),
          plus_one: guest['Plus One'] === 'Yes'
        }))
          .insert(guestsToInsert)
        importedCount += data?.length || 0
        const batchTime = Date.now() - batchStartTime
        expect(batchTime).toBeLessThan(2000) // Each batch under 2 seconds
      const totalImportTime = Date.now() - startTime
      const timePerGuest = totalImportTime / importGuestCount
      expect(importedCount).toBe(importGuestCount)
      expect(timePerGuest).toBeLessThan(PERFORMANCE_THRESHOLDS.IMPORT_TIME_PER_GUEST)
      performanceResults.importPerformance = {
        guestCount: importGuestCount,
        totalImportTimeMs: totalImportTime,
        parseTimeMs: parseTime,
        timePerGuest,
        batchCount: importBatches.length,
        batchSize,
        threshold: PERFORMANCE_THRESHOLDS.IMPORT_TIME_PER_GUEST,
        passed: timePerGuest < PERFORMANCE_THRESHOLDS.IMPORT_TIME_PER_GUEST
      console.log(`✅ Imported ${importedCount} guests in ${totalImportTime}ms (${timePerGuest.toFixed(2)}ms per guest)`)
  describe('Memory and Resource Usage', () => {
    it('should maintain reasonable memory usage during large operations', async () => {
      // Monitor memory before large operation
      const initialMemory = process.memoryUsage()
      // Perform memory-intensive operation
      const { data: allGuests } = await supabase
      // Process data in memory
      const processedGuests = allGuests?.map(guest => ({
        ...guest,
        fullName: `${guest.first_name} ${guest.last_name}`,
        hasSpecialRequirements: guest.dietary_restrictions || guest.plus_one,
        categoryIcon: guest.category === 'family' ? '👨‍👩‍👧‍👦' : '👥'
      const finalMemory = process.memoryUsage()
      const memoryDiff = (finalMemory.heapUsed - initialMemory.heapUsed) / 1024 / 1024 // MB
      expect(memoryDiff).toBeLessThan(PERFORMANCE_THRESHOLDS.MEMORY_USAGE_MB)
      performanceResults.memoryUsage = {
        guestCount: allGuests?.length,
        initialHeapMB: Math.round(initialMemory.heapUsed / 1024 / 1024),
        finalHeapMB: Math.round(finalMemory.heapUsed / 1024 / 1024),
        memoryDiffMB: Math.round(memoryDiff),
        threshold: PERFORMANCE_THRESHOLDS.MEMORY_USAGE_MB,
        passed: memoryDiff < PERFORMANCE_THRESHOLDS.MEMORY_USAGE_MB
      console.log(`✅ Memory usage: ${Math.round(memoryDiff)}MB for ${allGuests?.length} guests`)
  describe('Pagination and Virtual Scrolling Performance', () => {
    it('should handle paginated guest loading efficiently', async () => {
      const pageSize = 50
      const pageLoadTimes = []
      for (let page = 0; page < 10; page++) {
        const { data: pagedGuests, error } = await supabase
          .range(page * pageSize, (page + 1) * pageSize - 1)
          .order('last_name')
        const pageLoadTime = Date.now() - startTime
        expect(pagedGuests?.length).toBeLessThanOrEqual(pageSize)
        expect(pageLoadTime).toBeLessThan(500) // Each page under 500ms
        pageLoadTimes.push(pageLoadTime)
      const avgPageLoadTime = pageLoadTimes.reduce((sum, time) => sum + time, 0) / pageLoadTimes.length
      performanceResults.paginationPerformance = {
        pageSize,
        pagesLoaded: pageLoadTimes.length,
        avgPageLoadTimeMs: Math.round(avgPageLoadTime),
        maxPageLoadTimeMs: Math.max(...pageLoadTimes),
        allPagesUnderThreshold: pageLoadTimes.every(time => time < 500)
      console.log(`✅ Average page load time: ${Math.round(avgPageLoadTime)}ms for ${pageSize} guests per page`)
    it('should simulate virtual scrolling performance', async () => {
      // Simulate virtual scrolling by loading guests in chunks
      const viewportSize = 20 // Guests visible in viewport
      const totalGuests = 1000
      const scrollPositions = [0, 100, 250, 500, 750, 900] // Simulate different scroll positions
      const virtualScrollResults = []
      for (const scrollPosition of scrollPositions) {
        // Calculate which guests should be visible in viewport
        const startIndex = Math.max(0, scrollPosition - 5) // Buffer above
        const endIndex = Math.min(totalGuests, scrollPosition + viewportSize + 5) // Buffer below
        const { data: viewportGuests, error } = await supabase
          .range(startIndex, endIndex)
        const renderTime = Date.now() - startTime
        expect(renderTime).toBeLessThan(PERFORMANCE_THRESHOLDS.VIRTUAL_SCROLL_RENDER_TIME)
        virtualScrollResults.push({
          scrollPosition,
          startIndex,
          endIndex,
          guestsLoaded: viewportGuests?.length || 0,
          renderTimeMs: renderTime,
          passed: renderTime < PERFORMANCE_THRESHOLDS.VIRTUAL_SCROLL_RENDER_TIME
      performanceResults.virtualScrollPerformance = virtualScrollResults
      const avgRenderTime = virtualScrollResults.reduce((sum, result) => sum + result.renderTimeMs, 0) / virtualScrollResults.length
      console.log(`✅ Virtual scroll average render time: ${avgRenderTime.toFixed(2)}ms`)
  describe('Stress Testing', () => {
    it('should handle concurrent read operations', async () => {
      const concurrentRequests = 20
      const requests = Array.from({ length: concurrentRequests }, () =>
        supabase
          .limit(100)
      )
      const results = await Promise.allSettled(requests)
      const concurrentTime = Date.now() - startTime
      const successfulRequests = results.filter(r => r.status === 'fulfilled').length
      expect(successfulRequests).toBe(concurrentRequests)
      expect(concurrentTime).toBeLessThan(5000) // All requests under 5 seconds
      performanceResults.concurrentReadStress = {
        concurrentRequests,
        successfulRequests,
        totalTimeMs: concurrentTime,
        avgTimePerRequest: concurrentTime / concurrentRequests
    it('should maintain performance under sustained load', async () => {
      const sustainedOperations = []
      const operationCount = 50
      // Perform various operations continuously
      for (let i = 0; i < operationCount; i++) {
        const operationType = i % 4
        let operationPromise
        switch (operationType) {
          case 0: // Read operation
            operationPromise = supabase
              .from('guests')
              .select('*')
              .eq('couple_id', testClient.id)
              .limit(10)
            break
          case 1: // Search operation
              .ilike('first_name', `%Guest${i}%`)
          case 2: // Filter operation
              .eq('category', ['family', 'friends', 'work', 'other'][i % 4])
              .limit(20)
          case 3: // Count operation
              .select('*', { count: 'exact', head: true })
              .eq('rsvp_status', ['yes', 'no', 'pending'][i % 3])
        }
        sustainedOperations.push(operationPromise)
      const results = await Promise.allSettled(sustainedOperations)
      const sustainedTime = Date.now() - startTime
      const successfulOps = results.filter(r => r.status === 'fulfilled').length
      expect(successfulOps).toBeGreaterThan(operationCount * 0.95) // 95% success rate minimum
      performanceResults.sustainedLoadTest = {
        totalOperations: operationCount,
        successfulOperations: successfulOps,
        totalTimeMs: sustainedTime,
        avgTimePerOperation: sustainedTime / operationCount,
        successRate: (successfulOps / operationCount) * 100
      console.log(`✅ Sustained load: ${successfulOps}/${operationCount} operations in ${sustainedTime}ms`)
})
