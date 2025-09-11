import { SupplierGoogleCalendarService } from '../supplier-google-calendar-service'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SupplierContactInfo, SupplierScheduleEvent, SupplierSyncResult, SupplierCalendarSyncSettings } from '@/types/supplier-communication'
import { createClient } from '@/lib/supabase/server'

// Mock dependencies
jest.mock('@/lib/supabase/server')
jest.mock('googleapis', () => ({
  google: {
    auth: {
      OAuth2: jest.fn().mockImplementation(() => ({
        setCredentials: jest.fn(),
        refreshAccessToken: jest.fn(),
        credentials: { access_token: 'new-token', refresh_token: 'refresh' }
      }))
    },
    calendar: jest.fn().mockImplementation(() => ({
      events: {
        list: jest.fn(),
        insert: jest.fn(),
        update: jest.fn(),
        delete: jest.fn()
      },
      calendars: {
        get: jest.fn()
      }
    }))
  }
}))
// Mock data
const mockSupplier: SupplierContactInfo = {
  id: 'supplier-1',
  name: 'John Doe',
  email: 'john@photography.com',
  phone: '+1234567890',
  company_name: 'John Photography',
  role: 'photographer',
  organization_id: 'org-1'
}
const mockScheduleEvents: SupplierScheduleEvent[] = [
  {
    id: 'event-1',
    title: 'Wedding Photography',
    start_time: new Date('2024-06-15T10:00:00Z'),
    end_time: new Date('2024-06-15T18:00:00Z'),
    location: 'Grand Hotel',
    event_type: 'wedding_day',
    couple_names: 'Alice & Bob',
    wedding_date: new Date('2024-06-15'),
    supplier_id: 'supplier-1',
    organization_id: 'org-1',
    client_id: 'client-1',
    status: 'scheduled'
  },
    id: 'event-2',
    title: 'Engagement Photo Session',
    start_time: new Date('2024-06-10T14:00:00Z'),
    end_time: new Date('2024-06-10T16:00:00Z'),
    location: 'City Park',
    event_type: 'engagement_session',
]
const mockSyncSettings: SupplierCalendarSyncSettings = {
  sync_enabled: true,
  calendar_id: 'primary',
  sync_direction: 'bidirectional',
  conflict_resolution: 'prompt_user',
  sync_frequency: 'real_time',
  event_visibility: 'private',
  include_client_details: true,
  sync_reminders: true
const mockSupabaseClient = {
  from: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  insert: jest.fn().mockReturnThis(),
  update: jest.fn().mockReturnThis(),
  upsert: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  single: jest.fn(),
  data: null,
  error: null
const mockGoogleAuth = {
  setCredentials: jest.fn(),
  refreshAccessToken: jest.fn(),
  credentials: { access_token: 'test-token', refresh_token: 'refresh-token' }
const mockGoogleCalendar = {
  events: {
    list: jest.fn(),
    insert: jest.fn(),
    update: jest.fn(),
    delete: jest.fn()
  calendars: {
    get: jest.fn()
describe('SupplierGoogleCalendarService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (createClient as jest.Mock).mockReturnValue(mockSupabaseClient);
    
    const { google } = require('googleapis');
    google.auth.OAuth2.mockImplementation(() => mockGoogleAuth);
    google.calendar.mockImplementation(() => mockGoogleCalendar)
  })
  describe('syncSupplierScheduleToGoogleCalendar', () => {
    it('should sync supplier schedule successfully', async () => {
      // Mock database calls
      mockSupabaseClient.single
        .mockResolvedValueOnce({
          data: {
            google_access_token: 'access-token',
            google_refresh_token: 'refresh-token',
            google_calendar_sync_settings: mockSyncSettings
          },
          error: null
        })
          data: { organization_name: 'Elite Weddings' },
      // Mock Google Calendar API calls
      mockGoogleCalendar.events.list.mockResolvedValue({
        data: { items: [] }
      })
      mockGoogleCalendar.events.insert
          data: { id: 'gcal-event-1', htmlLink: 'https://calendar.google.com/event1' }
        .mkResolvedValueOnce({
          data: { id: 'gcal-event-2', htmlLink: 'https://calendar.google.com/event2' }
      const result = await SupplierGoogleCalendarService.syncSupplierScheduleToGoogleCalendar(
        mockSupplier,
        mockScheduleEvents,
        'org-1',
        mockSyncSettings
      )
      expect(result.success).toBe(true)
      expect(result.synced_events).toBe(2)
      expect(result.failed_events).toBe(0)
      expect(result.conflicts_detected).toBe(0)
      expect(mockGoogleCalendar.events.insert).toHaveBeenCalledTimes(2)
    })
    it('should handle Google authentication token refresh', async () => {
            google_access_token: 'expired-token',
      // Mock token refresh
      mockGoogleAuth.refreshAccessToken.mockResolvedValue({
        credentials: {
          access_token: 'new-access-token',
          refresh_token: 'refresh-token'
        }
      
      mockGoogleCalendar.events.list.mockRejectedValueOnce({
        code: 401,
        message: 'Invalid Credentials'
      }).mockResolvedValueOnce({
      mockGoogleCalendar.events.insert.mockResolvedValue({
        data: { id: 'gcal-event-1' }
        [mockScheduleEvents[0]],
        'org-1'
      expect(mockGoogleAuth.refreshAccessToken).toHaveBeenCalled()
      expect(mockSupabaseClient.update).toHaveBeenCalledWith({
        google_access_token: 'new-access-token'
    it('should detect and handle calendar conflicts', async () => {
      // Mock existing conflicting event in Google Calendar
        data: {
          items: [{
            id: 'existing-event',
            start: { dateTime: '2024-06-15T10:00:00Z' },
            end: { dateTime: '2024-06-15T12:00:00Z' },
            summary: 'Existing Meeting'
          }]
      expect(result.conflicts_detected).toBe(1)
      expect(result.conflicts).toHaveLength(1)
      expect(result.conflicts[0].event_id).toBe('event-1')
      expect(result.conflicts[0].conflict_type).toBe('time_overlap')
    it('should handle sync settings properly', async () => {
      const privateSettings = {
        ...mockSyncSettings,
        event_visibility: 'private' as const,
        include_client_details: false
            google_calendar_sync_settings: privateSettings
      await SupplierGoogleCalendarService.syncSupplierScheduleToGoogleCalendar(
        privateSettings
      const [calendarId, eventData] = mockGoogleCalendar.events.insert.mock.calls[0]
      expect(eventData.requestBody.visibility).toBe('private')
      expect(eventData.requestBody.description).not.toContain('Alice & Bob')
  describe('setupGoogleCalendarIntegration', () => {
    it('should setup integration with OAuth flow', async () => {
      const authCode = 'test-auth-code'
      const mockTokens = {
        access_token: 'access-token',
        refresh_token: 'refresh-token',
        scope: 'https://www.googleapis.com/auth/calendar',
        token_type: 'Bearer',
        expiry_date: Date.now() + 3600000
      mockGoogleAuth.getToken = jest.fn().mockResolvedValue({
        tokens: mockTokens
      mockGoogleCalendar.calendars.get.mockResolvedValue({
          id: 'primary',
          summary: 'John Doe',
          accessRole: 'owner'
      const result = await SupplierGoogleCalendarService.setupGoogleCalendarIntegration(
        'supplier-1',
        authCode,
      expect(result.calendar_connected).toBe(true)
      expect(mockSupabaseClient.upsert).toHaveBeenCalledWith({
        supplier_id: 'supplier-1',
        organization_id: 'org-1',
        google_access_token: 'access-token',
        google_refresh_token: 'refresh-token',
        google_calendar_id: 'primary',
        google_calendar_sync_settings: mockSyncSettings,
        integration_status: 'active',
        last_sync_at: expect.any(String)
    it('should handle OAuth errors', async () => {
      const authCode = 'invalid-code'
      mockGoogleAuth.getToken = jest.fn().mockRejectedValue({
        code: 400,
        message: 'Invalid authorization code'
      expect(result.success).toBe(false)
      expect(result.error).toContain('Invalid authorization code')
  describe('removeGoogleCalendarIntegration', () => {
    it('should remove integration and sync data', async () => {
      mockSupabaseClient.single.mockResolvedValue({
          google_access_token: 'access-token',
          google_calendar_sync_settings: mockSyncSettings
        },
        error: null
      const result = await SupplierGoogleCalendarService.removeGoogleCalendarIntegration(
        { remove_synced_events: true }
        google_access_token: null,
        google_refresh_token: null,
        google_calendar_id: null,
        google_calendar_sync_settings: null,
        integration_status: 'disconnected',
        last_sync_at: null
    it('should optionally preserve synced events', async () => {
        { remove_synced_events: false }
      expect(mockGoogleCalendar.events.delete).not.toHaveBeenCalled()
  describe('getSupplierGoogleCalendarStatus', () => {
    it('should return calendar integration status', async () => {
          integration_status: 'active',
          google_calendar_id: 'primary',
          last_sync_at: '2024-01-01T00:00:00Z',
      const result = await SupplierGoogleCalendarService.getSupplierGoogleCalendarStatus(
      expect(result.integration_status).toBe('active')
      expect(result.calendar_id).toBe('primary')
      expect(result.last_sync_at).toEqual(new Date('2024-01-01T00:00:00Z'))
      expect(result.sync_settings).toEqual(mockSyncSettings)
    it('should handle non-integrated suppliers', async () => {
        data: null,
      expect(result.integration_status).toBe('not_connected')
      expect(result.calendar_id).toBeNull()
      expect(result.sync_settings).toBeNull()
  describe('conflict detection', () => {
    it('should detect time overlap conflicts', async () => {
      const existingEvent = {
        id: 'existing-1',
        start: { dateTime: '2024-06-15T11:00:00Z' },
        end: { dateTime: '2024-06-15T13:00:00Z' },
        summary: 'Existing Meeting'
      const conflicts = SupplierGoogleCalendarService.detectCalendarConflicts(
        [existingEvent]
      expect(conflicts).toHaveLength(1)
      expect(conflicts[0].event_id).toBe('event-1')
      expect(conflicts[0].conflict_type).toBe('time_overlap')
      expect(conflicts[0].conflicting_event_id).toBe('existing-1')
    it('should not detect conflicts for non-overlapping events', async () => {
      const nonConflictingEvent = {
        id: 'non-conflict',
        start: { dateTime: '2024-06-15T08:00:00Z' },
        end: { dateTime: '2024-06-15T09:00:00Z' },
        summary: 'Early Meeting'
        [nonConflictingEvent]
      expect(conflicts).toHaveLength(0)
    it('should detect exact duplicate events', async () => {
      const duplicateEvent = {
        id: 'duplicate',
        start: { dateTime: '2024-06-15T10:00:00Z' },
        end: { dateTime: '2024-06-15T18:00:00Z' },
        summary: 'Wedding Photography'
        [duplicateEvent]
      expect(conflicts[0].conflict_type).toBe('exact_duplicate')
  describe('error handling', () => {
    it('should handle Google Calendar API errors', async () => {
          google_refresh_token: 'refresh-token',
      mockGoogleCalendar.events.list.mockRejectedValue({
        code: 403,
        message: 'Insufficient permissions'
      expect(result.error).toContain('Insufficient permissions')
    it('should handle network timeouts', async () => {
        code: 'ENOTFOUND',
        message: 'Network timeout'
      expect(result.error).toContain('Network timeout')
    it('should handle missing credentials', async () => {
      expect(result.error).toContain('Google Calendar integration not found')
    it('should validate required parameters', async () => {
        null as any,
      expect(result.error).toContain('Supplier information is required')
  describe('sync frequency handling', () => {
    it('should respect sync frequency settings', async () => {
      const realtimeSettings = { ...mockSyncSettings, sync_frequency: 'real_time' as const }
          google_calendar_sync_settings: realtimeSettings,
          last_sync_at: new Date(Date.now() - 60000).toISOString() // 1 minute ago
      // Should sync immediately for real_time
      const result = await SupplierGoogleCalendarService.shouldSync(
        realtimeSettings
      expect(result.should_sync).toBe(true)
    it('should handle daily sync frequency', async () => {
      const dailySettings = { ...mockSyncSettings, sync_frequency: 'daily' as const }
          google_calendar_sync_settings: dailySettings,
          last_sync_at: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString() // 12 hours ago
      // Should not sync yet (less than 24 hours)
        dailySettings
      expect(result.should_sync).toBe(false)
      expect(result.next_sync_at).toBeDefined()
})
