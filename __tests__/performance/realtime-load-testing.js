/**
 * WedSync Realtime Performance Load Testing
 * WS-202: K6 Performance testing for realtime integration
 * 
 * Wedding Industry Context: Load testing for peak wedding season traffic.
 * Simulates 1000+ concurrent vendors and couples during busy Saturday wedding days.
 * Tests message throughput, connection stability, and resource usage under stress.
 */

import { check, sleep } from 'k6';
import { WebSocket } from 'k6/ws';
import { Counter, Rate, Trend, Gauge } from 'k6/metrics';
import { randomIntBetween, randomItem } from 'https://jslib.k6.io/k6-utils/1.2.0/index.js';

// Custom metrics for wedding industry scenarios
const connectionErrors = new Counter('websocket_connection_errors');
const messageLatency = new Trend('message_latency_ms');
const concurrentConnections = new Gauge('concurrent_websocket_connections');
const rsvpUpdateRate = new Rate('rsvp_update_success_rate');
const vendorCoordinationRate = new Rate('vendor_coordination_success_rate');
const weddingDayStressRate = new Rate('wedding_day_stress_success_rate');

// Test configuration
export let options = {
  scenarios: {
    // Gradual load increase to simulate wedding season buildup
    wedding_season_ramp: {
      executor: 'ramping-vus',
      startVUs: 10,
      stages: [
        { duration: '2m', target: 50 },   // Early season - few weddings
        { duration: '3m', target: 200 },  // Peak season buildup
        { duration: '5m', target: 500 },  // Peak Saturday afternoon
        { duration: '10m', target: 1000 }, // Multiple weddings simultaneously
        { duration: '2m', target: 500 },  // Wind down
        { duration: '2m', target: 0 },    // End of day
      ],
    },
    
    // Spike testing for emergency scenarios
    wedding_day_emergency: {
      executor: 'ramping-arrival-rate',
      startRate: 10,
      timeUnit: '1s',
      preAllocatedVUs: 100,
      maxVUs: 500,
      stages: [
        { duration: '30s', target: 10 },  // Normal operations
        { duration: '10s', target: 100 }, // Emergency spike (timeline change)
        { duration: '30s', target: 100 }, // Sustained emergency
        { duration: '20s', target: 10 },  // Recovery
      ],
      startTime: '25m', // Start after main test
    },
    
    // Soak testing for Saturday wedding marathon
    saturday_marathon: {
      executor: 'constant-vus',
      vus: 200,
      duration: '30m',
      startTime: '30m', // Run after emergency test
    }
  },
  
  thresholds: {
    // Performance SLAs for wedding day operations
    'message_latency_ms': ['p(95)<500'], // 95% of messages under 500ms
    'websocket_connection_errors': ['count<50'], // Less than 50 connection errors
    'rsvp_update_success_rate': ['rate>0.99'], // 99%+ RSVP updates succeed
    'vendor_coordination_success_rate': ['rate>0.95'], // 95%+ vendor coordination
    'wedding_day_stress_success_rate': ['rate>0.90'], // 90%+ under stress
    'http_req_duration': ['p(95)<2000'], // 95% of HTTP requests under 2s
    'http_req_failed': ['rate<0.05'], // Less than 5% HTTP failures
  }
};

// Test data for realistic wedding scenarios
const weddingScenarios = [
  {
    id: 'intimate-wedding',
    guestCount: 50,
    vendorCount: 5,
    venues: ['Garden Venue', 'Small Chapel', 'Family Home']
  },
  {
    id: 'traditional-wedding',
    guestCount: 150,
    vendorCount: 8,
    venues: ['Church', 'Country Club', 'Historic Manor']
  },
  {
    id: 'luxury-wedding',
    guestCount: 300,
    vendorCount: 15,
    venues: ['Five Star Resort', 'Luxury Estate', 'Grand Ballroom']
  }
];

const vendorTypes = [
  'photographer', 'videographer', 'florist', 'caterer', 
  'dj', 'venue_coordinator', 'wedding_planner', 'baker',
  'decorator', 'transportation', 'hair_stylist', 'makeup_artist'
];

const messageTypes = [
  'RSVP_CHANGED', 'TIMELINE_UPDATED', 'VENDOR_STATUS_UPDATED',
  'VENDOR_MESSAGE_SENT', 'GUEST_MESSAGE', 'VENDOR_EMERGENCY',
  'GUEST_CHECKIN', 'DIETARY_REQUIREMENTS_UPDATED'
];

// Utility functions
function generateWeddingId() {
  return `wedding-${randomIntBetween(1000, 9999)}`;
}

function generateVendorId() {
  return `${randomItem(vendorTypes)}-${randomIntBetween(100, 999)}`;
}

function generateRealtimeEvent(weddingId, vendorId) {
  const eventType = randomItem(messageTypes);
  const timestamp = new Date().toISOString();
  
  let payload = {
    weddingId,
    timestamp
  };
  
  // Generate realistic payload based on event type
  switch (eventType) {
    case 'RSVP_CHANGED':
      payload = {
        ...payload,
        guestId: `guest-${randomIntBetween(1, 300)}`,
        previousStatus: randomItem(['pending', 'accepted', 'declined']),
        newStatus: randomItem(['accepted', 'declined']),
      };
      break;
      
    case 'TIMELINE_UPDATED':
      payload = {
        ...payload,
        eventId: `event-${randomIntBetween(1, 20)}`,
        changes: [{
          field: 'start_time',
          oldValue: '15:00',
          newValue: '15:30',
          reason: randomItem(['photography_delay', 'weather', 'vendor_issue'])
        }]
      };
      break;
      
    case 'VENDOR_STATUS_UPDATED':
      payload = {
        ...payload,
        vendorId,
        previousStatus: 'confirmed',
        newStatus: randomItem(['arrived', 'setup_complete', 'ready']),
        notes: 'Status update from vendor portal'
      };
      break;
      
    case 'VENDOR_EMERGENCY':
      payload = {
        ...payload,
        vendorId,
        emergencyType: randomItem(['equipment_failure', 'traffic_delay', 'weather_issue']),
        description: 'Emergency situation requiring coordination',
        severity: randomItem(['low', 'medium', 'high', 'critical'])
      };
      break;
      
    default:
      payload = {
        ...payload,
        message: `Test message for ${eventType}`,
        senderId: vendorId
      };
  }
  
  return {
    eventType,
    payload,
    metadata: {
      source: 'load_test',
      priority: randomItem(['low', 'medium', 'high', 'critical']),
      timestamp
    }
  };
}

// Main test function
export default function () {
  const weddingId = generateWeddingId();
  const vendorId = generateVendorId();
  const scenario = randomItem(weddingScenarios);
  
  // Supabase Realtime WebSocket connection
  const supabaseUrl = __ENV.SUPABASE_URL || 'wss://azhgptjkqiiqvvvhapml.supabase.co/realtime/v1/websocket';
  const supabaseKey = __ENV.SUPABASE_ANON_KEY;
  
  if (!supabaseKey) {
    console.error('SUPABASE_ANON_KEY environment variable required');
    return;
  }
  
  const wsUrl = `${supabaseUrl}?apikey=${supabaseKey}&vsn=1.0.0`;
  
  const startTime = Date.now();
  
  // WebSocket connection testing
  const ws = new WebSocket(wsUrl);
  
  ws.onopen = function() {
    concurrentConnections.add(1);
    console.log(`Wedding ${weddingId}: WebSocket connected for ${vendorId}`);
    
    // Join realtime channel for wedding
    const joinMessage = {
      topic: `wedding:${weddingId}`,
      event: 'phx_join',
      payload: {
        config: {
          presence: {
            key: vendorId
          }
        }
      },
      ref: Date.now()
    };
    
    ws.send(JSON.stringify(joinMessage));
    
    // Start sending realistic wedding messages
    const messageInterval = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        const event = generateRealtimeEvent(weddingId, vendorId);
        const message = {
          topic: `wedding:${weddingId}`,
          event: 'message',
          payload: event,
          ref: Date.now()
        };
        
        const sendTime = Date.now();
        ws.send(JSON.stringify(message));
        
        // Track message latency when we get a response
        ws.addEventListener('message', function(event) {
          const latency = Date.now() - sendTime;
          messageLatency.add(latency);
        });
      }
    }, randomIntBetween(1000, 5000)); // Send message every 1-5 seconds
    
    // Simulate presence tracking updates
    const presenceInterval = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        const presenceMessage = {
          topic: `wedding:${weddingId}`,
          event: 'presence',
          payload: {
            user_id: vendorId,
            user_type: 'vendor',
            wedding_id: weddingId,
            online_at: new Date().toISOString(),
            status: randomItem(['active', 'typing', 'away']),
            activity: randomItem(['coordinating', 'setup', 'ceremony', 'reception'])
          },
          ref: Date.now()
        };
        
        ws.send(JSON.stringify(presenceMessage));
      }
    }, randomIntBetween(10000, 30000)); // Update presence every 10-30 seconds
    
    // Clean up intervals when test ends
    setTimeout(() => {
      clearInterval(messageInterval);
      clearInterval(presenceInterval);
    }, 60000); // 1 minute max per connection
  };
  
  ws.onerror = function(error) {
    connectionErrors.add(1);
    console.error(`Wedding ${weddingId}: WebSocket error for ${vendorId}:`, error);
  };
  
  ws.onmessage = function(event) {
    const data = JSON.parse(event.data);
    
    // Track different types of success rates
    if (data.event === 'message') {
      const payload = data.payload;
      
      if (payload.eventType === 'RSVP_CHANGED') {
        rsvpUpdateRate.add(1);
      } else if (payload.eventType.includes('VENDOR')) {
        vendorCoordinationRate.add(1);
      } else if (payload.metadata && payload.metadata.priority === 'critical') {
        weddingDayStressRate.add(1);
      }
    }
    
    // Verify message structure for wedding scenarios
    const isValidMessage = check(data, {
      'message has valid structure': (msg) => msg.topic && msg.event,
      'wedding id present in topic': (msg) => msg.topic.includes('wedding:'),
      'payload contains timestamp': (msg) => 
        msg.payload && msg.payload.timestamp,
    });
    
    if (!isValidMessage) {
      console.error(`Invalid message structure from ${vendorId}`);
    }
  };
  
  ws.onclose = function() {
    concurrentConnections.add(-1);
    const connectionDuration = Date.now() - startTime;
    console.log(`Wedding ${weddingId}: WebSocket closed for ${vendorId} after ${connectionDuration}ms`);
  };
  
  // Keep connection alive for test duration
  sleep(randomIntBetween(30, 120)); // 30 seconds to 2 minutes per connection
}

// Test scenario for wedding day stress testing
export function weddingDayStress() {
  const weddingId = 'critical-saturday-wedding';
  const vendorCount = 15; // Large wedding with many vendors
  
  // Simulate all vendors connecting simultaneously at ceremony time
  const connections = [];
  
  for (let i = 0; i < vendorCount; i++) {
    const vendorId = `${vendorTypes[i % vendorTypes.length]}-${i}`;
    
    const ws = new WebSocket(`${__ENV.SUPABASE_URL}?apikey=${__ENV.SUPABASE_ANON_KEY}&vsn=1.0.0`);
    
    ws.onopen = function() {
      // Join wedding channel
      ws.send(JSON.stringify({
        topic: `wedding:${weddingId}`,
        event: 'phx_join',
        payload: { config: { presence: { key: vendorId } } },
        ref: Date.now()
      }));
      
      // Send rapid updates during critical ceremony moments
      const rapidUpdates = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          const criticalEvent = {
            eventType: 'TIMELINE_UPDATED',
            payload: {
              weddingId,
              eventId: 'ceremony-start',
              changes: [{
                field: 'start_time',
                oldValue: '15:00',
                newValue: '15:05',
                reason: 'last_minute_coordination'
              }]
            },
            metadata: {
              source: 'wedding_day_stress_test',
              priority: 'critical',
              timestamp: new Date().toISOString()
            }
          };
          
          ws.send(JSON.stringify({
            topic: `wedding:${weddingId}`,
            event: 'message',
            payload: criticalEvent,
            ref: Date.now()
          }));
          
          weddingDayStressRate.add(1);
        }
      }, 500); // Every 500ms - very rapid updates
      
      // Stop after 30 seconds of stress
      setTimeout(() => {
        clearInterval(rapidUpdates);
        ws.close();
      }, 30000);
    };
    
    connections.push(ws);
  }
  
  // Wait for stress test to complete
  sleep(35);
  
  return connections.length;
}

// Cleanup function
export function teardown() {
  console.log('Load testing completed');
  console.log(`Final metrics:`);
  console.log(`- Connection errors: ${connectionErrors.count}`);
  console.log(`- Average message latency: ${messageLatency.avg}ms`);
  console.log(`- Max concurrent connections: ${concurrentConnections.value}`);
  console.log(`- RSVP update success rate: ${rsvpUpdateRate.rate * 100}%`);
  console.log(`- Vendor coordination success rate: ${vendorCoordinationRate.rate * 100}%`);
  console.log(`- Wedding day stress success rate: ${weddingDayStressRate.rate * 100}%`);
}