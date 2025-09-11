// WS-193 Integration Performance Tests - End-to-End Wedding Workflow Load Testing
// Team C - Integration Performance Testing Focus

import { check, group } from 'k6';
import http from 'k6/http';
import ws from 'k6/ws';
import { Trend, Counter, Rate } from 'k6/metrics';
import { generateWeddingTestData, authenticateSupplier, authenticateCouple } from './framework/test-data-generator.js';

// Performance Metrics
const workflowDuration = new Trend('wedding_workflow_duration');
const supplierImportDuration = new Trend('supplier_import_duration');
const realtimeLatency = new Trend('realtime_propagation_latency');
const integrationFailures = new Counter('integration_failures');
const webhookDeliveryRate = new Rate('webhook_delivery_success_rate');

// Load Testing Configuration for Wedding Season Peaks
export let options = {
  scenarios: {
    // Peak wedding season scenario (10x normal load)
    wedding_peak_season: {
      executor: 'ramping-vus',
      startVUs: 10,
      stages: [
        { duration: '2m', target: 50 },    // Normal wedding season load
        { duration: '1m', target: 500 },   // Bridal show spike (10x)
        { duration: '5m', target: 500 },   // Sustained peak load
        { duration: '2m', target: 50 },    // Return to normal
        { duration: '1m', target: 0 },     // Cool down
      ],
      env: { SCENARIO: 'peak_season' }
    },
    
    // Saturday wedding coordination load
    saturday_wedding_load: {
      executor: 'constant-vus',
      vus: 100, // 100 concurrent weddings
      duration: '10m',
      env: { SCENARIO: 'saturday_coordination' }
    },
    
    // Vendor mass onboarding scenario
    vendor_onboarding_surge: {
      executor: 'ramping-arrival-rate',
      startRate: 5,
      timeUnit: '1s',
      preAllocatedVUs: 50,
      maxVUs: 200,
      stages: [
        { duration: '3m', target: 10 },  // Normal onboarding
        { duration: '2m', target: 50 },  // Conference/show surge
        { duration: '3m', target: 10 },  // Back to normal
      ],
      env: { SCENARIO: 'vendor_onboarding' }
    }
  },
  
  // Performance Thresholds (Wedding Industry SLAs)
  thresholds: {
    // Critical wedding day operations
    'http_req_duration{name:wedding_critical}': ['p(95)<500'],
    'http_req_duration{name:form_submission}': ['p(95)<2000'],
    'http_req_duration{name:supplier_import}': ['p(95)<10000'],
    
    // End-to-end workflow performance
    'wedding_workflow_duration': ['p(95)<10000'], // Complete workflow <10s under load
    'realtime_propagation_latency': ['p(95)<1000'], // Real-time updates <1s
    
    // Reliability requirements
    'http_req_failed': ['rate<0.01'], // 99% success rate
    'webhook_delivery_success_rate': ['rate>0.999'], // 99.9% webhook reliability
    'integration_failures': ['count<10'], // Maximum 10 integration failures
    
    // Database performance
    'http_req_duration{name:db_query}': ['p(95)<200'],
  },
  
  // Test environment configuration
  ext: {
    loadimpact: {
      name: 'WS-193 Integration Performance Tests',
      projectID: 3699747,
      note: 'Wedding workflow integration performance under peak loads'
    }
  }
};

// Main test function - simulates realistic wedding workflows
export default function() {
  const scenario = __ENV.SCENARIO || 'peak_season';
  
  switch (scenario) {
    case 'peak_season':
      return executeWeddingWorkflowLoad();
    case 'saturday_coordination':
      return executeSaturdayWeddingLoad();
    case 'vendor_onboarding':
      return executeVendorOnboardingLoad();
    default:
      return executeWeddingWorkflowLoad();
  }
}

// Core Wedding Workflow Performance Test
function executeWeddingWorkflowLoad() {
  const workflowStartTime = Date.now();
  
  group('Complete Wedding Workflow Performance', function() {
    // Generate synthetic wedding test data (GDPR compliant)
    const testData = generateWeddingTestData();
    
    // PHASE 1: Supplier creates intake form (Photography consultation)
    group('Supplier Form Creation', function() {
      const supplierAuth = authenticateSupplier();
      
      const formPayload = {
        title: 'Wedding Photography Consultation',
        description: 'Initial consultation for wedding photography services',
        fields: [
          { type: 'text', label: 'Wedding Date', required: true },
          { type: 'text', label: 'Venue Name', required: true },
          { type: 'number', label: 'Guest Count', required: true },
          { type: 'select', label: 'Photography Style', 
            options: ['Traditional', 'Photojournalistic', 'Fine Art', 'Modern'] },
          { type: 'textarea', label: 'Special Requests', required: false },
          { type: 'text', label: 'Budget Range', required: true },
          { type: 'email', label: 'Contact Email', required: true }
        ]
      };
      
      const formResponse = http.post('/api/forms/intake', formPayload, {
        headers: { 
          'Authorization': supplierAuth,
          'Content-Type': 'application/json'
        },
        tags: { name: 'form_creation' }
      });
      
      check(formResponse, {
        'form creation successful': (r) => r.status === 201,
        'form creation under 2s': (r) => r.timings.duration < 2000,
        'form has valid ID': (r) => r.json('id') !== null
      });
      
      if (formResponse.status !== 201) {
        integrationFailures.add(1);
        return;
      }
      
      var formId = formResponse.json('id');
    });
    
    // PHASE 2: Couple connects to supplier
    group('Couple Connection & Form Access', function() {
      const coupleAuth = authenticateCouple();
      
      const connectionPayload = {
        supplier_form_id: formId,
        wedding_date: testData.weddingDate,
        venue: testData.venue,
        couple_name: testData.coupleName
      };
      
      const connectionResponse = http.post('/api/connections/supplier', connectionPayload, {
        headers: { 
          'Authorization': coupleAuth,
          'Content-Type': 'application/json'
        },
        tags: { name: 'couple_connection' }
      });
      
      check(connectionResponse, {
        'connection successful': (r) => r.status === 201,
        'connection under 1s': (r) => r.timings.duration < 1000,
        'connection has valid ID': (r) => r.json('connection_id') !== null
      });
      
      if (connectionResponse.status !== 201) {
        integrationFailures.add(1);
        return;
      }
      
      var connectionId = connectionResponse.json('connection_id');
    });
    
    // PHASE 3: Form submission with journey automation
    group('Form Submission & Journey Trigger', function() {
      const coupleAuth = authenticateCouple();
      
      const submissionPayload = {
        responses: {
          'Wedding Date': testData.weddingDate,
          'Venue Name': testData.venue,
          'Guest Count': testData.guestCount,
          'Photography Style': 'Photojournalistic',
          'Special Requests': 'We love candid moments and natural lighting',
          'Budget Range': '$3000-$5000',
          'Contact Email': testData.email
        },
        connection_id: connectionId
      };
      
      const submissionResponse = http.post(`/api/forms/${formId}/submit`, submissionPayload, {
        headers: { 
          'Authorization': coupleAuth,
          'Content-Type': 'application/json'
        },
        tags: { name: 'form_submission' }
      });
      
      check(submissionResponse, {
        'submission successful': (r) => r.status === 201,
        'submission under 2s': (r) => r.timings.duration < 2000,
        'journey triggered': (r) => r.json('journey_triggered') === true,
        'webhook queued': (r) => r.json('webhook_queued') === true
      });
      
      if (submissionResponse.status === 201) {
        webhookDeliveryRate.add(1);
      } else {
        webhookDeliveryRate.add(0);
        integrationFailures.add(1);
      }
      
      var submissionId = submissionResponse.json('submission_id');
    });
    
    // PHASE 4: Real-time update propagation testing
    group('Real-time Update Propagation', function() {
      const supplierAuth = authenticateSupplier();
      const realtimeStartTime = Date.now();
      
      // Check for real-time status update
      const statusResponse = http.get(`/api/realtime/submissions/${submissionId}/status`, {
        headers: { 'Authorization': supplierAuth },
        tags: { name: 'realtime_check' }
      });
      
      const propagationLatency = Date.now() - realtimeStartTime;
      realtimeLatency.add(propagationLatency);
      
      check(statusResponse, {
        'realtime status available': (r) => r.status === 200,
        'status synchronized': (r) => r.json('status') === 'submitted',
        'realtime update under 1s': (r) => propagationLatency < 1000
      });
    });
    
    // PHASE 5: Third-party integration performance
    group('Third-Party Integration Load', function() {
      // Simulate calendar integration
      const calendarResponse = http.post('/api/integrations/calendar/schedule', {
        supplier_id: 'perf-test-supplier',
        couple_id: 'perf-test-couple',
        event_type: 'consultation',
        preferred_times: ['2025-09-15T14:00:00Z', '2025-09-15T16:00:00Z'],
        wedding_date: testData.weddingDate
      }, {
        tags: { name: 'calendar_integration' }
      });
      
      check(calendarResponse, {
        'calendar integration successful': (r) => r.status === 201,
        'calendar scheduling under 3s': (r) => r.timings.duration < 3000
      });
      
      // Simulate email automation
      const emailResponse = http.post('/api/communications/automated', {
        template: 'consultation_scheduled',
        recipients: [testData.email],
        data: {
          couple_name: testData.coupleName,
          wedding_date: testData.weddingDate,
          venue: testData.venue
        }
      }, {
        tags: { name: 'email_integration' }
      });
      
      check(emailResponse, {
        'email automation successful': (r) => r.status === 202,
        'email queued under 2s': (r) => r.timings.duration < 2000
      });
    });
  });
  
  // Record complete workflow duration
  const workflowTotalTime = Date.now() - workflowStartTime;
  workflowDuration.add(workflowTotalTime);
  
  // Validate overall workflow performance
  check(null, {
    'complete workflow under 10s under load': () => workflowTotalTime < 10000,
    'complete workflow under 5s normal load': () => __VU <= 50 ? workflowTotalTime < 5000 : true
  });
}

// Saturday Wedding Coordination Load Test
function executeSaturdayWeddingLoad() {
  group('Saturday Wedding Coordination Load', function() {
    const weddingId = `wedding-${__VU}`;
    
    // Simulate real-time coordination between vendors
    const wsUrl = 'ws://localhost:3000/api/realtime/wedding/coordination';
    
    const res = ws.connect(wsUrl, {}, function (socket) {
      socket.on('open', () => {
        // Join wedding coordination room
        socket.send(JSON.stringify({
          event: 'join_wedding',
          wedding_id: weddingId,
          user_type: 'supplier',
          timestamp: Date.now()
        }));
        
        // Send status updates
        const updates = [
          'setup_started',
          'equipment_ready',
          'ceremony_beginning',
          'reception_started',
          'photography_complete'
        ];
        
        updates.forEach((status, index) => {
          setTimeout(() => {
            const sendTime = Date.now();
            socket.send(JSON.stringify({
              event: 'status_update',
              wedding_id: weddingId,
              status: status,
              timestamp: sendTime
            }));
          }, index * 2000); // Send updates every 2 seconds
        });
      });
      
      socket.on('message', (data) => {
        const message = JSON.parse(data);
        const latency = Date.now() - message.timestamp;
        realtimeLatency.add(latency);
        
        check(null, {
          'wedding coordination message received': () => true,
          'coordination latency under 1s': () => latency < 1000
        });
      });
      
      socket.setTimeout(() => {
        socket.close();
      }, 30000); // Close after 30 seconds
    });
    
    // Test critical wedding day API endpoints
    const criticalEndpoints = [
      '/api/wedding/timeline',
      '/api/wedding/status',
      '/api/vendors/active',
      '/api/communication/urgent'
    ];
    
    criticalEndpoints.forEach(endpoint => {
      const response = http.get(endpoint, {
        tags: { name: 'wedding_critical' }
      });
      
      check(response, {
        [`${endpoint} available`]: (r) => r.status === 200,
        [`${endpoint} under 500ms`]: (r) => r.timings.duration < 500
      });
    });
  });
}

// Vendor Onboarding Surge Test
function executeVendorOnboardingLoad() {
  group('Vendor Mass Onboarding Performance', function() {
    const supplierAuth = authenticateSupplier();
    const importStartTime = Date.now();
    
    // Simulate bulk client import (Tave integration)
    const importPayload = {
      source: 'tave',
      batch_size: 50, // Import 50 clients at a time
      client_data: generateBulkClientData(50)
    };
    
    const importResponse = http.post('/api/integrations/tave/bulk-import', importPayload, {
      headers: { 'Authorization': supplierAuth },
      tags: { name: 'supplier_import' }
    });
    
    const importDuration = Date.now() - importStartTime;
    supplierImportDuration.add(importDuration);
    
    check(importResponse, {
      'bulk import initiated': (r) => r.status === 202,
      'import response under 5s': (r) => r.timings.duration < 5000,
      'import job queued': (r) => r.json('job_id') !== null
    });
    
    // Test supplier marketplace listing performance
    const listingResponse = http.post('/api/marketplace/listings', {
      title: 'Professional Wedding Photography',
      description: 'Capturing your special moments with artistic flair',
      services: ['photography', 'engagement_shoots'],
      pricing_tier: 'professional',
      location: 'Greater Manchester'
    }, {
      headers: { 'Authorization': supplierAuth },
      tags: { name: 'marketplace_listing' }
    });
    
    check(listingResponse, {
      'marketplace listing created': (r) => r.status === 201,
      'listing creation under 2s': (r) => r.timings.duration < 2000
    });
  });
}

// Helper function to generate bulk client data for import testing
function generateBulkClientData(count) {
  const clients = [];
  for (let i = 0; i < count; i++) {
    clients.push({
      name: `TestClient${i + 1000}`,
      email: `testclient${i}@wedsync-testing.com`,
      wedding_date: '2025-08-15',
      status: 'inquiry',
      source: 'tave_import'
    });
  }
  return clients;
}

// Setup function - runs once before tests
export function setup() {
  console.log('WS-193 Integration Performance Tests Starting');
  console.log('Testing wedding workflow performance under peak loads');
  
  // Validate test environment
  const healthCheck = http.get('/api/health');
  if (healthCheck.status !== 200) {
    throw new Error('Application not ready for performance testing');
  }
  
  return {
    timestamp: Date.now(),
    environment: 'performance-test'
  };
}

// Teardown function - runs once after all tests
export function teardown(data) {
  console.log('WS-193 Integration Performance Tests Completed');
  console.log(`Test duration: ${(Date.now() - data.timestamp) / 1000}s`);
  
  // Trigger cleanup of performance test data
  http.post('/api/performance-test/cleanup', {
    test_session: data.timestamp,
    environment: data.environment
  });
}