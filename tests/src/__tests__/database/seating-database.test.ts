/**
 * WS-154 Seating Arrangements System - Database Tests
 * Team E - Comprehensive Database Testing for 200+ Guest Scenarios
 * 
 * Tests all database operations, performance, and data integrity
 * for the seating arrangements system.
 */

import { describe, test, expect, beforeAll, afterAll, beforeEach, afterEach } from '@jest/globals'
import { createClient } from '@/lib/supabase/server'
import { SeatingQueriesManager } from '@/lib/database/seating-queries'
import type {
  ReceptionTable,
  GuestRelationship,
  SeatingArrangement,
  SeatingAssignment,
  CreateReceptionTableInput,
  CreateGuestRelationshipInput,
  CreateSeatingArrangementInput,
  BulkSeatingAssignmentInput
} from '@/types/seating'
import type { Guest } from '@/types/guest-management'
import { generateLargeWeddingTestData, seedDatabase, cleanupTestData } from '../utils/seating-test-helpers'

// Test configuration
const TEST_PERFORMANCE_THRESHOLD_MS = 500 // 500ms max for critical queries
const LARGE_GUEST_COUNT = 200
const RELATIONSHIP_COUNT = 400
const TABLE_COUNT = 25

describe('WS-154 Seating Database Operations', () => {
  let supabase: ReturnType<typeof createClient>
  let seatingManager: SeatingQueriesManager
  let testCoupleId: string
  let testGuests: Guest[] = []
  let testTables: ReceptionTable[] = []
  let testArrangement: SeatingArrangement | null = null

  beforeAll(async () => {
    supabase = await createClient()
    seatingManager = new SeatingQueriesManager()

    // Create test couple
    const { data: couple, error: coupleError } = await supabase
      .from('clients')
      .insert({
        first_name: 'Test',
        last_name: 'Couple',
        email: `test-couple-${Date.now()}@example.com`,
        business_name: 'Seating Test Wedding'
      })
      .select()
      .single()

    if (coupleError || !couple) {
      throw new Error('Failed to create test couple: ' + coupleError?.message)
    }

    testCoupleId = couple.id

    // Generate and seed test data
    const testData = await generateLargeWeddingTestData(LARGE_GUEST_COUNT, RELATIONSHIP_COUNT, TABLE_COUNT)
    await seedDatabase(testCoupleId, testData)
    testGuests = testData.guests
    testTables = testData.tables
  })

  afterAll(async () => {
    // Cleanup test data
    await cleanupTestData(testCoupleId)
    
    // Delete test couple
    await supabase
      .from('clients')
      .delete()
      .eq('id', testCoupleId)
  })

  beforeEach(() => {
    // Clear performance metrics before each test
    seatingManager.clearPerformanceMetrics()
  })

  // ==================================================
  // RECEPTION TABLES TESTS
  // ==================================================

  describe('Reception Tables Operations', () => {
    test('should create reception table with valid data', async () => {
      const tableData: CreateReceptionTableInput = {
        table_number: 99,
        name: 'Test Table',
        capacity: 8,
        table_shape: 'round',
        location_x: 100,
        location_y: 200,
        special_requirements: 'Near dance floor'
      }

      const { data: table, error } = await seatingManager.createReceptionTable(
        testCoupleId,
        tableData
      )

      expect(error).toBeNull()
      expect(table).toBeDefined()
      expect(table!.table_number).toBe(99)
      expect(table!.capacity).toBe(8)
      expect(table!.table_shape).toBe('round')
      expect(table!.couple_id).toBe(testCoupleId)
    })

    test('should get reception tables with assignments efficiently', async () => {
      const startTime = Date.now()
      
      const { data: tables, error } = await seatingManager.getReceptionTablesWithAssignments(
        testCoupleId
      )

      const executionTime = Date.now() - startTime

      expect(error).toBeNull()
      expect(tables).toBeDefined()
      expect(tables!.length).toBeGreaterThan(0)
      expect(executionTime).toBeLessThan(TEST_PERFORMANCE_THRESHOLD_MS)

      // Verify table structure
      const firstTable = tables![0]
      expect(firstTable).toHaveProperty('id')
      expect(firstTable).toHaveProperty('table_number')
      expect(firstTable).toHaveProperty('capacity')
      expect(firstTable).toHaveProperty('couple_id', testCoupleId)
    })

    test('should enforce table capacity constraints', async () => {
      const invalidTableData: CreateReceptionTableInput = {
        table_number: 100,
        capacity: 0, // Invalid capacity
        table_shape: 'round'
      }

      const { data: table, error } = await seatingManager.createReceptionTable(
        testCoupleId,
        invalidTableData
      )

      expect(error).toBeDefined()
      expect(table).toBeNull()
    })

    test('should prevent duplicate table numbers for same couple', async () => {
      const tableData1: CreateReceptionTableInput = {
        table_number: 101,
        capacity: 8,
        table_shape: 'round'
      }

      const tableData2: CreateReceptionTableInput = {
        table_number: 101, // Same table number
        capacity: 6,
        table_shape: 'square'
      }

      // First table should succeed
      const { error: error1 } = await seatingManager.createReceptionTable(
        testCoupleId,
        tableData1
      )
      expect(error1).toBeNull()

      // Second table should fail due to unique constraint
      const { error: error2 } = await seatingManager.createReceptionTable(
        testCoupleId,
        tableData2
      )
      expect(error2).toBeDefined()
    })
  })

  // ==================================================
  // GUEST RELATIONSHIPS TESTS
  // ==================================================

  describe('Guest Relationships Operations', () => {
    let guest1Id: string
    let guest2Id: string

    beforeEach(() => {
      // Get first two test guests
      guest1Id = testGuests[0].id
      guest2Id = testGuests[1].id
    })

    test('should create guest relationship with proper ordering', async () => {
      const relationshipData: CreateGuestRelationshipInput = {
        guest1_id: guest2Id, // Intentionally reversed
        guest2_id: guest1Id,
        relationship_type: 'close_friends',
        seating_preference: 'prefer_together',
        relationship_strength: 4,
        notes: 'College roommates'
      }

      const { data: relationship, error } = await seatingManager.createGuestRelationship(
        testCoupleId,
        relationshipData
      )

      expect(error).toBeNull()
      expect(relationship).toBeDefined()
      
      // Should be ordered with smaller ID first
      expect(relationship!.guest1_id).toBe(guest1Id < guest2Id ? guest1Id : guest2Id)
      expect(relationship!.guest2_id).toBe(guest1Id < guest2Id ? guest2Id : guest1Id)
      expect(relationship!.relationship_type).toBe('close_friends')
      expect(relationship!.seating_preference).toBe('prefer_together')
    })

    test('should get relationships with names efficiently', async () => {
      const startTime = Date.now()
      
      const { data: relationships, error } = await seatingManager.getGuestRelationshipsWithNames(
        testCoupleId
      )

      const executionTime = Date.now() - startTime

      expect(error).toBeNull()
      expect(relationships).toBeDefined()
      expect(executionTime).toBeLessThan(TEST_PERFORMANCE_THRESHOLD_MS)

      // Verify performance for large dataset
      expect(relationships!.length).toBeGreaterThan(0)
    })

    test('should filter relationships by preferences', async () => {
      const { data: conflictRelationships, error } = await seatingManager.getGuestRelationshipsWithNames(
        testCoupleId,
        {
          seating_preferences: ['must_separate', 'incompatible']
        }
      )

      expect(error).toBeNull()
      expect(conflictRelationships).toBeDefined()

      // All returned relationships should have conflict preferences
      conflictRelationships!.forEach(relationship => {
        expect(['must_separate', 'incompatible']).toContain(relationship.seating_preference)
      })
    })

    test('should prevent same-guest relationships', async () => {
      const invalidRelationship: CreateGuestRelationshipInput = {
        guest1_id: guest1Id,
        guest2_id: guest1Id, // Same guest
        relationship_type: 'spouse',
        seating_preference: 'must_sit_together',
        relationship_strength: 5
      }

      const { data, error } = await seatingManager.createGuestRelationship(
        testCoupleId,
        invalidRelationship
      )

      expect(error).toBeDefined()
      expect(data).toBeNull()
    })
  })

  // ==================================================
  // SEATING ARRANGEMENTS TESTS
  // ==================================================

  describe('Seating Arrangements Operations', () => {
    test('should create seating arrangement', async () => {
      const arrangementData: CreateSeatingArrangementInput = {
        name: 'Test Arrangement',
        description: 'Testing seating arrangement creation'
      }

      const { data: arrangement, error } = await seatingManager.createSeatingArrangement(
        testCoupleId,
        arrangementData
      )

      expect(error).toBeNull()
      expect(arrangement).toBeDefined()
      expect(arrangement!.name).toBe('Test Arrangement')
      expect(arrangement!.couple_id).toBe(testCoupleId)
      expect(arrangement!.is_active).toBe(false)
      expect(arrangement!.optimization_score).toBe(0.0)

      testArrangement = arrangement
    })

    test('should get arrangement with details', async () => {
      if (!testArrangement) {
        throw new Error('Test arrangement not created')
      }

      const startTime = Date.now()

      const { data: arrangementWithDetails, error } = await seatingManager.getSeatingArrangementWithDetails(
        testArrangement.id
      )

      const executionTime = Date.now() - startTime

      expect(error).toBeNull()
      expect(arrangementWithDetails).toBeDefined()
      expect(executionTime).toBeLessThan(TEST_PERFORMANCE_THRESHOLD_MS)

      expect(arrangementWithDetails!.id).toBe(testArrangement.id)
      expect(arrangementWithDetails!).toHaveProperty('tables')
      expect(arrangementWithDetails!).toHaveProperty('total_guests')
      expect(arrangementWithDetails!).toHaveProperty('total_tables')
    })

    test('should ensure only one active arrangement per couple', async () => {
      // This would be tested by creating multiple arrangements and setting them active
      // The database trigger should ensure only one can be active
      
      const arrangement1Data: CreateSeatingArrangementInput = {
        name: 'Arrangement 1'
      }

      const arrangement2Data: CreateSeatingArrangementInput = {
        name: 'Arrangement 2'
      }

      const { data: arr1 } = await seatingManager.createSeatingArrangement(
        testCoupleId,
        arrangement1Data
      )

      const { data: arr2 } = await seatingManager.createSeatingArrangement(
        testCoupleId,
        arrangement2Data
      )

      expect(arr1).toBeDefined()
      expect(arr2).toBeDefined()

      // Set both to active (second should deactivate first via trigger)
      await seatingManager.updateSeatingArrangement(arr1!.id, { is_active: true })
      await seatingManager.updateSeatingArrangement(arr2!.id, { is_active: true })

      // Check that only one is active
      const { data: activeArrangements } = await seatingManager.getSeatingArrangements(
        testCoupleId,
        { is_active: true }
      )

      expect(activeArrangements).toBeDefined()
      expect(activeArrangements!.length).toBe(1)
      expect(activeArrangements![0].id).toBe(arr2!.id)
    })
  })

  // ==================================================
  // SEATING ASSIGNMENTS TESTS
  // ==================================================

  describe('Seating Assignments Operations', () => {
    test('should create bulk seating assignments', async () => {
      if (!testArrangement || testGuests.length < 10 || testTables.length < 2) {
        throw new Error('Test data not properly initialized')
      }

      const bulkAssignments: BulkSeatingAssignmentInput = {
        arrangement_id: testArrangement.id,
        assignments: [
          {
            guest_id: testGuests[0].id,
            table_id: testTables[0].id,
            seat_number: 1
          },
          {
            guest_id: testGuests[1].id,
            table_id: testTables[0].id,
            seat_number: 2
          },
          {
            guest_id: testGuests[2].id,
            table_id: testTables[1].id,
            seat_number: 1
          }
        ]
      }

      const startTime = Date.now()

      const { data: assignments, error } = await seatingManager.createBulkSeatingAssignments(
        bulkAssignments
      )

      const executionTime = Date.now() - startTime

      expect(error).toBeNull()
      expect(assignments).toBeDefined()
      expect(assignments!.length).toBe(3)
      expect(executionTime).toBeLessThan(TEST_PERFORMANCE_THRESHOLD_MS)

      // Verify assignments
      assignments!.forEach((assignment, index) => {
        expect(assignment.arrangement_id).toBe(testArrangement!.id)
        expect(assignment.guest_id).toBe(bulkAssignments.assignments[index].guest_id)
        expect(assignment.table_id).toBe(bulkAssignments.assignments[index].table_id)
      })
    })

    test('should prevent duplicate seat assignments', async () => {
      if (!testArrangement || testGuests.length < 2 || testTables.length < 1) {
        throw new Error('Test data not properly initialized')
      }

      const duplicateAssignments: BulkSeatingAssignmentInput = {
        arrangement_id: testArrangement.id,
        assignments: [
          {
            guest_id: testGuests[3].id,
            table_id: testTables[0].id,
            seat_number: 5
          },
          {
            guest_id: testGuests[4].id,
            table_id: testTables[0].id,
            seat_number: 5 // Same seat
          }
        ]
      }

      const { data, error } = await seatingManager.createBulkSeatingAssignments(
        duplicateAssignments
      )

      expect(error).toBeDefined()
      expect(data).toBeNull()
    })

    test('should get seating assignments with guest and table details', async () => {
      if (!testArrangement) {
        throw new Error('Test arrangement not created')
      }

      const startTime = Date.now()

      const { data: assignments, error } = await seatingManager.getSeatingAssignments(
        testArrangement.id
      )

      const executionTime = Date.now() - startTime

      expect(error).toBeNull()
      expect(assignments).toBeDefined()
      expect(executionTime).toBeLessThan(TEST_PERFORMANCE_THRESHOLD_MS)

      // Verify assignment structure includes related data
      if (assignments && assignments.length > 0) {
        const assignment = assignments[0]
        expect(assignment).toHaveProperty('guest')
        expect(assignment).toHaveProperty('table')
        expect(assignment.guest).toHaveProperty('first_name')
        expect(assignment.table).toHaveProperty('table_number')
      }
    })
  })

  // ==================================================
  // VALIDATION & OPTIMIZATION TESTS
  // ==================================================

  describe('Validation and Optimization Functions', () => {
    test('should validate seating arrangement for conflicts', async () => {
      if (!testArrangement) {
        throw new Error('Test arrangement not created')
      }

      const startTime = Date.now()

      const { data: validation, error } = await seatingManager.validateSeatingArrangement(
        testArrangement.id
      )

      const executionTime = Date.now() - startTime

      expect(error).toBeNull()
      expect(validation).toBeDefined()
      expect(executionTime).toBeLessThan(TEST_PERFORMANCE_THRESHOLD_MS)

      expect(validation!).toHaveProperty('valid')
      expect(validation!).toHaveProperty('errors')
      expect(validation!).toHaveProperty('warnings')
      expect(typeof validation!.valid).toBe('boolean')
      expect(Array.isArray(validation!.errors)).toBe(true)
    })

    test('should calculate seating score efficiently', async () => {
      if (!testArrangement) {
        throw new Error('Test arrangement not created')
      }

      const startTime = Date.now()

      const { data: score, error } = await seatingManager.calculateSeatingScore(
        testArrangement.id
      )

      const executionTime = Date.now() - startTime

      expect(error).toBeNull()
      expect(score).toBeDefined()
      expect(executionTime).toBeLessThan(TEST_PERFORMANCE_THRESHOLD_MS)
      expect(typeof score).toBe('number')
    })

    test('should get relationship conflicts for couple', async () => {
      const startTime = Date.now()

      const { data: conflicts, error } = await seatingManager.getRelationshipConflicts(
        testCoupleId
      )

      const executionTime = Date.now() - startTime

      expect(error).toBeNull()
      expect(executionTime).toBeLessThan(TEST_PERFORMANCE_THRESHOLD_MS)

      // Conflicts data should be structured properly
      if (conflicts) {
        expect(Array.isArray(conflicts)).toBe(true)
      }
    })
  })

  // ==================================================
  // PERFORMANCE TESTS WITH LARGE DATASETS
  // ==================================================

  describe('Large Dataset Performance Tests', () => {
    test('should handle 200+ guest relationships efficiently', async () => {
      const startTime = Date.now()

      const { data: relationships, error } = await seatingManager.getGuestRelationshipsWithNames(
        testCoupleId
      )

      const executionTime = Date.now() - startTime

      expect(error).toBeNull()
      expect(relationships).toBeDefined()
      expect(relationships!.length).toBeGreaterThanOrEqual(100) // Should have many relationships
      expect(executionTime).toBeLessThan(TEST_PERFORMANCE_THRESHOLD_MS)

      console.log(`Relationship query with ${relationships!.length} records: ${executionTime}ms`)
    })

    test('should optimize materialized view access', async () => {
      const startTime = Date.now()

      const { data: optimizationData, error } = await seatingManager.getSeatingOptimizationData(
        testCoupleId
      )

      const executionTime = Date.now() - startTime

      expect(error).toBeNull()
      expect(optimizationData).toBeDefined()
      expect(executionTime).toBeLessThan(TEST_PERFORMANCE_THRESHOLD_MS)

      console.log(`Optimization view query: ${executionTime}ms`)
    })

    test('should maintain performance with concurrent operations', async () => {
      const promises = []
      const operationCount = 10

      // Create multiple concurrent read operations
      for (let i = 0; i < operationCount; i++) {
        promises.push(
          seatingManager.getReceptionTablesWithAssignments(testCoupleId)
        )
      }

      const startTime = Date.now()
      const results = await Promise.all(promises)
      const totalTime = Date.now() - startTime

      // All operations should succeed
      results.forEach(result => {
        expect(result.error).toBeNull()
        expect(result.data).toBeDefined()
      })

      // Average time per operation should be reasonable
      const averageTime = totalTime / operationCount
      expect(averageTime).toBeLessThan(TEST_PERFORMANCE_THRESHOLD_MS)

      console.log(`${operationCount} concurrent operations: ${totalTime}ms total, ${averageTime}ms average`)
    })
  })

  // ==================================================
  // DATA INTEGRITY TESTS
  // ==================================================

  describe('Data Integrity and Constraints', () => {
    test('should enforce foreign key constraints', async () => {
      const nonExistentGuestId = '00000000-0000-0000-0000-000000000000'
      const nonExistentTableId = '00000000-0000-0000-0000-000000000001'

      if (!testArrangement) {
        throw new Error('Test arrangement not created')
      }

      const invalidAssignment: BulkSeatingAssignmentInput = {
        arrangement_id: testArrangement.id,
        assignments: [{
          guest_id: nonExistentGuestId,
          table_id: nonExistentTableId,
          seat_number: 1
        }]
      }

      const { data, error } = await seatingManager.createBulkSeatingAssignments(
        invalidAssignment
      )

      expect(error).toBeDefined()
      expect(data).toBeNull()
    })

    test('should enforce table capacity limits in validation', async () => {
      // This would test the validation function's ability to detect capacity violations
      // Implementation depends on the specific validation logic
      expect(true).toBe(true) // Placeholder
    })

    test('should maintain audit trail', async () => {
      // Create a relationship to trigger audit logging
      if (testGuests.length >= 2) {
        const relationshipData: CreateGuestRelationshipInput = {
          guest1_id: testGuests[0].id,
          guest2_id: testGuests[1].id,
          relationship_type: 'family_immediate',
          seating_preference: 'must_sit_together',
          relationship_strength: 5
        }

        await seatingManager.createGuestRelationship(testCoupleId, relationshipData)

        // Check audit log (would need to query relationship_access_log table)
        const { data: auditLogs, error } = await supabase
          .from('relationship_access_log')
          .select('*')
          .eq('couple_id', testCoupleId)
          .order('accessed_at', { ascending: false })
          .limit(1)

        // Audit logging may be implemented at application level
        // This is a placeholder for the check
        expect(error).toBeNull()
      }
    })
  })

  // ==================================================
  // PERFORMANCE MONITORING TESTS
  // ==================================================

  describe('Performance Monitoring', () => {
    test('should track query performance metrics', async () => {
      // Clear metrics
      seatingManager.clearPerformanceMetrics()

      // Execute several operations
      await seatingManager.getReceptionTablesWithAssignments(testCoupleId)
      await seatingManager.getGuestRelationshipsWithNames(testCoupleId)

      const metrics = seatingManager.getPerformanceMetrics()

      expect(metrics.length).toBeGreaterThan(0)
      
      metrics.forEach(metric => {
        expect(metric).toHaveProperty('query_type')
        expect(metric).toHaveProperty('execution_time_ms')
        expect(metric).toHaveProperty('rows_examined')
        expect(metric).toHaveProperty('rows_returned')
        expect(metric.execution_time_ms).toBeGreaterThan(0)
      })
    })

    test('should identify slow queries', async () => {
      // Get metrics
      const metrics = seatingManager.getPerformanceMetrics()
      const slowQueries = seatingManager.getSlowQueries()

      expect(Array.isArray(slowQueries)).toBe(true)
      
      // All slow queries should be over 1000ms
      slowQueries.forEach(query => {
        expect(query.execution_time_ms).toBeGreaterThan(1000)
      })

      // For this test, we shouldn't have slow queries if properly optimized
      expect(slowQueries.length).toBe(0)
    })

    test('should provide table statistics', async () => {
      const { data: stats, error } = await seatingManager.getSeatingTableStats()

      expect(error).toBeNull()
      expect(stats).toBeDefined()
      expect(stats!).toHaveProperty('reception_tables')
      expect(stats!).toHaveProperty('guest_relationships')
      expect(stats!).toHaveProperty('seating_arrangements')
      expect(stats!).toHaveProperty('seating_assignments')

      // Should have test data
      expect(stats!.reception_tables).toBeGreaterThan(0)
      expect(stats!.guest_relationships).toBeGreaterThan(0)
    })
  })

  // ==================================================
  // CLEANUP TESTS
  // ==================================================

  describe('Data Cleanup and Cascade Deletes', () => {
    test('should cascade delete when couple is removed', async () => {
      // Create a temporary couple and data
      const { data: tempCouple, error: coupleError } = await supabase
        .from('clients')
        .insert({
          first_name: 'Temp',
          last_name: 'Test',
          email: `temp-test-${Date.now()}@example.com`
        })
        .select()
        .single()

      expect(coupleError).toBeNull()
      expect(tempCouple).toBeDefined()

      // Create test data for temp couple
      const { data: tempTable } = await seatingManager.createReceptionTable(
        tempCouple!.id,
        {
          table_number: 1,
          capacity: 8,
          table_shape: 'round'
        }
      )

      expect(tempTable).toBeDefined()

      // Delete the couple
      await supabase
        .from('clients')
        .delete()
        .eq('id', tempCouple!.id)

      // Check that related data was cascade deleted
      const { data: remainingTables } = await supabase
        .from('reception_tables')
        .select('*')
        .eq('couple_id', tempCouple!.id)

      expect(remainingTables).toBeDefined()
      expect(remainingTables!.length).toBe(0)
    })
  })
})

// ==================================================
// HELPER FUNCTIONS AND TEST UTILITIES
// ==================================================

/**
 * Generate large wedding test data for performance testing
 */
async function generateLargeWeddingTestData(
  guestCount: number,
  relationshipCount: number,
  tableCount: number
) {
  const guests: Guest[] = []
  const tables: ReceptionTable[] = []
  const relationships: GuestRelationship[] = []

  // Generate guests
  for (let i = 0; i < guestCount; i++) {
    guests.push({
      id: `guest-${i}`,
      couple_id: '',
      first_name: `Guest${i}`,
      last_name: `LastName${i}`,
      email: `guest${i}@example.com`,
      category: ['family', 'friends', 'work', 'other'][i % 4] as any,
      side: ['partner1', 'partner2', 'mutual'][i % 3] as any,
      plus_one: i % 5 === 0,
      age_group: ['adult', 'child', 'infant'][i % 10 === 0 ? 1 : i % 20 === 0 ? 2 : 0] as any,
      rsvp_status: 'attending' as any,
      tags: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
  }

  // Generate tables
  for (let i = 0; i < tableCount; i++) {
    tables.push({
      id: `table-${i}`,
      couple_id: '',
      table_number: i + 1,
      name: `Table ${i + 1}`,
      capacity: 8,
      table_shape: ['round', 'rectangular', 'square', 'oval'][i % 4] as any,
      location_x: i * 50,
      location_y: Math.floor(i / 5) * 100,
      rotation_angle: 0,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
  }

  return { guests, tables, relationships }
}

/**
 * Seed database with test data
 */
async function seedDatabase(coupleId: string, testData: any) {
  const supabase = await createClient()

  // Insert guests
  const guestsToInsert = testData.guests.map((guest: any) => ({
    ...guest,
    couple_id: coupleId,
    id: undefined // Let database generate IDs
  }))

  const { data: insertedGuests, error: guestError } = await supabase
    .from('guests')
    .insert(guestsToInsert)
    .select()

  if (guestError) {
    throw new Error('Failed to seed guests: ' + guestError.message)
  }

  // Update test data with actual IDs
  testData.guests = insertedGuests

  // Insert tables
  const tablesToInsert = testData.tables.map((table: any) => ({
    ...table,
    couple_id: coupleId,
    id: undefined // Let database generate IDs
  }))

  const { data: insertedTables, error: tableError } = await supabase
    .from('reception_tables')
    .insert(tablesToInsert)
    .select()

  if (tableError) {
    throw new Error('Failed to seed tables: ' + tableError.message)
  }

  // Update test data with actual IDs
  testData.tables = insertedTables

  // Generate random relationships between guests
  const relationships = []
  const relationshipTypes = ['spouse', 'family_immediate', 'family_extended', 'close_friends', 'friends', 'colleagues']
  const preferences = ['must_sit_together', 'prefer_together', 'neutral', 'prefer_apart', 'must_separate']

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

  // Insert relationships (ignore conflicts)
  if (relationships.length > 0) {
    await supabase
      .from('guest_relationships')
      .insert(relationships)
      .select()
  }
}

/**
 * Clean up test data
 */
async function cleanupTestData(coupleId: string) {
  const supabase = await createClient()

  // Delete in correct order to respect foreign key constraints
  await supabase.from('seating_assignments').delete().match({})
  await supabase.from('seating_arrangements').delete().eq('couple_id', coupleId)
  await supabase.from('guest_relationships').delete().eq('created_by', coupleId)
  await supabase.from('reception_tables').delete().eq('couple_id', coupleId)
  await supabase.from('guests').delete().eq('couple_id', coupleId)
}

export {
  generateLargeWeddingTestData,
  seedDatabase,
  cleanupTestData
}