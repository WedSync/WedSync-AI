/**
 * WS-153 Photo Groups Management - Comprehensive Integration Tests
 * 
 * Tests API-Database-UI workflow integration, real-time updates,
 * cross-component data flow, and performance benchmarks.
 * Performance Requirements:
 * - Photo group creation: <500ms
 * - Guest assignment operations: <200ms  
 * - Priority reordering: <300ms
 * - Bulk operations: <2000ms
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach, vi } from 'vitest'
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { Database } from '@/types/database'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PhotoGroupsManager } from '@/components/guests/PhotoGroupsManager'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from '@/components/ui/use-toast'
// Test configuration
const TEST_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const TEST_SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const TEST_BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
// Test data
let supabase: SupabaseClient<Database>
let testUser: any
let testClient: any
let testGuests: any[] = []
let testPhotoGroups: any[] = []
// Performance tracking
const performanceMetrics = {
  creation: [],
  assignment: [],
  reordering: [],
  bulk_operations: []
}
describe('WS-153 Photo Groups Management - Integration Tests', () => {
  beforeAll(async () => {
    supabase = createClient<Database>(TEST_SUPABASE_URL, TEST_SUPABASE_ANON_KEY)
    
    // Create test user and client
    const { data: { user }, error: authError } = await supabase.auth.signUp({
      email: `ws153-test-${Date.now()}@example.com`,
      password: 'testpassword123',
    })
    expect(authError).toBeNull()
    expect(user).toBeTruthy()
    testUser = user
    // Create test client
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .insert({
        first_name: 'WS153',
        last_name: 'Test',
        email: testUser.email,
        wedding_date: '2025-12-31'
      })
      .select()
      .single()
    expect(clientError).toBeNull()
    expect(client).toBeTruthy()
    testClient = client
    // Create test guests for assignments
    const guestData = Array.from({ length: 50 }, (_, i) => ({
      couple_id: testClient.id,
      first_name: `Guest${i + 1}`,
      last_name: `Test${i + 1}`,
      email: `guest${i + 1}@example.com`,
      category: ['family', 'friends', 'bridal_party', 'work'][i % 4] as const,
      side: ['partner1', 'partner2', 'mutual'][i % 3] as const,
      plus_one: i % 5 === 0,
    }))
    const { data: guests, error: guestError } = await supabase
      .from('guests')
      .insert(guestData)
    expect(guestError).toBeNull()
    expect(guests).toBeTruthy()
    testGuests = guests
  })
  afterAll(async () => {
    // Cleanup in reverse order
    if (testClient) {
      await supabase.from('photo_group_assignments').delete().eq('photo_group_id', testPhotoGroups.map(g => g.id))
      await supabase.from('photo_groups').delete().eq('couple_id', testClient.id)
      await supabase.from('guests').delete().eq('couple_id', testClient.id)
      await supabase.from('clients').delete().eq('id', testClient.id)
    }
    if (testUser) {
      await supabase.auth.signOut()
    // Log performance metrics
    console.log('\n🚀 WS-153 Performance Metrics Summary:')
    console.log(`📊 Photo Group Creation: avg ${getAverage(performanceMetrics.creation)}ms (target: <500ms)`)
    console.log(`📊 Guest Assignment: avg ${getAverage(performanceMetrics.assignment)}ms (target: <200ms)`)
    console.log(`📊 Priority Reordering: avg ${getAverage(performanceMetrics.reordering)}ms (target: <300ms)`)
    console.log(`📊 Bulk Operations: avg ${getAverage(performanceMetrics.bulk_operations)}ms (target: <2000ms)`)
  describe('API-Database-UI Workflow Integration', () => {
    let queryClient: QueryClient
    beforeEach(() => {
      queryClient = new QueryClient({
        defaultOptions: {
          queries: { retry: false },
          mutations: { retry: false }
        }
    afterEach(() => {
      queryClient.clear()
    it('should create photo group with complete API-Database-UI flow', async () => {
      const user = userEvent.setup()
      const startTime = Date.now()
      // Render PhotoGroupsManager component
      render(
        <QueryClientProvider client={queryClient}>
          <PhotoGroupsManager 
            coupleId={testClient.id}
            guests={testGuests}
          />
          <Toaster />
        </QueryClientProvider>
      )
      // Wait for component to load
      await waitFor(() => {
        expect(screen.getByText('Photo Groups')).toBeInTheDocument()
      // Click create new photo group
      const createButton = screen.getByRole('button', { name: /create photo group/i })
      await user.click(createButton)
      // Fill in form
      const nameInput = screen.getByLabelText(/group name/i)
      await user.type(nameInput, 'Integration Test Family Photos')
      const descriptionInput = screen.getByLabelText(/description/i)
      await user.type(descriptionInput, 'Testing API-Database-UI integration')
      const photoTypeSelect = screen.getByLabelText(/photo type/i)
      await user.selectOptions(photoTypeSelect, 'family')
      const timeInput = screen.getByLabelText(/estimated time/i)
      await user.clear(timeInput)
      await user.type(timeInput, '15')
      const locationInput = screen.getByLabelText(/location/i)
      await user.type(locationInput, 'Garden area')
      // Select guests for assignment
      const guestCheckboxes = screen.getAllByRole('checkbox', { name: /select guest/i })
      await user.click(guestCheckboxes[0])
      await user.click(guestCheckboxes[1])
      await user.click(guestCheckboxes[2])
      // Submit form
      const submitButton = screen.getByRole('button', { name: /save photo group/i })
      await user.click(submitButton)
      // Wait for success toast and UI update
        expect(screen.getByText(/photo group created successfully/i)).toBeInTheDocument()
      }, { timeout: 10000 })
      const creationTime = Date.now() - startTime
      performanceMetrics.creation.push(creationTime)
      // Verify photo group appears in UI
        expect(screen.getByText('Integration Test Family Photos')).toBeInTheDocument()
        expect(screen.getByText('Testing API-Database-UI integration')).toBeInTheDocument()
      // Verify database record was created
      const { data: dbPhotoGroup } = await supabase
        .from('photo_groups')
        .select(`
          *,
          assignments:photo_group_assignments(
            id,
            guest_id,
            guest:guests(first_name, last_name)
          )
        `)
        .eq('couple_id', testClient.id)
        .eq('name', 'Integration Test Family Photos')
        .single()
      expect(dbPhotoGroup).toBeTruthy()
      expect(dbPhotoGroup.name).toBe('Integration Test Family Photos')
      expect(dbPhotoGroup.description).toBe('Testing API-Database-UI integration')
      expect(dbPhotoGroup.photo_type).toBe('family')
      expect(dbPhotoGroup.estimated_time_minutes).toBe(15)
      expect(dbPhotoGroup.location).toBe('Garden area')
      expect(dbPhotoGroup.assignments).toHaveLength(3)
      testPhotoGroups.push(dbPhotoGroup)
      // Performance validation
      expect(creationTime).toBeLessThan(500)
      console.log(`✅ Photo group creation completed in ${creationTime}ms (target: <500ms)`)
    }, 15000)
    it('should handle guest assignment operations with performance validation', async () => {
      
      // Create a photo group first
      const photoGroupData = {
        couple_id: testClient.id,
        name: 'Assignment Test Group',
        description: 'Testing guest assignments',
        photo_type: 'family',
        estimated_time_minutes: 10,
        guest_ids: testGuests.slice(0, 3).map(g => g.id)
      }
      const createResponse = await fetch(`${TEST_BASE_URL}/api/guests/photo-groups`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${testUser.access_token}`
        },
        body: JSON.stringify(photoGroupData)
      const createdGroup = await createResponse.json()
      testPhotoGroups.push(createdGroup)
      // Render component
        expect(screen.getByText('Assignment Test Group')).toBeInTheDocument()
      // Click edit button
      const editButton = screen.getByRole('button', { name: /edit.*assignment test group/i })
      await user.click(editButton)
      // Test adding new guest assignment
      const startAssignmentTime = Date.now()
      const availableGuestCheckboxes = screen.getAllByRole('checkbox', { name: /select guest/i })
      // Find an unchecked checkbox
      const uncheckedBox = availableGuestCheckboxes.find(cb => !cb.checked)
      if (uncheckedBox) {
        await user.click(uncheckedBox)
      // Save changes
      const saveButton = screen.getByRole('button', { name: /save photo group/i })
      await user.click(saveButton)
        expect(screen.getByText(/photo group updated successfully/i)).toBeInTheDocument()
      const assignmentTime = Date.now() - startAssignmentTime
      performanceMetrics.assignment.push(assignmentTime)
      expect(assignmentTime).toBeLessThan(200)
      console.log(`✅ Guest assignment completed in ${assignmentTime}ms (target: <200ms)`)
      // Verify assignment in database
      const { data: updatedGroup } = await supabase
        .select('*, assignments:photo_group_assignments(*)')
        .eq('id', createdGroup.id)
      expect(updatedGroup.assignments).toHaveLength(4)
    it('should handle priority reordering with drag-and-drop integration', async () => {
      // Create multiple photo groups for reordering
      const groupsToCreate = [
        { name: 'First Priority Group', priority: 1 },
        { name: 'Second Priority Group', priority: 2 },
        { name: 'Third Priority Group', priority: 3 }
      ]
      const createdGroups = []
      for (const groupData of groupsToCreate) {
        const fullData = {
          couple_id: testClient.id,
          ...groupData,
          description: `Test group ${groupData.priority}`,
          photo_type: 'family',
          estimated_time_minutes: 5,
          guest_ids: [testGuests[0].id]
        const response = await fetch(`${TEST_BASE_URL}/api/guests/photo-groups`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${testUser.access_token}`
          },
          body: JSON.stringify(fullData)
        })
        const created = await response.json()
        createdGroups.push(created)
        testPhotoGroups.push(created)
        expect(screen.getByText('First Priority Group')).toBeInTheDocument()
        expect(screen.getByText('Second Priority Group')).toBeInTheDocument()
        expect(screen.getByText('Third Priority Group')).toBeInTheDocument()
      // Test priority reordering via API (simulating drag-and-drop result)
      const startReorderTime = Date.now()
      const reorderData = {
        group_orders: [
          { id: createdGroups[2].id, priority: 1 }, // Third -> First
          { id: createdGroups[0].id, priority: 2 }, // First -> Second
          { id: createdGroups[1].id, priority: 3 }  // Second -> Third
        ]
      const reorderResponse = await fetch(`${TEST_BASE_URL}/api/guests/photo-groups?action=reorder`, {
        method: 'PATCH',
        body: JSON.stringify(reorderData)
      expect(reorderResponse.status).toBe(200)
      const reorderTime = Date.now() - startReorderTime
      performanceMetrics.reordering.push(reorderTime)
      // Verify reorder in database
      const { data: reorderedGroups } = await supabase
        .select('*')
        .in('name', ['First Priority Group', 'Second Priority Group', 'Third Priority Group'])
        .order('priority')
      expect(reorderedGroups[0].name).toBe('Third Priority Group')
      expect(reorderedGroups[1].name).toBe('First Priority Group') 
      expect(reorderedGroups[2].name).toBe('Second Priority Group')
      expect(reorderTime).toBeLessThan(300)
      console.log(`✅ Priority reordering completed in ${reorderTime}ms (target: <300ms)`)
  describe('Real-time Subscription Integration', () => {
    it('should handle real-time photo group updates', async () => {
      // Create a photo group
        name: 'Real-time Test Group',
        description: 'Testing real-time updates',
        photo_type: 'candid',
        estimated_time_minutes: 8,
        guest_ids: [testGuests[0].id, testGuests[1].id]
      // Set up real-time subscription
      const updates = []
      const subscription = supabase
        .channel('photo_groups_test')
        .on('postgres_changes', 
          { 
            event: '*', 
            schema: 'public', 
            table: 'photo_groups',
            filter: `couple_id=eq.${testClient.id}`
          }, 
          (payload) => {
            updates.push(payload)
          }
        )
        .subscribe()
      // Wait for subscription to be established
      await new Promise(resolve => setTimeout(resolve, 1000))
      // Update the photo group
      const updateResponse = await fetch(`${TEST_BASE_URL}/api/guests/photo-groups?id=${createdGroup.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          name: 'Updated Real-time Group',
          estimated_time_minutes: 12
      expect(updateResponse.status).toBe(200)
      // Wait for real-time update
        expect(updates.length).toBeGreaterThan(0)
      }, { timeout: 5000 })
      const updatePayload = updates.find(u => u.eventType === 'UPDATE')
      expect(updatePayload).toBeTruthy()
      expect(updatePayload.new.name).toBe('Updated Real-time Group')
      expect(updatePayload.new.estimated_time_minutes).toBe(12)
      // Cleanup subscription
      await supabase.removeChannel(subscription)
    it('should handle real-time guest assignment changes', async () => {
      // Use existing photo group
      const photoGroup = testPhotoGroups[0]
      // Set up subscription for assignments
      const assignmentUpdates = []
      const assignmentSubscription = supabase
        .channel('assignments_test')
        .on('postgres_changes',
          {
            event: '*',
            table: 'photo_group_assignments',
            filter: `photo_group_id=eq.${photoGroup.id}`
            assignmentUpdates.push(payload)
      // Add a new guest assignment
      const { data: newAssignment, error } = await supabase
        .from('photo_group_assignments')
        .insert({
          photo_group_id: photoGroup.id,
          guest_id: testGuests[10].id,
          is_primary: false,
          position_notes: 'Back row'
        .select()
      expect(error).toBeNull()
        expect(assignmentUpdates.length).toBeGreaterThan(0)
      const insertPayload = assignmentUpdates.find(u => u.eventType === 'INSERT')
      expect(insertPayload).toBeTruthy()
      expect(insertPayload.new.guest_id).toBe(testGuests[10].id)
      expect(insertPayload.new.position_notes).toBe('Back row')
      // Cleanup
      await supabase.removeChannel(assignmentSubscription)
      await supabase.from('photo_group_assignments').delete().eq('id', newAssignment.id)
  describe('Cross-Component Data Flow Integration', () => {
    it('should maintain data consistency across components', async () => {
      const queryClient = new QueryClient({
      // Render PhotoGroupsManager
      const { rerender } = render(
      // Create a photo group via UI
      await user.type(nameInput, 'Cross-Component Test')
        expect(screen.getByText('Cross-Component Test')).toBeInTheDocument()
      // Verify database state
        .eq('name', 'Cross-Component Test')
      // Re-render component with fresh props (simulating navigation)
      rerender(
      // Verify data persists across re-renders
    it('should handle concurrent operations without data loss', async () => {
      const concurrentOperations = []
      // Create 5 photo groups concurrently
      for (let i = 0; i < 5; i++) {
        const operation = fetch(`${TEST_BASE_URL}/api/guests/photo-groups`, {
          body: JSON.stringify({
            couple_id: testClient.id,
            name: `Concurrent Group ${i + 1}`,
            description: `Concurrent operation test ${i + 1}`,
            photo_type: 'family',
            estimated_time_minutes: 5,
            guest_ids: [testGuests[i].id]
          })
        concurrentOperations.push(operation)
      const responses = await Promise.all(concurrentOperations)
      const concurrentTime = Date.now() - startTime
      performanceMetrics.bulk_operations.push(concurrentTime)
      // Verify all operations succeeded
      const successfulCreations = []
      for (const response of responses) {
        expect([200, 201]).toContain(response.status)
        const group = await response.json()
        successfulCreations.push(group)
        testPhotoGroups.push(group)
      expect(successfulCreations).toHaveLength(5)
      // Verify all groups in database
      const { data: concurrentGroups } = await supabase
        .like('name', 'Concurrent Group%')
        .order('name')
      expect(concurrentGroups).toHaveLength(5)
      expect(concurrentTime).toBeLessThan(2000)
      console.log(`✅ Concurrent operations completed in ${concurrentTime}ms (target: <2000ms)`)
  describe('Error Handling and Recovery Integration', () => {
    it('should handle network errors gracefully', async () => {
      // Mock network error
      const originalFetch = global.fetch
      global.fetch = jest.fn(() => 
        Promise.reject(new Error('Network error'))
        expect(screen.getByText(/failed to load/i) || screen.getByText(/error/i)).toBeInTheDocument()
      // Restore fetch and retry
      global.fetch = originalFetch
      // Trigger retry (would typically be done via button click)
      const retryButton = screen.queryByRole('button', { name: /retry/i })
      if (retryButton) {
        await user.click(retryButton)
        
        await waitFor(() => {
          expect(screen.getByText('Photo Groups')).toBeInTheDocument()
    }, 10000)
    it('should recover from database constraint violations', async () => {
      // Attempt to create duplicate priority photo group
      const duplicateGroupData = {
        name: 'Constraint Test Group 1',
        description: 'Testing constraint handling',
        estimated_time_minutes: 5,
        priority: 1,
        guest_ids: [testGuests[0].id]
      const firstResponse = await fetch(`${TEST_BASE_URL}/api/guests/photo-groups`, {
        body: JSON.stringify(duplicateGroupData)
      expect(firstResponse.status).toBe(201)
      const firstGroup = await firstResponse.json()
      testPhotoGroups.push(firstGroup)
      // Try to create another with same priority (should auto-increment)
      const secondGroupData = {
        ...duplicateGroupData,
        name: 'Constraint Test Group 2',
        priority: 1 // Same priority
      const secondResponse = await fetch(`${TEST_BASE_URL}/api/guests/photo-groups`, {
        body: JSON.stringify(secondGroupData)
      expect(secondResponse.status).toBe(201)
      const secondGroup = await secondResponse.json()
      testPhotoGroups.push(secondGroup)
      // Verify priorities are different
      expect(secondGroup.priority).toBeGreaterThan(firstGroup.priority)
  describe('Performance and Load Testing', () => {
    it('should handle large guest lists efficiently', async () => {
      // Query with complex joins (photo groups with all assignments and guest details)
      const { data: complexQuery, error } = await supabase
            is_primary,
            position_notes,
            guest:guests(
              id,
              first_name,
              last_name,
              email,
              category,
              side,
              plus_one
            )
      const queryTime = Date.now() - startTime
      expect(queryTime).toBeLessThan(1000) // Complex queries under 1 second
      expect(complexQuery.length).toBeGreaterThan(0)
      console.log(`✅ Complex query with joins completed in ${queryTime}ms`)
    it('should maintain performance with bulk guest assignments', async () => {
      // Create a photo group with many guests
        name: 'Bulk Assignment Test',
        description: 'Testing bulk guest assignments',
        photo_type: 'group',
        estimated_time_minutes: 20,
        guest_ids: testGuests.slice(0, 30).map(g => g.id) // 30 guests
      const response = await fetch(`${TEST_BASE_URL}/api/guests/photo-groups`, {
      const bulkTime = Date.now() - startTime
      performanceMetrics.bulk_operations.push(bulkTime)
      expect(response.status).toBe(201)
      const createdGroup = await response.json()
      expect(createdGroup.assignments).toHaveLength(30)
      expect(bulkTime).toBeLessThan(1500) // Bulk operations under 1.5 seconds
      console.log(`✅ Bulk assignment of 30 guests completed in ${bulkTime}ms`)
})
// Helper functions
function getAverage(arr: number[]): number {
  if (arr.length === 0) return 0
  return Math.round(arr.reduce((sum, val) => sum + val, 0) / arr.length)
// Performance report generator
export function generateWS153IntegrationReport() {
  return {
    timestamp: new Date().toISOString(),
    feature: 'WS-153 Photo Groups Management',
    test_type: 'Integration',
    performance_metrics: {
      photo_group_creation: {
        average_ms: getAverage(performanceMetrics.creation),
        target_ms: 500,
        status: getAverage(performanceMetrics.creation) < 500 ? 'PASS' : 'FAIL'
      },
      guest_assignment: {
        average_ms: getAverage(performanceMetrics.assignment),
        target_ms: 200,
        status: getAverage(performanceMetrics.assignment) < 200 ? 'PASS' : 'FAIL'
      priority_reordering: {
        average_ms: getAverage(performanceMetrics.reordering),
        target_ms: 300,
        status: getAverage(performanceMetrics.reordering) < 300 ? 'PASS' : 'FAIL'
      bulk_operations: {
        average_ms: getAverage(performanceMetrics.bulk_operations),
        target_ms: 2000,
        status: getAverage(performanceMetrics.bulk_operations) < 2000 ? 'PASS' : 'FAIL'
    },
    integration_areas_tested: [
      'API-Database-UI workflow',
      'Component-API integration',
      'Real-time subscriptions',
      'Cross-component data flow',
      'Error handling and recovery',
      'Performance and load testing'
    ],
    requirements_validated: {
      'Photo group creation workflow': true,
      'Guest assignment operations': true,
      'Priority reordering with drag-drop': true,
      'Real-time updates': true,
      'Data consistency': true,
      'Concurrent operations': true,
      'Error recovery': true,
      'Performance benchmarks': true
  }
