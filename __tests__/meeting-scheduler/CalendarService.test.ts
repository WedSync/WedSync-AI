/**
 * Unit Tests for CalendarService
 * WS-064: Meeting Scheduler - Calendar Integration Testing
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import CalendarService, { 
  getCalendarService, 
  syncBookingToCalendars, 
  removeBookingFromCalendars 
} from '@/lib/services/calendar-service';

// Mock Supabase
const mockSupabaseClient = {
  from: vi.fn(() => ({
    insert: vi.fn(() => ({ select: vi.fn(() => ({ single: vi.fn() })) })),
    select: vi.fn(() => ({ eq: vi.fn(() => ({ eq: vi.fn() })) })),
    update: vi.fn(() => ({ eq: vi.fn() })),
    delete: vi.fn(() => ({ eq: vi.fn() }))
  }))
};

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => mockSupabaseClient)
}));

// Mock crypto-js
vi.mock('crypto-js', () => ({
  default: {
    AES: {
      encrypt: vi.fn((text) => ({ toString: () => `encrypted_${text}` })),
      decrypt: vi.fn((encrypted) => ({
        toString: vi.fn(() => encrypted.replace('encrypted_', ''))
      }))
    },
    enc: {
      Utf8: {}
    }
  }
}));

// Mock fetch
global.fetch = vi.fn();

// Test data
const mockIntegration = {
  id: 'integration-123',
  supplier_id: 'supplier-123',
  booking_page_id: 'page-123',
  provider: 'google' as const,
  calendar_id: 'primary',
  calendar_name: 'Primary Calendar',
  access_token_encrypted: 'encrypted_access_token',
  refresh_token_encrypted: 'encrypted_refresh_token',
  token_expires_at: new Date(Date.now() + 3600000).toISOString(), // 1 hour from now
  is_active: true,
  sync_direction: 'bidirectional' as const,
  last_sync_at: undefined,
  sync_errors: [],
  event_title_template: 'Meeting with {client_name}'
};

const mockBookingData = {
  id: 'booking-123',
  client_name: 'John Smith',
  client_email: 'john@example.com',
  scheduled_at: '2024-01-01T10:00:00Z',
  duration_minutes: 30,
  meeting_type_name: 'Initial Consultation',
  meeting_location: 'Video Call',
  special_requirements: 'Need parking information',
  timezone: 'Europe/London'
};

const mockCalendarEvent = {
  title: 'Meeting with John Smith',
  description: 'Meeting: Initial Consultation\nClient: John Smith (john@example.com)',
  start: '2024-01-01T10:00:00Z',
  end: '2024-01-01T10:30:00Z',
  timezone: 'Europe/London',
  location: 'Video Call',
  attendees: [
    {
      email: 'john@example.com',
      name: 'John Smith',
      status: 'accepted' as const
    }
  ],
  created_by: 'system' as const,
  booking_id: 'booking-123'
};

describe('CalendarService', () => {
  let calendarService: CalendarService;

  beforeEach(() => {
    vi.clearAllMocks();
    calendarService = new CalendarService(mockIntegration);
    
    // Mock successful fetch responses
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ id: 'event-123' }),
      status: 200,
      statusText: 'OK'
    });
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('Provider Configuration', () => {
    it('returns available providers', () => {
      const providers = CalendarService.getProviders();
      
      expect(providers).toHaveLength(2);
      expect(providers[0]).toMatchObject({
        id: 'google',
        name: 'Google Calendar',
        type: 'google'
      });
      expect(providers[1]).toMatchObject({
        id: 'outlook',
        name: 'Outlook Calendar',
        type: 'outlook'
      });
    });

    it('includes required OAuth scopes', () => {
      const providers = CalendarService.getProviders();
      
      expect(providers[0].scopes).toContain('https://www.googleapis.com/auth/calendar');
      expect(providers[1].scopes).toContain('https://graph.microsoft.com/calendars.readwrite');
    });
  });

  describe('Integration Creation', () => {
    it('creates new Google Calendar integration', async () => {
      const mockTokenData = {
        access_token: 'access_token',
        refresh_token: 'refresh_token',
        expires_in: 3600
      };
      
      const mockCalendarInfo = {
        id: 'primary',
        name: 'Primary Calendar'
      };

      // Mock API calls
      (global.fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockTokenData)
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ id: 'primary', summary: 'Primary Calendar' })
        });

      // Mock database insert
      mockSupabaseClient.from().insert().select().single.mockResolvedValue({
        data: { ...mockIntegration, id: 'new-integration-123' },
        error: null
      });

      const integration = await CalendarService.createIntegration(
        'supplier-123',
        'page-123',
        'google',
        'auth-code-123'
      );

      expect(integration.id).toBe('new-integration-123');
      expect(integration.provider).toBe('google');
    });

    it('handles OAuth token exchange errors', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        statusText: 'Invalid auth code'
      });

      await expect(
        CalendarService.createIntegration('supplier-123', 'page-123', 'google', 'invalid-code')
      ).rejects.toThrow('Failed to create google integration');
    });

    it('encrypts tokens before storing', async () => {
      const mockTokenData = {
        access_token: 'secret_token',
        refresh_token: 'secret_refresh',
        expires_in: 3600
      };

      (global.fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockTokenData)
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ id: 'primary', summary: 'Primary' })
        });

      mockSupabaseClient.from().insert().select().single.mockResolvedValue({
        data: mockIntegration,
        error: null
      });

      await CalendarService.createIntegration('supplier-123', 'page-123', 'google', 'auth-code');

      const insertCall = mockSupabaseClient.from().insert.mock.calls[0][0];
      expect(insertCall.access_token_encrypted).toBe('encrypted_secret_token');
      expect(insertCall.refresh_token_encrypted).toBe('encrypted_secret_refresh');
    });
  });

  describe('Token Management', () => {
    it('decrypts access token correctly', async () => {
      await calendarService.syncBookingToCalendar(mockBookingData);
      
      // Should use decrypted token in API call
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('googleapis.com'),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'Bearer access_token'
          })
        })
      );
    });

    it('refreshes expired tokens automatically', async () => {
      // Create service with expired token
      const expiredIntegration = {
        ...mockIntegration,
        token_expires_at: new Date(Date.now() - 3600000).toISOString() // 1 hour ago
      };
      
      const expiredService = new CalendarService(expiredIntegration);

      // Mock refresh token response
      (global.fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            access_token: 'new_access_token',
            expires_in: 3600
          })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ id: 'event-123' })
        });

      // Mock database update
      mockSupabaseClient.from().update().eq.mockResolvedValue({ error: null });

      await expiredService.syncBookingToCalendar(mockBookingData);

      // Should refresh token before creating event
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/calendar/google/refresh',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ refresh_token: 'refresh_token' })
        })
      );
    });

    it('handles token refresh failures', async () => {
      const expiredIntegration = {
        ...mockIntegration,
        token_expires_at: new Date(Date.now() - 3600000).toISOString()
      };
      
      const expiredService = new CalendarService(expiredIntegration);

      // Mock failed refresh
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        statusText: 'Invalid refresh token'
      });

      await expect(
        expiredService.syncBookingToCalendar(mockBookingData)
      ).rejects.toThrow('Failed to refresh google access token');
    });
  });

  describe('Google Calendar Integration', () => {
    it('creates Google Calendar event successfully', async () => {
      const eventId = await calendarService.createEvent(mockCalendarEvent);
      
      expect(eventId).toBe('event-123');
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('googleapis.com/calendar/v3'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Authorization': 'Bearer access_token',
            'Content-Type': 'application/json'
          }),
          body: expect.stringContaining('Meeting with John Smith')
        })
      );
    });

    it('formats Google Calendar event correctly', async () => {
      await calendarService.createEvent(mockCalendarEvent);
      
      const requestBody = JSON.parse((global.fetch as any).mock.calls[0][1].body);
      expect(requestBody).toMatchObject({
        summary: 'Meeting with John Smith',
        start: {
          dateTime: '2024-01-01T10:00:00Z',
          timeZone: 'Europe/London'
        },
        end: {
          dateTime: '2024-01-01T10:30:00Z',
          timeZone: 'Europe/London'
        },
        location: 'Video Call',
        attendees: [
          {
            email: 'john@example.com',
            displayName: 'John Smith'
          }
        ]
      });
    });

    it('updates Google Calendar event', async () => {
      await calendarService.updateEvent('event-123', mockCalendarEvent);
      
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/events/event-123'),
        expect.objectContaining({
          method: 'PUT'
        })
      );
    });

    it('deletes Google Calendar event', async () => {
      await calendarService.deleteEvent('event-123');
      
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/events/event-123'),
        expect.objectContaining({
          method: 'DELETE'
        })
      );
    });

    it('handles Google Calendar API errors', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        statusText: 'Forbidden'
      });

      await expect(
        calendarService.createEvent(mockCalendarEvent)
      ).rejects.toThrow('Google Calendar API error: Forbidden');
    });
  });

  describe('Outlook Calendar Integration', () => {
    beforeEach(() => {
      calendarService = new CalendarService({
        ...mockIntegration,
        provider: 'outlook'
      });
    });

    it('creates Outlook event successfully', async () => {
      const eventId = await calendarService.createEvent(mockCalendarEvent);
      
      expect(eventId).toBe('event-123');
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('graph.microsoft.com'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Authorization': 'Bearer access_token',
            'Content-Type': 'application/json'
          })
        })
      );
    });

    it('formats Outlook event correctly', async () => {
      await calendarService.createEvent(mockCalendarEvent);
      
      const requestBody = JSON.parse((global.fetch as any).mock.calls[0][1].body);
      expect(requestBody).toMatchObject({
        subject: 'Meeting with John Smith',
        start: {
          dateTime: '2024-01-01T10:00:00Z',
          timeZone: 'Europe/London'
        },
        end: {
          dateTime: '2024-01-01T10:30:00Z',
          timeZone: 'Europe/London'
        },
        attendees: [
          {
            emailAddress: {
              address: 'john@example.com',
              name: 'John Smith'
            },
            type: 'required'
          }
        ]
      });
    });

    it('handles video call integration for Outlook', async () => {
      const videoCallEvent = {
        ...mockCalendarEvent,
        meeting_url: 'https://teams.microsoft.com/meeting'
      };

      await calendarService.createEvent(videoCallEvent);
      
      const requestBody = JSON.parse((global.fetch as any).mock.calls[0][1].body);
      expect(requestBody.isOnlineMeeting).toBe(true);
      expect(requestBody.onlineMeetingProvider).toBe('teamsForBusiness');
    });
  });

  describe('Booking Synchronization', () => {
    it('syncs booking to calendar with correct event details', async () => {
      const eventId = await calendarService.syncBookingToCalendar(mockBookingData);
      
      expect(eventId).toBe('event-123');
      
      const requestBody = JSON.parse((global.fetch as any).mock.calls[0][1].body);
      expect(requestBody.summary).toBe('Meeting with John Smith');
      expect(requestBody.description).toContain('Initial Consultation');
      expect(requestBody.description).toContain('john@example.com');
      expect(requestBody.attendees[0].email).toBe('john@example.com');
    });

    it('includes special requirements in event description', async () => {
      await calendarService.syncBookingToCalendar(mockBookingData);
      
      const requestBody = JSON.parse((global.fetch as any).mock.calls[0][1].body);
      expect(requestBody.description).toContain('Need parking information');
    });

    it('calculates correct end time based on duration', async () => {
      await calendarService.syncBookingToCalendar(mockBookingData);
      
      const requestBody = JSON.parse((global.fetch as any).mock.calls[0][1].body);
      expect(requestBody.end.dateTime).toBe('2024-01-01T10:30:00.000Z');
    });

    it('uses custom event title template', async () => {
      const customService = new CalendarService({
        ...mockIntegration,
        event_title_template: 'Wedding Meeting: {client_name}'
      });

      await customService.syncBookingToCalendar(mockBookingData);
      
      const requestBody = JSON.parse((global.fetch as any).mock.calls[0][1].body);
      expect(requestBody.summary).toBe('Wedding Meeting: John Smith');
    });
  });

  describe('Error Handling and Logging', () => {
    it('logs sync errors to database', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        statusText: 'Calendar not found'
      });

      // Mock error logging
      mockSupabaseClient.from().update().eq.mockResolvedValue({ error: null });

      await expect(
        calendarService.createEvent(mockCalendarEvent)
      ).rejects.toThrow();

      // Should log error
      expect(mockSupabaseClient.from().update).toHaveBeenCalledWith({
        sync_errors: expect.arrayContaining([
          expect.objectContaining({
            error: expect.stringContaining('Calendar not found')
          })
        ])
      });
    });

    it('handles network errors gracefully', async () => {
      (global.fetch as any).mockRejectedValueOnce(new Error('Network error'));

      await expect(
        calendarService.createEvent(mockCalendarEvent)
      ).rejects.toThrow('Network error');
    });

    it('continues operation when error logging fails', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        statusText: 'API Error'
      });

      // Mock error logging failure
      mockSupabaseClient.from().update().eq.mockResolvedValue({
        error: new Error('Database error')
      });

      await expect(
        calendarService.createEvent(mockCalendarEvent)
      ).rejects.toThrow('API Error');

      // Should not crash due to logging error
    });
  });

  describe('Health Checks', () => {
    it('returns success for healthy connection', async () => {
      const result = await calendarService.testConnection();
      
      expect(result.success).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('detects connection issues', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        statusText: 'Unauthorized'
      });

      const result = await calendarService.testConnection();
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Unauthorized');
    });

    it('handles network failures in health check', async () => {
      (global.fetch as any).mockRejectedValueOnce(new Error('Network timeout'));

      const result = await calendarService.testConnection();
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Network timeout');
    });
  });

  describe('Multiple Calendar Services', () => {
    it('gets calendar services for supplier', async () => {
      mockSupabaseClient.from().select().eq().eq.mockResolvedValue({
        data: [mockIntegration],
        error: null
      });

      const services = await getCalendarService('supplier-123');
      
      expect(services).toHaveLength(1);
      expect(services[0]).toBeInstanceOf(CalendarService);
    });

    it('filters by booking page ID', async () => {
      mockSupabaseClient.from().select().eq().eq.mockResolvedValue({
        data: [mockIntegration],
        error: null
      });

      await getCalendarService('supplier-123', 'page-123');
      
      const queryCall = mockSupabaseClient.from().select().eq().eq.mock.calls[0];
      expect(queryCall[0]).toBe('page-123');
    });

    it('syncs booking to multiple calendars', async () => {
      const googleIntegration = { ...mockIntegration, provider: 'google' as const };
      const outlookIntegration = { ...mockIntegration, id: 'integration-456', provider: 'outlook' as const };

      mockSupabaseClient.from().select().eq().eq.mockResolvedValue({
        data: [googleIntegration, outlookIntegration],
        error: null
      });

      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ id: 'event-123' })
      });

      const result = await syncBookingToCalendars('supplier-123', 'page-123', mockBookingData);
      
      expect(result.success).toBe(true);
      expect(result.results).toHaveLength(2);
      expect(result.results[0]).toMatchObject({
        provider: 'google',
        success: true,
        eventId: 'event-123'
      });
      expect(result.results[1]).toMatchObject({
        provider: 'outlook',
        success: true,
        eventId: 'event-123'
      });
    });

    it('handles partial failures in multi-calendar sync', async () => {
      const googleIntegration = { ...mockIntegration, provider: 'google' as const };
      const outlookIntegration = { ...mockIntegration, id: 'integration-456', provider: 'outlook' as const };

      mockSupabaseClient.from().select().eq().eq.mockResolvedValue({
        data: [googleIntegration, outlookIntegration],
        error: null
      });

      // Google succeeds, Outlook fails
      (global.fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ id: 'google-event-123' })
        })
        .mockResolvedValueOnce({
          ok: false,
          statusText: 'Outlook API Error'
        });

      const result = await syncBookingToCalendars('supplier-123', 'page-123', mockBookingData);
      
      expect(result.success).toBe(false);
      expect(result.results[0].success).toBe(true);
      expect(result.results[1].success).toBe(false);
      expect(result.results[1].error).toContain('Outlook API Error');
    });
  });

  describe('Performance', () => {
    it('completes calendar sync within performance budget', async () => {
      const startTime = performance.now();
      
      await calendarService.syncBookingToCalendar(mockBookingData);
      
      const syncTime = performance.now() - startTime;
      
      // Should complete well within 500ms booking confirmation requirement
      expect(syncTime).toBeLessThan(200);
    });

    it('handles concurrent calendar operations', async () => {
      const promises = Array.from({ length: 5 }, () =>
        calendarService.syncBookingToCalendar({
          ...mockBookingData,
          id: `booking-${Math.random()}`
        })
      );

      const results = await Promise.allSettled(promises);
      
      // All operations should complete successfully
      expect(results.every(r => r.status === 'fulfilled')).toBe(true);
    });
  });

  describe('Security', () => {
    it('uses HTTPS for all API calls', async () => {
      await calendarService.createEvent(mockCalendarEvent);
      
      const url = (global.fetch as any).mock.calls[0][0];
      expect(url).toMatch(/^https:/);
    });

    it('includes proper authorization headers', async () => {
      await calendarService.createEvent(mockCalendarEvent);
      
      const headers = (global.fetch as any).mock.calls[0][1].headers;
      expect(headers.Authorization).toBe('Bearer access_token');
    });

    it('does not log sensitive information', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        statusText: 'Invalid token'
      });

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      await expect(
        calendarService.createEvent(mockCalendarEvent)
      ).rejects.toThrow();

      // Error logs should not contain access tokens
      const errorCalls = consoleSpy.mock.calls.flat().join(' ');
      expect(errorCalls).not.toContain('access_token');
      expect(errorCalls).not.toContain('encrypted_');

      consoleSpy.mockRestore();
    });
  });
});