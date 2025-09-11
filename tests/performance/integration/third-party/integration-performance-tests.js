// WS-193 Third-Party Integration Performance Tests
// Team C - Integration Performance Testing Focus

import { check, group } from 'k6';
import http from 'k6/http';
import { Trend, Counter, Rate } from 'k6/metrics';
import { generateWeddingTestData, generateSupplierTestData, generateCalendarEventData } from '../framework/test-data-generator.js';

// Third-Party Integration Metrics
const taveIntegrationLatency = new Trend('tave_integration_latency');
const stripePaymentLatency = new Trend('stripe_payment_latency');
const emailServiceLatency = new Trend('email_service_latency');
const calendarIntegrationLatency = new Trend('calendar_integration_latency');
const webhookDeliveryLatency = new Trend('webhook_delivery_latency');

const integrationFailureRate = new Rate('integration_failure_rate');
const fallbackActivationRate = new Rate('fallback_activation_rate');
const retrySuccessRate = new Rate('retry_success_rate');

// Third-Party Integration Load Testing Configuration
export let options = {
  scenarios: {
    // Tave integration performance under load
    tave_integration_load: {
      executor: 'constant-arrival-rate',
      rate: 20, // 20 requests per second
      timeUnit: '1s',
      duration: '5m',
      preAllocatedVUs: 10,
      maxVUs: 50,
      env: { INTEGRATION: 'tave' }
    },
    
    // Stripe payment processing performance
    stripe_payment_load: {
      executor: 'ramping-vus',
      startVUs: 5,
      stages: [
        { duration: '2m', target: 20 },  // Month-end billing surge
        { duration: '3m', target: 20 },  // Sustained load
        { duration: '1m', target: 0 },   // Cool down
      ],
      env: { INTEGRATION: 'stripe' }
    },
    
    // Email service performance
    email_automation_load: {
      executor: 'constant-vus',
      vus: 15,
      duration: '4m',
      env: { INTEGRATION: 'email' }
    },
    
    // Calendar integration performance
    calendar_scheduling_load: {
      executor: 'ramping-arrival-rate',
      startRate: 10,
      timeUnit: '1s',
      preAllocatedVUs: 15,
      stages: [
        { duration: '1m', target: 10 },  // Normal scheduling
        { duration: '2m', target: 30 },  // Bridal show surge
        { duration: '1m', target: 10 },  // Back to normal
      ],
      env: { INTEGRATION: 'calendar' }
    }
  },
  
  // Third-Party Integration Performance Thresholds
  thresholds: {
    // Individual integration SLAs
    'tave_integration_latency': ['p(95)<10000'], // Tave client import <10s
    'stripe_payment_latency': ['p(95)<3000'],    // Stripe payment <3s
    'email_service_latency': ['p(95)<2000'],     // Email sending <2s
    'calendar_integration_latency': ['p(95)<3000'], // Calendar scheduling <3s
    'webhook_delivery_latency': ['p(95)<1000'],  // Webhook delivery <1s
    
    // Reliability requirements
    'integration_failure_rate': ['rate<0.05'],   // <5% integration failures
    'fallback_activation_rate': ['rate>0.8'],    // >80% fallback success when needed
    'retry_success_rate': ['rate>0.9'],          // >90% retry success rate
    
    // Overall integration health
    'http_req_failed{integration:true}': ['rate<0.02'], // <2% integration HTTP failures
  }
};

export default function() {
  const integration = __ENV.INTEGRATION;
  
  switch (integration) {
    case 'tave':
      return testTaveIntegrationPerformance();
    case 'stripe':
      return testStripePaymentPerformance();
    case 'email':
      return testEmailServicePerformance();
    case 'calendar':
      return testCalendarIntegrationPerformance();
    default:
      return testAllIntegrationsBasic();
  }
}

// Tave Integration Performance Testing
function testTaveIntegrationPerformance() {
  group('Tave Integration Performance', function() {
    const supplierData = generateSupplierTestData();
    const clientData = generateBulkClientData(25); // Import 25 clients
    
    // Test bulk client import performance
    group('Bulk Client Import', function() {
      const importStart = Date.now();
      
      const importResponse = http.post('/api/integrations/tave/bulk-import', {
        supplier_id: supplierData.supplierName,
        import_source: 'tave',
        client_data: clientData,
        batch_size: 25
      }, {
        headers: {
          'Authorization': `Bearer tave_perf_test_token`,
          'Content-Type': 'application/json'
        },
        tags: { integration: 'true', service: 'tave' },
        timeout: '15s' // Allow time for bulk import
      });
      
      const importLatency = Date.now() - importStart;
      taveIntegrationLatency.add(importLatency);
      
      const importSuccess = check(importResponse, {
        'tave import accepted': (r) => r.status === 202,
        'tave import under 10s': (r) => importLatency < 10000,
        'import job queued': (r) => r.json('job_id') !== null,
        'batch size respected': (r) => r.json('batch_size') === 25
      });
      
      if (!importSuccess) {
        integrationFailureRate.add(1);
      } else {
        integrationFailureRate.add(0);
      }
    });
    
    // Test Tave API rate limiting and fallback
    group('Rate Limiting & Fallback', function() {
      const rateLimitStart = Date.now();
      
      // Attempt rapid requests to test rate limiting
      const rapidRequests = [];
      for (let i = 0; i < 15; i++) { // Send 15 requests rapidly
        rapidRequests.push(
          http.get('/api/integrations/tave/client-status', {
            headers: { 'Authorization': `Bearer tave_perf_test_token` },
            tags: { integration: 'true', service: 'tave', test: 'rate_limit' }
          })
        );
      }
      
      const rateLimitedRequests = rapidRequests.filter(r => r.status === 429).length;
      const fallbackActivated = rapidRequests.filter(r => 
        r.json('fallback_used') === true
      ).length;
      
      if (fallbackActivated > 0) {
        fallbackActivationRate.add(1);
      } else {
        fallbackActivationRate.add(0);
      }
      
      check(null, {
        'tave rate limiting enforced': () => rateLimitedRequests > 0,
        'tave fallback activated': () => fallbackActivated > 0,
        'rate limit test completed': () => true
      });
    });
    
    // Test Tave timeout handling
    group('Timeout & Retry Logic', function() {
      const timeoutResponse = http.get('/api/integrations/tave/clients', {
        headers: { 
          'Authorization': `Bearer tave_perf_test_token`,
          'X-Test-Timeout': '8000' // Simulate slow Tave response
        },
        tags: { integration: 'true', service: 'tave', test: 'timeout' },
        timeout: '5s' // Force timeout
      });
      
      const retryResponse = http.get('/api/integrations/tave/clients/retry', {
        headers: { 'Authorization': `Bearer tave_perf_test_token` },
        tags: { integration: 'true', service: 'tave', test: 'retry' }
      });
      
      const retrySuccess = check(retryResponse, {
        'tave retry successful': (r) => r.status === 200,
        'retry includes cached data': (r) => r.json('cached_data') === true,
        'retry under 3s': (r) => r.timings.duration < 3000
      });
      
      if (retrySuccess) {
        retrySuccessRate.add(1);
      } else {
        retrySuccessRate.add(0);
      }
    });
  });
}

// Stripe Payment Performance Testing  
function testStripePaymentPerformance() {
  group('Stripe Payment Performance', function() {
    const supplierData = generateSupplierTestData();
    
    // Test payment processing performance
    group('Payment Processing', function() {
      const paymentStart = Date.now();
      
      const paymentResponse = http.post('/api/stripe/create-checkout-session', {
        price_id: 'price_test_professional_monthly',
        supplier_id: supplierData.supplierName,
        success_url: 'https://wedsync.com/success',
        cancel_url: 'https://wedsync.com/cancel'
      }, {
        headers: {
          'Authorization': `Bearer ${generateSupplierAuth()}`,
          'Content-Type': 'application/json'
        },
        tags: { integration: 'true', service: 'stripe', operation: 'payment' }
      });
      
      const paymentLatency = Date.now() - paymentStart;
      stripePaymentLatency.add(paymentLatency);
      
      const paymentSuccess = check(paymentResponse, {
        'stripe session created': (r) => r.status === 200,
        'payment processing under 3s': (r) => paymentLatency < 3000,
        'checkout url provided': (r) => r.json('checkout_url') !== null,
        'session id valid': (r) => r.json('session_id').startsWith('cs_test_')
      });
      
      if (!paymentSuccess) {
        integrationFailureRate.add(1);
      } else {
        integrationFailureRate.add(0);
      }
    });
    
    // Test webhook processing performance
    group('Webhook Processing', function() {
      const webhookStart = Date.now();
      
      const webhookPayload = {
        id: `evt_test_${Math.floor(Math.random() * 10000)}`,
        type: 'checkout.session.completed',
        data: {
          object: {
            id: 'cs_test_webhook_performance',
            payment_status: 'paid',
            customer_email: `test.supplier@wedsync-testing.com`,
            amount_total: 4900, // £49 professional plan
            currency: 'gbp'
          }
        },
        created: Math.floor(Date.now() / 1000)
      };
      
      const webhookResponse = http.post('/api/stripe/webhook', JSON.stringify(webhookPayload), {
        headers: {
          'Content-Type': 'application/json',
          'Stripe-Signature': 'test_signature_for_performance_testing'
        },
        tags: { integration: 'true', service: 'stripe', operation: 'webhook' }
      });
      
      const webhookLatency = Date.now() - webhookStart;
      webhookDeliveryLatency.add(webhookLatency);
      
      check(webhookResponse, {
        'stripe webhook processed': (r) => r.status === 200,
        'webhook processing under 1s': (r) => webhookLatency < 1000,
        'idempotency handled': (r) => r.json('processed') === true
      });
    });
    
    // Test subscription management performance
    group('Subscription Management', function() {
      const subscriptionResponse = http.get('/api/stripe/subscription/status', {
        headers: { 'Authorization': `Bearer ${generateSupplierAuth()}` },
        tags: { integration: 'true', service: 'stripe', operation: 'subscription' }
      });
      
      check(subscriptionResponse, {
        'subscription status retrieved': (r) => r.status === 200,
        'subscription data complete': (r) => r.json('status') !== null,
        'billing info available': (r) => r.json('next_billing_date') !== null
      });
    });
  });
}

// Email Service Performance Testing
function testEmailServicePerformance() {
  group('Email Service Performance', function() {
    const weddingData = generateWeddingTestData();
    
    // Test automated journey email performance
    group('Journey Automation Emails', function() {
      const emailStart = Date.now();
      
      const journeyEmailResponse = http.post('/api/communications/journey/trigger', {
        template: 'consultation_scheduled',
        recipient_email: weddingData.email,
        wedding_data: {
          couple_name: weddingData.coupleName,
          wedding_date: weddingData.weddingDate,
          venue: weddingData.venue
        },
        journey_step: 'initial_consultation',
        supplier_id: 'perf_test_supplier'
      }, {
        headers: { 'Content-Type': 'application/json' },
        tags: { integration: 'true', service: 'email', type: 'journey' }
      });
      
      const emailLatency = Date.now() - emailStart;
      emailServiceLatency.add(emailLatency);
      
      check(journeyEmailResponse, {
        'journey email queued': (r) => r.status === 202,
        'email queueing under 2s': (r) => emailLatency < 2000,
        'message id provided': (r) => r.json('message_id') !== null,
        'delivery scheduled': (r) => r.json('scheduled_delivery') !== null
      });
    });
    
    // Test bulk email performance
    group('Bulk Email Sending', function() {
      const bulkEmailStart = Date.now();
      
      // Generate multiple recipient data
      const recipients = [];
      for (let i = 0; i < 50; i++) {
        recipients.push({
          email: `bulk.test.${i}@wedsync-testing.com`,
          name: `BulkTestRecipient${i}`,
          wedding_date: weddingData.weddingDate
        });
      }
      
      const bulkEmailResponse = http.post('/api/communications/bulk-send', {
        template: 'wedding_reminder',
        recipients: recipients,
        sender: 'noreply@wedsync-testing.com',
        batch_size: 10 // Send in batches of 10
      }, {
        headers: { 'Content-Type': 'application/json' },
        tags: { integration: 'true', service: 'email', type: 'bulk' },
        timeout: '10s'
      });
      
      const bulkEmailLatency = Date.now() - bulkEmailStart;
      
      check(bulkEmailResponse, {
        'bulk email accepted': (r) => r.status === 202,
        'bulk processing under 5s': (r) => bulkEmailLatency < 5000,
        'batch count correct': (r) => r.json('batches_created') === 5,
        'delivery tracking enabled': (r) => r.json('tracking_enabled') === true
      });
    });
    
    // Test email delivery status tracking
    group('Delivery Status Tracking', function() {
      const statusResponse = http.get('/api/communications/delivery-status', {
        headers: { 'Authorization': `Bearer ${generateSupplierAuth()}` },
        tags: { integration: 'true', service: 'email', type: 'status' }
      });
      
      check(statusResponse, {
        'delivery status available': (r) => r.status === 200,
        'bounce rate tracked': (r) => r.json('bounce_rate') !== undefined,
        'delivery rate tracked': (r) => r.json('delivery_rate') !== undefined,
        'open rate tracked': (r) => r.json('open_rate') !== undefined
      });
    });
  });
}

// Calendar Integration Performance Testing
function testCalendarIntegrationPerformance() {
  group('Calendar Integration Performance', function() {
    const calendarData = generateCalendarEventData();
    
    // Test appointment scheduling performance
    group('Appointment Scheduling', function() {
      const scheduleStart = Date.now();
      
      const scheduleResponse = http.post('/api/integrations/calendar/schedule', {
        title: calendarData.title,
        start_time: calendarData.start_time,
        end_time: calendarData.end_time,
        attendees: calendarData.attendees,
        location: calendarData.location,
        description: calendarData.description,
        calendar_provider: 'google',
        timezone: 'Europe/London'
      }, {
        headers: {
          'Authorization': `Bearer ${generateSupplierAuth()}`,
          'Content-Type': 'application/json'
        },
        tags: { integration: 'true', service: 'calendar', operation: 'schedule' }
      });
      
      const scheduleLatency = Date.now() - scheduleStart;
      calendarIntegrationLatency.add(scheduleLatency);
      
      check(scheduleResponse, {
        'calendar event created': (r) => r.status === 201,
        'scheduling under 3s': (r) => scheduleLatency < 3000,
        'event id provided': (r) => r.json('event_id') !== null,
        'calendar link available': (r) => r.json('calendar_link') !== null,
        'meeting room booked': (r) => r.json('meeting_url') !== null
      });
    });
    
    // Test calendar availability checking
    group('Availability Checking', function() {
      const availabilityResponse = http.post('/api/integrations/calendar/availability', {
        supplier_id: 'perf_test_supplier',
        date_range: {
          start: '2025-09-01',
          end: '2025-09-30'
        },
        duration_minutes: 60,
        business_hours_only: true
      }, {
        headers: { 'Authorization': `Bearer ${generateSupplierAuth()}` },
        tags: { integration: 'true', service: 'calendar', operation: 'availability' }
      });
      
      check(availabilityResponse, {
        'availability retrieved': (r) => r.status === 200,
        'available slots provided': (r) => Array.isArray(r.json('available_slots')),
        'business hours respected': (r) => r.json('business_hours_applied') === true,
        'timezone handled': (r) => r.json('timezone') === 'Europe/London'
      });
    });
    
    // Test calendar sync performance
    group('Calendar Synchronization', function() {
      const syncStart = Date.now();
      
      const syncResponse = http.post('/api/integrations/calendar/sync', {
        supplier_id: 'perf_test_supplier',
        sync_direction: 'bidirectional',
        calendar_providers: ['google', 'outlook'],
        sync_period_days: 30
      }, {
        headers: { 'Authorization': `Bearer ${generateSupplierAuth()}` },
        tags: { integration: 'true', service: 'calendar', operation: 'sync' },
        timeout: '8s'
      });
      
      const syncLatency = Date.now() - syncStart;
      
      check(syncResponse, {
        'calendar sync initiated': (r) => r.status === 202,
        'sync under 5s': (r) => syncLatency < 5000,
        'sync job queued': (r) => r.json('sync_job_id') !== null,
        'providers handled': (r) => r.json('providers_synced') === 2
      });
    });
  });
}

// Basic integration health check for all services
function testAllIntegrationsBasic() {
  group('All Integrations Health Check', function() {
    const integrations = [
      { name: 'tave', endpoint: '/api/integrations/tave/health' },
      { name: 'stripe', endpoint: '/api/stripe/health' },
      { name: 'email', endpoint: '/api/communications/health' },
      { name: 'calendar', endpoint: '/api/integrations/calendar/health' }
    ];
    
    integrations.forEach(integration => {
      const healthResponse = http.get(integration.endpoint, {
        tags: { integration: 'true', service: integration.name, type: 'health' }
      });
      
      check(healthResponse, {
        [`${integration.name} integration healthy`]: (r) => r.status === 200,
        [`${integration.name} response time acceptable`]: (r) => r.timings.duration < 1000,
        [`${integration.name} version available`]: (r) => r.json('version') !== null
      });
    });
  });
}

// Helper function to generate supplier authentication
function generateSupplierAuth() {
  const supplierData = generateSupplierTestData();
  
  // Mock JWT token for performance testing
  const mockToken = Buffer.from(JSON.stringify({
    sub: supplierData.supplierName,
    email: supplierData.email,
    role: 'supplier',
    tier: supplierData.pricingTier,
    iss: 'wedsync-performance-test',
    exp: Math.floor(Date.now() / 1000) + 3600,
    test_data: true
  })).toString('base64');
  
  return `perf_test_${mockToken}`;
}

// Helper function to generate bulk client data
function generateBulkClientData(count) {
  const clients = [];
  for (let i = 0; i < count; i++) {
    const weddingData = generateWeddingTestData();
    clients.push({
      name: weddingData.coupleName,
      email: weddingData.email,
      wedding_date: weddingData.weddingDate,
      venue: weddingData.venue,
      status: 'inquiry',
      source: 'tave_performance_test'
    });
  }
  return clients;
}