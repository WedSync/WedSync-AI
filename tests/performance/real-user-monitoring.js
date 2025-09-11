// Real User Monitoring (RUM) System for WedSync
// Comprehensive RUM implementation for wedding platform performance tracking

import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Rate, Trend, Counter, Gauge } from 'k6/metrics';

// RUM-specific metrics
const userSessionDuration = new Trend('user_session_duration');
const pageViewDuration = new Trend('page_view_duration');
const userInteractionLatency = new Trend('user_interaction_latency');
const formSubmissionTime = new Trend('form_submission_time');
const photoUploadSpeed = new Trend('photo_upload_speed');
const searchQueryTime = new Trend('search_query_time');
const realTimeUpdateLatency = new Trend('realtime_update_latency');

// User experience metrics
const userSatisfactionScore = new Gauge('user_satisfaction_score');
const bounceRate = new Rate('bounce_rate');
const conversionRate = new Rate('conversion_rate');
const errorEncounteredRate = new Rate('error_encountered_rate');
const featureUsageRate = new Rate('feature_usage_rate');

// Wedding-specific RUM metrics
const rsvpCompletionRate = new Rate('rsvp_completion_rate');
const vendorBookingSuccess = new Rate('vendor_booking_success');
const photoSharingEngagement = new Rate('photo_sharing_engagement');
const timelineInteractionRate = new Rate('timeline_interaction_rate');

// Business metrics
const weddingPlanningProgress = new Gauge('wedding_planning_progress');
const vendorCommunicationEfficiency = new Trend('vendor_communication_efficiency');

export let options = {
  scenarios: {
    // Engaged couples planning their wedding
    couple_planning_session: {
      executor: 'ramping-vus',
      startVUs: 2,
      stages: [
        { duration: '1m', target: 5 },
        { duration: '10m', target: 15 },
        { duration: '5m', target: 10 },
        { duration: '2m', target: 0 },
      ],
      tags: { user_type: 'couple' },
    },
    
    // Wedding guests interacting with platform
    guest_interactions: {
      executor: 'ramping-vus',
      startVUs: 1,
      stages: [
        { duration: '2m', target: 10 },
        { duration: '8m', target: 25 },
        { duration: '3m', target: 15 },
        { duration: '2m', target: 0 },
      ],
      tags: { user_type: 'guest' },
    },
    
    // Wedding vendors managing their services
    vendor_management: {
      executor: 'ramping-vus',
      startVUs: 1,
      stages: [
        { duration: '1m', target: 3 },
        { duration: '8m', target: 8 },
        { duration: '3m', target: 5 },
        { duration: '2m', target: 0 },
      ],
      tags: { user_type: 'vendor' },
    },
    
    // Wedding day real-time coordination
    wedding_day_coordination: {
      executor: 'ramping-vus',
      startVUs: 1,
      stages: [
        { duration: '30s', target: 5 },
        { duration: '2h', target: 20 }, // Wedding ceremony duration
        { duration: '4h', target: 30 }, // Reception coordination
        { duration: '30m', target: 10 },
        { duration: '30s', target: 0 },
      ],
      tags: { user_type: 'wedding_day_coordinator' },
    }
  },
  
  thresholds: {
    // User experience thresholds
    'user_session_duration': ['avg<1800000'], // Average session under 30 minutes
    'page_view_duration': ['p(95)<5000'],     // 95% of page views under 5 seconds
    'user_interaction_latency': ['p(90)<300'], // 90% of interactions under 300ms
    'form_submission_time': ['p(95)<2000'],   // 95% of form submissions under 2s
    
    // Conversion and engagement thresholds
    'bounce_rate': ['rate<0.4'],              // Bounce rate under 40%
    'conversion_rate': ['rate>0.15'],         // Conversion rate over 15%
    'rsvp_completion_rate': ['rate>0.85'],    // RSVP completion over 85%
    'vendor_booking_success': ['rate>0.75'],  // Vendor booking success over 75%
    
    // Technical performance thresholds
    'error_encountered_rate': ['rate<0.05'],  // Error rate under 5%
    'realtime_update_latency': ['p(95)<1000'], // Real-time updates under 1s
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

// Simulate realistic user behavior patterns
const USER_BEHAVIORS = {
  couple: {
    sessionDuration: { min: 600, max: 3600 }, // 10-60 minutes
    pageViewsPerSession: { min: 8, max: 25 },
    interactionFrequency: { min: 2, max: 8 }, // interactions per minute
    features: ['venue_search', 'vendor_browsing', 'timeline_planning', 'budget_tracking']
  },
  guest: {
    sessionDuration: { min: 120, max: 900 }, // 2-15 minutes
    pageViewsPerSession: { min: 3, max: 8 },
    interactionFrequency: { min: 1, max: 4 },
    features: ['rsvp_form', 'wedding_details', 'photo_viewing', 'gift_registry']
  },
  vendor: {
    sessionDuration: { min: 300, max: 1800 }, // 5-30 minutes
    pageViewsPerSession: { min: 5, max: 15 },
    interactionFrequency: { min: 3, max: 10 },
    features: ['event_management', 'client_communication', 'timeline_updates', 'photo_uploads']
  },
  wedding_day_coordinator: {
    sessionDuration: { min: 1800, max: 21600 }, // 30 minutes to 6 hours
    pageViewsPerSession: { min: 15, max: 50 },
    interactionFrequency: { min: 5, max: 15 },
    features: ['realtime_updates', 'vendor_coordination', 'timeline_monitoring', 'issue_resolution']
  }
};

export function setup() {
  console.log('Setting up Real User Monitoring simulation...');
  return {
    testStartTime: Date.now(),
    userSessions: 0,
    totalInteractions: 0,
  };
}

export default function(data) {
  const userType = __VU % 4 === 0 ? 'couple' : 
                   __VU % 4 === 1 ? 'guest' : 
                   __VU % 4 === 2 ? 'vendor' : 'wedding_day_coordinator';
  
  const behavior = USER_BEHAVIORS[userType];
  const sessionStartTime = Date.now();
  
  // Simulate user session
  simulateUserSession(userType, behavior);
  
  const sessionDuration = Date.now() - sessionStartTime;
  userSessionDuration.add(sessionDuration);
  
  // Determine user satisfaction based on performance
  const satisfactionScore = calculateUserSatisfaction(sessionDuration, userType);
  userSatisfactionScore.set(satisfactionScore);
}

function simulateUserSession(userType, behavior) {
  const sessionDuration = randomBetween(behavior.sessionDuration.min, behavior.sessionDuration.max) * 1000;
  const pageViews = randomBetween(behavior.pageViewsPerSession.min, behavior.pageViewsPerSession.max);
  const sessionEndTime = Date.now() + sessionDuration;
  
  group(`${userType.toUpperCase()} User Session`, () => {
    
    // Landing page
    group('Landing Page Experience', () => {
      const pageStartTime = Date.now();
      const response = http.get(`${BASE_URL}/`);
      const pageLoadTime = Date.now() - pageStartTime;
      
      pageViewDuration.add(pageLoadTime);
      
      const isGoodPerformance = check(response, {
        'landing page loads successfully': (r) => r.status === 200,
        'landing page loads quickly': (r) => r.timings.duration < 2000,
      });
      
      // Track bounce behavior
      if (!isGoodPerformance || pageLoadTime > 5000) {
        bounceRate.add(1);
        return; // User bounces
      } else {
        bounceRate.add(0);
      }
    });
    
    // Simulate user journey through platform
    let currentPage = 0;
    let hasConverted = false;
    
    while (Date.now() < sessionEndTime && currentPage < pageViews) {
      const featureUsed = simulateUserFeature(userType, behavior);
      
      if (featureUsed) {
        featureUsageRate.add(1);
        
        // Check for conversion events
        if (!hasConverted && checkConversionEvent(userType, featureUsed)) {
          conversionRate.add(1);
          hasConverted = true;
        }
      } else {
        featureUsageRate.add(0);
      }
      
      currentPage++;
      
      // Realistic pause between pages
      sleep(randomBetween(1, 5));
    }
    
    // Track conversion if user completed session without converting
    if (!hasConverted) {
      conversionRate.add(0);
    }
  });
}

function simulateUserFeature(userType, behavior) {
  const features = behavior.features;
  const randomFeature = features[Math.floor(Math.random() * features.length)];
  
  group(`Feature: ${randomFeature}`, () => {
    const featureStartTime = Date.now();
    let success = false;
    
    switch (randomFeature) {
      case 'rsvp_form':
        success = simulateRSVPForm();
        break;
      case 'venue_search':
        success = simulateVenueSearch();
        break;
      case 'vendor_browsing':
        success = simulateVendorBrowsing();
        break;
      case 'photo_uploads':
        success = simulatePhotoUpload();
        break;
      case 'realtime_updates':
        success = simulateRealtimeUpdates();
        break;
      case 'timeline_planning':
        success = simulateTimelinePlanning();
        break;
      case 'budget_tracking':
        success = simulateBudgetTracking();
        break;
      default:
        success = simulateGenericInteraction(randomFeature);
    }
    
    const featureTime = Date.now() - featureStartTime;
    userInteractionLatency.add(featureTime);
    
    return success;
  });
}

function simulateRSVPForm() {
  group('RSVP Form Completion', () => {
    const formStartTime = Date.now();
    
    // Simulate form field interactions
    sleep(randomBetween(10, 30) / 1000); // Reading form
    
    // Submit RSVP
    const response = http.post(`${BASE_URL}/api/rsvp`, JSON.stringify({
      guestName: 'John Doe',
      attending: 'yes',
      plusOne: 'yes',
      dietaryRestrictions: 'vegetarian',
      mealChoice: 'chicken',
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
    
    const formTime = Date.now() - formStartTime;
    formSubmissionTime.add(formTime);
    
    const success = check(response, {
      'RSVP submission successful': (r) => r.status === 200 || r.status === 201,
      'RSVP response time good': (r) => r.timings.duration < 2000,
    });
    
    if (success) {
      rsvpCompletionRate.add(1);
    } else {
      rsvpCompletionRate.add(0);
      errorEncounteredRate.add(1);
    }
    
    return success;
  });
}

function simulateVenueSearch() {
  group('Venue Search', () => {
    const searchStartTime = Date.now();
    
    const response = http.get(`${BASE_URL}/api/venues/search?location=New York&capacity=150&budget=15000`);
    
    const searchTime = Date.now() - searchStartTime;
    searchQueryTime.add(searchTime);
    
    return check(response, {
      'venue search successful': (r) => r.status === 200,
      'venue search response time': (r) => r.timings.duration < 1500,
      'venues returned': (r) => {
        try {
          const data = r.json();
          return data.venues && Array.isArray(data.venues);
        } catch (e) {
          return false;
        }
      }
    });
  });
}

function simulateVendorBrowsing() {
  group('Vendor Directory Browsing', () => {
    const browseStartTime = Date.now();
    
    // Browse vendor categories
    const response = http.get(`${BASE_URL}/api/vendors?category=photography&rating=4+`);
    
    const success = check(response, {
      'vendor directory loads': (r) => r.status === 200,
      'vendor response time': (r) => r.timings.duration < 1200,
    });
    
    // Simulate vendor booking attempt
    if (success && Math.random() > 0.3) {
      sleep(randomBetween(5, 15) / 1000); // User reviews vendor
      
      const bookingResponse = http.post(`${BASE_URL}/api/vendors/booking`, JSON.stringify({
        vendorId: Math.floor(Math.random() * 100) + 1,
        weddingDate: '2024-06-15',
        services: ['ceremony', 'reception'],
        budget: 3000,
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (check(bookingResponse, { 'vendor booking successful': (r) => r.status < 400 })) {
        vendorBookingSuccess.add(1);
      } else {
        vendorBookingSuccess.add(0);
      }
    }
    
    return success;
  });
}

function simulatePhotoUpload() {
  group('Photo Upload', () => {
    const uploadStartTime = Date.now();
    
    // Simulate photo upload (mock data)
    const mockPhotoData = 'x'.repeat(1024 * 1024 * 2); // 2MB mock photo
    
    const response = http.post(`${BASE_URL}/api/photos/upload`, {
      photo: http.file(mockPhotoData, 'wedding-photo.jpg', 'image/jpeg'),
      weddingId: '123',
      category: 'ceremony',
    });
    
    const uploadTime = Date.now() - uploadStartTime;
    const uploadSpeed = (2 * 1024 * 1024) / (uploadTime / 1000); // bytes per second
    photoUploadSpeed.add(uploadSpeed);
    
    const success = check(response, {
      'photo upload successful': (r) => r.status === 200 || r.status === 201,
      'photo upload time reasonable': (r) => r.timings.duration < 10000, // 10s max
    });
    
    if (success) {
      photoSharingEngagement.add(1);
    } else {
      photoSharingEngagement.add(0);
      errorEncounteredRate.add(1);
    }
    
    return success;
  });
}

function simulateRealtimeUpdates() {
  group('Real-time Updates', () => {
    const realtimeStartTime = Date.now();
    
    // Check real-time status endpoint
    const statusResponse = http.get(`${BASE_URL}/api/realtime/status`);
    
    // Simulate receiving real-time update
    const updateResponse = http.get(`${BASE_URL}/api/realtime/updates/latest`);
    
    const realtimeLatency = Date.now() - realtimeStartTime;
    realTimeUpdateLatency.add(realtimeLatency);
    
    return check(updateResponse, {
      'real-time update received': (r) => r.status === 200,
      'real-time latency acceptable': (r) => r.timings.duration < 1000,
    });
  });
}

function simulateTimelinePlanning() {
  group('Timeline Planning', () => {
    const timelineResponse = http.get(`${BASE_URL}/api/timeline/wedding/123`);
    
    const success = check(timelineResponse, {
      'timeline loads successfully': (r) => r.status === 200,
      'timeline data present': (r) => {
        try {
          const data = r.json();
          return data.events && Array.isArray(data.events);
        } catch (e) {
          return false;
        }
      }
    });
    
    if (success) {
      timelineInteractionRate.add(1);
      
      // Simulate timeline update
      const updateResponse = http.put(`${BASE_URL}/api/timeline/event/456`, JSON.stringify({
        startTime: '14:00',
        duration: 60,
        status: 'confirmed',
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
      
      check(updateResponse, {
        'timeline update successful': (r) => r.status === 200,
      });
    } else {
      timelineInteractionRate.add(0);
    }
    
    return success;
  });
}

function simulateBudgetTracking() {
  group('Budget Tracking', () => {
    const budgetResponse = http.get(`${BASE_URL}/api/budget/wedding/123`);
    
    return check(budgetResponse, {
      'budget loads successfully': (r) => r.status === 200,
      'budget data complete': (r) => {
        try {
          const data = r.json();
          return data.totalBudget && data.categories;
        } catch (e) {
          return false;
        }
      }
    });
  });
}

function simulateGenericInteraction(feature) {
  const response = http.get(`${BASE_URL}/api/${feature.replace('_', '/')}`);
  return check(response, {
    [`${feature} interaction successful`]: (r) => r.status < 400,
  });
}

function checkConversionEvent(userType, feature) {
  const conversionEvents = {
    couple: ['vendor_booking', 'timeline_planning', 'budget_tracking'],
    guest: ['rsvp_form'],
    vendor: ['event_management', 'client_communication'],
    wedding_day_coordinator: ['realtime_updates', 'issue_resolution']
  };
  
  return conversionEvents[userType]?.includes(feature) && Math.random() > 0.3;
}

function calculateUserSatisfaction(sessionDuration, userType) {
  // Calculate satisfaction score based on performance and user type
  let baseScore = 5.0; // Start with perfect score
  
  // Penalize for slow page loads
  if (pageViewDuration.avg > 3000) baseScore -= 1.0;
  if (pageViewDuration.avg > 5000) baseScore -= 1.0;
  
  // Penalize for errors
  if (errorEncounteredRate.rate > 0.05) baseScore -= 1.5;
  
  // Penalize for slow interactions
  if (userInteractionLatency.avg > 500) baseScore -= 0.5;
  
  // Bonus for expected user behavior
  const expectedDuration = USER_BEHAVIORS[userType].sessionDuration;
  if (sessionDuration >= expectedDuration.min * 1000) baseScore += 0.5;
  
  return Math.max(1.0, Math.min(5.0, baseScore));
}

function randomBetween(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function teardown(data) {
  console.log('Real User Monitoring Simulation Completed');
  console.log('=======================================');
  console.log(`Average session duration: ${Math.round((userSessionDuration.avg || 0)/1000)}s`);
  console.log(`Average page view duration: ${Math.round(pageViewDuration.avg || 0)}ms`);
  console.log(`Average user interaction latency: ${Math.round(userInteractionLatency.avg || 0)}ms`);
  console.log(`Bounce rate: ${Math.round((bounceRate.rate || 0) * 100)}%`);
  console.log(`Conversion rate: ${Math.round((conversionRate.rate || 0) * 100)}%`);
  console.log(`RSVP completion rate: ${Math.round((rsvpCompletionRate.rate || 0) * 100)}%`);
  console.log(`Vendor booking success: ${Math.round((vendorBookingSuccess.rate || 0) * 100)}%`);
  console.log(`Error rate: ${Math.round((errorEncounteredRate.rate || 0) * 100)}%`);
  console.log(`User satisfaction score: ${(userSatisfactionScore.value || 0).toFixed(1)}/5.0`);
}