// WS-214 Team E: Vendor Network Test Configuration
export const VENDOR_NETWORK_TEST_CONFIG = {
  // Test Environment Settings
  environment: {
    test_mode: true,
    mock_network_conditions: true,
    enable_performance_logging: true,
    enable_network_simulation: true,
  },

  // Performance Thresholds
  performance: {
    vendor_profile_load_max_ms: 500,
    vendor_search_max_ms: 1000,
    vendor_communication_max_ms: 300,
    booking_sync_max_ms: 800,
    calendar_update_max_ms: 400,
    concurrent_user_limit: 1000,
    throughput_min_rps: 50, // requests per second
    network_latency_max_ms: 200,
    success_rate_min_percent: 95,
    memory_usage_max_mb: 100,
  },

  // Network Simulation Profiles
  networkProfiles: {
    excellent: {
      bandwidth: 10, // Mbps
      latency: 30, // ms
      packetLoss: 0, // %
      stability: 0.98,
      quality: 'excellent',
    },
    good: {
      bandwidth: 5,
      latency: 80,
      packetLoss: 1,
      stability: 0.9,
      quality: 'good',
    },
    fair: {
      bandwidth: 2,
      latency: 200,
      packetLoss: 3,
      stability: 0.75,
      quality: 'fair',
    },
    poor: {
      bandwidth: 0.5,
      latency: 500,
      packetLoss: 8,
      stability: 0.5,
      quality: 'poor',
    },
    mobile_3g: {
      bandwidth: 1,
      latency: 300,
      packetLoss: 5,
      stability: 0.7,
      quality: 'mobile_3g',
    },
    mobile_4g: {
      bandwidth: 8,
      latency: 100,
      packetLoss: 2,
      stability: 0.85,
      quality: 'mobile_4g',
    },
    venue_wifi: {
      bandwidth: 3,
      latency: 150,
      packetLoss: 4,
      stability: 0.6,
      quality: 'venue_wifi',
      networkChallenges: ['congestion', 'interference'],
    },
  },

  // Test Data Sets
  testData: {
    vendorTypes: [
      'photographer',
      'videographer',
      'florist',
      'caterer',
      'musician',
      'venue',
      'planner',
      'decorator',
    ],

    vendorStatuses: ['active', 'inactive', 'pending_approval', 'suspended'],

    communicationTypes: [
      'direct_message',
      'group_chat',
      'notification',
      'announcement',
      'booking_inquiry',
      'contract_update',
    ],

    bookingStatuses: [
      'inquiry',
      'quoted',
      'booked',
      'confirmed',
      'completed',
      'cancelled',
    ],

    eventTypes: [
      'wedding_ceremony',
      'reception',
      'engagement_party',
      'rehearsal_dinner',
      'consultation',
      'venue_visit',
      'menu_tasting',
    ],
  },

  // Load Testing Configuration
  loadTesting: {
    scenarios: {
      light: {
        concurrent_users: 10,
        duration_minutes: 2,
        ramp_up_seconds: 30,
      },
      moderate: {
        concurrent_users: 50,
        duration_minutes: 5,
        ramp_up_seconds: 60,
      },
      heavy: {
        concurrent_users: 200,
        duration_minutes: 10,
        ramp_up_seconds: 120,
      },
      peak: {
        concurrent_users: 500,
        duration_minutes: 15,
        ramp_up_seconds: 180,
      },
      stress: {
        concurrent_users: 1000,
        duration_minutes: 5,
        ramp_up_seconds: 60,
      },
    },
  },

  // Test Coverage Areas
  testCoverage: {
    networkInfrastructure: {
      connection_establishment: true,
      connection_reliability: true,
      retry_mechanisms: true,
      timeout_handling: true,
      error_recovery: true,
    },

    vendorConnections: {
      profile_synchronization: true,
      peer_to_peer_communication: true,
      group_collaboration: true,
      real_time_updates: true,
      data_consistency: true,
    },

    performanceMetrics: {
      response_times: true,
      throughput_testing: true,
      concurrent_user_limits: true,
      memory_usage: true,
      bandwidth_optimization: true,
    },

    securityTesting: {
      authentication: true,
      authorization: true,
      data_encryption: true,
      rate_limiting: true,
      input_validation: true,
    },

    mobileTesting: {
      responsive_design: true,
      touch_interactions: true,
      offline_capabilities: true,
      data_usage_optimization: true,
      battery_efficiency: true,
    },
  },

  // Mock Data Generators
  mockDataGenerators: {
    generateVendorProfile: (id: string, type: string) => ({
      id,
      user_id: `user-${id}`,
      business_name: `${type.charAt(0).toUpperCase() + type.slice(1)} Business ${id}`,
      contact_name: `Contact Person ${id}`,
      email: `vendor${id}@example.com`,
      phone: `+1-555-${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`,
      vendor_type: type,
      services: [`${type} services`],
      status: 'active',
      location: {
        city: 'San Francisco',
        state: 'CA',
        country: 'USA',
        service_radius_km: 50,
      },
      pricing: {
        starting_price: 1000 + Math.random() * 4000,
        hourly_rate: 100 + Math.random() * 200,
      },
      availability: {
        working_hours: {
          monday: { start: '09:00', end: '17:00', available: true },
          tuesday: { start: '09:00', end: '17:00', available: true },
          wednesday: { start: '09:00', end: '17:00', available: true },
          thursday: { start: '09:00', end: '17:00', available: true },
          friday: { start: '09:00', end: '17:00', available: true },
          saturday: { start: '08:00', end: '22:00', available: true },
          sunday: { start: '10:00', end: '18:00', available: false },
        },
        blackout_dates: [],
        advance_booking_days: 30,
      },
      portfolio_images: Array.from(
        { length: 10 },
        (_, i) => `portfolio-${id}-${i}.jpg`,
      ),
      reviews_summary: {
        average_rating: 4.0 + Math.random() * 1.0,
        total_reviews: Math.floor(Math.random() * 50) + 5,
        rating_distribution: {
          1: 0,
          2: 1,
          3: 2,
          4: 10,
          5: 15,
        },
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }),

    generateCommunication: (fromVendor: string, toClient: string) => ({
      id: `comm-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      from_vendor_id: fromVendor,
      to_client_id: toClient,
      type: 'direct_message',
      subject: 'Regarding your wedding inquiry',
      message:
        'Thank you for your interest in our services. I would love to discuss your special day!',
      priority: 'normal',
      status: 'sent',
      created_at: new Date().toISOString(),
      read_at: null,
      replied_at: null,
    }),

    generateBooking: (vendorId: string, clientId: string) => ({
      id: `booking-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      vendor_id: vendorId,
      client_id: clientId,
      wedding_id: `wedding-${clientId}`,
      service_type: 'photography',
      wedding_date: new Date(
        Date.now() + Math.random() * 365 * 24 * 60 * 60 * 1000,
      ).toISOString(),
      service_details: {
        duration_hours: 8,
        location: 'Beautiful Wedding Venue',
        special_requirements: ['outdoor ceremony', 'sunset photos'],
      },
      booking_status: 'confirmed',
      contract_status: 'signed',
      payment_status: 'deposit_paid',
      total_amount: 2500,
      deposit_amount: 500,
      balance_due: 2000,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }),
  },

  // Test Utilities
  utilities: {
    delay: (ms: number) => new Promise((resolve) => setTimeout(resolve, ms)),

    generateTestId: () =>
      `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,

    simulateNetworkDelay: (
      profile: keyof typeof VENDOR_NETWORK_TEST_CONFIG.networkProfiles,
    ) => {
      const networkProfile =
        VENDOR_NETWORK_TEST_CONFIG.networkProfiles[profile];
      const baseDelay = networkProfile.latency;
      const jitter = Math.random() * 50; // Add up to 50ms jitter
      return VENDOR_NETWORK_TEST_CONFIG.utilities.delay(baseDelay + jitter);
    },

    measurePerformance: async <T>(
      operation: () => Promise<T>,
      operationName: string,
    ): Promise<{ result: T; duration: number; memory: number }> => {
      const startTime = performance.now();
      const startMemory = process.memoryUsage().heapUsed;

      const result = await operation();

      const endTime = performance.now();
      const endMemory = process.memoryUsage().heapUsed;
      const duration = endTime - startTime;
      const memoryDelta = endMemory - startMemory;

      if (VENDOR_NETWORK_TEST_CONFIG.environment.enable_performance_logging) {
        console.log(
          `Performance [${operationName}]: ${duration.toFixed(2)}ms, Memory: ${(memoryDelta / 1024 / 1024).toFixed(2)}MB`,
        );
      }

      return { result, duration, memory: memoryDelta };
    },

    createMockSupabaseClient: () => ({
      from: (table: string) => ({
        select: vi.fn().mockReturnThis(),
        insert: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        delete: vi.fn().mockReturnThis(),
        upsert: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        neq: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        like: vi.fn().mockReturnThis(),
        ilike: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: null }),
        maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      }),
      rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'test-user' } },
          error: null,
        }),
        getSession: vi.fn().mockResolvedValue({
          data: { session: { access_token: 'mock-token' } },
          error: null,
        }),
      },
      channel: vi.fn().mockReturnValue({
        on: vi.fn().mockReturnThis(),
        subscribe: vi.fn().mockReturnThis(),
        unsubscribe: vi.fn().mockReturnThis(),
        send: vi.fn().mockResolvedValue({ error: null }),
      }),
    }),
  },
};

// Test runner configuration
export const TEST_RUNNER_CONFIG = {
  testTimeout: 30000, // 30 seconds per test
  setupTimeout: 10000, // 10 seconds for setup
  teardownTimeout: 5000, // 5 seconds for cleanup

  parallelTests: true,
  maxConcurrency: 4,

  retries: 2,
  failFast: false,

  coverage: {
    enabled: true,
    threshold: 80, // 80% minimum coverage
    includeUntested: false,
  },

  reporting: {
    console: true,
    json: true,
    html: true,
    outputDir: './test-results/vendor-network',
  },
};

export default VENDOR_NETWORK_TEST_CONFIG;
