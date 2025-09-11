/**
 * WS-177 Supabase Mock Helpers for Security Testing
 * Team D Round 1 Implementation - Ultra Hard Testing Standards
 * 
 * Mock implementations for Supabase client and authentication
 * Support for celebrity client and wedding-specific testing scenarios
 */

export const mockSupabaseAuth = {
  validUser: {
    id: '12345678-1234-1234-1234-123456789012',
    email: 'test@wedsync.com',
    app_metadata: {
      role: 'admin',
      permissions: ['security:read', 'security:write', 'celebrity:access'],
      session_id: 'session_123456789'
    },
    user_metadata: {},
    aud: 'authenticated',
    created_at: '2025-01-29T12:00:00Z',
    updated_at: '2025-01-29T12:00:00Z'
  },
  
  celebrityUser: {
    id: '12345678-1234-1234-1234-123456789013',
    email: 'celebrity@wedsync.com',
    app_metadata: {
      role: 'celebrity_manager',
      permissions: ['security:read', 'security:write', 'celebrity:access', 'celebrity:monitor'],
      session_id: 'celebrity_session_123',
      celebrity_clearance: 'level_5'
    },
    user_metadata: {},
    aud: 'authenticated',
    created_at: '2025-01-29T12:00:00Z',
    updated_at: '2025-01-29T12:00:00Z'
  },

  vendorUser: {
    id: '12345678-1234-1234-1234-123456789014',
    email: 'vendor@wedsync.com',
    app_metadata: {
      role: 'vendor',
      permissions: ['vendor:read', 'vendor:write'],
      session_id: 'vendor_session_123',
      vendor_id: '12345678-1234-1234-1234-123456789015'
    },
    user_metadata: {},
    aud: 'authenticated',
    created_at: '2025-01-29T12:00:00Z',
    updated_at: '2025-01-29T12:00:00Z'
  },

  limitedUser: {
    id: '12345678-1234-1234-1234-123456789016',
    email: 'limited@wedsync.com',
    app_metadata: {
      role: 'user',
      permissions: ['basic:read'],
      session_id: 'limited_session_123'
    },
    user_metadata: {},
    aud: 'authenticated',
    created_at: '2025-01-29T12:00:00Z',
    updated_at: '2025-01-29T12:00:00Z'
  }
};

export const mockWeddingData = {
  organizations: [
    {
      id: '123e4567-e89b-12d3-a456-426614174000',
      name: 'Luxury Weddings LLC',
      subscription_tier: 'enterprise',
      celebrity_access_enabled: true,
      security_clearance_level: 5,
      created_at: '2025-01-01T00:00:00Z'
    },
    {
      id: '123e4567-e89b-12d3-a456-426614174001',
      name: 'Standard Weddings Inc',
      subscription_tier: 'professional',
      celebrity_access_enabled: false,
      security_clearance_level: 2,
      created_at: '2025-01-01T00:00:00Z'
    }
  ],

  clients: [
    {
      id: '123e4567-e89b-12d3-a456-426614174001',
      organization_id: '123e4567-e89b-12d3-a456-426614174000',
      name: 'John & Jane Doe',
      celebrity_tier: 'standard',
      privacy_level: 'standard',
      security_clearance_level: 1,
      wedding_date: '2025-06-15',
      created_at: '2025-01-01T00:00:00Z'
    },
    {
      id: '123e4567-e89b-12d3-a456-426614174002',
      organization_id: '123e4567-e89b-12d3-a456-426614174000',
      name: 'Celebrity Client',
      celebrity_tier: 'celebrity',
      privacy_level: 'maximum',
      security_clearance_level: 5,
      wedding_date: '2025-08-20',
      enhanced_monitoring: true,
      media_blackout: true,
      created_at: '2025-01-01T00:00:00Z'
    },
    {
      id: '123e4567-e89b-12d3-a456-426614174003',
      organization_id: '123e4567-e89b-12d3-a456-426614174000',
      name: 'VIP Client',
      celebrity_tier: 'vip',
      privacy_level: 'enhanced',
      security_clearance_level: 3,
      wedding_date: '2025-07-10',
      created_at: '2025-01-01T00:00:00Z'
    }
  ],

  vendors: [
    {
      id: '123e4567-e89b-12d3-a456-426614174015',
      organization_id: '123e4567-e89b-12d3-a456-426614174000',
      name: 'Elite Photography Studio',
      category: 'photography',
      security_clearance_level: 4,
      compliance_status: 'compliant',
      celebrity_access_approved: true,
      background_check_status: 'verified',
      security_training_status: 'completed',
      insurance_status: 'verified',
      nda_status: 'signed',
      created_at: '2025-01-01T00:00:00Z'
    },
    {
      id: '123e4567-e89b-12d3-a456-426614174016',
      organization_id: '123e4567-e89b-12d3-a456-426614174000',
      name: 'Standard Catering Co',
      category: 'catering',
      security_clearance_level: 2,
      compliance_status: 'partial',
      celebrity_access_approved: false,
      background_check_status: 'pending',
      security_training_status: 'in_progress',
      insurance_status: 'verified',
      nda_status: 'not_required',
      created_at: '2025-01-01T00:00:00Z'
    }
  ],

  auditLogs: [
    {
      id: 'audit_log_001',
      organization_id: '123e4567-e89b-12d3-a456-426614174000',
      user_id: '12345678-1234-1234-1234-123456789012',
      event_type: 'data_access',
      severity: 'low',
      threat_level: 'low',
      celebrity_client: false,
      vendor_id: null,
      client_id: '123e4567-e89b-12d3-a456-426614174001',
      event_details: {
        action: 'wedding_details_access',
        resource: 'client_wedding_info',
        ip_address: '192.168.1.100'
      },
      created_at: '2025-01-29T11:00:00Z'
    },
    {
      id: 'audit_log_002',
      organization_id: '123e4567-e89b-12d3-a456-426614174000',
      user_id: '12345678-1234-1234-1234-123456789013',
      event_type: 'celebrity_access',
      severity: 'medium',
      threat_level: 'low',
      celebrity_client: true,
      vendor_id: null,
      client_id: '123e4567-e89b-12d3-a456-426614174002',
      celebrity_tier: 'celebrity',
      event_details: {
        action: 'celebrity_data_access',
        resource: 'celebrity_wedding_details',
        ip_address: '10.0.1.50',
        enhanced_logging: true
      },
      created_at: '2025-01-29T11:30:00Z'
    },
    {
      id: 'audit_log_003',
      organization_id: '123e4567-e89b-12d3-a456-426614174000',
      user_id: '12345678-1234-1234-1234-123456789014',
      event_type: 'vendor_activity',
      severity: 'low',
      threat_level: 'low',
      celebrity_client: false,
      vendor_id: '123e4567-e89b-12d3-a456-426614174015',
      client_id: '123e4567-e89b-12d3-a456-426614174001',
      event_details: {
        action: 'vendor_client_access',
        resource: 'wedding_photos',
        ip_address: '203.0.113.10'
      },
      created_at: '2025-01-29T12:00:00Z'
    }
  ],

  securityIncidents: [
    {
      id: 'incident_001',
      organization_id: '123e4567-e89b-12d3-a456-426614174000',
      incident_type: 'unauthorized_access',
      severity: 'high',
      status: 'active',
      celebrity_client: false,
      description: 'Multiple failed login attempts detected',
      created_at: '2025-01-29T10:00:00Z',
      escalated: false
    },
    {
      id: 'incident_002',
      organization_id: '123e4567-e89b-12d3-a456-426614174000',
      incident_type: 'celebrity_privacy_breach',
      severity: 'critical',
      status: 'active',
      celebrity_client: true,
      description: 'Unauthorized access attempt to celebrity client data',
      created_at: '2025-01-29T11:45:00Z',
      escalated: true
    }
  ],

  complianceViolations: [
    {
      id: 'violation_001',
      organization_id: '123e4567-e89b-12d3-a456-426614174000',
      regulation: 'gdpr',
      violation_type: 'data_processing',
      severity: 'medium',
      status: 'open',
      celebrity_client: false,
      description: 'Data processing without documented lawful basis',
      created_at: '2025-01-28T14:00:00Z'
    },
    {
      id: 'violation_002',
      organization_id: '123e4567-e89b-12d3-a456-426614174000',
      regulation: 'ccpa',
      violation_type: 'consumer_rights',
      severity: 'high',
      status: 'open',
      celebrity_client: true,
      description: 'Delayed response to consumer rights request',
      created_at: '2025-01-27T09:30:00Z'
    }
  ]
};

export function createMockSupabaseClient() {
  const mockSelect = jest.fn();
  const mockInsert = jest.fn();
  const mockUpdate = jest.fn();
  const mockDelete = jest.fn();
  const mockEq = jest.fn();
  const mockIn = jest.fn();
  const mockNot = jest.fn();
  const mockGte = jest.fn();
  const mockLte = jest.fn();
  const mockOrder = jest.fn();
  const mockRange = jest.fn();
  const mockSingle = jest.fn();
  const mockLimit = jest.fn();

  // Chain methods that return query builders
  mockSelect.mockReturnValue({
    eq: mockEq,
    in: mockIn,
    not: mockNot,
    gte: mockGte,
    lte: mockLte,
    order: mockOrder,
    range: mockRange,
    single: mockSingle,
    limit: mockLimit
  });

  mockEq.mockReturnValue({
    eq: mockEq,
    in: mockIn,
    not: mockNot,
    gte: mockGte,
    lte: mockLte,
    order: mockOrder,
    range: mockRange,
    single: mockSingle,
    limit: mockLimit
  });

  mockIn.mockReturnValue({
    eq: mockEq,
    in: mockIn,
    not: mockNot,
    gte: mockGte,
    lte: mockLte,
    order: mockOrder,
    range: mockRange,
    single: mockSingle,
    limit: mockLimit
  });

  mockNot.mockReturnValue({
    eq: mockEq,
    in: mockIn,
    not: mockNot,
    gte: mockGte,
    lte: mockLte,
    order: mockOrder,
    range: mockRange,
    single: mockSingle,
    limit: mockLimit
  });

  mockGte.mockReturnValue({
    eq: mockEq,
    in: mockIn,
    not: mockNot,
    gte: mockGte,
    lte: mockLte,
    order: mockOrder,
    range: mockRange,
    single: mockSingle,
    limit: mockLimit
  });

  mockLte.mockReturnValue({
    eq: mockEq,
    in: mockIn,
    not: mockNot,
    gte: mockGte,
    lte: mockLte,
    order: mockOrder,
    range: mockRange,
    single: mockSingle,
    limit: mockLimit
  });

  mockOrder.mockReturnValue({
    eq: mockEq,
    in: mockIn,
    not: mockNot,
    gte: mockGte,
    lte: mockLte,
    order: mockOrder,
    range: mockRange,
    single: mockSingle,
    limit: mockLimit
  });

  mockRange.mockReturnValue({
    data: [],
    error: null
  });

  mockSingle.mockReturnValue({
    data: null,
    error: null
  });

  mockLimit.mockReturnValue({
    data: [],
    error: null
  });

  mockInsert.mockReturnValue({
    data: [],
    error: null
  });

  mockUpdate.mockReturnValue({
    eq: mockEq,
    data: [],
    error: null
  });

  mockDelete.mockReturnValue({
    eq: mockEq,
    data: [],
    error: null
  });

  const mockFrom = jest.fn((table: string) => ({
    select: mockSelect,
    insert: mockInsert,
    update: mockUpdate,
    delete: mockDelete,
    eq: mockEq,
    in: mockIn,
    not: mockNot,
    gte: mockGte,
    lte: mockLte,
    order: mockOrder,
    range: mockRange,
    single: mockSingle,
    limit: mockLimit
  }));

  const mockAuth = {
    getUser: jest.fn().mockResolvedValue({
      data: { user: mockSupabaseAuth.validUser },
      error: null
    }),
    signOut: jest.fn().mockResolvedValue({ error: null }),
    onAuthStateChange: jest.fn(),
    getSession: jest.fn().mockResolvedValue({
      data: { session: { user: mockSupabaseAuth.validUser } },
      error: null
    })
  };

  const mockStorage = {
    from: jest.fn().mockReturnValue({
      upload: jest.fn().mockResolvedValue({ data: {}, error: null }),
      download: jest.fn().mockResolvedValue({ data: {}, error: null }),
      remove: jest.fn().mockResolvedValue({ data: {}, error: null }),
      list: jest.fn().mockResolvedValue({ data: [], error: null })
    })
  };

  const mockRealtime = {
    channel: jest.fn().mockReturnValue({
      on: jest.fn().mockReturnThis(),
      subscribe: jest.fn().mockReturnThis(),
      unsubscribe: jest.fn().mockReturnThis()
    }),
    removeAllChannels: jest.fn()
  };

  return {
    from: mockFrom,
    auth: mockAuth,
    storage: mockStorage,
    realtime: mockRealtime,
    // Expose mock functions for test setup
    _mockSelect: mockSelect,
    _mockInsert: mockInsert,
    _mockUpdate: mockUpdate,
    _mockDelete: mockDelete,
    _mockEq: mockEq,
    _mockIn: mockIn,
    _mockNot: mockNot,
    _mockGte: mockGte,
    _mockLte: mockLte,
    _mockOrder: mockOrder,
    _mockRange: mockRange,
    _mockSingle: mockSingle,
    _mockLimit: mockLimit
  };
}

export function createMockSecurityContext(overrides: any = {}) {
  return {
    userId: mockSupabaseAuth.validUser.id,
    organizationId: '123e4567-e89b-12d3-a456-426614174000',
    clientId: '123e4567-e89b-12d3-a456-426614174001',
    vendorId: undefined,
    userRole: 'admin',
    celebrityTier: 'standard',
    permissions: ['security:read', 'security:write'],
    sessionId: 'session_123456789',
    ipAddress: '192.168.1.100',
    userAgent: 'Mozilla/5.0 Test Browser',
    ...overrides
  };
}

export function createMockCelebrityContext(overrides: any = {}) {
  return createMockSecurityContext({
    celebrityTier: 'celebrity',
    clientId: '123e4567-e89b-12d3-a456-426614174002',
    permissions: ['security:read', 'security:write', 'celebrity:access', 'celebrity:monitor'],
    ...overrides
  });
}

export function createMockVendorContext(overrides: any = {}) {
  return createMockSecurityContext({
    userRole: 'vendor',
    vendorId: '123e4567-e89b-12d3-a456-426614174015',
    permissions: ['vendor:read', 'vendor:write'],
    ...overrides
  });
}

export function mockSupabaseResponse(data: any = [], error: any = null) {
  return {
    data,
    error
  };
}

export function mockSupabaseQuery(mockSupabase: any, table: string, data: any = [], error: any = null) {
  mockSupabase.from(table).select.mockReturnValue({
    eq: jest.fn().mockReturnValue({
      order: jest.fn().mockReturnValue({
        range: jest.fn().mockResolvedValue({ data, error })
      })
    })
  });
}

export function mockSupabaseInsert(mockSupabase: any, table: string, data: any = [], error: any = null) {
  mockSupabase.from(table).insert.mockResolvedValue({ data, error });
}

export function mockSupabaseUpdate(mockSupabase: any, table: string, data: any = [], error: any = null) {
  mockSupabase.from(table).update.mockReturnValue({
    eq: jest.fn().mockResolvedValue({ data, error })
  });
}

// Wedding-specific test data generators
export function generateWeddingAuditEvent(overrides: any = {}) {
  return {
    id: 'audit_' + Math.random().toString(36).substr(2, 9),
    organization_id: '123e4567-e89b-12d3-a456-426614174000',
    user_id: mockSupabaseAuth.validUser.id,
    event_type: 'data_access',
    severity: 'low',
    threat_level: 'low',
    celebrity_client: false,
    client_id: '123e4567-e89b-12d3-a456-426614174001',
    event_details: {
      action: 'wedding_data_access',
      resource: 'wedding_details',
      ip_address: '192.168.1.100'
    },
    created_at: new Date().toISOString(),
    ...overrides
  };
}

export function generateCelebrityAuditEvent(overrides: any = {}) {
  return generateWeddingAuditEvent({
    event_type: 'celebrity_access',
    severity: 'medium',
    celebrity_client: true,
    celebrity_tier: 'celebrity',
    client_id: '123e4567-e89b-12d3-a456-426614174002',
    event_details: {
      action: 'celebrity_data_access',
      resource: 'celebrity_wedding_details',
      ip_address: '10.0.1.50',
      enhanced_logging: true,
      privacy_level: 'maximum'
    },
    ...overrides
  });
}

export function generateVendorAuditEvent(overrides: any = {}) {
  return generateWeddingAuditEvent({
    event_type: 'vendor_activity',
    vendor_id: '123e4567-e89b-12d3-a456-426614174015',
    user_id: mockSupabaseAuth.vendorUser.id,
    event_details: {
      action: 'vendor_wedding_access',
      resource: 'client_wedding_data',
      vendor_category: 'photography',
      ip_address: '203.0.113.10'
    },
    ...overrides
  });
}