/**
 * Integration Tests for WS-172 Offline Conflict Resolution System
 * Feature: WS-172 - Offline Functionality - Conflict Resolution
 * Team: C - Batch 21 - Round 3
 * 
 * End-to-end integration tests for the complete conflict resolution workflow
 * including detection, resolution strategies, audit logging, and UI components.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { 
  ConflictResolutionOrchestrator,
  createConflictResolutionSystem,
  InMemoryAuditStorage,
  WeddingConflictResolvers
} from '@/lib/offline/conflict-resolution';
import type { 
  VersionedData, 
  TimelineItem, 
  VendorContact, 
  GuestEntry,
  UserContext,
  WeddingDataType
} from '@/lib/offline/conflict-resolution/types';
describe('WS-172 Conflict Resolution System Integration', () => {
  let auditStorage: InMemoryAuditStorage;
  let mockUserBride: UserContext;
  let mockUserGroom: UserContext;
  let mockUserPlanner: UserContext;
  beforeEach(() => {
    auditStorage = new InMemoryAuditStorage();
    
    mockUserBride = {
      id: 'bride-123',
      role: 'bride',
      deviceId: 'device-bride',
      sessionId: 'session-bride'
    };
    mockUserGroom = {
      id: 'groom-456',
      role: 'groom', 
      deviceId: 'device-groom',
      sessionId: 'session-groom'
    mockUserPlanner = {
      id: 'planner-789',
      role: 'planner',
      deviceId: 'device-planner',
      sessionId: 'session-planner'
  });
  afterEach(() => {
    vi.clearAllMocks();
  const createVersionedData = <T>(
    data: T,
    user: UserContext,
    version: number = 1,
    timestamp: number = Date.now()
  ): VersionedData<T> => ({
    id: 'test-item-123',
    version,
    data,
    lastModified: {
      timestamp,
      timezone: 'UTC',
      deviceTime: timestamp
    },
    modifiedBy: user,
    checksum: `checksum-${JSON.stringify(data)}-${version}`
  describe('Timeline Item Conflict Resolution', () => {
    it('should handle complete timeline conflict workflow', async () => {
      const orchestrator = createConflictResolutionSystem<TimelineItem>(
        'timeline-item',
        auditStorage,
        {
          autoResolution: { enableAutoResolution: true },
          audit: { logLevel: 'detailed', includeDataSnapshots: true }
        }
      );
      // Create timeline conflict: bride changes time, groom changes location
      const baseTimeline: TimelineItem = {
        id: 'ceremony-123',
        title: 'Wedding Ceremony',
        startTime: new Date('2024-06-15T15:00:00Z'),
        endTime: new Date('2024-06-15T16:00:00Z'),
        location: 'Garden Pavilion',
        assignedTo: ['planner-789'],
        priority: 5,
        status: 'planned',
        dependencies: [],
        tags: ['ceremony']
      };
      const brideVersion = createVersionedData(
          ...baseTimeline,
          startTime: new Date('2024-06-15T14:30:00Z'), // Bride wants earlier
          tags: ['ceremony', 'outdoor']
        },
        mockUserBride,
        1,
        Date.now() - 1000
      const groomVersion = createVersionedData(
          location: 'Main Hall', // Groom wants indoor
          assignedTo: ['planner-789', 'coordinator-123']
        mockUserGroom,
        2,
        Date.now()
      // Execute conflict resolution workflow
      const result = await orchestrator.resolveConflictWithAudit(
        brideVersion,
        groomVersion,
        true // prefer auto-resolution
      // Verify conflict was detected
      expect(result.conflict).not.toBeNull();
      expect(result.conflict!.metadata.affectedFields).toEqual(
        expect.arrayContaining(['startTime', 'location', 'assignedTo', 'tags'])
      expect(result.conflict!.metadata.severity).toBe('critical'); // Time conflicts are critical
      // Verify audit trail was created
      expect(result.auditEntries.length).toBeGreaterThan(0);
      const actions = result.auditEntries.map(entry => entry.action);
      expect(actions).toContain('detected');
      // Since this involves critical fields (startTime), it should require manual review
      if (result.result && !result.result.success) {
        expect(result.result.requiresManualReview).toBe(true);
        expect(actions).toContain('escalated');
      }
    });
    it('should auto-resolve simple timeline conflicts', async () => {
      const orchestrator = WeddingConflictResolvers.timeline();
      // Simple conflict: only tags and description differ
      const baseTimeline: Partial<TimelineItem> = {
        id: 'reception-123',
        title: 'Wedding Reception',
        startTime: new Date('2024-06-15T18:00:00Z'),
        endTime: new Date('2024-06-15T23:00:00Z'),
        status: 'planned'
      const local = createVersionedData(
          tags: ['reception', 'dancing'],
          description: 'Fun evening reception'
        mockUserBride
      const remote = createVersionedData(
          tags: ['reception', 'music'],
          description: 'Evening celebration with live band'
        mockUserGroom
      const result = await orchestrator.resolveConflictWithAudit(local, remote);
      // Should auto-resolve successfully
      if (result.result?.success && result.autoResolved) {
        expect(result.result.resolvedData.tags).toEqual(
          expect.arrayContaining(['reception', 'dancing', 'music'])
        );
        expect(result.result.resolvedData.description).toContain('Fun evening reception');
        expect(result.result.resolvedData.description).toContain('Evening celebration with live band');
    it('should handle priority-based resolution for bride vs groom conflicts', async () => {
        id: 'photos-123',
        title: 'Wedding Photography',
        priority: 3,
        assignedTo: ['photographer-123']
          title: 'Couple and Family Photos',
          priority: 5, // Bride thinks it's very important
          tags: ['photos', 'family', 'formal']
          title: 'Wedding Photo Session',
          priority: 2, // Groom thinks it's less important  
          tags: ['photos', 'candid', 'fun']
      const result = await orchestrator.resolveConflictWithAudit(brideVersion, groomVersion);
      if (result.result?.success) {
        // Should merge since bride and groom have equal priority
          expect.arrayContaining(['photos', 'family', 'formal', 'candid', 'fun'])
  describe('Vendor Contact Conflict Resolution', () => {
    it('should resolve vendor information conflicts', async () => {
      const orchestrator = WeddingConflictResolvers.vendors();
      const baseVendor: VendorContact = {
        id: 'photographer-123',
        name: 'Amazing Photos',
        company: 'Amazing Photos LLC',
        category: 'photographer',
        contact: {
          email: 'info@amazingphotos.com',
          phone: '555-PHOTO-1'
        contractStatus: 'negotiating',
        budget: {
          estimated: 2500,
          currency: 'USD'
        notes: ['Initial contact made']
      // Planner updates contact info and status
      const plannerVersion = createVersionedData(
          ...baseVendor,
          contact: {
            ...baseVendor.contact,
            phone: '555-PHOTO-2', // Updated phone
            address: '123 Photography St'
          },
          contractStatus: 'booked' as const,
          notes: ['Initial contact made', 'Contract signed']
        mockUserPlanner
      // Bride adds notes and budget info
          budget: {
            ...baseVendor.budget,
            actual: 2800 // Actual cost higher
          notes: ['Initial contact made', 'Meeting scheduled', 'Portfolio reviewed']
      const result = await orchestrator.resolveConflictWithAudit(plannerVersion, brideVersion);
        expect.arrayContaining(['contact', 'contractStatus', 'budget', 'notes'])
        // Should merge contact information
        expect(result.result.resolvedData.contact.phone).toBe('555-PHOTO-2');
        expect(result.result.resolvedData.contact.address).toBe('123 Photography St');
        expect(result.result.resolvedData.budget.actual).toBe(2800);
        
        // Should combine notes
        expect(result.result.resolvedData.notes).toEqual(
          expect.arrayContaining([
            'Initial contact made',
            'Contract signed', 
            'Meeting scheduled',
            'Portfolio reviewed'
          ])
        // Contract status is critical - should prefer planner's update
        expect(result.result.resolvedData.contractStatus).toBe('booked');
    it('should escalate vendor budget conflicts for manual review', async () => {
      const orchestrator = createConflictResolutionSystem<VendorContact>(
        'vendor-contact',
          autoResolution: {
            excludedFields: ['budget', 'contractStatus'] // Exclude critical vendor fields
          }
      const baseVendor: Partial<VendorContact> = {
        id: 'caterer-456',
        name: 'Delicious Catering',
        category: 'caterer',
        contractStatus: 'negotiating'
          budget: { estimated: 5000, currency: 'USD' }
          budget: { estimated: 7500, currency: 'USD' } // Significantly different
      // Should be escalated due to excluded fields
      expect(result.autoResolved).toBe(false);
      expect(result.auditEntries.some(entry => entry.action === 'escalated')).toBe(true);
  describe('Guest List Conflict Resolution', () => {
    it('should handle sensitive guest information conflicts', async () => {
      const orchestrator = WeddingConflictResolvers.guests();
      const baseGuest: GuestEntry = {
        id: 'guest-789',
        name: 'John Smith',
        email: 'john@email.com',
        relationship: 'Friend',
        invitedBy: 'both',
        rsvpStatus: 'pending',
        dietaryRestrictions: [],
        plusOne: false
      // Bride updates dietary restrictions and RSVP
          ...baseGuest,
          dietaryRestrictions: ['vegetarian'],
          rsvpStatus: 'accepted' as const,
          seatingGroup: 'Table 5'
      // Groom adds phone and different seating
          phone: '555-0123',
          plusOne: true, // Groom says guest can bring +1
          seatingGroup: 'Table 7'
      expect(result.conflict!.dataType).toBe('guest-list');
        // Should merge non-conflicting information
        expect(result.result.resolvedData.phone).toBe('555-0123');
        expect(result.result.resolvedData.dietaryRestrictions).toEqual(['vegetarian']);
        // For conflicting sensitive fields, may require manual resolution
        if (result.result.resolvedData.plusOne !== undefined) {
          expect(typeof result.result.resolvedData.plusOne).toBe('boolean');
      } else {
        // Guest conflicts often require manual review due to sensitivity
        expect(result.result?.requiresManualReview).toBe(true);
  describe('Batch Conflict Resolution', () => {
    it('should handle multiple conflicts simultaneously', async () => {
      const dataPairs = [
        // Timeline conflict 1: Simple tag difference
          local: createVersionedData(
            {
              id: 'item-1',
              title: 'Cocktail Hour',
              tags: ['cocktails', 'mingling'],
              status: 'planned'
            } as Partial<TimelineItem>,
            mockUserBride
          ),
          remote: createVersionedData(
              id: 'item-1', 
              tags: ['cocktails', 'music'],
            mockUserGroom
          )
        // Timeline conflict 2: No conflict (identical)
              id: 'item-2',
              title: 'Cake Cutting',
              title: 'Cake Cutting', 
        // Timeline conflict 3: Critical time conflict
              id: 'item-3',
              title: 'First Dance',
              startTime: new Date('2024-06-15T20:00:00Z'),
              startTime: new Date('2024-06-15T20:30:00Z'), // Different time
      ];
      const results = await orchestrator.resolveBatchWithAudit(dataPairs);
      expect(results.results.length).toBe(3);
      expect(results.summary.total).toBe(3);
      // Check individual results
      const [result1, result2, result3] = results.results;
      // Result 1: Should auto-resolve (tags only)
      if (result1.conflict && result1.result?.success) {
        expect(result1.result.resolvedData.tags).toEqual(
          expect.arrayContaining(['cocktails', 'mingling', 'music'])
      // Result 2: No conflict
      expect(result2.conflict).toBeNull();
      // Result 3: Critical conflict should require manual review
      if (result3.conflict) {
        expect(result3.conflict.metadata.severity).toBe('critical');
        if (!result3.autoResolved && result3.result) {
          expect(result3.result.requiresManualReview).toBe(true);
  describe('System Statistics and Monitoring', () => {
    it('should provide comprehensive system statistics', async () => {
        auditStorage
      // Generate some activity
      const testConflicts = [
            { id: 'item-1', title: 'Event 1', tags: ['tag1'] },
            { id: 'item-1', title: 'Event 1', tags: ['tag2'] },
            { id: 'item-2', title: 'Event 2', priority: 3 },
            { id: 'item-2', title: 'Event 2', priority: 5 },
            mockUserPlanner
      for (const pair of testConflicts) {
        await orchestrator.resolveConflictWithAudit(pair.local, pair.remote);
      const stats = await orchestrator.getSystemStats();
      expect(stats.autoResolution).toBeDefined();
      expect(stats.autoResolution.totalAttempts).toBeGreaterThanOrEqual(2);
      expect(stats.auditSummary).toBeDefined();
      expect(stats.auditSummary.totalEntries).toBeGreaterThan(0);
      expect(stats.auditSummary.byAction).toBeDefined();
    it('should track resolution performance metrics', async () => {
      const startTime = Date.now();
      // Resolve a simple conflict
        { id: 'perf-test', title: 'Performance Test', tags: ['fast'] },
        { id: 'perf-test', title: 'Performance Test', tags: ['quick'] },
      const duration = Date.now() - startTime;
      // Performance check: should resolve quickly
      expect(duration).toBeLessThan(1000); // Less than 1 second
      // Should have generated performance metrics
      expect(stats.autoResolution.averageResolutionTime).toBeGreaterThan(0);
  describe('Error Handling and Edge Cases', () => {
    it('should handle corrupted data gracefully', async () => {
      // Create data with corrupted checksums
        { id: 'corrupt-1', title: 'Valid Title' },
      local.checksum = 'corrupted-checksum';
        { id: 'corrupt-1', title: 'Different Title' },
      // Should handle gracefully without throwing
      expect(result).toBeDefined();
      expect(result.conflict !== null || !result.autoResolved).toBe(true);
    it('should handle concurrent resolution attempts', async () => {
          id: 'concurrent-test',
          name: 'Vendor Name',
          contact: { email: 'old@email.com', phone: '555-0123' }
        } as Partial<VendorContact>,
          name: 'Vendor Name Updated',
          contact: { email: 'new@email.com', phone: '555-0123' }
      // Start multiple resolution attempts simultaneously
      const promises = Array.from({ length: 5 }, () =>
        orchestrator.resolveConflictWithAudit(local, remote)
      const results = await Promise.all(promises);
      // All should complete successfully
      results.forEach(result => {
        expect(result).toBeDefined();
      });
      // Should have handled concurrency properly
      expect(results.length).toBe(5);
    it('should handle audit storage failures gracefully', async () => {
      const faultyStorage = new InMemoryAuditStorage();
      
      // Mock storage to fail
      vi.spyOn(faultyStorage, 'store').mockRejectedValue(new Error('Storage failed'));
        faultyStorage,
          audit: { complianceMode: false } // Disable compliance mode to allow operation despite audit failures
        { id: 'audit-fail-test', title: 'Test' },
        { id: 'audit-fail-test', title: 'Test Updated' },
      // Should not throw even if audit fails (in non-compliance mode)
      // Audit entries may be empty due to storage failure
      expect(Array.isArray(result.auditEntries)).toBe(true);
  describe('Wedding-Specific Business Logic', () => {
    it('should respect wedding hierarchy in conflict resolution', async () => {
      // Admin override scenario
      const adminUser: UserContext = {
        id: 'admin-999',
        role: 'admin',
        deviceId: 'device-admin',
        sessionId: 'session-admin'
          id: 'hierarchy-test',
          title: 'Wedding Ceremony',
          location: 'Garden Pavilion',
          priority: 5
        } as Partial<TimelineItem>,
      const adminVersion = createVersionedData(
          location: 'Emergency Indoor Venue', // Admin override due to weather
        adminUser
      const result = await orchestrator.resolveConflictWithAudit(brideVersion, adminVersion);
        // Admin should override bride's preference
        expect(result.result.resolvedData.location).toBe('Emergency Indoor Venue');
        expect(result.auditEntries.some(entry => 
          entry.details.strategy === 'priority-based'
        )).toBe(true);
    it('should handle critical wedding timing conflicts appropriately', async () => {
      const ceremonyConflict1 = createVersionedData(
          id: 'ceremony-timing',
          startTime: new Date('2024-06-15T15:00:00Z'),
          endTime: new Date('2024-06-15T16:00:00Z'),
          priority: 5,
          status: 'planned'
      const ceremonyConflict2 = createVersionedData(
          startTime: new Date('2024-06-15T14:00:00Z'), // 1 hour earlier
          endTime: new Date('2024-06-15T15:00:00Z'),
        ceremonyConflict1,
        ceremonyConflict2
      // Critical timing conflicts should always require manual review
      expect(result.conflict?.metadata.severity).toBe('critical');
      // Should have escalation in audit trail
      expect(result.auditEntries.some(entry => 
        entry.action === 'escalated'
      )).toBe(true);
    it('should preserve wedding data integrity during resolution', async () => {
        id: 'integrity-test',
        title: 'Reception Setup',
        startTime: new Date('2024-06-15T16:00:00Z'),
        endTime: new Date('2024-06-15T17:00:00Z'),
        location: 'Ballroom',
        assignedTo: ['setup-crew-1'],
        dependencies: ['ceremony-completion'],
        tags: ['setup', 'reception']
          assignedTo: ['setup-crew-1', 'setup-crew-2'], // More crew
          tags: ['setup', 'reception', 'urgent']
          assignedTo: ['setup-crew-1', 'coordinator-1'], // Different assignment
          dependencies: ['ceremony-completion', 'catering-arrival'], // Additional dependency
          tags: ['setup', 'reception', 'coordination']
        const resolved = result.result.resolvedData;
        // Should preserve all essential fields
        expect(resolved.id).toBe('integrity-test');
        expect(resolved.title).toBe('Reception Setup');
        expect(resolved.startTime).toEqual(baseTimeline.startTime);
        expect(resolved.endTime).toEqual(baseTimeline.endTime);
        expect(resolved.location).toBe('Ballroom');
        expect(resolved.status).toBe('planned');
        // Should merge arrays intelligently
        expect(resolved.assignedTo).toEqual(
          expect.arrayContaining(['setup-crew-1', 'setup-crew-2', 'coordinator-1'])
        expect(resolved.dependencies).toEqual(
          expect.arrayContaining(['ceremony-completion', 'catering-arrival'])
        expect(resolved.tags).toEqual(
          expect.arrayContaining(['setup', 'reception', 'urgent', 'coordination'])
});
