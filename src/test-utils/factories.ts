/**
 * WS-344 Test Data Factories
 * Mock data generation for referral system testing
 * Provides consistent, realistic test data across all test suites
 */

import { faker } from '@faker-js/faker';

export interface MockSupplier {
  id: string;
  name: string;
  email: string;
  category:
    | 'photography'
    | 'catering'
    | 'venue'
    | 'florals'
    | 'music'
    | 'planning';
  location: string;
  referralCode: string;
  referralCount: number;
  conversionCount: number;
  totalEarned: number;
  tier: 'starter' | 'professional' | 'scale' | 'enterprise';
  createdAt: Date;
  updatedAt: Date;
}

export interface MockReferral {
  id: string;
  referrerId: string;
  referredId: string | null;
  code: string;
  status:
    | 'active'
    | 'clicked'
    | 'signup_started'
    | 'trial_started'
    | 'converted'
    | 'expired';
  conversionStage: string | null;
  customMessage: string | null;
  source: 'dashboard' | 'email' | 'whatsapp' | 'qr' | 'direct';
  rewardEarned: number;
  metadata: {
    ip: string;
    userAgent: string;
    location?: string;
    device?: 'desktop' | 'mobile' | 'tablet';
  };
  createdAt: Date;
  convertedAt: Date | null;
  expiresAt: Date;
}

export interface MockLeaderboardEntry {
  supplierId: string;
  supplierName: string;
  category: string;
  location: string;
  totalReferrals: number;
  paidConversions: number;
  conversionRate: number;
  totalEarned: number;
  rank: number;
  trend: 'up' | 'down' | 'stable';
  trendPercentage?: number;
}

// Mock data constants
const WEDDING_CATEGORIES: MockSupplier['category'][] = [
  'photography',
  'catering',
  'venue',
  'florals',
  'music',
  'planning',
];

const UK_LOCATIONS = [
  'London, UK',
  'Manchester, UK',
  'Birmingham, UK',
  'Edinburgh, UK',
  'Bristol, UK',
  'Liverpool, UK',
  'Brighton, UK',
  'Bath, UK',
  'York, UK',
  'Cambridge, UK',
  'Oxford, UK',
  'Canterbury, UK',
];

const SUPPLIER_TIERS: MockSupplier['tier'][] = [
  'starter',
  'professional',
  'scale',
  'enterprise',
];

const REFERRAL_SOURCES: MockReferral['source'][] = [
  'dashboard',
  'email',
  'whatsapp',
  'qr',
  'direct',
];

const USER_AGENTS = [
  'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
  'Mozilla/5.0 (iPad; CPU OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1',
  'Mozilla/5.0 (Android 11; Mobile; rv:89.0) Gecko/89.0 Firefox/89.0',
];

/**
 * Creates a mock supplier with realistic wedding industry data
 */
export const createMockSupplier = (
  overrides: Partial<MockSupplier> = {},
): MockSupplier => {
  const category = faker.helpers.arrayElement(WEDDING_CATEGORIES);
  const tier = faker.helpers.arrayElement(SUPPLIER_TIERS);

  // Generate realistic business names based on category
  const businessNames = {
    photography: () => `${faker.person.lastName()} Photography`,
    catering: () => `${faker.company.name()} Catering`,
    venue: () =>
      `${faker.location.city()} ${faker.helpers.arrayElement(['Manor', 'Hall', 'House', 'Castle', 'Barn'])}`,
    florals: () => `${faker.company.name()} Florals`,
    music: () =>
      `${faker.person.lastName()} ${faker.helpers.arrayElement(['DJ Services', 'Music', 'Entertainment'])}`,
    planning: () => `${faker.person.firstName()} Wedding Planning`,
  };

  const baseSupplier: MockSupplier = {
    id: faker.string.uuid(),
    name: businessNames[category](),
    email: faker.internet.email().toLowerCase(),
    category,
    location: faker.helpers.arrayElement(UK_LOCATIONS),
    referralCode: faker.string
      .alphanumeric(8)
      .toUpperCase()
      .replace(/[0OI1]/g, '2'), // No confusing characters
    referralCount: faker.number.int({ min: 0, max: 50 }),
    conversionCount: 0, // Will be calculated
    totalEarned: 0, // Will be calculated
    tier,
    createdAt: faker.date.between({ from: '2023-01-01', to: new Date() }),
    updatedAt: faker.date.recent({ days: 30 }),
  };

  // Calculate realistic conversion count (20-60% of referrals)
  baseSupplier.conversionCount = Math.floor(
    baseSupplier.referralCount * faker.number.float({ min: 0.2, max: 0.6 }),
  );

  // Calculate earnings based on tier and conversions
  const tierEarnings = {
    starter: 19,
    professional: 39,
    scale: 69,
    enterprise: 139,
  };
  baseSupplier.totalEarned = baseSupplier.conversionCount * tierEarnings[tier];

  return {
    ...baseSupplier,
    ...overrides,
  };
};

/**
 * Creates a mock referral with realistic tracking data
 */
export const createMockReferral = (
  overrides: Partial<MockReferral> = {},
): MockReferral => {
  const createdAt = faker.date.between({ from: '2023-01-01', to: new Date() });
  const expiresAt = new Date(createdAt.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days from creation

  const userAgent = faker.helpers.arrayElement(USER_AGENTS);
  const isMobile =
    userAgent.includes('Mobile') ||
    userAgent.includes('iPhone') ||
    userAgent.includes('Android');

  const baseReferral: MockReferral = {
    id: faker.string.uuid(),
    referrerId: faker.string.uuid(),
    referredId: faker.datatype.boolean({ probability: 0.6 })
      ? faker.string.uuid()
      : null, // 60% chance of conversion
    code: faker.string
      .alphanumeric(8)
      .toUpperCase()
      .replace(/[0OI1]/g, '2'),
    status: faker.helpers.arrayElement([
      'active',
      'clicked',
      'signup_started',
      'trial_started',
      'converted',
    ]),
    conversionStage: null,
    customMessage: faker.datatype.boolean({ probability: 0.4 })
      ? faker.lorem.sentence()
      : null,
    source: faker.helpers.arrayElement(REFERRAL_SOURCES),
    rewardEarned: 0,
    metadata: {
      ip: faker.internet.ip(),
      userAgent,
      location: faker.helpers.arrayElement(UK_LOCATIONS),
      device: isMobile
        ? 'mobile'
        : faker.helpers.arrayElement(['desktop', 'tablet']),
    },
    createdAt,
    convertedAt: null,
    expiresAt,
  };

  // Set conversion data if status indicates conversion
  if (baseReferral.status === 'converted') {
    baseReferral.convertedAt = faker.date.between({
      from: createdAt,
      to: new Date(),
    });
    baseReferral.conversionStage = 'first_payment';
    baseReferral.rewardEarned = faker.number.int({ min: 19, max: 139 }); // Based on tier
  }

  return {
    ...baseReferral,
    ...overrides,
  };
};

/**
 * Creates a mock leaderboard entry with ranking data
 */
export const createMockLeaderboardEntry = (
  overrides: Partial<MockLeaderboardEntry> = {},
): MockLeaderboardEntry => {
  const totalReferrals = faker.number.int({ min: 5, max: 100 });
  const paidConversions = Math.floor(
    totalReferrals * faker.number.float({ min: 0.2, max: 0.8 }),
  );
  const conversionRate = parseFloat(
    ((paidConversions / totalReferrals) * 100).toFixed(2),
  );

  return {
    supplierId: faker.string.uuid(),
    supplierName: createMockSupplier().name,
    category: faker.helpers.arrayElement(WEDDING_CATEGORIES),
    location: faker.helpers.arrayElement(UK_LOCATIONS),
    totalReferrals,
    paidConversions,
    conversionRate,
    totalEarned: paidConversions * faker.number.int({ min: 19, max: 139 }),
    rank: faker.number.int({ min: 1, max: 1000 }),
    trend: faker.helpers.arrayElement(['up', 'down', 'stable']),
    trendPercentage: faker.number.int({ min: -50, max: 100 }),
    ...overrides,
  };
};

/**
 * Creates a referral chain (A refers B, B refers C, etc.)
 */
export const createReferralChain = (
  depth: number = 3,
): {
  suppliers: MockSupplier[];
  referrals: MockReferral[];
} => {
  const suppliers: MockSupplier[] = [];
  const referrals: MockReferral[] = [];

  // Create initial supplier
  let currentSupplier = createMockSupplier();
  suppliers.push(currentSupplier);

  for (let i = 0; i < depth; i++) {
    // Create next supplier in chain
    const nextSupplier = createMockSupplier();
    suppliers.push(nextSupplier);

    // Create referral from current to next
    const referral = createMockReferral({
      referrerId: currentSupplier.id,
      referredId: nextSupplier.id,
      status: 'converted',
      conversionStage: 'first_payment',
      convertedAt: faker.date.recent({ days: 7 }),
    });
    referrals.push(referral);

    currentSupplier = nextSupplier;
  }

  return { suppliers, referrals };
};

/**
 * Creates a batch of test data for load testing
 */
export const createLoadTestData = (
  supplierCount: number = 100,
): {
  suppliers: MockSupplier[];
  referrals: MockReferral[];
  leaderboard: MockLeaderboardEntry[];
} => {
  const suppliers = Array.from({ length: supplierCount }, () =>
    createMockSupplier(),
  );

  const referrals: MockReferral[] = [];
  suppliers.forEach((supplier) => {
    // Each supplier has 0-20 referrals
    const referralCount = faker.number.int({ min: 0, max: 20 });
    for (let i = 0; i < referralCount; i++) {
      referrals.push(
        createMockReferral({
          referrerId: supplier.id,
          status: faker.helpers.arrayElement([
            'active',
            'converted',
            'expired',
          ]),
        }),
      );
    }
  });

  const leaderboard = suppliers
    .map((supplier, index) =>
      createMockLeaderboardEntry({
        supplierId: supplier.id,
        supplierName: supplier.name,
        category: supplier.category,
        location: supplier.location,
        rank: index + 1,
      }),
    )
    .sort((a, b) => b.paidConversions - a.paidConversions);

  return { suppliers, referrals, leaderboard };
};

/**
 * Creates mock data for fraud detection testing
 */
export const createFraudTestData = (): {
  suspiciousSupplier: MockSupplier;
  suspiciousReferrals: MockReferral[];
  legitimateSupplier: MockSupplier;
  legitimateReferrals: MockReferral[];
} => {
  // Suspicious supplier with fraud patterns
  const suspiciousSupplier = createMockSupplier({
    email: 'suspicious@example.com',
  });

  // Create suspicious referrals (same IP, rapid creation, similar emails)
  const suspiciousReferrals = Array.from({ length: 15 }, (_, i) =>
    createMockReferral({
      referrerId: suspiciousSupplier.id,
      createdAt: new Date(Date.now() - i * 60 * 1000), // 1 minute apart
      metadata: {
        ip: '192.168.1.100', // Same IP for all
        userAgent: USER_AGENTS[0],
        location: 'London, UK',
        device: 'desktop',
      },
      status: 'converted', // Unrealistically high conversion rate
      conversionStage: 'first_payment',
    }),
  );

  // Legitimate supplier with normal patterns
  const legitimateSupplier = createMockSupplier({
    email: 'legitimate@example.com',
  });

  const legitimateReferrals = Array.from({ length: 5 }, (_, i) =>
    createMockReferral({
      referrerId: legitimateSupplier.id,
      createdAt: faker.date.between({
        from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        to: new Date(),
      }),
      status: i < 2 ? 'converted' : 'active', // Normal conversion rate
    }),
  );

  return {
    suspiciousSupplier,
    suspiciousReferrals,
    legitimateSupplier,
    legitimateReferrals,
  };
};

/**
 * Creates mock data for mobile testing scenarios
 */
export const createMobileTestData = (): {
  mobileSupplier: MockSupplier;
  mobileReferrals: MockReferral[];
} => {
  const mobileSupplier = createMockSupplier({
    name: 'Mobile Photography Pro',
  });

  const mobileReferrals = Array.from({ length: 8 }, () =>
    createMockReferral({
      referrerId: mobileSupplier.id,
      source: faker.helpers.arrayElement(['whatsapp', 'qr']),
      metadata: {
        ip: faker.internet.ip(),
        userAgent: faker.helpers.arrayElement([
          'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15',
          'Mozilla/5.0 (Android 11; Mobile; rv:89.0) Gecko/89.0 Firefox/89.0',
        ]),
        device: 'mobile',
      },
    }),
  );

  return {
    mobileSupplier,
    mobileReferrals,
  };
};

/**
 * Creates test data for security validation
 */
export const createSecurityTestData = () => {
  return {
    // XSS payloads for testing
    xssPayloads: [
      '<script>alert("XSS")</script>',
      'javascript:alert("XSS")',
      '<img src="x" onerror="alert(\'XSS\')" />',
      '"><script>alert("XSS")</script>',
      "'; alert('XSS'); //",
      '<iframe src="javascript:alert(\'XSS\')"></iframe>',
      '<svg onload="alert(\'XSS\')"></svg>',
    ],

    // SQL injection payloads
    sqlInjectionPayloads: [
      "'; DROP TABLE suppliers; --",
      "1' OR '1'='1",
      "admin'; INSERT INTO suppliers VALUES ('hacked'); --",
      "' UNION SELECT * FROM users WHERE '1'='1",
      "1' AND 1=2 UNION SELECT * FROM information_schema.tables--",
      "'; EXEC xp_cmdshell('dir'); --",
    ],

    // Rate limiting test data
    rateLimitTestIPs: [
      '192.168.1.1',
      '10.0.0.1',
      '172.16.0.1',
      '203.0.113.1', // Test IP range
    ],

    // Invalid referral codes
    invalidReferralCodes: [
      'abc123', // Too short
      'ABCDEFGHIJK', // Too long
      'ABC12-34', // Contains hyphen
      '0O1I2345', // Confusing characters
      '', // Empty
      null, // Null
      undefined, // Undefined
      'special!@#', // Special characters
      '12345678', // All numbers
    ],

    // Malicious email patterns
    maliciousEmails: [
      'test+script@example.com',
      'user<script>@example.com',
      'admin@evil.com',
      'test@test@example.com', // Double @
      'user@.example.com', // Leading dot
      'user@example..com', // Double dot
      'a'.repeat(320) + '@example.com', // Too long
    ],
  };
};

/**
 * Helper function to create realistic API request data
 */
export const createApiTestData = () => {
  return {
    validCreateReferralRequest: {
      customMessage:
        'Join me on WedSync - the best platform for wedding suppliers!',
      source: 'dashboard',
    },

    invalidCreateReferralRequests: [
      { customMessage: '<script>alert("xss")</script>' }, // XSS attempt
      { customMessage: 'a'.repeat(1001) }, // Too long message
      { source: 'invalid_source' }, // Invalid source
      {}, // Empty request
    ],

    validTrackConversionRequest: {
      referralCode: 'ABCD2345',
      stage: 'signup_started',
      metadata: {
        ip: '192.168.1.1',
        userAgent: 'Mozilla/5.0 (compatible test agent)',
        device: 'desktop',
      },
    },

    invalidTrackConversionRequests: [
      { referralCode: 'invalid' }, // Invalid format
      { referralCode: 'ABCD2345', stage: 'invalid_stage' }, // Invalid stage
      { referralCode: "'; DROP TABLE referrals; --" }, // SQL injection attempt
      {}, // Empty request
    ],

    validLeaderboardRequest: {
      limit: 50,
      category: 'photography',
      location: 'London',
      includeTrends: true,
    },

    invalidLeaderboardRequests: [
      { limit: 1001 }, // Too high limit
      { limit: -1 }, // Negative limit
      { category: 'invalid_category' }, // Invalid category
      { location: '<script>alert("xss")</script>' }, // XSS in location
    ],
  };
};

// Export helper functions for test setup
export const setupMockDatabase = async (data: {
  suppliers?: MockSupplier[];
  referrals?: MockReferral[];
}) => {
  // Mock database setup for tests
  // This would typically involve setting up test database state
  console.log('Setting up mock database with:', {
    suppliers: data.suppliers?.length || 0,
    referrals: data.referrals?.length || 0,
  });
};

export const cleanupMockDatabase = async () => {
  // Mock database cleanup
  console.log('Cleaning up mock database');
};
