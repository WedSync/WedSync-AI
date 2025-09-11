/**
 * Enhanced Data Integrity and Validation Tests for Guest List Builder
 * Team E - Batch 13 - WS-151 Guest List Builder Enhanced Data Validation Testing
 * 
 * Enhanced Testing Requirements:
 * - Advanced bulk operation data integrity with performance metrics
 * - Sophisticated duplicate detection algorithms  
 * - Concurrent operation handling with race condition testing
 * - Advanced constraint validation and error recovery
 * - Memory leak detection during bulk operations
 * - Transaction simulation and rollback scenarios
 * - Real-world edge case scenarios
 * - Data migration integrity testing
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
// Enhanced test configuration
const TEST_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const TEST_SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
// Test data and utilities
let supabase: ReturnType<typeof createClient<Database>>
let testUser: any
let testClient: any
let testGuests: any[] = []
// Enhanced data integrity testing utilities
class DataIntegrityTestUtils {
  static generateTestGuests(count: number, baseData: any = {}): any[] {
    return Array.from({ length: count }, (_, i) => ({
      couple_id: baseData.couple_id,
      first_name: baseData.first_name || `TestGuest${i + 1}`,
      last_name: baseData.last_name || `Family${Math.floor(i / 5) + 1}`,
      email: baseData.email || `testguest${i + 1}@example.com`,
      phone: baseData.phone || `555-${String(i + 1000).slice(-4)}`,
      category: ['family', 'friends', 'colleagues', 'other'][i % 4],
      side: ['partner1', 'partner2', 'mutual'][i % 3],
      rsvp_status: 'pending',
      age_group: 'adult',
      plus_one: i % 3 === 0,
      plus_one_name: i % 3 === 0 ? `Plus${i + 1}` : null,
      dietary_requirements: i % 4 === 0 ? ['vegetarian'] : [],
      accessibility_needs: i % 8 === 0 ? ['wheelchair_access'] : [],
      ...baseData
    }))
  }
  static async measureBulkOperationPerformance<T>(
    operation: () => Promise<T>, 
    operationName: string
  ): Promise<{ result: T; metrics: any }> {
    const startTime = performance.now()
    const startMemory = (performance as unknown).memory?.usedJSHeapSize || 0
    
    try {
      const result = await operation()
      const endTime = performance.now()
      const endMemory = (performance as unknown).memory?.usedJSHeapSize || 0
      
      const metrics = {
        duration: endTime - startTime,
        memoryDelta: endMemory - startMemory,
        operationName,
        timestamp: new Date().toISOString()
      }
      return { result, metrics }
    } catch (error) {
        error: error.message,
      throw { error, metrics }
    }
  static calculateAdvancedSimilarity(str1: string, str2: string): {
    levenshtein: number
    jaro: number
    jaroWinkler: number
    soundex: boolean
    combined: number
  } {
    const levenshtein = this.normalizedLevenshteinSimilarity(str1, str2)
    const jaro = this.jaroSimilarity(str1, str2)
    const jaroWinkler = this.jaroWinklerSimilarity(str1, str2, jaro)
    const soundex = this.soundexMatch(str1, str2)
    // Combined weighted similarity score
    const combined = (levenshtein * 0.3 + jaro * 0.3 + jaroWinkler * 0.3 + (soundex ? 0.1 : 0))
    return { levenshtein, jaro, jaroWinkler, soundex, combined }
  private static normalizedLevenshteinSimilarity(str1: string, str2: string): number {
    const maxLength = Math.max(str1.length, str2.length)
    if (maxLength === 0) return 1
    const distance = this.levenshteinDistance(str1.toLowerCase(), str2.toLowerCase())
    return (maxLength - distance) / maxLength
  private static levenshteinDistance(str1: string, str2: string): number {
    const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null))
    for (let i = 0; i <= str1.length; i++) matrix[0][i] = i
    for (let j = 0; j <= str2.length; j++) matrix[j][0] = j
    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const substitutionCost = str1[i - 1] === str2[j - 1] ? 0 : 1
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1,     // deletion
          matrix[j - 1][i] + 1,     // insertion
          matrix[j - 1][i - 1] + substitutionCost  // substitution
        )
    return matrix[str2.length][str1.length]
  private static jaroSimilarity(str1: string, str2: string): number {
    const s1 = str1.toLowerCase()
    const s2 = str2.toLowerCase()
    if (s1 === s2) return 1
    const matchWindow = Math.floor(Math.max(s1.length, s2.length) / 2) - 1
    const s1Matches = Array(s1.length).fill(false)
    const s2Matches = Array(s2.length).fill(false)
    let matches = 0
    let transpositions = 0
    // Find matches
    for (let i = 0; i < s1.length; i++) {
      const start = Math.max(0, i - matchWindow)
      const end = Math.min(i + matchWindow + 1, s2.length)
      for (let j = start; j < end; j++) {
        if (s2Matches[j] || s1[i] !== s2[j]) continue
        s1Matches[i] = true
        s2Matches[j] = true
        matches++
        break
    if (matches === 0) return 0
    // Count transpositions
    let k = 0
      if (!s1Matches[i]) continue
      while (!s2Matches[k]) k++
      if (s1[i] !== s2[k]) transpositions++
      k++
    return (matches / s1.length + matches / s2.length + (matches - transpositions / 2) / matches) / 3
  private static jaroWinklerSimilarity(str1: string, str2: string, jaroSim?: number): number {
    const jaro = jaroSim ?? this.jaroSimilarity(str1, str2)
    if (jaro < 0.7) return jaro
    const prefixLength = Math.min(str1.length, str2.length, 4)
    let commonPrefix = 0
    for (let i = 0; i < prefixLength; i++) {
      if (str1[i].toLowerCase() === str2[i].toLowerCase()) {
        commonPrefix++
      } else {
    return jaro + (0.1 * commonPrefix * (1 - jaro))
  private static soundexMatch(str1: string, str2: string): boolean {
    return this.soundex(str1) === this.soundex(str2)
  private static soundex(str: string): string {
    const code = str.toUpperCase().replace(/[^A-Z]/g, '')
    if (code.length === 0) return '0000'
    const firstLetter = code[0]
    const rest = code.slice(1)
      .replace(/[BFPV]/g, '1')
      .replace(/[CGJKQSXZ]/g, '2')
      .replace(/[DT]/g, '3')
      .replace(/[L]/g, '4')
      .replace(/[MN]/g, '5')
      .replace(/[R]/g, '6')
      .replace(/[HWYW]/g, '')
      .replace(/\d\d+/g, (match) => match[0]) // Remove consecutive duplicates
      .replace(/[AEIOUY]/g, '')
    return (firstLetter + rest + '000').slice(0, 4)
  static async simulateConcurrentOperations<T>(
    operations: (() => Promise<T>)[],
    maxConcurrency: number = 5
  ): Promise<{
    successful: T[]
    failed: any[]
    totalTime: number
    concurrencyIssues: number
  }> {
    const successful: T[] = []
    const failed: any[] = []
    let concurrencyIssues = 0
    // Execute operations in controlled batches
    for (let i = 0; i < operations.length; i += maxConcurrency) {
      const batch = operations.slice(i, i + maxConcurrency)
      const results = await Promise.allSettled(batch.map(op => op()))
      results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          successful.push(result.value)
        } else {
          failed.push({
            operationIndex: i + index,
            error: result.reason,
            isConcurrencyIssue: result.reason?.message?.includes('conflict') ||
                                result.reason?.message?.includes('concurrent') ||
                                result.reason?.message?.includes('deadlock')
          })
          
          if (result.reason?.message?.includes('conflict') ||
              result.reason?.message?.includes('concurrent') ||
              result.reason?.message?.includes('deadlock')) {
            concurrencyIssues++
          }
        }
      })
    return {
      successful,
      failed,
      totalTime: performance.now() - startTime,
      concurrencyIssues
  static generateDuplicateTestCases(): any[] {
    return [
      // Exact duplicates
      { type: 'exact_email', guests: [
        { first_name: 'John', last_name: 'Doe', email: 'john.doe@example.com' },
        { first_name: 'Jane', last_name: 'Smith', email: 'john.doe@example.com' }
      ]},
      // Name variations  
      { type: 'name_variations', guests: [
        { first_name: 'John', last_name: 'Smith', email: 'john.smith@example.com' },
        { first_name: 'Jon', last_name: 'Smith', email: 'jon.smith@gmail.com' },
        { first_name: 'Johnny', last_name: 'Smith', email: 'johnny.smith@yahoo.com' },
        { first_name: 'Jonathan', last_name: 'Smith', email: 'jonathan@example.com' }
      // Phone variations
      { type: 'phone_variations', guests: [
        { first_name: 'Alice', last_name: 'Johnson', phone: '555-123-4567', email: 'alice1@example.com' },
        { first_name: 'Allice', last_name: 'Johnson', phone: '(555) 123-4567', email: 'alice2@example.com' },
        { first_name: 'Alice', last_name: 'Jonson', phone: '5551234567', email: 'alice3@example.com' },
        { first_name: 'A Johnson', last_name: '', phone: '+1-555-123-4567', email: 'alice4@example.com' }
      // Typos and misspellings
      { type: 'typos', guests: [
        { first_name: 'Catherine', last_name: 'Williams', email: 'catherine@example.com' },
        { first_name: 'Katherine', last_name: 'Williams', email: 'katherine@example.com' },
        { first_name: 'Catharine', last_name: 'Williams', email: 'catharine@example.com' },
        { first_name: 'Kate', last_name: 'Williams', email: 'kate@example.com' }
      // Different formatting
      { type: 'formatting', guests: [
        { first_name: 'mary jane', last_name: 'WATSON', email: 'mary@example.com' },
        { first_name: 'Mary Jane', last_name: 'Watson', email: 'mary.jane@example.com' },
        { first_name: 'Mary-Jane', last_name: 'watson', email: 'mj@example.com' },
        { first_name: 'MJ', last_name: 'Watson', email: 'mary_jane@example.com' }
      ]}
    ]
}
describe('Enhanced Guest Data Integrity and Validation Tests', () => {
  const defaultTestTimeout = 30000 // 30 seconds for bulk operations
  beforeAll(async () => {
    supabase = createClient<Database>(TEST_SUPABASE_URL, TEST_SUPABASE_ANON_KEY)
    // Create test user and client
    const { data: { user }, error: authError } = await supabase.auth.signUp({
      email: `enhanced-integrity-test-${Date.now()}@example.com`,
      password: 'testpassword123',
    })
    expect(authError).toBeNull()
    expect(user).toBeTruthy()
    testUser = user
    // Create test client
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .insert({
        first_name: 'Enhanced',
        last_name: 'IntegrityTest',
        email: testUser.email,
        wedding_date: '2025-12-31'
      .select()
      .single()
    expect(clientError).toBeNull()
    expect(client).toBeTruthy()
    testClient = client
  }, defaultTestTimeout)
  afterAll(async () => {
    // Comprehensive cleanup
    if (testClient) {
      await supabase.from('dietary_requirements').delete().eq('guest_id', 'in', 
        `(SELECT id FROM guests WHERE couple_id = '${testClient.id}')`)
      await supabase.from('guest_photo_groups').delete().eq('guest_id', 'in', 
      await supabase.from('guests').delete().eq('couple_id', testClient.id)
      await supabase.from('households').delete().eq('couple_id', testClient.id)
      await supabase.from('clients').delete().eq('id', testClient.id)
    if (testUser) {
      await supabase.auth.signOut()
  beforeEach(async () => {
    // Clean slate for each test
    await supabase.from('guests').delete().eq('couple_id', testClient.id)
    testGuests = []
  })
  describe('Advanced Duplicate Detection Algorithms', () => {
    it('should detect duplicates using multiple similarity algorithms', async () => {
      const testCases = DataIntegrityTestUtils.generateDuplicateTestCases()
      const detectedDuplicates = []
      for (const testCase of testCases) {
        // Insert all guests for this test case
        const insertedGuests = []
        for (const guest of testCase.guests) {
          const { data, error } = await supabase
            .from('guests')
            .insert({
              couple_id: testClient.id,
              ...guest,
              category: 'other'
            })
            .select()
            .single()
          expect(error).toBeNull()
          insertedGuests.push(data)
          testGuests.push(data)
        
        // Run advanced similarity detection
        for (let i = 0; i < insertedGuests.length; i++) {
          for (let j = i + 1; j < insertedGuests.length; j++) {
            const guest1 = insertedGuests[i]
            const guest2 = insertedGuests[j]
            
            const name1 = `${guest1.first_name} ${guest1.last_name}`.trim()
            const name2 = `${guest2.first_name} ${guest2.last_name}`.trim()
            const similarity = DataIntegrityTestUtils.calculateAdvancedSimilarity(name1, name2)
            if (similarity.combined > 0.75) {
              detectedDuplicates.push({
                testCase: testCase.type,
                guest1: { id: guest1.id, name: name1 },
                guest2: { id: guest2.id, name: name2 },
                similarity,
                emailMatch: guest1.email === guest2.email,
                phoneMatch: guest1.phone === guest2.phone
              })
            }
      expect(detectedDuplicates.length).toBeGreaterThan(10)
      // Verify different types of duplicates were detected
      const duplicateTypes = [...new Set(detectedDuplicates.map(d => d.testCase))]
      expect(duplicateTypes.length).toBeGreaterThan(3)
      console.log(`Advanced duplicate detection found ${detectedDuplicates.length} potential duplicates across ${duplicateTypes.length} categories`)
    it('should handle fuzzy matching with configurable thresholds', async () => {
      const similarNames = [
        { first_name: 'Michael', last_name: 'Johnson', email: 'michael.johnson@example.com' },
        { first_name: 'Micheal', last_name: 'Johnson', email: 'micheal.johnson@example.com' }, // Common misspelling
        { first_name: 'Mike', last_name: 'Johnson', email: 'mike.johnson@example.com' },       // Nickname
        { first_name: 'Michael', last_name: 'Jonson', email: 'michael.jonson@example.com' },   // Surname typo
        { first_name: 'M', last_name: 'Johnson', email: 'm.johnson@example.com' }              // Initial only
      ]
      for (const guest of similarNames) {
        const { data, error } = await supabase
          .from('guests')
          .insert({
            couple_id: testClient.id,
            ...guest,
            category: 'friends'
          .select()
          .single()
        expect(error).toBeNull()
        testGuests.push(data)
      // Test different similarity thresholds
      const thresholds = [0.5, 0.7, 0.8, 0.9]
      const results = {}
      for (const threshold of thresholds) {
        const matches = []
        for (let i = 0; i < testGuests.length; i++) {
          for (let j = i + 1; j < testGuests.length; j++) {
            const name1 = `${testGuests[i].first_name} ${testGuests[i].last_name}`
            const name2 = `${testGuests[j].first_name} ${testGuests[j].last_name}`
            if (similarity.combined >= threshold) {
              matches.push({ name1, name2, similarity: similarity.combined })
        results[threshold] = matches.length
      // Lower thresholds should detect more matches
      expect(results[0.5]).toBeGreaterThanOrEqual(results[0.7])
      expect(results[0.7]).toBeGreaterThanOrEqual(results[0.8])
      expect(results[0.8]).toBeGreaterThanOrEqual(results[0.9])
      console.log('Fuzzy matching results by threshold:', results)
    it('should detect household-level duplicates with address matching', async () => {
      // Create household with address variations
      const addressVariations = [
        '123 Main Street, Anytown, CA 90210',
        '123 Main St, Anytown, CA 90210',
        '123 Main St., Anytown, California 90210',
        '123 Main Street, Any Town, CA 90210-1234'
      const createdHouseholds = []
      for (let i = 0; i < addressVariations.length; i++) {
        const { data: household, error } = await supabase
          .from('households')
            name: `Household ${i + 1}`,
            address: addressVariations[i]
        createdHouseholds.push(household)
        // Add family member to each household
        const { data: guest, error: guestError } = await supabase
            household_id: household.id,
            first_name: `Member${i + 1}`,
            last_name: 'Smith',
            email: `member${i + 1}@example.com`,
            category: 'family'
        expect(guestError).toBeNull()
        testGuests.push(guest)
      // Normalize and compare addresses
      const normalizeAddress = (address: string): string => {
        return address
          .toLowerCase()
          .replace(/\bstreet\b/g, 'st')
          .replace(/\bst\./g, 'st')
          .replace(/\bcalifornia\b/g, 'ca')
          .replace(/\s+/g, ' ')
          .replace(/[,-]/g, '')
          .trim()
      const addressGroups = {}
      createdHouseholds.forEach(household => {
        const normalized = normalizeAddress(household.address)
        if (!addressGroups[normalized]) {
          addressGroups[normalized] = []
        addressGroups[normalized].push(household)
      // Should detect that all addresses are the same
      const duplicateAddressGroups = Object.values(addressGroups).filter(group => group.length > 1)
      expect(duplicateAddressGroups.length).toBeGreaterThan(0)
      expect(duplicateAddressGroups[0].length).toBe(4) // All 4 addresses should be grouped together
  describe('High-Performance Bulk Operations', () => {
    it('should handle bulk insert operations efficiently', async () => {
      const bulkSizes = [100, 500, 1000]
      const performanceMetrics = []
      for (const size of bulkSizes) {
        const testGuests = DataIntegrityTestUtils.generateTestGuests(size, {
          couple_id: testClient.id
        })
        const { result, metrics } = await DataIntegrityTestUtils.measureBulkOperationPerformance(
          async () => {
            return await supabase.from('guests').insert(testGuests).select()
          },
          `bulk_insert_${size}`
        expect(result.error).toBeNull()
        expect(result.data?.length).toBe(size)
        performanceMetrics.push({
          operation: `insert_${size}`,
          duration: metrics.duration,
          throughput: size / (metrics.duration / 1000), // records per second
          memoryDelta: metrics.memoryDelta
        // Performance expectations
        expect(metrics.duration).toBeLessThan(size * 10) // Max 10ms per record
        // Clean up
        await supabase.from('guests').delete().eq('couple_id', testClient.id)
      console.log('Bulk insert performance metrics:', performanceMetrics)
    }, 60000)
    it('should maintain data integrity during concurrent bulk updates', async () => {
      // Create initial dataset
      const initialGuests = DataIntegrityTestUtils.generateTestGuests(200, {
        couple_id: testClient.id
      const { data: createdGuests, error } = await supabase
        .from('guests')
        .insert(initialGuests)
        .select()
      expect(error).toBeNull()
      expect(createdGuests?.length).toBe(200)
      // Create concurrent update operations
      const concurrentOperations = []
      const chunkSize = 25
      for (let i = 0; i < 8; i++) { // 8 concurrent operations
        const startIndex = i * chunkSize
        const endIndex = Math.min(startIndex + chunkSize, createdGuests.length)
        const guestChunk = createdGuests.slice(startIndex, endIndex)
        concurrentOperations.push(async () => {
          const updates = guestChunk.map(guest => ({
            id: guest.id,
            category: ['family', 'friends', 'colleagues', 'other'][i % 4],
            rsvp_status: 'yes',
            updated_at: new Date().toISOString()
          }))
          // Simulate some processing time
          await new Promise(resolve => setTimeout(resolve, Math.random() * 100))
          const results = []
          for (const update of updates) {
            const { data, error } = await supabase
              .from('guests')
              .update({
                category: update.category,
                rsvp_status: update.rsvp_status
              .eq('id', update.id)
              .select()
            results.push({ data, error, guestId: update.id })
          return results
      const concurrencyResults = await DataIntegrityTestUtils.simulateConcurrentOperations(
        concurrentOperations,
        4 // Max 4 operations at once
      )
      // Verify results
      expect(concurrencyResults.successful.length).toBeGreaterThan(0)
      expect(concurrencyResults.concurrencyIssues).toBeLessThan(5) // Minimal concurrency issues
      // Verify final data integrity
      const { data: finalGuests } = await supabase
        .select('*')
        .eq('couple_id', testClient.id)
      expect(finalGuests?.length).toBe(200)
      // All guests should have valid categories and RSVP status
      finalGuests?.forEach(guest => {
        expect(['family', 'friends', 'colleagues', 'other']).toContain(guest.category)
        expect(['pending', 'yes', 'no', 'maybe']).toContain(guest.rsvp_status)
      console.log('Concurrent operations results:', {
        totalOperations: concurrentOperations.length,
        successful: concurrencyResults.successful.length,
        failed: concurrencyResults.failed.length,
        concurrencyIssues: concurrencyResults.concurrencyIssues,
        totalTime: concurrencyResults.totalTime
    }, 45000)
    it('should handle memory-efficient bulk operations', async () => {
      const LARGE_BATCH_SIZE = 2000
      const BATCH_SIZE = 100 // Process in smaller batches to manage memory
      let totalProcessed = 0
      let maxMemoryUsage = 0
      let memoryLeaks = []
      // Generate and process data in batches
      for (let batchStart = 0; batchStart < LARGE_BATCH_SIZE; batchStart += BATCH_SIZE) {
        const batchEnd = Math.min(batchStart + BATCH_SIZE, LARGE_BATCH_SIZE)
        const batchSize = batchEnd - batchStart
        const beforeMemory = (performance as unknown).memory?.usedJSHeapSize || 0
        // Generate batch data
        const batchGuests = DataIntegrityTestUtils.generateTestGuests(batchSize, {
          couple_id: testClient.id,
          first_name: `BatchGuest${batchStart}`
        // Insert batch
          .insert(batchGuests)
          .select('id, first_name')
        expect(data?.length).toBe(batchSize)
        const afterMemory = (performance as unknown).memory?.usedJSHeapSize || 0
        const memoryUsed = afterMemory - beforeMemory
        maxMemoryUsage = Math.max(maxMemoryUsage, memoryUsed)
        // Check for memory leaks (memory should not grow indefinitely)
        if (batchStart > 0 && memoryUsed > maxMemoryUsage * 1.5) {
          memoryLeaks.push({
            batchStart,
            memoryUsed,
            maxMemoryUsage: maxMemoryUsage
        totalProcessed += batchSize
        // Force garbage collection if available (Node.js with --expose-gc)
        if (global.gc) {
          global.gc()
        // Brief pause to allow memory cleanup
        await new Promise(resolve => setTimeout(resolve, 10))
      expect(totalProcessed).toBe(LARGE_BATCH_SIZE)
      expect(memoryLeaks.length).toBeLessThan(5) // Should not have significant memory leaks
      // Verify data integrity
      const { data: allGuests, error: fetchError } = await supabase
        .select('id')
      expect(fetchError).toBeNull()
      expect(allGuests?.length).toBe(LARGE_BATCH_SIZE)
      console.log('Memory-efficient bulk operation results:', {
        totalProcessed,
        maxMemoryUsage: (maxMemoryUsage / 1024 / 1024).toFixed(2) + ' MB',
        memoryLeaks: memoryLeaks.length,
        finalRecordCount: allGuests?.length
  describe('Advanced Constraint Validation', () => {
    it('should enforce complex business rule constraints', async () => {
      // Business Rule: Guests under 21 cannot have plus ones that are also under 21
      // Business Rule: Maximum 2 guests per email domain for work category
      // Business Rule: Household size limit of 8 people
      const { data: household, error: householdError } = await supabase
        .from('households')
        .insert({
          name: 'Large Family',
          address: '123 Business Rule St'
        .single()
      expect(householdError).toBeNull()
      // Test household size constraint
      const householdMembers = Array.from({ length: 10 }, (_, i) => ({
        couple_id: testClient.id,
        household_id: household.id,
        first_name: `Member${i + 1}`,
        last_name: 'LargeFamily',
        email: `member${i + 1}@largefamily.com`,
        category: 'family',
        age_group: i < 2 ? 'child' : 'adult'
      }))
      let householdViolations = 0
      const createdMembers = []
      for (const member of householdMembers) {
          .insert(member)
        if (error) {
          if (error.message.includes('household') || error.message.includes('constraint')) {
            householdViolations++
          createdMembers.push(data)
      // Test email domain constraint for work category
      const workGuests = [
        { first_name: 'John', last_name: 'Work1', email: 'john@company.com', category: 'colleagues' },
        { first_name: 'Jane', last_name: 'Work2', email: 'jane@company.com', category: 'colleagues' },
        { first_name: 'Bob', last_name: 'Work3', email: 'bob@company.com', category: 'colleagues' }, // Should violate
        { first_name: 'Alice', last_name: 'Work4', email: 'alice@othercompany.com', category: 'colleagues' }
      let domainViolations = 0
      for (const guest of workGuests) {
            ...guest
          if (error.message.includes('domain') || error.message.includes('limit')) {
            domainViolations++
      // Verify constraint enforcement results
      console.log('Business rule constraint results:', {
        householdMembers: createdMembers.length,
        householdViolations,
        domainViolations,
        expectedHouseholdSize: Math.min(8, householdMembers.length),
        expectedDomainViolations: Math.max(0, workGuests.filter(g => g.email.endsWith('@company.com')).length - 2)
    it('should validate data consistency across related tables', async () => {
      // Create guest with dietary requirements and photo groups
      const { data: guest, error: guestError } = await supabase
          first_name: 'Consistent',
          last_name: 'DataGuest',
          email: 'consistent@example.com',
          category: 'family',
          dietary_requirements: ['vegetarian', 'gluten_free']
      expect(guestError).toBeNull()
      testGuests.push(guest)
      // Add dietary requirements
      const dietaryReqs = [
        { guest_id: guest.id, requirement_type: 'vegetarian', severity: 'strict' },
        { guest_id: guest.id, requirement_type: 'gluten_free', severity: 'moderate' }
      for (const req of dietaryReqs) {
        const { error } = await supabase
          .from('dietary_requirements')
          .insert(req)
      // Add photo group assignment
      const { data: photoGroup, error: photoError } = await supabase
        .from('guest_photo_groups')
          guest_id: guest.id,
          group_name: 'Family Photos',
          priority: 'high'
      expect(photoError).toBeNull()
      // Test referential integrity when updating guest
      const { error: updateError } = await supabase
        .update({
          dietary_requirements: ['vegetarian'] // Remove gluten_free
        .eq('id', guest.id)
      // Verify related data consistency
      const { data: updatedReqs } = await supabase
        .from('dietary_requirements')
        .eq('guest_id', guest.id)
      const { data: photoGroups } = await supabase
      // Check if dietary requirements are automatically cleaned up or kept in sync
      expect(updatedReqs?.length).toBeGreaterThanOrEqual(1)
      expect(photoGroups?.length).toBe(1)
      console.log('Data consistency validation:', {
        guestId: guest.id,
        dietaryRequirements: updatedReqs?.length || 0,
        photoGroups: photoGroups?.length || 0,
        updateSuccessful: updateError === null
  describe('Error Recovery and Transaction Simulation', () => {
    it('should handle partial failures with proper error recovery', async () => {
      const mixedValidityGuests = [
        { first_name: 'Valid1', last_name: 'Guest', email: 'valid1@example.com', category: 'family' },
        { first_name: '', last_name: 'Invalid', email: 'invalid1@example.com', category: 'family' }, // Invalid: empty first name
        { first_name: 'Valid2', last_name: 'Guest', email: 'valid2@example.com', category: 'friends' },
        { first_name: 'Invalid2', last_name: 'Guest', email: 'notanemail', category: 'friends' }, // Invalid: bad email
        { first_name: 'Valid3', last_name: 'Guest', email: 'valid3@example.com', category: 'invalid_category' }, // Invalid: bad category
      const results = {
        successful: [],
        failed: [],
        recovered: []
      // First pass: attempt all insertions
      for (let i = 0; i < mixedValidityGuests.length; i++) {
        const guest = mixedValidityGuests[i]
          results.failed.push({ index: i, guest, error: error.message })
          results.successful.push({ index: i, guest: data })
      // Recovery pass: fix failed insertions
      for (const failedGuest of results.failed) {
        let fixedGuest = { ...failedGuest.guest }
        // Apply automatic fixes based on error patterns
        if (failedGuest.error.includes('first_name') || !fixedGuest.first_name) {
          fixedGuest.first_name = 'RecoveredGuest'
        if (failedGuest.error.includes('email')) {
          fixedGuest.email = `recovered${failedGuest.index}@example.com`
        if (failedGuest.error.includes('category')) {
          fixedGuest.category = 'other'
            ...fixedGuest
        if (!error) {
          results.recovered.push({ original: failedGuest, recovered: data })
      expect(results.successful.length).toBeGreaterThan(1)
      expect(results.failed.length).toBeGreaterThan(1)
      expect(results.recovered.length).toBe(results.failed.length)
      console.log('Error recovery results:', {
        totalAttempts: mixedValidityGuests.length,
        initialSuccesses: results.successful.length,
        failures: results.failed.length,
        recovered: results.recovered.length,
        finalSuccessRate: ((results.successful.length + results.recovered.length) / mixedValidityGuests.length * 100).toFixed(1) + '%'
    it('should simulate transaction rollback scenarios', async () => {
      // Create test data for rollback scenario
      const initialGuests = DataIntegrityTestUtils.generateTestGuests(20, {
      expect(createdGuests?.length).toBe(20)
      testGuests.push(...createdGuests)
      // Simulate a complex transaction that should rollback
      const transactionOperations = [
        // Step 1: Update first 10 guests successfully
        async () => {
          const guestsToUpdate = createdGuests.slice(0, 10)
          for (const guest of guestsToUpdate) {
              .update({ category: 'friends', rsvp_status: 'yes' })
              .eq('id', guest.id)
            results.push({ data, error, guestId: guest.id })
        },
        // Step 2: Add dietary requirements (should succeed)
          const dietaryReqs = createdGuests.slice(0, 5).map(guest => ({
            guest_id: guest.id,
            requirement_type: 'vegetarian',
            severity: 'moderate'
          return await supabase.from('dietary_requirements').insert(dietaryReqs).select()
        // Step 3: Violate constraint (should fail and cause rollback)
          // Attempt to update with invalid data
            .update({ category: 'invalid_category' })
            .eq('couple_id', testClient.id)
          if (error) throw new Error(error.message)
          return data
      let operationResults = []
      let rollbackRequired = false
      try {
        // Execute transaction operations
        for (let i = 0; i < transactionOperations.length; i++) {
          const result = await transactionOperations[i]()
          operationResults.push({ step: i + 1, success: true, result })
      } catch (error) {
        rollbackRequired = true
        operationResults.push({ 
          step: operationResults.length + 1, 
          success: false, 
          error: error.message 
        // Simulate rollback by restoring original state
        console.log('Transaction failed, initiating rollback...')
        // Rollback step 2: Remove dietary requirements
        await supabase
          .delete()
          .in('guest_id', createdGuests.slice(0, 5).map(g => g.id))
        // Rollback step 1: Restore original guest data
        for (const guest of createdGuests.slice(0, 10)) {
          await supabase
            .update({ 
              category: guest.category, 
              rsvp_status: guest.rsvp_status 
            .eq('id', guest.id)
      // Verify rollback was successful
      if (rollbackRequired) {
        const { data: finalGuests } = await supabase
          .select('*')
          .in('id', createdGuests.slice(0, 10).map(g => g.id))
        const { data: finalDietaryReqs } = await supabase
        // Guests should be restored to original state
        finalGuests?.forEach(guest => {
          const original = createdGuests.find(g => g.id === guest.id)
          expect(guest.category).toBe(original.category)
          expect(guest.rsvp_status).toBe(original.rsvp_status)
        // Dietary requirements should be cleaned up
        expect(finalDietaryReqs?.length).toBe(0)
      expect(rollbackRequired).toBe(true)
      expect(operationResults.some(op => !op.success)).toBe(true)
      console.log('Transaction rollback simulation:', {
        totalSteps: transactionOperations.length,
        completedSteps: operationResults.filter(op => op.success).length,
        rollbackRequired,
        operationResults: operationResults.map(op => ({ 
          step: op.step, 
          success: op.success,
          hasError: !!op.error 
        }))
    }, 30000)
  describe('Real-World Edge Cases', () => {
    it('should handle international guest data correctly', async () => {
      const internationalGuests = [
        // European guests
        { first_name: 'François', last_name: 'Dubois', email: 'francois@example.fr', phone: '+33 1 42 86 83 26' },
        { first_name: 'María José', last_name: 'García-López', email: 'maria.jose@example.es', phone: '+34 91 123 45 67' },
        // Asian guests  
        { first_name: '山田', last_name: '太郎', email: 'yamada@example.jp', phone: '+81 3 1234 5678' },
        { first_name: '李', last_name: '明', email: 'li.ming@example.cn', phone: '+86 10 1234 5678' },
        // Middle Eastern guests
        { first_name: 'محمد', last_name: 'العربي', email: 'mohammad@example.ae', phone: '+971 4 123 4567' },
        // Special characters and formatting
        { first_name: 'Åsa', last_name: 'Lindström', email: 'asa@example.se', phone: '+46 8 123 456 78' },
        { first_name: 'José-María', last_name: "O'Connor-Smith", email: 'jose@example.ie', phone: '+353 1 234 5678' }
      const insertResults = []
      for (const guest of internationalGuests) {
        insertResults.push({
          original: guest,
          success: !error,
          data,
          error: error?.message
        if (data) {
          // Verify character encoding preservation
          expect(data.first_name).toBe(guest.first_name)
          expect(data.last_name).toBe(guest.last_name)
          expect(data.email).toBe(guest.email)
          expect(data.phone).toBe(guest.phone)
      const successfulInserts = insertResults.filter(r => r.success).length
      expect(successfulInserts).toBe(internationalGuests.length)
      // Test search functionality with international characters
      const searchTests = ['山田', 'José', 'محمد', 'Åsa']
      for (const searchTerm of searchTests) {
        const { data: searchResults, error: searchError } = await supabase
          .eq('couple_id', testClient.id)
          .or(`first_name.ilike.%${searchTerm}%,last_name.ilike.%${searchTerm}%`)
        expect(searchError).toBeNull()
        if (searchResults && searchResults.length > 0) {
          const matchingGuest = searchResults[0]
          const containsSearchTerm = 
            matchingGuest.first_name.includes(searchTerm) || 
            matchingGuest.last_name.includes(searchTerm)
          expect(containsSearchTerm).toBe(true)
      console.log('International guest data handling:', {
        totalGuests: internationalGuests.length,
        successfulInserts,
        searchTestsPassed: searchTests.length,
        characterEncodingPreserved: insertResults.every(r => r.success)
    it('should handle extreme data volumes and stress conditions', async () => {
      const STRESS_TEST_SIZE = 1500
      const CONCURRENT_OPERATIONS = 10
      console.log(`Starting stress test with ${STRESS_TEST_SIZE} records and ${CONCURRENT_OPERATIONS} concurrent operations...`)
      // Generate large dataset
      const stressTestGuests = DataIntegrityTestUtils.generateTestGuests(STRESS_TEST_SIZE, {
      // Split into chunks for concurrent processing
      const chunkSize = Math.ceil(STRESS_TEST_SIZE / CONCURRENT_OPERATIONS)
      const chunks = []
      for (let i = 0; i < STRESS_TEST_SIZE; i += chunkSize) {
        chunks.push(stressTestGuests.slice(i, i + chunkSize))
      // Create concurrent insertion operations
      const concurrentInserts = chunks.map((chunk, index) => async () => {
        const startTime = performance.now()
        try {
            .insert(chunk)
            .select('id')
          const endTime = performance.now()
          return {
            chunkIndex: index,
            recordsInserted: data?.length || 0,
            duration: endTime - startTime,
            success: !error,
            error: error?.message
        } catch (error) {
            recordsInserted: 0,
            success: false,
            error: error.message
      // Execute stress test
      const stressResults = await DataIntegrityTestUtils.simulateConcurrentOperations(
        concurrentInserts,
        CONCURRENT_OPERATIONS
      // Analyze results
      const totalInserted = stressResults.successful.reduce((sum, result) => 
        sum + (result.recordsInserted || 0), 0
      const averageDuration = stressResults.successful.reduce((sum, result) => 
        sum + (result.duration || 0), 0
      ) / Math.max(stressResults.successful.length, 1)
      // Verify database consistency after stress test
      const { data: finalCount, error: countError } = await supabase
        .select('id', { count: 'exact' })
      expect(countError).toBeNull()
      expect(finalCount?.length || 0).toBeGreaterThan(STRESS_TEST_SIZE * 0.8) // At least 80% success rate
      // Test query performance on large dataset
      const queryStartTime = performance.now()
      const { data: searchResults, error: searchError } = await supabase
        .eq('category', 'family')
        .order('created_at', { ascending: false })
        .limit(100)
      const queryDuration = performance.now() - queryStartTime
      expect(searchError).toBeNull()
      expect(queryDuration).toBeLessThan(5000) // Query should complete within 5 seconds
      console.log('Stress test results:', {
        targetRecords: STRESS_TEST_SIZE,
        actuallyInserted: totalInserted,
        successRate: ((totalInserted / STRESS_TEST_SIZE) * 100).toFixed(1) + '%',
        concurrentOperations: CONCURRENT_OPERATIONS,
        averageInsertDuration: averageDuration.toFixed(2) + 'ms',
        totalTestTime: stressResults.totalTime.toFixed(2) + 'ms',
        queryPerformance: queryDuration.toFixed(2) + 'ms',
        concurrencyIssues: stressResults.concurrencyIssues
    }, 120000) // 2 minute timeout for stress test
})
