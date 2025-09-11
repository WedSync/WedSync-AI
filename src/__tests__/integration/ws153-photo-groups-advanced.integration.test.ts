/**
 * WS-153 Photo Groups Management - Advanced API Integration Tests
 * Testing all 6 advanced APIs with real-time capabilities
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from '@jest/testing-library/jest-dom'
import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll, Mock } from 'vitest';
import { createClient } from '@supabase/supabase-js'
import { NextRequest } from 'next/server'
import { POST as realtimePost, GET as realtimeGet } from '@/app/api/photo-groups/realtime/[id]/route'
import { POST as conflictPost } from '@/app/api/photo-groups/conflicts/detect/route'
import { POST as optimizePost } from '@/app/api/photo-groups/schedule/optimize/route'
import { POST as batchPost, PUT as batchPut } from '@/app/api/photo-groups/batch/route'
import { GET as analyticsGet } from '@/app/api/photo-groups/analytics/[coupleId]/route'
import { POST as calendarPost, GET as calendarGet } from '@/app/api/photo-groups/calendar/sync/route'
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)
describe('WS-153 Photo Groups Advanced API Integration Tests', () => {
  let testCoupleId: string
  let testWeddingId: string
  let testPhotoGroupId: string
  let testUserId: string
  beforeAll(async () => {
    // Set up test data
    const { data: userData, error: userError } = await supabase
      .from('user_profiles')
      .insert({
        id: 'test-user-ws153',
        email: 'test-ws153@wedsync.com',
        full_name: 'Test User WS153',
        user_type: 'couple'
      })
      .select()
      .single()
    if (userError) console.warn('User creation warning:', userError)
    testUserId = 'test-user-ws153'
    const { data: weddingData } = await supabase
      .from('weddings')
        id: 'test-wedding-ws153',
        couple_id: testUserId,
        wedding_date: '2025-08-15',
        venue_name: 'Test Venue WS153'
    testWeddingId = 'test-wedding-ws153'
    testCoupleId = testUserId
    const { data: photoGroupData } = await supabase
      .from('photo_groups')
        id: 'test-photo-group-ws153',
        wedding_id: testWeddingId,
        name: 'Test Photo Group WS153',
        type: 'family',
        scheduled_start: '2025-08-15T14:00:00Z',
        scheduled_end: '2025-08-15T14:30:00Z',
        status: 'pending'
    testPhotoGroupId = 'test-photo-group-ws153'
  })
  afterAll(async () => {
    // Clean up test data
    await supabase.from('photo_groups').delete().match({ id: testPhotoGroupId })
    await supabase.from('weddings').delete().match({ id: testWeddingId })
    await supabase.from('user_profiles').delete().match({ id: testUserId })
  describe('Real-time Collaboration API', () => {
    it('should handle session joining and leaving', async () => {
      const joinRequest = new NextRequest('http://localhost:3000/api/photo-groups/realtime/test-photo-group-ws153', {
        method: 'POST',
        body: JSON.stringify({
          action: 'join',
          session_id: 'session-1',
          user_id: testUserId,
          user_name: 'Test User'
        })
      const joinResponse = await realtimePost(joinRequest, { params: { id: testPhotoGroupId } })
      const joinData = await joinResponse.json()
      expect(joinResponse.status).toBe(200)
      expect(joinData.success).toBe(true)
      expect(joinData.data.session_id).toBe('session-1')
      expect(joinData.data.active_users).toContain('Test User')
      // Test leaving session
      const leaveRequest = new NextRequest('http://localhost:3000/api/photo-groups/realtime/test-photo-group-ws153', {
          action: 'leave',
          session_id: 'session-1'
      const leaveResponse = await realtimePost(leaveRequest, { params: { id: testPhotoGroupId } })
      const leaveData = await leaveResponse.json()
      expect(leaveResponse.status).toBe(200)
      expect(leaveData.success).toBe(true)
    })
    it('should handle cursor updates and field editing', async () => {
      // Join session first
          session_id: 'session-2',
      await realtimePost(joinRequest, { params: { id: testPhotoGroupId } })
      // Test cursor update
      const cursorRequest = new NextRequest('http://localhost:3000/api/photo-groups/realtime/test-photo-group-ws153', {
          action: 'cursor_update',
          cursor_position: { x: 100, y: 200 },
          field_name: 'description'
      const cursorResponse = await realtimePost(cursorRequest, { params: { id: testPhotoGroupId } })
      expect(cursorResponse.status).toBe(200)
      // Test field editing
      const editRequest = new NextRequest('http://localhost:3000/api/photo-groups/realtime/test-photo-group-ws153', {
          action: 'field_edit',
          field_name: 'description',
          field_value: 'Updated description',
          edit_type: 'update'
      const editResponse = await realtimePost(editRequest, { params: { id: testPhotoGroupId } })
      const editData = await editResponse.json()
      expect(editResponse.status).toBe(200)
      expect(editData.success).toBe(true)
    it('should get current session state', async () => {
      const getRequest = new NextRequest('http://localhost:3000/api/photo-groups/realtime/test-photo-group-ws153')
      const getResponse = await realtimeGet(getRequest, { params: { id: testPhotoGroupId } })
      const getData = await getResponse.json()
      expect(getResponse.status).toBe(200)
      expect(getData.success).toBe(true)
      expect(getData.data).toHaveProperty('active_sessions')
      expect(getData.data).toHaveProperty('field_locks')
      expect(getData.data).toHaveProperty('recent_changes')
  describe('Conflict Detection API', () => {
    beforeEach(async () => {
      // Create additional photo groups for conflict testing
      await supabase.from('photo_groups').insert([
        {
          id: 'conflict-group-1',
          wedding_id: testWeddingId,
          name: 'Conflict Group 1',
          type: 'bridal_party',
          scheduled_start: '2025-08-15T14:15:00Z',
          scheduled_end: '2025-08-15T14:45:00Z',
          status: 'pending'
        },
          id: 'conflict-group-2',
          name: 'Conflict Group 2',
          type: 'family',
          scheduled_start: '2025-08-15T14:30:00Z',
          scheduled_end: '2025-08-15T15:00:00Z',
        }
      ])
    afterEach(async () => {
      await supabase.from('photo_groups').delete().in('id', ['conflict-group-1', 'conflict-group-2'])
    it('should detect time conflicts between photo groups', async () => {
      const conflictRequest = new NextRequest('http://localhost:3000/api/photo-groups/conflicts/detect', {
          conflict_types: ['time_overlap'],
          auto_resolve: false
      const conflictResponse = await conflictPost(conflictRequest)
      const conflictData = await conflictResponse.json()
      expect(conflictResponse.status).toBe(200)
      expect(conflictData.success).toBe(true)
      expect(conflictData.data.conflicts.length).toBeGreaterThan(0)
      expect(conflictData.data.conflicts[0].type).toBe('time_overlap')
      expect(conflictData.data.summary.total_conflicts).toBeGreaterThan(0)
    it('should detect multiple conflict types', async () => {
          conflict_types: ['time_overlap', 'guest_overlap', 'location_conflict', 'priority_conflict'],
          auto_resolve: true
      expect(conflictData.data).toHaveProperty('conflicts')
      expect(conflictData.data).toHaveProperty('resolved_conflicts')
      expect(conflictData.data).toHaveProperty('summary')
      expect(conflictData.data.summary).toHaveProperty('severity_breakdown')
    it('should provide conflict resolution suggestions', async () => {
          include_suggestions: true
      expect(conflictData.data.conflicts[0]).toHaveProperty('resolution_suggestions')
      expect(Array.isArray(conflictData.data.conflicts[0].resolution_suggestions)).toBe(true)
  describe('Scheduling Optimization API', () => {
    it('should optimize schedule using genetic algorithm', async () => {
      const optimizeRequest = new NextRequest('http://localhost:3000/api/photo-groups/schedule/optimize', {
          strategy: 'genetic_algorithm',
          constraints: {
            max_duration_minutes: 480,
            buffer_minutes: 15,
            priority_weights: {
              high: 3,
              medium: 2,
              low: 1
            }
          },
          preferences: {
            golden_hour_preference: true,
            family_grouping: true
          }
      const optimizeResponse = await optimizePost(optimizeRequest)
      const optimizeData = await optimizeResponse.json()
      expect(optimizeResponse.status).toBe(200)
      expect(optimizeData.success).toBe(true)
      expect(optimizeData.data).toHaveProperty('optimized_schedule')
      expect(optimizeData.data).toHaveProperty('optimization_metrics')
      expect(optimizeData.data.optimization_metrics).toHaveProperty('score')
      expect(optimizeData.data.optimization_metrics).toHaveProperty('conflicts_resolved')
    it('should optimize schedule using simulated annealing', async () => {
          strategy: 'simulated_annealing',
            max_duration_minutes: 360,
            buffer_minutes: 10
      expect(optimizeData.data.optimization_metrics.algorithm).toBe('simulated_annealing')
    it('should optimize schedule using ML-powered approach', async () => {
          strategy: 'ml_powered',
          ml_features: {
            weather_consideration: true,
            historical_data: true,
            guest_behavior_patterns: true
      expect(optimizeData.data.optimization_metrics.algorithm).toBe('ml_powered')
      expect(optimizeData.data).toHaveProperty('ml_insights')
  describe('Batch Operations API', () => {
    it('should handle bulk create operations', async () => {
      const batchRequest = new NextRequest('http://localhost:3000/api/photo-groups/batch', {
          operation_type: 'bulk_create',
          data: [
            {
              wedding_id: testWeddingId,
              name: 'Batch Group 1',
              type: 'family',
              scheduled_start: '2025-08-15T16:00:00Z',
              scheduled_end: '2025-08-15T16:30:00Z'
            },
              name: 'Batch Group 2',
              type: 'bridal_party',
              scheduled_start: '2025-08-15T16:30:00Z',
              scheduled_end: '2025-08-15T17:00:00Z'
          ],
          options: {
            validate_conflicts: true,
            auto_optimize: true
      const batchResponse = await batchPost(batchRequest)
      const batchData = await batchResponse.json()
      expect(batchResponse.status).toBe(200)
      expect(batchData.success).toBe(true)
      expect(batchData.data.processed_count).toBe(2)
      expect(batchData.data.successful_operations.length).toBe(2)
      expect(batchData.data.failed_operations.length).toBe(0)
    it('should handle bulk update operations', async () => {
      // First create some groups to update
      const createRequest = new NextRequest('http://localhost:3000/api/photo-groups/batch', {
              name: 'Update Group 1',
              type: 'family'
              name: 'Update Group 2',
          ]
      const createResponse = await batchPost(createRequest)
      const createData = await createResponse.json()
      const createdIds = createData.data.successful_operations.map((op: any) => op.result.id)
      // Now update them
      const updateRequest = new NextRequest('http://localhost:3000/api/photo-groups/batch', {
        method: 'PUT',
          operation_type: 'bulk_update',
          filters: {
            ids: createdIds
          updates: {
            priority_level: 'high',
            notes: 'Updated via batch operation'
      const updateResponse = await batchPut(updateRequest)
      const updateData = await updateResponse.json()
      expect(updateResponse.status).toBe(200)
      expect(updateData.success).toBe(true)
      expect(updateData.data.processed_count).toBe(2)
    it('should handle transaction rollback on failure', async () => {
              name: 'Valid Group',
              // Invalid data - missing required field
              name: 'Invalid Group'
            rollback_on_failure: true
      expect(batchResponse.status).toBe(207) // Partial success
      expect(batchData.data.failed_operations.length).toBeGreaterThan(0)
      expect(batchData.data).toHaveProperty('rollback_performed')
  describe('Analytics API', () => {
    it('should generate comprehensive analytics', async () => {
      const analyticsRequest = new NextRequest(`http://localhost:3000/api/photo-groups/analytics/${testCoupleId}`)
      const analyticsResponse = await analyticsGet(analyticsRequest, { params: { coupleId: testCoupleId } })
      const analyticsData = await analyticsResponse.json()
      expect(analyticsResponse.status).toBe(200)
      expect(analyticsData.success).toBe(true)
      expect(analyticsData.data.metrics.length).toBeGreaterThan(0)
      // Check for specific metric types
      const metricTypes = analyticsData.data.metrics.map((m: any) => m.type)
      expect(metricTypes).toContain('group_count_by_type')
      expect(metricTypes).toContain('time_distribution')
      expect(metricTypes).toContain('priority_distribution')
    it('should generate metrics with date range filtering', async () => {
      const analyticsRequest = new NextRequest(
        `http://localhost:3000/api/photo-groups/analytics/${testCoupleId}?start_date=2025-08-01&end_date=2025-08-31&metrics=group_count_by_type,completion_rate`
      )
      expect(analyticsData.data.date_range).toEqual({
        start: '2025-08-01',
        end: '2025-08-31'
    it('should include visualization configurations', async () => {
      analyticsData.data.metrics.forEach((metric: any) => {
        expect(metric).toHaveProperty('visualization')
        expect(metric.visualization).toHaveProperty('type')
        expect(metric.visualization).toHaveProperty('config')
  describe('Calendar Integration API', () => {
    it('should sync photo groups to Google Calendar', async () => {
      const calendarRequest = new NextRequest('http://localhost:3000/api/photo-groups/calendar/sync', {
          provider: 'google',
          access_token: 'mock_access_token',
          calendar_id: 'primary',
          sync_options: {
            create_events: true,
            update_existing: true,
            include_details: true
      const calendarResponse = await calendarPost(calendarRequest)
      const calendarData = await calendarResponse.json()
      expect(calendarResponse.status).toBe(200)
      expect(calendarData.success).toBe(true)
      expect(calendarData.data).toHaveProperty('synced_events')
      expect(calendarData.data).toHaveProperty('provider')
      expect(calendarData.data.provider).toBe('google')
    it('should sync photo groups to Outlook Calendar', async () => {
          provider: 'outlook',
          access_token: 'mock_outlook_token',
          calendar_id: 'primary'
      expect(calendarData.data.provider).toBe('outlook')
    it('should get calendar sync status', async () => {
      const statusRequest = new NextRequest(`http://localhost:3000/api/photo-groups/calendar/sync?wedding_id=${testWeddingId}`)
      const statusResponse = await calendarGet(statusRequest)
      const statusData = await statusResponse.json()
      expect(statusResponse.status).toBe(200)
      expect(statusData.success).toBe(true)
      expect(statusData.data).toHaveProperty('integrations')
      expect(Array.isArray(statusData.data.integrations)).toBe(true)
    it('should handle calendar sync errors gracefully', async () => {
          access_token: 'invalid_token'
      expect(calendarResponse.status).toBe(400)
      expect(calendarData.success).toBe(false)
      expect(calendarData.error).toContain('authentication')
  describe('Cross-API Integration', () => {
    it('should optimize schedule and detect remaining conflicts', async () => {
      // First optimize the schedule
          strategy: 'genetic_algorithm'
      // Then detect any remaining conflicts
          conflict_types: ['time_overlap', 'guest_overlap']
      // After optimization, conflicts should be minimal
      expect(conflictData.data.summary.total_conflicts).toBeLessThanOrEqual(2)
    it('should create groups via batch, sync to calendar, and analyze', async () => {
      // Create groups via batch operation
              name: 'Integration Test Group 1',
              type: 'ceremony',
              scheduled_start: '2025-08-15T17:00:00Z',
              scheduled_end: '2025-08-15T17:30:00Z'
              name: 'Integration Test Group 2',
              type: 'reception',
              scheduled_start: '2025-08-15T18:00:00Z',
              scheduled_end: '2025-08-15T18:30:00Z'
      // Sync to calendar
          access_token: 'mock_token'
      // Generate analytics
})
