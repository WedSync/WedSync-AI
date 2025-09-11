/**
 * Enhanced Integration Tests for Guest APIs and Bulk Operations
 * Team E - Batch 13 - WS-151 Guest List Builder API Testing
 * 
 * FOCUS AREAS:
 * - High-volume bulk operations (500+ guests)
 * - API performance under load
 * - Data integrity during concurrent operations
 * - Error handling and recovery
 * - Rate limiting and throttling
 * - Transaction rollback scenarios
 * - Real-time sync validation
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll, Mock } from 'vitest';
import { createClient } from '@supabase/supabase-js'
import { Database } from '@/types/database'
import Papa from 'papaparse'
import FormData from 'form-data'
import * as fs from 'fs'
import * as path from 'path'
// Test configuration for integration testing
const TEST_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const TEST_SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const TEST_API_BASE_URL = process.env.TEST_API_BASE_URL || 'http://localhost:3000'
// Performance benchmarks
const PERFORMANCE_BENCHMARKS = {
  BULK_IMPORT_TIME_PER_GUEST: 30, // 30ms per guest max
  API_RESPONSE_TIME: 2000, // 2 second max for standard operations
  BULK_UPDATE_TIME: 5000, // 5 seconds for 100 guest updates
  CONCURRENT_OPERATIONS: 10, // Max concurrent operations to test
  LARGE_DATASET_SIZE: 500, // Minimum size for performance testing
  MEMORY_LEAK_THRESHOLD: 100 // MB memory increase threshold
}
// Test data generators
const generateGuestData = (count: number, options: any = {}) => {
  return Array.from({ length: count }, (_, i) => ({
    first_name: options.namePrefix ? `${options.namePrefix}${i}` : `TestGuest${i}`,
    last_name: `Integration${Math.floor(i / 10)}`,
    email: `integration.guest.${i}@testemail.com`,
    phone: `555-${String(i + 8000).padStart(4, '0')}`,
    category: ['family', 'friends', 'work', 'other'][i % 4] as const,
    side: ['partner1', 'partner2', 'mutual'][i % 3] as const,
    plus_one: i % 5 === 0,
    plus_one_name: i % 5 === 0 ? `Plus${i}` : null,
    dietary_restrictions: i % 10 === 0 ? 'Vegetarian' : null,
    table_number: i % 20 === 0 ? Math.floor(i / 8) + 1 : null,
    notes: i % 25 === 0 ? `Test note for guest ${i}` : null,
    rsvp_status: ['pending', 'yes', 'no', 'maybe'][i % 4] as const,
    age_group: i % 15 === 0 ? 'child' : 'adult' as const,
    ...options.overrides
  }))
const generateCSVContent = (guestData: any[]) => {
  return Papa.unparse(guestData.map(guest => ({
    'First Name': guest.first_name,
    'Last Name': guest.last_name,
    'Email': guest.email,
    'Phone': guest.phone,
    'Category': guest.category,
    'Side': guest.side,
    'Plus One': guest.plus_one ? 'Yes' : 'No',
    'Plus One Name': guest.plus_one_name || '',
    'Dietary Restrictions': guest.dietary_restrictions || '',
    'Table Number': guest.table_number || '',
    'Notes': guest.notes || '',
    'RSVP Status': guest.rsvp_status,
    'Age Group': guest.age_group
  })))
// Test utilities
class APITestClient {
  private baseURL: string
  private authToken: string | null = null
  constructor(baseURL: string) {
    this.baseURL = baseURL
  }
  async authenticate(email: string, password: string) {
    const response = await fetch(`${this.baseURL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    })
    
    if (response.ok) {
      const data = await response.json()
      this.authToken = data.access_token
    }
    return response.ok
  async request(endpoint: string, options: RequestInit = {}) {
    const url = `${this.baseURL}${endpoint}`
    const headers = {
      'Authorization': this.authToken ? `Bearer ${this.authToken}` : '',
      ...options.headers
    return fetch(url, { ...options, headers })
// Test environment setup
let supabase: ReturnType<typeof createClient<Database>>
let apiClient: APITestClient
let testUser: any
let testClient: any
let performanceMetrics: any = {}
describe('Enhanced Guest APIs and Bulk Operations Integration Tests', () => {
  beforeAll(async () => {
    // Initialize Supabase admin client
    supabase = createClient<Database>(TEST_SUPABASE_URL, TEST_SUPABASE_SERVICE_KEY)
    // Initialize API client
    apiClient = new APITestClient(TEST_API_BASE_URL)
    // Create test user and client
    const testUserEmail = `bulk-api-test-${Date.now()}@example.com`
    const testPassword = 'IntegrationTest123!'
    const { data: { user }, error: authError } = await supabase.auth.admin.createUser({
      email: testUserEmail,
      password: testPassword,
      email_confirm: true
    expect(authError).toBeNull()
    expect(user).toBeTruthy()
    testUser = user
    // Authenticate API client
    const authenticated = await apiClient.authenticate(testUserEmail, testPassword)
    expect(authenticated).toBe(true)
    // Create test client record
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .insert({
        first_name: 'Bulk',
        last_name: 'APITest',
        email: testUser.email,
        wedding_date: '2025-12-31',
        created_by: testUser.id
      })
      .select()
      .single()
    expect(clientError).toBeNull()
    expect(client).toBeTruthy()
    testClient = client
  })
  afterAll(async () => {
    // Cleanup test data
    if (testClient) {
      await supabase.from('guests').delete().eq('couple_id', testClient.id)
      await supabase.from('photo_groups').delete().eq('couple_id', testClient.id)
      await supabase.from('dietary_requirements').delete().eq('guest_id', 'in', [])
      await supabase.from('clients').delete().eq('id', testClient.id)
    if (testUser) {
      await supabase.auth.admin.deleteUser(testUser.id)
    // Log performance metrics
    console.log('\n=== API PERFORMANCE METRICS ===')
    console.log(JSON.stringify(performanceMetrics, null, 2))
  describe('Bulk Import API Performance Tests', () => {
    it('should handle 500+ guest CSV import within performance threshold', async () => {
      const guestCount = 500
      const testGuests = generateGuestData(guestCount, { namePrefix: 'BulkImport' })
      const csvContent = generateCSVContent(testGuests)
      const formData = new FormData()
      formData.append('file', Buffer.from(csvContent), {
        filename: 'bulk-import-500.csv',
        contentType: 'text/csv'
      formData.append('couple_id', testClient.id)
      formData.append('mapping_config', JSON.stringify({
        first_name: 'First Name',
        last_name: 'Last Name',
        email: 'Email',
        phone: 'Phone',
        category: 'Category',
        side: 'Side',
        plus_one: 'Plus One',
        plus_one_name: 'Plus One Name',
        dietary_restrictions: 'Dietary Restrictions',
        table_number: 'Table Number',
        notes: 'Notes',
        rsvp_status: 'RSVP Status',
        age_group: 'Age Group'
      }))
      formData.append('batch_size', '50') // Process in batches of 50
      const startTime = Date.now()
      const response = await apiClient.request('/api/guests/import-enhanced', {
        method: 'POST',
        body: formData as any
      expect(response.status).toBe(200)
      const result = await response.json()
      const processingTime = Date.now() - startTime
      expect(result.total_rows).toBe(guestCount)
      expect(result.successful_imports).toBeGreaterThan(guestCount * 0.95) // 95% success rate
      expect(processingTime).toBeLessThan(guestCount * PERFORMANCE_BENCHMARKS.BULK_IMPORT_TIME_PER_GUEST)
      performanceMetrics.bulkImport500 = {
        guestCount,
        processingTime,
        timePerGuest: processingTime / guestCount,
        successRate: (result.successful_imports / result.total_rows) * 100,
        batchesProcessed: Math.ceil(guestCount / 50)
      }
      console.log(`✅ Bulk import 500 guests: ${processingTime}ms (${(processingTime / guestCount).toFixed(2)}ms/guest)`)
    it('should handle massive CSV import (1000 guests) with memory optimization', async () => {
      const guestCount = 1000
      const testGuests = generateGuestData(guestCount, { namePrefix: 'MassiveImport' })
        filename: 'massive-import-1000.csv',
        side: 'Side'
      formData.append('batch_size', '25') // Smaller batches for massive imports
      expect(result.successful_imports).toBeGreaterThan(guestCount * 0.9) // 90% success rate for massive imports
      
      // Memory usage should be reasonable
      expect(result.memory_usage_mb).toBeLessThan(PERFORMANCE_BENCHMARKS.MEMORY_LEAK_THRESHOLD)
      performanceMetrics.massiveImport1000 = {
        memoryUsage: result.memory_usage_mb,
        successRate: (result.successful_imports / result.total_rows) * 100
      console.log(`✅ Massive import 1000 guests: ${processingTime}ms (${result.memory_usage_mb}MB memory)`)
    it('should handle import with validation errors gracefully', async () => {
      const validGuests = generateGuestData(50, { namePrefix: 'Valid' })
      const invalidGuests = [
        { first_name: '', last_name: 'Invalid', email: 'not-an-email', category: 'invalid' },
        { first_name: 'NoEmail', last_name: 'Guest', email: '', category: 'family' },
        { first_name: 'BadPhone', last_name: 'Guest', email: 'bad@test.com', phone: 'invalid-phone', category: 'friends' }
      ]
      const mixedData = [...validGuests, ...invalidGuests]
      const csvContent = generateCSVContent(mixedData)
        filename: 'mixed-validation.csv',
        category: 'Category'
      formData.append('validate_before_import', 'true')
      expect(result.total_rows).toBe(53)
      expect(result.successful_imports).toBe(50) // Only valid guests
      expect(result.failed_imports).toBe(3) // Invalid guests
      expect(result.errors).toHaveLength(3)
      expect(result.validation_summary).toBeTruthy()
      // Verify specific error types
      const errors = result.errors
      expect(errors.some((e: any) => e.field === 'first_name')).toBe(true)
      expect(errors.some((e: any) => e.field === 'email')).toBe(true)
      expect(errors.some((e: any) => e.field === 'category')).toBe(true)
  describe('Bulk Operations API Tests', () => {
    beforeEach(async () => {
      // Create test guests for bulk operations
      const testGuests = generateGuestData(100, { namePrefix: 'BulkOps' })
      const { data, error } = await supabase
        .from('guests')
        .insert(testGuests.map(guest => ({
          ...guest,
          couple_id: testClient.id
        })))
        .select()
      expect(error).toBeNull()
      expect(data?.length).toBe(100)
    it('should handle bulk category updates efficiently', async () => {
      // Get first 50 guests for bulk update
      const { data: guests } = await supabase
        .select('id')
        .eq('couple_id', testClient.id)
        .limit(50)
      const guestIds = guests?.map(g => g.id) || []
      const response = await apiClient.request('/api/guests/bulk', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          guest_ids: guestIds,
          updates: {
            category: 'family'
          }
        })
      const updateTime = Date.now() - startTime
      expect(result.updated_count).toBe(50)
      expect(updateTime).toBeLessThan(PERFORMANCE_BENCHMARKS.BULK_UPDATE_TIME)
      // Verify updates were applied
      const { data: updatedGuests } = await supabase
        .select('category')
        .in('id', guestIds)
      expect(updatedGuests?.every(g => g.category === 'family')).toBe(true)
      performanceMetrics.bulkCategoryUpdate = {
        guestCount: 50,
        updateTime,
        timePerGuest: updateTime / 50
    it('should handle bulk RSVP status updates with validation', async () => {
        .limit(75)
            rsvp_status: 'yes'
          },
          validate: true
      expect(result.updated_count).toBe(75)
      expect(result.validation_errors).toBeDefined()
      // All updates should be valid for RSVP status
      expect(result.validation_errors.length).toBe(0)
    it('should handle bulk deletion with confirmation', async () => {
      // Create guests specifically for deletion test
      const deleteTestGuests = generateGuestData(25, { namePrefix: 'DeleteTest' })
      const { data: createdGuests } = await supabase
        .insert(deleteTestGuests.map(guest => ({
      const guestIds = createdGuests?.map(g => g.id) || []
        method: 'DELETE',
          confirm: true
      expect(result.deleted_count).toBe(25)
      // Verify guests were deleted
      const { data: remainingGuests } = await supabase
      expect(remainingGuests?.length).toBe(0)
  describe('Concurrent Operations Stress Tests', () => {
    it('should handle concurrent API requests without conflicts', async () => {
      const concurrentRequests = PERFORMANCE_BENCHMARKS.CONCURRENT_OPERATIONS
      const requests = []
      // Create concurrent read operations
      for (let i = 0; i < concurrentRequests; i++) {
        requests.push(
          apiClient.request(`/api/guests?couple_id=${testClient.id}&limit=50&offset=${i * 50}`)
        )
      const results = await Promise.allSettled(requests)
      const concurrentTime = Date.now() - startTime
      const successfulRequests = results.filter(r => r.status === 'fulfilled').length
      expect(successfulRequests).toBe(concurrentRequests)
      expect(concurrentTime).toBeLessThan(PERFORMANCE_BENCHMARKS.API_RESPONSE_TIME * 2)
      performanceMetrics.concurrentReads = {
        concurrentRequests,
        successfulRequests,
        totalTime: concurrentTime,
        avgTimePerRequest: concurrentTime / concurrentRequests
    it('should handle concurrent writes with proper locking', async () => {
      const concurrentWrites = 5
      const promises = []
      // Create concurrent write operations
      for (let i = 0; i < concurrentWrites; i++) {
        const guestData = {
          couple_id: testClient.id,
          first_name: `Concurrent${i}`,
          last_name: 'WriteTest',
          email: `concurrent.write.${i}@test.com`,
          category: 'friends',
          side: 'mutual'
        }
        promises.push(
          apiClient.request('/api/guests', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(guestData)
          })
      const results = await Promise.allSettled(promises)
      const successfulWrites = results.filter(r => r.status === 'fulfilled').length
      expect(successfulWrites).toBe(concurrentWrites)
      // Verify all guests were created
        .select('*')
        .like('first_name', 'Concurrent%')
      expect(createdGuests?.length).toBe(concurrentWrites)
  describe('Error Handling and Recovery', () => {
    it('should handle database connection failures gracefully', async () => {
      // Simulate database timeout
      const response = await apiClient.request('/api/guests?couple_id=invalid-id&timeout=1')
      expect([408, 500, 503]).toContain(response.status)
      const errorResult = await response.json()
      expect(errorResult.error).toBeTruthy()
      expect(errorResult.retry_after).toBeTruthy()
    it('should handle malformed request data', async () => {
      const malformedData = {
        couple_id: 'not-a-uuid',
        first_name: null,
        email: 'invalid-email',
        category: 'invalid-category'
      const response = await apiClient.request('/api/guests', {
        body: JSON.stringify(malformedData)
      expect(response.status).toBe(400)
      expect(errorResult.validation_errors).toBeTruthy()
      expect(errorResult.validation_errors.length).toBeGreaterThan(0)
    it('should handle rate limiting properly', async () => {
      // Send many requests rapidly to trigger rate limiting
      const rapidRequests = []
      for (let i = 0; i < 100; i++) {
        rapidRequests.push(
          apiClient.request(`/api/guests?couple_id=${testClient.id}`)
      const results = await Promise.allSettled(rapidRequests)
      const rateLimitedRequests = results.filter(r => 
        r.status === 'fulfilled' && (r.value as unknown).status === 429
      )
      // Should have some rate limited requests
      expect(rateLimitedRequests.length).toBeGreaterThan(0)
  describe('Data Integrity Validation', () => {
    it('should maintain referential integrity during bulk operations', async () => {
      // Create guests with relationships
      const householdGuests = generateGuestData(20, { 
        namePrefix: 'Household',
        overrides: { household_id: 'test-household-integrity' }
        .insert(householdGuests.map(guest => ({
      // Create photo group with these guests
      const { data: photoGroup } = await supabase
        .from('photo_groups')
        .insert({
          name: 'Integrity Test Group',
          photo_type: 'family',
          estimated_time_minutes: 10
        .single()
      // Add photo group assignments
      const assignments = createdGuests?.slice(0, 10).map(guest => ({
        photo_group_id: photoGroup.id,
        guest_id: guest.id
      })) || []
      await supabase
        .from('photo_group_assignments')
        .insert(assignments)
      // Now delete some guests and verify referential integrity
      const guestsToDelete = createdGuests?.slice(0, 5).map(g => g.id) || []
          guest_ids: guestsToDelete,
      // Verify photo group assignments were also cleaned up
      const { data: remainingAssignments } = await supabase
        .in('guest_id', guestsToDelete)
      expect(remainingAssignments?.length).toBe(0)
    it('should handle transaction rollbacks correctly', async () => {
      const guestsBefore = await supabase
      const beforeCount = guestsBefore.data?.length || 0
      // Attempt bulk operation that should fail partway through
      const mixedGuests = [
        ...generateGuestData(5, { namePrefix: 'ValidTransaction' }),
        { first_name: '', last_name: '', email: '', category: 'invalid' } // Invalid data to cause failure
      const response = await apiClient.request('/api/guests/bulk-create', {
          guests: mixedGuests,
          atomic: true // Should rollback all on failure
      expect([400, 422]).toContain(response.status)
      // Verify no guests were created due to rollback
      const guestsAfter = await supabase
      const afterCount = guestsAfter.data?.length || 0
      expect(afterCount).toBe(beforeCount) // Count should be unchanged
  describe('Performance Monitoring and Reporting', () => {
    it('should track and report API performance metrics', async () => {
      const testOperations = [
        { operation: 'create', count: 10 },
        { operation: 'read', count: 50 },
        { operation: 'update', count: 25 },
        { operation: 'delete', count: 5 }
      const operationMetrics = []
      for (const test of testOperations) {
        const startTime = Date.now()
        
        switch (test.operation) {
          case 'create':
            const createGuests = generateGuestData(test.count, { namePrefix: 'Metrics' })
            for (const guest of createGuests) {
              await apiClient.request('/api/guests', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...guest, couple_id: testClient.id })
              })
            }
            break
          
          case 'read':
            for (let i = 0; i < test.count; i++) {
              await apiClient.request(`/api/guests?couple_id=${testClient.id}&limit=10&offset=${i}`)
          case 'update':
            const { data: updateGuests } = await supabase
              .from('guests')
              .select('id')
              .eq('couple_id', testClient.id)
              .limit(test.count)
              
            for (const guest of updateGuests || []) {
              await apiClient.request(`/api/guests/${guest.id}`, {
                method: 'PATCH',
                body: JSON.stringify({ notes: `Updated ${Date.now()}` })
        const endTime = Date.now()
        operationMetrics.push({
          operation: test.operation,
          count: test.count,
          totalTime: endTime - startTime,
          avgTimePerOperation: (endTime - startTime) / test.count
      performanceMetrics.operationBreakdown = operationMetrics
      // Verify performance meets benchmarks
      operationMetrics.forEach(metric => {
        expect(metric.avgTimePerOperation).toBeLessThan(200) // 200ms avg per operation
})
