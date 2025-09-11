// K6 Configuration for WedSync Load Testing
// Peak Wedding Season Load Testing Configuration

export const baseConfig = {
  // Performance thresholds for wedding platform
  thresholds: {
    http_req_duration: ['p(95)<200'], // 95% of requests under 200ms
    http_req_failed: ['rate<0.02'],   // Error rate under 2%
    http_reqs: ['rate>10'],           // At least 10 requests per second
    checks: ['rate>0.95'],            // 95% of checks pass
  },
  
  // Wedding season load patterns
  stages: [
    { duration: '2m', target: 10 },   // Warm up
    { duration: '5m', target: 50 },   // Normal load
    { duration: '10m', target: 100 }, // Peak wedding season
    { duration: '5m', target: 200 },  // Wedding day rush
    { duration: '10m', target: 200 }, // Sustained peak
    { duration: '5m', target: 100 },  // Cool down
    { duration: '2m', target: 0 },    // Complete
  ],
};

export const extremeLoadConfig = {
  // Extreme peak wedding season (May-September)
  thresholds: {
    http_req_duration: ['p(95)<500'], // Relaxed during extreme load
    http_req_failed: ['rate<0.05'],   // 5% error rate acceptable
    http_reqs: ['rate>50'],           // High request rate
    checks: ['rate>0.90'],            // 90% checks pass
  },
  
  stages: [
    { duration: '2m', target: 50 },   // Quick warm up
    { duration: '5m', target: 200 },  // High load
    { duration: '10m', target: 500 }, // Extreme peak
    { duration: '15m', target: 500 }, // Sustained extreme
    { duration: '5m', target: 200 },  // Gradual cool down
    { duration: '3m', target: 0 },    // Complete
  ],
};

export const weddingDayConfig = {
  // Wedding day coordination load (real-time updates)
  thresholds: {
    http_req_duration: ['p(95)<100'], // Ultra-fast for real-time
    http_req_failed: ['rate<0.01'],   // Almost no failures
    http_reqs: ['rate>25'],           // High frequency updates
    checks: ['rate>0.98'],            // 98% checks pass
  },
  
  stages: [
    { duration: '1m', target: 20 },   // Event start
    { duration: '2h', target: 100 },  // Wedding ceremony duration
    { duration: '4h', target: 150 },  // Reception coordination
    { duration: '1h', target: 50 },   // Event wind down
    { duration: '30s', target: 0 },   // Complete
  ],
};

// API Endpoints for testing
export const endpoints = {
  auth: '/api/auth/signin',
  dashboard: '/api/dashboard',
  guests: '/api/guests',
  vendors: '/api/vendors',
  timeline: '/api/timeline',
  budget: '/api/budget',
  photos: '/api/photos/upload',
  notifications: '/api/notifications',
  realtime: '/api/realtime/updates',
};

// Test data generators
export function generateWeddingData() {
  const weddingId = Math.floor(Math.random() * 10000);
  return {
    weddingId: weddingId,
    coupleName: `TestCouple${weddingId}`,
    guestCount: Math.floor(Math.random() * 200) + 50,
    budget: Math.floor(Math.random() * 50000) + 10000,
    date: new Date(Date.now() + Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString(),
  };
}

export function generateGuestData(weddingId) {
  const guestId = Math.floor(Math.random() * 100000);
  return {
    id: guestId,
    weddingId: weddingId,
    name: `Guest${guestId}`,
    email: `guest${guestId}@test.com`,
    attending: Math.random() > 0.2,
    plusOne: Math.random() > 0.5,
    dietaryRestrictions: Math.random() > 0.8 ? 'vegetarian' : null,
  };
}

export function generateVendorData() {
  const vendorId = Math.floor(Math.random() * 1000);
  return {
    id: vendorId,
    name: `Vendor${vendorId}`,
    category: ['photographer', 'catering', 'florist', 'dj', 'venue'][Math.floor(Math.random() * 5)],
    rating: Math.random() * 2 + 3, // 3-5 star rating
    priceRange: ['$', '$$', '$$$'][Math.floor(Math.random() * 3)],
  };
}

// Authentication helper
export function authenticate(http) {
  const response = http.post(`${__ENV.BASE_URL}${endpoints.auth}`, {
    email: 'test@example.com',
    password: 'testpassword123',
  });
  
  return response.json('token') || response.cookies.session;
}

// Common headers
export const headers = {
  'Content-Type': 'application/json',
  'Accept': 'application/json',
  'User-Agent': 'k6-load-test/1.0',
};