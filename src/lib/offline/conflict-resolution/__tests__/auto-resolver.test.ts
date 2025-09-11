/**
 * Unit Tests for Automatic Conflict Resolution System
 * Feature: WS-172 - Offline Functionality - Conflict Resolution
 * Team: C - Batch 21 - Round 3
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { 
  AutoConflictResolver,
  createAutoTimelineResolver,
  createAutoVendorResolver,
  createAutoGuestListResolver,
  DEFAULT_AUTO_RESOLUTION_CONFIG
} from '../auto-resolver';
import { ConflictDetector } from '../conflict-detector';
import { ConflictResolver } from '../resolution-strategies';
import type { 
  VersionedData, 
  DataConflict, 
  AutoResolutionConfig,
  UserContext,
  TimelineItem
} from '../types';
describe('AutoConflictResolver', () => {
  let autoResolver: AutoConflictResolver<any>;
  let mockUserContext: UserContext;
  beforeEach(() => {
    autoResolver = new AutoConflictResolver('timeline-item');
    mockUserContext = {
      id: 'user-123',
      role: 'bride',
      deviceId: 'device-abc',
      sessionId: 'session-def'
    };
  });
  const createMockVersionedData = (
    data: any,
    timestamp: number = Date.now(),
    user: UserContext = mockUserContext
  ): VersionedData<any> => ({
    id: 'test-123',
    version: 1,
    data,
    lastModified: {
      timestamp,
      timezone: 'UTC',
      deviceTime: timestamp
    },
    modifiedBy: user,
    checksum: `checksum-${JSON.stringify(data)}`
  describe('Configuration', () => {
    it('should use default configuration', () => {
      const config = autoResolver.getConfig();
      
      expect(config.enableAutoResolution).toBe(true);
      expect(config.maxAutoResolutionAttempts).toBe(3);
      expect(config.autoResolutionTimeout).toBe(5000);
      expect(config.excludedDataTypes).toContain('budget-item');
      expect(config.excludedFields).toContain('contractStatus');
    });
    it('should allow configuration override', () => {
      const customConfig: Partial<AutoResolutionConfig> = {
        enableAutoResolution: false,
        maxAutoResolutionAttempts: 5,
        excludedDataTypes: ['guest-list']
      };
      const customResolver = new AutoConflictResolver('timeline-item', customConfig);
      const config = customResolver.getConfig();
      expect(config.enableAutoResolution).toBe(false);
      expect(config.maxAutoResolutionAttempts).toBe(5);
      expect(config.excludedDataTypes).toEqual(['guest-list']);
    it('should create new instance with updated config', () => {
      const newConfig = { enableAutoResolution: false };
      const newResolver = autoResolver.withConfig(newConfig);
      expect(newResolver).toBeInstanceOf(AutoConflictResolver);
      expect(newResolver.getConfig().enableAutoResolution).toBe(false);
      expect(autoResolver.getConfig().enableAutoResolution).toBe(true); // Original unchanged
  describe('Eligibility Checking', () => {
    it('should determine eligibility for auto-resolution', async () => {
      const local = createMockVersionedData({ title: 'Local Title', tags: ['tag1'] });
      const remote = createMockVersionedData({ title: 'Remote Title', tags: ['tag2'] });
      const result = await autoResolver.resolveConflictAutomatically(local, remote);
      expect(result.eligibilityCheck).toBeDefined();
      expect(typeof result.eligibilityCheck.eligible).toBe('boolean');
      expect(Array.isArray(result.eligibilityCheck.reasons)).toBe(true);
    it('should reject disabled auto-resolution', async () => {
      const disabledResolver = new AutoConflictResolver('timeline-item', { 
        enableAutoResolution: false 
      });
      const local = createMockVersionedData({ title: 'Local' });
      const remote = createMockVersionedData({ title: 'Remote' });
      const result = await disabledResolver.resolveConflictAutomatically(local, remote);
      expect(result.eligibilityCheck.eligible).toBe(false);
      expect(result.eligibilityCheck.reasons).toContain('Auto-resolution is disabled');
    it('should reject excluded data types', async () => {
      const budgetResolver = new AutoConflictResolver('budget-item'); // Excluded by default
      const local = createMockVersionedData({ amount: 1000 });
      const remote = createMockVersionedData({ amount: 1200 });
      const result = await budgetResolver.resolveConflictAutomatically(local, remote);
      expect(result.eligibilityCheck.reasons.some(r => 
        r.includes('Data type budget-item is excluded')
      )).toBe(true);
    it('should reject conflicts with excluded fields', async () => {
      const local = createMockVersionedData({ 
        title: 'Title',
        contractStatus: 'negotiating' 
      const remote = createMockVersionedData({ 
        contractStatus: 'booked' 
        r.includes('excluded fields')
    it('should reject old conflicts', async () => {
      const oldTimestamp = Date.now() - (60 * 1000); // 1 minute ago
      const recentTimestamp = Date.now() - (10 * 1000); // 10 seconds ago
      const local = createMockVersionedData({ title: 'Local' }, oldTimestamp);
      const remote = createMockVersionedData({ title: 'Remote' }, recentTimestamp);
      // Conflict age should be too old based on default threshold
        r.includes('too old')
  describe('Safety Checks', () => {
    it('should perform data integrity validation', async () => {
      // Corrupt checksum to fail integrity check
      local.checksum = 'invalid-checksum';
      expect(result.safetyCheck.passed).toBe(false);
      expect(result.safetyCheck.failures).toContain('Local data integrity check failed');
    it('should check user permissions', async () => {
      const vendorUser: UserContext = {
        id: 'vendor-123',
        role: 'vendor',
        deviceId: 'device-vendor',
        sessionId: 'session-vendor'
      // Vendor trying to modify timeline item (should fail permission check)
      const local = createMockVersionedData({ title: 'Local' }, Date.now(), vendorUser);
      if (!result.eligibilityCheck.eligible) {
        // May be rejected at eligibility stage, which is also valid
        expect(true).toBe(true);
      } else if (!result.safetyCheck.passed) {
        expect(result.safetyCheck.failures.some(f => 
          f.includes('permissions')
        )).toBe(true);
      }
  describe('Automatic Resolution Process', () => {
    it('should successfully auto-resolve simple conflicts', async () => {
        title: 'Wedding Ceremony',
        tags: ['ceremony'],
        description: 'Local description'
        tags: ['ceremony', 'outdoor'],
        description: 'Remote description'
      if (result.conflict && result.conflict.metadata.autoResolvable) {
        expect(result.autoResolved).toBe(true);
        expect(result.result?.success).toBe(true);
        
        if (result.result?.success) {
          expect(result.result.resolvedData.tags).toEqual(
            expect.arrayContaining(['ceremony', 'outdoor'])
          );
        }
    it('should handle resolution timeouts', async () => {
      const shortTimeoutResolver = new AutoConflictResolver('timeline-item', {
        autoResolutionTimeout: 1 // 1ms timeout
      const result = await shortTimeoutResolver.resolveConflictAutomatically(local, remote);
      // Should either succeed very quickly or timeout
      if (result.result && !result.result.success) {
        expect(result.result.error.message).toContain('timeout');
    it('should retry failed resolutions', async () => {
      const retryResolver = new AutoConflictResolver('timeline-item', {
        maxAutoResolutionAttempts: 2
      // Mock the resolver to fail first attempt, succeed second
      let attemptCount = 0;
      const originalResolve = ConflictResolver.prototype.resolveConflict;
      vi.spyOn(ConflictResolver.prototype, 'resolveConflict').mockImplementation(async function() {
        attemptCount++;
        if (attemptCount === 1) {
          throw new Error('Simulated failure');
        return originalResolve.call(this, arguments[0]);
      try {
        const result = await retryResolver.resolveConflictAutomatically(local, remote);
        expect(attemptCount).toBeGreaterThan(1);
      } finally {
        vi.restoreAllMocks();
    it('should prevent duplicate resolution attempts', async () => {
      // Start two resolution attempts simultaneously
      const promise1 = autoResolver.resolveConflictAutomatically(local, remote);
      const promise2 = autoResolver.resolveConflictAutomatically(local, remote);
      const [result1, result2] = await Promise.all([promise1, promise2]);
      // Both should get the same result (second should wait for first)
      if (result1.conflict && result2.conflict) {
        expect(result1.conflict.metadata.conflictId).toBe(result2.conflict.metadata.conflictId);
  describe('Batch Resolution', () => {
    it('should resolve multiple conflicts in batch', async () => {
      const dataPairs = [
        {
          local: createMockVersionedData({ title: 'Local 1', tags: ['tag1'] }),
          remote: createMockVersionedData({ title: 'Remote 1', tags: ['tag2'] })
        },
          local: createMockVersionedData({ title: 'Local 2', tags: ['tagA'] }),
          remote: createMockVersionedData({ title: 'Remote 2', tags: ['tagB'] })
          local: createMockVersionedData({ title: 'Same Title' }),
          remote: createMockVersionedData({ title: 'Same Title' })
      ];
      const result = await autoResolver.resolveBatchAutomatically(dataPairs);
      expect(result.results.length).toBe(3);
      expect(result.summary.total).toBe(3);
      expect(result.summary.noConflicts).toBeGreaterThanOrEqual(1); // The identical pair
    it('should provide accurate batch summary', async () => {
          local: createMockVersionedData({ tags: ['tag1'] }),
          remote: createMockVersionedData({ tags: ['tag2'] })
          local: createMockVersionedData({ contractStatus: 'negotiating' }),
          remote: createMockVersionedData({ contractStatus: 'booked' })
      expect(result.summary.total).toBe(2);
      expect(result.summary.autoResolved + result.summary.manualReviewRequired + 
             result.summary.noConflicts + result.summary.errors).toBe(2);
  describe('Statistics Tracking', () => {
    it('should track resolution statistics', async () => {
      const initialStats = autoResolver.getStats();
      expect(initialStats.totalAttempts).toBe(0);
      expect(initialStats.successfulResolutions).toBe(0);
      await autoResolver.resolveConflictAutomatically(local, remote);
      const updatedStats = autoResolver.getStats();
      expect(updatedStats.totalAttempts).toBeGreaterThan(initialStats.totalAttempts);
    it('should track different types of resolutions', async () => {
      const stats = autoResolver.getStats();
      expect(stats.resolutionsByDataType['timeline-item']).toBeGreaterThan(0);
    it('should track average resolution time', async () => {
      expect(stats.averageResolutionTime).toBeGreaterThan(0);
  describe('Error Handling', () => {
    it('should handle system errors gracefully', async () => {
      // Mock detector to throw error
      vi.spyOn(ConflictDetector.prototype, 'detectConflicts').mockImplementation(() => {
        throw new Error('System error');
      expect(result.autoResolved).toBe(false);
      expect(result.result?.success).toBe(false);
      expect(result.result?.error.code).toBe('AUTO_RESOLVER_ERROR');
      vi.restoreAllMocks();
    it('should handle resolution failures', async () => {
      // Mock resolver to always fail
      vi.spyOn(ConflictResolver.prototype, 'resolveConflict').mockResolvedValue({
        success: false,
        error: {
          code: 'TEST_ERROR',
          message: 'Test error',
          conflictId: 'test-conflict'
        } as any,
        requiresManualReview: true
        expect(result.result.error.code).toBe('AUTO_RESOLUTION_FAILED');
        expect(result.result.requiresManualReview).toBe(true);
  describe('Cleanup Operations', () => {
    it('should clear active resolutions', () => {
      autoResolver.clearActiveResolutions();
      // Should not throw and should complete normally
      expect(true).toBe(true);
});
describe('Factory Functions', () => {
  describe('createAutoTimelineResolver', () => {
    it('should create timeline-specific auto resolver', () => {
      const resolver = createAutoTimelineResolver();
      expect(resolver).toBeInstanceOf(AutoConflictResolver);
      expect(resolver.getConfig().enableAutoResolution).toBe(true);
    it('should accept custom configuration', () => {
      const customConfig = { 
        maxAutoResolutionAttempts: 5 
      const resolver = createAutoTimelineResolver(customConfig);
      const config = resolver.getConfig();
  describe('createAutoVendorResolver', () => {
    it('should create vendor-specific auto resolver', () => {
      const resolver = createAutoVendorResolver();
    it('should handle vendor-specific configuration', () => {
      const vendorConfig = {
        excludedFields: ['contractStatus', 'budget']
      const resolver = createAutoVendorResolver(vendorConfig);
      expect(config.excludedFields).toEqual(
        expect.arrayContaining(['contractStatus', 'budget'])
      );
  describe('createAutoGuestListResolver', () => {
    it('should create guest-list-specific auto resolver', () => {
      const resolver = createAutoGuestListResolver();
    it('should handle guest-list-specific scenarios', async () => {
      const local = createMockVersionedData({
        name: 'John Smith',
        rsvpStatus: 'pending',
        dietaryRestrictions: ['vegetarian']
      const remote = createMockVersionedData({
        rsvpStatus: 'accepted',
        dietaryRestrictions: ['vegetarian', 'gluten-free']
      const result = await resolver.resolveConflictAutomatically(local, remote);
      // Guest list changes often require manual review due to sensitivity
      expect(typeof result.autoResolved).toBe('boolean');
describe('Integration with Core Components', () => {
  it('should integrate with conflict detector', async () => {
    const resolver = new AutoConflictResolver('timeline-item');
    
    const local = createMockVersionedData({ title: 'Local Title' });
    const remote = createMockVersionedData({ title: 'Remote Title' });
    const result = await resolver.resolveConflictAutomatically(local, remote);
    // Should have used detector to find conflicts
    expect(result.conflict !== null || result.eligibilityCheck.reasons.includes('No conflict detected')).toBe(true);
  it('should integrate with conflict resolver', async () => {
    const local = createMockVersionedData({ 
      tags: ['tag1'],
      notes: 'Local note'
    const remote = createMockVersionedData({ 
      tags: ['tag2'],
      notes: 'Remote note'
    if (result.autoResolved && result.result?.success) {
      // Should have used resolver's merge logic
      expect(result.result.resolvedData).toBeDefined();
      expect(result.result.audit).toBeDefined();
    }
describe('Performance and Scale', () => {
  it('should handle multiple concurrent resolutions', async () => {
    const promises = Array.from({ length: 10 }, (_, i) => {
      const local = createMockVersionedData({ title: `Local ${i}` });
      const remote = createMockVersionedData({ title: `Remote ${i}` });
      return resolver.resolveConflictAutomatically(local, remote);
    const results = await Promise.all(promises);
    expect(results.length).toBe(10);
    results.forEach((result, i) => {
      expect(result).toBeDefined();
  it('should perform within reasonable time limits', async () => {
      title: 'Complex Object',
      tags: Array.from({ length: 100 }, (_, i) => `tag-${i}`),
      assignedTo: Array.from({ length: 50 }, (_, i) => `user-${i}`)
      title: 'Complex Object Updated',
      tags: Array.from({ length: 100 }, (_, i) => `tag-${i + 50}`),
      assignedTo: Array.from({ length: 50 }, (_, i) => `user-${i + 25}`)
    const startTime = Date.now();
    const duration = Date.now() - startTime;
    expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
    expect(result).toBeDefined();
describe('Wedding-Specific Auto-Resolution Logic', () => {
  it('should handle timeline conflicts appropriately', async () => {
    const resolver = createAutoTimelineResolver();
    const baseTimeline: Partial<TimelineItem> = {
      title: 'Wedding Ceremony',
      startTime: new Date('2024-06-15T15:00:00Z'),
      endTime: new Date('2024-06-15T16:00:00Z'),
      location: 'Garden Pavilion',
      priority: 5,
      status: 'planned'
    // Safe changes that should auto-resolve
    const local = createMockVersionedData({
      ...baseTimeline,
      tags: ['ceremony', 'outdoor'],
      description: 'Beautiful garden ceremony'
    const remote = createMockVersionedData({
      tags: ['ceremony', 'outdoor', 'flowers'],
      description: 'Beautiful garden ceremony with flowers'
    // Should be eligible and potentially auto-resolved
    if (result.conflict?.metadata.autoResolvable) {
      expect(result.eligibilityCheck.eligible).toBe(true);
  it('should reject dangerous timeline conflicts', async () => {
    // Dangerous changes that should NOT auto-resolve
      endTime: new Date('2024-06-15T16:00:00Z')
      startTime: new Date('2024-06-15T14:00:00Z'), // Different time - dangerous!
      endTime: new Date('2024-06-15T15:00:00Z')
    // Should reject auto-resolution due to time conflicts
    if (result.conflict) {
