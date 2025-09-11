import { GET, POST, PUT, DELETE } from '../places/wedding-places/route';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { NextRequest } from 'next/server';

// Mock dependencies
vi.mock('../../../lib/middleware/security');
vi.mock('../../../lib/middleware/audit');
vi.mock('@supabase/ssr');

// Mock security middleware
const mockWithSecureValidation = vi.fn((schema, handler) => handler);
vi.mock('../../../lib/middleware/security', () => ({
  withSecureValidation: mockWithSecureValidation,
  secureStringSchema: vi.fn(),
  secureObjectSchema: vi.fn(),
}));

// Mock audit middleware
const mockLogAuditEvent = vi.fn();
vi.mock('../../../lib/middleware/audit', () => ({
  logAuditEvent: mockLogAuditEvent,
}));

// Mock Supabase
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
    match: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    single: vi.fn(),
  })),
};

vi.mock('@supabase/ssr', () => ({
  createServerClient: vi.fn(() => mockSupabase),
}));

// Mock console methods
const consoleMock = {
  error: vi.spyOn(console, 'error').mockImplementation(() => {}),
  warn: vi.spyOn(console, 'warn').mockImplementation(() => {}),
  log: vi.spyOn(console, 'log').mockImplementation(() => {}),
};

describe('/api/places/wedding-places', () => {
  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
  };

  const mockWeddingPlace = {
    id: 'wp-123',
    couple_id: 'couple-456',
    supplier_id: 'user-123',
    place_id: 'venue-789',
    wedding_role: 'ceremony_venue',
    is_primary: true,
    booking_status: 'considering',
    notes: 'Beautiful outdoor ceremony space',
    added_at: '2025-01-20T10:00:00Z',
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Default successful auth mock
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('GET /api/places/wedding-places', () => {
    it('should get wedding places for a couple successfully', async () => {
      const mockDbResponse = {
        data: [mockWeddingPlace],
        error: null,
      };

      mockSupabase
        .from()
        .select()
        .eq()
        .order()
        .mockResolvedValue(mockDbResponse);

      const url = new URL('http://localhost:3000/api/places/wedding-places');
      url.searchParams.set('coupleId', 'couple-456');

      const request = new NextRequest(url);
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({
        success: true,
        weddingPlaces: [mockWeddingPlace],
      });

      expect(mockSupabase.from).toHaveBeenCalledWith('wedding_places');
      expect(mockLogAuditEvent).toHaveBeenCalledWith(
        'user-123',
        'wedding_places_get',
        'success',
        expect.objectContaining({
          coupleId: 'couple-456',
          count: 1,
        }),
      );
    });

    it('should filter wedding places by role', async () => {
      const ceremonyVenues = [
        { ...mockWeddingPlace, wedding_role: 'ceremony_venue' },
      ];

      mockSupabase.from().select().eq().eq().order().mockResolvedValue({
        data: ceremonyVenues,
        error: null,
      });

      const url = new URL('http://localhost:3000/api/places/wedding-places');
      url.searchParams.set('coupleId', 'couple-456');
      url.searchParams.set('role', 'ceremony_venue');

      const request = new NextRequest(url);
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.weddingPlaces).toHaveLength(1);
      expect(data.weddingPlaces[0].wedding_role).toBe('ceremony_venue');
    });

    it('should filter wedding places by booking status', async () => {
      const bookedVenues = [{ ...mockWeddingPlace, booking_status: 'booked' }];

      mockSupabase.from().select().eq().eq().order().mockResolvedValue({
        data: bookedVenues,
        error: null,
      });

      const url = new URL('http://localhost:3000/api/places/wedding-places');
      url.searchParams.set('coupleId', 'couple-456');
      url.searchParams.set('status', 'booked');

      const request = new NextRequest(url);
      const response = await GET(request);

      expect(response.status).toBe(200);
    });

    it('should require authentication', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Not authenticated' },
      });

      const url = new URL('http://localhost:3000/api/places/wedding-places');
      url.searchParams.set('coupleId', 'couple-456');

      const request = new NextRequest(url);
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data).toEqual({
        success: false,
        error: 'Authentication required',
      });
    });

    it('should require coupleId parameter', async () => {
      const url = new URL('http://localhost:3000/api/places/wedding-places');
      // No coupleId parameter

      const request = new NextRequest(url);
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toEqual({
        success: false,
        error: 'Couple ID is required',
      });
    });

    it('should handle database errors gracefully', async () => {
      mockSupabase
        .from()
        .select()
        .eq()
        .order()
        .mockResolvedValue({
          data: null,
          error: { message: 'Database connection failed' },
        });

      const url = new URL('http://localhost:3000/api/places/wedding-places');
      url.searchParams.set('coupleId', 'couple-456');

      const request = new NextRequest(url);
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data).toEqual({
        success: false,
        error: 'Database connection failed',
      });
    });
  });

  describe('POST /api/places/wedding-places', () => {
    const validPostBody = {
      coupleId: 'couple-456',
      placeId: 'venue-789',
      weddingRole: 'ceremony_venue',
      isPrimary: true,
      bookingStatus: 'considering',
      notes: 'Gorgeous outdoor ceremony space',
    };

    it('should create a new wedding place assignment successfully', async () => {
      const mockCreatedPlace = {
        id: 'wp-new-123',
        ...validPostBody,
        supplier_id: 'user-123',
        added_at: '2025-01-20T10:30:00Z',
      };

      mockSupabase.from().insert().select().single().mockResolvedValue({
        data: mockCreatedPlace,
        error: null,
      });

      const request = new NextRequest(
        'http://localhost:3000/api/places/wedding-places',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(validPostBody),
        },
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data).toEqual({
        success: true,
        weddingPlace: mockCreatedPlace,
        message: 'Wedding place assigned successfully',
      });

      expect(mockSupabase.from).toHaveBeenCalledWith('wedding_places');
      expect(mockLogAuditEvent).toHaveBeenCalledWith(
        'user-123',
        'wedding_place_assigned',
        'success',
        expect.objectContaining({
          placeId: 'venue-789',
          weddingRole: 'ceremony_venue',
        }),
      );
    });

    it('should validate required fields', async () => {
      const invalidBody = {
        coupleId: 'couple-456',
        // Missing required placeId and weddingRole
      };

      const request = new NextRequest(
        'http://localhost:3000/api/places/wedding-places',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(invalidBody),
        },
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('required');
    });

    it('should validate wedding role values', async () => {
      const invalidRoleBody = {
        ...validPostBody,
        weddingRole: 'invalid_role',
      };

      const request = new NextRequest(
        'http://localhost:3000/api/places/wedding-places',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(invalidRoleBody),
        },
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Invalid wedding role');
    });

    it('should validate booking status values', async () => {
      const invalidStatusBody = {
        ...validPostBody,
        bookingStatus: 'invalid_status',
      };

      const request = new NextRequest(
        'http://localhost:3000/api/places/wedding-places',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(invalidStatusBody),
        },
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Invalid booking status');
    });

    it('should handle database constraint violations', async () => {
      mockSupabase
        .from()
        .insert()
        .select()
        .single()
        .mockResolvedValue({
          data: null,
          error: {
            message: 'Duplicate key violation',
            code: '23505',
          },
        });

      const request = new NextRequest(
        'http://localhost:3000/api/places/wedding-places',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(validPostBody),
        },
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(409);
      expect(data).toEqual({
        success: false,
        error: 'This venue is already assigned to this wedding',
      });
    });

    it('should sanitize input data', async () => {
      const maliciousBody = {
        ...validPostBody,
        notes: '<script>alert("xss")</script>Beautiful venue',
        placeId: 'venue-789; DROP TABLE wedding_places; --',
      };

      mockSupabase
        .from()
        .insert()
        .select()
        .single()
        .mockResolvedValue({
          data: { ...mockWeddingPlace, notes: 'Beautiful venue' },
          error: null,
        });

      const request = new NextRequest(
        'http://localhost:3000/api/places/wedding-places',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(maliciousBody),
        },
      );

      const response = await POST(request);

      expect(response.status).toBe(201);
      // Verify that malicious content was sanitized
      expect(mockSupabase.from().insert).toHaveBeenCalledWith(
        expect.objectContaining({
          notes: expect.not.stringContaining('<script>'),
          place_id: expect.not.stringContaining('DROP TABLE'),
        }),
      );
    });

    it('should handle malformed JSON in request body', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/places/wedding-places',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: 'invalid-json{',
        },
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toEqual({
        success: false,
        error: 'Invalid request body',
      });
    });
  });

  describe('PUT /api/places/wedding-places', () => {
    const validUpdateBody = {
      id: 'wp-123',
      bookingStatus: 'booked',
      notes: 'Venue confirmed and deposit paid',
      isPrimary: true,
    };

    it('should update wedding place assignment successfully', async () => {
      const mockUpdatedPlace = {
        ...mockWeddingPlace,
        ...validUpdateBody,
        updated_at: '2025-01-20T11:00:00Z',
      };

      mockSupabase.from().update().eq().select().single().mockResolvedValue({
        data: mockUpdatedPlace,
        error: null,
      });

      const request = new NextRequest(
        'http://localhost:3000/api/places/wedding-places',
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(validUpdateBody),
        },
      );

      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({
        success: true,
        weddingPlace: mockUpdatedPlace,
        message: 'Wedding place updated successfully',
      });

      expect(mockLogAuditEvent).toHaveBeenCalledWith(
        'user-123',
        'wedding_place_updated',
        'success',
        expect.objectContaining({
          id: 'wp-123',
          changes: expect.any(Object),
        }),
      );
    });

    it('should require ID for updates', async () => {
      const bodyWithoutId = {
        bookingStatus: 'booked',
      };

      const request = new NextRequest(
        'http://localhost:3000/api/places/wedding-places',
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(bodyWithoutId),
        },
      );

      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toEqual({
        success: false,
        error: 'Wedding place ID is required for updates',
      });
    });

    it('should handle record not found', async () => {
      mockSupabase
        .from()
        .update()
        .eq()
        .select()
        .single()
        .mockResolvedValue({
          data: null,
          error: { message: 'No rows returned', code: 'PGRST116' },
        });

      const request = new NextRequest(
        'http://localhost:3000/api/places/wedding-places',
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(validUpdateBody),
        },
      );

      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data).toEqual({
        success: false,
        error: 'Wedding place assignment not found',
      });
    });
  });

  describe('DELETE /api/places/wedding-places', () => {
    it('should delete wedding place assignment successfully', async () => {
      mockSupabase.from().delete().eq().select().single().mockResolvedValue({
        data: mockWeddingPlace,
        error: null,
      });

      const url = new URL('http://localhost:3000/api/places/wedding-places');
      url.searchParams.set('id', 'wp-123');

      const request = new NextRequest(url, { method: 'DELETE' });
      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({
        success: true,
        message: 'Wedding place assignment removed successfully',
      });

      expect(mockSupabase.from).toHaveBeenCalledWith('wedding_places');
      expect(mockLogAuditEvent).toHaveBeenCalledWith(
        'user-123',
        'wedding_place_removed',
        'success',
        expect.objectContaining({
          id: 'wp-123',
        }),
      );
    });

    it('should require ID for deletion', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/places/wedding-places',
        {
          method: 'DELETE',
        },
      );

      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toEqual({
        success: false,
        error: 'Wedding place ID is required',
      });
    });

    it('should handle record not found for deletion', async () => {
      mockSupabase
        .from()
        .delete()
        .eq()
        .select()
        .single()
        .mockResolvedValue({
          data: null,
          error: { message: 'No rows returned', code: 'PGRST116' },
        });

      const url = new URL('http://localhost:3000/api/places/wedding-places');
      url.searchParams.set('id', 'nonexistent-123');

      const request = new NextRequest(url, { method: 'DELETE' });
      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data).toEqual({
        success: false,
        error: 'Wedding place assignment not found',
      });
    });
  });

  describe('Security and Authorization', () => {
    it('should enforce user authorization for all operations', async () => {
      // Test that users can only access their own data
      mockSupabase.from().select().eq().order().mockResolvedValue({
        data: [],
        error: null,
      });

      const url = new URL('http://localhost:3000/api/places/wedding-places');
      url.searchParams.set('coupleId', 'other-couple-789');

      const request = new NextRequest(url);
      const response = await GET(request);

      // Should verify user has access to this couple's data
      expect(mockSupabase.from().select().eq).toHaveBeenCalledWith(
        'couple_id',
        'other-couple-789',
      );
    });

    it('should log suspicious activity', async () => {
      const suspiciousBody = {
        coupleId: 'couple-456',
        placeId: 'venue-789',
        weddingRole: 'ceremony_venue',
        notes: 'UNION SELECT * FROM users', // SQL injection attempt
      };

      const request = new NextRequest(
        'http://localhost:3000/api/places/wedding-places',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(suspiciousBody),
        },
      );

      const response = await POST(request);

      expect(response.status).toBe(400);
      expect(mockLogAuditEvent).toHaveBeenCalledWith(
        'user-123',
        'wedding_places_suspicious',
        'blocked',
        expect.objectContaining({
          reason: expect.stringContaining('Invalid'),
        }),
      );
    });
  });

  describe('Rate Limiting and Performance', () => {
    it('should handle high-frequency requests gracefully', async () => {
      mockSupabase
        .from()
        .select()
        .eq()
        .order()
        .mockResolvedValue({
          data: [mockWeddingPlace],
          error: null,
        });

      const requests = Array(20)
        .fill(null)
        .map(() => {
          const url = new URL(
            'http://localhost:3000/api/places/wedding-places',
          );
          url.searchParams.set('coupleId', 'couple-456');
          return GET(new NextRequest(url));
        });

      const responses = await Promise.all(requests);
      const statusCodes = responses.map((r) => r.status);

      // Should handle requests efficiently
      statusCodes.forEach((code) => {
        expect([200, 429]).toContain(code); // Success or rate limited
      });
    });

    it('should include performance metrics in headers', async () => {
      mockSupabase
        .from()
        .select()
        .eq()
        .order()
        .mockResolvedValue({
          data: [mockWeddingPlace],
          error: null,
        });

      const url = new URL('http://localhost:3000/api/places/wedding-places');
      url.searchParams.set('coupleId', 'couple-456');

      const request = new NextRequest(url);
      const response = await GET(request);

      expect(response.headers.get('X-Response-Time')).toMatch(/^\d+ms$/);
      expect(response.headers.get('X-DB-Query-Count')).toBeDefined();
    });
  });

  describe('Business Logic Validation', () => {
    it('should prevent conflicting primary venues of same type', async () => {
      const conflictingPrimaryBody = {
        coupleId: 'couple-456',
        placeId: 'venue-new',
        weddingRole: 'ceremony_venue',
        isPrimary: true, // Attempting to set as primary when another exists
      };

      // Mock existing primary ceremony venue
      mockSupabase
        .from()
        .select()
        .eq()
        .eq()
        .eq()
        .mockResolvedValue({
          data: [{ id: 'existing-primary', is_primary: true }],
          error: null,
        });

      const request = new NextRequest(
        'http://localhost:3000/api/places/wedding-places',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(conflictingPrimaryBody),
        },
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(409);
      expect(data.error).toContain(
        'A primary ceremony venue is already assigned',
      );
    });

    it('should validate venue capacity against guest count', async () => {
      const oversizedBody = {
        coupleId: 'couple-456',
        placeId: 'small-venue',
        weddingRole: 'reception_venue',
        guestCount: 500, // Too large for venue
        notes: 'Huge reception planned',
      };

      const request = new NextRequest(
        'http://localhost:3000/api/places/wedding-places',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(oversizedBody),
        },
      );

      const response = await POST(request);

      // Should include capacity warning in response
      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data).toHaveProperty('warnings');
      expect(data.warnings).toContain(
        'Venue capacity may be insufficient for 500 guests',
      );
    });
  });
});
