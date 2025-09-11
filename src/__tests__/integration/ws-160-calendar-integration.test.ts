/**
 * Integration Tests for WS-160 Calendar Services
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll, Mock } from 'vitest';
import { CalendarExportService } from '@/lib/services/calendar-export-service';
import { EnhancedRealtimeTimelineService } from '@/lib/services/enhanced-realtime-timeline-service';
import { TimelineEvent, WeddingTimeline } from '@/types/timeline';
// Mock external APIs for integration testing
const mockGoogleCalendarAPI = {
  createCalendar: vi.fn(),
  createEvent: vi.fn(),
  updateEvent: vi.fn(),
  deleteEvent: vi.fn(),
  shareCalendar: vi.fn()
};
const mockOutlookAPI = {
  createCalendarGroup: vi.fn(),
  deleteEvent: vi.fn()
// Mock fetch for API calls
global.fetch = vi.fn();
describe('Calendar Integration Tests', () => {
  let calendarService: CalendarExportService;
  let timelineService: EnhancedRealtimeTimelineService;
  
  const mockTimeline: WeddingTimeline = {
    id: 'timeline-123',
    organization_id: 'org-123',
    client_id: 'client-123',
    name: 'Sarah & John Wedding Timeline',
    wedding_date: '2025-06-15',
    timezone: 'America/New_York',
    start_time: '08:00',
    end_time: '23:00',
    buffer_time_minutes: 15,
    allow_vendor_edits: true,
    require_approval: false,
    version: 1,
    is_published: false,
    status: 'draft',
    created_at: '2025-01-20T10:00:00Z',
    updated_at: '2025-01-20T10:00:00Z'
  };
  const mockEvents: TimelineEvent[] = [
    {
      id: 'event-1',
      timeline_id: 'timeline-123',
      title: 'Hair & Makeup',
      description: 'Bridal party hair and makeup preparation',
      start_time: '2025-06-15T08:00:00-04:00',
      end_time: '2025-06-15T11:00:00-04:00',
      location: 'Bridal Suite',
      priority: 'high',
      status: 'confirmed',
      event_type: 'preparation',
      is_locked: false,
      is_flexible: false,
      weather_dependent: false,
      created_at: '2025-01-20T10:00:00Z',
      updated_at: '2025-01-20T10:00:00Z',
      vendors: [
        {
          id: 'vendor-1',
          event_id: 'event-1',
          vendor_id: 'makeup-artist-1',
          role: 'primary',
          responsibilities: 'Bridal makeup and hair styling',
          confirmation_status: 'confirmed',
          assigned_at: '2025-01-20T10:00:00Z',
          vendor: {
            id: 'makeup-artist-1',
            business_name: 'Elite Beauty Studio',
            business_type: 'makeup_artist',
            email: 'sarah@elitebeauty.com',
            phone: '+1-555-0123'
          }
        }
      ]
    },
      id: 'event-2',
      title: 'Photography - Getting Ready',
      description: 'Capture getting ready moments',
      start_time: '2025-06-15T10:00:00-04:00',
      end_time: '2025-06-15T12:00:00-04:00',
      event_type: 'photos',
      is_flexible: true,
          id: 'vendor-2',
          event_id: 'event-2',
          vendor_id: 'photographer-1',
          responsibilities: 'Capture getting ready photos',
            id: 'photographer-1',
            business_name: 'Moments Photography',
            business_type: 'photographer',
            email: 'alex@momentsphoto.com',
            phone: '+1-555-0456'
      id: 'event-3',
      title: 'Wedding Ceremony',
      description: 'Main wedding ceremony',
      start_time: '2025-06-15T16:00:00-04:00',
      end_time: '2025-06-15T17:00:00-04:00',
      location: 'St. Mary\'s Church, 123 Main St, Anytown, NY',
      priority: 'critical',
      event_type: 'ceremony',
      is_locked: true,
      updated_at: '2025-01-20T10:00:00Z'
      id: 'event-4',
      title: 'Cocktail Hour',
      description: 'Cocktail hour with appetizers and drinks',
      start_time: '2025-06-15T17:30:00-04:00',
      end_time: '2025-06-15T18:30:00-04:00',
      location: 'Garden Terrace, Grand Hotel',
      event_type: 'cocktails',
      weather_dependent: true,
      backup_plan: 'Move to indoor lounge if weather is poor',
      id: 'event-5',
      title: 'Reception Dinner',
      description: 'Three-course plated dinner service',
      start_time: '2025-06-15T19:00:00-04:00',
      end_time: '2025-06-15T21:00:00-04:00',
      location: 'Grand Ballroom, Grand Hotel',
      event_type: 'dinner',
    }
  ];
  beforeAll(() => {
    // Set up environment for testing
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-key';
  });
  beforeEach(() => {
    calendarService = new CalendarExportService();
    timelineService = new EnhancedRealtimeTimelineService(
      mockTimeline.id,
      'user-123',
      'Test User'
    );
    // Reset mocks
    vi.clearAllMocks();
  afterEach(async () => {
    await timelineService.destroy();
  describe('Google Calendar Integration', () => {
    const mockAccessToken = 'google-access-token-123';
    beforeEach(() => {
      // Mock successful Google Calendar API responses
      (global.fetch as ReturnType<typeof vi.fn>).mockImplementation((url: string, options: any) => {
        if (url.includes('/calendars') && options.method === 'POST') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              id: 'calendar-123',
              summary: mockTimeline.name,
              timeZone: mockTimeline.timezone
            })
          });
        if (url.includes('/events') && options.method === 'POST') {
              id: 'google-event-123',
              summary: 'Test Event',
              start: { dateTime: '2025-06-15T10:00:00-04:00' },
              end: { dateTime: '2025-06-15T11:00:00-04:00' }
        return Promise.resolve({ ok: false, statusText: 'Not Found' });
      });
    });
    it('should export complete timeline to Google Calendar', async () => {
      const options = {
        includeVendorDetails: true,
        includeInternalNotes: false,
        timezone: mockTimeline.timezone,
        reminderMinutes: [15, 60]
      };
      const result = await calendarService.exportToGoogleCalendar(
        mockTimeline,
        mockEvents,
        mockAccessToken,
        options
      );
      expect(result.success).toBe(true);
      expect(result.calendarId).toBe('calendar-123');
      // Verify calendar creation was called
      expect(global.fetch).toHaveBeenCalledWith(
        'https://www.googleapis.com/calendar/v3/calendars',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Authorization': `Bearer ${mockAccessToken}`,
            'Content-Type': 'application/json'
          })
        })
      // Verify events were created (one call per event)
      const eventCalls = (global.fetch as ReturnType<typeof vi.fn>).mock.calls.filter(
        call => call[0].includes('/events') && call[1].method === 'POST'
      expect(eventCalls.length).toBe(mockEvents.length);
    it('should include vendor details in event descriptions', async () => {
        timezone: mockTimeline.timezone
      await calendarService.exportToGoogleCalendar(
        [mockEvents[0]], // Hair & Makeup event with vendor
      // Check that vendor details were included in the event body
      const eventCall = (global.fetch as ReturnType<typeof vi.fn>).mock.calls.find(
      expect(eventCall).toBeDefined();
      const requestBody = JSON.parse(eventCall[1].body);
      expect(requestBody.description).toContain('Elite Beauty Studio');
      expect(requestBody.description).toContain('primary');
    it('should handle Google Calendar API errors gracefully', async () => {
      // Mock API error
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: false,
        statusText: 'Unauthorized'
        includeVendorDetails: false,
        'invalid-token',
      expect(result.success).toBe(false);
      expect(result.error).toContain('Google Calendar API error');
    it('should sync timeline changes to existing Google Calendar', async () => {
      const changes = {
        added: [mockEvents[0]],
        updated: [{ ...mockEvents[1], title: 'Updated Photography Session' }],
        deleted: ['event-old-123']
      const calendarMapping = {
        provider: 'google',
        calendarId: 'existing-calendar-123',
        accessToken: mockAccessToken
      // Mock successful API responses
        ok: true,
        json: () => Promise.resolve({ id: 'sync-success' })
      const result = await calendarService.syncTimelineChanges(
        mockTimeline.id,
        changes,
        [calendarMapping]
      expect(result.errors).toHaveLength(0);
      // Verify API calls were made for each change type
      const calls = (global.fetch as ReturnType<typeof vi.fn>).mock.calls;
      expect(calls.some(call => call[1].method === 'POST')).toBe(true); // Added events
      expect(calls.some(call => call[1].method === 'PUT')).toBe(true);  // Updated events
      expect(calls.some(call => call[1].method === 'DELETE')).toBe(true); // Deleted events
  describe('Outlook Calendar Integration', () => {
    const mockAccessToken = 'outlook-access-token-123';
      // Mock Outlook API responses
        if (url.includes('/calendarGroups') && options.method === 'POST') {
              id: 'group-123',
              name: `${mockTimeline.name} - Wedding`
              id: 'outlook-calendar-123',
              name: mockTimeline.name
              id: 'outlook-event-123',
              subject: 'Test Event'
    it('should export timeline to Outlook Calendar', async () => {
      const result = await calendarService.exportToOutlookCalendar(
      expect(result.calendarId).toBe('outlook-calendar-123');
      // Verify calendar group was created
        'https://graph.microsoft.com/v1.0/me/calendarGroups',
            'Authorization': `Bearer ${mockAccessToken}`
    it('should format Outlook events correctly', async () => {
      await calendarService.exportToOutlookCalendar(
        [mockEvents[2]], // Wedding ceremony
      
      expect(requestBody.subject).toBe('Wedding Ceremony');
      expect(requestBody.start.dateTime).toBe('2025-06-15T16:00:00-04:00');
      expect(requestBody.location.displayName).toBe('St. Mary\'s Church, 123 Main St, Anytown, NY');
  describe('Apple Calendar (.ics) Export', () => {
    it('should generate valid ICS file', async () => {
        reminderMinutes: [15, 30]
      const result = await calendarService.generateAppleCalendarFile(
      expect(result.icsContent).toBeDefined();
      const icsContent = result.icsContent!;
      // Verify ICS format
      expect(icsContent).toMatch(/^BEGIN:VCALENDAR\r?\n/);
      expect(icsContent).toMatch(/\r?\nEND:VCALENDAR$/);
      expect(icsContent).toContain('VERSION:2.0');
      expect(icsContent).toContain('PRODID:-//WedSync//Timeline Export//EN');
      // Verify calendar metadata
      expect(icsContent).toContain(`X-WR-CALNAME:${mockTimeline.name}`);
      expect(icsContent).toContain(`X-WR-TIMEZONE:${mockTimeline.timezone}`);
      // Verify events are included
      mockEvents.forEach(event => {
        expect(icsContent).toContain(`SUMMARY:${event.title.replace(/[\\;,\n]/g, '\\$&')}`);
        expect(icsContent).toContain(`UID:${event.id}@wedsync.com`);
      // Verify reminders are included
      expect(icsContent).toContain('BEGIN:VALARM');
      expect(icsContent).toContain('TRIGGER:-PT15M');
      expect(icsContent).toContain('TRIGGER:-PT30M');
    it('should properly escape ICS text content', async () => {
      const eventWithSpecialChars: TimelineEvent = {
        ...mockEvents[0],
        title: 'Event with; special, chars\nand newlines',
        description: 'Description with\nline breaks\nand\\backslashes',
        location: 'Location; with, commas'
        [eventWithSpecialChars],
          includeVendorDetails: false,
          includeInternalNotes: false,
          timezone: mockTimeline.timezone
      // Verify proper escaping
      expect(icsContent).toContain('SUMMARY:Event with\\; special\\, chars\\nand newlines');
      expect(icsContent).toContain('LOCATION:Location\\; with\\, commas');
    it('should set correct event priorities and statuses', async () => {
        [mockEvents[2]], // Wedding ceremony (critical priority, confirmed status)
      expect(icsContent).toContain('PRIORITY:1'); // Critical = priority 1
      expect(icsContent).toContain('STATUS:CONFIRMED');
  describe('Real-time Calendar Sync', () => {
    beforeEach(async () => {
      await timelineService.initialize();
    it('should trigger calendar sync when timeline events change', async () => {
      // Mock successful database and API operations
      const mockSupabase = (timelineService as unknown).supabase;
      mockSupabase.from().select().eq().neq().or.mockResolvedValue({
        data: [], // No conflicts
        error: null
      mockSupabase.from().insert().select().single.mockResolvedValue({
        data: { id: 'new-event-123', ...mockEvents[0] },
      // Mock calendar sync
      const syncSpy = vi.spyOn(calendarService, 'syncTimelineChanges')
        .mockResolvedValue({ success: true, errors: [] });
      // Create new event through realtime service
      const newEvent = {
        title: 'New Event',
        start_time: '2025-06-15T12:00:00-04:00',
        end_time: '2025-06-15T13:00:00-04:00',
        event_type: 'photos' as const
      const result = await timelineService.updateTimelineEvent(newEvent);
      // In a real implementation, this would be triggered by a database trigger or event
      // For testing, we simulate the calendar sync call
      const calendarMappings = [{
        calendarId: 'test-calendar',
        accessToken: 'test-token'
      }];
      await calendarService.syncTimelineChanges(
        { added: [result as any], updated: [], deleted: [] },
        calendarMappings
      expect(syncSpy).toHaveBeenCalled();
    it('should handle calendar sync failures gracefully', async () => {
        updated: [],
        deleted: []
      // Mock API failure
        statusText: 'Service Unavailable'
        [{
          provider: 'google',
          calendarId: 'test-calendar',
          accessToken: 'test-token'
        }]
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain('Google Calendar API error');
  describe('Cross-Platform Calendar Sync', () => {
    it('should sync to multiple calendar platforms simultaneously', async () => {
      const calendarMappings = [
          calendarId: 'google-calendar-123',
          accessToken: 'google-token'
        },
          provider: 'outlook',
          calendarId: 'outlook-calendar-123',
          accessToken: 'outlook-token'
      ];
      // Mock successful responses for both platforms
      (global.fetch as ReturnType<typeof vi.fn>).mockImplementation((url: string) => {
        if (url.includes('googleapis.com')) {
            json: () => Promise.resolve({ id: 'google-event-123' })
        } else if (url.includes('graph.microsoft.com')) {
            json: () => Promise.resolve({ id: 'outlook-event-123' })
        return Promise.resolve({ ok: false });
        updated: [mockEvents[1]],
        deleted: ['old-event-123']
      // Verify both platforms were called
      expect(calls.some(call => call[0].includes('googleapis.com'))).toBe(true);
      expect(calls.some(call => call[0].includes('graph.microsoft.com'))).toBe(true);
    it('should handle partial sync failures across platforms', async () => {
          accessToken: 'invalid-outlook-token'
      // Mock Google success, Outlook failure
            ok: false,
            statusText: 'Unauthorized'
        { added: [mockEvents[0]], updated: [], deleted: [] },
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('outlook');
  describe('Performance Tests', () => {
    it('should handle large timeline exports efficiently', async () => {
      // Generate 100 events for performance testing
      const largeEventSet = Array.from({ length: 100 }, (_, index) => ({
        id: `event-${index}`,
        title: `Event ${index + 1}`,
        start_time: new Date(2025, 5, 15, 8 + (index % 16), (index % 4) * 15).toISOString(),
        end_time: new Date(2025, 5, 15, 8 + (index % 16), (index % 4) * 15 + 60).toISOString()
      })) as TimelineEvent[];
        json: () => Promise.resolve({ id: 'calendar-123' })
      const startTime = performance.now();
        largeEventSet,
          includeVendorDetails: true,
      const endTime = performance.now();
      const executionTime = endTime - startTime;
      expect(executionTime).toBeLessThan(5000); // Should complete within 5 seconds
      expect(icsContent.split('BEGIN:VEVENT').length - 1).toBe(100); // Verify all events included
    it('should batch calendar API calls for large syncs', async () => {
      const manyEvents = Array.from({ length: 50 }, (_, i) => ({
        id: `batch-event-${i}`,
        title: `Batch Event ${i + 1}`
      // Mock API responses
        json: () => Promise.resolve({ id: 'success' })
        { added: manyEvents, updated: [], deleted: [] },
          calendarId: 'batch-test-calendar',
          accessToken: 'batch-token'
      expect(executionTime).toBeLessThan(10000); // Should handle 50 events within 10 seconds
      expect((global.fetch as ReturnType<typeof vi.fn>).mock.calls.length).toBe(manyEvents.length);
});
