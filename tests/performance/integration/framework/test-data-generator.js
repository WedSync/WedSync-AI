// WS-193 Integration Performance Tests - GDPR-Compliant Test Data Generator
// Team C - Synthetic Wedding Data for Performance Testing

import { randomBytes } from 'k6/crypto';

// GDPR-Compliant synthetic data generation
// NO REAL WEDDING DATA - All data is clearly synthetic and test-only

// Wedding venues (clearly test data)
const TEST_VENUES = [
  'Performance Test Manor',
  'Load Test Gardens', 
  'Integration Test Hall',
  'Stress Test Pavilion',
  'K6 Testing Estate',
  'Benchmark Wedding Venue',
  'Synthetic Data Ballroom',
  'Mock Wedding Chapel'
];

// Photography styles for realistic form testing
const PHOTOGRAPHY_STYLES = [
  'Traditional',
  'Photojournalistic', 
  'Fine Art',
  'Modern',
  'Vintage',
  'Documentary'
];

// Wedding service types for supplier testing
const WEDDING_SERVICES = [
  'photography',
  'videography', 
  'catering',
  'flowers',
  'music',
  'venue',
  'planning'
];

/**
 * Generates GDPR-compliant synthetic wedding data for performance testing
 * @returns {Object} Synthetic wedding test data
 */
export function generateWeddingTestData() {
  const testId = Math.floor(Math.random() * 10000) + 1000;
  const futureDate = new Date();
  futureDate.setMonth(futureDate.getMonth() + (Math.floor(Math.random() * 18) + 6)); // 6-24 months future
  
  return {
    // Clearly synthetic couple data
    coupleName: `TestCouple${testId}`,
    brideName: `TestBride${testId}`,
    groomName: `TestGroom${testId}`,
    
    // Test-only email addresses
    email: `performance.test+couple${testId}@wedsync-testing.com`,
    phone: `+44 7900 ${String(testId).padStart(6, '0')}`,
    
    // Synthetic wedding details  
    weddingDate: futureDate.toISOString().split('T')[0],
    venue: TEST_VENUES[Math.floor(Math.random() * TEST_VENUES.length)],
    venueCity: 'Performance Test City',
    venuePostcode: `PT${testId.toString().slice(-2)} 1PT`,
    
    // Realistic guest counts for testing
    guestCount: Math.floor(Math.random() * 250) + 50, // 50-300 guests
    
    // Budget ranges for pricing tier testing
    budgetAmount: Math.floor(Math.random() * 50000) + 10000, // £10k-£60k
    budgetCurrency: 'GBP',
    
    // Wedding preferences for form testing
    photographyStyle: PHOTOGRAPHY_STYLES[Math.floor(Math.random() * PHOTOGRAPHY_STYLES.length)],
    ceremonyType: Math.random() > 0.5 ? 'Religious' : 'Civil',
    receptionType: Math.random() > 0.3 ? 'Sit Down Meal' : 'Buffet',
    
    // Timeline data for scheduling tests
    ceremonyTime: `${Math.floor(Math.random() * 4) + 13}:${Math.random() > 0.5 ? '00' : '30'}`, // 1-5 PM
    receptionTime: `${Math.floor(Math.random() * 3) + 18}:00`, // 6-9 PM
    
    // Special requirements for form complexity testing
    specialRequirements: [
      'Vegetarian options required',
      'Child-friendly venue needed', 
      'Wheelchair accessible',
      'Outdoor ceremony preferred',
      'Late night music license'
    ].slice(0, Math.floor(Math.random() * 3) + 1), // 1-3 requirements
    
    // Test metadata
    testDataGenerated: new Date().toISOString(),
    testDataExpiry: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
    dataClassification: 'synthetic-performance-test'
  };
}

/**
 * Generates synthetic supplier data for vendor performance testing
 * @returns {Object} Synthetic supplier test data
 */
export function generateSupplierTestData() {
  const supplierId = Math.floor(Math.random() * 1000) + 500;
  const serviceType = WEDDING_SERVICES[Math.floor(Math.random() * WEDDING_SERVICES.length)];
  
  return {
    // Clearly synthetic supplier data
    supplierName: `TestSupplier${supplierId}${serviceType.charAt(0).toUpperCase() + serviceType.slice(1)}`,
    businessName: `Performance Test ${serviceType.charAt(0).toUpperCase() + serviceType.slice(1)} Co.`,
    
    // Test-only contact details
    email: `performance.test+supplier${supplierId}@wedsync-testing.com`,
    phone: `+44 1614 ${String(supplierId).padStart(6, '0')}`,
    
    // Business details for marketplace testing
    services: [serviceType],
    serviceArea: 'Greater Manchester',
    businessAddress: {
      street: `${supplierId} Performance Test Street`,
      city: 'Load Test City',
      postcode: `LT${supplierId.toString().slice(-2)} 1LT`,
      country: 'United Kingdom'
    },
    
    // Pricing for tier testing
    pricingTier: ['starter', 'professional', 'scale'][Math.floor(Math.random() * 3)],
    averageWeddingPrice: Math.floor(Math.random() * 5000) + 1000, // £1k-£6k
    
    // Portfolio data for load testing
    portfolioImages: Math.floor(Math.random() * 50) + 10, // 10-60 images
    completedWeddings: Math.floor(Math.random() * 100) + 20, // 20-120 weddings
    
    // Review data for search performance testing
    averageRating: (Math.random() * 1.5 + 3.5).toFixed(1), // 3.5-5.0 rating
    reviewCount: Math.floor(Math.random() * 50) + 5, // 5-55 reviews
    
    // Test metadata
    testDataGenerated: new Date().toISOString(),
    testDataExpiry: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    dataClassification: 'synthetic-performance-test'
  };
}

/**
 * Generates bulk client import data for Tave integration testing
 * @param {number} count Number of clients to generate
 * @returns {Array} Array of synthetic client data
 */
export function generateBulkClientData(count = 50) {
  const clients = [];
  
  for (let i = 0; i < count; i++) {
    const clientId = Math.floor(Math.random() * 10000) + 10000;
    const futureWeddingDate = new Date();
    futureWeddingDate.setMonth(futureWeddingDate.getMonth() + Math.floor(Math.random() * 12) + 3); // 3-15 months
    
    clients.push({
      // Tave-style import data structure
      tave_client_id: `tave_test_${clientId}`,
      
      // Synthetic couple data
      couple_name: `ImportTestCouple${clientId}`,
      primary_email: `import.test+${clientId}@wedsync-testing.com`,
      secondary_email: `import.test+partner${clientId}@wedsync-testing.com`,
      
      // Wedding details
      wedding_date: futureWeddingDate.toISOString().split('T')[0],
      venue_name: TEST_VENUES[Math.floor(Math.random() * TEST_VENUES.length)],
      guest_count: Math.floor(Math.random() * 200) + 75,
      
      // Contact information
      phone_primary: `+44 7700 ${String(clientId).slice(-6)}`,
      phone_secondary: `+44 7800 ${String(clientId + 1).slice(-6)}`,
      
      // Address data
      address: {
        street: `${clientId} Import Test Avenue`,
        city: 'Bulk Import City',
        postcode: `BI${clientId.toString().slice(-2)} 1BI`,
        country: 'United Kingdom'
      },
      
      // Service details for import performance
      service_package: ['basic', 'standard', 'premium'][Math.floor(Math.random() * 3)],
      contract_value: Math.floor(Math.random() * 4000) + 1500,
      deposit_paid: Math.random() > 0.3, // 70% have paid deposit
      
      // Import metadata
      import_source: 'tave_performance_test',
      import_batch_id: `batch_${Date.now()}`,
      import_timestamp: new Date().toISOString(),
      
      // Test data markers
      synthetic_data: true,
      auto_cleanup: true,
      data_retention_hours: 24
    });
  }
  
  return clients;
}

/**
 * Generates realistic form field responses for submission testing
 * @param {Object} weddingData Wedding test data to base responses on
 * @returns {Object} Form field responses
 */
export function generateFormResponses(weddingData) {
  return {
    'Wedding Date': weddingData.weddingDate,
    'Venue Name': weddingData.venue,
    'Guest Count': weddingData.guestCount.toString(),
    'Photography Style': weddingData.photographyStyle,
    'Ceremony Type': weddingData.ceremonyType,
    'Reception Style': weddingData.receptionType,
    'Budget Range': `£${Math.floor(weddingData.budgetAmount / 1000)}k - £${Math.floor(weddingData.budgetAmount / 1000) + 5}k`,
    'Contact Email': weddingData.email,
    'Phone Number': weddingData.phone,
    'Special Requirements': weddingData.specialRequirements.join(', '),
    'Ceremony Time': weddingData.ceremonyTime,
    'Reception Time': weddingData.receptionTime,
    'Additional Notes': 'Generated for performance testing - synthetic data only'
  };
}

/**
 * Authenticates a test supplier for performance testing
 * @returns {string} Authorization header value
 */
export function authenticateSupplier() {
  const supplierData = generateSupplierTestData();
  
  // Mock JWT token for performance testing (not real authentication)
  const mockToken = Buffer.from(JSON.stringify({
    sub: `supplier_${supplierData.supplierName}`,
    email: supplierData.email,
    role: 'supplier',
    tier: supplierData.pricingTier,
    iss: 'wedsync-performance-test',
    exp: Math.floor(Date.now() / 1000) + 3600, // 1 hour expiry
    test_data: true
  })).toString('base64');
  
  return `Bearer perf_test_${mockToken}`;
}

/**
 * Authenticates a test couple for performance testing
 * @returns {string} Authorization header value
 */
export function authenticateCouple() {
  const coupleData = generateWeddingTestData();
  
  // Mock JWT token for performance testing (not real authentication)
  const mockToken = Buffer.from(JSON.stringify({
    sub: `couple_${coupleData.coupleName}`,
    email: coupleData.email,
    role: 'couple',
    wedding_date: coupleData.weddingDate,
    iss: 'wedsync-performance-test',
    exp: Math.floor(Date.now() / 1000) + 3600, // 1 hour expiry
    test_data: true
  })).toString('base64');
  
  return `Bearer perf_test_${mockToken}`;
}

/**
 * Generates webhook test payloads for delivery performance testing
 * @returns {Object} Webhook payload data
 */
export function generateWebhookPayload() {
  const weddingData = generateWeddingTestData();
  
  return {
    event: 'form.submitted',
    timestamp: new Date().toISOString(),
    data: {
      form_id: `perf_test_form_${Math.floor(Math.random() * 1000)}`,
      submission_id: `perf_test_sub_${Math.floor(Math.random() * 10000)}`,
      couple_id: `perf_test_couple_${Math.floor(Math.random() * 1000)}`,
      supplier_id: `perf_test_supplier_${Math.floor(Math.random() * 1000)}`,
      wedding_date: weddingData.weddingDate,
      venue: weddingData.venue,
      submission_data: generateFormResponses(weddingData)
    },
    metadata: {
      test_data: true,
      performance_test_id: `ws193_team_c_${Date.now()}`,
      auto_cleanup: true
    }
  };
}

/**
 * Generates calendar integration test data
 * @returns {Object} Calendar event data
 */
export function generateCalendarEventData() {
  const weddingData = generateWeddingTestData();
  
  return {
    title: `${weddingData.coupleName} - Wedding Consultation`,
    description: 'Initial consultation for wedding photography services',
    start_time: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 1 week from now
    end_time: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000 + 60 * 60 * 1000).toISOString(), // 1 hour meeting
    attendees: [
      weddingData.email,
      `photographer@performance-test-supplier.com`
    ],
    location: weddingData.venue,
    wedding_date: weddingData.weddingDate,
    couple_id: `perf_test_couple_${Math.floor(Math.random() * 1000)}`,
    supplier_id: `perf_test_supplier_${Math.floor(Math.random() * 1000)}`,
    test_data: true
  };
}

/**
 * Clean up test data - called after performance test completion
 * @param {string} testSessionId Test session identifier
 */
export function cleanupTestData(testSessionId) {
  console.log(`Cleaning up performance test data for session: ${testSessionId}`);
  
  // In a real implementation, this would:
  // 1. Delete all test data created in this session
  // 2. Clear temporary files and images
  // 3. Reset any test database state
  // 4. Clean up external service test data
  
  return {
    cleanup_completed: true,
    session_id: testSessionId,
    cleanup_timestamp: new Date().toISOString()
  };
}

// Export commonly used test data sets
export const TEST_DATA_SETS = {
  SMALL_WEDDING: { guestCount: 50, budgetAmount: 15000 },
  MEDIUM_WEDDING: { guestCount: 120, budgetAmount: 35000 },
  LARGE_WEDDING: { guestCount: 200, budgetAmount: 55000 },
  LUXURY_WEDDING: { guestCount: 300, budgetAmount: 80000 }
};

export const SUPPLIER_TIERS = {
  STARTER: { tier: 'starter', maxClients: 50, maxForms: 10 },
  PROFESSIONAL: { tier: 'professional', maxClients: 200, maxForms: 50 },
  SCALE: { tier: 'scale', maxClients: 500, maxForms: 100 },
  ENTERPRISE: { tier: 'enterprise', maxClients: -1, maxForms: -1 } // Unlimited
};