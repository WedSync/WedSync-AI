/**
 * WS-161 Supplier Schedule Workflow Integration Tests
 * Testing complete supplier schedule workflow with database interactions
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { createClient } from '@supabase/supabase-js'
import { NextRequest } from 'next/server'
import jwt from 'jsonwebtoken'
// API Route Handlers
import { GET as getTimelineSchedules, POST as postTimelineSchedules } from '@/app/api/timeline/[id]/supplier-schedules/route'
import { GET as getSupplierSchedule } from '@/app/api/suppliers/[id]/schedule/route'
import { POST as confirmSchedule } from '@/app/api/suppliers/[id]/schedule/confirm/route'
// Services
import { SupplierScheduleUpdateService } from '@/lib/services/supplier-schedule-update-service'
import { SupplierNotificationService } from '@/lib/services/supplier-notification-service'
import { ScheduleExportService } from '@/lib/services/schedule-export-service'
import { SupplierAccessTokenService } from '@/lib/services/supplier-access-token-service'
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)
describe('WS-161 Supplier Schedule Workflow Integration Tests', () => {
  let testWeddingId: string
  let testTimelineId: string
  let testSupplierId: string
  let testCoupleId: string
  let testScheduleId: string
  let supplierAccessToken: string
  beforeAll(async () => {
    // Create test data
    const { data: couple } = await supabase
      .from('user_profiles')
      .insert({
        id: 'test-couple-id',
        email: 'test-couple@example.com',
        full_name: 'Test Couple',
        user_type: 'couple',
        created_at: new Date().toISOString()
      })
      .select('id')
      .single()
    testCoupleId = couple?.id || 'test-couple-id'
    const { data: wedding } = await supabase
      .from('weddings')
        id: 'test-wedding-id',
        couple_id: testCoupleId,
        title: 'Test Wedding',
        wedding_date: '2024-06-15',
        venue: 'Test Venue',
    testWeddingId = wedding?.id || 'test-wedding-id'
    const { data: timeline } = await supabase
      .from('wedding_timelines')
        id: 'test-timeline-id',
        wedding_id: testWeddingId,
        title: 'Test Timeline',
        timeline_date: '2024-06-15',
        status: 'active',
    testTimelineId = timeline?.id || 'test-timeline-id'
    const { data: supplier } = await supabase
      .from('suppliers')
        id: 'test-supplier-id',
        name: 'Test Photography Studio',
        email: 'photographer@example.com',
        phone: '+1234567890',
        category: 'photography',
        location: 'Test City',
        services: ['wedding-photography', 'engagement-photos'],
        pricing: { base: 2500 },
        availability: { days: ['saturday', 'sunday'] },
    testSupplierId = supplier?.id || 'test-supplier-id'
    // Create timeline events
    await supabase
      .from('timeline_events')
      .insert([
        {
          id: 'test-event-1',
          timeline_id: testTimelineId,
          title: 'Pre-ceremony Photos',
          start_time: '14:00',
          end_time: '15:00',
          category: 'photography',
          suppliers: [testSupplierId],
          location: 'Bridal Suite',
          description: 'Getting ready photos',
          buffer_time: 15,
          requirements: ['natural lighting', 'quiet environment'],
          created_at: new Date().toISOString()
        },
          id: 'test-event-2',
          title: 'Ceremony Photography',
          start_time: '16:00',
          end_time: '17:00',
          location: 'Garden Altar',
          description: 'Wedding ceremony coverage',
          buffer_time: 30,
          requirements: ['multiple angles', 'silent operation'],
        }
      ])
  })
  afterAll(async () => {
    // Clean up test data
    await supabase.from('supplier_schedule_confirmations').delete().match({ supplier_id: testSupplierId })
    await supabase.from('supplier_schedules').delete().match({ supplier_id: testSupplierId })
    await supabase.from('supplier_access_tokens').delete().match({ supplier_id: testSupplierId })
    await supabase.from('timeline_events').delete().match({ timeline_id: testTimelineId })
    await supabase.from('wedding_timelines').delete().match({ id: testTimelineId })
    await supabase.from('weddings').delete().match({ id: testWeddingId })
    await supabase.from('user_profiles').delete().match({ id: testCoupleId })
    await supabase.from('suppliers').delete().match({ id: testSupplierId })
  describe('Complete Supplier Schedule Workflow', () => {
    it('should generate supplier schedules from timeline', async () => {
      const request = new NextRequest(`http://localhost:3000/api/timeline/${testTimelineId}/supplier-schedules`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        body: JSON.stringify({
          options: {
            includeBuffers: true,
            groupByCategory: true,
            notifySuppliers: false
          }
        })
      const response = await postTimelineSchedules(request, { params: { id: testTimelineId } })
      const result = await response.json()
      expect(response.status).toBe(201)
      expect(result.success).toBe(true)
      expect(result.data.schedules).toHaveLength(1)
      expect(result.data.schedules[0].supplier_id).toBe(testSupplierId)
      testScheduleId = result.data.schedules[0].id
    })
    it('should retrieve supplier schedule list from timeline', async () => {
      const request = new NextRequest(`http://localhost:3000/api/timeline/${testTimelineId}/supplier-schedules`)
      const response = await getTimelineSchedules(request, { params: { id: testTimelineId } })
      expect(response.status).toBe(200)
      expect(result.data.schedules[0].supplier.name).toBe('Test Photography Studio')
      expect(result.data.schedules[0].events).toHaveLength(2)
    it('should generate supplier access token', async () => {
      const tokenService = new SupplierAccessTokenService()
      
      const tokenResult = await tokenService.generateToken({
        supplierId: testSupplierId,
        permissions: ['view_schedule', 'confirm_schedule', 'export_schedule'],
        expiresInHours: 168, // 1 week
        ipRestrictions: [],
        metadata: {
          generatedFor: 'integration-test',
          weddingId: testWeddingId
      expect(tokenResult.success).toBe(true)
      expect(tokenResult.data.token).toBeTruthy()
      expect(tokenResult.data.expiresAt).toBeTruthy()
      supplierAccessToken = tokenResult.data.token
    it('should access supplier schedule with token authentication', async () => {
      const request = new NextRequest(`http://localhost:3000/api/suppliers/${testSupplierId}/schedule?token=${supplierAccessToken}`)
      const response = await getSupplierSchedule(request, { params: { id: testSupplierId } })
      expect(result.data.supplier.name).toBe('Test Photography Studio')
      expect(result.data.events).toHaveLength(2)
      expect(result.data.events[0].title).toBe('Pre-ceremony Photos')
      expect(result.data.events[1].title).toBe('Ceremony Photography')
    it('should export supplier schedule as PDF', async () => {
      const request = new NextRequest(`http://localhost:3000/api/suppliers/${testSupplierId}/schedule?format=pdf&token=${supplierAccessToken}`)
      expect(response.headers.get('content-type')).toBe('application/pdf')
      expect(response.headers.get('content-disposition')).toContain('attachment')
      expect(response.headers.get('content-disposition')).toContain('Test Photography Studio')
    it('should export supplier schedule as ICS calendar', async () => {
      const request = new NextRequest(`http://localhost:3000/api/suppliers/${testSupplierId}/schedule?format=ics&token=${supplierAccessToken}`)
      expect(response.headers.get('content-type')).toBe('text/calendar')
      const icsContent = await response.text()
      expect(icsContent).toContain('BEGIN:VCALENDAR')
      expect(icsContent).toContain('Pre-ceremony Photos')
      expect(icsContent).toContain('Ceremony Photography')
      expect(icsContent).toContain('END:VCALENDAR')
    it('should confirm supplier schedule with detailed feedback', async () => {
      const request = new NextRequest(`http://localhost:3000/api/suppliers/${testSupplierId}/schedule/confirm`, {
          token: supplierAccessToken,
          confirmations: [
            {
              eventId: 'test-event-1',
              status: 'confirmed',
              notes: 'Perfect timing for natural light photos',
              requirements: ['backup equipment needed']
            },
              eventId: 'test-event-2',
              notes: 'Will position discreetly during ceremony',
              requirements: ['quiet shutter mode']
            }
          ],
          overallNotes: 'Looking forward to capturing this special day!',
          contactPreferences: {
            preferredMethod: 'email',
            emergencyContact: '+1234567890'
      const response = await confirmSchedule(request, { params: { id: testSupplierId } })
      expect(result.data.confirmationId).toBeTruthy()
      expect(result.data.confirmedEvents).toBe(2)
    it('should handle schedule updates when timeline changes', async () => {
      const updateService = new SupplierScheduleUpdateService()
      // Simulate timeline change by updating an event
      await supabase
        .from('timeline_events')
        .update({
          start_time: '14:30',
          end_time: '15:30'
        .match({ id: 'test-event-1' })
      const updateResult = await updateService.updateSchedulesForTimeline(testTimelineId, {
        notifySuppliers: false,
        batchSize: 10,
        maxRetries: 3
      expect(updateResult.success).toBe(true)
      expect(updateResult.data.processedSuppliers).toBe(1)
      expect(updateResult.data.updatedSchedules).toBe(1)
      // Verify schedule was updated
      const { data: updatedSchedule } = await supabase
        .from('supplier_schedules')
        .select('schedule_data')
        .match({ supplier_id: testSupplierId })
        .single()
      const scheduleData = updatedSchedule?.schedule_data
      expect(scheduleData.events[0].start_time).toBe('14:30')
      expect(scheduleData.events[0].end_time).toBe('15:30')
  describe('Service Integration Tests', () => {
    it('should handle notification service integration', async () => {
      const notificationService = new SupplierNotificationService()
      const notifyResult = await notificationService.notifyScheduleUpdate(testSupplierId, {
        type: 'schedule_updated',
        weddingId: testWeddingId,
        changes: ['timing_updated'],
        scheduleData: {
          events: [
              title: 'Pre-ceremony Photos',
              start_time: '14:30',
              end_time: '15:30',
              location: 'Bridal Suite'
          ]
          updatedBy: 'integration-test',
          updateReason: 'timeline_modification'
      expect(notifyResult.success).toBe(true)
      expect(notifyResult.data.notificationId).toBeTruthy()
    it('should handle export service integration', async () => {
      const exportService = new ScheduleExportService()
      const { data: schedule } = await supabase
        .select(`
          *,
          supplier:suppliers(name, email, category)
        `)
      const exportResult = await exportService.exportSchedule(schedule, 'csv', {
        includeNotes: true,
        timezone: 'America/New_York',
        dateFormat: 'MM/DD/YYYY'
      expect(exportResult.success).toBe(true)
      expect(exportResult.data.format).toBe('csv')
      expect(exportResult.data.content).toContain('Event Title,Start Time,End Time')
      expect(exportResult.data.content).toContain('Pre-ceremony Photos')
    it('should handle token service security features', async () => {
      // Test IP restriction
      const restrictedResult = await tokenService.generateToken({
        permissions: ['view_schedule'],
        expiresInHours: 24,
        ipRestrictions: ['192.168.1.100'],
        metadata: { testRestriction: true }
      expect(restrictedResult.success).toBe(true)
      // Test token validation with wrong IP
      const validationResult = await tokenService.validateToken(restrictedResult.data.token, {
        ipAddress: '192.168.1.200',
        userAgent: 'Test-Agent'
      expect(validationResult.success).toBe(false)
      expect(validationResult.error.code).toBe('IP_RESTRICTED')
  describe('Error Handling and Edge Cases', () => {
    it('should handle invalid timeline ID', async () => {
      const request = new NextRequest('http://localhost:3000/api/timeline/invalid-id/supplier-schedules')
      const response = await getTimelineSchedules(request, { params: { id: 'invalid-id' } })
      expect(response.status).toBe(404)
      expect(result.success).toBe(false)
      expect(result.error.code).toBe('TIMELINE_NOT_FOUND')
    it('should handle expired access token', async () => {
      // Generate expired token
      const expiredToken = jwt.sign(
          supplierId: testSupplierId,
          permissions: ['view_schedule'],
          exp: Math.floor(Date.now() / 1000) - 3600 // 1 hour ago
        process.env.JWT_SECRET || 'test-secret'
      )
      const request = new NextRequest(`http://localhost:3000/api/suppliers/${testSupplierId}/schedule?token=${expiredToken}`)
      expect(response.status).toBe(401)
      expect(result.error.code).toBe('TOKEN_EXPIRED')
    it('should handle malformed confirmation request', async () => {
              // Missing eventId
              status: 'confirmed'
      expect(response.status).toBe(400)
      expect(result.error.code).toBe('VALIDATION_ERROR')
  describe('Database Consistency Tests', () => {
    it('should maintain referential integrity', async () => {
      // Verify all created records exist
          supplier:suppliers(*),
          wedding_timeline:wedding_timelines(*)
      expect(schedule).toBeTruthy()
      expect(schedule.supplier).toBeTruthy()
      expect(schedule.wedding_timeline).toBeTruthy()
      const { data: confirmations } = await supabase
        .from('supplier_schedule_confirmations')
        .select('*')
      expect(confirmations).toHaveLength(1)
      expect(confirmations[0].confirmed_events).toBe(2)
    it('should handle concurrent schedule updates', async () => {
      // Simulate concurrent updates
      const promises = Array(3).fill(null).map(async (_, index) => {
        return updateService.updateSchedulesForTimeline(testTimelineId, {
          notifySuppliers: false,
          batchSize: 1,
          metadata: { concurrent: true, batch: index }
      const results = await Promise.all(promises)
      // All should succeed (due to proper locking/versioning)
      results.forEach(result => {
        expect(result.success).toBe(true)
      // Verify final state is consistent
      const { data: finalSchedule } = await supabase
        .select('updated_at, version')
      expect(finalSchedule).toBeTruthy()
})
