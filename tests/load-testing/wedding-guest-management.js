// K6 Load Test: Wedding Guest Management
// Tests guest list operations under peak wedding season load

import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';
import { baseConfig, endpoints, generateWeddingData, generateGuestData, authenticate, headers } from './k6-config.js';

// Custom metrics
const guestCreationTime = new Trend('guest_creation_time');
const guestUpdateTime = new Trend('guest_update_time');
const guestListLoadTime = new Trend('guest_list_load_time');
const errorRate = new Rate('wedding_guest_errors');

export let options = {
  ...baseConfig,
  tags: { test: 'wedding-guest-management' },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

export function setup() {
  // Setup test data
  console.log('Setting up wedding guest management load test...');
  return {
    token: authenticate(http),
    weddings: Array.from({ length: 10 }, () => generateWeddingData()),
  };
}

export default function(data) {
  const { token, weddings } = data;
  const wedding = weddings[Math.floor(Math.random() * weddings.length)];
  
  const authHeaders = {
    ...headers,
    'Authorization': `Bearer ${token}`,
  };

  group('Guest List Management', () => {
    // Load guest list for wedding
    group('Load Guest List', () => {
      const startTime = Date.now();
      const response = http.get(
        `${BASE_URL}${endpoints.guests}?weddingId=${wedding.weddingId}`,
        { headers: authHeaders }
      );
      
      const loadTime = Date.now() - startTime;
      guestListLoadTime.add(loadTime);
      
      const success = check(response, {
        'guest list loaded successfully': (r) => r.status === 200,
        'guest list response time < 200ms': (r) => r.timings.duration < 200,
        'guest list contains data': (r) => {
          try {
            const data = r.json();
            return Array.isArray(data.guests);
          } catch (e) {
            return false;
          }
        },
      });
      
      if (!success) errorRate.add(1);
      else errorRate.add(0);
    });

    // Add new guest
    group('Add Guest', () => {
      const guestData = generateGuestData(wedding.weddingId);
      const startTime = Date.now();
      
      const response = http.post(
        `${BASE_URL}${endpoints.guests}`,
        JSON.stringify(guestData),
        { headers: authHeaders }
      );
      
      const creationTime = Date.now() - startTime;
      guestCreationTime.add(creationTime);
      
      const success = check(response, {
        'guest created successfully': (r) => r.status === 201 || r.status === 200,
        'guest creation time < 300ms': (r) => r.timings.duration < 300,
        'guest data returned': (r) => {
          try {
            const data = r.json();
            return data.id && data.name;
          } catch (e) {
            return false;
          }
        },
      });
      
      if (!success) errorRate.add(1);
      else errorRate.add(0);
      
      // Store guest ID for update test
      if (response.status < 400) {
        try {
          const createdGuest = response.json();
          wedding.lastGuestId = createdGuest.id;
        } catch (e) {
          // Handle parsing error
        }
      }
    });

    // Update existing guest
    if (wedding.lastGuestId) {
      group('Update Guest', () => {
        const updateData = {
          attending: !Math.random() > 0.5,
          dietaryRestrictions: Math.random() > 0.7 ? 'vegan' : null,
          plusOne: Math.random() > 0.6,
        };
        
        const startTime = Date.now();
        const response = http.patch(
          `${BASE_URL}${endpoints.guests}/${wedding.lastGuestId}`,
          JSON.stringify(updateData),
          { headers: authHeaders }
        );
        
        const updateTime = Date.now() - startTime;
        guestUpdateTime.add(updateTime);
        
        const success = check(response, {
          'guest updated successfully': (r) => r.status === 200,
          'guest update time < 200ms': (r) => r.timings.duration < 200,
          'updated data returned': (r) => r.status < 400,
        });
        
        if (!success) errorRate.add(1);
        else errorRate.add(0);
      });
    }

    // Bulk guest import simulation
    group('Bulk Guest Import', () => {
      const bulkGuests = Array.from({ length: 50 }, () => generateGuestData(wedding.weddingId));
      
      const response = http.post(
        `${BASE_URL}${endpoints.guests}/bulk`,
        JSON.stringify({ guests: bulkGuests }),
        { headers: authHeaders }
      );
      
      const success = check(response, {
        'bulk import successful': (r) => r.status === 200 || r.status === 201,
        'bulk import time < 2000ms': (r) => r.timings.duration < 2000,
        'imported count matches': (r) => {
          try {
            const data = r.json();
            return data.imported >= bulkGuests.length * 0.9; // Allow 10% failure
          } catch (e) {
            return false;
          }
        },
      });
      
      if (!success) errorRate.add(1);
      else errorRate.add(0);
    });

    // RSVP response simulation
    group('RSVP Responses', () => {
      const rsvpData = {
        attending: Math.random() > 0.2, // 80% attendance rate
        guestCount: Math.floor(Math.random() * 3) + 1,
        dietaryRestrictions: Math.random() > 0.8 ? 'vegetarian' : '',
        message: 'Excited for your special day!',
      };
      
      const response = http.post(
        `${BASE_URL}${endpoints.guests}/rsvp`,
        JSON.stringify(rsvpData),
        { headers: authHeaders }
      );
      
      check(response, {
        'RSVP submitted successfully': (r) => r.status === 200,
        'RSVP response time < 300ms': (r) => r.timings.duration < 300,
      });
    });
  });

  // Simulate realistic user behavior
  sleep(Math.random() * 3 + 1); // 1-4 second pause between operations
}

export function teardown(data) {
  console.log('Guest management load test completed');
  console.log(`Average guest creation time: ${guestCreationTime.avg}ms`);
  console.log(`Average guest update time: ${guestUpdateTime.avg}ms`);
  console.log(`Average guest list load time: ${guestListLoadTime.avg}ms`);
  console.log(`Error rate: ${(errorRate.rate * 100).toFixed(2)}%`);
}