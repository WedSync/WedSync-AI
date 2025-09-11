/**
 * Auto-Scheduling Service Tests - WS-160
 * Tests for intelligent event placement, buffer calculations, and scheduling algorithms
 */

import { AutoSchedulingService } from '../autoSchedulingService';
import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll, Mock } from 'vitest';
import type { 
  TimelineEvent, 
  EventType, 
  EventPriority,
  EventStatus
} from '@/types/timeline';
import { addMinutes, parseISO, format } from 'date-fns';
describe('AutoSchedulingService', () => {
  const mockWeddingDate = '2024-06-15';
  const mockStartTime = new Date(`${mockWeddingDate}T10:00:00Z`);
  const mockEndTime = new Date(`${mockWeddingDate}T23:00:00Z`);
  const mockSchedulingConstraints = {
    wedding_start_time: mockStartTime,
    wedding_end_time: mockEndTime,
    ceremony_time: new Date(`${mockWeddingDate}T14:00:00Z`),
    critical_events: ['ceremony-event'],
    vendor_constraints: [],
    location_distances: [
      {
        from: 'Church',
        to: 'Reception Hall',
        travelMinutes: 20,
        distanceKm: 5
      }
    ],
    buffer_rules: {},
    priority_weights: {
      critical: 10,
      high: 7,
      medium: 4,
      low: 1
    }
  };
  const mockTimelineEvents: TimelineEvent[] = [
    {
      id: 'ceremony-event',
      timeline_id: 'timeline-123',
      title: 'Wedding Ceremony',
      start_time: `${mockWeddingDate}T14:00:00Z`,
      end_time: `${mockWeddingDate}T15:00:00Z`,
      duration_minutes: 60,
      event_type: 'ceremony',
      priority: 'critical',
      status: 'confirmed',
      is_locked: true,
      is_flexible: false,
      weather_dependent: false,
      location: 'Church',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
      id: 'preparation-event',
      title: 'Bride Preparation',
      start_time: `${mockWeddingDate}T10:00:00Z`,
      end_time: `${mockWeddingDate}T12:00:00Z`,
      duration_minutes: 120,
      event_type: 'preparation',
      priority: 'high',
      status: 'pending',
      is_locked: false,
      is_flexible: true,
      location: 'Bridal Suite',
      id: 'reception-event',
      title: 'Wedding Reception',
      start_time: `${mockWeddingDate}T18:00:00Z`,
      end_time: `${mockWeddingDate}T23:00:00Z`,
      duration_minutes: 300,
      event_type: 'reception',
      location: 'Reception Hall',
  ];
  describe('generateOptimizedSchedule', () => {
    it('should generate a schedule using forward scheduling', async () => {
      const result = await AutoSchedulingService.generateOptimizedSchedule(
        mockTimelineEvents,
        mockSchedulingConstraints,
        'forward'
      );
      expect(result.success).toBe(true);
      expect(result.schedule).toHaveLength(3);
      expect(result.efficiency_score).toBeGreaterThan(0);
      expect(result.conflicts).toBeInstanceOf(Array);
      expect(result.suggestions).toBeInstanceOf(Array);
    });
    it('should generate a schedule using backward scheduling', async () => {
        'backward'
      // Events should be scheduled working backwards from end time
      const lastEvent = result.schedule[result.schedule.length - 1];
      const lastEventEnd = new Date(lastEvent.end_time);
      expect(lastEventEnd.getTime()).toBeLessThanOrEqual(mockEndTime.getTime());
    it('should generate a schedule using hybrid scheduling', async () => {
        'hybrid'
      expect(result.total_duration).toBeGreaterThan(0);
      expect(result.buffer_utilization).toBeGreaterThanOrEqual(0);
    it('should respect critical event timing', async () => {
      const ceremonyEvent = result.schedule.find(e => e.id === 'ceremony-event');
      expect(ceremonyEvent).toBeDefined();
      expect(ceremonyEvent!.start_time).toBe(`${mockWeddingDate}T14:00:00Z`);
    it('should calculate appropriate buffer times', async () => {
      result.schedule.forEach(event => {
        expect(event.buffer_before_minutes).toBeGreaterThanOrEqual(0);
        expect(event.buffer_after_minutes).toBeGreaterThanOrEqual(0);
      });
    it('should handle empty event list', async () => {
        [],
      expect(result.schedule).toHaveLength(0);
      expect(result.efficiency_score).toBe(0);
      expect(result.total_duration).toBe(0);
    it('should sort events chronologically', async () => {
      const unorderedEvents = [...mockTimelineEvents].reverse();
      
        unorderedEvents,
      const schedule = result.schedule;
      for (let i = 0; i < schedule.length - 1; i++) {
        const currentStart = new Date(schedule[i].start_time);
        const nextStart = new Date(schedule[i + 1].start_time);
        expect(currentStart.getTime()).toBeLessThanOrEqual(nextStart.getTime());
  });
  describe('Forward Scheduling Algorithm', () => {
    it('should schedule events in priority order', async () => {
      const eventsWithVariedPriority: TimelineEvent[] = [
        {
          ...mockTimelineEvents[0],
          id: 'low-priority',
          priority: 'low',
          is_locked: false
        },
          ...mockTimelineEvents[1],
          id: 'high-priority',
          priority: 'high',
          ...mockTimelineEvents[2],
          id: 'critical-priority',
          priority: 'critical',
        }
      ];
        eventsWithVariedPriority,
      // Critical events should be scheduled in preferred positions
      const criticalEvent = result.schedule.find(e => e.id === 'critical-priority');
      const lowEvent = result.schedule.find(e => e.id === 'low-priority');
      expect(criticalEvent).toBeDefined();
      expect(lowEvent).toBeDefined();
    it('should avoid scheduling conflicts', async () => {
      const overlappingEvents: TimelineEvent[] = [
          start_time: `${mockWeddingDate}T14:00:00Z`,
          end_time: `${mockWeddingDate}T15:00:00Z`,
          start_time: `${mockWeddingDate}T14:30:00Z`,
          end_time: `${mockWeddingDate}T15:30:00Z`,
        overlappingEvents,
      // Check for time overlaps
        const currentEnd = new Date(schedule[i].end_time);
        expect(nextStart.getTime()).toBeGreaterThanOrEqual(currentEnd.getTime());
    it('should handle vendor constraints', async () => {
      const vendorConstraints = [{
        vendor_id: 'photographer-1',
        availability_windows: [{
          start: `${mockWeddingDate}T12:00:00Z`,
          end: `${mockWeddingDate}T18:00:00Z`
        }],
        buffer_requirements: {
          setup_time: 15,
          breakdown_time: 10,
          changeover_time: 5
        travel_time_factor: 1.2
      }];
      const constraintsWithVendor = {
        ...mockSchedulingConstraints,
        vendor_constraints: vendorConstraints
      };
      const eventsWithVendor = mockTimelineEvents.map(event => ({
        ...event,
        vendors: [{
          id: 'vendor-assignment-1',
          event_id: event.id,
          vendor_id: 'photographer-1',
          role: 'primary' as const,
          confirmation_status: 'confirmed' as const,
          assigned_at: new Date().toISOString()
        }]
      }));
        eventsWithVendor,
        constraintsWithVendor,
      // All events with vendor should be within availability window
        if (event.vendors?.some(v => v.vendor_id === 'photographer-1')) {
          const eventStart = new Date(event.start_time);
          const eventEnd = new Date(event.end_time);
          
          expect(eventStart.getTime()).toBeGreaterThanOrEqual(
            new Date(`${mockWeddingDate}T12:00:00Z`).getTime()
          );
          expect(eventEnd.getTime()).toBeLessThanOrEqual(
            new Date(`${mockWeddingDate}T18:00:00Z`).getTime()
  describe('Buffer Time Calculations', () => {
    it('should calculate setup buffer times correctly', async () => {
        // Setup buffer should be at least the default for event type
        expect(event.buffer_before_minutes).toBeGreaterThan(0);
        
        // Ceremony events should have longer setup times
        if (event.event_type === 'ceremony') {
          expect(event.buffer_before_minutes).toBeGreaterThanOrEqual(45);
    it('should calculate breakdown buffer times correctly', async () => {
        // Reception events should have longer breakdown times
        if (event.event_type === 'reception') {
          expect(event.buffer_after_minutes).toBeGreaterThanOrEqual(45);
    it('should add travel time for location changes', async () => {
      const eventsWithLocationChange = [
          ...mockTimelineEvents[0], // Church
          location: 'Church'
          ...mockTimelineEvents[2], // Reception Hall
          location: 'Reception Hall',
        eventsWithLocationChange,
      // Should account for travel time between Church and Reception Hall
      if (result.schedule.length >= 2) {
        const churchEvent = result.schedule.find(e => e.location === 'Church');
        const receptionEvent = result.schedule.find(e => e.location === 'Reception Hall');
        if (churchEvent && receptionEvent) {
          const churchEnd = new Date(churchEvent.end_time);
          const receptionStart = new Date(receptionEvent.start_time);
          const gap = (receptionStart.getTime() - churchEnd.getTime()) / 60000;
          // Should include at least the travel time (20 minutes)
          expect(gap).toBeGreaterThanOrEqual(20);
    it('should handle vendor changeover times', async () => {
      const eventsWithDifferentVendors = mockTimelineEvents.map((event, index) => ({
          id: `vendor-assignment-${index}`,
          vendor_id: `vendor-${index}`,
        eventsWithDifferentVendors,
      // Should add changeover time between events with different vendors
  describe('Conflict Detection', () => {
    it('should detect time overlap conflicts', async () => {
      const overlappingEvents = [
      // The algorithm should resolve overlaps, but may still report original conflicts
      expect(result.conflicts.some(c => c.type === 'time_overlap')).toBe(false);
    it('should detect vendor double-booking conflicts', async () => {
      const eventsWithSameVendor = mockTimelineEvents.map(event => ({
        start_time: `${mockWeddingDate}T14:00:00Z`,
        end_time: `${mockWeddingDate}T15:00:00Z`,
        is_locked: false,
          id: `assignment-${event.id}`,
        eventsWithSameVendor,
      // Vendor conflicts should be avoided by rescheduling
      expect(result.conflicts.some(c => c.type === 'vendor_overlap')).toBe(false);
    it('should detect location conflicts', async () => {
      const eventsWithSameLocation = mockTimelineEvents.map((event, index) => ({
        location: 'Main Hall',
        start_time: `${mockWeddingDate}T${14 + index}:00:00Z`,
        end_time: `${mockWeddingDate}T${15 + index}:00:00Z`,
        is_locked: index === 0 // Only first event is locked
        eventsWithSameLocation,
      // Should avoid location conflicts by rescheduling flexible events
        const currentEvent = schedule[i];
        const nextEvent = schedule[i + 1];
        if (currentEvent.location === nextEvent.location) {
          const currentEnd = new Date(currentEvent.end_time);
          const nextStart = new Date(nextEvent.start_time);
          expect(nextStart.getTime()).toBeGreaterThanOrEqual(currentEnd.getTime());
    it('should detect insufficient travel time', async () => {
      const eventsWithQuickTransition = [
          location: 'Church',
          end_time: `${mockWeddingDate}T15:00:00Z`
          start_time: `${mockWeddingDate}T15:10:00Z`, // Only 10 minutes gap
        eventsWithQuickTransition,
      // Should adjust timing to accommodate travel time
      const churchEvent = result.schedule.find(e => e.location === 'Church');
      const receptionEvent = result.schedule.find(e => e.location === 'Reception Hall');
      if (churchEvent && receptionEvent) {
        const churchEnd = new Date(churchEvent.end_time);
        const receptionStart = new Date(receptionEvent.start_time);
        const gap = (receptionStart.getTime() - churchEnd.getTime()) / 60000;
        expect(gap).toBeGreaterThanOrEqual(20); // Required travel time
  describe('Optimization Metrics', () => {
    it('should calculate efficiency score correctly', async () => {
      expect(result.efficiency_score).toBeLessThanOrEqual(100);
    it('should calculate buffer utilization', async () => {
      expect(result.buffer_utilization).toBeLessThanOrEqual(100);
    it('should calculate vendor utilization', async () => {
      const eventsWithVendors = mockTimelineEvents.map(event => ({
        eventsWithVendors,
      expect(result.vendor_utilization).toHaveProperty('photographer-1');
      expect(result.vendor_utilization['photographer-1']).toBeGreaterThanOrEqual(0);
      expect(result.vendor_utilization['photographer-1']).toBeLessThanOrEqual(100);
    it('should identify critical path', async () => {
      const eventsWithCriticalPath = [
          priority: 'critical' as EventPriority
          priority: 'medium' as EventPriority
        eventsWithCriticalPath,
      expect(result.critical_path).toBeInstanceOf(Array);
      expect(result.critical_path.length).toBeGreaterThan(0);
      // Critical path should include critical events
      const criticalEventIds = eventsWithCriticalPath
        .filter(e => e.priority === 'critical')
        .map(e => e.id);
      criticalEventIds.forEach(id => {
        expect(result.critical_path).toContain(id);
  describe('Optimization Suggestions', () => {
    it('should generate duration optimization suggestions', async () => {
      const eventsWithHighBuffer = mockTimelineEvents.map(event => ({
        buffer_before_minutes: 60, // High buffer time
        buffer_after_minutes: 60
        eventsWithHighBuffer,
      const durationSuggestions = result.suggestions.filter(s => s.type === 'optimize_duration');
      expect(durationSuggestions.length).toBeGreaterThan(0);
    it('should generate conflict resolution suggestions', async () => {
      const conflictingEvents = [
          is_locked: true
        conflictingEvents,
      if (result.conflicts.length > 0) {
        expect(result.suggestions.length).toBeGreaterThan(0);
        expect(result.suggestions.some(s => 
          ['adjust_buffers', 'vendor_change', 'relocate_event'].includes(s.type)
        )).toBe(true);
    it('should sort suggestions by impact score', async () => {
      if (result.suggestions.length > 1) {
        for (let i = 0; i < result.suggestions.length - 1; i++) {
          expect(result.suggestions[i].impact_score)
            .toBeGreaterThanOrEqual(result.suggestions[i + 1].impact_score);
  describe('Edge Cases and Error Handling', () => {
    it('should handle events outside timeline bounds', async () => {
      const outOfBoundsEvents = [
          start_time: `${mockWeddingDate}T08:00:00Z`, // Before timeline start
          start_time: `${mockWeddingDate}T23:30:00Z`, // After timeline end
        outOfBoundsEvents,
      // Should adjust events to fit within bounds
        const eventStart = new Date(event.start_time);
        const eventEnd = new Date(event.end_time);
        expect(eventStart.getTime()).toBeGreaterThanOrEqual(mockStartTime.getTime());
        expect(eventEnd.getTime()).toBeLessThanOrEqual(mockEndTime.getTime());
    it('should handle all locked events', async () => {
      const allLockedEvents = mockTimelineEvents.map(event => ({
        is_locked: true
        allLockedEvents,
      // Should preserve original timing for locked events
      result.schedule.forEach((scheduledEvent, index) => {
        const originalEvent = allLockedEvents.find(e => e.id === scheduledEvent.id);
        expect(scheduledEvent.start_time).toBe(originalEvent?.start_time);
    it('should handle events with no duration', async () => {
      const zeroDurationEvents = mockTimelineEvents.map(event => ({
        duration_minutes: 0,
        end_time: event.start_time
        zeroDurationEvents,
      // Should assign default durations
        const duration = (new Date(event.end_time).getTime() - new Date(event.start_time).getTime()) / 60000;
        expect(duration).toBeGreaterThan(0);
    it('should handle malformed dates gracefully', async () => {
      const malformedEvents = [
          start_time: 'invalid-date',
          end_time: 'also-invalid'
      await expect(
        AutoSchedulingService.generateOptimizedSchedule(
          malformedEvents,
          mockSchedulingConstraints,
          'forward'
        )
      ).rejects.toThrow();
    it('should handle insufficient timeline duration', async () => {
      const shortTimeline = {
        wedding_start_time: new Date(`${mockWeddingDate}T14:00:00Z`),
        wedding_end_time: new Date(`${mockWeddingDate}T15:00:00Z`) // Only 1 hour
      const longEvents = mockTimelineEvents.map(event => ({
        duration_minutes: 120, // 2 hours each
        is_locked: false
        longEvents,
        shortTimeline,
      expect(result.success).toBe(false);
      expect(result.conflicts.length).toBeGreaterThan(0);
  describe('Performance Tests', () => {
    it('should handle large numbers of events efficiently', async () => {
      // Generate 50 events
      const largeEventList: TimelineEvent[] = Array.from({ length: 50 }, (_, i) => ({
        id: `event-${i}`,
        timeline_id: 'timeline-123',
        title: `Event ${i}`,
        start_time: addMinutes(mockStartTime, i * 15).toISOString(),
        end_time: addMinutes(mockStartTime, i * 15 + 30).toISOString(),
        duration_minutes: 30,
        event_type: 'other' as EventType,
        priority: 'medium' as EventPriority,
        status: 'pending' as EventStatus,
        is_flexible: true,
        weather_dependent: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      const startTime = Date.now();
        largeEventList,
      const endTime = Date.now();
      expect(result.schedule).toHaveLength(50);
      expect(endTime - startTime).toBeLessThan(2000); // Should complete within 2 seconds
    it('should optimize complex vendor schedules efficiently', async () => {
      const complexVendorEvents = Array.from({ length: 20 }, (_, i) => ({
        start_time: addMinutes(mockStartTime, i * 30).toISOString(),
        end_time: addMinutes(mockStartTime, i * 30 + 45).toISOString(),
        duration_minutes: 45,
        updated_at: new Date().toISOString(),
        vendors: [
          {
            id: `assignment-${i}-1`,
            event_id: `event-${i}`,
            vendor_id: `vendor-${i % 5}`, // 5 different vendors
            role: 'primary',
            confirmation_status: 'confirmed',
            assigned_at: new Date().toISOString()
          }
        ]
        complexVendorEvents,
      expect(Object.keys(result.vendor_utilization)).toHaveLength(5);
      expect(endTime - startTime).toBeLessThan(3000); // Should complete within 3 seconds
  describe('Algorithm Comparison', () => {
    it('should produce different results for different algorithms', async () => {
      const forwardResult = await AutoSchedulingService.generateOptimizedSchedule(
      const backwardResult = await AutoSchedulingService.generateOptimizedSchedule(
      const hybridResult = await AutoSchedulingService.generateOptimizedSchedule(
      expect(forwardResult.schedule).toHaveLength(mockTimelineEvents.length);
      expect(backwardResult.schedule).toHaveLength(mockTimelineEvents.length);
      expect(hybridResult.schedule).toHaveLength(mockTimelineEvents.length);
      // Results may differ in timing or efficiency
      expect(
        forwardResult.efficiency_score === backwardResult.efficiency_score &&
        backwardResult.efficiency_score === hybridResult.efficiency_score
      ).toBe(false);
    it('should maintain event integrity across algorithms', async () => {
      const algorithms: ('forward' | 'backward' | 'hybrid')[] = ['forward', 'backward', 'hybrid'];
      for (const algorithm of algorithms) {
        const result = await AutoSchedulingService.generateOptimizedSchedule(
          mockTimelineEvents,
          algorithm
        );
        // All original events should be present
        expect(result.schedule).toHaveLength(mockTimelineEvents.length);
        mockTimelineEvents.forEach(originalEvent => {
          const scheduledEvent = result.schedule.find(e => e.id === originalEvent.id);
          expect(scheduledEvent).toBeDefined();
          expect(scheduledEvent!.title).toBe(originalEvent.title);
          expect(scheduledEvent!.event_type).toBe(originalEvent.event_type);
        });
});
