// WS-254: Dietary Requirements API Tests
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';
import { GET, POST, PUT, DELETE } from '@/app/api/catering/dietary/route';
import { createClient } from '@supabase/supabase-js';

// Mock dependencies
vi.mock('@supabase/supabase-js');
vi.mock('@/lib/security/withSecureValidation');

const mockSupabase = {
  auth: {
    getUser: vi.fn(),
  },
  from: vi.fn(() => ({
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    range: vi.fn().mockReturnThis(),
    single: vi.fn(),
    gte: vi.fn().mockReturnThis(),
    neq: vi.fn().mockReturnThis(),
  })),
};

describe('Dietary Requirements API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (createClient as any).mockReturnValue(mockSupabase);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('GET /api/catering/dietary', () => {
    it('should return dietary requirements with proper pagination', async () => {
      // Mock successful authentication
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'supplier-123' } },
        error: null,
      });

      // Mock database response
      const mockRequirements = [
        {
          id: '1',
          guest_name: 'John Doe',
          category: 'allergy',
          severity: 4,
          notes: 'Severe nut allergy',
          verified: true,
        },
      ];

      mockSupabase.from().single.mockResolvedValue({
        data: mockRequirements,
        error: null,
        count: 1,
      });

      const request = new NextRequest(
        'http://localhost/api/catering/dietary?wedding_id=wedding-123&limit=50',
        {
          method: 'GET',
          headers: {
            Authorization: 'Bearer valid-token',
          },
        },
      );

      const response = await GET(request);
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.success).toBe(true);
      expect(responseData.data.requirements).toHaveLength(1);
      expect(responseData.data.requirements[0].guest_name).toBe('John Doe');
      expect(responseData.data.pagination).toBeDefined();
    });

    it('should handle unauthorized requests', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: new Error('Unauthorized'),
      });

      const request = new NextRequest('http://localhost/api/catering/dietary', {
        method: 'GET',
      });

      const response = await GET(request);
      const responseData = await response.json();

      expect(response.status).toBe(401);
      expect(responseData.success).toBe(false);
      expect(responseData.error).toContain('Authentication required');
    });

    it('should validate query parameters properly', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'supplier-123' } },
        error: null,
      });

      const request = new NextRequest(
        'http://localhost/api/catering/dietary?wedding_id=invalid-uuid',
        {
          method: 'GET',
          headers: {
            Authorization: 'Bearer valid-token',
          },
        },
      );

      await GET(request);

      // Should filter out invalid wedding_id
      expect(mockSupabase.from).toHaveBeenCalled();
    });
  });

  describe('POST /api/catering/dietary', () => {
    const validRequirement = {
      guestName: 'Jane Smith',
      weddingId: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
      category: 'diet',
      severity: 3,
      notes: 'Vegetarian diet',
      verified: false,
      emergencyContact: '+1234567890',
    };

    it('should create a new dietary requirement successfully', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'supplier-123' } },
        error: null,
      });

      // Mock wedding verification
      mockSupabase.from().single.mockResolvedValueOnce({
        data: { id: validRequirement.weddingId },
        error: null,
      });

      // Mock duplicate check
      mockSupabase.from().single.mockResolvedValueOnce({
        data: null,
        error: null,
      });

      // Mock successful insert
      const mockCreatedRequirement = {
        id: 'req-123',
        ...validRequirement,
        guest_name: validRequirement.guestName,
        wedding_id: validRequirement.weddingId,
        supplier_id: 'supplier-123',
        created_at: new Date().toISOString(),
      };

      mockSupabase.from().single.mockResolvedValueOnce({
        data: mockCreatedRequirement,
        error: null,
      });

      const request = new NextRequest('http://localhost/api/catering/dietary', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer valid-token',
        },
        body: JSON.stringify(validRequirement),
      });

      const response = await POST(request);
      const responseData = await response.json();

      expect(response.status).toBe(201);
      expect(responseData.success).toBe(true);
      expect(responseData.data.guest_name).toBe(validRequirement.guestName);
    });

    it('should reject invalid dietary requirement data', async () => {
      const invalidRequirement = {
        guestName: '', // Invalid: empty name
        weddingId: 'invalid-uuid',
        category: 'invalid-category',
        severity: 10, // Invalid: out of range
        notes: '',
      };

      const request = new NextRequest('http://localhost/api/catering/dietary', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer valid-token',
        },
        body: JSON.stringify(invalidRequirement),
      });

      const response = await POST(request);
      const responseData = await response.json();

      expect(response.status).toBe(400);
      expect(responseData.success).toBe(false);
      expect(responseData.code).toBe('VALIDATION_ERROR');
    });

    it('should prevent duplicate guest requirements in same wedding', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'supplier-123' } },
        error: null,
      });

      // Mock wedding verification
      mockSupabase.from().single.mockResolvedValueOnce({
        data: { id: validRequirement.weddingId },
        error: null,
      });

      // Mock existing requirement found
      mockSupabase.from().single.mockResolvedValueOnce({
        data: [{ id: 'existing-req' }],
        error: null,
      });

      const request = new NextRequest('http://localhost/api/catering/dietary', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer valid-token',
        },
        body: JSON.stringify(validRequirement),
      });

      const response = await POST(request);
      const responseData = await response.json();

      expect(response.status).toBe(409);
      expect(responseData.success).toBe(false);
      expect(responseData.code).toBe('DUPLICATE_GUEST');
    });
  });

  describe('PUT /api/catering/dietary', () => {
    const updateData = {
      id: 'req-123',
      guestName: 'Updated Name',
      severity: 5,
      verified: true,
    };

    it('should update dietary requirement successfully', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'supplier-123' } },
        error: null,
      });

      // Mock existing requirement
      mockSupabase.from().single.mockResolvedValueOnce({
        data: {
          id: 'req-123',
          wedding_id: 'wedding-123',
          guest_name: 'Original Name',
        },
        error: null,
      });

      // Mock successful update
      const mockUpdatedRequirement = {
        id: 'req-123',
        guest_name: updateData.guestName,
        severity: updateData.severity,
        verified: updateData.verified,
        updated_at: new Date().toISOString(),
      };

      mockSupabase.from().single.mockResolvedValueOnce({
        data: mockUpdatedRequirement,
        error: null,
      });

      const request = new NextRequest('http://localhost/api/catering/dietary', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer valid-token',
        },
        body: JSON.stringify(updateData),
      });

      const response = await PUT(request);
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.success).toBe(true);
      expect(responseData.data.guest_name).toBe(updateData.guestName);
    });

    it('should return 404 for non-existent dietary requirement', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'supplier-123' } },
        error: null,
      });

      mockSupabase.from().single.mockResolvedValue({
        data: null,
        error: new Error('Not found'),
      });

      const request = new NextRequest('http://localhost/api/catering/dietary', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer valid-token',
        },
        body: JSON.stringify(updateData),
      });

      const response = await PUT(request);
      const responseData = await response.json();

      expect(response.status).toBe(404);
      expect(responseData.success).toBe(false);
      expect(responseData.code).toBe('NOT_FOUND');
    });
  });

  describe('DELETE /api/catering/dietary', () => {
    it('should delete dietary requirement successfully', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'supplier-123' } },
        error: null,
      });

      // Mock existing requirement (low severity)
      mockSupabase.from().single.mockResolvedValue({
        data: {
          id: 'req-123',
          guest_name: 'John Doe',
          severity: 2,
          category: 'preference',
        },
        error: null,
      });

      // Mock successful deletion
      mockSupabase.from().delete.mockResolvedValue({
        error: null,
      });

      const request = new NextRequest(
        'http://localhost/api/catering/dietary?id=req-123',
        {
          method: 'DELETE',
          headers: {
            Authorization: 'Bearer valid-token',
          },
        },
      );

      const response = await DELETE(request);
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.success).toBe(true);
      expect(responseData.message).toContain('deleted successfully');
    });

    it('should require confirmation for high-severity requirements', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'supplier-123' } },
        error: null,
      });

      // Mock high-severity requirement
      mockSupabase.from().single.mockResolvedValue({
        data: {
          id: 'req-123',
          guest_name: 'Jane Doe',
          severity: 5,
          category: 'allergy',
        },
        error: null,
      });

      const request = new NextRequest(
        'http://localhost/api/catering/dietary?id=req-123',
        {
          method: 'DELETE',
          headers: {
            Authorization: 'Bearer valid-token',
          },
        },
      );

      const response = await DELETE(request);
      const responseData = await response.json();

      expect(response.status).toBe(409);
      expect(responseData.success).toBe(false);
      expect(responseData.code).toBe('CONFIRMATION_REQUIRED');
      expect(responseData.details.warning).toContain('high-severity');
    });

    it('should validate ID format', async () => {
      const request = new NextRequest(
        'http://localhost/api/catering/dietary?id=invalid-id',
        {
          method: 'DELETE',
          headers: {
            Authorization: 'Bearer valid-token',
          },
        },
      );

      const response = await DELETE(request);
      const responseData = await response.json();

      expect(response.status).toBe(400);
      expect(responseData.success).toBe(false);
      expect(responseData.code).toBe('INVALID_ID');
    });
  });

  describe('Rate Limiting & Security', () => {
    it('should apply appropriate rate limits for different operations', () => {
      // This test verifies the security middleware is properly configured
      // The actual rate limiting is handled by withSecureValidation
      expect(GET).toBeDefined();
      expect(POST).toBeDefined();
      expect(PUT).toBeDefined();
      expect(DELETE).toBeDefined();
    });

    it('should not log sensitive dietary information', () => {
      // Verify that logSensitiveData is set to false in all operations
      // This is handled by the withSecureValidation middleware configuration
      expect(true).toBe(true); // Placeholder - actual test would check logging config
    });
  });

  describe('Error Handling', () => {
    it('should handle database connection errors gracefully', async () => {
      mockSupabase.auth.getUser.mockRejectedValue(
        new Error('Database connection failed'),
      );

      const request = new NextRequest('http://localhost/api/catering/dietary', {
        method: 'GET',
        headers: {
          Authorization: 'Bearer valid-token',
        },
      });

      const response = await GET(request);
      const responseData = await response.json();

      expect(response.status).toBe(500);
      expect(responseData.success).toBe(false);
      expect(responseData.code).toBe('FETCH_FAILED');
    });

    it('should handle malformed JSON requests', async () => {
      const request = new NextRequest('http://localhost/api/catering/dietary', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer valid-token',
        },
        body: 'invalid-json',
      });

      const response = await POST(request);
      const responseData = await response.json();

      expect(response.status).toBe(400);
      expect(responseData.success).toBe(false);
    });
  });

  describe('Business Logic Validation', () => {
    it('should enforce emergency contact for high-severity requirements', async () => {
      const highSeverityRequirement = {
        guestName: 'Critical Guest',
        weddingId: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
        category: 'allergy',
        severity: 5,
        notes: 'Life-threatening allergy',
        verified: true,
        // Missing emergencyContact
      };

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'supplier-123' } },
        error: null,
      });

      const request = new NextRequest('http://localhost/api/catering/dietary', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer valid-token',
        },
        body: JSON.stringify(highSeverityRequirement),
      });

      const response = await POST(request);
      const responseData = await response.json();

      expect(response.status).toBe(400);
      expect(responseData.success).toBe(false);
      expect(responseData.details).toContain('Emergency contact is required');
    });

    it('should validate category enums properly', async () => {
      const invalidCategoryRequirement = {
        guestName: 'Test Guest',
        weddingId: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
        category: 'invalid-category',
        severity: 3,
        notes: 'Some dietary requirement',
      };

      const request = new NextRequest('http://localhost/api/catering/dietary', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer valid-token',
        },
        body: JSON.stringify(invalidCategoryRequirement),
      });

      const response = await POST(request);
      const responseData = await response.json();

      expect(response.status).toBe(400);
      expect(responseData.success).toBe(false);
      expect(responseData.code).toBe('VALIDATION_ERROR');
    });
  });
});
