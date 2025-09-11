/**
 * Unit Tests for WS-160 Timeline Services
 */

import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll, Mock } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import { EnhancedRealtimeTimelineService } from '@/lib/services/enhanced-realtime-timeline-service';
import { CalendarExportService } from '@/lib/services/calendar-export-service';
import { TimelinePermissionService } from '@/lib/services/timeline-permission-service';
import { TimelineNotificationService } from '@/lib/services/timeline-notification-service';
import { TimelineConflictResolutionService } from '@/lib/services/timeline-conflict-resolution-service';
import { TimelineEvent, TimelineConflict } from '@/types/timeline';
// Mock Supabase
vi.mock('@supabase/supabase-js');
const mockSupabase = {
  from: jest.fn(() => ({
    select: jest.fn(() => ({
      eq: jest.fn(() => ({
        single: vi.fn(),
        order: jest.fn(() => ({ limit: vi.fn() }))
      })),
      insert: jest.fn(() => ({
        select: jest.fn(() => ({ single: vi.fn() }))
      update: jest.fn(() => ({
        eq: jest.fn(() => ({ select: jest.fn(() => ({ single: vi.fn() })) }))
      delete: jest.fn(() => ({
        eq: vi.fn()
      or: vi.fn(),
      neq: vi.fn(),
      gte: vi.fn(),
      lte: vi.fn(),
      gt: vi.fn(),
      lt: vi.fn(),
      in: vi.fn()
    }))
  })),
  channel: jest.fn(() => ({
    on: jest.fn(() => ({
      on: jest.fn(() => ({
        subscribe: vi.fn()
      }))
    })),
    track: vi.fn(),
    send: vi.fn(),
    unsubscribe: vi.fn()
  }))
};
(createClient as ReturnType<typeof vi.fn>).mockReturnValue(mockSupabase);
describe('Enhanced Realtime Timeline Service', () => {
  let service: EnhancedRealtimeTimelineService;
  const mockTimelineId = 'timeline-123';
  const mockUserId = 'user-123';
  const mockUserName = 'Test User';
  beforeEach(() => {
    vi.clearAllMocks();
    service = new EnhancedRealtimeTimelineService(mockTimelineId, mockUserId, mockUserName);
  });
  afterEach(async () => {
    await service.destroy();
  describe('Initialization', () => {
    it('should initialize with correct parameters', () => {
      expect(service).toBeDefined();
      expect(createClient).toHaveBeenCalledWith(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      );
    });
    it('should set up realtime channel on initialize', async () => {
      await service.initialize();
      
      expect(mockSupabase.channel).toHaveBeenCalledWith(
        `timeline:${mockTimelineId}`,
        expect.objectContaining({
          config: expect.objectContaining({
            broadcast: { self: true },
            presence: { key: mockUserId }
          })
        })
  describe('Event Management', () => {
    const mockEvent: Partial<TimelineEvent> = {
      title: 'Test Event',
      start_time: '2025-06-01T10:00:00Z',
      end_time: '2025-06-01T11:00:00Z',
      event_type: 'ceremony'
    };
    beforeEach(async () => {
      // Mock successful database operations
      mockSupabase.from().select().eq().single.mockResolvedValue({ 
        data: null, 
        error: null 
      });
      mockSupabase.from().insert().select().single.mockResolvedValue({
        data: { id: 'event-123', ...mockEvent },
        error: null
    it('should create timeline event successfully', async () => {
      const result = await service.updateTimelineEvent(mockEvent);
      expect(result.success).toBe(true);
      expect(mockSupabase.from).toHaveBeenCalledWith('timeline_events');
    it('should handle event creation with conflict', async () => {
      // Mock conflict detection
      const mockConflict: TimelineConflict = {
        id: 'conflict-123',
        timeline_id: mockTimelineId,
        conflict_type: 'time_overlap',
        severity: 'error',
        event_id_1: 'event-123',
        description: 'Test conflict',
        is_resolved: false,
        detected_at: '2025-01-20T10:00:00Z',
        last_checked_at: '2025-01-20T10:00:00Z',
        can_auto_resolve: false
      };
      // Mock overlapping events
      mockSupabase.from().select().eq().neq().or.mockResolvedValue({
        data: [{ 
          id: 'existing-event',
          start_time: '2025-06-01T10:30:00Z',
          end_time: '2025-06-01T11:30:00Z',
          location: 'Same Location'
        }],
      const result = await service.updateTimelineEvent({
        ...mockEvent,
        location: 'Same Location'
      expect(result.success).toBe(false);
      expect(result.conflict).toBeDefined();
      expect(result.conflict?.conflict_type).toBe('location_conflict');
    it('should delete timeline event successfully', async () => {
      const eventId = 'event-123';
      mockSupabase.from().select().eq().single.mockResolvedValue({
        data: { id: eventId, ...mockEvent },
      mockSupabase.from().delete().eq.mockResolvedValue({ error: null });
      const result = await service.deleteTimelineEvent(eventId);
      expect(result).toBe(true);
    it('should fail to delete locked event', async () => {
      // Mock event lock
      service['collaborationState'].editLocks.set(eventId, {
        eventId,
        userId: 'another-user',
        userName: 'Another User',
        timestamp: Date.now(),
        expiresAt: Date.now() + 300000
      expect(result).toBe(false);
  describe('Edit Locking', () => {
    const eventId = 'event-123';
    it('should lock event for editing', async () => {
      const result = await service.lockEventForEditing(eventId);
      expect(service['collaborationState'].editLocks.has(eventId)).toBe(true);
    it('should fail to lock already locked event', async () => {
      // First lock
      await service.lockEventForEditing(eventId);
      // Try to lock again with different user
      const anotherService = new EnhancedRealtimeTimelineService(
        mockTimelineId, 
        'another-user', 
        'Another User'
      const result = await anotherService.lockEventForEditing(eventId);
    it('should unlock event successfully', async () => {
      await service.unlockEvent(eventId);
      expect(service['collaborationState'].editLocks.has(eventId)).toBe(false);
  describe('Version Management', () => {
      // Mock timeline events
      mockSupabase.from().select().eq.mockResolvedValue({
        data: [mockEvent],
      // Mock version data
      mockSupabase.from().select().eq().order().limit().single.mockResolvedValue({
        data: { version: 1 },
      mockSupabase.from().insert.mockResolvedValue({ error: null });
    it('should create version snapshot', async () => {
      await service['createVersionSnapshot']('Test snapshot');
      expect(mockSupabase.from).toHaveBeenCalledWith('timeline_versions');
    it('should rollback to previous version', async () => {
      const version = 2;
      mockSupabase.from().select().eq().eq().single.mockResolvedValue({
        data: {
          timeline_id: mockTimelineId,
          version,
          changes: { events: [mockEvent] }
        },
      const result = await service.rollbackToVersion(version);
    it('should get version history', async () => {
      const mockVersions = [
        { id: '1', version: 1, created_at: '2025-01-20T10:00:00Z' },
        { id: '2', version: 2, created_at: '2025-01-20T11:00:00Z' }
      ];
      mockSupabase.from().select().eq().order.mockResolvedValue({
        data: mockVersions,
      const versions = await service.getVersionHistory();
      expect(versions).toEqual(mockVersions);
  describe('Collaboration State', () => {
    it('should track collaboration state', () => {
      const state = service.getCollaborationState();
      expect(state).toBeDefined();
      expect(state.activeUsers).toBeInstanceOf(Map);
      expect(state.editLocks).toBeInstanceOf(Map);
      expect(state.conflicts).toBeInstanceOf(Array);
});
describe('Calendar Export Service', () => {
  let service: CalendarExportService;
  
    service = new CalendarExportService();
  describe('Apple Calendar (.ics) Export', () => {
    const mockTimeline = {
      id: 'timeline-123',
      name: 'Wedding Timeline',
      wedding_date: '2025-06-01',
      timezone: 'America/New_York'
    } as any;
    const mockEvents: TimelineEvent[] = [
      {
        id: 'event-1',
        title: 'Ceremony',
        start_time: '2025-06-01T14:00:00Z',
        end_time: '2025-06-01T15:00:00Z',
        location: 'Church',
        description: 'Wedding ceremony',
        priority: 'high'
      } as TimelineEvent
    ];
    it('should generate valid ICS content', async () => {
      const options = {
        includeVendorDetails: true,
        includeInternalNotes: false,
        timezone: 'America/New_York'
      const result = await service.generateAppleCalendarFile(mockTimeline, mockEvents, options);
      expect(result.icsContent).toBeDefined();
      expect(result.icsContent).toContain('BEGIN:VCALENDAR');
      expect(result.icsContent).toContain('END:VCALENDAR');
      expect(result.icsContent).toContain('SUMMARY:Ceremony');
      expect(result.icsContent).toContain('LOCATION:Church');
    it('should handle empty events list', async () => {
        includeVendorDetails: false,
        timezone: 'UTC'
      const result = await service.generateAppleCalendarFile(mockTimeline, [], options);
  describe('Timeline Sync', () => {
    it('should sync timeline changes to multiple calendars', async () => {
      const changes = {
        added: [] as TimelineEvent[],
        updated: [] as TimelineEvent[],
        deleted: [] as string[]
      const calendarMappings = [
        {
          provider: 'google',
          calendarId: 'cal-123',
          accessToken: 'token-123'
        }
      // Mock successful sync
      const syncSpy = vi.spyOn(service as any, 'syncGoogleCalendarChanges')
        .mockResolvedValue(undefined);
      const result = await service.syncTimelineChanges('timeline-123', changes, calendarMappings);
      expect(result.errors).toHaveLength(0);
      expect(syncSpy).toHaveBeenCalledWith(calendarMappings[0], changes);
describe('Timeline Permission Service', () => {
  let service: TimelinePermissionService;
    service = new TimelinePermissionService();
    
    // Mock user lookup
    mockSupabase.from().select().eq().single.mockResolvedValue({
      data: { id: 'user-123', email: 'test@example.com', full_name: 'Test User' },
      error: null
  describe('Collaborator Management', () => {
    it('should add collaborator successfully', async () => {
        data: null,
        data: { id: 'collab-123', role: 'editor' },
      const result = await service.addCollaborator(
        'timeline-123',
        'test@example.com',
        'editor',
        {},
        'owner-123'
      expect(result.collaborator).toBeDefined();
    it('should update existing collaborator', async () => {
        data: { id: 'collab-123', role: 'viewer' },
      mockSupabase.from().update().eq().select().single.mockResolvedValue({
    it('should remove collaborator', async () => {
        data: { 
          id: 'collab-123',
          user_profiles: { email: 'test@example.com' }
      mockSupabase.from().delete().eq().eq.mockResolvedValue({ error: null });
      const result = await service.removeCollaborator('timeline-123', 'collab-123', 'owner-123');
  describe('Share Links', () => {
    it('should create share link', async () => {
      const shareLink = {
        id: 'share-123',
        token: 'secure-token',
        permissions: { canView: true, canEdit: false, canComment: true }
        data: shareLink,
      const result = await service.createShareLink(
        shareLink.permissions,
        undefined,
        'user-123'
      expect(result.shareLink).toBeDefined();
    it('should validate share link access', async () => {
      const mockShareLink = {
        timeline_id: 'timeline-123',
        token: 'valid-token',
        permissions: { canView: true, canEdit: false, canComment: true },
        expires_at: null,
        access_count: 5
        data: mockShareLink,
      mockSupabase.from().update().eq.mockResolvedValue({ error: null });
      const result = await service.validateShareLinkAccess('valid-token');
    it('should reject expired share link', async () => {
      const expiredLink = {
        expires_at: '2024-01-01T00:00:00Z'
        data: expiredLink,
      const result = await service.validateShareLinkAccess('expired-token');
      expect(result.error).toContain('expired');
  describe('Permission Checks', () => {
    it('should grant owner permissions', async () => {
        data: { created_by: 'user-123' },
      const result = await service.checkUserPermissions('user-123', 'timeline-123');
      expect(result.isOwner).toBe(true);
      expect(result.access?.permissions.canEdit).toBe(true);
      expect(result.access?.permissions.canDelete).toBe(true);
    it('should return collaborator permissions', async () => {
      mockSupabase.from().select().eq().single.mockResolvedValueOnce({
        data: { created_by: 'owner-123' },
      mockSupabase.from().select().eq().eq().eq().single.mockResolvedValue({
          role: 'editor',
          can_edit: true,
          can_delete: false,
          can_share: false
      expect(result.isOwner).toBe(false);
      expect(result.access?.role).toBe('editor');
      expect(result.access?.permissions.canDelete).toBe(false);
    it('should return null for unauthorized user', async () => {
      expect(result.access).toBe(null);
describe('Timeline Notification Service', () => {
  let service: TimelineNotificationService;
    service = new TimelineNotificationService();
  describe('Notification Sending', () => {
    it('should send timeline notification to collaborators', async () => {
      // Mock collaborators
      mockSupabase.from().select().eq().eq.mockResolvedValue({
        data: [{ user_id: 'user-1' }, { user_id: 'user-2' }],
      // Mock user preferences
      // Mock notification creation
        data: { id: 'notification-123' },
      const result = await service.sendTimelineNotification('timeline-123', 'event_created', {
        eventId: 'event-123',
        triggerUserId: 'user-trigger',
        customData: { eventTitle: 'Test Event' }
      expect(result.notificationIds.length).toBeGreaterThan(0);
    it('should send deadline reminders', async () => {
      const upcomingEvents = [{
        title: 'Upcoming Event',
        start_time: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(), // 2 hours from now
        location: 'Venue'
      }];
      mockSupabase.from().select().eq().gte().lte().eq.mockResolvedValue({
        data: upcomingEvents,
      // Mock notification sending
      const sendSpy = vi.spyOn(service, 'sendTimelineNotification')
        .mockResolvedValue({ success: true, notificationIds: ['notif-123'] });
      await service.sendDeadlineReminders('timeline-123');
      expect(sendSpy).toHaveBeenCalledWith('timeline-123', 'deadline_reminder', expect.any(Object));
    it('should handle notification preferences', async () => {
      const mockPreferences = {
        userId: 'user-123',
        type: 'event_created' as const,
        channels: ['email', 'in_app'] as const,
        enabled: true,
        frequency: 'immediate' as const
        data: mockPreferences,
      const preferences = await service['getUserNotificationPreferences']('user-123', 'event_created');
      expect(preferences).toEqual(mockPreferences);
  describe('Notification Channels', () => {
    const mockNotification = {
      id: 'notif-123',
      recipientId: 'user-123',
      title: 'Test Notification',
      message: 'Test message',
      channels: ['email', 'in_app'],
      metadata: {}
    it('should create in-app notification', async () => {
      await service['createInAppNotification'](mockNotification);
      expect(mockSupabase.from).toHaveBeenCalledWith('user_notifications');
    it('should mark notification as read', async () => {
      mockSupabase.from().update().eq().eq.mockResolvedValue({ error: null });
      const result = await service.markAsRead('notif-123', 'user-123');
    it('should get unread notifications', async () => {
      const mockNotifications = [
        { id: 'notif-1', title: 'Test 1' },
        { id: 'notif-2', title: 'Test 2' }
      mockSupabase.from().select().eq().neq().order.mockResolvedValue({
        data: mockNotifications,
      const notifications = await service.getUnreadNotifications('user-123');
      expect(notifications).toEqual(mockNotifications);
describe('Timeline Conflict Resolution Service', () => {
  let service: TimelineConflictResolutionService;
    service = new TimelineConflictResolutionService();
  describe('Conflict Detection', () => {
        title: 'Event 1',
        start_time: '2025-06-01T10:00:00Z',
        end_time: '2025-06-01T11:00:00Z',
        location: 'Venue A',
        vendors: [{ vendor_id: 'vendor-1' }]
      } as TimelineEvent,
        id: 'event-2',
        title: 'Event 2',
        start_time: '2025-06-01T10:30:00Z',
        end_time: '2025-06-01T11:30:00Z',
    it('should detect time overlap conflicts', async () => {
      const conflicts = await service.detectConflicts('timeline-123', mockEvents);
      const timeConflicts = conflicts.filter(c => c.conflict_type === 'time_overlap');
      expect(timeConflicts.length).toBeGreaterThan(0);
    it('should detect vendor conflicts', async () => {
      const vendorConflicts = conflicts.filter(c => c.conflict_type === 'vendor_overlap');
      expect(vendorConflicts.length).toBeGreaterThan(0);
    it('should detect location conflicts', async () => {
      const locationConflicts = conflicts.filter(c => c.conflict_type === 'location_conflict');
      expect(locationConflicts.length).toBeGreaterThan(0);
    it('should detect dependency conflicts', async () => {
      const eventsWithDependencies: TimelineEvent[] = [
          ...mockEvents[0],
          depends_on: ['event-2']
        mockEvents[1]
      const conflicts = await service.detectConflicts('timeline-123', eventsWithDependencies);
      const dependencyConflicts = conflicts.filter(c => c.conflict_type === 'dependency_issue');
      expect(dependencyConflicts.length).toBeGreaterThan(0);
  describe('Conflict Resolution', () => {
    const mockConflict: TimelineConflict = {
      id: 'conflict-123',
      timeline_id: 'timeline-123',
      conflict_type: 'time_overlap',
      severity: 'warning',
      event_id_1: 'event-1',
      event_id_2: 'event-2',
      description: 'Time overlap detected',
      is_resolved: false,
      detected_at: '2025-01-20T10:00:00Z',
      last_checked_at: '2025-01-20T10:00:00Z',
      can_auto_resolve: true
    beforeEach(() => {
      // Mock conflict and event data
          ...mockConflict,
          event_1: mockEvents[0],
          event_2: mockEvents[1]
        data: mockEvents,
      // Mock timeline settings
        data: { buffer_time_minutes: 15 },
    it('should resolve time overlap using time shift strategy', async () => {
      // Mock successful update
      const resolution = await service.resolveConflict('conflict-123', 'time_shift', true);
      expect(resolution?.success).toBe(true);
      expect(resolution?.strategy).toBe('time_shift');
      expect(resolution?.changes.length).toBeGreaterThan(0);
    it('should get available strategies for conflict', () => {
      const strategies = service.getAvailableStrategies(mockConflict);
      expect(strategies.length).toBeGreaterThan(0);
      expect(strategies.some(s => s.id === 'time_shift')).toBe(true);
    it('should auto-resolve simple conflicts', async () => {
      // Mock unresolved conflicts
      mockSupabase.from().select().eq().eq().eq.mockResolvedValue({
        data: [mockConflict],
      // Mock resolution
      const resolveSpy = vi.spyOn(service, 'resolveConflict')
        .mockResolvedValue({
          success: true,
          strategy: 'time_shift',
          changes: [],
          explanation: 'Resolved',
          requiresApproval: false
        });
      const stats = await service.autoResolveConflicts('timeline-123');
      expect(stats.resolved).toBe(1);
      expect(resolveSpy).toHaveBeenCalled();
  describe('Concurrent Edit Detection', () => {
    it('should detect concurrent edits', async () => {
      const mockCurrentEvent = {
        ...mockEvents[0],
        version: 3
        data: mockCurrentEvent,
        { version: 2, changes: { title: 'Updated Title' } },
        { version: 3, changes: { location: 'New Location' } }
      mockSupabase.from().select().eq().gt().order.mockResolvedValue({
      const result = await service.detectConcurrentEdits(
        'event-1',
        { title: 'My Title Change' },
        1
      expect(result.hasConflicts).toBe(true);
      expect(result.conflicts.length).toBeGreaterThan(0);
    it('should perform three-way merge', async () => {
      const localChanges = { title: 'Local Title' };
      const remoteEvent = { ...mockEvents[0], title: 'Remote Title' };
      const baseVersion = { ...mockEvents[0], title: 'Original Title' };
      const result = await service.performThreeWayMerge(
        localChanges,
        remoteEvent,
        baseVersion
      expect(result.conflicts?.length).toBeGreaterThan(0);
describe('Service Integration Tests', () => {
  let realtimeService: EnhancedRealtimeTimelineService;
  let notificationService: TimelineNotificationService;
  let conflictService: TimelineConflictResolutionService;
  beforeEach(async () => {
    realtimeService = new EnhancedRealtimeTimelineService('timeline-123', 'user-123', 'Test User');
    notificationService = new TimelineNotificationService();
    conflictService = new TimelineConflictResolutionService();
    await realtimeService.initialize();
    await realtimeService.destroy();
  it('should coordinate conflict detection and notification', async () => {
    const mockEvent = {
      title: 'Conflicting Event',
      location: 'Venue A'
    // Mock overlapping events
    mockSupabase.from().select().eq().neq().or.mockResolvedValue({
      data: [{
        id: 'existing-event',
        location: 'Venue A'
      }],
    const result = await realtimeService.updateTimelineEvent(mockEvent);
    expect(result.success).toBe(false);
    expect(result.conflict).toBeDefined();
  it('should handle rapid concurrent updates', async () => {
    const updates = Array.from({ length: 10 }, (_, i) => ({
      title: `Event ${i}`,
      end_time: '2025-06-01T11:00:00Z'
    }));
    // Mock successful database operations
    mockSupabase.from().select().eq().single.mockResolvedValue({ 
      data: null, 
      error: null 
    mockSupabase.from().insert().select().single.mockResolvedValue({
      data: { id: 'event-123' },
    const results = await Promise.all(
      updates.map(update => realtimeService.updateTimelineEvent(update))
    );
    // All updates should complete (though some may have conflicts)
    expect(results.length).toBe(10);
    results.forEach(result => {
      expect(typeof result.success).toBe('boolean');
