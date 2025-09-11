import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';
import {
  GDPRMiddleware,
  createGDPRMiddleware,
  withGDPRCompliance,
  type GDPRMiddlewareConfig,
  type PrivacyContext
} from '../../../src/middleware/gdpr/gdpr-middleware';

// Mock Next.js Request and Response
const mockRequest = (config: {
  method?: string;
  url?: string;
  headers?: Record<string, string>;
  cookies?: Record<string, string>;
  body?: any;
}) => {
  const headers = new Headers(config.headers || {});
  const cookies = new Map(Object.entries(config.cookies || {}));
  
  const request = {
    method: config.method || 'GET',
    nextUrl: { pathname: config.url || '/' },
    headers,
    cookies: {
      get: (name: string) => cookies.has(name) ? { value: cookies.get(name) } : undefined
    },
    clone: () => ({
      json: vi.fn().mockResolvedValue(config.body || {})
    }),
    json: vi.fn().mockResolvedValue(config.body || {})
  } as unknown as NextRequest;

  return request;
};

// Mock Supabase
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    from: vi.fn(() => ({
      insert: vi.fn().mockResolvedValue({ data: null, error: null }),
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          order: vi.fn(() => ({
            limit: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({ data: null })
            }))
          }))
        }))
      }))
    }))
  }))
}));

// Mock the integration modules
vi.mock('../../../src/lib/integrations/gdpr/workflow-privacy', () => ({
  workflowPrivacyManager: {
    validatePrivacyCompliance: vi.fn().mockResolvedValue({
      compliant: true,
      violations: [],
      requiresConsent: false
    })
  }
}));

vi.mock('../../../src/lib/integrations/gdpr/consent-automation', () => ({
  consentAutomationManager: {
    automateConsentCollection: vi.fn().mockResolvedValue({
      shouldPromptUser: false,
      requiredPrompts: [],
      suggestedPrompts: [],
      autoGrantedConsents: []
    })
  }
}));

vi.mock('../../../src/lib/integrations/gdpr/privacy-impact-tracker', () => ({
  privacyImpactTracker: {
    trackOperation: vi.fn().mockResolvedValue({
      level: 'low',
      score: 2,
      description: 'Low privacy impact',
      requiresAssessment: false
    })
  }
}));

describe('GDPRMiddleware', () => {
  let middleware: GDPRMiddleware;

  beforeEach(() => {
    vi.clearAllMocks();
    middleware = new GDPRMiddleware();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Configuration', () => {
    it('should initialize with default configuration', () => {
      const defaultMiddleware = new GDPRMiddleware();
      expect(defaultMiddleware['config'].enableAutoConsent).toBe(true);
      expect(defaultMiddleware['config'].enableImpactTracking).toBe(true);
      expect(defaultMiddleware['config'].exemptPaths).toContain('/api/health');
    });

    it('should accept custom configuration', () => {
      const customConfig: Partial<GDPRMiddlewareConfig> = {
        enableAutoConsent: false,
        exemptPaths: ['/api/public'],
        logAllOperations: false
      };

      const customMiddleware = new GDPRMiddleware(customConfig);
      expect(customMiddleware['config'].enableAutoConsent).toBe(false);
      expect(customMiddleware['config'].exemptPaths).toContain('/api/public');
      expect(customMiddleware['config'].logAllOperations).toBe(false);
    });

    it('should validate configuration schema', () => {
      expect(() => {
        new GDPRMiddleware({
          enableAutoConsent: 'invalid' as any,
          exemptPaths: 'not an array' as any
        });
      }).toThrow();
    });
  });

  describe('handle', () => {
    it('should skip exempt paths', async () => {
      const request = mockRequest({
        method: 'GET',
        url: '/api/health'
      });

      const result = await middleware.handle(request);
      expect(result).toBeNull();
    });

    it('should process non-exempt paths', async () => {
      const request = mockRequest({
        method: 'GET',
        url: '/api/wedding/guests',
        headers: {
          'x-session-id': 'session123'
        }
      });

      const result = await middleware.handle(request);
      expect(result).toBeNull(); // Should continue to next middleware
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('gdpr_operations_log');
    });

    it('should handle POST requests with data processing checks', async () => {
      const request = mockRequest({
        method: 'POST',
        url: '/api/wedding/guests',
        body: { email: 'test@example.com', name: 'Test User' },
        headers: {
          'x-session-id': 'session123'
        }
      });

      mockSupabaseClient.from().select().eq().order().limit().single.mockResolvedValue({
        data: null
      });

      const result = await middleware.handle(request);
      
      // Should return consent required response for personal data without consent
      expect(result).toBeInstanceOf(NextResponse);
      if (result) {
        expect(result.status).toBe(403);
      }
    });

    it('should allow processing with valid consent', async () => {
      const request = mockRequest({
        method: 'POST',
        url: '/api/wedding/guests',
        body: { email: 'test@example.com', name: 'Test User' },
        headers: {
          'authorization': 'Bearer valid-token',
          'x-session-id': 'session123'
        }
      });

      // Mock valid consent
      mockSupabaseClient.from().select().eq().order().limit().single.mockResolvedValue({
        data: {
          consent_type: 'essential',
          granted: true,
          expiry_date: new Date(Date.now() + 86400000).toISOString()
        }
      });

      const result = await middleware.handle(request);
      expect(result).toBeNull(); // Should continue
    });

    it('should handle middleware errors gracefully', async () => {
      const request = mockRequest({
        method: 'GET',
        url: '/api/wedding/data'
      });

      // Force an error in processing
      mockSupabaseClient.from.mockImplementation(() => {
        throw new Error('Database connection failed');
      });

      const result = await middleware.handle(request);
      expect(result).toBeInstanceOf(NextResponse);
      if (result) {
        expect(result.status).toBe(500);
      }
    });
  });

  describe('validateDataProcessing', () => {
    it('should require authentication for data processing', async () => {
      const request = mockRequest({
        method: 'POST',
        url: '/api/data/process'
      });

      const result = await middleware.validateDataProcessing(
        request,
        { email: 'test@example.com' },
        'wedding_planning'
      );

      expect(result.allowed).toBe(false);
      expect(result.consentRequired).toContain('authentication');
      expect(result.response?.status).toBe(401);
    });

    it('should check consent automation when enabled', async () => {
      const { consentAutomationManager } = require('../../../src/lib/integrations/gdpr/consent-automation');
      
      consentAutomationManager.automateConsentCollection.mockResolvedValue({
        shouldPromptUser: true,
        requiredPrompts: [{
          id: 'consent-1',
          consentType: 'marketing',
          displayText: 'Allow marketing emails?'
        }],
        suggestedPrompts: [],
        autoGrantedConsents: []
      });

      const request = mockRequest({
        method: 'POST',
        url: '/api/marketing/subscribe',
        headers: {
          'authorization': 'Bearer user-token'
        }
      });

      // Mock authenticated user
      vi.spyOn(middleware as any, 'extractUserIdFromAuth').mockResolvedValue('user123');

      const result = await middleware.validateDataProcessing(
        request,
        { email: 'test@example.com' },
        'marketing'
      );

      expect(result.allowed).toBe(false);
      expect(result.consentRequired).toContain('marketing');
      expect(result.response?.status).toBe(403);
    });

    it('should allow processing with valid consent', async () => {
      const { consentAutomationManager } = require('../../../src/lib/integrations/gdpr/consent-automation');
      
      consentAutomationManager.automateConsentCollection.mockResolvedValue({
        shouldPromptUser: false,
        requiredPrompts: [],
        suggestedPrompts: [],
        autoGrantedConsents: []
      });

      const request = mockRequest({
        method: 'POST',
        url: '/api/wedding/guests',
        headers: {
          'authorization': 'Bearer user-token'
        }
      });

      vi.spyOn(middleware as any, 'extractUserIdFromAuth').mockResolvedValue('user123');

      const result = await middleware.validateDataProcessing(
        request,
        { name: 'Guest Name' },
        'wedding_planning'
      );

      expect(result.allowed).toBe(true);
      expect(result.consentRequired).toHaveLength(0);
    });
  });

  describe('enforceDataMinimization', () => {
    it('should remove unnecessary fields for wedding planning', async () => {
      const originalData = {
        name: 'John Doe',
        email: 'john@example.com',
        phone: '+1234567890',
        wedding_date: '2024-06-15',
        venue: 'Grand Hotel',
        ssn: '123-45-6789', // Should be removed
        credit_score: 750, // Should be removed
        medical_info: 'allergies' // Should be removed
      };

      const mockContext: PrivacyContext = {
        userId: 'user123',
        sessionId: 'session123',
        path: '/api/wedding/guests',
        method: 'POST',
        hasValidConsent: true,
        consentTypes: ['essential']
      };

      const result = await middleware.enforceDataMinimization(
        originalData,
        'wedding_planning',
        mockContext
      );

      expect(result.minimizedData).toHaveProperty('name');
      expect(result.minimizedData).toHaveProperty('email');
      expect(result.minimizedData).toHaveProperty('wedding_date');
      expect(result.minimizedData).not.toHaveProperty('ssn');
      expect(result.minimizedData).not.toHaveProperty('credit_score');
      expect(result.minimizedData).not.toHaveProperty('medical_info');

      expect(result.removedFields).toContain('ssn');
      expect(result.removedFields).toContain('credit_score');
      expect(result.removedFields).toContain('medical_info');

      expect(result.justification['ssn']).toContain('Not required for wedding_planning');
    });

    it('should preserve different fields for different purposes', async () => {
      const data = {
        name: 'John Doe',
        email: 'john@example.com',
        preferences: 'vegetarian',
        photo_permissions: true
      };

      const mockContext: PrivacyContext = {
        userId: 'user123',
        sessionId: 'session123',
        path: '/api/photos',
        method: 'POST',
        hasValidConsent: true,
        consentTypes: ['functional']
      };

      const result = await middleware.enforceDataMinimization(
        data,
        'photo_sharing',
        mockContext
      );

      expect(result.minimizedData).toHaveProperty('name');
      expect(result.minimizedData).toHaveProperty('email');
      expect(result.minimizedData).toHaveProperty('photo_permissions');
      expect(result.minimizedData).not.toHaveProperty('preferences');
    });

    it('should log data minimization actions', async () => {
      const data = { name: 'Test', unnecessary_field: 'value' };
      const mockContext: PrivacyContext = {
        userId: 'user123',
        sessionId: 'session123',
        path: '/api/test',
        method: 'POST',
        hasValidConsent: true,
        consentTypes: []
      };

      await middleware.enforceDataMinimization(data, 'marketing', mockContext);

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('gdpr_operations_log');
      expect(mockSupabaseClient.from().insert).toHaveBeenCalledWith(
        expect.objectContaining({
          operation: 'data_minimization',
          user_id: 'user123'
        })
      );
    });
  });

  describe('handleDataSubjectRights', () => {
    beforeEach(() => {
      vi.spyOn(middleware as any, 'collectUserData').mockResolvedValue({ userData: 'mock' });
      vi.spyOn(middleware as any, 'applyDataCorrections').mockResolvedValue(undefined);
      vi.spyOn(middleware as any, 'performDataErasure').mockResolvedValue(undefined);
      vi.spyOn(middleware as any, 'generatePortableData').mockResolvedValue({ export: 'data' });
      vi.spyOn(middleware as any, 'applyProcessingRestrictions').mockResolvedValue(undefined);
    });

    it('should require authentication for data subject rights', async () => {
      const request = mockRequest({
        method: 'GET',
        url: '/api/gdpr/access'
      });

      const response = await middleware.handleDataSubjectRights(request, 'access');

      expect(response.status).toBe(401);
    });

    it('should handle data access requests', async () => {
      const request = mockRequest({
        method: 'GET',
        url: '/api/gdpr/access',
        headers: {
          'authorization': 'Bearer user-token'
        }
      });

      vi.spyOn(middleware as any, 'extractUserIdFromAuth').mockResolvedValue('user123');

      const response = await middleware.handleDataSubjectRights(request, 'access');

      expect(response.status).toBe(200);
      const responseData = await response.json();
      expect(responseData).toHaveProperty('message', 'Data access request processed');
      expect(responseData).toHaveProperty('data');
    });

    it('should handle data rectification requests', async () => {
      const request = mockRequest({
        method: 'POST',
        url: '/api/gdpr/rectify',
        body: { corrections: { name: 'New Name' } },
        headers: {
          'authorization': 'Bearer user-token'
        }
      });

      vi.spyOn(middleware as any, 'extractUserIdFromAuth').mockResolvedValue('user123');

      const response = await middleware.handleDataSubjectRights(request, 'rectification');

      expect(response.status).toBe(200);
      const responseData = await response.json();
      expect(responseData.message).toBe('Data rectification completed');
    });

    it('should handle data erasure requests', async () => {
      const request = mockRequest({
        method: 'DELETE',
        url: '/api/gdpr/erase',
        headers: {
          'authorization': 'Bearer user-token'
        }
      });

      vi.spyOn(middleware as any, 'extractUserIdFromAuth').mockResolvedValue('user123');

      const response = await middleware.handleDataSubjectRights(request, 'erasure');

      expect(response.status).toBe(200);
      const responseData = await response.json();
      expect(responseData.message).toBe('Data erasure request processed');
    });

    it('should handle data portability requests', async () => {
      const request = mockRequest({
        method: 'GET',
        url: '/api/gdpr/portability',
        headers: {
          'authorization': 'Bearer user-token'
        }
      });

      vi.spyOn(middleware as any, 'extractUserIdFromAuth').mockResolvedValue('user123');

      const response = await middleware.handleDataSubjectRights(request, 'portability');

      expect(response.status).toBe(200);
      const responseData = await response.json();
      expect(responseData).toHaveProperty('message', 'Data portability export ready');
      expect(responseData).toHaveProperty('data');
    });

    it('should handle processing restriction requests', async () => {
      const request = mockRequest({
        method: 'POST',
        url: '/api/gdpr/restrict',
        body: { restrictions: ['marketing'] },
        headers: {
          'authorization': 'Bearer user-token'
        }
      });

      vi.spyOn(middleware as any, 'extractUserIdFromAuth').mockResolvedValue('user123');

      const response = await middleware.handleDataSubjectRights(request, 'restriction');

      expect(response.status).toBe(200);
      const responseData = await response.json();
      expect(responseData.message).toBe('Processing restrictions applied');
    });

    it('should handle invalid right types', async () => {
      const request = mockRequest({
        method: 'GET',
        url: '/api/gdpr/invalid',
        headers: {
          'authorization': 'Bearer user-token'
        }
      });

      vi.spyOn(middleware as any, 'extractUserIdFromAuth').mockResolvedValue('user123');

      const response = await middleware.handleDataSubjectRights(request, 'invalid' as any);

      expect(response.status).toBe(400);
    });

    it('should handle errors in data subject rights processing', async () => {
      const request = mockRequest({
        method: 'GET',
        url: '/api/gdpr/access',
        headers: {
          'authorization': 'Bearer user-token'
        }
      });

      vi.spyOn(middleware as any, 'extractUserIdFromAuth').mockResolvedValue('user123');
      vi.spyOn(middleware as any, 'collectUserData').mockRejectedValue(new Error('Data collection failed'));

      const response = await middleware.handleDataSubjectRights(request, 'access');

      expect(response.status).toBe(500);
      expect(mockSupabaseClient.from().insert).toHaveBeenCalledWith(
        expect.objectContaining({
          operation: 'data_subject_right_error'
        })
      );
    });
  });

  describe('Private helper methods', () => {
    describe('createPrivacyContext', () => {
      it('should create privacy context from request', async () => {
        const request = mockRequest({
          method: 'POST',
          url: '/api/wedding/guests',
          headers: {
            'x-session-id': 'session123',
            'authorization': 'Bearer user-token',
            'user-agent': 'Mozilla/5.0',
            'x-forwarded-for': '192.168.1.1'
          },
          cookies: {
            'session': 'cookie-session-123'
          }
        });

        vi.spyOn(middleware as any, 'extractUserIdFromAuth').mockResolvedValue('user123');
        
        // Mock valid consent
        mockSupabaseClient.from().select().eq().eq.mockResolvedValue({
          data: [{
            consent_type: 'essential',
            granted: true,
            expiry_date: new Date(Date.now() + 86400000).toISOString()
          }]
        });

        const context = await middleware['createPrivacyContext'](request);

        expect(context.userId).toBe('user123');
        expect(context.sessionId).toBe('session123');
        expect(context.ipAddress).toBe('192.168.1.1');
        expect(context.userAgent).toBe('Mozilla/5.0');
        expect(context.path).toBe('/api/wedding/guests');
        expect(context.method).toBe('POST');
        expect(context.hasValidConsent).toBe(true);
        expect(context.consentTypes).toContain('essential');
      });

      it('should handle missing authentication gracefully', async () => {
        const request = mockRequest({
          method: 'GET',
          url: '/api/public'
        });

        vi.spyOn(middleware as any, 'extractUserIdFromAuth').mockResolvedValue(undefined);

        const context = await middleware['createPrivacyContext'](request);

        expect(context.userId).toBeUndefined();
        expect(context.hasValidConsent).toBe(false);
        expect(context.consentTypes).toHaveLength(0);
      });

      it('should generate session ID when not provided', async () => {
        const request = mockRequest({
          method: 'GET',
          url: '/api/test'
        });

        const context = await middleware['createPrivacyContext'](request);

        expect(context.sessionId).toBeDefined();
        expect(context.sessionId.length).toBeGreaterThan(0);
      });
    });

    describe('detectPersonalData', () => {
      it('should detect personal data indicators', () => {
        const dataWithPersonalInfo = {
          email: 'user@example.com',
          phone: '+1234567890',
          name: 'John Doe',
          id: '123'
        };

        const hasPersonalData = middleware['detectPersonalData'](dataWithPersonalInfo);
        expect(hasPersonalData).toBe(true);
      });

      it('should return false for non-personal data', () => {
        const nonPersonalData = {
          id: '123',
          timestamp: '2024-01-01',
          category: 'general'
        };

        const hasPersonalData = middleware['detectPersonalData'](nonPersonalData);
        expect(hasPersonalData).toBe(false);
      });
    });

    describe('containsSpecialCategoryData', () => {
      it('should detect special category data', () => {
        const specialCategoryData = {
          health_info: 'diabetes',
          religious_preference: 'christian',
          political_view: 'independent'
        };

        const hasSpecialData = middleware['containsSpecialCategoryData'](specialCategoryData);
        expect(hasSpecialData).toBe(true);
      });

      it('should return false for regular data', () => {
        const regularData = {
          name: 'John Doe',
          email: 'john@example.com'
        };

        const hasSpecialData = middleware['containsSpecialCategoryData'](regularData);
        expect(hasSpecialData).toBe(false);
      });
    });

    describe('isExemptPath', () => {
      it('should identify exempt paths correctly', () => {
        expect(middleware['isExemptPath']('/api/health')).toBe(true);
        expect(middleware['isExemptPath']('/api/auth/login')).toBe(true);
        expect(middleware['isExemptPath']('/api/wedding/guests')).toBe(false);
      });
    });

    describe('getClientIP', () => {
      it('should extract IP from x-forwarded-for header', () => {
        const request = mockRequest({
          headers: {
            'x-forwarded-for': '192.168.1.1, 10.0.0.1'
          }
        });

        const ip = middleware['getClientIP'](request);
        expect(ip).toBe('192.168.1.1');
      });

      it('should extract IP from x-real-ip header', () => {
        const request = mockRequest({
          headers: {
            'x-real-ip': '192.168.1.1'
          }
        });

        const ip = middleware['getClientIP'](request);
        expect(ip).toBe('192.168.1.1');
      });

      it('should return undefined when no IP headers present', () => {
        const request = mockRequest({});

        const ip = middleware['getClientIP'](request);
        expect(ip).toBeUndefined();
      });
    });
  });
});

describe('createGDPRMiddleware Factory Function', () => {
  it('should create middleware with default config', () => {
    const middleware = createGDPRMiddleware();
    expect(typeof middleware).toBe('function');
  });

  it('should create middleware with custom config', () => {
    const customConfig = {
      enableAutoConsent: false,
      exemptPaths: ['/custom/exempt']
    };

    const middleware = createGDPRMiddleware(customConfig);
    expect(typeof middleware).toBe('function');
  });

  it('should handle requests through created middleware', async () => {
    const middleware = createGDPRMiddleware();
    const request = mockRequest({
      url: '/api/health' // exempt path
    });

    const result = await middleware(request);
    expect(result).toBeNull();
  });
});

describe('withGDPRCompliance Higher-Order Function', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should wrap handler with GDPR compliance checks', async () => {
    const mockHandler = vi.fn().mockResolvedValue(NextResponse.json({ success: true }));
    const wrappedHandler = withGDPRCompliance(mockHandler, {
      processingPurpose: 'wedding_planning',
      requireExplicitConsent: true
    });

    const request = mockRequest({
      method: 'GET',
      url: '/api/wedding/data'
    });

    const result = await wrappedHandler(request);
    expect(mockHandler).toHaveBeenCalledWith(request);
    expect(result).toEqual(expect.any(NextResponse));
  });

  it('should block processing when validation fails', async () => {
    const mockHandler = vi.fn();
    const wrappedHandler = withGDPRCompliance(mockHandler, {
      processingPurpose: 'marketing',
      requireExplicitConsent: true
    });

    const request = mockRequest({
      method: 'POST',
      url: '/api/marketing/subscribe',
      body: { email: 'test@example.com' }
    });

    // Mock validation failure
    const mockValidation = {
      allowed: false,
      consentRequired: ['marketing'],
      privacyNotices: ['Marketing consent required'],
      response: NextResponse.json({ error: 'Consent required' }, { status: 403 })
    };

    const mockMiddleware = {
      validateDataProcessing: vi.fn().mockResolvedValue(mockValidation)
    };

    // Replace the middleware instance
    vi.spyOn(GDPRMiddleware.prototype, 'validateDataProcessing').mockResolvedValue(mockValidation);

    const result = await wrappedHandler(request);
    expect(mockHandler).not.toHaveBeenCalled();
    expect(result).toBeInstanceOf(NextResponse);
  });

  it('should handle JSON parsing errors gracefully', async () => {
    const mockHandler = vi.fn().mockResolvedValue(NextResponse.json({ success: true }));
    const wrappedHandler = withGDPRCompliance(mockHandler, {
      processingPurpose: 'wedding_planning'
    });

    const request = mockRequest({
      method: 'POST',
      url: '/api/wedding/data'
    });

    // Mock JSON parsing error
    request.clone = vi.fn().mockReturnValue({
      json: vi.fn().mockRejectedValue(new Error('Invalid JSON'))
    });

    const result = await wrappedHandler(request);
    expect(mockHandler).toHaveBeenCalled();
    expect(result).toEqual(expect.any(NextResponse));
  });

  it('should skip validation for GET requests', async () => {
    const mockHandler = vi.fn().mockResolvedValue(NextResponse.json({ data: 'test' }));
    const wrappedHandler = withGDPRCompliance(mockHandler, {
      processingPurpose: 'data_access'
    });

    const request = mockRequest({
      method: 'GET',
      url: '/api/data'
    });

    const result = await wrappedHandler(request);
    expect(mockHandler).toHaveBeenCalledWith(request);
    expect(result).toEqual(expect.any(NextResponse));
  });
});

describe('Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should handle complete GDPR workflow', async () => {
    const middleware = new GDPRMiddleware({
      enableAutoConsent: true,
      enableImpactTracking: true,
      enableDataMinimization: true,
      logAllOperations: true
    });

    // Step 1: Process initial request
    const request = mockRequest({
      method: 'POST',
      url: '/api/wedding/guests',
      body: {
        guest_email: 'guest@example.com',
        guest_name: 'John Doe',
        guest_phone: '+1234567890',
        unnecessary_field: 'should be removed'
      },
      headers: {
        'authorization': 'Bearer user-token',
        'x-session-id': 'session123'
      }
    });

    vi.spyOn(middleware as any, 'extractUserIdFromAuth').mockResolvedValue('user123');

    // Mock consent automation
    const { consentAutomationManager } = require('../../../src/lib/integrations/gdpr/consent-automation');
    consentAutomationManager.automateConsentCollection.mockResolvedValue({
      shouldPromptUser: false,
      requiredPrompts: [],
      suggestedPrompts: [],
      autoGrantedConsents: [{
        userId: 'user123',
        consentType: 'essential',
        granted: true,
        timestamp: new Date()
      }]
    });

    // Step 2: Validate data processing
    const validation = await middleware.validateDataProcessing(
      request,
      await request.clone().json(),
      'wedding_planning'
    );

    expect(validation.allowed).toBe(true);

    // Step 3: Enforce data minimization
    const mockContext: PrivacyContext = {
      userId: 'user123',
      sessionId: 'session123',
      path: '/api/wedding/guests',
      method: 'POST',
      hasValidConsent: true,
      consentTypes: ['essential']
    };

    const minimization = await middleware.enforceDataMinimization(
      await request.clone().json(),
      'wedding_planning',
      mockContext
    );

    expect(minimization.minimizedData).not.toHaveProperty('unnecessary_field');
    expect(minimization.removedFields).toContain('unnecessary_field');

    // Step 4: Handle the request through middleware
    const result = await middleware.handle(request);
    
    // Should continue processing (return null)
    expect(result).toBeNull();
  });

  it('should handle data subject rights workflow', async () => {
    const middleware = new GDPRMiddleware();

    vi.spyOn(middleware as any, 'extractUserIdFromAuth').mockResolvedValue('user123');
    vi.spyOn(middleware as any, 'collectUserData').mockResolvedValue({
      personalData: { name: 'John Doe', email: 'john@example.com' },
      processingActivities: [],
      consentHistory: []
    });

    // Step 1: Data access request
    const accessRequest = mockRequest({
      method: 'GET',
      url: '/api/gdpr/access',
      headers: {
        'authorization': 'Bearer user-token'
      }
    });

    const accessResponse = await middleware.handleDataSubjectRights(accessRequest, 'access');
    expect(accessResponse.status).toBe(200);

    // Step 2: Data rectification request
    const rectifyRequest = mockRequest({
      method: 'POST',
      url: '/api/gdpr/rectify',
      body: { corrections: { name: 'Jane Doe' } },
      headers: {
        'authorization': 'Bearer user-token'
      }
    });

    vi.spyOn(middleware as any, 'applyDataCorrections').mockResolvedValue(undefined);

    const rectifyResponse = await middleware.handleDataSubjectRights(rectifyRequest, 'rectification');
    expect(rectifyResponse.status).toBe(200);

    // Step 3: Data erasure request
    const erasureRequest = mockRequest({
      method: 'DELETE',
      url: '/api/gdpr/erase',
      headers: {
        'authorization': 'Bearer user-token'
      }
    });

    vi.spyOn(middleware as any, 'performDataErasure').mockResolvedValue(undefined);

    const erasureResponse = await middleware.handleDataSubjectRights(erasureRequest, 'erasure');
    expect(erasureResponse.status).toBe(200);

    // Verify all operations were logged
    expect(mockSupabaseClient.from().insert).toHaveBeenCalledTimes(3);
  });

  it('should handle concurrent requests safely', async () => {
    const middleware = new GDPRMiddleware();

    const requests = Array.from({ length: 5 }, (_, i) => 
      mockRequest({
        method: 'POST',
        url: `/api/wedding/guests${i}`,
        body: { name: `Guest ${i}` },
        headers: {
          'x-session-id': `session${i}`
        }
      })
    );

    const promises = requests.map(request => middleware.handle(request));
    const results = await Promise.all(promises);

    // All should either continue (null) or return consent required (NextResponse)
    results.forEach(result => {
      expect(result === null || result instanceof NextResponse).toBe(true);
    });
  });
});