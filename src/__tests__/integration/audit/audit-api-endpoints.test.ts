import { NextRequest } from 'next/server';
import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll, Mock } from 'vitest';
import { GET, POST } from '@/app/api/admin/audit-log/route';
import { adminAuditLogger } from '@/lib/admin/auditLogger';
import { verifyAdminAccess } from '@/lib/admin/auth';
import { createClient } from '@/lib/supabase/server';

// Mock dependencies
vi.mock('@/lib/admin/auditLogger');
vi.mock('@/lib/admin/auth');
vi.mock('@/lib/supabase/server');
const mockAdminAuditLogger = adminAuditLogger as ReturnType<typeof vi.fn>ed<typeof adminAuditLogger>;
const mockVerifyAdminAccess = verifyAdminAccess as ReturnType<typeof vi.fn>edFunction<typeof verifyAdminAccess>;
const mockCreateClient = createClient as ReturnType<typeof vi.fn>edFunction<typeof createClient>;
describe('Audit API Endpoints Integration Tests', () => {
  let mockSupabase: unknown;
  let mockUser: unknown;
  beforeEach(() => {
    mockUser = {
      id: 'admin123',
      email: 'admin@example.com'
    };
    mockSupabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: mockUser },
          error: null
        })
      }
    mockCreateClient.mockResolvedValue(mockSupabase);
    mockVerifyAdminAccess.mockResolvedValue(true);
    
    vi.clearAllMocks();
  });
  describe('GET /api/admin/audit-log', () => {
    it('should fetch audit entries with default parameters', async () => {
      const mockEntries = [
        {
          adminId: 'admin123',
          adminEmail: 'admin@example.com',
          action: 'user_created',
          status: 'success',
          details: {},
          timestamp: '2024-01-01T00:00:00.000Z',
          clientIP: '192.168.1.1',
          requiresMFA: false
        }
      ];
      mockAdminAuditLogger.getAuditEntries.mockResolvedValue(mockEntries);
      const request = new NextRequest('http://localhost:3000/api/admin/audit-log');
      const response = await GET(request);
      const data = await response.json();
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.entries).toEqual(mockEntries);
      expect(data.pagination).toMatchObject({
        currentPage: 1,
        limit: 10
      });
    });
    it('should apply query parameter filters', async () => {
      const mockEntries = [];
      const url = 'http://localhost:3000/api/admin/audit-log?page=2&limit=20&status=failed&action=user_delete&timeRange=7d&adminId=admin456';
      const request = new NextRequest(url);
      expect(mockAdminAuditLogger.getAuditEntries).toHaveBeenCalledWith({
        adminId: 'admin456',
        action: 'user_delete',
        status: 'failed',
        startDate: expect.any(String),
        limit: 20,
        offset: 20
    it('should handle different time ranges', async () => {
      // Test 1 hour range
      let url = 'http://localhost:3000/api/admin/audit-log?timeRange=1h';
      let request = new NextRequest(url);
      await GET(request);
      expect(mockAdminAuditLogger.getAuditEntries).toHaveBeenCalledWith(
        expect.objectContaining({
          startDate: expect.any(String)
      );
      // Test 30 day range
      url = 'http://localhost:3000/api/admin/audit-log?timeRange=30d';
      request = new NextRequest(url);
    it('should reject unauthorized access', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: new Error('No user')
      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized access');
    it('should reject non-admin users', async () => {
      mockVerifyAdminAccess.mockResolvedValue(false);
      expect(response.status).toBe(403);
      expect(data.error).toBe('Insufficient permissions');
    it('should handle internal server errors', async () => {
      mockAdminAuditLogger.getAuditEntries.mockRejectedValue(new Error('Database error'));
      expect(response.status).toBe(500);
      expect(data.error).toBe('Internal server error');
  describe('POST /api/admin/audit-log', () => {
    describe('cleanup action', () => {
      it('should perform audit log cleanup', async () => {
        mockAdminAuditLogger.cleanupOldEntries.mockResolvedValue();
        mockAdminAuditLogger.logAction.mockResolvedValue();
        const requestBody = {
          action: 'cleanup',
          daysToKeep: 60
        };
        const request = new NextRequest('http://localhost:3000/api/admin/audit-log', {
          method: 'POST',
          body: JSON.stringify(requestBody),
          headers: {
            'content-type': 'application/json',
            'x-forwarded-for': '192.168.1.1'
          }
        });
        const response = await POST(request);
        const data = await response.json();
        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
        expect(data.message).toBe('Audit log cleanup completed');
        expect(mockAdminAuditLogger.cleanupOldEntries).toHaveBeenCalledWith(60);
        expect(mockAdminAuditLogger.logAction).toHaveBeenCalledWith({
          action: 'audit_log_cleanup',
          details: { days_kept: 60 },
          timestamp: expect.any(String),
      it('should use default retention period when not specified', async () => {
        const requestBody = { action: 'cleanup' };
          headers: { 'content-type': 'application/json' }
        expect(mockAdminAuditLogger.cleanupOldEntries).toHaveBeenCalledWith(90);
    describe('export action', () => {
      it('should export audit summary', async () => {
        const mockSummary = {
          totalActions: 150,
          successfulActions: 140,
          failedActions: 10,
          mfaRequiredActions: 25,
          topActions: [
            { action: 'user_login', count: 50 },
            { action: 'user_created', count: 30 }
          ],
          topAdmins: [
            { adminEmail: 'admin1@example.com', count: 75 },
            { adminEmail: 'admin2@example.com', count: 45 }
          ]
        mockAdminAuditLogger.getAuditSummary.mockResolvedValue(mockSummary);
        const requestBody = { action: 'export' };
        expect(data.data).toEqual(mockSummary);
        expect(mockAdminAuditLogger.getAuditSummary).toHaveBeenCalledWith(30);
    it('should reject unknown actions', async () => {
      const requestBody = { action: 'invalid_action' };
      const request = new NextRequest('http://localhost:3000/api/admin/audit-log', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: { 'content-type': 'application/json' }
      const response = await POST(request);
      expect(response.status).toBe(400);
      expect(data.error).toBe('Unknown action');
    it('should handle authentication errors', async () => {
        error: new Error('Authentication failed')
      const requestBody = { action: 'cleanup' };
      mockAdminAuditLogger.cleanupOldEntries.mockRejectedValue(new Error('Cleanup failed'));
  describe('Audit Logging Integration', () => {
    it('should log successful cleanup operations', async () => {
      mockAdminAuditLogger.cleanupOldEntries.mockResolvedValue();
      mockAdminAuditLogger.logAction.mockResolvedValue();
      const requestBody = { action: 'cleanup', daysToKeep: 45 };
        headers: {
          'content-type': 'application/json',
          'x-forwarded-for': '203.0.113.1',
          'user-agent': 'Mozilla/5.0 (Test Browser)'
      await POST(request);
      expect(mockAdminAuditLogger.logAction).toHaveBeenCalledWith({
        adminId: 'admin123',
        adminEmail: 'admin@example.com',
        action: 'audit_log_cleanup',
        status: 'success',
        details: { days_kept: 45 },
        timestamp: expect.any(String),
        clientIP: '203.0.113.1',
        requiresMFA: false
    it('should handle missing IP address gracefully', async () => {
      expect(mockAdminAuditLogger.logAction).toHaveBeenCalledWith(
          clientIP: 'unknown'
  describe('Performance and Load Handling', () => {
    it('should handle large result sets with pagination', async () => {
      const largeDataSet = Array.from({ length: 1000 }, (_, i) => ({
        adminId: `admin${i}`,
        adminEmail: `admin${i}@example.com`,
        action: 'user_action',
        details: {},
        timestamp: '2024-01-01T00:00:00.000Z',
        clientIP: '192.168.1.1',
      }));
      mockAdminAuditLogger.getAuditEntries.mockResolvedValue(largeDataSet.slice(0, 50));
      const request = new NextRequest('http://localhost:3000/api/admin/audit-log?limit=50&page=1');
      expect(data.entries).toHaveLength(50);
      expect(data.pagination.hasMore).toBe(true);
    it('should handle concurrent cleanup and export requests', async () => {
      mockAdminAuditLogger.getAuditSummary.mockResolvedValue({
        totalActions: 100,
        successfulActions: 95,
        failedActions: 5,
        mfaRequiredActions: 15,
        topActions: [],
        topAdmins: []
      const cleanupRequest = new NextRequest('http://localhost:3000/api/admin/audit-log', {
        body: JSON.stringify({ action: 'cleanup' }),
      const exportRequest = new NextRequest('http://localhost:3000/api/admin/audit-log', {
        body: JSON.stringify({ action: 'export' }),
      const [cleanupResponse, exportResponse] = await Promise.all([
        POST(cleanupRequest),
        POST(exportRequest)
      ]);
      expect(cleanupResponse.status).toBe(200);
      expect(exportResponse.status).toBe(200);
      expect(mockAdminAuditLogger.cleanupOldEntries).toHaveBeenCalled();
      expect(mockAdminAuditLogger.getAuditSummary).toHaveBeenCalled();
  describe('Error Handling and Recovery', () => {
    it('should handle Supabase connection failures gracefully', async () => {
      mockCreateClient.mockRejectedValue(new Error('Supabase connection failed'));
    it('should handle malformed JSON requests', async () => {
        body: 'invalid json',
    it('should maintain audit integrity during partial failures', async () => {
      mockAdminAuditLogger.logAction.mockRejectedValue(new Error('Logging failed'));
      // Cleanup should still succeed even if logging fails
      expect(response.status).toBe(500); // But overall request fails due to logging error
});
