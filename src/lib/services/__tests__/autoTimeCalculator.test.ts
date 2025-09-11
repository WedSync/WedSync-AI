// =====================================================
// AUTO TIME CALCULATOR UNIT TESTS
// Comprehensive test coverage for timeline calculations
// Feature ID: WS-160 - Timeline Builder UI
// Created: 2025-01-20

import { AutoTimeCalculator } from '../autoTimeCalculator'
import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll, Mock } from 'vitest';
import type { TimelineEvent, EventType, EventPriority } from '@/types/timeline'
// TEST SETUP & MOCKS
describe('AutoTimeCalculator', () => {
  let calculator: AutoTimeCalculator
  beforeEach(() => {
    calculator = new AutoTimeCalculator()
  })
  // =====================================================
  // HELPER FUNCTIONS
  const createMockEvent = (overrides: Partial<TimelineEvent> = {}): TimelineEvent => ({
    id: 'test-event-1',
    timeline_id: 'timeline-1',
    title: 'Test Event',
    start_time: '2025-06-15T14:00:00Z',
    end_time: '2025-06-15T15:00:00Z',
    event_type: 'ceremony',
    priority: 'high',
    status: 'pending',
    is_locked: false,
    is_flexible: true,
    weather_dependent: false,
    created_at: '2025-01-20T10:00:00Z',
    updated_at: '2025-01-20T10:00:00Z',
    ...overrides
  // BASIC CALCULATION TESTS
  describe('calculateEventTiming', () => {
    it('should calculate timing for ceremony event with default duration', () => {
      const event = createMockEvent({ event_type: 'ceremony' })
      const result = calculator.calculateEventTiming(event)
      expect(result).toMatchObject({
        recommendedDuration: expect.any(Number),
        suggestedStartTime: expect.any(Date),
        suggestedEndTime: expect.any(Date),
        confidence: expect.any(Number)
      })
      
      expect(result.recommendedDuration).toBeGreaterThan(0)
      expect(result.confidence).toBeGreaterThanOrEqual(0)
      expect(result.confidence).toBeLessThanOrEqual(1)
    })
    it('should calculate different durations for different event types', () => {
      const ceremonyEvent = createMockEvent({ event_type: 'ceremony' })
      const receptionEvent = createMockEvent({ event_type: 'reception' })
      const ceremonyResult = calculator.calculateEventTiming(ceremonyEvent)
      const receptionResult = calculator.calculateEventTiming(receptionEvent)
      expect(ceremonyResult.recommendedDuration).not.toBe(receptionResult.recommendedDuration)
    it('should account for event complexity in duration calculation', () => {
      const simpleEvent = createMockEvent({ 
        event_type: 'ceremony',
        vendors: []
      const complexEvent = createMockEvent({
        vendors: [
          { id: '1', event_id: 'test-event-1', vendor_id: 'v1', confirmation_status: 'confirmed', assigned_at: '2025-01-20T10:00:00Z' },
          { id: '2', event_id: 'test-event-1', vendor_id: 'v2', confirmation_status: 'confirmed', assigned_at: '2025-01-20T10:00:00Z' },
          { id: '3', event_id: 'test-event-1', vendor_id: 'v3', confirmation_status: 'confirmed', assigned_at: '2025-01-20T10:00:00Z' }
        ] as any,
        weather_dependent: true
      const simpleResult = calculator.calculateEventTiming(simpleEvent)
      const complexResult = calculator.calculateEventTiming(complexEvent)
      expect(complexResult.recommendedDuration).toBeGreaterThan(simpleResult.recommendedDuration)
    it('should handle preceding and following events', () => {
      const precedingEvent = createMockEvent({
        id: 'preceding',
        end_time: '2025-06-15T13:30:00Z'
      const currentEvent = createMockEvent({
        start_time: '2025-06-15T14:00:00Z'
      const followingEvent = createMockEvent({
        id: 'following',
        start_time: '2025-06-15T15:30:00Z'
      const result = calculator.calculateEventTiming(currentEvent, precedingEvent, followingEvent)
      expect(result.constraints).toBeDefined()
      expect(result.bufferRecommendations).toBeDefined()
  // BUFFER TIME TESTS
  describe('calculateBufferTimes', () => {
    it('should calculate appropriate buffer times', () => {
      const result = calculator.calculateBufferTimes(event)
      expect(result.before).toBeGreaterThanOrEqual(0)
      expect(result.after).toBeGreaterThanOrEqual(0)
      expect(result.setup).toBeGreaterThanOrEqual(0)
      expect(result.breakdown).toBeGreaterThanOrEqual(0)
    it('should increase buffer times for high-priority events', () => {
      const lowPriorityEvent = createMockEvent({ priority: 'low' })
      const highPriorityEvent = createMockEvent({ priority: 'critical' })
      const lowResult = calculator.calculateBufferTimes(lowPriorityEvent)
      const highResult = calculator.calculateBufferTimes(highPriorityEvent)
      expect(highResult.before).toBeGreaterThanOrEqual(lowResult.before)
      expect(highResult.after).toBeGreaterThanOrEqual(lowResult.after)
    it('should account for weather-dependent events', () => {
      const indoorEvent = createMockEvent({ weather_dependent: false })
      const outdoorEvent = createMockEvent({ weather_dependent: true })
      const indoorResult = calculator.calculateBufferTimes(indoorEvent)
      const outdoorResult = calculator.calculateBufferTimes(outdoorEvent)
      expect(outdoorResult.before).toBeGreaterThan(indoorResult.before)
  // TRAVEL TIME TESTS
  describe('calculateTravelTime', () => {
    it('should return 0 for same location', () => {
      const event1 = createMockEvent({ location: 'Venue A' })
      const event2 = createMockEvent({ location: 'Venue A' })
      const travelTime = calculator.calculateTravelTime(event1, event2)
      expect(travelTime).toBe(0)
    it('should estimate travel time for different locations', () => {
      const event1 = createMockEvent({ location: 'Church' })
      const event2 = createMockEvent({ location: 'Reception Hall' })
      expect(travelTime).toBeGreaterThan(0)
    it('should use coordinates when available', () => {
      const event1 = createMockEvent({
        location: 'Location A',
        coordinates: { lat: 40.7128, lng: -74.0060 }
      const event2 = createMockEvent({
        location: 'Location B',
        coordinates: { lat: 40.7589, lng: -73.9851 }
  // CONFLICT DETECTION TESTS
  describe('detectTimelineConflicts', () => {
    it('should detect overlapping events', () => {
      const events = [
        createMockEvent({
          id: 'event1',
          start_time: '2025-06-15T14:00:00Z',
          end_time: '2025-06-15T15:00:00Z'
        }),
          id: 'event2',
          start_time: '2025-06-15T14:30:00Z',
          end_time: '2025-06-15T15:30:00Z'
        })
      ]
      const conflicts = calculator.detectTimelineConflicts(events)
      expect(conflicts).toHaveLength(1)
      expect(conflicts[0].conflictType).toBe('time_overlap')
    it('should detect insufficient buffer time', () => {
          end_time: '2025-06-15T15:00:00Z',
          location: 'Church'
          start_time: '2025-06-15T15:05:00Z',
          end_time: '2025-06-15T16:00:00Z',
          location: 'Reception Hall'
      expect(conflicts.some(c => c.conflictType === 'insufficient_buffer')).toBe(true)
    it('should not detect conflicts for properly spaced events', () => {
          start_time: '2025-06-15T16:00:00Z',
          end_time: '2025-06-15T17:00:00Z'
      expect(conflicts).toHaveLength(0)
  // OPTIMIZATION TESTS
  describe('optimizeTimeline', () => {
    it('should optimize timeline to minimize gaps', () => {
          is_flexible: true
          start_time: '2025-06-15T17:00:00Z',
          end_time: '2025-06-15T18:00:00Z',
      const optimized = calculator.optimizeTimeline(events)
      expect(optimized.optimizedEvents).toHaveLength(2)
      expect(optimized.improvements).toBeDefined()
      expect(optimized.totalTimeSaved).toBeGreaterThanOrEqual(0)
    it('should respect locked events during optimization', () => {
      const lockedEvent = createMockEvent({
        id: 'locked',
        start_time: '2025-06-15T14:00:00Z',
        end_time: '2025-06-15T15:00:00Z',
        is_locked: true
      const flexibleEvent = createMockEvent({
        id: 'flexible',
        start_time: '2025-06-15T17:00:00Z',
        end_time: '2025-06-15T18:00:00Z',
        is_flexible: true
      const optimized = calculator.optimizeTimeline([lockedEvent, flexibleEvent])
      const optimizedLocked = optimized.optimizedEvents.find(e => e.id === 'locked')
      expect(optimizedLocked?.start_time).toBe(lockedEvent.start_time)
      expect(optimizedLocked?.end_time).toBe(lockedEvent.end_time)
  // CRITICAL PATH TESTS
  describe('calculateCriticalPath', () => {
    it('should identify critical path events', () => {
          id: 'prep',
          event_type: 'preparation',
          start_time: '2025-06-15T12:00:00Z',
          end_time: '2025-06-15T14:00:00Z'
          id: 'ceremony',
          event_type: 'ceremony',
          depends_on: ['prep']
          id: 'reception',
          event_type: 'reception',
          end_time: '2025-06-15T22:00:00Z',
          depends_on: ['ceremony']
      const criticalPath = calculator.calculateCriticalPath(events)
      expect(criticalPath.events).toContain('ceremony')
      expect(criticalPath.totalDuration).toBeGreaterThan(0)
      expect(criticalPath.slack).toBeDefined()
  // EDGE CASES & ERROR HANDLING
  describe('edge cases', () => {
    it('should handle empty events array', () => {
      const result = calculator.detectTimelineConflicts([])
      expect(result).toEqual([])
    it('should handle single event', () => {
      const event = createMockEvent()
      expect(result).toBeDefined()
    it('should handle events with missing data', () => {
      const incompleteEvent = createMockEvent({
        event_type: undefined,
        location: undefined
      }) as any
      expect(() => calculator.calculateEventTiming(incompleteEvent)).not.toThrow()
    it('should handle invalid date formats gracefully', () => {
      const invalidEvent = createMockEvent({
        start_time: 'invalid-date',
        end_time: 'also-invalid'
      expect(() => calculator.calculateEventTiming(invalidEvent)).not.toThrow()
  // PERFORMANCE TESTS
  describe('performance', () => {
    it('should handle large number of events efficiently', () => {
      const manyEvents = Array.from({ length: 1000 }, (_, i) => 
          id: `event-${i}`,
          start_time: new Date(2025, 5, 15, 10 + (i * 0.1)).toISOString(),
          end_time: new Date(2025, 5, 15, 11 + (i * 0.1)).toISOString()
      )
      const startTime = performance.now()
      const conflicts = calculator.detectTimelineConflicts(manyEvents)
      const endTime = performance.now()
      expect(endTime - startTime).toBeLessThan(1000) // Should complete in under 1 second
      expect(conflicts).toBeDefined()
    it('should optimize calculation results', () => {
      // First calculation
      const start1 = performance.now()
      const result1 = calculator.calculateEventTiming(event)
      const end1 = performance.now()
      // Second calculation (should use cache if implemented)
      const start2 = performance.now()
      const result2 = calculator.calculateEventTiming(event)
      const end2 = performance.now()
      expect(result1).toEqual(result2)
      // Second calculation might be faster due to caching
  // INTEGRATION TESTS
  describe('integration scenarios', () => {
    it('should handle complete wedding timeline optimization', () => {
      const weddingEvents = [
          id: 'bridal-prep',
          title: 'Bridal Preparation',
          start_time: '2025-06-15T09:00:00Z',
          end_time: '2025-06-15T12:00:00Z',
          location: 'Hotel Suite'
          title: 'Wedding Ceremony',
          location: 'Church',
          priority: 'critical'
          id: 'cocktails',
          title: 'Cocktail Hour',
          event_type: 'cocktails',
          start_time: '2025-06-15T15:30:00Z',
          end_time: '2025-06-15T16:30:00Z',
          location: 'Reception Venue'
          title: 'Reception Dinner',
      const conflicts = calculator.detectTimelineConflicts(weddingEvents)
      const optimization = calculator.optimizeTimeline(weddingEvents)
      const criticalPath = calculator.calculateCriticalPath(weddingEvents)
      expect(optimization.optimizedEvents).toHaveLength(weddingEvents.length)
})
