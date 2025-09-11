// Geographic Performance Testing for WedSync
// Tests performance from multiple global regions for wedding platform users

import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// Custom metrics for geographic performance
const responseTimeNA = new Trend('response_time_north_america');
const responseTimeEU = new Trend('response_time_europe');
const responseTimeAP = new Trend('response_time_asia_pacific');
const cdnEffectiveness = new Trend('cdn_cache_hit_ratio');
const databaseLatency = new Trend('database_query_latency');
const errorRateByRegion = new Rate('error_rate_by_region');

// Geographic test configuration
export let options = {
  scenarios: {
    // North America performance test
    north_america_users: {
      executor: 'ramping-vus',
      startVUs: 5,
      stages: [
        { duration: '2m', target: 20 },
        { duration: '5m', target: 50 },
        { duration: '2m', target: 20 },
        { duration: '1m', target: 0 },
      ],
      tags: { region: 'north-america' },
      env: { REGION: 'us-east-1' },
    },
    
    // European performance test
    europe_users: {
      executor: 'ramping-vus',
      startVUs: 5,
      stages: [
        { duration: '2m', target: 15 },
        { duration: '5m', target: 30 },
        { duration: '2m', target: 15 },
        { duration: '1m', target: 0 },
      ],
      tags: { region: 'europe' },
      env: { REGION: 'eu-west-1' },
    },
    
    // Asia Pacific performance test
    asia_pacific_users: {
      executor: 'ramping-vus',
      startVUs: 3,
      stages: [
        { duration: '2m', target: 10 },
        { duration: '5m', target: 25 },
        { duration: '2m', target: 10 },
        { duration: '1m', target: 0 },
      ],
      tags: { region: 'asia-pacific' },
      env: { REGION: 'ap-southeast-1' },
    }
  },
  
  thresholds: {
    // Regional performance thresholds
    'response_time_north_america': ['p(95)<500'],    // 95% under 500ms in NA
    'response_time_europe': ['p(95)<800'],           // 95% under 800ms in EU
    'response_time_asia_pacific': ['p(95)<1200'],    // 95% under 1200ms in AP
    'cdn_cache_hit_ratio': ['avg>0.85'],             // 85% cache hit rate
    'database_query_latency': ['p(90)<200'],         // 90% of DB queries under 200ms
    'error_rate_by_region': ['rate<0.02'],           // Error rate under 2%
  },
};

const BASE_URL = __ENV.BASE_URL || 'https://api.wedsync.com';

// Regional endpoints for testing
const REGIONAL_ENDPOINTS = {
  'north-america': `${BASE_URL}`,
  'europe': `${BASE_URL}`,      // Same CDN endpoint but different edge locations
  'asia-pacific': `${BASE_URL}` // CDN should route to closest edge
};

// Wedding API endpoints to test globally
const API_ENDPOINTS = {
  home: '/',
  wedding_search: '/api/weddings/search',
  vendor_directory: '/api/vendors',
  photo_gallery: '/api/photos/gallery',
  guest_management: '/api/guests',
  real_time_updates: '/api/realtime/status',
  cdn_assets: '/static/images/hero-wedding.jpg',
};

export function setup() {
  console.log('Setting up geographic performance testing...');
  return {
    testStartTime: Date.now(),
    regions: ['north-america', 'europe', 'asia-pacific'],
  };
}

export default function(data) {
  const region = __ENV.REGION || 'north-america';
  const baseUrl = REGIONAL_ENDPOINTS[getRegionKey(region)];
  
  const headers = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'User-Agent': `k6-geographic-test/${region}`,
    'X-Test-Region': region,
  };

  group('Geographic Performance Testing', () => {
    
    // Test primary wedding platform endpoints
    group('Wedding Platform Core Endpoints', () => {
      
      // Home page performance
      group('Home Page Load', () => {
        const startTime = Date.now();
        const response = http.get(`${baseUrl}${API_ENDPOINTS.home}`, { headers });
        const responseTime = Date.now() - startTime;
        
        // Record regional response time
        recordRegionalResponseTime(region, responseTime);
        
        const success = check(response, {
          'home page loads successfully': (r) => r.status === 200,
          'home page response time acceptable': (r) => r.timings.duration < getRegionalThreshold(region),
          'home page contains wedding content': (r) => r.body.includes('wedding') || r.body.includes('WedSync'),
        });
        
        if (!success) errorRateByRegion.add(1);
        else errorRateByRegion.add(0);
      });
      
      // Wedding search performance
      group('Wedding Search API', () => {
        const searchParams = new URLSearchParams({
          location: getRegionalCity(region),
          date: '2024-06-15',
          guests: '150',
          budget: '25000'
        });
        
        const startTime = Date.now();
        const response = http.get(
          `${baseUrl}${API_ENDPOINTS.wedding_search}?${searchParams}`,
          { headers }
        );
        const responseTime = Date.now() - startTime;
        
        recordRegionalResponseTime(region, responseTime);
        
        check(response, {
          'search API responds successfully': (r) => r.status === 200,
          'search response time reasonable': (r) => r.timings.duration < getRegionalThreshold(region) * 1.5,
          'search returns wedding data': (r) => {
            try {
              const data = r.json();
              return Array.isArray(data.results) || Array.isArray(data.weddings);
            } catch (e) {
              return false;
            }
          },
        });
      });
      
      // Vendor directory performance
      group('Vendor Directory API', () => {
        const vendorParams = new URLSearchParams({
          category: 'photography',
          location: getRegionalCity(region),
          rating: '4+',
          distance: '50'
        });
        
        const startTime = Date.now();
        const response = http.get(
          `${baseUrl}${API_ENDPOINTS.vendor_directory}?${vendorParams}`,
          { headers }
        );
        const responseTime = Date.now() - startTime;
        
        recordRegionalResponseTime(region, responseTime);
        
        check(response, {
          'vendor directory loads': (r) => r.status === 200,
          'vendor response time good': (r) => r.timings.duration < getRegionalThreshold(region) * 2,
          'vendors returned': (r) => {
            try {
              const data = r.json();
              return data.vendors && Array.isArray(data.vendors);
            } catch (e) {
              return false;
            }
          },
        });
      });
    });

    // CDN and static asset performance
    group('CDN Performance Testing', () => {
      
      group('Static Asset Loading', () => {
        const cdnStartTime = Date.now();
        const cdnResponse = http.get(`${baseUrl}${API_ENDPOINTS.cdn_assets}`, {
          headers: {
            ...headers,
            'Cache-Control': 'no-cache', // Test fresh load
          }
        });
        const cdnResponseTime = Date.now() - cdnStartTime;
        
        recordRegionalResponseTime(region, cdnResponseTime);
        
        // Check for CDN cache headers
        const cacheStatus = cdnResponse.headers['X-Cache'] || cdnResponse.headers['CF-Cache-Status'] || 'UNKNOWN';
        const isCacheHit = cacheStatus.includes('HIT') || cacheStatus.includes('hit');
        
        if (isCacheHit) {
          cdnEffectiveness.add(1);
        } else {
          cdnEffectiveness.add(0);
        }
        
        check(cdnResponse, {
          'CDN asset loads successfully': (r) => r.status === 200,
          'CDN response time acceptable': (r) => r.timings.duration < 2000, // 2s for images
          'CDN cache headers present': (r) => r.headers['Cache-Control'] || r.headers['Expires'],
          'Content delivered correctly': (r) => r.body && r.body.length > 1000, // Reasonable image size
        });
      });
      
      // Test cache effectiveness
      group('Cache Hit Performance', () => {
        // Second request should hit cache
        const cachedResponse = http.get(`${baseUrl}${API_ENDPOINTS.cdn_assets}`, { headers });
        const cacheStatus = cachedResponse.headers['X-Cache'] || cachedResponse.headers['CF-Cache-Status'] || 'UNKNOWN';
        
        check(cachedResponse, {
          'cached asset loads faster': (r) => r.timings.duration < 500, // Should be much faster
          'cache hit detected': (r) => cacheStatus.includes('HIT') || r.timings.duration < 100,
        });
      });
    });

    // Database performance from different regions
    group('Database Performance by Region', () => {
      
      group('Guest List Query', () => {
        const dbStartTime = Date.now();
        const response = http.get(`${baseUrl}/api/guests/1234`, { headers });
        const dbResponseTime = Date.now() - dbStartTime;
        
        // Simulate database latency calculation
        const estimatedDbLatency = Math.max(0, dbResponseTime - 50); // Subtract app processing time
        databaseLatency.add(estimatedDbLatency);
        
        recordRegionalResponseTime(region, dbResponseTime);
        
        check(response, {
          'database query succeeds': (r) => r.status === 200,
          'database latency reasonable': (r) => estimatedDbLatency < getRegionalDBThreshold(region),
          'guest data returned': (r) => {
            try {
              const data = r.json();
              return data.guests || data.guest;
            } catch (e) {
              return false;
            }
          },
        });
      });
      
      group('Wedding Timeline Query', () => {
        const dbStartTime = Date.now();
        const response = http.get(`${baseUrl}/api/timeline/wedding/5678`, { headers });
        const dbResponseTime = Date.now() - dbStartTime;
        
        const estimatedDbLatency = Math.max(0, dbResponseTime - 50);
        databaseLatency.add(estimatedDbLatency);
        
        check(response, {
          'timeline query performs well': (r) => r.status === 200,
          'timeline DB latency good': (r) => estimatedDbLatency < getRegionalDBThreshold(region),
        });
      });
    });

    // Real-time features geographic performance
    group('Real-time Features', () => {
      
      group('WebSocket Connection', () => {
        // Simulate WebSocket connection test
        const wsResponse = http.get(`${baseUrl}/api/realtime/health`, { headers });
        
        check(wsResponse, {
          'real-time endpoint accessible': (r) => r.status === 200,
          'real-time latency acceptable': (r) => r.timings.duration < getRegionalThreshold(region),
        });
      });
      
      group('Live Updates', () => {
        const updateResponse = http.post(
          `${baseUrl}/api/realtime/test-update`,
          JSON.stringify({
            event: 'test-geographic-performance',
            region: region,
            timestamp: new Date().toISOString(),
          }),
          { headers }
        );
        
        check(updateResponse, {
          'live update processes': (r) => r.status === 200 || r.status === 201,
          'update latency regional': (r) => r.timings.duration < getRegionalThreshold(region) * 1.5,
        });
      });
    });
  });

  // Realistic user behavior with regional variation
  sleep(getRegionalSleep(region));
}

export function teardown(data) {
  const testDuration = Date.now() - data.testStartTime;
  
  console.log('Geographic Performance Testing Completed');
  console.log('======================================');
  console.log(`Total test duration: ${Math.round(testDuration/1000)}s`);
  console.log(`North America avg response: ${responseTimeNA.avg || 'N/A'}ms`);
  console.log(`Europe avg response: ${responseTimeEU.avg || 'N/A'}ms`);
  console.log(`Asia Pacific avg response: ${responseTimeAP.avg || 'N/A'}ms`);
  console.log(`CDN effectiveness: ${Math.round((cdnEffectiveness.avg || 0) * 100)}%`);
  console.log(`Average DB latency: ${databaseLatency.avg || 'N/A'}ms`);
  console.log(`Global error rate: ${Math.round((errorRateByRegion.rate || 0) * 100)}%`);
}

// Helper functions
function getRegionKey(region) {
  const regionMap = {
    'us-east-1': 'north-america',
    'eu-west-1': 'europe',
    'ap-southeast-1': 'asia-pacific'
  };
  return regionMap[region] || 'north-america';
}

function recordRegionalResponseTime(region, responseTime) {
  const regionKey = getRegionKey(region);
  switch (regionKey) {
    case 'north-america':
      responseTimeNA.add(responseTime);
      break;
    case 'europe':
      responseTimeEU.add(responseTime);
      break;
    case 'asia-pacific':
      responseTimeAP.add(responseTime);
      break;
  }
}

function getRegionalThreshold(region) {
  const thresholds = {
    'us-east-1': 500,    // 500ms for North America
    'eu-west-1': 800,    // 800ms for Europe  
    'ap-southeast-1': 1200  // 1200ms for Asia Pacific
  };
  return thresholds[region] || 500;
}

function getRegionalDBThreshold(region) {
  const dbThresholds = {
    'us-east-1': 150,    // 150ms DB latency in NA
    'eu-west-1': 200,    // 200ms DB latency in EU
    'ap-southeast-1': 300   // 300ms DB latency in AP
  };
  return dbThresholds[region] || 150;
}

function getRegionalCity(region) {
  const cities = {
    'us-east-1': 'New York',
    'eu-west-1': 'London', 
    'ap-southeast-1': 'Singapore'
  };
  return cities[region] || 'New York';
}

function getRegionalSleep(region) {
  // Different user behavior patterns by region
  const sleepTimes = {
    'us-east-1': Math.random() * 2 + 1,    // 1-3s NA users
    'eu-west-1': Math.random() * 3 + 1.5,  // 1.5-4.5s EU users
    'ap-southeast-1': Math.random() * 4 + 2  // 2-6s AP users
  };
  return sleepTimes[region] || 2;
}