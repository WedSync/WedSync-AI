/**
 * Timeline Conflict Resolution Service Tests - WS-160
 * Tests for conflict detection, resolution strategies, and concurrent edit handling
 */

import { TimelineConflictResolutionService } from '../timeline-conflict-resolution-service';
import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll, Mock } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import type { 
  TimelineEvent, 
  TimelineConflict, 
  ConflictType, 
  ConflictSeverity 
} from '@/types/timeline';
// Mock Supabase
jest.mock('@supabase/supabase-js');
const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>;
describe('TimelineConflictResolutionService', () => {
  let service: TimelineConflictResolutionService;
  let mockSupabase: any;
  const mockTimelineEvents: TimelineEvent[] = [
    {
      id: 'event-1',
      timeline_id: 'timeline-123',
      title: 'Wedding Ceremony',
      start_time: '2024-06-15T14:00:00Z',
      end_time: '2024-06-15T15:00:00Z',
      event_type: 'ceremony',
      priority: 'high',
      status: 'confirmed',
      is_locked: false,
      is_flexible: true,
      weather_dependent: false,
      location: 'Main Chapel',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      vendors: [
        {
          id: 'vendor-assignment-1',
          event_id: 'event-1',
          vendor_id: 'photographer-1',
          role: 'primary',
          confirmation_status: 'confirmed',
          assigned_at: new Date().toISOString()
        }
      ]
    },
      id: 'event-2',
      title: 'Reception Setup',
      start_time: '2024-06-15T14:30:00Z',
      end_time: '2024-06-15T16:00:00Z',
      event_type: 'setup',
      priority: 'medium',
      status: 'pending',
      location: 'Reception Hall',
          id: 'vendor-assignment-2',
          event_id: 'event-2',
          role: 'support',
          confirmation_status: 'pending',
    }
  ];
  beforeEach(() => {
    jest.clearAllMocks();
    // Mock Supabase client methods
    mockSupabase = {
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      gt: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      single: jest.fn(),
      rpc: jest.fn()
    };
    mockCreateClient.mockReturnValue(mockSupabase);
    // Set environment variables
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';
    service = new TimelineConflictResolutionService();
  });
  describe('detectConflicts', () => {
    it('should detect time overlap conflicts', async () => {
      const overlappingEvents: TimelineEvent[] = [
          ...mockTimelineEvents[0],
          start_time: '2024-06-15T14:00:00Z',
          end_time: '2024-06-15T15:00:00Z'
        },
          ...mockTimelineEvents[1],
          start_time: '2024-06-15T14:30:00Z',
          end_time: '2024-06-15T15:30:00Z'
      ];
      // Mock database calls
      mockSupabase.insert.mockResolvedValue({ data: null, error: null });
      const conflicts = await service.detectConflicts('timeline-123', overlappingEvents);
      expect(conflicts).toHaveLength(1);
      expect(conflicts[0].conflict_type).toBe('time_overlap');
      expect(conflicts[0].severity).toBe('warning');
      expect(conflicts[0].event_id_1).toBe('event-1');
      expect(conflicts[0].event_id_2).toBe('event-2');
    });
    it('should detect vendor overlap conflicts', async () => {
      const conflicts = await service.detectConflicts('timeline-123', mockTimelineEvents);
      expect(conflicts.some(c => c.conflict_type === 'vendor_overlap')).toBe(true);
      const vendorConflict = conflicts.find(c => c.conflict_type === 'vendor_overlap');
      expect(vendorConflict?.severity).toBe('error');
      expect(vendorConflict?.description).toContain('double-booking');
    it('should detect location conflicts', async () => {
      const locationConflictEvents: TimelineEvent[] = [
          location: 'Main Hall',
      const conflicts = await service.detectConflicts('timeline-123', locationConflictEvents);
      expect(conflicts.some(c => c.conflict_type === 'location_conflict')).toBe(true);
    it('should detect dependency conflicts', async () => {
      const dependencyEvents: TimelineEvent[] = [
          id: 'ceremony',
          start_time: '2024-06-15T15:00:00Z', // Ceremony after setup
          depends_on: ['setup']
          id: 'setup',
          start_time: '2024-06-15T16:00:00Z' // Setup starts after ceremony
      const conflicts = await service.detectConflicts('timeline-123', dependencyEvents);
      expect(conflicts.some(c => c.conflict_type === 'dependency_issue')).toBe(true);
      const depConflict = conflicts.find(c => c.conflict_type === 'dependency_issue');
      expect(depConflict?.severity).toBe('error');
    it('should save detected conflicts to database', async () => {
      mockSupabase.select.mockResolvedValue({ data: null, error: null });
      await service.detectConflicts('timeline-123', mockTimelineEvents);
      expect(mockSupabase.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          timeline_id: 'timeline-123',
          conflict_type: expect.any(String)
        })
      );
  describe('resolveConflict', () => {
    const mockConflict: TimelineConflict = {
      id: 'conflict-123',
      conflict_type: 'time_overlap',
      severity: 'warning',
      event_id_1: 'event-1',
      event_id_2: 'event-2',
      description: 'Time overlap conflict',
      is_resolved: false,
      detected_at: new Date().toISOString(),
      last_checked_at: new Date().toISOString(),
      can_auto_resolve: true
    it('should successfully resolve time overlap conflict with time shift strategy', async () => {
      // Mock conflict fetch
      mockSupabase.single
        .mockResolvedValueOnce({
          data: {
            ...mockConflict,
            event_1: mockTimelineEvents[0],
            event_2: mockTimelineEvents[1]
          },
          error: null
        });
      // Mock timeline events fetch
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            data: mockTimelineEvents,
            error: null
          })
      });
      // Mock timeline settings fetch
      mockSupabase.single.mockResolvedValueOnce({
        data: { buffer_time_minutes: 15, allow_vendor_edits: true },
        error: null
      // Mock event update
      mockSupabase.update.mockResolvedValue({ data: null, error: null });
      
      // Mock conflict resolution update
      const resolution = await service.resolveConflict('conflict-123');
      expect(resolution?.success).toBe(true);
      expect(resolution?.strategy).toBe('time_shift');
      expect(resolution?.changes).toHaveLength(1);
      expect(resolution?.explanation).toContain('Moved');
    it('should handle duration reduction strategy', async () => {
      const eventWithMaxDuration = {
        ...mockTimelineEvents[0],
        max_duration_minutes: 45 // Can be reduced from 60 minutes
      };
      const conflictWithDuration = {
        ...mockConflict,
        event_1: eventWithMaxDuration
        data: conflictWithDuration,
            data: [eventWithMaxDuration],
        data: { buffer_time_minutes: 15 },
      const resolution = await service.resolveConflict('conflict-123', 'duration_reduce');
      expect(resolution?.strategy).toBe('duration_reduce');
      expect(resolution?.requiresApproval).toBe(true);
    it('should require approval for vendor conflicts', async () => {
      const vendorConflict = {
        conflict_type: 'vendor_overlap' as ConflictType,
        severity: 'error' as ConflictSeverity
        data: vendorConflict,
    it('should handle non-existent conflict', async () => {
      mockSupabase.single.mockResolvedValue({
        data: null,
        error: { message: 'Conflict not found' }
      const resolution = await service.resolveConflict('nonexistent-conflict');
      expect(resolution).toBeNull();
    it('should log successful resolution', async () => {
      mockSupabase.from.mockImplementation((table) => {
        if (table === 'timeline_events') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({
                data: mockTimelineEvents,
                error: null
              })
            }),
            update: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({ error: null })
            })
          };
        if (table === 'wedding_timelines') {
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: { buffer_time_minutes: 15 },
                  error: null
                })
        if (table === 'timeline_conflicts') {
        if (table === 'timeline_activity_logs') {
            insert: jest.fn().mockResolvedValue({ error: null })
        return mockSupabase;
      await service.resolveConflict('conflict-123');
          action: 'conflict_resolved'
  describe('getAvailableStrategies', () => {
    it('should return appropriate strategies for time overlap conflicts', () => {
      const conflict: TimelineConflict = {
        id: 'conflict-123',
        timeline_id: 'timeline-123',
        conflict_type: 'time_overlap',
        severity: 'warning',
        event_id_1: 'event-1',
        event_id_2: 'event-2',
        description: 'Test conflict',
        is_resolved: false,
        detected_at: new Date().toISOString(),
        last_checked_at: new Date().toISOString(),
        can_auto_resolve: true
      const strategies = service.getAvailableStrategies(conflict);
      expect(strategies.some(s => s.id === 'time_shift')).toBe(true);
      expect(strategies.some(s => s.id === 'duration_reduce')).toBe(true);
      expect(strategies.some(s => s.id === 'split_event')).toBe(true);
    it('should return vendor-specific strategies for vendor conflicts', () => {
      const vendorConflict: TimelineConflict = {
        conflict_type: 'vendor_overlap',
        severity: 'error',
        description: 'Vendor conflict',
        can_auto_resolve: false
      const strategies = service.getAvailableStrategies(vendorConflict);
      expect(strategies.some(s => s.id === 'vendor_reassign')).toBe(true);
    it('should sort strategies by priority', () => {
      // Should be sorted by priority (descending)
      for (let i = 0; i < strategies.length - 1; i++) {
        expect(strategies[i].priority).toBeGreaterThanOrEqual(strategies[i + 1].priority);
      }
  describe('detectConcurrentEdits', () => {
    it('should detect no conflicts when versions match', async () => {
      const localChanges = {
        title: 'Updated Wedding Ceremony',
        location: 'New Chapel'
        data: {
          id: 'event-1',
          version: 1,
          title: 'Wedding Ceremony',
          location: 'Original Chapel'
      const result = await service.detectConcurrentEdits('event-1', localChanges, 1);
      expect(result.hasConflicts).toBe(false);
      expect(result.mergedEvent).toBeDefined();
    it('should detect concurrent edits when version is newer', async () => {
            id: 'event-1',
            version: 3, // Newer than last known version (1)
            title: 'Modified Wedding Ceremony',
            location: 'Another Chapel'
      // Mock version history
          eq: jest.fn().mockReturnValue({
            gt: jest.fn().mockReturnValue({
              order: jest.fn().mockResolvedValue({
                data: [
                  {
                    version: 2,
                    changes: { title: 'Modified Wedding Ceremony' }
                  },
                    version: 3,
                    changes: { location: 'Another Chapel' }
                  }
                ],
      expect(result.hasConflicts).toBe(true);
      expect(result.conflicts).toHaveLength(2); // title and location conflicts
    it('should handle missing event gracefully', async () => {
        error: { message: 'Event not found' }
      const result = await service.detectConcurrentEdits('nonexistent-event', {}, 1);
      expect(result.conflicts).toHaveLength(0);
  describe('performThreeWayMerge', () => {
    const baseVersion = {
      title: 'Original Title',
      location: 'Original Location',
      priority: 'medium' as const
    it('should merge non-conflicting changes', async () => {
        title: 'Local Title Change'
      const remoteEvent = {
        ...baseVersion,
        location: 'Remote Location Change'
      const result = await service.performThreeWayMerge(
        'event-1',
        localChanges,
        remoteEvent,
        baseVersion
      expect(result.success).toBe(true);
      expect(result.mergedEvent?.title).toBe('Local Title Change');
      expect(result.mergedEvent?.location).toBe('Remote Location Change');
    it('should detect conflicts when both sides change same field', async () => {
        title: 'Remote Title Change'
      expect(result.success).toBe(false);
      expect(result.conflicts).toHaveLength(1);
      expect(result.conflicts?.[0].field).toBe('title');
      expect(result.conflicts?.[0].conflictType).toBe('concurrent_edit');
    it('should handle identical changes', async () => {
      const identicalChange = {
        title: 'Same Title Change'
        identicalChange,
      expect(result.mergedEvent?.title).toBe('Same Title Change');
  describe('autoResolveConflicts', () => {
    it('should auto-resolve eligible conflicts', async () => {
      const autoResolvableConflicts = [
          id: 'conflict-1',
          can_auto_resolve: true,
          conflict_type: 'time_overlap'
          id: 'conflict-2',
          conflict_type: 'location_conflict'
      // Mock conflicts fetch
            eq: jest.fn().mockReturnValue({
                data: autoResolvableConflicts,
      // Mock successful resolution
      jest.spyOn(service, 'resolveConflict').mockResolvedValue({
        success: true,
        strategy: 'time_shift',
        changes: [],
        explanation: 'Auto-resolved',
        requiresApproval: false
      const stats = await service.autoResolveConflicts('timeline-123');
      expect(stats.resolved).toBe(2);
      expect(stats.failed).toBe(0);
      expect(stats.requiresManualReview).toBe(0);
    it('should track failures and manual reviews', async () => {
      const mixedConflicts = [
        { id: 'conflict-1', can_auto_resolve: true },
        { id: 'conflict-2', can_auto_resolve: true },
        { id: 'conflict-3', can_auto_resolve: true }
                data: mixedConflicts,
      jest.spyOn(service, 'resolveConflict')
        .mockResolvedValueOnce({ success: true, strategy: 'test', changes: [], explanation: 'resolved', requiresApproval: false })
        .mockResolvedValueOnce({ success: false, strategy: 'test', changes: [], explanation: 'needs approval', requiresApproval: true })
        .mockRejectedValueOnce(new Error('Resolution failed'));
      expect(stats.resolved).toBe(1);
      expect(stats.requiresManualReview).toBe(1);
      expect(stats.failed).toBe(1);
    it('should handle no conflicts gracefully', async () => {
                data: [],
      expect(stats.resolved).toBe(0);
  describe('Helper methods', () => {
    it('should correctly identify event overlaps', async () => {
      const event1 = {
        start_time: '2024-06-15T14:00:00Z',
        end_time: '2024-06-15T15:00:00Z'
      const event2 = {
        start_time: '2024-06-15T14:30:00Z',
        end_time: '2024-06-15T15:30:00Z'
      const event3 = {
        start_time: '2024-06-15T15:00:00Z',
        end_time: '2024-06-15T16:00:00Z'
      // Use reflection to access private method for testing
      const eventsOverlap = (service as any).eventsOverlap;
      expect(eventsOverlap(event1, event2)).toBe(true);
      expect(eventsOverlap(event1, event3)).toBe(false); // Adjacent events don't overlap
    it('should require approval for critical conflicts', () => {
      const criticalConflict: TimelineConflict = {
        description: 'Critical conflict',
      const requiresApproval = (service as any).requiresApproval(criticalConflict);
      expect(requiresApproval).toBe(true);
    it('should build proper conflict context', async () => {
          buffer_time_minutes: 20,
          allow_vendor_edits: true
      const context = await (service as any).buildConflictContext(
        'timeline-123',
        mockTimelineEvents
      expect(context.events).toEqual(mockTimelineEvents);
      expect(context.timelineSettings.bufferMinutes).toBe(20);
      expect(context.userPreferences.autoResolve).toBe(true);
  describe('Error handling', () => {
    it('should handle database errors gracefully', async () => {
      mockSupabase.from.mockImplementation(() => {
        throw new Error('Database connection failed');
      await expect(
        service.detectConflicts('timeline-123', mockTimelineEvents)
      ).rejects.toThrow('Database connection failed');
    it('should handle malformed event data', async () => {
      const malformedEvents = [
          // Missing required fields
          start_time: 'invalid-date',
          end_time: null
      ] as any;
      // Should not crash, but may produce empty results
      const conflicts = await service.detectConflicts('timeline-123', malformedEvents);
      expect(Array.isArray(conflicts)).toBe(true);
    it('should handle resolution strategy failures', async () => {
        data: mockConflict,
      mockSupabase.update.mockRejectedValue(new Error('Update failed'));
  describe('Performance considerations', () => {
    it('should handle large numbers of events efficiently', async () => {
      // Generate 100 events
      const largeEventList: TimelineEvent[] = Array.from({ length: 100 }, (_, i) => ({
        id: `event-${i}`,
        title: `Event ${i}`,
        start_time: new Date(2024, 5, 15, 10 + Math.floor(i / 10), (i % 10) * 6).toISOString(),
        end_time: new Date(2024, 5, 15, 10 + Math.floor(i / 10), (i % 10) * 6 + 30).toISOString(),
        event_type: 'other',
        priority: 'medium',
        status: 'pending',
        is_locked: false,
        is_flexible: true,
        weather_dependent: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }));
      const startTime = Date.now();
      await service.detectConflicts('timeline-123', largeEventList);
      const endTime = Date.now();
      // Should complete within reasonable time (< 1 second for 100 events)
      expect(endTime - startTime).toBeLessThan(1000);
    it('should batch database operations efficiently', async () => {
      const conflicts = Array.from({ length: 10 }, (_, i) => ({
        id: `conflict-${i}`,
                data: conflicts,
        strategy: 'test',
        explanation: 'batch resolved',
      await service.autoResolveConflicts('timeline-123');
      // Should call resolveConflict for each conflict
      expect(service.resolveConflict).toHaveBeenCalledTimes(10);
});
