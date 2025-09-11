/**
 * WS-336 Calendar Integration System - Unit Tests
 * Comprehensive unit testing for calendar synchronization across multiple providers
 * 
 * WEDDING CONTEXT: These tests ensure 99.9% reliability for wedding day calendar sync
 * Any failure could ruin someone's most important day.
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals'
import { CalendarSyncEngine } from '@/services/calendar/CalendarSyncEngine'
import { GoogleCalendarService } from '@/services/calendar/providers/GoogleCalendarService'
import { OutlookCalendarService } from '@/services/calendar/providers/OutlookCalendarService'
import { AppleCalendarService } from '@/services/calendar/providers/AppleCalendarService'
import { CalendarProvider, TimelineEvent, SyncResult } from '@/types/calendar'

// Mock all calendar providers
jest.mock('@/services/calendar/providers/GoogleCalendarService')
jest.mock('@/services/calendar/providers/OutlookCalendarService')
jest.mock('@/services/calendar/providers/AppleCalendarService')

describe('Calendar Sync Engine - Unit Tests', () => {
  let syncEngine: CalendarSyncEngine
  let mockGoogleService: jest.Mocked<GoogleCalendarService>
  let mockOutlookService: jest.Mocked<OutlookCalendarService>
  let mockAppleService: jest.Mocked<AppleCalendarService>

  // Test data factory for wedding scenarios
  const createWeddingEvent = (overrides: Partial<TimelineEvent> = {}): TimelineEvent => ({
    id: `wedding-event-${Math.random()}`,
    title: 'Smith Wedding - Photography',
    startTime: '2024-06-15T14:00:00Z',
    endTime: '2024-06-15T20:00:00Z',
    location: 'Grand Ballroom, Hotel Paradise',
    description: 'Wedding photography for Sarah & John Smith',
    type: 'wedding',
    vendorId: 'vendor-photographer-123',
    clientEmail: 'sarah.smith@example.com',
    status: 'confirmed',
    ...overrides
  })

  const createConflictingEvent = (originalEvent: TimelineEvent): TimelineEvent => ({
    ...createWeddingEvent(),
    id: 'conflicting-wedding-456',
    title: 'Jones Wedding - Photography',
    startTime: '2024-06-15T15:00:00Z', // Overlaps with original
    endTime: '2024-06-15T21:00:00Z',
    clientEmail: 'mary.jones@example.com'
  })

  beforeEach(() => {
    // Setup mocked services
    mockGoogleService = new GoogleCalendarService() as jest.Mocked<GoogleCalendarService>
    mockOutlookService = new OutlookCalendarService() as jest.Mocked<OutlookCalendarService>
    mockAppleService = new AppleCalendarService() as jest.Mocked<AppleCalendarService>

    // Initialize sync engine with mocked providers
    syncEngine = new CalendarSyncEngine()
    syncEngine.registerProvider(CalendarProvider.GOOGLE, mockGoogleService)
    syncEngine.registerProvider(CalendarProvider.OUTLOOK, mockOutlookService)
    syncEngine.registerProvider(CalendarProvider.APPLE, mockAppleService)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('Wedding Event Synchronization', () => {
    it('should sync wedding event to Google Calendar successfully', async () => {
      // Arrange
      const weddingEvent = createWeddingEvent()
      const expectedGoogleEvent = {
        summary: weddingEvent.title,
        start: { dateTime: weddingEvent.startTime },
        end: { dateTime: weddingEvent.endTime },
        location: weddingEvent.location,
        description: expect.stringContaining('Wedding photography'),
        attendees: [{ email: weddingEvent.clientEmail, displayName: 'Sarah & John Smith' }]
      }

      mockGoogleService.createEvent.mockResolvedValue({
        success: true,
        eventId: 'google-event-789',
        calendarEvent: expectedGoogleEvent,
        syncTimestamp: new Date().toISOString()
      })

      // Act
      const result = await syncEngine.syncEventToProvider(
        CalendarProvider.GOOGLE,
        'access-token-123',
        weddingEvent
      )

      // Assert
      expect(result.success).toBe(true)
      expect(result.eventId).toBe('google-event-789')
      expect(result.provider).toBe(CalendarProvider.GOOGLE)
      expect(mockGoogleService.createEvent).toHaveBeenCalledWith(
        'access-token-123',
        expect.objectContaining(expectedGoogleEvent)
      )
    })

    it('should handle wedding day conflicts gracefully', async () => {
      // Arrange
      const originalWedding = createWeddingEvent()
      const conflictingWedding = createConflictingEvent(originalWedding)

      mockGoogleService.createEvent.mockResolvedValue({
        success: false,
        error: 'WEDDING_CONFLICT_DETECTED',
        message: 'Cannot book photographer for overlapping wedding times',
        conflictDetails: {
          existingEvent: originalWedding,
          proposedEvent: conflictingWedding,
          overlapDuration: 300 // 5 hours in minutes
        }
      })

      // Act
      const result = await syncEngine.syncEventToProvider(
        CalendarProvider.GOOGLE,
        'access-token-123',
        conflictingWedding
      )

      // Assert
      expect(result.success).toBe(false)
      expect(result.error).toBe('WEDDING_CONFLICT_DETECTED')
      expect(result.conflictResolution).toBeDefined()
      expect(result.conflictResolution?.suggestedAlternatives).toHaveLength(3) // Multiple time slots
      expect(result.conflictResolution?.riskAssessment).toBe('HIGH') // Wedding day conflicts are high risk
    })

    it('should retry failed syncs with exponential backoff for wedding reliability', async () => {
      // Arrange
      const weddingEvent = createWeddingEvent()
      let callCount = 0

      mockGoogleService.createEvent
        .mockImplementation(() => {
          callCount++
          if (callCount === 1) {
            return Promise.reject(new Error('Network timeout - venue WiFi issue'))
          }
          if (callCount === 2) {
            return Promise.reject(new Error('Rate limit exceeded'))
          }
          return Promise.resolve({
            success: true,
            eventId: 'retry-success-event',
            retryAttempt: callCount
          })
        })

      // Act
      const result = await syncEngine.syncEventWithRetry(
        CalendarProvider.GOOGLE,
        'access-token-123',
        weddingEvent,
        { 
          maxRetries: 3, 
          baseDelay: 100,
          backoffMultiplier: 2,
          weddingDayMode: true // Enhanced retry for wedding days
        }
      )

      // Assert
      expect(result.success).toBe(true)
      expect(result.eventId).toBe('retry-success-event')
      expect(result.retryAttempts).toBe(3)
      expect(mockGoogleService.createEvent).toHaveBeenCalledTimes(3)
    })

    it('should sync to multiple providers simultaneously for redundancy', async () => {
      // Arrange
      const weddingEvent = createWeddingEvent()
      const providers = [CalendarProvider.GOOGLE, CalendarProvider.OUTLOOK, CalendarProvider.APPLE]

      mockGoogleService.createEvent.mockResolvedValue({ success: true, eventId: 'google-123' })
      mockOutlookService.createEvent.mockResolvedValue({ success: true, eventId: 'outlook-456' })
      mockAppleService.createEvent.mockResolvedValue({ success: true, eventId: 'apple-789' })

      // Act
      const results = await syncEngine.syncEventToMultipleProviders(
        providers,
        {
          [CalendarProvider.GOOGLE]: 'google-token',
          [CalendarProvider.OUTLOOK]: 'outlook-token',
          [CalendarProvider.APPLE]: 'apple-token'
        },
        weddingEvent
      )

      // Assert
      expect(results.successful).toBe(3)
      expect(results.failed).toBe(0)
      expect(results.providerResults).toHaveLength(3)
      results.providerResults.forEach(result => {
        expect(result.success).toBe(true)
        expect(result.eventId).toBeTruthy()
      })
    })
  })

  describe('OAuth Token Management', () => {
    it('should refresh expired tokens automatically during sync', async () => {
      // Arrange
      const weddingEvent = createWeddingEvent()
      const expiredToken = {
        accessToken: 'expired-token-123',
        refreshToken: 'refresh-token-456',
        expiresAt: Date.now() - 3600000 // 1 hour ago
      }

      const refreshedToken = {
        accessToken: 'new-access-token-789',
        refreshToken: 'refresh-token-456', // Same refresh token
        expiresAt: Date.now() + 3600000 // 1 hour from now
      }

      mockGoogleService.refreshToken.mockResolvedValue(refreshedToken)
      mockGoogleService.createEvent.mockResolvedValue({ success: true, eventId: 'token-refresh-success' })

      // Act
      const result = await syncEngine.syncEventWithTokenValidation(
        CalendarProvider.GOOGLE,
        expiredToken,
        weddingEvent
      )

      // Assert
      expect(result.success).toBe(true)
      expect(result.tokenRefreshed).toBe(true)
      expect(mockGoogleService.refreshToken).toHaveBeenCalledWith(expiredToken.refreshToken)
      expect(mockGoogleService.createEvent).toHaveBeenCalledWith(
        refreshedToken.accessToken,
        expect.any(Object)
      )
    })

    it('should handle refresh token revocation and require re-authorization', async () => {
      // Arrange
      const expiredToken = {
        accessToken: 'expired-token',
        refreshToken: 'revoked-refresh-token',
        expiresAt: Date.now() - 1000
      }

      mockGoogleService.refreshToken.mockRejectedValue(
        new Error('Refresh token has been revoked by user')
      )

      // Act & Assert
      await expect(
        syncEngine.syncEventWithTokenValidation(
          CalendarProvider.GOOGLE,
          expiredToken,
          createWeddingEvent()
        )
      ).rejects.toThrow('OAuth re-authorization required for Google Calendar')

      expect(mockGoogleService.refreshToken).toHaveBeenCalledWith(expiredToken.refreshToken)
    })
  })

  describe('Webhook Event Processing', () => {
    it('should process Google Calendar webhook and propagate timeline changes', async () => {
      // Arrange
      const webhookPayload = {
        kind: 'api#channel',
        id: 'webhook-channel-123',
        resourceId: 'resource-456',
        resourceUri: 'https://googleapis.com/calendar/v3/calendars/primary/events',
        token: 'verification-token-789'
      }

      const changedEvent = {
        id: 'changed-google-event',
        summary: 'Smith Wedding - Updated Time',
        start: { dateTime: '2024-06-15T15:00:00Z' }, // Changed from 14:00
        end: { dateTime: '2024-06-15T21:00:00Z' },
        updated: '2024-06-15T10:30:00Z',
        status: 'confirmed'
      }

      mockGoogleService.verifyWebhookSignature.mockReturnValue(true)
      mockGoogleService.fetchChangedEvents.mockResolvedValue([changedEvent])

      // Act
      const result = await syncEngine.processWebhook(CalendarProvider.GOOGLE, webhookPayload)

      // Assert
      expect(result.processed).toBe(true)
      expect(result.changedEvents).toHaveLength(1)
      expect(result.changedEvents[0].id).toBe('changed-google-event')
      expect(result.propagatedToOtherProviders).toBe(true)
      expect(mockGoogleService.verifyWebhookSignature).toHaveBeenCalledWith(webhookPayload)
    })

    it('should reject invalid webhook signatures for security', async () => {
      // Arrange
      const invalidWebhookPayload = {
        malicious: 'payload',
        attempt: 'injection'
      }

      mockGoogleService.verifyWebhookSignature.mockReturnValue(false)

      // Act
      const result = await syncEngine.processWebhook(CalendarProvider.GOOGLE, invalidWebhookPayload)

      // Assert
      expect(result.processed).toBe(false)
      expect(result.error).toBe('INVALID_WEBHOOK_SIGNATURE')
      expect(result.securityViolation).toBe(true)
      expect(mockGoogleService.fetchChangedEvents).not.toHaveBeenCalled()
    })
  })

  describe('Wedding Timeline Conflict Detection', () => {
    it('should detect overlapping wedding events and suggest resolution', async () => {
      // Arrange
      const existingWedding = createWeddingEvent({
        id: 'existing-wedding-123',
        title: 'Johnson Wedding - Photography',
        startTime: '2024-06-15T13:00:00Z',
        endTime: '2024-06-15T21:00:00Z'
      })

      const conflictingWedding = createWeddingEvent({
        id: 'conflicting-wedding-456',
        title: 'Brown Wedding - Photography',
        startTime: '2024-06-15T15:00:00Z',
        endTime: '2024-06-15T22:00:00Z'
      })

      // Act
      const conflictAnalysis = await syncEngine.detectTimelineConflicts(
        [existingWedding],
        conflictingWedding
      )

      // Assert
      expect(conflictAnalysis.hasConflicts).toBe(true)
      expect(conflictAnalysis.conflicts).toHaveLength(1)
      expect(conflictAnalysis.conflicts[0].type).toBe('WEDDING_TIME_OVERLAP')
      expect(conflictAnalysis.conflicts[0].severity).toBe('CRITICAL')
      expect(conflictAnalysis.conflicts[0].affectedDuration).toBe(360) // 6 hours overlap in minutes
      expect(conflictAnalysis.resolutionOptions).toHaveLength(3)
      expect(conflictAnalysis.resolutionOptions[0].action).toBe('ADJUST_TIMES')
      expect(conflictAnalysis.resolutionOptions[1].action).toBe('DECLINE_BOOKING')
      expect(conflictAnalysis.resolutionOptions[2].action).toBe('EMERGENCY_OVERRIDE')
    })

    it('should validate vendor availability across wedding timelines', async () => {
      // Arrange
      const vendorId = 'photographer-smith-789'
      const weddingTimeline = [
        createWeddingEvent({ 
          id: 'prep-time',
          title: 'Getting Ready Photos',
          startTime: '2024-06-15T10:00:00Z',
          endTime: '2024-06-15T12:00:00Z',
          vendorId
        }),
        createWeddingEvent({ 
          id: 'ceremony',
          title: 'Wedding Ceremony',
          startTime: '2024-06-15T14:00:00Z',
          endTime: '2024-06-15T15:00:00Z',
          vendorId
        }),
        createWeddingEvent({ 
          id: 'reception',
          title: 'Reception Photography',
          startTime: '2024-06-15T18:00:00Z',
          endTime: '2024-06-15T23:00:00Z',
          vendorId
        })
      ]

      // Act
      const availabilityCheck = await syncEngine.validateVendorAvailability(vendorId, weddingTimeline)

      // Assert
      expect(availabilityCheck.isAvailable).toBe(true)
      expect(availabilityCheck.gapsBetweenEvents).toHaveLength(2) // Between prep-ceremony and ceremony-reception
      expect(availabilityCheck.gapsBetweenEvents[0].duration).toBe(120) // 2 hours between prep and ceremony
      expect(availabilityCheck.gapsBetweenEvents[1].duration).toBe(180) // 3 hours between ceremony and reception
      expect(availabilityCheck.totalCommittedTime).toBe(540) // 9 hours total
      expect(availabilityCheck.travelTimeRequired).toBe(false) // Same venue assumed
    })
  })

  describe('Offline Sync and Recovery', () => {
    it('should queue events for sync when offline and process when online', async () => {
      // Arrange
      const offlineEvents = [
        createWeddingEvent({ id: 'offline-event-1', title: 'Offline Created Event 1' }),
        createWeddingEvent({ id: 'offline-event-2', title: 'Offline Created Event 2' }),
        createWeddingEvent({ id: 'offline-event-3', title: 'Offline Updated Event 3' })
      ]

      // Simulate offline state
      syncEngine.setOfflineMode(true)

      // Act - Events should be queued
      const queueResults = await Promise.all(
        offlineEvents.map(event => 
          syncEngine.syncEventToProvider(CalendarProvider.GOOGLE, 'token', event)
        )
      )

      // All should be queued
      queueResults.forEach(result => {
        expect(result.queued).toBe(true)
        expect(result.processed).toBe(false)
      })

      // Simulate coming back online
      syncEngine.setOfflineMode(false)
      mockGoogleService.createEvent.mockResolvedValue({ success: true, eventId: 'recovered-event' })

      // Process offline queue
      const recoveryResult = await syncEngine.processOfflineQueue()

      // Assert
      expect(recoveryResult.processedEvents).toBe(3)
      expect(recoveryResult.successful).toBe(3)
      expect(recoveryResult.failed).toBe(0)
      expect(mockGoogleService.createEvent).toHaveBeenCalledTimes(3)
    })

    it('should handle partial sync failures during recovery gracefully', async () => {
      // Arrange
      const offlineEvents = [
        createWeddingEvent({ id: 'recoverable-1' }),
        createWeddingEvent({ id: 'recoverable-2' }),
        createWeddingEvent({ id: 'fails-to-recover' })
      ]

      syncEngine.setOfflineMode(true)
      await Promise.all(
        offlineEvents.map(event => 
          syncEngine.syncEventToProvider(CalendarProvider.GOOGLE, 'token', event)
        )
      )

      syncEngine.setOfflineMode(false)

      // Mock partial failures
      mockGoogleService.createEvent
        .mockResolvedValueOnce({ success: true, eventId: 'recovered-1' })
        .mockResolvedValueOnce({ success: true, eventId: 'recovered-2' })
        .mockRejectedValueOnce(new Error('Permanent sync failure'))

      // Act
      const recoveryResult = await syncEngine.processOfflineQueue()

      // Assert
      expect(recoveryResult.processedEvents).toBe(3)
      expect(recoveryResult.successful).toBe(2)
      expect(recoveryResult.failed).toBe(1)
      expect(recoveryResult.permanentFailures).toHaveLength(1)
      expect(recoveryResult.permanentFailures[0].eventId).toBe('fails-to-recover')
    })
  })

  describe('Cross-Platform Event Mapping', () => {
    it('should map WedSync events to Google Calendar format correctly', () => {
      // Arrange
      const wedSyncEvent = createWeddingEvent({
        title: 'Miller Wedding Consultation',
        startTime: '2024-06-15T14:00:00Z',
        endTime: '2024-06-15T15:30:00Z',
        location: 'Starbucks Downtown',
        description: 'Discuss wedding photography package and timeline preferences',
        clientEmail: 'emma.miller@example.com',
        vendorId: 'photographer-pro-456'
      })

      // Act
      const googleEvent = syncEngine.mapToGoogleCalendarFormat(wedSyncEvent)

      // Assert
      expect(googleEvent).toEqual({
        summary: 'Miller Wedding Consultation',
        start: { dateTime: '2024-06-15T14:00:00Z' },
        end: { dateTime: '2024-06-15T15:30:00Z' },
        location: 'Starbucks Downtown',
        description: 'Discuss wedding photography package and timeline preferences\n\nClient: emma.miller@example.com',
        extendedProperties: {
          shared: {
            wedSyncEventId: wedSyncEvent.id,
            vendorId: 'photographer-pro-456',
            eventType: 'wedding',
            weddingDate: '2024-06-15'
          }
        },
        attendees: [
          { email: 'emma.miller@example.com', displayName: 'Emma Miller', responseStatus: 'needsAction' }
        ],
        colorId: '9', // Wedding events use color ID 9 (blue)
        visibility: 'private'
      })
    })

    it('should map WedSync events to Outlook Calendar format correctly', () => {
      // Arrange
      const wedSyncEvent = createWeddingEvent()

      // Act
      const outlookEvent = syncEngine.mapToOutlookCalendarFormat(wedSyncEvent)

      // Assert
      expect(outlookEvent).toMatchObject({
        subject: wedSyncEvent.title,
        start: { dateTime: wedSyncEvent.startTime, timeZone: 'UTC' },
        end: { dateTime: wedSyncEvent.endTime, timeZone: 'UTC' },
        location: { displayName: wedSyncEvent.location },
        body: {
          contentType: 'Text',
          content: expect.stringContaining(wedSyncEvent.description)
        },
        categories: ['Wedding', 'WedSync'],
        isReminderOn: true,
        reminderMinutesBeforeStart: 60
      })
    })

    it('should handle timezone conversion correctly for destination weddings', () => {
      // Arrange
      const destinationWedding = createWeddingEvent({
        title: 'Hawaii Destination Wedding',
        startTime: '2024-06-15T20:00:00-10:00', // Hawaii time
        endTime: '2024-06-16T02:00:00-10:00',   // Next day Hawaii time
        timezone: 'Pacific/Honolulu'
      })

      // Act
      const googleEvent = syncEngine.mapToGoogleCalendarFormat(destinationWedding)
      const outlookEvent = syncEngine.mapToOutlookCalendarFormat(destinationWedding)

      // Assert - Both should convert to UTC
      expect(googleEvent.start.dateTime).toBe('2024-06-16T06:00:00Z') // UTC equivalent
      expect(googleEvent.end.dateTime).toBe('2024-06-16T12:00:00Z')
      
      expect(outlookEvent.start.dateTime).toBe('2024-06-16T06:00:00Z')
      expect(outlookEvent.start.timeZone).toBe('UTC')
    })
  })

  describe('Performance and Reliability', () => {
    it('should handle high-volume concurrent sync operations', async () => {
      // Arrange
      const concurrentEvents = Array(50).fill(null).map((_, index) => 
        createWeddingEvent({
          id: `concurrent-event-${index}`,
          title: `Wedding ${index + 1} - Photography`,
          startTime: new Date(Date.now() + index * 86400000).toISOString() // Different days
        })
      )

      mockGoogleService.createEvent.mockResolvedValue({ success: true, eventId: 'concurrent-success' })

      // Act
      const startTime = performance.now()
      const results = await Promise.all(
        concurrentEvents.map(event => 
          syncEngine.syncEventToProvider(CalendarProvider.GOOGLE, 'token', event)
        )
      )
      const endTime = performance.now()

      // Assert
      const syncDuration = endTime - startTime
      expect(syncDuration).toBeLessThan(5000) // Should complete within 5 seconds
      expect(results.every(result => result.success)).toBe(true)
      expect(mockGoogleService.createEvent).toHaveBeenCalledTimes(50)
    })

    it('should implement circuit breaker for provider failures', async () => {
      // Arrange
      const weddingEvent = createWeddingEvent()
      
      // Mock repeated failures
      mockGoogleService.createEvent.mockRejectedValue(new Error('Provider service unavailable'))

      // Act - Multiple failures should trigger circuit breaker
      const failureResults = await Promise.all(
        Array(10).fill(null).map(() => 
          syncEngine.syncEventToProvider(CalendarProvider.GOOGLE, 'token', weddingEvent)
        )
      )

      // Assert - Circuit breaker should activate
      const circuitBreakerState = syncEngine.getCircuitBreakerState(CalendarProvider.GOOGLE)
      expect(circuitBreakerState.state).toBe('OPEN')
      expect(circuitBreakerState.failureCount).toBeGreaterThan(5)
      
      // Subsequent calls should fail fast
      const fastFailResult = await syncEngine.syncEventToProvider(CalendarProvider.GOOGLE, 'token', weddingEvent)
      expect(fastFailResult.success).toBe(false)
      expect(fastFailResult.error).toBe('CIRCUIT_BREAKER_OPEN')
      expect(fastFailResult.failedFast).toBe(true)
    })
  })
})