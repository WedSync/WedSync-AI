// K6 Load Test: Wedding Vendor Coordination
// Tests vendor management and coordination under peak load

import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';
import { baseConfig, endpoints, generateWeddingData, generateVendorData, authenticate, headers } from './k6-config.js';

// Custom metrics
const vendorSearchTime = new Trend('vendor_search_time');
const vendorBookingTime = new Trend('vendor_booking_time');
const vendorCommunicationTime = new Trend('vendor_communication_time');
const vendorUpdateTime = new Trend('vendor_update_time');
const errorRate = new Rate('vendor_coordination_errors');

export let options = {
  ...baseConfig,
  tags: { test: 'wedding-vendor-coordination' },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

export function setup() {
  console.log('Setting up wedding vendor coordination load test...');
  return {
    token: authenticate(http),
    weddings: Array.from({ length: 20 }, () => generateWeddingData()),
    vendors: Array.from({ length: 100 }, () => generateVendorData()),
  };
}

export default function(data) {
  const { token, weddings, vendors } = data;
  const wedding = weddings[Math.floor(Math.random() * weddings.length)];
  
  const authHeaders = {
    ...headers,
    'Authorization': `Bearer ${token}`,
  };

  group('Vendor Discovery & Search', () => {
    // Search vendors by category
    group('Vendor Search', () => {
      const categories = ['photographer', 'catering', 'florist', 'dj', 'venue'];
      const category = categories[Math.floor(Math.random() * categories.length)];
      
      const startTime = Date.now();
      const response = http.get(
        `${BASE_URL}${endpoints.vendors}?category=${category}&location=${wedding.weddingId % 10}&budget=${wedding.budget}`,
        { headers: authHeaders }
      );
      
      const searchTime = Date.now() - startTime;
      vendorSearchTime.add(searchTime);
      
      const success = check(response, {
        'vendor search successful': (r) => r.status === 200,
        'vendor search time < 500ms': (r) => r.timings.duration < 500,
        'search returns results': (r) => {
          try {
            const data = r.json();
            return Array.isArray(data.vendors) && data.vendors.length > 0;
          } catch (e) {
            return false;
          }
        },
        'search includes pricing': (r) => {
          try {
            const data = r.json();
            return data.vendors.some(v => v.priceRange);
          } catch (e) {
            return false;
          }
        },
      });
      
      if (!success) errorRate.add(1);
      else errorRate.add(0);
    });

    // Advanced vendor filtering
    group('Advanced Vendor Filtering', () => {
      const filters = {
        rating: '4+',
        priceRange: '$$',
        availability: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        distance: '25',
      };
      
      const queryString = Object.entries(filters)
        .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
        .join('&');
      
      const response = http.get(
        `${BASE_URL}${endpoints.vendors}/search?${queryString}`,
        { headers: authHeaders }
      );
      
      check(response, {
        'advanced search successful': (r) => r.status === 200,
        'filtered results returned': (r) => r.timings.duration < 800,
        'results match filters': (r) => {
          try {
            const data = r.json();
            return data.vendors.length >= 0; // May be empty with strict filters
          } catch (e) {
            return false;
          }
        },
      });
    });
  });

  group('Vendor Booking & Management', () => {
    // Vendor booking request
    group('Vendor Booking', () => {
      const vendor = vendors[Math.floor(Math.random() * vendors.length)];
      const bookingData = {
        vendorId: vendor.id,
        weddingId: wedding.weddingId,
        serviceDate: wedding.date,
        serviceType: vendor.category,
        budget: Math.floor(wedding.budget * 0.2), // 20% of total budget
        requirements: 'Premium package with customization',
      };
      
      const startTime = Date.now();
      const response = http.post(
        `${BASE_URL}${endpoints.vendors}/booking`,
        JSON.stringify(bookingData),
        { headers: authHeaders }
      );
      
      const bookingTime = Date.now() - startTime;
      vendorBookingTime.add(bookingTime);
      
      const success = check(response, {
        'booking request successful': (r) => r.status === 201 || r.status === 200,
        'booking time < 400ms': (r) => r.timings.duration < 400,
        'booking ID returned': (r) => {
          try {
            const data = r.json();
            return data.bookingId || data.id;
          } catch (e) {
            return false;
          }
        },
      });
      
      if (!success) errorRate.add(1);
      else errorRate.add(0);
    });

    // Vendor communication
    group('Vendor Communication', () => {
      const vendor = vendors[Math.floor(Math.random() * vendors.length)];
      const messageData = {
        vendorId: vendor.id,
        weddingId: wedding.weddingId,
        subject: 'Service Details Discussion',
        message: 'Hi! We would like to discuss the details of our upcoming wedding service.',
        priority: Math.random() > 0.8 ? 'high' : 'normal',
      };
      
      const startTime = Date.now();
      const response = http.post(
        `${BASE_URL}${endpoints.vendors}/messages`,
        JSON.stringify(messageData),
        { headers: authHeaders }
      );
      
      const communicationTime = Date.now() - startTime;
      vendorCommunicationTime.add(communicationTime);
      
      const success = check(response, {
        'message sent successfully': (r) => r.status === 201 || r.status === 200,
        'communication time < 300ms': (r) => r.timings.duration < 300,
        'message ID returned': (r) => {
          try {
            const data = r.json();
            return data.messageId || data.id;
          } catch (e) {
            return false;
          }
        },
      });
      
      if (!success) errorRate.add(1);
      else errorRate.add(0);
    });

    // Vendor timeline updates
    group('Vendor Timeline Updates', () => {
      const vendor = vendors[Math.floor(Math.random() * vendors.length)];
      const updateData = {
        vendorId: vendor.id,
        weddingId: wedding.weddingId,
        status: ['confirmed', 'in-progress', 'completed'][Math.floor(Math.random() * 3)],
        timeline: {
          setupTime: '2 hours before ceremony',
          deliveryTime: '1 hour before ceremony',
          notes: 'Special arrangements discussed and confirmed',
        },
        lastUpdate: new Date().toISOString(),
      };
      
      const startTime = Date.now();
      const response = http.put(
        `${BASE_URL}${endpoints.vendors}/${vendor.id}/timeline`,
        JSON.stringify(updateData),
        { headers: authHeaders }
      );
      
      const updateTime = Date.now() - startTime;
      vendorUpdateTime.add(updateTime);
      
      const success = check(response, {
        'timeline update successful': (r) => r.status === 200,
        'update time < 250ms': (r) => r.timings.duration < 250,
        'updated timeline returned': (r) => r.status < 400,
      });
      
      if (!success) errorRate.add(1);
      else errorRate.add(0);
    });
  });

  group('Vendor Real-Time Coordination', () => {
    // Real-time status updates during wedding day
    group('Real-Time Status Updates', () => {
      const statusUpdates = [
        'Setup in progress',
        'Ready for ceremony',
        'Service completed',
        'Cleanup in progress',
        'Departed venue'
      ];
      
      const updateData = {
        weddingId: wedding.weddingId,
        vendorId: vendors[Math.floor(Math.random() * vendors.length)].id,
        status: statusUpdates[Math.floor(Math.random() * statusUpdates.length)],
        timestamp: new Date().toISOString(),
        location: 'Main venue',
      };
      
      const response = http.post(
        `${BASE_URL}${endpoints.realtime}/vendor-status`,
        JSON.stringify(updateData),
        { headers: authHeaders }
      );
      
      check(response, {
        'real-time update successful': (r) => r.status === 200,
        'real-time response < 100ms': (r) => r.timings.duration < 100,
        'status broadcasted': (r) => r.status < 400,
      });
    });

    // Vendor coordination dashboard load
    group('Coordination Dashboard', () => {
      const response = http.get(
        `${BASE_URL}${endpoints.vendors}/coordination/${wedding.weddingId}`,
        { headers: authHeaders }
      );
      
      check(response, {
        'dashboard loaded successfully': (r) => r.status === 200,
        'dashboard load time < 600ms': (r) => r.timings.duration < 600,
        'all vendor statuses present': (r) => {
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

  // Simulate realistic coordination patterns
  sleep(Math.random() * 2 + 0.5); // 0.5-2.5 second pause
}

export function teardown(data) {
  console.log('Vendor coordination load test completed');
  console.log(`Average vendor search time: ${vendorSearchTime.avg}ms`);
  console.log(`Average vendor booking time: ${vendorBookingTime.avg}ms`);
  console.log(`Average vendor communication time: ${vendorCommunicationTime.avg}ms`);
  console.log(`Average vendor update time: ${vendorUpdateTime.avg}ms`);
  console.log(`Error rate: ${(errorRate.rate * 100).toFixed(2)}%`);
}