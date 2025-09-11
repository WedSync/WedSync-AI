import { describe, it, expect, beforeEach, afterEach, jest, beforeAll, afterAll } from '@jest/globals';
import { createMocks } from 'node-mocks-http';
import { POST, PUT } from '@/app/api/auto-population/populate/route';
import { autoPopulationService } from '@/lib/services/auto-population-service';
import { validateAuth } from '@/lib/auth-middleware';
import { rateLimit } from '@/lib/rate-limit';

// Mock dependencies
jest.mock('@/lib/auth-middleware');
jest.mock('@/lib/rate-limit');
jest.mock('@/lib/services/auto-population-service');
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn()
        }))
      }))
    }))
  }))
}));

const mockValidateAuth = validateAuth as jest.MockedFunction<typeof validateAuth>;
const mockRateLimit = rateLimit as jest.MockedFunction<typeof rateLimit>;
const mockAutoPopulationService = autoPopulationService as jest.Mocked<typeof autoPopulationService>;

describe('/api/auto-population/populate', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Default mocks
    mockRateLimit.mockReturnValue(jest.fn().mockResolvedValue({
      success: true,
      limit: 10,
      remaining: 9,
      reset: Date.now() + 60000
    }));

    mockValidateAuth.mockResolvedValue({
      success: true,
      user: { id: 'user-123', email: 'test@example.com' }
    });
  });

  describe('POST /api/auto-population/populate', () => {
    const validRequestBody = {
      formId: '550e8400-e29b-41d4-a716-446655440000',
      clientId: '550e8400-e29b-41d4-a716-446655440001',
      formFields: [
        {
          id: 'field-1',
          name: 'bride_name',
          type: 'text' as const,
          label: 'Bride Name',
          required: true
        },
        {
          id: 'field-2',
          name: 'wedding_date',
          type: 'date' as const,
          label: 'Wedding Date',
          required: true
        }
      ]
    };

    it('should successfully populate form fields', async () => {
      // Setup mocks
      const mockProfile = { organization_id: 'org-123' };
      const mockWeddingData = { 
        id: 'wedding-123',
        couple_name_1: 'Sarah',
        wedding_date: '2024-06-15'
      };
      const mockMappings = [
        {
          form_field_id: 'field-1',
          core_field_key: 'couple_name_1',
          confidence: 0.9,
          priority: 1,
          transformation_rule: undefined
        },
        {
          form_field_id: 'field-2',
          core_field_key: 'wedding_date',
          confidence: 0.95,
          priority: 2,
          transformation_rule: 'date_iso'
        }
      ];
      const mockCoreFields = {
        couple_name_1: 'Sarah',
        wedding_date: '2024-06-15'
      };

      mockAutoPopulationService.checkVendorAccess.mockResolvedValue({
        canRead: true,
        canWrite: true,
        accessLevel: 'full'
      });
      mockAutoPopulationService.getOrCreateWeddingData.mockResolvedValue(mockWeddingData);
      mockAutoPopulationService.autoDetectMappings.mockResolvedValue(mockMappings);
      mockAutoPopulationService.getCoreFieldsForForm.mockResolvedValue(mockCoreFields);
      mockAutoPopulationService.createPopulationSession.mockResolvedValue('session-123');

      const { req, res } = createMocks({
        method: 'POST',
        body: validRequestBody,
        headers: {
          'content-type': 'application/json'
        }
      });

      await POST(req);

      const responseData = JSON.parse(res._getData());
      
      expect(responseData.success).toBe(true);
      expect(responseData.sessionId).toBe('session-123');
      expect(responseData.weddingId).toBe('wedding-123');
      expect(responseData.populatedFields).toHaveProperty('field-1');
      expect(responseData.populatedFields).toHaveProperty('field-2');
      expect(responseData.stats.fieldsDetected).toBe(2);
      expect(responseData.stats.fieldsPopulated).toBe(2);
      expect(responseData.stats.averageConfidence).toBeGreaterThan(0.9);
    });

    it('should handle rate limiting', async () => {
      const rateLimiter = jest.fn().mockResolvedValue({
        success: false,
        retryAfter: 60,
        limit: 10,
        remaining: 0,
        reset: Date.now() + 60000
      });
      mockRateLimit.mockReturnValue(rateLimiter);

      const { req, res } = createMocks({
        method: 'POST',
        body: validRequestBody
      });

      await POST(req);

      expect(res._getStatusCode()).toBe(429);
      const responseData = JSON.parse(res._getData());
      expect(responseData.success).toBe(false);
      expect(responseData.error).toContain('Too many');
    });

    it('should require authentication', async () => {
      mockValidateAuth.mockResolvedValue({
        success: false,
        user: null
      });

      const { req, res } = createMocks({
        method: 'POST',
        body: validRequestBody
      });

      await POST(req);

      expect(res._getStatusCode()).toBe(401);
      const responseData = JSON.parse(res._getData());
      expect(responseData.success).toBe(false);
      expect(responseData.error).toContain('Unauthorized');
    });

    it('should validate request schema', async () => {
      const invalidRequestBody = {
        formId: 'invalid-uuid',
        clientId: '550e8400-e29b-41d4-a716-446655440001',
        formFields: []
      };

      const { req, res } = createMocks({
        method: 'POST',
        body: invalidRequestBody
      });

      await POST(req);

      expect(res._getStatusCode()).toBe(400);
      const responseData = JSON.parse(res._getData());
      expect(responseData.success).toBe(false);
      expect(responseData.error).toContain('Invalid request data');
      expect(responseData.details).toBeDefined();
    });

    it('should handle too many form fields', async () => {
      const tooManyFields = Array(250).fill(0).map((_, i) => ({
        id: `field-${i}`,
        name: `field_${i}`,
        type: 'text' as const,
        label: `Field ${i}`,
        required: false
      }));

      const { req, res } = createMocks({
        method: 'POST',
        body: {
          ...validRequestBody,
          formFields: tooManyFields
        }
      });

      await POST(req);

      expect(res._getStatusCode()).toBe(400);
      const responseData = JSON.parse(res._getData());
      expect(responseData.success).toBe(false);
      expect(responseData.error).toContain('Too many form fields');
    });

    it('should check vendor access permissions', async () => {
      mockAutoPopulationService.checkVendorAccess.mockResolvedValue({
        canRead: false,
        canWrite: false,
        accessLevel: 'none'
      });

      const { req, res } = createMocks({
        method: 'POST',
        body: validRequestBody
      });

      await POST(req);

      expect(res._getStatusCode()).toBe(403);
      const responseData = JSON.parse(res._getData());
      expect(responseData.success).toBe(false);
      expect(responseData.error).toContain('No access to client wedding data');
    });

    it('should handle wedding data creation failure', async () => {
      mockAutoPopulationService.checkVendorAccess.mockResolvedValue({
        canRead: true,
        canWrite: true,
        accessLevel: 'full'
      });
      mockAutoPopulationService.getOrCreateWeddingData.mockResolvedValue(null);

      const { req, res } = createMocks({
        method: 'POST',
        body: validRequestBody
      });

      await POST(req);

      expect(res._getStatusCode()).toBe(500);
      const responseData = JSON.parse(res._getData());
      expect(responseData.success).toBe(false);
      expect(responseData.error).toContain('Could not access wedding data');
    });

    it('should apply population preferences', async () => {
      const requestWithPreferences = {
        ...validRequestBody,
        populationPreferences: {
          onlyRequiredFields: true,
          skipConfidentialFields: true,
          minimumConfidence: 0.8
        }
      };

      const mockMappings = [
        {
          form_field_id: 'field-1',
          core_field_key: 'couple_name_1',
          confidence: 0.7, // Below minimum
          priority: 1
        },
        {
          form_field_id: 'field-2',
          core_field_key: 'wedding_date',
          confidence: 0.9, // Above minimum
          priority: 2
        }
      ];

      mockAutoPopulationService.checkVendorAccess.mockResolvedValue({
        canRead: true,
        canWrite: true,
        accessLevel: 'full'
      });
      mockAutoPopulationService.getOrCreateWeddingData.mockResolvedValue({ 
        id: 'wedding-123',
        couple_name_1: 'Sarah',
        wedding_date: '2024-06-15'
      });
      mockAutoPopulationService.autoDetectMappings.mockResolvedValue(mockMappings);
      mockAutoPopulationService.getCoreFieldsForForm.mockResolvedValue({
        wedding_date: '2024-06-15'
      });
      mockAutoPopulationService.createPopulationSession.mockResolvedValue('session-123');

      const { req, res } = createMocks({
        method: 'POST',
        body: requestWithPreferences
      });

      await POST(req);

      const responseData = JSON.parse(res._getData());
      
      expect(responseData.success).toBe(true);
      expect(responseData.stats.fieldsDetected).toBe(2);
      expect(responseData.stats.fieldsPopulated).toBe(1); // Only field-2 meets confidence threshold
    });

    it('should measure and log performance', async () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      // Mock slow processing
      mockAutoPopulationService.autoDetectMappings.mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 100)); // Simulate delay
        return [];
      });

      mockAutoPopulationService.checkVendorAccess.mockResolvedValue({
        canRead: true,
        canWrite: true,
        accessLevel: 'full'
      });
      mockAutoPopulationService.getOrCreateWeddingData.mockResolvedValue({ 
        id: 'wedding-123'
      });
      mockAutoPopulationService.getCoreFieldsForForm.mockResolvedValue({});
      mockAutoPopulationService.createPopulationSession.mockResolvedValue('session-123');

      const { req, res } = createMocks({
        method: 'POST',
        body: validRequestBody
      });

      await POST(req);

      const responseData = JSON.parse(res._getData());
      expect(responseData.success).toBe(true);
      expect(responseData.stats.processingTimeMs).toBeGreaterThan(50);

      consoleSpy.mockRestore();
    });
  });

  describe('PUT /api/auto-population/populate', () => {
    const validUpdateBody = {
      weddingId: '550e8400-e29b-41d4-a716-446655440000',
      updates: {
        couple_name_1: 'Sarah Updated',
        wedding_date: '2024-07-15'
      },
      source: 'form_submission' as const
    };

    it('should successfully update wedding data', async () => {
      mockAutoPopulationService.checkVendorAccess.mockResolvedValue({
        canRead: true,
        canWrite: true,
        accessLevel: 'full'
      });
      mockAutoPopulationService.updateCoreFields.mockResolvedValue(true);

      const { req, res } = createMocks({
        method: 'PUT',
        body: validUpdateBody
      });

      await PUT(req);

      expect(res._getStatusCode()).toBe(200);
      const responseData = JSON.parse(res._getData());
      expect(responseData.success).toBe(true);
      expect(responseData.message).toContain('updated successfully');
    });

    it('should validate update data schema', async () => {
      const invalidUpdateBody = {
        weddingId: 'invalid-uuid',
        updates: {},
        source: 'invalid_source'
      };

      const { req, res } = createMocks({
        method: 'PUT',
        body: invalidUpdateBody
      });

      await PUT(req);

      expect(res._getStatusCode()).toBe(400);
      const responseData = JSON.parse(res._getData());
      expect(responseData.success).toBe(false);
      expect(responseData.error).toContain('Invalid update data');
    });

    it('should check write permissions', async () => {
      mockAutoPopulationService.checkVendorAccess.mockResolvedValue({
        canRead: true,
        canWrite: false,
        accessLevel: 'read'
      });

      const { req, res } = createMocks({
        method: 'PUT',
        body: validUpdateBody
      });

      await PUT(req);

      expect(res._getStatusCode()).toBe(403);
      const responseData = JSON.parse(res._getData());
      expect(responseData.success).toBe(false);
      expect(responseData.error).toContain('No write access');
    });

    it('should handle update failure', async () => {
      mockAutoPopulationService.checkVendorAccess.mockResolvedValue({
        canRead: true,
        canWrite: true,
        accessLevel: 'full'
      });
      mockAutoPopulationService.updateCoreFields.mockResolvedValue(false);

      const { req, res } = createMocks({
        method: 'PUT',
        body: validUpdateBody
      });

      await PUT(req);

      expect(res._getStatusCode()).toBe(500);
      const responseData = JSON.parse(res._getData());
      expect(responseData.success).toBe(false);
      expect(responseData.error).toContain('Failed to update');
    });

    it('should sanitize string inputs', async () => {
      const updateWithScripts = {
        weddingId: '550e8400-e29b-41d4-a716-446655440000',
        updates: {
          couple_name_1: '<script>alert("xss")</script>Sarah',
          venue_name: 'Beautiful javascript:void(0) Venue'
        }
      };

      mockAutoPopulationService.checkVendorAccess.mockResolvedValue({
        canRead: true,
        canWrite: true,
        accessLevel: 'full'
      });
      mockAutoPopulationService.updateCoreFields.mockImplementation(async (weddingId, updates) => {
        // Check that dangerous content was sanitized
        expect(updates.couple_name_1).not.toContain('<script>');
        expect(updates.venue_name).not.toContain('javascript:');
        return true;
      });

      const { req, res } = createMocks({
        method: 'PUT',
        body: updateWithScripts
      });

      await PUT(req);

      expect(res._getStatusCode()).toBe(200);
      expect(mockAutoPopulationService.updateCoreFields).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          couple_name_1: expect.not.stringContaining('<script>'),
          venue_name: expect.not.stringContaining('javascript:')
        }),
        expect.any(String)
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle service unavailable errors gracefully', async () => {
      mockAutoPopulationService.checkVendorAccess.mockRejectedValue(
        new Error('Database connection failed')
      );

      const { req, res } = createMocks({
        method: 'POST',
        body: {
          formId: '550e8400-e29b-41d4-a716-446655440000',
          clientId: '550e8400-e29b-41d4-a716-446655440001',
          formFields: []
        }
      });

      await POST(req);

      expect(res._getStatusCode()).toBe(500);
      const responseData = JSON.parse(res._getData());
      expect(responseData.success).toBe(false);
      expect(responseData.error).not.toContain('Database connection failed'); // Should not leak internal errors
    });

    it('should handle JSON parsing errors', async () => {
      const { req, res } = createMocks({
        method: 'POST',
        body: 'invalid json'
      });

      await POST(req);

      expect(res._getStatusCode()).toBe(500);
      const responseData = JSON.parse(res._getData());
      expect(responseData.success).toBe(false);
    });
  });

  describe('Performance Tests', () => {
    it('should complete population within 3 seconds for 50 fields', async () => {
      const startTime = Date.now();
      
      const largeFormFields = Array(50).fill(0).map((_, i) => ({
        id: `field-${i}`,
        name: `field_${i}`,
        type: 'text' as const,
        label: `Field ${i}`,
        required: false
      }));

      mockAutoPopulationService.checkVendorAccess.mockResolvedValue({
        canRead: true,
        canWrite: true,
        accessLevel: 'full'
      });
      mockAutoPopulationService.getOrCreateWeddingData.mockResolvedValue({ 
        id: 'wedding-123'
      });
      mockAutoPopulationService.autoDetectMappings.mockResolvedValue([]);
      mockAutoPopulationService.getCoreFieldsForForm.mockResolvedValue({});
      mockAutoPopulationService.createPopulationSession.mockResolvedValue('session-123');

      const { req, res } = createMocks({
        method: 'POST',
        body: {
          formId: '550e8400-e29b-41d4-a716-446655440000',
          clientId: '550e8400-e29b-41d4-a716-446655440001',
          formFields: largeFormFields
        }
      });

      await POST(req);

      const endTime = Date.now();
      const processingTime = endTime - startTime;

      expect(processingTime).toBeLessThan(3000); // Should complete in <3 seconds
      expect(res._getStatusCode()).toBe(200);
      
      const responseData = JSON.parse(res._getData());
      expect(responseData.success).toBe(true);
      expect(responseData.stats.processingTimeMs).toBeLessThan(3000);
    });
  });

  describe('Security Tests', () => {
    it('should prevent SQL injection in form field names', async () => {
      const maliciousFields = [
        {
          id: "'; DROP TABLE wedding_core_data; --",
          name: "'; DROP TABLE wedding_core_data; --",
          type: 'text' as const,
          label: 'Malicious Field',
          required: false
        }
      ];

      const { req, res } = createMocks({
        method: 'POST',
        body: {
          formId: '550e8400-e29b-41d4-a716-446655440000',
          clientId: '550e8400-e29b-41d4-a716-446655440001',
          formFields: maliciousFields
        }
      });

      await POST(req);

      // Should either validate and reject, or handle safely
      const statusCode = res._getStatusCode();
      expect([400, 500].includes(statusCode)).toBe(true);
    });

    it('should validate all UUID parameters', async () => {
      const { req, res } = createMocks({
        method: 'POST',
        body: {
          formId: '../../../etc/passwd',
          clientId: 'SELECT * FROM users',
          formFields: []
        }
      });

      await POST(req);

      expect(res._getStatusCode()).toBe(400);
      const responseData = JSON.parse(res._getData());
      expect(responseData.success).toBe(false);
      expect(responseData.details).toBeDefined();
    });
  });
});