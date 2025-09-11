import { SupplierCalendarInviteService } from '../supplier-calendar-invite-service'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SupplierScheduleEvent, CalendarInviteData } from '@/types/supplier-communication'
import { createClient } from '@/lib/supabase/server'

// Mock dependencies
jest.mock('@/lib/supabase/server')
// Mock data
const mockScheduleEvent: SupplierScheduleEvent = {
  id: 'event-1',
  title: 'Wedding Photography Session',
  start_time: new Date('2024-06-15T10:00:00Z'),
  end_time: new Date('2024-06-15T18:00:00Z'),
  location: 'Grand Hotel, 123 Main St, Anytown, ST 12345',
  event_type: 'wedding_day',
  couple_names: 'Alice & Bob',
  wedding_date: new Date('2024-06-15'),
  supplier_id: 'supplier-1',
  organization_id: 'org-1',
  client_id: 'client-1',
  status: 'scheduled',
  description: 'Full day wedding photography coverage'
}
const mockSupabaseClient = {
  from: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  insert: jest.fn().mockReturnThis(),
  update: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  single: jest.fn(),
  data: null,
  error: null
describe('SupplierCalendarInviteService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (createClient as jest.Mock).mockReturnValue(mockSupabaseClient)
  })
  describe('generateSupplierCalendarInvite', () => {
    it('should generate complete calendar invite data', async () => {
      mockSupabaseClient.single.mockResolvedValue({
        data: {
          organization_name: 'Elite Weddings',
          contact_email: 'support@eliteweddings.com',
          contact_phone: '+1-555-0123'
        },
        error: null
      })
      const result = await SupplierCalendarInviteService.generateSupplierCalendarInvite(
        mockScheduleEvent,
        'org-1',
        'supplier-1'
      )
      expect(result.success).toBe(true)
      expect(result.invite_data).toBeDefined()
      
      const inviteData = result.invite_data!
      expect(inviteData.event_id).toBe('event-1')
      expect(inviteData.title).toBe('Wedding Photography Session')
      expect(inviteData.description).toContain('Alice & Bob')
      expect(inviteData.location).toBe('Grand Hotel, 123 Main St, Anytown, ST 12345')
      expect(inviteData.start_time).toEqual(mockScheduleEvent.start_time)
      expect(inviteData.end_time).toEqual(mockScheduleEvent.end_time)
    })
    it('should generate valid ICS content', async () => {
          contact_email: 'support@eliteweddings.com'
        'org-1'
      const icsContent = result.invite_data!.ics_content
      expect(icsContent).toContain('BEGIN:VCALENDAR')
      expect(icsContent).toContain('END:VCALENDAR')
      expect(icsContent).toContain('BEGIN:VEVENT')
      expect(icsContent).toContain('END:VEVENT')
      expect(icsContent).toContain('SUMMARY:Wedding Photography Session')
      expect(icsContent).toContain('LOCATION:Grand Hotel')
      expect(icsContent).toContain('DTSTART:20240615T100000Z')
      expect(icsContent).toContain('DTEND:20240615T180000Z')
    it('should include calendar provider URLs', async () => {
        data: { organization_name: 'Elite Weddings' },
      const providerUrls = result.invite_data!.calendar_provider_urls
      expect(providerUrls.google).toContain('calendar.google.com')
      expect(providerUrls.outlook).toContain('outlook.live.com')
      expect(providerUrls.apple).toContain('webcal://')
      expect(providerUrls.yahoo).toContain('calendar.yahoo.com')
    it('should handle special characters in event details', async () => {
      const eventWithSpecialChars = {
        ...mockScheduleEvent,
        title: 'Wedding & Reception Photography',
        description: 'Special event with "quotes" and commas, semicolons;',
        location: 'Château de Rêve, 456 Élite Ave'
      }
        eventWithSpecialChars,
      expect(icsContent).toContain('SUMMARY:Wedding & Reception Photography')
      expect(icsContent).toContain('LOCATION:Château de Rêve\\, 456 Élite Ave')
    it('should handle timezone conversion correctly', async () => {
      const eventWithTimezone = {
        start_time: new Date('2024-06-15T14:00:00-04:00'), // EDT
        end_time: new Date('2024-06-15T22:00:00-04:00')    // EDT
        eventWithTimezone,
      // Should be converted to UTC
      expect(icsContent).toContain('DTSTART:20240615T180000Z')
      expect(icsContent).toContain('DTEND:20240616T020000Z')
  describe('createBulkCalendarInvites', () => {
    const mockEvents = [
      mockScheduleEvent,
      {
        id: 'event-2',
        title: 'Wedding Catering Setup',
        supplier_id: 'supplier-2'
    ]
    it('should create bulk calendar invites successfully', async () => {
      const result = await SupplierCalendarInviteService.createBulkCalendarInvites(
        mockEvents,
      expect(result.created_count).toBe(2)
      expect(result.failed_count).toBe(0)
      expect(result.invites).toHaveLength(2)
      expect(result.invites[0].event_id).toBe('event-1')
      expect(result.invites[1].event_id).toBe('event-2')
    it('should handle partial failures in bulk creation', async () => {
      const invalidEvent = {
        start_time: null as any, // Invalid date
        end_time: null as any
        [mockScheduleEvent, invalidEvent],
      expect(result.created_count).toBe(1)
      expect(result.failed_count).toBe(1)
      expect(result.invites).toHaveLength(1)
      expect(result.errors).toHaveLength(1)
    it('should handle empty event list', async () => {
        [],
      expect(result.created_count).toBe(0)
      expect(result.invites).toHaveLength(0)
  describe('generateCalendarProviderUrls', () => {
    const inviteData: CalendarInviteData = {
      event_id: 'event-1',
      title: 'Test Event',
      description: 'Test Description',
      location: 'Test Location',
      start_time: new Date('2024-06-15T10:00:00Z'),
      end_time: new Date('2024-06-15T11:00:00Z'),
      ics_content: '',
      calendar_provider_urls: {
        google: '',
        outlook: '',
        apple: '',
        yahoo: ''
    }
    it('should generate Google Calendar URL correctly', () => {
      const result = SupplierCalendarInviteService.generateCalendarProviderUrls(inviteData)
      expect(result.google).toContain('calendar.google.com/calendar/render')
      expect(result.google).toContain('action=TEMPLATE')
      expect(result.google).toContain('text=Test%20Event')
      expect(result.google).toContain('dates=20240615T100000Z/20240615T110000Z')
      expect(result.google).toContain('location=Test%20Location')
    it('should generate Outlook URL correctly', () => {
      expect(result.outlook).toContain('outlook.live.com/calendar/0/deeplink/compose')
      expect(result.outlook).toContain('subject=Test%20Event')
      expect(result.outlook).toContain('startdt=2024-06-15T10:00:00.000Z')
      expect(result.outlook).toContain('enddt=2024-06-15T11:00:00.000Z')
    it('should generate Apple Calendar (webcal) URL correctly', () => {
      expect(result.apple).toContain('webcal://')
      expect(result.apple).toContain('/api/suppliers/schedule/event-1/calendar.ics')
    it('should generate Yahoo Calendar URL correctly', () => {
      expect(result.yahoo).toContain('calendar.yahoo.com')
      expect(result.yahoo).toContain('v=60')
      expect(result.yahoo).toContain('title=Test%20Event')
      expect(result.yahoo).toContain('st=20240615T100000Z')
  describe('ICS content generation', () => {
    it('should generate valid ICS format', async () => {
        data: { 
      const lines = icsContent.split('\n')
      expect(lines[0]).toBe('BEGIN:VCALENDAR')
      expect(lines[lines.length - 1]).toBe('END:VCALENDAR')
      expect(icsContent).toContain('VERSION:2.0')
      expect(icsContent).toContain('PRODID:-//WedSync//Wedding Management System//EN')
      expect(icsContent).toContain('METHOD:REQUEST')
    it('should include all required VEVENT fields', async () => {
      expect(icsContent).toContain('UID:')
      expect(icsContent).toContain('DTSTAMP:')
      expect(icsContent).toContain('DESCRIPTION:')
      expect(icsContent).toContain('STATUS:CONFIRMED')
      expect(icsContent).toContain('SEQUENCE:0')
    it('should escape special characters in ICS content', async () => {
        title: 'Test, Event; with "quotes"',
        description: 'Line 1\nLine 2\nLine 3',
        location: 'Place with, commas; semicolons'
      expect(icsContent).toContain('SUMMARY:Test\\, Event\\; with "quotes"')
      expect(icsContent).toContain('DESCRIPTION:Line 1\\nLine 2\\nLine 3')
      expect(icsContent).toContain('LOCATION:Place with\\, commas\\; semicolons')
  describe('error handling', () => {
    it('should handle database errors when fetching organization', async () => {
        data: null,
        error: { message: 'Organization not found' }
        'invalid-org'
      expect(result.success).toBe(false)
      expect(result.error).toContain('Organization not found')
    it('should handle missing event data', async () => {
        null as any,
      expect(result.error).toContain('Schedule event is required')
    it('should handle invalid dates', async () => {
      const eventWithInvalidDates = {
        start_time: new Date('invalid'),
        end_time: new Date('invalid')
        eventWithInvalidDates,
      expect(result.error).toContain('Invalid event dates')
    it('should handle missing organization ID', async () => {
        ''
      expect(result.error).toContain('Organization ID is required')
  describe('date formatting', () => {
    it('should format dates correctly for different timezones', async () => {
      const eventInEST = {
        start_time: new Date('2024-12-15T15:00:00-05:00'), // EST
        end_time: new Date('2024-12-15T23:00:00-05:00')    // EST
        eventInEST,
      // Should convert EST to UTC
      expect(icsContent).toContain('DTSTART:20241215T200000Z')
      expect(icsContent).toContain('DTEND:20241216T040000Z')
    it('should handle all-day events', async () => {
      const allDayEvent = {
        start_time: new Date('2024-06-15T00:00:00Z'),
        end_time: new Date('2024-06-15T23:59:59Z'),
        is_all_day: true
        allDayEvent,
      // All-day events should use DTSTART;VALUE=DATE format
      expect(icsContent).toMatch(/DTSTART;VALUE=DATE:\d{8}/)
      expect(icsContent).toMatch(/DTEND;VALUE=DATE:\d{8}/)
})
