/**
 * Wedding Industry Test Data Factory
 * Provides realistic wedding industry test data for comprehensive testing
 * Includes photographers, venues, couples, and wedding scenarios
 */

export const WeddingTestDataFactory = {
  // Vendor profiles
  vendors: {
    photographer: {
      id: 'vendor-photographer-001',
      business_name: 'Enchanted Moments Photography',
      user_type: 'photographer',
      subscription_tier: 'professional',
      years_experience: 8,
      wedding_count: 145,
      average_wedding_price: 3500,
      monthly_revenue: 12500,
      client_count: 28,
      specialties: ['outdoor', 'luxury', 'destination', 'documentary'],
      equipment_value: 45000,
      team_size: 3,
      geographic_reach: ['London', 'Surrey', 'Kent', 'Essex'],
      prestige_level: 'established',
      portfolio_size: 500,
      social_following: 8500,
      average_rating: 4.8,
      total_reviews: 142,
      response_time_hours: 2.5,
      booking_lead_time_months: 8,
      created_at: '2022-03-15T10:00:00Z',
      updated_at: '2025-01-18T14:30:00Z',
    },

    venue: {
      id: 'vendor-venue-001',
      business_name: 'Cliveden House',
      user_type: 'venue',
      subscription_tier: 'scale',
      years_experience: 15,
      wedding_count: 320,
      average_wedding_price: 25000,
      monthly_revenue: 85000,
      client_count: 12,
      capacity_min: 50,
      capacity_max: 200,
      venue_type: 'luxury_hotel',
      prestige_level: 'luxury',
      geographic_location: 'Berkshire',
      seasonal_pricing: true,
      outdoor_space: true,
      accommodation_rooms: 38,
      average_rating: 4.9,
      total_reviews: 89,
      created_at: '2020-06-01T09:00:00Z',
      updated_at: '2025-01-19T11:15:00Z',
    },

    florist: {
      id: 'vendor-florist-001',
      business_name: 'Bloom & Blossom Florals',
      user_type: 'florist',
      subscription_tier: 'starter',
      years_experience: 5,
      wedding_count: 78,
      average_wedding_price: 1200,
      monthly_revenue: 4500,
      client_count: 15,
      specialties: ['wildflower', 'seasonal', 'sustainable'],
      sustainable_options: true,
      prestige_level: 'emerging',
      geographic_reach: ['Surrey', 'Hampshire'],
      average_rating: 4.7,
      total_reviews: 67,
      created_at: '2023-01-10T14:20:00Z',
      updated_at: '2025-01-19T16:45:00Z',
    },

    minimal: {
      id: 'vendor-minimal-001',
      business_name: 'Simple Photography',
      user_type: 'photographer',
      subscription_tier: 'free',
    },
  },

  // Wedding scenarios
  weddings: {
    peakSeason: {
      wedding_date: '2025-06-14', // Saturday in June
      season: 'peak',
      budget: 85000,
      guest_count: 120,
      days_until: 145,
      is_weekend: true,
      venue_type: 'luxury',
      services_needed: ['photography', 'videography', 'flowers', 'catering'],
      wedding_type: 'luxury',
      location: 'Berkshire',
    },

    saturdayWedding: {
      wedding_date: '2025-01-25', // Next Saturday
      season: 'winter',
      budget: 45000,
      guest_count: 80,
      days_until: 5,
      is_weekend: true,
      is_wedding_day: true,
      venue_type: 'country_house',
      services_needed: ['photography', 'flowers'],
      wedding_type: 'intimate',
      location: 'Surrey',
    },

    emergencyScenario: {
      wedding_date: '2025-01-25', // 5 days away
      season: 'winter',
      budget: 25000,
      guest_count: 45,
      days_until: 5,
      is_weekend: true,
      vendor_panic_mode: true,
      last_minute_changes: true,
      wedding_type: 'intimate',
      services_needed: ['photography'],
      location: 'London',
    },

    offSeason: {
      wedding_date: '2025-02-14', // February Valentine's Day
      season: 'off_peak',
      budget: 35000,
      guest_count: 60,
      days_until: 25,
      is_weekend: false,
      venue_type: 'registry_office',
      wedding_type: 'budget_conscious',
      services_needed: ['photography'],
      location: 'Essex',
    },

    destination: {
      wedding_date: '2025-09-15',
      season: 'peak',
      budget: 125000,
      guest_count: 80,
      days_until: 238,
      is_weekend: false,
      venue_type: 'destination',
      wedding_type: 'luxury',
      destination: 'Tuscany',
      travel_required: true,
      international: true,
      services_needed: ['photography', 'videography', 'planning'],
    },
  },

  // Feature request scenarios
  featureRequests: {
    standardRequest: {
      id: 'fr-001',
      user_id: 'vendor-photographer-001',
      title: 'Better mobile photo upload interface',
      description:
        'The current mobile interface for uploading wedding photos is clunky. Need drag-and-drop and batch upload.',
      category: 'ui-ux',
      priority: 'medium',
      status: 'submitted',
      votes: 12,
      wedding_context: null,
      technical_requirements:
        'Mobile-first design, drag-drop, progress indicators',
      business_impact: 'Medium - affects daily workflow',
      created_at: '2025-01-19T10:30:00Z',
      updated_at: '2025-01-19T10:30:00Z',
    },

    urgentRequest: {
      id: 'fr-002',
      user_id: 'vendor-venue-001',
      title: 'Critical: Payment system down for venue bookings',
      description:
        'Payment processing failing for venue deposits. Losing bookings!',
      category: 'payment',
      priority: 'critical',
      status: 'submitted',
      votes: 0,
      wedding_context: {
        wedding_date: '2025-01-25',
        days_until: 5,
        is_wedding_day: true,
      },
      business_impact: 'Critical - direct revenue loss',
      created_at: '2025-01-19T15:45:00Z',
      updated_at: '2025-01-19T15:45:00Z',
    },

    premiumFeature: {
      id: 'fr-003',
      user_id: 'vendor-photographer-001',
      title: 'AI-powered photo culling and selection',
      description:
        'Use AI to pre-select best shots from wedding galleries to reduce editing time.',
      category: 'ai-features',
      priority: 'low',
      status: 'submitted',
      votes: 25,
      technical_requirements:
        'OpenAI Vision API integration, batch processing, quality scoring',
      business_impact: 'High - significant time savings',
      tier_requirement: 'professional',
      created_at: '2025-01-18T12:00:00Z',
      updated_at: '2025-01-19T09:15:00Z',
    },

    mobileFeature: {
      id: 'fr-004',
      user_id: 'vendor-florist-001',
      title: 'Offline mobile gallery viewing',
      description:
        'Allow couples to view their wedding gallery offline at venues with poor signal.',
      category: 'mobile-app',
      priority: 'high',
      status: 'submitted',
      votes: 18,
      mobile_critical: true,
      wedding_day_critical: true,
      technical_requirements: 'Service worker, local storage, sync when online',
      business_impact: 'High - improves client experience',
      created_at: '2025-01-17T14:22:00Z',
      updated_at: '2025-01-19T11:30:00Z',
    },

    integrationRequest: {
      id: 'fr-005',
      user_id: 'vendor-photographer-001',
      title: 'Lightroom Classic integration',
      description:
        'Direct integration with Lightroom for seamless wedding gallery export.',
      category: 'integration',
      priority: 'medium',
      status: 'submitted',
      votes: 33,
      technical_requirements: 'Adobe API, OAuth2, batch export',
      business_impact: 'Medium - workflow improvement',
      created_at: '2025-01-16T16:45:00Z',
      updated_at: '2025-01-19T08:20:00Z',
    },

    minimalData: {
      id: 'fr-006',
      user_id: 'vendor-minimal-001',
      title: 'Basic feature request',
      description: 'Simple request with minimal data',
      category: 'general',
      priority: 'low',
      status: 'submitted',
      votes: 1,
    },
  },

  // User context data
  userContext: {
    photographer: {
      userType: 'supplier',
      credibilityScore: 85,
      businessMetrics: {
        tier: 'professional',
        monthlyRevenue: 12500,
        clientCount: 28,
        weddingCount: 145,
        averagePrice: 3500,
        prestigeLevel: 'established',
      },
      weddingContext: null,
      contextualInsights: {
        urgencyFactors: ['professional_tier', 'high_volume_supplier'],
        priorityBoost: 1,
        mobileCritical: false,
        saturdayProtection: false,
        featureAccess: {
          aiFeatures: true,
          marketplace: true,
          apiAccess: false,
          whiteLabel: false,
        },
      },
      dataProcessingConsent: true,
      dataMinimization: false,
    },

    venue: {
      userType: 'supplier',
      credibilityScore: 92,
      businessMetrics: {
        tier: 'scale',
        monthlyRevenue: 85000,
        clientCount: 12,
        weddingCount: 320,
        averagePrice: 25000,
        prestigeLevel: 'luxury',
      },
      weddingContext: null,
      contextualInsights: {
        urgencyFactors: ['luxury_tier', 'high_revenue'],
        priorityBoost: 2,
        mobileCritical: false,
        saturdayProtection: false,
        featureAccess: {
          aiFeatures: true,
          marketplace: true,
          apiAccess: true,
          whiteLabel: false,
        },
      },
      dataProcessingConsent: true,
      dataMinimization: false,
    },
  },

  // External system responses
  externalSystems: {
    linear: {
      createIssueResponse: {
        data: {
          issueCreate: {
            success: true,
            issue: {
              id: 'linear-123',
              identifier: 'WED-456',
              url: 'https://linear.app/wedsync/issue/WED-456',
              state: { name: 'Todo' },
              assignee: { name: 'dev-team' },
              labels: {
                nodes: [
                  { name: 'wedding-industry' },
                  { name: 'priority-medium' },
                  { name: 'user-type-photographer' },
                ],
              },
              createdAt: '2025-01-19T16:00:00Z',
              updatedAt: '2025-01-19T16:00:00Z',
            },
          },
        },
      },
    },

    github: {
      createIssueResponse: {
        id: 789,
        html_url: 'https://github.com/wedsync/wedsync/issues/789',
        state: 'open',
        assignee: { login: 'dev-team' },
        labels: [
          { name: 'wedding-industry' },
          { name: 'enhancement' },
          { name: 'mobile' },
        ],
        created_at: '2025-01-19T16:00:00Z',
        updated_at: '2025-01-19T16:00:00Z',
      },
    },

    jira: {
      createIssueResponse: {
        id: 'jira-12345',
        key: 'WED-123',
        self: 'https://wedsync.atlassian.net/rest/api/3/issue/12345',
      },
    },

    slack: {
      webhookResponse: {
        ok: true,
      },
    },
  },

  // Real-time events
  realtimeEvents: {
    featureRequestCreated: {
      type: 'feature_request.created',
      payload: {
        id: 'fr-001',
        title: 'Better mobile photo upload interface',
        user_id: 'vendor-photographer-001',
        priority: 'medium',
        category: 'ui-ux',
      },
      timestamp: '2025-01-19T16:30:00Z',
      room: 'feature-requests',
    },

    weddingDayEvent: {
      type: 'feature_request.urgent',
      payload: {
        id: 'fr-002',
        title: 'Critical: Payment system down',
        user_id: 'vendor-venue-001',
        priority: 'critical',
        wedding_day: true,
        days_until: 5,
      },
      timestamp: '2025-01-19T16:45:00Z',
      room: 'urgent-requests',
      priority: 1,
    },
  },

  // Communication templates
  communicationTemplates: {
    featureRequestCreated: {
      email: {
        subject: 'Your feature request has been submitted - {{title}}',
        body: 'Dear {{business_name}}, your feature request "{{title}}" has been submitted and will be reviewed by our team within 2 business days.',
      },
      sms: {
        body: 'WedSync: Feature request "{{title}}" submitted successfully. We\'ll review within 2 days.',
      },
      slack: {
        text: '🎯 New feature request: {{title}} from {{business_name}} ({{user_type}})',
      },
    },

    weddingDayAlert: {
      email: {
        subject: '🚨 URGENT: Wedding Day Issue - {{title}}',
        body: 'CRITICAL ALERT: {{business_name}} has a wedding in {{days_until}} days and reported: {{description}}',
      },
      slack: {
        text: '🚨 WEDDING DAY CRITICAL: {{title}} - {{business_name}} has wedding in {{days_until}} days!',
      },
    },
  },

  // Performance test data
  performanceData: {
    loadTestUsers: Array.from({ length: 1000 }, (_, i) => ({
      id: `load-test-user-${i + 1}`,
      business_name: `Test Business ${i + 1}`,
      user_type:
        i % 3 === 0 ? 'photographer' : i % 3 === 1 ? 'venue' : 'florist',
      subscription_tier:
        i % 4 === 0
          ? 'free'
          : i % 4 === 1
            ? 'starter'
            : i % 4 === 2
              ? 'professional'
              : 'scale',
    })),

    concurrentRequests: Array.from({ length: 100 }, (_, i) => ({
      id: `concurrent-request-${i + 1}`,
      title: `Load test feature request ${i + 1}`,
      description: `This is a load test feature request number ${i + 1}`,
      category: ['ui-ux', 'backend', 'mobile', 'integration'][i % 4],
      priority: ['low', 'medium', 'high'][i % 3],
    })),
  },
};

/**
 * Helper functions for test data generation
 */
export const TestDataHelpers = {
  // Generate random wedding date
  randomWeddingDate: (monthsFromNow: number = 6): string => {
    const date = new Date();
    date.setMonth(date.getMonth() + monthsFromNow);
    return date.toISOString().split('T')[0];
  },

  // Generate wedding day scenario
  createWeddingDayScenario: (daysUntil: number = 0) => ({
    ...WeddingTestDataFactory.weddings.emergencyScenario,
    days_until: daysUntil,
    wedding_date: new Date(Date.now() + daysUntil * 24 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0],
    is_wedding_day: daysUntil === 0,
  }),

  // Generate peak season wedding
  createPeakSeasonWedding: (month: number = 6) => {
    const date = new Date(2025, month - 1, 14); // June 14th, etc.
    return {
      ...WeddingTestDataFactory.weddings.peakSeason,
      wedding_date: date.toISOString().split('T')[0],
      season: [5, 6, 7, 8, 9].includes(month) ? 'peak' : 'off_peak',
    };
  },

  // Generate vendor by type
  createVendorByType: (
    type: 'photographer' | 'venue' | 'florist' | 'caterer' | 'band',
  ) => {
    const baseVendor = WeddingTestDataFactory.vendors.photographer;
    const typeSpecificData = {
      photographer: { average_wedding_price: 3500, equipment_value: 45000 },
      venue: { average_wedding_price: 25000, capacity_max: 200 },
      florist: { average_wedding_price: 1200, sustainable_options: true },
      caterer: {
        average_wedding_price: 5500,
        dietary_options: ['vegan', 'gluten_free'],
      },
      band: { average_wedding_price: 2800, repertoire_size: 200 },
    };

    return {
      ...baseVendor,
      user_type: type,
      ...typeSpecificData[type],
    };
  },
};
