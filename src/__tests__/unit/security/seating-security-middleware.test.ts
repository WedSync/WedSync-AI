/**
 * @vitest-environment node
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createSeatingSecurityMiddleware } from '@/lib/security/seating-security-middleware';
import { type Guest, type Table } from '@/types/seating';
// Mock the rate limiter
vi.mock('@/lib/ratelimit/seating-rate-limiter', () => ({
  rateLimit: vi.fn(),
}));
// Mock DOMPurify
vi.mock('isomorphic-dompurify', () => ({
  DOMPurify: {
    sanitize: vi.fn((input: string) => input.replace(/<[^>]*>/g, '')), // Simple HTML tag removal
  },
const mockSecurityContext = {
  userId: 'user-123',
  coupleId: 'couple-456',
  sessionId: 'session-789',
  ipAddress: '192.168.1.1',
  userAgent: 'Mozilla/5.0',
};
const mockGuests: Guest[] = [
  {
    id: 'guest-1',
    name: 'John Doe',
    priority: 'vip',
    dietaryRequirements: ['vegetarian'],
    accessibilityRequirements: ['wheelchair'],
    id: 'guest-2',
    name: 'Jane Smith',
    priority: 'family',
];
const mockTables: Table[] = [
    id: 'table-1',
    name: 'Head Table',
    capacity: 8,
    shape: 'round',
    position: { x: 100, y: 100 },
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
describe('SeatingSecurityMiddleware', () => {
  let middleware: ReturnType<typeof createSeatingSecurityMiddleware>;
  let mockRateLimit: ReturnType<typeof vi.fn>;
  beforeEach(() => {
    vi.clearAllMocks();
    middleware = createSeatingSecurityMiddleware(mockSecurityContext);
    
    // Import the mocked rate limit function
    mockRateLimit = vi.mocked(
      require('@/lib/ratelimit/seating-rate-limiter').rateLimit
    );
    // Default to allowing rate limit
    mockRateLimit.mockResolvedValue(true);
  });
  afterEach(() => {
    vi.restoreAllMocks();
  describe('Guest Assignment Security', () => {
    it('allows valid guest assignment', async () => {
      const result = await middleware.assignGuest(
        'guest-1',
        'table-1',
        mockGuests,
        mockTables
      );
      expect(result.success).toBe(true);
      expect(result.errors).toBeUndefined();
    });
    it('blocks assignment when rate limit is exceeded', async () => {
      mockRateLimit.mockResolvedValue(false);
      expect(result.success).toBe(false);
      expect(result.errors).toContain('Rate limit exceeded. Please slow down your assignment operations.');
    it('validates guest exists', async () => {
        'non-existent-guest',
      expect(result.errors).toContain('Guest not found or access denied.');
    it('validates table exists', async () => {
        'non-existent-table',
      expect(result.errors).toContain('Table not found or access denied.');
    it('checks table capacity', async () => {
      const fullTable: Table = {
        ...mockTables[0],
        capacity: 1,
      };
      const guestsAtTable: Guest[] = [
        { ...mockGuests[0], assignedTableId: 'table-1' },
      ];
        'guest-2',
        guestsAtTable,
        [fullTable]
      expect(result.errors).toContain('Table is at full capacity.');
    it('warns about rapid guest movements', async () => {
      const guestWithTable: Guest = {
        ...mockGuests[0],
        assignedTableId: 'table-2',
        [guestWithTable],
      expect(result.warnings).toContain('Guest is being moved between tables rapidly.');
    it('sanitizes malicious input IDs', async () => {
        '<script>alert("xss")</script>',
        '../../../etc/passwd',
      // Should have sanitized the IDs and attempted validation
      expect(mockRateLimit).toHaveBeenCalled();
  describe('Table Creation Security', () => {
    it('allows valid table creation', async () => {
      const tableData = {
        name: 'New Table',
        capacity: 8,
        shape: 'round' as const,
        position: { x: 200, y: 200 },
        notes: 'Special table for VIPs',
      const result = await middleware.createTable(tableData);
      expect(result.data).toMatchObject({
        shape: 'round',
      });
    it('blocks creation when rate limit is exceeded', async () => {
      expect(result.errors).toContain('Rate limit exceeded. Please slow down table creation.');
    it('sanitizes table name', async () => {
        name: '<script>alert("xss")</script>Malicious Table',
      // Should have sanitized the name (mocked DOMPurify removes tags)
      expect(result.data.name).toBe('alert("xss")Malicious Table');
    it('constrains capacity to valid range', async () => {
        name: 'Huge Table',
        capacity: 999,
      expect(result.data.capacity).toBe(20); // Should be capped at maximum
    it('constrains position coordinates', async () => {
        name: 'Far Table',
        position: { x: 9999, y: -500 },
      expect(result.data.position.x).toBe(2000); // Capped at maximum
      expect(result.data.position.y).toBe(0); // Floored at minimum
    it('sanitizes notes field', async () => {
        name: 'Test Table',
        notes: '<img src=x onerror=alert(1)>This is a note</img>',
      expect(result.data.notes).toBe('This is a note'); // HTML removed
  describe('Table Update Security', () => {
    it('allows valid table updates', async () => {
      const updates = {
        name: 'Updated Table Name',
        capacity: 10,
      const result = await middleware.updateTable('table-1', updates, mockTables);
    it('blocks update when rate limit is exceeded', async () => {
      const result = await middleware.updateTable('table-1', { name: 'New Name' }, mockTables);
      expect(result.errors).toContain('Rate limit exceeded. Please slow down table updates.');
    it('validates table exists for updates', async () => {
      const result = await middleware.updateTable(
        { name: 'New Name' },
    it('sanitizes updated fields', async () => {
      const maliciousUpdates = {
        name: '<script>document.cookie</script>Evil Table',
        notes: '<iframe src="javascript:alert(1)"></iframe>Bad notes',
      const result = await middleware.updateTable('table-1', maliciousUpdates, mockTables);
      expect(result.data.name).not.toContain('<script>');
      expect(result.data.notes).not.toContain('<iframe>');
  describe('Bulk Operations Security', () => {
    it('allows reasonable bulk operations', async () => {
      const result = await middleware.validateBulkOperation('bulk_assign', 50);
    it('blocks excessive bulk operations', async () => {
      const result = await middleware.validateBulkOperation('bulk_assign', 999);
      expect(result.errors).toContain('Bulk operation too large. Maximum 100 operations allowed.');
    it('applies rate limiting to bulk operations', async () => {
      const result = await middleware.validateBulkOperation('bulk_assign', 10);
      expect(result.errors).toContain('Rate limit exceeded. Bulk operations are limited to prevent abuse.');
    it('logs bulk operation attempts', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      await middleware.validateBulkOperation('import_layout', 25);
      expect(consoleSpy).toHaveBeenCalledWith(
        'Bulk operation attempted:',
        expect.objectContaining({
          userId: 'user-123',
          coupleId: 'couple-456',
          operationType: 'import_layout',
          operationCount: 25,
        })
      consoleSpy.mockRestore();
  describe('Export Operations Security', () => {
    it('allows valid export operations', async () => {
      const result = await middleware.validateExportOperation('layout');
    it('applies rate limiting to exports', async () => {
      const result = await middleware.validateExportOperation('full_arrangement');
      expect(result.errors).toContain('Rate limit exceeded. Export operations are limited.');
    it('logs export operation attempts', async () => {
      await middleware.validateExportOperation('assignments');
        'Export operation attempted:',
          exportType: 'assignments',
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0',
  describe('Arrangement Access Validation', () => {
    it('allows valid arrangement access', async () => {
      const result = await middleware.validateArrangementAccess('arrangement-123');
      expect(result.data?.arrangementId).toBe('arrangement-123');
    it('sanitizes arrangement IDs', async () => {
      const result = await middleware.validateArrangementAccess('../../../etc/passwd');
      expect(result.data?.arrangementId).toBe('..etcpasswd'); // Path separators removed
    it('rejects empty arrangement IDs', async () => {
      const result = await middleware.validateArrangementAccess('');
      expect(result.errors).toContain('Invalid arrangement identifier.');
    it('logs access attempts', async () => {
      await middleware.validateArrangementAccess('test-arrangement');
        'Arrangement access attempted:',
          arrangementId: 'test-arrangement',
  describe('Error Handling', () => {
    it('handles rate limiter errors gracefully', async () => {
      mockRateLimit.mockRejectedValue(new Error('Rate limiter service unavailable'));
      const result = await middleware.assignGuest('guest-1', 'table-1', mockGuests, mockTables);
      expect(result.errors).toContain('Security validation failed. Please try again.');
    it('handles validation schema errors', async () => {
      // Pass invalid data that would cause schema validation to fail
      const result = await middleware.assignGuest('', '', [], []);
      expect(result.errors).toHaveLength(1);
    it('does not expose sensitive error details', async () => {
      mockRateLimit.mockRejectedValue(new Error('Database connection failed: admin/password'));
      const result = await middleware.createTable({
        name: 'Test',
        position: { x: 0, y: 0 },
      expect(result.errors?.[0]).not.toContain('admin/password');
  describe('Input Sanitization Edge Cases', () => {
    it('handles very long input strings', async () => {
      const veryLongName = 'A'.repeat(1000);
      
        name: veryLongName,
        position: { x: 100, y: 100 },
      expect(result.data.name.length).toBeLessThanOrEqual(500); // Should be truncated
    it('handles unicode and special characters', async () => {
      const unicodeName = '测试表格 🎉 José María';
        name: unicodeName,
      expect(result.data.name).toBeTruthy();
    it('handles null and undefined values', async () => {
        notes: undefined,
      expect(result.data.notes).toBeUndefined();
  describe('Context Validation', () => {
    it('includes security context in all operations', async () => {
      await middleware.validateExportOperation('layout');
        expect.any(String),
          userId: mockSecurityContext.userId,
          coupleId: mockSecurityContext.coupleId,
    it('works with minimal security context', () => {
      const minimalContext = {
        userId: 'user-123',
        coupleId: 'couple-456',
      const minimalMiddleware = createSeatingSecurityMiddleware(minimalContext);
      expect(minimalMiddleware).toBeTruthy();
      expect(() => minimalMiddleware.assignGuest('guest-1', 'table-1', mockGuests, mockTables)).not.toThrow();
});
