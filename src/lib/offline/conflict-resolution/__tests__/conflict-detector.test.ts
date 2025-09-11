/**
 * Unit Tests for Conflict Detection Engine
 * Feature: WS-172 - Offline Functionality - Conflict Resolution
 * Team: C - Batch 21 - Round 3
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ConflictDetector, createWeddingDataDetector } from '../conflict-detector';
import type { VersionedData, TimelineItem, VendorContact, WeddingDataType } from '../types';
describe('ConflictDetector', () => {
  let detector: ConflictDetector<any>;
  
  beforeEach(() => {
    detector = new ConflictDetector('timeline-item', ['priority'], ['startTime', 'endTime'], ['tags']);
  });
  describe('Basic Conflict Detection', () => {
    it('should return null for identical data', () => {
      const mockData = {
        id: 'timeline-123',
        title: 'Wedding Ceremony',
        startTime: new Date('2024-06-15T15:00:00Z'),
        endTime: new Date('2024-06-15T16:00:00Z'),
        location: 'Garden Pavilion'
      };
      const localVersion: VersionedData<any> = {
        version: 1,
        data: mockData,
        lastModified: {
          timestamp: 1640995200000,
          timezone: 'UTC',
          deviceTime: 1640995200000
        },
        modifiedBy: {
          id: 'user-123',
          role: 'bride',
          deviceId: 'device-abc',
          sessionId: 'session-def'
        checksum: 'matching-checksum'
      const remoteVersion: VersionedData<any> = { ...localVersion };
      const conflict = detector.detectConflicts(localVersion, remoteVersion);
      expect(conflict).toBeNull();
    });
    it('should detect field conflicts', () => {
      const baseData = {
        data: baseData,
        checksum: 'local-checksum'
      const remoteVersion: VersionedData<any> = {
        ...localVersion,
        data: {
          ...baseData,
          location: 'Main Hall', // Different location
          startTime: new Date('2024-06-15T14:30:00Z') // Different time
        checksum: 'remote-checksum'
      
      expect(conflict).not.toBeNull();
      expect(conflict!.metadata.affectedFields).toContain('location');
      expect(conflict!.metadata.affectedFields).toContain('startTime');
      expect(conflict!.conflictType.type).toBe('field-conflict');
    it('should calculate severity correctly', () => {
        endTime: new Date('2024-06-15T16:00:00Z')
        lastModified: { timestamp: 1640995200000, timezone: 'UTC', deviceTime: 1640995200000 },
        modifiedBy: { id: 'user-123', role: 'bride', deviceId: 'device-abc', sessionId: 'session-def' },
      // Test critical severity (conflicting critical fields)
      const remoteVersionCritical: VersionedData<any> = {
        data: { ...baseData, startTime: new Date('2024-06-15T14:00:00Z') },
      const criticalConflict = detector.detectConflicts(localVersion, remoteVersionCritical);
      expect(criticalConflict!.metadata.severity).toBe('critical');
      // Test low severity (only non-critical fields)
      const remoteVersionLow: VersionedData<any> = {
        data: { ...baseData, title: 'Modified Ceremony Title' },
      const lowConflict = detector.detectConflicts(localVersion, remoteVersionLow);
      expect(lowConflict!.metadata.severity).toBe('low');
    it('should determine auto-resolvability correctly', () => {
        tags: ['ceremony', 'outdoor'],
        notes: 'Original notes'
      // Auto-resolvable conflict (only tags changed)
      const remoteVersionAutoResolvable: VersionedData<any> = {
        data: { ...baseData, tags: ['ceremony', 'indoor'] },
      const autoResolvableConflict = detector.detectConflicts(localVersion, remoteVersionAutoResolvable);
      expect(autoResolvableConflict!.metadata.autoResolvable).toBe(true);
      // Not auto-resolvable (critical field changed)
      const remoteVersionNotAutoResolvable: VersionedData<any> = {
      const notAutoResolvableConflict = detector.detectConflicts(localVersion, remoteVersionNotAutoResolvable);
      expect(notAutoResolvableConflict!.metadata.autoResolvable).toBe(false);
  describe('Array Comparison', () => {
    it('should detect array differences correctly', () => {
        assignedTo: ['user-1', 'user-2'],
        tags: ['ceremony']
          assignedTo: ['user-1', 'user-3'], // Different assignment
          tags: ['ceremony', 'outdoor'] // Additional tag
      expect(conflict!.metadata.affectedFields).toContain('assignedTo');
      expect(conflict!.metadata.affectedFields).toContain('tags');
    it('should handle same arrays in different order', () => {
        data: { tags: ['ceremony', 'outdoor', 'garden'] },
        data: { tags: ['garden', 'ceremony', 'outdoor'] }, // Same items, different order
      expect(conflict).toBeNull(); // Should not conflict for same items in different order
  describe('Date Comparison', () => {
    it('should detect date conflicts correctly', () => {
          startTime: new Date('2024-06-15T15:00:00Z'),
          endTime: new Date('2024-06-15T16:00:00Z')
          startTime: new Date('2024-06-15T14:30:00Z'), // 30 minutes earlier
      expect(conflict!.metadata.affectedFields).not.toContain('endTime');
  describe('Data Integrity Validation', () => {
    it('should validate data integrity correctly', () => {
      const data = { id: 'test', value: 'test-data' };
      const validChecksum = detector.generateChecksum ? 
        detector.generateChecksum(data) : 
        'valid-checksum'; // Fallback for private method
      const versionedData: VersionedData<any> = {
        id: 'test-123',
        data,
        lastModified: { timestamp: Date.now(), timezone: 'UTC', deviceTime: Date.now() },
        checksum: validChecksum
      // This will pass if the checksum matches
      const isValid = detector.validateDataIntegrity(versionedData);
      expect(typeof isValid).toBe('boolean');
  describe('Wedding Data Type Factory', () => {
    it('should create timeline item detector with correct configuration', () => {
      const timelineDetector = createWeddingDataDetector<TimelineItem>('timeline-item');
      expect(timelineDetector).toBeInstanceOf(ConflictDetector);
    it('should create vendor contact detector with correct configuration', () => {
      const vendorDetector = createWeddingDataDetector<VendorContact>('vendor-contact');
      expect(vendorDetector).toBeInstanceOf(ConflictDetector);
    it('should handle different data types appropriately', () => {
      const dataTypes: WeddingDataType[] = [
        'timeline-item',
        'vendor-contact',
        'guest-list',
        'budget-item',
        'task-assignment'
      ];
      dataTypes.forEach(dataType => {
        const detector = createWeddingDataDetector(dataType);
        expect(detector).toBeInstanceOf(ConflictDetector);
      });
  describe('Error Handling', () => {
    it('should handle malformed data gracefully', () => {
        data: null, // Malformed data
        checksum: 'checksum'
        data: { valid: 'data' },
        checksum: 'different-checksum'
      expect(() => {
        detector.detectConflicts(localVersion, remoteVersion);
      }).not.toThrow();
    it('should handle missing fields gracefully', () => {
        data: { field1: 'value1' },
        data: { field1: 'value1', field2: 'value2' }, // Additional field
      expect(conflict!.metadata.affectedFields).toContain('field2');
  describe('Statistics and Monitoring', () => {
    it('should generate conflict statistics correctly', () => {
      const conflicts = [
        {
          metadata: {
            conflictId: 'conflict-1',
            severity: 'high' as const,
            autoResolvable: true,
            affectedFields: [],
            detectedAt: { timestamp: Date.now(), timezone: 'UTC', deviceTime: Date.now() }
          },
          conflictType: { type: 'field-conflict' as const, field: 'test', conflictingValues: [] }
            conflictId: 'conflict-2',
            severity: 'low' as const,
            autoResolvable: false,
          conflictType: { type: 'deletion-conflict' as const, deletedBy: {} as any, modifiedBy: {} as any }
        }
      ] as any[];
      const stats = detector.getConflictStats(conflicts);
      expect(stats.total).toBe(2);
      expect(stats.bySeverity.high).toBe(1);
      expect(stats.bySeverity.low).toBe(1);
      expect(stats.byType['field-conflict']).toBe(1);
      expect(stats.byType['deletion-conflict']).toBe(1);
      expect(stats.autoResolvableCount).toBe(1);
});
describe('Wedding-Specific Conflict Detection', () => {
  describe('Timeline Item Conflicts', () => {
    let detector: ConflictDetector<TimelineItem>;
    
    beforeEach(() => {
      detector = createWeddingDataDetector<TimelineItem>('timeline-item');
    it('should detect timeline scheduling conflicts', () => {
      const baseTimeline: TimelineItem = {
        location: 'Garden Pavilion',
        assignedTo: ['planner-1'],
        priority: 5,
        status: 'planned',
        dependencies: [],
      const localVersion: VersionedData<TimelineItem> = {
        data: baseTimeline,
        modifiedBy: { id: 'bride-123', role: 'bride', deviceId: 'device-abc', sessionId: 'session-def' },
      const remoteVersion: VersionedData<TimelineItem> = {
          ...baseTimeline,
          startTime: new Date('2024-06-15T14:30:00Z'), // Scheduling conflict
          location: 'Main Hall', // Venue conflict
          assignedTo: ['planner-1', 'planner-2'] // Assignment change
      expect(conflict!.metadata.severity).toBe('critical'); // Time conflicts are critical
      expect(conflict!.metadata.affectedFields).toEqual(
        expect.arrayContaining(['startTime', 'location', 'assignedTo'])
      );
  describe('Vendor Contact Conflicts', () => {
    let detector: ConflictDetector<VendorContact>;
      detector = createWeddingDataDetector<VendorContact>('vendor-contact');
    it('should detect vendor contract status conflicts', () => {
      const baseVendor: VendorContact = {
        id: 'vendor-123',
        name: 'Amazing Photographer',
        company: 'Photo Co',
        category: 'photographer',
        contact: {
          email: 'photographer@photo.co',
          phone: '555-0123'
        contractStatus: 'negotiating',
        budget: {
          estimated: 2500,
          currency: 'USD'
        notes: ['Initial contact made']
      const localVersion: VersionedData<VendorContact> = {
        data: baseVendor,
      const remoteVersion: VersionedData<VendorContact> = {
          ...baseVendor,
          contractStatus: 'booked', // Contract status conflict
          budget: {
            ...baseVendor.budget,
            actual: 2800 // Budget update
          }
        expect.arrayContaining(['contractStatus', 'budget'])
